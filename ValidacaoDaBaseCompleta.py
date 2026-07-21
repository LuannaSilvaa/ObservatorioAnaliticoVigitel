"""Rotina de validação usada para conferir a integridade dos dados e das regras do observatório.

As rotinas deste arquivo foram mantidas separadas para facilitar revisões futuras.
Antes de alterar regras de cálculo, confira o dicionário da edição correspondente e execute os testes do projeto.
"""

from __future__ import annotations

import json
import math
import re
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PUBLIC_ROOT = ROOT
DATA_PATH = ROOT / "BaseAnaliticaDoVigitel.js"
METHOD_PATH = ROOT / "MetodologiaDosIndicadores.js"
AGE_DIR = ROOT
REPORT = ROOT / "RelatorioDaValidacaoDaBase.txt"


def parse_data() -> dict:
    """Extrai o objeto de dados do arquivo JavaScript e o converte para Python.
    """
    text = DATA_PATH.read_text(encoding="utf-8")
    match = re.search(r"const DATA = (\{.*?\});[\s\S]*?const \$\s*=", text, re.S)
    if not match:
        raise RuntimeError("DATA não encontrado")
    return json.loads(match.group(1))


def parse_methods() -> dict:
    """Extrai o objeto metodológico do arquivo JavaScript e o converte para Python.
    """
    text = METHOD_PATH.read_text(encoding="utf-8")
    match = re.search(r"const INDICATOR_METHODS=(\{.*\});\s*$", text, re.S)
    if not match:
        raise RuntimeError("INDICATOR_METHODS não encontrado")
    return json.loads(match.group(1))


def pct(pair: list[float] | None) -> float | None:
    """Calcula a diferença percentual usada nas comparações de validação.
    """
    if not pair or pair[1] <= 0:
        return None
    return pair[0] / pair[1] * 100


def main() -> None:
    """Coordena leitura dos microdados, cálculo dos indicadores, gravação das bases e relatório final.
    """
    data = parse_data()
    methods = parse_methods()
    dims = data["dims"]
    indicators = data["indicators"]
    ids = [item["id"] for item in indicators]
    rows = data["rows"]
    errors: list[str] = []
    warnings: list[str] = []

    if len(ids) != 63:
        errors.append(f"Esperados 63 indicadores; encontrados {len(ids)}.")
    if len(ids) != len(set(ids)):
        errors.append("Há IDs de indicadores duplicados.")
    if set(ids) != set(methods):
        errors.append("O dicionário metodológico não corresponde aos 63 indicadores.")
    if data.get("meta", {}).get("baseVersion", "").find("v13.0") < 0:
        errors.append("Metadados não identificam a versão 13.0.")

    totals: dict[tuple[int, int, int], list[float]] = defaultdict(lambda: [0.0, 0.0, 0.0, 0.0, 0.0])
    seen = set()
    for index, row in enumerate(rows):
        if len(row) != 12:
            errors.append(f"Linha principal {index}: {len(row)} campos; esperado 12.")
            continue
        year, region, uf, sex, age, pop, ind, num, den, n, cases, w2 = row
        key = tuple(row[:7])
        if key in seen:
            errors.append(f"Linha principal duplicada na chave {key}.")
        seen.add(key)
        bounds = [
            (year, len(dims["years"]), "ano"), (region, len(dims["regions"]), "região"),
            (uf, len(dims["ufs"]), "UF"), (sex, len(dims["sexes"]), "sexo"),
            (age, len(dims["ages"]), "faixa etária"), (pop, len(dims["pops"]), "população"),
            (ind, len(indicators), "indicador"),
        ]
        for value, limit, label in bounds:
            if not isinstance(value, int) or not 0 <= value < limit:
                errors.append(f"Linha principal {index}: índice de {label} inválido ({value}).")
        if not all(math.isfinite(float(value)) for value in (num, den, n, cases, w2)):
            errors.append(f"Linha principal {index}: valor numérico não finito.")
        if den <= 0 or n <= 0 or w2 <= 0 or num < -1e-6 or num > den + 0.02:
            errors.append(f"Linha principal {index}: numerador, denominador, n ou soma de pesos² inválido.")
        if cases < 0 or cases > n:
            errors.append(f"Linha principal {index}: casos fora do intervalo 0–n.")
        acc = totals[(ind, year, pop)]
        for j, value in enumerate((num, den, n, cases, w2)):
            acc[j] += float(value)

    # Idade detalhada e equivalência com a base principal.
    index_text = (AGE_DIR / "CatalogoDeIdadeDetalhada.js").read_text(encoding="utf-8")
    index_match = re.search(r"window\.VIGITEL_AGE_DETAIL=(\{.*?\});window\.VIGITEL_AGE_DETAIL\.loaded=", index_text, re.S)
    if not index_match:
        errors.append("Índice de idade detalhada inválido.")
        age_meta = {"dims": {"years": [], "ufs": [], "sexes": [], "ages": [], "pops": []}, "meta": {}}
    else:
        age_meta = json.loads(index_match.group(1))
    if set(age_meta.get("meta", {}).get("supportedIndicators", [])) != set(ids):
        errors.append("A idade detalhada não declara exatamente os 63 indicadores.")

    exact_totals: dict[tuple[int, int, int], list[float]] = defaultdict(lambda: [0.0, 0.0, 0.0, 0.0, 0.0])
    exact_count = 0
    bundle_cache: dict[Path, str] = {}
    file_map = age_meta.get("meta", {}).get("files", {})
    for ind_index, indicator_id in enumerate(ids):
        path = AGE_DIR / file_map.get(indicator_id, "")
        if not path.exists():
            errors.append(f"Arquivo ausente para o indicador {indicator_id}: {file_map.get(indicator_id, 'não informado')}")
            continue
        bundle_text = bundle_cache.setdefault(path, path.read_text(encoding="utf-8"))
        pattern = rf'window\.VIGITEL_AGE_DETAIL\.loaded\[{re.escape(json.dumps(indicator_id))}\]=(\[.*?\]);'
        match = re.search(pattern, bundle_text, re.S)
        if not match:
            errors.append(f"Arquivo temático inválido para o indicador {indicator_id}: {path.name}")
            continue
        age_rows = json.loads(match.group(1))
        exact_count += len(age_rows)
        for row_index, row in enumerate(age_rows):
            if len(row) != 10:
                errors.append(f"{indicator_id}, linha {row_index}: {len(row)} campos; esperado 10.")
                continue
            year, uf, sex, age, pop, num, den, n, cases, w2 = row
            if den <= 0 or n <= 0 or w2 <= 0 or num < -1e-6 or num > den + 0.02 or cases < 0 or cases > n:
                errors.append(f"{indicator_id}, linha {row_index}: valores inválidos.")
            acc = exact_totals[(ind_index, year, pop)]
            for j, value in enumerate((num, den, n, cases, w2)):
                acc[j] += float(value)

    comparisons = 0
    for key, main in totals.items():
        exact = exact_totals.get(key)
        if not exact:
            errors.append(f"Sem idade detalhada para a combinação {key}.")
            continue
        comparisons += 1
        if abs(pct(main) - pct(exact)) > 0.015:
            errors.append(f"Divergência principal × idade detalhada em {key}: {pct(main):.4f}% × {pct(exact):.4f}%.")

    # Séries nacionais e relações lógicas.
    national: dict[str, dict[str, float]] = {indicator_id: {} for indicator_id in ids}
    for ind_index, indicator_id in enumerate(ids):
        for year_index, year in enumerate(dims["years"]):
            value = pct(totals.get((ind_index, year_index, 0)))
            if value is not None:
                national[indicator_id][year] = value
        if not national[indicator_id]:
            errors.append(f"{indicator_id}: série nacional vazia.")

    for year in set(national["TAB01"]) & set(national["TAB04"]):
        if abs(national["TAB01"][year] + national["TAB04"][year] - 100) > 0.15:
            errors.append(f"TAB01 + TAB04 não soma 100% em {year}.")
    for year in set(national["AS01"]) & set(national["AS02"]) & set(national["AS03"]):
        if abs(national["AS01"][year] + national["AS02"][year] + national["AS03"][year] - 100) > 0.15:
            errors.append(f"AS01 + AS02 + AS03 não soma 100% em {year}.")
    for year in set(national["IMC01"]) & set(national["IMC02"]):
        if national["IMC02"][year] > national["IMC01"][year] + 0.01:
            errors.append(f"Obesidade supera excesso de peso em {year}.")

    # Revisões metodológicas obrigatórias da v13.
    expected_passive_years = {"2018", "2019", "2020", "2021", "2023"}
    for indicator_id in ("TAB07", "TAB08"):
        if set(national[indicator_id]) != expected_passive_years:
            errors.append(f"{indicator_id}: anos inesperados {sorted(national[indicator_id])}.")
    af2023 = national["AF08"].get("2023")
    if af2023 is None or not 12.9 <= af2023 <= 13.3:
        errors.append(f"AF08/2023 deveria reproduzir aproximadamente 13,1%; encontrado {af2023}.")
    if not 8.2 <= national["TAB07"].get("2023", -1) <= 8.7:
        errors.append("TAB07/2023 fora da faixa esperada com os pesos legados.")
    if not 8.8 <= national["TAB08"].get("2023", -1) <= 9.3:
        errors.append("TAB08/2023 fora da faixa esperada com os pesos legados.")

    # Fluxo de trânsito: as contagens elegíveis não podem aumentar ao avançar etapas.
    traffic = {indicator_id: ids.index(indicator_id) for indicator_id in ("CT04", "CT05", "CT06", "CT07")}
    for year_index, year in enumerate(dims["years"]):
        counts = []
        present = True
        for indicator_id in ("CT04", "CT05", "CT06", "CT07"):
            item = totals.get((traffic[indicator_id], year_index, 0))
            if not item:
                present = False
                break
            counts.append(item[2])
        if present and any(b > a + 1e-6 for a, b in zip(counts, counts[1:])):
            errors.append(f"Fluxo CT04→CT07 cresce indevidamente em {year}: {counts}.")

    if "pesorake2025" not in data.get("meta", {}).get("weightColumnsUsed", []):
        warnings.append("A base incluída ainda usa pesos legados; o atualizador oficial está incluído no pacote.")

    lines = [
        "VALIDAÇÃO COMPLETA DA BASE — V13.0 UNIFICADO",
        "=" * 62,
        f"Indicadores: {len(ids)}",
        f"Linhas agregadas: {len(rows):,}",
        f"Linhas de idade detalhada: {exact_count:,}",
        f"Comparações principal × idade detalhada: {comparisons:,}",
        f"Métodos documentados: {len(methods)}",
        f"Erros: {len(errors)}",
        f"Avisos: {len(warnings)}",
        "",
        "ERROS",
        "------",
        *(errors or ["Nenhum erro encontrado."]),
        "",
        "AVISOS",
        "------",
        *(warnings or ["Nenhum aviso adicional."]),
    ]
    REPORT.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print("\n".join(lines))
    if errors:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
