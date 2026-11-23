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

class ItemPedidoNovo(BaseModel):
    produto_id: int
    quantidade: int = Field(gt=0)

class PedidoNovo(BaseModel):
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
                raise ValueError("Produto não encontrado")

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
                total
            )
            VALUES (%s, %s, %s, %s)
            """,
            (
                1,
                1,
                "Aguardando Confirmação",
                total,
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