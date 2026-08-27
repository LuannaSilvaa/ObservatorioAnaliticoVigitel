# Guia de publicação no GitHub

## Estrutura desta versão

O projeto usa uma estrutura organizada em pastas. O `index.html` permanece na raiz e referencia os recursos em `assets/`, enquanto as páginas secundárias ficam em `paginas/`. Não achate nem renomeie as pastas antes de publicar.

## Envio dos arquivos

A forma mais segura é enviar a pasta do projeto com Git. Se preferir a interface do GitHub, mantenha exatamente a hierarquia de diretórios existente no ZIP.

```bash
git add .
git commit -m "Organizar estrutura do Observatório Vigitel"
git push origin main
```

## Ativação do GitHub Pages

1. abra **Settings**;
2. selecione **Pages**;
3. em **Source**, escolha **Deploy from a branch**;
4. selecione a branch **main** e a pasta **/(root)**;
5. clique em **Save**.

## Conferência antes da publicação

Execute, a partir da raiz:

```bash
python testes/ValidacaoDaBaseCompleta.py
python testes/TesteDaAtualizacaoAutomatica.py
python testes/ValidacaoDaPublicacaoNoGitHub.py
```

O validador de publicação confere as páginas HTML, as referências locais, os nove arquivos temáticos de idade detalhada e os tamanhos dos arquivos.
