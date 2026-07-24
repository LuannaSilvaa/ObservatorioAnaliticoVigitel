#!/usr/bin/env python3
"""Valida se todos os arquivos derivados correspondem à base canônica publicada."""
from __future__ import annotations

import csv
import hashlib
import json
from pathlib import Path
from typing import Any

import SincronizarArquivosDoObservatorio as sync

ROOT = Path(__file__).resolve().parent


def load_data() -> dict[str, Any]:
    """Carrega o objeto DATA usando a mesma regra da sincronização."""
    return sync.load_data()[3]


def read_metadata() -> dict[str, str]:
    """Lê os metadados tabulares como um dicionário simples."""
    with sync.METADATA_PATH.open("r", encoding="utf-8-sig", newline="") as stream:
        return {row["campo"]: row["descricao"] for row in csv.DictReader(stream)}


def validate_interviews(data: dict[str, Any], errors: list[str]) -> None:
    """Confere anos, contagens e método no arquivo de entrevistas."""
    with sync.INTERVIEWS_PATH.open("r", encoding="utf-8-sig", newline="") as stream:
        rows = list(csv.DictReader(stream))
    years = [row.get("ano", "") for row in rows]
    if years != data["dims"]["years"]:
        errors.append(f"EntrevistasPorAno.csv possui anos {years}, esperados {data['dims']['years']}.")
    total = 0
    for row in rows:
        try:
            received = int(row["linhas_recebidas"])
            valid = int(row["entrevistas_validas_utilizadas"])
        except (KeyError, TypeError, ValueError):
            errors.append(f"Linha anual inválida: {row}")
            continue
        if received < valid or valid <= 0:
            errors.append(f"Contagem anual incoerente em {row.get('ano')}: recebidas={received}, válidas={valid}.")
        if not row.get("metodo_contagem"):
            errors.append(f"Método de contagem ausente em {row.get('ano')}.")
        total += valid
    expected = int(data.get("meta", {}).get("respondentsProcessed", -1))
    if total != expected:
        errors.append(f"Soma das entrevistas ({total}) difere de respondentsProcessed ({expected}).")


def validate_metadata(data: dict[str, Any], errors: list[str]) -> None:
    """Compara o CSV de metadados com os valores da base canônica."""
    metadata = read_metadata()
    meta = data["meta"]
    checks = {
        "Arquivo recebido": str(meta.get("lastUpdateSourceFile", "Não informado")),
        "Período": str(meta.get("yearsLabel", "")),
        "Anos disponíveis": ", ".join(data["dims"]["years"]),
        "Entrevistas válidas utilizadas": str(meta.get("respondentsProcessed", "")),
        "Linhas agregadas publicadas": str(len(data["rows"])),
        "Indicadores cadastrados": str(len(data["indicators"])),
        "Indicadores indisponíveis": str(len(meta.get("unsupportedIndicators", {}))),
    }
    for field, expected in checks.items():
        if metadata.get(field) != expected:
            errors.append(f"Metadados: {field}={metadata.get(field)!r}; esperado {expected!r}.")


def validate_aggregate_parts(data: dict[str, Any], errors: list[str]) -> None:
    """Confere se as três partes CSV reproduzem todas as linhas e dimensões da base."""
    expected_header = [
        "ano", "regiao", "uf", "sexo", "faixa_etaria", "escolaridade",
        "tipo_populacao", "tema", "indicador_id", "indicador", "valor",
        "unidade", "numerador", "denominador", "n_entrevistas",
    ]
    count = 0
    years: set[str] = set()
    indicator_ids: set[str] = set()
    for path in sync.PART_PATHS:
        with path.open("r", encoding="utf-8-sig", newline="") as stream:
            reader = csv.DictReader(stream)
            if reader.fieldnames != expected_header:
                errors.append(f"{path.name}: cabeçalho divergente.")
            for row in reader:
                count += 1
                years.add(row.get("ano", ""))
                indicator_ids.add(row.get("indicador_id", ""))
                try:
                    denominator = float(row["denominador"])
                    numerator = float(row["numerador"])
                    value = float(row["valor"])
                except (KeyError, TypeError, ValueError):
                    errors.append(f"{path.name}: linha numérica inválida próxima de {row.get('indicador_id')} / {row.get('ano')}.")
                    continue
                expected_value = numerator / denominator * 100 if denominator > 0 else 0
                if denominator <= 0 or abs(value - expected_value) > 1e-8:
                    errors.append(f"{path.name}: prevalência divergente em {row.get('indicador_id')} / {row.get('ano')}.")
    if count != len(data["rows"]):
        errors.append(f"Partes CSV possuem {count} linhas; a base possui {len(data['rows'])}.")
    if years != set(data["dims"]["years"]):
        errors.append(f"Anos das partes CSV {sorted(years)} diferem da base {data['dims']['years']}.")
    expected_indicators = {
        item["id"] for item in data["indicators"]
        if item["id"] not in data.get("meta", {}).get("unsupportedIndicators", {})
    }
    if indicator_ids != expected_indicators:
        missing = sorted(expected_indicators - indicator_ids)
        unexpected = sorted(indicator_ids - expected_indicators)
        errors.append(f"Indicadores das partes CSV divergentes; ausentes={missing}, inesperados={unexpected}.")


def validate_readme(data: dict[str, Any], errors: list[str]) -> None:
    """Garante que a cobertura pública não permaneça com o período antigo."""
    text = sync.README_PATH.read_text(encoding="utf-8")
    required = [
        data["meta"]["yearsLabel"],
        data["meta"]["lastUpdateSourceFile"],
        f"{int(data['meta']['respondentsProcessed']):,}",
        "indicadores permanecem identificados como indisponíveis",
    ]
    for fragment in required:
        if fragment not in text:
            errors.append(f"README não contém a informação sincronizada: {fragment!r}.")
    if "2006 a 2021 e 2023" in text or "entre 2006 e 2023" in text:
        errors.append("README ainda contém descrição do período anterior.")


def validate_report(data: dict[str, Any], errors: list[str]) -> None:
    """Confere a presença do resumo operacional da última sincronização."""
    text = sync.REPORT_PATH.read_text(encoding="utf-8", errors="replace")
    required = [
        "===== SINCRONIZAÇÃO AUTOMÁTICA =====",
        data["meta"]["lastUpdateSourceFile"],
        data["meta"]["yearsLabel"],
        "Arquivos sincronizados:",
    ]
    for fragment in required:
        if fragment not in text:
            errors.append(f"Relatório da atualização não contém {fragment!r}.")


def validate_manifest(errors: list[str]) -> None:
    """Regenera e valida tamanho e SHA-256 de cada arquivo estável da raiz."""
    sync.generate_manifest()
    with sync.MANIFEST_PATH.open("r", encoding="utf-8-sig", newline="") as stream:
        rows = list(csv.DictReader(stream))
    listed = {row["Arquivo"] for row in rows}
    expected = {path.name for path in sync.manifest_files()}
    if listed != expected:
        errors.append(f"Manifesto diverge dos arquivos estáveis; ausentes={sorted(expected-listed)}, extras={sorted(listed-expected)}.")
    for row in rows:
        path = ROOT / row["Arquivo"]
        if not path.is_file():
            errors.append(f"Manifesto aponta arquivo inexistente: {path.name}.")
            continue
        try:
            size = int(row["TamanhoEmBytes"])
        except ValueError:
            errors.append(f"Manifesto possui tamanho inválido para {path.name}.")
            continue
        if size != path.stat().st_size:
            errors.append(f"Manifesto possui tamanho desatualizado para {path.name}.")
        digest = hashlib.sha256()
        with path.open("rb") as source:
            for block in iter(lambda: source.read(1024 * 1024), b""):
                digest.update(block)
        if digest.hexdigest() != row["CodigoSHA256"]:
            errors.append(f"Manifesto possui SHA-256 desatualizado para {path.name}.")


def main() -> int:
    """Executa todas as verificações e bloqueia publicação inconsistente."""
    data = load_data()
    errors: list[str] = []
    validate_interviews(data, errors)
    validate_metadata(data, errors)
    validate_aggregate_parts(data, errors)
    validate_readme(data, errors)
    validate_report(data, errors)
    validate_manifest(errors)
    print("VALIDAÇÃO DA SINCRONIZAÇÃO DO OBSERVATÓRIO")
    print("=" * 48)
    print(f"Anos: {', '.join(data['dims']['years'])}")
    print(f"Linhas agregadas: {len(data['rows']):,}")
    print(f"Arquivos derivados validados: {len(sync.PART_PATHS) + 5}")
    print(f"Erros: {len(errors)}")
    for error in errors:
        print("ERRO: " + error)
    if errors:
        return 1
    print("Todos os arquivos derivados estão sincronizados com a base principal.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
