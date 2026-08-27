"""Confere se a distribuição organizada está pronta para GitHub Pages."""
from __future__ import annotations
import re
import sys
from pathlib import Path
from urllib.parse import unquote, urlsplit

REPOSITORY = Path(__file__).resolve().parent.parent
HTML_PAGES = (
    REPOSITORY / "index.html",
    REPOSITORY / "paginas" / "InformacoesDoObservatorio.html",
    REPOSITORY / "paginas" / "AdministracaoDoObservatorio.html",
)
MAXIMUM_BROWSER_FILE_SIZE = 25 * 1024 * 1024

def local_reference(page: Path, value: str) -> Path | None:
    """Resolve uma referência HTML local em relação à página que a declarou."""
    value = value.strip()
    if not value or value.startswith(("#", "http://", "https://", "mailto:", "tel:", "data:", "javascript:")):
        return None
    path = unquote(urlsplit(value).path)
    return (page.parent / path).resolve() if path else None

def main() -> int:
    """Valida arquivos essenciais, referências locais, bundles e limites de tamanho."""
    errors: list[str] = []
    required = [
        "index.html", ".nojekyll", "robots.txt",
        "paginas/InformacoesDoObservatorio.html", "paginas/AdministracaoDoObservatorio.html",
        "assets/img/IdentidadeVisualDoObservatorio.svg",
        "assets/css/InterfaceVisualDoObservatorio.css",
        "assets/js/core/InicializacaoDoObservatorio.js",
        "assets/js/core/SistemaAnaliticoDoObservatorio.js",
        "assets/js/dados/BaseAnaliticaDoVigitel.js",
        "assets/js/dados/MetodologiaDosIndicadores.js",
        "assets/js/dados/CatalogoDeIdadeDetalhada.js",
    ]
    for rel in required:
        if not (REPOSITORY / rel).is_file():
            errors.append(f"Arquivo obrigatório ausente: {rel}")

    files = sorted(p for p in REPOSITORY.rglob("*") if p.is_file())
    bundles = sorted((REPOSITORY / "assets/js/dados/idade-detalhada").glob("DadosIdadeDetalhada*.js"))
    if len(bundles) != 9:
        errors.append(f"Esperados 9 arquivos temáticos de idade detalhada; encontrados {len(bundles)}.")

    for page in HTML_PAGES:
        if not page.is_file():
            continue
        html = page.read_text(encoding="utf-8")
        for value in re.findall(r"(?:src|href)=[\"']([^\"']+)[\"']", html, flags=re.I):
            target = local_reference(page, value)
            if target is not None and not target.is_file():
                errors.append(f"Referência local inexistente em {page.relative_to(REPOSITORY)}: {value}")

    for path in files:
        if path.stat().st_size > MAXIMUM_BROWSER_FILE_SIZE:
            errors.append(f"Arquivo acima de 25 MiB: {path.relative_to(REPOSITORY)}")

    largest = max(files, key=lambda x: x.stat().st_size, default=None)
    print("VALIDAÇÃO DA DISTRIBUIÇÃO ORGANIZADA PARA GITHUB PAGES")
    print("=" * 56)
    print(f"Arquivos totais: {len(files)}")
    print(f"Arquivos temáticos de idade detalhada: {len(bundles)}")
    if largest:
        print(f"Maior arquivo: {largest.relative_to(REPOSITORY)} ({largest.stat().st_size / 1024 / 1024:.2f} MiB)")
    print(f"Erros: {len(errors)}")
    for error in errors:
        print("ERRO: " + error)
    if errors:
        return 1
    print("Estrutura aprovada para publicação no GitHub Pages.")
    return 0

if __name__ == "__main__":
    sys.exit(main())
