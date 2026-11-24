"use client";

import { FormEvent, useEffect, useState } from "react";

type Produto = {
  id: number;
  nome: string;
  descricao: string | null;
  preco: number;
  ativo: boolean;
};

export default function ProdutosEstabelecimento() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [preco, setPreco] = useState("");
  const [produtoEditando, setProdutoEditando] = useState<number | null>(null);

  function carregarProdutos() {
    fetch("http://127.0.0.1:8000/api/estabelecimento/produtos")
      .then((resposta) => resposta.json())
      .then((dados) => setProdutos(dados));
  }

  async function alterarStatusProduto(produtoId: number, ativo: boolean) {
    const resposta = await fetch(
      `http://127.0.0.1:8000/api/produtos/${produtoId}/status`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ativo,
        }),
      },
    );

    if (resposta.ok) {
      carregarProdutos();
    }
  }

  function iniciarEdicao(produto: Produto) {
    setProdutoEditando(produto.id);
    setNome(produto.nome);
    setDescricao(produto.descricao ?? "");
    setPreco(produto.preco.toString());
  }

  function cancelarEdicao() {
    setProdutoEditando(null);
    setNome("");
    setDescricao("");
    setPreco("");
  }

  useEffect(() => {
    carregarProdutos();
  }, []);

  async function salvarProduto(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    const url = produtoEditando
      ? `http://127.0.0.1:8000/api/produtos/${produtoEditando}`
      : "http://127.0.0.1:8000/api/produtos";

    const metodo = produtoEditando ? "PUT" : "POST";

    const resposta = await fetch(url, {
      method: metodo,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        nome,
        descricao,
        preco: Number(preco),
      }),
    });

    if (resposta.ok) {
      setNome("");
      setDescricao("");
      setPreco("");
      carregarProdutos();
      setProdutoEditando(null);
    }
  }

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-8 text-3xl font-bold text-gray-900">Produtos</h1>

        <div className="grid gap-8 lg:grid-cols-2">
          <section className="rounded-xl bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-xl font-bold text-gray-900">
              Cadastrar produto
            </h2>

            <form onSubmit={salvarProduto} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Nome
                </label>

                <input
                  value={nome}
                  onChange={(evento) => setNome(evento.target.value)}
                  required
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Descrição
                </label>

                <input
                  value={descricao}
                  onChange={(evento) => setDescricao(evento.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Preço
                </label>

                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={preco}
                  onChange={(evento) => setPreco(evento.target.value)}
                  required
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900"
                />
              </div>

              <button
                type="submit"
                className="w-full cursor-pointer rounded-lg bg-red-600 py-3 font-semibold text-white hover:bg-red-700"
              >
                {produtoEditando ? "Salvar alterações" : "Cadastrar produto"}
              </button>

              {produtoEditando && (
                <button
                  type="button"
                  onClick={cancelarEdicao}
                  className="w-full cursor-pointer rounded-lg bg-gray-500 py-3 font-semibold text-white hover:bg-gray-600"
                >
                  Cancelar edição
                </button>
              )}
            </form>
          </section>

          <section className="rounded-xl bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-xl font-bold text-gray-900">
              Produtos cadastrados
            </h2>

            <div className="space-y-4">
              {produtos.map((produto) => (
                <div key={produto.id} className="border-b border-gray-200 pb-4">
                  <div className="flex justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {produto.nome}
                      </h3>

                      <p className="text-sm text-gray-500">
                        {produto.descricao}
                      </p>
                    </div>

                    <span className="font-bold text-red-600">
                      R$ {produto.preco.toFixed(2).replace(".", ",")}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <span
                      className={`rounded-full px-3 py-1 text-sm font-medium ${
                        produto.ativo
                          ? "bg-green-600 text-white"
                          : "bg-gray-500 text-white"
                      }`}
                    >
                      {produto.ativo ? "Ativo" : "Inativo"}
                    </span>

                    <button
                      onClick={() => iniciarEdicao(produto)}
                      className="cursor-pointer rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                    >
                      Editar
                    </button>

                    <button
                      onClick={() =>
                        alterarStatusProduto(produto.id, !produto.ativo)
                      }
                      className={`cursor-pointer rounded-lg px-3 py-2 text-sm font-medium text-white ${
                        produto.ativo
                          ? "bg-red-600 hover:bg-red-700"
                          : "bg-green-600 hover:bg-green-700"
                      }`}
                    >
                      {produto.ativo ? "Desativar" : "Reativar"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
