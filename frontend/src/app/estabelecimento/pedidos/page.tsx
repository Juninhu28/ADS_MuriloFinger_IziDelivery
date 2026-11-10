"use client";

import { useEffect, useState } from "react";

type Pedido = {
  id: number;
  cliente: string;
  status: string;
  total: number;
  criado_em: string;
};

export default function PedidosEstabelecimento() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);

  function carregarPedidos() {
    fetch("http://127.0.0.1:8000/api/pedidos")
      .then((resposta) => resposta.json())
      .then((dados) => setPedidos(dados));
  }

  useEffect(() => {
    carregarPedidos();
  }, []);

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Pedidos recebidos
            </h1>

            <p className="mt-1 text-gray-500">
              Acompanhe os pedidos realizados pelos clientes
            </p>
          </div>

          <button
            onClick={carregarPedidos}
            className="cursor-pointer rounded-lg bg-red-600 px-5 py-2 font-semibold text-white hover:bg-red-700"
          >
            Atualizar pedidos
          </button>
        </div>

        <div className="space-y-4">
          {pedidos.map((pedido) => (
            <div
              key={pedido.id}
              className="rounded-xl bg-white p-6 shadow-sm"
            >
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-gray-900">
                      Pedido #{pedido.id}
                    </h2>

                    <span className="rounded-full bg-yellow-100 px-3 py-1 text-sm font-medium text-yellow-800">
                      {pedido.status}
                    </span>
                  </div>

                  <p className="mt-3 text-gray-700">
                    Cliente:{" "}
                    <span className="font-medium">
                      {pedido.cliente}
                    </span>
                  </p>

                  <p className="mt-1 text-sm text-gray-500">
                    {new Date(pedido.criado_em).toLocaleString("pt-BR")}
                  </p>
                </div>

                <div className="text-left md:text-right">
                  <p className="text-sm text-gray-500">
                    Total do pedido
                  </p>

                  <p className="mt-1 text-2xl font-bold text-red-600">
                    R$ {pedido.total.toFixed(2).replace(".", ",")}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}