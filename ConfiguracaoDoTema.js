/**
 * Aplica o tema visual antes da primeira renderização da página.
 * A chave de armazenamento deve continuar compatível com o sistema analítico.
 */

(function(){
  try{
    const mode = localStorage.getItem('vigitel-theme-mode') || 'auto';
    const systemDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const applied = mode === 'auto' ? (systemDark ? 'dark' : 'light') : (mode === 'dark' ? 'dark' : 'light');
    document.documentElement.dataset.themeMode = mode;
    document.documentElement.dataset.theme = applied;
  }catch(error){
    document.documentElement.dataset.themeMode = 'auto';
    document.documentElement.dataset.theme = 'light';
  }
})();
