# Observatório Analítico de Indicadores do Vigitel

Plataforma acadêmica para análise, comparação e visualização de indicadores de saúde pública produzidos a partir dos dados do Vigitel.

Esta é a **versão plana para GitHub**: os arquivos públicos ficam na raiz do repositório e são recriados automaticamente após cada atualização administrativa aprovada. O fluxo remoto valida os limites do GitHub, envia arquivos grandes em partes e somente então altera a versão pública.

## Recursos principais

- seleção de temas e indicadores;
- filtros temporais, demográficos e geográficos;
- gráficos de linha, área, barras, ranking, Pareto, pizza, rosca, radar, KPI, medidor, lollipop e treemap;
- tabelas com estimativa, intervalo de confiança aproximado, coeficiente de variação, casos e entrevistas;
- exportação de PNG, SVG, CSV e Excel;
- modo claro, escuro e automático;
- visualização por idade detalhada;
- metodologia documentada para os 63 indicadores.

## Funcionamento

O painel é um site estático. Ele não depende de banco de dados nem de servidor de aplicação. O navegador carrega diretamente:

- `index.html`;
- `IdentidadeVisualDoObservatorio.css`;
- os módulos JavaScript da interface;
- `BaseAnaliticaDoVigitel.js`;
- `CatalogoDeIdadeDetalhada.js`;
- os nove arquivos `DadosIdadeDetalhada...js`.

## Publicação e atualização no GitHub Pages

O site é publicado pela branch `main`. A atualização dos dados é feita pela área **Administração** do próprio Observatório:

1. a pessoa administradora envia uma base CSV, XLS ou XLSM pelo rascunho privado indicado na página;
2. o GitHub Actions lê e harmoniza a base;
3. indicadores, idade detalhada, CSVs agregados, contagens, metadados, documentação e manifesto são recriados;
4. todas as validações precisam ser aprovadas;
5. somente depois disso os arquivos são promovidos para a `main` e o GitHub Pages é republicado.

Uma falha em qualquer etapa mantém a versão pública anterior.

## Execução local

Na raiz do projeto, execute:

```bash
python -m http.server 8000
```

Depois acesse:

```text
http://localhost:8000
```

## Estrutura plana

Todos os arquivos ficam no mesmo nível. Os principais são:

- `index.html`: estrutura principal da interface;
- `IdentidadeVisualDoObservatorio.css`: identidade visual, temas e responsividade;
- `SistemaAnaliticoDoVigitel.js`: filtros, análises, gráficos, tabelas e exportações;
- `BaseAnaliticaDoVigitel.js`: base agregada usada pelo navegador;
- `CatalogoDeIdadeDetalhada.js`: catálogo de dimensões e arquivos temáticos;
- `DadosIdadeDetalhada...js`: dados detalhados agrupados por assunto;
- `RecalculoDosIndicadores.py`: rotina canônica de recálculo;
- `ValidacaoDaBaseCompleta.py`: validação metodológica e estrutural;
- `ValidacaoDaPublicacaoNoGitHub.py`: conferência dos limites e caminhos da publicação;
- `ManifestoDosArquivos.csv`: lista de arquivos, tamanhos e códigos SHA256.

## Atualização dos dados

O arquivo recebido pela Administração é a única entrada necessária para recalcular os dados. Os arquivos antigos da interface também podem ser atualizados quando necessário; antes da publicação, a automação confirma o funcionamento do painel e a presença do ano de 2024.

Para uma atualização ser publicada, o fluxo precisa sincronizar e validar:

- a base principal e os nove arquivos temáticos de idade detalhada;
- as três partes CSV da base agregada;
- `EntrevistasPorAno.csv`;
- `MetadadosDoProcessamento.csv`;
- a cobertura descrita neste README;
- os relatórios de validação e o manifesto SHA-256.

## Cobertura e limitações

A base publicada reúne **2006 a 2024 (exceto 2022)**, com **833,217 entrevistas válidas utilizadas** e **241,281 linhas agregadas**. A atualização atual foi produzida a partir de `vigitel-2006-2024-peso-rake.csv` e registrada em `2026-07-24T07:16:27Z`.

Dos 63 indicadores cadastrados, 55 possuem dados na base consolidada atual. Os demais permanecem identificados como indisponíveis, sem valores inventados:

- `ALC07`: A variável derivada direcao não está presente no arquivo consolidado enviado.
- `MR05`: A variável derivada asma não está presente no arquivo consolidado enviado.
- `CT02`: A variável derivada direcao_alc não está presente no arquivo consolidado enviado.
- `CT04`: As variáveis r153 e r137a do fluxo de blitz não estão presentes no arquivo consolidado enviado.
- `CT05`: As variáveis r137a e r154 do fluxo do bafômetro não estão presentes no arquivo consolidado enviado.
- `CT06`: As variáveis r154 e r155 do fluxo do bafômetro não estão presentes no arquivo consolidado enviado.
- `CT07`: As variáveis r155 e r156 do resultado do bafômetro não estão presentes no arquivo consolidado enviado.
- `CT08`: A variável r178 sobre uso de celular na condução não está presente no arquivo consolidado enviado.

Os intervalos de confiança e coeficientes de variação exibidos no painel são aproximações baseadas no tamanho efetivo de Kish e não substituem uma análise completa do desenho amostral. Anos ausentes no intervalo: 2022.

## Fonte

Vigitel — Vigilância de Fatores de Risco e Proteção para Doenças Crônicas por Inquérito Telefônico, Ministério da Saúde.

## Citação sugerida

> SILVA, Luanna Morais Alves da. Observatório Analítico de Indicadores do Vigitel. Universidade Federal do Rio Grande do Norte, 2026.

O arquivo `CITATION.cff` permite gerar a referência diretamente pelo GitHub.

## Licença

O código é disponibilizado sob a Licença MIT. A licença não transfere direitos sobre microdados, publicações, marcas ou materiais institucionais do Ministério da Saúde e da UFRN.
