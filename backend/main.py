from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="iziDelivery API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def verificar_api():
    return {"status": "ok"}


@app.get("/api/produtos")
def listar_produtos():
    return [
        {
            "id": 1,
            "nome": "X-Burguer",
            "descricao": "Pão, carne, queijo e molho especial",
            "preco": 22.00,
        },
        {
            "id": 2,
            "nome": "X-Salada",
            "descricao": "Pão, carne, queijo, salada e molho especial",
            "preco": 25.00,
        },
        {
            "id": 3,
            "nome": "Batata Frita",
            "descricao": "Porção de batata frita crocante",
            "preco": 18.00,
        },
    ]