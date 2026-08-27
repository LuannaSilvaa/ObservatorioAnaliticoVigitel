# Leia-me

Esta distribuição foi preparada para publicação direta no GitHub Pages com os arquivos separados por responsabilidade.

## Arquivos essenciais do site

- `index.html`: ponto de entrada mantido na raiz;
- `paginas/`: páginas secundárias;
- `assets/css/`: estilos;
- `assets/img/`: identidade visual e logotipos;
- `assets/js/core/`: lógica principal da interface;
- `assets/js/admin/`: área administrativa e bibliotecas de leitura;
- `assets/js/dados/`: base, metodologia, catálogo e idade detalhada.

## Publicação

Extraia o ZIP preservando as pastas e envie todo o conteúdo para o repositório. No GitHub Pages, use a branch `main` e a pasta `/(root)`. O `index.html` deve continuar na raiz.

## Reprodução

As rotinas de manutenção ficam em `scripts/`, as verificações em `testes/`, os arquivos tabulares em `dados/` e os guias em `documentacao/`. Os microdados oficiais não fazem parte do pacote público; quando necessários, devem ser colocados localmente em `Microdados/` na raiz do projeto.
