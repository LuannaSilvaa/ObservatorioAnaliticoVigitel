"""Confere se o pacote pode ser publicado no GitHub Pages."""
from __future__ import annotations

import os
import re
import sys
from pathlib import Path
from urllib.parse import unquote, urlsplit

REPOSITORY = Path(__file__).resolve().parent
INDEX = REPOSITORY / "index.html"
REMOTE_MODE = os.environ.get("GITHUB_ACTIONS", "").lower() == "true"
MAXIMUM_FILE_SIZE = (99 if REMOTE_MODE else 25) * 1024 * 1024
MAXIMUM_BROWSER_FILES = 100
IGNORED_OPERATIONAL_DIRECTORIES = {".git", ".github", "Microdados", "__pycache__"}


def local_reference(value: str) -> Path | None:
    """Converte uma referência local do HTML em arquivo da raiz do projeto."""
    value = value.strip()
    if not value or value.startswith(("#", "http://", "https://", "mailto:", "data:", "javascript:")):
        return None
    path = unquote(urlsplit(value).path)
    return REPOSITORY / path.lstrip("/") if path else None


def main() -> int:
    """Sincroniza os derivados e valida arquivos essenciais, referências e limites."""
    errors: list[str] = []
    warnings: list[str] = []
    required = [
        "index.html", "IdentidadeVisualDoObservatorio.svg", "robots.txt", ".nojekyll",
        "IdentidadeVisualDoObservatorio.css", "SistemaAnaliticoDoVigitel.js",
        "InicializacaoDoObservatorio.js", "BaseAnaliticaDoVigitel.js",
        "MetodologiaDosIndicadores.js", "CatalogoDeIdadeDetalhada.js",
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

    from SincronizarArquivosDoObservatorio import synchronize
    from ValidarSincronizacaoDoObservatorio import main as validar_sincronizacao

    print("Sincronizando todos os arquivos derivados após a gravação dos metadados da base.")
    resumo = synchronize()
    print("Resumo da sincronização:", resumo)

    print("Executando a validação obrigatória dos arquivos sincronizados.")
    if validar_sincronizacao() != 0:
        return 1

    print("Pacote e arquivos derivados aprovados para publicação na raiz do GitHub Pages.")

    if REMOTE_MODE:
        from PrepararPublicacaoEmPartes import main as preparar_publicacao

        print("Iniciando o pré-envio dos arquivos grandes em partes.")
        preparar_publicacao()

    return 0


if __name__ == "__main__":
    sys.exit(main())
