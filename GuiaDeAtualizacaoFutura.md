# Guia de atualização futura

## Antes de começar

Guarde uma cópia da última distribuição aprovada. Leia o dicionário da nova edição e identifique mudanças de nome, código, universo e peso amostral. Não presuma que uma variável mantém a mesma definição apenas porque o nome é semelhante.

## Inclusão de uma nova edição

Coloque o microdado na coleção de reprodução com um nome descritivo, sem algarismos, hífen ou sublinhado. Atualize o mapa de anos nos scripts Python e R. Depois, revise o peso que deve ser usado e confirme se cada indicador continua metodologicamente comparável.

## Alteração de uma regra

A regra canônica fica em `RecalculoDosIndicadores.py`. O script R serve como apoio de conferência. Registre no comentário da função o motivo da mudança, as variáveis utilizadas, os códigos válidos, o evento e o denominador. Evite corrigir diretamente os arquivos de dados na raiz, porque eles são produtos do recálculo.

## Regeneração e validação

Execute o recálculo, confira os relatórios e rode os testes abaixo:

```bash
python AuditoriaDaDocumentacao.py
python ValidacaoDaBaseCompleta.py
node TesteDosIndicadoresEGraficos.js
python TesteDaAtualizacaoAutomatica.py
python ValidacaoDaPublicacaoNoGitHub.py
```

Abra o painel em um navegador e confira filtros, comparação, tabelas, exportações, modo claro, modo escuro e telas estreitas. Uma atualização só deve ser publicada quando os testes terminarem sem pendências e a inspeção visual estiver concluída.

## Registro da atualização

Descreva a mudança no histórico, registre as fontes consultadas e gere novamente o manifesto dos arquivos. Quando houver quebra de comparabilidade, deixe a limitação explícita na metodologia e na documentação da edição.
