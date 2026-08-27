"""Gera o catálogo das funções documentadas nos arquivos mantidos pelo projeto.

O catálogo é reconstruído a partir das docstrings e dos comentários colocados
junto às funções. Bibliotecas de terceiros são registradas separadamente, pois
sua documentação e sua licença permanecem sob responsabilidade dos autores.
"""

from __future__ import annotations

import ast
import re
from dataclasses import dataclass
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
DESTINO = RAIZ / "documentacao" / "CatalogoDeFuncoes.md"
BIBLIOTECAS_EXTERNAS = {
    "CompactadorDeArquivos.js",
    "LeitorDeArquivosCsv.js",
    "LeitorDePlanilhas.js",
}
PALAVRAS_DE_CONTROLE_JAVASCRIPT = {"if", "for", "while", "switch", "catch", "with"}


@dataclass(frozen=True)
class Registro:
    """Representa uma função e a explicação localizada junto à sua definição."""

    linguagem: str
    arquivo: str
    funcao: str
    linha: int
    responsabilidade: str


def resumir(texto: str) -> str:
    """Converte um comentário em uma frase adequada para uma célula Markdown."""
    limpo = re.sub(r"\s+", " ", texto or "").strip()
    limpo = limpo.replace("|", "\\|")
    return limpo or "Responsabilidade descrita no próprio arquivo."


def comentario_javascript(linhas: list[str], indice: int) -> str:
    """Recupera o comentário imediatamente anterior a uma função JavaScript."""
    anterior = indice - 1
    while anterior >= 0 and not linhas[anterior].strip():
        anterior -= 1
    if anterior < 0:
        return ""
    atual = linhas[anterior].strip()
    if atual.startswith("//"):
        partes: list[str] = []
        while anterior >= 0 and linhas[anterior].strip().startswith("//"):
            partes.append(linhas[anterior].strip()[2:].strip())
            anterior -= 1
        return " ".join(reversed(partes))
    if atual.endswith("*/"):
        partes = []
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
        return " ".join(reversed(partes))
    return ""


def catalogar_javascript() -> list[Registro]:
    """Lista funções, métodos e manipuladores JavaScript de autoria do projeto."""
    registros: list[Registro] = []
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
    for caminho in sorted(RAIZ.rglob("*.js")):
        if caminho.name in BIBLIOTECAS_EXTERNAS:
            continue
        linhas = caminho.read_text(encoding="utf-8", errors="replace").splitlines()
        for indice, linha in enumerate(linhas):
            resultado = next((item.search(linha) for item in padroes if item.search(linha)), None)
            if not resultado or resultado.group(1) in PALAVRAS_DE_CONTROLE_JAVASCRIPT:
                continue
            registros.append(
                Registro(
                    "JavaScript",
                    str(caminho.relative_to(RAIZ)),
                    resultado.group(1),
                    indice + 1,
                    resumir(comentario_javascript(linhas, indice)),
                )
            )
    return registros


def catalogar_python() -> list[Registro]:
    """Lista funções Python e resume a primeira parte de cada docstring."""
    registros: list[Registro] = []
    for caminho in sorted(RAIZ.rglob("*.py")):
        arvore = ast.parse(caminho.read_text(encoding="utf-8"))
        for no in ast.walk(arvore):
            if not isinstance(no, (ast.FunctionDef, ast.AsyncFunctionDef)):
                continue
            registros.append(
                Registro(
                    "Python",
                    str(caminho.relative_to(RAIZ)),
                    no.name,
                    no.lineno,
                    resumir((ast.get_docstring(no) or "").split("\n\n", 1)[0]),
                )
            )
    return registros


def catalogar_r() -> list[Registro]:
    """Lista funções R e reúne o bloco Roxygen que antecede cada definição."""
    registros: list[Registro] = []
    padrao = re.compile(r"^\s*([A-Za-z.][A-Za-z0-9._]*)\s*<-\s*function\s*\(")
    for caminho in sorted(RAIZ.rglob("*.R")):
        linhas = caminho.read_text(encoding="utf-8", errors="replace").splitlines()
        for indice, linha in enumerate(linhas):
            resultado = padrao.search(linha)
            if not resultado:
                continue
            anterior = indice - 1
            partes: list[str] = []
            while anterior >= 0 and linhas[anterior].lstrip().startswith("#'"):
                partes.append(linhas[anterior].lstrip()[2:].strip())
                anterior -= 1
            registros.append(
                Registro(
                    "R",
                    str(caminho.relative_to(RAIZ)),
                    resultado.group(1),
                    indice + 1,
                    resumir(" ".join(reversed(partes))),
                )
            )
    return registros


def montar_catalogo(registros: list[Registro]) -> str:
    """Monta o documento Markdown com totais e uma linha para cada função."""
    totais = {
        linguagem: sum(registro.linguagem == linguagem for registro in registros)
        for linguagem in ("JavaScript", "Python", "R")
    }
    linhas = [
        "# Catálogo de funções",
        "",
        "Este catálogo reúne as rotinas nomeadas, os métodos e os manipuladores do projeto "
        "e resume a responsabilidade registrada junto ao código. Ele pode ser reconstruído com "
        "`python GeracaoDoCatalogoDeFuncoes.py` após uma atualização.",
        "",
        f"Foram catalogadas **{len(registros)} funções de autoria do projeto**: "
        f"**{totais['JavaScript']} em JavaScript**, **{totais['Python']} em Python** "
        f"e **{totais['R']} em R**.",
        "",
        "As bibliotecas `LeitorDeArquivosCsv.js`, `LeitorDePlanilhas.js` e "
        "`CompactadorDeArquivos.js` são dependências de terceiros. Suas versões, "
        "finalidades e licenças estão registradas em `LicencasDasBibliotecas.md`.",
        "",
        "| Linguagem | Arquivo | Função | Linha | Responsabilidade |",
        "|---|---|---|---:|---|",
    ]
    for registro in sorted(
        registros,
        key=lambda item: (item.linguagem, item.arquivo.casefold(), item.linha, item.funcao.casefold()),
    ):
        linhas.append(
            f"| {registro.linguagem} | `{registro.arquivo}` | `{registro.funcao}` | "
            f"{registro.linha} | {registro.responsabilidade} |"
        )
    return "\n".join(linhas) + "\n"


def principal() -> int:
    """Reúne os três catálogos e grava a versão atualizada do documento."""
    registros = catalogar_javascript() + catalogar_python() + catalogar_r()
    DESTINO.write_text(montar_catalogo(registros), encoding="utf-8")
    print(f"Catálogo atualizado: {len(registros)} funções.")
    return 0


if __name__ == "__main__":
    raise SystemExit(principal())
