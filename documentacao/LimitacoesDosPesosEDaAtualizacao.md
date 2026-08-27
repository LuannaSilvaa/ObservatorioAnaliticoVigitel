# Limitação dos pesos e atualização da base oficial

## Situação da base incorporada

Os arquivos incorporados ao painel abrangem 2006–2021, 2023 e 2024, sem 2022.
A edição 2024 contém 27.048 entrevistas das 27 capitais e foi calculada com
`pesorake2025`. As edições anteriores conservam os pesos registrados nos
arquivos anuais utilizados na construção original do painel.

O relatório Vigitel Brasil 2006–2024 informa que os fatores de ponderação foram atualizados com dados do Censo Demográfico 2022. Por isso, estimativas produzidas com os pesos originais podem diferir das estimativas republicadas.

Essa diferença não é escondida pelo painel. Os metadados registram:

```text
weightStatus: misto-legado-e-harmonizado
weightLimitation: a edição 2024 utiliza pesorake2025; as séries anteriores conservam os pesos documentados em sua origem
```

## Como atualizar

Para reponderar também todo o histórico:

1. obtenha a base harmonizada integral de 2006–2024 e seu dicionário no portal
   oficial do Ministério da Saúde;
2. Abra `paginas/AdministracaoDoObservatorio.html` por um servidor local, selecione o
   dicionário e o arquivo oficial e faça a validação completa.
3. Para a instalação assistida por linha de comando, execute na raiz:

```bash
python AtualizacaoDaBaseOficial.py --arquivo /caminho/BaseOficial.zip
```

4. O programa de linha de comando:
   - extrai os CSVs;
   - verifica se 2024 está presente;
   - exige a coluna `pesorake2025` em pelo menos um arquivo regular;
   - verifica os anos obrigatórios;
   - cria backup dos microdados atuais;
   - instala os arquivos com nomes padronizados;
   - executa o recálculo completo com as regras metodológicas vigentes.

5. Execute os testes:

```bash
python testes/ValidacaoDaBaseCompleta.py
node testes/TesteDosIndicadoresEGraficos.js
```

## O que não foi alterado automaticamente

O atualizador do navegador incorporou 2024 sem modificar silenciosamente as
edições anteriores. Uma reponderação histórica completa exige que o usuário
forneça a coleção oficial integral; o projeto não baixa microdados sozinho nem
redistribui os arquivos individuais.
