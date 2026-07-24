#!/usr/bin/env python3
"""Prepara uma base enviada pela Administração e recalcula o painel do Vigitel."""
from __future__ import annotations

import argparse
import csv
import json
import os
import re
import unicodedata
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

# A leitura seletiva consulta required_columns antes de iniciar os blocos do CSV.
# Por isso, a compatibilidade precisa ser aplicada já na importação do módulo.
import RecalculoDosIndicadores as _engine_bootstrap
from CompatibilidadeDaBaseOficial import aplicar_compatibilidade as _aplicar_compatibilidade

_aplicar_compatibilidade(_engine_bootstrap)

ROOT = Path(__file__).resolve().parent
MICRO = ROOT / "Microdados"
ALIASES = {
    "sexo": "q7",
    "idade": "q6",
    "idade_anos": "q6",
    "capital": "cidade",
    "codigo_capital": "cidade",
    "cod_capital": "cidade",
    "codcidade": "cidade",
    "peso_rake": "pesorake",
    "peso_rake_2025": "pesorake2025",
    "peso_rake_cor": "pesorake_cor",
}
YEAR_NAMES = {
    "ano",
    "year",
    "edicao",
    "edicao_vigitel",
    "ano_vigitel",
    "ano_pesquisa",
    "ano_entrevista",
    "ano_da_edicao",
    "anopesquisa",
}


def normalize(value: object) -> str:
    text = unicodedata.normalize("NFKD", str(value)).encode("ascii", "ignore").decode().lower().strip()
    text = re.sub(r"[^a-z0-9_]+", "_", text)
    text = re.sub(r"_+", "_", text).strip("_")
    return ALIASES.get(text, text)


def normalize_frame(frame: pd.DataFrame) -> pd.DataFrame:
    if os.environ.get("GITHUB_ACTIONS", "").lower() == "true":
        from HarmonizacaoPeloDicionarioOficial import aplicar_mapeamentos

        frame = aplicar_mapeamentos(frame)

    frame.columns = [normalize(column) for column in frame.columns]
    frame = frame.loc[:, ~frame.columns.duplicated()]
    return frame.dropna(how="all")


def year_column(frame: pd.DataFrame) -> str | None:
    return next((column for column in frame.columns if column in YEAR_NAMES), None)


def validate_columns(frame: pd.DataFrame) -> str:
    column = year_column(frame)
    if not column:
        raise ValueError("A base precisa conter uma coluna de ano reconhecível.")
    missing = {"cidade", "q6", "q7"} - set(frame.columns)
    if missing:
        raise ValueError("Colunas obrigatórias ausentes: " + ", ".join(sorted(missing)))
    if not ({"pesorake", "pesorake2025"} & set(frame.columns)):
        raise ValueError("A base precisa conter pesorake ou pesorake2025.")
    return column


class AnnualWriter:
    def __init__(self) -> None:
        self.written: set[int] = set()
        self.years: set[int] = set()

    def write(self, frame: pd.DataFrame) -> None:
        if frame.empty:
            return
        frame = normalize_frame(frame)
        column = validate_columns(frame)
        numeric_year = pd.to_numeric(frame[column], errors="coerce")
        current_years = sorted({int(value) for value in numeric_year.dropna() if 2006 <= int(value) <= 2100})
        for year in current_years:
            part = frame.loc[numeric_year.eq(year)].copy()
            if part.empty:
                continue
            target = MICRO / f"MicrodadosAno{year}.csv"
            first = year not in self.written
            part.to_csv(
                target,
                mode="w" if first else "a",
                header=first,
                index=False,
                encoding="utf-8-sig" if first else "utf-8",
            )
            self.written.add(year)
            self.years.add(year)


def read_csv_chunks(source: Path, writer: AnnualWriter) -> None:
    with source.open("rb") as stream:
        raw = stream.read(250000)
    sample = ""
    encoding = "utf-8-sig"
    for candidate in ("utf-8-sig", "utf-8", "latin1"):
        try:
            sample = raw.decode(candidate)
            encoding = candidate
            break
        except UnicodeDecodeError:
            continue
    try:
        separator = csv.Sniffer().sniff("\n".join(sample.splitlines()[:30]), delimiters=",;\t|").delimiter
    except csv.Error:
        separator = ";" if sample.count(";") > sample.count(",") else ","
    for chunk in pd.read_csv(source, sep=separator, encoding=encoding, low_memory=False, chunksize=50000):
        writer.write(chunk)


def header_row(book: pd.ExcelFile, sheet: str) -> int:
    preview = pd.read_excel(book, sheet_name=sheet, header=None, nrows=15)
    for index, row in preview.iterrows():
        names = {normalize(value) for value in row if pd.notna(value)}
        if len({"cidade", "q6", "q7"} & names) >= 2:
            return int(index)
    return 0


def read_excel_sheets(source: Path, writer: AnnualWriter) -> None:
    engine = "xlrd" if source.suffix.lower() == ".xls" else "openpyxl"
    book = pd.ExcelFile(source, engine=engine)
    for sheet in book.sheet_names:
        frame = pd.read_excel(book, sheet_name=sheet, header=header_row(book, sheet))
        if not frame.dropna(how="all").empty:
            writer.write(frame)


def create_black_population_file() -> None:
    general = MICRO / "MicrodadosAno2018.csv"
    if not general.exists():
        return
    columns = set(pd.read_csv(general, nrows=0, encoding="utf-8-sig").columns)
    if not {"q69_cor", "pesorake_cor"} <= columns:
        return
    target = MICRO / "MicrodadosPopulacaoNegraAno2018.csv"
    for index, chunk in enumerate(pd.read_csv(general, chunksize=50000, low_memory=False, encoding="utf-8-sig")):
        chunk.to_csv(
            target,
            mode="w" if index == 0 else "a",
            header=index == 0,
            index=False,
            encoding="utf-8-sig" if index == 0 else "utf-8",
        )


def update_metadata(years: list[int], source_name: str) -> None:
    path = ROOT / "BaseAnaliticaDoVigitel.js"
    text = path.read_text(encoding="utf-8")
    marker = "const DATA = "
    start = text.index(marker) + len(marker)
    data, used = json.JSONDecoder().raw_decode(text[start:])
    missing_years = sorted(set(range(years[0], years[-1] + 1)) - set(years))
    label = str(years[0]) if len(years) == 1 else f"{years[0]} a {years[-1]}"
    if missing_years:
        label += " (exceto " + ", ".join(map(str, missing_years)) + ")"
    now = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    data["meta"].update(
        {
            "yearsLabel": label,
            "baseUpdatedAt": now[:10],
            "lastAutomaticUpdate": now,
            "lastUpdateSourceFile": source_name,
            "baseVersion": "v13.0 - atualização remota validada",
        }
    )
    encoded = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    path.write_text(text[:start] + encoded + text[start + used :], encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base", required=True)
    parser.add_argument("--source-name", required=True)
    args = parser.parse_args()
    source = Path(args.base).resolve()
    if not source.is_file():
        raise FileNotFoundError(source)

    MICRO.mkdir(exist_ok=True)
    for old in MICRO.glob("Microdados*.csv"):
        old.unlink()

    writer = AnnualWriter()
    suffix = source.suffix.lower()
    if suffix == ".csv":
        read_csv_chunks(source, writer)
    elif suffix in {".xls", ".xlsm"}:
        read_excel_sheets(source, writer)
    else:
        raise ValueError("Formato não aceito. Use CSV, XLS ou XLSM.")

    years = sorted(writer.years)
    if not years:
        raise ValueError("Nenhum ano válido foi encontrado na base.")
    create_black_population_file()

    import RecalculoDosIndicadores as engine
    from CompatibilidadeDaBaseOficial import aplicar_compatibilidade

    aplicar_compatibilidade(engine)

    def load_existing_metadata_robust():
        text = (ROOT / "BaseAnaliticaDoVigitel.js").read_text(encoding="utf-8")
        marker = "const DATA = "
        start = text.index(marker) + len(marker)
        data, _ = json.JSONDecoder().raw_decode(text[start:])
        indicators = data["indicators"]
        for item in indicators:
            if item["id"] in engine.LABEL_OVERRIDES:
                item["label"], item["description"] = engine.LABEL_OVERRIDES[item["id"]]
            item["unit"] = "%"
            item["classification"] = engine.CLASSIFICATIONS.get(item["id"], "Derivado/recorte validado")
        return data["themes"], indicators

    engine.load_existing_metadata = load_existing_metadata_robust
    engine.YEAR_WORDS = {str(year): f"Ano{year}" for year in years}
    engine.FILE_YEAR_TOKENS = {f"Ano{year}": str(year) for year in years}
    engine.YEARS = [str(year) for year in years]
    engine.YEAR_I = {str(year): index for index, year in enumerate(years)}
    engine.main()
    update_metadata(years, args.source_name)
    print(json.dumps({"years": years, "sourceFile": args.source_name}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
