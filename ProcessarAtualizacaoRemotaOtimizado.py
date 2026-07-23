#!/usr/bin/env python3
"""Executa a atualização remota lendo CSVs grandes sem carregá-los inteiros na memória."""
from __future__ import annotations

import csv
from pathlib import Path

import pandas as pd

import ProcessarAtualizacaoRemota as processador


def ler_csv_em_blocos(fonte: Path, gravador: processador.AnnualWriter) -> None:
    """Detecta codificação e separador por uma amostra pequena e lê em blocos."""
    with fonte.open("rb") as arquivo:
        bruto = arquivo.read(250_000)

    amostra = ""
    codificacao = "utf-8-sig"
    for candidata in ("utf-8-sig", "utf-8", "latin1"):
        try:
            amostra = bruto.decode(candidata)
            codificacao = candidata
            break
        except UnicodeDecodeError:
            continue

    try:
        separador = csv.Sniffer().sniff(
            "\n".join(amostra.splitlines()[:30]), delimiters=",;\t|"
        ).delimiter
    except csv.Error:
        separador = ";" if amostra.count(";") > amostra.count(",") else ","

    for bloco in pd.read_csv(
        fonte,
        sep=separador,
        encoding=codificacao,
        chunksize=25_000,
        low_memory=True,
    ):
        gravador.write(bloco)


processador.read_csv_chunks = ler_csv_em_blocos

if __name__ == "__main__":
    raise SystemExit(processador.main())
