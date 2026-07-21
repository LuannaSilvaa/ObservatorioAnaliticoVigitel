"""Confere se o pacote plano pode ser publicado no GitHub Pages pelo navegador."""
from __future__ import annotations
import re
import sys
from pathlib import Path
from urllib.parse import unquote, urlsplit

REPOSITORY = Path(__file__).resolve().parent
INDEX = REPOSITORY / "index.html"
MAXIMUM_BROWSER_FILE_SIZE = 25 * 1024 * 1024
MAXIMUM_BROWSER_FILES = 100


def local_reference(value: str) -> Path | None:
    """Converte uma referência local do HTML em arquivo da raiz do projeto."""
    value = value.strip()
    if not value or value.startswith(("#", "http://", "https://", "mailto:", "data:", "javascript:")):
        return None
    path = unquote(urlsplit(value).path)
    return REPOSITORY / path.lstrip("/") if path else None


def main() -> int:
    """Valida arquivos essenciais, referências, quantidade e tamanhos."""
    errors: list[str] = []
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
    if directories:
        errors.append("O pacote deveria estar sem pastas, mas contém: " + ", ".join(directories))
    if len(files) > MAXIMUM_BROWSER_FILES:
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
        if path.stat().st_size > MAXIMUM_BROWSER_FILE_SIZE:
            errors.append(f"Arquivo acima de 25 MiB para upload pelo navegador: {path.name}")

    print("VALIDAÇÃO DO PACOTE PLANO PARA GITHUB PAGES")
    print("=" * 48)
    print(f"Arquivos na raiz: {len(files)}")
    print(f"Arquivos temáticos de idade detalhada: {len(bundles)}")
    if largest:
        print(f"Maior arquivo: {largest.name} ({largest.stat().st_size / 1024 / 1024:.2f} MiB)")
    print(f"Erros: {len(errors)}")
    for error in errors:
        print("ERRO: " + error)
    if errors:
        return 1
    print("Pacote aprovado para envio pelo navegador e publicação na raiz.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
