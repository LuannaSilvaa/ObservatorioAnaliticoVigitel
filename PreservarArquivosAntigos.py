#!/usr/bin/env python3
"""Valida os arquivos históricos atualizados e a cobertura do ano de 2024.

Os arquivos antigos podem evoluir, desde que a interface continue completa,
as referências permaneçam válidas e a base principal e a idade detalhada
apresentem o ano de 2024.
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
REPORT_PATH = ROOT / "RelatorioDaPreservacaoDosArquivos.txt"

REQUIRED_FILES = (
    "index.html",
    "IdentidadeVisualDoObservatorio.css",
    "ConfiguracaoDoTema.js",
    "SistemaAnaliticoDoVigitel.js",
    "InicializacaoDoObservatorio.js",
    "AdministracaoIntegradaAoIndex.js",
    "InterfaceResponsiva.js",
    "BaseAnaliticaDoVigitel.js",
    "CatalogoDeIdadeDetalhada.js",
    "MetodologiaDosIndicadores.js",
)

REQUIRED_INDEX_REFERENCES = (
    "IdentidadeVisualDoObservatorio.css?edicao=2024",
    "BaseAnaliticaDoVigitel.js?edicao=2024",
    "CatalogoDeIdadeDetalhada.js?edicao=2024",
    "MetodologiaDosIndicadores.js?edicao=2024",
    "SistemaAnaliticoDoVigitel.js?edicao=2024",
    "AdministracaoIntegradaAoIndex.js?edicao=remota-2024",
    "InicializacaoDoObservatorio.js?edicao=2024",
)


def extract_json(path: Path, prefix: str) -> dict:
    text = path.read_text(encoding="utf-8")
    start = text.index(prefix) + len(prefix)
    payload, _ = json.JSONDecoder().raw_decode(text[start:])
    return payload


def main() -> int:
    errors: list[str] = []
    warnings: list[str] = []

    for name in REQUIRED_FILES:
        path = ROOT / name
        if not path.is_file() or path.stat().st_size == 0:
            errors.append(f"Arquivo obrigatório ausente ou vazio: {name}.")

    if errors:
        data = {}
        catalog = {}
    else:
        try:
            data = extract_json(ROOT / "BaseAnaliticaDoVigitel.js", "const DATA = ")
        except Exception as error:
            errors.append(f"Não foi possível ler a base principal: {error}")
            data = {}
        try:
            catalog = extract_json(
                ROOT / "CatalogoDeIdadeDetalhada.js",
                "window.VIGITEL_AGE_DETAIL=",
            )
        except Exception as error:
            errors.append(f"Não foi possível ler o catálogo detalhado: {error}")
            catalog = {}

    main_years = [str(year) for year in data.get("dims", {}).get("years", [])]
    detail_years = [str(year) for year in catalog.get("dims", {}).get("years", [])]
    if "2024" not in main_years:
        errors.append("A base principal não contém o ano de 2024.")
    if "2024" not in detail_years:
        errors.append("A idade detalhada não contém o ano de 2024.")
    if main_years and detail_years and main_years != detail_years:
        errors.append("Os anos da base principal e da idade detalhada estão diferentes.")

    index = (ROOT / "index.html").read_text(encoding="utf-8") if (ROOT / "index.html").is_file() else ""
    if "Base oficial 2006–2024" not in index:
        errors.append("O cabeçalho da interface não informa a cobertura até 2024.")
    if "Edições 2006–2021 e 2023" in index:
        errors.append("O index.html ainda contém a descrição antiga encerrada em 2023.")
    if "A Administração funciona somente no aplicativo local" in index:
        errors.append("O index.html ainda bloqueia indevidamente a administração remota.")

    for reference in REQUIRED_INDEX_REFERENCES:
        if reference not in index:
            errors.append(f"Referência atualizada ausente do index.html: {reference}.")

    administration = (
        ROOT / "AdministracaoIntegradaAoIndex.js"
    ).read_text(encoding="utf-8") if (ROOT / "AdministracaoIntegradaAoIndex.js").is_file() else ""
    if "Administração remota" not in administration:
        errors.append("O módulo administrativo remoto não foi identificado.")
    if "Anos futuros também serão reconhecidos" not in administration:
        warnings.append("O texto sobre reconhecimento automático de anos futuros não foi localizado.")

    lines = [
        "VALIDAÇÃO DOS ARQUIVOS ATUALIZADOS DO OBSERVATÓRIO",
        "=" * 60,
        "Regra: arquivos antigos podem ser atualizados, mas devem continuar funcionais.",
        f"Ano 2024 na base principal: {'sim' if '2024' in main_years else 'não'}",
        f"Ano 2024 na idade detalhada: {'sim' if '2024' in detail_years else 'não'}",
        f"Referências da interface conferidas: {len(REQUIRED_INDEX_REFERENCES)}",
        f"Erros: {len(errors)}",
        f"Avisos: {len(warnings)}",
        "",
        "ERROS",
        "------",
        *(errors or ["Nenhum. Os arquivos atualizados permanecem funcionais."]),
        "",
        "AVISOS",
        "------",
        *(warnings or ["Nenhum."]),
    ]
    REPORT_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print("\n".join(lines))
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
