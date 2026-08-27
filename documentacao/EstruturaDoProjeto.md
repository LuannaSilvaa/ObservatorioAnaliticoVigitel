# Estrutura do projeto

A organização separa arquivos de execução, dados, manutenção e documentação sem exigir framework ou processo de build.

## Pastas

- `assets/`: tudo que o navegador carrega diretamente.
- `paginas/`: páginas HTML secundárias.
- `dados/`: CSVs de apoio, bases agregadas, dicionários e metadados.
- `scripts/`: automações Python e R.
- `testes/`: verificações automatizadas.
- `documentacao/`: guias, referências e histórico.
- `relatorios/`: relatórios gerados ou mantidos para auditoria.

## Regra importante

O `index.html` fica na raiz. Caminhos usados pelo navegador são relativos à raiz do site; por isso o catálogo de idade detalhada registra os arquivos como `assets/js/dados/idade-detalhada/...`.
