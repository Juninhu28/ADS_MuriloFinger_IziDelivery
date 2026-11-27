"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

type Produto = {
  id: number;
  nome: string;
  descricao: string | null;
  preco: number;
  ativo: boolean;
  imagem_url: string | null;
};

export default function ProdutosEstabelecimento() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [preco, setPreco] = useState("");
  const [produtoEditando, setProdutoEditando] = useState<number | null>(null);
  const [imagem, setImagem] = useState<File | null>(null);
  const [imagemUrl, setImagemUrl] = useState<string | null>(null);
  const [previewImagem, setPreviewImagem] = useState<string | null>(null);
  const [inputImagemKey, setInputImagemKey] = useState(0);
  const formularioRef = useRef<HTMLElement | null>(null);
  const [confirmacao, setConfirmacao] = useState<{
    titulo: string;
    mensagem: string;
    textoConfirmar: string;
    acao: () => void;
  } | null>(null);

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

  function confirmarAlteracaoStatus(produto: Produto) {
    if (produto.ativo) {
      solicitarConfirmacao(
        "Desativar produto?",
        `${produto.nome} deixará de aparecer no cardápio dos clientes. O produto continuará cadastrado e poderá ser reativado posteriormente.`,
        () => alterarStatusProduto(produto.id, false),
        "Desativar produto",
      );

      return;
    }

    alterarStatusProduto(produto.id, true);
  }

  function iniciarEdicao(produto: Produto) {
    const abrirProduto = () => {
      setProdutoEditando(produto.id);
      setNome(produto.nome);
      setDescricao(produto.descricao ?? "");
      setPreco(produto.preco.toFixed(2).replace(".", ","));

      setImagem(null);
      setImagemUrl(produto.imagem_url);

      setPreviewImagem(
        produto.imagem_url
          ? `http://127.0.0.1:8000${produto.imagem_url}`
          : null,
      );

      setInputImagemKey((valor) => valor + 1);

      setTimeout(() => {
        formularioRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 50);
    };

    if (produtoEditando === produto.id) {
      formularioRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      return;
    }

    if (formularioTemDados) {
      solicitarConfirmacao(
        "Descartar alterações?",
        "Existe um produto sendo preenchido ou editado. Se continuar, todas as alterações não salvas serão perdidas.",
        abrirProduto,
      );
      return;
    }

    abrirProduto();
  }

  function removerImagem() {
    if (previewImagem?.startsWith("blob:")) {
      URL.revokeObjectURL(previewImagem);
    }

    setImagem(null);
    setImagemUrl(null);
    setPreviewImagem(null);
    setInputImagemKey((valor) => valor + 1);
  }

  function cancelarEdicao() {
    solicitarConfirmacao(
      "Cancelar edição?",
      "Todas as alterações feitas neste produto serão perdidas.",
      limparFormulario,
    );
  }

  function cancelarCadastro() {
    solicitarConfirmacao(
      "Cancelar cadastro?",
      "Todos os dados preenchidos neste novo produto serão perdidos.",
      limparFormulario,
    );
  }

  useEffect(() => {
    carregarProdutos();
  }, []);

  async function enviarImagem() {
    if (!imagem) {
      return imagemUrl;
    }

    const formulario = new FormData();
    formulario.append("imagem", imagem);

    const resposta = await fetch(
      "http://127.0.0.1:8000/api/produtos/upload-imagem",
      {
        method: "POST",
        body: formulario,
      },
    );

    if (!resposta.ok) {
      throw new Error("Erro ao enviar imagem");
    }

    const dados = await resposta.json();

    return dados.imagem_url;
  }

  function limparFormulario() {
    setProdutoEditando(null);
    setNome("");
    setDescricao("");
    setPreco("");
    setImagem(null);
    setImagemUrl(null);
    setPreviewImagem(null);
    setInputImagemKey((valor) => valor + 1);
  }

  function solicitarConfirmacao(
    titulo: string,
    mensagem: string,
    acao: () => void,
    textoConfirmar = "Descartar alterações",
  ) {
    setConfirmacao({
      titulo,
      mensagem,
      textoConfirmar,
      acao,
    });
  }

  async function salvarProduto(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!imagem && !imagemUrl) {
      alert("Adicione uma imagem ao produto antes de salvar.");
      return;
    }

    const precoNumerico = Number(preco.replace(",", "."));

    if (Number.isNaN(precoNumerico) || precoNumerico <= 0) {
      alert("Informe um preço válido.");
      return;
    }

    const url = produtoEditando
      ? `http://127.0.0.1:8000/api/produtos/${produtoEditando}`
      : "http://127.0.0.1:8000/api/produtos";

    const metodo = produtoEditando ? "PUT" : "POST";

    const imagemDoProduto = await enviarImagem();

    const resposta = await fetch(url, {
      method: metodo,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        nome,
        descricao,
        preco: precoNumerico,
        imagem_url: imagemDoProduto,
      }),
    });

    if (resposta.ok) {
      setNome("");
      setDescricao("");
      setPreco("");
      setImagem(null);
      setImagemUrl(null);
      setPreviewImagem(null);
      setProdutoEditando(null);
      setInputImagemKey((valor) => valor + 1);

      carregarProdutos();
    }
  }

  const formularioTemDados =
    nome.trim() !== "" ||
    descricao.trim() !== "" ||
    preco.trim() !== "" ||
    imagem !== null ||
    imagemUrl !== null;

  const produtoEmEdicao = produtos.find(
    (produto) => produto.id === produtoEditando,
  );

  const produtoEmEdicaoInativo = produtoEmEdicao && !produtoEmEdicao.ativo;

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-8 text-3xl font-bold text-gray-900">Produtos</h1>

        <div className="grid gap-8 lg:grid-cols-2">
          <section
            ref={formularioRef}
            className="rounded-xl bg-white p-6 shadow-sm"
          >
            <h2 className="mb-5 text-xl font-bold text-gray-900">
              {produtoEditando ? "Editar produto" : "Cadastrar produto"}
            </h2>

            {produtoEmEdicaoInativo && (
              <div className="mb-5 rounded-lg border border-yellow-300 bg-yellow-50 p-4 text-sm text-yellow-800">
                <p className="font-semibold">Este produto está inativo.</p>

                <p className="mt-1">
                  Você pode editar normalmente. As alterações serão salvas, mas
                  o produto continuará fora do cardápio até ser reativado.
                </p>
              </div>
            )}

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
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Foto do produto
                </label>

                <input
                  key={inputImagemKey}
                  id="imagem-produto"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(evento) => {
                    const arquivo = evento.target.files?.[0] ?? null;

                    if (!arquivo) {
                      return;
                    }

                    if (previewImagem?.startsWith("blob:")) {
                      URL.revokeObjectURL(previewImagem);
                    }

                    setImagem(arquivo);
                    setPreviewImagem(URL.createObjectURL(arquivo));
                  }}
                />

                {!previewImagem ? (
                  <label
                    htmlFor="imagem-produto"
                    className="flex cursor-pointer items-center gap-4 rounded-xl border-2 border-dashed border-gray-300 p-5 transition hover:border-red-400 hover:bg-red-50"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        className="h-7 w-7"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M4 16l4.5-4.5 3 3L14 12l6 6M6 20h12a2 2 0 002-2V8a2 2 0 00-2-2h-3l-1-2H9L8 6H6a2 2 0 00-2 2v10a2 2 0 002 2z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M18 2v4M16 4h4"
                        />
                      </svg>
                    </div>

                    <div>
                      <p className="font-medium text-gray-900">
                        Adicionar imagem
                      </p>

                      <p className="mt-1 text-sm text-gray-500">
                        JPG, PNG ou WEBP
                      </p>
                    </div>
                  </label>
                ) : (
                  <div className="space-y-3">
                    <div className="overflow-hidden rounded-xl border border-gray-200 bg-gray-100">
                      <img
                        src={previewImagem}
                        alt="Prévia do produto"
                        className="h-40 w-full object-cover"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <label
                        htmlFor="imagem-produto"
                        className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 font-medium text-gray-700 transition hover:bg-gray-100"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          className="h-5 w-5"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 5v14M5 12h14"
                          />
                        </svg>
                        Trocar imagem
                      </label>

                      <button
                        type="button"
                        onClick={removerImagem}
                        className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-red-300 px-4 py-2.5 font-medium text-red-600 transition hover:bg-red-50"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          className="h-5 w-5"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M6 7h12M10 11v6M14 11v6M9 7l1-3h4l1 3M8 7l1 13h6l1-13"
                          />
                        </svg>
                        Remover imagem
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Preço
                </label>

                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-medium text-gray-500">
                    R$
                  </span>

                  <input
                    type="text"
                    inputMode="decimal"
                    value={preco}
                    placeholder="0,00"
                    onChange={(evento) => {
                      let valor = evento.target.value.replace(/[^\d,]/g, "");

                      const partes = valor.split(",");

                      if (partes.length > 2) {
                        valor = `${partes[0]},${partes.slice(1).join("")}`;
                      }

                      if (valor.includes(",")) {
                        const [inteiro, decimal = ""] = valor.split(",");
                        valor = `${inteiro},${decimal.slice(0, 2)}`;
                      }

                      setPreco(valor);
                    }}
                    required
                    className="w-full rounded-lg border border-gray-300 py-2 pl-12 pr-4 text-gray-900"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={!imagem && !imagemUrl}
                className="w-full cursor-pointer rounded-lg bg-red-600 py-3 font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
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

              {!produtoEditando && formularioTemDados && (
                <button
                  type="button"
                  onClick={cancelarCadastro}
                  className="w-full cursor-pointer rounded-lg bg-gray-500 py-3 font-semibold text-white hover:bg-gray-600"
                >
                  Cancelar cadastro
                </button>
              )}
            </form>
          </section>

          <section className="rounded-xl bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-xl font-bold text-gray-900">
              Produtos cadastrados
            </h2>

            <div>
              {produtos.map((produto) => (
                <div
                  key={produto.id}
                  className="border-b border-gray-200 py-5 first:pt-0 last:border-b-0 last:pb-0"
                >
                  <div className="flex items-start gap-4">
                    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                      {produto.imagem_url ? (
                        <img
                          src={`http://127.0.0.1:8000${produto.imagem_url}`}
                          alt={produto.nome}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center px-2 text-center text-xs text-gray-400">
                          Sem foto
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="break-words font-semibold text-gray-900">
                        {produto.nome}
                      </h3>

                      <p className="mt-1 break-words text-sm text-gray-500">
                        {produto.descricao || "Sem descrição"}
                      </p>

                      <div className="mt-4 flex flex-wrap items-center gap-2">
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
                          onClick={() => confirmarAlteracaoStatus(produto)}
                          disabled={produtoEditando === produto.id}
                          className={`rounded-lg px-3 py-2 text-sm font-medium text-white ${
                            produtoEditando === produto.id
                              ? "cursor-not-allowed bg-gray-400 opacity-60"
                              : produto.ativo
                                ? "cursor-pointer bg-red-600 hover:bg-red-700"
                                : "cursor-pointer bg-green-600 hover:bg-green-700"
                          }`}
                        >
                          {produtoEditando === produto.id
                            ? "Em edição"
                            : produto.ativo
                              ? "Desativar"
                              : "Reativar"}
                        </button>
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="whitespace-nowrap text-xl font-bold text-red-600">
                        R$ {produto.preco.toFixed(2).replace(".", ",")}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
      {confirmacao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-xl font-bold text-gray-900">
              {confirmacao.titulo}
            </h2>

            <p className="mt-3 text-gray-600">{confirmacao.mensagem}</p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmacao(null)}
                className="cursor-pointer rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 hover:bg-gray-100"
              >
                Voltar
              </button>

              <button
                type="button"
                onClick={() => {
                  const acao = confirmacao.acao;
                  setConfirmacao(null);
                  acao();
                }}
                className="cursor-pointer rounded-lg bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-700"
              >
                {confirmacao.textoConfirmar}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
