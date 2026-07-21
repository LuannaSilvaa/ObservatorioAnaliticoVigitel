#!/usr/bin/env python3
"""Instala a base oficial harmonizada do Vigitel 2006–2024 e recalcula o painel.

Uso:
    python Scripts/AtualizacaoDaBaseOficial.py --arquivo /caminho/BaseOficial.zip

O arquivo deve ser obtido no portal oficial do Ministério da Saúde e conter os
microdados anuais harmonizados, incluindo 2024 e a coluna pesorake2025.
"""
from __future__ import annotations

import argparse
import csv
import re
import shutil
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent
MICRO = ROOT / "Microdados"
GENERATOR = ROOT / "RecalculoDosIndicadores.py"
YEAR_WORDS = {'2006': 'DoisMilESeis', '2007': 'DoisMilESete', '2008': 'DoisMilEOito', '2009': 'DoisMilENove', '2010': 'DoisMilEDez', '2011': 'DoisMilEOnze', '2012': 'DoisMilEDoze', '2013': 'DoisMilETreze', '2014': 'DoisMilEQuatorze', '2015': 'DoisMilEQuinze', '2016': 'DoisMilEDezesseis', '2017': 'DoisMilEDezessete', '2018': 'DoisMilEDezoito', '2019': 'DoisMilEDezenove', '2020': 'DoisMilEVinte', '2021': 'DoisMilEVinteEUm', '2023': 'DoisMilEVinteETres', '2024': 'DoisMilEVinteEQuatro'}


def normalize_name(path: Path) -> str | None:
    """Padroniza nomes de colunas e arquivos para comparação.
    """
    name = path.name.lower()
    year_match = re.search(r"(200[6-9]|201\d|202[0-4])", name)
    if not year_match or path.suffix.lower() != ".csv":
        return None
    year = year_match.group(1)
    year_word = YEAR_WORDS[year]
    if "popnegra" in name or "pop_negra" in name or "pop negra" in name:
        return f"MicrodadosDaPopulacaoNegraDoVigitelAno{year_word}.csv"
    return f"MicrodadosDoVigitelAno{year_word}ComPesoRake.csv"


def read_header(path: Path) -> list[str]:
    """Lê apenas o cabeçalho de um arquivo para identificar suas colunas.
    """
    encodings = ("utf-8-sig", "latin1")
    for encoding in encodings:
        try:
            with path.open("r", encoding=encoding, errors="strict", newline="") as stream:
                return next(csv.reader(stream))
        except (UnicodeDecodeError, StopIteration):
            continue
    with path.open("r", encoding="utf-8-sig", errors="replace", newline="") as stream:
        return next(csv.reader(stream))


def main() -> int:
    """Coordena leitura dos microdados, cálculo dos indicadores, gravação das bases e relatório final.
    """
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--arquivo", required=True, help="ZIP ou pasta com a base oficial harmonizada.")
    parser.add_argument("--sem-backup", action="store_true", help="Não criar cópia de segurança dos microdados atuais.")
    args = parser.parse_args()

    source = Path(args.arquivo).expanduser().resolve()
    if not source.exists():
        raise SystemExit(f"Arquivo ou pasta não encontrado: {source}")

    with tempfile.TemporaryDirectory(prefix="VigitelOficial") as temp_dir:
        staging = Path(temp_dir)
        if source.is_dir():
            extracted = source
        elif zipfile.is_zipfile(source):
            with zipfile.ZipFile(source) as archive:
                archive.extractall(staging)
            extracted = staging
        else:
            raise SystemExit("O parâmetro --arquivo deve apontar para uma pasta ou um ZIP válido.")

        candidates: dict[str, Path] = {}
        for path in extracted.rglob("*.csv"):
            normalized = normalize_name(path)
            if normalized:
                candidates[normalized] = path

        regular = {name: path for name, path in candidates.items() if "PopulacaoNegra" not in name}
        years = sorted(year for year, word in YEAR_WORDS.items() if any(word in name for name in regular))
        if "2024" not in years:
            raise SystemExit("A base informada não contém o microdado regular de 2024.")

        files_with_new_weight = []
        for name, path in regular.items():
            header = [item.strip().lower() for item in read_header(path)]
            if "pesorake2025" in header:
                files_with_new_weight.append(name)
        if not files_with_new_weight:
            raise SystemExit("Nenhum CSV regular contém a coluna pesorake2025. A base não parece ser a versão harmonizada oficial 2006–2024.")

        expected_years = {str(y) for y in range(2006, 2022)} | {"2023", "2024"}
        missing = sorted(expected_years - set(years))
        if missing:
            raise SystemExit("Faltam anos obrigatórios na base harmonizada: " + ", ".join(missing))

        if not args.sem_backup and MICRO.exists():
            backup = ROOT / "CopiaDeSegurancaDosMicrodados"
            if backup.exists():
                shutil.rmtree(backup)
            shutil.copytree(MICRO, backup)
            print(f"Cópia de segurança criada em: {backup}")

        MICRO.mkdir(parents=True, exist_ok=True)
        for old in MICRO.glob("*.csv"):
            old.unlink()
        for normalized, path in sorted(candidates.items()):
            shutil.copy2(path, MICRO / normalized)
            print(f"Instalado: {normalized}")

    print("Recalculando indicadores, tabelas e idade detalhada...")
    completed = subprocess.run([sys.executable, str(GENERATOR)], cwd=ROOT)
    if completed.returncode:
        raise SystemExit(completed.returncode)
    print("Atualização concluída. Abra o painel e confirme no cabeçalho o uso de pesorake2025 e a presença de 2024.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
