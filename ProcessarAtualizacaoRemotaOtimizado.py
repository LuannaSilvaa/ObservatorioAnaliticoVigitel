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


UF_PARA_CIDADE = {
    "SE": 1, "PA": 2, "MG": 3, "RR": 4, "MS": 5, "MT": 6, "PR": 7,
    "SC": 8, "CE": 9, "GO": 10, "PB": 11, "AP": 12, "AL": 13,
    "AM": 14, "RN": 15, "TO": 16, "RS": 17, "RO": 18, "PE": 19,
    "AC": 20, "RJ": 21, "BA": 22, "MA": 23, "SP": 24, "PI": 25,
    "ES": 26, "DF": 27,
}

CODIGO_UF_PARA_CIDADE = {
    28: 1, 15: 2, 31: 3, 14: 4, 50: 5, 51: 6, 41: 7, 42: 8,
    23: 9, 52: 10, 25: 11, 16: 12, 27: 13, 13: 14, 24: 15,
    17: 16, 43: 17, 11: 18, 26: 19, 12: 20, 33: 21, 29: 22,
    21: 23, 35: 24, 22: 25, 32: 26, 53: 27,
}

CODIGO_MUNICIPIO_PARA_CIDADE = {
    2800308: 1, 1501402: 2, 3106200: 3, 1400100: 4, 5002704: 5,
    5103403: 6, 4106902: 7, 4205407: 8, 2304400: 9, 5208707: 10,
    2507507: 11, 1600303: 12, 2704302: 13, 1302603: 14, 2408102: 15,
    1721000: 16, 4314902: 17, 1100205: 18, 2611606: 19, 1200401: 20,
    3304557: 21, 2927408: 22, 2111300: 23, 3550308: 24, 2211001: 25,
    3205309: 26, 5300108: 27,
}

NOME_PARA_CIDADE = {
    "aracaju": 1, "se": 1,
    "belem": 2, "pa": 2,
    "belo_horizonte": 3, "mg": 3,
    "boa_vista": 4, "rr": 4,
    "campo_grande": 5, "ms": 5,
    "cuiaba": 6, "mt": 6,
    "curitiba": 7, "pr": 7,
    "florianopolis": 8, "sc": 8,
    "fortaleza": 9, "ce": 9,
    "goiania": 10, "go": 10,
    "joao_pessoa": 11, "pb": 11,
    "macapa": 12, "ap": 12,
    "maceio": 13, "al": 13,
    "manaus": 14, "am": 14,
    "natal": 15, "rn": 15,
    "palmas": 16, "to": 16,
    "porto_alegre": 17, "rs": 17,
    "porto_velho": 18, "ro": 18,
    "recife": 19, "pe": 19,
    "rio_branco": 20, "ac": 20,
    "rio_de_janeiro": 21, "rj": 21,
    "salvador": 22, "ba": 22,
    "sao_luis": 23, "ma": 23,
    "sao_paulo": 24, "sp": 24,
    "teresina": 25, "pi": 25,
    "vitoria": 26, "es": 26,
    "brasilia": 27, "df": 27,
}


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


def numero_decimal(serie: pd.Series) -> pd.Series:
    """Converte números com ponto ou vírgula decimal."""
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


def harmonizar_cidade(serie: pd.Series) -> pd.Series:
    """Converte número interno, UF, capital e códigos IBGE para cidade de 1 a 27."""
    numerica = numero_decimal(serie)
    resultado = numerica.where(numerica.between(1, 27))

    inteiros = numerica.round().astype("Int64")
    resultado = resultado.fillna(inteiros.map(CODIGO_UF_PARA_CIDADE))
    resultado = resultado.fillna(inteiros.map(CODIGO_MUNICIPIO_PARA_CIDADE))

    textual = serie.astype("string").map(processador.normalize)
    resultado = resultado.fillna(textual.map(NOME_PARA_CIDADE))
    return pd.to_numeric(resultado, errors="coerce")


def harmonizar_sexo(serie: pd.Series) -> pd.Series:
    """Converte códigos e rótulos de sexo para q7: 1 masculino e 2 feminino."""
    numerica = numero_decimal(serie)
    resultado = numerica.where(numerica.isin([1, 2]))
    textual = serie.astype("string").map(processador.normalize)
    rotulos = {
        "masculino": 1, "homem": 1, "m": 1, "male": 1,
        "feminino": 2, "mulher": 2, "f": 2, "female": 2,
    }
    return resultado.fillna(textual.map(rotulos))


def harmonizar_frame(frame: pd.DataFrame) -> pd.DataFrame:
    """Padroniza variáveis essenciais antes da separação anual."""
    frame = processador.normalize_frame(frame.copy())

    if "cidade" in frame.columns:
        frame["cidade"] = harmonizar_cidade(frame["cidade"])
    if "q6" in frame.columns:
        frame["q6"] = numero_decimal(frame["q6"])
    if "q7" in frame.columns:
        frame["q7"] = harmonizar_sexo(frame["q7"])

    novo = (
        numero_decimal(frame["pesorake2025"])
        if "pesorake2025" in frame.columns
        else pd.Series(float("nan"), index=frame.index, dtype="float64")
    )
    legado = (
        numero_decimal(frame["pesorake"])
        if "pesorake" in frame.columns
        else pd.Series(float("nan"), index=frame.index, dtype="float64")
    )
    peso = novo.where(novo.notna() & novo.gt(0), legado)
    frame["pesorake2025"] = peso
    if "pesorake" not in frame.columns:
        frame["pesorake"] = peso

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


def diagnosticar_filtros() -> None:
    """Mostra quantas linhas passam por idade, sexo, cidade e peso."""
    totais = {"linhas": 0, "idade": 0, "sexo": 0, "cidade": 0, "peso": 0, "todos": 0}
    amostras_cidade: set[str] = set()
    amostras_sexo: set[str] = set()

    for arquivo in sorted(processador.MICRO.glob("MicrodadosAno*.csv")):
        cabecalho = pd.read_csv(arquivo, nrows=0, encoding="utf-8-sig").columns
        peso_coluna = "pesorake2025" if "pesorake2025" in cabecalho else "pesorake"
        colunas = [coluna for coluna in ("cidade", "q6", "q7", peso_coluna) if coluna in cabecalho]
        for bloco in pd.read_csv(
            arquivo,
            usecols=colunas,
            chunksize=50_000,
            encoding="utf-8-sig",
            low_memory=False,
        ):
            cidade = numero_decimal(bloco["cidade"])
            idade = numero_decimal(bloco["q6"])
            sexo = numero_decimal(bloco["q7"])
            peso = numero_decimal(bloco[peso_coluna])

            ok_idade = idade.between(18, 120)
            ok_sexo = sexo.isin([1, 2])
            ok_cidade = cidade.between(1, 27)
            ok_peso = peso.notna() & peso.gt(0)

            totais["linhas"] += len(bloco)
            totais["idade"] += int(ok_idade.sum())
            totais["sexo"] += int(ok_sexo.sum())
            totais["cidade"] += int(ok_cidade.sum())
            totais["peso"] += int(ok_peso.sum())
            totais["todos"] += int((ok_idade & ok_sexo & ok_cidade & ok_peso).sum())

            if len(amostras_cidade) < 15:
                amostras_cidade.update(map(str, bloco["cidade"].dropna().head(15).tolist()))
            if len(amostras_sexo) < 10:
                amostras_sexo.update(map(str, bloco["q7"].dropna().head(10).tolist()))

    print(
        "DIAGNÓSTICO DOS FILTROS: "
        + "; ".join(f"{chave}={valor:,}" for chave, valor in totais.items()),
        flush=True,
    )
    print(f"Amostra cidade: {sorted(amostras_cidade)[:15]}", flush=True)
    print(f"Amostra q7: {sorted(amostras_sexo)[:10]}", flush=True)


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
_calculo_original = calculador.main


def escrever_anualmente_harmonizado(
    gravador: processador.AnnualWriter,
    frame: pd.DataFrame,
) -> None:
    """Padroniza as variáveis essenciais antes da separação anual."""
    _escrita_anual_original(gravador, harmonizar_frame(frame))


def calcular_com_diagnostico() -> None:
    """Registra os filtros essenciais antes do cálculo completo."""
    diagnosticar_filtros()
    _calculo_original()


processador.AnnualWriter.write = escrever_anualmente_harmonizado
processador.read_csv_chunks = ler_csv_em_blocos
calculador.main = calcular_com_diagnostico

if __name__ == "__main__":
    try:
        raise SystemExit(processador.main())
    except BaseException:
        imprimir_relatorios_de_validacao()
        raise
