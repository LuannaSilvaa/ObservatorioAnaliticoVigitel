# Guia de Manutenção do Projeto

## Finalidade

Este documento orienta a atualização do Observatório Analítico de Indicadores
do Vigitel sem romper a correspondência entre metodologia, dados, interface e
testes.

## Sequência recomendada para uma atualização

1. confira a edição do questionário e o dicionário das variáveis;
2. abra `paginas/AdministracaoDoObservatorio.html` por um servidor local;
3. selecione o dicionário e os microdados oficiais;
4. processe os arquivos e resolva todos os erros bloqueadores;
5. gere o pacote e substitua os arquivos correspondentes na raiz;
6. quando houver mudança metodológica, ajuste a regra em
   `scripts/python/RecalculoDosIndicadores.py` e em `assets/js/admin/AtualizacaoDosDadosDoVigitel.js`;
7. execute os testes da base, dos gráficos, da atualização automática e da
   publicação;
8. confira modo claro, modo escuro, telas estreitas e exportações no navegador;
9. registre a mudança em `documentacao/HistoricoDeVersoes.md`.

## Responsabilidade dos módulos

- `index.html`: estrutura semântica, textos e ordem dos recursos;
- `assets/css/InterfaceVisualDoObservatorio.css`: identidade visual, responsividade e temas;
- `assets/js/core/SistemaAnaliticoDoObservatorio.js`: estado, filtros, agregação, gráficos, tabelas e exportações;
- `assets/js/core/ConfiguracaoRenovadaDoTema.js`: aplicação antecipada do tema escolhido;
- `assets/js/core/InicializacaoDoObservatorio.js`: sequência de inicialização;
- `assets/js/core/GlossarioMetodologico.js`: conceitos e explicações contextuais;
- `assets/js/core/InterfaceCompartilhavelDoObservatorio.js`: acessibilidade dos filtros em telas pequenas;
- `assets/js/dados/BaseAnaliticaDoVigitel.js`: base agregada consumida pelo navegador;
- `assets/js/dados/MetodologiaDosIndicadores.js`: definições metodológicas dos indicadores;
- `paginas/AdministracaoDoObservatorio.html`: login e fluxo de atualização;
- `assets/js/admin/AdministracaoDoObservatorio.js`: sessão e controles da área de Administração;
- `assets/js/admin/AtualizacaoDosDadosDoVigitel.js`: leitura, validação, cálculo e geração do pacote;
- `assets/js/admin/ConfiguracaoDaAdministracao.js`: usuário e derivação da credencial;
- `scripts/python/GeracaoDaCredencialAdministrativa.py`: troca local da credencial;
- `DadosIdadeDetalhada...js`: nove arquivos temáticos carregados sob demanda;
- scripts Python, R e JavaScript na raiz: reprodução e testes de publicação.

## Cuidados ao alterar funções

Cada função possui um comentário sobre sua responsabilidade. Antes de modificar
uma rotina, verifique quem a chama e quais valores ela devolve. Funções de
agregação e filtragem afetam gráfico, tabela e downloads. Funções de aparência
devem ser testadas em PNG e SVG. Controles novos dentro do painel de filtros
devem continuar cobertos pela atualização automática centralizada.

O catálogo pode ser reconstruído depois de uma alteração:

```bash
python scripts/python/GeracaoDoCatalogoDeFuncoes.py
```

## Arquivos gerados

Os arquivos de dados na raiz são produzidos pelos scripts de recálculo ou pela
área de Administração. Correções metodológicas devem ser feitas na rotina de origem, e não
diretamente nos dados publicados.

`assets/js/dados/idade-detalhada/AtualizacaoDaIdadeDetalhada.js` é criado pela área de Administração. Ele substitui somente
os anos processados e preserva as séries anteriores. Um indicador novo só é
incluído quando o dicionário fornece identificador, tema, descrição, variável,
códigos válidos, códigos de evento e população.

## Verificações antes da publicação

```bash
python scripts/python/AuditoriaDaDocumentacao.py
python scripts/python/GeracaoDoCatalogoDeFuncoes.py
python scripts/python/GeracaoDoManifestoDosArquivos.py
python testes/ValidacaoDaBaseCompleta.py
node testes/TesteDosIndicadoresEGraficos.js
python testes/TesteDaAtualizacaoAutomatica.py
python testes/ValidacaoDaPublicacaoNoGitHub.py
```

A publicação só deve prosseguir quando os testes terminarem sem erros e a
inspeção visual confirmar que filtros, gráficos, tabelas e downloads respondem
às mudanças realizadas.
