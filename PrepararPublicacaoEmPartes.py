#!/usr/bin/env python3
"""Publica de forma atômica os arquivos sincronizados do Observatório.

A atualização remota pode gerar vários arquivos grandes. Esta rotina cria um
commit por arquivo e envia cada commit para uma branch técnica. Depois que todos
os arquivos, o estado de sucesso e o dicionário opcional estão no GitHub, a
branch ``main`` é avançada por fast-forward para o commit final. O rascunho já
processado é removido e uma nova construção do GitHub Pages é solicitada.

A publicação só é chamada depois das validações estrutural, metodológica,
gráfica e de sincronização. Portanto, a versão pública anterior permanece
intacta caso qualquer validação anterior falhe.
"""
from __future__ import annotations

import json
import os
import shutil
import subprocess
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent
BRANCH_REMOTA = "publicacao-vigitel-em-preparo"
ESTADO_PATH = ROOT / "EstadoDaAtualizacao.json"
BASE_PATH = ROOT / "BaseAnaliticaDoVigitel.js"
DICIONARIOS_CANONICOS = (
    "DicionarioDosDadosDoVigitel.csv",
    "DicionarioDosDadosDoVigitel.xls",
    "DicionarioDosDadosDoVigitel.xlsm",
)

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
    "RelatorioDaValidacaoDaBase.txt",
    "RelatorioDosIndicadoresEGraficos.txt",
    "EstadoDaAtualizacao.json",
    *DICIONARIOS_CANONICOS,
)


def executar(*argumentos: str, capturar: bool = False) -> subprocess.CompletedProcess[str]:
    """Executa um comando com saída UTF-8 tolerante e falha explícita."""
    return subprocess.run(
        list(argumentos),
        cwd=ROOT,
        check=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        capture_output=capturar,
    )


def arquivo_alterado(caminho: Path) -> bool:
    """Informa se o arquivo possui alteração ainda não registrada no Git."""
    resultado = executar("git", "status", "--porcelain", "--", caminho.name, capturar=True)
    return bool(resultado.stdout.strip())


def carregar_anos_publicados() -> list[str]:
    """Lê a relação de anos diretamente da base canônica já validada."""
    texto = BASE_PATH.read_text(encoding="utf-8")
    marcador = "const DATA = "
    inicio = texto.index(marcador) + len(marcador)
    dados, _ = json.JSONDecoder().raw_decode(texto[inicio:])
    anos = [str(ano) for ano in dados["dims"]["years"]]
    if not anos:
        raise RuntimeError("A base validada não contém anos publicados.")
    return anos


def escrever_estado_sucesso() -> None:
    """Grava o estado final antes da promoção da branch técnica."""
    estado = {
        "status": "success",
        "updatedAt": datetime.now(timezone.utc)
        .replace(microsecond=0)
        .isoformat()
        .replace("+00:00", "Z"),
        "message": (
            "Base recebida, recalculada, sincronizada e validada. "
            "Todos os arquivos derivados foram promovidos para a versão pública."
        ),
        "sourceFile": os.environ.get("BASE_NAME", "Não informado"),
        "requestId": os.environ.get("RELEASE_ID", "Não informado"),
        "years": carregar_anos_publicados(),
    }
    ESTADO_PATH.write_text(
        json.dumps(estado, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def preparar_dicionario() -> None:
    """Copia o dicionário opcional para o nome público padronizado."""
    origem_texto = os.environ.get("DICTIONARY_FILE", "").strip()
    if not origem_texto:
        return
    origem = Path(origem_texto)
    if not origem.is_file():
        raise FileNotFoundError(f"Dicionário informado não foi encontrado: {origem}")
    extensao = origem.suffix.lower()
    if extensao not in {".csv", ".xls", ".xlsm"}:
        raise RuntimeError(f"Formato de dicionário não aceito: {extensao}")
    destino = ROOT / f"DicionarioDosDadosDoVigitel{extensao}"
    for nome in DICIONARIOS_CANONICOS:
        caminho = ROOT / nome
        if caminho != destino and caminho.exists():
            caminho.unlink()
    shutil.copy2(origem, destino)


def enviar_estado_atual() -> None:
    """Envia o commit atual com compactação mínima para a branch técnica."""
    executar(
        "git",
        "-c",
        "pack.threads=1",
        "-c",
        "pack.window=0",
        "-c",
        "core.compression=1",
        "push",
        "--force",
        "origin",
        f"HEAD:refs/heads/{BRANCH_REMOTA}",
    )


def confirmar_branch_remota(sha_local: str) -> None:
    """Confere se a branch técnica aponta para o mesmo commit local."""
    repositorio = os.environ["GITHUB_REPOSITORY"]
    resultado = executar(
        "gh",
        "api",
        f"repos/{repositorio}/git/ref/heads/{BRANCH_REMOTA}",
        "--jq",
        ".object.sha",
        capturar=True,
    )
    sha_remoto = resultado.stdout.strip()
    if sha_remoto != sha_local:
        raise RuntimeError(
            f"A branch técnica aponta para {sha_remoto}, mas o commit esperado é {sha_local}."
        )


def promover_para_main(sha_final: str) -> None:
    """Avança a main por fast-forward somente depois de todos os arquivos chegarem."""
    repositorio = os.environ["GITHUB_REPOSITORY"]
    executar(
        "gh",
        "api",
        "--method",
        "PATCH",
        f"repos/{repositorio}/git/refs/heads/main",
        "-f",
        f"sha={sha_final}",
        "-F",
        "force=false",
    )


def limpar_pedido_e_publicar_pages() -> None:
    """Remove o envio bruto processado e solicita a reconstrução do site."""
    repositorio = os.environ["GITHUB_REPOSITORY"]
    release_id = os.environ.get("RELEASE_ID", "").strip()
    release_tag = os.environ.get("RELEASE_TAG", "").strip()
    if release_id:
        subprocess.run(
            ["gh", "api", "-X", "DELETE", f"repos/{repositorio}/releases/{release_id}"],
            cwd=ROOT,
            check=False,
        )
    if release_tag:
        subprocess.run(
            [
                "gh",
                "api",
                "-X",
                "DELETE",
                f"repos/{repositorio}/git/refs/tags/{release_tag}",
            ],
            cwd=ROOT,
            check=False,
        )
    subprocess.run(
        ["gh", "api", "-X", "POST", f"repos/{repositorio}/pages/builds"],
        cwd=ROOT,
        check=False,
    )
    subprocess.run(
        ["gh", "api", "-X", "DELETE", f"repos/{repositorio}/git/refs/heads/{BRANCH_REMOTA}"],
        cwd=ROOT,
        check=False,
    )


def main() -> int:
    """Envia os arquivos em partes e promove o conjunto validado para a main."""
    if os.environ.get("GITHUB_ACTIONS", "").lower() != "true":
        print("Publicação em partes ignorada fora do GitHub Actions.")
        return 0

    executar("git", "config", "user.name", "Observatório Vigitel - Administração remota")
    executar(
        "git",
        "config",
        "user.email",
        "41898282+github-actions[bot]@users.noreply.github.com",
    )

    preparar_dicionario()
    escrever_estado_sucesso()

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

    sha_final = executar("git", "rev-parse", "HEAD", capturar=True).stdout.strip()
    if enviados == 0:
        # Ainda cria a referência técnica para validar e promover o estado corrente.
        enviar_estado_atual()
    confirmar_branch_remota(sha_final)
    promover_para_main(sha_final)
    limpar_pedido_e_publicar_pages()

    print(
        "Publicação atômica concluída: "
        f"{enviados} arquivo(s) sincronizado(s); commit final {sha_final}.",
        flush=True,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
