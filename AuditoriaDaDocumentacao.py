"""Audita a nomenclatura dos arquivos e a documentação das funções do projeto.

A rotina foi criada para ser executada antes de cada publicação. Ela não modifica
arquivos: apenas informa os pontos que precisam de revisão e retorna código de erro
quando encontra nomes fora do padrão ou funções sem explicação próxima à definição.
"""

from __future__ import annotations

import ast
import re
from pathlib import Path

RAIZ = Path(__file__).resolve().parent
EXTENSOES_DE_CODIGO = {".js", ".py", ".r"}


def nomes_fora_do_padrao() -> list[str]:
    """Localiza arquivos com algarismos, hífen ou sublinhado no nome físico.

    Arquivos de configuração padronizados pelo GitHub, como os diretórios ocultos,
    são aceitos desde que o nome do arquivo em si respeite a convenção do projeto.
    """
    problemas: list[str] = []
    for caminho in RAIZ.rglob("*"):
        if "__pycache__" in caminho.parts:
            continue
        if not caminho.is_file():
            continue
        nome = caminho.name
        if re.search(r"[0-9_-]", nome):
            problemas.append(str(caminho.relative_to(RAIZ)))
    return problemas


def funcoes_python_sem_documentacao() -> list[str]:
    """Verifica se cada função Python possui docstring imediatamente associada."""
    problemas: list[str] = []
    for caminho in RAIZ.rglob("*.py"):
        arvore = ast.parse(caminho.read_text(encoding="utf-8"))
        for no in ast.walk(arvore):
            if isinstance(no, (ast.FunctionDef, ast.AsyncFunctionDef)) and ast.get_docstring(no) is None:
                problemas.append(f"{caminho.relative_to(RAIZ)}:{no.lineno} {no.name}")
    return problemas


def funcoes_javascript_sem_documentacao() -> list[str]:
    """Confere comentários explicativos antes de funções JavaScript nomeadas."""
    problemas: list[str] = []
    padroes = (
        re.compile(r"^\s*function\s+([A-Za-z$][\w$]*)\s*\("),
        re.compile(r"^\s*const\s+([A-Za-z$][\w$]*)\s*=\s*(?:async\s*)?\([^;]*\)\s*=>"),
    )
    for caminho in RAIZ.rglob("*.js"):
        linhas = caminho.read_text(encoding="utf-8", errors="replace").splitlines()
        for indice, linha in enumerate(linhas):
            nome = next((resultado.group(1) for padrao in padroes if (resultado := padrao.search(linha))), None)
            if not nome:
                continue
            anterior = indice - 1
            while anterior >= 0 and not linhas[anterior].strip():
                anterior -= 1
            documentada = anterior >= 0 and (
                linhas[anterior].strip().endswith("*/") or linhas[anterior].strip().startswith("//")
            )
            if not documentada:
                problemas.append(f"{caminho.relative_to(RAIZ)}:{indice + 1} {nome}")
    return problemas


def funcoes_r_sem_documentacao() -> list[str]:
    """Confere blocos Roxygen antes das funções declaradas nos scripts R."""
    problemas: list[str] = []
    padrao = re.compile(r"^\s*([A-Za-z0-9.]+)\s*<-\s*function\s*\(")
    for caminho in RAIZ.rglob("*.R"):
        linhas = caminho.read_text(encoding="utf-8", errors="replace").splitlines()
        for indice, linha in enumerate(linhas):
            resultado = padrao.search(linha)
            if not resultado:
                continue
            anterior = indice - 1
            while anterior >= 0 and not linhas[anterior].strip():
                anterior -= 1
            if anterior < 0 or not linhas[anterior].lstrip().startswith("#'"):
                problemas.append(f"{caminho.relative_to(RAIZ)}:{indice + 1} {resultado.group(1)}")
    return problemas


def main() -> int:
    """Executa todas as verificações e apresenta um resumo adequado à manutenção."""
    grupos = {
        "Nomes fora do padrão": nomes_fora_do_padrao(),
        "Funções Python sem docstring": funcoes_python_sem_documentacao(),
        "Funções JavaScript sem comentário": funcoes_javascript_sem_documentacao(),
        "Funções R sem bloco Roxygen": funcoes_r_sem_documentacao(),
    }
    total = sum(len(itens) for itens in grupos.values())
    for titulo, itens in grupos.items():
        print(f"{titulo}: {len(itens)}")
        for item in itens:
            print(f"  {item}")
    if total:
        print(f"Auditoria concluída com {total} pendência(s).")
        return 1
    print("Auditoria concluída sem pendências.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
