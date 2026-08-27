"""Audita a nomenclatura dos arquivos e a documentação das funções do projeto.

A rotina foi criada para ser executada antes de cada publicação. Ela não modifica
arquivos: apenas informa os pontos que precisam de revisão e retorna código de erro
quando encontra nomes fora do padrão ou funções sem explicação próxima à definição.
"""

from __future__ import annotations

import ast
import re
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
EXTENSOES_DE_CODIGO = {".js", ".py", ".r"}
BIBLIOTECAS_EXTERNAS = {
    "CompactadorDeArquivos.js",
    "LeitorDeArquivosCsv.js",
    "LeitorDePlanilhas.js",
}
PALAVRAS_DE_CONTROLE_JAVASCRIPT = {"if", "for", "while", "switch", "catch", "with"}


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
    """Verifica se cada função Python possui uma docstring com explicação útil."""
    problemas: list[str] = []
    for caminho in RAIZ.rglob("*.py"):
        arvore = ast.parse(caminho.read_text(encoding="utf-8"))
        for no in ast.walk(arvore):
            if not isinstance(no, (ast.FunctionDef, ast.AsyncFunctionDef)):
                continue
            documentacao = ast.get_docstring(no) or ""
            if len(re.findall(r"\w+", documentacao, flags=re.UNICODE)) < 5:
                problemas.append(f"{caminho.relative_to(RAIZ)}:{no.lineno} {no.name}")
    return problemas


def funcoes_javascript_sem_documentacao() -> list[str]:
    """Confere a explicação de funções, métodos e manipuladores JavaScript."""
    problemas: list[str] = []
    padroes = (
        re.compile(r"^\s*(?:async\s+)?function\s+([A-Za-z$][\w$]*)\s*\("),
        re.compile(
            r"^\s*(?:const|let|var)\s+([A-Za-z$][\w$]*)\s*=\s*"
            r"(?:async\s*)?(?:function\b|\([^)]*\)\s*=>|[A-Za-z$][\w$]*\s*=>)"
        ),
        re.compile(
            r"^\s*(?:[A-Za-z$][\w$]*\.)+([A-Za-z$][\w$]*)\s*=\s*"
            r"(?:async\s*)?(?:function\b|\([^)]*\)\s*=>|[A-Za-z$][\w$]*\s*=>)"
        ),
        re.compile(
            r"^\s*([A-Za-z$][\w$]*)\s*:\s*"
            r"(?:async\s*)?(?:function\b|\([^)]*\)\s*=>|[A-Za-z$][\w$]*\s*=>)"
        ),
        re.compile(r"^\s*([A-Za-z$][\w$]*)\s*\([^)]*\)\s*\{"),
    )
    for caminho in RAIZ.rglob("*.js"):
        if caminho.name in BIBLIOTECAS_EXTERNAS:
            continue
        linhas = caminho.read_text(encoding="utf-8", errors="replace").splitlines()
        for indice, linha in enumerate(linhas):
            nome = next((resultado.group(1) for padrao in padroes if (resultado := padrao.search(linha))), None)
            if not nome or nome in PALAVRAS_DE_CONTROLE_JAVASCRIPT:
                continue
            anterior = indice - 1
            while anterior >= 0 and not linhas[anterior].strip():
                anterior -= 1
            partes: list[str] = []
            if anterior >= 0 and linhas[anterior].strip().startswith("//"):
                while anterior >= 0 and linhas[anterior].strip().startswith("//"):
                    partes.append(linhas[anterior].strip()[2:].strip())
                    anterior -= 1
            elif anterior >= 0 and linhas[anterior].strip().endswith("*/"):
                while anterior >= 0:
                    trecho = linhas[anterior].strip()
                    trecho = re.sub(r"^/\*\*?", "", trecho)
                    trecho = re.sub(r"\*/$", "", trecho)
                    trecho = re.sub(r"^\*", "", trecho).strip()
                    if trecho:
                        partes.append(trecho)
                    if "/*" in linhas[anterior]:
                        break
                    anterior -= 1
            documentacao = " ".join(reversed(partes))
            if len(re.findall(r"\w+", documentacao, flags=re.UNICODE)) < 5:
                problemas.append(f"{caminho.relative_to(RAIZ)}:{indice + 1} {nome}")
    return problemas


def funcoes_r_sem_documentacao() -> list[str]:
    """Confere se cada função R possui um bloco Roxygen com explicação útil."""
    problemas: list[str] = []
    padrao = re.compile(r"^\s*([A-Za-z.][A-Za-z0-9._]*)\s*<-\s*function\s*\(")
    for caminho in RAIZ.rglob("*.R"):
        linhas = caminho.read_text(encoding="utf-8", errors="replace").splitlines()
        for indice, linha in enumerate(linhas):
            resultado = padrao.search(linha)
            if not resultado:
                continue
            anterior = indice - 1
            partes: list[str] = []
            while anterior >= 0 and not linhas[anterior].strip():
                anterior -= 1
            while anterior >= 0 and linhas[anterior].lstrip().startswith("#'"):
                partes.append(linhas[anterior].lstrip()[2:].strip())
                anterior -= 1
            documentacao = " ".join(reversed(partes))
            if len(re.findall(r"\w+", documentacao, flags=re.UNICODE)) < 5:
                problemas.append(f"{caminho.relative_to(RAIZ)}:{indice + 1} {resultado.group(1)}")
    return problemas


def arquivos_de_codigo_sem_apresentacao() -> list[str]:
    """Verifica se cada arquivo mantido pelo projeto explica sua finalidade no início."""
    problemas: list[str] = []
    for caminho in sorted(RAIZ.rglob("*")):
        if "__pycache__" in caminho.parts or not caminho.is_file() or caminho.name in BIBLIOTECAS_EXTERNAS:
            continue
        sufixo = caminho.suffix.casefold()
        if sufixo not in {".js", ".py", ".r", ".html", ".css", ".svg"}:
            continue
        texto = caminho.read_text(encoding="utf-8-sig", errors="replace")
        inicio = texto.lstrip()
        if sufixo == ".py":
            documentado = ast.get_docstring(ast.parse(texto)) is not None
        elif sufixo == ".r":
            documentado = inicio.startswith("#")
        elif sufixo == ".html":
            documentado = "<!--" in "\n".join(texto.splitlines()[:12])
        elif sufixo == ".svg":
            documentado = "<!--" in "\n".join(texto.splitlines()[:12])
        else:
            documentado = inicio.startswith(("/*", "//"))
        if not documentado:
            problemas.append(str(caminho.relative_to(RAIZ)))
    return problemas


def main() -> int:
    """Executa todas as verificações e apresenta um resumo adequado à manutenção."""
    grupos = {
        "Nomes fora do padrão": nomes_fora_do_padrao(),
        "Arquivos de código sem apresentação": arquivos_de_codigo_sem_apresentacao(),
        "Funções Python sem explicação suficiente": funcoes_python_sem_documentacao(),
        "Funções JavaScript sem explicação suficiente": funcoes_javascript_sem_documentacao(),
        "Funções R sem explicação suficiente": funcoes_r_sem_documentacao(),
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
