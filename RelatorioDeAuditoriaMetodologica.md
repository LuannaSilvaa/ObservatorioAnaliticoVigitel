# Auditoria e correções — Vigitel v13.0 unificado

## Escopo

A versão 13.0 consolida as correções da auditoria dos 63 indicadores e incorpora as mudanças metodológicas posteriores identificadas no relatório oficial Vigitel Brasil 2006–2024.

Foram conferidos:

- variável ou conjunto de variáveis de cada indicador;
- códigos válidos e códigos positivos;
- população elegível e denominador;
- anos em que as variáveis existem;
- peso usado em cada base;
- equivalência entre base agregada e idade exata;
- renderização dos 13 tipos de gráfico;
- consistência dos scripts Python, R e JavaScript.

A matriz completa está em `MatrizDeAuditoriaDosIndicadores.csv`.

## Correções metodológicas novas

### TAB07 — fumo passivo no domicílio

Regra vigente no projeto:

```text
Período: 2018 em diante
Evento: q67 = 1
Denominador: todos os adultos entrevistados com peso válido na edição
Fumantes expostos: incluídos no numerador
```

A antiga variável derivada `fumocasa` não foi usada, pois reproduzia uma definição anterior que excluía fumantes do numerador.

### TAB08 — fumo passivo no trabalho

Regra vigente:

```text
Período: 2018 em diante
Evento: q68 = 1
Denominador: todos os adultos entrevistados com peso válido na edição
Fumantes expostos: incluídos no numerador
```

A antiga variável `fumotrab` não foi usada pela mesma razão.

### AF08 — inatividade física

Regra harmonizada:

```text
2009 em diante: priorizar inativo_2023 = 1 sempre que a variável revista estiver disponível
fallback para arquivos anuais legados: inativo = 1
```

A metodologia revista passou a considerar atividades independentemente de duração mínima e pode ser aplicada retroativamente à série desde 2009 quando a base harmonizada trouxer `inativo_2023`. Nos arquivos anuais legados incluídos no pacote, a variável revista aparece em 2023; nesse ano, com os pesos disponíveis, a prevalência nacional foi 13,091%, compatível com a edição anual de 2023. Após instalar a base oficial harmonizada, o gerador aplicará a variável revista também aos anos anteriores em que ela estiver presente.

## Correções já incorporadas e mantidas

- `CT04`: `r153` e `r137a`, entre os que passaram por blitz.
- `CT05`: `r137a` e `r154`, entre os que foram parados.
- `CT06`: `r154` e `r155`, entre os que foram convidados.
- `CT07`: `r155` e `r156`, entre os que fizeram o teste.
- População Negra de 2018: `q69_cor = 2` e `pesorake_cor`.
- Autoavaliação de saúde: `q74`.
- Mamografia e Papanicolau: `mamodois`, `mamo`, `papatres` e `papa`, com as populações-alvo correspondentes.
- IMC: `q9_i` e `q11_i`, com limites de validade.
- Direção após beber: distinção entre `direcao_alc`, `direcao` e perguntas de frequência.
- Indicadores indisponíveis em um ano não geram zero artificial.

## Pesos

O gerador seleciona:

1. `pesorake_cor` para a base especial da população negra de 2018;
2. `pesorake2025` para a população geral, quando presente;
3. `pesorake` como fallback documentado.

A base incluída no pacote contém somente `pesorake` e não contém 2024. Logo, os ResultadosProcessados incorporados não devem ser apresentados como reprodução exata da série reponderada 2006–2024.

## Precisão

Cada linha agregada passou a armazenar:

- numerador ponderado;
- denominador ponderado;
- entrevistas não ponderadas;
- casos não ponderados;
- soma dos pesos ao quadrado.

O navegador utiliza esses componentes para calcular tamanho efetivo de Kish, erro-padrão, IC 95% e CV aproximados. Trata-se de uma aproximação, não de uma análise completa do desenho amostral.

## Testes executados

```text
Indicadores: 63
Linhas agregadas: 262.565
Linhas de idade detalhada: 2.651.417
Comparações principal × idade detalhada: 879
Métodos documentados: 63
Combinações indicador × gráfico: 819
Erros: 0
Falhas de renderização: 0
Avisos: 1 — pesos legados na base fornecida
```

## Segurança e publicação

- Foram removidas as credenciais padrão gravadas no JavaScript.
- A primeira utilização cria credenciais locais.
- A pasta `PainelPublicacao` não inclui administração, diagnósticos técnicos, scripts ou microdados.
- Os arquivos de reprodução e auditoria permanecem disponíveis na raiz.

## Fontes oficiais usadas na revisão

- Ministério da Saúde. *Vigitel Brasil 2006–2024*.
- Ministério da Saúde. *Vigitel Brasil 2023*.
- Dicionários de dados distribuídos com os microdados do projeto.

As referências e endereços estão detalhados em `ReferenciasEFontesOficiais.md`.
