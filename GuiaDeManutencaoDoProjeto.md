# Guia de Manutenção do Projeto

## Finalidade

Este documento orienta a atualização do Observatório Analítico de Indicadores do Vigitel sem romper a correspondência entre metodologia, dados, interface e testes.

## Sequência recomendada para uma atualização

1. conferir a edição do questionário e os dicionários das variáveis;
2. colocar os microdados em `Microdados`;
3. ajustar as regras somente em `RecalculoDosIndicadores.py`;
4. executar o recálculo completo;
5. executar os testes da base, dos gráficos, da atualização automática e da publicação;
6. abrir o painel em navegador e conferir modo claro, modo escuro, telas estreitas e exportações;
7. registrar a mudança em `HistoricoDeVersoes.md`.

## Responsabilidade dos módulos

- `index.html`: estrutura semântica, textos da página e ordem dos recursos carregados;
- `IdentidadeVisualDoObservatorio.css`: identidade visual, responsividade e temas;
- `SistemaAnaliticoDoVigitel.js`: estado da análise, filtros, agregação, gráficos, tabelas e exportações;
- `ConfiguracaoDoTema.js`: aplicação antecipada do tema escolhido;
- `InicializacaoDoObservatorio.js`: sequência de inicialização dos módulos;
- `GlossarioMetodologico.js`: conceitos e explicações contextuais;
- `InterfaceResponsiva.js`: abertura, fechamento e acessibilidade dos filtros em telas pequenas;
- `BaseAnaliticaDoVigitel.js`: base agregada gerada, consumida pelo navegador;
- `MetodologiaDosIndicadores.js`: definições metodológicas apresentadas na interface;
- `IdadeDetalhada`: catálogo e arquivos gerados por indicador;
- `Scripts`: preparação, recálculo e atualização da base;
- `Testes`: verificações que devem anteceder cada publicação.

## Cuidados ao alterar funções

Cada função possui um comentário sobre sua responsabilidade. Antes de modificar uma rotina, verifique quem a chama e quais valores ela devolve. Funções de agregação e filtragem afetam simultaneamente gráfico, tabela e downloads. Funções de aparência devem ser testadas em PNG e SVG. Controles novos dentro do painel de filtros devem continuar cobertos pela atualização automática centralizada.

## Arquivos gerados

Os arquivos de dados na raiz são produzidos pelos scripts de recálculo. Correções metodológicas devem ser feitas na rotina de origem, e não diretamente nos dados publicados. A edição manual desses arquivos pode ser perdida na atualização seguinte e pode criar diferenças entre a base principal e a idade detalhada.

## Verificações antes da publicação

```bash
python ValidacaoDaBaseCompleta.py
node TesteDosIndicadoresEGraficos.js
python TesteDaAtualizacaoAutomatica.py
python ValidacaoDaPublicacaoNoGitHub.py
```

A publicação só deve prosseguir quando os testes terminarem sem erros e a inspeção visual confirmar que filtros, gráficos, tabelas e downloads respondem às mudanças realizadas.
