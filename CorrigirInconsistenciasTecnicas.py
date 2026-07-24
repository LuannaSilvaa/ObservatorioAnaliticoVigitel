#!/usr/bin/env python3
"""Corrige inconsistências documentais e operacionais do Observatório."""
from __future__ import annotations

import csv
import hashlib
import json
import subprocess
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent
UNSUPPORTED = {
    "ALC07",
    "MR05",
    "CT02",
    "CT04",
    "CT05",
    "CT06",
    "CT07",
    "CT08",
}


def run(*args: str) -> None:
    print("Executando:", " ".join(args), flush=True)
    subprocess.run(args, cwd=ROOT, check=True)


def read_js_object(path: Path, prefix: str) -> tuple[str, int, int, dict]:
    text = path.read_text(encoding="utf-8")
    start = text.index(prefix) + len(prefix)
    payload, used = json.JSONDecoder().raw_decode(text[start:])
    return text, start, used, payload


def fix_catalog() -> None:
    _, _, _, data = read_js_object(ROOT / "BaseAnaliticaDoVigitel.js", "const DATA = ")
    unsupported = data.get("meta", {}).get("unsupportedIndicators", {})
    if set(unsupported) != UNSUPPORTED:
        raise RuntimeError(
            "A lista de indicadores indisponíveis não corresponde aos oito itens documentados."
        )

    path = ROOT / "CatalogoDeIdadeDetalhada.js"
    text, start, used, catalog = read_js_object(path, "window.VIGITEL_AGE_DETAIL=")
    meta = catalog.setdefault("meta", {})
    declared = list(meta.get("supportedIndicators", []))
    meta["unsupportedIndicators"] = unsupported
    meta["supportedIndicators"] = [item for item in declared if item not in unsupported]

    expected = set(data.get("indicators", [{}])[index].get("id") for index in range(len(data.get("indicators", [])))) - set(unsupported)
    if set(meta["supportedIndicators"]) != expected:
        raise RuntimeError("O catálogo não ficou com os 55 indicadores realmente disponíveis.")

    encoded = json.dumps(catalog, ensure_ascii=False, separators=(",", ":"))
    path.write_text(text[:start] + encoded + text[start + used :], encoding="utf-8")


def fix_workflows() -> None:
    remote_path = ROOT / ".github/workflows/AtualizacaoRemotaDaBase.yml"
    remote = remote_path.read_text(encoding="utf-8")
    old = '- cron: "*/5 * * * *"'
    new = '- cron: "17 * * * *"'
    if old in remote:
        remote = remote.replace(old, new, 1)
    elif new not in remote:
        raise RuntimeError("A frequência da atualização remota não pôde ser localizada.")
    remote_path.write_text(remote, encoding="utf-8")

    validation_path = ROOT / ".github/workflows/ValidarObservatorio.yml"
    validation = validation_path.read_text(encoding="utf-8")
    title = "      - name: Confirmar que os relatórios versionados estão atualizados\n"
    if title not in validation:
        marker = "      - name: Guardar relatórios de validação\n"
        block = (
            title
            + "        if: always()\n"
            + "        run: |\n"
            + "          git diff --exit-code -- \\\n"
            + "            RelatorioDaValidacaoDaBase.txt \\\n"
            + "            RelatorioDaAuditoriaDaIdadeDetalhada.txt \\\n"
            + "            RelatorioDosIndicadoresEGraficos.txt \\\n"
            + "            RelatorioDaPreservacaoDosArquivos.txt\n\n"
        )
        if marker not in validation:
            raise RuntimeError("O ponto de inserção no workflow de validação não foi encontrado.")
        validation = validation.replace(marker, block + marker, 1)
    validation_path.write_text(validation, encoding="utf-8")

    for path in (remote_path, validation_path):
        document = yaml.safe_load(path.read_text(encoding="utf-8"))
        if not isinstance(document, dict) or "jobs" not in document:
            raise RuntimeError(f"Workflow inválido após a correção: {path}")


def regenerate_reports() -> None:
    run(sys.executable, "ValidacaoDaBaseCompleta.py")
    run(sys.executable, "AuditarIdadeDetalhada.py")
    run("node", "TesteDosIndicadoresEGraficos.js")
    run(sys.executable, "PreservarArquivosAntigos.py")


def regenerate_manifest() -> None:
    manifest = ROOT / "ManifestoDosArquivos.csv"
    with manifest.open(encoding="utf-8-sig", newline="") as file:
        names = [row["Arquivo"] for row in csv.DictReader(file)]

    audit_report = "RelatorioDaAuditoriaDaIdadeDetalhada.txt"
    if audit_report not in names:
        names.append(audit_report)

    rows: list[dict[str, str]] = []
    for name in sorted(set(names), key=str.casefold):
        path = ROOT / name
        if not path.is_file():
            raise FileNotFoundError(f"Arquivo listado no manifesto não encontrado: {name}")
        content = path.read_bytes()
        rows.append(
            {
                "Arquivo": name,
                "TamanhoEmBytes": str(len(content)),
                "CodigoSHA256": hashlib.sha256(content).hexdigest(),
            }
        )

    with manifest.open("w", encoding="utf-8-sig", newline="") as file:
        writer = csv.DictWriter(
            file,
            fieldnames=["Arquivo", "TamanhoEmBytes", "CodigoSHA256"],
        )
        writer.writeheader()
        writer.writerows(rows)


def verify() -> None:
    checks = {
        "RelatorioDosIndicadoresEGraficos.txt": "Combinações totais renderizadas: 1430",
        "RelatorioDaValidacaoDaBase.txt": "Indicadores disponíveis com idade detalhada: 55",
        "RelatorioDaAuditoriaDaIdadeDetalhada.txt": "Combinações divergentes: 0",
        "RelatorioDaPreservacaoDosArquivos.txt": "Erros: 0",
    }
    for name, expected in checks.items():
        text = (ROOT / name).read_text(encoding="utf-8")
        if expected not in text:
            raise RuntimeError(f"Verificação ausente em {name}: {expected}")


def main() -> int:
    fix_catalog()
    fix_workflows()
    regenerate_reports()
    regenerate_manifest()
    verify()
    print("Todas as inconsistências técnicas foram corrigidas e validadas.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
