"""Atualiza a credencial local da área administrativa sem gravar a senha em texto.

Execute este arquivo na raiz do projeto antes de uma publicação quando precisar
trocar o usuário ou a senha. O resultado é aplicado diretamente em
ConfiguracaoDaAdministracao.js.
"""

from __future__ import annotations

import base64
import getpass
import hashlib
import re
import secrets
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
CONFIGURACAO = RAIZ / "assets" / "js" / "admin" / "ConfiguracaoDaAdministracao.js"
ITERACOES = 210_000


def derivar_senha(senha: str, sal: bytes) -> str:
    """Deriva a senha por PBKDF2-SHA256 e devolve o resultado em Base64."""
    resultado = hashlib.pbkdf2_hmac("sha256", senha.encode("utf-8"), sal, ITERACOES, dklen=32)
    return base64.b64encode(resultado).decode("ascii")


def substituir_campo(texto: str, campo: str, valor: str | int) -> str:
    """Substitui um campo simples do objeto JavaScript sem alterar os comentários."""
    representacao = str(valor) if isinstance(valor, int) else f'"{valor}"'
    padrao = rf"({re.escape(campo)}:\s*)(?:\"[^\"]*\"|\d+)"
    atualizado, quantidade = re.subn(padrao, rf"\g<1>{representacao}", texto, count=1)
    if quantidade != 1:
        raise RuntimeError(f"Campo não localizado na configuração: {campo}")
    return atualizado


def main() -> int:
    """Solicita a nova credencial, deriva a senha e atualiza a configuração."""
    usuario = input("Novo usuário administrativo: ").strip()
    if not 3 <= len(usuario) <= 40:
        raise SystemExit("O usuário deve ter entre 3 e 40 caracteres.")

    senha = getpass.getpass("Nova senha (mínimo de 12 caracteres): ")
    confirmacao = getpass.getpass("Confirme a nova senha: ")
    if senha != confirmacao:
        raise SystemExit("As senhas não coincidem.")
    if len(senha) < 12:
        raise SystemExit("A senha deve ter pelo menos 12 caracteres.")

    sal = secrets.token_bytes(16)
    texto = CONFIGURACAO.read_text(encoding="utf-8")
    texto = substituir_campo(texto, "usuario", usuario)
    texto = substituir_campo(texto, "iteracoes", ITERACOES)
    texto = substituir_campo(texto, "sal", base64.b64encode(sal).decode("ascii"))
    texto = substituir_campo(texto, "senhaDerivada", derivar_senha(senha, sal))
    CONFIGURACAO.write_text(texto, encoding="utf-8")
    print("Credencial atualizada. A senha não foi gravada em texto.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
