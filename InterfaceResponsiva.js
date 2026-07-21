/**
 * Organiza a abertura e o fechamento dos filtros em telas menores.
 * Confira teclado, foco e rolagem sempre que a estrutura lateral for modificada.
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
