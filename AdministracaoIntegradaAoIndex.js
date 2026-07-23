/** Administração remota do Observatório Analítico do Vigitel. */
(function () {
  'use strict';

  const OWNER = 'LuannaSilvaa';
  const REPO = 'ObservatorioAnaliticoVigitel';
  const byId = (id) => document.getElementById(id);
  const repoUrl = (path) => `https://github.com/${OWNER}/${REPO}${path}`;
  const pad = (value) => String(value).padStart(2, '0');

  function newTag() {
    const date = new Date();
    return `atualizacao-vigitel-${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
  }

  function loadedYears() {
    try {
      return [...new Set((DATA?.dims?.years || []).map(Number).filter(Number.isFinite))].sort((a, b) => a - b);
    } catch (_) {
      return [];
    }
  }

  function formatDate(value) {
    if (!value) return 'Ainda não informada';
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? String(value)
      : date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  }

  function renderYears(items) {
    const list = byId('adminAvailableYears');
    const summary = byId('adminYearsSummary');
    const years = [...new Set((items || []).map(Number).filter(Number.isFinite))].sort((a, b) => a - b);

    if (list) {
      list.innerHTML = years.length
        ? years.map((year) => `<span>${year}</span>`).join('')
        : '<em>Nenhum ano identificado.</em>';
    }

    if (summary) {
      summary.textContent = years.length ? `${years[0]} a ${years.at(-1)}` : 'Não identificado';
    }
  }

  function renderStatus(kind, message) {
    const badge = byId('adminRemoteStatusBadge');
    const box = byId('adminIntegratedMessage');
    const labels = {
      success: 'Atualização concluída',
      processing: 'Processando atualização',
      error: 'Atualização recusada',
      idle: 'Aguardando execução'
    };
    const status = String(kind || 'idle').toLowerCase();

    if (badge) {
      badge.textContent = labels[status] || 'Situação da base';
      badge.dataset.status = status;
    }

    if (box) {
      box.textContent = message || 'Salve o rascunho e execute o fluxo no GitHub Actions.';
      box.dataset.type = status === 'success'
        ? 'success'
        : status === 'error'
          ? 'error'
          : status === 'processing'
            ? 'working'
            : 'info';
    }
  }

  async function refreshStatus() {
    const button = byId('adminRefreshStatusButton');
    if (button) button.disabled = true;

    try {
      const response = await fetch(`EstadoDaAtualizacao.json?t=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('Falha ao consultar o estado.');
      const state = await response.json();

      renderStatus(state.status, state.message);
      byId('adminLastUpdateSummary').textContent = formatDate(state.updatedAt);
      byId('adminRemoteSourceFile').textContent = state.sourceFile || 'Não informado';
      renderYears(Array.isArray(state.years) && state.years.length ? state.years : loadedYears());
    } catch (_) {
      renderStatus('idle', 'A base publicada continua disponível. O estado da atualização não pôde ser consultado agora.');
      renderYears(loadedYears());
    } finally {
      if (button) button.disabled = false;
    }
  }

  function installStyles() {
    if (byId('administracaoRemotaStyles')) return;

    const style = document.createElement('style');
    style.id = 'administracaoRemotaStyles';
    style.textContent = `
      .admin-remote-step{display:grid;grid-template-columns:34px 1fr;gap:.75rem;margin-top:.85rem;padding:.8rem;border:1px solid rgba(13,79,150,.1);border-radius:14px;background:rgba(13,79,150,.04)}
      .admin-remote-step>b{display:grid;place-items:center;width:32px;height:32px;border-radius:50%;background:#0d4f96;color:#fff}
      .admin-remote-step p{margin:.15rem 0 0}
      .admin-remote-step.admin-remote-action{border-color:rgba(17,167,161,.4);background:rgba(17,167,161,.09)}
      .admin-remote-step.admin-remote-action>b{background:#0b7f79}
      .admin-remote-tag{display:grid;grid-template-columns:1fr auto auto;gap:.5rem;margin:.75rem 0}
      .admin-remote-tag input{width:100%;padding:.75rem;border:1px solid var(--border-color,#ccd8e4);border-radius:12px;background:var(--input-bg,#fff);color:inherit;font:600 .85rem Consolas,monospace}
      .admin-remote-flow{display:grid;grid-template-columns:repeat(6,1fr);gap:.5rem;margin-top:1rem}
      .admin-remote-flow span{display:grid;place-items:center;min-height:68px;padding:.55rem;text-align:center;border-radius:12px;background:rgba(17,167,161,.08);font-size:.8rem;font-weight:750}
      .admin-remote-note{padding:.9rem 1rem;border-left:4px solid #11a7a1;border-radius:12px;background:rgba(17,167,161,.08)}
      .admin-remote-warning{padding:.9rem 1rem;border-left:4px solid #d18b18;border-radius:12px;background:#fff7e6;color:#684809}
      .admin-remote-wrong{display:inline-block;margin-top:.35rem;padding:.25rem .45rem;border-radius:7px;background:#3a2025;color:#fff;font:700 .78rem Consolas,monospace}
      .admin-integrated-badge[data-status=success]{background:#eaf8f1;color:#176343}
      .admin-integrated-badge[data-status=processing]{background:#fff8e8;color:#7a5a12}
      .admin-integrated-badge[data-status=error]{background:#fff0f0;color:#9b3030}
      @media(max-width:900px){.admin-remote-tag{grid-template-columns:1fr}.admin-remote-flow{grid-template-columns:repeat(2,1fr)}}
    `;
    document.head.appendChild(style);
  }

  function buildAdministration() {
    installStyles();

    const oldNav = byId('administracaoNav');
    if (oldNav) {
      const link = oldNav.cloneNode(true);
      link.removeAttribute('hidden');
      link.href = '#administracao';
      oldNav.replaceWith(link);
      link.addEventListener('click', () => {
        setTimeout(() => byId('administracao')?.scrollIntoView({ behavior: 'smooth' }), 20);
      });
    }

    const section = byId('administracao');
    if (!section) return;
    section.removeAttribute('hidden');

    const workflowUrl = repoUrl('/actions/workflows/AtualizacaoRemotaDaBase.yml');

    section.innerHTML = `
      <div class="admin-integrated-shell">
        <div class="admin-integrated-hero">
          <div>
            <span class="eyebrow">Acesso administrativo remoto</span>
            <h2>Administração do Observatório</h2>
            <p class="panel-subtitle">Quando a atualização é aprovada, ela é gravada no painel público e passa a funcionar para todos.</p>
          </div>
          <span class="admin-integrated-badge" data-status="idle" id="adminRemoteStatusBadge">Aguardando execução</span>
        </div>

        <div class="admin-integrated-grid">
          <article class="admin-integrated-card">
            <h3>Base publicada</h3>
            <div class="admin-summary-grid">
              <div class="admin-summary-item"><span>Período disponível</span><strong id="adminYearsSummary">Identificando...</strong></div>
              <div class="admin-summary-item"><span>Último processamento</span><strong id="adminLastUpdateSummary">Identificando...</strong></div>
              <div class="admin-summary-item"><span>Último arquivo</span><strong id="adminRemoteSourceFile">Não informado</strong></div>
            </div>
            <h4>Anos disponíveis para todos</h4>
            <div class="admin-year-list" id="adminAvailableYears"></div>
            <p class="admin-integrated-message" id="adminIntegratedMessage">Consultando a base pública.</p>
            <div class="admin-integrated-actions">
              <button class="btn" id="adminRefreshStatusButton" type="button">Verificar atualização</button>
              <a class="btn primary" href="${workflowUrl}" target="_blank" rel="noopener">Executar ou acompanhar</a>
            </div>
          </article>

          <article class="admin-integrated-card">
            <h3>Enviar nova base</h3>
            <p>O GitHub fará o login e aceitará o envio somente de uma conta com permissão administrativa.</p>

            <div class="admin-remote-step"><b>1</b><div><strong>Copie a identificação</strong><p>Use-a no campo da tag da nova versão.</p></div></div>
            <div class="admin-remote-tag">
              <input id="adminRemoteTag" readonly aria-label="Identificação da atualização">
              <button class="btn" id="adminCopyTag" type="button">Copiar</button>
              <button class="btn" id="adminNewTag" type="button">Gerar outra</button>
            </div>

            <div class="admin-remote-step"><b>2</b><div><strong>Entre como ${OWNER}</strong><p>Abra o envio seguro pelo botão abaixo.</p></div></div>
            <div class="admin-remote-step"><b>3</b><div><strong>Preencha o título e a descrição</strong><p>Não coloque a base dentro da descrição.</p></div></div>

            <div class="admin-remote-warning">
              <strong>Não use esta caixa para a base:</strong><br>
              <span class="admin-remote-wrong">Markdown is supported · Paste, drop, or click to add files</span>
              <p>Essa caixa aceita apenas anexos de até 25 MB.</p>
            </div>

            <div class="admin-remote-step"><b>4</b><div><strong>Role para a caixa de arquivos binários</strong><p>Procure <strong>Attach binaries by dropping them here or selecting them</strong>. Solte o CSV, XLS ou XLSM somente nessa caixa.</p></div></div>
            <div class="admin-remote-step"><b>5</b><div><strong>Salve como rascunho</strong><p>Clique em <strong>Save draft</strong>, não em Publish release.</p></div></div>
            <div class="admin-remote-step admin-remote-action"><b>6</b><div><strong>Execute a atualização</strong><p>Abra o GitHub Actions, clique em <strong>Run workflow</strong> e confirme no botão verde. Sem essa etapa, o rascunho pode permanecer aguardando.</p></div></div>

            <div class="admin-integrated-actions">
              <a class="btn" href="${repoUrl('/releases/new')}" target="_blank" rel="noopener">1. Entrar e enviar arquivos</a>
              <a class="btn primary" href="${workflowUrl}" target="_blank" rel="noopener">2. Executar atualização agora</a>
              <a class="btn" href="${repoUrl('/releases')}" target="_blank" rel="noopener">Ver meus envios</a>
            </div>

            <p class="admin-remote-note"><strong>Limite:</strong> cada arquivo deve ter menos de 2 GiB. Para bases próximas de 2 GB, prefira CSV. O dicionário é opcional e deve conter “Dicionario” no nome.</p>
          </article>
        </div>

        <article class="admin-integrated-card">
          <h3>Processamento automático</h3>
          <div class="admin-remote-flow"><span>Recebimento</span><span>Leitura dos anos</span><span>Recálculo</span><span>Validação</span><span>Gravação</span><span>Publicação</span></div>
          <p>A base completa pode ser enviada em um único arquivo. Anos futuros também serão reconhecidos pela coluna de ano.</p>
        </article>
      </div>
    `;

    const tagField = byId('adminRemoteTag');
    tagField.value = newTag();
    byId('adminNewTag').addEventListener('click', () => { tagField.value = newTag(); });
    byId('adminCopyTag').addEventListener('click', async () => {
      const button = byId('adminCopyTag');
      try {
        await navigator.clipboard.writeText(tagField.value);
      } catch (_) {
        tagField.select();
        document.execCommand('copy');
      }
      button.textContent = 'Copiado';
      setTimeout(() => { button.textContent = 'Copiar'; }, 1500);
    });
    byId('adminRefreshStatusButton').addEventListener('click', refreshStatus);

    renderYears(loadedYears());
    refreshStatus();
    window.setInterval(refreshStatus, 30000);

    if (location.hash === '#administracao') {
      setTimeout(() => section.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildAdministration);
  } else {
    buildAdministration();
  }
})();
