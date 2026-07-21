################################################################################
# OBSERVATÓRIO ANALÍTICO DO VIGITEL — SCRIPT R DE PREPARAÇÃO E CONFERÊNCIA
#
# Finalidade:
#   1. Documentar as 63 regras utilizadas pelo painel.
#   2. Permitir conferência independente das prevalências ponderadas.
#   3. Evitar as associações incorretas existentes no script legado.
#
# Regras fundamentais:
#   - O ano da edição é obtido do nome do arquivo, e não da variável de coleta.
#   - População geral: prioriza pesorake2025; usa pesorake somente quando o peso harmonizado não está disponível.
#   - Base especial de 2018: população negra = q69_cor == 2 e peso pesorake_cor.
#   - Códigos 777/888 e ausências não entram no denominador.
#   - Indicadores indisponíveis em um ano retornam NULL, sem gerar zero artificial.
#
# O gerador canônico do site é RecalculoDosIndicadores.py.
################################################################################

options(stringsAsFactors = FALSE)

# Relação entre os nomes dos microdados e o ano usado nos cálculos.
ANOS_POR_NOME <- c(
  "DoisMilESeis" = 2006,
  "DoisMilESete" = 2007,
  "DoisMilEOito" = 2008,
  "DoisMilENove" = 2009,
  "DoisMilEDez" = 2010,
  "DoisMilEOnze" = 2011,
  "DoisMilEDoze" = 2012,
  "DoisMilETreze" = 2013,
  "DoisMilEQuatorze" = 2014,
  "DoisMilEQuinze" = 2015,
  "DoisMilEDezesseis" = 2016,
  "DoisMilEDezessete" = 2017,
  "DoisMilEDezoito" = 2018,
  "DoisMilEDezenove" = 2019,
  "DoisMilEVinte" = 2020,
  "DoisMilEVinteEUm" = 2021,
  "DoisMilEVinteETres" = 2023,
  "DoisMilEVinteEQuatro" = 2024
)

#' Identifica a edição do Vigitel a partir do nome acadêmico do arquivo.
#'
#' @param nome_arquivo Nome ou caminho do arquivo que será processado.
#' @return Ano da edição como número inteiro; encerra o processamento quando o padrão não é reconhecido.
#' @details Mantenha este mapa sincronizado com a nomenclatura dos microdados e com o script Python de recálculo.
identificar_ano_arquivo <- function(nome_arquivo) {
  chaves <- names(ANOS_POR_NOME)[vapply(names(ANOS_POR_NOME), grepl, logical(1), x = basename(nome_arquivo), fixed = TRUE)]
  if (length(chaves) == 0) stop("Ano da edição não encontrado no nome do arquivo.")
  as.integer(ANOS_POR_NOME[[chaves[1]]])
}

CAPITAIS_VIGITEL <- data.frame(
  cidade = 1:27,
  capital = c(
    "Aracaju", "Belém", "Belo Horizonte", "Boa Vista", "Campo Grande",
    "Cuiabá", "Curitiba", "Florianópolis", "Fortaleza", "Goiânia",
    "João Pessoa", "Macapá", "Maceió", "Manaus", "Natal", "Palmas",
    "Porto Alegre", "Porto Velho", "Recife", "Rio Branco", "Rio de Janeiro",
    "Salvador", "São Luís", "São Paulo", "Teresina", "Vitória",
    "Distrito Federal"
  ),
  uf = c(
    "SE", "PA", "MG", "RR", "MS", "MT", "PR", "SC", "CE", "GO",
    "PB", "AP", "AL", "AM", "RN", "TO", "RS", "RO", "PE", "AC",
    "RJ", "BA", "MA", "SP", "PI", "ES", "DF"
  ),
  regiao = c(
    "Nordeste", "Norte", "Sudeste", "Norte", "Centro-Oeste",
    "Centro-Oeste", "Sul", "Sul", "Nordeste", "Centro-Oeste",
    "Nordeste", "Norte", "Nordeste", "Norte", "Nordeste", "Norte",
    "Sul", "Norte", "Nordeste", "Norte", "Sudeste", "Nordeste",
    "Nordeste", "Sudeste", "Nordeste", "Sudeste", "Centro-Oeste"
  )
)

#' Converte valores para número, tratando vírgula decimal e códigos que não representam medidas válidas.
#'
#' @param x Valores usados por esta etapa do cálculo.
#' @return Vetor numérico com valores inválidos convertidos em ausentes.
#' @details Ao alterar a regra, compare os resultados com a metodologia e execute a validação completa antes da publicação.
numero <- function(x) {
  if (is.numeric(x)) return(as.numeric(x))
  x <- trimws(as.character(x))
  usa_virgula <- grepl(",", x, fixed = TRUE)
  x[usa_virgula] <- gsub("\\.", "", x[usa_virgula])
  x[usa_virgula] <- gsub(",", ".", x[usa_virgula], fixed = TRUE)
  suppressWarnings(as.numeric(x))
}

#' Recupera uma coluna pelo nome sem interromper o processamento quando a variável não existe na edição.
#'
#' @param base, nome Valores usados por esta etapa do cálculo.
#' @return Vetor numérico da coluna ou vetor ausente com o mesmo número de linhas da base.
#' @details Ao alterar a regra, compare os resultados com a metodologia e execute a validação completa antes da publicação.
obter <- function(base, nome) {
  if (!nome %in% names(base)) return(rep(NA_real_, nrow(base)))
  numero(base[[nome]])
}

#' Monta as máscaras de elegibilidade e evento a partir dos códigos válidos da variável.
#'
#' @param base, variavel, validos, positivos Valores usados por esta etapa do cálculo.
#' @return Lista com as máscaras lógicas elegivel e evento.
#' @details Ao alterar a regra, compare os resultados com a metodologia e execute a validação completa antes da publicação.
regra_codigos <- function(base, variavel, validos, positivos) {
  x <- obter(base, variavel)
  elegivel <- x %in% validos
  evento <- elegivel & x %in% positivos
  list(elegivel = elegivel, evento = evento)
}

#' Aplica a regra padrão a variáveis codificadas em zero e um.
#'
#' @param base, variavel, positivo Valores usados por esta etapa do cálculo.
#' @return Lista com as máscaras lógicas elegivel e evento.
#' @details Ao alterar a regra, compare os resultados com a metodologia e execute a validação completa antes da publicação.
regra_binaria <- function(base, variavel, positivo = 1) {
  regra_codigos(base, variavel, c(0, 1), positivo)
}

#' Classifica o índice de massa corporal depois de validar peso, altura e limites plausíveis.
#'
#' @param base, tipo Valores usados por esta etapa do cálculo.
#' @return Lista com elegibilidade e ocorrência da categoria de IMC solicitada.
#' @details Ao alterar a regra, compare os resultados com a metodologia e execute a validação completa antes da publicação.
regra_imc <- function(base, tipo) {
  peso <- obter(base, "q9_i")
  altura <- obter(base, "q11_i")
  imc <- round(peso / ((altura / 100)^2), 6)
  elegivel <- !is.na(peso) & !is.na(altura) & peso < 700 & altura < 700
  elegivel <- elegivel & imc >= 7 & imc <= 115
  if (tipo == "adequado") evento <- elegivel & imc >= 18.5 & imc < 25
  if (tipo == "baixo") evento <- elegivel & imc < 18.5
  list(elegivel = elegivel, evento = evento)
}

#' Seleciona a definição metodológica do indicador e produz as máscaras usadas no cálculo ponderado.
#'
#' @param base, indicador_id Valores usados por esta etapa do cálculo.
#' @return Lista com elegibilidade e evento, ou valor nulo quando a edição não possui as variáveis exigidas.
#' @details Ao alterar a regra, compare os resultados com a metodologia e execute a validação completa antes da publicação.
calcular_evento <- function(base, indicador_id) {
  # Retorna duas máscaras lógicas: elegível e evento.
  # Quando as variáveis necessárias não existem na edição, retorna NULL.
  disponiveis <- names(base)
  #' Confere se todas as variáveis necessárias à regra estão disponíveis na edição em processamento.
  #'
  #' @param vars Valores usados por esta etapa do cálculo.
  #' @return Valor lógico indicando se a regra pode ser calculada.
  #' @details Ao alterar a regra, compare os resultados com a metodologia e execute a validação completa antes da publicação.
  exige <- function(vars) all(vars %in% disponiveis)

  if (indicador_id == "TAB01" && exige("fumante")) return(regra_binaria(base, "fumante"))
  if (indicador_id == "TAB02" && exige("q60")) return(regra_codigos(base, "q60", 1:3, 1))
  if (indicador_id == "TAB03" && exige("q60")) return(regra_codigos(base, "q60", 1:3, 2))
  if (indicador_id == "TAB04" && exige("fumante")) return(regra_binaria(base, "fumante", 0))
  if (indicador_id == "TAB05" && exige("q60")) {
    if (exige("exfuma") && any(obter(base, "exfuma") %in% c(0, 1), na.rm = TRUE)) {
      return(regra_binaria(base, "exfuma"))
    }
    q60 <- obter(base, "q60"); q64 <- obter(base, "q64")
    elegivel <- q60 %in% 1:3
    return(list(elegivel = elegivel, evento = elegivel & q60 == 3 & q64 %in% c(1, 2)))
  }
  if (indicador_id == "TAB06" && exige("q63")) return(regra_codigos(base, "q63", c(1, 2), 1))
  # Série revista de fumo passivo: a partir de 2018, inclui fumantes expostos.
  # O denominador é a população adulta entrevistada, e não somente não fumantes.
  if (indicador_id == "TAB07" && exige(c("q67", "edicao"))) {
    if (all(base$edicao < 2018, na.rm = TRUE)) return(NULL)
    x <- obter(base, "q67")
    elegivel <- base$edicao >= 2018
    return(list(elegivel = elegivel, evento = elegivel & x == 1))
  }
  if (indicador_id == "TAB08" && exige(c("q68", "edicao"))) {
    if (all(base$edicao < 2018, na.rm = TRUE)) return(NULL)
    x <- obter(base, "q68")
    elegivel <- base$edicao >= 2018
    return(list(elegivel = elegivel, evento = elegivel & x == 1))
  }

  if (indicador_id == "ALC01" && exige("q35")) return(regra_codigos(base, "q35", c(1, 2, 3, 4), 1))
  if (indicador_id == "ALC02" && exige(c("q35", "q36"))) {
    q35 <- obter(base, "q35"); q36 <- obter(base, "q36")
    elegivel <- q35 %in% c(1, 2, 3, 4)
    return(list(elegivel = elegivel, evento = elegivel & q35 == 1 & q36 %in% 1:4))
  }
  if (indicador_id %in% c("ALC03", "ALC04") && exige(c("alcabu", "q7"))) {
    sexo <- ifelse(indicador_id == "ALC03", 1, 2)
    x <- obter(base, "alcabu"); q7 <- obter(base, "q7")
    elegivel <- x %in% c(0, 1) & q7 == sexo
    return(list(elegivel = elegivel, evento = elegivel & x == 1))
  }
  if (indicador_id == "ALC05" && exige("q36")) return(regra_codigos(base, "q36", 1:6, 1:4))
  if (indicador_id == "ALC06" && exige("r200")) {
    x <- obter(base, "r200"); elegivel <- x >= 0 & x <= 100 & !is.na(x)
    return(list(elegivel = elegivel, evento = elegivel & x >= 5))
  }
  if (indicador_id == "ALC07" && exige("direcao")) return(regra_binaria(base, "direcao"))
  if (indicador_id == "ALC08" && exige("q40b")) return(regra_codigos(base, "q40b", 1:4, c(1, 2)))

  if (indicador_id == "IMC01" && exige("excpeso_i")) return(regra_binaria(base, "excpeso_i"))
  if (indicador_id == "IMC02" && exige("obesid_i")) return(regra_binaria(base, "obesid_i"))
  if (indicador_id == "IMC03" && exige(c("q9_i", "q11_i"))) return(regra_imc(base, "adequado"))
  if (indicador_id == "IMC04" && exige(c("q9_i", "q11_i"))) return(regra_imc(base, "baixo"))
  if (indicador_id == "IMC05" && exige("obesid_i")) return(regra_binaria(base, "obesid_i", 0))

  derivados_binarios <- c(
    CA01 = "feijao5", CA02 = "frutareg", CA03 = "hortareg", CA04 = "flvreg",
    CA06 = "refritl5", AF04 = "ativo_livre", AF05 = "atitrans",
    AF06 = "atiocu", AF07 = "atidom",
    PC01 = "mamodois", PC02 = "mamo", PC03 = "papa", PC04 = "papatres",
    MR01 = "hart", MR02 = "diab", MR03 = "dislip", MR04 = "coracao",
    MR05 = "asma", MR06 = "osteo", MR07 = "depressao",
    CT02 = "direcao_alc"
  )
  if (indicador_id %in% names(derivados_binarios)) {
    variavel <- unname(derivados_binarios[indicador_id])
    if (exige(variavel)) return(regra_binaria(base, variavel))
  }

  regras_frequencia <- list(
    CA05 = c("q29", 1, 2, 3, 4, 5, 6, 1, 2, 3, 4),
    CA07 = c("q25", 1, 2, 3, 4, 5, 6, 3, 4),
    CA08 = c("r143", 1, 2, 3, 4, 5, 6, 3, 4),
    CA09 = c("r144a", 1, 2, 3, 4, 5, 6, 3, 4),
    CA10 = c("r144b", 1, 2, 3, 4, 5, 6, 3, 4)
  )
  if (indicador_id %in% names(regras_frequencia)) {
    variavel <- regras_frequencia[[indicador_id]][1]
    if (!exige(variavel)) return(NULL)
    positivos <- if (indicador_id == "CA05") 1:4 else c(3, 4)
    return(regra_codigos(base, variavel, 1:6, positivos))
  }

  if (indicador_id == "AF01" && exige("q42")) return(regra_codigos(base, "q42", c(1, 2), 1))
  if (indicador_id == "AF02" && exige(c("q42", "q45"))) {
    q42 <- obter(base, "q42"); q45 <- obter(base, "q45")
    elegivel <- q42 %in% c(1, 2)
    return(list(elegivel = elegivel, evento = elegivel & q42 == 1 & q45 %in% c(2, 3, 4)))
  }
  if (indicador_id == "AF03" && exige(c("q42", "q46"))) {
    q42 <- obter(base, "q42"); q46 <- obter(base, "q46")
    elegivel <- q42 %in% c(1, 2)
    valores <- q46[!is.na(q46)]
    adequado <- if (length(valores) > 0 && max(valores) <= 3) q46 == 3 else q46 %in% 4:7
    return(list(elegivel = elegivel, evento = elegivel & q42 == 1 & adequado))
  }
  # A definição revista pode ser aplicada retroativamente desde 2009.
  # Prioriza inativo_2023 em qualquer edição que a contenha; usa inativo como fallback legado.
  if (indicador_id == "AF08" && (exige("inativo") || exige("inativo_2023"))) {
    legado <- if (exige("inativo")) obter(base, "inativo") else rep(NA_real_, nrow(base))
    revisto <- if (exige("inativo_2023")) obter(base, "inativo_2023") else rep(NA_real_, nrow(base))
    x <- ifelse(revisto %in% c(0, 1), revisto, legado)
    elegivel <- x %in% c(0, 1)
    return(list(elegivel = elegivel, evento = elegivel & x == 1))
  }

  if (indicador_id %in% paste0("AS0", 1:5) && exige("q74")) {
    positivos <- switch(indicador_id, AS01 = c(1, 2), AS02 = 3, AS03 = c(4, 5), AS04 = 1, AS05 = 2)
    return(regra_codigos(base, "q74", 1:5, positivos))
  }

  if (indicador_id == "CT04" && exige(c("r153", "r137a"))) {
    r153 <- obter(base, "r153")
    r137a <- obter(base, "r137a")
    elegivel <- r153 == 1 & r137a %in% c(1, 2)
    return(list(elegivel = elegivel, evento = elegivel & r137a == 1))
  }

  if (indicador_id == "CT05" && exige(c("r137a", "r154"))) {
    r137a <- obter(base, "r137a"); r154 <- obter(base, "r154")
    elegivel <- r137a == 1 & r154 %in% c(1, 2)
    return(list(elegivel = elegivel, evento = elegivel & r154 == 1))
  }
  if (indicador_id == "CT06" && exige(c("r154", "r155"))) {
    r154 <- obter(base, "r154"); r155 <- obter(base, "r155")
    elegivel <- r154 == 1 & r155 %in% c(1, 2)
    return(list(elegivel = elegivel, evento = elegivel & r155 == 1))
  }
  if (indicador_id == "CT07" && exige(c("r155", "r156"))) {
    r155 <- obter(base, "r155"); r156 <- obter(base, "r156")
    elegivel <- r155 == 1 & r156 %in% c(1, 2)
    return(list(elegivel = elegivel, evento = elegivel & r156 == 1))
  }

  transito <- list(
    CT01 = c("r190", 1, 2),
    CT03 = c("q40b", 1, 2, 3, 4),
    CT08 = c("r178", 1, 2)
  )
  if (indicador_id %in% names(transito)) {
    variavel <- transito[[indicador_id]][1]
    if (!exige(variavel)) return(NULL)
    positivos <- if (indicador_id == "CT03") c(1, 2, 3) else 1
    validos <- if (indicador_id == "CT03") 1:4 else c(1, 2)
    return(regra_codigos(base, variavel, validos, positivos))
  }

  NULL
}

#' Harmoniza nomes, tipos, pesos, localidade e população antes do cálculo dos indicadores.
#'
#' @param base, nome_arquivo Valores usados por esta etapa do cálculo.
#' @return Base pronta para o cálculo ponderado, com registros inválidos removidos.
#' @details Ao alterar a regra, compare os resultados com a metodologia e execute a validação completa antes da publicação.
preparar_base <- function(base, nome_arquivo) {
  ano <- identificar_ano_arquivo(nome_arquivo)

  colunas_numericas <- intersect(names(base), unique(c(
    "cidade", "q6", "q7", "q69_cor", "pesorake", "pesorake2025", "pesorake_cor",
    "q9_i", "q11_i", "q35", "q36", "q40b", "q42", "q45", "q46",
    "q60", "q63", "q64", "q67", "q68", "q74", "r200", "r190", "r153", "r137a", "r154",
    "r155", "r156", "r178", "inativo", "inativo_2023"
  )))
  for (coluna in colunas_numericas) base[[coluna]] <- numero(base[[coluna]])

  base$edicao <- as.integer(ano)
  base <- merge(base, CAPITAIS_VIGITEL, by = "cidade", all.x = TRUE, sort = FALSE)

  nome_minusculo <- tolower(nome_arquivo)
  eh_pop_negra <- grepl("populacaonegra", nome_minusculo, fixed = TRUE) || grepl("popnegra", nome_minusculo, fixed = TRUE)
  if (eh_pop_negra) {
    if (!"q69_cor" %in% names(base)) stop("A base de população negra não possui q69_cor.")
    base <- base[!is.na(base$q69_cor) & base$q69_cor == 2, , drop = FALSE]
    base$populacao <- "População Negra"
    base$peso_analise <- numero(base$pesorake_cor)
  } else {
    base$populacao <- "População Geral"
    if ("pesorake2025" %in% names(base) && any(!is.na(numero(base$pesorake2025)))) {
      base$peso_analise <- numero(base$pesorake2025)
      base$peso_utilizado <- "pesorake2025"
    } else {
      base$peso_analise <- numero(base$pesorake)
      base$peso_utilizado <- "pesorake"
    }
  }

  base <- base[
    obter(base, "q6") >= 18 & obter(base, "q6") <= 120 &
      obter(base, "q7") %in% c(1, 2) &
      !is.na(base$uf) & !is.na(base$peso_analise) & base$peso_analise > 0,
    , drop = FALSE
  ]
  base
}

#' Calcula numerador, denominador, prevalência e medidas auxiliares do indicador selecionado.
#'
#' @param base, indicador_id Valores usados por esta etapa do cálculo.
#' @return Linha de resultado ponderado ou valor nulo quando não existem respostas elegíveis.
#' @details Ao alterar a regra, compare os resultados com a metodologia e execute a validação completa antes da publicação.
prevalencia_ponderada <- function(base, indicador_id) {
  regra <- calcular_evento(base, indicador_id)
  if (is.null(regra)) return(NULL)
  elegivel <- regra$elegivel & !is.na(regra$elegivel) & !is.na(base$peso_analise) & base$peso_analise > 0
  evento <- regra$evento & !is.na(regra$evento)
  if (!any(elegivel)) return(NULL)
  numerador <- sum(base$peso_analise[elegivel & evento], na.rm = TRUE)
  denominador <- sum(base$peso_analise[elegivel], na.rm = TRUE)
  data.frame(
    indicador_id = indicador_id,
    percentual = 100 * numerador / denominador,
    numerador_ponderado = numerador,
    denominador_ponderado = denominador,
    entrevistas = sum(elegivel),
    casos = sum(elegivel & evento),
    soma_pesos_quadrado = sum(base$peso_analise[elegivel]^2, na.rm = TRUE)
  )
}

INDICADORES_V13 <- c(
  paste0("TAB0", 1:8), paste0("ALC0", 1:8), paste0("IMC0", 1:5),
  sprintf("CA%02d", 1:10), paste0("AF0", 1:8), paste0("AS0", 1:5),
  paste0("PC0", 1:4), paste0("MR0", 1:7), paste0("CT0", 1:8)
)

# Exemplo de uso:
# arquivo <- "Microdados/ColecaoCompletaDoVigitel/MicrodadosDoVigitelAnoDoisMilEVinteETresComPesoRake.csv"
# base <- read.csv(arquivo, check.names = FALSE)
# base <- preparar_base(base, basename(arquivo))
# resultado <- do.call(rbind, lapply(INDICADORES_V13, function(id) prevalencia_ponderada(base, id)))
# write.csv(resultado, "ResultadosProcessados/IndicadoresCalculados.csv", row.names = FALSE, fileEncoding = "UTF-8")
################################################################################
