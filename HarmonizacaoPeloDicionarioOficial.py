#!/usr/bin/env python3
"""Converte rótulos do CSV oficial do Vigitel para os códigos do dicionário."""
from __future__ import annotations

import re
import subprocess
import unicodedata
from pathlib import Path

import pandas as pd

URL_DICIONARIO = (
    "https://svs.aids.gov.br/daent/cgdnt/vigitel/"
    "dicionario-vigitel-2006-2024.xlsx"
)
CAMINHO_DICIONARIO = Path("/tmp/dicionario-vigitel-2006-2024.xlsx")
_MAPEAMENTOS: dict[str, dict[str, float | int]] | None = None

# O CSV consolidado usa, em algumas colunas, rótulos resumidos em relação ao
# texto do dicionário. As equivalências abaixo foram confirmadas diretamente
# nas frequências da base de 833.217 registros.
ALIASES_MANUAIS: dict[str, dict[str, float | int]] = {
    "q29": {
        "1_a_2_dias": 1,
        "3_a_4_dias": 2,
        "5_a_6_dias": 3,
        "todos_os_dias": 4,
        "quase_nunca": 5,
        "nunca": 6,
    },
    "q35": {
        "sim": 1,
        "sim_mas_nao_ultimo_mes": 2,
        "sim_mas_nao_no_ultimo_mes": 2,
        "nao_consumo": 3,
        "nunca_consumi": 4,
    },
    "q36": {
        "1_a_2_dias": 1,
        "3_a_4_dias": 2,
        "5_a_6_dias": 3,
        "todos_os_dias": 4,
        "quase_nunca": 5,
        "nunca": 6,
    },
    "q45": {
        "1_a_2": 1,
        "3_a_4": 2,
        "5_a_6": 3,
        "todos_os_dias": 4,
    },
    "q46": {
        "menos_de_10": 1,
        "10_a_19": 2,
        "20_a_29": 3,
        "30_a_39": 4,
        "60_ou_mais": 7,
    },
    "q60": {
        "sim_diariamente": 1,
        "sim_ocasionalmente": 2,
        "sim_mas_nao_diariamente": 2,
        "nao": 3,
    },
    "q64": {
        "sim": 1,
        "nao": 3,
    },
    "q74": {
        "excelente": 1,
        "muito_bom": 1,
        "bom": 2,
        "regular": 3,
        "ruim": 4,
        "muito_ruim": 5,
        "nao_sabe": 777,
        "nao_quis_informar": 888,
    },
    "refri5": {"nao": 0, "sim": 1},
    "refritl5": {"nao": 0, "sim": 1},
}


def normalizar_texto(valor: object) -> str:
    """Produz uma chave estável para comparar rótulos com e sem acentuação."""
    texto = unicodedata.normalize("NFKD", str(valor)).encode("ascii", "ignore").decode().lower().strip()
    texto = re.sub(r"[^a-z0-9]+", "_", texto)
    return re.sub(r"_+", "_", texto).strip("_")


def normalizar_variavel(valor: object) -> str:
    """Normaliza o nome da variável sem aplicar aliases demográficos."""
    texto = unicodedata.normalize("NFKD", str(valor)).encode("ascii", "ignore").decode().lower().strip()
    texto = re.sub(r"[^a-z0-9_]+", "_", texto)
    return re.sub(r"_+", "_", texto).strip("_")


def baixar_dicionario() -> Path:
    """Obtém a planilha oficial diretamente do Ministério da Saúde."""
    if CAMINHO_DICIONARIO.is_file() and CAMINHO_DICIONARIO.stat().st_size > 10_000:
        return CAMINHO_DICIONARIO

    subprocess.run(
        [
            "curl", "--fail", "--location", "--retry", "3",
            URL_DICIONARIO, "--output", str(CAMINHO_DICIONARIO),
        ],
        check=True,
    )
    return CAMINHO_DICIONARIO


def codigo_numerico(valor: object) -> float | int | None:
    """Converte o código da planilha para inteiro ou decimal."""
    if pd.isna(valor):
        return None
    try:
        numero = float(str(valor).replace(",", "."))
    except ValueError:
        return None
    return int(numero) if numero.is_integer() else numero


def carregar_mapeamentos() -> dict[str, dict[str, float | int]]:
    """Lê as planilhas e relaciona cada rótulo ao respectivo código."""
    global _MAPEAMENTOS
    if _MAPEAMENTOS is not None:
        return _MAPEAMENTOS

    caminho = baixar_dicionario()
    livro = pd.ExcelFile(caminho)
    mapas: dict[str, dict[str, float | int]] = {}

    for planilha in livro.sheet_names:
        bruto = pd.read_excel(livro, sheet_name=planilha, header=None, dtype=object)
        if bruto.shape[1] < 7 or len(bruto) <= 3:
            continue

        dados = bruto.iloc[3:, :7].copy()
        variaveis = dados.iloc[:, 0].ffill()
        codigos = dados.iloc[:, 5]
        rotulos = dados.iloc[:, 6]

        for variavel, codigo, rotulo in zip(variaveis, codigos, rotulos):
            if pd.isna(variavel) or pd.isna(rotulo):
                continue
            codigo_convertido = codigo_numerico(codigo)
            if codigo_convertido is None:
                continue

            nome = normalizar_variavel(variavel)
            chave = normalizar_texto(rotulo)
            if not nome or not chave:
                continue
            mapas.setdefault(nome, {})[chave] = codigo_convertido

    for nome, aliases in ALIASES_MANUAIS.items():
        mapas.setdefault(nome, {}).update(aliases)

    # Variáveis derivadas binárias costumam usar apenas Sim/Não.
    for nome, mapa in mapas.items():
        if 0 in mapa.values() and 1 in mapa.values():
            mapa.setdefault("nao", 0)
            mapa.setdefault("sim", 1)

    _MAPEAMENTOS = mapas
    print(f"Dicionário oficial carregado: {len(mapas)} variáveis com categorias.", flush=True)
    return mapas


def converter_numero(serie: pd.Series) -> pd.Series:
    """Tenta converter códigos numéricos mantendo ausências como NaN."""
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


def aplicar_mapeamentos(frame: pd.DataFrame) -> pd.DataFrame:
    """Substitui rótulos pelas categorias numéricas previstas no dicionário."""
    mapas = carregar_mapeamentos()
    resultado = frame.copy()

    for coluna in resultado.columns:
        nome = normalizar_variavel(coluna)
        mapa = mapas.get(nome)
        if not mapa:
            continue

        serie = resultado[coluna]
        numerica = converter_numero(serie)
        rotulos = serie.astype("string").map(normalizar_texto).map(mapa)
        resultado[coluna] = numerica.where(numerica.notna(), rotulos)

    return resultado
