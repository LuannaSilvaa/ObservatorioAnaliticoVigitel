"""Centraliza as regras dos indicadores e produz as bases utilizadas pelo painel.

As rotinas deste arquivo foram mantidas separadas para facilitar revisões futuras.
Antes de alterar regras de cálculo, confira o dicionário da edição correspondente e execute os testes do projeto.
"""

from __future__ import annotations

import csv
import json
import re
import unicodedata
from pathlib import Path
from typing import Callable, Dict, Iterable, List, Optional, Sequence, Tuple

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parent
PUBLIC_ROOT = ROOT
MICRO = ROOT / "Microdados"
DATA_FILE = ROOT / "BaseAnaliticaDoVigitel.js"
METHOD_FILE = ROOT / "MetodologiaDosIndicadores.js"
AGE_DIR = ROOT
REPORT_FILE = ROOT / "RelatorioDeValidacaoDosIndicadores.txt"
AGE_DIR.mkdir(parents=True, exist_ok=True)
REPORT_FILE.parent.mkdir(parents=True, exist_ok=True)

YEAR_WORDS = {
    "2006": "DoisMilESeis",
    "2007": "DoisMilESete",
    "2008": "DoisMilEOito",
    "2009": "DoisMilENove",
    "2010": "DoisMilEDez",
    "2011": "DoisMilEOnze",
    "2012": "DoisMilEDoze",
    "2013": "DoisMilETreze",
    "2014": "DoisMilEQuatorze",
    "2015": "DoisMilEQuinze",
    "2016": "DoisMilEDezesseis",
    "2017": "DoisMilEDezessete",
    "2018": "DoisMilEDezoito",
    "2019": "DoisMilEDezenove",
    "2020": "DoisMilEVinte",
    "2021": "DoisMilEVinteEUm",
    "2023": "DoisMilEVinteETres",
    "2024": "DoisMilEVinteEQuatro"
}
FILE_YEAR_TOKENS = {word: year for year, word in YEAR_WORDS.items()}


def year_from_filename(path: Path) -> Optional[str]:
    """Identifica a edição do Vigitel a partir do nome acadêmico do arquivo.

    Os nomes físicos não usam algarismos; por isso, a associação entre o ano
    numérico e sua forma escrita fica centralizada neste ponto.
    """
    return next((year for word, year in FILE_YEAR_TOKENS.items() if word in path.stem), None)


def indicator_filename(label: str) -> str:
    """Converte o título do indicador em um nome de arquivo legível e estável.

    A rotina remove acentos e sinais, preserva apenas palavras e utiliza a
    convenção PascalCase adotada em toda a pasta de idade detalhada.
    """
    normalized = unicodedata.normalize("NFKD", label).encode("ascii", "ignore").decode("ascii")
    words = re.findall(r"[A-Za-z]+", normalized)
    name = "Indicador" + "".join(word[:1].upper() + word[1:] for word in words)
    if label == "Mamografia nos últimos 2 anos":
        name = "IndicadorMamografiaNosUltimosDoisAnos"
    elif label == "Papanicolau nos últimos 3 anos":
        name = "IndicadorPapanicolauNosUltimosTresAnos"
    return name + ".js"


BUNDLE_BY_PREFIX = {
    "TAB": "DadosIdadeDetalhadaTabagismo.js",
    "ALC": "DadosIdadeDetalhadaAlcool.js",
    "IMC": "DadosIdadeDetalhadaEstadoNutricional.js",
    "CA": "DadosIdadeDetalhadaAlimentacao.js",
    "AF": "DadosIdadeDetalhadaAtividadeFisica.js",
    "AS": "DadosIdadeDetalhadaAutoavaliacaoDeSaude.js",
    "PC": "DadosIdadeDetalhadaPrevencaoDoCancer.js",
    "MR": "DadosIdadeDetalhadaMorbidades.js",
    "CT": "DadosIdadeDetalhadaConducaoETransito.js",
}


def bundle_filename(indicator_id: str) -> str:
    """Retorna o arquivo temático usado para publicar a idade detalhada do indicador."""
    return next(filename for prefix, filename in BUNDLE_BY_PREFIX.items() if indicator_id.startswith(prefix))


YEARS = [str(y) for y in range(2006, 2022)] + ["2023"] + (["2024"] if any(year_from_filename(path) == "2024" for path in MICRO.glob("Microdados*.csv")) else [])
REGIONS = ["Norte", "Nordeste", "Centro-Oeste", "Sudeste", "Sul"]
UFS = ["AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MS", "MT", "PA", "PB", "PE", "PI", "PR", "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO"]
SEXES = ["Feminino", "Masculino"]
AGE_GROUPS = ["18 a 24 anos", "25 a 34 anos", "35 a 44 anos", "45 a 54 anos", "55 a 64 anos", "65 anos ou mais"]
EXACT_AGES = [f"{age} anos" for age in range(18, 80)] + ["80 anos ou mais"]
POPS = ["População Geral", "População Negra"]

CITY_TO_UF = {
    1: "SE", 2: "PA", 3: "MG", 4: "RR", 5: "MS", 6: "MT", 7: "PR",
    8: "SC", 9: "CE", 10: "GO", 11: "PB", 12: "AP", 13: "AL", 14: "AM",
    15: "RN", 16: "TO", 17: "RS", 18: "RO", 19: "PE", 20: "AC", 21: "RJ",
    22: "BA", 23: "MA", 24: "SP", 25: "PI", 26: "ES", 27: "DF",
}
UF_TO_REGION = {
    "AC": "Norte", "AL": "Nordeste", "AM": "Norte", "AP": "Norte", "BA": "Nordeste",
    "CE": "Nordeste", "DF": "Centro-Oeste", "ES": "Sudeste", "GO": "Centro-Oeste",
    "MA": "Nordeste", "MG": "Sudeste", "MS": "Centro-Oeste", "MT": "Centro-Oeste",
    "PA": "Norte", "PB": "Nordeste", "PE": "Nordeste", "PI": "Nordeste", "PR": "Sul",
    "RJ": "Sudeste", "RN": "Nordeste", "RO": "Norte", "RR": "Norte", "RS": "Sul",
    "SC": "Sul", "SE": "Nordeste", "SP": "Sudeste", "TO": "Norte",
}

YEAR_I = {v: i for i, v in enumerate(YEARS)}
REGION_I = {v: i for i, v in enumerate(REGIONS)}
UF_I = {v: i for i, v in enumerate(UFS)}
POP_I = {v: i for i, v in enumerate(POPS)}
SEX_I = {1: 1, 2: 0}

RuleFn = Callable[[pd.DataFrame], Tuple[pd.Series, pd.Series]]


def numeric(series: pd.Series) -> pd.Series:
    """Converte uma série para valores numéricos, tratando vírgulas decimais e registros inválidos.
    """
    if pd.api.types.is_numeric_dtype(series):
        return pd.to_numeric(series, errors="coerce")
    text = series.astype(str).str.strip()
    comma = text.str.contains(",", regex=False)
    text.loc[comma] = text.loc[comma].str.replace(".", "", regex=False).str.replace(",", ".", regex=False)
    return pd.to_numeric(text, errors="coerce")


def binary(var: str, *, event: int = 1, sex: Optional[int] = None) -> RuleFn:
    """Cria uma regra binária com numerador e denominador definidos pela variável informada.
    """
    def apply(df: pd.DataFrame) -> Tuple[pd.Series, pd.Series]:
        """Aplica a regra à base e devolve as máscaras de elegibilidade e de ocorrência do evento.
        """
        eligible = df[var].isin([0, 1])
        if sex is not None:
            eligible &= df["q7"].eq(sex)
        return eligible, eligible & df[var].eq(event)
    return apply


def codes(var: str, valid: Sequence[int], event: Sequence[int], *, sex: Optional[int] = None,
          min_age: Optional[int] = None, max_age: Optional[int] = None) -> RuleFn:
    """Cria uma regra baseada em códigos válidos, códigos do evento e filtros de sexo ou idade.
    """
    valid_set = set(valid)
    event_set = set(event)

    def apply(df: pd.DataFrame) -> Tuple[pd.Series, pd.Series]:
        """Aplica a regra à base e devolve as máscaras de elegibilidade e de ocorrência do evento.
        """
        eligible = df[var].isin(valid_set)
        if sex is not None:
            eligible &= df["q7"].eq(sex)
        if min_age is not None:
            eligible &= df["q6"].ge(min_age)
        if max_age is not None:
            eligible &= df["q6"].le(max_age)
        return eligible, eligible & df[var].isin(event_set)
    return apply


def ex_smoker(df: pd.DataFrame) -> Tuple[pd.Series, pd.Series]:
    """Identifica ex fumantes usando a variável derivada ou as perguntas originais disponíveis.
    """
    if "exfuma" in df.columns and df["exfuma"].isin([0, 1]).any():
        return binary("exfuma")(df)
    eligible = df["q60"].isin([1, 2, 3])
    event = eligible & df["q60"].eq(3) & df["q64"].isin([1, 2])
    return eligible, event


def weekly_alcohol_population(df: pd.DataFrame) -> Tuple[pd.Series, pd.Series]:
    """Define a população elegível para o consumo semanal de álcool.
    """
    eligible = df["q35"].isin([1, 2, 3, 4])
    event = eligible & df["q35"].eq(1) & df["q36"].isin([1, 2, 3, 4])
    return eligible, event


def binge_by_sex(sex: int) -> RuleFn:
    """Aplica os limites de consumo abusivo específicos para homens e mulheres.
    """
    def apply(df: pd.DataFrame) -> Tuple[pd.Series, pd.Series]:
        """Aplica a regra à base e devolve as máscaras de elegibilidade e de ocorrência do evento.
        """
        eligible = df["alcabu"].isin([0, 1]) & df["q7"].eq(sex)
        return eligible, eligible & df["alcabu"].eq(1)
    return apply


def max_doses_five(df: pd.DataFrame) -> Tuple[pd.Series, pd.Series]:
    """Identifica pessoas que relataram cinco ou mais doses no dia de maior consumo.
    """
    eligible = df["r200"].between(0, 100)
    return eligible, eligible & df["r200"].ge(5)


def stopped_in_blitz_after_passing(df: pd.DataFrame) -> Tuple[pd.Series, pd.Series]:
    """Harmoniza CT04 entre 2014–2019.

    Em 2014–2016, r137a possui respostas também fora do subconjunto r153=1;
    a partir de 2017, o próprio fluxo do questionário deixa r137a disponível
    apenas para quem passou por blitz. Para manter o mesmo denominador em toda
    a série, CT04 é calculado entre r153=1 com resposta válida em r137a.
    """
    eligible = df["r153"].eq(1) & df["r137a"].isin([1, 2])
    return eligible, eligible & df["r137a"].eq(1)


def invited_to_breathalyzer_after_stop(df: pd.DataFrame) -> Tuple[pd.Series, pd.Series]:
    """CT05: convite somente entre quem declarou ter sido parado na blitz."""
    eligible = df["r137a"].eq(1) & df["r154"].isin([1, 2])
    return eligible, eligible & df["r154"].eq(1)


def performed_breathalyzer_after_invitation(df: pd.DataFrame) -> Tuple[pd.Series, pd.Series]:
    """CT06: realização somente entre quem declarou ter sido convidado."""
    eligible = df["r154"].eq(1) & df["r155"].isin([1, 2])
    return eligible, eligible & df["r155"].eq(1)


def positive_breathalyzer_after_test(df: pd.DataFrame) -> Tuple[pd.Series, pd.Series]:
    """CT07: resultado positivo somente entre quem declarou ter feito o teste."""
    eligible = df["r155"].eq(1) & df["r156"].isin([1, 2])
    return eligible, eligible & df["r156"].eq(1)


def passive_smoke_home(df: pd.DataFrame) -> Tuple[pd.Series, pd.Series]:
    """TAB07 segundo a série revista 2018–2024.

    O denominador é a população adulta entrevistada; o numerador inclui qualquer
    pessoa exposta à fumaça de terceiros no domicílio, inclusive fumantes.
    """
    edition = df.get("edition", pd.Series(0, index=df.index))
    eligible = edition.ge(2018)
    return eligible, eligible & df["q67"].eq(1)


def passive_smoke_work(df: pd.DataFrame) -> Tuple[pd.Series, pd.Series]:
    """TAB08 segundo a série revista 2018–2024.

    q68 já representa exposição no ambiente de trabalho. O denominador é a
    população adulta entrevistada; ausências por fluxo são classificadas como
    não evento, e fumantes expostos também integram o numerador.
    """
    edition = df.get("edition", pd.Series(0, index=df.index))
    eligible = edition.ge(2018)
    return eligible, eligible & df["q68"].eq(1)


def physical_inactivity_harmonized(df: pd.DataFrame) -> Tuple[pd.Series, pd.Series]:
    """AF08: prioriza a definição revista em toda edição em que ela exista.

    A metodologia atual pode ser aplicada retroativamente desde 2009. Assim,
    ``inativo_2023`` é usada sempre que houver valor válido; ``inativo`` fica
    apenas como fallback para os arquivos anuais legados que não trazem a
    variável reprocessada.
    """
    legacy = df["inativo"] if "inativo" in df.columns else pd.Series(np.nan, index=df.index)
    revised = df["inativo_2023"] if "inativo_2023" in df.columns else pd.Series(np.nan, index=df.index)
    selected = revised.where(revised.isin([0, 1]), legacy)
    eligible = selected.isin([0, 1])
    return eligible, eligible & selected.eq(1)


def bmi_rule(mode: str) -> RuleFn:
    """Classifica o IMC segundo os limites definidos para o indicador.
    """
    def apply(df: pd.DataFrame) -> Tuple[pd.Series, pd.Series]:
        """Aplica a regra à base e devolve as máscaras de elegibilidade e de ocorrência do evento.
        """
        height = df["q11_i"] / 100
        bmi = (df["q9_i"] / (height ** 2)).round(6)
        eligible = df["q9_i"].notna() & df["q11_i"].notna()
        eligible &= df["q9_i"].lt(700) & df["q11_i"].lt(700) & bmi.between(7, 115)
        if mode == "adequate":
            event = eligible & bmi.ge(18.5) & bmi.lt(25)
        elif mode == "low":
            event = eligible & bmi.lt(18.5)
        else:
            raise ValueError(mode)
        return eligible, event
    return apply


def activity_frequency(df: pd.DataFrame) -> Tuple[pd.Series, pd.Series]:
    """Identifica frequência regular de atividade física no tempo livre.
    """
    eligible = df["q42"].isin([1, 2])
    event = eligible & df["q42"].eq(1) & df["q45"].isin([2, 3, 4])
    return eligible, event


def activity_duration(df: pd.DataFrame) -> Tuple[pd.Series, pd.Series]:
    """Identifica sessões de atividade física com duração adequada.
    """
    eligible = df["q42"].isin([1, 2])
    valid_duration = df.loc[df["q46"].notna(), "q46"]
    if not valid_duration.empty and valid_duration.max() <= 3:
        adequate = df["q46"].eq(3)
    else:
        adequate = df["q46"].isin([4, 5, 6, 7])
    event = eligible & df["q42"].eq(1) & adequate
    return eligible, event


def good_health(code_set: Sequence[int]) -> RuleFn:
    """Identifica respostas que representam avaliação positiva da saúde.
    """
    return codes("q74", [1, 2, 3, 4, 5], code_set)


RULES: Dict[str, Dict] = {
    "TAB01": {"cols": ["fumante"], "fn": binary("fumante"), "variable": "fumante", "rule": "fumante = 1", "den": "Adultos com valor válido no indicador derivado de tabagismo.", "population": "Adultos com 18 anos ou mais."},
    "TAB02": {"cols": ["q60"], "fn": codes("q60", [1, 2, 3], [1]), "variable": "q60", "rule": "q60 = 1", "den": "Respostas válidas de q60.", "population": "Adultos com 18 anos ou mais."},
    "TAB03": {"cols": ["q60"], "fn": codes("q60", [1, 2, 3], [2]), "variable": "q60", "rule": "q60 = 2", "den": "Respostas válidas de q60.", "population": "Adultos com 18 anos ou mais."},
    "TAB04": {"cols": ["fumante"], "fn": binary("fumante", event=0), "variable": "fumante", "rule": "fumante = 0", "den": "Adultos com valor válido no indicador derivado de tabagismo.", "population": "Adultos com 18 anos ou mais."},
    "TAB05": {"cols": ["q60", "q64"], "fn": ex_smoker, "variable": "exfuma; fallback q60 e q64", "rule": "exfuma = 1; quando indisponível, q60 = 3 e q64 ∈ {1,2}", "den": "Adultos com informação válida sobre tabagismo e histórico de fumo.", "population": "Adultos com 18 anos ou mais."},
    "TAB06": {"cols": ["q63"], "fn": codes("q63", [1, 2], [1]), "variable": "q63", "rule": "q63 = 1", "den": "Fumantes elegíveis com resposta válida de q63.", "population": "Fumantes atuais elegíveis à pergunta."},
    "TAB07": {"cols": ["q67"], "fn": passive_smoke_home, "variable": "q67", "rule": "edição ≥ 2018 e q67 = 1; fumantes expostos incluídos", "den": "Todos os adultos entrevistados nas edições com coleta do indicador.", "population": "Adultos com 18 anos ou mais, fumantes e não fumantes."},
    "TAB08": {"cols": ["q68"], "fn": passive_smoke_work, "variable": "q68", "rule": "edição ≥ 2018 e q68 = 1; fumantes expostos incluídos", "den": "Todos os adultos entrevistados nas edições com coleta do indicador.", "population": "Adultos com 18 anos ou mais, fumantes e não fumantes."},

    "ALC01": {"cols": ["q35"], "fn": codes("q35", [1, 2, 3, 4], [1]), "variable": "q35", "rule": "q35 = 1; códigos 2, 3 e 4 compõem respostas negativas válidas conforme o ano", "den": "Adultos com resposta válida sobre consumo de bebida alcoólica.", "population": "Adultos com 18 anos ou mais."},
    "ALC02": {"cols": ["q35", "q36"], "fn": weekly_alcohol_population, "variable": "q35 e q36", "rule": "q35 = 1 e q36 ∈ {1,2,3,4}", "den": "Adultos com resposta válida sobre consumo de álcool.", "population": "Adultos com 18 anos ou mais."},
    "ALC03": {"cols": ["alcabu"], "fn": binge_by_sex(1), "variable": "alcabu e q7", "rule": "alcabu = 1 e q7 = 1", "den": "Homens com valor válido no indicador derivado de consumo abusivo nos últimos 30 dias.", "population": "Homens com 18 anos ou mais."},
    "ALC04": {"cols": ["alcabu"], "fn": binge_by_sex(2), "variable": "alcabu e q7", "rule": "alcabu = 1 e q7 = 2", "den": "Mulheres com valor válido no indicador derivado de consumo abusivo nos últimos 30 dias.", "population": "Mulheres com 18 anos ou mais."},
    "ALC05": {"cols": ["q36"], "fn": codes("q36", [1, 2, 3, 4, 5, 6], [1, 2, 3, 4]), "variable": "q36", "rule": "q36 ∈ {1,2,3,4}", "den": "Consumidores de álcool com frequência de consumo válida.", "population": "Adultos que consomem álcool e responderam à frequência."},
    "ALC06": {"cols": ["r200"], "fn": max_doses_five, "variable": "r200", "rule": "r200 ≥ 5", "den": "Respondentes com número máximo de doses válido.", "population": "Adultos elegíveis à pergunta sobre doses."},
    "ALC07": {"cols": ["direcao"], "fn": binary("direcao"), "variable": "direcao", "rule": "direcao = 1", "den": "Adultos com valor válido no indicador derivado.", "population": "População adulta total."},
    "ALC08": {"cols": ["q40b"], "fn": codes("q40b", [1, 2, 3, 4], [1, 2]), "variable": "q40b", "rule": "q40b ∈ {1,2}", "den": "Adultos elegíveis com frequência de direção após beber válida.", "population": "Adultos elegíveis à pergunta."},

    "IMC01": {"cols": ["excpeso_i"], "fn": binary("excpeso_i"), "variable": "excpeso_i", "rule": "excpeso_i = 1", "den": "Adultos com classificação de IMC imputada válida.", "population": "Adultos com 18 anos ou mais."},
    "IMC02": {"cols": ["obesid_i"], "fn": binary("obesid_i"), "variable": "obesid_i", "rule": "obesid_i = 1", "den": "Adultos com classificação de IMC imputada válida.", "population": "Adultos com 18 anos ou mais."},
    "IMC03": {"cols": ["q9_i", "q11_i"], "fn": bmi_rule("adequate"), "variable": "q9_i e q11_i", "rule": "18,5 ≤ IMC < 25", "den": "Adultos com peso e altura imputados válidos.", "population": "Adultos com 18 anos ou mais."},
    "IMC04": {"cols": ["q9_i", "q11_i"], "fn": bmi_rule("low"), "variable": "q9_i e q11_i", "rule": "IMC < 18,5", "den": "Adultos com peso e altura imputados válidos.", "population": "Adultos com 18 anos ou mais."},
    "IMC05": {"cols": ["obesid_i"], "fn": binary("obesid_i", event=0), "variable": "obesid_i", "rule": "obesid_i = 0", "den": "Adultos com classificação de IMC imputada válida.", "population": "Adultos com 18 anos ou mais."},

    "CA01": {"cols": ["feijao5"], "fn": binary("feijao5"), "variable": "feijao5", "rule": "feijao5 = 1", "den": "Adultos com valor válido no indicador derivado.", "population": "Adultos elegíveis à pergunta."},
    "CA02": {"cols": ["frutareg"], "fn": binary("frutareg"), "variable": "frutareg", "rule": "frutareg = 1", "den": "Adultos com valor válido no indicador derivado.", "population": "Adultos elegíveis à pergunta."},
    "CA03": {"cols": ["hortareg"], "fn": binary("hortareg"), "variable": "hortareg", "rule": "hortareg = 1", "den": "Adultos com valor válido no indicador derivado.", "population": "Adultos elegíveis à pergunta."},
    "CA04": {"cols": ["flvreg"], "fn": binary("flvreg"), "variable": "flvreg", "rule": "flvreg = 1", "den": "Adultos com valor válido no indicador derivado.", "population": "Adultos elegíveis às perguntas de frutas e hortaliças."},
    "CA05": {"cols": ["q29"], "fn": codes("q29", [1, 2, 3, 4, 5, 6], [1, 2, 3, 4]), "variable": "q29", "rule": "q29 ∈ {1,2,3,4}", "den": "Respostas válidas de q29.", "population": "Adultos elegíveis à pergunta sobre refrigerante."},
    "CA06": {"cols": ["refritl5"], "fn": binary("refritl5"), "variable": "refritl5", "rule": "refritl5 = 1", "den": "Adultos com valor válido no indicador derivado.", "population": "Adultos elegíveis à pergunta."},
    "CA07": {"cols": ["q25"], "fn": codes("q25", [1, 2, 3, 4, 5, 6], [3, 4]), "variable": "q25", "rule": "q25 ∈ {3,4}", "den": "Respostas válidas de q25.", "population": "Adultos elegíveis à pergunta sobre suco natural."},
    "CA08": {"cols": ["r143"], "fn": codes("r143", [1, 2, 3, 4, 5, 6], [3, 4]), "variable": "r143", "rule": "r143 ∈ {3,4}", "den": "Respostas válidas de r143.", "population": "Adultos elegíveis à pergunta sobre doces."},
    "CA09": {"cols": ["r144a"], "fn": codes("r144a", [1, 2, 3, 4, 5, 6], [3, 4]), "variable": "r144a", "rule": "r144a ∈ {3,4}", "den": "Respostas válidas de r144a.", "population": "Adultos elegíveis à pergunta sobre substituição do almoço."},
    "CA10": {"cols": ["r144b"], "fn": codes("r144b", [1, 2, 3, 4, 5, 6], [3, 4]), "variable": "r144b", "rule": "r144b ∈ {3,4}", "den": "Respostas válidas de r144b.", "population": "Adultos elegíveis à pergunta sobre substituição do jantar."},

    "AF01": {"cols": ["q42"], "fn": codes("q42", [1, 2], [1]), "variable": "q42", "rule": "q42 = 1", "den": "Respostas válidas de q42.", "population": "Adultos com 18 anos ou mais."},
    "AF02": {"cols": ["q42", "q45"], "fn": activity_frequency, "variable": "q42 e q45", "rule": "q42 = 1 e q45 ∈ {2,3,4}", "den": "Adultos com resposta válida sobre prática de exercício no lazer.", "population": "Adultos com 18 anos ou mais."},
    "AF03": {"cols": ["q42", "q46"], "fn": activity_duration, "variable": "q42 e q46", "rule": "q42 = 1 e duração de pelo menos 30 minutos; codificação harmonizada por ano", "den": "Adultos com resposta válida sobre prática de exercício no lazer.", "population": "Adultos com 18 anos ou mais."},
    "AF04": {"cols": ["ativo_livre"], "fn": binary("ativo_livre"), "variable": "ativo_livre", "rule": "ativo_livre = 1", "den": "Adultos com valor válido no indicador derivado.", "population": "Adultos com 18 anos ou mais."},
    "AF05": {"cols": ["atitrans"], "fn": binary("atitrans"), "variable": "atitrans", "rule": "atitrans = 1", "den": "Adultos com valor válido no indicador derivado.", "population": "Adultos com 18 anos ou mais."},
    "AF06": {"cols": ["atiocu"], "fn": binary("atiocu"), "variable": "atiocu", "rule": "atiocu = 1", "den": "Adultos com valor válido no indicador derivado.", "population": "Adultos com 18 anos ou mais."},
    "AF07": {"cols": ["atidom"], "fn": binary("atidom"), "variable": "atidom", "rule": "atidom = 1", "den": "Adultos com valor válido no indicador derivado.", "population": "Adultos com 18 anos ou mais."},
    "AF08": {"cols": [], "fn": physical_inactivity_harmonized, "variable": "inativo_2023 quando disponível; fallback inativo", "rule": "variável harmonizada = 1; a definição revista é priorizada retroativamente desde 2009 quando disponível", "den": "Adultos com classificação válida de inatividade física.", "population": "Adultos com 18 anos ou mais."},

    "AS01": {"cols": ["q74"], "fn": good_health([1, 2]), "variable": "q74", "rule": "q74 ∈ {1,2}", "den": "Respostas válidas de q74.", "population": "Adultos com 18 anos ou mais."},
    "AS02": {"cols": ["q74"], "fn": good_health([3]), "variable": "q74", "rule": "q74 = 3", "den": "Respostas válidas de q74.", "population": "Adultos com 18 anos ou mais."},
    "AS03": {"cols": ["q74"], "fn": good_health([4, 5]), "variable": "q74", "rule": "q74 ∈ {4,5}", "den": "Respostas válidas de q74.", "population": "Adultos com 18 anos ou mais."},
    "AS04": {"cols": ["q74"], "fn": good_health([1]), "variable": "q74", "rule": "q74 = 1", "den": "Respostas válidas de q74.", "population": "Adultos com 18 anos ou mais."},
    "AS05": {"cols": ["q74"], "fn": good_health([2]), "variable": "q74", "rule": "q74 = 2", "den": "Respostas válidas de q74.", "population": "Adultos com 18 anos ou mais."},

    "PC01": {"cols": ["mamodois"], "fn": binary("mamodois"), "variable": "mamodois", "rule": "mamodois = 1", "den": "Mulheres de 50 a 69 anos com indicador derivado válido.", "population": "Mulheres de 50 a 69 anos."},
    "PC02": {"cols": ["mamo"], "fn": binary("mamo"), "variable": "mamo", "rule": "mamo = 1", "den": "Mulheres de 50 a 69 anos com indicador derivado válido.", "population": "Mulheres de 50 a 69 anos."},
    "PC03": {"cols": ["papa"], "fn": binary("papa"), "variable": "papa", "rule": "papa = 1", "den": "Mulheres de 25 a 64 anos com indicador derivado válido.", "population": "Mulheres de 25 a 64 anos."},
    "PC04": {"cols": ["papatres"], "fn": binary("papatres"), "variable": "papatres", "rule": "papatres = 1", "den": "Mulheres de 25 a 64 anos com indicador derivado válido.", "population": "Mulheres de 25 a 64 anos."},

    "MR01": {"cols": ["hart"], "fn": binary("hart"), "variable": "hart", "rule": "hart = 1", "den": "Adultos com valor válido no indicador derivado.", "population": "Adultos com 18 anos ou mais."},
    "MR02": {"cols": ["diab"], "fn": binary("diab"), "variable": "diab", "rule": "diab = 1", "den": "Adultos com valor válido no indicador derivado.", "population": "Adultos com 18 anos ou mais."},
    "MR03": {"cols": ["dislip"], "fn": binary("dislip"), "variable": "dislip", "rule": "dislip = 1", "den": "Adultos com valor válido no indicador derivado.", "population": "Adultos elegíveis à pergunta no período disponível."},
    "MR04": {"cols": ["coracao"], "fn": binary("coracao"), "variable": "coracao", "rule": "coracao = 1", "den": "Adultos com valor válido no indicador derivado.", "population": "Adultos elegíveis à pergunta no período disponível."},
    "MR05": {"cols": ["asma"], "fn": binary("asma"), "variable": "asma", "rule": "asma = 1", "den": "Adultos com valor válido no indicador derivado.", "population": "Adultos elegíveis à pergunta no período disponível."},
    "MR06": {"cols": ["osteo"], "fn": binary("osteo"), "variable": "osteo", "rule": "osteo = 1", "den": "Adultos com valor válido no indicador derivado.", "population": "Adultos elegíveis à pergunta no período disponível."},
    "MR07": {"cols": ["depressao"], "fn": binary("depressao"), "variable": "depressao", "rule": "depressao = 1", "den": "Adultos com valor válido no indicador derivado.", "population": "Adultos elegíveis à pergunta no período disponível."},

    "CT01": {"cols": ["r190"], "fn": codes("r190", [1, 2], [1]), "variable": "r190", "rule": "r190 = 1", "den": "Respostas válidas de r190.", "population": "Adultos com 18 anos ou mais no período disponível."},
    "CT02": {"cols": ["direcao_alc"], "fn": binary("direcao_alc"), "variable": "direcao_alc", "rule": "direcao_alc = 1", "den": "Adultos com valor válido no indicador derivado; a variável oficial é codificada em 0/1 para a população adulta.", "population": "Adultos com 18 anos ou mais."},
    "CT03": {"cols": ["q40b"], "fn": codes("q40b", [1, 2, 3, 4], [1, 2, 3]), "variable": "q40b", "rule": "q40b ∈ {1,2,3}", "den": "Adultos elegíveis com frequência válida.", "population": "Adultos elegíveis à pergunta sobre direção após beber."},
    "CT04": {"cols": ["r153", "r137a"], "fn": stopped_in_blitz_after_passing, "variable": "r153 e r137a", "rule": "r153 = 1 e r137a = 1; denominador: r153 = 1 e r137a ∈ {1,2}", "den": "Condutores que passaram por blitz e responderam validamente se foram parados.", "population": "Condutores que passaram por blitz nos últimos 12 meses, no período disponível."},
    "CT05": {"cols": ["r137a", "r154"], "fn": invited_to_breathalyzer_after_stop, "variable": "r137a e r154", "rule": "r137a = 1 e r154 = 1; denominador: r137a = 1 e r154 ∈ {1,2}", "den": "Condutores parados em blitz com resposta válida sobre o convite ao bafômetro.", "population": "Condutores parados em blitz no período disponível."},
    "CT06": {"cols": ["r154", "r155"], "fn": performed_breathalyzer_after_invitation, "variable": "r154 e r155", "rule": "r154 = 1 e r155 = 1; denominador: r154 = 1 e r155 ∈ {1,2}", "den": "Condutores convidados ao bafômetro com resposta válida sobre a realização do teste.", "population": "Condutores convidados ao bafômetro no período disponível."},
    "CT07": {"cols": ["r155", "r156"], "fn": positive_breathalyzer_after_test, "variable": "r155 e r156", "rule": "r155 = 1 e r156 = 1; denominador: r155 = 1 e r156 ∈ {1,2}", "den": "Condutores que realizaram o bafômetro com resultado válido.", "population": "Condutores que realizaram o bafômetro no período disponível."},
    "CT08": {"cols": ["r178"], "fn": codes("r178", [1, 2], [1]), "variable": "r178", "rule": "r178 = 1", "den": "Condutores com resposta válida sobre uso de celular.", "population": "Condutores elegíveis no período disponível."},
}

CLASSIFICATIONS = {
    # Indicadores oficiais principais presentes na aba Indicadores_Vigitel.
    **{key: "Oficial Vigitel" for key in [
        "TAB01", "TAB05", "TAB07", "TAB08", "ALC03", "ALC04", "ALC07",
        "IMC01", "IMC02", "CA01", "CA02", "CA03", "CA04", "CA06",
        "AF04", "AF05", "AF06", "AF07", "AF08", "AS03",
        "PC01", "PC02", "PC03", "PC04", "MR01", "MR02", "MR03", "MR07", "CT02"
    ]},
    # Recortes ou complementos calculados com códigos oficiais do questionário.
    **{key: "Derivado/recorte validado" for key in [
        "TAB02", "TAB03", "TAB04", "TAB06", "ALC01", "ALC02", "ALC05", "ALC08",
        "IMC03", "IMC04", "IMC05", "CA05", "CA07", "CA08", "CA09", "CA10",
        "AF01", "AF02", "AF03", "AS01", "AS02", "AS04", "AS05",
        "MR04", "MR05", "MR06", "CT01", "CT03", "CT04", "CT05", "CT06", "CT07", "CT08"
    ]},
    "ALC06": "Exploratório",
}

LABEL_OVERRIDES = {
    "ALC03": ("Consumo abusivo de álcool (homens)", "Homens que consumiram cinco ou mais doses em uma única ocasião nos últimos 30 dias."),
    "ALC04": ("Consumo abusivo de álcool (mulheres)", "Mulheres que consumiram quatro ou mais doses em uma única ocasião nos últimos 30 dias."),
    "CA02": ("Consumo regular de frutas", "Adultos que consumiram frutas e/ou suco natural de frutas em cinco ou mais dias da semana."),
    "AF05": ("Atividade física suficiente no deslocamento", "Adultos classificados como ativos no deslocamento segundo a duração diária informada no Vigitel."),
    "AF06": ("Atividade física no trabalho", "Adultos classificados com atividade física no trabalho pelas perguntas ocupacionais do Vigitel."),
    "AF07": ("Atividade física doméstica", "Adultos classificados com atividade física doméstica pelas perguntas de limpeza pesada/faxina do Vigitel."),
    "PC01": ("Mamografia nos últimos 2 anos", "Mulheres de 50 a 69 anos que realizaram mamografia nos últimos dois anos."),
    "PC04": ("Papanicolau nos últimos 3 anos", "Mulheres de 25 a 64 anos que realizaram Papanicolau nos últimos três anos."),
    "TAB04": ("Não fumante", "Adultos que não fumam atualmente."),
    "ALC02": ("Consumo semanal de álcool", "Adultos que consomem bebida alcoólica pelo menos uma vez por semana."),
    "ALC05": ("Consumo semanal entre consumidores de álcool", "Consumidores de álcool que bebem pelo menos uma vez por semana."),
    "ALC06": ("Cinco ou mais doses no dia de maior consumo", "Respondentes elegíveis que relataram cinco ou mais doses no dia de maior consumo."),
    "ALC07": ("Conduziu veículo após consumo abusivo de álcool", "Adultos que conduziram veículo após consumo abusivo de bebida alcoólica, considerando a população adulta."),
    "ALC08": ("Dirigiu sempre ou algumas vezes após beber", "Adultos elegíveis que relataram dirigir sempre ou algumas vezes após beber."),
    "IMC04": ("Baixo peso", "Adultos com IMC inferior a 18,5 kg/m²."),
    "IMC05": ("Sem obesidade", "Adultos com IMC inferior a 30 kg/m²."),
    "CA05": ("Consumo semanal de refrigerante", "Adultos que consomem refrigerante em pelo menos um dia da semana."),
    "CA07": ("Consumo regular de suco natural", "Adultos que consomem suco natural em cinco ou mais dias da semana."),
    "AS05": ("Saúde avaliada como boa", "Adultos que avaliam a saúde como boa."),
    "PC02": ("Mamografia alguma vez", "Mulheres de 50 a 69 anos que referiram ter realizado mamografia alguma vez."),
    "PC03": ("Exame de Papanicolau alguma vez", "Mulheres de 25 a 64 anos que referiram ter realizado exame de Papanicolau alguma vez."),
    "CT02": ("Conduziu veículo após consumo de álcool", "Percentual na população adulta que conduziu veículo após consumir bebida alcoólica."),
    "CT03": ("Dirigiu após beber com alguma frequência", "Adultos elegíveis que relataram dirigir após beber sempre, algumas vezes ou quase nunca."),
    "CT04": ("Foi parado em blitz entre os que passaram por blitz", "Percentual parado em blitz entre condutores que declararam ter passado por blitz e responderam validamente à pergunta de parada."),
    "CT05": ("Foi convidado ao bafômetro entre os parados em blitz", "Condutores convidados a realizar o bafômetro entre os que foram parados em blitz."),
    "CT06": ("Realizou o bafômetro entre os convidados", "Condutores que realizaram o teste entre os que foram convidados ao bafômetro."),
    "CT07": ("Resultado positivo entre os que fizeram o bafômetro", "Condutores com resultado positivo entre os que realizaram o teste do bafômetro."),
    "ALC01": ("Consumo de bebida alcoólica", "Adultos que referiram consumir bebida alcoólica."),
    "CA01": ("Consumo regular de feijão", "Adultos que consumiram feijão em cinco ou mais dias da semana."),
    "CA03": ("Consumo regular de hortaliças", "Adultos que consumiram hortaliças em cinco ou mais dias da semana."),
    "CA04": ("Consumo regular de frutas e hortaliças", "Adultos com consumo regular de frutas e hortaliças segundo o indicador derivado do Vigitel."),
    "CA09": ("Substituição regular do almoço por lanches", "Adultos que substituíram regularmente o almoço por sanduíches, salgados, pizza ou outros lanches."),
    "CA10": ("Substituição regular do jantar por lanches", "Adultos que substituíram regularmente o jantar por sanduíches, salgados, pizza ou outros lanches."),
    "AF02": ("Frequência regular de atividade física", "Adultos que praticam atividade física no tempo livre com frequência regular."),
    "AS04": ("Saúde avaliada como muito boa", "Adultos que avaliam a própria saúde como muito boa."),
    "MR01": ("Hipertensão arterial", "Adultos que referiram diagnóstico médico de hipertensão arterial."),
    "MR04": ("Doença cardiovascular", "Adultos com valor positivo na variável histórica derivada coracao."),
    "MR07": ("Depressão", "Adultos com valor positivo na variável derivada depressao."),
    "CT01": ("Possui habilitação", "Adultos que declararam possuir Carteira Nacional de Habilitação."),
    "CT08": ("Uso de celular durante a condução", "Condutores que declararam usar celular durante a condução."),
}


def load_existing_metadata() -> Tuple[List[dict], List[dict]]:
    """Lê os metadados atuais para preservar informações válidas no recálculo.
    """
    text = DATA_FILE.read_text(encoding="utf-8")
    match = re.search(r"const DATA = (\{.*?\});\n\nconst \$", text, re.S)
    if not match:
        raise RuntimeError("Não foi possível ler os metadados atuais do painel.")
    data = json.loads(match.group(1))
    indicators = data["indicators"]
    for item in indicators:
        if item["id"] in LABEL_OVERRIDES:
            item["label"], item["description"] = LABEL_OVERRIDES[item["id"]]
        item["unit"] = "%"
        item["classification"] = CLASSIFICATIONS.get(item["id"], "Derivado/recorte validado")
    return data["themes"], indicators


def required_columns() -> List[str]:
    """Retorna as colunas necessárias para calcular uma regra.
    """
    columns = {"ano", "cidade", "q6", "q7", "q69_cor", "pesorake", "pesorake2025", "pesorake_cor", "exfuma", "q67", "q68", "inativo", "inativo_2023"}
    for rule in RULES.values():
        columns.update(rule["cols"])
    return sorted(columns)


def age_group_index(age: pd.Series) -> pd.Series:
    """Converte a idade em índice de faixa etária usado na agregação.
    """
    values = np.select(
        [age.between(18, 24), age.between(25, 34), age.between(35, 44), age.between(45, 54), age.between(55, 64), age.ge(65)],
        [0, 1, 2, 3, 4, 5],
        default=-1,
    )
    return pd.Series(values, index=age.index, dtype="int16")


def aggregate_rule(df: pd.DataFrame, rule: Dict, year_idx: int, pop_idx: int, weight_col: str,
                   indicator_idx: int) -> Tuple[List[List], List[List]]:
    """Agrega numerador e denominador de uma regra para cada combinação de filtros.
    """
    if not set(rule["cols"]).issubset(df.columns):
        return [], []
    eligible, event = rule["fn"](df)
    eligible = eligible.fillna(False)
    event = event.fillna(False)
    eligible &= df[weight_col].notna() & df[weight_col].gt(0)
    eligible &= df["uf_i"].notna() & df["region_i"].notna() & df["sex_i"].notna()
    eligible &= df["age_group_i"].ge(0) & df["exact_age_i"].ge(0)
    if not eligible.any():
        return [], []

    base_cols = ["region_i", "uf_i", "sex_i", "age_group_i", "exact_age_i", weight_col]
    work = df.loc[eligible, base_cols].copy()
    event_values = event.loc[eligible].to_numpy(dtype=bool)
    weights = work[weight_col].to_numpy(dtype=float)
    work["num"] = np.where(event_values, weights, 0.0)
    work["den"] = weights
    work["n"] = 1
    work["cases"] = event_values.astype("int32")
    work["w2"] = weights ** 2

    base_group = work.groupby(["region_i", "uf_i", "sex_i", "age_group_i"], sort=True, observed=True).agg(
        num=("num", "sum"), den=("den", "sum"), n=("n", "sum"), cases=("cases", "sum"), w2=("w2", "sum")
    ).reset_index()
    exact_group = work.groupby(["uf_i", "sex_i", "exact_age_i"], sort=True, observed=True).agg(
        num=("num", "sum"), den=("den", "sum"), n=("n", "sum"), cases=("cases", "sum"), w2=("w2", "sum")
    ).reset_index()

    base_rows = [
        [year_idx, int(r.region_i), int(r.uf_i), int(r.sex_i), int(r.age_group_i), pop_idx,
         indicator_idx, round(float(r.num), 3), round(float(r.den), 3), int(r.n), int(r.cases), round(float(r.w2), 3)]
        for r in base_group.itertuples(index=False) if r.den > 0
    ]
    exact_rows = [
        [year_idx, int(r.uf_i), int(r.sex_i), int(r.exact_age_i), pop_idx,
         round(float(r.num), 3), round(float(r.den), 3), int(r.n), int(r.cases), round(float(r.w2), 3)]
        for r in exact_group.itertuples(index=False) if r.den > 0
    ]
    return base_rows, exact_rows


def main() -> None:
    """Coordena leitura dos microdados, cálculo dos indicadores, gravação das bases e relatório final.
    """
    themes, indicators = load_existing_metadata()
    indicator_ids = [item["id"] for item in indicators]
    missing = [item for item in indicator_ids if item not in RULES]
    if missing:
        raise RuntimeError(f"Indicadores sem regra: {missing}")

    age_handles: Dict[str, object] = {}
    age_first: Dict[str, bool] = {}
    indicator_source_files = {item["id"]: indicator_filename(item["label"]) for item in indicators}
    indicator_files = {item["id"]: bundle_filename(item["id"]) for item in indicators}
    indicator_labels = {item["id"]: item["label"] for item in indicators}
    for indicator_id in indicator_ids:
        handle = (AGE_DIR / indicator_source_files[indicator_id]).open("w", encoding="utf-8")
        handle.write(
            "/**\n"
            f" * Reúne os resultados por idade detalhada do indicador ‘{indicator_labels[indicator_id]}’.\n"
            " * O arquivo é produzido pelo recálculo dos microdados e não deve ser editado manualmente.\n"
            f" * O identificador interno {indicator_id} mantém a ligação com a metodologia e os testes.\n"
            " */\n\n"
        )
        handle.write(f'window.VIGITEL_AGE_DETAIL.loaded[{json.dumps(indicator_id)}]=[')
        age_handles[indicator_id] = handle
        age_first[indicator_id] = True

    aggregate_rows: List[List] = []
    needed = required_columns()
    total_respondents = 0
    weights_used = set()
    files = sorted(MICRO.glob("Microdados*.csv"))

    try:
        for file in files:
            year = year_from_filename(file)
            if not year or year not in YEAR_I:
                continue
            is_black = "populacaonegra" in file.name.lower() or "popnegra" in file.name.lower()
            population = "População Negra" if is_black else "População Geral"

            with file.open("r", encoding="utf-8-sig", errors="replace", newline="") as stream:
                header = next(csv.reader(stream))
            weight_col = "pesorake_cor" if is_black else ("pesorake2025" if "pesorake2025" in header else "pesorake")
            usecols = [column for column in needed if column in header]
            if weight_col not in usecols:
                continue
            weights_used.add(weight_col)

            df = pd.read_csv(file, usecols=usecols, low_memory=False)
            for column in df.columns:
                df[column] = numeric(df[column])

            # A base especial de 2018 contém pessoas brancas (q69_cor=1) e negras
            # (q69_cor=2). O recorte "População Negra" deve conter somente código 2.
            if is_black:
                if "q69_cor" not in df.columns:
                    raise RuntimeError(f"{file.name}: variável q69_cor ausente na base de população negra.")
                df = df.loc[df["q69_cor"].eq(2)].copy()

            valid = df["q6"].between(18, 120) & df["q7"].isin([1, 2]) & df["cidade"].isin(CITY_TO_UF)
            valid &= df[weight_col].notna() & df[weight_col].gt(0)
            df = df.loc[valid].copy()
            if df.empty:
                continue

            df["edition"] = int(year)
            df["uf"] = df["cidade"].astype(int).map(CITY_TO_UF)
            df["region"] = df["uf"].map(UF_TO_REGION)
            df["uf_i"] = df["uf"].map(UF_I)
            df["region_i"] = df["region"].map(REGION_I)
            df["sex_i"] = df["q7"].map(SEX_I)
            df["age_group_i"] = age_group_index(df["q6"])
            df["exact_age_i"] = np.minimum(df["q6"].astype(int), 80) - 18
            total_respondents += len(df)

            for indicator_idx, indicator_id in enumerate(indicator_ids):
                base_rows, exact_rows = aggregate_rule(
                    df, RULES[indicator_id], YEAR_I[year], POP_I[population], weight_col, indicator_idx
                )
                aggregate_rows.extend(base_rows)
                if exact_rows:
                    payload = json.dumps(exact_rows, ensure_ascii=False, separators=(",", ":"))[1:-1]
                    if not age_first[indicator_id]:
                        age_handles[indicator_id].write(",")
                    age_handles[indicator_id].write(payload)
                    age_first[indicator_id] = False
            print(f"Processado: {file.name}")
    finally:
        for handle in age_handles.values():
            handle.write("];\n")
            handle.close()

    # Reúne os arquivos temporários por tema e remove as cópias individuais.
    for prefix, bundle_name in BUNDLE_BY_PREFIX.items():
        bundle_ids = [indicator_id for indicator_id in indicator_ids if indicator_id.startswith(prefix)]
        sections = [
            "/**",
            f" * Reúne os dados de idade detalhada do grupo {prefix} em um único arquivo.",
            " * O agrupamento mantém o pacote plano e compatível com o envio pelo navegador.",
            " */",
            "",
        ]
        for indicator_id in bundle_ids:
            source_path = AGE_DIR / indicator_source_files[indicator_id]
            sections.append(source_path.read_text(encoding="utf-8").strip())
            sections.append("")
        encoded_ids = ",".join(json.dumps(indicator_id) for indicator_id in bundle_ids)
        sections.extend([
            f"[{encoded_ids}].forEach(function(indicador){{",
            "  window.VIGITEL_AGE_DETAIL.loadedVersion[indicador]=window.VIGITEL_AGE_DETAIL.meta.version;",
            "});",
            "",
        ])
        (AGE_DIR / bundle_name).write_text("\n".join(sections), encoding="utf-8")
        for indicator_id in bundle_ids:
            (AGE_DIR / indicator_source_files[indicator_id]).unlink(missing_ok=True)

    age_index = {
        "meta": {
            "updatedAt": "2026-07-18",
            "version": "edicaoAcademicaConsolidadaPlana",
            "distribution": "Arquivos organizados na raiz e dados detalhados agrupados por tema.",
            "ageVariable": "q6",
            "method": "Numerador e denominador ponderados calculados diretamente dos microdados em cada idade exata; 80 anos ou mais agrupados em 80+.",
            "supportedIndicators": indicator_ids,
            "unsupportedIndicators": {},
            "files": indicator_files,
        },
        "dims": {"years": YEARS, "ufs": UFS, "sexes": SEXES, "ages": EXACT_AGES, "pops": POPS},
    }
    (AGE_DIR / "CatalogoDeIdadeDetalhada.js").write_text(
        "/**\n"
        " * Define as dimensões da idade detalhada e relaciona os indicadores aos arquivos gerados.\n"
        " * Renomeações devem ser feitas pela função indicator_filename para manter o painel e os testes sincronizados.\n"
        " */\n\n"
        "window.VIGITEL_AGE_DETAIL=" + json.dumps(age_index, ensure_ascii=False, separators=(",", ":")) + ";window.VIGITEL_AGE_DETAIL.loaded={};window.VIGITEL_AGE_DETAIL.loadedVersion={};\n",
        encoding="utf-8",
    )

    methods = {
        indicator_id: {
            "variable": rule["variable"],
            "rule": rule["rule"],
            "denominator": rule["den"],
            "population": rule["population"],
            "weight": "pesorake2025 quando presente; fallback pesorake; pesorake_cor no recorte negro de 2018",
            "weightNote": "O gerador prioriza automaticamente pesorake2025. Se a coluna não estiver no arquivo, usa pesorake e registra a limitação nos metadados.",
            "updatedAt": "2026-07-18",
            "classification": CLASSIFICATIONS.get(indicator_id, "Derivado/recorte validado"),
            "ageVariable": "q6",
            "ageMethod": "Idade exata calculada diretamente de q6; valores de 80 anos ou mais agrupados em 80+.",
        }
        for indicator_id, rule in RULES.items()
    }
    METHOD_FILE.write_text("const INDICATOR_METHODS=" + json.dumps(methods, ensure_ascii=False, separators=(",", ":")) + ";\n", encoding="utf-8")

    data = {
        "meta": {
            "source": "Vigitel | Ministério da Saúde",
            "project": "Observatório Analítico do Vigitel",
            "creator": "Luanna Morais Alves da Silva",
            "rows": len(aggregate_rows),
            "respondentsProcessed": total_respondents,
            "yearsLabel": ("2006 a 2024 (exceto 2022)" if "2024" in YEARS else "2006 a 2023 (exceto 2022)"),
            "baseVersion": "v13.0 - metodologia revista, precisão amostral e pacote unificado",
            "baseUpdatedAt": "2026-07-18",
            "ageDetailMethod": "Idade exata recalculada diretamente de q6",
            "blackPopulationFilter": "2018 População Negra: q69_cor = 2 e peso pesorake_cor",
            "trafficHarmonization": "CT04–CT07 aplicam explicitamente cada etapa do fluxo: passou/parado → convidado → realizou → resultado, em 2014–2019",
            "passiveSmokingRevision": "TAB07 e TAB08 usam q67/q68 desde 2018 e incluem fumantes expostos no numerador, com todos os adultos entrevistados no denominador.",
            "physicalActivityRevision": "AF08 prioriza inativo_2023 em todas as edições em que a variável revista está disponível; usa inativo somente como fallback legado.",
            "weightColumnsUsed": sorted(weights_used),
            "weightStatus": ("oficial-harmonizado" if "pesorake2025" in weights_used else "legado-com-atualizador-pronto"),
            "weightLimitation": ("Nenhuma: pesorake2025 utilizado." if "pesorake2025" in weights_used else "Os microdados fornecidos não contêm pesorake2025 nem 2024; o pacote inclui atualizador para a base oficial 2006–2024."),
            "precisionMethod": "IC95% e CV aproximados no navegador pelo tamanho efetivo de Kish, usando soma dos pesos e soma dos pesos ao quadrado; não substituem análise completa do desenho amostral.",
        },
        "themes": themes,
        "indicators": indicators,
        "dims": {"years": YEARS, "regions": REGIONS, "ufs": UFS, "sexes": SEXES, "ages": AGE_GROUPS, "pops": POPS},
        "rows": aggregate_rows,
    }
    DATA_FILE.write_text(
        "\n/* Base agregada revisada. */\nconst DATA = " + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";\n\nconst $ = (sel) => document.querySelector(sel);\nconst $$ = (sel) => Array.from(document.querySelectorAll(sel));\n",
        encoding="utf-8",
    )

    validate(data, indicators)
    print(f"Linhas agregadas: {len(aggregate_rows):,}")
    print(f"Relatório: {REPORT_FILE}")


def national_series(data: dict, indicator_id: str, pop: str = "População Geral") -> Dict[str, float]:
    """Calcula a série nacional ponderada usada nas conferências.
    """
    indicator_idx = next(i for i, item in enumerate(data["indicators"]) if item["id"] == indicator_id)
    pop_idx = data["dims"]["pops"].index(pop)
    totals: Dict[int, List[float]] = {}
    for row in data["rows"]:
        if row[6] != indicator_idx or row[5] != pop_idx:
            continue
        year_idx = row[0]
        totals.setdefault(year_idx, [0.0, 0.0])
        totals[year_idx][0] += row[7]
        totals[year_idx][1] += row[8]
    return {data["dims"]["years"][year_idx]: num / den * 100 for year_idx, (num, den) in totals.items() if den > 0}


def validate(data: dict, indicators: List[dict]) -> None:
    """Confere a estrutura e a coerência dos ResultadosProcessados antes da gravação.
    """
    lines = [
        "RELATÓRIO DE VALIDAÇÃO DOS INDICADORES — V13.0",
        "=" * 62,
        f"Linhas agregadas: {len(data['rows']):,}",
        f"Indicadores: {len(indicators)}",
        "",
    ]
    errors: List[str] = []
    warnings: List[str] = []
    series = {item["id"]: national_series(data, item["id"]) for item in indicators}

    for item in indicators:
        values = series[item["id"]]
        if not values:
            errors.append(f"{item['id']} sem dados.")
            continue
        for year, value in values.items():
            if not np.isfinite(value) or value < -1e-8 or value > 100.0001:
                errors.append(f"{item['id']} {year}: valor fora de 0–100 ({value:.3f}).")
        rounded = {round(value, 6) for value in values.values()}
        if rounded == {0.0} or rounded == {100.0}:
            errors.append(f"{item['id']}: série inteira constante em {next(iter(rounded)):.0f}%.")
        ordered = [values[y] for y in sorted(values, key=int)]
        if len(ordered) > 1 and max(abs(b - a) for a, b in zip(ordered, ordered[1:])) > 45:
            warnings.append(f"{item['id']}: variação anual superior a 45 pontos percentuais; revisar período e questionário.")

    common_years = set(series["TAB01"]) & set(series["TAB04"])
    for year in common_years:
        if abs(series["TAB01"][year] + series["TAB04"][year] - 100) > 0.15:
            errors.append(f"TAB01 + TAB04 não soma 100% em {year}.")
    common_years = set(series["TAB01"]) & set(series["TAB02"]) & set(series["TAB03"])
    for year in common_years:
        if abs(series["TAB02"][year] + series["TAB03"][year] - series["TAB01"][year]) > 0.15:
            errors.append(f"TAB02 + TAB03 difere de TAB01 em {year}.")
    common_years = set(series["AS01"]) & set(series["AS02"]) & set(series["AS03"])
    for year in common_years:
        if abs(series["AS01"][year] + series["AS02"][year] + series["AS03"][year] - 100) > 0.15:
            errors.append(f"AS01 + AS02 + AS03 não soma 100% em {year}.")
    for year in set(series["IMC01"]) & set(series["IMC02"]):
        if series["IMC02"][year] > series["IMC01"][year] + 0.01:
            errors.append(f"Obesidade maior que excesso de peso em {year}.")

    checks_2023 = {
        "TAB01": (7.0, 12.0), "ALC03": (20.0, 35.0), "ALC04": (10.0, 22.0),
        "IMC01": (58.0, 65.0), "IMC02": (21.0, 27.0), "CA01": (54.0, 63.0),
        "CA06": (11.0, 18.0), "AF04": (35.0, 45.0), "AF08": (10.0, 18.0),
        "AS03": (3.0, 9.0), "MR01": (24.0, 31.0), "MR02": (8.0, 12.0), "MR07": (9.0, 15.0),
        "TAB05": (15.0, 28.0), "ALC01": (38.0, 50.0), "ALC02": (22.0, 35.0), "AF03": (40.0, 58.0),
    }
    lines.append("CHECAGENS DE ORDEM DE GRANDEZA — 2023")
    for indicator_id, (low, high) in checks_2023.items():
        value = series[indicator_id].get("2023")
        status = "OK" if value is not None and low <= value <= high else "REVISAR"
        lines.append(f"{indicator_id}: {value:.1f}% — {status}" if value is not None else f"{indicator_id}: sem 2023 — REVISAR")
        if value is None or not (low <= value <= high):
            errors.append(f"{indicator_id}: valor de 2023 fora da faixa de validação.")

    lines.extend(["", "ERROS", "------"])
    lines.extend(errors or ["Nenhum erro crítico encontrado."])
    lines.extend(["", "AVISOS", "------"])
    lines.extend(warnings or ["Nenhum aviso adicional."])
    lines.extend(["", "PERÍODOS DISPONÍVEIS", "--------------------"])
    for item in indicators:
        years = sorted(series[item["id"]], key=int)
        lines.append(f"{item['id']} — {item['label']}: {', '.join(years)}")
    REPORT_FILE.write_text("\n".join(lines) + "\n", encoding="utf-8")
    if errors:
        raise RuntimeError("A validação encontrou erros críticos. Consulte o relatório.")


if __name__ == "__main__":
    main()
