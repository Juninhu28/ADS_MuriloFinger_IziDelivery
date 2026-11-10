"use client";

import { useEffect, useState } from "react";

type Produto = {
  id: number;
  nome: string;
  descricao: string;
  preco: number;
};

export default function Home() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [carrinho, setCarrinho] = useState<Produto[]>([]);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/produtos")
      .then((resposta) => resposta.json())
      .then((dados) => setProdutos(dados));
  }, []);

  function adicionarAoCarrinho(produto: Produto) {
    setCarrinho([...carrinho, produto]);
  }

  async function finalizarPedido() {
  const itensAgrupados = carrinho.reduce(
    (itens, produto) => {
      const itemExistente = itens.find(
        (item) => item.produto_id === produto.id
      );

      if (itemExistente) {
        itemExistente.quantidade += 1;
      } else {
        itens.push({
          produto_id: produto.id,
          quantidade: 1,
        });
      }

      return itens;
    },
    [] as { produto_id: number; quantidade: number }[]
  );

  const resposta = await fetch("http://127.0.0.1:8000/api/pedidos", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      itens: itensAgrupados,
    }),
  });

  if (resposta.ok) {
    const pedido = await resposta.json();

    alert(
      `Pedido #${pedido.id} criado com sucesso!\nStatus: ${pedido.status}\nTotal: R$ ${pedido.total
        .toFixed(2)
        .replace(".", ",")}`
    );

    setCarrinho([]);
  }
}

  const total = carrinho.reduce(
    (soma, produto) => soma + produto.preco,
    0
  );

  return (
    <main className="min-h-screen bg-gray-100">
      <header className="bg-red-600 px-6 py-5 text-white">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-3xl font-bold">iziDelivery</h1>
          <p className="mt-1 text-red-100">
            Faça seu pedido de forma simples e rápida
          </p>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-10 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <h2 className="mb-6 text-2xl font-bold text-gray-900">
            Cardápio
          </h2>

          <div className="grid gap-5 md:grid-cols-2">
            {produtos.map((produto) => (
              <div
                key={produto.id}
                className="rounded-xl bg-white p-6 shadow-sm"
              >
                <h3 className="text-xl font-semibold text-gray-900">
                  {produto.nome}
                </h3>

                <p className="mt-2 text-gray-600">
                  {produto.descricao}
                </p>

                <div className="mt-5 flex items-center justify-between">
                  <span className="text-lg font-bold text-red-600">
                    R$ {produto.preco.toFixed(2).replace(".", ",")}
                  </span>

                  <button
                    onClick={() => adicionarAoCarrinho(produto)}
                    className="cursor-pointer rounded-lg bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-700"
                  >
                    Adicionar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <aside className="h-fit rounded-xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900">
            Seu pedido
          </h2>

          {carrinho.length === 0 ? (
            <p className="mt-4 text-gray-500">
              Seu carrinho está vazio.
            </p>
          ) : (
            <div className="mt-4">
              <div className="space-y-3">
                {carrinho.map((produto, indice) => (
                  <div
                    key={`${produto.id}-${indice}`}
                    className="flex justify-between gap-3 border-b border-gray-200 pb-3"
                  >
                    <span className="text-gray-700">
                      {produto.nome}
                    </span>

                    <span className="font-medium text-gray-900">
                      R$ {produto.preco.toFixed(2).replace(".", ",")}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex justify-between text-lg font-bold text-gray-900">
                <span>Total</span>
                <span>
                  R$ {total.toFixed(2).replace(".", ",")}
                </span>
              </div>

              <button
                onClick={finalizarPedido}
                className="mt-6 w-full cursor-pointer rounded-lg bg-green-600 py-3 font-semibold text-white hover:bg-green-700"
              >
                Continuar pedido
              </button>
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}