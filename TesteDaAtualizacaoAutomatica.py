"""Confere a presença da atualização automática centralizada na aplicação."""
from pathlib import Path

ROOT = Path(__file__).resolve().parent
JS = (ROOT / "SistemaAnaliticoDoVigitel.js").read_text(encoding="utf-8")
HTML = (ROOT / "index.html").read_text(encoding="utf-8")

checks = {
    "classificação dos controles": "function isAutomaticAnalysisTarget" in JS,
    "tratamento central": "function handleAutomaticAnalysisUpdate" in JS,
    "delegação de eventos": "function bindAutomaticAnalysisUpdates" in JS,
    "evento change em captura": "document.addEventListener('change', handleAutomaticAnalysisUpdate, true)" in JS,
    "evento input em captura": "document.addEventListener('input', handleAutomaticAnalysisUpdate, true)" in JS,
    "normalização de filtros": "normalizeFilterState(target)" in JS,
    "invalidação de dados": "invalidateAnalysisData()" in JS,
    "aviso na interface": "Atualização automática ativa" in HTML,
}
failed = [name for name, ok in checks.items() if not ok]
for name, ok in checks.items():
    print(("OK" if ok else "FALHA") + ": " + name)
if failed:
    raise SystemExit("Itens ausentes: " + ", ".join(failed))
print("Atualização automática centralizada validada.")
