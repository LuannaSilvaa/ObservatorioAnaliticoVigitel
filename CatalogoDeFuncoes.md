# Catálogo de funções

Este catálogo reúne as rotinas nomeadas do projeto e resume a responsabilidade registrada junto ao código. A documentação principal permanece no próprio arquivo, pois essa proximidade reduz divergências durante futuras atualizações.

Foram catalogadas **290 funções**: **210 em JavaScript**, **46 em Python** e **34 em R**.

| Linguagem | Arquivo | Função | Linha | Responsabilidade |
|---|---|---|---:|---|
| JavaScript | `BaseAnaliticaDoVigitel.js` | `$` | 15 | Localiza o primeiro elemento da página que corresponde ao seletor CSS informado. |
| JavaScript | `BaseAnaliticaDoVigitel.js` | `$$` | 21 | Reúne em uma lista todos os elementos da página que correspondem ao seletor CSS informado. |
| JavaScript | `GlossarioMetodologico.js` | `indicatorFormula` | 34 | Monta a fórmula textual do indicador com numerador e denominador. |
| JavaScript | `GlossarioMetodologico.js` | `getGlossaryEntry` | 45 | Retorna o verbete metodológico correspondente ao indicador informado. |
| JavaScript | `GlossarioMetodologico.js` | `filteredIndicators` | 62 | Seleciona os indicadores que correspondem à busca do glossário. |
| JavaScript | `GlossarioMetodologico.js` | `renderList` | 71 | Monta a lista de indicadores disponível no glossário. |
| JavaScript | `GlossarioMetodologico.js` | `renderContent` | 84 | Monta o conteúdo detalhado do verbete selecionado. |
| JavaScript | `GlossarioMetodologico.js` | `open` | 104 | Abre o glossário e posiciona a busca no campo adequado. |
| JavaScript | `GlossarioMetodologico.js` | `close` | 117 | Fecha o glossário e devolve o foco ao controle de abertura. |
| JavaScript | `GlossarioMetodologico.js` | `init` | 126 | Inicializa a busca, a lista e os controles do glossário. |
| JavaScript | `InterfaceResponsiva.js` | `openFilters` | 10 | Abre o painel de filtros em telas pequenas e controla o foco. |
| JavaScript | `InterfaceResponsiva.js` | `closeFilters` | 22 | Fecha o painel de filtros e devolve o foco ao botão de abertura. |
| JavaScript | `InterfaceResponsiva.js` | `updateButtonVisibility` | 33 | Mostra o botão de filtros somente quando o layout móvel está ativo. |
| JavaScript | `InterfaceResponsiva.js` | `init` | 43 | Inicializa os controles específicos para telas pequenas. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `resolveThemeMode` | 30 | Determina se o painel deve usar o modo claro, o modo escuro ou a preferência do sistema. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `resolveAppliedTheme` | 41 | Define o tema efetivamente aplicado depois de interpretar a preferência escolhida. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `currentThemeMode` | 49 | Retorna a preferência de tema atualmente selecionada pelo usuário. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `currentTheme` | 56 | Retorna o tema visual que está ativo na página. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `updateThemeButtons` | 63 | Atualiza o estado visual e os atributos de acessibilidade dos botões de tema. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `applyGraphTheme` | 78 | Aplica ao gráfico as cores e os contrastes correspondentes ao tema visual. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `applyThemeMode` | 89 | Aplica a preferência de tema, salva a escolha e atualiza o gráfico quando necessário. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `initializeTheme` | 116 | Inicializa o tema antes da interação do usuário e conecta os botões de aparência. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `handler` | 128 | Reaplica o tema automático quando a preferência de aparência do sistema operacional é alterada. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `isDataFilterTarget` | 176 | Informa se o evento partiu de um controle que altera os dados da análise. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `isAutomaticAnalysisTarget` | 193 | Identifica campos que alteram dados, recortes ou aparência da análise. A verificação por contêiner também alcança controles incluídos futuramente na lateral de filtros, sem exigir um novo evento para cada campo criado. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `handleAutomaticAnalysisUpdate` | 206 | Encaminha toda alteração relevante para a mesma rotina de atualização. Campos de texto, cores e controles deslizantes usam um pequeno intervalo para evitar várias renderizações durante a digitação ou o arraste. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `bindAutomaticAnalysisUpdates` | 218 | Instala a atualização automática por delegação de eventos. Assim, filtros recriados dinamicamente continuam funcionando sem ligações individuais. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `clearLegendStateForNewData` | 226 | Limpa a busca e as categorias ocultas da legenda quando o conjunto de dados muda. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `invalidateAnalysisData` | 236 | Descarta ResultadosProcessados em cache quando uma seleção modifica a análise. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `normalizeFilterState` | 248 | Padroniza o estado dos filtros para que valores ausentes e listas tenham formato consistente. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `queueFilterRefresh` | 330 | Agrupa alterações sucessivas dos filtros e agenda uma única atualização da análise. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `exactAgeSupported` | 390 | Informa se o indicador selecionado possui ResultadosProcessados válidos por idade exata. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `exactAgeUnsupportedReason` | 397 | Explica por que a idade exata não está disponível para a combinação selecionada. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `loadExactAgeIndicator` | 404 | Carrega sob demanda o arquivo de idade detalhada do indicador selecionado. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `filterExactAgeRows` | 434 | Aplica os filtros ativos às linhas calculadas por idade exata. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `aggregateExactRows` | 462 | Agrupa as linhas de idade exata e calcula numeradores, denominadores e entrevistas. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `detailToAgeGroup` | 507 | Converte idade detalhada para o grupo etário adulto correspondente. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `detailsFromGroup` | 520 | Retorna as idades detalhadas associadas a cada faixa etária adulta. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `init` | 532 | Inicializa o painel, monta os blocos, filtros e mensagens iniciais sem gerar seleção automática. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `buildHeaderStatus` | 555 | Mostra um resumo da base carregada, indicando quantidade de linhas, indicadores e período. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `normalizeText` | 562 | Padroniza textos para buscas e comparações, removendo diferenças de acentuação e caixa. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `categoryToken` | 569 | Cria um identificador estável para comparar categorias da legenda. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `matchesLegendSearch` | 576 | Verifica se a categoria corresponde ao texto digitado na busca da legenda. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `isHiddenCategory` | 585 | Informa se a categoria foi ocultada manualmente pelo usuário. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `toggleHiddenCategory` | 592 | Alterna a visibilidade de uma categoria sem modificar os dados originais. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `revealAllCategories` | 604 | Torna novamente visíveis todas as categorias ocultadas na legenda. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `controlIds` | 616 | Lista os identificadores dos controles cuja configuração pode ser salva e restaurada. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `getControlSnapshot` | 623 | Lê os valores atuais dos controles visuais e devolve uma cópia da configuração. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `applyControlSnapshot` | 636 | Restaura os valores dos controles visuais a partir de uma configuração salva. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `getFilterSnapshot` | 646 | Lê o estado atual dos filtros e devolve uma cópia independente. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `applyFilterSnapshot` | 662 | Restaura os filtros a partir de uma configuração salva. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `captureAnalysisState` | 683 | Reúne tema, indicador, gráfico, filtros e aparência em um único estado da análise. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `stateSignature` | 707 | Monta uma assinatura estável do estado para detectar alterações repetidas. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `saveAnalysisState` | 714 | Salva a configuração atual da análise no armazenamento do navegador. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `applyAnalysisState` | 726 | Aplica uma configuração completa e sincroniza seleções, filtros e aparência. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `restoreAnalysisState` | 765 | Recupera a última análise salva e a aplica ao painel. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `recordHistory` | 786 | Registra o estado atual nas pilhas de desfazer e refazer. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `updateHistoryButtons` | 801 | Habilita ou desabilita os botões de histórico conforme as ações disponíveis. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `undoAnalysis` | 811 | Restaura o estado anterior da análise. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `redoAnalysis` | 825 | Reaplica o estado que foi desfeito mais recentemente. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `getVersionHistory` | 838 | Retorna as versões da análise salvas no navegador. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `setVersionHistory` | 849 | Grava a lista de versões da análise no navegador. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `versionSummary` | 856 | Produz um resumo curto da configuração guardada em uma versão. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `addVersionRecord` | 873 | Acrescenta uma nova entrada ao histórico de versões. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `scheduleVersionRecord` | 898 | Agenda o registro de uma versão depois que as alterações atuais terminarem. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `renderVersionHistory` | 906 | Monta a lista de versões salvas e seus controles de restauração e exclusão. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `restoreVersionRecord` | 924 | Restaura a configuração guardada em uma versão específica. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `deleteVersionRecord` | 938 | Remove uma versão salva do histórico. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `clearVersionHistory` | 946 | Apaga o histórico de versões após a confirmação do usuário. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `getFavorites` | 956 | Retorna as análises favoritas salvas no navegador. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `setFavorites` | 967 | Grava a lista de análises favoritas no navegador. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `saveCurrentFavorite` | 974 | Salva a análise atual como favorita com o nome informado. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `loadFavorite` | 988 | Carrega uma análise favorita e atualiza o painel. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `deleteFavorite` | 1001 | Remove uma análise da lista de favoritas. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `renderFavorites` | 1009 | Monta a lista de análises favoritas e seus botões de ação. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `encodeSharedState` | 1023 | Codifica o estado da análise para incluí-lo no endereço compartilhável. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `decodeSharedState` | 1031 | Decodifica o estado recebido por endereço e reconstrói a configuração da análise. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `applySharedConfigurationFromHash` | 1060 | Lê a configuração presente no endereço e a aplica ao painel. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `announceSave` | 1079 | Exibe mensagens de salvamento e atualização para o usuário e para tecnologias assistivas. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `safeRun` | 1087 | Executa uma rotina protegida e registra a falha sem interromper toda a interface. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `updateChartAdvice` | 1099 | Atualiza a orientação exibida de acordo com o tipo de gráfico e o volume de categorias. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `upgradeAccessibility` | 1120 | Complementa rótulos, estados e navegação por teclado dos controles existentes. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `renderCompareIndicators` | 1130 | Monta a comparação entre indicadores usando o mesmo conjunto de filtros. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `updateChartExplanation` | 1147 | Atualiza o texto que explica a leitura do gráfico atual. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `estimatePrecision` | 1161 | Calcula erro padrão, intervalo de confiança e coeficiente de variação da estimativa. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `sampleReliability` | 1185 | Classifica a estabilidade da estimativa com base na amostra e no coeficiente de variação. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `updateLoading` | 1192 | Mostra ou oculta o estado de carregamento durante cálculos e renderizações. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `scheduleGenerate` | 1203 | Agenda a geração do gráfico para evitar execuções repetidas durante alterações rápidas. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `analysisRequestSignature` | 1227 | Monta a assinatura da solicitação atual para reconhecer cálculos equivalentes. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `analysisCacheKey` | 1252 | Monta a chave usada para armazenar e recuperar ResultadosProcessados calculados. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `getAnalysisResult` | 1259 | Retorna o resultado da análise atual, reutilizando o cache quando possível. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `getFilteredTableRows` | 1281 | Aplica busca, ordenação e paginação às linhas exibidas na tabela. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `buildFilterDescription` | 1319 | Monta uma descrição textual dos filtros aplicados à análise. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `formatReportDate` | 1336 | Formata a data e a hora usadas no relatório exportado. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `reportMethodology` | 1348 | Monta o texto metodológico incluído no relatório da análise. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `totalN` | 1353 | Soma o número de entrevistas das linhas consideradas. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `totalDen` | 1357 | Soma o denominador ponderado das linhas consideradas. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `totalNum` | 1361 | Soma o numerador ponderado das linhas consideradas. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `reportTableContext` | 1372 | Resume a tabela, a amostra e a precisão para inclusão no relatório. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `generatePdfReport` | 1383 | Monta e baixa o relatório em PDF com gráfico, filtros, metodologia e tabela. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `hexToRgb` | 1412 | Converte uma cor hexadecimal em componentes vermelho, verde e azul. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `relativeLuminance` | 1421 | Calcula a luminância relativa de uma cor para a avaliação de contraste. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `contrastRatio` | 1431 | Calcula a razão de contraste entre duas cores. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `runAutomatedTests` | 1439 | Executa os testes internos do painel e apresenta um resumo dos ResultadosProcessados. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `test` | 1444 | Executa uma verificação isolada e registra se o comportamento observado corresponde ao esperado. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `iconSVG` | 1496 | Retorna o SVG usado como ícone visual nos blocos, filtros e cartões do construtor. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `getThemeIcon` | 1524 | Escolhe o desenho principal de cada tema de acordo com o assunto analisado. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `getIndicatorIcon` | 1542 | Define o ícone do indicador a partir do tema ao qual ele pertence. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `getChartIcon` | 1549 | Seleciona o ícone correspondente ao tipo de gráfico escolhido pelo usuário. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `makeBlock` | 1557 | Cria cada bloco visual clicável ou arrastável usado na lateral e no fluxo de construção. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `renderThemes` | 1577 | Mostra os temas em formato de acordeão e coloca os indicadores dentro do tema correspondente. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `renderIndicators` | 1664 | Mantém compatibilidade com a busca; os indicadores agora aparecem dentro dos temas. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `renderFilterBlock` | 1671 | Mostra o bloco de filtros como bloco móvel, mantendo a lógica inicial de arrastar ou clicar. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `renderChartBlocks` | 1681 | Renderiza todos os tipos de gráficos disponíveis para seleção. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `renderCurrentChartSelection` | 1693 | Atualiza a indicação visual do tipo de gráfico selecionado. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `selectBlock` | 1721 | Atualiza a análise ao escolher tema, indicador, bloco de filtros ou tipo de gráfico. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `renderSlots` | 1784 | Atualiza os quatro cartões centrais do construtor com o estado atual da análise. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `setSlot` | 1795 | Monta um cartão central com número, desenho, instrução e seleção atual. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `renderFilters` | 1828 | Preenche os filtros da coluna direita com anos, sexo, localização, idade e população. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `fillChecks` | 1843 | Cria listas de caixas de seleção para filtros com múltiplas opções. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `fillSelect` | 1856 | Preenche campos de seleção simples, como sexo, UF, região e tipo de população. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `hasRequiredBlocks` | 1866 | Verifica se há blocos suficientes para gerar gráfico automaticamente. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `refreshAnalysis` | 1873 | Atualiza resumos, blocos e gráfico quando qualquer filtro ou seleção muda. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `setControlValue` | 1886 | Altera campos do painel sem disparar eventos duplicados. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `clearDemographicFilters` | 1896 | Limpa apenas os filtros demográficos. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `clearGeographicFilters` | 1907 | Limpa apenas os filtros geográficos. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `clearOtherFilters` | 1915 | Limpa recorte e edição visual do gráfico. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `clearAppearanceOnly` | 1971 | Restaura apenas as opções visuais, preservando indicador e filtros. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `applyAppearancePreset` | 1984 | Aplica uma configuração visual predefinida aos controles do gráfico. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `clearFilterSection` | 2002 | Decide qual grupo será limpo ao clicar na lixeira. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `bindEvents` | 2018 | Conecta botões, filtros, lixeiras e controles avançados às ações da interface. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `renderAll` | 2134 | Atualiza todos os blocos visuais e os cartões do construtor de uma vez. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `updateSummaries` | 2139 | Atualiza os resumos dos filtros e dos controles visuais do painel. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `selectedChecks` | 2169 | Retorna os valores marcados em uma lista de checkboxes. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `activeFilterCount` | 2174 | Conta apenas filtros que realmente restringem a análise, evitando marcar o cartão de filtros sem necessidade. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `availableYearsForIndicator` | 2193 | Retorna os anos que possuem dados para o indicador e a população selecionados. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `enforcePopulationYearUI` | 2212 | Limita os anos aos realmente disponíveis para o indicador e para a população selecionada. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `getFilters` | 2232 | Lê o estado dos filtros e aplica a regra da População Negra restrita a 2018. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `rowValue` | 2253 | Extrai a categoria da linha conforme o recorte escolhido. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `filterRows` | 2266 | Filtra a base conforme indicador, ano, sexo, população, UF, região e idade. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `validateFilteredRows` | 2289 | Confere se as linhas filtradas possuem valores e denominadores utilizáveis. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `effectiveGroup` | 2308 | Mantém o recorte escolhido pelo usuário, inclusive idade detalhada. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `chooseGroup` | 2314 | Escolhe o recorte do gráfico sem trocar idade detalhada por faixa etária. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `aggregate` | 2341 | Agrupa os dados; em idade detalhada, distribui a faixa etária disponível pelas idades correspondentes. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `sortKey` | 2394 | Define a ordem das categorias no eixo ou na legenda do gráfico. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `yearsFromRows` | 2407 | Extrai e ordena os anos presentes no conjunto de linhas recebido. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `buildTitleForIndicator` | 2417 | Monta o título do gráfico a partir do indicador e dos principais filtros. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `dataToTableRows` | 2428 | Converte os dados agregados em linhas prontas para a tabela e para exportações. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `activeFilterDescriptions` | 2452 | Produz uma lista legível dos filtros que restringem a análise. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `diagnoseEmptyFilters` | 2467 | Identifica quais filtros eliminaram todos os registros e sugere ajustes. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `addTest` | 2478 | Registra um caso de teste e o resultado observado. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `emptyStateHtml` | 2521 | Monta a mensagem exibida quando não há dados para a combinação selecionada. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `displayCategory` | 2698 | Converte códigos ou categorias internas em nomes mais claros para exibição. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `toSentenceCase` | 2703 | Padroniza títulos com primeira letra maiúscula e restante natural. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `buildTitle` | 2710 | Cria o título do gráfico no padrão escolhido para o relatório. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `buildSubtitle` | 2751 | Mostra unidade e fonte de forma discreta abaixo do título. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `periodLabel` | 2764 | Resume o período selecionado; para População Negra, fixa 2018. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `chartOptions` | 2789 | Lê o painel avançado e devolve todas as opções visuais aplicadas ao gráfico. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `drawChart` | 2846 | Escolhe a visualização e aplica a preparação dos dados sem esconder idades selecionadas em pizza e rosca. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `estimateMaxChars` | 2983 | Estima quantos caracteres cabem por linha considerando a largura útil e o tamanho da fonte. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `wrapTextLines` | 3001 | Divide um texto em linhas simples usando limite aproximado de caracteres por linha. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `fitTextLines` | 3021 | Ajusta fonte e quebra de linha para o texto caber dentro do SVG sem ultrapassar a imagem. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `svgMultilineText` | 3040 | Converte um texto em um bloco SVG com várias linhas. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `alignX` | 3048 | Calcula a posição horizontal de textos alinhados à esquerda, centro ou direita. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `alignAnchor` | 3057 | Define o text-anchor do SVG com base no alinhamento escolhido. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `nextSvgId` | 3067 | Gera um identificador único para elementos internos do SVG. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `svgWrap` | 3075 | Monta o documento SVG final, incluindo título, subtítulo, fonte e margens de exportação. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `grid` | 3136 | Desenha a grade horizontal padrão e os valores do eixo vertical. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `barSvg` | 3151 | Desenha barras verticais com largura, rótulos, valores e rotação configuráveis. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `lineSvg` | 3195 | Desenha linha ou área com espessura, pontos e rótulos configuráveis. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `hbarSvg` | 3238 | Desenha barras horizontais com escala, valores e categorias configuráveis. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `lollipopSvg` | 3277 | Desenha gráfico de pirulito com linhas, pontos e valores configuráveis. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `paretoSvg` | 3313 | Desenha Pareto com barras ordenadas e linha acumulada sem cortes. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `legendViewportProfile` | 3387 | Define limites de legenda adequados ao tamanho da área de visualização. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `adaptiveLegendLayout` | 3402 | Calcula a disposição da legenda conforme o espaço disponível e a quantidade de itens. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `getExportPreset` | 3436 | Retorna a configuração do formato de exportação selecionado. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `exportBackgroundIsTransparent` | 3443 | Informa se o arquivo exportado deve preservar o fundo transparente. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `exportPresetSettings` | 3450 | Retorna dimensões e margens da predefinição de exportação. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `exportChartOptions` | 3467 | Monta as opções visuais específicas da exportação sem alterar o gráfico da tela. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `renderExportChartSvg` | 3482 | Gera o SVG do gráfico usando as dimensões e opções de exportação. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `wrapExportDocument` | 3492 | Insere o gráfico em um documento SVG completo com título, fonte e margens. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `pieSvg` | 3530 | Desenha pizza ou rosca com legenda interativa, busca e distribuição melhorada. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `radarSvg` | 3608 | Desenha radar centralizado, com legenda interativa e adaptação para muitos rótulos. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `treemapSvg` | 3668 | Desenha blocos proporcionais e evita textos em espaços pequenos. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `kpiSvg` | 3723 | Desenha cartões KPI padronizados e com textos contidos, sem limitar a quantidade de categorias. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `gaugeSvg` | 3746 | Desenha medidor(es) sem limitar a quantidade de categorias. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `axis` | 3778 | Desenha os títulos dos eixos, respeitando campos personalizados e opção de mostrar/ocultar. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `palette` | 3790 | Define a sequência de cores conforme a paleta escolhida no painel. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `fmt` | 3805 | Formata números para o padrão brasileiro usando a quantidade de casas decimais escolhida. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `short` | 3812 | Encurta textos muito longos para não poluir o gráfico. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `esc` | 3816 | Escapa caracteres especiais para evitar problemas no HTML e no SVG. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `arc` | 3820 | Calcula o caminho de arco usado em gráficos de pizza e rosca. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `arcStroke` | 3824 | Calcula o caminho de arco usado no gráfico de medidor. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `polar` | 3828 | Converte ângulos e raio em coordenadas para desenhos circulares. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `currentBaseRowsForExport` | 3832 | Monta a base filtrada para exportação em CSV ou Excel. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `renderTable` | 3844 | Renderiza a tabela abaixo do gráfico com os ResultadosProcessados calculados. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `toCsv` | 3868 | Transforma a tabela de objetos em texto CSV. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `downloadCsv` | 3876 | Baixa a análise em formato CSV. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `downloadExcel` | 3880 | Baixa a análise em formato compatível com Excel. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `download` | 3884 | Cria o arquivo temporário no navegador e dispara o download. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `sanitizeFileName` | 3888 | Remove caracteres inadequados e produz um nome seguro para o arquivo exportado. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `svgDimensions` | 3895 | Lê as dimensões do SVG e calcula a área útil do desenho. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `prefixSvgIds` | 3906 | Acrescenta um prefixo aos identificadores do SVG para evitar conflitos. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `prepareSvgClone` | 3938 | Cria uma cópia do SVG e ajusta atributos antes da exportação. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `comparisonExportName` | 3951 | Monta o nome do arquivo usado na exportação de comparações. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `buildExportSvgDocument` | 3963 | Monta o documento SVG final com todos os elementos da exportação. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `serializeChartSvg` | 3998 | Converte o SVG atual em texto pronto para gravação. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `downloadVectorSvg` | 4006 | Baixa o gráfico em SVG vetorial usando a configuração selecionada. |
| JavaScript | `SistemaAnaliticoDoVigitel.js` | `downloadSvg` | 4017 | Converte o SVG atual em uma imagem PNG de alta resolução e inicia o download. |
| JavaScript | `TesteDosIndicadoresEGraficos.js` | `nationalSeries` | 53 | Agrega a série nacional de um indicador para conferir sua renderização em cada tipo de gráfico. |
| Python | `AtualizacaoDaBaseOficial.py` | `normalize_name` | 28 | Padroniza nomes de colunas e arquivos para comparação. |
| Python | `AtualizacaoDaBaseOficial.py` | `read_header` | 42 | Lê apenas o cabeçalho de um arquivo para identificar suas colunas. |
| Python | `AtualizacaoDaBaseOficial.py` | `main` | 56 | Coordena leitura dos microdados, cálculo dos indicadores, gravação das bases e relatório final. |
| Python | `RecalculoDosIndicadores.py` | `year_from_filename` | 52 | Identifica a edição do Vigitel a partir do nome acadêmico do arquivo. |
| Python | `RecalculoDosIndicadores.py` | `indicator_filename` | 61 | Converte o título do indicador em um nome de arquivo legível e estável. |
| Python | `RecalculoDosIndicadores.py` | `numeric` | 109 | Converte uma série para valores numéricos, tratando vírgulas decimais e registros inválidos. |
| Python | `RecalculoDosIndicadores.py` | `binary` | 120 | Cria uma regra binária com numerador e denominador definidos pela variável informada. |
| Python | `RecalculoDosIndicadores.py` | `apply` | 123 | Aplica a regra à base e devolve as máscaras de elegibilidade e de ocorrência do evento. |
| Python | `RecalculoDosIndicadores.py` | `codes` | 133 | Cria uma regra baseada em códigos válidos, códigos do evento e filtros de sexo ou idade. |
| Python | `RecalculoDosIndicadores.py` | `apply` | 140 | Aplica a regra à base e devolve as máscaras de elegibilidade e de ocorrência do evento. |
| Python | `RecalculoDosIndicadores.py` | `ex_smoker` | 154 | Identifica ex fumantes usando a variável derivada ou as perguntas originais disponíveis. |
| Python | `RecalculoDosIndicadores.py` | `weekly_alcohol_population` | 164 | Define a população elegível para o consumo semanal de álcool. |
| Python | `RecalculoDosIndicadores.py` | `binge_by_sex` | 172 | Aplica os limites de consumo abusivo específicos para homens e mulheres. |
| Python | `RecalculoDosIndicadores.py` | `apply` | 175 | Aplica a regra à base e devolve as máscaras de elegibilidade e de ocorrência do evento. |
| Python | `RecalculoDosIndicadores.py` | `max_doses_five` | 183 | Identifica pessoas que relataram cinco ou mais doses no dia de maior consumo. |
| Python | `RecalculoDosIndicadores.py` | `stopped_in_blitz_after_passing` | 190 | Harmoniza CT04 entre 2014–2019. |
| Python | `RecalculoDosIndicadores.py` | `invited_to_breathalyzer_after_stop` | 202 | CT05: convite somente entre quem declarou ter sido parado na blitz. |
| Python | `RecalculoDosIndicadores.py` | `performed_breathalyzer_after_invitation` | 208 | CT06: realização somente entre quem declarou ter sido convidado. |
| Python | `RecalculoDosIndicadores.py` | `positive_breathalyzer_after_test` | 214 | CT07: resultado positivo somente entre quem declarou ter feito o teste. |
| Python | `RecalculoDosIndicadores.py` | `passive_smoke_home` | 220 | TAB07 segundo a série revista 2018–2024. |
| Python | `RecalculoDosIndicadores.py` | `passive_smoke_work` | 231 | TAB08 segundo a série revista 2018–2024. |
| Python | `RecalculoDosIndicadores.py` | `physical_inactivity_harmonized` | 243 | AF08: prioriza a definição revista em toda edição em que ela exista. |
| Python | `RecalculoDosIndicadores.py` | `bmi_rule` | 258 | Classifica o IMC segundo os limites definidos para o indicador. |
| Python | `RecalculoDosIndicadores.py` | `apply` | 261 | Aplica a regra à base e devolve as máscaras de elegibilidade e de ocorrência do evento. |
| Python | `RecalculoDosIndicadores.py` | `activity_frequency` | 278 | Identifica frequência regular de atividade física no tempo livre. |
| Python | `RecalculoDosIndicadores.py` | `activity_duration` | 286 | Identifica sessões de atividade física com duração adequada. |
| Python | `RecalculoDosIndicadores.py` | `good_health` | 299 | Identifica respostas que representam avaliação positiva da saúde. |
| Python | `RecalculoDosIndicadores.py` | `load_existing_metadata` | 441 | Lê os metadados atuais para preservar informações válidas no recálculo. |
| Python | `RecalculoDosIndicadores.py` | `required_columns` | 458 | Retorna as colunas necessárias para calcular uma regra. |
| Python | `RecalculoDosIndicadores.py` | `age_group_index` | 467 | Converte a idade em índice de faixa etária usado na agregação. |
| Python | `RecalculoDosIndicadores.py` | `aggregate_rule` | 478 | Agrega numerador e denominador de uma regra para cada combinação de filtros. |
| Python | `RecalculoDosIndicadores.py` | `main` | 523 | Coordena leitura dos microdados, cálculo dos indicadores, gravação das bases e relatório final. |
| Python | `RecalculoDosIndicadores.py` | `national_series` | 688 | Calcula a série nacional ponderada usada nas conferências. |
| Python | `RecalculoDosIndicadores.py` | `validate` | 704 | Confere a estrutura e a coerência dos ResultadosProcessados antes da gravação. |
| Python | `AuditoriaDaDocumentacao.py` | `nomes_fora_do_padrao` | 18 | Localiza arquivos com algarismos, hífen ou sublinhado no nome físico. |
| Python | `AuditoriaDaDocumentacao.py` | `funcoes_python_sem_documentacao` | 34 | Verifica se cada função Python possui docstring imediatamente associada. |
| Python | `AuditoriaDaDocumentacao.py` | `funcoes_javascript_sem_documentacao` | 45 | Confere comentários explicativos antes de funções JavaScript nomeadas. |
| Python | `AuditoriaDaDocumentacao.py` | `funcoes_r_sem_documentacao` | 69 | Confere blocos Roxygen antes das funções declaradas nos scripts R. |
| Python | `AuditoriaDaDocumentacao.py` | `main` | 87 | Executa todas as verificações e apresenta um resumo adequado à manutenção. |
| Python | `ValidacaoDaBaseCompleta.py` | `parse_data` | 23 | Extrai o objeto de dados do arquivo JavaScript e o converte para Python. |
| Python | `ValidacaoDaBaseCompleta.py` | `parse_methods` | 33 | Extrai o objeto metodológico do arquivo JavaScript e o converte para Python. |
| Python | `ValidacaoDaBaseCompleta.py` | `pct` | 43 | Calcula a diferença percentual usada nas comparações de validação. |
| Python | `ValidacaoDaBaseCompleta.py` | `main` | 51 | Coordena leitura dos microdados, cálculo dos indicadores, gravação das bases e relatório final. |
| Python | `ValidacaoDaPublicacaoNoGitHub.py` | `local_reference` | 20 | Converte uma referência do HTML em caminho local quando ela pertence ao projeto. |
| Python | `ValidacaoDaPublicacaoNoGitHub.py` | `collect_html_references` | 31 | Localiza arquivos indicados pelos atributos src e href da página principal. |
| Python | `ValidacaoDaPublicacaoNoGitHub.py` | `main` | 41 | Executa as verificações e encerra com erro quando a publicação não é segura. |
| R | `Microdados/ColecaoCompletaDoVigitel/ProcessamentoCompletoDosMicrodadosDoVigitel.R` | `ler_csv_flex` | 28 | Responsabilidade documentada junto à rotina. |
| R | `Microdados/ColecaoCompletaDoVigitel/ProcessamentoCompletoDosMicrodadosDoVigitel.R` | `converter_numero` | 48 | Responsabilidade documentada junto à rotina. |
| R | `Microdados/ColecaoCompletaDoVigitel/ProcessamentoCompletoDosMicrodadosDoVigitel.R` | `normalizar_nomes` | 55 | Responsabilidade documentada junto à rotina. |
| R | `Microdados/ColecaoCompletaDoVigitel/ProcessamentoCompletoDosMicrodadosDoVigitel.R` | `ler_vigitel` | 67 | Responsabilidade documentada junto à rotina. |
| R | `Microdados/ColecaoCompletaDoVigitel/ProcessamentoCompletoDosMicrodadosDoVigitel.R` | `criar_raca_cor` | 374 | Responsabilidade documentada junto à rotina. |
| R | `Microdados/ColecaoCompletaDoVigitel/ProcessamentoCompletoDosMicrodadosDoVigitel.R` | `criar_dicionario` | 430 | Responsabilidade documentada junto à rotina. |
| R | `Microdados/ColecaoCompletaDoVigitel/ProcessamentoCompletoDosMicrodadosDoVigitel.R` | `categorizar_sexo` | 699 | Responsabilidade documentada junto à rotina. |
| R | `Microdados/ColecaoCompletaDoVigitel/ProcessamentoCompletoDosMicrodadosDoVigitel.R` | `categorizar_faixa_etaria` | 704 | Responsabilidade documentada junto à rotina. |
| R | `Microdados/ColecaoCompletaDoVigitel/ProcessamentoCompletoDosMicrodadosDoVigitel.R` | `categorizar_escolaridade` | 714 | Responsabilidade documentada junto à rotina. |
| R | `Microdados/ColecaoCompletaDoVigitel/ProcessamentoCompletoDosMicrodadosDoVigitel.R` | `gerar_filtros` | 742 | Responsabilidade documentada junto à rotina. |
| R | `Microdados/ColecaoCompletaDoVigitel/ProcessamentoCompletoDosMicrodadosDoVigitel.R` | `aplicar_filtros` | 754 | Responsabilidade documentada junto à rotina. |
| R | `Microdados/ColecaoCompletaDoVigitel/ProcessamentoCompletoDosMicrodadosDoVigitel.R` | `pegar_var` | 816 | Responsabilidade documentada junto à rotina. |
| R | `Microdados/ColecaoCompletaDoVigitel/ProcessamentoCompletoDosMicrodadosDoVigitel.R` | `calcular_imc` | 822 | Responsabilidade documentada junto à rotina. |
| R | `Microdados/ColecaoCompletaDoVigitel/ProcessamentoCompletoDosMicrodadosDoVigitel.R` | `calcular_evento` | 831 | Responsabilidade documentada junto à rotina. |
| R | `Microdados/ColecaoCompletaDoVigitel/ProcessamentoCompletoDosMicrodadosDoVigitel.R` | `e_eq` | 842 | Responsabilidade documentada junto à rotina. |
| R | `Microdados/ColecaoCompletaDoVigitel/ProcessamentoCompletoDosMicrodadosDoVigitel.R` | `e_in` | 843 | Responsabilidade documentada junto à rotina. |
| R | `Microdados/ColecaoCompletaDoVigitel/ProcessamentoCompletoDosMicrodadosDoVigitel.R` | `e_ge` | 844 | Responsabilidade documentada junto à rotina. |
| R | `Microdados/ColecaoCompletaDoVigitel/ProcessamentoCompletoDosMicrodadosDoVigitel.R` | `e_between` | 845 | Responsabilidade documentada junto à rotina. |
| R | `Microdados/ColecaoCompletaDoVigitel/ProcessamentoCompletoDosMicrodadosDoVigitel.R` | `e_not_na` | 848 | Responsabilidade documentada junto à rotina. |
| R | `Microdados/ColecaoCompletaDoVigitel/ProcessamentoCompletoDosMicrodadosDoVigitel.R` | `e_and` | 849 | Responsabilidade documentada junto à rotina. |
| R | `Microdados/ColecaoCompletaDoVigitel/ProcessamentoCompletoDosMicrodadosDoVigitel.R` | `somente_sexo` | 850 | Responsabilidade documentada junto à rotina. |
| R | `Microdados/ColecaoCompletaDoVigitel/ProcessamentoCompletoDosMicrodadosDoVigitel.R` | `somente_idade` | 853 | Responsabilidade documentada junto à rotina. |
| R | `Microdados/ColecaoCompletaDoVigitel/ProcessamentoCompletoDosMicrodadosDoVigitel.R` | `calcular_prevalencia` | 935 | Responsabilidade documentada junto à rotina. |
| R | `Microdados/ColecaoCompletaDoVigitel/ProcessamentoCompletoDosMicrodadosDoVigitel.R` | `agregar_indicador` | 943 | Responsabilidade documentada junto à rotina. |
| R | `PreparacaoDosDadosDoVigitel.R` | `identificar_ano_arquivo` | 48 | Identifica a edição do Vigitel a partir do nome acadêmico do arquivo. |
| R | `PreparacaoDosDadosDoVigitel.R` | `numero` | 83 | Converte valores para número, tratando vírgula decimal e códigos que não representam medidas válidas. |
| R | `PreparacaoDosDadosDoVigitel.R` | `obter` | 97 | Recupera uma coluna pelo nome sem interromper o processamento quando a variável não existe na edição. |
| R | `PreparacaoDosDadosDoVigitel.R` | `regra_codigos` | 107 | Monta as máscaras de elegibilidade e evento a partir dos códigos válidos da variável. |
| R | `PreparacaoDosDadosDoVigitel.R` | `regra_binaria` | 119 | Aplica a regra padrão a variáveis codificadas em zero e um. |
| R | `PreparacaoDosDadosDoVigitel.R` | `regra_imc` | 128 | Classifica o índice de massa corporal depois de validar peso, altura e limites plausíveis. |
| R | `PreparacaoDosDadosDoVigitel.R` | `calcular_evento` | 144 | Seleciona a definição metodológica do indicador e produz as máscaras usadas no cálculo ponderado. |
| R | `PreparacaoDosDadosDoVigitel.R` | `exige` | 153 | Confere se todas as variáveis necessárias à regra estão disponíveis na edição em processamento. |
| R | `PreparacaoDosDadosDoVigitel.R` | `preparar_base` | 309 | Harmoniza nomes, tipos, pesos, localidade e população antes do cálculo dos indicadores. |
| R | `PreparacaoDosDadosDoVigitel.R` | `prevalencia_ponderada` | 355 | Calcula numerador, denominador, prevalência e medidas auxiliares do indicador selecionado. |
