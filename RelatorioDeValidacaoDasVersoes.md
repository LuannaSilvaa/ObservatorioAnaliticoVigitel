# Relatório de validação das versões

As três distribuições foram verificadas com a mesma base pública do painel e com os mesmos testes automatizados.

## Resultados

- 63 indicadores metodologicamente documentados;
- 13 tipos de gráfico;
- 819 combinações entre indicador e gráfico renderizadas sem falha;
- 262.565 linhas na base agregada;
- 2.651.417 linhas de idade detalhada;
- 879 comparações entre a base principal e a idade detalhada;
- 290 funções nomeadas com documentação associada;
- nenhum arquivo com algarismo, hífen ou sublinhado no nome;
- nenhuma função Python, JavaScript ou R sem explicação;
- nenhuma referência local ausente na publicação.

## Conferência dos dados

Foram comparados 35 arquivos da coleção de reprodução com os arquivos recebidos no `Vigitel.zip`. Os códigos SHA256 coincidiram em todas as comparações. A versão do Zenodo mantém os microdados em CSV e o arquivo XLSX disponível; arquivos XLS não foram incluídos.

## Observação metodológica

A base disponível utiliza o campo de peso `pesorake`, correspondente aos arquivos fornecidos. O projeto contém uma rotina de atualização para priorizar um peso harmonizado mais recente quando esse campo for disponibilizado em uma nova coleção. Essa observação não impede o funcionamento do painel, mas deve ser considerada em comparações com séries futuras recalculadas por outro esquema de ponderação.

## Comandos usados

```bash
python AuditoriaDaDocumentacao.py
python ValidacaoDaBaseCompleta.py
node TesteDosIndicadoresEGraficos.js
python TesteDaAtualizacaoAutomatica.py
python ValidacaoDaPublicacaoNoGitHub.py
```
