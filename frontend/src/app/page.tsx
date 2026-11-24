"use client";

import { useEffect, useState } from "react";

type Produto = {
  id: number;
  nome: string;
  descricao: string;
  preco: number;
};

type Endereco = {
  id: number;
  cliente_id: number;
  logradouro: string;
  numero: string;
  complemento: string | null;
  bairro: string;
  cidade: string;
  referencia: string | null;
};

export default function Home() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [carrinho, setCarrinho] = useState<Produto[]>([]);
  const [telefone, setTelefone] = useState("");
  const [clienteId, setClienteId] = useState<number | null>(null);
  const [nomeCliente, setNomeCliente] = useState("");
  const [clienteEncontrado, setClienteEncontrado] = useState(false);
  const [etapaFinalizacao, setEtapaFinalizacao] = useState(false);
  const [clienteNaoEncontrado, setClienteNaoEncontrado] = useState(false);
  const [enderecos, setEnderecos] = useState<Endereco[]>([]);
  const [enderecoSelecionado, setEnderecoSelecionado] = useState<number | null>(
    null,
  );
  const [logradouro, setLogradouro] = useState("");
  const [numero, setNumero] = useState("");
  const [complemento, setComplemento] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [referencia, setReferencia] = useState("");

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/produtos")
      .then((resposta) => resposta.json())
      .then((dados) => setProdutos(dados));
  }, []);

  function adicionarAoCarrinho(produto: Produto) {
    setCarrinho([...carrinho, produto]);
  }

  async function buscarCliente() {
    const resposta = await fetch(
      `http://127.0.0.1:8000/api/clientes/telefone/${telefone}`,
    );

    if (resposta.ok) {
      const cliente = await resposta.json();

      setClienteId(cliente.id);
      setNomeCliente(cliente.nome);
      setClienteEncontrado(true);
      setClienteNaoEncontrado(false);
      await carregarEnderecos(cliente.id);
      return;
    }

    if (resposta.status === 404) {
      setClienteId(null);
      setNomeCliente("");
      setClienteEncontrado(false);
      setClienteNaoEncontrado(true);
    }
  }

  async function cadastrarCliente() {
    const resposta = await fetch("http://127.0.0.1:8000/api/clientes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        telefone,
        nome: nomeCliente,
      }),
    });

    if (resposta.ok) {
      const cliente = await resposta.json();

      setClienteId(cliente.id);
      setNomeCliente(cliente.nome);
      setClienteEncontrado(true);
      setClienteNaoEncontrado(false);
      await carregarEnderecos(cliente.id);
    }
  }

  async function carregarEnderecos(clienteId: number) {
    const resposta = await fetch(
      `http://127.0.0.1:8000/api/clientes/${clienteId}/enderecos`,
    );

    if (resposta.ok) {
      const dados = await resposta.json();

      setEnderecos(dados);

      if (dados.length > 0) {
        setEnderecoSelecionado(dados[0].id);
      }
    }
  }

  async function cadastrarEndereco() {
    if (!clienteId) {
      return;
    }

    const resposta = await fetch("http://127.0.0.1:8000/api/enderecos", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        cliente_id: clienteId,
        logradouro,
        numero,
        complemento: complemento || null,
        bairro,
        cidade,
        referencia: referencia || null,
      }),
    });

    if (resposta.ok) {
      const endereco = await resposta.json();

      await carregarEnderecos(clienteId);
      setEnderecoSelecionado(endereco.id);

      setLogradouro("");
      setNumero("");
      setComplemento("");
      setBairro("");
      setCidade("");
      setReferencia("");
    }
  }

  async function finalizarPedido() {
    if (!clienteId || !enderecoSelecionado) {
      alert("Selecione um cliente e um endereço de entrega.");
      return;
    }

    const itensAgrupados = carrinho.reduce(
      (itens, produto) => {
        const itemExistente = itens.find(
          (item) => item.produto_id === produto.id,
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
      [] as { produto_id: number; quantidade: number }[],
    );

    const resposta = await fetch("http://127.0.0.1:8000/api/pedidos", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        cliente_id: clienteId,
        endereco_id: enderecoSelecionado,
        itens: itensAgrupados,
      }),
    });

    if (resposta.ok) {
      const pedido = await resposta.json();

      alert(
        `Pedido #${pedido.id} criado com sucesso!\nStatus: ${pedido.status}\nTotal: R$ ${pedido.total
          .toFixed(2)
          .replace(".", ",")}`,
      );

      setCarrinho([]);
      setEtapaFinalizacao(false);
      setTelefone("");
      setClienteId(null);
      setNomeCliente("");
      setClienteEncontrado(false);
      setClienteNaoEncontrado(false);
      setEnderecos([]);
      setEnderecoSelecionado(null);
    }
  }

  const total = carrinho.reduce((soma, produto) => soma + produto.preco, 0);

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
          <h2 className="mb-6 text-2xl font-bold text-gray-900">Cardápio</h2>

          <div className="grid gap-5 md:grid-cols-2">
            {produtos.map((produto) => (
              <div
                key={produto.id}
                className="rounded-xl bg-white p-6 shadow-sm"
              >
                <h3 className="text-xl font-semibold text-gray-900">
                  {produto.nome}
                </h3>

                <p className="mt-2 text-gray-600">{produto.descricao}</p>

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
          <h2 className="text-xl font-bold text-gray-900">Seu pedido</h2>

          {carrinho.length === 0 ? (
            <p className="mt-4 text-gray-500">Seu carrinho está vazio.</p>
          ) : (
            <div className="mt-4">
              <div className="space-y-3">
                {carrinho.map((produto, indice) => (
                  <div
                    key={`${produto.id}-${indice}`}
                    className="flex justify-between gap-3 border-b border-gray-200 pb-3"
                  >
                    <span className="text-gray-700">{produto.nome}</span>

                    <span className="font-medium text-gray-900">
                      R$ {produto.preco.toFixed(2).replace(".", ",")}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex justify-between text-lg font-bold text-gray-900">
                <span>Total</span>
                <span>R$ {total.toFixed(2).replace(".", ",")}</span>
              </div>

              <button
                onClick={() => setEtapaFinalizacao(true)}
                className="mt-6 w-full cursor-pointer rounded-lg bg-green-600 py-3 font-semibold text-white hover:bg-green-700"
              >
                Continuar pedido
              </button>

              {etapaFinalizacao && (
                <div className="mt-6 border-t border-gray-200 pt-5">
                  <h3 className="font-semibold text-gray-900">Identificação</h3>

                  <label className="mt-4 block text-sm font-medium text-gray-700">
                    Telefone
                  </label>

                  <input
                    type="tel"
                    value={telefone}
                    onChange={(evento) => setTelefone(evento.target.value)}
                    placeholder="(54) 99999-9999"
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
                  />

                  <button
                    onClick={buscarCliente}
                    className="mt-3 w-full cursor-pointer rounded-lg bg-gray-800 py-2 font-medium text-white hover:bg-gray-900"
                  >
                    Continuar
                  </button>

                  {clienteEncontrado && (
                    <div className="mt-4 rounded-lg bg-green-100 p-3 text-green-800">
                      Olá, {nomeCliente}!
                    </div>
                  )}

                  {clienteEncontrado && (
                    <div className="mt-5">
                      <h3 className="font-semibold text-gray-900">
                        Endereço de entrega
                      </h3>

                      {enderecos.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {enderecos.map((endereco) => (
                            <label
                              key={endereco.id}
                              className="flex cursor-pointer gap-3 rounded-lg border border-gray-300 p-3"
                            >
                              <input
                                type="radio"
                                name="endereco"
                                checked={enderecoSelecionado === endereco.id}
                                onChange={() =>
                                  setEnderecoSelecionado(endereco.id)
                                }
                              />

                              <div>
                                <p className="font-medium text-gray-900">
                                  {endereco.logradouro}, {endereco.numero}
                                </p>

                                <p className="text-sm text-gray-500">
                                  {endereco.bairro} - {endereco.cidade}
                                </p>
                              </div>
                            </label>
                          ))}
                        </div>
                      )}

                      <div className="mt-5 space-y-3">
                        <p className="font-medium text-gray-800">
                          Cadastrar novo endereço
                        </p>

                        <input
                          value={logradouro}
                          onChange={(evento) =>
                            setLogradouro(evento.target.value)
                          }
                          placeholder="Rua"
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
                        />

                        <input
                          value={numero}
                          onChange={(evento) => setNumero(evento.target.value)}
                          placeholder="Número"
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
                        />

                        <input
                          value={complemento}
                          onChange={(evento) =>
                            setComplemento(evento.target.value)
                          }
                          placeholder="Complemento"
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
                        />

                        <input
                          value={bairro}
                          onChange={(evento) => setBairro(evento.target.value)}
                          placeholder="Bairro"
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
                        />

                        <input
                          value={cidade}
                          onChange={(evento) => setCidade(evento.target.value)}
                          placeholder="Cidade"
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
                        />

                        <input
                          value={referencia}
                          onChange={(evento) =>
                            setReferencia(evento.target.value)
                          }
                          placeholder="Referência"
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
                        />

                        <button
                          onClick={cadastrarEndereco}
                          disabled={
                            !logradouro || !numero || !bairro || !cidade
                          }
                          className="w-full cursor-pointer rounded-lg bg-gray-800 py-2 font-medium text-white hover:bg-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Salvar endereço
                        </button>
                      </div>

                      {enderecoSelecionado && (
                        <button
                          onClick={finalizarPedido}
                          className="mt-5 w-full cursor-pointer rounded-lg bg-green-600 py-3 font-semibold text-white hover:bg-green-700"
                        >
                          Confirmar pedido
                        </button>
                      )}
                    </div>
                  )}

                  {clienteNaoEncontrado && (
                    <div className="mt-4 rounded-lg bg-yellow-100 p-4">
                      <p className="font-medium text-yellow-800">
                        Telefone ainda não cadastrado.
                      </p>

                      <label className="mt-4 block text-sm font-medium text-gray-700">
                        Como você gostaria de ser chamado?
                      </label>

                      <input
                        type="text"
                        value={nomeCliente}
                        onChange={(evento) =>
                          setNomeCliente(evento.target.value)
                        }
                        placeholder="Seu nome"
                        className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900"
                      />

                      <button
                        onClick={cadastrarCliente}
                        disabled={!nomeCliente.trim()}
                        className="mt-3 w-full cursor-pointer rounded-lg bg-red-600 py-2 font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Cadastrar e continuar
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}
