# Relatório de Revisão Técnica

## Escopo da revisão

A revisão abrangeu a estrutura do repositório, os caminhos utilizados pelo
GitHub Pages, os módulos da interface, a nova área de Administração, os scripts de
reprodução, os testes e os arquivos gerados de idade detalhada.

## Organização dos nomes

Os nomes foram padronizados em português, com termos que identificam a responsabilidade de cada arquivo. Não foram utilizados hífens ou sublinhados nos nomes físicos. Os nomes técnicos `index.html`, `robots.txt`, `README.md`, `LICENSE`, `CITATION.cff`, `.nojekyll` e `.gitignore` foram mantidos porque fazem parte de convenções da publicação web, do GitHub e da citação acadêmica.

## Arquivos removidos

Foram retirados relatórios temporários de validação, arquivos de bytecode e um lançador Python que apenas repetia a chamada do recálculo principal. Esses conteúdos são recriados pelos testes ou não acrescentavam uma função própria ao projeto.

## Documentação das funções

Foram conferidas as funções, os métodos e os manipuladores nomeados de autoria do projeto. A quantidade atualizada é registrada automaticamente em `documentacao/CatalogoDeFuncoes.md`, evitando que este relatório fique incorreto quando uma rotina é incluída ou removida.

Todas as rotinas catalogadas possuem uma explicação junto à definição. Os comentários descrevem a responsabilidade, a relação com as demais etapas e os cuidados relevantes para manutenção. Funções anônimas curtas permanecem junto à operação que as utiliza, sem receber nomes artificiais. O arquivo `documentacao/CatalogoDeFuncoes.md` reúne as explicações para consulta rápida.

## Arquivos gerados

Os nove arquivos temáticos de idade detalhada possuem cabeçalho de manutenção.
O complemento gerado pela área de Administração também identifica sua origem e os anos
substituídos. Esses arquivos não devem ser editados manualmente, pois são
reconstruídos pelo recálculo dos microdados.

## Apoio à atualização futura

Foram incluídos:

- `documentacao/GuiaDeManutencaoDoProjeto.md`, com a sequência recomendada de atualização;
- `documentacao/CatalogoDeFuncoes.md`, com a finalidade das funções;
- `documentacao/MapaDosArquivosDoProjeto.md`, com a estrutura mantida no repositório;
- `scripts/python/GeracaoDoCatalogoDeFuncoes.py`, para reconstruir o catálogo após mudanças;
- `scripts/python/GeracaoDoManifestoDosArquivos.py`, para recalcular tamanhos e SHA256;
- `documentacao/SegurancaDaPublicacao.md`, com o limite da autenticação em site estático;
- testes para base, gráficos, atualização automática e publicação no GitHub Pages.

## Validações esperadas

Antes de cada publicação, devem ser executados os comandos indicados no guia de manutenção. A alteração só deve ser enviada quando os testes terminarem sem erros e a inspeção no navegador confirmar o funcionamento dos filtros, gráficos, tabelas e downloads.
