/**
 * Coordena a abertura do Observatório antes da leitura da base analítica.
 * As dependências são carregadas em uma ordem conhecida, com indicação de
 * progresso e uma alternativa de nova tentativa quando algum arquivo falha.
 * Este módulo apenas prepara a interface; nenhum dado estatístico é alterado.
 */

(function(){
  const EDICAO = 'temaClaroTutorial20260829v28';
  const tela = document.querySelector('#appLoadingScreen');
  const barra = document.querySelector('#appLoadingBar');
  const percentual = document.querySelector('#appLoadingPercent');
  const titulo = document.querySelector('#appLoadingTitle');
  const texto = document.querySelector('#appLoadingText');
  const repetir = document.querySelector('#appLoadingRetry');


  /**
   * Reforça no computador o destaque visual e o leve movimento na passagem
   * do mouse. O vínculo é delegado ao documento para continuar funcionando
   * mesmo quando algum bloco da interface for recriado pelo sistema.
   */
  function ativarEfeitoDePassagemDoMouse(){
    const seletor = [
      '.result-view-tabs > button[data-result-view]',
      '.result-view-tabs > #resultClearAnalysis',
      '.result-summary-downloads > summary',
      '.result-summary-primary',
      '.result-summary-secondary'
    ].join(',');

    if(document.body?.dataset.efeitoPuloDelegado === 'ativo') return;
    document.body.dataset.efeitoPuloDelegado = 'ativo';

    /** Ativa a animação visual de destaque no controle apontado. */
    const iniciarPulo = controle=>{
      if(!controle || window.innerWidth <= 760) return;
      controle.classList.remove('efeito-pulo-hover');
      void controle.offsetWidth;
      controle.classList.add('efeito-pulo-hover');
    };

    /** Remove a animação visual quando o controle deixa de estar ativo. */
    const encerrarPulo = controle=>{
      controle?.classList.remove('efeito-pulo-hover');
    };

    document.addEventListener('pointerover',evento=>{
      const controle = evento.target.closest(seletor);
      if(!controle || !document.documentElement.contains(controle)) return;
      if(evento.relatedTarget && controle.contains(evento.relatedTarget)) return;
      iniciarPulo(controle);
    });

    document.addEventListener('pointerout',evento=>{
      const controle = evento.target.closest(seletor);
      if(!controle) return;
      if(evento.relatedTarget && controle.contains(evento.relatedTarget)) return;
      encerrarPulo(controle);
    });

    document.addEventListener('focusin',evento=>{
      const controle = evento.target.closest(seletor);
      if(controle) iniciarPulo(controle);
    });

    document.addEventListener('focusout',evento=>{
      const controle = evento.target.closest(seletor);
      if(controle) encerrarPulo(controle);
    });
  }

  /**
   * Atualiza a mensagem e a largura da barra de progresso.
   */
  function atualizarProgresso(valor, mensagem, tituloAtual='Preparando o painel'){
    const progresso = Math.max(0, Math.min(100, Number(valor) || 0));
    if(barra) barra.style.width = `${progresso}%`;
    if(percentual) percentual.textContent = `${Math.round(progresso)}%`;
    if(titulo) titulo.textContent = tituloAtual;
    if(texto) texto.textContent = mensagem;
  }

  /**
   * Inclui um arquivo JavaScript clássico e confirma sua execução antes de
   * liberar a próxima dependência.
   */
  function carregarArquivo(nome){
    return new Promise((resolve,reject)=>{
      const script = document.createElement('script');
      script.src = `${nome}?edicao=${EDICAO}`;
      script.async = true;
      script.dataset.carregamentoProgressivo = nome;
      /** Confirma ao coordenador que a dependência terminou de executar. */
      script.onload = ()=>resolve(nome);
      /** Interrompe a sequência para exibir a opção segura de tentar novamente. */
      script.onerror = ()=>reject(new Error(`Não foi possível carregar ${nome}.`));
      document.head.appendChild(script);
    });
  }

  /**
   * Ativa o painel depois que base, sistema e complementos estão disponíveis.
   */
  function iniciarModulos(){
    const iniciarAnalitico = window.VigitelAnalitico?.init || window.init;
    if(typeof iniciarAnalitico !== 'function'){
      throw new Error('O módulo analítico principal não foi inicializado corretamente. Atualize os arquivos do sistema e recarregue a página.');
    }
    iniciarAnalitico();
    window.VigitelGlossary?.init();
    window.VigitelDiagnostics?.init();
    window.VigitelMobile?.init();
    window.VigitelExperience?.init();
    ativarEfeitoDePassagemDoMouse();
  }

  /**
   * Remove a tela de abertura somente depois que todos os eventos estão ativos.
   */
  function concluirCarregamento(){
    atualizarProgresso(100,'Painel pronto para uso.','Tudo certo');
    document.documentElement.classList.add('app-ready');
    window.setTimeout(()=>{
      if(!tela) return;
      tela.classList.add('is-finished');
      tela.setAttribute('aria-hidden','true');
      window.setTimeout(()=>tela.remove(),360);
    },220);
  }

  /**
   * Coordena base, catálogos, sistema, recursos auxiliares e inicialização.
   * Arquivos independentes são solicitados em paralelo.
   */
  async function iniciarCarregamento(){
    try{
      atualizarProgresso(12,'Carregando a base agregada validada.');
      await carregarArquivo('assets/js/dados/BaseAnaliticaDoVigitel.js');

      atualizarProgresso(56,'Preparando indicadores, períodos e idades.');
      await Promise.all([
        carregarArquivo('assets/js/dados/CatalogoDeIdadeDetalhada.js'),
        carregarArquivo('assets/js/dados/MetodologiaDosIndicadores.js')
      ]);

      atualizarProgresso(72,'Ativando filtros, gráficos e exportações.');
      await carregarArquivo('assets/js/core/SistemaAnaliticoDoObservatorio.js');

      atualizarProgresso(88,'Adaptando navegação, ajuda e experiência móvel.');
      await Promise.all([
        carregarArquivo('assets/js/core/GlossarioMetodologico.js'),
        carregarArquivo('assets/js/core/InterfaceCompartilhavelDoObservatorio.js')
      ]);

      atualizarProgresso(96,'Conferindo os controles finais.');
      iniciarModulos();
      concluirCarregamento();
    }catch(error){
      console.error('Falha no carregamento progressivo do Observatório:', error);
      atualizarProgresso(100,error.message || 'Não foi possível concluir o carregamento.','O painel não terminou de carregar');
      tela?.classList.add('has-error');
      if(repetir) repetir.hidden = false;
    }
  }

  repetir?.addEventListener('click',()=>location.reload());
  window.VigitelLoadProgress = {atualizar:atualizarProgresso};
  iniciarCarregamento();
})();
