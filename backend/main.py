from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from database import conectar_banco
from pydantic import BaseModel, Field
from typing import Literal

app = FastAPI(title="iziDelivery API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ProdutoNovo(BaseModel):
    nome: str = Field(min_length=1, max_length=150)
    descricao: str | None = None
    preco: float = Field(gt=0)

class ProdutoEdicao(BaseModel):
    nome: str = Field(min_length=1, max_length=150)
    descricao: str | None = None
    preco: float = Field(gt=0)

class ProdutoStatus(BaseModel):
    ativo: bool

class ItemPedidoNovo(BaseModel):
    produto_id: int
    quantidade: int = Field(gt=0)

class ClienteNovo(BaseModel):
    telefone: str = Field(min_length=10, max_length=20)
    nome: str = Field(min_length=2, max_length=150)

class EnderecoNovo(BaseModel):
    cliente_id: int
    logradouro: str = Field(min_length=2, max_length=150)
    numero: str = Field(min_length=1, max_length=20)
    complemento: str | None = None
    bairro: str = Field(min_length=2, max_length=100)
    cidade: str = Field(min_length=2, max_length=100)
    referencia: str | None = None

class PedidoNovo(BaseModel):
    cliente_id: int
    endereco_id: int
    itens: list[ItemPedidoNovo]

class AtualizacaoStatusPedido(BaseModel):
    status: Literal[
        "Aguardando Confirmação",
        "Confirmado",
        "Em Preparação",
        "Pronto",
        "Saiu para Entrega",
        "Concluído",
        "Recusado",
        "Cancelado",
    ]

@app.get("/api/health")
def verificar_api():
    return {"status": "ok"}


@app.get("/api/produtos")
def listar_produtos():
    conexao = conectar_banco()
    cursor = conexao.cursor(dictionary=True)

    cursor.execute(
        """
        SELECT
            id,
            nome,
            descricao,
            CAST(preco AS DOUBLE) AS preco
        FROM produto
        WHERE ativo = TRUE
        ORDER BY nome
        """
    )

    produtos = cursor.fetchall()

    cursor.close()
    conexao.close()

    return produtos

@app.get("/api/estabelecimento/produtos")
def listar_produtos_estabelecimento():
    conexao = conectar_banco()
    cursor = conexao.cursor(dictionary=True)

    cursor.execute(
        """
        SELECT
            id,
            nome,
            descricao,
            CAST(preco AS DOUBLE) AS preco,
            ativo
        FROM produto
        ORDER BY nome
        """
    )

    produtos = cursor.fetchall()

    cursor.close()
    conexao.close()

    return produtos

@app.post("/api/produtos", status_code=201)
def cadastrar_produto(produto: ProdutoNovo):
    conexao = conectar_banco()
    cursor = conexao.cursor()

    cursor.execute(
        """
        INSERT INTO produto (
            estabelecimento_id,
            nome,
            descricao,
            preco
        )
        VALUES (%s, %s, %s, %s)
        """,
        (
            1,
            produto.nome,
            produto.descricao,
            produto.preco,
        ),
    )

    conexao.commit()

    produto_id = cursor.lastrowid

    cursor.close()
    conexao.close()

    return {
        "id": produto_id,
        "nome": produto.nome,
        "descricao": produto.descricao,
        "preco": produto.preco,
    }

@app.post("/api/pedidos", status_code=201)
def criar_pedido(pedido: PedidoNovo):
    conexao = conectar_banco()
    cursor = conexao.cursor(dictionary=True)

    try:
        itens_processados = []
        total = 0

        cursor.execute(
            """
            SELECT
                id,
                logradouro,
                numero,
                complemento,
                bairro,
                cidade,
                referencia
            FROM endereco_cliente
            WHERE id = %s
              AND cliente_id = %s
            """,
            (
                pedido.endereco_id,
                pedido.cliente_id,
            ),
        )

        endereco = cursor.fetchone()

        if endereco is None:
            raise HTTPException(
                status_code=404,
                detail="Endereço não encontrado para este cliente",
            )

        for item in pedido.itens:
            cursor.execute(
                """
                SELECT id, preco
                FROM produto
                WHERE id = %s AND ativo = TRUE
                """,
                (item.produto_id,),
            )

            produto = cursor.fetchone()

            if produto is None:
                raise HTTPException(
                    status_code=404,
                    detail="Produto não encontrado",
                )

            subtotal = produto["preco"] * item.quantidade
            total += subtotal

            itens_processados.append(
                {
                    "produto_id": produto["id"],
                    "quantidade": item.quantidade,
                    "preco_unitario": produto["preco"],
                }
            )

        cursor.execute(
            """
            INSERT INTO pedido (
                estabelecimento_id,
                cliente_id,
                status,
                total,
                endereco_logradouro,
                endereco_numero,
                endereco_complemento,
                endereco_bairro,
                endereco_cidade,
                endereco_referencia
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                1,
                pedido.cliente_id,
                "Aguardando Confirmação",
                total,
                endereco["logradouro"],
                endereco["numero"],
                endereco["complemento"],
                endereco["bairro"],
                endereco["cidade"],
                endereco["referencia"],
            ),
        )

        pedido_id = cursor.lastrowid

        for item in itens_processados:
            cursor.execute(
                """
                INSERT INTO item_pedido (
                    pedido_id,
                    produto_id,
                    quantidade,
                    preco_unitario
                )
                VALUES (%s, %s, %s, %s)
                """,
                (
                    pedido_id,
                    item["produto_id"],
                    item["quantidade"],
                    item["preco_unitario"],
                ),
            )

        conexao.commit()

        return {
            "id": pedido_id,
            "status": "Aguardando Confirmação",
            "total": float(total),
        }

    except Exception:
        conexao.rollback()
        raise

    finally:
        cursor.close()
        conexao.close()

@app.get("/api/pedidos")
def listar_pedidos():
    conexao = conectar_banco()
    cursor = conexao.cursor(dictionary=True)

    cursor.execute(
        """
        SELECT
            pedido.id,
            cliente.nome AS cliente,
            pedido.status,
            CAST(pedido.total AS DOUBLE) AS total,
            pedido.criado_em
        FROM pedido
        INNER JOIN cliente
            ON pedido.cliente_id = cliente.id
        ORDER BY pedido.id DESC
        """
    )

    pedidos = cursor.fetchall()

    cursor.close()
    conexao.close()

    return pedidos

@app.patch("/api/pedidos/{pedido_id}/status")
def atualizar_status_pedido(
    pedido_id: int,
    dados: AtualizacaoStatusPedido,
):
    conexao = conectar_banco()
    cursor = conexao.cursor(dictionary=True)

    try:
        cursor.execute(
            """
            SELECT id, status
            FROM pedido
            WHERE id = %s
            """,
            (pedido_id,),
        )

        pedido = cursor.fetchone()

        if pedido is None:
            raise HTTPException(
                status_code=404,
                detail="Pedido não encontrado",
            )

        if pedido["status"] == dados.status:
            return {
                "id": pedido_id,
                "status": dados.status,
            }

        cursor.execute(
            """
            UPDATE pedido
            SET status = %s
            WHERE id = %s
            """,
            (
                dados.status,
                pedido_id,
            ),
        )

        cursor.execute(
            """
            INSERT INTO historico_status_pedido (
                pedido_id,
                status
            )
            VALUES (%s, %s)
            """,
            (
                pedido_id,
                dados.status,
            ),
        )

        conexao.commit()

        return {
            "id": pedido_id,
            "status": dados.status,
        }

    except HTTPException:
        conexao.rollback()
        raise

    except Exception:
        conexao.rollback()
        raise

    finally:
        cursor.close()
        conexao.close() 

@app.get("/api/pedidos/{pedido_id}/itens")
def listar_itens_pedido(pedido_id: int):
    conexao = conectar_banco()
    cursor = conexao.cursor(dictionary=True)

    cursor.execute(
        """
        SELECT id
        FROM pedido
        WHERE id = %s
        """,
        (pedido_id,),
    )

    pedido = cursor.fetchone()

    if pedido is None:
        cursor.close()
        conexao.close()

        raise HTTPException(
            status_code=404,
            detail="Pedido não encontrado",
        )

    cursor.execute(
        """
        SELECT
            item_pedido.id,
            item_pedido.produto_id,
            produto.nome,
            item_pedido.quantidade,
            CAST(item_pedido.preco_unitario AS DOUBLE) AS preco_unitario,
            CAST(
                item_pedido.quantidade * item_pedido.preco_unitario
                AS DOUBLE
            ) AS subtotal
        FROM item_pedido
        INNER JOIN produto
            ON item_pedido.produto_id = produto.id
        WHERE item_pedido.pedido_id = %s
        ORDER BY item_pedido.id
        """,
        (pedido_id,),
    )

    itens = cursor.fetchall()

    cursor.close()
    conexao.close()

    return itens

@app.put("/api/produtos/{produto_id}")
def editar_produto(produto_id: int, produto: ProdutoEdicao):
    conexao = conectar_banco()
    cursor = conexao.cursor()

    cursor.execute(
        """
        UPDATE produto
        SET nome = %s,
            descricao = %s,
            preco = %s
        WHERE id = %s
        """,
        (
            produto.nome,
            produto.descricao,
            produto.preco,
            produto_id,
        ),
    )

    if cursor.rowcount == 0:
        cursor.close()
        conexao.close()

        raise HTTPException(
            status_code=404,
            detail="Produto não encontrado",
        )

    conexao.commit()

    cursor.close()
    conexao.close()

    return {
        "id": produto_id,
        "nome": produto.nome,
        "descricao": produto.descricao,
        "preco": produto.preco,
    }

@app.patch("/api/produtos/{produto_id}/status")
def alterar_status_produto(
    produto_id: int,
    dados: ProdutoStatus,
):
    conexao = conectar_banco()
    cursor = conexao.cursor()

    cursor.execute(
        """
        UPDATE produto
        SET ativo = %s
        WHERE id = %s
        """,
        (
            dados.ativo,
            produto_id,
        ),
    )

    if cursor.rowcount == 0:
        cursor.close()
        conexao.close()

        raise HTTPException(
            status_code=404,
            detail="Produto não encontrado",
        )

    conexao.commit()

    cursor.close()
    conexao.close()

    return {
        "id": produto_id,
        "ativo": dados.ativo,
    }

@app.get("/api/clientes/telefone/{telefone}")
def buscar_cliente_por_telefone(telefone: str):
    conexao = conectar_banco()
    cursor = conexao.cursor(dictionary=True)

    cursor.execute(
        """
        SELECT
            id,
            telefone,
            nome
        FROM cliente
        WHERE telefone = %s
        """,
        (telefone,),
    )

    cliente = cursor.fetchone()

    cursor.close()
    conexao.close()

    if cliente is None:
        raise HTTPException(
            status_code=404,
            detail="Cliente não encontrado",
        )

    return cliente

@app.post("/api/clientes", status_code=201)
def cadastrar_cliente(cliente: ClienteNovo):
    conexao = conectar_banco()
    cursor = conexao.cursor(dictionary=True)

    cursor.execute(
        """
        SELECT id
        FROM cliente
        WHERE telefone = %s
        """,
        (cliente.telefone,),
    )

    cliente_existente = cursor.fetchone()

    if cliente_existente:
        cursor.close()
        conexao.close()

        raise HTTPException(
            status_code=409,
            detail="Telefone já cadastrado",
        )

    cursor.execute(
        """
        INSERT INTO cliente (
            telefone,
            nome
        )
        VALUES (%s, %s)
        """,
        (
            cliente.telefone,
            cliente.nome,
        ),
    )

    conexao.commit()

    cliente_id = cursor.lastrowid

    cursor.close()
    conexao.close()

    return {
        "id": cliente_id,
        "telefone": cliente.telefone,
        "nome": cliente.nome,
    }

@app.post("/api/enderecos", status_code=201)
def cadastrar_endereco(endereco: EnderecoNovo):
    conexao = conectar_banco()
    cursor = conexao.cursor()

    cursor.execute(
        """
        INSERT INTO endereco_cliente (
            cliente_id,
            logradouro,
            numero,
            complemento,
            bairro,
            cidade,
            referencia
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        """,
        (
            endereco.cliente_id,
            endereco.logradouro,
            endereco.numero,
            endereco.complemento,
            endereco.bairro,
            endereco.cidade,
            endereco.referencia,
        ),
    )

    conexao.commit()

    endereco_id = cursor.lastrowid

    cursor.close()
    conexao.close()

    return {
        "id": endereco_id,
        "cliente_id": endereco.cliente_id,
        "logradouro": endereco.logradouro,
        "numero": endereco.numero,
        "complemento": endereco.complemento,
        "bairro": endereco.bairro,
        "cidade": endereco.cidade,
        "referencia": endereco.referencia,
    }

@app.get("/api/clientes/{cliente_id}/enderecos")
def listar_enderecos_cliente(cliente_id: int):
    conexao = conectar_banco()
    cursor = conexao.cursor(dictionary=True)

    cursor.execute(
        """
        SELECT
            id,
            cliente_id,
            logradouro,
            numero,
            complemento,
            bairro,
            cidade,
            referencia
        FROM endereco_cliente
        WHERE cliente_id = %s
        ORDER BY id DESC
        """,
        (cliente_id,),
    )

    enderecos = cursor.fetchall()

    cursor.close()
    conexao.close()

    return enderecos               