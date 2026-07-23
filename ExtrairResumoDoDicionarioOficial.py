#!/usr/bin/env python3
"""Extrai do dicionário oficial as variáveis usadas pelo Observatório."""
from __future__ import annotations

import re
import unicodedata
from pathlib import Path

import pandas as pd

ARQUIVO = Path("/tmp/dicionario-vigitel-2006-2024.xlsx")
SAIDA = Path("ResumoDoDicionarioOficial.txt")

TERMOS = {
    "ano", "cidade", "sexo", "idade", "pesorake", "pesorake2025",
    "q6", "q7", "q35", "q36", "q42", "q45", "q46", "q60", "q64",
    "q67", "q68", "q74", "fumante", "exfuma", "alcabu", "direcao",
    "excpeso_i", "obesid_i", "feijao5", "frutareg", "hortareg",
    "flvreco", "refri5", "inativo", "inativo_2023", "has", "db",
    "hipertensao", "diabetes", "depressao", "mamo", "mamodois",
    "papa", "papatres", "q69_cor", "pesorake_cor",
}


def normalizar(valor: object) -> str:
    texto = unicodedata.normalize("NFKD", str(valor)).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9_]+", "_", texto).strip("_")


def linha_relevante(linha: pd.Series) -> bool:
    valores = {normalizar(valor) for valor in linha.tolist() if pd.notna(valor)}
    texto = " ".join(valores)
    return any(re.search(rf"(^|_)({re.escape(termo)})(_|$)", texto) for termo in TERMOS)


def main() -> None:
    livro = pd.ExcelFile(ARQUIVO)
    partes: list[str] = [
        "RESUMO DO DICIONÁRIO OFICIAL DO VIGITEL 2006-2024",
        "=" * 62,
        f"Planilhas: {', '.join(livro.sheet_names)}",
        "",
    ]

    for planilha in livro.sheet_names:
        bruto = pd.read_excel(livro, sheet_name=planilha, header=None, dtype=object)
        partes.extend([
            f"PLANILHA: {planilha}",
            "-" * 62,
            f"Dimensão: {bruto.shape[0]} linhas × {bruto.shape[1]} colunas",
            "",
            "PRIMEIRAS 12 LINHAS",
            bruto.head(12).to_string(index=True, header=False),
            "",
            "LINHAS RELACIONADAS ÀS VARIÁVEIS DO PAINEL",
        ])

        relevantes = bruto.loc[bruto.apply(linha_relevante, axis=1)]
        if relevantes.empty:
            partes.append("Nenhuma linha localizada.")
        else:
            partes.append(relevantes.to_string(index=True, header=False))
        partes.append("")

    SAIDA.write_text("\n".join(partes) + "\n", encoding="utf-8")
    print(f"Resumo gravado em {SAIDA}")


if __name__ == "__main__":
    main()
