#!/usr/bin/env python3
"""Prepara todos os arquivos sincronizados da atualização remota para o envio final.

O GitHub Actions gera vários arquivos grandes. Enviá-los todos em um único
``git push`` pode encerrar o processo antes que o estado de erro seja gravado.
Esta rotina cria um commit por arquivo e envia cada um para uma branch técnica.
A ``main`` só é atualizada depois que base, derivados e documentação chegaram ao
GitHub no mesmo histórico.
"""
from __future__ import annotations

import os
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent
BRANCH_REMOTA = "publicacao-vigitel-em-preparo"

ARQUIVOS = (
    "BaseAnaliticaDoVigitel.js",
    "CatalogoDeIdadeDetalhada.js",
    "MetodologiaDosIndicadores.js",
    "DadosIdadeDetalhadaTabagismo.js",
    "DadosIdadeDetalhadaAlcool.js",
    "DadosIdadeDetalhadaEstadoNutricional.js",
    "DadosIdadeDetalhadaAlimentacao.js",
    "DadosIdadeDetalhadaAtividadeFisica.js",
    "DadosIdadeDetalhadaAutoavaliacaoDeSaude.js",
    "DadosIdadeDetalhadaPrevencaoDoCancer.js",
    "DadosIdadeDetalhadaMorbidades.js",
    "DadosIdadeDetalhadaConducaoETransito.js",
    "BaseAgregadaCompletaDosIndicadoresParteUm.csv",
    "BaseAgregadaCompletaDosIndicadoresParteDois.csv",
    "BaseAgregadaCompletaDosIndicadoresParteTres.csv",
    "EntrevistasPorAno.csv",
    "MetadadosDoProcessamento.csv",
    "README.md",
    "ManifestoDosArquivos.csv",
    "RelatorioDaUltimaAtualizacaoRemota.txt",
    "RelatorioDaValidacaoDaBase.txt",
    "RelatorioDosIndicadoresEGraficos.txt",
    "RelatorioDeValidacaoDosIndicadores.txt",
)


def executar(*argumentos: str, capturar: bool = False) -> subprocess.CompletedProcess[str]:
    """Executa um comando Git com erro explícito e saída legível no Actions."""
    return subprocess.run(
        list(argumentos),
        cwd=ROOT,
        check=True,
        text=True,
        capture_output=capturar,
    )


def arquivo_alterado(caminho: Path) -> bool:
    """Informa se o arquivo possui alteração ainda não registrada no Git."""
    resultado = executar("git", "status", "--porcelain", "--", caminho.name, capturar=True)
    return bool(resultado.stdout.strip())


def enviar_estado_atual() -> None:
    """Envia o commit atual com compactação mínima para a branch técnica."""
    executar(
        "git",
        "-c", "pack.threads=1",
        "-c", "pack.window=0",
        "-c", "core.compression=1",
        "push", "--force", "origin",
        f"HEAD:refs/heads/{BRANCH_REMOTA}",
    )


def main() -> int:
    """Cria e envia um commit por arquivo sincronizado antes da publicação final."""
    if os.environ.get("GITHUB_ACTIONS", "").lower() != "true":
        print("Preparação em partes ignorada fora do GitHub Actions.")
        return 0

    executar("git", "config", "user.name", "Observatório Vigitel - Administração remota")
    executar(
        "git",
        "config",
        "user.email",
        "41898282+github-actions[bot]@users.noreply.github.com",
    )

    enviados = 0
    for nome in ARQUIVOS:
        caminho = ROOT / nome
        if not caminho.is_file() or not arquivo_alterado(caminho):
            continue

        tamanho = caminho.stat().st_size
        if tamanho >= 99_000_000:
            raise RuntimeError(
                f"{nome} possui {tamanho} bytes e ultrapassa o limite seguro de 99 MB."
            )

        print(f"Preparando {nome} ({tamanho / 1024 / 1024:.2f} MiB)...", flush=True)
        executar("git", "add", "--", nome)
        executar("git", "commit", "-m", f"Sincroniza {nome} na publicação remota")
        enviar_estado_atual()
        enviados += 1

    if enviados:
        sha = executar("git", "rev-parse", "HEAD", capturar=True).stdout.strip()
        print(
            f"Publicação sincronizada em partes: {enviados} arquivos; commit final {sha}.",
            flush=True,
        )
    else:
        print("Nenhum arquivo sincronizado novo precisou ser preparado.", flush=True)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
