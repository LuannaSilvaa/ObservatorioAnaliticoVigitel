# Limitação dos pesos e atualização da base oficial

## Situação da base incorporada

Os arquivos fornecidos ao projeto abrangem 2006–2021 e 2023, sem 2022, e possuem a coluna `pesorake`. Não foi encontrada a coluna `pesorake2025` nem um microdado de 2024.

O relatório Vigitel Brasil 2006–2024 informa que os fatores de ponderação foram atualizados com dados do Censo Demográfico 2022. Por isso, estimativas produzidas com os pesos originais podem diferir das estimativas republicadas.

Essa diferença não é escondida pelo painel. Os metadados registram:

```text
weightStatus: legado-com-atualizador-pronto
weightLimitation: os microdados fornecidos não contêm pesorake2025 nem 2024
```

## Como atualizar

1. Baixe a base harmonizada oficial de 2006–2024 no portal do Ministério da Saúde.
2. Execute na raiz do projeto:

```bash
python Scripts/AtualizacaoDaBaseOficial.py --arquivo /caminho/BaseOficial.zip
```

3. O programa:
   - extrai os CSVs;
   - verifica se 2024 está presente;
   - exige a coluna `pesorake2025` em pelo menos um arquivo regular;
   - verifica os anos obrigatórios;
   - cria backup dos microdados atuais;
   - instala os arquivos com nomes padronizados;
   - executa o recálculo completo da v13.0.

4. Execute os testes:

```bash
python testes/ValidacaoDaBaseCompleta.py
node testes/TesteDosIndicadoresEGraficos.js
```

## O que não foi feito automaticamente

O pacote não baixa a base oficial sozinho. Isso evita dependência de rede, alterações silenciosas e redistribuição involuntária de arquivos externos. A instalação requer que o usuário forneça o ZIP oficial.
