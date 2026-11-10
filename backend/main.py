from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import conectar_banco
from pydantic import BaseModel, Field

app = FastAPI(title="iziDelivery API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ProdutoNovo(BaseModel):
    nome: str = Field(min_length=1, max_length=150)
    descricao: str | None = None
    preco: float = Field(gt=0)

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