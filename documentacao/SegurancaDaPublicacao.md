# Segurança e publicação

## O que a credencial protege

`paginas/AdministracaoDoObservatorio.html` possui uma credencial local. O usuário fica
visível em `assets/js/admin/ConfiguracaoDaAdministracao.js`, mas a senha não é gravada em texto:
o arquivo conserva sal, número de iterações e resultado PBKDF2-SHA256. A sessão
fica em `sessionStorage`, vale somente para a aba atual e expira após trinta
minutos.

Para trocar a credencial, execute:

```bash
python scripts/python/GeracaoDaCredencialAdministrativa.py
```

O script solicita a senha sem mostrá-la na tela e atualiza somente a derivação.

## Limite de uma página estática

O GitHub Pages entrega arquivos públicos. Uma verificação feita por JavaScript
controla a interface, mas não equivale a autenticação em servidor. Uma pessoa
com acesso ao código pode estudar ou contornar a tela de login.

Por esse motivo, a área de Administração não recebe token, não faz commit e não grava
arquivos no repositório. Ela lê os arquivos escolhidos no próprio navegador e
gera `AtualizacaoDoObservatorio.zip`. A substituição no GitHub continua
dependendo das permissões da conta responsável.

Essa separação evita que uma senha ou um token capaz de alterar o repositório
seja publicado junto com o site.

## Dados tratados no navegador

Os microdados e dicionários selecionados não são enviados pelo código da área
de Administração. A leitura, a conferência, os cálculos, as assinaturas SHA256 e a
compactação ocorrem localmente no navegador.

Os microdados individuais não devem ser adicionados ao repositório público. O
pacote de atualização contém somente resultados agregados, dicionário,
metodologia, resumos e relatório de conferência.

## Ambiente institucional

Se futuramente for necessário publicar diretamente pela área de Administração, o projeto
precisará de backend com:

- autenticação no servidor;
- senha armazenada com algoritmo forte e sal;
- autorização por função;
- HTTPS;
- trilha de auditoria;
- validação de arquivos no servidor;
- armazenamento fora da pasta pública;
- backup e recuperação;
- segredo ou token nunca incluído no código do navegador.
