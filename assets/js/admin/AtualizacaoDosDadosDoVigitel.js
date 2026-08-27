/**
 * Executa, no navegador, a leitura e a conferência dos arquivos enviados pela
 * administração. As regras deste arquivo reproduzem as regras documentadas em
 * RecalculoDosIndicadores.py; qualquer alteração metodológica deve ser feita
 * nos dois arquivos e conferida com o dicionário da edição.
 */
(function () {
  "use strict";

  const REGIOES = ["Norte", "Nordeste", "Centro-Oeste", "Sudeste", "Sul"];
  const UFS = ["AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MS", "MT", "PA", "PB", "PE", "PI", "PR", "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO"];
  const SEXOS = ["Feminino", "Masculino"];
  const FAIXAS = ["18 a 24 anos", "25 a 34 anos", "35 a 44 anos", "45 a 54 anos", "55 a 64 anos", "65 anos ou mais"];
  const POPULACOES = ["População Geral", "População Negra"];
  const IDADES = Array.from({ length: 62 }, (_, indice) => `${indice + 18} anos`).concat("80 anos ou mais");
  const CIDADE_PARA_UF = {
    1: "SE", 2: "PA", 3: "MG", 4: "RR", 5: "MS", 6: "MT", 7: "PR", 8: "SC", 9: "CE",
    10: "GO", 11: "PB", 12: "AP", 13: "AL", 14: "AM", 15: "RN", 16: "TO", 17: "RS",
    18: "RO", 19: "PE", 20: "AC", 21: "RJ", 22: "BA", 23: "MA", 24: "SP", 25: "PI",
    26: "ES", 27: "DF"
  };
  const NOME_DA_CIDADE_PARA_UF = {
    aracaju: "SE", belem: "PA", belohorizonte: "MG", boavista: "RR", campogrande: "MS",
    cuiaba: "MT", curitiba: "PR", florianopolis: "SC", fortaleza: "CE", goiania: "GO",
    joaopessoa: "PB", macapa: "AP", maceio: "AL", manaus: "AM", natal: "RN",
    palmas: "TO", portoalegre: "RS", portovelho: "RO", recife: "PE", riobranco: "AC",
    riodejaneiro: "RJ", salvador: "BA", saoluis: "MA", saopaulo: "SP", teresina: "PI",
    vitoria: "ES", brasilia: "DF", distritofederal: "DF"
  };
  const UF_PARA_REGIAO = {
    AC: "Norte", AL: "Nordeste", AM: "Norte", AP: "Norte", BA: "Nordeste", CE: "Nordeste",
    DF: "Centro-Oeste", ES: "Sudeste", GO: "Centro-Oeste", MA: "Nordeste", MG: "Sudeste",
    MS: "Centro-Oeste", MT: "Centro-Oeste", PA: "Norte", PB: "Nordeste", PE: "Nordeste",
    PI: "Nordeste", PR: "Sul", RJ: "Sudeste", RN: "Nordeste", RO: "Norte", RR: "Norte",
    RS: "Sul", SC: "Sul", SE: "Nordeste", SP: "Sudeste", TO: "Norte"
  };
  const ARQUIVOS_POR_PREFIXO = {
    TAB: "assets/js/dados/idade-detalhada/DadosIdadeDetalhadaTabagismo.js",
    ALC: "assets/js/dados/idade-detalhada/DadosIdadeDetalhadaAlcool.js",
    IMC: "assets/js/dados/idade-detalhada/DadosIdadeDetalhadaEstadoNutricional.js",
    CA: "assets/js/dados/idade-detalhada/DadosIdadeDetalhadaAlimentacao.js",
    AF: "assets/js/dados/idade-detalhada/DadosIdadeDetalhadaAtividadeFisica.js",
    AS: "assets/js/dados/idade-detalhada/DadosIdadeDetalhadaAutoavaliacaoDeSaude.js",
    PC: "assets/js/dados/idade-detalhada/DadosIdadeDetalhadaPrevencaoDoCancer.js",
    MR: "assets/js/dados/idade-detalhada/DadosIdadeDetalhadaMorbidades.js",
    CT: "assets/js/dados/idade-detalhada/DadosIdadeDetalhadaConducaoETransito.js"
  };

  /** Remove acentos e sinais para comparar rótulos sem alterar o texto exibido. */
  function normalizarTexto(valor) {
    return String(valor ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "");
  }

  /** Converte uma lista textual de códigos em números, sem avaliar expressões. */
  function separarCodigos(valor) {
    return String(valor ?? "")
      .split(/[;,| ]+/)
      .map(item => Number(String(item).replace(",", ".")))
      .filter(Number.isFinite);
  }

  /** Converte um valor de planilha para número, respeitando o mapa de códigos do dicionário. */
  function numero(valor, campo, dicionario) {
    if (typeof valor === "number") return Number.isFinite(valor) ? valor : NaN;
    const texto = String(valor ?? "").trim();
    if (!texto) return NaN;
    const rotulos = dicionario?.rotulos?.get(campo);
    const codigoDoRotulo = rotulos?.get(normalizarTexto(texto));
    if (codigoDoRotulo !== undefined) return codigoDoRotulo;
    let preparado = texto.replace(/\s/g, "");
    if (preparado.includes(",")) {
      preparado = preparado.includes(".")
        ? preparado.replace(/\./g, "").replace(",", ".")
        : preparado.replace(",", ".");
    }
    const convertido = Number(preparado);
    if (Number.isFinite(convertido)) return convertido;
    const simplificado = normalizarTexto(texto);
    if (!/^[qr]\d/i.test(campo) && ["sim", "yes", "verdadeiro"].includes(simplificado)) return 1;
    if (!/^[qr]\d/i.test(campo) && ["nao", "no", "falso"].includes(simplificado)) return 0;
    return NaN;
  }

  /** Localiza um campo mesmo quando a planilha altera apenas maiúsculas, espaços ou acentos. */
  function valorDoCampo(linha, campo) {
    if (Object.prototype.hasOwnProperty.call(linha, campo)) return linha[campo];
    const procurado = normalizarTexto(campo);
    const encontrado = Object.keys(linha).find(chave => normalizarTexto(chave) === procurado);
    return encontrado ? linha[encontrado] : undefined;
  }

  /** Informa se um valor está em uma relação de códigos válidos. */
  function estaEm(valor, codigos) {
    return Number.isFinite(valor) && codigos.includes(valor);
  }

  /** Produz uma regra para indicadores binários já derivados nos microdados. */
  function regraBinaria(campo, evento = 1, sexo = null) {
    return (linha, contexto) => {
      const valor = numero(valorDoCampo(linha, campo), campo, contexto.dicionario);
      const sexoDaLinha = numero(valorDoCampo(linha, "q7"), "q7", contexto.dicionario);
      const elegivel = estaEm(valor, [0, 1]) && (sexo === null || sexoDaLinha === sexo);
      return [elegivel, elegivel && valor === evento];
    };
  }

  /** Produz uma regra com códigos válidos, códigos de evento e recortes opcionais. */
  function regraDeCodigos(campo, validos, eventos, opcoes = {}) {
    return (linha, contexto) => {
      const valor = numero(valorDoCampo(linha, campo), campo, contexto.dicionario);
      const sexo = numero(valorDoCampo(linha, "q7"), "q7", contexto.dicionario);
      const idade = numero(valorDoCampo(linha, "q6"), "q6", contexto.dicionario);
      let elegivel = estaEm(valor, validos);
      if (opcoes.sexo !== undefined) elegivel = elegivel && sexo === opcoes.sexo;
      if (opcoes.idadeMinima !== undefined) elegivel = elegivel && idade >= opcoes.idadeMinima;
      if (opcoes.idadeMaxima !== undefined) elegivel = elegivel && idade <= opcoes.idadeMaxima;
      return [elegivel, elegivel && estaEm(valor, eventos)];
    };
  }

  /** Aplica a regra de ex-fumante com o mesmo fallback utilizado no recálculo Python. */
  function regraExFumante(linha, contexto) {
    const derivada = numero(valorDoCampo(linha, "exfuma"), "exfuma", contexto.dicionario);
    if (estaEm(derivada, [0, 1])) return [true, derivada === 1];
    const q60 = numero(valorDoCampo(linha, "q60"), "q60", contexto.dicionario);
    const q64 = numero(valorDoCampo(linha, "q64"), "q64", contexto.dicionario);
    const elegivel = estaEm(q60, [1, 2, 3]);
    return [elegivel, elegivel && q60 === 3 && estaEm(q64, [1, 2])];
  }

  /** Calcula consumo semanal de álcool considerando primeiro a resposta de consumo. */
  function regraConsumoSemanal(linha, contexto) {
    const q35 = numero(valorDoCampo(linha, "q35"), "q35", contexto.dicionario);
    const q36 = numero(valorDoCampo(linha, "q36"), "q36", contexto.dicionario);
    const elegivel = estaEm(q35, [1, 2, 3, 4]);
    return [elegivel, elegivel && q35 === 1 && estaEm(q36, [1, 2, 3, 4])];
  }

  /** Calcula consumo abusivo dentro do sexo indicado pela metodologia. */
  function regraConsumoAbusivo(sexoEsperado) {
    return (linha, contexto) => {
      const valor = numero(valorDoCampo(linha, "alcabu"), "alcabu", contexto.dicionario);
      const sexo = numero(valorDoCampo(linha, "q7"), "q7", contexto.dicionario);
      const elegivel = estaEm(valor, [0, 1]) && sexo === sexoEsperado;
      return [elegivel, elegivel && valor === 1];
    };
  }

  /** Identifica cinco ou mais doses no dia de maior consumo. */
  function regraCincoDoses(linha, contexto) {
    const valor = numero(valorDoCampo(linha, "r200"), "r200", contexto.dicionario);
    const elegivel = Number.isFinite(valor) && valor >= 0 && valor <= 100;
    return [elegivel, elegivel && valor >= 5];
  }

  /** Calcula exposição ao fumo em casa nas edições em que a variável revisada existe. */
  function regraFumoEmCasa(linha, contexto) {
    const valor = numero(valorDoCampo(linha, "q67"), "q67", contexto.dicionario);
    const elegivel = contexto.ano >= 2018;
    return [elegivel, elegivel && valor === 1];
  }

  /** Calcula exposição ao fumo no trabalho nas edições em que a variável revisada existe. */
  function regraFumoNoTrabalho(linha, contexto) {
    const valor = numero(valorDoCampo(linha, "q68"), "q68", contexto.dicionario);
    const elegivel = contexto.ano >= 2018;
    return [elegivel, elegivel && valor === 1];
  }

  /** Prioriza a definição revista de inatividade e usa a antiga somente como fallback. */
  function regraInatividade(linha, contexto) {
    const revista = numero(valorDoCampo(linha, "inativo2023"), "inativo2023", contexto.dicionario);
    const revistaAlternativa = numero(valorDoCampo(linha, "inativo_2023"), "inativo_2023", contexto.dicionario);
    const antiga = numero(valorDoCampo(linha, "inativo"), "inativo", contexto.dicionario);
    const valor = estaEm(revistaAlternativa, [0, 1])
      ? revistaAlternativa
      : (estaEm(revista, [0, 1]) ? revista : antiga);
    const elegivel = estaEm(valor, [0, 1]);
    return [elegivel, elegivel && valor === 1];
  }

  /** Classifica o IMC calculado com peso e altura imputados. */
  function regraImc(modo) {
    return (linha, contexto) => {
      const peso = numero(valorDoCampo(linha, "q9_i"), "q9_i", contexto.dicionario);
      const altura = numero(valorDoCampo(linha, "q11_i"), "q11_i", contexto.dicionario);
      const imc = peso / ((altura / 100) ** 2);
      const elegivel = Number.isFinite(peso) && Number.isFinite(altura) && peso < 700 && altura < 700 && imc >= 7 && imc <= 115;
      if (modo === "adequado") return [elegivel, elegivel && imc >= 18.5 && imc < 25];
      return [elegivel, elegivel && imc < 18.5];
    };
  }

  /** Identifica frequência regular de atividade física no tempo livre. */
  function regraFrequenciaDeAtividade(linha, contexto) {
    const pratica = numero(valorDoCampo(linha, "q42"), "q42", contexto.dicionario);
    const frequencia = numero(valorDoCampo(linha, "q45"), "q45", contexto.dicionario);
    const elegivel = estaEm(pratica, [1, 2]);
    return [elegivel, elegivel && pratica === 1 && estaEm(frequencia, [2, 3, 4])];
  }

  /** Identifica duração adequada considerando a codificação observada em cada edição. */
  function regraDuracaoDeAtividade(linha, contexto) {
    const pratica = numero(valorDoCampo(linha, "q42"), "q42", contexto.dicionario);
    const duracao = numero(valorDoCampo(linha, "q46"), "q46", contexto.dicionario);
    const maximo = contexto.maximoQ46PorAno.get(String(contexto.ano)) || 0;
    const adequada = maximo <= 3 ? duracao === 3 : estaEm(duracao, [4, 5, 6, 7]);
    const elegivel = estaEm(pratica, [1, 2]);
    return [elegivel, elegivel && pratica === 1 && adequada];
  }

  /** Mantém o denominador de CT04 restrito a quem passou por blitz. */
  function regraParadoEmBlitz(linha, contexto) {
    const passou = numero(valorDoCampo(linha, "r153"), "r153", contexto.dicionario);
    const parado = numero(valorDoCampo(linha, "r137a"), "r137a", contexto.dicionario);
    const elegivel = passou === 1 && estaEm(parado, [1, 2]);
    return [elegivel, elegivel && parado === 1];
  }

  /** Mantém o denominador de CT05 restrito a quem foi parado. */
  function regraConviteAoBafometro(linha, contexto) {
    const parado = numero(valorDoCampo(linha, "r137a"), "r137a", contexto.dicionario);
    const convite = numero(valorDoCampo(linha, "r154"), "r154", contexto.dicionario);
    const elegivel = parado === 1 && estaEm(convite, [1, 2]);
    return [elegivel, elegivel && convite === 1];
  }

  /** Mantém o denominador de CT06 restrito a quem recebeu o convite. */
  function regraRealizacaoDoBafometro(linha, contexto) {
    const convite = numero(valorDoCampo(linha, "r154"), "r154", contexto.dicionario);
    const realizou = numero(valorDoCampo(linha, "r155"), "r155", contexto.dicionario);
    const elegivel = convite === 1 && estaEm(realizou, [1, 2]);
    return [elegivel, elegivel && realizou === 1];
  }

  /** Mantém o denominador de CT07 restrito a quem realizou o teste. */
  function regraResultadoDoBafometro(linha, contexto) {
    const realizou = numero(valorDoCampo(linha, "r155"), "r155", contexto.dicionario);
    const resultado = numero(valorDoCampo(linha, "r156"), "r156", contexto.dicionario);
    const elegivel = realizou === 1 && estaEm(resultado, [1, 2]);
    return [elegivel, elegivel && resultado === 1];
  }

  const REGRAS = [
    ["TAB01", ["fumante"], regraBinaria("fumante")],
    ["TAB02", ["q60"], regraDeCodigos("q60", [1, 2, 3], [1])],
    ["TAB03", ["q60"], regraDeCodigos("q60", [1, 2, 3], [2])],
    ["TAB04", ["fumante"], regraBinaria("fumante", 0)],
    ["TAB05", ["q60", "q64"], regraExFumante],
    ["TAB06", ["q63"], regraDeCodigos("q63", [1, 2], [1])],
    ["TAB07", ["q67"], regraFumoEmCasa],
    ["TAB08", ["q68"], regraFumoNoTrabalho],
    ["ALC01", ["q35"], regraDeCodigos("q35", [1, 2, 3, 4], [1])],
    ["ALC02", ["q35", "q36"], regraConsumoSemanal],
    ["ALC03", ["alcabu"], regraConsumoAbusivo(1)],
    ["ALC04", ["alcabu"], regraConsumoAbusivo(2)],
    ["ALC05", ["q36"], regraDeCodigos("q36", [1, 2, 3, 4, 5, 6], [1, 2, 3, 4])],
    ["ALC06", ["r200"], regraCincoDoses],
    ["ALC07", ["direcao"], regraBinaria("direcao")],
    ["ALC08", ["q40b"], regraDeCodigos("q40b", [1, 2, 3, 4], [1, 2])],
    ["IMC01", ["excpeso_i"], regraBinaria("excpeso_i")],
    ["IMC02", ["obesid_i"], regraBinaria("obesid_i")],
    ["IMC03", ["q9_i", "q11_i"], regraImc("adequado")],
    ["IMC04", ["q9_i", "q11_i"], regraImc("baixo")],
    ["IMC05", ["obesid_i"], regraBinaria("obesid_i", 0)],
    ["CA01", ["feijao5"], regraBinaria("feijao5")],
    ["CA02", ["frutareg"], regraBinaria("frutareg")],
    ["CA03", ["hortareg"], regraBinaria("hortareg")],
    ["CA04", ["flvreg"], regraBinaria("flvreg")],
    ["CA05", ["q29"], regraDeCodigos("q29", [1, 2, 3, 4, 5, 6], [1, 2, 3, 4])],
    ["CA06", ["refritl5"], regraBinaria("refritl5")],
    ["CA07", ["q25"], regraDeCodigos("q25", [1, 2, 3, 4, 5, 6], [3, 4])],
    ["CA08", ["r143"], regraDeCodigos("r143", [1, 2, 3, 4, 5, 6], [3, 4])],
    ["CA09", ["r144a"], regraDeCodigos("r144a", [1, 2, 3, 4, 5, 6], [3, 4])],
    ["CA10", ["r144b"], regraDeCodigos("r144b", [1, 2, 3, 4, 5, 6], [3, 4])],
    ["AF01", ["q42"], regraDeCodigos("q42", [1, 2], [1])],
    ["AF02", ["q42", "q45"], regraFrequenciaDeAtividade],
    ["AF03", ["q42", "q46"], regraDuracaoDeAtividade],
    ["AF04", ["ativo_livre"], regraBinaria("ativo_livre")],
    ["AF05", ["atitrans"], regraBinaria("atitrans")],
    ["AF06", ["atiocu"], regraBinaria("atiocu")],
    ["AF07", ["atidom"], regraBinaria("atidom")],
    ["AF08", [], regraInatividade],
    ["AS01", ["q74"], regraDeCodigos("q74", [1, 2, 3, 4, 5], [1, 2])],
    ["AS02", ["q74"], regraDeCodigos("q74", [1, 2, 3, 4, 5], [3])],
    ["AS03", ["q74"], regraDeCodigos("q74", [1, 2, 3, 4, 5], [4, 5])],
    ["AS04", ["q74"], regraDeCodigos("q74", [1, 2, 3, 4, 5], [1])],
    ["AS05", ["q74"], regraDeCodigos("q74", [1, 2, 3, 4, 5], [2])],
    ["PC01", ["mamodois"], regraBinaria("mamodois")],
    ["PC02", ["mamo"], regraBinaria("mamo")],
    ["PC03", ["papa"], regraBinaria("papa")],
    ["PC04", ["papatres"], regraBinaria("papatres")],
    ["MR01", ["hart"], regraBinaria("hart")],
    ["MR02", ["diab"], regraBinaria("diab")],
    ["MR03", ["dislip"], regraBinaria("dislip")],
    ["MR04", ["coracao"], regraBinaria("coracao")],
    ["MR05", ["asma"], regraBinaria("asma")],
    ["MR06", ["osteo"], regraBinaria("osteo")],
    ["MR07", ["depressao"], regraBinaria("depressao")],
    ["CT01", ["r190"], regraDeCodigos("r190", [1, 2], [1])],
    ["CT02", ["direcao_alc"], regraBinaria("direcao_alc")],
    ["CT03", ["q40b"], regraDeCodigos("q40b", [1, 2, 3, 4], [1, 2, 3])],
    ["CT04", ["r153", "r137a"], regraParadoEmBlitz],
    ["CT05", ["r137a", "r154"], regraConviteAoBafometro],
    ["CT06", ["r154", "r155"], regraRealizacaoDoBafometro],
    ["CT07", ["r155", "r156"], regraResultadoDoBafometro],
    ["CT08", ["r178"], regraDeCodigos("r178", [1, 2], [1])]
  ].map(([id, colunas, avaliar]) => ({ id, colunas, avaliar }));

  /** Detecta a codificação mais provável de um CSV por uma pequena amostra. */
  async function detectarCodificacao(arquivo) {
    const amostra = await arquivo.slice(0, Math.min(arquivo.size, 262144)).arrayBuffer();
    try {
      new TextDecoder("utf-8", { fatal: true }).decode(amostra);
      return "UTF-8";
    } catch (_erro) {
      return "ISO-8859-1";
    }
  }

  /** Percorre um CSV em blocos para evitar manter microdados grandes na memória. */
  async function percorrerCsv(arquivo, aoReceber, progresso) {
    const codificacao = await detectarCodificacao(arquivo);
    let processadas = 0;
    return new Promise((resolver, rejeitar) => {
      Papa.parse(arquivo, {
        header: true,
        skipEmptyLines: "greedy",
        encoding: codificacao,
        chunkSize: 4 * 1024 * 1024,
        /** Processa um bloco do CSV, atualiza o progresso e libera a leitura do bloco seguinte. */
        chunk(resultados, analisador) {
          try {
            analisador.pause();
            aoReceber(resultados.data, resultados.meta.fields || [], resultados.errors || []);
            processadas += resultados.data.length;
            progresso?.(processadas);
            analisador.resume();
          } catch (erro) {
            analisador.abort();
            rejeitar(erro);
          }
        },
        /** Encerra a promessa quando todos os blocos do arquivo foram processados. */
        complete() {
          resolver();
        },
        /** Interrompe o processamento quando o leitor do CSV informa uma falha. */
        error(erro) {
          rejeitar(erro);
        }
      });
    });
  }

  /** Lê a planilha com maior quantidade de registros e conserva os nomes originais das colunas. */
  async function lerPlanilhaDeDados(arquivo) {
    const pasta = XLSX.read(await arquivo.arrayBuffer(), { type: "array", cellDates: false });
    const candidatas = pasta.SheetNames.map(nome => {
      const linhas = XLSX.utils.sheet_to_json(pasta.Sheets[nome], { defval: "", raw: false });
      return { nome, linhas, colunas: linhas.length ? Object.keys(linhas[0]) : [] };
    });
    candidatas.sort((a, b) => b.linhas.length - a.linhas.length);
    if (!candidatas[0]?.linhas.length) throw new Error("A planilha não contém linhas de dados.");
    return candidatas[0];
  }

  /** Extrai variáveis, códigos e definições explícitas de indicadores das linhas de um dicionário. */
  function extrairDicionarioDasLinhas(linhas, origem) {
    const variaveis = new Set();
    const rotulos = new Map();
    const indicadores = [];
    const registros = [];
    let cabecalho = -1;
    let indiceVariavel = -1;
    let indiceCodigo = -1;
    let indiceRotulo = -1;
    for (let indice = 0; indice < linhas.length; indice += 1) {
      const normalizadas = linhas[indice].map(normalizarTexto);
      const posicao = normalizadas.findIndex(item => ["variablename", "variavel", "nomedavariavel"].includes(item));
      if (posicao >= 0) {
        cabecalho = indice;
        indiceVariavel = posicao;
        indiceCodigo = normalizadas.findIndex(item => item === "codigo");
        indiceRotulo = normalizadas.findIndex(item => item === "label" || item === "rotulo");
        break;
      }
    }
    if (cabecalho >= 0) {
      let variavelAtual = "";
      for (const linha of linhas.slice(cabecalho + 1)) {
        const nome = String(linha[indiceVariavel] ?? "").trim();
        if (nome) {
          variavelAtual = nome;
          variaveis.add(nome);
          if (!rotulos.has(nome)) rotulos.set(nome, new Map());
        }
        const codigo = indiceCodigo >= 0 ? numero(linha[indiceCodigo], "", null) : NaN;
        const rotulo = indiceRotulo >= 0 ? linha[indiceRotulo] : "";
        if (variavelAtual && Number.isFinite(codigo) && String(rotulo ?? "").trim()) {
          rotulos.get(variavelAtual).set(normalizarTexto(rotulo), codigo);
          registros.push([variavelAtual, codigo, String(rotulo).trim()]);
        } else if (nome) {
          registros.push([variavelAtual, "", ""]);
        }
      }
    }
    const primeira = linhas.findIndex(linha => linha.some(celula => normalizarTexto(celula) === "indicadorid"));
    if (primeira >= 0) {
      const nomes = linhas[primeira].map(normalizarTexto);
      for (const linha of linhas.slice(primeira + 1)) {
        const objeto = Object.fromEntries(nomes.map((nome, indice) => [nome, linha[indice]]));
        const id = String(objeto.indicadorid ?? "").trim().toUpperCase();
        if (id) indicadores.push({ ...objeto, id, origem });
      }
    }
    return { variaveis, rotulos, indicadores, registros };
  }

  /** Combina as estruturas extraídas das diferentes abas de um mesmo dicionário. */
  function combinarDicionarios(partes) {
    const combinado = { variaveis: new Set(), rotulos: new Map(), indicadores: [], registros: [] };
    for (const parte of partes) {
      parte.variaveis.forEach(item => combinado.variaveis.add(item));
      for (const [variavel, mapa] of parte.rotulos.entries()) {
        if (!combinado.rotulos.has(variavel)) combinado.rotulos.set(variavel, new Map());
        mapa.forEach((codigo, rotulo) => combinado.rotulos.get(variavel).set(rotulo, codigo));
      }
      combinado.indicadores.push(...parte.indicadores);
      combinado.registros.push(...parte.registros);
    }
    return combinado;
  }

  /** Lê um dicionário CSV, XLS, XLSX ou XLSM e devolve uma estrutura única de conferência. */
  async function lerDicionario(arquivo) {
    const extensao = arquivo.name.split(".").pop().toLowerCase();
    if (extensao === "csv") {
      const codificacao = await detectarCodificacao(arquivo);
      const bytes = await arquivo.arrayBuffer();
      const texto = new TextDecoder(codificacao === "UTF-8" ? "utf-8" : "windows-1252").decode(bytes);
      const resultado = Papa.parse(texto, { skipEmptyLines: false });
      return combinarDicionarios([extrairDicionarioDasLinhas(resultado.data, arquivo.name)]);
    }
    if (!["xls", "xlsx", "xlsm"].includes(extensao)) throw new Error("Formato de dicionário não aceito.");
    const pasta = XLSX.read(await arquivo.arrayBuffer(), { type: "array", cellDates: false });
    const partes = pasta.SheetNames.map(nome => {
      const linhas = XLSX.utils.sheet_to_json(pasta.Sheets[nome], { header: 1, defval: "", raw: false });
      return extrairDicionarioDasLinhas(linhas, `${arquivo.name} · ${nome}`);
    });
    return combinarDicionarios(partes);
  }

  /** Converte código ou nome de capital na sigla usada pelo painel. */
  function obterUf(linha, dicionario) {
    const original = valorDoCampo(linha, "cidade");
    const codigo = numero(original, "cidade", dicionario);
    if (Number.isInteger(codigo) && CIDADE_PARA_UF[codigo]) return CIDADE_PARA_UF[codigo];
    return NOME_DA_CIDADE_PARA_UF[normalizarTexto(original)] || "";
  }

  /** Converte a variável de sexo para o índice estável Feminino/Masculino. */
  function obterIndiceDoSexo(linha, dicionario) {
    const original = valorDoCampo(linha, "q7");
    const codigo = numero(original, "q7", dicionario);
    if (codigo === 1) return 1;
    if (codigo === 2) return 0;
    const texto = normalizarTexto(original);
    if (texto === "masculino" || texto === "homem") return 1;
    if (texto === "feminino" || texto === "mulher") return 0;
    return -1;
  }

  /** Enquadra uma idade adulta na faixa quinquenal utilizada no painel. */
  function obterIndiceDaFaixa(idade) {
    if (idade >= 18 && idade <= 24) return 0;
    if (idade <= 34) return 1;
    if (idade <= 44) return 2;
    if (idade <= 54) return 3;
    if (idade <= 64) return 4;
    if (idade >= 65) return 5;
    return -1;
  }

  /** Acrescenta numerador, denominador, amostra, casos e quadrado dos pesos a uma chave. */
  function acumular(mapa, chave, peso, evento) {
    const atual = mapa.get(chave) || { num: 0, den: 0, n: 0, casos: 0, w2: 0 };
    atual.num += evento ? peso : 0;
    atual.den += peso;
    atual.n += 1;
    atual.casos += evento ? 1 : 0;
    atual.w2 += peso * peso;
    mapa.set(chave, atual);
  }

  /** Acrescenta uma contagem simples e uma soma de pesos a uma chave de resumo. */
  function acumularResumo(mapa, chave, peso) {
    const atual = mapa.get(chave) || { entrevistas: 0, pesos: 0 };
    atual.entrevistas += 1;
    atual.pesos += peso;
    mapa.set(chave, atual);
  }

  /** Verifica quais regras podem ser calculadas a partir das colunas declaradas no arquivo. */
  function regrasCompativeis(colunas) {
    const nomes = new Set(colunas.map(normalizarTexto));
    return REGRAS.filter(regra => regra.colunas.every(coluna => {
      if (regra.id === "TAB05" && coluna === "q60") return nomes.has("exfuma") || nomes.has("q60");
      return nomes.has(normalizarTexto(coluna));
    }));
  }

  /** Faz a primeira leitura do arquivo para avaliar cobertura, pesos, anos e codificação de q46. */
  async function diagnosticarArquivo(item, dicionario, progresso) {
    const extensao = item.arquivo.name.split(".").pop().toLowerCase();
    const diagnostico = {
      nome: item.arquivo.name,
      populacao: item.populacao,
      colunas: [],
      anos: new Set(),
      ufsPorAno: new Map(),
      linhasPorAno: new Map(),
      pesosValidosPorAno: new Map(),
      maximoQ46PorAno: new Map(),
      errosDeLeitura: [],
      linhasDaPlanilha: null
    };
    /** Analisa um bloco sem guardar as linhas depois da conferência. */
    const analisarBloco = (linhas, colunas, erros) => {
      if (!diagnostico.colunas.length) diagnostico.colunas = colunas;
      diagnostico.errosDeLeitura.push(...erros.slice(0, Math.max(0, 20 - diagnostico.errosDeLeitura.length)));
      for (const linha of linhas) {
        const ano = Math.trunc(numero(valorDoCampo(linha, "ano"), "ano", dicionario));
        if (ano < 2000 || ano > 2100) continue;
        const chaveAno = String(ano);
        diagnostico.anos.add(chaveAno);
        diagnostico.linhasPorAno.set(chaveAno, (diagnostico.linhasPorAno.get(chaveAno) || 0) + 1);
        const uf = obterUf(linha, dicionario);
        if (!diagnostico.ufsPorAno.has(chaveAno)) diagnostico.ufsPorAno.set(chaveAno, new Set());
        if (uf) diagnostico.ufsPorAno.get(chaveAno).add(uf);
        const colunaPeso = item.populacao === "População Negra"
          ? "pesorake_cor"
          : (diagnostico.colunas.some(c => normalizarTexto(c) === "pesorake2025") ? "pesorake2025" : "pesorake");
        const peso = numero(valorDoCampo(linha, colunaPeso), colunaPeso, dicionario);
        if (peso > 0) diagnostico.pesosValidosPorAno.set(chaveAno, (diagnostico.pesosValidosPorAno.get(chaveAno) || 0) + 1);
        const q46 = numero(valorDoCampo(linha, "q46"), "q46", dicionario);
        if (Number.isFinite(q46)) diagnostico.maximoQ46PorAno.set(chaveAno, Math.max(q46, diagnostico.maximoQ46PorAno.get(chaveAno) || q46));
      }
    };
    if (extensao === "csv") {
      await percorrerCsv(item.arquivo, analisarBloco, quantidade => progresso?.(`Conferindo ${item.arquivo.name}: ${quantidade.toLocaleString("pt-BR")} linhas`));
    } else if (["xls", "xlsx", "xlsm"].includes(extensao)) {
      const planilha = await lerPlanilhaDeDados(item.arquivo);
      diagnostico.linhasDaPlanilha = planilha.linhas;
      analisarBloco(planilha.linhas, planilha.colunas, []);
    } else {
      throw new Error(`${item.arquivo.name}: formato não aceito.`);
    }
    return diagnostico;
  }

  /** Gera erros e avisos de integridade antes de qualquer cálculo. */
  function validarDiagnosticos(diagnosticos, dicionario) {
    const erros = [];
    const avisos = [];
    const ocupados = new Set();
    for (const diagnostico of diagnosticos) {
      const normalizadas = new Set(diagnostico.colunas.map(normalizarTexto));
      for (const coluna of ["ano", "cidade", "q6", "q7"]) {
        if (!normalizadas.has(coluna)) erros.push(`${diagnostico.nome}: coluna obrigatória ${coluna} ausente.`);
      }
      const pesoEsperado = diagnostico.populacao === "População Negra"
        ? "pesorakecor"
        : (normalizadas.has("pesorake2025") ? "pesorake2025" : "pesorake");
      if (!normalizadas.has(pesoEsperado)) erros.push(`${diagnostico.nome}: coluna de peso ${pesoEsperado} ausente.`);
      if (dicionario.variaveis.size) {
        const dicionarioNormalizado = new Set([...dicionario.variaveis].map(normalizarTexto));
        for (const coluna of ["ano", "cidade", "q6", "q7", pesoEsperado]) {
          if (!dicionarioNormalizado.has(coluna)) erros.push(`${diagnostico.nome}: ${coluna} não foi localizada no dicionário enviado.`);
        }
      }
      if (!diagnostico.anos.size) erros.push(`${diagnostico.nome}: nenhum ano válido foi localizado.`);
      for (const ano of diagnostico.anos) {
        const chave = `${diagnostico.populacao}|${ano}`;
        if (ocupados.has(chave)) erros.push(`O ano ${ano} da ${diagnostico.populacao} aparece em mais de um arquivo.`);
        ocupados.add(chave);
        const linhas = diagnostico.linhasPorAno.get(ano) || 0;
        const pesos = diagnostico.pesosValidosPorAno.get(ano) || 0;
        const ufs = diagnostico.ufsPorAno.get(ano)?.size || 0;
        if (linhas < 1000) erros.push(`${diagnostico.nome}: o ano ${ano} tem somente ${linhas.toLocaleString("pt-BR")} linhas.`);
        if (ufs !== 27) erros.push(`${diagnostico.nome}: o ano ${ano} cobre ${ufs} das 27 capitais; a edição foi considerada incompleta.`);
        if (pesos / Math.max(linhas, 1) < 0.9) erros.push(`${diagnostico.nome}: menos de 90% das linhas de ${ano} possuem peso válido.`);
      }
      const compativeis = regrasCompativeis(diagnostico.colunas);
      if (!compativeis.length) erros.push(`${diagnostico.nome}: nenhuma regra de indicador possui todas as colunas necessárias.`);
      if (compativeis.length < REGRAS.length) {
        const ausentes = REGRAS.filter(regra => !compativeis.includes(regra)).map(regra => regra.id);
        avisos.push(`${diagnostico.nome}: ${compativeis.length} de ${REGRAS.length} regras possuem todas as colunas necessárias. Sem as colunas exigidas nesta edição: ${ausentes.join(", ")}.`);
      }
      if (diagnostico.errosDeLeitura.length) avisos.push(`${diagnostico.nome}: o leitor registrou ${diagnostico.errosDeLeitura.length} aviso(s) de estrutura no CSV.`);
    }
    const definicoesNovas = dicionario.indicadores.filter(item => !DATA.indicators.some(indicador => indicador.id === item.id));
    for (const definicao of definicoesNovas) {
      const validos = separarCodigos(definicao.codigosvalidos);
      const eventos = separarCodigos(definicao.codigosevento);
      const variavel = String(definicao.variavelprincipal ?? definicao.variavel ?? "").trim();
      if (!variavel || !validos.length || !eventos.length) {
        avisos.push(`${definicao.id}: indicador novo identificado, mas não incluído porque faltam variável principal, códigos válidos ou códigos do evento.`);
      }
    }
    return { erros, avisos };
  }

  /** Converte definições explícitas e completas do dicionário em regras genéricas seguras. */
  function prepararRegras(dicionario) {
    const regras = REGRAS.slice();
    const novosIndicadores = [];
    const pendentes = [];
    for (const definicao of dicionario.indicadores) {
      if (DATA.indicators.some(item => item.id === definicao.id)) continue;
      const variavel = String(definicao.variavelprincipal ?? definicao.variavel ?? "").trim();
      const validos = separarCodigos(definicao.codigosvalidos);
      const eventos = separarCodigos(definicao.codigosevento);
      if (!variavel || !validos.length || !eventos.length) {
        pendentes.push(definicao.id);
        continue;
      }
      regras.push({ id: definicao.id, colunas: [variavel], avaliar: regraDeCodigos(variavel, validos, eventos) });
      novosIndicadores.push({
        id: definicao.id,
        tema: String(definicao.tema ?? "Outros indicadores").trim(),
        label: String(definicao.indicador ?? definicao.nome ?? definicao.id).trim(),
        description: String(definicao.descricao ?? "Indicador definido no dicionário da edição.").trim(),
        variable: variavel,
        validos,
        eventos,
        population: String(definicao.populacao ?? "Adultos com 18 anos ou mais.").trim()
      });
    }
    return { regras, novosIndicadores, pendentes };
  }

  /** Processa uma linha válida e atualiza todas as agregações compatíveis. */
  function processarLinha(linha, item, diagnostico, dicionario, regras, indiceDosIndicadores, acumuladores) {
    const ano = Math.trunc(numero(valorDoCampo(linha, "ano"), "ano", dicionario));
    const chaveAno = String(ano);
    if (!diagnostico.anos.has(chaveAno)) return;
    const idade = Math.trunc(numero(valorDoCampo(linha, "q6"), "q6", dicionario));
    const sexo = obterIndiceDoSexo(linha, dicionario);
    const uf = obterUf(linha, dicionario);
    const regiao = UF_PARA_REGIAO[uf];
    const faixa = obterIndiceDaFaixa(idade);
    const indiceIdade = Math.min(idade, 80) - 18;
    if (idade < 18 || idade > 120 || sexo < 0 || !uf || faixa < 0 || indiceIdade < 0) return;
    if (item.populacao === "População Negra") {
      const cor = numero(valorDoCampo(linha, "q69_cor"), "q69_cor", dicionario);
      if (cor !== 2) return;
    }
    const colunaPeso = item.populacao === "População Negra"
      ? "pesorake_cor"
      : (diagnostico.colunas.some(c => normalizarTexto(c) === "pesorake2025") ? "pesorake2025" : "pesorake");
    const peso = numero(valorDoCampo(linha, colunaPeso), colunaPeso, dicionario);
    if (!(peso > 0)) return;
    const contexto = { ano, dicionario, maximoQ46PorAno: diagnostico.maximoQ46PorAno };
    const pop = item.populacao;
    for (const regra of regras) {
      const indiceIndicador = indiceDosIndicadores.get(regra.id);
      if (indiceIndicador < 0) continue;
      const [elegivel, evento] = regra.avaliar(linha, contexto);
      if (!elegivel) continue;
      acumular(acumuladores.base, [chaveAno, regiao, uf, sexo, faixa, pop, regra.id].join("|"), peso, evento);
      acumular(acumuladores.idade, [chaveAno, uf, sexo, indiceIdade, pop, regra.id].join("|"), peso, evento);
    }
    acumularResumo(acumuladores.ano, `${chaveAno}|${pop}`, peso);
    acumularResumo(acumuladores.regiao, `${chaveAno}|${regiao}|${pop}`, peso);
    acumularResumo(acumuladores.uf, `${chaveAno}|${uf}|${pop}`, peso);
  }

  /** Lê os arquivos uma segunda vez e calcula somente resultados aprovados no diagnóstico. */
  async function agregarArquivos(itens, diagnosticos, dicionario, configuracao, progresso) {
    const acumuladores = { base: new Map(), idade: new Map(), ano: new Map(), regiao: new Map(), uf: new Map() };
    const indicadores = DATA.indicators.map(item => ({ ...item }));
    const temas = DATA.themes.map(item => ({ ...item }));
    const paleta = [
      ["#5D56B3", "#F0EEFF"], ["#B24D72", "#FFF0F6"], ["#237A62", "#EAF8F3"],
      ["#9A6518", "#FFF5E5"], ["#526D82", "#EEF4F7"]
    ];
    for (const novo of configuracao.novosIndicadores) {
      let tema = temas.find(item => normalizarTexto(item.label) === normalizarTexto(novo.tema));
      if (!tema) {
        const cores = paleta[temas.length % paleta.length];
        tema = {
          id: `tema${temas.length + 1}`,
          label: novo.tema,
          icon: novo.tema.slice(0, 1).toUpperCase(),
          color: cores[0],
          background: cores[1],
          raw: novo.tema
        };
        temas.push(tema);
      }
      indicadores.push({
        id: novo.id,
        themeId: tema.id,
        label: novo.label,
        description: novo.description,
        unit: "%",
        classification: "Definido no dicionário"
      });
    }
    for (let indice = 0; indice < itens.length; indice += 1) {
      const item = itens[indice];
      const diagnostico = diagnosticos[indice];
      const nomesDasColunas = new Set(diagnostico.colunas.map(normalizarTexto));
      const regrasDoArquivo = configuracao.regras.filter(regra => regra.colunas.every(coluna => {
        if (regra.id === "TAB05" && coluna === "q60") return nomesDasColunas.has("exfuma") || nomesDasColunas.has("q60");
        return nomesDasColunas.has(normalizarTexto(coluna));
      }));
      const indiceDosIndicadores = new Map(indicadores.map((indicador, posicao) => [indicador.id, posicao]));
      let processadas = 0;
      /** Processa um bloco de linhas do arquivo atual. */
      const processarBloco = linhas => {
        for (const linha of linhas) processarLinha(linha, item, diagnostico, dicionario, regrasDoArquivo, indiceDosIndicadores, acumuladores);
        processadas += linhas.length;
        progresso?.(`Calculando ${item.arquivo.name}: ${processadas.toLocaleString("pt-BR")} linhas`);
      };
      if (diagnostico.linhasDaPlanilha) {
        const tamanho = 5000;
        for (let inicio = 0; inicio < diagnostico.linhasDaPlanilha.length; inicio += tamanho) {
          processarBloco(diagnostico.linhasDaPlanilha.slice(inicio, inicio + tamanho));
          await new Promise(resolver => setTimeout(resolver, 0));
        }
      } else {
        await percorrerCsv(item.arquivo, (linhas) => processarBloco(linhas));
      }
    }
    return { acumuladores, indicadores, temas };
  }

  /** Arredonda valores agregados com a mesma precisão usada pelo gerador Python. */
  function arredondar(valor) {
    return Math.round(valor * 1000) / 1000;
  }

  /** Resume uma relação de anos sem afirmar a presença de edições inexistentes. */
  function rotuloDosAnos(anos) {
    const ordenados = [...anos].sort((a, b) => Number(a) - Number(b));
    if (!ordenados.length) return "Período não informado";
    if (ordenados.length === 1) return ordenados[0];
    const primeiro = Number(ordenados[0]);
    const ultimo = Number(ordenados.at(-1));
    const faltantes = [];
    for (let ano = primeiro; ano <= ultimo; ano += 1) if (!ordenados.includes(String(ano))) faltantes.push(ano);
    return `${primeiro} a ${ultimo}${faltantes.length ? ` (exceto ${faltantes.join(", ")})` : ""}`;
  }

  /** Mescla as novas agregações com a base incorporada, substituindo apenas ano e população enviados. */
  function construirBaseAtualizada(resultado, diagnosticos) {
    const anosNovos = new Set(diagnosticos.flatMap(item => [...item.anos]));
    const anos = [...new Set([...DATA.dims.years, ...anosNovos])].sort((a, b) => Number(a) - Number(b));
    const afetados = new Set(diagnosticos.flatMap(item => [...item.anos].map(ano => `${ano}|${item.populacao}`)));
    const indiceAno = new Map(anos.map((ano, indice) => [ano, indice]));
    const indiceRegiao = new Map(REGIOES.map((item, indice) => [item, indice]));
    const indiceUf = new Map(UFS.map((item, indice) => [item, indice]));
    const indicePop = new Map(POPULACOES.map((item, indice) => [item, indice]));
    const indiceIndicador = new Map(resultado.indicadores.map((item, indice) => [item.id, indice]));
    const linhas = [];
    for (const linha of DATA.rows) {
      const ano = DATA.dims.years[linha[0]];
      const pop = DATA.dims.pops[linha[5]];
      if (afetados.has(`${ano}|${pop}`)) continue;
      const id = DATA.indicators[linha[6]].id;
      linhas.push([
        indiceAno.get(ano), linha[1], linha[2], linha[3], linha[4], indicePop.get(pop),
        indiceIndicador.get(id), ...linha.slice(7)
      ]);
    }
    for (const [chave, valor] of resultado.acumuladores.base.entries()) {
      const [ano, regiao, uf, sexo, faixa, pop, id] = chave.split("|");
      if (!(valor.den > 0)) continue;
      linhas.push([
        indiceAno.get(ano), indiceRegiao.get(regiao), indiceUf.get(uf), Number(sexo), Number(faixa),
        indicePop.get(pop), indiceIndicador.get(id), arredondar(valor.num), arredondar(valor.den),
        valor.n, valor.casos, arredondar(valor.w2)
      ]);
    }
    linhas.sort((a, b) => a.slice(0, 7).reduce((total, item, indice) => total || item - b[indice], 0));
    const pesosUsados = new Set(DATA.meta.weightColumnsUsed || []);
    diagnosticos.forEach(item => {
      if (item.populacao === "População Negra") pesosUsados.add("pesorake_cor");
      else pesosUsados.add(item.colunas.some(c => normalizarTexto(c) === "pesorake2025") ? "pesorake2025" : "pesorake");
    });
    const usaPesoLegado = pesosUsados.has("pesorake");
    const usaPesoHarmonizado = pesosUsados.has("pesorake2025");
    const dataAtual = new Date().toISOString().slice(0, 10);
    return {
      meta: {
        ...DATA.meta,
        rows: linhas.length,
        yearsLabel: rotuloDosAnos(anos),
        baseVersion: "v14.1 - atualização administrativa com edição 2024",
        baseUpdatedAt: dataAtual,
        weightColumnsUsed: [...pesosUsados].sort(),
        weightStatus: usaPesoLegado && usaPesoHarmonizado
          ? "misto-legado-e-harmonizado"
          : (usaPesoHarmonizado ? "oficial-harmonizado" : "legado-com-atualizador-pronto"),
        weightLimitation: usaPesoLegado && usaPesoHarmonizado
          ? "A edição incluída pela Administração utiliza pesorake2025; as séries anteriores conservam os pesos documentados em sua origem. Comparações com uma série integralmente reponderada podem apresentar diferenças."
          : (usaPesoHarmonizado
            ? "As edições atualizadas utilizam pesorake2025."
            : DATA.meta.weightLimitation)
      },
      themes: resultado.temas,
      indicators: resultado.indicadores,
      dims: { years: anos, regions: REGIOES, ufs: UFS, sexes: SEXOS, ages: FAIXAS, pops: POPULACOES },
      rows: linhas
    };
  }

  /** Converte a base atualizada no arquivo JavaScript consumido pelo painel. */
  function serializarBase(base) {
    return [
      "/**",
      " * Reúne a base agregada consumida diretamente pelo painel.",
      " * O conteúdo foi produzido pela área administrativa após validação do dicionário e dos microdados.",
      " */",
      "",
      `const DATA = ${JSON.stringify(base)};`,
      "",
      "/** Localiza o primeiro elemento correspondente ao seletor informado. */",
      "const $ = (sel) => document.querySelector(sel);",
      "/** Reúne todos os elementos correspondentes ao seletor em uma lista comum. */",
      "const $$ = (sel) => Array.from(document.querySelectorAll(sel));",
      ""
    ].join("\n");
  }

  /** Converte as novas linhas de idade detalhada para os índices da edição atualizada. */
  function novasLinhasDeIdade(resultado, base) {
    const indiceAno = new Map(base.dims.years.map((ano, indice) => [ano, indice]));
    const indiceUf = new Map(UFS.map((uf, indice) => [uf, indice]));
    const indicePop = new Map(POPULACOES.map((pop, indice) => [pop, indice]));
    const porIndicador = new Map(base.indicators.map(item => [item.id, []]));
    for (const [chave, valor] of resultado.acumuladores.idade.entries()) {
      const [ano, uf, sexo, idade, pop, id] = chave.split("|");
      if (!(valor.den > 0) || !porIndicador.has(id)) continue;
      porIndicador.get(id).push([
        indiceAno.get(ano), indiceUf.get(uf), Number(sexo), Number(idade), indicePop.get(pop),
        arredondar(valor.num), arredondar(valor.den), valor.n, valor.casos, arredondar(valor.w2)
      ]);
    }
    return porIndicador;
  }

  /** Serializa o catálogo usado para localizar os arquivos temáticos de idade detalhada. */
  function serializarCatalogo(base, diagnosticos) {
    const nomeDoComplemento = "assets/js/dados/idade-detalhada/AtualizacaoDaIdadeDetalhada.js";
    const arquivos = Object.fromEntries(base.indicators.map(item => {
      const prefixo = Object.keys(ARQUIVOS_POR_PREFIXO).find(chave => item.id.startsWith(chave));
      const arquivoAtual = window.VIGITEL_AGE_DETAIL.meta?.files?.[item.id];
      return [item.id, arquivoAtual || ARQUIVOS_POR_PREFIXO[prefixo] || nomeDoComplemento];
    }));
    const catalogo = {
      meta: {
        ...window.VIGITEL_AGE_DETAIL.meta,
        updatedAt: base.meta.baseUpdatedAt,
        version: "edicaoAdministrativaValidada",
        supportedIndicators: base.indicators.map(item => item.id),
        files: arquivos,
        updateFile: nomeDoComplemento,
        baseYears: window.VIGITEL_AGE_DETAIL.dims.years,
        basePops: window.VIGITEL_AGE_DETAIL.dims.pops,
        affected: diagnosticos.flatMap(item => [...item.anos].map(ano => [ano, item.populacao]))
      },
      dims: { years: base.dims.years, ufs: UFS, sexes: SEXOS, ages: IDADES, pops: POPULACOES }
    };
    return [
      "/**",
      " * Define as dimensões da idade detalhada e relaciona cada indicador ao arquivo temático.",
      " */",
      "",
      `window.VIGITEL_AGE_DETAIL=${JSON.stringify(catalogo)};window.VIGITEL_AGE_DETAIL.loaded={};window.VIGITEL_AGE_DETAIL.loadedVersion={};`,
      ""
    ].join("\n");
  }

  /** Publica somente as linhas novas de idade detalhada e as combinações substituídas. */
  function serializarAtualizacaoDeIdade(resultado, base, diagnosticos) {
    const linhas = novasLinhasDeIdade(resultado, base);
    const carregadas = Object.fromEntries([...linhas.entries()]);
    const complemento = {
      affected: diagnosticos.flatMap(item => [...item.anos].map(ano => [ano, item.populacao])),
      loaded: carregadas
    };
    return [
      "/**",
      " * Complementa a idade detalhada com os anos aprovados pela área administrativa.",
      " * O painel substitui apenas as combinações de ano e população registradas em affected.",
      " */",
      "",
      `window.VIGITEL_AGE_DETAIL_UPDATE=${JSON.stringify(complemento)};`,
      ""
    ].join("\n");
  }

  /** Atualiza o arquivo metodológico sem inferir regras não declaradas no dicionário. */
  function serializarMetodologia(configuracao, base) {
    const metodos = { ...INDICATOR_METHODS };
    for (const novo of configuracao.novosIndicadores) {
      metodos[novo.id] = {
        variable: novo.variable,
        rule: `${novo.variable} ∈ {${novo.eventos.join(",")}}`,
        denominator: `Respostas com códigos válidos {${novo.validos.join(",")}}.`,
        population: novo.population,
        weight: "Peso declarado na base da edição.",
        weightNote: "A variável de peso é registrada no relatório da atualização.",
        updatedAt: base.meta.baseUpdatedAt,
        classification: "Definido no dicionário",
        ageVariable: "q6",
        ageMethod: "Idade exata calculada diretamente de q6; 80 anos ou mais agrupados em 80+."
      };
    }
    return `const INDICATOR_METHODS=${JSON.stringify(metodos)};\n`;
  }

  /** Transforma mapas de resumo em CSVs pequenos usados na conferência acadêmica. */
  function serializarResumos(resultado) {
    const arquivos = new Map();
    const linhasAno = [["ano", "tipo_populacao", "total_entrevistas", "soma_dos_pesos"]];
    for (const [chave, valor] of [...resultado.acumuladores.ano.entries()].sort()) {
      const [ano, pop] = chave.split("|");
      linhasAno.push([ano, pop, valor.entrevistas, arredondar(valor.pesos)]);
    }
    const linhasRegiao = [["ano", "regiao", "tipo_populacao", "total_entrevistas", "soma_dos_pesos"]];
    for (const [chave, valor] of [...resultado.acumuladores.regiao.entries()].sort()) {
      const [ano, regiao, pop] = chave.split("|");
      linhasRegiao.push([ano, regiao, pop, valor.entrevistas, arredondar(valor.pesos)]);
    }
    const linhasUf = [["ano", "uf", "tipo_populacao", "total_entrevistas", "soma_dos_pesos"]];
    for (const [chave, valor] of [...resultado.acumuladores.uf.entries()].sort()) {
      const [ano, uf, pop] = chave.split("|");
      linhasUf.push([ano, uf, pop, valor.entrevistas, arredondar(valor.pesos)]);
    }
    /** Converte uma matriz para CSV com aspas somente quando necessárias. */
    const csv = linhas => linhas.map(linha => linha.map(valor => {
      const texto = String(valor ?? "");
      return /[",\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
    }).join(",")).join("\n") + "\n";
    arquivos.set("dados/resumos/ResumoDaAtualizacaoPorAno.csv", csv(linhasAno));
    arquivos.set("dados/resumos/ResumoDaAtualizacaoPorRegiao.csv", csv(linhasRegiao));
    arquivos.set("dados/resumos/ResumoDaAtualizacaoPorUf.csv", csv(linhasUf));
    return arquivos;
  }

  /** Gera o CSV normalizado do dicionário utilizado na atualização. */
  function serializarDicionario(dicionario) {
    const linhas = [["variavel", "codigo", "rotulo"], ...dicionario.registros];
    return linhas.map(linha => linha.map(valor => {
      const texto = String(valor ?? "");
      return /[",\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
    }).join(",")).join("\n") + "\n";
  }

  /** Calcula SHA-256 para registrar exatamente os arquivos gerados. */
  async function sha256(conteudo) {
    const bytes = new TextEncoder().encode(conteudo);
    const resumo = await crypto.subtle.digest("SHA-256", bytes);
    return [...new Uint8Array(resumo)].map(item => item.toString(16).padStart(2, "0")).join("");
  }

  /** Reúne os arquivos alterados e um relatório legível para futura manutenção. */
  async function gerarArquivos(resultado, diagnosticos, dicionario, configuracao, progresso) {
    const base = construirBaseAtualizada(resultado, diagnosticos);
    const arquivos = new Map();
    arquivos.set("assets/js/dados/BaseAnaliticaDoVigitel.js", serializarBase(base));
    arquivos.set("assets/js/dados/CatalogoDeIdadeDetalhada.js", serializarCatalogo(base, diagnosticos));
    arquivos.set("assets/js/dados/MetodologiaDosIndicadores.js", serializarMetodologia(configuracao, base));
    arquivos.set("assets/js/dados/idade-detalhada/AtualizacaoDaIdadeDetalhada.js", serializarAtualizacaoDeIdade(resultado, base, diagnosticos));
    serializarResumos(resultado).forEach((conteudo, nome) => arquivos.set(nome, conteudo));
    arquivos.set("dados/dicionarios/DicionarioDosDadosDoVigitel.csv", serializarDicionario(dicionario));
    const relatorio = {
      geradoEm: new Date().toISOString(),
      versao: base.meta.baseVersion,
      anosDisponiveis: base.dims.years,
      arquivosRecebidos: diagnosticos.map(item => ({
        nome: item.nome,
        populacao: item.populacao,
        anos: [...item.anos].sort(),
        linhasPorAno: Object.fromEntries(item.linhasPorAno),
        capitaisPorAno: Object.fromEntries([...item.ufsPorAno].map(([ano, ufs]) => [ano, ufs.size])),
        regrasComColunasPresentes: regrasCompativeis(item.colunas).map(regra => regra.id)
      })),
      indicadores: base.indicators.length,
      indicadoresComResultado: [...new Set(
        [...resultado.acumuladores.base.keys()].map(chave => chave.split("|")[6])
      )].sort(),
      linhasAgregadas: base.rows.length,
      novosIndicadoresIncluidos: configuracao.novosIndicadores.map(item => item.id),
      novosIndicadoresPendentes: configuracao.pendentes,
      observacao: "Nenhum valor foi imputado. Anos incompletos, pesos inválidos e definições sem códigos explícitos são rejeitados."
    };
    arquivos.set("relatorios/RelatorioDaAtualizacaoAdministrativa.json", JSON.stringify(relatorio, null, 2) + "\n");
    arquivos.set("documentacao/InstrucoesDaAtualizacao.md", [
      "# Atualização validada do Observatório Analítico do Vigitel",
      "",
      "Extraia o pacote sobre a raiz do projeto preservando toda a estrutura de pastas.",
      "Não renomeie nem mova os arquivos JavaScript: o painel utiliza estes caminhos para carregar a base.",
      "Depois da substituição, execute os validadores em testes/ e os scripts de manutenção descritos em documentacao/GuiaDeAtualizacaoFutura.md.",
      "",
      "O relatório JSON distingue regras com colunas presentes de indicadores que realmente produziram resultado.",
      "A publicação no GitHub continua sendo uma etapa separada e exige as permissões da conta responsável.",
      ""
    ].join("\n"));
    const manifesto = [["arquivo", "bytes", "sha256"]];
    for (const [nome, conteudo] of arquivos.entries()) {
      progresso?.(`Calculando assinatura de ${nome}`);
      manifesto.push([nome, new TextEncoder().encode(conteudo).length, await sha256(conteudo)]);
    }
    arquivos.set("dados/metadados/ManifestoDaAtualizacao.csv", manifesto.map(linha => linha.join(",")).join("\n") + "\n");
    return { arquivos, base, relatorio };
  }

  /** Executa diagnóstico, validação e cálculo completo na ordem segura. */
  async function processar(itens, dicionario, progresso) {
    const diagnosticos = [];
    for (const item of itens) diagnosticos.push(await diagnosticarArquivo(item, dicionario, progresso));
    const validacao = validarDiagnosticos(diagnosticos, dicionario);
    if (validacao.erros.length) return { diagnosticos, validacao, resultado: null, configuracao: null };
    const configuracao = prepararRegras(dicionario);
    const resultado = await agregarArquivos(itens, diagnosticos, dicionario, configuracao, progresso);
    return { diagnosticos, validacao, resultado, configuracao };
  }

  window.AtualizacaoDosDadosDoVigitel = Object.freeze({
    lerDicionario,
    processar,
    gerarArquivos,
    normalizarTexto,
    regras: REGRAS
  });
})();
