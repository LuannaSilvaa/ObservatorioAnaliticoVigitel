# Recalculo da idade detalhada do Vigitel

## O que mudou

A idade detalhada deixou de ser distribuída artificialmente a partir das faixas etárias. Agora, cada idade é calculada diretamente da variável `q6` dos microdados reais.

O processamento gera, por ano, UF, sexo, idade, tipo de população e indicador:

- numerador ponderado;
- denominador ponderado;
- amostra e casos não ponderados;
- soma dos pesos ao quadrado, usada na precisão aproximada;
- percentual calculado por `100 × numerador / denominador`.

As idades de 18 a 79 anos permanecem separadas. Valores de 80 anos ou mais são agrupados em `80 anos ou mais`.

## Executar a rotina auditada

Na raiz do projeto:

```bash
python Scripts/RecalculoDosIndicadores.py
```

Essa é a rotina autoritativa: ela lê `Microdados/`, recalcula a base agregada e grava um arquivo JavaScript para cada indicador em ``. O lançador R abaixo chama exatamente essa mesma rotina, sem manter uma segunda cópia das regras:

```bash
Rscript Scripts/RecalculoPorIdadeDetalhada.R
```

## Pesos amostrais

- População Geral: `pesorake2025` quando presente; fallback documentado para `pesorake`;
- População Negra de 2018: `pesorake_cor`.

O número de entrevistas (`n`) não é ponderado. O numerador e o denominador são ponderados.

## Carregamento no painel

O painel usa carregamento sob demanda. Quando um indicador precisa de idade detalhada, o arquivo correspondente é carregado. Isso evita adicionar milhões de registros ao carregamento inicial.

## Relatório PDF

O relatório identifica, para cada indicador:

- variável utilizada;
- regra de classificação do evento;
- fórmula da estimativa;
- peso amostral;
- população e denominador elegíveis;
- numerador e denominador ponderados;
- número de entrevistas;
- data da base;
- uso direto de `q6`.

A tabela também apresenta casos, entrevistas, IC 95%, CV e sinalização de precisão aproximados para cada categoria.

## Observação de reprodutibilidade

O navegador não executa a rotina de preparação. O gerador Python é a fonte única das regras; o lançador R apenas o aciona. Os arquivos produzidos são consumidos pela interface web.
