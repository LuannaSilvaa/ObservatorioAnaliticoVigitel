#!/usr/bin/env python3
"""Audita a cobertura e a equivalência integral da idade detalhada do Vigitel.

A conferência reconstrói cada linha da base principal a partir das idades exatas,
considerando ano, região, UF, sexo, faixa etária, população e indicador. Assim,
não basta que o total nacional coincida: todos os recortes publicados precisam
ser reproduzidos pela base de idade detalhada.
"""
from __future__ import annotations

import json
import math
import re
from collections import defaultdict
from pathlib import Path
from typing import Iterable

ROOT = Path(__file__).resolve().parent
DATA_PATH = ROOT / "BaseAnaliticaDoVigitel.js"
CATALOG_PATH = ROOT / "CatalogoDeIdadeDetalhada.js"
REPORT_PATH = ROOT / "RelatorioDaAuditoriaDaIdadeDetalhada.txt"

UF_REGION = {
    "AC": "Norte", "AL": "Nordeste", "AM": "Norte", "AP": "Norte",
    "BA": "Nordeste", "CE": "Nordeste", "DF": "Centro-Oeste",
    "ES": "Sudeste", "GO": "Centro-Oeste", "MA": "Nordeste",
    "MG": "Sudeste", "MS": "Centro-Oeste", "MT": "Centro-Oeste",
    "PA": "Norte", "PB": "Nordeste", "PE": "Nordeste", "PI": "Nordeste",
    "PR": "Sul", "RJ": "Sudeste", "RN": "Nordeste", "RO": "Norte",
    "RR": "Norte", "RS": "Sul", "SC": "Sul", "SE": "Nordeste",
    "SP": "Sudeste", "TO": "Norte",
}

MAIN_NUMERIC_TOLERANCE = 0.12
PERCENTAGE_TOLERANCE = 0.02


def extract_json(path: Path, prefix: str) -> dict:
    """Extrai um objeto JSON que aparece após um marcador JavaScript."""
    text = path.read_text(encoding="utf-8")
    start = text.index(prefix) + len(prefix)
    payload, _ = json.JSONDecoder().raw_decode(text[start:])
    return payload


def percentage(values: Iterable[float]) -> float:
    """Calcula percentual a partir de numerador e denominador."""
    values = list(values)
    return values[0] / values[1] * 100 if values[1] > 0 else math.nan


def exact_age_group(label: str) -> int:
    """Converte o rótulo de idade exata para o índice da faixa do painel."""
    match = re.match(r"(\d+)", label)
    if not match:
        raise ValueError(f"Rótulo de idade detalhada inválido: {label}")
    age = int(match.group(1))
    if age <= 24:
        return 0
    if age <= 34:
        return 1
    if age <= 44:
        return 2
    if age <= 54:
        return 3
    if age <= 64:
        return 4
    return 5


def parse_indicator_rows(bundle_text: str, indicator_id: str) -> list[list]:
    """Extrai do arquivo temático as linhas de um indicador."""
    encoded = re.escape(json.dumps(indicator_id))
    match = re.search(
        rf"window\.VIGITEL_AGE_DETAIL\.loaded\[{encoded}\]=(\[.*?\]);",
        bundle_text,
        re.S,
    )
    if not match:
        raise RuntimeError(f"Atribuição de idade detalhada não encontrada para {indicator_id}.")
    return json.loads(match.group(1))


def main() -> int:
    """Executa a auditoria completa e grava um relatório legível."""
    data = extract_json(DATA_PATH, "const DATA = ")
    catalog = extract_json(CATALOG_PATH, "window.VIGITEL_AGE_DETAIL=")
    dims = data["dims"]
    age_dims = catalog["dims"]
    indicators = data["indicators"]
    indicator_ids = [item["id"] for item in indicators]
    unsupported_info = data.get("meta", {}).get("unsupportedIndicators", {})
    unsupported = set(unsupported_info)
    errors: list[str] = []
    warnings: list[str] = []

    if dims["years"] != age_dims.get("years"):
        errors.append("Os anos do catálogo detalhado divergem da base principal.")
    if dims["ufs"] != age_dims.get("ufs"):
        errors.append("As UFs do catálogo detalhado divergem da base principal.")
    if dims["sexes"] != age_dims.get("sexes"):
        errors.append("Os sexos do catálogo detalhado divergem da base principal.")
    if dims["pops"] != age_dims.get("pops"):
        errors.append("As populações do catálogo detalhado divergem da base principal.")

    region_index = {region: index for index, region in enumerate(dims["regions"])}
    uf_region_index = {
        index: region_index[UF_REGION[uf]]
        for index, uf in enumerate(dims["ufs"])
    }
    age_group_index = {
        index: exact_age_group(label)
        for index, label in enumerate(age_dims["ages"])
    }

    main_by_key: dict[tuple[int, ...], list[float]] = {}
    main_indicators: set[str] = set()
    for row_number, row in enumerate(data["rows"]):
        if len(row) != 12:
            errors.append(f"Linha principal {row_number} possui {len(row)} campos.")
            continue
        key = tuple(int(value) for value in row[:7])
        if key in main_by_key:
            errors.append(f"Chave duplicada na base principal: {key}.")
            continue
        main_by_key[key] = [float(value) for value in row[7:12]]
        main_indicators.add(indicator_ids[key[6]])

    available = main_indicators
    expected_supported = available
    declared_supported = set(catalog.get("meta", {}).get("supportedIndicators", []))
    declared_unsupported = set(catalog.get("meta", {}).get("unsupportedIndicators", {}))

    missing_supported = expected_supported - declared_supported
    if missing_supported:
        errors.append(
            "Indicadores com dados não declarados para idade detalhada: "
            + ", ".join(sorted(missing_supported))
        )
    extra_supported = declared_supported - expected_supported
    if extra_supported:
        warnings.append(
            "O catálogo ainda lista indicadores sem dados como suportados; a interface os bloqueia: "
            + ", ".join(sorted(extra_supported))
        )
    if declared_unsupported != unsupported:
        errors.append("A relação de indicadores indisponíveis diverge entre base e catálogo.")

    unsupported_with_main_rows = unsupported & available
    if unsupported_with_main_rows:
        errors.append(
            "Indicadores marcados como indisponíveis possuem linhas principais: "
            + ", ".join(sorted(unsupported_with_main_rows))
        )
    missing_unavailability = (set(indicator_ids) - available) - unsupported
    if missing_unavailability:
        errors.append(
            "Indicadores sem dados e sem justificativa de indisponibilidade: "
            + ", ".join(sorted(missing_unavailability))
        )

    exact_by_key: dict[tuple[int, ...], list[float]] = defaultdict(
        lambda: [0.0, 0.0, 0.0, 0.0, 0.0]
    )
    exact_indicator_rows: dict[str, int] = {}
    bundle_cache: dict[Path, str] = {}
    file_map = catalog.get("meta", {}).get("files", {})

    for indicator_index, indicator_id in enumerate(indicator_ids):
        file_name = file_map.get(indicator_id)
        if not file_name:
            errors.append(f"O catálogo não informa arquivo para {indicator_id}.")
            continue
        bundle_path = ROOT / file_name
        if not bundle_path.is_file():
            errors.append(f"Arquivo temático ausente para {indicator_id}: {file_name}.")
            continue
        bundle_text = bundle_cache.setdefault(
            bundle_path, bundle_path.read_text(encoding="utf-8")
        )
        try:
            rows = parse_indicator_rows(bundle_text, indicator_id)
        except (RuntimeError, ValueError, json.JSONDecodeError) as error:
            errors.append(str(error))
            continue

        exact_indicator_rows[indicator_id] = len(rows)
        if indicator_id in available and not rows:
            errors.append(f"{indicator_id} possui dados principais, mas a idade detalhada está vazia.")
        if indicator_id in unsupported and rows:
            errors.append(f"{indicator_id} está indisponível, mas possui linhas detalhadas inesperadas.")

        seen_exact: set[tuple[int, ...]] = set()
        for row_number, row in enumerate(rows):
            if len(row) != 10:
                errors.append(
                    f"{indicator_id}, linha detalhada {row_number}: {len(row)} campos; esperado 10."
                )
                continue
            year, uf, sex, exact_age, pop = (int(value) for value in row[:5])
            exact_key = (year, uf, sex, exact_age, pop)
            if exact_key in seen_exact:
                errors.append(f"{indicator_id}: chave detalhada duplicada {exact_key}.")
                continue
            seen_exact.add(exact_key)

            limits = (
                (year, len(age_dims["years"]), "ano"),
                (uf, len(age_dims["ufs"]), "UF"),
                (sex, len(age_dims["sexes"]), "sexo"),
                (exact_age, len(age_dims["ages"]), "idade"),
                (pop, len(age_dims["pops"]), "população"),
            )
            invalid = False
            for value, limit, label in limits:
                if value < 0 or value >= limit:
                    errors.append(
                        f"{indicator_id}, linha {row_number}: índice de {label} inválido ({value})."
                    )
                    invalid = True
            if invalid:
                continue

            num, den, n, cases, w2 = (float(value) for value in row[5:10])
            if (
                not all(math.isfinite(value) for value in (num, den, n, cases, w2))
                or den <= 0
                or n <= 0
                or w2 <= 0
                or num < -1e-6
                or num > den + 0.02
                or cases < 0
                or cases > n
            ):
                errors.append(f"{indicator_id}, linha {row_number}: valores numéricos inválidos.")
                continue

            main_key = (
                year,
                uf_region_index[uf],
                uf,
                sex,
                age_group_index[exact_age],
                pop,
                indicator_index,
            )
            accumulator = exact_by_key[main_key]
            for position, value in enumerate((num, den, n, cases, w2)):
                accumulator[position] += value

    main_keys_available = {
        key for key in main_by_key if indicator_ids[key[6]] in available
    }
    exact_keys_available = {
        key for key in exact_by_key if indicator_ids[key[6]] in available
    }
    missing_exact_keys = main_keys_available - exact_keys_available
    extra_exact_keys = exact_keys_available - main_keys_available
    if missing_exact_keys:
        errors.append(
            f"A idade detalhada não reconstrói {len(missing_exact_keys):,} combinações da base principal."
        )
    if extra_exact_keys:
        errors.append(
            f"A idade detalhada produz {len(extra_exact_keys):,} combinações inexistentes na base principal."
        )

    compared = 0
    divergent = 0
    for key in sorted(main_keys_available & exact_keys_available):
        main_values = main_by_key[key]
        exact_values = exact_by_key[key]
        compared += 1
        indicator_id = indicator_ids[key[6]]

        if round(main_values[2]) != round(exact_values[2]):
            errors.append(
                f"{indicator_id} {key[:6]}: entrevistas divergem "
                f"({main_values[2]:.0f} × {exact_values[2]:.0f})."
            )
            divergent += 1
            continue
        if round(main_values[3]) != round(exact_values[3]):
            errors.append(
                f"{indicator_id} {key[:6]}: casos divergem "
                f"({main_values[3]:.0f} × {exact_values[3]:.0f})."
            )
            divergent += 1
            continue

        percentage_difference = abs(percentage(main_values) - percentage(exact_values))
        numeric_differences = [
            abs(main_values[position] - exact_values[position])
            for position in (0, 1, 4)
        ]
        if (
            percentage_difference > PERCENTAGE_TOLERANCE
            or max(numeric_differences) > MAIN_NUMERIC_TOLERANCE
        ):
            errors.append(
                f"{indicator_id} {key[:6]}: principal × detalhada diverge; "
                f"percentual {percentage(main_values):.5f}% × {percentage(exact_values):.5f}%, "
                f"diferenças num/den/w2={numeric_differences}."
            )
            divergent += 1

    lines = [
        "AUDITORIA INTEGRAL DA IDADE DETALHADA — VIGITEL",
        "=" * 64,
        f"Indicadores cadastrados: {len(indicator_ids)}",
        f"Indicadores com dados principais: {len(available)}",
        f"Indicadores indisponíveis documentados: {len(unsupported)}",
        f"Indicadores detalhados com linhas: {sum(1 for value in exact_indicator_rows.values() if value)}",
        f"Linhas detalhadas: {sum(exact_indicator_rows.values()):,}",
        f"Combinações principais comparadas integralmente: {compared:,}",
        f"Combinações divergentes: {divergent:,}",
        f"Erros: {len(errors)}",
        f"Avisos: {len(warnings)}",
        "",
        "COBERTURA POR INDICADOR",
        "-----------------------",
    ]
    for indicator_id in indicator_ids:
        status = (
            "indisponível na origem"
            if indicator_id in unsupported
            else f"{exact_indicator_rows.get(indicator_id, 0):,} linhas detalhadas"
        )
        lines.append(f"{indicator_id}: {status}")

    lines.extend(["", "ERROS", "------", *(errors or ["Nenhum erro encontrado."])])
    lines.extend(["", "AVISOS", "------", *(warnings or ["Nenhum aviso adicional."])])
    REPORT_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print("\n".join(lines))
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
