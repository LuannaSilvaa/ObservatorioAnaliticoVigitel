#!/usr/bin/env python3
"""Executa a atualização remota de bases grandes com uso controlado de memória."""
from __future__ import annotations

import csv
import io
import sys
from pathlib import Path

import pandas as pd

import ProcessarAtualizacaoRemota as processador
import RecalculoDosIndicadores as calculador


def detectar_formato(fonte: Path) -> tuple[str, str, list[str]]:
    """Lê apenas uma amostra para detectar codificação, separador e cabeçalho."""
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

    leitor = csv.reader(io.StringIO(amostra), delimiter=separador)
    try:
        cabecalho = next(leitor)
    except StopIteration as erro:
        raise ValueError("O arquivo CSV está vazio.") from erro

    return codificacao, separador, cabecalho


def indices_necessarios(cabecalho: list[str]) -> list[int]:
    """Seleciona somente variáveis usadas pelo painel e a coluna de ano."""
    necessarias = set(calculador.required_columns())
    necessarias.update({
        "cidade", "q6", "q7", "pesorake", "pesorake2025",
        "q69_cor", "pesorake_cor",
    })

    selecionados: list[int] = []
    for indice, nome_original in enumerate(cabecalho):
        nome = processador.normalize(nome_original)
        if nome in necessarias or nome in processador.YEAR_NAMES:
            selecionados.append(indice)

    if not selecionados:
        raise ValueError("Nenhuma coluna necessária ao painel foi identificada no CSV.")
    return selecionados


def numero_ponderacao(serie: pd.Series) -> pd.Series:
    """Converte pesos com ponto ou vírgula decimal para valores numéricos."""
    if pd.api.types.is_numeric_dtype(serie):
        return pd.to_numeric(serie, errors="coerce")

    texto = serie.astype("string").str.strip()
    possui_virgula = texto.str.contains(",", regex=False, na=False)
    texto.loc[possui_virgula] = (
        texto.loc[possui_virgula]
        .str.replace(".", "", regex=False)
        .str.replace(",", ".", regex=False)
    )
    return pd.to_numeric(texto, errors="coerce")


def harmonizar_pesos(frame: pd.DataFrame) -> pd.DataFrame:
    """Usa o peso novo quando válido e completa suas ausências com o peso legado."""
    frame = processador.normalize_frame(frame.copy())

    possui_novo = "pesorake2025" in frame.columns
    possui_legado = "pesorake" in frame.columns

    if possui_novo:
        novo = numero_ponderacao(frame["pesorake2025"])
    else:
        novo = pd.Series(float("nan"), index=frame.index, dtype="float64")

    if possui_legado:
        legado = numero_ponderacao(frame["pesorake"])
    else:
        legado = pd.Series(float("nan"), index=frame.index, dtype="float64")

    peso_harmonizado = novo.where(novo.notna() & novo.gt(0), legado)
    if not peso_harmonizado.notna().any():
        raise ValueError("O bloco não possui pesos positivos em pesorake2025 nem em pesorake.")

    frame["pesorake2025"] = peso_harmonizado
    if not possui_legado:
        frame["pesorake"] = peso_harmonizado
    return frame


def ler_csv_em_blocos(fonte: Path, gravador: processador.AnnualWriter) -> None:
    """Lê apenas as colunas necessárias, em blocos pequenos, sem carregar o CSV inteiro."""
    codificacao, separador, cabecalho = detectar_formato(fonte)
    colunas = indices_necessarios(cabecalho)

    print(
        f"CSV detectado: separador={separador!r}; codificação={codificacao}; "
        f"colunas utilizadas={len(colunas)} de {len(cabecalho)}",
        flush=True,
    )

    total = 0
    for numero, bloco in enumerate(
        pd.read_csv(
            fonte,
            sep=separador,
            encoding=codificacao,
            usecols=colunas,
            chunksize=5_000,
            low_memory=False,
            dtype=str,
        ),
        start=1,
    ):
        gravador.write(bloco)
        total += len(bloco)
        if numero % 20 == 0:
            print(f"Linhas preparadas: {total:,}", flush=True)

    print(f"Preparação do CSV concluída: {total:,} linhas.", flush=True)


def imprimir_relatorios_de_validacao() -> None:
    """Envia os relatórios produzidos ao log antes que o workflow restaure a base anterior."""
    nomes = (
        "RelatorioDeValidacaoDosIndicadores.txt",
        "RelatorioDaValidacaoDaBase.txt",
        "RelatorioDosIndicadoresEGraficos.txt",
    )
    for nome in nomes:
        caminho = Path(__file__).resolve().parent / nome
        if not caminho.is_file():
            continue
        print(f"\n===== CONTEÚDO DE {nome} =====", file=sys.stderr, flush=True)
        print(caminho.read_text(encoding="utf-8", errors="replace"), file=sys.stderr, flush=True)


_escrita_anual_original = processador.AnnualWriter.write


def escrever_anualmente_com_peso_harmonizado(
    gravador: processador.AnnualWriter,
    frame: pd.DataFrame,
) -> None:
    """Harmoniza o peso antes de delegar a separação anual ao processador principal."""
    _escrita_anual_original(gravador, harmonizar_pesos(frame))


processador.AnnualWriter.write = escrever_anualmente_com_peso_harmonizado
processador.read_csv_chunks = ler_csv_em_blocos

if __name__ == "__main__":
    try:
        raise SystemExit(processador.main())
    except BaseException:
        imprimir_relatorios_de_validacao()
        raise
