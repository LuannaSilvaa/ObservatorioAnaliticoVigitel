# Observatório Analítico de Indicadores do Vigitel

Plataforma acadêmica estática para análise e visualização de indicadores do Vigitel. Esta edição preserva a interface e os dados do projeto, mas reorganiza os arquivos por responsabilidade para facilitar manutenção, versionamento e publicação.

## Estrutura do projeto

```text
ObservatorioAnaliticoVigitel/
├── index.html
├── assets/
│   ├── css/
│   ├── img/
│   └── js/
│       ├── core/
│       ├── admin/
│       └── dados/
│           └── idade-detalhada/
├── paginas/
├── dados/
│   ├── base-agregada/
│   ├── dicionarios/
│   ├── estatisticas/
│   ├── resumos/
│   └── metadados/
├── scripts/
│   ├── python/
│   └── r/
├── testes/
├── documentacao/
└── relatorios/
```

O `index.html` permanece na raiz porque é o ponto de entrada do GitHub Pages. `.nojekyll`, `robots.txt`, `LICENSE`, `CITATION.cff` e `.gitignore` também permanecem na raiz por função de publicação e repositório.

## Execução local

Na raiz do projeto:

```bash
python -m http.server 8000
```

Acesse `http://localhost:8000`. Não abra o HTML apenas com `file://`, porque o painel carrega módulos de dados progressivamente.

## GitHub Pages

Publique o conteúdo completo na branch `main` e configure **Settings → Pages → Deploy from a branch → main → /(root)**. As pastas devem ser mantidas exatamente como estão.

## Manutenção e validação

Os principais comandos, executados a partir da raiz, são:

```bash
python scripts/python/AuditoriaDaDocumentacao.py
python scripts/python/GeracaoDoCatalogoDeFuncoes.py
python scripts/python/GeracaoDoManifestoDosArquivos.py
python testes/ValidacaoDaBaseCompleta.py
python testes/TesteDaAtualizacaoAutomatica.py
node testes/TesteDosIndicadoresEGraficos.js
python testes/ValidacaoDaPublicacaoNoGitHub.py
```

A credencial administrativa pode ser atualizada com:

```bash
python scripts/python/GeracaoDaCredencialAdministrativa.py
```

O recálculo canônico está em `scripts/python/RecalculoDosIndicadores.py`. Os microdados oficiais não fazem parte do pacote público; quando necessários ao recálculo, devem ser mantidos localmente em uma pasta `Microdados/` na raiz.

## Organização dos componentes

- `assets/js/core/`: inicialização, sistema analítico, tema e recursos gerais da interface.
- `assets/js/admin/`: leitura de arquivos e fluxo da área administrativa.
- `assets/js/dados/`: base incorporada, metodologia e catálogo.
- `assets/js/dados/idade-detalhada/`: nove pacotes temáticos e complemento de atualização.
- `dados/`: arquivos tabulares auxiliares, dicionários, estatísticas, resumos e metadados.
- `scripts/`: rotinas de preparação, recálculo e manutenção.
- `testes/`: validações automatizadas e testes de renderização.
- `documentacao/`: guias técnicos e metodológicos.
- `relatorios/`: saídas de auditoria e validação.

## Fonte

Vigitel — Vigilância de Fatores de Risco e Proteção para Doenças Crônicas por Inquérito Telefônico, Ministério da Saúde.

## Licença

O código é disponibilizado sob a Licença MIT. A licença não transfere direitos sobre microdados, publicações, marcas ou materiais institucionais do Ministério da Saúde e da UFRN.
