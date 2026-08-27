/**
 * Controla a tela administrativa, a sessão local e a geração do pacote de
 * atualização. A leitura dos microdados permanece em AtualizacaoDosDadosDoVigitel.js.
 */
(function () {
  "use strict";

  const CHAVE_DA_SESSAO = "sessaoAdministrativaDoVigitel";
  let processamentoAtual = null;
  let arquivosGerados = null;

  /** Retorna o primeiro elemento correspondente ao seletor informado. */
  function elemento(seletor) {
    return document.querySelector(seletor);
  }

  /** Converte Base64 em bytes para usar a credencial derivada pelo navegador. */
  function base64ParaBytes(texto) {
    return Uint8Array.from(atob(texto), caractere => caractere.charCodeAt(0));
  }

  /** Converte bytes em Base64 sem depender de bibliotecas externas. */
  function bytesParaBase64(bytes) {
    let texto = "";
    bytes.forEach(byte => { texto += String.fromCharCode(byte); });
    return btoa(texto);
  }

  /** Deriva a senha digitada com PBKDF2 e os parâmetros registrados na configuração. */
  async function derivarSenha(senha) {
    const material = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(senha),
      "PBKDF2",
      false,
      ["deriveBits"]
    );
    const bits = await crypto.subtle.deriveBits({
      name: "PBKDF2",
      salt: base64ParaBytes(CONFIGURACAO_DA_ADMINISTRACAO.sal),
      iterations: CONFIGURACAO_DA_ADMINISTRACAO.iteracoes,
      hash: CONFIGURACAO_DA_ADMINISTRACAO.algoritmo
    }, material, 256);
    return bytesParaBase64(new Uint8Array(bits));
  }

  /** Compara textos de mesmo tamanho sem encerrar no primeiro caractere diferente. */
  function comparacaoConstante(textoA, textoB) {
    if (textoA.length !== textoB.length) return false;
    let diferenca = 0;
    for (let indice = 0; indice < textoA.length; indice += 1) {
      diferenca |= textoA.charCodeAt(indice) ^ textoB.charCodeAt(indice);
    }
    return diferenca === 0;
  }

  /** Informa se a sessão existe e ainda está dentro do prazo configurado. */
  function sessaoValida() {
    try {
      const sessao = JSON.parse(sessionStorage.getItem(CHAVE_DA_SESSAO) || "null");
      return Boolean(sessao?.expiraEm && Date.now() < sessao.expiraEm);
    } catch (_erro) {
      return false;
    }
  }

  /** Cria uma sessão somente para a aba atual e com expiração automática. */
  function criarSessao() {
    const minutos = CONFIGURACAO_DA_ADMINISTRACAO.duracaoDaSessaoEmMinutos;
    sessionStorage.setItem(CHAVE_DA_SESSAO, JSON.stringify({ expiraEm: Date.now() + minutos * 60 * 1000 }));
  }

  /** Alterna a tela de login e o painel sem expor conteúdo administrativo antes da sessão. */
  function atualizarTelaDaSessao() {
    const autenticada = sessaoValida();
    elemento("#areaDeLogin").hidden = autenticada;
    elemento("#painelAdministrativo").hidden = !autenticada;
    elemento("#botaoSair").hidden = !autenticada;
    if (autenticada) {
      elemento("#estadoDaSessao").textContent = `Sessão local ativa por até ${CONFIGURACAO_DA_ADMINISTRACAO.duracaoDaSessaoEmMinutos} minutos.`;
    }
  }

  /** Acrescenta uma mensagem datada ao histórico visível do processamento. */
  function registrar(mensagem, tipo = "informacao") {
    const lista = elemento("#registroDaAtualizacao");
    const item = document.createElement("li");
    item.className = `registro-item ${tipo}`;
    item.innerHTML = `<time>${new Date().toLocaleTimeString("pt-BR")}</time><span>${escaparHtml(mensagem)}</span>`;
    lista.appendChild(item);
    lista.scrollTop = lista.scrollHeight;
  }

  /** Escapa texto de arquivo ou erro antes de incluí-lo no HTML. */
  function escaparHtml(valor) {
    return String(valor ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  /** Exibe uma mensagem curta junto ao formulário de login. */
  function mensagemDoLogin(texto, erro = false) {
    const saida = elemento("#mensagemDoLogin");
    saida.textContent = texto;
    saida.classList.toggle("erro", erro);
  }

  /** Confere usuário e senha e abre a sessão quando os dois valores coincidem. */
  async function autenticar(evento) {
    evento.preventDefault();
    const botao = elemento("#botaoEntrar");
    botao.disabled = true;
    mensagemDoLogin("Conferindo a credencial...");
    try {
      const usuarioCorreto = elemento("#usuarioAdministrativo").value.trim() === CONFIGURACAO_DA_ADMINISTRACAO.usuario;
      const derivada = await derivarSenha(elemento("#senhaAdministrativa").value);
      const senhaCorreta = comparacaoConstante(derivada, CONFIGURACAO_DA_ADMINISTRACAO.senhaDerivada);
      if (!usuarioCorreto || !senhaCorreta) {
        mensagemDoLogin("Usuário ou senha incorretos.", true);
        return;
      }
      criarSessao();
      elemento("#formularioDeLogin").reset();
      mensagemDoLogin("");
      atualizarTelaDaSessao();
      registrar("Área administrativa aberta.");
    } catch (erro) {
      mensagemDoLogin(`Não foi possível conferir a credencial: ${erro.message}`, true);
    } finally {
      botao.disabled = false;
    }
  }

  /** Encerra a sessão e remove da memória os resultados ainda não baixados. */
  function sair() {
    sessionStorage.removeItem(CHAVE_DA_SESSAO);
    processamentoAtual = null;
    arquivosGerados = null;
    atualizarTelaDaSessao();
  }

  /** Alterna a visibilidade da senha sem alterar o valor digitado. */
  function alternarSenha() {
    const campo = elemento("#senhaAdministrativa");
    const mostrar = campo.type === "password";
    campo.type = mostrar ? "text" : "password";
    elemento("#mostrarSenha").textContent = mostrar ? "Ocultar" : "Mostrar";
  }

  /** Formata bytes para facilitar a conferência dos arquivos selecionados. */
  function formatarTamanho(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
    return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
  }

  /** Atualiza o resumo de nomes e tamanhos exibido sob um campo de arquivo. */
  function resumirSelecao(campo, destino) {
    const arquivos = [...campo.files];
    elemento(destino).textContent = arquivos.length
      ? arquivos.map(arquivo => `${arquivo.name} (${formatarTamanho(arquivo.size)})`).join(" · ")
      : "Nenhum arquivo selecionado.";
    processamentoAtual = null;
    arquivosGerados = null;
    elemento("#botaoGerarPacote").disabled = true;
    elemento("#botaoBaixarPacote").disabled = true;
  }

  /** Reúne os arquivos gerais e o recorte opcional de população negra. */
  function arquivosDeDadosSelecionados() {
    const gerais = [...elemento("#arquivosDoVigitel").files].map(arquivo => ({ arquivo, populacao: "População Geral" }));
    const negra = [...elemento("#arquivosDaPopulacaoNegra").files].map(arquivo => ({ arquivo, populacao: "População Negra" }));
    return gerais.concat(negra);
  }

  /** Bloqueia ou libera os controles durante leituras demoradas. */
  function definirOcupado(ocupado, mensagem = "") {
    document.body.classList.toggle("administracao-ocupada", ocupado);
    elemento("#botaoProcessar").disabled = ocupado;
    elemento("#botaoGerarPacote").disabled = ocupado || !processamentoAtual?.resultado;
    elemento("#botaoBaixarPacote").disabled = ocupado || !arquivosGerados;
    elemento("#progressoDaAtualizacao").hidden = !ocupado;
    elemento("#textoDoProgresso").textContent = mensagem;
  }

  /** Mostra os números principais encontrados nos arquivos aprovados. */
  function mostrarResumoDoProcessamento(processamento) {
    const anos = [...new Set(processamento.diagnosticos.flatMap(item => [...item.anos]))].sort();
    const linhas = processamento.diagnosticos.reduce((total, item) => total + [...item.linhasPorAno.values()].reduce((soma, valor) => soma + valor, 0), 0);
    const indicadoresCalculados = new Set(
      [...processamento.resultado.acumuladores.base.keys()]
        .map(chave => chave.split("|")[6])
    );
    elemento("#quantidadeDeAnos").textContent = anos.length;
    elemento("#listaDeAnos").textContent = anos.join(", ") || "Nenhum";
    elemento("#quantidadeDeLinhas").textContent = linhas.toLocaleString("pt-BR");
    elemento("#quantidadeDeIndicadores").textContent = indicadoresCalculados.size;
    elemento("#quantidadeDeErros").textContent = processamento.validacao.erros.length;
  }

  /** Lê o dicionário e os dados, interrompendo o fluxo quando alguma integridade falha. */
  async function processarArquivos() {
    if (!sessaoValida()) {
      sair();
      return;
    }
    const dicionarioArquivo = elemento("#arquivoDoDicionario").files[0];
    const itens = arquivosDeDadosSelecionados();
    if (!dicionarioArquivo) {
      registrar("Selecione o dicionário antes de iniciar.", "erro");
      return;
    }
    if (!itens.length) {
      registrar("Selecione ao menos um arquivo de dados do Vigitel.", "erro");
      return;
    }
    elemento("#registroDaAtualizacao").innerHTML = "";
    definirOcupado(true, "Lendo o dicionário...");
    try {
      const dicionario = await AtualizacaoDosDadosDoVigitel.lerDicionario(dicionarioArquivo);
      registrar(`Dicionário lido: ${dicionario.variaveis.size.toLocaleString("pt-BR")} variáveis identificadas.`);
      const processamento = await AtualizacaoDosDadosDoVigitel.processar(
        itens,
        dicionario,
        mensagem => {
          elemento("#textoDoProgresso").textContent = mensagem;
        }
      );
      processamento.dicionario = dicionario;
      processamento.itens = itens;
      processamentoAtual = processamento;
      mostrarResumoDoProcessamento(processamento);
      processamento.validacao.avisos.forEach(aviso => registrar(aviso, "aviso"));
      if (processamento.validacao.erros.length) {
        processamento.validacao.erros.forEach(erro => registrar(erro, "erro"));
        registrar("A atualização foi bloqueada. Nenhum arquivo foi gerado.", "erro");
        return;
      }
      const indicadoresCalculados = new Set(
        [...processamento.resultado.acumuladores.base.keys()]
          .map(chave => chave.split("|")[6])
      );
      registrar(`Conferência concluída: ${indicadoresCalculados.size} indicadores produziram resultados com denominador válido.`, "sucesso");
      if (processamento.configuracao.pendentes.length) {
        registrar(`Indicadores novos aguardando definição completa: ${processamento.configuracao.pendentes.join(", ")}.`, "aviso");
      }
      elemento("#botaoGerarPacote").disabled = false;
    } catch (erro) {
      processamentoAtual = null;
      registrar(`Falha no processamento: ${erro.message}`, "erro");
    } finally {
      definirOcupado(false);
    }
  }

  /** Monta os arquivos do painel somente depois de uma validação sem erros. */
  async function gerarPacote() {
    if (!processamentoAtual?.resultado || processamentoAtual.validacao.erros.length) {
      registrar("Execute uma validação aprovada antes de gerar os arquivos.", "erro");
      return;
    }
    definirOcupado(true, "Preparando os arquivos atualizados...");
    try {
      arquivosGerados = await AtualizacaoDosDadosDoVigitel.gerarArquivos(
        processamentoAtual.resultado,
        processamentoAtual.diagnosticos,
        processamentoAtual.dicionario,
        processamentoAtual.configuracao,
        mensagem => { elemento("#textoDoProgresso").textContent = mensagem; }
      );
      elemento("#quantidadeDeArquivos").textContent = arquivosGerados.arquivos.size;
      registrar(`${arquivosGerados.arquivos.size} arquivos foram preparados e assinados.`, "sucesso");
      elemento("#botaoBaixarPacote").disabled = false;
    } catch (erro) {
      arquivosGerados = null;
      registrar(`Não foi possível montar o pacote: ${erro.message}`, "erro");
    } finally {
      definirOcupado(false);
    }
  }

  /** Cria o ZIP final no navegador e inicia o download sem enviar dados para terceiros. */
  async function baixarPacote() {
    if (!arquivosGerados) return;
    definirOcupado(true, "Compactando o pacote...");
    try {
      const pacote = new JSZip();
      arquivosGerados.arquivos.forEach((conteudo, nome) => pacote.file(nome, conteudo));
      const arquivo = await pacote.generateAsync(
        { type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } },
        metadados => {
          elemento("#textoDoProgresso").textContent = `Compactando: ${metadados.percent.toFixed(0)}%`;
        }
      );
      const endereco = URL.createObjectURL(arquivo);
      const link = document.createElement("a");
      link.href = endereco;
      link.download = "AtualizacaoDoObservatorio.zip";
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(endereco), 30000);
      registrar(`Pacote baixado (${formatarTamanho(arquivo.size)}).`, "sucesso");
    } catch (erro) {
      registrar(`Não foi possível compactar o pacote: ${erro.message}`, "erro");
    } finally {
      definirOcupado(false);
    }
  }

  /** Confere bibliotecas, registra eventos e restaura uma sessão válida ao abrir a página. */
  function iniciar() {
    if (!window.crypto?.subtle || !window.Papa || !window.XLSX || !window.JSZip || !window.AtualizacaoDosDadosDoVigitel) {
      mensagemDoLogin("O navegador não carregou todos os componentes necessários. Atualize a página por um servidor local ou pelo GitHub Pages.", true);
      elemento("#botaoEntrar").disabled = true;
      return;
    }
    elemento("#formularioDeLogin").addEventListener("submit", autenticar);
    elemento("#mostrarSenha").addEventListener("click", alternarSenha);
    elemento("#botaoSair").addEventListener("click", sair);
    elemento("#arquivoDoDicionario").addEventListener("change", evento => resumirSelecao(evento.currentTarget, "#resumoDoDicionario"));
    elemento("#arquivosDoVigitel").addEventListener("change", evento => resumirSelecao(evento.currentTarget, "#resumoDosDados"));
    elemento("#arquivosDaPopulacaoNegra").addEventListener("change", evento => resumirSelecao(evento.currentTarget, "#resumoDaPopulacaoNegra"));
    elemento("#botaoProcessar").addEventListener("click", processarArquivos);
    elemento("#botaoGerarPacote").addEventListener("click", gerarPacote);
    elemento("#botaoBaixarPacote").addEventListener("click", baixarPacote);
    atualizarTelaDaSessao();
  }

  document.addEventListener("DOMContentLoaded", iniciar);
})();
