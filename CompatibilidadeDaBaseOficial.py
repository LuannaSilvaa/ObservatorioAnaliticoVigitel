#!/usr/bin/env python3
"""Ajustes restritos à base oficial consolidada de 2006 a 2024."""
from __future__ import annotations

import json
from typing import Any

import numpy as np
import pandas as pd

INDICADORES_INDISPONIVEIS = {
    "ALC07": "A variável derivada direcao não está presente no arquivo consolidado enviado.",
    "MR05": "A variável derivada asma não está presente no arquivo consolidado enviado.",
    "CT02": "A variável derivada direcao_alc não está presente no arquivo consolidado enviado.",
    "CT04": "As variáveis r153 e r137a do fluxo de blitz não estão presentes no arquivo consolidado enviado.",
    "CT05": "As variáveis r137a e r154 do fluxo do bafômetro não estão presentes no arquivo consolidado enviado.",
    "CT06": "As variáveis r154 e r155 do fluxo do bafômetro não estão presentes no arquivo consolidado enviado.",
    "CT07": "As variáveis r155 e r156 do resultado do bafômetro não estão presentes no arquivo consolidado enviado.",
    "CT08": "A variável r178 sobre uso de celular na condução não está presente no arquivo consolidado enviado.",
}


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


def _gravar_metadados_de_disponibilidade(calculador: Any, data: dict) -> None:
    """Registra indisponibilidades sem anunciar idade detalhada onde não existem dados."""
    data.setdefault("meta", {})["unsupportedIndicators"] = INDICADORES_INDISPONIVEIS
    for item in data.get("indicators", []):
        motivo = INDICADORES_INDISPONIVEIS.get(item.get("id"))
        if motivo:
            item["availability"] = "Indisponível na base consolidada enviada"
            item["availabilityReason"] = motivo
        else:
            item["availability"] = "Disponível conforme o período da variável"
            item.pop("availabilityReason", None)

    caminho = calculador.DATA_FILE
    texto = caminho.read_text(encoding="utf-8")
    marcador = "const DATA = "
    inicio = texto.index(marcador) + len(marcador)
    _, usado = json.JSONDecoder().raw_decode(texto[inicio:])
    codificado = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    caminho.write_text(texto[:inicio] + codificado + texto[inicio + usado :], encoding="utf-8")

    catalogo = calculador.AGE_DIR / "CatalogoDeIdadeDetalhada.js"
    if catalogo.is_file():
        conteudo = catalogo.read_text(encoding="utf-8")
        prefixo = "window.VIGITEL_AGE_DETAIL="
        inicio_catalogo = conteudo.index(prefixo) + len(prefixo)
        objeto, usado_catalogo = json.JSONDecoder().raw_decode(conteudo[inicio_catalogo:])
        meta_catalogo = objeto.setdefault("meta", {})
        meta_catalogo["unsupportedIndicators"] = INDICADORES_INDISPONIVEIS
        meta_catalogo["supportedIndicators"] = [
            indicador
            for indicador in meta_catalogo.get("supportedIndicators", [])
            if indicador not in INDICADORES_INDISPONIVEIS
        ]
        codificado_catalogo = json.dumps(objeto, ensure_ascii=False, separators=(",", ":"))
        catalogo.write_text(
            conteudo[:inicio_catalogo]
            + codificado_catalogo
            + conteudo[inicio_catalogo + usado_catalogo :],
            encoding="utf-8",
        )


def _criar_validador(calculador: Any):
    """Cria validação equivalente à original, tolerando somente ausências comprovadas."""
    def validar(data: dict, indicators: list[dict]) -> None:
        linhas = [
            "RELATÓRIO DE VALIDAÇÃO DOS INDICADORES — BASE OFICIAL 2006-2024",
            "=" * 72,
            f"Linhas agregadas: {len(data['rows']):,}",
            f"Indicadores cadastrados: {len(indicators)}",
            "",
        ]
        erros: list[str] = []
        avisos: list[str] = []
        series = {item["id"]: calculador.national_series(data, item["id"]) for item in indicators}

        for item in indicators:
            indicador = item["id"]
            valores = series[indicador]
            if not valores:
                if indicador in INDICADORES_INDISPONIVEIS:
                    avisos.append(f"{indicador}: {INDICADORES_INDISPONIVEIS[indicador]}")
                    continue
                erros.append(f"{indicador} sem dados.")
                continue

            for ano, valor in valores.items():
                if not np.isfinite(valor) or valor < -1e-8 or valor > 100.0001:
                    erros.append(f"{indicador} {ano}: valor fora de 0–100 ({valor:.3f}).")
            arredondados = {round(valor, 6) for valor in valores.values()}
            if arredondados == {0.0} or arredondados == {100.0}:
                erros.append(f"{indicador}: série inteira constante em {next(iter(arredondados)):.0f}%.")
            ordenados = [valores[ano] for ano in sorted(valores, key=int)]
            if len(ordenados) > 1 and max(abs(b - a) for a, b in zip(ordenados, ordenados[1:])) > 45:
                avisos.append(f"{indicador}: variação anual superior a 45 pontos percentuais.")

        for ano in set(series["TAB01"]) & set(series["TAB04"]):
            if abs(series["TAB01"][ano] + series["TAB04"][ano] - 100) > 0.15:
                erros.append(f"TAB01 + TAB04 não soma 100% em {ano}.")
        for ano in set(series["TAB01"]) & set(series["TAB02"]) & set(series["TAB03"]):
            if abs(series["TAB02"][ano] + series["TAB03"][ano] - series["TAB01"][ano]) > 0.15:
                erros.append(f"TAB02 + TAB03 difere de TAB01 em {ano}.")
        for ano in set(series["AS01"]) & set(series["AS02"]) & set(series["AS03"]):
            if abs(series["AS01"][ano] + series["AS02"][ano] + series["AS03"][ano] - 100) > 0.15:
                erros.append(f"AS01 + AS02 + AS03 não soma 100% em {ano}.")
        for ano in set(series["IMC01"]) & set(series["IMC02"]):
            if series["IMC02"][ano] > series["IMC01"][ano] + 0.01:
                erros.append(f"Obesidade maior que excesso de peso em {ano}.")

        checagens_2023 = {
            "TAB01": (7.0, 12.0), "ALC03": (20.0, 35.0), "ALC04": (10.0, 22.0),
            "IMC01": (58.0, 65.0), "IMC02": (21.0, 27.0), "CA01": (54.0, 63.0),
            "CA06": (11.0, 18.0), "AF04": (35.0, 45.0), "AF08": (10.0, 18.0),
            "AS03": (3.0, 9.0), "MR01": (24.0, 31.0), "MR02": (8.0, 12.0),
            "MR07": (9.0, 15.0), "TAB05": (15.0, 28.0), "ALC01": (38.0, 50.0),
            "ALC02": (22.0, 35.0), "AF03": (40.0, 58.0),
        }
        linhas.append("CHECAGENS DE ORDEM DE GRANDEZA — 2023")
        for indicador, (minimo, maximo) in checagens_2023.items():
            valor = series[indicador].get("2023")
            aprovado = valor is not None and minimo <= valor <= maximo
            linhas.append(
                f"{indicador}: {valor:.1f}% — {'OK' if aprovado else 'REVISAR'}"
                if valor is not None else f"{indicador}: sem 2023 — REVISAR"
            )
            if not aprovado:
                erros.append(f"{indicador}: valor de 2023 fora da faixa de validação.")

        _gravar_metadados_de_disponibilidade(calculador, data)

        linhas.extend(["", "ERROS", "------"])
        linhas.extend(erros or ["Nenhum erro crítico encontrado."])
        linhas.extend(["", "AVISOS", "------"])
        linhas.extend(avisos or ["Nenhum aviso adicional."])
        linhas.extend(["", "PERÍODOS DISPONÍVEIS", "--------------------"])
        for item in indicators:
            anos = sorted(series[item["id"]], key=int)
            linhas.append(f"{item['id']} — {item['label']}: {', '.join(anos)}")

        calculador.REPORT_FILE.write_text("\n".join(linhas) + "\n", encoding="utf-8")
        if erros:
            raise RuntimeError("A validação encontrou erros críticos. Consulte o relatório.")

    return validar


def aplicar_compatibilidade(calculador: Any) -> None:
    """Troca regras estáveis e instala validação consciente da disponibilidade."""
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
    calculador.validate = _criar_validador(calculador)
