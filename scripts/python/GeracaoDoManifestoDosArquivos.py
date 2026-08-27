"""Reconstrói o manifesto de tamanhos e assinaturas da distribuição organizada.

O próprio manifesto não recebe uma linha, porque qualquer assinatura gravada
dentro dele alteraria novamente o seu conteúdo. Todos os demais arquivos do
projeto são lidos em blocos para não manter as bases maiores inteiras na memória.
"""

from __future__ import annotations

import csv
import hashlib
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
DESTINO = RAIZ / "dados" / "metadados" / "ManifestoDosArquivos.csv"


def calcular_sha256(caminho: Path) -> str:
    """Calcula SHA256 em blocos para funcionar também com arquivos grandes."""
    assinatura = hashlib.sha256()
    with caminho.open("rb") as arquivo:
        for bloco in iter(lambda: arquivo.read(1024 * 1024), b""):
            assinatura.update(bloco)
    return assinatura.hexdigest()


def arquivos_da_distribuicao() -> list[Path]:
    """Lista arquivos do projeto em ordem estável, excetuando o manifesto."""
    return sorted(
        (
            caminho
            for caminho in RAIZ.rglob("*")
            if caminho.is_file() and caminho.resolve() != DESTINO.resolve()
        ),
        key=lambda caminho: caminho.name.casefold(),
    )


def principal() -> int:
    """Grava nome, tamanho e SHA256 dos arquivos verificáveis da distribuição."""
    with DESTINO.open("w", encoding="utf-8-sig", newline="") as arquivo:
        escritor = csv.writer(arquivo)
        escritor.writerow(("Arquivo", "TamanhoEmBytes", "CodigoSHA256"))
        for caminho in arquivos_da_distribuicao():
            escritor.writerow((caminho.relative_to(RAIZ).as_posix(), caminho.stat().st_size, calcular_sha256(caminho)))
    print(f"Manifesto atualizado: {len(arquivos_da_distribuicao())} arquivos verificáveis.")
    return 0


if __name__ == "__main__":
    raise SystemExit(principal())
