#!/usr/bin/env python3
"""Extrai do dicionário oficial as codificações usadas pelas regras pendentes."""
from __future__ import annotations

import re
import unicodedata
from pathlib import Path

import pandas as pd

ARQUIVO = Path("/tmp/dicionario-vigitel-2006-2024.xlsx")
SAIDA = Path("ResumoDoDicionarioOficial.txt")

VARIAVEIS_ALVO = {
    "q29", "q35", "q36", "q40b", "q42", "q45", "q46", "q60", "q64",
    "q67", "q68", "q74", "q76", "r137a", "r153", "r154", "r155",
    "r156", "r178", "r190", "asma", "direcao", "direcao_alc",
    "fumante", "exfuma", "alcabu", "refri5", "refritl5", "freq", "time",
    "time_2023", "ativo_livre", "inativo", "inativo_2023",
}

TERMOS_ROTINA = {
    "fumante nao diario", "consumo de bebida alcoolica", "consumo semanal",
    "refrigerante", "frequencia", "duracao", "muito boa", "asma",
    "direcao", "blitz", "bafometro", "celular",
}


def normalizar(valor: object) -> str:
    texto = unicodedata.normalize("NFKD", str(valor)).encode("ascii", "ignore").decode().lower().strip()
    texto = re.sub(r"[^a-z0-9_]+", "_", texto)
    return re.sub(r"_+", "_", texto).strip("_")


def formatar_valor(valor: object) -> str:
    if pd.isna(valor):
        return ""
    return str(valor).replace("\n", "\\n")


def extrair_blocos_variaveis(bruto: pd.DataFrame) -> list[str]:
    dados = bruto.iloc[3:, :7].copy()
    nomes = dados.iloc[:, 0].ffill().map(normalizar)
    linhas: list[str] = []

    for variavel in sorted(VARIAVEIS_ALVO):
        bloco = dados.loc[nomes.eq(variavel)]
        if bloco.empty:
            linhas.append(f"VARIÁVEL {variavel}: NÃO LOCALIZADA")
            linhas.append("")
            continue

        primeira = bloco.iloc[0]
        linhas.append(f"VARIÁVEL {variavel}")
        linhas.append(f"  Tipo: {formatar_valor(primeira.iloc[1])}")
        linhas.append(f"  Descrição: {formatar_valor(primeira.iloc[4])}")
        categorias = []
        for _, linha in bloco.iterrows():
            codigo = formatar_valor(linha.iloc[5])
            rotulo = formatar_valor(linha.iloc[6])
            if codigo or rotulo:
                categorias.append(f"    {codigo} = {rotulo}")
        linhas.extend(categorias or ["    Sem categorias explícitas."])
        linhas.append("")
    return linhas


def extrair_indicadores(bruto: pd.DataFrame) -> list[str]:
    dados = bruto.iloc[3:, :9].copy()
    nomes = dados.iloc[:, 0].ffill().map(normalizar)
    texto_linha = dados.apply(
        lambda linha: " ".join(normalizar(valor) for valor in linha.tolist() if pd.notna(valor)),
        axis=1,
    )

    alvo_nome = nomes.isin(VARIAVEIS_ALVO)
    alvo_texto = texto_linha.map(
        lambda texto: any(normalizar(termo) in texto for termo in TERMOS_ROTINA)
    )
    relevantes = dados.loc[alvo_nome | alvo_texto]

    if relevantes.empty:
        return ["Nenhum indicador ou rotina relevante localizado."]
    return [relevantes.to_string(index=True, header=False)]


def main() -> None:
    livro = pd.ExcelFile(ARQUIVO)
    partes: list[str] = [
        "DETALHES DO DICIONÁRIO OFICIAL — REGRAS PENDENTES",
        "=" * 68,
        f"Planilhas: {', '.join(livro.sheet_names)}",
        "",
    ]

    variaveis = pd.read_excel(livro, sheet_name="Variáveis_Vigitel", header=None, dtype=object)
    partes.extend([
        "CODIFICAÇÕES DAS VARIÁVEIS",
        "-" * 68,
        *extrair_blocos_variaveis(variaveis),
    ])

    indicadores = pd.read_excel(livro, sheet_name="Indicadores_Vigitel", header=None, dtype=object)
    partes.extend([
        "ROTINAS E INDICADORES RELACIONADOS",
        "-" * 68,
        *extrair_indicadores(indicadores),
        "",
    ])

    SAIDA.write_text("\n".join(partes) + "\n", encoding="utf-8")
    print(f"Resumo detalhado gravado em {SAIDA}")


if __name__ == "__main__":
    main()
