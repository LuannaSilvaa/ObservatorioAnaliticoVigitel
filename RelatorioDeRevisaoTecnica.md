# Relatório de Revisão Técnica

## Escopo da revisão

A revisão abrangeu a estrutura do repositório, os caminhos utilizados pelo GitHub Pages, os módulos da interface, os scripts de reprodução, os testes e os arquivos gerados de idade detalhada.

## Organização dos nomes

Os nomes foram padronizados em português, com termos que identificam a responsabilidade de cada arquivo. Não foram utilizados hífens ou sublinhados nos nomes dos arquivos do projeto. Os nomes `index.html`, `404.html`, `README.md`, `LICENSE`, `CITATION.cff`, `.nojekyll`, `.gitignore` e a configuração do GitHub Pages foram mantidos porque fazem parte de convenções ou requisitos técnicos do GitHub e da publicação web.

## Arquivos removidos

Foram retirados relatórios temporários de validação, arquivos de bytecode e um lançador Python que apenas repetia a chamada do recálculo principal. Esses conteúdos são recriados pelos testes ou não acrescentavam uma função própria ao projeto.

## Documentação das funções

Foram conferidas 266 funções nomeadas:

- 218 funções JavaScript;
- 39 funções Python;
- 9 funções R.

Todas possuem uma explicação junto à definição. Os comentários descrevem a responsabilidade da rotina, a relação com as demais etapas e os cuidados relevantes para manutenção. O arquivo `CatalogoDeFuncoes.md` reúne essas explicações para consulta rápida.

## Arquivos gerados

Os 63 arquivos de idade detalhada possuem cabeçalho de manutenção. Esses arquivos não devem ser editados manualmente, pois são reconstruídos pelo recálculo dos microdados.

## Apoio à atualização futura

Foram incluídos:

- `GuiaDeManutencaoDoProjeto.md`, com a sequência recomendada de atualização;
- `CatalogoDeFuncoes.md`, com a finalidade das funções;
- `MapaDosArquivosDoProjeto.md`, com a estrutura mantida no repositório;
- testes para base, gráficos, atualização automática e publicação no GitHub Pages.

## Validações esperadas

Antes de cada publicação, devem ser executados os comandos indicados no guia de manutenção. A alteração só deve ser enviada quando os testes terminarem sem erros e a inspeção no navegador confirmar o funcionamento dos filtros, gráficos, tabelas e downloads.
