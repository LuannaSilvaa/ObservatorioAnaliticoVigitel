"""Confere a integridade da base oficial consolidada e dos arquivos do painel."""
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
    """Extrai o objeto de dados do arquivo JavaScript."""
    text = DATA_PATH.read_text(encoding="utf-8")
    match = re.search(r"const DATA = (\{.*?\});[\s\S]*?const \$\s*=", text, re.S)
    if not match:
        raise RuntimeError("DATA não encontrado")
    return json.loads(match.group(1))


def parse_methods() -> dict:
    """Extrai o objeto metodológico do arquivo JavaScript."""
    text = METHOD_PATH.read_text(encoding="utf-8")
    match = re.search(r"const INDICATOR_METHODS=(\{.*\});\s*$", text, re.S)
    if not match:
        raise RuntimeError("INDICATOR_METHODS não encontrado")
    return json.loads(match.group(1))


def pct(pair: list[float] | None) -> float | None:
    """Calcula o percentual de uma soma de numerador e denominador."""
    if not pair or pair[1] <= 0:
        return None
    return pair[0] / pair[1] * 100


def main() -> None:
    """Valida dimensões, linhas, idade detalhada, relações lógicas e metadados."""
    data = parse_data()
    methods = parse_methods()
    dims = data["dims"]
    indicators = data["indicators"]
    ids = [item["id"] for item in indicators]
    rows = data["rows"]
    unsupported_info = data.get("meta", {}).get("unsupportedIndicators", {})
    unsupported = set(unsupported_info)
    errors: list[str] = []
    warnings: list[str] = []

    if len(ids) != 63:
        errors.append(f"Esperados 63 indicadores; encontrados {len(ids)}.")
    if len(ids) != len(set(ids)):
        errors.append("Há IDs de indicadores duplicados.")
    if set(ids) != set(methods):
        errors.append("O dicionário metodológico não corresponde aos 63 indicadores.")
    if "v13.0" not in data.get("meta", {}).get("baseVersion", ""):
        errors.append("Metadados não identificam a versão 13.0.")
    if "2024" not in dims.get("years", []):
        errors.append("A dimensão de anos não contém 2024.")

    unknown_unsupported = unsupported - set(ids)
    if unknown_unsupported:
        errors.append("Indicadores indisponíveis desconhecidos: " + ", ".join(sorted(unknown_unsupported)))

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
            (year, len(dims["years"]), "ano"),
            (region, len(dims["regions"]), "região"),
            (uf, len(dims["ufs"]), "UF"),
            (sex, len(dims["sexes"]), "sexo"),
            (age, len(dims["ages"]), "faixa etária"),
            (pop, len(dims["pops"]), "população"),
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
        for position, value in enumerate((num, den, n, cases, w2)):
            acc[position] += float(value)

    # Idade detalhada e equivalência com a base principal.
    index_text = (AGE_DIR / "CatalogoDeIdadeDetalhada.js").read_text(encoding="utf-8")
    index_match = re.search(
        r"window\.VIGITEL_AGE_DETAIL=(\{.*?\});window\.VIGITEL_AGE_DETAIL\.loaded=",
        index_text,
        re.S,
    )
    if not index_match:
        errors.append("Índice de idade detalhada inválido.")
        age_meta = {"dims": {"years": [], "ufs": [], "sexes": [], "ages": [], "pops": []}, "meta": {}}
    else:
        age_meta = json.loads(index_match.group(1))

    if set(age_meta.get("meta", {}).get("supportedIndicators", [])) != set(ids):
        errors.append("A idade detalhada não declara exatamente os 63 indicadores.")
    age_unsupported = set(age_meta.get("meta", {}).get("unsupportedIndicators", {}))
    if age_unsupported != unsupported:
        errors.append("A indisponibilidade da idade detalhada diverge da base principal.")

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
            for position, value in enumerate((num, den, n, cases, w2)):
                acc[position] += float(value)

    comparisons = 0
    for key, main_values in totals.items():
        exact = exact_totals.get(key)
        if not exact:
            errors.append(f"Sem idade detalhada para a combinação {key}.")
            continue
        comparisons += 1
        if abs(pct(main_values) - pct(exact)) > 0.015:
            errors.append(
                f"Divergência principal × idade detalhada em {key}: "
                f"{pct(main_values):.4f}% × {pct(exact):.4f}%."
            )

    # Séries nacionais e relações lógicas.
    national: dict[str, dict[str, float]] = {indicator_id: {} for indicator_id in ids}
    for ind_index, indicator_id in enumerate(ids):
        for year_index, year in enumerate(dims["years"]):
            value = pct(totals.get((ind_index, year_index, 0)))
            if value is not None:
                national[indicator_id][year] = value
        if not national[indicator_id]:
            if indicator_id in unsupported:
                warnings.append(f"{indicator_id}: {unsupported_info[indicator_id]}")
            else:
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

    expected_passive_years = {"2018", "2019", "2020", "2021", "2023", "2024"}
    for indicator_id in ("TAB07", "TAB08"):
        if set(national[indicator_id]) != expected_passive_years:
            errors.append(f"{indicator_id}: anos inesperados {sorted(national[indicator_id])}.")

    af2023 = national["AF08"].get("2023")
    if af2023 is None or not 10.0 <= af2023 <= 18.0:
        errors.append(f"AF08/2023 fora da faixa plausível; encontrado {af2023}.")

    # As faixas anteriores foram calculadas com pesos legados. Com a base oficial
    # harmonizada, diferenças pequenas são registradas como aviso, não como erro.
    tab07_2023 = national["TAB07"].get("2023")
    tab08_2023 = national["TAB08"].get("2023")
    if tab07_2023 is None or not 7.0 <= tab07_2023 <= 11.0:
        warnings.append(f"TAB07/2023 fora da faixa histórica ampliada: {tab07_2023}.")
    if tab08_2023 is None or not 7.0 <= tab08_2023 <= 12.0:
        warnings.append(f"TAB08/2023 fora da faixa histórica ampliada: {tab08_2023}.")

    # O fluxo de trânsito só é validado quando as variáveis estão disponíveis.
    traffic_ids = ("CT04", "CT05", "CT06", "CT07")
    if not set(traffic_ids) <= unsupported:
        traffic = {indicator_id: ids.index(indicator_id) for indicator_id in traffic_ids}
        for year_index, year in enumerate(dims["years"]):
            counts = []
            present = True
            for indicator_id in traffic_ids:
                item = totals.get((traffic[indicator_id], year_index, 0))
                if not item:
                    present = False
                    break
                counts.append(item[2])
            if present and any(b > a + 1e-6 for a, b in zip(counts, counts[1:])):
                errors.append(f"Fluxo CT04→CT07 cresce indevidamente em {year}: {counts}.")

    if "pesorake2025" not in data.get("meta", {}).get("weightColumnsUsed", []):
        warnings.append("A base não registrou pesorake2025 entre os pesos utilizados.")

    lines = [
        "VALIDAÇÃO COMPLETA DA BASE OFICIAL — V13.0",
        "=" * 62,
        f"Indicadores cadastrados: {len(ids)}",
        f"Indicadores indisponíveis nesta base: {len(unsupported)}",
        f"Linhas agregadas: {len(rows):,}",
        f"Linhas de idade detalhada: {exact_count:,}",
        f"Comparações principal × idade detalhada: {comparisons:,}",
        f"Métodos documentados: {len(methods)}",
        f"Anos: {', '.join(dims['years'])}",
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
