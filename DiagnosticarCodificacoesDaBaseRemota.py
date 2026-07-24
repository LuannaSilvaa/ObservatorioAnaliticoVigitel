#!/usr/bin/env python3
"""Resume valores reais das variáveis que ainda impedem a publicação."""
from __future__ import annotations

import argparse
import csv
import io
import re
import unicodedata
from collections import Counter
from pathlib import Path

import pandas as pd

from HarmonizacaoPeloDicionarioOficial import aplicar_mapeamentos

ALVOS_EXATOS = {
    "ano", "cidade", "q6", "q7", "q29", "q35", "q36", "q40b", "q42",
    "q45", "q46", "q60", "q64", "q67", "q68", "q74", "q75", "q76",
    "r137a", "r153", "r154", "r155", "r156", "r178", "r190",
    "fumante", "exfuma", "alcabu", "direcao", "direcao_alc", "refri5",
    "refritl5", "freq", "time", "time_2023", "asma", "hart", "diab",
}
PADROES = (
    "asma", "dire", "blitz", "baf", "celular", "refri", "fuma", "alcool",
    "álcool", "habil", "cnh", "freq", "tempo", "time",
)


def normalizar(valor: object) -> str:
    texto = unicodedata.normalize("NFKD", str(valor)).encode("ascii", "ignore").decode().lower().strip()
    texto = re.sub(r"[^a-z0-9_]+", "_", texto)
    return re.sub(r"_+", "_", texto).strip("_")


def detectar(fonte: Path) -> tuple[str, str, list[str]]:
    with fonte.open("rb") as stream:
        bruto = stream.read(250_000)
    for codificacao in ("utf-8-sig", "utf-8", "latin1"):
        try:
            amostra = bruto.decode(codificacao)
            break
        except UnicodeDecodeError:
            continue
    else:
        codificacao, amostra = "latin1", bruto.decode("latin1")

    try:
        separador = csv.Sniffer().sniff(
            "\n".join(amostra.splitlines()[:30]), delimiters=",;\t|"
        ).delimiter
    except csv.Error:
        separador = ";" if amostra.count(";") > amostra.count(",") else ","
    cabecalho = next(csv.reader(io.StringIO(amostra), delimiter=separador))
    return codificacao, separador, cabecalho


def selecionar(cabecalho: list[str]) -> tuple[list[int], list[tuple[int, str, str]]]:
    encontrados: list[tuple[int, str, str]] = []
    for indice, original in enumerate(cabecalho):
        nome = normalizar(original)
        if nome in ALVOS_EXATOS or any(padrao in nome for padrao in PADROES):
            encontrados.append((indice, original, nome))
    return [indice for indice, _, _ in encontrados], encontrados


def resumo_contador(contador: Counter[str], limite: int = 20) -> str:
    if not contador:
        return "sem valores"
    return "; ".join(f"{valor!r}: {quantidade:,}" for valor, quantidade in contador.most_common(limite))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base", required=True)
    parser.add_argument("--saida", default="DiagnosticoDasCodificacoesDaBase.txt")
    args = parser.parse_args()

    fonte = Path(args.base)
    codificacao, separador, cabecalho = detectar(fonte)
    indices, encontrados = selecionar(cabecalho)
    if not indices:
        raise RuntimeError("Nenhuma variável de diagnóstico foi localizada.")

    brutos = {normalizado: Counter() for _, _, normalizado in encontrados}
    convertidos = {normalizado: Counter() for _, _, normalizado in encontrados}
    anos = Counter()
    total = 0

    for bloco in pd.read_csv(
        fonte,
        sep=separador,
        encoding=codificacao,
        usecols=indices,
        chunksize=20_000,
        dtype=str,
        low_memory=False,
    ):
        total += len(bloco)
        bloco_convertido = aplicar_mapeamentos(bloco)

        for original in bloco.columns:
            nome = normalizar(original)
            valores = bloco[original].astype("string").str.strip().dropna()
            brutos[nome].update(valores.tolist())

            valores_convertidos = bloco_convertido[original].astype("string").str.strip().dropna()
            convertidos[nome].update(valores_convertidos.tolist())

        coluna_ano = next((coluna for coluna in bloco.columns if normalizar(coluna) == "ano"), None)
        if coluna_ano:
            anos.update(bloco[coluna_ano].astype("string").str.strip().dropna().tolist())

        if total % 200_000 == 0:
            print(f"Linhas diagnosticadas: {total:,}", flush=True)

    linhas = [
        "DIAGNÓSTICO DAS CODIFICAÇÕES DA BASE REMOTA",
        "=" * 68,
        f"Arquivo: {fonte.name}",
        f"Linhas: {total:,}",
        f"Separador: {separador!r}",
        f"Codificação: {codificacao}",
        f"Colunas totais: {len(cabecalho)}",
        f"Colunas diagnosticadas: {len(encontrados)}",
        "",
        "ANOS",
        resumo_contador(anos, 30),
        "",
        "COLUNAS LOCALIZADAS",
    ]
    linhas.extend(f"{indice}: {original} -> {normalizado}" for indice, original, normalizado in encontrados)

    for _, original, nome in encontrados:
        linhas.extend([
            "",
            f"VARIÁVEL {original} ({nome})",
            f"  Bruto: {resumo_contador(brutos[nome])}",
            f"  Após dicionário: {resumo_contador(convertidos[nome])}",
        ])

    Path(args.saida).write_text("\n".join(linhas) + "\n", encoding="utf-8")
    print(f"Diagnóstico gravado em {args.saida}")


if __name__ == "__main__":
    main()
