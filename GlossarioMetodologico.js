/**
 * Controla a busca e a apresentação do glossário metodológico dos indicadores.
 * Ao alterar os textos, mantenha a correspondência com MetodologiaDosIndicadores.js.
 */

(function(){
  const THEME_POPULATIONS = {
    tabagismo:'Adultos com 18 anos ou mais entrevistados pelo Vigitel e elegíveis às perguntas de tabagismo.',
    alcool:'Adultos com 18 anos ou mais entrevistados pelo Vigitel e elegíveis às perguntas sobre consumo de bebidas alcoólicas.',
    obesidade:'Adultos com 18 anos ou mais com informações válidas de peso e altura, conforme a definição do indicador.',
    alimentacao:'Adultos com 18 anos ou mais que responderam às perguntas de consumo alimentar usadas no indicador.',
    atividade:'Adultos com 18 anos ou mais que responderam ao módulo de atividade física.',
    saude:'Adultos com 18 anos ou mais com resposta válida sobre percepção do próprio estado de saúde.',
    cancer:'População elegível segundo sexo, idade e perguntas específicas do exame preventivo analisado.',
    morbidade:'Adultos com 18 anos ou mais com resposta válida sobre diagnóstico médico referido.',
    transito:'Adultos com 18 anos ou mais elegíveis às perguntas de comportamento e segurança no trânsito.'
  };

  const THEME_CAUTIONS = {
    tabagismo:'O indicador é autorreferido. Mudanças na composição da amostra, na cobertura telefônica e na formulação das perguntas devem ser consideradas em comparações históricas.',
    alcool:'O consumo é autorreferido e pode sofrer subdeclaração. Compare anos e grupos mantendo as mesmas definições e filtros.',
    obesidade:'Peso e altura são autorreferidos. A classificação depende dos pontos de corte e da disponibilidade de respostas válidas.',
    alimentacao:'Frequência de consumo não representa necessariamente quantidade consumida. Observe a definição específica do indicador.',
    atividade:'Domínios de atividade física e pontos de corte não devem ser misturados. Verifique se o indicador trata de lazer, deslocamento ou inatividade.',
    saude:'A autoavaliação é subjetiva e pode variar conforme contexto social, cultural e condição de saúde.',
    cancer:'A população-alvo varia por sexo e idade. Resultados fora da faixa recomendada devem ser interpretados com cautela.',
    morbidade:'Diagnóstico referido depende de acesso prévio aos serviços de saúde e conhecimento do diagnóstico.',
    transito:'Comportamentos são autorreferidos e podem sofrer viés de memória ou desejo de responder socialmente.'
  };

  /**
   * Monta a fórmula textual do indicador com numerador e denominador.
   */
  function indicatorFormula(indicator){
    const unit = indicator?.unit || '%';
    if(unit === '%' || String(unit).includes('%')){
      return 'Prevalência (%) = (soma ponderada dos respondentes que atendem ao critério ÷ soma ponderada da população elegível) × 100.';
    }
    return 'O valor é calculado a partir da soma ponderada do numerador dividida pelo denominador elegível, respeitando a unidade definida para o indicador.';
  }

  /**
   * Retorna o verbete metodológico correspondente ao indicador informado.
   */
  function getGlossaryEntry(indicator){
    const theme = DATA.themes.find(t=>t.id===indicator.themeId);
    return {
      id:indicator.id,
      label:indicator.label,
      theme:theme?.label || 'Saúde pública',
      definition:indicator.description || 'Indicador calculado a partir dos dados agregados do Vigitel.',
      formula:indicatorFormula(indicator),
      population:THEME_POPULATIONS[indicator.themeId] || 'Adultos com 18 anos ou mais entrevistados pelo Vigitel e elegíveis à pergunta analisada.',
      caution:THEME_CAUTIONS[indicator.themeId] || 'Considere ponderação amostral, tamanho da amostra, mudanças metodológicas e intervalos de confiança ao comparar ResultadosProcessados.',
      source:'Vigitel — Vigilância de Fatores de Risco e Proteção para Doenças Crônicas por Inquérito Telefônico, Ministério da Saúde.'
    };
  }

  /**
   * Seleciona os indicadores que correspondem à busca do glossário.
   */
  function filteredIndicators(){
    const term = normalizeText(document.querySelector('#glossarySearch')?.value || '');
    if(!term) return DATA.indicators;
    return DATA.indicators.filter(i=>normalizeText(`${i.id} ${i.label} ${i.description} ${i.themeId}`).includes(term));
  }

  /**
   * Monta a lista de indicadores disponível no glossário.
   */
  function renderList(selectedId){
    const list=document.querySelector('#glossaryList');
    if(!list) return;
    const indicators=filteredIndicators();
    list.innerHTML=indicators.map(i=>{
      const theme=DATA.themes.find(t=>t.id===i.themeId);
      return `<button type="button" data-glossary-id="${esc(i.id)}" class="${i.id===selectedId?'active':''}"><strong>${esc(i.id)} · ${esc(i.label)}</strong><span>${esc(theme?.label||'Indicador')}</span></button>`;
    }).join('') || '<p class="panel-subtitle">Nenhum indicador encontrado.</p>';
  }

  /**
   * Monta o conteúdo detalhado do verbete selecionado.
   */
  function renderContent(id){
    const indicator=DATA.indicators.find(i=>i.id===id) || DATA.indicators[0];
    const content=document.querySelector('#glossaryContent');
    if(!indicator || !content) return;
    const item=getGlossaryEntry(indicator);
    content.dataset.activeIndicator=item.id;
    content.innerHTML=`
      <span class="glossary-code">${esc(item.id)} · ${esc(item.theme)}</span>
      <h3>${esc(item.label)}</h3>
      <div class="glossary-section"><h4>Definição</h4><p>${esc(item.definition)}</p></div>
      <div class="glossary-section"><h4>Fórmula</h4><p>${esc(item.formula)}</p></div>
      <div class="glossary-section"><h4>População analisada</h4><p>${esc(item.population)}</p></div>
      <div class="glossary-section"><h4>Cuidados de interpretação</h4><p>${esc(item.caution)}</p></div>
      <div class="glossary-section"><h4>Fonte</h4><p>${esc(item.source)}</p></div>`;
    renderList(item.id);
  }

  /**
   * Abre o glossário e posiciona a busca no campo adequado.
   */
  function open(id){
    const dialog=document.querySelector('#glossaryDialog');
    if(!dialog) return;
    const selected=id || S.indicator?.id || DATA.indicators[0]?.id;
    const search=document.querySelector('#glossarySearch');
    if(search) search.value='';
    renderContent(selected);
    if(typeof dialog.showModal==='function') dialog.showModal(); else dialog.setAttribute('open','');
  }

  /**
   * Fecha o glossário e devolve o foco ao controle de abertura.
   */
  function close(){
    const dialog=document.querySelector('#glossaryDialog');
    if(dialog?.open && typeof dialog.close==='function') dialog.close();
    else dialog?.removeAttribute('open');
  }

  /**
   * Inicializa a busca, a lista e os controles do glossário.
   */
  function init(){
    document.addEventListener('click',event=>{
      const help=event.target.closest('[data-indicator-help]');
      if(help){
        event.preventDefault();
        event.stopPropagation();
        open(help.dataset.indicatorHelp);
        return;
      }
      const item=event.target.closest('[data-glossary-id]');
      if(item){
        event.preventDefault();
        renderContent(item.dataset.glossaryId);
      }
      const closer=event.target.closest('[data-close-dialog="glossaryDialog"]');
      if(closer) close();
    });
    document.addEventListener('keydown',event=>{
      const help=event.target.closest?.('[data-indicator-help]');
      if(help && (event.key==='Enter'||event.key===' ')){
        event.preventDefault();event.stopPropagation();open(help.dataset.indicatorHelp);
      }
    },true);
    document.querySelector('#glossarySearch')?.addEventListener('input',()=>{
      renderList(document.querySelector('#glossaryContent')?.dataset.activeIndicator||'');
    });
    document.querySelector('#openSelectedGlossary')?.addEventListener('click',()=>open(S.indicator?.id));
  }

  window.VigitelGlossary={init,open,getGlossaryEntry};
})();
