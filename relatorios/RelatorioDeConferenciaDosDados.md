# Relatório de conferência dos dados recebidos

## Escopo

A conferência foi feita sobre o conteúdo original de `Vigitel.zip`. Foram
verificados cobertura temporal, quantidade de entrevistas, capitais, pesos,
variáveis do dicionário e compatibilidade com as regras documentadas. A análise
não substitui a confirmação externa de autenticidade, versão ou licença no
portal do Ministério da Saúde.

Os microdados individuais não integram a distribuição pública. Permanecem no
projeto somente os resultados agregados, a metodologia, os relatórios e as
rotinas necessárias para futuras atualizações.

## Cobertura do arquivo combinado

O arquivo `vigitel-2006-2024-peso-rake.csv` foi lido diretamente do ZIP
original, sem depender de uma cópia intermediária. O conteúdo descompactado
possui 1.014.484.615 bytes e apresenta:

- edições de 2006 a 2021, 2023 e 2024;
- ausência de 2022;
- 27 capitais em todas as edições;
- 27.048 entrevistas em 2024;
- coluna `pesorake2025`.

Uma cópia extraída anteriormente estava truncada e terminava durante 2017. Ela
foi descartada da conclusão assim que a leitura integral do arquivo original
confirmou que os dados posteriores estavam presentes.

## Conferência da edição 2024

O teste integral da área de Administração usou o dicionário
`dicionario-vigitel-2006-2024.xlsx` e as linhas reais de 2024 do arquivo
combinado. Foram encontrados:

- 365 variáveis no dicionário;
- 27.048 registros de entrevista;
- 27 capitais;
- 55 das 63 regras com todas as colunas necessárias;
- 44 indicadores com ao menos um denominador válido e, portanto, resultado publicável;
- zero erro bloqueador.

As regras sem todas as colunas necessárias foram:

`ALC07`, `MR05`, `CT02`, `CT04`, `CT05`, `CT06`, `CT07` e `CT08`.

Outras onze regras tinham as colunas declaradas, mas não encontraram códigos
válidos ou denominador elegível em 2024:

`TAB06`, `ALC01`, `ALC02`, `ALC05`, `ALC06`, `CA08`, `CA09`, `CA10`, `MR03`,
`MR04` e `MR06`.

No caso de `ALC05`, o arquivo usa rótulos textuais que não coincidem
integralmente com os seis rótulos codificados no dicionário. Como não há uma
correspondência inequívoca para todas as categorias, o sistema não converteu os
rótulos por aproximação.

Os 19 indicadores sem resultado não receberam zero, estimativa ou valor
inferido. O painel mantém o histórico existente e não cria uma observação de
2024 quando a regra não pode ser calculada com dados e códigos válidos.

## Bloqueios de integridade

Antes do recálculo, a área de Administração exige:

- colunas de ano, capital, idade e sexo;
- coluna de peso correspondente à população;
- correspondência das variáveis essenciais com o dicionário;
- ao menos 1.000 registros por edição;
- as 27 capitais;
- no mínimo 90% das linhas com peso positivo;
- ausência de duplicidade de ano e população entre arquivos;
- ao menos uma regra de indicador compatível.

Um teste com somente 500 linhas reais permaneceu bloqueado. O botão de geração
ficou desabilitado e nenhum arquivo foi produzido.

## Resultado da incorporação

A edição 2024 foi incorporada ao índice, à base agregada e aos arquivos
temáticos de idade detalhada. O processamento publicou 44 indicadores com
denominador válido, preservou a ausência dos 19 não calculáveis e passou por
todas as validações estruturais e metodológicas.

O conjunto publicado é identificado como misto quanto à ponderação: 2024 usa
`pesorake2025`, enquanto as séries anteriores conservam os pesos documentados
nos arquivos de origem. Uma série integralmente reponderada de 2006–2024 pode
apresentar diferenças e deve ser recalculada a partir da coleção harmonizada
completa.
