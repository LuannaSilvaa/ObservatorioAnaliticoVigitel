"""Confere se o pacote pode ser publicado no GitHub Pages."""
from __future__ import annotations

import os
import re
import subprocess
import sys
from pathlib import Path
from urllib.parse import unquote, urlsplit

REPOSITORY = Path(__file__).resolve().parent
INDEX = REPOSITORY / "index.html"
REMOTE_MODE = os.environ.get("GITHUB_ACTIONS", "").lower() == "true"
MAXIMUM_FILE_SIZE = (99 if REMOTE_MODE else 25) * 1024 * 1024
MAXIMUM_BROWSER_FILES = 100
IGNORED_OPERATIONAL_DIRECTORIES = {".git", ".github", "Microdados", "__pycache__"}
AUDIT_FILE = "AuditoriaDasContagensDoVigitel.json"
AGE_AUDIT_SCRIPT = "AuditarIdadeDetalhada.py"
AGE_AUDIT_REPORT = "RelatorioDaAuditoriaDaIdadeDetalhada.txt"


def local_reference(value: str) -> Path | None:
    """Converte uma referência local do HTML em arquivo da raiz do projeto."""
    value = value.strip()
    if not value or value.startswith(("#", "http://", "https://", "mailto:", "data:", "javascript:")):
        return None
    path = unquote(urlsplit(value).path)
    return REPOSITORY / path.lstrip("/") if path else None


def registrar_auditoria_no_historico_tecnico() -> None:
    """Inclui a auditoria no histórico local antes da promoção atômica."""
    if not REMOTE_MODE:
        return
    resultado = subprocess.run(
        ["git", "status", "--porcelain", "--", AUDIT_FILE],
        cwd=REPOSITORY,
        check=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        capture_output=True,
    )
    if not resultado.stdout.strip():
        return
    subprocess.run(
        ["git", "config", "user.name", "Observatório Vigitel - Administração remota"],
        cwd=REPOSITORY,
        check=True,
    )
    subprocess.run(
        [
            "git",
            "config",
            "user.email",
            "41898282+github-actions[bot]@users.noreply.github.com",
        ],
        cwd=REPOSITORY,
        check=True,
    )
    subprocess.run(["git", "add", "--", AUDIT_FILE], cwd=REPOSITORY, check=True)
    subprocess.run(
        ["git", "commit", "-m", "Atualiza a auditoria permanente das contagens do Vigitel"],
        cwd=REPOSITORY,
        check=True,
    )


def main() -> int:
    """Sincroniza os derivados e valida arquivos essenciais, referências e limites."""
    errors: list[str] = []
    warnings: list[str] = []
    required = [
        "index.html", "IdentidadeVisualDoObservatorio.svg", "robots.txt", ".nojekyll",
        "IdentidadeVisualDoObservatorio.css", "SistemaAnaliticoDoVigitel.js",
        "InicializacaoDoObservatorio.js", "BaseAnaliticaDoVigitel.js",
        "MetodologiaDosIndicadores.js", "CatalogoDeIdadeDetalhada.js",
        AUDIT_FILE, "PreservarAuditoriaDasContagens.py", AGE_AUDIT_SCRIPT,
    ]
    for name in required:
        if not (REPOSITORY / name).is_file():
            errors.append(f"Arquivo obrigatório ausente: {name}")

    files = sorted(path for path in REPOSITORY.iterdir() if path.is_file())
    directories = sorted(path.name for path in REPOSITORY.iterdir() if path.is_dir())
    unexpected_directories = [
        name for name in directories
        if not (REMOTE_MODE and name in IGNORED_OPERATIONAL_DIRECTORIES)
    ]
    if unexpected_directories:
        errors.append("O pacote público contém pastas inesperadas: " + ", ".join(unexpected_directories))

    if not REMOTE_MODE and len(files) > MAXIMUM_BROWSER_FILES:
        errors.append(f"Há {len(files)} arquivos; o envio único pelo navegador aceita até {MAXIMUM_BROWSER_FILES}.")

    bundles = sorted(REPOSITORY.glob("DadosIdadeDetalhada*.js"))
    if len(bundles) != 9:
        errors.append(f"Esperados 9 arquivos temáticos de idade detalhada; encontrados {len(bundles)}.")

    if INDEX.is_file():
        html = INDEX.read_text(encoding="utf-8")
        for value in re.findall(r"(?:src|href)=[\"']([^\"']+)[\"']", html, flags=re.I):
            path = local_reference(value)
            if path is not None and not path.is_file():
                errors.append(f"Referência local inexistente no HTML: {value}")
        if re.search(r"(?:Dados|Recursos|Reproducao)/", html):
            errors.append("O HTML ainda possui caminhos de pastas da versão anterior.")

    largest = max(files, key=lambda path: path.stat().st_size, default=None)
    for path in files:
        if path.stat().st_size >= MAXIMUM_FILE_SIZE:
            errors.append(
                f"Arquivo acima do limite de {MAXIMUM_FILE_SIZE / 1024 / 1024:.0f} MiB: {path.name}"
            )
        elif REMOTE_MODE and path.stat().st_size > 25 * 1024 * 1024:
            warnings.append(
                f"{path.name} possui {path.stat().st_size / 1024 / 1024:.2f} MiB; "
                "aceito no envio remoto, mas não no editor de arquivos do navegador."
            )

    mode = "GITHUB ACTIONS" if REMOTE_MODE else "ENVIO PELO NAVEGADOR"
    print(f"VALIDAÇÃO DO PACOTE PARA PUBLICAÇÃO — {mode}")
    print("=" * 58)
    print(f"Arquivos na raiz: {len(files)}")
    print(f"Arquivos temáticos de idade detalhada: {len(bundles)}")
    if largest:
        print(f"Maior arquivo: {largest.name} ({largest.stat().st_size / 1024 / 1024:.2f} MiB)")
    print(f"Erros: {len(errors)}")
    print(f"Avisos: {len(warnings)}")
    for error in errors:
        print("ERRO: " + error)
    for warning in warnings:
        print("AVISO: " + warning)
    if errors:
        return 1

    from AuditarIdadeDetalhada import main as auditar_idade_detalhada
    from PreservarAuditoriaDasContagens import main as preservar_contagens
    from SincronizarArquivosDoObservatorio import synchronize
    from ValidarSincronizacaoDoObservatorio import main as validar_sincronizacao

    print("Executando a auditoria integral da idade detalhada antes da sincronização.")
    if auditar_idade_detalhada() != 0:
        print(
            "A publicação foi interrompida porque a idade detalhada não reproduz "
            "integralmente a base principal."
        )
        return 1
    if not (REPOSITORY / AGE_AUDIT_REPORT).is_file():
        print("A auditoria terminou sem produzir o relatório obrigatório.")
        return 1

    print("Sincronizando todos os arquivos derivados após a auditoria da idade detalhada.")
    resumo = synchronize()
    print("Resumo da sincronização:", resumo)

    print("Preservando ou restaurando a auditoria das contagens diretas.")
    if preservar_contagens() != 0:
        return 1
    registrar_auditoria_no_historico_tecnico()

    print("Executando a validação obrigatória dos arquivos sincronizados.")
    if validar_sincronizacao() != 0:
        return 1

    print("Pacote, idade detalhada e arquivos derivados aprovados para publicação no GitHub Pages.")

    if REMOTE_MODE:
        from PrepararPublicacaoEmPartes import main as preparar_publicacao

        print("Iniciando o pré-envio dos arquivos grandes em partes.")
        if preparar_publicacao() != 0:
            return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
