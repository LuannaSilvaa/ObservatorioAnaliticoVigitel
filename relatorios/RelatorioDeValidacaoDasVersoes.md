# Relatório de validação das versões

As três distribuições foram verificadas com a mesma base pública do painel e com os mesmos testes automatizados.

## Resultados

- 63 indicadores metodologicamente documentados;
- 13 tipos de gráfico;
- 819 combinações entre indicador e gráfico renderizadas sem falha;
- 275.575 linhas na base agregada;
- 2.782.400 linhas de idade detalhada;
- 923 comparações entre a base principal e a idade detalhada;
- 353 funções de autoria do projeto com documentação associada;
- nenhum arquivo com algarismo, hífen ou sublinhado no nome;
- nenhuma função Python, JavaScript ou R sem explicação;
- nenhuma referência local ausente na publicação.

## Conferência dos dados

Os arquivos recebidos foram conferidos antes do recálculo. A leitura direta do
arquivo combinado completo confirmou as edições 2006–2021, 2023 e 2024, sem
2022. A edição 2024 contém 27.048 entrevistas, as 27 capitais e
`pesorake2025`. Os detalhes estão em `relatorios/RelatorioDeConferenciaDosDados.md`.

A área de Administração foi testada com o CSV de 2024 e com o dicionário XLSX:
365 variáveis, 27 capitais, 55 regras com colunas presentes, 44 indicadores com
denominador válido e zero erro bloqueador. Dezenove indicadores não receberam
valores de 2024 por falta de colunas ou de códigos válidos. Uma amostra
incompleta com 500 linhas continuou sendo rejeitada sem geração de arquivos.

## Observação metodológica

A edição 2024 utiliza `pesorake2025`; as edições anteriores conservam os pesos
dos arquivos de origem. O metadado registra essa combinação para que a base não
seja confundida com uma série histórica integralmente reponderada. Essa
observação não impede o funcionamento do painel, mas deve ser considerada em
comparações com publicações calculadas por outro esquema de ponderação.

## Comandos usados

```bash
python scripts/python/AuditoriaDaDocumentacao.py
python scripts/python/GeracaoDoCatalogoDeFuncoes.py
python scripts/python/GeracaoDoManifestoDosArquivos.py
python testes/ValidacaoDaBaseCompleta.py
node testes/TesteDosIndicadoresEGraficos.js
python testes/TesteDaAtualizacaoAutomatica.py
python testes/ValidacaoDaPublicacaoNoGitHub.py
```
