/**
 * Organiza a interface compartilhável e o funcionamento dos filtros em telas
 * menores. Confira teclado, foco e rolagem sempre que a estrutura lateral for
 * modificada.
 */

(function(){
  /**
   * Abre o painel de filtros em telas pequenas e controla o foco.
   */
  function openFilters(){
    document.body.classList.add('mobile-filter-open');
    const button=document.querySelector('#mobileFilterButton');
    const overlay=document.querySelector('#mobileFilterOverlay');
    if(button) button.setAttribute('aria-expanded','true');
    if(overlay) overlay.hidden=false;
    setTimeout(()=>document.querySelector('#mobileFilterClose')?.focus(),40);
  }

  /**
   * Fecha o painel de filtros e devolve o foco ao botão de abertura.
   */
  function closeFilters(){
    document.body.classList.remove('mobile-filter-open');
    const button=document.querySelector('#mobileFilterButton');
    const overlay=document.querySelector('#mobileFilterOverlay');
    if(button) button.setAttribute('aria-expanded','false');
    if(overlay) setTimeout(()=>{if(!document.body.classList.contains('mobile-filter-open')) overlay.hidden=true;},220);
  }

  /**
   * Mostra o botão de filtros somente quando o layout móvel está ativo.
   */
  function updateButtonVisibility(){
    const mobile=window.matchMedia('(max-width: 760px)').matches;
    const button=document.querySelector('#mobileFilterButton');
    if(button) button.hidden=!mobile;
    if(!mobile) closeFilters();
  }

  /**
   * Inicializa os controles específicos para telas pequenas.
   */
  function init(){
    document.querySelector('#mobileFilterButton')?.addEventListener('click',openFilters);
    document.querySelector('#mobileFilterClose')?.addEventListener('click',closeFilters);
    document.querySelector('#mobileFilterOverlay')?.addEventListener('click',closeFilters);
    document.addEventListener('keydown',event=>{if(event.key==='Escape'&&document.body.classList.contains('mobile-filter-open')) closeFilters();});
    window.addEventListener('resize',updateButtonVisibility,{passive:true});
    const panel=document.querySelector('#mobileFilterDrawer');
    panel?.addEventListener('click',event=>{
      if(window.matchMedia('(max-width: 760px)').matches&&event.target.closest('#generate')) closeFilters();
    });
    updateButtonVisibility();
  }

  window.VigitelMobile={init,openFilters,closeFilters};
})();

/**
 * Complementa a responsividade com menu compacto, tutorial, análises prontas e
 * atalhos para os filtros. As rotinas apenas escolhem controles existentes e
 * não alteram as regras de cálculo do Observatório.
 */
(function(){
  const ONBOARDING_STORAGE_KEY = 'vigitel-onboarding-concluido-v2';
  const READY_ANALYSIS_STORAGE_KEY = 'vigitel-analises-prontas-utilizadas-v1';
  let onboardingStep = 0;

  /**
   * Fecha o menu compacto e sincroniza o estado informado ao leitor de tela.
   */
  function fecharMenuMovel(){
    document.body.classList.remove('mobile-menu-open');
    document.querySelector('#mobileMenuToggle')?.setAttribute('aria-expanded','false');
  }

  /**
   * Instala a navegação móvel expansível, evitando itens cortados em telefones.
   */
  function iniciarMenuMovel(){
    const botao = document.querySelector('#mobileMenuToggle');
    const navegacao = document.querySelector('#mainNavigation');
    if(!botao || !navegacao) return;
    let mobileAnterior = window.matchMedia('(max-width: 760px)').matches;
    let temporizadorDoMapa = null;
    botao.addEventListener('click',()=>{
      const aberto = document.body.classList.toggle('mobile-menu-open');
      botao.setAttribute('aria-expanded',String(aberto));
    });
    navegacao.addEventListener('click',event=>{
      if(event.target.closest('a,button')) fecharMenuMovel();
    });
    document.addEventListener('keydown',event=>{
      if(event.key === 'Escape') fecharMenuMovel();
    });
    window.addEventListener('resize',()=>{
      const mobileAtual = window.matchMedia('(max-width: 760px)').matches;
      if(!mobileAtual) fecharMenuMovel();
      if(mobileAtual !== mobileAnterior && typeof S !== 'undefined' && S.chart === 'map' && hasRequiredBlocks()){
        clearTimeout(temporizadorDoMapa);
        temporizadorDoMapa = setTimeout(()=>scheduleGenerate(0),120);
      }
      mobileAnterior = mobileAtual;
    },{passive:true});
  }

  /**
   * Exibe uma etapa do tutorial e atualiza botões, barra e texto final.
   */
  function mostrarEtapaTutorial(indice){
    const etapas = Array.from(document.querySelectorAll('[data-onboarding-step]'));
    if(!etapas.length) return;
    onboardingStep = Math.max(0,Math.min(etapas.length-1,Number(indice)||0));
    etapas.forEach((etapa,posicao)=>{etapa.hidden = posicao !== onboardingStep;});
    const anterior = document.querySelector('#onboardingPrevious');
    const proximo = document.querySelector('#onboardingNext');
    const barra = document.querySelector('#onboardingProgressBar');
    if(anterior) anterior.disabled = onboardingStep === 0;
    if(proximo) proximo.textContent = onboardingStep === etapas.length-1 ? 'Começar a explorar' : 'Continuar';
    if(barra) barra.style.width = `${((onboardingStep+1)/etapas.length)*100}%`;
  }

  /**
   * Registra que o guia já foi visto para não interromper visitas futuras.
   */
  function registrarTutorialConcluido(){
    try{localStorage.setItem(ONBOARDING_STORAGE_KEY,'sim');}catch(error){}
  }

  /**
   * Abre o guia rápido no início ou por solicitação do menu.
   */
  function abrirTutorial(){
    const dialogo = document.querySelector('#onboardingDialog');
    if(!dialogo) return;
    mostrarEtapaTutorial(0);
    if(typeof dialogo.showModal === 'function' && !dialogo.open) dialogo.showModal();
    else dialogo.setAttribute('open','');
  }

  /**
   * Fecha o guia e preserva a escolha no navegador.
   */
  function fecharTutorial(){
    const dialogo = document.querySelector('#onboardingDialog');
    registrarTutorialConcluido();
    if(dialogo?.open && typeof dialogo.close === 'function') dialogo.close();
    else dialogo?.removeAttribute('open');
  }

  /**
   * Informa se este navegador ainda não concluiu nem pulou o tutorial.
   */
  function tutorialAindaNaoVisto(){
    try{
      return localStorage.getItem(ONBOARDING_STORAGE_KEY) !== 'sim';
    }catch(error){
      return true;
    }
  }

  /**
   * Conecta os controles do guia. Para novos usuários, o tutorial é aberto
   * automaticamente na primeira visita. Depois disso, continua disponível
   * pelo botão “Como usar” ou pelo atalho explícito na URL.
   */
  function iniciarTutorial(){
    const dialogo = document.querySelector('#onboardingDialog');
    if(!dialogo) return;
    document.querySelector('#openOnboarding')?.addEventListener('click',abrirTutorial);
    document.querySelectorAll('[data-onboarding-close]').forEach(botao=>botao.addEventListener('click',fecharTutorial));
    document.querySelector('#onboardingPrevious')?.addEventListener('click',()=>mostrarEtapaTutorial(onboardingStep-1));
    document.querySelector('#onboardingNext')?.addEventListener('click',()=>{
      const total = document.querySelectorAll('[data-onboarding-step]').length;
      if(onboardingStep >= total-1) fecharTutorial();
      else mostrarEtapaTutorial(onboardingStep+1);
    });
    dialogo.addEventListener('cancel',event=>{event.preventDefault();fecharTutorial();});

    if(tutorialAindaNaoVisto()){
      window.setTimeout(()=>{
        if(!dialogo.open) abrirTutorial();
      },700);
    }
  }

  /**
   * Garante uma seleção inicial válida sem substituir o indicador escolhido
   * quando ele já pertence ao catálogo ativo.
   */
  function garantirIndicador(){
    if(S.indicator && DATA.indicators.some(indicador=>indicador.id === S.indicator.id)){
      S.theme = DATA.themes.find(tema=>tema.id === S.indicator.themeId) || S.theme;
      return;
    }
    S.theme = S.theme || DATA.themes[0];
    S.indicator = DATA.indicators.find(indicador=>indicador.themeId === S.theme?.id) || DATA.indicators[0];
    S.theme = DATA.themes.find(tema=>tema.id === S.indicator?.themeId) || S.theme;
  }

  /**
   * Marca somente o ano mais recente disponível na lista de filtros.
   */
  function selecionarAnoMaisRecente(){
    const anos = Array.from(document.querySelectorAll('#yearChecks input')).filter(item=>!item.disabled);
    anos.forEach(item=>{item.checked=false;});
    if(anos.length) anos.at(-1).checked = true;
  }

  /**
   * Aplica um exemplo de análise mantendo as rotinas metodológicas do painel.
   * Nenhum valor é criado; apenas filtros e visualização são escolhidos.
   */
  function aplicarAnalisePronta(tipo){
    garantirIndicador();
    renderFilters();
    clearLegendStateForNewData();
    S.filters = true;
    S.compareEnabled = false;
    S.compareIndicatorId = null;
    document.querySelector('#compareEnabled').checked = false;
    setControlValue('sexFilter','Todos');
    setControlValue('regionFilter','Brasil');
    setControlValue('ufFilter','Brasil');
    setControlValue('popFilter','População Geral');

    if(tipo === 'map'){
      S.chart = 'map';
      setControlValue('groupFilter','UF');
      selecionarAnoMaisRecente();
    }else if(tipo === 'sex'){
      S.chart = 'bar';
      setControlValue('groupFilter','Sexo');
      selecionarAnoMaisRecente();
    }else{
      S.chart = 'line';
      setControlValue('groupFilter','Ano');
    }

    invalidateAnalysisData();
    renderAll();
    updateSummaries();
    saveAnalysisState();
    recordHistory();
    announceSave(tipo === 'map' ? 'Mapa por UF preparado.' : 'Análise pronta aplicada.');
    window.scheduleMobileResultScroll?.(false);
    scheduleGenerate(0);
  }

  /**
   * Confirma se um dos exemplos iniciais já foi utilizado neste navegador.
   */
  function analiseProntaJaUtilizada(){
    try{return localStorage.getItem(READY_ANALYSIS_STORAGE_KEY) === 'sim';}
    catch(error){return false;}
  }

  /**
   * Registra o primeiro uso e recolhe definitivamente a área de exemplos.
   */
  function concluirAnalisesProntas(){
    const secao = document.querySelector('#analysisPresets');
    try{localStorage.setItem(READY_ANALYSIS_STORAGE_KEY,'sim');}catch(error){}
    if(!secao) return;
    secao.classList.add('is-complete');
    secao.setAttribute('aria-hidden','true');
    window.setTimeout(()=>{
      secao.hidden = true;
      document.querySelector('#generate')?.focus({preventScroll:true});
    },220);
  }

  /**
   * Instala os três exemplos somente até que um deles seja utilizado.
   */
  function iniciarAnalisesProntas(){
    const secao = document.querySelector('#analysisPresets');
    if(analiseProntaJaUtilizada()){
      if(secao) secao.hidden = true;
      return;
    }
    document.querySelectorAll('[data-analysis-preset]').forEach(botao=>{
      botao.addEventListener('click',()=>{
        aplicarAnalisePronta(botao.dataset.analysisPreset);
        concluirAnalisesProntas();
      });
    });
  }

  /**
   * Inicializa todos os complementos depois que o sistema principal está pronto.
   */
  function init(){
    iniciarMenuMovel();
    iniciarTutorial();
    iniciarAnalisesProntas();
  }

  window.VigitelExperience = {init,abrirTutorial,aplicarAnalisePronta};
})();
