# Guia de publicação no GitHub

## Estrutura desta versão

Todos os arquivos estão na mesma pasta. O `index.html`, os estilos, os scripts e os dados devem aparecer diretamente na página inicial do repositório. Não envie o arquivo ZIP: extraia o pacote e envie o conteúdo.

A versão possui menos de cem arquivos e nenhum deles ultrapassa 25 MiB, permitindo o envio pelo navegador em uma única seleção.

## Envio dos arquivos

1. abra o repositório `ObservatorioAnaliticoVigitel`;
2. escolha **Add file** e **Upload files**;
3. selecione todos os arquivos extraídos, sem selecionar a pasta externa nem o ZIP;
4. use o resumo `Adicionar versão inicial`;
5. confirme em **Commit changes**.

## Ativação do GitHub Pages

1. abra **Settings**;
2. selecione **Pages**;
3. em **Source**, escolha **Deploy from a branch**;
4. selecione a branch **main** e a pasta **/(root)**;
5. clique em **Save**.

## Conferência

Após a publicação, confira a página inicial, a seleção dos indicadores, os filtros, os gráficos, a idade detalhada, o modo escuro e as exportações. O arquivo `ValidacaoDaPublicacaoNoGitHub.py` verifica previamente a estrutura plana, os caminhos e os limites de upload.
