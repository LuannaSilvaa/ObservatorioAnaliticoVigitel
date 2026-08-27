# Observatório Analítico de Indicadores do Vigitel

Esta distribuição reúne, em uma única raiz, o painel publicável, os testes, os
scripts de recálculo e a documentação de manutenção. A organização plana é
compatível com a publicação do GitHub Pages pela branch principal e pela pasta
`/(root)`.

## Revisão metodológica incorporada

- As 63 regras de indicadores permanecem centralizadas no gerador
  `scripts/python/RecalculoDosIndicadores.py` e possuem equivalentes explícitas no atualizador
  do navegador.
- `TAB07` e `TAB08` usam a série revista de fumo passivo: `q67` e `q68`, a
  partir de 2018, incluindo fumantes expostos no numerador.
- `AF08` prioriza `inativo_2023` quando a variável revista está disponível;
  `inativo` permanece como alternativa para arquivos anuais legados.
- O fluxo de blitz e bafômetro usa `r153 → r137a → r154 → r155 → r156`.
- O gerador prioriza `pesorake2025`; quando ela não existe, usa `pesorake` e
  registra a limitação nos metadados.
- O painel mostra casos, entrevistas, IC 95% aproximado, CV aproximado e
  sinalização de precisão.
- A área de Administração usa usuário e derivação PBKDF2-SHA256 registrados em
  `assets/js/admin/ConfiguracaoDaAdministracao.js`; a senha não fica legível no código.

## Limitação da base incluída

A base incorporada contém as edições de 2006 a 2021, 2023 e 2024; não há
edição 2022 nos arquivos recebidos. A inclusão de 2024 foi calculada diretamente
de 27.048 entrevistas das 27 capitais e utiliza `pesorake2025`.

As séries anteriores permanecem com os pesos presentes nos arquivos anuais de
origem. Por isso, o painel identifica o conjunto como **misto, legado e
harmonizado**: a edição nova é reproduzível com o peso harmonizado, mas o
histórico ainda não representa uma reponderação integral de 2006–2024.

Para incorporar outra edição, abra `paginas/AdministracaoDoObservatorio.html`,
selecione o dicionário e os microdados e gere o pacote de atualização. Para uma
reprodução integral por linha de comando, use `scripts/python/RecalculoDosIndicadores.py`.
`scripts/python/AtualizacaoDaBaseOficial.py` permanece disponível para conferir e instalar um
pacote histórico completamente harmonizado.

## Recalcular tudo

Na raiz:

```bash
python scripts/python/RecalculoDosIndicadores.py
```

O comando reconstrói a base analítica, a metodologia, os nove arquivos
temáticos de idade detalhada e os relatórios de processamento. O script
`scripts/r/PreparacaoDosDadosDoVigitel.R` documenta as mesmas regras.
`scripts/r/RecalculoPorIdadeDetalhada.R` chama o gerador Python canônico para evitar duas
implementações divergentes.

## Validar

```bash
python scripts/python/AuditoriaDaDocumentacao.py
python scripts/python/GeracaoDoCatalogoDeFuncoes.py
python scripts/python/GeracaoDoManifestoDosArquivos.py
python testes/ValidacaoDaBaseCompleta.py
node testes/TesteDosIndicadoresEGraficos.js
python testes/TesteDaAtualizacaoAutomatica.py
python testes/ValidacaoDaPublicacaoNoGitHub.py
```

Resultados da base incorporada:

- 63 indicadores;
- 275.575 linhas agregadas;
- 2.782.400 linhas de idade detalhada;
- 923 comparações entre a base principal e a idade detalhada;
- 819 combinações de indicador e gráfico renderizadas;
- zero erros nos testes configurados.

Há um aviso esperado: a edição 2024 usa `pesorake2025`, enquanto as séries
anteriores preservam os pesos de origem.

## Abrir o painel

Use um servidor local, em vez de abrir o HTML diretamente:

```bash
python -m http.server 8000
```

Acesse `http://localhost:8000`.

## Administração e atualização

A área administrativa acompanha a distribuição e pode ser acessada pelo botão
**Administração**. O usuário fica na configuração e a senha é comparada pela derivação
PBKDF2-SHA256; a sessão permanece somente na aba e expira automaticamente.

- Abra a página por um servidor local ou pelo endereço do GitHub Pages.
- Selecione o dicionário e os microdados oficiais em CSV, XLS, XLSX ou XLSM.
- Processe os arquivos e resolva qualquer erro bloqueador antes de gerar o ZIP.
- Extraia o pacote gerado e substitua os arquivos correspondentes na raiz.
- Troque a credencial antes da publicação com
  `python scripts/python/GeracaoDaCredencialAdministrativa.py`.

Como o GitHub Pages é estático, a tela de login controla a interface, mas não
equivale a autenticação no servidor. A área de Administração não recebe token e não altera o
GitHub diretamente.

## Precisão estatística

O painel calcula uma aproximação de IC 95% e CV usando o tamanho efetivo de
Kish, a partir da soma dos pesos e da soma dos pesos ao quadrado. A sinalização
adotada é:

- baixa precisão: 20 casos ou menos, ou CV aproximado igual ou superior a 35%;
- cautela: CV aproximado entre 20% e 35%;
- maior precisão relativa: demais situações.

Essas medidas são auxiliares e não substituem a estimação completa com
estratos, conglomerados e demais elementos do desenho amostral.

## Arquivos principais

Todos os arquivos publicáveis, scripts, testes e documentos ficam na raiz.
`documentacao/MapaDosArquivosDoProjeto.md` descreve a função de cada grupo sem depender de
pastas internas.

## Atualização automática integral

- Centralização dos eventos de filtros e aparência.
- Atualização imediata ao alterar ano, sexo, população, região, UF, idade,
  recorte, comparação ou configuração visual.
- Suporte automático a novos campos adicionados futuramente à lateral de
  filtros.
- Cancelamento de renderizações antigas quando várias alterações são feitas em
  sequência.
