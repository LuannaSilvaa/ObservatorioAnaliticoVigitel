#!/usr/bin/env python3
"""Preserva as contagens auditadas diretamente nos microdados do Vigitel.

Durante a atualização administrativa, ``EntrevistasPorAno.csv`` é produzido
enquanto os microdados anuais temporários ainda existem. Depois da publicação,
esses arquivos brutos são removidos. Uma sincronização técnica posterior não
deve substituir a metodologia auditada por uma reconstrução baseada nos
indicadores agregados.

Esta rotina possui dois comportamentos automáticos:

* quando a base atual registra contagem direta dos microdados, atualiza o arquivo
  permanente ``AuditoriaDasContagensDoVigitel.json``;
* quando a sincronização técnica usou o fallback agregado, restaura as contagens
  e a metodologia do arquivo de auditoria, desde que fonte e anos coincidam.
"""
from __future__ import annotations

import csv
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent
BASE_PATH = ROOT / "BaseAnaliticaDoVigitel.js"
ENTREVISTAS_PATH = ROOT / "EntrevistasPorAno.csv"
METADADOS_PATH = ROOT / "MetadadosDoProcessamento.csv"
RELATORIO_PATH = ROOT / "RelatorioDaUltimaAtualizacaoRemota.txt"
AUDITORIA_PATH = ROOT / "AuditoriaDasContagensDoVigitel.json"
METODO_DIRETO = "microdados anuais harmonizados após os filtros essenciais"


def agora_utc() -> str:
    """Retorna o horário UTC usado nos registros de auditoria."""
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def carregar_base() -> tuple[str, int, int, dict[str, Any]]:
    """Carrega o objeto DATA e as posições necessárias para regravá-lo."""
    texto = BASE_PATH.read_text(encoding="utf-8")
    marcador = "const DATA = "
    inicio = texto.index(marcador) + len(marcador)
    dados, usado = json.JSONDecoder().raw_decode(texto[inicio:])
    return texto, inicio, usado, dados


def salvar_base(texto: str, inicio: int, usado: int, dados: dict[str, Any]) -> None:
    """Regrava apenas o objeto DATA da base JavaScript."""
    codificado = json.dumps(dados, ensure_ascii=False, separators=(",", ":"))
    BASE_PATH.write_text(texto[:inicio] + codificado + texto[inicio + usado :], encoding="utf-8")


def ler_entrevistas() -> list[dict[str, str]]:
    """Lê a tabela anual de entrevistas."""
    with ENTREVISTAS_PATH.open("r", encoding="utf-8-sig", newline="") as arquivo:
        return list(csv.DictReader(arquivo))


def validar_tabela(
    linhas: list[dict[str, str]],
    anos: list[str],
) -> tuple[dict[str, int], dict[str, int], str]:
    """Valida anos, totais e método da tabela de entrevistas."""
    if [linha.get("ano", "") for linha in linhas] != anos:
        raise RuntimeError("EntrevistasPorAno.csv não possui a mesma relação de anos da base.")
    recebidas: dict[str, int] = {}
    validas: dict[str, int] = {}
    metodos: set[str] = set()
    for linha in linhas:
        ano = linha["ano"]
        recebidas[ano] = int(linha["linhas_recebidas"])
        validas[ano] = int(linha["entrevistas_validas_utilizadas"])
        if recebidas[ano] < validas[ano] or validas[ano] <= 0:
            raise RuntimeError(f"Contagem anual incoerente em {ano}.")
        metodos.add(linha.get("metodo_contagem", "").strip())
    if len(metodos) != 1:
        raise RuntimeError("EntrevistasPorAno.csv possui mais de um método de contagem.")
    return recebidas, validas, next(iter(metodos))


def escrever_entrevistas(auditoria: dict[str, Any]) -> None:
    """Restaura a tabela anual a partir da auditoria permanente."""
    with ENTREVISTAS_PATH.open("w", encoding="utf-8-sig", newline="") as arquivo:
        escritor = csv.writer(arquivo)
        escritor.writerow(
            ["ano", "linhas_recebidas", "entrevistas_validas_utilizadas", "metodo_contagem"]
        )
        for ano in auditoria["years"]:
            escritor.writerow(
                [
                    ano,
                    auditoria["receivedByYear"][ano],
                    auditoria["validByYear"][ano],
                    auditoria["method"],
                ]
            )


def atualizar_metadados_csv(auditoria: dict[str, Any]) -> None:
    """Alinha o CSV de metadados à contagem auditada."""
    with METADADOS_PATH.open("r", encoding="utf-8-sig", newline="") as arquivo:
        linhas = list(csv.DictReader(arquivo))
    valores = {
        "Linhas recebidas": str(auditoria["sourceRowsRead"]),
        "Entrevistas válidas utilizadas": str(auditoria["respondentsProcessed"]),
        "Método da contagem anual": auditoria["method"],
    }
    encontrados: set[str] = set()
    for linha in linhas:
        campo = linha.get("campo", "")
        if campo in valores:
            linha["descricao"] = valores[campo]
            encontrados.add(campo)
    for campo, descricao in valores.items():
        if campo not in encontrados:
            linhas.append({"campo": campo, "descricao": descricao})
    with METADADOS_PATH.open("w", encoding="utf-8-sig", newline="") as arquivo:
        escritor = csv.DictWriter(arquivo, fieldnames=["campo", "descricao"])
        escritor.writeheader()
        escritor.writerows(linhas)


def atualizar_relatorio(auditoria: dict[str, Any]) -> None:
    """Corrige a descrição do método no resumo operacional, quando presente."""
    if not RELATORIO_PATH.is_file():
        return
    texto = RELATORIO_PATH.read_text(encoding="utf-8", errors="replace")
    texto = re.sub(
        r"(?m)^Método da contagem:.*$",
        "Método da contagem: " + auditoria["method"],
        texto,
    )
    RELATORIO_PATH.write_text(texto, encoding="utf-8")


def capturar_auditoria(dados: dict[str, Any]) -> dict[str, Any]:
    """Cria a auditoria permanente a partir da contagem direta atual."""
    anos = [str(ano) for ano in dados["dims"]["years"]]
    recebidas, validas, metodo = validar_tabela(ler_entrevistas(), anos)
    if metodo != METODO_DIRETO:
        raise RuntimeError("A contagem atual não foi produzida diretamente dos microdados.")
    auditoria = {
        "version": "1.0",
        "sourceFile": dados.get("meta", {}).get("lastUpdateSourceFile", "Não informado"),
        "auditedAt": dados.get("meta", {}).get("lastAutomaticUpdate", agora_utc()),
        "method": metodo,
        "years": anos,
        "receivedByYear": recebidas,
        "validByYear": validas,
        "sourceRowsRead": sum(recebidas.values()),
        "sourceRowsExcluded": sum(recebidas.values()) - sum(validas.values()),
        "respondentsProcessed": sum(validas.values()),
    }
    AUDITORIA_PATH.write_text(
        json.dumps(auditoria, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    return auditoria


def carregar_auditoria(dados: dict[str, Any]) -> dict[str, Any]:
    """Carrega e valida a auditoria correspondente à base publicada."""
    if not AUDITORIA_PATH.is_file():
        raise RuntimeError("A auditoria permanente das contagens não foi encontrada.")
    auditoria = json.loads(AUDITORIA_PATH.read_text(encoding="utf-8"))
    anos = [str(ano) for ano in dados["dims"]["years"]]
    fonte = str(dados.get("meta", {}).get("lastUpdateSourceFile", ""))
    if auditoria.get("years") != anos:
        raise RuntimeError("A auditoria das contagens pertence a outra relação de anos.")
    if auditoria.get("sourceFile") != fonte:
        raise RuntimeError("A auditoria das contagens pertence a outro arquivo de origem.")
    recebidas = {str(k): int(v) for k, v in auditoria["receivedByYear"].items()}
    validas = {str(k): int(v) for k, v in auditoria["validByYear"].items()}
    if set(recebidas) != set(anos) or set(validas) != set(anos):
        raise RuntimeError("A auditoria não contém todos os anos publicados.")
    if sum(recebidas.values()) != int(auditoria["sourceRowsRead"]):
        raise RuntimeError("O total de linhas da auditoria não coincide com os anos.")
    if sum(validas.values()) != int(auditoria["respondentsProcessed"]):
        raise RuntimeError("O total de entrevistas da auditoria não coincide com os anos.")
    auditoria["receivedByYear"] = recebidas
    auditoria["validByYear"] = validas
    return auditoria


def restaurar_auditoria(
    texto: str,
    inicio: int,
    usado: int,
    dados: dict[str, Any],
    auditoria: dict[str, Any],
) -> None:
    """Restaura base, tabelas e relatório para a metodologia auditada."""
    meta = dados.setdefault("meta", {})
    meta.update(
        {
            "respondentsProcessed": int(auditoria["respondentsProcessed"]),
            "sourceRowsRead": int(auditoria["sourceRowsRead"]),
            "sourceRowsExcluded": int(auditoria["sourceRowsExcluded"]),
            "interviewsByYear": auditoria["validByYear"],
            "interviewCountMethod": auditoria["method"],
            "interviewCountAuditFile": AUDITORIA_PATH.name,
            "interviewCountAuditedAt": auditoria["auditedAt"],
        }
    )
    salvar_base(texto, inicio, usado, dados)
    escrever_entrevistas(auditoria)
    atualizar_metadados_csv(auditoria)
    atualizar_relatorio(auditoria)


def main() -> int:
    """Captura ou restaura automaticamente a auditoria correspondente à base."""
    texto, inicio, usado, dados = carregar_base()
    metodo_atual = str(dados.get("meta", {}).get("interviewCountMethod", ""))
    if metodo_atual == METODO_DIRETO:
        auditoria = capturar_auditoria(dados)
        dados.setdefault("meta", {}).update(
            {
                "interviewCountAuditFile": AUDITORIA_PATH.name,
                "interviewCountAuditedAt": auditoria["auditedAt"],
            }
        )
        salvar_base(texto, inicio, usado, dados)
        print("Auditoria das contagens diretas atualizada a partir dos microdados.")
        return 0

    auditoria = carregar_auditoria(dados)
    restaurar_auditoria(texto, inicio, usado, dados, auditoria)
    print("Contagens diretas restauradas da auditoria permanente após a sincronização técnica.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
