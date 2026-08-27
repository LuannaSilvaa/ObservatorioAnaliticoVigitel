# Mapa dos arquivos do projeto

A distribuição é organizada por responsabilidade. O objetivo é deixar a raiz limpa, manter o GitHub Pages funcional e tornar manutenção, testes e atualização de dados mais previsíveis.

## Raiz

| Item | Finalidade |
|---|---|
| `index.html` | Ponto de entrada do painel no GitHub Pages. |
| `.nojekyll` | Evita transformação pelo Jekyll. |
| `robots.txt` | Regras de rastreamento. |
| `README.md` | Visão geral e comandos principais. |
| `LICENSE` | Licença do código. |
| `CITATION.cff` | Metadados de citação acadêmica. |
| `.gitignore` | Exclusões do controle de versão. |

## `assets/`

- `assets/css/`: estilos principais e ajustes finais de interação.
- `assets/img/`: identidade visual e logotipos institucionais.
- `assets/js/core/`: inicialização, sistema analítico, tema, glossário e recursos compartilhados.
- `assets/js/admin/`: autenticação local, processamento administrativo, leitura de CSV/planilhas e compactação ZIP.
- `assets/js/dados/`: base analítica, metodologia e catálogo.
- `assets/js/dados/idade-detalhada/`: complemento de atualização e nove pacotes temáticos.

## `paginas/`

- `InformacoesDoObservatorio.html`: projeto, metodologia, créditos, downloads e contato.
- `AdministracaoDoObservatorio.html`: atualização local dos dados e geração do pacote de substituição.

## `dados/`

- `base-agregada/`: três partes da base tabular agregada.
- `dicionarios/`: dicionários do Vigitel, população negra e indicadores calculados.
- `estatisticas/`: contagens de entrevistas e somas de pesos.
- `resumos/`: resumos por ano, região, UF e base agregada.
- `metadados/`: manifestos, matriz de auditoria e metadados do processamento.

## `scripts/`

- `scripts/python/`: atualização oficial, recálculo, auditoria, credencial, catálogo e manifesto.
- `scripts/r/`: preparação e lançador de recálculo por idade detalhada.

## `testes/`

Contém os testes de atualização automática, renderização dos indicadores, validação completa da base e validação da publicação no GitHub Pages.

## `documentacao/`

Guarda guias de manutenção, publicação, reprodução, atualização, nomenclatura, referências, histórico e a descrição da estrutura.

## `relatorios/`

Guarda relatórios técnicos, metodológicos, de validação, revisão, conferência e atualização administrativa.

Após mover, incluir ou renomear arquivos, execute os validadores indicados no `README.md` e regenere `dados/metadados/ManifestoDosArquivos.csv`.
