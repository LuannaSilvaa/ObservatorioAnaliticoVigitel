# Observatório Analítico de Indicadores do Vigitel

Esta pasta contém a versão completa para auditoria, recálculo e manutenção do painel. A versão destinada à publicação está na pasta irmã `PainelPublicacao`, dentro do pacote unificado.

## O que foi corrigido na v13.0

- As 63 regras de indicadores permanecem centralizadas no gerador `Scripts/RecalculoDosIndicadores.py`.
- `TAB07` e `TAB08` usam a série revista de fumo passivo: `q67` e `q68`, a partir de 2018, incluindo fumantes expostos no numerador.
- `AF08` prioriza `inativo_2023` em qualquer edição em que a variável revista esteja disponível, inclusive em séries retroativamente harmonizadas desde 2009; `inativo` permanece apenas como fallback para arquivos anuais legados.
- O fluxo de blitz e bafômetro usa explicitamente `r153 → r137a → r154 → r155 → r156`.
- O gerador prioriza `pesorake2025` quando essa coluna estiver presente; caso contrário, usa `pesorake` e registra a limitação nos metadados.
- O painel mostra casos, entrevistas, IC 95% aproximado, CV aproximado e sinalização de precisão.
- Não existem login ou senha administrativos gravados no código. No primeiro acesso local, o usuário cria as próprias credenciais.
- O arquivo duplicado de microdados compactados foi removido.

## Limitação da base incluída

Os microdados fornecidos para este projeto contêm as edições de 2006 a 2021 e 2023, sem 2022, e utilizam `pesorake`. Eles não contêm a edição 2024 nem a coluna `pesorake2025` da base harmonizada mais recente.

Por isso, a base incorporada é identificada no painel como **peso legado com atualizador pronto**. Os cálculos são reproduzíveis com os arquivos incluídos, mas podem diferir das estimativas oficiais reponderadas de 2006–2024.

Para instalar a base oficial harmonizada, obtenha o ZIP no portal do Ministério da Saúde e execute:

```bash
python Scripts/AtualizacaoDaBaseOficial.py --arquivo /caminho/para/Vigitel20062024.zip
```

O atualizador valida a presença de 2024 e de `pesorake2025`, faz backup dos microdados atuais e executa o recálculo completo.

## Recalcular tudo

Na raiz desta pasta:

```bash
python RecalculoDosIndicadores.py
```

O comando reconstrói:

- `BaseAnaliticaDoVigitel.js`;
- `MetodologiaDosIndicadores.js`;
- os 63 arquivos em ``;
- o relatório de processamento.

O script R `Scripts/PreparacaoDosDadosDoVigitel.R` documenta as mesmas regras e prioriza os mesmos pesos. O lançador `Scripts/RecalculoPorIdadeDetalhada.R` chama o gerador Python canônico para evitar duas implementações divergentes.

## Validar

```bash
python ValidacaoDaBaseCompleta.py
node TesteDosIndicadoresEGraficos.js
```

Resultados desta compilação:

- 63 indicadores;
- 262.565 linhas agregadas;
- 2.651.417 linhas de idade detalhada;
- 879 comparações entre base principal e idade exata;
- 819 combinações de indicador e gráfico renderizadas;
- zero erros nos testes configurados.

Há um aviso esperado: a base incluída ainda usa os pesos legados.

## Abrir o painel

Use um servidor local, em vez de abrir o HTML diretamente:

```bash
python -m http.server 8000
```

Acesse `http://localhost:8000`.

## Administração local

A área administrativa existe somente nesta pasta de reprodução.

- No primeiro acesso, crie um login com 3 a 32 caracteres e uma senha com pelo menos 8 caracteres.
- As credenciais são armazenadas localmente no navegador na forma de hash.
- Essa proteção não substitui autenticação em servidor.
- Para publicação pública, use `PainelPublicacao`, que não contém a área administrativa nem microdados.

## Precisão estatística

O painel calcula uma aproximação de IC 95% e CV usando o tamanho efetivo de Kish, a partir da soma dos pesos e da soma dos pesos ao quadrado. A sinalização adotada é:

- baixa precisão: 20 casos ou menos, ou CV aproximado igual/superior a 35%;
- cautela: CV aproximado entre 20% e 35%;
- maior precisão relativa: demais situações.

Essas medidas são auxiliares e não substituem a estimação completa com estratos, conglomerados e demais elementos do desenho amostral.

## Arquivos principais

```text
index.html
Arquivos de interface na raiz

  BaseAnaliticaDoVigitel.js
  MetodologiaDosIndicadores.js
  IdadeDetalhada/
  Microdados/
scripts/
  RecalculoDosIndicadores.py
  AtualizacaoDaBaseOficial.py
  PreparacaoDosDadosDoVigitel.R
  RecalculoPorIdadeDetalhada.R
testes/
documentacao/
admin/
```
