/**
 * Aplica a configuração renovada do tema antes da primeira renderização da página.
 * A chave de armazenamento deve continuar compatível com o sistema analítico.
 */

(function(){
  try{
    const temaDaUrl = new URLSearchParams(window.location.search).get('tema');
    const mode = ['light','dark','auto'].includes(temaDaUrl)
      ? temaDaUrl
      : (localStorage.getItem('vigitel-theme-mode') || 'light');
    const systemDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const applied = mode === 'auto' ? (systemDark ? 'dark' : 'light') : (mode === 'dark' ? 'dark' : 'light');
    document.documentElement.dataset.themeMode = mode;
    document.documentElement.dataset.theme = applied;
    if(['light','dark','auto'].includes(temaDaUrl)){
      localStorage.setItem('vigitel-theme-mode', mode);
      localStorage.setItem('vigitel-theme', applied);
    }
  }catch(error){
    document.documentElement.dataset.themeMode = 'light';
    document.documentElement.dataset.theme = 'light';
  }
})();

/**
 * Controla os menus e atalhos do cabeçalho institucional.
 *
 * As rotinas ficam junto à configuração inicial do tema porque este arquivo é
 * carregado nas três páginas do projeto. A navegação continua independente
 * dos cálculos, filtros e gráficos do Observatório.
 */
(function(){
  'use strict';

  const seletorDoMenu = '.cabecalho-vigitel .header-menu';

  /**
   * Fecha os grupos suspensos, preservando apenas o grupo informado.
   */
  function fecharMenus(exceto){
    document.querySelectorAll(seletorDoMenu).forEach((menu)=>{
      if(menu !== exceto) menu.removeAttribute('open');
    });
  }

  /**
   * Sincroniza o botão de aparência com o tema efetivamente aplicado.
   */
  function atualizarBotaoDoTema(){
    const temaAtual = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
    document.querySelectorAll('[data-header-theme]').forEach((botao)=>{
      const escolha = botao.dataset.themeChoice;
      const ativo = escolha ? escolha === temaAtual : temaAtual === 'dark';
      const nome = escolha === 'dark' ? 'escuro' : escolha === 'light' ? 'claro' : (temaAtual === 'dark' ? 'claro' : 'escuro');
      botao.setAttribute('aria-label', `Ativar modo ${nome}`);
      botao.setAttribute('title', `Modo ${nome}`);
      botao.setAttribute('aria-pressed', String(ativo));
      botao.classList.toggle('active',ativo);
    });
  }

  /**
   * Mantém a escolha de aparência nos links entre as páginas. O parâmetro é
   * necessário especialmente quando o projeto é aberto como arquivo local.
   */
  function sincronizarTemaNosLinks(){
    const modo = document.documentElement.dataset.themeMode || document.documentElement.dataset.theme || 'light';
    document.querySelectorAll('a[href]').forEach((link)=>{
      const href = link.getAttribute('href') || '';
      if(!href || href.startsWith('#') || /^(mailto:|tel:|javascript:)/i.test(href)) return;
      try{
        const destino = new URL(href, window.location.href);
        const interno = window.location.protocol === 'file:'
          ? destino.protocol === 'file:'
          : destino.origin === window.location.origin;
        if(!interno || !/\.html$/i.test(destino.pathname)) return;
        destino.searchParams.set('tema', modo);
        link.href = destino.href;
      }catch(error){}
    });
  }

  /**
   * Alterna diretamente entre os temas claro e escuro.
   * Na página principal, reutiliza a função completa que também atualiza o
   * gráfico. Nas páginas auxiliares, aplica a mesma preferência localmente.
   */
  function alternarTema(temaEscolhido){
    const temaAtual = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
    const proximoTema = temaEscolhido === 'dark' || temaEscolhido === 'light'
      ? temaEscolhido
      : temaAtual === 'dark' ? 'light' : 'dark';

    if(typeof window.applyThemeMode === 'function'){
      window.applyThemeMode(proximoTema, {save:true, updateChart:true, syncGraph:true});
    }else{
      document.documentElement.dataset.themeMode = proximoTema;
      document.documentElement.dataset.theme = proximoTema;
      try{
        localStorage.setItem('vigitel-theme-mode', proximoTema);
        localStorage.setItem('vigitel-theme', proximoTema);
      }catch(error){}
      document.querySelector('#themeColorMeta')?.setAttribute(
        'content',
        proximoTema === 'dark' ? '#0B141E' : '#F7FAFD'
      );
    }

    atualizarBotaoDoTema();
    sincronizarTemaNosLinks();
  }

  /**
   * Leva o usuário ao campo de busca do painel. Em páginas auxiliares, abre a
   * página principal com uma indicação para posicionar o foco automaticamente.
   */
  function abrirBusca(){
    const campo = document.querySelector('#searchInput');
    if(!campo){
      window.location.href = 'index.html?busca=1#painel';
      return;
    }

    campo.scrollIntoView({behavior:'smooth', block:'center'});
    window.setTimeout(()=>{
      campo.focus({preventScroll:true});
      campo.select();
    }, 420);
  }

  /**
   * Abre o glossário pelo cabeçalho quando o módulo já estiver carregado.
   */
  function abrirGlossario(){
    if(window.VigitelGlossary && typeof window.VigitelGlossary.open === 'function'){
      window.VigitelGlossary.open();
      return;
    }
    window.setTimeout(()=>{
      if(window.VigitelGlossary && typeof window.VigitelGlossary.open === 'function'){
        window.VigitelGlossary.open();
      }
    }, 500);
  }

  /**
   * Instala o comportamento do menu móvel nas páginas auxiliares. A página
   * principal já possui esse controle junto às rotinas responsivas do painel.
   */
  function iniciarMenuMovelAuxiliar(){
    if(document.querySelector('#openOnboarding')) return;
    const botao = document.querySelector('#mobileMenuToggle');
    const navegacao = document.querySelector('#mainNavigation');
    if(!botao || !navegacao) return;

    botao.addEventListener('click',()=>{
      const aberto = document.body.classList.toggle('mobile-menu-open');
      botao.setAttribute('aria-expanded', String(aberto));
    });
    navegacao.addEventListener('click',(evento)=>{
      if(!evento.target.closest('a,button')) return;
      document.body.classList.remove('mobile-menu-open');
      botao.setAttribute('aria-expanded','false');
    });
  }

  /**
   * Interpreta atalhos recebidos pela URL depois que a página principal está
   * pronta. Isso permite usar busca, tutorial e glossário a partir das demais
   * páginas sem duplicar essas ferramentas.
   */
  function aplicarAtalhoDaUrl(){
    const parametros = new URLSearchParams(window.location.search);
    if(parametros.get('busca') === '1'){
      window.setTimeout(abrirBusca, 950);
    }
    if(parametros.get('tutorial') === '1'){
      window.setTimeout(()=>document.querySelector('#openOnboarding')?.click(), 1100);
    }
    if(parametros.get('glossario') === '1'){
      window.setTimeout(abrirGlossario, 1100);
    }
  }

  /**
   * Conecta detalhes, atalhos e fechamento por clique externo ou tecla Escape.
   */
  function iniciarCabecalho(){
    const fechamentoPorMenu = new WeakMap();
    /**
     * Identifica equipamentos que possuem mouse ou outro apontador preciso.
     * O resultado impede que a abertura automática dos menus por aproximação
     * interfira nos toques realizados em celulares e tablets.
     */
    const permiteHover = ()=>window.matchMedia?.('(hover: hover) and (pointer: fine)').matches;
    document.querySelectorAll(seletorDoMenu).forEach((menu)=>{
      menu.addEventListener('toggle',()=>{
        if(menu.open) fecharMenus(menu);
      });
      menu.addEventListener('mouseenter',()=>{
        if(!permiteHover()) return;
        window.clearTimeout(fechamentoPorMenu.get(menu));
        fecharMenus(menu);
        menu.setAttribute('open','');
      });
      menu.addEventListener('mouseleave',()=>{
        if(!permiteHover()) return;
        window.clearTimeout(fechamentoPorMenu.get(menu));
        const temporizador = window.setTimeout(()=>menu.removeAttribute('open'),180);
        fechamentoPorMenu.set(menu,temporizador);
      });
      menu.querySelectorAll('a,button').forEach((controle)=>{
        controle.addEventListener('click',()=>menu.removeAttribute('open'));
      });
    });

    document.addEventListener('click',(evento)=>{
      if(!evento.target.closest('.cabecalho-vigitel .header-menu')) fecharMenus();
    });
    document.addEventListener('keydown',(evento)=>{
      if(evento.key !== 'Escape') return;
      fecharMenus();
      document.body.classList.remove('mobile-menu-open');
      document.querySelector('#mobileMenuToggle')?.setAttribute('aria-expanded','false');
    });

    document.querySelectorAll('[data-header-search]').forEach((botao)=>{
      botao.addEventListener('click',abrirBusca);
    });
    document.querySelectorAll('[data-header-theme]').forEach((botao)=>{
      botao.addEventListener('click',()=>alternarTema(botao.dataset.themeChoice));
    });
    document.querySelectorAll('[data-header-glossary]').forEach((botao)=>{
      botao.addEventListener('click',abrirGlossario);
    });

    iniciarMenuMovelAuxiliar();
    atualizarBotaoDoTema();
    sincronizarTemaNosLinks();
    aplicarAtalhoDaUrl();
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', iniciarCabecalho, {once:true});
  }else{
    iniciarCabecalho();
  }
})();

/* === Compatibilidade multidispositivo e janelas moveis (2026-08-27) === */
/**
 * Compatibilidade responsiva do Observatório.
 * Reúne pequenos fallbacks para Safari/iOS, corrige a altura útil da viewport
 * e permite reposicionar janelas flutuantes com mouse no computador.
 */
(function(){
  'use strict';

  /* Compatibilidade com versões do Safari anteriores às APIs usadas no painel. */
  if(!Array.prototype.at){
    Object.defineProperty(Array.prototype,'at',{
      configurable:true,
      writable:true,
      value:function(index){
        var length=this.length>>>0;
        var position=Number(index)||0;
        if(position<0) position=length+position;
        return position<0||position>=length?undefined:this[position];
      }
    });
  }

  if(!String.prototype.replaceAll){
    Object.defineProperty(String.prototype,'replaceAll',{
      configurable:true,
      writable:true,
      value:function(search,replacement){
        var source=String(this);
        if(search instanceof RegExp){
          if(!search.global) throw new TypeError('replaceAll exige expressão regular global.');
          return source.replace(search,replacement);
        }
        var needle=String(search);
        if(needle==='') return source.split('').join(replacement);
        return source.split(needle).join(replacement);
      }
    });
  }

  if(!Array.prototype.flatMap){
    Object.defineProperty(Array.prototype,'flatMap',{
      configurable:true,
      writable:true,
      value:function(callback,thisArg){
        return Array.prototype.concat.apply([],this.map(callback,thisArg));
      }
    });
  }

  if(window.NodeList && !NodeList.prototype.forEach){
    NodeList.prototype.forEach=Array.prototype.forEach;
  }

  /** Mantém uma variável CSS com a altura realmente visível, inclusive no iPhone. */
  function sincronizarViewport(){
    var viewport=window.visualViewport;
    var altura=Math.max(1,Math.round(viewport&&viewport.height?viewport.height:window.innerHeight));
    var largura=Math.max(1,Math.round(viewport&&viewport.width?viewport.width:window.innerWidth));
    document.documentElement.style.setProperty('--app-viewport-height',altura+'px');
    document.documentElement.style.setProperty('--app-viewport-width',largura+'px');
  }

  sincronizarViewport();
  window.addEventListener('resize',sincronizarViewport,{passive:true});
  window.addEventListener('orientationchange',function(){setTimeout(sincronizarViewport,80);},{passive:true});
  if(window.visualViewport){
    window.visualViewport.addEventListener('resize',sincronizarViewport,{passive:true});
    window.visualViewport.addEventListener('scroll',sincronizarViewport,{passive:true});
  }

  /** Fornece abertura e fechamento básicos de <dialog> em Safari antigo. */
  function prepararDialogos(){
    document.querySelectorAll('dialog.app-dialog').forEach(function(dialogo){
      if(typeof dialogo.showModal!=='function'){
        dialogo.showModal=function(){
          dialogo.setAttribute('open','');
          dialogo.classList.add('dialog-fallback-open');
          document.body.classList.add('dialog-fallback-lock');
          dialogo.setAttribute('aria-modal','true');
        };
      }
      if(typeof dialogo.close!=='function'){
        dialogo.close=function(){
          dialogo.removeAttribute('open');
          dialogo.classList.remove('dialog-fallback-open');
          if(!document.querySelector('dialog.app-dialog[open]')) document.body.classList.remove('dialog-fallback-lock');
          dialogo.dispatchEvent(new Event('close'));
        };
      }
    });
  }

  /** Retorna verdadeiro somente para a experiência de computador com mouse/trackpad. */
  function ambienteComPonteiroFino(){
    return window.innerWidth>760 && (!window.matchMedia || window.matchMedia('(hover: hover) and (pointer: fine)').matches);
  }

  function limitar(valor,minimo,maximo){
    return Math.max(minimo,Math.min(maximo,valor));
  }

  /** Torna um painel arrastável pelo cabeçalho, sem interferir em botões e campos. */
  function tornarArrastavel(elemento,alca){
    if(!elemento||!alca||elemento.dataset.desktopDragBound==='true') return;
    elemento.dataset.desktopDragBound='true';
    elemento.classList.add('desktop-movable-panel');
    alca.classList.add('desktop-movable-handle');
    if(!alca.getAttribute('title')) alca.setAttribute('title','Arraste esta barra para mover a janela');

    var estado=null;

    alca.addEventListener('pointerdown',function(evento){
      if(!ambienteComPonteiroFino()||evento.button!==0) return;
      if(evento.target.closest('button,a,input,select,textarea,label,[contenteditable="true"]')) return;
      if(elemento.hidden||('open' in elemento&&!elemento.open&&elemento.tagName==='DIALOG')) return;

      var retangulo=elemento.getBoundingClientRect();
      estado={
        pointerId:evento.pointerId,
        startX:evento.clientX,
        startY:evento.clientY,
        left:retangulo.left,
        top:retangulo.top,
        width:retangulo.width,
        height:retangulo.height
      };

      /* Algumas janelas, especialmente a demográfica, possuem left/transform
         com !important no CSS. Usar prioridade important aqui garante que a
         posição escolhida pelo usuário prevaleça durante e depois do arraste. */
      elemento.style.setProperty('position','fixed','important');
      elemento.style.setProperty('margin','0','important');
      elemento.style.setProperty('left',retangulo.left+'px','important');
      elemento.style.setProperty('top',retangulo.top+'px','important');
      elemento.style.setProperty('right','auto','important');
      elemento.style.setProperty('bottom','auto','important');
      elemento.style.setProperty('transform','none','important');
      elemento.classList.add('is-being-moved');
      document.body.classList.add('moving-floating-panel');
      try{alca.setPointerCapture(evento.pointerId);}catch(error){}
      evento.preventDefault();
    });

    alca.addEventListener('pointermove',function(evento){
      if(!estado||evento.pointerId!==estado.pointerId) return;
      var largura=document.documentElement.clientWidth||window.innerWidth;
      var altura=document.documentElement.clientHeight||window.innerHeight;
      var margem=8;
      var maxLeft=Math.max(margem,largura-estado.width-margem);
      var maxTop=Math.max(margem,altura-Math.min(estado.height,altura-margem*2)-margem);
      var left=limitar(estado.left+(evento.clientX-estado.startX),margem,maxLeft);
      var top=limitar(estado.top+(evento.clientY-estado.startY),margem,maxTop);
      elemento.style.setProperty('left',left+'px','important');
      elemento.style.setProperty('top',top+'px','important');
      evento.preventDefault();
    });

    function encerrar(evento){
      if(!estado||(evento&&evento.pointerId!==estado.pointerId)) return;
      try{alca.releasePointerCapture(estado.pointerId);}catch(error){}
      estado=null;
      elemento.classList.remove('is-being-moved');
      document.body.classList.remove('moving-floating-panel');
    }

    alca.addEventListener('pointerup',encerrar);
    alca.addEventListener('pointercancel',encerrar);
  }

  /** Aplica o recurso às caixas de escolha e às janelas auxiliares do painel. */
  function ativarJanelasMoveis(){
    tornarArrastavel(document.querySelector('#resultChoicePopover'),document.querySelector('#resultChoicePopover .result-choice-head'));
    document.querySelectorAll('dialog.app-dialog').forEach(function(dialogo){
      tornarArrastavel(dialogo,dialogo.querySelector('.dialog-head'));
    });
  }

  function limitarJanelasAposRedimensionar(){
    if(!ambienteComPonteiroFino()) return;
    var largura=document.documentElement.clientWidth||window.innerWidth;
    var altura=document.documentElement.clientHeight||window.innerHeight;
    document.querySelectorAll('.desktop-movable-panel').forEach(function(elemento){
      if(elemento.hidden) return;
      if(elemento.tagName==='DIALOG'&&!elemento.open) return;
      if(!elemento.style.left||!elemento.style.top) return;
      var retangulo=elemento.getBoundingClientRect();
      var left=limitar(retangulo.left,8,Math.max(8,largura-retangulo.width-8));
      var top=limitar(retangulo.top,8,Math.max(8,altura-Math.min(retangulo.height,altura-16)-8));
      elemento.style.setProperty('left',left+'px','important');
      elemento.style.setProperty('top',top+'px','important');
    });
  }

  document.addEventListener('DOMContentLoaded',function(){
    prepararDialogos();
    ativarJanelasMoveis();
    sincronizarViewport();
  });

  window.addEventListener('resize',limitarJanelasAposRedimensionar,{passive:true});
})();
