"use client";

import { useEffect, useState } from "react";

type Pedido = {
  id: number;
  cliente: string;
  status: string;
  total: number;
  criado_em: string;
  endereco_logradouro: string | null;
  endereco_numero: string | null;
  endereco_complemento: string | null;
  endereco_bairro: string | null;
  endereco_cidade: string | null;
  endereco_referencia: string | null;
};

type ItemPedido = {
  id: number;
  produto_id: number;
  nome: string;
  quantidade: number;
  preco_unitario: number;
  subtotal: number;
};

export default function PedidosEstabelecimento() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [pedidoAberto, setPedidoAberto] = useState<number | null>(null);
  const [itensPorPedido, setItensPorPedido] = useState<
    Record<number, ItemPedido[]>
  >({});
  const [carregandoItens, setCarregandoItens] = useState<number | null>(null);
  const [visao, setVisao] = useState<"andamento" | "historico">("andamento");
  const [filtroStatus, setFiltroStatus] = useState("Todos");

  async function carregarPedidos() {
    try {
      setErro("");

      const resposta = await fetch("http://127.0.0.1:8000/api/pedidos");

      if (!resposta.ok) {
        throw new Error("Erro ao buscar pedidos");
      }

      const dados = await resposta.json();

      setPedidos(dados);
    } catch (erro) {
      console.error(erro);
      setErro("Não foi possível carregar os pedidos.");
    } finally {
      setCarregando(false);
    }
  }

  async function atualizarStatus(pedidoId: number, status: string) {
    const resposta = await fetch(
      `http://127.0.0.1:8000/api/pedidos/${pedidoId}/status`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status,
        }),
      },
    );

    if (resposta.ok) {
      carregarPedidos();
    }
  }

  async function alternarItens(pedidoId: number) {
    if (pedidoAberto === pedidoId) {
      setPedidoAberto(null);
      return;
    }

    setPedidoAberto(pedidoId);

    if (itensPorPedido[pedidoId]) {
      return;
    }

    setCarregandoItens(pedidoId);

    const resposta = await fetch(
      `http://127.0.0.1:8000/api/pedidos/${pedidoId}/itens`,
    );

    if (resposta.ok) {
      const itens = await resposta.json();

      setItensPorPedido((itensAtuais) => ({
        ...itensAtuais,
        [pedidoId]: itens,
      }));
    }

    setCarregandoItens(null);
  }

  function corStatus(status: string) {
    switch (status) {
      case "Aguardando Confirmação":
        return "bg-yellow-500 text-white";

      case "Confirmado":
        return "bg-blue-600 text-white";

      case "Em Preparação":
        return "bg-orange-500 text-white";

      case "Pronto":
        return "bg-purple-600 text-white";

      case "Saiu para Entrega":
        return "bg-cyan-600 text-white";

      case "Concluído":
        return "bg-green-600 text-white";

      case "Recusado":
        return "bg-red-600 text-white";

      case "Cancelado":
        return "bg-red-700 text-white";

      default:
        return "bg-gray-600 text-white";
    }
  }

  useEffect(() => {
    carregarPedidos();
  }, []);

  const statusFinalizados = ["Concluído", "Recusado", "Cancelado"];

  const pedidosDaVisao = pedidos.filter((pedido) => {
    if (visao === "historico") {
      return statusFinalizados.includes(pedido.status);
    }

    return !statusFinalizados.includes(pedido.status);
  });

  const pedidosFiltrados = pedidosDaVisao.filter((pedido) => {
    if (filtroStatus === "Todos") {
      return true;
    }

    return pedido.status === filtroStatus;
  });

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Pedidos recebidos
            </h1>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                onClick={() => {
                  setVisao("andamento");
                  setFiltroStatus("Todos");
                }}
                className={`rounded-lg px-4 py-2 font-medium ${
                  visao === "andamento"
                    ? "bg-red-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                Em andamento
              </button>

              <button
                onClick={() => {
                  setVisao("historico");
                  setFiltroStatus("Todos");
                }}
                className={`rounded-lg px-4 py-2 font-medium ${
                  visao === "historico"
                    ? "bg-red-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                Histórico
              </button>
            </div>

            <div className="mt-4">
              <label className="text-sm font-medium text-gray-700">
                Filtrar por status
              </label>

              <select
                value={filtroStatus}
                onChange={(evento) => setFiltroStatus(evento.target.value)}
                className="ml-3 rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900"
              >
                <option value="Todos">Todos</option>

                {visao === "andamento" ? (
                  <>
                    <option value="Aguardando Confirmação">
                      Aguardando Confirmação
                    </option>
                    <option value="Confirmado">Confirmado</option>
                    <option value="Em Preparação">Em Preparação</option>
                    <option value="Pronto">Pronto</option>
                    <option value="Saiu para Entrega">Saiu para Entrega</option>
                  </>
                ) : (
                  <>
                    <option value="Concluído">Concluído</option>
                    <option value="Recusado">Recusado</option>
                    <option value="Cancelado">Cancelado</option>
                  </>
                )}
              </select>
            </div>

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

        {carregando && <p className="text-gray-600">Carregando pedidos...</p>}

        {erro && (
          <div className="rounded-lg bg-red-100 p-4 text-red-700">{erro}</div>
        )}

        {!carregando && !erro && pedidos.length === 0 && (
          <p className="text-gray-600">Nenhum pedido encontrado.</p>
        )}

        <div className="space-y-4">
          {pedidosFiltrados.length === 0 && (
            <div className="mt-6 rounded-lg bg-gray-100 p-6 text-center text-gray-500">
              Nenhum pedido encontrado.
            </div>
          )}
          {pedidosFiltrados.map((pedido) => (
            <div key={pedido.id} className="rounded-xl bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-xl font-bold text-gray-900">
                      Pedido #{pedido.id}
                    </h2>

                    <span
                      className={`rounded-full px-3 py-1 text-sm font-medium ${corStatus(
                        pedido.status,
                      )}`}
                    >
                      {pedido.status}
                    </span>
                  </div>

                  <p className="mt-3 text-gray-700">
                    Cliente:{" "}
                    <span className="font-medium">{pedido.cliente}</span>
                  </p>

                  <p className="mt-1 text-sm text-gray-500">
                    {new Date(pedido.criado_em).toLocaleString("pt-BR")}
                  </p>

                  {pedido.endereco_logradouro && (
                    <div className="mt-4 text-sm text-gray-600">
                      <p className="font-medium text-gray-800">
                        Endereço de entrega
                      </p>

                      <p>
                        {pedido.endereco_logradouro}, {pedido.endereco_numero}
                        {pedido.endereco_complemento &&
                          ` - ${pedido.endereco_complemento}`}
                      </p>

                      <p>
                        {pedido.endereco_bairro} - {pedido.endereco_cidade}
                      </p>

                      {pedido.endereco_referencia && (
                        <p>Referência: {pedido.endereco_referencia}</p>
                      )}
                    </div>
                  )}
                </div>

                <div className="w-full lg:w-72 lg:shrink-0">
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Alterar status
                  </label>

                  <select
                    value={pedido.status}
                    onChange={(evento) =>
                      atualizarStatus(pedido.id, evento.target.value)
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900"
                  >
                    <option value="Aguardando Confirmação">
                      Aguardando Confirmação
                    </option>

                    <option value="Confirmado">Confirmado</option>

                    <option value="Em Preparação">Em Preparação</option>

                    <option value="Pronto">Pronto</option>

                    <option value="Saiu para Entrega">Saiu para Entrega</option>

                    <option value="Concluído">Concluído</option>

                    <option value="Recusado">Recusado</option>

                    <option value="Cancelado">Cancelado</option>
                  </select>

                  <div className="mt-4 lg:text-right">
                    <p className="text-sm text-gray-500">Total do pedido</p>

                    <p className="mt-1 text-2xl font-bold text-red-600">
                      R$ {pedido.total.toFixed(2).replace(".", ",")}
                    </p>

                    <button
                      onClick={() => alternarItens(pedido.id)}
                      className="mt-4 cursor-pointer rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 hover:bg-gray-100"
                    >
                      {pedidoAberto === pedido.id
                        ? "Ocultar itens"
                        : "Ver itens"}
                    </button>
                  </div>
                </div>
              </div>

              {pedidoAberto === pedido.id && (
                <div className="mt-6 border-t border-gray-200 pt-5">
                  <h3 className="mb-4 font-semibold text-gray-900">
                    Itens do pedido
                  </h3>

                  {carregandoItens === pedido.id ? (
                    <p className="text-gray-500">Carregando itens...</p>
                  ) : (
                    <div className="space-y-3">
                      {itensPorPedido[pedido.id]?.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-start justify-between gap-6 border-b border-gray-100 pb-3"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="break-words font-medium text-gray-900">
                              {item.quantidade}x {item.nome}
                            </p>

                            <p className="text-sm text-gray-500">
                              R${" "}
                              {item.preco_unitario.toFixed(2).replace(".", ",")}{" "}
                              cada
                            </p>
                          </div>

                          <span className="shrink-0 whitespace-nowrap font-semibold text-gray-900">
                            R$ {item.subtotal.toFixed(2).replace(".", ",")}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
