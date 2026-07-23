#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Administração local e independente do Observatório Analítico do Vigitel.

Coloque este arquivo na raiz do projeto, ao lado de index.html,
AtualizarBaseDoPainel.py e dos demais arquivos do observatório.

A aplicação:
- cria credenciais locais no primeiro uso;
- aceita base CSV, XLS ou XLSM, inclusive com vários anos;
- aceita um dicionário opcional nos mesmos formatos;
- atualiza somente os anos encontrados na base;
- preserva e restaura os arquivos anteriores se houver falha;
- executa as validações do projeto;
- gera pacotes ZIP prontos para arquivamento ou publicação;
- não usa GitHub, token, OAuth ou serviço externo.
"""
from __future__ import annotations

import argparse
import base64
import hashlib
import hmac
import html
import json
import os
import queue
import re
import secrets
import shutil
import subprocess
import sys
import tempfile
import threading
import time
import traceback
import webbrowser
import zipfile
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Callable, Iterable
from urllib.parse import unquote, urlsplit

try:
    import tkinter as tk
    from tkinter import filedialog, messagebox, simpledialog, ttk
    from tkinter.scrolledtext import ScrolledText
except Exception as error:  # pragma: no cover - depende da instalação local
    raise SystemExit(f"O Python foi instalado sem Tkinter: {error}")

APP_NAME = "Administração Independente do Observatório"
APP_VERSION = "1.0.0"
ROOT = Path(__file__).resolve().parent
PRIVATE_DIR = ROOT / ".administracao_local"
CREDENTIAL_FILE = PRIVATE_DIR / "credenciais.json"
HISTORY_FILE = PRIVATE_DIR / "historico.json"
BACKUP_DIR = PRIVATE_DIR / "backups"
OUTPUT_DIR = ROOT / "PacotesGerados"

ALLOWED_EXTENSIONS = {".csv", ".xls", ".xlsm"}
PBKDF2_ITERATIONS = 600_000
MAX_LOGIN_ATTEMPTS = 5
LOCK_SECONDS = 5 * 60

REQUIRED_PROJECT_FILES = [
    "index.html",
    "AtualizarBaseDoPainel.py",
    "RecalculoDosIndicadores.py",
    "ValidacaoDaBaseCompleta.py",
    "TesteDosIndicadoresEGraficos.js",
    "BaseAnaliticaDoVigitel.js",
    "CatalogoDeIdadeDetalhada.js",
    "MetodologiaDosIndicadores.js",
    "SistemaAnaliticoDoVigitel.js",
]

GENERATED_FILES = [
    "BaseAnaliticaDoVigitel.js",
    "CatalogoDeIdadeDetalhada.js",
    "DadosIdadeDetalhadaTabagismo.js",
    "DadosIdadeDetalhadaAlcool.js",
    "DadosIdadeDetalhadaEstadoNutricional.js",
    "DadosIdadeDetalhadaAlimentacao.js",
    "DadosIdadeDetalhadaAtividadeFisica.js",
    "DadosIdadeDetalhadaAutoavaliacaoDeSaude.js",
    "DadosIdadeDetalhadaPrevencaoDoCancer.js",
    "DadosIdadeDetalhadaMorbidades.js",
    "DadosIdadeDetalhadaConducaoETransito.js",
]

AUXILIARY_OUTPUTS = [
    "EstadoDaAtualizacao.json",
    "RelatorioDaValidacaoDaBase.txt",
    "RelatorioDosIndicadoresEGraficos.txt",
    "RelatorioDaAtualizacaoLocal.html",
    "RelatorioDoDicionarioEnviado.txt",
]

DICTIONARY_NAMES = [
    "DicionarioDosDadosDoVigitel.csv",
    "DicionarioDosDadosDoVigitel.xls",
    "DicionarioDosDadosDoVigitel.xlsm",
]

PACKAGE_EXCLUSIONS = {
    ".git",
    ".github",
    ".administracao_local",
    "PacotesGerados",
    "AtualizarBase",
    "__pycache__",
    ".pytest_cache",
}


@dataclass
class DiagnosticItem:
    label: str
    ok: bool
    detail: str
    required: bool = True


class CancelledError(RuntimeError):
    """Indica cancelamento solicitado pela usuária."""


def now_text() -> str:
    return datetime.now().strftime("%d/%m/%Y %H:%M:%S")


def safe_timestamp() -> str:
    return datetime.now().strftime("%Y%m%d_%H%M%S")


def human_size(size: int) -> str:
    units = ["B", "KiB", "MiB", "GiB", "TiB"]
    value = float(size)
    for unit in units:
        if value < 1024 or unit == units[-1]:
            return f"{value:.2f} {unit}"
        value /= 1024
    return f"{size} B"


def atomic_write_json(path: Path, payload: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    os.replace(temporary, path)
    try:
        os.chmod(path, 0o600)
    except OSError:
        pass


def load_json(path: Path, default: object) -> object:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return default


def password_digest(password: str, salt: bytes, iterations: int = PBKDF2_ITERATIONS) -> bytes:
    return hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)


def create_credentials(username: str, password: str) -> None:
    username = username.strip()
    if len(username) < 3:
        raise ValueError("O login precisa ter pelo menos 3 caracteres.")
    if len(password) < 10:
        raise ValueError("A senha precisa ter pelo menos 10 caracteres.")
    if not re.search(r"[A-Za-zÀ-ÿ]", password) or not re.search(r"\d", password):
        raise ValueError("A senha precisa conter letras e números.")
    salt = secrets.token_bytes(24)
    digest = password_digest(password, salt)
    atomic_write_json(
        CREDENTIAL_FILE,
        {
            "version": 1,
            "username": username,
            "salt": base64.b64encode(salt).decode("ascii"),
            "digest": base64.b64encode(digest).decode("ascii"),
            "iterations": PBKDF2_ITERATIONS,
            "createdAt": now_text(),
        },
    )


def verify_credentials(username: str, password: str) -> bool:
    payload = load_json(CREDENTIAL_FILE, {})
    if not isinstance(payload, dict):
        return False
    try:
        stored_username = str(payload["username"])
        salt = base64.b64decode(payload["salt"])
        expected = base64.b64decode(payload["digest"])
        iterations = int(payload.get("iterations", PBKDF2_ITERATIONS))
    except (KeyError, ValueError, TypeError):
        return False
    if not hmac.compare_digest(stored_username, username.strip()):
        # Executa o cálculo mesmo quando o usuário não coincide para reduzir diferenças de tempo.
        password_digest(password, salt, iterations)
        return False
    candidate = password_digest(password, salt, iterations)
    return hmac.compare_digest(candidate, expected)


def project_diagnostics() -> list[DiagnosticItem]:
    items: list[DiagnosticItem] = []
    missing = [name for name in REQUIRED_PROJECT_FILES if not (ROOT / name).is_file()]
    items.append(
        DiagnosticItem(
            "Estrutura do projeto",
            not missing,
            "Todos os arquivos essenciais foram encontrados."
            if not missing
            else "Ausentes: " + ", ".join(missing),
        )
    )

    python_ok = sys.version_info >= (3, 10)
    items.append(
        DiagnosticItem(
            "Python",
            python_ok,
            f"Versão {sys.version.split()[0]}" + ("" if python_ok else "; necessário Python 3.10 ou superior"),
        )
    )

    essential_packages = []
    for module_name in ("numpy", "pandas", "openpyxl"):
        try:
            __import__(module_name)
            essential_packages.append(f"{module_name}: OK")
        except Exception:
            essential_packages.append(f"{module_name}: ausente")
    essential_ok = all(text.endswith("OK") for text in essential_packages)
    items.append(DiagnosticItem("Bibliotecas essenciais", essential_ok, "; ".join(essential_packages)))

    try:
        __import__("xlrd")
        xls_ok = True
        xls_detail = "xlrd: OK; arquivos XLS antigos podem ser lidos."
    except Exception:
        xls_ok = False
        xls_detail = "xlrd ausente; instale-o apenas se precisar abrir arquivos XLS antigos."
    items.append(DiagnosticItem("Compatibilidade com XLS antigo", xls_ok, xls_detail, required=False))

    node_path = shutil.which("node")
    items.append(
        DiagnosticItem(
            "Teste completo dos gráficos",
            bool(node_path),
            f"Node.js encontrado em {node_path}" if node_path else "Node.js não encontrado; a atualização poderá continuar com aviso.",
            required=False,
        )
    )

    try:
        PRIVATE_DIR.mkdir(parents=True, exist_ok=True)
        BACKUP_DIR.mkdir(parents=True, exist_ok=True)
        OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        test_path = PRIVATE_DIR / ".teste_escrita"
        test_path.write_text("ok", encoding="utf-8")
        test_path.unlink(missing_ok=True)
        writable = True
        detail = "A pasta do projeto permite gravação e criação de backups."
    except OSError as error:
        writable = False
        detail = f"Sem permissão de escrita: {error}"
    items.append(DiagnosticItem("Permissão de gravação", writable, detail))

    return items


def validate_input(path: Path, label: str) -> None:
    if not path.is_file():
        raise ValueError(f"{label}: arquivo não encontrado.")
    if path.suffix.lower() not in ALLOWED_EXTENSIONS:
        raise ValueError(f"{label}: use somente CSV, XLS ou XLSM.")
    if path.stat().st_size == 0:
        raise ValueError(f"{label}: o arquivo está vazio.")


def backup_project_files(destination: Path) -> list[str]:
    destination.mkdir(parents=True, exist_ok=True)
    backed_up: list[str] = []
    for name in GENERATED_FILES + AUXILIARY_OUTPUTS + DICTIONARY_NAMES:
        source = ROOT / name
        if source.is_file():
            target = destination / name
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, target)
            backed_up.append(name)
    atomic_write_json(destination / "manifesto.json", {"createdAt": now_text(), "files": backed_up})
    return backed_up


def restore_project_files(source: Path, log: Callable[[str], None]) -> None:
    manifest = load_json(source / "manifesto.json", {"files": []})
    files = manifest.get("files", []) if isinstance(manifest, dict) else []
    backed_up = set(str(name) for name in files)
    for name in GENERATED_FILES + AUXILIARY_OUTPUTS + DICTIONARY_NAMES:
        current = ROOT / name
        backup = source / name
        if backup.is_file():
            shutil.copy2(backup, current)
        elif name not in backed_up and current.exists():
            current.unlink(missing_ok=True)
    log("Os arquivos anteriores foram restaurados.")


def run_streaming_command(
    command: list[str],
    log: Callable[[str], None],
    cancel_event: threading.Event,
) -> str:
    log("Executando: " + " ".join(command))
    process = subprocess.Popen(
        command,
        cwd=ROOT,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        encoding="utf-8",
        errors="replace",
        bufsize=1,
    )
    output: list[str] = []
    assert process.stdout is not None
    try:
        while True:
            if cancel_event.is_set():
                process.terminate()
                try:
                    process.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    process.kill()
                raise CancelledError("Atualização cancelada.")
            line = process.stdout.readline()
            if line:
                clean = line.rstrip("\r\n")
                output.append(clean)
                log(clean)
            elif process.poll() is not None:
                break
            else:
                time.sleep(0.05)
    finally:
        try:
            process.stdout.close()
        except Exception:
            pass
    return_code = process.wait()
    combined = "\n".join(output)
    if return_code != 0:
        raise RuntimeError(
            f"O comando terminou com código {return_code}.\n"
            + (combined[-6000:] if combined else "Nenhum detalhe foi retornado.")
        )
    return combined


def canonicalize_dictionary(source: Path, log: Callable[[str], None]) -> Path:
    for old_name in DICTIONARY_NAMES:
        old = ROOT / old_name
        old.unlink(missing_ok=True)
    destination = ROOT / f"DicionarioDosDadosDoVigitel{source.suffix.lower()}"
    shutil.copy2(source, destination)
    digest = hashlib.sha256()
    with source.open("rb") as handle:
        while chunk := handle.read(1024 * 1024):
            digest.update(chunk)
    report = [
        "RELATÓRIO DO DICIONÁRIO ENVIADO",
        "=" * 42,
        f"Data: {now_text()}",
        f"Arquivo original: {source.name}",
        f"Arquivo armazenado: {destination.name}",
        f"Formato: {source.suffix.lower().lstrip('.').upper()}",
        f"Tamanho: {human_size(source.stat().st_size)}",
        f"SHA-256: {digest.hexdigest()}",
        "",
        "O dicionário foi preservado como documentação da base enviada.",
        "As regras de cálculo continuam sendo validadas pelos scripts metodológicos do projeto.",
    ]
    (ROOT / "RelatorioDoDicionarioEnviado.txt").write_text("\n".join(report) + "\n", encoding="utf-8")
    log(f"Dicionário armazenado como {destination.name}.")
    return destination


def validate_local_site() -> tuple[list[str], list[str]]:
    errors: list[str] = []
    warnings: list[str] = []
    index = ROOT / "index.html"
    if not index.is_file():
        return ["index.html não encontrado."], warnings

    html_text = index.read_text(encoding="utf-8", errors="replace")
    references = re.findall(r"(?:src|href)=[\"']([^\"']+)[\"']", html_text, flags=re.I)
    for value in references:
        value = value.strip()
        if not value or value.startswith(("#", "http://", "https://", "mailto:", "data:", "javascript:")):
            continue
        path = unquote(urlsplit(value).path)
        if not path:
            continue
        candidate = ROOT / path.lstrip("/")
        if not candidate.is_file():
            errors.append(f"Referência local inexistente no index: {value}")

    bundles = sorted(ROOT.glob("DadosIdadeDetalhada*.js"))
    if len(bundles) != 9:
        errors.append(f"Esperados 9 arquivos de idade detalhada; encontrados {len(bundles)}.")

    for name in GENERATED_FILES:
        path = ROOT / name
        if not path.is_file() or path.stat().st_size == 0:
            errors.append(f"Arquivo gerado ausente ou vazio: {name}")

    if (ROOT / "AdministracaoDoObservatorio.html").is_file():
        warnings.append(
            "Existe uma administração pública em HTML na raiz. Para manter a atualização realmente privada, "
            "remova esse arquivo do site publicado."
        )
    return errors, warnings


def write_state(status: str, message: str, result: dict | None = None) -> None:
    payload: dict[str, object] = {
        "status": status,
        "updatedAt": datetime.now().astimezone().isoformat(timespec="seconds"),
        "message": message,
        "mode": "administracao-local-independente",
    }
    if result:
        payload.update(
            {
                "sourceFile": result.get("sourceFile"),
                "years": result.get("years", []),
                "populations": result.get("populations", []),
                "summaries": result.get("summaries", []),
                "totalRows": result.get("totalRows"),
            }
        )
    atomic_write_json(ROOT / "EstadoDaAtualizacao.json", payload)


def generate_html_report(
    base_path: Path,
    dictionary_path: Path | None,
    result: dict,
    node_tested: bool,
    warnings: Iterable[str],
    delta_zip: Path | None,
    full_zip: Path | None,
) -> Path:
    summaries = result.get("summaries", []) if isinstance(result, dict) else []
    rows = []
    for item in summaries:
        if not isinstance(item, dict):
            continue
        rows.append(
            "<tr>"
            f"<td>{html.escape(str(item.get('year', '')))}</td>"
            f"<td>{html.escape(str(item.get('population', '')))}</td>"
            f"<td>{html.escape(str(item.get('respondents', '')))}</td>"
            f"<td>{html.escape(str(item.get('weightColumn', '')))}</td>"
            f"<td>{html.escape(str(item.get('indicatorsCalculated', '')))}</td>"
            "</tr>"
        )
    warning_html = "".join(f"<li>{html.escape(str(item))}</li>" for item in warnings) or "<li>Nenhum aviso.</li>"
    report = f"""<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Relatório da atualização local</title>
<style>
body{{font-family:Arial,sans-serif;margin:0;background:#f3f6fa;color:#15324d}}
main{{max-width:1050px;margin:32px auto;padding:0 20px}}
header,.card{{background:#fff;border:1px solid #dbe5ef;border-radius:16px;padding:24px;margin-bottom:18px;box-shadow:0 10px 30px rgba(20,50,77,.07)}}
h1{{margin:0 0 8px;font-size:28px}} h2{{font-size:19px;margin-top:0}}
.status{{display:inline-block;padding:7px 12px;border-radius:999px;background:#e7f7ef;color:#17683d;font-weight:700}}
table{{width:100%;border-collapse:collapse}} th,td{{padding:10px;border-bottom:1px solid #e4ebf2;text-align:left}} th{{background:#f7f9fc}}
code{{background:#eef3f7;padding:2px 6px;border-radius:6px}} ul{{line-height:1.6}}
</style>
</head>
<body><main>
<header><span class="status">ATUALIZAÇÃO CONCLUÍDA</span><h1>Observatório Analítico do Vigitel</h1><p>Processamento local e independente de GitHub.</p></header>
<section class="card"><h2>Arquivos</h2><p><strong>Base:</strong> {html.escape(base_path.name)} ({human_size(base_path.stat().st_size)})</p>
<p><strong>Dicionário:</strong> {html.escape(dictionary_path.name) if dictionary_path else 'Não enviado'}</p>
<p><strong>Data:</strong> {now_text()}</p><p><strong>Teste dos 819 gráficos:</strong> {'Executado com Node.js' if node_tested else 'Não executado; Node.js não estava disponível'}</p></section>
<section class="card"><h2>Resultado</h2><p><strong>Anos:</strong> {html.escape(', '.join(map(str, result.get('years', []))))}</p>
<p><strong>Populações:</strong> {html.escape(', '.join(map(str, result.get('populations', []))))}</p>
<p><strong>Linhas agregadas totais:</strong> {html.escape(str(result.get('totalRows', 'não informado')))}</p>
<table><thead><tr><th>Ano</th><th>População</th><th>Entrevistados</th><th>Peso</th><th>Indicadores</th></tr></thead><tbody>{''.join(rows)}</tbody></table></section>
<section class="card"><h2>Pacotes</h2><p><strong>Arquivos atualizados:</strong> {html.escape(str(delta_zip.name if delta_zip else 'não gerado'))}</p>
<p><strong>Projeto completo:</strong> {html.escape(str(full_zip.name if full_zip else 'não gerado'))}</p></section>
<section class="card"><h2>Avisos</h2><ul>{warning_html}</ul></section>
</main></body></html>"""
    path = ROOT / "RelatorioDaAtualizacaoLocal.html"
    path.write_text(report, encoding="utf-8")
    return path


def add_file_to_zip(archive: zipfile.ZipFile, path: Path, arcname: str) -> None:
    if path.is_file():
        archive.write(path, arcname)


def create_delta_package(timestamp: str, dictionary_path: Path | None) -> Path:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    destination = OUTPUT_DIR / f"ArquivosAtualizadosDoPainel_{timestamp}.zip"
    names = GENERATED_FILES + AUXILIARY_OUTPUTS
    if dictionary_path:
        names.append(dictionary_path.name)
    with zipfile.ZipFile(destination, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=7) as archive:
        for name in dict.fromkeys(names):
            path = ROOT / name
            add_file_to_zip(archive, path, name)
    return destination


def should_exclude(relative: Path) -> bool:
    if any(part in PACKAGE_EXCLUSIONS for part in relative.parts):
        return True
    if relative.name in {
        Path(__file__).name,
        "IniciarAdministracaoIndependente.bat",
        "AdministracaoDoObservatorio.html",
        "AdministracaoDoObservatorioAtualizada.html",
        "AdministracaoDoObservatorioComLogin.html",
    }:
        return True
    if relative.suffix.lower() in {".pyc", ".pyo"}:
        return True
    return False


def create_full_package(timestamp: str) -> Path:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    destination = OUTPUT_DIR / f"ObservatorioAnaliticoDoVigitelAtualizado_{timestamp}.zip"
    with zipfile.ZipFile(destination, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
        for path in sorted(ROOT.rglob("*")):
            if not path.is_file():
                continue
            relative = path.relative_to(ROOT)
            if should_exclude(relative):
                continue
            archive.write(path, relative.as_posix())
    return destination


def append_history(entry: dict) -> None:
    history = load_json(HISTORY_FILE, [])
    if not isinstance(history, list):
        history = []
    history.insert(0, entry)
    atomic_write_json(HISTORY_FILE, history[:100])


class UpdateEngine:
    def __init__(self, log: Callable[[str], None], progress: Callable[[int, str], None]):
        self.log = log
        self.progress = progress
        self.cancel_event = threading.Event()

    def cancel(self) -> None:
        self.cancel_event.set()

    def check_cancel(self) -> None:
        if self.cancel_event.is_set():
            raise CancelledError("Atualização cancelada.")

    def execute(
        self,
        base_path: Path,
        dictionary_path: Path | None,
        make_delta: bool,
        make_full: bool,
    ) -> dict:
        validate_input(base_path, "Base do Vigitel")
        if dictionary_path:
            validate_input(dictionary_path, "Dicionário")

        selected_extensions = {base_path.suffix.lower()}
        if dictionary_path:
            selected_extensions.add(dictionary_path.suffix.lower())
        if ".xls" in selected_extensions:
            try:
                __import__("xlrd")
            except Exception as error:
                raise RuntimeError(
                    "Para abrir arquivos XLS antigos, instale a biblioteca xlrd com: py -m pip install xlrd>=2.0"
                ) from error
        if ".xlsm" in selected_extensions:
            try:
                __import__("openpyxl")
            except Exception as error:
                raise RuntimeError(
                    "Para abrir arquivos XLSM, instale a biblioteca openpyxl com: py -m pip install openpyxl>=3.1"
                ) from error

        diagnostics = project_diagnostics()
        blocking = [item for item in diagnostics if item.required and not item.ok]
        if blocking:
            raise RuntimeError("Diagnóstico bloqueou a atualização: " + " | ".join(item.detail for item in blocking))

        timestamp = safe_timestamp()
        backup = BACKUP_DIR / f"Backup_{timestamp}"
        warnings: list[str] = []
        node_path = shutil.which("node")
        node_tested = False
        result: dict = {}
        delta_zip: Path | None = None
        full_zip: Path | None = None
        stored_dictionary: Path | None = None

        self.progress(5, "Preparando backup")
        self.log(f"Início: {now_text()}")
        self.log(f"Base selecionada: {base_path.name} ({human_size(base_path.stat().st_size)})")
        if dictionary_path:
            self.log(f"Dicionário selecionado: {dictionary_path.name} ({human_size(dictionary_path.stat().st_size)})")
        backup_project_files(backup)
        self.log(f"Backup criado em {backup}.")

        try:
            self.check_cancel()
            write_state("processing", "A base está sendo processada localmente.")
            self.progress(15, "Lendo e recalculando a base")
            with tempfile.TemporaryDirectory(prefix="AtualizacaoLocalVigitel_") as temp_dir:
                result_path = Path(temp_dir) / "resultado.json"
                run_streaming_command(
                    [
                        sys.executable,
                        str(ROOT / "AtualizarBaseDoPainel.py"),
                        "--arquivo",
                        str(base_path),
                        "--resultado",
                        str(result_path),
                    ],
                    self.log,
                    self.cancel_event,
                )
                if not result_path.is_file():
                    raise RuntimeError("O processador não gerou o resumo da atualização.")
                result = json.loads(result_path.read_text(encoding="utf-8"))

            self.check_cancel()
            self.progress(55, "Validando a integridade dos dados")
            run_streaming_command(
                [sys.executable, str(ROOT / "ValidacaoDaBaseCompleta.py")],
                self.log,
                self.cancel_event,
            )

            self.check_cancel()
            if node_path:
                self.progress(68, "Testando indicadores e gráficos")
                run_streaming_command(
                    [node_path, str(ROOT / "TesteDosIndicadoresEGraficos.js")],
                    self.log,
                    self.cancel_event,
                )
                node_tested = True
            else:
                warning = (
                    "Node.js não foi encontrado. A integridade estatística foi validada, "
                    "mas o teste automatizado das 819 combinações de gráficos não foi executado."
                )
                warnings.append(warning)
                self.log("AVISO: " + warning)

            self.check_cancel()
            self.progress(76, "Conferindo os arquivos do painel")
            site_errors, site_warnings = validate_local_site()
            warnings.extend(site_warnings)
            for warning in site_warnings:
                self.log("AVISO: " + warning)
            if site_errors:
                raise RuntimeError("Falha na validação local do site:\n- " + "\n- ".join(site_errors))

            self.check_cancel()
            if dictionary_path:
                self.progress(82, "Armazenando o dicionário")
                stored_dictionary = canonicalize_dictionary(dictionary_path, self.log)

            write_state("success", "Base atualizada e validada localmente.", result)

            self.progress(87, "Gerando relatório")
            # Cria o relatório uma vez antes dos pacotes e o atualiza após conhecer seus nomes.
            report_path = generate_html_report(
                base_path,
                stored_dictionary,
                result,
                node_tested,
                warnings,
                None,
                None,
            )
            self.log(f"Relatório gerado: {report_path.name}")

            self.check_cancel()
            if make_delta:
                self.progress(91, "Compactando os arquivos atualizados")
                delta_zip = create_delta_package(timestamp, stored_dictionary)
                self.log(f"Pacote de atualização: {delta_zip}")

            self.check_cancel()
            if make_full:
                self.progress(95, "Compactando o projeto completo")
                full_zip = create_full_package(timestamp)
                self.log(f"Pacote completo: {full_zip}")

            generate_html_report(
                base_path,
                stored_dictionary,
                result,
                node_tested,
                warnings,
                delta_zip,
                full_zip,
            )
            # Atualiza o pacote pequeno para incluir o relatório final com os nomes dos pacotes.
            if make_delta:
                delta_zip = create_delta_package(timestamp, stored_dictionary)

            self.progress(100, "Atualização concluída")
            self.log("Atualização concluída sem falhas de integridade.")
            entry = {
                "date": now_text(),
                "status": "success",
                "base": base_path.name,
                "dictionary": stored_dictionary.name if stored_dictionary else None,
                "years": result.get("years", []),
                "populations": result.get("populations", []),
                "nodeTested": node_tested,
                "warnings": warnings,
                "deltaPackage": str(delta_zip) if delta_zip else None,
                "fullPackage": str(full_zip) if full_zip else None,
                "backup": str(backup),
            }
            append_history(entry)
            return entry
        except Exception as error:
            self.log(f"ERRO: {error}")
            self.progress(0, "Restaurando a versão anterior")
            restore_project_files(backup, self.log)
            write_state("error", str(error))
            append_history(
                {
                    "date": now_text(),
                    "status": "cancelled" if isinstance(error, CancelledError) else "error",
                    "base": base_path.name,
                    "dictionary": dictionary_path.name if dictionary_path else None,
                    "message": str(error),
                    "backup": str(backup),
                }
            )
            raise


class AdministrationApp(tk.Tk):
    BG = "#eef3f8"
    CARD = "#ffffff"
    NAVY = "#133a5e"
    BLUE = "#1769aa"
    BLUE_DARK = "#0f568d"
    TEAL = "#148a8a"
    TEXT = "#17324d"
    MUTED = "#5f7285"
    BORDER = "#d8e2ec"
    SUCCESS = "#18794e"
    WARNING = "#9a6700"
    DANGER = "#b42318"

    def __init__(self) -> None:
        super().__init__()
        self.title(f"{APP_NAME} — {APP_VERSION}")
        self.geometry("1040x760")
        self.minsize(940, 680)
        self.configure(bg=self.BG)
        self.protocol("WM_DELETE_WINDOW", self.on_close)
        self.style = ttk.Style(self)
        try:
            self.style.theme_use("clam")
        except tk.TclError:
            pass
        self.configure_styles()

        self.login_attempts = 0
        self.lock_until = 0.0
        self.current_engine: UpdateEngine | None = None
        self.worker: threading.Thread | None = None
        self.ui_queue: queue.Queue[tuple[str, object]] = queue.Queue()
        self.base_path = tk.StringVar()
        self.dictionary_path = tk.StringVar()
        self.make_delta = tk.BooleanVar(value=True)
        self.make_full = tk.BooleanVar(value=False)
        self.open_report = tk.BooleanVar(value=True)
        self.status_var = tk.StringVar(value="Aguardando")
        self.progress_var = tk.IntVar(value=0)
        self.user_var = tk.StringVar(value="LuannaSilvaa")
        self.password_var = tk.StringVar()

        self.after(100, self.poll_queue)
        if CREDENTIAL_FILE.is_file():
            self.show_login()
        else:
            self.show_first_setup()

    def configure_styles(self) -> None:
        self.style.configure("TFrame", background=self.BG)
        self.style.configure("Card.TFrame", background=self.CARD)
        self.style.configure("Header.TFrame", background=self.NAVY)
        self.style.configure("TLabel", background=self.BG, foreground=self.TEXT, font=("Segoe UI", 10))
        self.style.configure("Card.TLabel", background=self.CARD, foreground=self.TEXT, font=("Segoe UI", 10))
        self.style.configure("Muted.Card.TLabel", background=self.CARD, foreground=self.MUTED, font=("Segoe UI", 9))
        self.style.configure("Title.Card.TLabel", background=self.CARD, foreground=self.TEXT, font=("Segoe UI Semibold", 17))
        self.style.configure("HeaderTitle.TLabel", background=self.NAVY, foreground="white", font=("Segoe UI Semibold", 21))
        self.style.configure("HeaderSub.TLabel", background=self.NAVY, foreground="#dbe9f5", font=("Segoe UI", 10))
        self.style.configure("Primary.TButton", font=("Segoe UI Semibold", 10), padding=(16, 10), background=self.BLUE, foreground="white", borderwidth=0)
        self.style.map("Primary.TButton", background=[("active", self.BLUE_DARK), ("disabled", "#9cb4c8")])
        self.style.configure("Secondary.TButton", font=("Segoe UI Semibold", 9), padding=(12, 8), background="#e7eef5", foreground=self.TEXT, borderwidth=0)
        self.style.map("Secondary.TButton", background=[("active", "#dbe6ef")])
        self.style.configure("Danger.TButton", font=("Segoe UI Semibold", 9), padding=(12, 8), background="#fee4e2", foreground=self.DANGER, borderwidth=0)
        self.style.map("Danger.TButton", background=[("active", "#fecdca")])
        self.style.configure("TEntry", padding=8, fieldbackground="white")
        self.style.configure("Horizontal.TProgressbar", thickness=16, background=self.TEAL, troughcolor="#dce6ef")
        self.style.configure("TCheckbutton", background=self.CARD, foreground=self.TEXT, font=("Segoe UI", 9))
        self.style.map("TCheckbutton", background=[("active", self.CARD)])

    def clear(self) -> None:
        for child in self.winfo_children():
            child.destroy()

    def make_header(self, subtitle: str) -> None:
        header = ttk.Frame(self, style="Header.TFrame", padding=(34, 24))
        header.pack(fill="x")
        title_row = ttk.Frame(header, style="Header.TFrame")
        title_row.pack(fill="x")
        ttk.Label(title_row, text="Observatório Analítico do Vigitel", style="HeaderTitle.TLabel").pack(side="left")
        ttk.Label(title_row, text="ADMINISTRAÇÃO LOCAL", style="HeaderSub.TLabel").pack(side="right", pady=(8, 0))
        ttk.Label(header, text=subtitle, style="HeaderSub.TLabel").pack(anchor="w", pady=(7, 0))

    def center_card(self, width: int = 580) -> ttk.Frame:
        outer = ttk.Frame(self, padding=28)
        outer.pack(fill="both", expand=True)
        card = ttk.Frame(outer, style="Card.TFrame", padding=30, width=width)
        card.pack(expand=True)
        return card

    def show_first_setup(self) -> None:
        self.clear()
        self.make_header("Primeiro acesso: crie suas credenciais privadas neste computador.")
        card = self.center_card(600)
        ttk.Label(card, text="Criar acesso administrativo", style="Title.Card.TLabel").pack(anchor="w")
        ttk.Label(
            card,
            text="Essas credenciais ficam somente na pasta local do projeto. Nenhum token ou conta externa é utilizado.",
            style="Muted.Card.TLabel",
            wraplength=520,
            justify="left",
        ).pack(anchor="w", pady=(8, 22))

        username = tk.StringVar(value="LuannaSilvaa")
        password = tk.StringVar()
        confirmation = tk.StringVar()
        self.labeled_entry(card, "Login", username)
        self.labeled_entry(card, "Senha", password, show="●")
        self.labeled_entry(card, "Confirmar senha", confirmation, show="●")
        ttk.Label(
            card,
            text="Use pelo menos 10 caracteres, com letras e números.",
            style="Muted.Card.TLabel",
        ).pack(anchor="w", pady=(4, 18))

        def save() -> None:
            try:
                if password.get() != confirmation.get():
                    raise ValueError("As senhas informadas não coincidem.")
                create_credentials(username.get(), password.get())
                messagebox.showinfo(APP_NAME, "Acesso criado com sucesso.")
                self.user_var.set(username.get().strip())
                self.password_var.set("")
                self.show_login()
            except Exception as error:
                messagebox.showerror(APP_NAME, str(error))

        ttk.Button(card, text="Criar meu acesso", style="Primary.TButton", command=save).pack(fill="x", pady=(6, 0))

    def labeled_entry(self, parent: ttk.Frame, label: str, variable: tk.StringVar, show: str | None = None) -> ttk.Entry:
        ttk.Label(parent, text=label, style="Card.TLabel").pack(anchor="w", pady=(8, 5))
        entry = ttk.Entry(parent, textvariable=variable, show=show or "")
        entry.pack(fill="x")
        return entry

    def show_login(self) -> None:
        self.clear()
        self.make_header("Acesso reservado à responsável pela atualização da base.")
        card = self.center_card(560)
        ttk.Label(card, text="Entrar na administração", style="Title.Card.TLabel").pack(anchor="w")
        ttk.Label(
            card,
            text="O processamento acontece neste computador e não depende do GitHub.",
            style="Muted.Card.TLabel",
        ).pack(anchor="w", pady=(7, 20))
        user_entry = self.labeled_entry(card, "Login", self.user_var)
        password_entry = self.labeled_entry(card, "Senha", self.password_var, show="●")
        password_entry.bind("<Return>", lambda _event: self.login())
        button = ttk.Button(card, text="Entrar", style="Primary.TButton", command=self.login)
        button.pack(fill="x", pady=(20, 0))
        ttk.Label(
            card,
            text="Após cinco tentativas incorretas, o acesso é bloqueado temporariamente por cinco minutos.",
            style="Muted.Card.TLabel",
            wraplength=490,
        ).pack(anchor="w", pady=(14, 0))
        user_entry.focus_set()

    def login(self) -> None:
        remaining = int(max(0, self.lock_until - time.time()))
        if remaining > 0:
            messagebox.showwarning(APP_NAME, f"Acesso bloqueado. Tente novamente em {remaining // 60 + 1} minuto(s).")
            return
        if verify_credentials(self.user_var.get(), self.password_var.get()):
            self.login_attempts = 0
            self.password_var.set("")
            self.show_dashboard()
            return
        self.login_attempts += 1
        left = MAX_LOGIN_ATTEMPTS - self.login_attempts
        if left <= 0:
            self.lock_until = time.time() + LOCK_SECONDS
            self.login_attempts = 0
            messagebox.showerror(APP_NAME, "Muitas tentativas incorretas. O acesso foi bloqueado por cinco minutos.")
        else:
            messagebox.showerror(APP_NAME, f"Login ou senha incorretos. Restam {left} tentativa(s).")

    def show_dashboard(self) -> None:
        self.clear()
        self.make_header("Atualize, valide e compacte a base sem usar token ou serviço externo.")
        body = ttk.Frame(self, padding=22)
        body.pack(fill="both", expand=True)

        top = ttk.Frame(body)
        top.pack(fill="x")
        left = ttk.Frame(top, style="Card.TFrame", padding=22)
        left.pack(side="left", fill="both", expand=True, padx=(0, 10))
        right = ttk.Frame(top, style="Card.TFrame", padding=22, width=300)
        right.pack(side="right", fill="y", padx=(10, 0))
        right.pack_propagate(False)

        ttk.Label(left, text="Nova atualização", style="Title.Card.TLabel").pack(anchor="w")
        ttk.Label(
            left,
            text="Selecione a base completa ou anual. Anos ausentes no arquivo permanecem preservados.",
            style="Muted.Card.TLabel",
            wraplength=620,
        ).pack(anchor="w", pady=(6, 18))

        self.file_selector(left, "Base do Vigitel", self.base_path, self.choose_base, required=True)
        self.file_selector(left, "Dicionário dos dados", self.dictionary_path, self.choose_dictionary, required=False)

        options = ttk.Frame(left, style="Card.TFrame")
        options.pack(fill="x", pady=(14, 4))
        ttk.Checkbutton(options, text="Gerar pacote apenas com os arquivos atualizados", variable=self.make_delta).pack(anchor="w", pady=3)
        ttk.Checkbutton(options, text="Gerar também o projeto completo em ZIP", variable=self.make_full).pack(anchor="w", pady=3)
        ttk.Checkbutton(options, text="Abrir o relatório ao finalizar", variable=self.open_report).pack(anchor="w", pady=3)

        buttons = ttk.Frame(left, style="Card.TFrame")
        buttons.pack(fill="x", pady=(18, 0))
        self.update_button = ttk.Button(buttons, text="Atualizar e validar painel", style="Primary.TButton", command=self.start_update)
        self.update_button.pack(side="left", fill="x", expand=True)
        self.cancel_button = ttk.Button(buttons, text="Cancelar", style="Danger.TButton", command=self.cancel_update, state="disabled")
        self.cancel_button.pack(side="left", padx=(10, 0))

        ttk.Label(right, text="Situação do ambiente", style="Title.Card.TLabel").pack(anchor="w")
        self.diagnostic_container = ttk.Frame(right, style="Card.TFrame")
        self.diagnostic_container.pack(fill="both", expand=True, pady=(12, 10))
        ttk.Button(right, text="Verificar novamente", style="Secondary.TButton", command=self.refresh_diagnostics).pack(fill="x")
        ttk.Button(right, text="Alterar senha", style="Secondary.TButton", command=self.change_password).pack(fill="x", pady=(8, 0))
        ttk.Button(right, text="Sair", style="Secondary.TButton", command=self.show_login).pack(fill="x", pady=(8, 0))

        progress_card = ttk.Frame(body, style="Card.TFrame", padding=18)
        progress_card.pack(fill="both", expand=True, pady=(18, 0))
        status_row = ttk.Frame(progress_card, style="Card.TFrame")
        status_row.pack(fill="x")
        ttk.Label(status_row, text="Andamento", style="Title.Card.TLabel").pack(side="left")
        self.status_label = ttk.Label(status_row, textvariable=self.status_var, style="Muted.Card.TLabel")
        self.status_label.pack(side="right", pady=(5, 0))
        ttk.Progressbar(progress_card, maximum=100, variable=self.progress_var).pack(fill="x", pady=(12, 12))
        self.log_box = ScrolledText(
            progress_card,
            height=12,
            font=("Consolas", 9),
            background="#f8fafc",
            foreground=self.TEXT,
            borderwidth=1,
            relief="solid",
            wrap="word",
        )
        self.log_box.pack(fill="both", expand=True)
        self.log_box.configure(state="disabled")
        self.refresh_diagnostics()

    def file_selector(
        self,
        parent: ttk.Frame,
        title: str,
        variable: tk.StringVar,
        command: Callable[[], None],
        required: bool,
    ) -> None:
        label = title + (" *" if required else " (opcional)")
        ttk.Label(parent, text=label, style="Card.TLabel").pack(anchor="w", pady=(8, 5))
        row = ttk.Frame(parent, style="Card.TFrame")
        row.pack(fill="x")
        entry = ttk.Entry(row, textvariable=variable, state="readonly")
        entry.pack(side="left", fill="x", expand=True)
        ttk.Button(row, text="Selecionar", style="Secondary.TButton", command=command).pack(side="left", padx=(8, 0))
        if not required:
            ttk.Button(row, text="Limpar", style="Secondary.TButton", command=lambda: variable.set("")).pack(side="left", padx=(8, 0))

    def choose_base(self) -> None:
        path = filedialog.askopenfilename(
            title="Selecionar base do Vigitel",
            filetypes=[("Base do Vigitel", "*.csv *.xls *.xlsm"), ("CSV", "*.csv"), ("Excel", "*.xls *.xlsm")],
        )
        if path:
            self.base_path.set(path)

    def choose_dictionary(self) -> None:
        path = filedialog.askopenfilename(
            title="Selecionar dicionário",
            filetypes=[("Dicionário", "*.csv *.xls *.xlsm"), ("CSV", "*.csv"), ("Excel", "*.xls *.xlsm")],
        )
        if path:
            self.dictionary_path.set(path)

    def refresh_diagnostics(self) -> None:
        if not hasattr(self, "diagnostic_container"):
            return
        for child in self.diagnostic_container.winfo_children():
            child.destroy()
        diagnostics = project_diagnostics()
        for item in diagnostics:
            row = ttk.Frame(self.diagnostic_container, style="Card.TFrame")
            row.pack(fill="x", pady=5)
            symbol = "●"
            color = self.SUCCESS if item.ok else (self.DANGER if item.required else self.WARNING)
            tk.Label(row, text=symbol, fg=color, bg=self.CARD, font=("Segoe UI", 11)).pack(side="left", anchor="n")
            text = ttk.Frame(row, style="Card.TFrame")
            text.pack(side="left", fill="x", expand=True, padx=(8, 0))
            ttk.Label(text, text=item.label, style="Card.TLabel", font=("Segoe UI Semibold", 9)).pack(anchor="w")
            ttk.Label(text, text=item.detail, style="Muted.Card.TLabel", wraplength=220, justify="left").pack(anchor="w")

    def change_password(self) -> None:
        current = simpledialog.askstring(APP_NAME, "Digite a senha atual:", show="●", parent=self)
        if current is None:
            return
        payload = load_json(CREDENTIAL_FILE, {})
        username = str(payload.get("username", "")) if isinstance(payload, dict) else ""
        if not verify_credentials(username, current):
            messagebox.showerror(APP_NAME, "Senha atual incorreta.")
            return
        new_password = simpledialog.askstring(APP_NAME, "Digite a nova senha:", show="●", parent=self)
        if new_password is None:
            return
        confirmation = simpledialog.askstring(APP_NAME, "Confirme a nova senha:", show="●", parent=self)
        if confirmation is None:
            return
        if new_password != confirmation:
            messagebox.showerror(APP_NAME, "As senhas não coincidem.")
            return
        try:
            create_credentials(username, new_password)
            messagebox.showinfo(APP_NAME, "Senha alterada com sucesso.")
        except Exception as error:
            messagebox.showerror(APP_NAME, str(error))

    def append_log(self, message: str) -> None:
        if not hasattr(self, "log_box"):
            return
        self.log_box.configure(state="normal")
        self.log_box.insert("end", f"[{datetime.now().strftime('%H:%M:%S')}] {message}\n")
        self.log_box.see("end")
        self.log_box.configure(state="disabled")

    def set_progress(self, value: int, status: str) -> None:
        self.progress_var.set(value)
        self.status_var.set(status)

    def start_update(self) -> None:
        if self.worker and self.worker.is_alive():
            return
        base = Path(self.base_path.get()) if self.base_path.get() else None
        dictionary = Path(self.dictionary_path.get()) if self.dictionary_path.get() else None
        if base is None:
            messagebox.showwarning(APP_NAME, "Selecione a base do Vigitel.")
            return
        try:
            validate_input(base, "Base do Vigitel")
            if dictionary:
                validate_input(dictionary, "Dicionário")
        except Exception as error:
            messagebox.showerror(APP_NAME, str(error))
            return

        if not self.make_delta.get() and not self.make_full.get():
            if not messagebox.askyesno(
                APP_NAME,
                "Nenhum pacote ZIP será gerado. Deseja atualizar somente os arquivos da pasta atual?",
            ):
                return

        self.log_box.configure(state="normal")
        self.log_box.delete("1.0", "end")
        self.log_box.configure(state="disabled")
        self.progress_var.set(0)
        self.status_var.set("Iniciando")
        self.update_button.configure(state="disabled")
        self.cancel_button.configure(state="normal")

        def log(message: str) -> None:
            self.ui_queue.put(("log", message))

        def progress(value: int, status: str) -> None:
            self.ui_queue.put(("progress", (value, status)))

        self.current_engine = UpdateEngine(log, progress)
        make_delta = bool(self.make_delta.get())
        make_full = bool(self.make_full.get())

        def work() -> None:
            try:
                entry = self.current_engine.execute(
                    base,
                    dictionary,
                    make_delta,
                    make_full,
                )
                self.ui_queue.put(("success", entry))
            except CancelledError as error:
                self.ui_queue.put(("cancelled", str(error)))
            except Exception as error:
                details = traceback.format_exc()
                self.ui_queue.put(("error", (str(error), details)))

        self.worker = threading.Thread(target=work, daemon=True)
        self.worker.start()

    def cancel_update(self) -> None:
        if self.current_engine and self.worker and self.worker.is_alive():
            if messagebox.askyesno(APP_NAME, "Cancelar o processamento e restaurar a versão anterior?"):
                self.current_engine.cancel()
                self.status_var.set("Cancelando")
                self.cancel_button.configure(state="disabled")

    def poll_queue(self) -> None:
        try:
            while True:
                event, payload = self.ui_queue.get_nowait()
                if event == "log":
                    self.append_log(str(payload))
                elif event == "progress":
                    value, status = payload  # type: ignore[misc]
                    self.set_progress(int(value), str(status))
                elif event == "success":
                    self.finish_worker()
                    entry = payload if isinstance(payload, dict) else {}
                    warnings = entry.get("warnings", [])
                    message = "A base foi atualizada, validada e compactada com sucesso."
                    if warnings:
                        message += "\n\nA atualização terminou com avisos. Consulte o relatório."
                    messagebox.showinfo(APP_NAME, message)
                    if self.open_report.get():
                        report = ROOT / "RelatorioDaAtualizacaoLocal.html"
                        if report.is_file():
                            webbrowser.open(report.as_uri())
                    self.refresh_diagnostics()
                elif event == "cancelled":
                    self.finish_worker()
                    messagebox.showwarning(APP_NAME, str(payload))
                elif event == "error":
                    self.finish_worker()
                    error_message, details = payload  # type: ignore[misc]
                    self.append_log(str(details))
                    messagebox.showerror(
                        APP_NAME,
                        "A atualização não foi aplicada. A versão anterior foi restaurada.\n\n" + str(error_message),
                    )
                    self.refresh_diagnostics()
        except queue.Empty:
            pass
        self.after(100, self.poll_queue)

    def finish_worker(self) -> None:
        self.update_button.configure(state="normal")
        self.cancel_button.configure(state="disabled")
        self.current_engine = None
        self.worker = None

    def on_close(self) -> None:
        if self.worker and self.worker.is_alive():
            messagebox.showwarning(APP_NAME, "Aguarde o processamento terminar ou clique em Cancelar.")
            return
        self.destroy()


def print_diagnostics() -> int:
    print(f"{APP_NAME} — diagnóstico")
    print("=" * 72)
    code = 0
    for item in project_diagnostics():
        status = "OK" if item.ok else ("ERRO" if item.required else "AVISO")
        print(f"[{status}] {item.label}: {item.detail}")
        if item.required and not item.ok:
            code = 1
    return code


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--diagnostico", action="store_true", help="Valida o ambiente sem abrir a interface.")
    args = parser.parse_args()
    if args.diagnostico:
        return print_diagnostics()
    PRIVATE_DIR.mkdir(parents=True, exist_ok=True)
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    app = AdministrationApp()
    app.mainloop()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
