# Catálogo de funções

Este catálogo reúne as rotinas nomeadas, os métodos e os manipuladores do projeto e resume a responsabilidade registrada junto ao código. Ele pode ser reconstruído com `python GeracaoDoCatalogoDeFuncoes.py` após uma atualização.

Foram catalogadas **509 funções de autoria do projeto**: **438 em JavaScript**, **61 em Python** e **10 em R**.

As bibliotecas `LeitorDeArquivosCsv.js`, `LeitorDePlanilhas.js` e `CompactadorDeArquivos.js` são dependências de terceiros. Suas versões, finalidades e licenças estão registradas em `LicencasDasBibliotecas.md`.

| Linguagem | Arquivo | Função | Linha | Responsabilidade |
|---|---|---|---:|---|
| JavaScript | `assets/js/admin/AdministracaoDoObservatorio.js` | `elemento` | 13 | Retorna o primeiro elemento correspondente ao seletor informado. |
| JavaScript | `assets/js/admin/AdministracaoDoObservatorio.js` | `base64ParaBytes` | 18 | Converte Base64 em bytes para usar a credencial derivada pelo navegador. |
| JavaScript | `assets/js/admin/AdministracaoDoObservatorio.js` | `bytesParaBase64` | 23 | Converte bytes em Base64 sem depender de bibliotecas externas. |
| JavaScript | `assets/js/admin/AdministracaoDoObservatorio.js` | `derivarSenha` | 30 | Deriva a senha digitada com PBKDF2 e os parâmetros registrados na configuração. |
| JavaScript | `assets/js/admin/AdministracaoDoObservatorio.js` | `comparacaoConstante` | 48 | Compara textos de mesmo tamanho sem encerrar no primeiro caractere diferente. |
| JavaScript | `assets/js/admin/AdministracaoDoObservatorio.js` | `sessaoValida` | 58 | Informa se a sessão existe e ainda está dentro do prazo configurado. |
| JavaScript | `assets/js/admin/AdministracaoDoObservatorio.js` | `criarSessao` | 68 | Cria uma sessão somente para a aba atual e com expiração automática. |
| JavaScript | `assets/js/admin/AdministracaoDoObservatorio.js` | `atualizarTelaDaSessao` | 74 | Alterna a tela de login e o painel sem expor conteúdo administrativo antes da sessão. |
| JavaScript | `assets/js/admin/AdministracaoDoObservatorio.js` | `registrar` | 85 | Acrescenta uma mensagem datada ao histórico visível do processamento. |
| JavaScript | `assets/js/admin/AdministracaoDoObservatorio.js` | `escaparHtml` | 95 | Escapa texto de arquivo ou erro antes de incluí-lo no HTML. |
| JavaScript | `assets/js/admin/AdministracaoDoObservatorio.js` | `mensagemDoLogin` | 105 | Exibe uma mensagem curta junto ao formulário de login. |
| JavaScript | `assets/js/admin/AdministracaoDoObservatorio.js` | `autenticar` | 112 | Confere usuário e senha e abre a sessão quando os dois valores coincidem. |
| JavaScript | `assets/js/admin/AdministracaoDoObservatorio.js` | `sair` | 138 | Encerra a sessão e remove da memória os resultados ainda não baixados. |
| JavaScript | `assets/js/admin/AdministracaoDoObservatorio.js` | `alternarSenha` | 146 | Alterna a visibilidade da senha sem alterar o valor digitado. |
| JavaScript | `assets/js/admin/AdministracaoDoObservatorio.js` | `formatarTamanho` | 154 | Formata bytes para facilitar a conferência dos arquivos selecionados. |
| JavaScript | `assets/js/admin/AdministracaoDoObservatorio.js` | `resumirSelecao` | 162 | Atualiza o resumo de nomes e tamanhos exibido sob um campo de arquivo. |
| JavaScript | `assets/js/admin/AdministracaoDoObservatorio.js` | `arquivosDeDadosSelecionados` | 174 | Reúne os arquivos gerais e o recorte opcional de população negra. |
| JavaScript | `assets/js/admin/AdministracaoDoObservatorio.js` | `definirOcupado` | 181 | Bloqueia ou libera os controles durante leituras demoradas. |
| JavaScript | `assets/js/admin/AdministracaoDoObservatorio.js` | `mostrarResumoDoProcessamento` | 191 | Mostra os números principais encontrados nos arquivos aprovados. |
| JavaScript | `assets/js/admin/AdministracaoDoObservatorio.js` | `processarArquivos` | 206 | Lê o dicionário e os dados, interrompendo o fluxo quando alguma integridade falha. |
| JavaScript | `assets/js/admin/AdministracaoDoObservatorio.js` | `gerarPacote` | 261 | Monta os arquivos do painel somente depois de uma validação sem erros. |
| JavaScript | `assets/js/admin/AdministracaoDoObservatorio.js` | `baixarPacote` | 287 | Cria o ZIP final no navegador e inicia o download sem enviar dados para terceiros. |
| JavaScript | `assets/js/admin/AdministracaoDoObservatorio.js` | `iniciar` | 316 | Confere bibliotecas, registra eventos e restaura uma sessão válida ao abrir a página. |
| JavaScript | `assets/js/admin/AtualizacaoDosDadosDoVigitel.js` | `normalizarTexto` | 50 | Remove acentos e sinais para comparar rótulos sem alterar o texto exibido. |
| JavaScript | `assets/js/admin/AtualizacaoDosDadosDoVigitel.js` | `separarCodigos` | 59 | Converte uma lista textual de códigos em números, sem avaliar expressões. |
| JavaScript | `assets/js/admin/AtualizacaoDosDadosDoVigitel.js` | `numero` | 67 | Converte um valor de planilha para número, respeitando o mapa de códigos do dicionário. |
| JavaScript | `assets/js/admin/AtualizacaoDosDadosDoVigitel.js` | `valorDoCampo` | 89 | Localiza um campo mesmo quando a planilha altera apenas maiúsculas, espaços ou acentos. |
| JavaScript | `assets/js/admin/AtualizacaoDosDadosDoVigitel.js` | `estaEm` | 97 | Informa se um valor está em uma relação de códigos válidos. |
| JavaScript | `assets/js/admin/AtualizacaoDosDadosDoVigitel.js` | `regraBinaria` | 102 | Produz uma regra para indicadores binários já derivados nos microdados. |
| JavaScript | `assets/js/admin/AtualizacaoDosDadosDoVigitel.js` | `regraDeCodigos` | 112 | Produz uma regra com códigos válidos, códigos de evento e recortes opcionais. |
| JavaScript | `assets/js/admin/AtualizacaoDosDadosDoVigitel.js` | `regraExFumante` | 126 | Aplica a regra de ex-fumante com o mesmo fallback utilizado no recálculo Python. |
| JavaScript | `assets/js/admin/AtualizacaoDosDadosDoVigitel.js` | `regraConsumoSemanal` | 136 | Calcula consumo semanal de álcool considerando primeiro a resposta de consumo. |
| JavaScript | `assets/js/admin/AtualizacaoDosDadosDoVigitel.js` | `regraConsumoAbusivo` | 144 | Calcula consumo abusivo dentro do sexo indicado pela metodologia. |
| JavaScript | `assets/js/admin/AtualizacaoDosDadosDoVigitel.js` | `regraCincoDoses` | 154 | Identifica cinco ou mais doses no dia de maior consumo. |
| JavaScript | `assets/js/admin/AtualizacaoDosDadosDoVigitel.js` | `regraFumoEmCasa` | 161 | Calcula exposição ao fumo em casa nas edições em que a variável revisada existe. |
| JavaScript | `assets/js/admin/AtualizacaoDosDadosDoVigitel.js` | `regraFumoNoTrabalho` | 168 | Calcula exposição ao fumo no trabalho nas edições em que a variável revisada existe. |
| JavaScript | `assets/js/admin/AtualizacaoDosDadosDoVigitel.js` | `regraInatividade` | 175 | Prioriza a definição revista de inatividade e usa a antiga somente como fallback. |
| JavaScript | `assets/js/admin/AtualizacaoDosDadosDoVigitel.js` | `regraImc` | 187 | Classifica o IMC calculado com peso e altura imputados. |
| JavaScript | `assets/js/admin/AtualizacaoDosDadosDoVigitel.js` | `regraFrequenciaDeAtividade` | 199 | Identifica frequência regular de atividade física no tempo livre. |
| JavaScript | `assets/js/admin/AtualizacaoDosDadosDoVigitel.js` | `regraDuracaoDeAtividade` | 207 | Identifica duração adequada considerando a codificação observada em cada edição. |
| JavaScript | `assets/js/admin/AtualizacaoDosDadosDoVigitel.js` | `regraParadoEmBlitz` | 217 | Mantém o denominador de CT04 restrito a quem passou por blitz. |
| JavaScript | `assets/js/admin/AtualizacaoDosDadosDoVigitel.js` | `regraConviteAoBafometro` | 225 | Mantém o denominador de CT05 restrito a quem foi parado. |
| JavaScript | `assets/js/admin/AtualizacaoDosDadosDoVigitel.js` | `regraRealizacaoDoBafometro` | 233 | Mantém o denominador de CT06 restrito a quem recebeu o convite. |
| JavaScript | `assets/js/admin/AtualizacaoDosDadosDoVigitel.js` | `regraResultadoDoBafometro` | 241 | Mantém o denominador de CT07 restrito a quem realizou o teste. |
| JavaScript | `assets/js/admin/AtualizacaoDosDadosDoVigitel.js` | `detectarCodificacao` | 315 | Detecta a codificação mais provável de um CSV por uma pequena amostra. |
| JavaScript | `assets/js/admin/AtualizacaoDosDadosDoVigitel.js` | `percorrerCsv` | 326 | Percorre um CSV em blocos para evitar manter microdados grandes na memória. |
| JavaScript | `assets/js/admin/AtualizacaoDosDadosDoVigitel.js` | `chunk` | 336 | Processa um bloco do CSV, atualiza o progresso e libera a leitura do bloco seguinte. |
| JavaScript | `assets/js/admin/AtualizacaoDosDadosDoVigitel.js` | `complete` | 349 | Encerra a promessa quando todos os blocos do arquivo foram processados. |
| JavaScript | `assets/js/admin/AtualizacaoDosDadosDoVigitel.js` | `error` | 353 | Interrompe o processamento quando o leitor do CSV informa uma falha. |
| JavaScript | `assets/js/admin/AtualizacaoDosDadosDoVigitel.js` | `lerPlanilhaDeDados` | 361 | Lê a planilha com maior quantidade de registros e conserva os nomes originais das colunas. |
| JavaScript | `assets/js/admin/AtualizacaoDosDadosDoVigitel.js` | `extrairDicionarioDasLinhas` | 373 | Extrai variáveis, códigos e definições explícitas de indicadores das linhas de um dicionário. |
| JavaScript | `assets/js/admin/AtualizacaoDosDadosDoVigitel.js` | `combinarDicionarios` | 425 | Combina as estruturas extraídas das diferentes abas de um mesmo dicionário. |
| JavaScript | `assets/js/admin/AtualizacaoDosDadosDoVigitel.js` | `lerDicionario` | 440 | Lê um dicionário CSV, XLS, XLSX ou XLSM e devolve uma estrutura única de conferência. |
| JavaScript | `assets/js/admin/AtualizacaoDosDadosDoVigitel.js` | `obterUf` | 459 | Converte código ou nome de capital na sigla usada pelo painel. |
| JavaScript | `assets/js/admin/AtualizacaoDosDadosDoVigitel.js` | `obterIndiceDoSexo` | 467 | Converte a variável de sexo para o índice estável Feminino/Masculino. |
| JavaScript | `assets/js/admin/AtualizacaoDosDadosDoVigitel.js` | `obterIndiceDaFaixa` | 479 | Enquadra uma idade adulta na faixa quinquenal utilizada no painel. |
| JavaScript | `assets/js/admin/AtualizacaoDosDadosDoVigitel.js` | `acumular` | 490 | Acrescenta numerador, denominador, amostra, casos e quadrado dos pesos a uma chave. |
| JavaScript | `assets/js/admin/AtualizacaoDosDadosDoVigitel.js` | `acumularResumo` | 501 | Acrescenta uma contagem simples e uma soma de pesos a uma chave de resumo. |
| JavaScript | `assets/js/admin/AtualizacaoDosDadosDoVigitel.js` | `regrasCompativeis` | 509 | Verifica quais regras podem ser calculadas a partir das colunas declaradas no arquivo. |
| JavaScript | `assets/js/admin/AtualizacaoDosDadosDoVigitel.js` | `diagnosticarArquivo` | 518 | Faz a primeira leitura do arquivo para avaliar cobertura, pesos, anos e codificação de q46. |
| JavaScript | `assets/js/admin/AtualizacaoDosDadosDoVigitel.js` | `analisarBloco` | 533 | Analisa um bloco sem guardar as linhas depois da conferência. |
| JavaScript | `assets/js/admin/AtualizacaoDosDadosDoVigitel.js` | `validarDiagnosticos` | 567 | Gera erros e avisos de integridade antes de qualquer cálculo. |
| JavaScript | `assets/js/admin/AtualizacaoDosDadosDoVigitel.js` | `prepararRegras` | 619 | Converte definições explícitas e completas do dicionário em regras genéricas seguras. |
| JavaScript | `assets/js/admin/AtualizacaoDosDadosDoVigitel.js` | `processarLinha` | 648 | Processa uma linha válida e atualiza todas as agregações compatíveis. |
| JavaScript | `assets/js/admin/AtualizacaoDosDadosDoVigitel.js` | `agregarArquivos` | 684 | Lê os arquivos uma segunda vez e calcula somente resultados aprovados no diagnóstico. |
| JavaScript | `assets/js/admin/AtualizacaoDosDadosDoVigitel.js` | `processarBloco` | 726 | Processa um bloco de linhas do arquivo atual. |
| JavaScript | `assets/js/admin/AtualizacaoDosDadosDoVigitel.js` | `arredondar` | 745 | Arredonda valores agregados com a mesma precisão usada pelo gerador Python. |
| JavaScript | `assets/js/admin/AtualizacaoDosDadosDoVigitel.js` | `rotuloDosAnos` | 750 | Resume uma relação de anos sem afirmar a presença de edições inexistentes. |
| JavaScript | `assets/js/admin/AtualizacaoDosDadosDoVigitel.js` | `construirBaseAtualizada` | 762 | Mescla as novas agregações com a base incorporada, substituindo apenas ano e população enviados. |
| JavaScript | `assets/js/admin/AtualizacaoDosDadosDoVigitel.js` | `serializarBase` | 825 | Converte a base atualizada no arquivo JavaScript consumido pelo painel. |
| JavaScript | `assets/js/admin/AtualizacaoDosDadosDoVigitel.js` | `novasLinhasDeIdade` | 843 | Converte as novas linhas de idade detalhada para os índices da edição atualizada. |
| JavaScript | `assets/js/admin/AtualizacaoDosDadosDoVigitel.js` | `serializarCatalogo` | 860 | Serializa o catálogo usado para localizar os arquivos temáticos de idade detalhada. |
| JavaScript | `assets/js/admin/AtualizacaoDosDadosDoVigitel.js` | `serializarAtualizacaoDeIdade` | 892 | Publica somente as linhas novas de idade detalhada e as combinações substituídas. |
| JavaScript | `assets/js/admin/AtualizacaoDosDadosDoVigitel.js` | `serializarMetodologia` | 911 | Atualiza o arquivo metodológico sem inferir regras não declaradas no dicionário. |
| JavaScript | `assets/js/admin/AtualizacaoDosDadosDoVigitel.js` | `serializarResumos` | 931 | Transforma mapas de resumo em CSVs pequenos usados na conferência acadêmica. |
| JavaScript | `assets/js/admin/AtualizacaoDosDadosDoVigitel.js` | `csv` | 949 | Converte uma matriz para CSV com aspas somente quando necessárias. |
| JavaScript | `assets/js/admin/AtualizacaoDosDadosDoVigitel.js` | `serializarDicionario` | 960 | Gera o CSV normalizado do dicionário utilizado na atualização. |
| JavaScript | `assets/js/admin/AtualizacaoDosDadosDoVigitel.js` | `sha256` | 969 | Calcula SHA-256 para registrar exatamente os arquivos gerados. |
| JavaScript | `assets/js/admin/AtualizacaoDosDadosDoVigitel.js` | `gerarArquivos` | 976 | Reúne os arquivos alterados e um relatório legível para futura manutenção. |
| JavaScript | `assets/js/admin/AtualizacaoDosDadosDoVigitel.js` | `processar` | 1028 | Executa diagnóstico, validação e cálculo completo na ordem segura. |
| JavaScript | `assets/js/core/ConfiguracaoRenovadaDoTema.js` | `fecharMenus` | 41 | Fecha os grupos suspensos, preservando apenas o grupo informado. |
| JavaScript | `assets/js/core/ConfiguracaoRenovadaDoTema.js` | `atualizarBotaoDoTema` | 50 | Sincroniza o botão de aparência com o tema efetivamente aplicado. |
| JavaScript | `assets/js/core/ConfiguracaoRenovadaDoTema.js` | `sincronizarTemaNosLinks` | 67 | Mantém a escolha de aparência nos links entre as páginas. O parâmetro é necessário especialmente quando o projeto é aberto como arquivo local. |
| JavaScript | `assets/js/core/ConfiguracaoRenovadaDoTema.js` | `alternarTema` | 89 | Alterna diretamente entre os temas claro e escuro. Na página principal, reutiliza a função completa que também atualiza o gráfico. Nas páginas auxiliares, aplica a mesma preferência localmente. |
| JavaScript | `assets/js/core/ConfiguracaoRenovadaDoTema.js` | `abrirBusca` | 118 | Leva o usuário ao campo de busca do painel. Em páginas auxiliares, abre a página principal com uma indicação para posicionar o foco automaticamente. |
| JavaScript | `assets/js/core/ConfiguracaoRenovadaDoTema.js` | `abrirGlossario` | 135 | Abre o glossário pelo cabeçalho quando o módulo já estiver carregado. |
| JavaScript | `assets/js/core/ConfiguracaoRenovadaDoTema.js` | `iniciarMenuMovelAuxiliar` | 151 | Instala o comportamento do menu móvel nas páginas auxiliares. A página principal já possui esse controle junto às rotinas responsivas do painel. |
| JavaScript | `assets/js/core/ConfiguracaoRenovadaDoTema.js` | `aplicarAtalhoDaUrl` | 173 | Interpreta atalhos recebidos pela URL depois que a página principal está pronta. Isso permite usar busca, tutorial e glossário a partir das demais páginas sem duplicar essas ferramentas. |
| JavaScript | `assets/js/core/ConfiguracaoRenovadaDoTema.js` | `iniciarCabecalho` | 189 | Conecta detalhes, atalhos e fechamento por clique externo ou tecla Escape. |
| JavaScript | `assets/js/core/ConfiguracaoRenovadaDoTema.js` | `permiteHover` | 196 | Identifica equipamentos que possuem mouse ou outro apontador preciso. O resultado impede que a abertura automática dos menus por aproximação interfira nos toques realizados em celulares e tablets. |
| JavaScript | `assets/js/core/GlossarioMetodologico.js` | `indicatorFormula` | 34 | Monta a fórmula textual do indicador com numerador e denominador. |
| JavaScript | `assets/js/core/GlossarioMetodologico.js` | `getGlossaryEntry` | 45 | Retorna o verbete metodológico correspondente ao indicador informado. |
| JavaScript | `assets/js/core/GlossarioMetodologico.js` | `filteredIndicators` | 62 | Seleciona os indicadores que correspondem à busca do glossário. |
| JavaScript | `assets/js/core/GlossarioMetodologico.js` | `renderList` | 71 | Monta a lista de indicadores disponível no glossário. |
| JavaScript | `assets/js/core/GlossarioMetodologico.js` | `renderContent` | 96 | Monta o conteúdo detalhado do verbete selecionado. |
| JavaScript | `assets/js/core/GlossarioMetodologico.js` | `open` | 123 | Abre o glossário e posiciona a busca no campo adequado. |
| JavaScript | `assets/js/core/GlossarioMetodologico.js` | `close` | 136 | Fecha o glossário e devolve o foco ao controle de abertura. |
| JavaScript | `assets/js/core/GlossarioMetodologico.js` | `init` | 145 | Inicializa a busca, a lista e os controles do glossário. |
| JavaScript | `assets/js/core/InicializacaoDoObservatorio.js` | `ativarEfeitoDePassagemDoMouse` | 23 | Reforça no computador o destaque visual e o leve movimento na passagem do mouse. O vínculo é delegado ao documento para continuar funcionando mesmo quando algum bloco da interface for recriado pelo sistema. |
| JavaScript | `assets/js/core/InicializacaoDoObservatorio.js` | `iniciarPulo` | 36 | Ativa a animação visual de destaque no controle apontado. |
| JavaScript | `assets/js/core/InicializacaoDoObservatorio.js` | `encerrarPulo` | 44 | Remove a animação visual quando o controle deixa de estar ativo. |
| JavaScript | `assets/js/core/InicializacaoDoObservatorio.js` | `atualizarProgresso` | 76 | Atualiza a mensagem e a largura da barra de progresso. |
| JavaScript | `assets/js/core/InicializacaoDoObservatorio.js` | `carregarArquivo` | 88 | Inclui um arquivo JavaScript clássico e confirma sua execução antes de liberar a próxima dependência. |
| JavaScript | `assets/js/core/InicializacaoDoObservatorio.js` | `onload` | 95 | Confirma ao coordenador que a dependência terminou de executar. |
| JavaScript | `assets/js/core/InicializacaoDoObservatorio.js` | `onerror` | 97 | Interrompe a sequência para exibir a opção segura de tentar novamente. |
| JavaScript | `assets/js/core/InicializacaoDoObservatorio.js` | `iniciarModulos` | 105 | Ativa o painel depois que base, sistema e complementos estão disponíveis. |
| JavaScript | `assets/js/core/InicializacaoDoObservatorio.js` | `concluirCarregamento` | 117 | Remove a tela de abertura somente depois que todos os eventos estão ativos. |
| JavaScript | `assets/js/core/InicializacaoDoObservatorio.js` | `iniciarCarregamento` | 132 | Coordena base, catálogos, sistema, recursos auxiliares e inicialização. Arquivos independentes são solicitados em paralelo. |
| JavaScript | `assets/js/core/InterfaceCompartilhavelDoObservatorio.js` | `openFilters` | 11 | Abre o painel de filtros em telas pequenas e controla o foco. |
| JavaScript | `assets/js/core/InterfaceCompartilhavelDoObservatorio.js` | `closeFilters` | 23 | Fecha o painel de filtros e devolve o foco ao botão de abertura. |
| JavaScript | `assets/js/core/InterfaceCompartilhavelDoObservatorio.js` | `updateButtonVisibility` | 34 | Mostra o botão de filtros somente quando o layout móvel está ativo. |
| JavaScript | `assets/js/core/InterfaceCompartilhavelDoObservatorio.js` | `init` | 44 | Inicializa os controles específicos para telas pequenas. |
| JavaScript | `assets/js/core/InterfaceCompartilhavelDoObservatorio.js` | `fecharMenuMovel` | 73 | Fecha o menu compacto e sincroniza o estado informado ao leitor de tela. |
| JavaScript | `assets/js/core/InterfaceCompartilhavelDoObservatorio.js` | `iniciarMenuMovel` | 81 | Instala a navegação móvel expansível, evitando itens cortados em telefones. |
| JavaScript | `assets/js/core/InterfaceCompartilhavelDoObservatorio.js` | `mostrarEtapaTutorial` | 111 | Exibe uma etapa do tutorial e atualiza botões, barra e texto final. |
| JavaScript | `assets/js/core/InterfaceCompartilhavelDoObservatorio.js` | `registrarTutorialConcluido` | 127 | Registra que o guia já foi visto para não interromper visitas futuras. |
| JavaScript | `assets/js/core/InterfaceCompartilhavelDoObservatorio.js` | `abrirTutorial` | 134 | Abre o guia rápido no início ou por solicitação do menu. |
| JavaScript | `assets/js/core/InterfaceCompartilhavelDoObservatorio.js` | `fecharTutorial` | 145 | Fecha o guia e preserva a escolha no navegador. |
| JavaScript | `assets/js/core/InterfaceCompartilhavelDoObservatorio.js` | `iniciarTutorial` | 156 | Conecta os controles do guia. Ele é aberto somente quando a pessoa escolhe “Como usar” ou acessa explicitamente o atalho de tutorial pela URL. |
| JavaScript | `assets/js/core/InterfaceCompartilhavelDoObservatorio.js` | `garantirIndicador` | 174 | Garante uma seleção inicial válida sem substituir o indicador escolhido quando ele já pertence ao catálogo ativo. |
| JavaScript | `assets/js/core/InterfaceCompartilhavelDoObservatorio.js` | `selecionarAnoMaisRecente` | 187 | Marca somente o ano mais recente disponível na lista de filtros. |
| JavaScript | `assets/js/core/InterfaceCompartilhavelDoObservatorio.js` | `aplicarAnalisePronta` | 197 | Aplica um exemplo de análise mantendo as rotinas metodológicas do painel. Nenhum valor é criado; apenas filtros e visualização são escolhidos. |
| JavaScript | `assets/js/core/InterfaceCompartilhavelDoObservatorio.js` | `analiseProntaJaUtilizada` | 236 | Confirma se um dos exemplos iniciais já foi utilizado neste navegador. |
| JavaScript | `assets/js/core/InterfaceCompartilhavelDoObservatorio.js` | `concluirAnalisesProntas` | 244 | Registra o primeiro uso e recolhe definitivamente a área de exemplos. |
| JavaScript | `assets/js/core/InterfaceCompartilhavelDoObservatorio.js` | `iniciarAnalisesProntas` | 259 | Instala os três exemplos somente até que um deles seja utilizado. |
| JavaScript | `assets/js/core/InterfaceCompartilhavelDoObservatorio.js` | `init` | 276 | Inicializa todos os complementos depois que o sistema principal está pronto. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `resolveThemeMode` | 32 | Determina se o painel deve usar o modo claro, o modo escuro ou a preferência do sistema. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `resolveAppliedTheme` | 43 | Define o tema efetivamente aplicado depois de interpretar a preferência escolhida. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `currentThemeMode` | 51 | Retorna a preferência de tema atualmente selecionada pelo usuário. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `currentTheme` | 58 | Retorna o tema visual que está ativo na página. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `updateThemeButtons` | 65 | Atualiza o estado visual e os atributos de acessibilidade dos botões de tema. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `applyGraphTheme` | 80 | Aplica ao gráfico as cores e os contrastes correspondentes ao tema visual. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `applyThemeMode` | 91 | Aplica a preferência de tema, salva a escolha e atualiza o gráfico quando necessário. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `initializeTheme` | 118 | Inicializa o tema antes da interação do usuário e conecta os botões de aparência. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `handler` | 130 | Reaplica o tema automático quando a preferência de aparência do sistema operacional é alterada. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `isDataFilterTarget` | 184 | Informa se o evento partiu de um controle que altera os dados da análise. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `isAutomaticAnalysisTarget` | 201 | Identifica campos que alteram dados, recortes ou aparência da análise. A verificação por contêiner também alcança controles incluídos futuramente na lateral de filtros, sem exigir um novo evento para cada campo criado. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `handleAutomaticAnalysisUpdate` | 214 | Encaminha toda alteração relevante para a mesma rotina de atualização. Campos de texto, cores e controles deslizantes usam um pequeno intervalo para evitar várias renderizações durante a digitação ou o arraste. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `bindAutomaticAnalysisUpdates` | 227 | Instala a atualização automática por delegação de eventos. Assim, filtros recriados dinamicamente continuam funcionando sem ligações individuais. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `clearLegendStateForNewData` | 235 | Limpa a busca e as categorias ocultas da legenda quando o conjunto de dados muda. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `invalidateAnalysisData` | 245 | Descarta resultados processados em cache quando uma seleção modifica a análise. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `normalizeFilterState` | 257 | Padroniza o estado dos filtros para que valores ausentes e listas tenham formato consistente. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `queueFilterRefresh` | 351 | Agrupa alterações sucessivas dos filtros e agenda uma única atualização da análise. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `exactAgeSupported` | 413 | Informa se o indicador selecionado possui resultados processados válidos por idade exata. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `exactAgeUnsupportedReason` | 420 | Explica por que a idade exata não está disponível para a combinação selecionada. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `loadExactAgeUpdate` | 427 | Carrega uma única vez o complemento produzido pela área administrativa. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `onload` | 437 | Entrega o complemento administrativo depois que o navegador conclui o carregamento. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `onerror` | 439 | Informa a indisponibilidade do complemento sem ocultar a causa do carregamento. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `mergeExactAgeUpdate` | 448 | Substitui somente os anos importados e remapeia os índices da base anterior. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `loadExactAgeIndicator` | 469 | Carrega sob demanda o arquivo de idade detalhada do indicador selecionado. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `onerror` | 488 | Rejeita o carregamento para impedir que uma série incompleta seja apresentada. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `filterExactAgeRows` | 507 | Aplica os filtros ativos às linhas calculadas por idade exata. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `aggregateExactRows` | 538 | Agrupa as linhas de idade exata e calcula numeradores, denominadores e entrevistas. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `detailToAgeGroup` | 583 | Converte idade detalhada para o grupo etário adulto correspondente. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `detailsFromGroup` | 596 | Retorna as idades detalhadas associadas a cada faixa etária adulta. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `normalizeSexSelections` | 602 | Normaliza as escolhas de sexo, preservando a ordem visual da interface. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `selectedSexesFromUi` | 610 | Lê as caixas de sexo visíveis no painel lateral. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `applySexSelections` | 616 | Aplica uma ou mais escolhas de sexo às caixas permanentes. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `syncSexColorPickers` | 629 | Mantém todos os seletores de cor por sexo sincronizados entre os painéis. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `renderSexChecks` | 640 | Cria as três opções de sexo como cartões simples, com cor automática definida na edição do gráfico. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `compressNumberRanges` | 652 | Compacta números consecutivos em intervalos, útil para anos e outras escalas discretas. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `sexSelectionLabel` | 667 | Resume uma seleção de sexo para títulos, chips e relatórios. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `sexSeriesColor` | 674 | Retorna a cor personalizada de cada série de sexo. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `ageNumberFromLabel` | 680 | Converte o rótulo de idade detalhada para o número utilizado nos controles. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `ageLabelFromNumber` | 686 | Converte um número do seletor para o rótulo existente na base detalhada. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `selectedDetailedAgeNumbers` | 692 | Retorna as idades exatas atualmente selecionadas no estado interno. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `compressAgeNumbers` | 697 | Compacta idades selecionadas em uma expressão legível, inclusive intervalos descontínuos. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `ageSelectionSummary` | 714 | Resume o filtro etário, tratando a faixa completa como ausência de recorte. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `syncAgeRangeControls` | 721 | Atualiza todos os controles de idade visíveis a partir da seleção interna. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `applyDetailedAgeNumbers` | 750 | Aplica um conjunto de idades exatas. A faixa completa equivale a sem recorte. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `ageGroupShortLabel` | 760 | Encurta os rótulos quinquenais somente na interface visual. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `applyAgeGroupSelections` | 767 | Aplica faixas etárias quinquenais ao estado interno e limpa a idade detalhada quando necessário. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `applyAgeRangeBounds` | 777 | Aplica um intervalo contínuo, corrigindo automaticamente limites invertidos. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `parseAgeIntervalExpression` | 788 | Interpreta entradas como "18-24, 30-35, 50" e devolve as idades escolhidas. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `bindAgeRangeUi` | 812 | Liga um seletor de idade, permanente ou criado no popover rápido, ao estado interno. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `applyBounds` | 823 | Normaliza e aplica os limites escolhidos no seletor de idade. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `applyDefaultResultAnalysis` | 889 | Prepara uma análise nacional de atividade física para que a página inicial já apresente o novo painel de resultados. A pessoa pode trocar qualquer escolha pelos controles do topo, sem perder os demais recursos do sistema. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `migrateLegacyDarkGraphAppearance` | 913 | Converte somente as antigas cores automáticas do gráfico escuro para a superfície branca atual. Cores personalizadas continuam preservadas. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `init` | 937 | Inicializa o painel. Um link compartilhado ou uma análise completa salva pode ser restaurado; no primeiro acesso, todas as escolhas permanecem vazias. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `ensureClearAnalysisButton` | 969 | Garante a presença do botão mesmo quando o navegador reutiliza uma versão antiga da estrutura HTML. O evento é ligado depois pela rotina principal. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `buildHeaderStatus` | 1007 | Mostra um resumo da base carregada, indicando quantidade de linhas, indicadores e período. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `normalizeText` | 1020 | Padroniza textos para buscas e comparações, removendo diferenças de acentuação e caixa. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `categoryToken` | 1027 | Cria um identificador estável para comparar categorias da legenda. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `matchesLegendSearch` | 1034 | Verifica se a categoria corresponde ao texto digitado na busca da legenda. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `isHiddenCategory` | 1043 | Informa se a categoria foi ocultada manualmente pelo usuário. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `toggleHiddenCategory` | 1050 | Alterna a visibilidade de uma categoria sem modificar os dados originais. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `revealAllCategories` | 1062 | Torna novamente visíveis todas as categorias ocultadas na legenda. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `controlIds` | 1074 | Lista os identificadores dos controles cuja configuração pode ser salva e restaurada. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `getControlSnapshot` | 1081 | Lê os valores atuais dos controles visuais e devolve uma cópia da configuração. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `applyControlSnapshot` | 1094 | Restaura os valores dos controles visuais a partir de uma configuração salva. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `getFilterSnapshot` | 1104 | Lê o estado atual dos filtros e devolve uma cópia independente. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `applyFilterSnapshot` | 1123 | Restaura os filtros a partir de uma configuração salva. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `captureAnalysisState` | 1146 | Reúne tema, indicador, gráfico, filtros e aparência em um único estado da análise. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `stateSignature` | 1170 | Monta uma assinatura estável do estado para detectar alterações repetidas. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `saveAnalysisState` | 1177 | Salva a configuração atual da análise no armazenamento do navegador. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `applyAnalysisState` | 1189 | Aplica uma configuração completa e sincroniza seleções, filtros e aparência. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `restoreAnalysisState` | 1232 | Recupera a última análise salva e a aplica ao painel. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `recordHistory` | 1260 | Registra o estado atual nas pilhas de desfazer e refazer. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `updateHistoryButtons` | 1275 | Habilita ou desabilita os botões de histórico conforme as ações disponíveis. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `undoAnalysis` | 1285 | Restaura o estado anterior da análise. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `redoAnalysis` | 1299 | Reaplica o estado que foi desfeito mais recentemente. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `getVersionHistory` | 1312 | Retorna as versões da análise salvas no navegador. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `setVersionHistory` | 1323 | Grava a lista de versões da análise no navegador. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `versionSummary` | 1330 | Produz um resumo curto da configuração guardada em uma versão. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `addVersionRecord` | 1348 | Acrescenta uma nova entrada ao histórico de versões. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `scheduleVersionRecord` | 1373 | Agenda o registro de uma versão depois que as alterações atuais terminarem. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `renderVersionHistory` | 1381 | Monta a lista de versões salvas e seus controles de restauração e exclusão. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `restoreVersionRecord` | 1399 | Restaura a configuração guardada em uma versão específica. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `deleteVersionRecord` | 1413 | Remove uma versão salva do histórico. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `clearVersionHistory` | 1421 | Apaga o histórico de versões após a confirmação do usuário. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `getFavorites` | 1431 | Retorna as análises favoritas salvas no navegador. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `setFavorites` | 1442 | Grava a lista de análises favoritas no navegador. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `saveCurrentFavorite` | 1449 | Salva a análise atual como favorita com o nome informado. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `loadFavorite` | 1463 | Carrega uma análise favorita e atualiza o painel. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `deleteFavorite` | 1476 | Remove uma análise da lista de favoritas. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `renderFavorites` | 1484 | Monta a lista de análises favoritas e seus botões de ação. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `encodeSharedState` | 1498 | Codifica o estado da análise para incluí-lo no endereço compartilhável. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `decodeSharedState` | 1506 | Decodifica o estado recebido por endereço e reconstrói a configuração da análise. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `buildSharedAnalysisUrl` | 1516 | Monta um endereço legível com tema, indicador, gráfico e todos os filtros necessários para reproduzir a análise em outro navegador. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `sharedStateFromQuery` | 1545 | Reconstrói o estado essencial da análise a partir dos parâmetros legíveis presentes no endereço compartilhado. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `registerShareIntent` | 1595 | Registra a intenção no início da interação. Isso impede que uma mudança de layout termine o clique sobre o botão de compartilhamento por acidente. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `consumeShareIntent` | 1603 | Confirma e consome uma interação iniciada no mesmo botão. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `bindExplicitShareButton` | 1612 | Liga o compartilhamento sem aceitar ativações sintéticas ou acidentais. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `shareConfiguration` | 1626 | Compartilha a configuração completa da análise somente após uma ação real do usuário. A validação protege a área de transferência contra cópias causadas por atualizações de tela e mantém no endereço os filtros necessários para reconstruir o resultado em outro navegador. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `applySharedConfigurationFromUrl` | 1676 | Lê a análise presente no endereço e mantém compatibilidade com os links codificados produzidos pelas versões anteriores. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `announceSave` | 1699 | Exibe mensagens de salvamento e atualização para o usuário e para tecnologias assistivas. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `safeRun` | 1728 | Executa uma rotina protegida e registra a falha sem interromper toda a interface. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `upgradeAccessibility` | 1740 | Complementa rótulos, estados e navegação por teclado dos controles existentes. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `renderCompareIndicators` | 1750 | Monta a comparação entre indicadores usando o mesmo conjunto de filtros. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `updateChartExplanation` | 1770 | Atualiza o texto que explica a leitura do gráfico atual. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `estimatePrecision` | 1784 | Calcula erro padrão, intervalo de confiança e coeficiente de variação da estimativa. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `sampleReliability` | 1808 | Classifica a estabilidade da estimativa com base na amostra e no coeficiente de variação. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `updateLoading` | 1815 | Mostra ou oculta o estado de carregamento durante cálculos e renderizações. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `scheduleMobileResultScroll` | 1829 | Registra que a seleção do usuário acabou de completar as quatro etapas da análise. Alterações posteriores de filtros não provocam novos saltos na tela. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `scrollGeneratedResultOnMobile` | 1837 | Conduz o usuário móvel até o resultado depois que o gráfico termina de ser gerado, respeitando a preferência do sistema por menos movimento. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `scheduleGenerate` | 1858 | Agenda a geração do gráfico para evitar execuções repetidas durante alterações rápidas. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `analysisRequestSignature` | 1882 | Monta a assinatura da solicitação atual para reconhecer cálculos equivalentes. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `ensureAnalysisCurrent` | 1895 | Garante que o resultado disponível corresponda às seleções e aos filtros atuais. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `analysisCacheKey` | 1907 | Monta a chave usada para armazenar e recuperar resultados processados calculados. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `getAnalysisResult` | 1914 | Retorna o resultado da análise atual, reutilizando o cache quando possível. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `getFilteredTableRows` | 1936 | Aplica busca, ordenação e paginação às linhas exibidas na tabela. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `valueOf` | 1946 | Retorna o valor numérico da linha, usando zero quando o campo não é válido. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `sampleOf` | 1950 | Seleciona uma amostra das linhas para conferências e relatórios. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `categoryOf` | 1954 | Retorna a categoria associada à linha recebida. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `indicatorOf` | 1958 | Retorna o indicador associado à linha recebida. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `buildFilterDescription` | 1974 | Monta uma descrição textual dos filtros aplicados à análise. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `formatReportDate` | 1992 | Formata a data e a hora usadas no relatório exportado. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `reportMethodology` | 2004 | Monta o texto metodológico incluído no relatório da análise. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `reportTableContext` | 2028 | Resume a tabela, a amostra e a precisão para inclusão no relatório. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `generatePdfReport` | 2039 | Monta e baixa o relatório em PDF com gráfico, filtros, metodologia e tabela. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `hexToRgb` | 2068 | Converte uma cor hexadecimal em componentes vermelho, verde e azul. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `relativeLuminance` | 2077 | Calcula a luminância relativa de uma cor para a avaliação de contraste. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `contrastRatio` | 2087 | Calcula a razão de contraste entre duas cores. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `runAutomatedTests` | 2095 | Executa os testes internos do painel e apresenta um resumo dos resultados processados. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `test` | 2100 | Executa uma verificação isolada e registra se o comportamento observado corresponde ao esperado. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `iconSVG` | 2153 | Retorna o SVG usado como ícone visual nos blocos, filtros e cartões do construtor. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `getThemeIcon` | 2183 | Escolhe o desenho principal de cada tema de acordo com o assunto analisado. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `getIndicatorIcon` | 2201 | Define o ícone do indicador a partir do tema ao qual ele pertence. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `getChartIcon` | 2208 | Seleciona o ícone correspondente ao tipo de gráfico escolhido pelo usuário. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `makeBlock` | 2216 | Cria cada bloco visual clicável ou arrastável usado na lateral e no fluxo de construção. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `renderThemes` | 2237 | Mostra todo o catálogo de temas em um acordeão principal e mantém os indicadores organizados dentro do respectivo tema. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `renderIndicators` | 2363 | Mantém compatibilidade com a busca; os indicadores agora aparecem dentro dos temas. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `openFilterSection` | 2371 | Leva o usuário ao grupo de filtros escolhido e abre o painel móvel quando necessário, sem modificar os valores já selecionados. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `renderFilterBlock` | 2392 | Mostra os quatro grupos de filtros no mesmo acordeão usado pelos temas e pelos tipos de gráfico, preservando o arraste do bloco completo. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `renderChartBlocks` | 2470 | Renderiza os tipos de gráfico em um acordeão compacto, seguindo o mesmo padrão visual de temas e indicadores. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `renderCurrentChartSelection` | 2528 | Atualiza a indicação visual do tipo de gráfico selecionado. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `setComparisonLayoutActive` | 2553 | Mantém o contêiner externo sincronizado com o modo de comparação. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `selectBlock` | 2562 | Atualiza a análise ao escolher tema, indicador, bloco de filtros ou tipo de gráfico. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `renderSlots` | 2632 | Atualiza os quatro cartões centrais do construtor com o estado atual da análise. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `setSlot` | 2645 | Monta um cartão central com número, desenho, instrução e seleção atual. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `nextIncompleteAnalysisStep` | 2688 | Retorna a primeira escolha que ainda falta para concluir a análise. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `openAnalysisStep` | 2700 | Abre na lateral exatamente o catálogo relacionado ao cartão tocado. O arraste continua disponível, mas clicar passa a ser o caminho principal. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `renderFilters` | 2731 | Preenche os filtros da coluna direita com anos, sexo, localização, idade e população. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `renderVisibleAgeGroups` | 2748 | Renderiza a versão visível das faixas quinquenais no painel lateral. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `fillChecks` | 2785 | Cria listas de caixas de seleção para filtros com múltiplas opções. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `fillSelect` | 2798 | Preenche campos de seleção simples, como sexo, UF, região e tipo de população. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `hasRequiredBlocks` | 2808 | Verifica se há blocos suficientes para gerar gráfico automaticamente. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `renderAnalysisDropPlaceholder` | 2816 | Exibe uma ilustração no lugar do gráfico enquanto faltam escolhas. Além de orientar a montagem, toda a área continua sendo um destino de arraste. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `updateAnalysisStageVisibility` | 2876 | Alterna a prévia e os resultados e mantém a ação principal ligada à etapa que ainda falta. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `resultPeriodLabel` | 2912 | Resume os anos escolhidos em um texto curto para a barra e para a lateral. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `resultLocationLabel` | 2928 | Retorna o recorte geográfico mais específico sem repetir seleções neutras. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `resultDemographicLabel` | 2938 | Resume sexo, idades e população no chip demográfico sem esconder os recortes que realmente estão ativos. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `resultToolbarBlocks` | 2952 | Retorna somente os seis blocos reorganizáveis da barra de resultados. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `saveResultToolbarOrder` | 2960 | Guarda a ordem escolhida sem misturá-la ao estado dos filtros ou do gráfico. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `restoreResultToolbarOrder` | 2973 | Reaplica a disposição salva. Blocos adicionados em versões futuras entram depois dos já conhecidos e antes do botão Editar filtros. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `restoreDefaultResultToolbarOrder` | 2996 | Recoloca os blocos na ordem original quando toda a análise é apagada. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `moveResultToolbarBlock` | 3011 | Move um bloco antes ou depois de outro e informa se a ordem realmente mudou. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `clearResultToolbarDragState` | 3023 | Limpa os realces temporários usados durante o arraste. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `updateResultLayout` | 3036 | Atualiza os textos da nova composição a partir do mesmo estado usado pelos gráficos. Assim, nenhum resumo pode ficar diferente da consulta executada. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `setResultView` | 3082 | Alterna entre gráfico, tabela e mapa preservando a análise atual. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `openResultFilterPanel` | 3104 | Abre a gaveta completa somente quando a pessoa pede para editar todos os filtros. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `closeResultChoice` | 3127 | Fecha qualquer lista compacta da barra sem alterar a análise. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `resultChoiceTargetKey` | 3152 | Relaciona cada tipo de opção ao bloco que pode recebê-la. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `clearResultChoiceDragState` | 3159 | Remove os realces usados ao arrastar uma opção de dentro da lista. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `applyDropToChart` | 3173 | Abre a edição do bloco arrastado para o gráfico ou aplica diretamente uma opção retirada das listas e dos catálogos. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `bindChartBlockDropZone` | 3217 | Torna a própria área do gráfico um destino para os blocos da análise. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `clear` | 3227 | Retira o destaque da área do gráfico e reinicia a contagem usada durante a passagem de elementos filhos. Esse cuidado evita que a indicação de destino permaneça visível depois que o bloco é solto ou sai da área. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `applyResultChoiceSelection` | 3263 | Aplica uma opção clicada ou solta sobre o bloco correspondente. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `positionResultPopover` | 3283 | Posiciona a caixa acima de todas as áreas do resultado e a mantém ligada visualmente ao botão acionado. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `quickFilterSelectOptions` | 3332 | Monta as opções de um campo de seleção rápida preservando os nomes oficiais. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `renderResultQuickFilter` | 3340 | Mostra somente o filtro relacionado ao chip acionado. Os filtros mais detalhados continuam disponíveis no botão Editar filtros. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `applyYears` | 3381 | Aplica ao estado do painel a lista de anos selecionada no filtro rápido. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `rangeValues` | 3389 | Retorna os anos disponíveis compreendidos entre os dois limites informados. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `parseYearExpression` | 3396 | Interpreta anos e intervalos digitados manualmente pelo usuário. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `applyRange` | 3421 | Converte os limites do controle em anos e aplica o período resultante. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `openResultQuickFilter` | 3609 | Abre Período, Demográficos ou Local em uma caixa compacta sobre os resultados. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `renderResultChoiceOptions` | 3654 | Desenha as opções correspondentes ao campo aberto e aplica a busca digitada. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `openResultChoice` | 3719 | Abre uma lista sobre a própria barra de resultados, mantendo gráfico, resumo e demais seleções visíveis ao fundo. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `clearEntireAnalysis` | 3766 | Apaga todo o estado temporário da análise e retorna ao construtor vazio. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `resetResultAnalysis` | 3833 | Atende ao botão apresentado na linha das visualizações e encaminha a limpeza para a rotina central. Manter esse ponto de entrada separado ajuda a preservar o mesmo comportamento quando o botão mudar de posição. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `bindResultLayoutEvents` | 3838 | Liga a barra, as listas compactas, as abas e os botões laterais às rotinas existentes. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `refreshAnalysis` | 3969 | Atualiza resumos, blocos e gráfico quando qualquer filtro ou seleção muda. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `setControlValue` | 3982 | Altera campos do painel sem disparar eventos duplicados. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `clearPeriodFilters` | 3992 | Limpa a seleção de período de forma explícita, deixando zero anos selecionados. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `clearDemographicFilters` | 4001 | Limpa apenas os filtros demográficos. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `clearGeographicFilters` | 4013 | Limpa apenas os filtros geográficos. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `clearOtherFilters` | 4021 | Limpa recorte e edição visual do gráfico. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `clearAppearanceOnly` | 4080 | Restaura apenas as opções visuais, preservando indicador e filtros. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `applyAppearancePreset` | 4093 | Aplica uma configuração visual predefinida aos controles do gráfico. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `clearFilterSection` | 4111 | Decide qual grupo será limpo ao clicar na lixeira. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `bindEvents` | 4128 | Conecta botões, filtros, lixeiras e controles avançados às ações da interface. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `activate` | 4243 | Abre o seletor relacionado ao cartão central acionado. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `renderAll` | 4268 | Atualiza todos os blocos visuais e os cartões do construtor de uma vez. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `updateSummaries` | 4273 | Atualiza os resumos dos filtros e dos controles visuais do painel. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `selectedChecks` | 4306 | Retorna os valores marcados em uma lista de checkboxes. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `activeFilterCount` | 4311 | Conta apenas filtros que realmente restringem a análise, evitando marcar o cartão de filtros sem necessidade. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `availableYearsForIndicator` | 4330 | Retorna os anos que possuem dados para o indicador e a população selecionados. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `enforcePopulationYearUI` | 4349 | Limita os anos aos realmente disponíveis para o indicador e para a população selecionada. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `getFilters` | 4369 | Lê o estado dos filtros e aplica a regra da População Negra restrita a 2018. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `rowValue` | 4393 | Extrai a categoria da linha conforme o recorte escolhido. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `filterRows` | 4406 | Filtra a base conforme indicador, ano, sexo, população, UF, região e idade. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `validateFilteredRows` | 4432 | Confere se as linhas filtradas possuem valores e denominadores utilizáveis. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `effectiveGroup` | 4453 | Mantém o recorte escolhido pelo usuário, inclusive idade detalhada. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `chooseGroup` | 4459 | Escolhe o recorte do gráfico sem trocar idade detalhada por faixa etária. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `aggregate` | 4492 | Agrupa os dados; em idade detalhada, distribui a faixa etária disponível pelas idades correspondentes. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `aggregateSeriesTotal` | 4543 | Soma um conjunto de linhas em um único valor percentual. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `aggregateSexSeries` | 4564 | Cria séries independentes para Todos, Feminino e Masculino sem duplicar a base filtrada. Em gráficos agrupados por sexo, cada escolha vira uma série sobre uma categoria única. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `rowsForSex` | 4570 | Filtra somente as linhas correspondentes ao sexo solicitado. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `sortKey` | 4593 | Define a ordem das categorias no eixo ou na legenda do gráfico. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `yearsFromRows` | 4606 | Extrai e ordena os anos presentes no conjunto de linhas recebido. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `buildTitleForIndicator` | 4616 | Monta o título do gráfico a partir do indicador e dos principais filtros. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `dataToTableRows` | 4627 | Converte os dados agregados em linhas prontas para a tabela e para exportações. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `activeFilterDescriptions` | 4652 | Produz uma lista legível dos filtros que restringem a análise. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `diagnoseEmptyFilters` | 4668 | Identifica quais filtros eliminaram todos os registros e sugere ajustes. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `addTest` | 4680 | Registra um caso de teste e o resultado observado. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `emptyStateHtml` | 4723 | Monta a mensagem exibida quando não há dados para a combinação selecionada. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `generate` | 4735 | Gera a análise completa, comparação opcional, avisos e tabela paginada. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `displayCategory` | 4898 | Converte códigos ou categorias internas em nomes mais claros para exibição. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `toSentenceCase` | 4909 | Padroniza títulos com primeira letra maiúscula e restante natural. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `buildTitle` | 4916 | Cria o título do gráfico no padrão escolhido para o relatório. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `buildSubtitle` | 4957 | Mostra unidade e fonte de forma discreta abaixo do título. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `periodLabel` | 4970 | Resume o período selecionado; para População Negra, fixa 2018. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `chartOptions` | 4995 | Lê o painel avançado e devolve todas as opções visuais aplicadas ao gráfico. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `comparisonChartOptions` | 5058 | Amplia os textos na comparação lado a lado para compensar a redução proporcional do SVG em cada metade da tela. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `enlarged` | 5061 | Calcula um tamanho ampliado, respeitando o mínimo legível definido. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `drawChart` | 5079 | Escolhe a visualização e aplica a preparação dos dados sem esconder idades selecionadas em pizza e rosca. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `estimateMaxChars` | 5252 | Estima quantos caracteres cabem por linha considerando a largura útil e o tamanho da fonte. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `wrapTextLines` | 5270 | Divide um texto em linhas simples usando limite aproximado de caracteres por linha. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `fitTextLines` | 5290 | Ajusta fonte e quebra de linha para o texto caber dentro do SVG sem ultrapassar a imagem. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `svgMultilineText` | 5309 | Converte um texto em um bloco SVG com várias linhas. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `alignX` | 5317 | Calcula a posição horizontal de textos alinhados à esquerda, centro ou direita. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `alignAnchor` | 5326 | Define o text-anchor do SVG com base no alinhamento escolhido. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `nextSvgId` | 5336 | Gera um identificador único para elementos internos do SVG. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `svgWrap` | 5344 | Monta o documento SVG final, incluindo título, subtítulo, fonte e margens de exportação. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `mapHexToRgb` | 5408 | Converte uma cor hexadecimal em componentes numéricos usados pela escala do mapa. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `mixMapColor` | 5417 | Combina duas cores para produzir os tons intermediários do mapa coroplético. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `value` | 5421 | Interpola e converte um canal RGB isolado para a escrita hexadecimal. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `mapLabelColor` | 5428 | Escolhe texto claro ou escuro para manter as siglas legíveis sobre cada tom do mapa. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `initializeMapInteraction` | 5439 | Torna o mapa explorável por mouse, toque e teclado. O cartão abaixo do SVG mantém o último estado escolhido visível, o que resolve a limitação dos tooltips nativos em celulares. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `selectState` | 5456 | Atualiza o destaque visual e descreve posição, região e prevalência. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `seriesMapSvg` | 5493 | Desenha pequenos múltiplos do mapa quando mais de um sexo é selecionado. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `mapSvg` | 5564 | Desenha um mapa coroplético vetorial do Brasil e atualiza cada estado conforme os valores por UF. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `grid` | 5653 | Desenha a grade horizontal padrão e os valores do eixo vertical. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `seriesChartStructure` | 5667 | Retorna as séries e categorias presentes nos dados multissérie. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `sexSeriesLegendSvg` | 5677 | Desenha uma legenda compacta para Todos, Feminino e Masculino. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `seriesLineSvg` | 5690 | Desenha linhas ou áreas independentes para cada sexo marcado. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `seriesBarSvg` | 5732 | Desenha barras verticais agrupadas por categoria e sexo. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `seriesHbarSvg` | 5765 | Desenha barras horizontais agrupadas por categoria e sexo. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `avg` | 5771 | Calcula a média das séries para ordenar as categorias do ranking. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `seriesLollipopSvg` | 5802 | Desenha pirulitos horizontais agrupados por categoria e sexo. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `seriesRadarSvg` | 5834 | Desenha várias séries sobre os mesmos eixos do radar. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `barSvg` | 5857 | Desenha barras verticais com largura, rótulos, valores e rotação configuráveis. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `lineSvg` | 5901 | Desenha linha ou área com espessura, pontos e rótulos configuráveis. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `hbarSvg` | 5944 | Desenha barras horizontais com escala, valores e categorias configuráveis. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `lollipopSvg` | 5983 | Desenha gráfico de pirulito com linhas, pontos e valores configuráveis. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `paretoSvg` | 6019 | Desenha Pareto com barras ordenadas e linha acumulada sem cortes. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `legendViewportProfile` | 6093 | Define limites de legenda adequados ao tamanho da área de visualização. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `adaptiveLegendLayout` | 6108 | Calcula a disposição da legenda conforme o espaço disponível e a quantidade de itens. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `getExportPreset` | 6142 | Retorna a configuração do formato de exportação selecionado. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `exportBackgroundIsTransparent` | 6149 | Informa se o arquivo exportado deve preservar o fundo transparente. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `exportPresetSettings` | 6156 | Retorna dimensões e margens da predefinição de exportação. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `exportChartOptions` | 6173 | Monta as opções visuais específicas da exportação sem alterar o gráfico da tela. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `renderExportChartSvg` | 6189 | Gera o SVG do gráfico usando as dimensões e opções de exportação. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `wrapExportDocument` | 6199 | Insere o gráfico em um documento SVG completo com título, fonte e margens. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `pieSvg` | 6237 | Desenha pizza ou rosca com legenda interativa, busca e distribuição melhorada. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `radarSvg` | 6315 | Desenha radar centralizado, com legenda interativa e adaptação para muitos rótulos. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `treemapSvg` | 6375 | Desenha blocos proporcionais e evita textos em espaços pequenos. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `kpiSvg` | 6430 | Desenha cartões KPI padronizados e com textos contidos, sem limitar a quantidade de categorias. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `gaugeSvg` | 6453 | Desenha medidor(es) sem limitar a quantidade de categorias. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `axis` | 6485 | Desenha os títulos dos eixos, respeitando campos personalizados e opção de mostrar/ocultar. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `palette` | 6497 | Define a sequência de cores conforme a paleta escolhida no painel. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `datumColor` | 6511 | Usa a cor escolhida para o sexo quando o dado pertence a uma série demográfica. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `fmt` | 6517 | Formata números para o padrão brasileiro usando a quantidade de casas decimais escolhida. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `short` | 6524 | Encurta textos muito longos para não poluir o gráfico. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `esc` | 6528 | Escapa caracteres especiais para evitar problemas no HTML e no SVG. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `arc` | 6532 | Calcula o caminho de arco usado em gráficos de pizza e rosca. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `arcStroke` | 6536 | Calcula o caminho de arco usado no gráfico de medidor. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `polar` | 6540 | Converte ângulos e raio em coordenadas para desenhos circulares. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `currentBaseRowsForExport` | 6544 | Monta a base filtrada para exportação em CSV ou Excel. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `renderTable` | 6556 | Renderiza a tabela abaixo do gráfico com os resultados processados calculados. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `toCsv` | 6581 | Transforma a tabela de objetos em texto CSV. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `downloadCsv` | 6589 | Baixa a análise em formato CSV. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `downloadExcel` | 6593 | Baixa a análise em formato compatível com Excel. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `download` | 6597 | Cria o arquivo temporário no navegador e dispara o download. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `sanitizeFileName` | 6601 | Remove caracteres inadequados e produz um nome seguro para o arquivo exportado. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `svgDimensions` | 6608 | Lê as dimensões do SVG e calcula a área útil do desenho. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `prefixSvgIds` | 6619 | Acrescenta um prefixo aos identificadores do SVG para evitar conflitos. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `prepareSvgClone` | 6651 | Cria uma cópia do SVG e ajusta atributos antes da exportação. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `comparisonExportName` | 6664 | Monta o nome do arquivo usado na exportação de comparações. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `buildExportSvgDocument` | 6676 | Monta o documento SVG final com todos os elementos da exportação. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `serializeChartSvg` | 6711 | Converte o SVG atual em texto pronto para gravação. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `downloadVectorSvg` | 6719 | Baixa o gráfico em SVG vetorial usando a configuração selecionada. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `downloadSvg` | 6730 | Converte o SVG atual em uma imagem PNG de alta resolução e inicia o download. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `onload` | 6737 | Desenha o SVG carregado em uma tela de alta resolução e inicia o download em PNG. |
| JavaScript | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | `onerror` | 6762 | Libera o endereço temporário e orienta o uso do SVG quando a conversão falha. |
| JavaScript | `assets/js/dados/BaseAnaliticaDoVigitel.js` | `$` | 9 | Localiza o primeiro elemento correspondente ao seletor informado. |
| JavaScript | `assets/js/dados/BaseAnaliticaDoVigitel.js` | `$$` | 11 | Reúne todos os elementos correspondentes ao seletor em uma lista comum. |
| JavaScript | `testes/TesteDosIndicadoresEGraficos.js` | `setAttribute` | 25 | Registra atributos aplicados ao SVG simulado durante a renderização. |
| JavaScript | `testes/TesteDosIndicadoresEGraficos.js` | `querySelector` | 27 | Representa consultas internas do SVG que não precisam retornar elementos neste teste. |
| JavaScript | `testes/TesteDosIndicadoresEGraficos.js` | `field` | 40 | Lê um campo da interface sem interromper o fluxo quando o elemento não existe. |
| JavaScript | `testes/TesteDosIndicadoresEGraficos.js` | `effectiveGroup` | 47 | Mantém o agrupamento recebido porque o teste não aplica transformação de categorias. |
| JavaScript | `testes/TesteDosIndicadoresEGraficos.js` | `categoryToken` | 49 | Converte a categoria em texto estável para a simulação da legenda. |
| JavaScript | `testes/TesteDosIndicadoresEGraficos.js` | `isHiddenCategory` | 51 | Mantém todas as categorias visíveis durante a conferência dos gráficos. |
| JavaScript | `testes/TesteDosIndicadoresEGraficos.js` | `matchesLegendSearch` | 53 | Considera todas as categorias compatíveis com a busca simulada. |
| JavaScript | `testes/TesteDosIndicadoresEGraficos.js` | `$` | 55 | Devolve o SVG simulado ou um campo de configuração conforme o seletor consultado. |
| JavaScript | `testes/TesteDosIndicadoresEGraficos.js` | `$$` | 57 | Representa consultas múltiplas que não precisam de elementos neste teste. |
| JavaScript | `testes/TesteDosIndicadoresEGraficos.js` | `nationalSeries` | 67 | Agrega a série nacional de um indicador para conferir sua renderização em cada tipo de gráfico. |
| JavaScript | `testes/TesteDosIndicadoresEGraficos.js` | `stateSeries` | 86 | Agrega valores por UF para validar o mapa com as mesmas linhas reais usadas pelo painel. |
| Python | `scripts/python/AtualizacaoDaBaseOficial.py` | `normalize_name` | 28 | Padroniza nomes de colunas e arquivos para comparação. |
| Python | `scripts/python/AtualizacaoDaBaseOficial.py` | `read_header` | 42 | Lê apenas o cabeçalho de um arquivo para identificar suas colunas. |
| Python | `scripts/python/AtualizacaoDaBaseOficial.py` | `main` | 56 | Coordena leitura dos microdados, cálculo dos indicadores, gravação das bases e relatório final. |
| Python | `scripts/python/AuditoriaDaDocumentacao.py` | `nomes_fora_do_padrao` | 24 | Localiza arquivos com algarismos, hífen ou sublinhado no nome físico. |
| Python | `scripts/python/AuditoriaDaDocumentacao.py` | `funcoes_python_sem_documentacao` | 42 | Verifica se cada função Python possui uma docstring com explicação útil. |
| Python | `scripts/python/AuditoriaDaDocumentacao.py` | `funcoes_javascript_sem_documentacao` | 56 | Confere a explicação de funções, métodos e manipuladores JavaScript. |
| Python | `scripts/python/AuditoriaDaDocumentacao.py` | `funcoes_r_sem_documentacao` | 108 | Confere se cada função R possui um bloco Roxygen com explicação útil. |
| Python | `scripts/python/AuditoriaDaDocumentacao.py` | `arquivos_de_codigo_sem_apresentacao` | 131 | Verifica se cada arquivo mantido pelo projeto explica sua finalidade no início. |
| Python | `scripts/python/AuditoriaDaDocumentacao.py` | `main` | 157 | Executa todas as verificações e apresenta um resumo adequado à manutenção. |
| Python | `scripts/python/GeracaoDaCredencialAdministrativa.py` | `derivar_senha` | 22 | Deriva a senha por PBKDF2-SHA256 e devolve o resultado em Base64. |
| Python | `scripts/python/GeracaoDaCredencialAdministrativa.py` | `substituir_campo` | 28 | Substitui um campo simples do objeto JavaScript sem alterar os comentários. |
| Python | `scripts/python/GeracaoDaCredencialAdministrativa.py` | `main` | 38 | Solicita a nova credencial, deriva a senha e atualiza a configuração. |
| Python | `scripts/python/GeracaoDoCatalogoDeFuncoes.py` | `resumir` | 36 | Converte um comentário em uma frase adequada para uma célula Markdown. |
| Python | `scripts/python/GeracaoDoCatalogoDeFuncoes.py` | `comentario_javascript` | 43 | Recupera o comentário imediatamente anterior a uma função JavaScript. |
| Python | `scripts/python/GeracaoDoCatalogoDeFuncoes.py` | `catalogar_javascript` | 73 | Lista funções, métodos e manipuladores JavaScript de autoria do projeto. |
| Python | `scripts/python/GeracaoDoCatalogoDeFuncoes.py` | `catalogar_python` | 112 | Lista funções Python e resume a primeira parte de cada docstring. |
| Python | `scripts/python/GeracaoDoCatalogoDeFuncoes.py` | `catalogar_r` | 132 | Lista funções R e reúne o bloco Roxygen que antecede cada definição. |
| Python | `scripts/python/GeracaoDoCatalogoDeFuncoes.py` | `montar_catalogo` | 159 | Monta o documento Markdown com totais e uma linha para cada função. |
| Python | `scripts/python/GeracaoDoCatalogoDeFuncoes.py` | `principal` | 194 | Reúne os três catálogos e grava a versão atualizada do documento. |
| Python | `scripts/python/GeracaoDoManifestoDosArquivos.py` | `calcular_sha256` | 18 | Calcula SHA256 em blocos para funcionar também com arquivos grandes. |
| Python | `scripts/python/GeracaoDoManifestoDosArquivos.py` | `arquivos_da_distribuicao` | 27 | Lista arquivos do projeto em ordem estável, excetuando o manifesto. |
| Python | `scripts/python/GeracaoDoManifestoDosArquivos.py` | `principal` | 39 | Grava nome, tamanho e SHA256 dos arquivos verificáveis da distribuição. |
| Python | `scripts/python/RecalculoDosIndicadores.py` | `year_from_filename` | 53 | Identifica a edição do Vigitel a partir do nome acadêmico do arquivo. |
| Python | `scripts/python/RecalculoDosIndicadores.py` | `indicator_filename` | 62 | Converte o título do indicador em um nome de arquivo legível e estável. |
| Python | `scripts/python/RecalculoDosIndicadores.py` | `bundle_filename` | 91 | Retorna o arquivo temático usado para publicar a idade detalhada do indicador. |
| Python | `scripts/python/RecalculoDosIndicadores.py` | `numeric` | 128 | Converte uma série para valores numéricos, tratando vírgulas decimais e registros inválidos. |
| Python | `scripts/python/RecalculoDosIndicadores.py` | `binary` | 139 | Cria uma regra binária com numerador e denominador definidos pela variável informada. |
| Python | `scripts/python/RecalculoDosIndicadores.py` | `apply` | 142 | Aplica a regra à base e devolve as máscaras de elegibilidade e de ocorrência do evento. |
| Python | `scripts/python/RecalculoDosIndicadores.py` | `codes` | 152 | Cria uma regra baseada em códigos válidos, códigos do evento e filtros de sexo ou idade. |
| Python | `scripts/python/RecalculoDosIndicadores.py` | `apply` | 159 | Aplica a regra à base e devolve as máscaras de elegibilidade e de ocorrência do evento. |
| Python | `scripts/python/RecalculoDosIndicadores.py` | `ex_smoker` | 173 | Identifica ex fumantes usando a variável derivada ou as perguntas originais disponíveis. |
| Python | `scripts/python/RecalculoDosIndicadores.py` | `weekly_alcohol_population` | 183 | Define a população elegível para o consumo semanal de álcool. |
| Python | `scripts/python/RecalculoDosIndicadores.py` | `binge_by_sex` | 191 | Aplica os limites de consumo abusivo específicos para homens e mulheres. |
| Python | `scripts/python/RecalculoDosIndicadores.py` | `apply` | 194 | Aplica a regra à base e devolve as máscaras de elegibilidade e de ocorrência do evento. |
| Python | `scripts/python/RecalculoDosIndicadores.py` | `max_doses_five` | 202 | Identifica pessoas que relataram cinco ou mais doses no dia de maior consumo. |
| Python | `scripts/python/RecalculoDosIndicadores.py` | `stopped_in_blitz_after_passing` | 209 | Harmoniza CT04 entre 2014–2019. |
| Python | `scripts/python/RecalculoDosIndicadores.py` | `invited_to_breathalyzer_after_stop` | 221 | CT05: convite somente entre quem declarou ter sido parado na blitz. |
| Python | `scripts/python/RecalculoDosIndicadores.py` | `performed_breathalyzer_after_invitation` | 227 | CT06: realização somente entre quem declarou ter sido convidado. |
| Python | `scripts/python/RecalculoDosIndicadores.py` | `positive_breathalyzer_after_test` | 233 | CT07: resultado positivo somente entre quem declarou ter feito o teste. |
| Python | `scripts/python/RecalculoDosIndicadores.py` | `passive_smoke_home` | 239 | TAB07 segundo a série revista 2018–2024. |
| Python | `scripts/python/RecalculoDosIndicadores.py` | `passive_smoke_work` | 250 | TAB08 segundo a série revista 2018–2024. |
| Python | `scripts/python/RecalculoDosIndicadores.py` | `physical_inactivity_harmonized` | 262 | AF08: prioriza a definição revista em toda edição em que ela exista. |
| Python | `scripts/python/RecalculoDosIndicadores.py` | `bmi_rule` | 277 | Classifica o IMC segundo os limites definidos para o indicador. |
| Python | `scripts/python/RecalculoDosIndicadores.py` | `apply` | 280 | Aplica a regra à base e devolve as máscaras de elegibilidade e de ocorrência do evento. |
| Python | `scripts/python/RecalculoDosIndicadores.py` | `activity_frequency` | 297 | Identifica frequência regular de atividade física no tempo livre. |
| Python | `scripts/python/RecalculoDosIndicadores.py` | `activity_duration` | 305 | Identifica sessões de atividade física com duração adequada. |
| Python | `scripts/python/RecalculoDosIndicadores.py` | `good_health` | 318 | Identifica respostas que representam avaliação positiva da saúde. |
| Python | `scripts/python/RecalculoDosIndicadores.py` | `load_existing_metadata` | 460 | Lê os metadados atuais para preservar informações válidas no recálculo. |
| Python | `scripts/python/RecalculoDosIndicadores.py` | `required_columns` | 477 | Retorna as colunas necessárias para calcular uma regra. |
| Python | `scripts/python/RecalculoDosIndicadores.py` | `age_group_index` | 486 | Converte a idade em índice de faixa etária usado na agregação. |
| Python | `scripts/python/RecalculoDosIndicadores.py` | `aggregate_rule` | 497 | Agrega numerador e denominador de uma regra para cada combinação de filtros. |
| Python | `scripts/python/RecalculoDosIndicadores.py` | `main` | 542 | Coordena leitura dos microdados, cálculo dos indicadores, gravação das bases e relatório final. |
| Python | `scripts/python/RecalculoDosIndicadores.py` | `national_series` | 752 | Calcula a série nacional ponderada usada nas conferências. |
| Python | `scripts/python/RecalculoDosIndicadores.py` | `validate` | 768 | Confere a estrutura e a coerência dos resultados processados antes da gravação. |
| Python | `testes/ValidacaoDaBaseCompleta.py` | `parse_data` | 23 | Extrai o objeto de dados do arquivo JavaScript e o converte para Python. |
| Python | `testes/ValidacaoDaBaseCompleta.py` | `parse_methods` | 33 | Extrai o objeto metodológico do arquivo JavaScript e o converte para Python. |
| Python | `testes/ValidacaoDaBaseCompleta.py` | `parse_age_update` | 43 | Lê o complemento administrativo de idade detalhada quando ele foi gerado. |
| Python | `testes/ValidacaoDaBaseCompleta.py` | `pct` | 58 | Calcula a diferença percentual usada nas comparações de validação. |
| Python | `testes/ValidacaoDaBaseCompleta.py` | `main` | 66 | Coordena leitura dos microdados, cálculo dos indicadores, gravação das bases e relatório final. |
| Python | `testes/ValidacaoDaPublicacaoNoGitHub.py` | `local_reference` | 16 | Resolve uma referência HTML local em relação à página que a declarou. |
| Python | `testes/ValidacaoDaPublicacaoNoGitHub.py` | `main` | 24 | Valida arquivos essenciais, referências locais, bundles e limites de tamanho. |
| R | `scripts/r/PreparacaoDosDadosDoVigitel.R` | `identificar_ano_arquivo` | 48 | Identifica a edição do Vigitel a partir do nome acadêmico do arquivo. @param nome_arquivo Nome ou caminho do arquivo que será processado. @return Ano da edição como número inteiro; encerra o processamento quando o padrão não é reconhecido. @details Mantenha este mapa sincronizado com a nomenclatura dos microdados e com o script Python de recálculo. |
| R | `scripts/r/PreparacaoDosDadosDoVigitel.R` | `numero` | 83 | Converte valores para número, tratando vírgula decimal e códigos que não representam medidas válidas. @param x Vetor numérico ou textual vindo dos microdados. @return Vetor numérico com valores inválidos convertidos em ausentes. @details A conversão reconhece a vírgula como separador decimal e remove o ponto usado como separador de milhar antes de aplicar `as.numeric`. |
| R | `scripts/r/PreparacaoDosDadosDoVigitel.R` | `obter` | 98 | Recupera uma coluna pelo nome sem interromper o processamento quando a variável não existe na edição. @param base Tabela da edição em processamento. @param nome Nome original da variável no arquivo do Vigitel. @return Vetor numérico da coluna ou vetor ausente com o mesmo número de linhas da base. @details O vetor ausente permite que as regras testem a disponibilidade da variável sem alterar o número de registros. |
| R | `scripts/r/PreparacaoDosDadosDoVigitel.R` | `regra_codigos` | 111 | Monta as máscaras de elegibilidade e evento a partir dos códigos válidos da variável. @param base Tabela da edição em processamento. @param variavel Nome da variável consultada. @param validos Códigos que pertencem ao denominador. @param positivos Códigos que pertencem ao numerador. @return Lista com as máscaras lógicas elegivel e evento. @details Respostas fora de `validos`, inclusive códigos de recusa ou desconhecimento, não entram no denominador. |
| R | `scripts/r/PreparacaoDosDadosDoVigitel.R` | `regra_binaria` | 125 | Aplica a regra padrão a variáveis codificadas em zero e um. @param base Tabela da edição em processamento. @param variavel Nome da variável binária. @param positivo Código que representa a ocorrência do indicador. @return Lista com as máscaras lógicas elegivel e evento. @details Apenas zero e um são aceitos no denominador; qualquer outro código permanece fora do cálculo. |
| R | `scripts/r/PreparacaoDosDadosDoVigitel.R` | `regra_imc` | 135 | Classifica o índice de massa corporal depois de validar peso, altura e limites plausíveis. @param base Tabela com peso imputado em `q9_i` e altura imputada em `q11_i`. @param tipo Categoria solicitada: `adequado` ou `baixo`. @return Lista com elegibilidade e ocorrência da categoria de IMC solicitada. @details A função limita o IMC ao intervalo plausível adotado no projeto antes de classificar a categoria. |
| R | `scripts/r/PreparacaoDosDadosDoVigitel.R` | `calcular_evento` | 152 | Seleciona a definição metodológica do indicador e produz as máscaras usadas no cálculo ponderado. @param base Tabela já harmonizada por `preparar_base`. @param indicador_id Código estável do indicador no painel. @return Lista com elegibilidade e evento, ou valor nulo quando a edição não possui as variáveis exigidas. @details Cada condição corresponde à regra registrada no dicionário metodológico. Uma regra nova deve ser incluída também no gerador Python e nos testes. |
| R | `scripts/r/PreparacaoDosDadosDoVigitel.R` | `exige` | 161 | Confere se todas as variáveis necessárias à regra estão disponíveis na edição em processamento. @param vars Nomes das variáveis exigidas pela regra. @return Valor lógico indicando se a regra pode ser calculada. @details A verificação evita transformar a ausência de uma pergunta em prevalência igual a zero. |
| R | `scripts/r/PreparacaoDosDadosDoVigitel.R` | `preparar_base` | 318 | Harmoniza nomes, tipos, pesos, localidade e população antes do cálculo dos indicadores. @param base Microdados de uma edição do Vigitel. @param nome_arquivo Nome usado para identificar o ano e o tipo de população. @return Base pronta para o cálculo ponderado, com registros inválidos removidos. @details A população geral prioriza `pesorake2025`; o recorte de população negra usa `pesorake_cor` e exige `q69_cor`. |
| R | `scripts/r/PreparacaoDosDadosDoVigitel.R` | `prevalencia_ponderada` | 365 | Calcula numerador, denominador, prevalência e medidas auxiliares do indicador selecionado. @param base Tabela harmonizada com a coluna `peso_analise`. @param indicador_id Código do indicador que será calculado. @return Linha de resultado ponderado ou valor nulo quando não existem respostas elegíveis. @details O resultado conserva contagem de entrevistas, casos e soma dos pesos ao quadrado para as verificações de precisão. |
