# Guia de nomenclatura dos arquivos

Os nomes foram organizados para indicar claramente a finalidade de cada arquivo. Foi adotada a escrita em PascalCase, sem algarismos, hífens ou sublinhados. Essa escolha reduz ambiguidades em diferentes sistemas operacionais e facilita a leitura do repositório.

Os identificadores internos dos indicadores, como TAB01 e AF01, permanecem dentro das bases e dos scripts porque fazem parte da relação metodológica entre regras, resultados e testes. Eles não são usados como nomes físicos de arquivos.

Arquivos padronizados por ferramentas, como `index.html`, `robots.txt`, `README.md`, `LICENSE`, `CITATION.cff`, `.gitignore` e `.nojekyll`, foram mantidos com seus nomes convencionais para preservar a integração com o GitHub Pages, os mecanismos de busca e os programas de citação acadêmica.

A distribuição atual possui 100 arquivos e nenhum nome físico contém hífen ou sublinhado. O nome do pacote também segue essa regra. Antes de publicar uma atualização, execute `python scripts/python/AuditoriaDaDocumentacao.py` para repetir a conferência.

## Renomeações consolidadas nesta revisão

| Nome anterior | Nome atual | Motivo |
|---|---|---|
| `InterfaceComLixeiraDoPeriodo.css` | `assets/css/InterfaceVisualDoObservatorio.css` | Identifica a função permanente da folha de estilos, sem vinculá-la a uma alteração isolada. |
| `SistemaAnaliticoComLixeiraDoPeriodo.js` | `assets/js/core/SistemaAnaliticoDoObservatorio.js` | Representa o conjunto completo de filtros, cálculos, gráficos e exportações. |
| `InicializacaoComLixeiraDoPeriodo.js` | `assets/js/core/InicializacaoDoObservatorio.js` | Descreve a ordem de carregamento e a ativação dos módulos. |
| `OrientacoesDaVersaoNormal.md` | `documentacao/OrientacoesDaDistribuicaoCompleta.md` | Substitui uma expressão informal por uma identificação mais precisa do pacote. |

Ao aplicar esta revisão em um repositório existente, exclua os quatro nomes
anteriores e envie os arquivos atuais. Não mantenha as duas versões, pois isso
pode confundir a manutenção e favorecer o carregamento de referências antigas.

Ao criar um arquivo novo, use um nome descritivo, sem número de versão. O histórico das alterações deve ser registrado em HistoricoDeVersoes.md e no controle de versões do GitHub, não no nome do arquivo.
