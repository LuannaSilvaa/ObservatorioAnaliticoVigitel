#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Servidor local do Observatório com administração integrada ao index.html.

A aplicação é independente do GitHub. Ela serve o próprio projeto em localhost,
protege a área administrativa com login e senha locais, recebe a base/dicionário,
executa o atualizador existente, valida os resultados e recarrega o painel com os
anos realmente disponíveis na BaseAnaliticaDoVigitel.js.
"""
from __future__ import annotations

import argparse
import json
import mimetypes
import os
import re
import secrets
import shutil
import socket
import sys
import threading
import time
import traceback
import urllib.parse
import webbrowser
from http import HTTPStatus
from http.cookies import SimpleCookie
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any

from AdministracaoIndependenteDoObservatorio import (
    APP_NAME,
    CREDENTIAL_FILE,
    PRIVATE_DIR,
    OUTPUT_DIR,
    BACKUP_DIR,
    UpdateEngine,
    create_credentials,
    load_json,
    verify_credentials,
)

ROOT = Path(__file__).resolve().parent
UPLOAD_DIR = PRIVATE_DIR / "uploads_integrados"
SESSION_COOKIE = "vigitel_admin_session"
SESSION_SECONDS = 30 * 60
MAX_ATTEMPTS = 5
LOCK_SECONDS = 5 * 60
MAX_UPLOAD_BYTES = 2 * 1024 * 1024 * 1024
ALLOWED_EXTENSIONS = {".csv", ".xls", ".xlsm"}
API_PREFIX = "/api/vigitel-admin"

SESSIONS: dict[str, dict[str, Any]] = {}
ATTEMPTS: dict[str, dict[str, Any]] = {}
UPLOADS: dict[str, dict[str, Any]] = {}
STATE_LOCK = threading.RLock()
JOB: dict[str, Any] = {
    "status": "idle",
    "progress": 0,
    "stage": "Aguardando atualização",
    "logs": [],
    "result": None,
    "error": None,
    "startedAt": None,
    "finishedAt": None,
}


def utc_timestamp() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def prune_state() -> None:
    now = time.time()
    with STATE_LOCK:
        for token in [key for key, value in SESSIONS.items() if value.get("expires", 0) <= now]:
            SESSIONS.pop(token, None)
        for key in [key for key, value in UPLOADS.items() if value.get("created", 0) + 6 * 3600 <= now]:
            item = UPLOADS.pop(key, None)
            if item:
                try:
                    Path(item["path"]).unlink(missing_ok=True)
                except OSError:
                    pass
        for key in [key for key, value in ATTEMPTS.items() if value.get("lockedUntil", 0) <= now and value.get("count", 0) == 0]:
            ATTEMPTS.pop(key, None)


def clean_filename(value: str) -> str:
    value = urllib.parse.unquote(value or "").replace("\\", "/")
    value = Path(value).name.strip()
    if not value:
        return "arquivo.csv"
    stem = re.sub(r"[^A-Za-z0-9À-ÿ .()\-]+", "", Path(value).stem).strip()[:120] or "arquivo"
    extension = Path(value).suffix.lower()
    return stem + extension


def read_panel_metadata() -> dict[str, Any]:
    path = ROOT / "BaseAnaliticaDoVigitel.js"
    fallback = {"years": [], "yearsLabel": "Não identificado", "updatedAt": None}
    try:
        text = path.read_text(encoding="utf-8")
        match = re.search(r"\bconst\s+DATA\s*=\s*", text)
        if not match:
            return fallback
        data, _ = json.JSONDecoder().raw_decode(text, match.end())
        years = [str(year) for year in data.get("dims", {}).get("years", [])]
        meta = data.get("meta", {})
        return {
            "years": years,
            "yearsLabel": str(meta.get("yearsLabel") or (" a ".join([years[0], years[-1]]) if years else "Não identificado")),
            "updatedAt": meta.get("lastAutomaticUpdate") or meta.get("baseUpdatedAt"),
            "rows": meta.get("rows"),
            "respondentsProcessed": meta.get("respondentsProcessed"),
            "sourceFile": meta.get("lastUpdateSourceFile"),
        }
    except Exception:
        return fallback


def public_job() -> dict[str, Any]:
    with STATE_LOCK:
        return {
            "status": JOB.get("status"),
            "progress": JOB.get("progress"),
            "stage": JOB.get("stage"),
            "logs": list(JOB.get("logs", []))[-400:],
            "result": JOB.get("result"),
            "error": JOB.get("error"),
            "startedAt": JOB.get("startedAt"),
            "finishedAt": JOB.get("finishedAt"),
        }


def set_job(**changes: Any) -> None:
    with STATE_LOCK:
        JOB.update(changes)


def append_job_log(message: str) -> None:
    line = str(message).rstrip()
    if not line:
        return
    with STATE_LOCK:
        JOB.setdefault("logs", []).append(line)
        JOB["logs"] = JOB["logs"][-800:]


def session_for(handler: SimpleHTTPRequestHandler) -> tuple[str | None, dict[str, Any] | None]:
    prune_state()
    raw = handler.headers.get("Cookie", "")
    cookie = SimpleCookie()
    try:
        cookie.load(raw)
    except Exception:
        return None, None
    morsel = cookie.get(SESSION_COOKIE)
    if not morsel:
        return None, None
    token = morsel.value
    with STATE_LOCK:
        session = SESSIONS.get(token)
        if not session or session.get("expires", 0) <= time.time():
            SESSIONS.pop(token, None)
            return None, None
        session["expires"] = time.time() + SESSION_SECONDS
        return token, session


def create_session(username: str, ip: str) -> str:
    token = secrets.token_urlsafe(36)
    with STATE_LOCK:
        SESSIONS[token] = {
            "username": username,
            "ip": ip,
            "created": time.time(),
            "expires": time.time() + SESSION_SECONDS,
        }
    return token


def remove_session(token: str | None) -> None:
    if token:
        with STATE_LOCK:
            SESSIONS.pop(token, None)


def packages_from_entry(entry: Any) -> list[dict[str, str]]:
    if not isinstance(entry, dict):
        return []
    packages: list[dict[str, str]] = []
    for key, label in (("deltaPackage", "Arquivos atualizados"), ("fullPackage", "Projeto completo")):
        raw = entry.get(key)
        if not raw:
            continue
        path = Path(str(raw))
        try:
            relative = path.resolve().relative_to(ROOT.resolve()).as_posix()
        except Exception:
            continue
        packages.append({"label": label, "name": path.name, "url": "/" + urllib.parse.quote(relative)})
    return packages


def run_update(base_upload_id: str, dictionary_upload_id: str | None, make_delta: bool, make_full: bool, session_token: str) -> None:
    with STATE_LOCK:
        base_item = UPLOADS.get(base_upload_id)
        dictionary_item = UPLOADS.get(dictionary_upload_id) if dictionary_upload_id else None
    if not base_item or base_item.get("session") != session_token:
        set_job(status="error", error="A base enviada não foi encontrada.", finishedAt=utc_timestamp())
        return
    if dictionary_upload_id and (not dictionary_item or dictionary_item.get("session") != session_token):
        set_job(status="error", error="O dicionário enviado não foi encontrado.", finishedAt=utc_timestamp())
        return

    base_path = Path(base_item["path"])
    dictionary_path = Path(dictionary_item["path"]) if dictionary_item else None

    def log(message: str) -> None:
        append_job_log(message)

    def progress(value: int, stage: str) -> None:
        set_job(progress=max(0, min(100, int(value))), stage=str(stage))

    try:
        engine = UpdateEngine(log=log, progress=progress)
        entry = engine.execute(base_path, dictionary_path, make_delta=make_delta, make_full=make_full)
        panel = read_panel_metadata()
        entry = dict(entry)
        entry["panel"] = panel
        entry["packages"] = packages_from_entry(entry)
        set_job(
            status="success",
            progress=100,
            stage="Painel atualizado",
            result=entry,
            error=None,
            finishedAt=utc_timestamp(),
        )
    except Exception as error:
        append_job_log(traceback.format_exc())
        set_job(
            status="error",
            progress=0,
            stage="A versão anterior foi restaurada",
            result=None,
            error=str(error),
            finishedAt=utc_timestamp(),
        )
    finally:
        with STATE_LOCK:
            for upload_id in [base_upload_id, dictionary_upload_id]:
                if not upload_id:
                    continue
                item = UPLOADS.pop(upload_id, None)
                if item:
                    try:
                        Path(item["path"]).unlink(missing_ok=True)
                    except OSError:
                        pass


class VigitelHandler(SimpleHTTPRequestHandler):
    server_version = "VigitelAdminLocal/2.0"

    def __init__(self, *args: Any, **kwargs: Any):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, format: str, *args: Any) -> None:
        if self.path.startswith(API_PREFIX):
            return
        super().log_message(format, *args)

    def end_headers(self) -> None:
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "SAMEORIGIN")
        self.send_header("Referrer-Policy", "same-origin")
        if self.path.endswith((".html", ".js", ".json")) or self.path.startswith(API_PREFIX):
            self.send_header("Cache-Control", "no-store, max-age=0")
            self.send_header("Pragma", "no-cache")
        super().end_headers()

    def json_response(self, payload: Any, status: int = 200, extra_headers: dict[str, str] | None = None) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        for key, value in (extra_headers or {}).items():
            self.send_header(key, value)
        self.end_headers()
        self.wfile.write(body)

    def read_json(self, max_bytes: int = 1024 * 1024) -> dict[str, Any]:
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            raise ValueError("Tamanho da requisição inválido.")
        if length <= 0 or length > max_bytes:
            raise ValueError("Conteúdo da requisição inválido.")
        raw = self.rfile.read(length)
        payload = json.loads(raw.decode("utf-8"))
        if not isinstance(payload, dict):
            raise ValueError("O conteúdo enviado precisa ser um objeto JSON.")
        return payload

    def require_admin_header(self) -> bool:
        if self.headers.get("X-Vigitel-Admin") != "1":
            self.json_response({"ok": False, "error": "Requisição administrativa inválida."}, 403)
            return False
        return True

    def require_auth(self) -> tuple[str, dict[str, Any]] | None:
        token, session = session_for(self)
        if not token or not session:
            self.json_response({"ok": False, "error": "Sessão encerrada. Entre novamente."}, 401)
            return None
        return token, session

    def do_GET(self) -> None:
        parsed = urllib.parse.urlsplit(self.path)
        if parsed.path == API_PREFIX + "/status":
            _, session = session_for(self)
            panel = read_panel_metadata()
            self.json_response({
                "ok": True,
                "localAdministration": True,
                "setupRequired": not CREDENTIAL_FILE.is_file(),
                "authenticated": bool(session),
                "username": session.get("username") if session else None,
                "panel": panel,
                "job": public_job() if session else {"status": JOB.get("status"), "progress": JOB.get("progress"), "stage": JOB.get("stage")},
            })
            return
        if parsed.path == API_PREFIX + "/job":
            if not self.require_auth():
                return
            self.json_response({"ok": True, "job": public_job(), "panel": read_panel_metadata()})
            return
        if parsed.path in ("", "/"):
            self.path = "/index.html"
        super().do_GET()

    def do_POST(self) -> None:
        parsed = urllib.parse.urlsplit(self.path)
        if not parsed.path.startswith(API_PREFIX):
            self.send_error(HTTPStatus.NOT_FOUND)
            return
        if not self.require_admin_header():
            return
        try:
            if parsed.path == API_PREFIX + "/setup":
                self.handle_setup()
            elif parsed.path == API_PREFIX + "/login":
                self.handle_login()
            elif parsed.path == API_PREFIX + "/logout":
                self.handle_logout()
            elif parsed.path == API_PREFIX + "/upload":
                self.handle_upload()
            elif parsed.path == API_PREFIX + "/update":
                self.handle_update()
            else:
                self.json_response({"ok": False, "error": "Rota administrativa não encontrada."}, 404)
        except (BrokenPipeError, ConnectionResetError):
            return
        except Exception as error:
            self.json_response({"ok": False, "error": str(error)}, 400)

    def handle_setup(self) -> None:
        if CREDENTIAL_FILE.is_file():
            self.json_response({"ok": False, "error": "As credenciais já foram criadas."}, 409)
            return
        payload = self.read_json()
        username = str(payload.get("username", "")).strip()
        password = str(payload.get("password", ""))
        confirmation = str(payload.get("confirmation", ""))
        if password != confirmation:
            self.json_response({"ok": False, "error": "A confirmação da senha não coincide."}, 400)
            return
        create_credentials(username, password)
        token = create_session(username, self.client_address[0])
        self.json_response(
            {"ok": True, "authenticated": True, "username": username},
            201,
            {"Set-Cookie": f"{SESSION_COOKIE}={token}; Path=/; HttpOnly; SameSite=Strict; Max-Age={SESSION_SECONDS}"},
        )

    def handle_login(self) -> None:
        if not CREDENTIAL_FILE.is_file():
            self.json_response({"ok": False, "error": "Crie o acesso administrativo primeiro."}, 409)
            return
        ip = self.client_address[0]
        now = time.time()
        attempt = ATTEMPTS.setdefault(ip, {"count": 0, "lockedUntil": 0})
        if attempt.get("lockedUntil", 0) > now:
            remaining = int(attempt["lockedUntil"] - now) + 1
            self.json_response({"ok": False, "error": f"Acesso temporariamente bloqueado. Aguarde {remaining} segundos."}, 429)
            return
        payload = self.read_json()
        username = str(payload.get("username", "")).strip()
        password = str(payload.get("password", ""))
        if not verify_credentials(username, password):
            attempt["count"] = int(attempt.get("count", 0)) + 1
            if attempt["count"] >= MAX_ATTEMPTS:
                attempt["lockedUntil"] = now + LOCK_SECONDS
                attempt["count"] = 0
                self.json_response({"ok": False, "error": "Muitas tentativas incorretas. O acesso foi bloqueado por 5 minutos."}, 429)
                return
            remaining = MAX_ATTEMPTS - attempt["count"]
            self.json_response({"ok": False, "error": f"Login ou senha incorretos. Restam {remaining} tentativas."}, 401)
            return
        ATTEMPTS.pop(ip, None)
        token = create_session(username, ip)
        self.json_response(
            {"ok": True, "authenticated": True, "username": username},
            200,
            {"Set-Cookie": f"{SESSION_COOKIE}={token}; Path=/; HttpOnly; SameSite=Strict; Max-Age={SESSION_SECONDS}"},
        )

    def handle_logout(self) -> None:
        token, _ = session_for(self)
        remove_session(token)
        self.json_response(
            {"ok": True},
            200,
            {"Set-Cookie": f"{SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0"},
        )

    def handle_upload(self) -> None:
        auth = self.require_auth()
        if not auth:
            return
        session_token, _ = auth
        filename = clean_filename(self.headers.get("X-File-Name", ""))
        file_kind = self.headers.get("X-File-Kind", "base").strip().lower()
        extension = Path(filename).suffix.lower()
        if file_kind not in {"base", "dictionary"}:
            self.json_response({"ok": False, "error": "Tipo de arquivo inválido."}, 400)
            return
        if extension not in ALLOWED_EXTENSIONS:
            self.json_response({"ok": False, "error": "Use um arquivo CSV, XLS ou XLSM."}, 415)
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            length = 0
        if length <= 0:
            self.json_response({"ok": False, "error": "O arquivo está vazio."}, 400)
            return
        if length > MAX_UPLOAD_BYTES:
            self.json_response({"ok": False, "error": "O arquivo ultrapassa o limite local de 2 GiB."}, 413)
            return

        UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        upload_id = secrets.token_urlsafe(20)
        destination = UPLOAD_DIR / f"{upload_id}_{file_kind}{extension}"
        remaining = length
        with destination.open("wb") as output:
            while remaining > 0:
                chunk = self.rfile.read(min(1024 * 1024, remaining))
                if not chunk:
                    raise ValueError("O envio do arquivo foi interrompido.")
                output.write(chunk)
                remaining -= len(chunk)
        if destination.stat().st_size != length:
            destination.unlink(missing_ok=True)
            raise ValueError("O tamanho recebido não coincide com o arquivo selecionado.")
        with STATE_LOCK:
            UPLOADS[upload_id] = {
                "path": str(destination),
                "name": filename,
                "kind": file_kind,
                "size": length,
                "session": session_token,
                "created": time.time(),
            }
        self.json_response({"ok": True, "uploadId": upload_id, "name": filename, "size": length}, 201)

    def handle_update(self) -> None:
        auth = self.require_auth()
        if not auth:
            return
        session_token, _ = auth
        payload = self.read_json()
        base_upload_id = str(payload.get("baseUploadId", ""))
        dictionary_upload_id = str(payload.get("dictionaryUploadId") or "") or None
        make_delta = bool(payload.get("makeDelta", True))
        make_full = bool(payload.get("makeFull", True))
        with STATE_LOCK:
            if JOB.get("status") == "running":
                self.json_response({"ok": False, "error": "Já existe uma atualização em andamento."}, 409)
                return
            base_item = UPLOADS.get(base_upload_id)
            if not base_item or base_item.get("session") != session_token or base_item.get("kind") != "base":
                self.json_response({"ok": False, "error": "Envie a base antes de iniciar."}, 400)
                return
            if dictionary_upload_id:
                dictionary_item = UPLOADS.get(dictionary_upload_id)
                if not dictionary_item or dictionary_item.get("session") != session_token or dictionary_item.get("kind") != "dictionary":
                    self.json_response({"ok": False, "error": "O dicionário enviado é inválido."}, 400)
                    return
            JOB.clear()
            JOB.update({
                "status": "running",
                "progress": 1,
                "stage": "Preparando atualização",
                "logs": [],
                "result": None,
                "error": None,
                "startedAt": utc_timestamp(),
                "finishedAt": None,
            })
        thread = threading.Thread(
            target=run_update,
            args=(base_upload_id, dictionary_upload_id, make_delta, make_full, session_token),
            name="AtualizacaoVigitel",
            daemon=True,
        )
        thread.start()
        self.json_response({"ok": True, "started": True}, 202)


def find_port(preferred: int) -> int:
    for port in range(preferred, preferred + 30):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as probe:
            probe.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            try:
                probe.bind(("127.0.0.1", port))
                return port
            except OSError:
                continue
    raise RuntimeError("Não foi possível encontrar uma porta local disponível.")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8765, help="Porta local preferida.")
    parser.add_argument("--no-browser", action="store_true", help="Não abre o navegador automaticamente.")
    args = parser.parse_args()

    required = [
        ROOT / "index.html",
        ROOT / "AdministracaoIntegradaAoIndex.js",
        ROOT / "AdministracaoIndependenteDoObservatorio.py",
        ROOT / "AtualizarBaseDoPainel.py",
        ROOT / "BaseAnaliticaDoVigitel.js",
    ]
    missing = [path.name for path in required if not path.is_file()]
    if missing:
        print("Arquivos obrigatórios ausentes: " + ", ".join(missing), file=sys.stderr)
        return 1

    PRIVATE_DIR.mkdir(parents=True, exist_ok=True)
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    mimetypes.add_type("text/javascript", ".js")
    port = find_port(args.port)
    address = ("127.0.0.1", port)
    server = ThreadingHTTPServer(address, VigitelHandler)
    url = f"http://127.0.0.1:{port}/index.html#administracao"

    print("=" * 72)
    print("OBSERVATÓRIO ANALÍTICO DO VIGITEL — ADMINISTRAÇÃO INTEGRADA")
    print("=" * 72)
    print(f"Endereço local: {url}")
    print("A administração funciona somente enquanto esta janela estiver aberta.")
    print("Pressione Ctrl+C para encerrar.")
    print("=" * 72)

    if not args.no_browser:
        threading.Timer(0.8, lambda: webbrowser.open(url)).start()
    try:
        server.serve_forever(poll_interval=0.35)
    except KeyboardInterrupt:
        print("\nEncerrando a administração local...")
    finally:
        server.shutdown()
        server.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
