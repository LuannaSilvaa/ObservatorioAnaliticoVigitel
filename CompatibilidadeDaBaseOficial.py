#!/usr/bin/env python3
"""Ajustes restritos à base oficial consolidada de 2006 a 2024."""
from __future__ import annotations

from typing import Any

import pandas as pd


def frequencia_atividade_oficial(df: pd.DataFrame) -> tuple[pd.Series, pd.Series]:
    """AF02: prática em três ou mais dias por semana, usando ``freq`` oficial."""
    pratica = df["q42"].isin([1, 2])
    frequencia = pd.to_numeric(df["freq"], errors="coerce")
    evento = pratica & df["q42"].eq(1) & frequencia.ge(3.5)
    return pratica, evento


def duracao_atividade_oficial(df: pd.DataFrame) -> tuple[pd.Series, pd.Series]:
    """AF03: sessão com pelo menos 30 minutos, usando o tempo derivado oficial."""
    pratica = df["q42"].isin([1, 2])
    tempo_revisto = pd.to_numeric(df.get("time_2023"), errors="coerce")
    tempo_legado = pd.to_numeric(df.get("time"), errors="coerce")
    tempo = tempo_revisto.where(tempo_revisto.notna(), tempo_legado)
    evento = pratica & df["q42"].eq(1) & tempo.ge(30)
    return pratica, evento


def aplicar_compatibilidade(calculador: Any) -> None:
    """Troca apenas regras cuja variável derivada oficial é mais estável."""
    calculador.RULES["AF02"].update(
        {
            "cols": ["q42", "freq"],
            "fn": frequencia_atividade_oficial,
            "variable": "q42 e freq",
            "rule": "q42 = 1 e frequência oficial igual ou superior a 3,5 dias por semana",
        }
    )
    calculador.RULES["AF03"].update(
        {
            "cols": ["q42", "time", "time_2023"],
            "fn": duracao_atividade_oficial,
            "variable": "q42, time e time_2023",
            "rule": "q42 = 1 e duração oficial igual ou superior a 30 minutos",
        }
    )
