/**
 * Inicializa os módulos do observatório depois que a estrutura da página está disponível.
 * Novos módulos devem ser incluídos aqui somente quando dependem do carregamento completo do documento.
 */

document.addEventListener('DOMContentLoaded',async()=>{
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
