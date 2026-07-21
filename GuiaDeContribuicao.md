# Orientações para contribuição

Contribuições são bem-vindas quando preservam a coerência metodológica, a rastreabilidade dos dados e a clareza da interface.

## Antes de alterar um indicador

1. localize a variável no dicionário da edição correspondente;
2. confirme os códigos de resposta válidos;
3. identifique a população elegível e o denominador;
4. verifique os anos em que a pergunta foi aplicada;
5. registre a justificativa metodológica;
6. recalcule a base e execute todos os testes.

## Alterações na interface

- mantenha os identificadores utilizados pelo JavaScript;
- verifique os modos claro e escuro;
- teste a navegação em tela pequena e tela ampla;
- evite dependências externas desnecessárias;
- preserve textos alternativos, rótulos e navegação por teclado;
- confira as exportações após mudanças nos gráficos.

## Alterações nos dados

Os arquivos de dados publicados na raiz são gerados. Mudanças manuais nesses arquivos podem ser perdidas no recálculo seguinte. A regra deve ser corrigida em `RecalculoDosIndicadores.py`, seguida da regeneração das bases.

## Verificações obrigatórias

```bash
python ValidacaoDaPublicacaoNoGitHub.py
python ValidacaoDaBaseCompleta.py
node TesteDosIndicadoresEGraficos.js
```

Uma alteração só deve ser incorporada quando os testes forem concluídos sem falhas e os ResultadosProcessados forem revisados em pelo menos um navegador de computador e um dispositivo móvel.


## Manutenção futura

Antes de alterar regras, caminhos ou controles, consulte `GuiaDeManutencaoDoProjeto.md`. O guia registra a responsabilidade de cada módulo e a ordem recomendada de validação.
