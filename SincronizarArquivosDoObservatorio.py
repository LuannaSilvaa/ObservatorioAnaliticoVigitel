#!/usr/bin/env python3
"""Sincroniza todos os arquivos derivados depois do recálculo do Vigitel.

A base JavaScript é a fonte canônica da publicação. A partir dela e, quando
presentes, dos microdados anuais temporários, esta rotina atualiza em conjunto:

* metadados da própria base;
* três partes CSV da base agregada;
* total de entrevistas utilizadas por ano;
* metadados do processamento;
* cobertura e instruções do README;
* relatório da última atualização;
* manifesto de tamanhos e códigos SHA-256.

A rotina é idempotente: executá-la novamente com a mesma base produz os mesmos
arquivos, exceto pelos horários explícitos da atualização.
"""
from __future__ import annotations

import csv
import hashlib
import json
import math
import re
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent
DATA_PATH = ROOT / "BaseAnaliticaDoVigitel.js"
MICRO_DIR = ROOT / "Microdados"
README_PATH = ROOT / "README.md"
INTERVIEWS_PATH = ROOT / "EntrevistasPorAno.csv"
METADATA_PATH = ROOT / "MetadadosDoProcessamento.csv"
REPORT_PATH = ROOT / "RelatorioDaUltimaAtualizacaoRemota.txt"
MANIFEST_PATH = ROOT / "ManifestoDosArquivos.csv"
PART_PATHS = (
    ROOT / "BaseAgregadaCompletaDosIndicadoresParteUm.csv",
    ROOT / "BaseAgregadaCompletaDosIndicadoresParteDois.csv",
    ROOT / "BaseAgregadaCompletaDosIndicadoresParteTres.csv",
)
MANIFEST_EXCLUSIONS = {
    MANIFEST_PATH.name,
    "EstadoDaAtualizacao.json",
    REPORT_PATH.name,
}


def utc_now() -> str:
    """Retorna o horário UTC no formato utilizado pelos metadados públicos."""
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def load_data() -> tuple[str, int, int, dict[str, Any]]:
    """Extrai o objeto DATA e as posições necessárias para regravá-lo."""
    text = DATA_PATH.read_text(encoding="utf-8")
    marker = "const DATA = "
    start = text.index(marker) + len(marker)
    data, used = json.JSONDecoder().raw_decode(text[start:])
    return text, start, used, data


def save_data(text: str, start: int, used: int, data: dict[str, Any]) -> None:
    """Atualiza apenas o objeto DATA, preservando o restante do JavaScript."""
    encoded = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    DATA_PATH.write_text(text[:start] + encoded + text[start + used :], encoding="utf-8")


def period_label(years: list[str]) -> tuple[str, list[str]]:
    """Monta o período legível e a relação de anos ausentes entre os extremos."""
    numeric = sorted(int(year) for year in years)
    missing = [str(year) for year in range(numeric[0], numeric[-1] + 1) if year not in numeric]
    label = str(numeric[0]) if len(numeric) == 1 else f"{numeric[0]} a {numeric[-1]}"
    if missing:
        label += " (exceto " + ", ".join(missing) + ")"
    return label, missing


def numeric(value: object) -> float | None:
    """Converte valores com ponto ou vírgula decimal sem interromper a leitura."""
    if value is None:
        return None
    text = str(value).strip()
    if not text:
        return None
    if "," in text:
        text = text.replace(".", "").replace(",", ".")
    try:
        result = float(text)
    except ValueError:
        return None
    return result if math.isfinite(result) else None


def normalized_header(value: str) -> str:
    """Normaliza cabeçalhos dos microdados temporários."""
    return value.lstrip("\ufeff").strip().lower()


def count_microdata_interviews(years: list[str]) -> tuple[dict[str, int], dict[str, int], str] | None:
    """Conta linhas recebidas e entrevistas válidas diretamente dos arquivos anuais."""
    files: dict[str, Path] = {}
    for path in MICRO_DIR.glob("MicrodadosAno*.csv"):
        match = re.search(r"MicrodadosAno(\d{4})", path.stem)
        if match:
            files[match.group(1)] = path
    if not files or not set(years) <= set(files):
        return None

    received: dict[str, int] = {}
    valid: dict[str, int] = {}
    for year in years:
        path = files[year]
        total = 0
        accepted = 0
        with path.open("r", encoding="utf-8-sig", errors="replace", newline="") as stream:
            reader = csv.DictReader(stream)
            if not reader.fieldnames:
                raise RuntimeError(f"{path.name}: cabeçalho ausente.")
            names = {normalized_header(name): name for name in reader.fieldnames}
            weight_key = names.get("pesorake2025") or names.get("pesorake")
            required = [names.get("q6"), names.get("q7"), names.get("cidade"), weight_key]
            if any(item is None for item in required):
                raise RuntimeError(f"{path.name}: colunas essenciais ausentes na contagem anual.")
            age_key, sex_key, city_key, weight_key = required
            for row in reader:
                total += 1
                age = numeric(row.get(age_key))
                sex = numeric(row.get(sex_key))
                city = numeric(row.get(city_key))
                weight = numeric(row.get(weight_key))
                if (
                    age is not None and 18 <= age <= 120
                    and sex in {1.0, 2.0}
                    and city is not None and 1 <= city <= 27
                    and weight is not None and weight > 0
                ):
                    accepted += 1
        received[year] = total
        valid[year] = accepted
    return received, valid, "microdados anuais harmonizados após os filtros essenciais"


def count_interviews_from_aggregates(data: dict[str, Any]) -> tuple[dict[str, int], dict[str, int], str]:
    """Usa o maior denominador não ponderado anual quando os microdados já foram removidos."""
    years = data["dims"]["years"]
    per_indicator: dict[tuple[int, int], int] = defaultdict(int)
    for row in data["rows"]:
        year_index, population_index, indicator_index, n = row[0], row[5], row[6], row[9]
        if population_index == 0:
            per_indicator[(year_index, indicator_index)] += int(n)
    counts: dict[str, int] = {}
    for year_index, year in enumerate(years):
        candidates = [value for (current_year, _), value in per_indicator.items() if current_year == year_index]
        counts[year] = max(candidates, default=0)
    return counts.copy(), counts, "maior denominador não ponderado entre os indicadores publicados"


def interview_counts(data: dict[str, Any]) -> tuple[dict[str, int], dict[str, int], str]:
    """Prioriza a contagem direta dos microdados e aplica fallback auditável."""
    direct = count_microdata_interviews(data["dims"]["years"])
    return direct if direct is not None else count_interviews_from_aggregates(data)


def update_data_metadata(data: dict[str, Any], received: dict[str, int], valid: dict[str, int], method: str) -> None:
    """Corrige contagens, período e informações de sincronização na fonte canônica."""
    years = data["dims"]["years"]
    label, missing = period_label(years)
    meta = data.setdefault("meta", {})
    meta.update(
        {
            "yearsLabel": label,
            "respondentsProcessed": sum(valid.values()),
            "sourceRowsRead": sum(received.values()),
            "sourceRowsExcluded": sum(received.values()) - sum(valid.values()),
            "interviewsByYear": {year: valid[year] for year in years},
            "interviewCountMethod": method,
            "missingYears": missing,
            "synchronizationVersion": "v1.0",
            "synchronizedFiles": [
                path.name for path in PART_PATHS
            ] + [INTERVIEWS_PATH.name, METADATA_PATH.name, README_PATH.name, MANIFEST_PATH.name],
        }
    )


def write_interviews(years: list[str], received: dict[str, int], valid: dict[str, int], method: str) -> None:
    """Grava as contagens anuais em formato tabular e explicitamente documentado."""
    with INTERVIEWS_PATH.open("w", encoding="utf-8-sig", newline="") as stream:
        writer = csv.writer(stream)
        writer.writerow(["ano", "linhas_recebidas", "entrevistas_validas_utilizadas", "metodo_contagem"])
        for year in years:
            writer.writerow([year, received[year], valid[year], method])


def write_metadata(data: dict[str, Any], received: dict[str, int], valid: dict[str, int], method: str) -> None:
    """Recria os metadados do processamento usando somente valores da base publicada."""
    meta = data["meta"]
    years = data["dims"]["years"]
    label, missing = period_label(years)
    unsupported = meta.get("unsupportedIndicators", {})
    entries = [
        ("Fonte dos dados", meta.get("source", "Vigitel | Ministério da Saúde")),
        ("Pesquisa", "Vigitel"),
        ("Arquivo recebido", meta.get("lastUpdateSourceFile", "Não informado")),
        ("Período", label),
        ("Anos disponíveis", ", ".join(years)),
        ("Anos ausentes", ", ".join(missing) if missing else "Nenhum"),
        ("Data da atualização", meta.get("lastAutomaticUpdate", meta.get("baseUpdatedAt", "Não informada"))),
        ("Linhas recebidas", str(sum(received.values()))),
        ("Entrevistas válidas utilizadas", str(sum(valid.values()))),
        ("Método da contagem anual", method),
        ("Linhas agregadas publicadas", str(len(data["rows"]))),
        ("Indicadores cadastrados", str(len(data["indicators"]))),
        ("Indicadores com dados", str(len(data["indicators"]) - len(unsupported))),
        ("Indicadores indisponíveis", str(len(unsupported))),
        ("Pesos amostrais utilizados", ", ".join(meta.get("weightColumnsUsed", [])) or "Não informado"),
        ("Precisão amostral", meta.get("precisionMethod", "Não informada")),
        ("Versão da base", meta.get("baseVersion", "Não informada")),
    ]
    with METADATA_PATH.open("w", encoding="utf-8-sig", newline="") as stream:
        writer = csv.writer(stream)
        writer.writerow(["campo", "descricao"])
        writer.writerows(entries)


def indicator_part(indicator_index: int) -> int:
    """Distribui os 63 indicadores em três grupos estáveis de 21."""
    return min(indicator_index // 21, 2)


def write_aggregate_parts(data: dict[str, Any]) -> None:
    """Exporta toda a base agregada em três CSVs compatíveis com as versões anteriores."""
    dims = data["dims"]
    indicators = data["indicators"]
    themes = {item["id"]: item for item in data["themes"]}
    header = [
        "ano", "regiao", "uf", "sexo", "faixa_etaria", "escolaridade",
        "tipo_populacao", "tema", "indicador_id", "indicador", "valor",
        "unidade", "numerador", "denominador", "n_entrevistas",
    ]
    streams = [path.open("w", encoding="utf-8-sig", newline="") for path in PART_PATHS]
    try:
        writers = [csv.writer(stream) for stream in streams]
        for writer in writers:
            writer.writerow(header)
        for row in data["rows"]:
            year, region, uf, sex, age, population, indicator_index, numerator, denominator, n = (
                row[0], row[1], row[2], row[3], row[4], row[5], row[6], row[7], row[8], row[9]
            )
            indicator = indicators[indicator_index]
            theme = themes.get(indicator["themeId"], {})
            value = float(numerator) / float(denominator) * 100 if float(denominator) > 0 else ""
            writers[indicator_part(indicator_index)].writerow(
                [
                    dims["years"][year], dims["regions"][region], dims["ufs"][uf],
                    dims["sexes"][sex], dims["ages"][age], "Ignorado",
                    dims["pops"][population], theme.get("raw", theme.get("label", indicator["themeId"])),
                    indicator["id"], indicator["label"], value, indicator.get("unit", "%"),
                    numerator, denominator, n,
                ]
            )
    finally:
        for stream in streams:
            stream.close()


def replace_section(text: str, title: str, next_title: str, replacement: str) -> str:
    """Substitui uma seção Markdown inteira sem alterar as demais partes do documento."""
    pattern = re.compile(rf"^## {re.escape(title)}\s*$.*?(?=^## {re.escape(next_title)}\s*$)", re.M | re.S)
    if pattern.search(text):
        return pattern.sub(replacement.rstrip() + "\n\n", text)
    return text


def write_readme(data: dict[str, Any], valid: dict[str, int]) -> None:
    """Mantém as instruções e a cobertura do README alinhadas à base atual."""
    text = README_PATH.read_text(encoding="utf-8")
    meta = data["meta"]
    years = data["dims"]["years"]
    label, missing = period_label(years)
    unsupported = meta.get("unsupportedIndicators", {})
    text = re.sub(
        r"Esta é a \*\*versão plana para GitHub\*\*:.*?(?=\n\n## Recursos principais)",
        "Esta é a **versão plana para GitHub**: os arquivos públicos ficam na raiz do repositório e são recriados automaticamente após cada atualização administrativa aprovada. O fluxo remoto valida os limites do GitHub, envia arquivos grandes em partes e somente então altera a versão pública.",
        text,
        flags=re.S,
    )
    publication = """## Publicação e atualização no GitHub Pages

O site é publicado pela branch `main`. A atualização dos dados é feita pela área **Administração** do próprio Observatório:

1. a pessoa administradora envia uma base CSV, XLS ou XLSM pelo rascunho privado indicado na página;
2. o GitHub Actions lê e harmoniza a base;
3. indicadores, idade detalhada, CSVs agregados, contagens, metadados, documentação e manifesto são recriados;
4. todas as validações precisam ser aprovadas;
5. somente depois disso os arquivos são promovidos para a `main` e o GitHub Pages é republicado.

Uma falha em qualquer etapa mantém a versão pública anterior.
"""
    text = replace_section(text, "Publicação no GitHub Pages", "Execução local", publication)
    update = """## Atualização dos dados

O arquivo recebido pela Administração é a única entrada necessária. Não é preciso editar manualmente a lista de anos, o README, os metadados ou as bases CSV derivadas.

Para uma atualização ser publicada, o fluxo precisa sincronizar e validar:

- a base principal e os nove arquivos temáticos de idade detalhada;
- as três partes CSV da base agregada;
- `EntrevistasPorAno.csv`;
- `MetadadosDoProcessamento.csv`;
- a cobertura descrita neste README;
- os relatórios de validação e o manifesto SHA-256.
"""
    text = replace_section(text, "Atualização dos dados", "Cobertura e limitações", update)
    warnings = "\n".join(f"- `{key}`: {value}" for key, value in unsupported.items()) or "- Nenhuma indisponibilidade documentada."
    coverage = f"""## Cobertura e limitações

A base publicada reúne **{label}**, com **{sum(valid.values()):,} entrevistas válidas utilizadas** e **{len(data['rows']):,} linhas agregadas**. A atualização atual foi produzida a partir de `{meta.get('lastUpdateSourceFile', 'arquivo não informado')}` e registrada em `{meta.get('lastAutomaticUpdate', meta.get('baseUpdatedAt', 'data não informada'))}`.

Dos {len(data['indicators'])} indicadores cadastrados, {len(data['indicators']) - len(unsupported)} possuem dados na base consolidada atual. Os demais permanecem identificados como indisponíveis, sem valores inventados:

{warnings}

Os intervalos de confiança e coeficientes de variação exibidos no painel são aproximações baseadas no tamanho efetivo de Kish e não substituem uma análise completa do desenho amostral. Anos ausentes no intervalo: {', '.join(missing) if missing else 'nenhum'}.
"""
    text = replace_section(text, "Cobertura e limitações", "Fonte", coverage)
    README_PATH.write_text(text, encoding="utf-8")


def write_update_report(data: dict[str, Any], received: dict[str, int], valid: dict[str, int], method: str) -> None:
    """Acrescenta ao relatório operacional um resumo completo da sincronização."""
    previous = REPORT_PATH.read_text(encoding="utf-8", errors="replace") if REPORT_PATH.exists() else ""
    previous = previous.split("===== SINCRONIZAÇÃO AUTOMÁTICA =====", 1)[0].rstrip()
    meta = data["meta"]
    unsupported = meta.get("unsupportedIndicators", {})
    lines = [
        previous,
        "",
        "===== SINCRONIZAÇÃO AUTOMÁTICA =====",
        f"Executada em: {utc_now()}",
        f"Arquivo de origem: {meta.get('lastUpdateSourceFile', 'Não informado')}",
        f"Período publicado: {meta.get('yearsLabel', ', '.join(data['dims']['years']))}",
        f"Linhas recebidas: {sum(received.values()):,}",
        f"Entrevistas válidas utilizadas: {sum(valid.values()):,}",
        f"Método da contagem: {method}",
        f"Linhas agregadas: {len(data['rows']):,}",
        f"Indicadores cadastrados: {len(data['indicators'])}",
        f"Indicadores com dados: {len(data['indicators']) - len(unsupported)}",
        f"Indicadores indisponíveis documentados: {len(unsupported)}",
        "Arquivos sincronizados:",
        *[f"  - {path.name}" for path in PART_PATHS],
        f"  - {INTERVIEWS_PATH.name}",
        f"  - {METADATA_PATH.name}",
        f"  - {README_PATH.name}",
        f"  - {MANIFEST_PATH.name}",
        "As validações estrutural, metodológica, gráfica e de sincronização são executadas depois deste resumo.",
        "",
    ]
    REPORT_PATH.write_text("\n".join(lines), encoding="utf-8")


def manifest_files() -> list[Path]:
    """Seleciona arquivos públicos estáveis que podem ter tamanho e hash conferidos."""
    return sorted(
        path for path in ROOT.iterdir()
        if path.is_file() and path.name not in MANIFEST_EXCLUSIONS
    )


def generate_manifest() -> None:
    """Recria o manifesto de integridade depois que todos os arquivos estão prontos."""
    with MANIFEST_PATH.open("w", encoding="utf-8-sig", newline="") as stream:
        writer = csv.writer(stream)
        writer.writerow(["Arquivo", "TamanhoEmBytes", "CodigoSHA256"])
        for path in manifest_files():
            digest = hashlib.sha256()
            with path.open("rb") as source:
                for block in iter(lambda: source.read(1024 * 1024), b""):
                    digest.update(block)
            writer.writerow([path.name, path.stat().st_size, digest.hexdigest()])


def synchronize() -> dict[str, Any]:
    """Executa a sincronização completa e devolve um resumo para testes."""
    text, start, used, data = load_data()
    received, valid, method = interview_counts(data)
    update_data_metadata(data, received, valid, method)
    save_data(text, start, used, data)
    write_interviews(data["dims"]["years"], received, valid, method)
    write_metadata(data, received, valid, method)
    write_aggregate_parts(data)
    write_readme(data, valid)
    write_update_report(data, received, valid, method)
    return {
        "years": data["dims"]["years"],
        "received": sum(received.values()),
        "valid": sum(valid.values()),
        "rows": len(data["rows"]),
        "unsupported": len(data.get("meta", {}).get("unsupportedIndicators", {})),
    }


def main() -> int:
    """Sincroniza os derivados e apresenta um resumo no GitHub Actions."""
    summary = synchronize()
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
