# Guia de atualização futura

## Antes de começar

Guarde uma cópia da última distribuição aprovada. Leia o dicionário da nova edição e identifique mudanças de nome, código, universo e peso amostral. Não presuma que uma variável mantém a mesma definição apenas porque o nome é semelhante.

## Inclusão de uma nova edição

Abra `paginas/AdministracaoDoObservatorio.html`, informe o dicionário da edição e selecione
os microdados oficiais. O sistema lê o ano existente nas linhas, em vez de
confiar somente no nome do arquivo, e exige:

- as colunas `ano`, `cidade`, `q6` e `q7`;
- a variável de peso correspondente;
- pelo menos 90% das linhas com peso positivo;
- as 27 capitais em cada edição;
- correspondência das variáveis essenciais com o dicionário;
- uma regra documentada para cada indicador calculado.

Arquivos incompletos são bloqueados. O pacote gerado contém a base agregada, o
complemento de idade detalhada, o catálogo, a metodologia, os resumos da
atualização, o dicionário normalizado, um relatório JSON e um manifesto SHA256.

O ZIP baixado pela área de Administração não publica nada sozinho. Extraia o pacote e
substitua, na raiz do projeto, apenas os arquivos que possuem o mesmo nome.

## Indicador ou tema novo

Uma variável nova no dicionário não é suficiente para criar um indicador. Para
inclusão automática, a tabela ou aba de indicadores precisa informar, no mínimo:

- `indicador_id`;
- `tema`;
- `indicador`;
- `descricao`;
- `variavel_principal`;
- `codigos_validos`;
- `codigos_evento`;
- `populacao`.

Sem esses campos, o indicador fica registrado como pendente no relatório e não
recebe valores. Essa regra evita inferir eventos ou denominadores que não foram
definidos pela documentação da edição.

## Alteração de uma regra

A regra canônica fica em `scripts/python/RecalculoDosIndicadores.py` e sua equivalente para a
área de Administração fica em `assets/js/admin/AtualizacaoDosDadosDoVigitel.js`. O script R serve como apoio
de conferência. Registre no comentário da função o motivo da mudança, as
variáveis utilizadas, os códigos válidos, o evento e o denominador. Evite
corrigir diretamente os arquivos de dados na raiz, porque eles são produtos do
recálculo.

## Regeneração e validação

Execute o recálculo, confira os relatórios e rode os testes abaixo:

```bash
python scripts/python/AuditoriaDaDocumentacao.py
python testes/ValidacaoDaBaseCompleta.py
node testes/TesteDosIndicadoresEGraficos.js
python testes/TesteDaAtualizacaoAutomatica.py
python testes/ValidacaoDaPublicacaoNoGitHub.py
```

Abra o painel em um navegador e confira filtros, comparação, tabelas, exportações, modo claro, modo escuro e telas estreitas. Uma atualização só deve ser publicada quando os testes terminarem sem pendências e a inspeção visual estiver concluída.

## Registro da atualização

Descreva a mudança no histórico, registre as fontes consultadas e gere novamente
o manifesto com `python scripts/python/GeracaoDoManifestoDosArquivos.py`. O próprio manifesto
fica fora da lista para evitar uma assinatura circular. Quando houver quebra de
comparabilidade, deixe a limitação explícita na metodologia e na documentação
da edição.
