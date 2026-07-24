#!/usr/bin/env python3
"""Impede a atualização de dados de substituir arquivos antigos que já funcionam.

A atualização remota deve alterar somente bases, arquivos de idade detalhada,
metadados, auditorias e relatórios. Interface, estilos, gráficos, administração,
manifesto do aplicativo e documentação manual permanecem exatamente como estão
na versão pública anterior.
"""
from __future__ import annotations

import fnmatch
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent
REPORT_PATH = ROOT / "RelatorioDaPreservacaoDosArquivos.txt"

# Arquivos que podem ser recriados porque contêm dados ou resultados técnicos.
ALLOWED_PATTERNS = (
    "BaseAnaliticaDoVigitel.js",
    "CatalogoDeIdadeDetalhada.js",
    "DadosIdadeDetalhada*.js",
    "MetodologiaDosIndicadores.js",
    "BaseAgregadaCompletaDosIndicadoresParte*.csv",
    "EntrevistasPorAno.csv",
    "MetadadosDoProcessamento.csv",
    "ManifestoDosArquivos.csv",
    "AuditoriaDasContagensDoVigitel.json",
    "EstadoDaAtualizacao.json",
    "DicionarioDosDadosDoVigitel.*",
    "DiagnosticoDasCodificacoesDaBase.txt",
    "RelatorioDa*.txt",
    "RelatorioDe*.txt",
    "RelatorioDos*.txt",
    "auditoria-console.txt",
)

# O sincronizador antigo atualiza uma linha informativa do README. Como o pedido
# é manter o arquivo antigo, essa modificação é revertida automaticamente.
RESTORE_AUTOMATICALLY = {"README.md"}
IGNORED_PREFIXES = ("Microdados/", "__pycache__/", ".git/")


def run_git(*arguments: str) -> list[str]:
    """Executa Git e devolve as linhas não vazias da saída."""
    result = subprocess.run(
        ["git", *arguments],
        cwd=ROOT,
        check=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        capture_output=True,
    )
    return [line.strip() for line in result.stdout.splitlines() if line.strip()]


def is_allowed(path: str) -> bool:
    """Informa se o caminho pertence ao conjunto estritamente atualizável."""
    normalized = path.replace("\\", "/")
    if normalized.startswith(IGNORED_PREFIXES):
        return True
    return any(fnmatch.fnmatch(normalized, pattern) for pattern in ALLOWED_PATTERNS)


def restore(path: str) -> None:
    """Restaura do commit atual um arquivo antigo que não deve ser atualizado."""
    subprocess.run(
        ["git", "restore", "--source=HEAD", "--staged", "--worktree", "--", path],
        cwd=ROOT,
        check=True,
    )


def main() -> int:
    """Preserva os arquivos antigos e recusa alterações fora do escopo de dados."""
    tracked = set(run_git("diff", "HEAD", "--name-only"))
    untracked = set(run_git("ls-files", "--others", "--exclude-standard"))
    restored: list[str] = []
    forbidden: list[str] = []

    for path in sorted(tracked):
        if is_allowed(path):
            continue
        if path in RESTORE_AUTOMATICALLY:
            restore(path)
            restored.append(path)
        else:
            forbidden.append(path)

    for path in sorted(untracked):
        if not is_allowed(path):
            forbidden.append(path)

    lines = [
        "PRESERVAÇÃO DOS ARQUIVOS ANTIGOS DO OBSERVATÓRIO",
        "=" * 58,
        "Regra: atualizar somente dados, idade detalhada, metadados e relatórios.",
        f"Arquivos antigos restaurados automaticamente: {len(restored)}",
        f"Alterações proibidas encontradas: {len(forbidden)}",
        "",
        "RESTAURADOS",
        "-----------",
        *(restored or ["Nenhum arquivo precisou ser restaurado."]),
        "",
        "ALTERAÇÕES PROIBIDAS",
        "--------------------",
        *(forbidden or ["Nenhuma. A interface e os arquivos antigos foram preservados."]),
    ]
    REPORT_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print("\n".join(lines))

    if forbidden:
        raise SystemExit(
            "A atualização tentou modificar arquivos antigos fora do escopo permitido. "
            "A versão pública anterior foi preservada."
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
