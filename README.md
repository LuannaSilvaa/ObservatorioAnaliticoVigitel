# Observatório Analítico de Indicadores do Vigitel

Plataforma acadêmica para análise, comparação e visualização de indicadores de saúde pública produzidos a partir dos dados do Vigitel.

Esta é a **versão plana para GitHub**: todos os arquivos ficam diretamente na raiz do repositório. Os dados por idade detalhada foram reunidos em nove arquivos temáticos, preservando os 63 indicadores e mantendo o conjunto com menos de cem arquivos. Nenhum arquivo ultrapassa 25 MiB.

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

## Publicação no GitHub Pages

1. Extraia o ZIP.
2. No repositório `ObservatorioAnaliticoVigitel`, escolha **Add file → Upload files**.
3. Selecione todos os arquivos extraídos, sem enviar o ZIP.
4. Faça o commit na branch `main`.
5. Abra **Settings → Pages**.
6. Escolha **Deploy from a branch**, branch **main** e pasta **/(root)**.

O endereço seguirá o formato:

```text
https://SEUUSUARIO.github.io/ObservatorioAnaliticoVigitel/
```

Consulte `GuiaDePublicacaoNoGitHub.md` para o passo a passo completo.

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

Os microdados não são publicados neste repositório. Para recalcular:

1. crie localmente uma pasta chamada `Microdados` ao lado dos arquivos do projeto;
2. coloque nela os CSVs oficiais do Vigitel;
3. execute `python RecalculoDosIndicadores.py`;
4. execute `python ValidacaoDaBaseCompleta.py`;
5. execute `node TesteDosIndicadoresEGraficos.js`;
6. execute `python ValidacaoDaPublicacaoNoGitHub.py`.

O recálculo atualiza a base principal e recria os nove arquivos temáticos, mantendo a distribuição plana.

## Cobertura e limitações

A base incorporada reúne as edições disponíveis entre 2006 e 2023, sem 2022, e utiliza os pesos presentes nos arquivos empregados no projeto. Os intervalos de confiança e coeficientes de variação são aproximações baseadas no tamanho efetivo de Kish e não substituem uma análise completa do desenho amostral.

## Fonte

Vigitel — Vigilância de Fatores de Risco e Proteção para Doenças Crônicas por Inquérito Telefônico, Ministério da Saúde.

## Citação sugerida

> SILVA, Luanna Morais Alves da. Observatório Analítico de Indicadores do Vigitel. Universidade Federal do Rio Grande do Norte, 2026.

O arquivo `CITATION.cff` permite gerar a referência diretamente pelo GitHub.

## Licença

O código é disponibilizado sob a Licença MIT. A licença não transfere direitos sobre microdados, publicações, marcas ou materiais institucionais do Ministério da Saúde e da UFRN.
