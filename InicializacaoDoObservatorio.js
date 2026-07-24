/**
 * Inicializa os módulos do observatório depois que a estrutura da página está disponível.
 * Novos módulos devem ser incluídos aqui somente quando dependem do carregamento completo do documento.
 */

/**
 * Remove do catálogo de idade detalhada os indicadores que a própria base marcou
 * como indisponíveis. A correção também protege versões antigas do catálogo que
 * tenham sido mantidas pelo cache do navegador.
 */
function alinharCatalogoDeIdadeDetalhada(){
  const catalogo=window.VIGITEL_AGE_DETAIL;
  const meta=catalogo?.meta;
  if(!meta) return;
  const indisponiveis=meta.unsupportedIndicators||{};
  meta.supportedIndicators=(meta.supportedIndicators||[]).filter(
    indicador=>!Object.prototype.hasOwnProperty.call(indisponiveis,indicador)
  );
}

document.addEventListener('DOMContentLoaded',async()=>{
  alinharCatalogoDeIdadeDetalhada();
  try{
    if(window.VigitelAdmin) await window.VigitelAdmin.restoreImportedBase();
  }catch(error){
    console.error('Falha ao restaurar a versão administrativa da base.',error);
  }
  init();
  window.VigitelGlossary?.init();
  window.VigitelAdmin?.init();
  window.VigitelDiagnostics?.init();
  window.VigitelMobile?.init();
});
