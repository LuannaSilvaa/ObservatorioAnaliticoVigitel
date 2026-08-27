"""Confere a presença da atualização automática centralizada na aplicação."""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
JS = (ROOT / "assets" / "js" / "core" / "SistemaAnaliticoDoObservatorio.js").read_text(encoding="utf-8")
HTML = (ROOT / "index.html").read_text(encoding="utf-8")
CLEAR_START = JS.find("$('#clear').addEventListener('click',()=>{")
CLEAR_END = JS.find("$('#clearFilters').addEventListener", CLEAR_START)
CLEAR_HANDLER = JS[CLEAR_START:CLEAR_END] if CLEAR_START >= 0 and CLEAR_END >= 0 else ""

checks = {
    "classificação dos controles": "function isAutomaticAnalysisTarget" in JS,
    "tratamento central": "function handleAutomaticAnalysisUpdate" in JS,
    "delegação de eventos": "function bindAutomaticAnalysisUpdates" in JS,
    "evento change em captura": "document.addEventListener('change', handleAutomaticAnalysisUpdate, true)" in JS,
    "evento input em captura": "document.addEventListener('input', handleAutomaticAnalysisUpdate, true)" in JS,
    "normalização de filtros": "normalizeFilterState(target)" in JS,
    "invalidação de dados": "invalidateAnalysisData()" in JS,
    "orientação da construção": "Toque em uma etapa para escolher" in HTML,
    "próxima etapa identificada": "function nextIncompleteAnalysisStep" in JS,
    "cartões centrais clicáveis": "function openAnalysisStep" in JS and 'role="button" tabindex="0"' in HTML,
    "ação principal contextual": "primaryButton.dataset.nextStep" in JS,
    "grupos de filtros inicialmente fechados": 'class="filter-cluster" open' not in HTML,
    "recomeçar restaura controles e resumo dos filtros": (
        "populationTransitionState.lastPopulation='População Geral';" in CLEAR_HANDLER
        and "renderFilters();" in CLEAR_HANDLER
        and "$$('.filter-panel .filter-cluster, .filter-panel .mini-filter')" in CLEAR_HANDLER
        and "details.open=false" in CLEAR_HANDLER
    ),
    "período possui limpeza independente": (
        'data-clear-section="period"' in HTML
        and "function clearPeriodFilters" in JS
        and "if(section === 'period') clearPeriodFilters();" in JS
    ),
}
failed = [name for name, ok in checks.items() if not ok]
for name, ok in checks.items():
    print(("OK" if ok else "FALHA") + ": " + name)
if failed:
    raise SystemExit("Itens ausentes: " + ", ".join(failed))
print("Atualização automática centralizada validada.")
