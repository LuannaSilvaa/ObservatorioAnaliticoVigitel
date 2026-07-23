/**
 * Administração local integrada à página principal.
 * A interface só aparece quando o index é aberto pelo servidor local em Python.
 */
(function(){
  'use strict';

  const API='/api/vigitel-admin';
  const ADMIN_HEADER={'X-Vigitel-Admin':'1'};
  let pollTimer=null;
  let reloadScheduled=false;

  const $=selector=>document.querySelector(selector);
  const byId=id=>document.getElementById(id);
  const formatBytes=value=>{
    const size=Number(value)||0;
    const units=['B','KiB','MiB','GiB'];
    let result=size,index=0;
    while(result>=1024&&index<units.length-1){result/=1024;index++;}
    return `${result.toLocaleString('pt-BR',{maximumFractionDigits:2})} ${units[index]}`;
  };
  const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  })[char]);

  async function request(path,options={}){
    const response=await fetch(API+path,{
      credentials:'same-origin',
      cache:'no-store',
      ...options,
      headers:{...(options.headers||{}),...((options.method&&options.method!=='GET')?ADMIN_HEADER:{})}
    });
    let payload={};
    try{payload=await response.json();}catch(_){payload={};}
    if(!response.ok){
      const error=new Error(payload.error||`Falha ${response.status}.`);
      error.status=response.status;
      throw error;
    }
    return payload;
  }

  function showLocalAdministration(){
    byId('administracaoNav')?.removeAttribute('hidden');
    byId('administracao')?.removeAttribute('hidden');
  }

  function hideLocalAdministration(){
    byId('administracaoNav')?.setAttribute('hidden','');
    byId('administracao')?.setAttribute('hidden','');
  }

  function setMessage(text,type='info'){
    const box=byId('adminIntegratedMessage');
    if(!box) return;
    box.textContent=text;
    box.dataset.type=type;
  }

  function setAuthMode({setupRequired=false,authenticated=false,username=null}={}){
    const access=byId('adminIntegratedAccess');
    const panel=byId('adminIntegratedPanel');
    const setup=byId('adminIntegratedSetupFields');
    const login=byId('adminIntegratedLoginFields');
    if(access) access.hidden=authenticated;
    if(panel) panel.hidden=!authenticated;
    if(setup) setup.hidden=!setupRequired;
    if(login) login.hidden=setupRequired;
    const title=byId('adminIntegratedAccessTitle');
    const submit=byId('adminIntegratedAccessButton');
    if(title) title.textContent=setupRequired?'Criar acesso administrativo':'Entrar na administração';
    if(submit) submit.textContent=setupRequired?'Criar acesso e entrar':'Entrar';
    const session=byId('adminIntegratedSessionUser');
    if(session) session.textContent=username?`Sessão de ${username}`:'Sessão administrativa';
  }

  function renderYears(panel={}){
    const years=Array.isArray(panel.years)?panel.years:[];
    const list=byId('adminAvailableYears');
    if(list){
      list.innerHTML=years.length
        ? years.map(year=>`<span>${escapeHtml(year)}</span>`).join('')
        : '<em>Nenhum ano identificado</em>';
    }
    const summary=byId('adminYearsSummary');
    if(summary) summary.textContent=panel.yearsLabel||'Não identificado';
    const updated=byId('adminLastUpdateSummary');
    if(updated) updated.textContent=panel.updatedAt||'Não informada';

    const periodText=byId('periodoCobertoTexto');
    if(periodText&&panel.yearsLabel){
      periodText.innerHTML=`A versão atual reúne dados de <strong>${escapeHtml(panel.yearsLabel)}</strong>, conforme os anos efetivamente presentes na base processada. O painel também considera a base específica de População Negra de 2018 quando aplicável.`;
    }
  }

  function syncPeriodFromLoadedData(){
    try{
      if(typeof DATA==='undefined'||!DATA?.meta) return;
      renderYears({
        years:Array.isArray(DATA?.dims?.years)?DATA.dims.years:[],
        yearsLabel:DATA.meta.yearsLabel,
        updatedAt:DATA.meta.lastAutomaticUpdate||DATA.meta.baseUpdatedAt
      });
    }catch(_){/* A API local fará a atualização em seguida. */}
  }

  function renderJob(job={},panel=null){
    const status=job.status||'idle';
    const progress=Math.max(0,Math.min(100,Number(job.progress)||0));
    const bar=byId('adminIntegratedProgressBar');
    if(bar) bar.style.width=`${progress}%`;
    const percent=byId('adminIntegratedProgressValue');
    if(percent) percent.textContent=`${progress}%`;
    const stage=byId('adminIntegratedStage');
    if(stage) stage.textContent=job.stage||'Aguardando atualização';
    const log=byId('adminIntegratedLog');
    if(log&&Array.isArray(job.logs)){
      log.textContent=job.logs.join('\n')||'Nenhum registro de processamento.';
      log.scrollTop=log.scrollHeight;
    }
    const button=byId('adminIntegratedUpdateButton');
    if(button) button.disabled=status==='running';
    const reload=byId('adminReloadPanelButton');
    if(reload) reload.hidden=status!=='success';

    if(panel) renderYears(panel);
    if(status==='running'){
      setMessage(job.stage||'Atualização em andamento.','working');
      startPolling();
    }else if(status==='success'){
      const years=job.result?.panel?.yearsLabel||panel?.yearsLabel||'os novos anos';
      setMessage(`Atualização concluída. O painel agora reconhece ${years}.`,'success');
      renderPackages(job.result?.packages||[]);
      stopPolling();
      if(!reloadScheduled){
        reloadScheduled=true;
        window.setTimeout(()=>reloadPanel(),3500);
      }
    }else if(status==='error'){
      setMessage(job.error||'A atualização falhou e a versão anterior foi restaurada.','error');
      stopPolling();
    }
  }

  function renderPackages(packages){
    const box=byId('adminIntegratedPackages');
    if(!box) return;
    if(!Array.isArray(packages)||!packages.length){box.innerHTML='';return;}
    box.innerHTML=packages.map(item=>
      `<a class="btn" href="${escapeHtml(item.url)}" download>${escapeHtml(item.label)} · ${escapeHtml(item.name)}</a>`
    ).join('');
  }

  async function refreshStatus(){
    const payload=await request('/status');
    showLocalAdministration();
    setAuthMode(payload);
    renderYears(payload.panel||{});
    if(payload.authenticated) renderJob(payload.job||{},payload.panel||{});
    return payload;
  }

  async function submitAccess(event){
    event.preventDefault();
    const button=byId('adminIntegratedAccessButton');
    if(button) button.disabled=true;
    try{
      const status=await request('/status');
      const setupRequired=Boolean(status.setupRequired);
      const username=(byId('adminIntegratedUsername')?.value||'').trim();
      const password=byId('adminIntegratedPassword')?.value||'';
      const confirmation=byId('adminIntegratedPasswordConfirmation')?.value||'';
      const path=setupRequired?'/setup':'/login';
      await request(path,{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({username,password,confirmation})
      });
      byId('adminIntegratedPassword').value='';
      if(byId('adminIntegratedPasswordConfirmation')) byId('adminIntegratedPasswordConfirmation').value='';
      setMessage(setupRequired?'Acesso criado com segurança neste computador.':'Acesso autorizado.','success');
      await refreshStatus();
    }catch(error){
      setMessage(error.message,'error');
    }finally{
      if(button) button.disabled=false;
    }
  }

  async function logout(){
    try{await request('/logout',{method:'POST'});}catch(_){/* encerra visualmente mesmo assim */}
    stopPolling();
    setAuthMode({setupRequired:false,authenticated:false});
    setMessage('Sessão encerrada.','info');
    await refreshStatus().catch(()=>{});
  }

  async function uploadFile(file,kind,onProgress){
    if(!file) return null;
    const extension=(file.name.match(/\.[^.]+$/)||[''])[0].toLowerCase();
    if(!['.csv','.xls','.xlsm'].includes(extension)) throw new Error('Use arquivos CSV, XLS ou XLSM.');
    onProgress?.(`Enviando ${kind==='base'?'a base':'o dicionário'}: ${file.name} (${formatBytes(file.size)})`);
    const response=await fetch(API+'/upload',{
      method:'POST',
      credentials:'same-origin',
      cache:'no-store',
      headers:{
        ...ADMIN_HEADER,
        'Content-Type':'application/octet-stream',
        'X-File-Name':encodeURIComponent(file.name),
        'X-File-Kind':kind
      },
      body:file
    });
    let payload={};
    try{payload=await response.json();}catch(_){payload={};}
    if(!response.ok) throw new Error(payload.error||`Falha ao enviar ${file.name}.`);
    return payload.uploadId;
  }

  async function startUpdate(){
    const base=byId('adminIntegratedBaseFile')?.files?.[0];
    const dictionary=byId('adminIntegratedDictionaryFile')?.files?.[0]||null;
    if(!base){setMessage('Selecione a base completa do Vigitel.','error');return;}
    const button=byId('adminIntegratedUpdateButton');
    if(button) button.disabled=true;
    renderPackages([]);
    try{
      setMessage('Preparando os arquivos para o processamento local.','working');
      const baseUploadId=await uploadFile(base,'base',message=>setMessage(message,'working'));
      const dictionaryUploadId=dictionary
        ? await uploadFile(dictionary,'dictionary',message=>setMessage(message,'working'))
        : null;
      await request('/update',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          baseUploadId,
          dictionaryUploadId,
          makeDelta:Boolean(byId('adminMakeDelta')?.checked),
          makeFull:Boolean(byId('adminMakeFull')?.checked)
        })
      });
      setMessage('Arquivos recebidos. Recalculando e validando o painel.','working');
      startPolling(true);
    }catch(error){
      setMessage(error.message,'error');
      if(button) button.disabled=false;
    }
  }

  async function pollJob(){
    try{
      const payload=await request('/job');
      renderJob(payload.job||{},payload.panel||{});
    }catch(error){
      if(error.status===401){
        stopPolling();
        setAuthMode({authenticated:false,setupRequired:false});
      }
      setMessage(error.message,'error');
    }
  }

  function startPolling(immediate=false){
    if(pollTimer) return;
    if(immediate) pollJob();
    pollTimer=window.setInterval(pollJob,1200);
  }

  function stopPolling(){
    if(pollTimer){window.clearInterval(pollTimer);pollTimer=null;}
  }

  function reloadPanel(){
    const url=new URL(location.href);
    url.searchParams.set('atualizado',Date.now().toString());
    url.hash='administracao';
    location.replace(url.toString());
  }

  function updateSelectedFileLabels(){
    [
      ['adminIntegratedBaseFile','adminBaseFileName'],
      ['adminIntegratedDictionaryFile','adminDictionaryFileName']
    ].forEach(([inputId,labelId])=>{
      const input=byId(inputId),label=byId(labelId);
      if(!input||!label) return;
      const file=input.files?.[0];
      label.textContent=file?`${file.name} · ${formatBytes(file.size)}`:'Nenhum arquivo selecionado';
    });
  }

  function bindEvents(){
    byId('adminIntegratedAccessForm')?.addEventListener('submit',submitAccess);
    byId('adminIntegratedLogout')?.addEventListener('click',logout);
    byId('adminIntegratedUpdateButton')?.addEventListener('click',startUpdate);
    byId('adminRefreshStatusButton')?.addEventListener('click',pollJob);
    byId('adminReloadPanelButton')?.addEventListener('click',reloadPanel);
    byId('adminIntegratedBaseFile')?.addEventListener('change',updateSelectedFileLabels);
    byId('adminIntegratedDictionaryFile')?.addEventListener('change',updateSelectedFileLabels);
  }

  async function init(){
    syncPeriodFromLoadedData();
    bindEvents();
    try{
      const payload=await refreshStatus();
      if(location.hash==='#administracao') byId('administracao')?.scrollIntoView({behavior:'smooth'});
      if(payload.authenticated&&payload.job?.status==='running') startPolling();
    }catch(_){
      hideLocalAdministration();
    }
  }

  document.addEventListener('DOMContentLoaded',init);
})();
