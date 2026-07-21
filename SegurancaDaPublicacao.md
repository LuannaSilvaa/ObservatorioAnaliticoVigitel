# Segurança e publicação — v13.0

## Painel público

Use a pasta `PainelPublicacao` do pacote unificado. Ela não contém:

- botão ou diálogo administrativo;
- `AdministracaoLocal.js`;
- `Diagnosticos.js`;
- microdados individuais;
- scripts de recálculo;
- credenciais;
- arquivos de teste.

Ela contém apenas os recursos necessários para consulta e visualização da base agregada.

## Pasta de reprodução

Os arquivos de reprodução e manutenção ficam na raiz e podem ser usados localmente.

No primeiro acesso, o navegador solicita a criação de login e senha. Nenhuma credencial padrão está gravada no código. O hash é armazenado no `localStorage` do navegador.

Essa proteção serve apenas para impedir acesso casual no mesmo navegador. Ela não oferece autenticação de servidor, controle de usuários, auditoria centralizada ou proteção contra alguém que tenha acesso aos arquivos locais.

## Publicação em servidor

Para um ambiente institucional com importação de dados, utilize backend com:

- autenticação no servidor;
- senhas com hash forte e salt;
- autorização por função;
- HTTPS;
- trilha de auditoria;
- validação de arquivos no servidor;
- armazenamento fora da pasta pública;
- política de backup e recuperação.

Não publique microdados ou informações sigilosas. Os arquivos agregados e os scripts desta distribuição podem permanecer no repositório público.
