################################################################################
# RECÁLCULO DA IDADE DETALHADA — V13.0
#
# As 63 regras ficam em uma única fonte auditada:
#   Scripts/RecalculoDosIndicadores.py
#
# Este lançador R chama o gerador completo, que reconstrói simultaneamente:
#   - BaseAnaliticaDoVigitel.js;
#   - MetodologiaDosIndicadores.js;
#   - *.js.
#
# A centralização evita que um script de idade use variáveis, códigos ou
# denominadores diferentes da base principal.
################################################################################

args <- commandArgs(trailingOnly = TRUE)
project_root <- if (length(args) >= 1) {
  normalizePath(args[1], mustWork = TRUE)
} else {
  normalizePath(getwd(), mustWork = TRUE)
}

script <- file.path(project_root, "RecalculoDosIndicadores.py")
if (!file.exists(script)) stop("Gerador auditado não encontrado: ", script)

python <- Sys.which("python3")
if (python == "") python <- Sys.which("python")
if (python == "") stop("Python não encontrado no PATH.")

status <- system2(python, shQuote(script))
if (!identical(status, 0L)) stop("O recálculo auditado terminou com erro (status ", status, ").")
message("Recálculo completo e idade detalhada concluídos pela versão unificada 13.0.")
