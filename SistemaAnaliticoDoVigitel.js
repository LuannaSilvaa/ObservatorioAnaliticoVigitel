/**
 * Concentra o estado da análise, os filtros, a construção dos gráficos, as tabelas e as exportações.
 * Mudanças nesta camada devem ser acompanhadas pelos testes de gráficos, filtros e atualização automática.
 */

const THEME_STORAGE_KEY = 'vigitel-theme';
const THEME_MODE_STORAGE_KEY = 'vigitel-theme-mode';
const ANALYSIS_STORAGE_KEY = 'vigitel-analysis-state-v13.0';
const GRAPH_THEME_DEFAULTS = {
  light: {
    textColor:'#16324F',
    chartBgColor:'#FFFFFF',
    plotBgColor:'#FFFFFF',
    gridColor:'#DDE7F2',
    borderColor:'#D6E1EE'
  },
  dark: {
    textColor:'#E7EEF8',
    chartBgColor:'#0F1923',
    plotBgColor:'#111E2A',
    gridColor:'#30465A',
    borderColor:'#3A5168'
  }
};
const THEME_MEDIA_QUERY = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

/**
 * Determina se o painel deve usar o modo claro, o modo escuro ou a preferência do sistema.
 */
function resolveThemeMode(){
  try{
    return localStorage.getItem(THEME_MODE_STORAGE_KEY) || document.documentElement.dataset.themeMode || 'auto';
  }catch(error){
    return document.documentElement.dataset.themeMode || 'auto';
  }
}

/**
 * Define o tema efetivamente aplicado depois de interpretar a preferência escolhida.
 */
function resolveAppliedTheme(mode){
  if(mode === 'dark' || mode === 'light') return mode;
  return THEME_MEDIA_QUERY && THEME_MEDIA_QUERY.matches ? 'dark' : 'light';
}

/**
 * Retorna a preferência de tema atualmente selecionada pelo usuário.
 */
function currentThemeMode(){
  return document.documentElement.dataset.themeMode || 'auto';
}

/**
 * Retorna o tema visual que está ativo na página.
 */
function currentTheme(){
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

/**
 * Atualiza o estado visual e os atributos de acessibilidade dos botões de tema.
 */
function updateThemeButtons(mode, applied){
  $$('.theme-mode-btn').forEach(btn=>{
    const active = btn.dataset.themeMode === mode;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-pressed', String(active));
    const targetMode = btn.dataset.themeMode;
    const label = targetMode === 'auto' ? `Seguir o tema do sistema. Tema atual: ${applied === 'dark' ? 'escuro' : 'claro'}.` : `Ativar modo ${targetMode === 'dark' ? 'escuro' : 'claro'}`;
    btn.setAttribute('aria-label', label);
    btn.title = label;
  });
}

/**
 * Aplica ao gráfico as cores e os contrastes correspondentes ao tema visual.
 */
function applyGraphTheme(theme){
  const values = GRAPH_THEME_DEFAULTS[theme] || GRAPH_THEME_DEFAULTS.light;
  Object.entries(values).forEach(([id,value])=>{
    const field = $('#'+id);
    if(field) field.value = value;
  });
}

/**
 * Aplica a preferência de tema, salva a escolha e atualiza o gráfico quando necessário.
 */
function applyThemeMode(mode='auto', options={}){
  const selectedMode = ['auto','light','dark'].includes(mode) ? mode : 'auto';
  const actual = resolveAppliedTheme(selectedMode);
  const save = options.save !== false;
  const updateChart = options.updateChart !== false;
  const syncGraph = options.syncGraph !== false;
  document.documentElement.dataset.themeMode = selectedMode;
  document.documentElement.dataset.theme = actual;
  if(save){
    try{
      localStorage.setItem(THEME_MODE_STORAGE_KEY, selectedMode);
      localStorage.setItem(THEME_STORAGE_KEY, actual);
    }catch(error){}
  }
  const meta = $('#themeColorMeta');
  if(meta) meta.setAttribute('content', actual === 'dark' ? '#0B141E' : '#F7FAFD');
  updateThemeButtons(selectedMode, actual);
  if(syncGraph) applyGraphTheme(actual);
  if(updateChart && typeof S !== 'undefined' && S.theme && S.indicator && S.chart){
    scheduleGenerate(0);
  }
  requestAnimationFrame(()=>document.documentElement.classList.add('theme-ready'));
}

/**
 * Inicializa o tema antes da interação do usuário e conecta os botões de aparência.
 */
function initializeTheme(){
  applyThemeMode(resolveThemeMode(), {save:false, updateChart:false, syncGraph:false});
  $$('.theme-mode-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      applyThemeMode(btn.dataset.themeMode, {save:true, updateChart:true, syncGraph:true});
      saveAnalysisState();
    });
  });
  if(THEME_MEDIA_QUERY){
    /**
     * Reaplica o tema automático quando a preferência de aparência do sistema operacional é alterada.
     */
    const handler = ()=>{
      if(currentThemeMode() === 'auto') applyThemeMode('auto', {save:false, updateChart:true, syncGraph:true});
    };
    if(typeof THEME_MEDIA_QUERY.addEventListener === 'function') THEME_MEDIA_QUERY.addEventListener('change', handler);
    else if(typeof THEME_MEDIA_QUERY.addListener === 'function') THEME_MEDIA_QUERY.addListener(handler);
  }
}

const S = {
  theme: null,
  indicator: null,
  filters: false,
  chart: null,
  rows: [],
  tableRows: [],
  primaryTableRows: [],
  compareTableRows: [],
  hiddenCategories: [],
  legendSearch: '',
  graphMeta: null,
  compareEnabled: false,
  compareIndicatorId: null,
  lastGroup: null,
  lastPrimaryData: [],
  lastCompareData: []
};

const FAVORITES_STORAGE_KEY = 'vigitel-favorites';
const VERSION_HISTORY_STORAGE_KEY = 'vigitel-version-history';
const VERSION_HISTORY_LIMIT = 60;
let versionHistoryTimer = null;
const HISTORY_LIMIT = 40;
const PRECISION_CV_CAUTION = 20;
const PRECISION_CV_LOW = 35;
const PRECISION_CASES_LOW = 20;
const historyState = {undo:[], redo:[], applying:false, lastSignature:''};
let filterRefreshTimer = null;
const populationTransitionState = {
  lastPopulation: 'População Geral',
  savedYears: [],
  savedGroup: 'Automático',
  autoAdjustedGroup: false
};
const DATA_FILTER_IDS = new Set(['sexFilter','popFilter','regionFilter','ufFilter','groupFilter']);

/**
 * Informa se o evento partiu de um controle que altera os dados da análise.
 */
function isDataFilterTarget(target){
  if(!target) return false;
  if(DATA_FILTER_IDS.has(target.id)) return true;
  return Boolean(target.closest?.('#yearChecks, #ageDetailChecks, #ageChecks'));
}

const AUTOMATIC_UPDATE_IGNORED_IDS = new Set([
  'searchInput','legendSearchInput','tableSearch','tableSort','tablePageSize',
  'favoriteName','glossarySearch','exportPreset','exportTransparentBg',
  'compareEnabled','compareIndicator'
]);

/**
 * Identifica campos que alteram dados, recortes ou aparência da análise.
 * A verificação por contêiner também alcança controles incluídos futuramente
 * na lateral de filtros, sem exigir um novo evento para cada campo criado.
 */
function isAutomaticAnalysisTarget(target){
  if(!target?.matches?.('input, select, textarea')) return false;
  if(target.disabled || AUTOMATIC_UPDATE_IGNORED_IDS.has(target.id)) return false;
  if(isDataFilterTarget(target)) return true;
  if(target.closest?.('.filter-panel')) return true;
  return controlIds().includes(target.id);
}

/**
 * Encaminha toda alteração relevante para a mesma rotina de atualização.
 * Campos de texto, cores e controles deslizantes usam um pequeno intervalo
 * para evitar várias renderizações durante a digitação ou o arraste.
 */
function handleAutomaticAnalysisUpdate(event){
  const target = event.target;
  if(!isAutomaticAnalysisTarget(target)) return;
  const type = String(target.type || '').toLowerCase();
  const continuous = event.type === 'input' && ['text','search','range','color','number'].includes(type);
  queueFilterRefresh(target, continuous ? 70 : 0);
}

/**
 * Instala a atualização automática por delegação de eventos. Assim, filtros
 * recriados dinamicamente continuam funcionando sem ligações individuais.
 */
function bindAutomaticAnalysisUpdates(){
  document.addEventListener('change', handleAutomaticAnalysisUpdate, true);
  document.addEventListener('input', handleAutomaticAnalysisUpdate, true);
}

/**
 * Limpa a busca e as categorias ocultas da legenda quando o conjunto de dados muda.
 */
function clearLegendStateForNewData(){
  S.hiddenCategories = [];
  S.legendSearch = '';
  const search = $('#legendSearchInput');
  if(search) search.value = '';
}

/**
 * Descarta ResultadosProcessados em cache quando uma seleção modifica a análise.
 */
function invalidateAnalysisData(){
  analysisCache.clear();
  S.lastAnalysisSignature = '';
  S.lastPrimaryData = [];
  S.lastCompareData = [];
  S.lastGroup = null;
  S.rows = [];
}

/**
 * Padroniza o estado dos filtros para que valores ausentes e listas tenham formato consistente.
 */
function normalizeFilterState(changedTarget=null){
  const changedId = changedTarget?.id || '';
  const popField = $('#popFilter');
  const groupField = $('#groupFilter');
  const regionField = $('#regionFilter');
  const ufField = $('#ufFilter');
  const pop = popField?.value || 'População Geral';
  const supportsExactAge = exactAgeSupported(S.indicator?.id);

  if(changedTarget?.closest?.('#ageDetailChecks') && changedTarget.checked){
    $('#ageChecks input').forEach(input=>{ input.checked = false; });
  }
  if(changedTarget?.closest?.('#ageChecks') && changedTarget.checked){
    $('#ageDetailChecks input').forEach(input=>{ input.checked = false; });
  }

  if(changedId === 'ufFilter' && ufField){
    const uf = ufField.value;
    if(uf && !['Brasil','Nenhum'].includes(uf) && regionField){
      regionField.value = UF_REGION_MAP[uf] || 'Brasil';
    }
  }

  if(changedId === 'regionFilter' && regionField && ufField){
    const region = regionField.value;
    const uf = ufField.value;
    if(region && !['Brasil','Nenhum'].includes(region) && uf && !['Brasil','Nenhum'].includes(uf) && UF_REGION_MAP[uf] !== region){
      ufField.value = 'Brasil';
    }
  }

  if(groupField?.value === 'Idade detalhada' && !supportsExactAge){
    groupField.value = 'Faixa etária quinquenal';
  }

  if(changedTarget?.closest?.('#ageDetailChecks')){
    const hasAgeDetails = selectedChecks('#ageDetailChecks').length > 0;
    if(hasAgeDetails && supportsExactAge && groupField && ['Automático','Ano','Faixa etária quinquenal'].includes(groupField.value)){
      groupField.value = 'Idade detalhada';
    }
  }

  if(changedTarget?.closest?.('#ageChecks')){
    const hasAgeGroups = selectedChecks('#ageChecks').length > 0;
    if(hasAgeGroups && groupField?.value === 'Idade detalhada'){
      groupField.value = 'Faixa etária quinquenal';
    }
  }

  const enteringBlack = pop === 'População Negra' && populationTransitionState.lastPopulation !== 'População Negra';
  const leavingBlack = pop !== 'População Negra' && populationTransitionState.lastPopulation === 'População Negra';

  if(enteringBlack){
    populationTransitionState.savedYears = selectedChecks('#yearChecks');
    populationTransitionState.savedGroup = groupField?.value || 'Automático';
    populationTransitionState.autoAdjustedGroup = false;
    if(groupField?.value === 'Ano'){
      groupField.value = supportsExactAge ? 'Idade detalhada' : 'Faixa etária quinquenal';
      populationTransitionState.autoAdjustedGroup = true;
    }
  }

  enforcePopulationYearUI();

  if(leavingBlack){
    const available = new Set(availableYearsForIndicator(S.indicator?.id,pop));
    const saved = new Set(populationTransitionState.savedYears || []);
    $('#yearChecks input').forEach(input=>{
      input.checked = !input.disabled && saved.has(input.value) && available.has(input.value);
    });
    if(populationTransitionState.autoAdjustedGroup && groupField && ['Faixa etária quinquenal','Idade detalhada'].includes(groupField.value)){
      groupField.value = populationTransitionState.savedGroup || 'Automático';
    }
    populationTransitionState.autoAdjustedGroup = false;
  }

  populationTransitionState.lastPopulation = pop;
}

/**
 * Agrupa alterações sucessivas dos filtros e agenda uma única atualização da análise.
 */
function queueFilterRefresh(target, delay=0){
  clearTimeout(filterRefreshTimer);
  filterRefreshTimer = setTimeout(()=>{
    if(isDataFilterTarget(target)){
      normalizeFilterState(target);
      clearLegendStateForNewData();
      invalidateAnalysisData();
      refreshAnalysis({dataChanged:true});
    }else{
      refreshAnalysis({dataChanged:false});
    }
  }, Math.max(0, Number(delay) || 0));
}
const tableState = {page:1, pageSize:25, search:'', sort:'category-asc'};
const analysisCache = new Map();
let generateTimer = null;
let currentGenerationToken = 0;
let generationPromise = Promise.resolve(false);

const CHART_GUIDE = {
  line:{title:'Série temporal',use:'Mostra evolução ao longo do tempo.',best:'Ideal para anos ordenados e tendências.',avoid:'Evite quando as categorias não têm ordem temporal.'},
  area:{title:'Área',use:'Destaca a evolução e a magnitude acumulada visual.',best:'Boa para tendências com poucos pontos.',avoid:'Pode esconder detalhes quando há muitas séries.'},
  bar:{title:'Barras verticais',use:'Compara categorias independentes.',best:'Boa quando há poucas categorias e rótulos curtos.',avoid:'Para muitas idades, prefira barras horizontais.'},
  horizontal:{title:'Barras horizontais',use:'Compara categorias com rótulos longos.',best:'É uma das melhores opções para idade detalhada e rankings extensos.',avoid:'Evite apenas quando a ordem temporal for o foco.'},
  ranking:{title:'Ranking',use:'Ordena as categorias do maior para o menor.',best:'Ideal para identificar rapidamente maiores e menores valores.',avoid:'Não substitui uma série temporal.'},
  lollipop:{title:'Pirulito',use:'Compara valores com aparência mais leve que barras.',best:'Funciona bem com quantidade moderada de categorias.',avoid:'Com muitas categorias pode ficar longo.'},
  pareto:{title:'Pareto',use:'Combina barras ordenadas e linha acumulada.',best:'Ajuda a identificar quais categorias concentram a maior parcela.',avoid:'Não é indicado para leitura cronológica.'},
  pie:{title:'Pizza',use:'Mostra participação de cada categoria em um total.',best:'Use com poucas categorias e diferenças claras.',avoid:'Com mais de 8 a 12 categorias, barras são mais legíveis.'},
  donut:{title:'Rosca',use:'Mostra composição percentual com espaço central.',best:'Use com poucas categorias e legenda curta.',avoid:'Muitas categorias tornam as fatias difíceis de comparar.'},
  radar:{title:'Radar',use:'Compara o perfil de várias dimensões em uma forma única.',best:'Funciona melhor com 3 a 10 categorias.',avoid:'Com muitas idades, os rótulos e eixos ficam sobrecarregados.'},
  kpi:{title:'Cartões KPI',use:'Destaca poucos números principais.',best:'Ideal para até seis categorias prioritárias.',avoid:'Não mostra bem distribuição ou tendência completa.'},
  gauge:{title:'Medidor',use:'Destaca intensidade ou posição relativa de poucos valores.',best:'Use para síntese e apresentação.',avoid:'Não é bom para comparar muitas categorias.'},
  treemap:{title:'Treemap',use:'Representa proporções por áreas retangulares.',best:'Ajuda a enxergar participação relativa de categorias.',avoid:'Valores próximos podem ser difíceis de comparar com precisão.'}
};

const C = {
  year:0, region:1, uf:2, sex:3, age:4, pop:5, ind:6, num:7, den:8, n:9, cases:10, w2:11
};

const UF_NAMES = {
  AC:"Acre", AL:"Alagoas", AM:"Amazonas", AP:"Amapá", BA:"Bahia", CE:"Ceará",
  DF:"Distrito Federal", ES:"Espírito Santo", GO:"Goiás", MA:"Maranhão",
  MG:"Minas Gerais", MS:"Mato Grosso do Sul", MT:"Mato Grosso", PA:"Pará",
  PB:"Paraíba", PE:"Pernambuco", PI:"Piauí", PR:"Paraná", RJ:"Rio de Janeiro",
  RN:"Rio Grande do Norte", RO:"Rondônia", RR:"Roraima", RS:"Rio Grande do Sul",
  SC:"Santa Catarina", SE:"Sergipe", SP:"São Paulo", TO:"Tocantins"
};

const AGE_C = {year:0, uf:1, sex:2, age:3, pop:4, num:5, den:6, n:7, cases:8, w2:9};
const UF_REGION_MAP = {
  AC:'Norte',AL:'Nordeste',AM:'Norte',AP:'Norte',BA:'Nordeste',CE:'Nordeste',DF:'Centro-Oeste',ES:'Sudeste',GO:'Centro-Oeste',MA:'Nordeste',
  MG:'Sudeste',MS:'Centro-Oeste',MT:'Centro-Oeste',PA:'Norte',PB:'Nordeste',PE:'Nordeste',PI:'Nordeste',PR:'Sul',RJ:'Sudeste',RN:'Nordeste',
  RO:'Norte',RR:'Norte',RS:'Sul',SC:'Sul',SE:'Nordeste',SP:'Sudeste',TO:'Norte'
};
const AGE_DETAIL_LOADS = new Map();
const AGE_DETAIL_VERSION = window.VIGITEL_AGE_DETAIL?.meta?.version || 'edicaoAcademicaConsolidadaPlana';

/**
 * Informa se o indicador selecionado possui ResultadosProcessados válidos por idade exata.
 */
function exactAgeSupported(indicatorId){
  return Boolean(window.VIGITEL_AGE_DETAIL?.meta?.supportedIndicators?.includes(indicatorId));
}

/**
 * Explica por que a idade exata não está disponível para a combinação selecionada.
 */
function exactAgeUnsupportedReason(indicatorId){
  return window.VIGITEL_AGE_DETAIL?.meta?.unsupportedIndicators?.[indicatorId] || 'O indicador não possui uma regra de idade detalhada disponível.';
}

/**
 * Carrega sob demanda o arquivo de idade detalhada do indicador selecionado.
 */
function loadExactAgeIndicator(indicatorId){
  const ageStore = window.VIGITEL_AGE_DETAIL = window.VIGITEL_AGE_DETAIL || {loaded:{}, loadedVersion:{}};
  ageStore.loaded = ageStore.loaded || {};
  ageStore.loadedVersion = ageStore.loadedVersion || {};
  if(ageStore.loaded[indicatorId] && ageStore.loadedVersion[indicatorId] === AGE_DETAIL_VERSION) return Promise.resolve(ageStore.loaded[indicatorId]);
  if(!exactAgeSupported(indicatorId)) return Promise.reject(new Error(exactAgeUnsupportedReason(indicatorId)));
  if(AGE_DETAIL_LOADS.has(indicatorId)) return AGE_DETAIL_LOADS.get(indicatorId);
  const promise = new Promise((resolve,reject)=>{
    const script=document.createElement('script');
    const indicatorFile=window.VIGITEL_AGE_DETAIL?.meta?.files?.[indicatorId];
    if(!indicatorFile){ reject(new Error(`O catálogo não informa o arquivo de idade detalhada de ${indicatorId}.`)); return; }
    script.src=`${encodeURIComponent(indicatorFile)}?edicao=${encodeURIComponent(AGE_DETAIL_VERSION)}`;
    script.async=true;
    script.onload=()=>{
      const rows=window.VIGITEL_AGE_DETAIL?.loaded?.[indicatorId];
      if(rows){
        window.VIGITEL_AGE_DETAIL.loadedVersion[indicatorId] = AGE_DETAIL_VERSION;
        resolve(rows);
      }else reject(new Error(`O arquivo de idade detalhada de ${indicatorId} não retornou dados.`));
    };
    script.onerror=()=>reject(new Error(`Não foi possível carregar a idade detalhada de ${indicatorId}.`));
    document.head.appendChild(script);
  }).finally(()=>AGE_DETAIL_LOADS.delete(indicatorId));
  AGE_DETAIL_LOADS.set(indicatorId,promise);
  return promise;
}

/**
 * Aplica os filtros ativos às linhas calculadas por idade exata.
 */
function filterExactAgeRows(filters, indicatorId){
  const all=window.VIGITEL_AGE_DETAIL?.loaded?.[indicatorId] || [];
  const dims=window.VIGITEL_AGE_DETAIL?.dims;
  if(!dims || !all.length) return [];
  const validYears=filters.pop==='População Negra' ? ['2018'] : (filters.years.length ? filters.years : dims.years);
  const yearSet=new Set(validYears);
  const selectedAges=new Set(filters.ageDetails || []);
  const selectedBands=new Set(filters.ages || []);
  return all.filter(row=>{
    const year=dims.years[row[AGE_C.year]];
    const uf=dims.ufs[row[AGE_C.uf]];
    const sex=dims.sexes[row[AGE_C.sex]];
    const age=dims.ages[row[AGE_C.age]];
    const pop=dims.pops[row[AGE_C.pop]];
    if(!yearSet.has(year)) return false;
    if(filters.sex!=='Nenhum' && filters.sex!=='Todos' && sex!==filters.sex) return false;
    if(filters.pop!=='Nenhum' && filters.pop!=='Todas' && pop!==filters.pop) return false;
    if(filters.uf!=='Nenhum' && filters.uf!=='Brasil' && uf!==filters.uf) return false;
    if((filters.uf==='Nenhum'||filters.uf==='Brasil') && filters.region!=='Nenhum' && filters.region!=='Brasil' && UF_REGION_MAP[uf]!==filters.region) return false;
    if(selectedAges.size && !selectedAges.has(age)) return false;
    if(!selectedAges.size && selectedBands.size && !selectedBands.has(detailToAgeGroup(age))) return false;
    return true;
  });
}

/**
 * Agrupa as linhas de idade exata e calcula numeradores, denominadores e entrevistas.
 */
function aggregateExactRows(rows, group){
  const dims=window.VIGITEL_AGE_DETAIL?.dims;
  const realGroup=effectiveGroup(group);
  const map=new Map();
  rows.forEach(row=>{
    const year=dims.years[row[AGE_C.year]];
    const uf=dims.ufs[row[AGE_C.uf]];
    const sex=dims.sexes[row[AGE_C.sex]];
    const age=dims.ages[row[AGE_C.age]];
    let category='';
    if(realGroup==='Ano') category=year;
    else if(realGroup==='Região') category=UF_REGION_MAP[uf];
    else if(realGroup==='UF') category=uf;
    else if(realGroup==='Sexo') category=sex;
    else if(realGroup==='Faixa etária quinquenal') category=detailToAgeGroup(age);
    else category=age;
    if(!category) return;
    if(!map.has(category)) map.set(category,{category,numerador:0,denominador:0,n:0,cases:0,w2:0});
    const item=map.get(category);
    item.numerador+=Number(row[AGE_C.num])||0;
    item.denominador+=Number(row[AGE_C.den])||0;
    item.n+=Number(row[AGE_C.n])||0;
    item.cases+=Number(row[AGE_C.cases])||0;
    item.w2+=Number(row[AGE_C.w2])||0;
  });
  const data=Array.from(map.values()).filter(d=>d.denominador>0).map(d=>({...d,value:d.numerador/d.denominador*100}));
  if(realGroup==='Idade detalhada' || realGroup==='Faixa etária quinquenal') data.sort((a,b)=>sortKey(a.category,realGroup)-sortKey(b.category,realGroup) || String(a.category).localeCompare(String(b.category),'pt-BR',{numeric:true}));
  else if(realGroup==='Ano') data.sort((a,b)=>Number(a.category)-Number(b.category));
  return data;
}


const DETAILED_AGES = Array.from({length: 63}, (_, i) => i + 18).map(age => age === 80 ? "80 anos ou mais" : `${age} anos`);
const AGE_DETAIL_MAP = {
  "18 a 24 anos": DETAILED_AGES.filter(label => { const n = Number(label.split(" ")[0]); return n >= 18 && n <= 24; }),
  "25 a 34 anos": DETAILED_AGES.filter(label => { const n = Number(label.split(" ")[0]); return n >= 25 && n <= 34; }),
  "35 a 44 anos": DETAILED_AGES.filter(label => { const n = Number(label.split(" ")[0]); return n >= 35 && n <= 44; }),
  "45 a 54 anos": DETAILED_AGES.filter(label => { const n = Number(label.split(" ")[0]); return n >= 45 && n <= 54; }),
  "55 a 64 anos": DETAILED_AGES.filter(label => { const n = Number(label.split(" ")[0]); return n >= 55 && n <= 64; }),
  "65 anos ou mais": DETAILED_AGES.filter(label => { const n = Number(label.split(" ")[0]); return n >= 65; })
};

/**
 * Converte idade detalhada para o grupo etário adulto correspondente.
 */
function detailToAgeGroup(detailLabel) {
  const age = Number(String(detailLabel).split(" ")[0]);
  if (!Number.isFinite(age)) return "";
  if (age >= 18 && age <= 24) return "18 a 24 anos";
  if (age >= 25 && age <= 34) return "25 a 34 anos";
  if (age >= 35 && age <= 44) return "35 a 44 anos";
  if (age >= 45 && age <= 54) return "45 a 54 anos";
  if (age >= 55 && age <= 64) return "55 a 64 anos";
  return "65 anos ou mais";
}
/**
 * Retorna as idades detalhadas associadas a cada faixa etária adulta.
 */
function detailsFromGroup(groupLabel) { return AGE_DETAIL_MAP[groupLabel] || []; }

const chartTypes = [
  ["line","Série temporal","L"],["area","Área","A"],["bar","Barras verticais","B"],
  ["horizontal","Barras horizontais","H"],["ranking","Ranking","R"],["lollipop","Pirulito","I"],
  ["pareto","Pareto","T"],["pie","Pizza","P"],["donut","Rosca","D"],["radar","Radar","D"],
  ["kpi","Cartões KPI","K"],["gauge","Medidor","G"],["treemap","Treemap","M"]
];

/**
 * Inicializa o painel, monta os blocos, filtros e mensagens iniciais sem gerar seleção automática.
 */
function init(){
  initializeTheme();
  buildHeaderStatus();
  renderThemes();
  renderIndicators();
  renderFilterBlock();
  renderChartBlocks();
  renderFilters();
  renderCompareIndicators();
  renderSlots();
  updateChartExplanation();
  bindEvents();
  $('#resultTitle').textContent = 'Monte a análise selecionando tema, indicador, filtros e gráfico';
  $('#resultSubtitle').textContent = '';
  $('#chart').innerHTML = `<div class="panel-subtitle">Selecione um tema, um indicador e um tipo de gráfico para gerar a visualização.</div>`;
  const sharedLoaded = applySharedConfigurationFromHash();
  if(!sharedLoaded) restoreAnalysisState();
  upgradeAccessibility();
}

/**
 * Mostra um resumo da base carregada, indicando quantidade de linhas, indicadores e período.
 */
function buildHeaderStatus(){
  $('#dataStatus').textContent = `Base agregada: ${DATA.meta.rows.toLocaleString('pt-BR')} linhas · ${DATA.indicators.length} indicadores · idade detalhada recalculada diretamente de q6 para os indicadores compatíveis · ${DATA.meta.yearsLabel}.`;
}

/**
 * Padroniza textos para buscas e comparações, removendo diferenças de acentuação e caixa.
 */
function normalizeText(value=''){
  return String(value || '').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().trim();
}

/**
 * Cria um identificador estável para comparar categorias da legenda.
 */
function categoryToken(label){
  return normalizeText(label);
}

/**
 * Verifica se a categoria corresponde ao texto digitado na busca da legenda.
 */
function matchesLegendSearch(label, explicitTerm=''){
  const term = normalizeText(explicitTerm || S.legendSearch || $('#legendSearchInput')?.value || '');
  if(!term) return true;
  return categoryToken(label).includes(term);
}

/**
 * Informa se a categoria foi ocultada manualmente pelo usuário.
 */
function isHiddenCategory(label){
  return (S.hiddenCategories || []).includes(categoryToken(label));
}

/**
 * Alterna a visibilidade de uma categoria sem modificar os dados originais.
 */
function toggleHiddenCategory(label){
  const key = categoryToken(label);
  const hidden = new Set(S.hiddenCategories || []);
  if(hidden.has(key)) hidden.delete(key); else hidden.add(key);
  S.hiddenCategories = Array.from(hidden);
  scheduleGenerate(0);
  saveAnalysisState();
}

/**
 * Torna novamente visíveis todas as categorias ocultadas na legenda.
 */
function revealAllCategories(){
  S.hiddenCategories = [];
  const search = $('#legendSearchInput');
  if(search) search.value = '';
  S.legendSearch = '';
  scheduleGenerate(0);
  saveAnalysisState();
}

/**
 * Lista os identificadores dos controles cuja configuração pode ser salva e restaurada.
 */
function controlIds(){
  return ['customTitle','customSubtitle','sourceText','xAxisTitle','yAxisTitle','fontFamily','titleAlign','subtitleAlign','sourceAlign','titleSize','subtitleSize','fontSize','axisSize','valueSize','legendSize','primaryColor','secondaryColor','textColor','chartBgColor','plotBgColor','gridColor','borderColor','paletteSelect','showBorder','showXAxisTitle','showYAxisTitle','showAxisLabels','showGrid','labelRotation','decimalPlaces','sortOrder','showValues','valuePosition','showLegend','legendPosition','showSource','barWidthScale','lineWidth','pointSize','showPoints','donutHole','showTreemapLabels'];
}

/**
 * Lê os valores atuais dos controles visuais e devolve uma cópia da configuração.
 */
function getControlSnapshot(){
  const snapshot = {};
  controlIds().forEach(id=>{
    const el = $('#'+id);
    if(!el) return;
    snapshot[id] = el.type === 'checkbox' ? el.checked : el.value;
  });
  return snapshot;
}

/**
 * Restaura os valores dos controles visuais a partir de uma configuração salva.
 */
function applyControlSnapshot(snapshot={}){
  controlIds().forEach(id=>{
    if(Object.prototype.hasOwnProperty.call(snapshot, id)) setControlValue(id, snapshot[id]);
  });
  updateSummaries();
}

/**
 * Lê o estado atual dos filtros e devolve uma cópia independente.
 */
function getFilterSnapshot(){
  return {
    sex: $('#sexFilter')?.value || 'Todos',
    pop: $('#popFilter')?.value || 'População Geral',
    region: $('#regionFilter')?.value || 'Brasil',
    uf: $('#ufFilter')?.value || 'Brasil',
    group: $('#groupFilter')?.value || 'Automático',
    years: selectedChecks('#yearChecks'),
    ageDetails: selectedChecks('#ageDetailChecks'),
    ages: selectedChecks('#ageChecks')
  };
}

/**
 * Restaura os filtros a partir de uma configuração salva.
 */
function applyFilterSnapshot(snapshot={}){
  setControlValue('sexFilter', snapshot.sex || 'Todos');
  setControlValue('popFilter', snapshot.pop || 'População Geral');
  setControlValue('regionFilter', snapshot.region || 'Brasil');
  setControlValue('ufFilter', snapshot.uf || 'Brasil');
  setControlValue('groupFilter', snapshot.group || 'Automático');
  const yearSet = new Set(snapshot.years || []);
  const ageDetailSet = new Set(snapshot.ageDetails || []);
  const ageSet = new Set(snapshot.ages || []);
  $$('#yearChecks input').forEach(i=>i.checked = yearSet.has(i.value));
  $$('#ageDetailChecks input').forEach(i=>i.checked = ageDetailSet.has(i.value));
  $$('#ageChecks input').forEach(i=>i.checked = ageSet.has(i.value));
  populationTransitionState.lastPopulation = snapshot.pop || 'População Geral';
  normalizeFilterState();
  invalidateAnalysisData();
  updateSummaries();
}

/**
 * Reúne tema, indicador, gráfico, filtros e aparência em um único estado da análise.
 */
function captureAnalysisState(){
  return {
    themeMode: currentThemeMode(),
    selectedThemeId: S.theme?.id || null,
    selectedIndicatorId: S.indicator?.id || null,
    selectedChart: S.chart || null,
    filtersSelected: Boolean(S.filters),
    filters: getFilterSnapshot(),
    controls: getControlSnapshot(),
    legendSearch: $('#legendSearchInput')?.value || S.legendSearch || '',
    hiddenCategories: [...(S.hiddenCategories || [])],
    compareEnabled: $('#compareEnabled')?.checked || S.compareEnabled || false,
    compareIndicatorId: $('#compareIndicator')?.value || S.compareIndicatorId || null,
    table: {
      pageSize: Number($('#tablePageSize')?.value || tableState.pageSize || 25),
      search: $('#tableSearch')?.value || tableState.search || '',
      sort: $('#tableSort')?.value || tableState.sort || 'category-asc'
    }
  };
}

/**
 * Monta uma assinatura estável do estado para detectar alterações repetidas.
 */
function stateSignature(state){
  return JSON.stringify(state);
}

/**
 * Salva a configuração atual da análise no armazenamento do navegador.
 */
function saveAnalysisState(options={}){
  try{
    localStorage.setItem(ANALYSIS_STORAGE_KEY, JSON.stringify(captureAnalysisState()));
  }catch(error){}
  if(options.recordVersion !== false && !historyState.applying && hasRequiredBlocks()){
    scheduleVersionRecord(options.action || 'Análise alterada', Number(options.delay || 1100));
  }
}

/**
 * Aplica uma configuração completa e sincroniza seleções, filtros e aparência.
 */
function applyAnalysisState(payload, options={}){
  if(!payload || typeof payload !== 'object') return;
  historyState.applying = true;
  try{
    if(payload.themeMode) applyThemeMode(payload.themeMode, {save:options.saveTheme !== false, updateChart:false, syncGraph:false});
    S.theme = payload.selectedThemeId ? (DATA.themes.find(t=>t.id===payload.selectedThemeId) || null) : null;
    S.indicator = payload.selectedIndicatorId ? (DATA.indicators.find(i=>i.id===payload.selectedIndicatorId) || null) : null;
    S.chart = payload.selectedChart || null;
    S.filters = payload.filtersSelected !== false;
    renderAll();
    renderCompareIndicators();
    if(payload.filters) applyFilterSnapshot(payload.filters);
    if(payload.controls) applyControlSnapshot(payload.controls);
    S.hiddenCategories = Array.isArray(payload.hiddenCategories) ? [...payload.hiddenCategories] : [];
    S.legendSearch = payload.legendSearch || '';
    const legendSearchInput = $('#legendSearchInput');
    if(legendSearchInput) legendSearchInput.value = S.legendSearch;
    S.compareEnabled = Boolean(payload.compareEnabled);
    S.compareIndicatorId = payload.compareIndicatorId || null;
    if($('#compareEnabled')) $('#compareEnabled').checked = S.compareEnabled;
    if($('#compareIndicator') && S.compareIndicatorId) $('#compareIndicator').value = S.compareIndicatorId;
    if(payload.table){
      tableState.pageSize = Number(payload.table.pageSize || 25);
      tableState.search = payload.table.search || '';
      tableState.sort = payload.table.sort || 'category-asc';
      if($('#tablePageSize')) $('#tablePageSize').value = String(tableState.pageSize);
      if($('#tableSearch')) $('#tableSearch').value = tableState.search;
      if($('#tableSort')) $('#tableSort').value = tableState.sort;
    }
    updateChartExplanation();
    if(options.generate !== false && hasRequiredBlocks()) generate({recordHistory:false, save:false});
  }finally{
    historyState.applying = false;
  }
}

/**
 * Recupera a última análise salva e a aplica ao painel.
 */
function restoreAnalysisState(){
  try{
    const raw = localStorage.getItem(ANALYSIS_STORAGE_KEY);
    if(!raw){
      recordHistory(true);
      return false;
    }
    const payload = JSON.parse(raw);
    applyAnalysisState(payload, {generate:true, saveTheme:false});
    recordHistory(true);
    return true;
  }catch(error){
    console.error('Não foi possível restaurar a análise salva.', error);
    recordHistory(true);
    return false;
  }
}

/**
 * Registra o estado atual nas pilhas de desfazer e refazer.
 */
function recordHistory(force=false){
  if(historyState.applying) return;
  const state = captureAnalysisState();
  const signature = stateSignature(state);
  if(!force && signature === historyState.lastSignature) return;
  historyState.undo.push(state);
  if(historyState.undo.length > HISTORY_LIMIT) historyState.undo.shift();
  historyState.redo = [];
  historyState.lastSignature = signature;
  updateHistoryButtons();
}

/**
 * Habilita ou desabilita os botões de histórico conforme as ações disponíveis.
 */
function updateHistoryButtons(){
  const undo = $('#undoAction');
  const redo = $('#redoAction');
  if(undo) undo.disabled = historyState.undo.length <= 1;
  if(redo) redo.disabled = historyState.redo.length === 0;
}

/**
 * Restaura o estado anterior da análise.
 */
function undoAnalysis(){
  if(historyState.undo.length <= 1) return;
  const current = historyState.undo.pop();
  historyState.redo.push(current);
  const previous = historyState.undo[historyState.undo.length - 1];
  historyState.lastSignature = stateSignature(previous);
  applyAnalysisState(previous, {generate:true, saveTheme:true});
  saveAnalysisState();
  updateHistoryButtons();
}

/**
 * Reaplica o estado que foi desfeito mais recentemente.
 */
function redoAnalysis(){
  if(!historyState.redo.length) return;
  const next = historyState.redo.pop();
  historyState.undo.push(next);
  historyState.lastSignature = stateSignature(next);
  applyAnalysisState(next, {generate:true, saveTheme:true});
  saveAnalysisState();
  updateHistoryButtons();
}

/**
 * Retorna as versões da análise salvas no navegador.
 */
function getVersionHistory(){
  try{
    const raw = localStorage.getItem(VERSION_HISTORY_STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  }catch(error){ return []; }
}

/**
 * Grava a lista de versões da análise no navegador.
 */
function setVersionHistory(list){
  try{ localStorage.setItem(VERSION_HISTORY_STORAGE_KEY, JSON.stringify(list.slice(0,VERSION_HISTORY_LIMIT))); }catch(error){}
}

/**
 * Produz um resumo curto da configuração guardada em uma versão.
 */
function versionSummary(state){
  const indicator = DATA.indicators.find(i=>i.id===state?.selectedIndicatorId)?.label || 'Sem indicador';
  const chart = chartTypes.find(c=>c[0]===state?.selectedChart)?.[1] || 'Sem gráfico';
  const filters = state?.filters || {};
  const details = [];
  if(filters.group && filters.group !== 'Automático') details.push(filters.group);
  if(filters.sex && !['Todos','Nenhum'].includes(filters.sex)) details.push(filters.sex);
  if(filters.region && !['Brasil','Nenhum'].includes(filters.region)) details.push(filters.region);
  if(filters.uf && !['Brasil','Nenhum'].includes(filters.uf)) details.push(filters.uf);
  if(Array.isArray(filters.years) && filters.years.length) details.push(`${filters.years.length} ano(s)`);
  if(Array.isArray(filters.ageDetails) && filters.ageDetails.length) details.push(`${filters.ageDetails.length} idade(s)`);
  return `${indicator} · ${chart}${details.length ? ' · ' + details.join(' · ') : ''}`;
}

/**
 * Acrescenta uma nova entrada ao histórico de versões.
 */
function addVersionRecord(action='Análise alterada', options={}){
  if(options.force || action !== 'Análise alterada') clearTimeout(versionHistoryTimer);
  if(historyState.applying && !options.force) return;
  const state = options.state || captureAnalysisState();
  if(!state?.selectedIndicatorId && !options.force) return;
  const signature = stateSignature(state);
  const list = getVersionHistory();
  const latest = list[0];
  if(!options.force && latest && latest.signature === signature && latest.action === action) return;
  const item = {
    id:`version-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
    action,
    createdAt:new Date().toISOString(),
    summary:versionSummary(state),
    signature,
    state
  };
  list.unshift(item);
  setVersionHistory(list);
  if($('#versionHistoryDialog')?.open) renderVersionHistory();
}

/**
 * Agenda o registro de uma versão depois que as alterações atuais terminarem.
 */
function scheduleVersionRecord(action='Análise alterada', delay=1100){
  clearTimeout(versionHistoryTimer);
  versionHistoryTimer = setTimeout(()=>addVersionRecord(action), delay);
}

/**
 * Monta a lista de versões salvas e seus controles de restauração e exclusão.
 */
function renderVersionHistory(){
  const box=$('#versionHistoryList');
  if(!box) return;
  const list=getVersionHistory();
  if(!list.length){
    box.innerHTML='<div class="version-empty">Nenhuma versão registrada ainda. As alterações, salvamentos, restaurações e exportações aparecerão aqui.</div>';
    return;
  }
  box.innerHTML=list.map(item=>{
    const date=new Date(item.createdAt);
    const stamp=Number.isNaN(date.getTime())?'Data indisponível':date.toLocaleString('pt-BR');
    return `<article class="version-item"><div><strong><span class="version-badge">${esc(item.action)}</span>${esc(item.summary||'Análise')}</strong><small>${esc(stamp)}</small></div><div class="version-actions"><button class="btn primary" type="button" data-restore-version="${esc(item.id)}">Restaurar</button><button class="btn" type="button" data-delete-version="${esc(item.id)}">Excluir</button></div></article>`;
  }).join('');
}

/**
 * Restaura a configuração guardada em uma versão específica.
 */
function restoreVersionRecord(id){
  const item=getVersionHistory().find(version=>version.id===id);
  if(!item) return;
  applyAnalysisState(item.state,{generate:true,saveTheme:true});
  saveAnalysisState({recordVersion:false});
  recordHistory(true);
  addVersionRecord('Versão restaurada',{force:true});
  $('#versionHistoryDialog')?.close();
  announceSave(`Versão de ${new Date(item.createdAt).toLocaleString('pt-BR')} restaurada.`);
}

/**
 * Remove uma versão salva do histórico.
 */
function deleteVersionRecord(id){
  setVersionHistory(getVersionHistory().filter(version=>version.id!==id));
  renderVersionHistory();
}

/**
 * Apaga o histórico de versões após a confirmação do usuário.
 */
function clearVersionHistory(){
  if(!confirm('Deseja apagar todo o histórico de versões salvo neste navegador?')) return;
  setVersionHistory([]);
  renderVersionHistory();
  announceSave('Histórico de versões apagado.');
}

/**
 * Retorna as análises favoritas salvas no navegador.
 */
function getFavorites(){
  try{
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  }catch(error){ return []; }
}

/**
 * Grava a lista de análises favoritas no navegador.
 */
function setFavorites(list){
  try{ localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(list)); }catch(error){}
}

/**
 * Salva a análise atual como favorita com o nome informado.
 */
function saveCurrentFavorite(){
  const field = $('#favoriteName');
  const name = (field?.value || '').trim() || `${S.indicator?.label || 'Análise'} - ${new Date().toLocaleDateString('pt-BR')}`;
  const list = getFavorites();
  list.unshift({id:`fav-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,name,createdAt:new Date().toISOString(),state:captureAnalysisState()});
  setFavorites(list.slice(0,30));
  if(field) field.value = '';
  renderFavorites();
  announceSave(`Favorita "${name}" salva.`);
}

/**
 * Carrega uma análise favorita e atualiza o painel.
 */
function loadFavorite(id){
  const favorite = getFavorites().find(item=>item.id===id);
  if(!favorite) return;
  applyAnalysisState(favorite.state, {generate:true, saveTheme:true});
  saveAnalysisState();
  recordHistory(true);
  $('#favoritesDialog')?.close();
  announceSave(`Favorita "${favorite.name}" carregada.`);
}

/**
 * Remove uma análise da lista de favoritas.
 */
function deleteFavorite(id){
  setFavorites(getFavorites().filter(item=>item.id!==id));
  renderFavorites();
}

/**
 * Monta a lista de análises favoritas e seus botões de ação.
 */
function renderFavorites(){
  const box = $('#favoriteList');
  if(!box) return;
  const list = getFavorites();
  if(!list.length){
    box.innerHTML = '<p class="panel-subtitle">Nenhuma análise favorita salva ainda.</p>';
    return;
  }
  box.innerHTML = list.map(item=>`<article class="favorite-item"><div><strong>${esc(item.name)}</strong><small>${new Date(item.createdAt).toLocaleString('pt-BR')} · ${esc(item.state?.selectedIndicatorId || 'Sem indicador')}</small></div><div class="favorite-actions"><button class="btn" type="button" data-load-favorite="${esc(item.id)}">Abrir</button><button class="btn" type="button" data-delete-favorite="${esc(item.id)}">Excluir</button></div></article>`).join('');
}

/**
 * Codifica o estado da análise para incluí-lo no endereço compartilhável.
 */
function encodeSharedState(state){
  const json = JSON.stringify(state);
  return btoa(unescape(encodeURIComponent(json))).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
}

/**
 * Decodifica o estado recebido por endereço e reconstrói a configuração da análise.
 */
function decodeSharedState(value){
  const normalized = value.replaceAll('-','+').replaceAll('_','/');
  const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4);
  return JSON.parse(decodeURIComponent(escape(atob(padded))));
}

/**
 * Copia um endereço com a configuração atual ou baixa um arquivo quando a cópia não é permitida.
 */
async function shareConfiguration(){
  const encoded = encodeSharedState(captureAnalysisState());
  const url = `${location.href.split('#')[0]}#config=${encoded}`;
  try{
    await navigator.clipboard.writeText(url);
    announceSave('Link da configuração copiado. Ele funciona quando o painel está publicado na web.');
  }catch(error){
    const blob = new Blob([JSON.stringify(captureAnalysisState(),null,2)], {type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'Configuracao Vigitel.json';
    a.click();
    URL.revokeObjectURL(a.href);
    announceSave('A configuração foi baixada em JSON porque o navegador não permitiu copiar o link.');
  }
}

/**
 * Lê a configuração presente no endereço e a aplica ao painel.
 */
function applySharedConfigurationFromHash(){
  const match = location.hash.match(/^#config=(.+)$/);
  if(!match) return false;
  try{
    const state = decodeSharedState(match[1]);
    applyAnalysisState(state, {generate:true, saveTheme:true});
    saveAnalysisState();
    recordHistory(true);
    announceSave('Configuração compartilhada carregada.');
    return true;
  }catch(error){
    console.error('Configuração compartilhada inválida.', error);
    return false;
  }
}

/**
 * Exibe mensagens de salvamento e atualização para o usuário e para tecnologias assistivas.
 */
function announceSave(message='Análise salva no navegador.'){
  const status = $('#analysisSaveStatus');
  if(status) status.textContent = message;
}

/**
 * Executa uma rotina protegida e registra a falha sem interromper toda a interface.
 */
function safeRun(label, callback){
  try{
    return callback();
  }catch(error){
    console.error(`[${label}]`, error);
    return null;
  }
}

/**
 * Atualiza a orientação exibida de acordo com o tipo de gráfico e o volume de categorias.
 */
function updateChartAdvice(data, group){
  const advice = $('#chartAdvice');
  if(!advice) return;
  const count = data.length;
  const messages = [];
  if(['pie','donut'].includes(S.chart) && count > 12) messages.push('Este gráfico tem muitas categorias. Barras horizontais ou ranking podem facilitar a leitura.');
  if(S.chart === 'radar' && count > 10) messages.push('O radar ficou com muitas categorias. Para comparar melhor, experimente barras horizontais, ranking ou menos grupos.');
  if(['bar','pareto'].includes(S.chart) && count > 18) messages.push('Há muitas categorias para leitura detalhada. Use tela cheia ou experimente barras horizontais.');
  if(group === 'Idade detalhada' && count > 20) messages.push('Idade detalhada pode ficar extensa. O botão Tela cheia e a busca na legenda ajudam bastante.');
  const veryLow=(S.tableRows||[]).filter(row=>row.PrecisaoChave==='low').length;
  const caution=(S.tableRows||[]).filter(row=>row.PrecisaoChave==='care').length;
  if(veryLow) messages.push(`${veryLow} categoria(s) possuem 20 casos ou menos ou CV aproximado igual/superior a 35%.`);
  if(caution) messages.push(`${caution} categoria(s) possuem CV aproximado entre 20% e 35%.`);
  if(S.compareEnabled) messages.push('A comparação usa exatamente os mesmos filtros e o mesmo tipo de gráfico nos dois indicadores.');
  advice.classList.toggle('show', messages.length > 0);
  advice.textContent = messages.join(' ');
}

/**
 * Complementa rótulos, estados e navegação por teclado dos controles existentes.
 */
function upgradeAccessibility(){
  $$('.block-card, .theme-header, .theme-indicator-item').forEach(el=>{
    if(!el.hasAttribute('tabindex')) el.tabIndex = 0;
    if(!el.hasAttribute('role')) el.setAttribute('role','button');
  });
}

/**
 * Monta a comparação entre indicadores usando o mesmo conjunto de filtros.
 */
function renderCompareIndicators(){
  const select = $('#compareIndicator');
  if(!select) return;
  const current = select.value || S.compareIndicatorId || '';
  const grouped = DATA.themes.map(theme=>{
    const options = DATA.indicators.filter(ind=>ind.themeId===theme.id).map(ind=>`<option value="${esc(ind.id)}" ${ind.id===S.indicator?.id?'disabled':''}>${esc(ind.label)}</option>`).join('');
    return options ? `<optgroup label="${esc(theme.label)}">${options}</optgroup>` : '';
  }).join('');
  select.innerHTML = '<option value="">Escolha o segundo indicador</option>' + grouped;
  const preferred = current && current!==S.indicator?.id && DATA.indicators.some(i=>i.id===current) ? current : DATA.indicators.find(i=>i.id!==S.indicator?.id)?.id || '';
  select.value = preferred;
  S.compareIndicatorId = preferred || null;
}

/**
 * Atualiza o texto que explica a leitura do gráfico atual.
 */
function updateChartExplanation(){
  const box = $('#chartExplanation');
  if(!box) return;
  const guide = CHART_GUIDE[S.chart];
  if(!guide){
    box.innerHTML = '<strong>Escolha um tipo de gráfico</strong>Ao selecionar uma visualização, aparecerão orientações de uso e leitura.';
    return;
  }
  box.innerHTML = `<strong>${esc(guide.title)}</strong><span>${esc(guide.use)} <b>Recomendado:</b> ${esc(guide.best)} <b>Atenção:</b> ${esc(guide.avoid)}</span>`;
}

/**
 * Calcula erro padrão, intervalo de confiança e coeficiente de variação da estimativa.
 */
function estimatePrecision(item){
  const numerator=Number(item?.numerador ?? item?.Numerador) || 0;
  const denominator=Number(item?.denominador ?? item?.Denominador) || 0;
  const n=Number(item?.n ?? item?.Entrevistas) || 0;
  const cases=Number(item?.cases ?? item?.Casos) || 0;
  const w2=Number(item?.w2 ?? item?.SomaPesoQuadrado) || 0;
  const p=denominator>0 ? Math.max(0,Math.min(1,numerator/denominator)) : 0;
  const nEffective=w2>0 ? (denominator*denominator)/w2 : n;
  const se=(nEffective>0) ? Math.sqrt(Math.max(0,p*(1-p)/nEffective)) : NaN;
  const low=Number.isFinite(se) ? Math.max(0,(p-1.96*se)*100) : NaN;
  const high=Number.isFinite(se) ? Math.min(100,(p+1.96*se)*100) : NaN;
  const cv=(p>0 && Number.isFinite(se)) ? (se/p)*100 : NaN;
  let key='ok', label='Maior precisão relativa', className='reliability-ok';
  if(cases<=PRECISION_CASES_LOW || (Number.isFinite(cv) && cv>=PRECISION_CV_LOW)){
    key='low'; label='Baixa precisão; não interpretar isoladamente'; className='reliability-low';
  }else if(!Number.isFinite(cv) || cv>=PRECISION_CV_CAUTION){
    key='care'; label='Interpretar com cautela'; className='reliability-care';
  }
  return {key,label,className,low,high,cv,nEffective,cases,n};
}

/**
 * Classifica a estabilidade da estimativa com base na amostra e no coeficiente de variação.
 */
function sampleReliability(n){
  return estimatePrecision({n,Entrevistas:n,Casos:0});
}

/**
 * Mostra ou oculta o estado de carregamento durante cálculos e renderizações.
 */
function updateLoading(show){
  const mask = $('#chartLoading');
  if(mask){
    mask.classList.toggle('show', Boolean(show));
    mask.setAttribute('aria-hidden', String(!show));
  }
}

/**
 * Agenda a geração do gráfico para evitar execuções repetidas durante alterações rápidas.
 */
function scheduleGenerate(delay=0){
  clearTimeout(generateTimer);
  updateLoading(true);
  const token = ++currentGenerationToken;
  generationPromise = new Promise(resolve=>{
    generateTimer = setTimeout(()=>requestAnimationFrame(async ()=>{
      if(token !== currentGenerationToken){ resolve(false); return; }
      try{
        await generate({requestToken:token});
        resolve(token === currentGenerationToken);
      }catch(error){
        console.error('Falha ao atualizar a análise:', error);
        resolve(false);
      }finally{
        if(token === currentGenerationToken) updateLoading(false);
      }
    }), Math.max(0, Number(delay) || 0));
  });
  return generationPromise;
}

/**
 * Monta a assinatura da solicitação atual para reconhecer cálculos equivalentes.
 */
function analysisRequestSignature(filters=getFilters()){
  return JSON.stringify({
    indicator:S.indicator?.id || null,
    chart:S.chart || null,
    filters,
    compareEnabled:Boolean($('#compareEnabled')?.checked),
    compareIndicator:$('#compareIndicator')?.value || null
  });
}

/**
 * Garante que o resultado disponível corresponda às seleções e aos filtros atuais.
 */
async function ensureAnalysisCurrent(){
  if(!hasRequiredBlocks()) return false;
  const expected = analysisRequestSignature();
  if(S.lastAnalysisSignature !== expected || !$('#chart svg')){
    await scheduleGenerate(0);
  }
  return Boolean($('#chart svg') && S.lastAnalysisSignature === analysisRequestSignature());
}

/**
 * Monta a chave usada para armazenar e recuperar ResultadosProcessados calculados.
 */
function analysisCacheKey(indicatorId, filters, group){
  return JSON.stringify({indicatorId,filters,group});
}

/**
 * Retorna o resultado da análise atual, reutilizando o cache quando possível.
 */
function getAnalysisResult(indicator, filters, group){
  if(!indicator) return {rows:[],data:[]};
  const exactAge = effectiveGroup(group)==='Idade detalhada' || Boolean(filters.ageDetails?.length);
  const key = analysisCacheKey(indicator.id, filters, `${group}:${exactAge?'q6':'faixa'}`);
  if(analysisCache.has(key)){
    const cached = analysisCache.get(key);
    analysisCache.delete(key);
    analysisCache.set(key,cached);
    return cached;
  }
  const rows = exactAge ? filterExactAgeRows(filters, indicator.id) : filterRows(filters, indicator.id);
  if(!exactAge) validateFilteredRows(rows, filters);
  const data = exactAge ? aggregateExactRows(rows,group) : aggregate(rows, group, filters);
  const result = {rows,data};
  analysisCache.set(key,result);
  while(analysisCache.size > 8) analysisCache.delete(analysisCache.keys().next().value);
  return result;
}

/**
 * Aplica busca, ordenação e paginação às linhas exibidas na tabela.
 */
function getFilteredTableRows(){
  const term = normalizeText($('#tableSearch')?.value || tableState.search || '');
  const sort = $('#tableSort')?.value || tableState.sort || 'category-asc';
  let rows = [...(S.tableRows || [])];
  if(term){
    rows = rows.filter(row=>normalizeText(`${row.Indicador || ''} ${row.Categoria || ''} ${row['Valor (%)'] || ''} ${row.Entrevistas || ''} ${row['Estabilidade amostral'] || ''}`).includes(term));
  }
  /**
   * Retorna o valor numérico da linha, usando zero quando o campo não é válido.
   */
  const valueOf = row=>Number(String(row['Valor (%)'] ?? '').replace(',','.')) || 0;
  /**
   * Seleciona uma amostra das linhas para conferências e relatórios.
   */
  const sampleOf = row=>Number(row.Entrevistas) || 0;
  /**
   * Retorna a categoria associada à linha recebida.
   */
  const categoryOf = row=>String(row.Categoria || '');
  /**
   * Retorna o indicador associado à linha recebida.
   */
  const indicatorOf = row=>String(row.Indicador || '');
  rows.sort((a,b)=>{
    if(sort==='value-desc') return valueOf(b)-valueOf(a);
    if(sort==='value-asc') return valueOf(a)-valueOf(b);
    if(sort==='sample-desc') return sampleOf(b)-sampleOf(a);
    if(sort==='sample-asc') return sampleOf(a)-sampleOf(b);
    const joinedA = `${indicatorOf(a)} ${categoryOf(a)}`;
    const joinedB = `${indicatorOf(b)} ${categoryOf(b)}`;
    return sort==='category-desc' ? joinedB.localeCompare(joinedA,'pt-BR',{numeric:true}) : joinedA.localeCompare(joinedB,'pt-BR',{numeric:true});
  });
  return rows;
}

/**
 * Monta uma descrição textual dos filtros aplicados à análise.
 */
function buildFilterDescription(){
  const f = getFilterSnapshot();
  const parts = [];
  if(f.years?.length) parts.push(`Anos: ${f.years.join(', ')}`);
  if(f.sex && f.sex!=='Todos') parts.push(`Sexo: ${f.sex}`);
  if(f.ageDetails?.length) parts.push(`Idades detalhadas: ${f.ageDetails.join(', ')}`);
  if(f.ages?.length) parts.push(`Faixas etárias: ${f.ages.join(', ')}`);
  if(f.pop) parts.push(`População: ${f.pop}`);
  if(f.region) parts.push(`Região: ${f.region}`);
  if(f.uf) parts.push(`UF: ${f.uf}`);
  parts.push(`Recorte: ${f.group || 'Automático'}`);
  return parts;
}

/**
 * Formata a data e a hora usadas no relatório exportado.
 */
function formatReportDate(value){
  const raw=String(value || '').trim();
  if(/^\d{4}-\d{2}-\d{2}$/.test(raw)){
    const [year,month,day]=raw.split('-');
    return `${day}/${month}/${year}`;
  }
  return raw || 'Não informada';
}

/**
 * Monta o texto metodológico incluído no relatório da análise.
 */
function reportMethodology(indicator, rows, filters){
  const method=(typeof INDICATOR_METHODS!=='undefined' && INDICATOR_METHODS[indicator?.id]) || {};
  /**
   * Soma o número de entrevistas das linhas consideradas.
   */
  const totalN=(rows||[]).reduce((sum,row)=>sum+(Number(row.Entrevistas)||0),0);
  /**
   * Soma o denominador ponderado das linhas consideradas.
   */
  const totalDen=(rows||[]).reduce((sum,row)=>sum+(Number(row.Denominador)||0),0);
  /**
   * Soma o numerador ponderado das linhas consideradas.
   */
  const totalNum=(rows||[]).reduce((sum,row)=>sum+(Number(row.Numerador)||0),0);
  const detailed=(filters?.group==='Idade detalhada') || (filters?.ageDetails?.length>0);
  const weight=filters?.pop==='População Negra' ? 'pesorake_cor' : ((DATA.meta.weightColumnsUsed||[]).includes('pesorake2025') ? 'pesorake2025' : 'pesorake');
  const updateDate=detailed ? (window.VIGITEL_AGE_DETAIL?.meta?.updatedAt || method.updatedAt || DATA.meta.baseUpdatedAt || 'Não informada') : (DATA.meta.baseUpdatedAt || method.updatedAt || 'Não informada');
  const ageNote=detailed ? '<li><strong>Idade:</strong> q6 utilizada diretamente; cada idade possui numerador, denominador ponderado e amostra próprios. Pessoas com 80 anos ou mais são agrupadas em 80+.</li>' : '';
  return `<section class="report-methodology"><h3>Metodologia do resultado - ${esc(indicator?.id || '')} · ${esc(indicator?.label || 'Indicador')}</h3><ul><li><strong>Variável utilizada:</strong> ${esc(method.variable || 'Consultar dicionário do indicador.')}</li><li><strong>Regra do indicador:</strong> ${esc(method.rule || indicator?.description || 'Não informada.')}</li><li><strong>Fórmula da estimativa:</strong> 100 × Σ(peso × evento) / Σ(peso da população elegível)</li><li><strong>Peso amostral:</strong> ${esc(weight)}</li><li><strong>Denominador:</strong> ${esc(method.denominator || 'Soma ponderada da população elegível.')}</li><li><strong>Numerador ponderado total exibido:</strong> ${fmt(totalNum,2)}</li><li><strong>Denominador ponderado total exibido:</strong> ${fmt(totalDen,2)}</li><li><strong>Número de entrevistas:</strong> ${Math.round(totalN).toLocaleString('pt-BR')}</li><li><strong>População analisada:</strong> ${esc(method.population || 'Adultos elegíveis ao indicador.')}</li><li><strong>Data de atualização da base:</strong> ${esc(formatReportDate(updateDate))}</li><li><strong>Precisão:</strong> IC95% e CV aproximados pelo tamanho efetivo de Kish; consulte a nota geral do relatório.</li><li><strong>Situação dos pesos:</strong> ${esc(DATA.meta.weightLimitation || '')}</li>${ageNote}</ul></section>`;
}

/**
 * Resume a tabela, a amostra e a precisão para inclusão no relatório.
 */
function reportTableContext(indicator, filters){
  const method=(typeof INDICATOR_METHODS!=='undefined' && INDICATOR_METHODS[indicator?.id]) || {};
  const detailed=(filters?.group==='Idade detalhada') || (filters?.ageDetails?.length>0);
  const weight=filters?.pop==='População Negra' ? 'pesorake_cor' : ((DATA.meta.weightColumnsUsed||[]).includes('pesorake2025') ? 'pesorake2025' : 'pesorake');
  const updateDate=detailed ? (window.VIGITEL_AGE_DETAIL?.meta?.updatedAt || method.updatedAt || DATA.meta.baseUpdatedAt) : (DATA.meta.baseUpdatedAt || method.updatedAt);
  return `<div class="report-table-context"><strong>${esc(indicator?.id || '')} · ${esc(indicator?.label || '')}</strong><span><b>Variável:</b> ${esc(method.variable || 'Não informada')}</span><span><b>Regra:</b> ${esc(method.rule || indicator?.description || 'Não informada')}</span><span><b>Peso:</b> ${esc(weight)}</span><span><b>Denominador:</b> ${esc(method.denominator || 'População elegível')}</span><span><b>Atualização:</b> ${esc(formatReportDate(updateDate))}</span></div>`;
}

/**
 * Monta e baixa o relatório em PDF com gráfico, filtros, metodologia e tabela.
 */
function generatePdfReport(){
  if(!hasRequiredBlocks() || !$('#chart svg')){
    announceSave('Gere uma análise antes de criar o relatório.');
    return;
  }
  const area = $('#reportPrintArea');
  const filters=getFilters();
  const primaryExportSvg=renderExportChartSvg(S.lastPrimaryData,S.lastGroup,S.chart,S.graphMeta);
  const primarySvg=primaryExportSvg?.outerHTML || $('#chart svg')?.outerHTML || '';
  const compareIndicator=DATA.indicators.find(item=>item.id===S.compareIndicatorId);
  const compareActive=Boolean($('#compareEnabled')?.checked && S.lastCompareData?.length && compareIndicator);
  const compareExportSvg=compareActive ? renderExportChartSvg(S.lastCompareData,S.lastGroup,S.chart,S.compareGraphMeta || S.graphMeta) : null;
  const compareSvg=compareExportSvg?.outerHTML || (compareActive ? ($('#chartCompare svg')?.outerHTML || '') : '');
  const filterItems=buildFilterDescription().map(item=>`<li>${esc(item)}</li>`).join('');
  const rows=getFilteredTableRows();
  const tableHtml=rows.map(row=>`<tr><td>${esc(row.Indicador || '')}</td><td>${esc(row.Categoria)}</td><td>${esc(row['Valor (%)'])}</td><td>${esc(row['IC 95% aproximado'])}</td><td>${esc(row['CV aproximado (%)'])}</td><td>${esc(row.Casos)}</td><td>${esc(row.Entrevistas)}</td><td>${esc(row['Precisão amostral'] || '')}</td></tr>`).join('');
  const primaryMethod=reportMethodology(S.indicator,S.primaryTableRows,filters);
  const compareMethod=compareActive ? reportMethodology(compareIndicator,S.compareTableRows,filters) : '';
  const tableContexts=[reportTableContext(S.indicator,filters),compareActive ? reportTableContext(compareIndicator,filters) : ''].filter(Boolean).join('');
  area.innerHTML=`<h1>Relatório Analítico do Vigitel</h1><p><strong>Gerado em:</strong> ${new Date().toLocaleString('pt-BR')}</p><p><strong>Análise:</strong> ${esc($('#resultTitle')?.textContent || '')}</p><h2>Filtros utilizados</h2><ul>${filterItems}</ul><h2>Visualização e metodologia</h2><div class="report-chart">${primarySvg}</div>${primaryMethod}${compareSvg ? `<div class="report-chart">${compareSvg}</div>${compareMethod}` : ''}<h2>Tabela de ResultadosProcessados</h2><div class="report-table-contexts">${tableContexts}</div><table><thead><tr><th>Indicador</th><th>Categoria</th><th>Valor (%)</th><th>IC 95% aproximado</th><th>CV aproximado (%)</th><th>Casos</th><th>Entrevistas</th><th>Precisão amostral</th></tr></thead><tbody>${tableHtml}</tbody></table><h2>Notas metodológicas gerais</h2><p>As estimativas são obtidas pela razão entre a soma ponderada do numerador e a soma ponderada do denominador elegível. O IC95% e o CV são aproximações baseadas no tamanho efetivo de Kish, calculado pela soma dos pesos e pela soma dos pesos ao quadrado. A sinalização considera baixa precisão quando há 20 casos ou menos ou CV aproximado ≥35%, e cautela quando o CV está entre 20% e 35%. Essas medidas não substituem a análise completa do desenho amostral. Fonte: Vigitel - Ministério da Saúde.</p>`;
  area.setAttribute('aria-hidden','false');
  addVersionRecord('Exportação PDF',{force:true});
  announceSave('Na janela de impressão, escolha a opção Salvar como PDF.');
  requestAnimationFrame(()=>setTimeout(()=>window.print(),80));
}

/**
 * Converte uma cor hexadecimal em componentes vermelho, verde e azul.
 */
function hexToRgb(hex){
  const clean = String(hex || '').replace('#','');
  if(!/^[0-9a-f]{6}$/i.test(clean)) return null;
  return {r:parseInt(clean.slice(0,2),16),g:parseInt(clean.slice(2,4),16),b:parseInt(clean.slice(4,6),16)};
}

/**
 * Calcula a luminância relativa de uma cor para a avaliação de contraste.
 */
function relativeLuminance(hex){
  const rgb = hexToRgb(hex);
  if(!rgb) return 0;
  const values = [rgb.r,rgb.g,rgb.b].map(v=>{const c=v/255; return c<=.03928 ? c/12.92 : Math.pow((c+.055)/1.055,2.4);});
  return .2126*values[0]+.7152*values[1]+.0722*values[2];
}

/**
 * Calcula a razão de contraste entre duas cores.
 */
function contrastRatio(a,b){
  const l1=relativeLuminance(a),l2=relativeLuminance(b);
  return (Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05);
}

/**
 * Executa os testes internos do painel e apresenta um resumo dos ResultadosProcessados.
 */
function runAutomatedTests(){
  const results=[];
  /**
   * Executa uma verificação isolada e registra se o comportamento observado corresponde ao esperado.
   */
  const test=(name,fn,warning=false)=>{
    try{
      const detail=fn();
      results.push({name,status:warning?'warn':'pass',detail:detail===true?'OK':String(detail || 'OK')});
    }catch(error){results.push({name,status:'fail',detail:error.message || String(error)});}
  };
  test('Base de dados carregada',()=>{if(!DATA.rows?.length) throw new Error('Nenhuma linha disponível'); return `${DATA.rows.length.toLocaleString('pt-BR')} linhas agregadas`;});
  test('Indicadores sem códigos duplicados',()=>{const ids=DATA.indicators.map(i=>i.id); if(new Set(ids).size!==ids.length) throw new Error('Há códigos duplicados'); return `${ids.length} indicadores únicos`;});
  test('Cobertura de idade detalhada',()=>{if(DETAILED_AGES.length!==63 || DETAILED_AGES.at(-1)!=='80 anos ou mais') throw new Error('Faixa 18 a 80+ incompleta'); return '63 idades de 18 a 80+';});
  test('Estrutura das linhas agregadas',()=>{if(DATA.rows.some(row=>!Array.isArray(row)||row.length<10)) throw new Error('Linha com estrutura inválida'); return 'Todas as linhas possuem as 10 colunas esperadas';});
  test('IDs HTML únicos',()=>{const ids=$$('[id]').map(el=>el.id); const dup=ids.filter((id,i)=>ids.indexOf(id)!==i); if(dup.length) throw new Error(`IDs duplicados: ${[...new Set(dup)].join(', ')}`); return `${ids.length} IDs verificados`;});
  test('Temas claro e escuro com contraste',()=>{const light=contrastRatio(GRAPH_THEME_DEFAULTS.light.textColor,GRAPH_THEME_DEFAULTS.light.chartBgColor); const dark=contrastRatio(GRAPH_THEME_DEFAULTS.dark.textColor,GRAPH_THEME_DEFAULTS.dark.chartBgColor); if(light<4.5||dark<4.5) throw new Error(`Contraste insuficiente: ${light.toFixed(1)} / ${dark.toFixed(1)}`); return `Contraste ${light.toFixed(1)}:1 no claro e ${dark.toFixed(1)}:1 no escuro`;});
  test('Controles avançados disponíveis',()=>{const required=['undoAction','redoAction','versionHistoryBtn','downloadVectorSvg','compareEnabled','downloadReportPdf','favoritesBtn','shareConfigBtn','tableSearch','runTestsBtn']; const missing=required.filter(id=>!$('#'+id)); if(missing.length) throw new Error(`Ausentes: ${missing.join(', ')}`); return 'Histórico de versões, SVG, comparação, PDF, favoritos, compartilhamento e tabela encontrados';});
  test('Renderizadores de gráficos',()=>{const names=['lineSvg','barSvg','hbarSvg','pieSvg','radarSvg','kpiSvg','gaugeSvg','lollipopSvg','paretoSvg','treemapSvg']; const missing=names.filter(name=>typeof window[name]!=='function'); if(missing.length) throw new Error(`Funções ausentes: ${missing.join(', ')}`); return `${names.length} renderizadores disponíveis`;});
  test('Renderização de todos os formatos',()=>{
    const mock=[{label:'A',category:'A',value:12,n:100},{label:'B',category:'B',value:24,n:120},{label:'C',category:'C',value:36,n:140},{label:'D',category:'D',value:48,n:160},{label:'E',category:'E',value:20,n:110}];
    const opt=optOverride || chartOptions();
    const oldMeta=S.graphMeta;
    S.graphMeta={title:'Teste automático',subtitle:'Validação interna',source:'Fonte de teste'};
    const outputs=[lineSvg(mock,opt,false),lineSvg(mock,opt,true),barSvg(mock,opt),hbarSvg(mock,opt),lollipopSvg(mock,opt),paretoSvg(mock,opt),pieSvg(mock,opt,false),pieSvg(mock,opt,true),radarSvg(mock,opt),kpiSvg(mock,opt),gaugeSvg(mock,opt),treemapSvg(mock,opt)];
    S.graphMeta=oldMeta;
    if(outputs.some(svg=>!String(svg).includes('<svg'))) throw new Error('Um ou mais formatos não retornaram SVG válido');
    return `${outputs.length} visualizações renderizadas em memória`;
  });
  test('Exportações configuradas',()=>{if(typeof downloadCsv!=='function'||typeof downloadExcel!=='function'||typeof downloadSvg!=='function'||typeof downloadVectorSvg!=='function'||typeof generatePdfReport!=='function') throw new Error('Exportação incompleta'); return 'CSV, Excel, PNG, SVG e relatório PDF disponíveis';});
  try{
    const key='vigitel-test';
    localStorage.setItem(key,'ok');
    const ok=localStorage.getItem(key)==='ok';
    localStorage.removeItem(key);
    if(ok) results.push({name:'Persistência local',status:'pass',detail:'Salvamento local funcionando'});
    else results.push({name:'Persistência local',status:'warn',detail:'O navegador não confirmou o salvamento local'});
  }catch(error){
    results.push({name:'Persistência local',status:'warn',detail:'O modo atual do navegador bloqueia o armazenamento local; o restante do painel continua funcionando'});
  }
  if(hasRequiredBlocks()){
    test('Coerência da análise atual',()=>{if(!S.lastPrimaryData?.length) throw new Error('Sem dados atuais'); if(S.primaryTableRows.length!==S.lastPrimaryData.length) throw new Error('Tabela e gráfico possuem quantidades diferentes'); return `${S.lastPrimaryData.length} categorias coerentes`;});
    const low=(S.tableRows||[]).filter(row=>Number(row.Entrevistas)<SAMPLE_CAUTION_THRESHOLD).length;
    test('Amostras reduzidas identificadas',()=>`${low} categoria(s) sinalizada(s)`,low>0);
  }
  const passed=results.filter(r=>r.status==='pass').length;
  const warnings=results.filter(r=>r.status==='warn').length;
  const failed=results.filter(r=>r.status==='fail').length;
  $('#testSummary').innerHTML=`<div class="test-summary-card"><strong>${passed}</strong><span>Aprovados</span></div><div class="test-summary-card"><strong>${warnings}</strong><span>Avisos</span></div><div class="test-summary-card"><strong>${failed}</strong><span>Falhas</span></div>`;
  $('#testList').innerHTML=results.map(item=>`<article class="test-item test-${item.status}"><span class="test-dot"></span><div><strong>${esc(item.name)}</strong><p class="panel-subtitle">${esc(item.detail)}</p></div></article>`).join('');
  $('#testsDialog')?.showModal();
}


/**
 * Retorna o SVG usado como ícone visual nos blocos, filtros e cartões do construtor.
 */
function iconSVG(name, color="#5479E2"){
  const icons = {
    layers: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 4 7.2 12 11.4 20 7.2 12 3Z" fill="none" stroke="${color}" stroke-width="1.8" stroke-linejoin="round"/><path d="M4 11.2 12 15.4 20 11.2" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 15.2 12 19.4 20 15.2" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    line: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20V5M4 20h16" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round"/><path d="m6.5 15.5 4-4 3 2.5 5-6" fill="none" stroke="${color}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/><circle cx="18.5" cy="8" r="1.8" fill="none" stroke="${color}" stroke-width="1.7"/></svg>`,
    funnel: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5h16l-6.5 7.6V19l-3 1.6v-7.5L4 5.5Z" fill="none" stroke="${color}" stroke-width="1.9" stroke-linejoin="round"/></svg>`,
    bars: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20V4M4 20h16" fill="none" stroke="${color}" stroke-width="1.7" stroke-linecap="round"/><rect x="6.2" y="12" width="2.6" height="8" rx=".7" fill="none" stroke="${color}" stroke-width="1.6"/><rect x="11" y="8" width="2.6" height="12" rx=".7" fill="none" stroke="${color}" stroke-width="1.6"/><rect x="15.8" y="5" width="2.6" height="15" rx=".7" fill="none" stroke="${color}" stroke-width="1.6"/></svg>`,
    heart: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7.2-4.4-9-9.3C1.8 7.5 3.7 5 6.5 5c1.8 0 3.1.9 4 2.2C11.4 5.9 12.8 5 14.5 5c2.8 0 4.7 2.5 3.5 5.7C16.2 15.6 12 20 12 20Z" fill="none" stroke="${color}" stroke-width="1.8" stroke-linejoin="round"/><path d="M4.2 12h3l1.3-2.8 2.2 6 1.5-3.2h3.7" fill="none" stroke="${color}" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    scale: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="4" width="14" height="16" rx="3" fill="none" stroke="${color}" stroke-width="1.8"/><circle cx="12" cy="9" r="3.2" fill="none" stroke="${color}" stroke-width="1.4"/><path d="M12 9 14 7.4" stroke="${color}" stroke-width="1.4" stroke-linecap="round"/></svg>`,
    brain: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5c-2 0-3.5 1.6-3.5 3.6 0 1 .4 1.8 1 2.4-.8.6-1.3 1.5-1.3 2.6 0 1.9 1.5 3.4 3.4 3.4H9V5H8Zm8 0c2 0 3.5 1.6 3.5 3.6 0 1-.4 1.8-1 2.4.8.6 1.3 1.5 1.3 2.6 0 1.9-1.5 3.4-3.4 3.4H15V5h1Z" fill="none" stroke="${color}" stroke-width="1.6" stroke-linejoin="round"/><path d="M8 9h1M8 13h1M15 9h1M15 13h1M12 5v14" stroke="${color}" stroke-width="1.2" stroke-linecap="round"/></svg>`,
    stetho: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4v5a4 4 0 0 0 8 0V4M5 4h2M13 4h2" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round"/><path d="M10 13v2.5a4.5 4.5 0 0 0 9 0v-1" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round"/><circle cx="19" cy="13" r="2" fill="none" stroke="${color}" stroke-width="1.7"/></svg>`,
    cigarette: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 14h12" fill="none" stroke="${color}" stroke-width="1.9" stroke-linecap="round"/><path d="M16 12.4h2.7a1.3 1.3 0 0 1 1.3 1.3v.6a1.3 1.3 0 0 1-1.3 1.3H16" fill="none" stroke="${color}" stroke-width="1.7" stroke-linecap="round"/><path d="M8 8.2c0-1.1.8-2 1.9-2 .8 0 1.5.4 1.8 1.1.2.4.2.8.2 1.2M11.8 7.2c.9 0 1.6.7 1.6 1.6 0 .4-.1.8-.4 1.1" fill="none" stroke="${color}" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    glass: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4h10v1.6c0 3.1-1.9 5.8-4.6 6.9V18h3" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M9.2 18h5.6" stroke="${color}" stroke-width="1.8" stroke-linecap="round"/><path d="M8 8h8" stroke="${color}" stroke-width="1.5" stroke-linecap="round"/></svg>`,
    food: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 4v7M5 4v4M8 4v4M6.5 11v9" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round"/><path d="M14.5 4v7.5c0 1.4 1.1 2.5 2.5 2.5h.5V4" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    activity: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="15" cy="5.5" r="1.8" fill="none" stroke="${color}" stroke-width="1.6"/><path d="M12 9.2 9.5 12l-2.8 1.4M12.2 9l2.4 2.3 2.8.5M11.2 9.8l1.1 3.6-2.1 2.8M12.6 13.5l3 4.5M9.8 16.3 8 20" fill="none" stroke="${color}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    clipboard: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="4.5" width="12" height="16" rx="2.5" fill="none" stroke="${color}" stroke-width="1.8"/><path d="M9 4.5h6v3H9z" fill="none" stroke="${color}" stroke-width="1.6" stroke-linejoin="round"/><path d="M8.8 13h2.4l1.2-2.4 1.9 5 1.2-2.7H18" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    ribbon: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.6 4.8a4.6 4.6 0 0 1 6.3 6.8l-1.4 1.2 4 6.4-4-1.8-2.5 2.3-2-3.2" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M14.4 4.8A4.6 4.6 0 0 0 8 11.6l7 8" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    car: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5.5 15.5 7.2 10a2 2 0 0 1 1.9-1.4h5.8a2 2 0 0 1 1.9 1.4l1.7 5.5" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M4.8 15.5h14.4a1.2 1.2 0 0 1 1.2 1.2v1.1H3.6v-1.1a1.2 1.2 0 0 1 1.2-1.2Z" fill="none" stroke="${color}" stroke-width="1.8" stroke-linejoin="round"/><circle cx="8" cy="17.8" r="1.2" fill="none" stroke="${color}" stroke-width="1.6"/><circle cx="16" cy="17.8" r="1.2" fill="none" stroke="${color}" stroke-width="1.6"/></svg>`,
    dots: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="6" r="1.4" fill="${color}"/><circle cx="8" cy="12" r="1.4" fill="${color}"/><circle cx="8" cy="18" r="1.4" fill="${color}"/><circle cx="14" cy="6" r="1.4" fill="${color}"/><circle cx="14" cy="12" r="1.4" fill="${color}"/><circle cx="14" cy="18" r="1.4" fill="${color}"/></svg>`,
    trophy: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4h8v3a4 4 0 0 1-8 0V4Z" fill="none" stroke="${color}" stroke-width="1.7"/><path d="M8 6H5c0 3 1.5 5 4 5M16 6h3c0 3-1.5 5-4 5M12 11v5M8.5 20h7" fill="none" stroke="${color}" stroke-width="1.7" stroke-linecap="round"/></svg>`,
    pie: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a9 9 0 1 0 9 9h-9V3Z" fill="none" stroke="${color}" stroke-width="1.8" stroke-linejoin="round"/><path d="M14 3.3A9 9 0 0 1 20.7 10H14V3.3Z" fill="none" stroke="${color}" stroke-width="1.8"/></svg>`,
    gauge: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 16a8 8 0 0 1 16 0" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round"/><path d="M12 16l4-5" stroke="${color}" stroke-width="1.8" stroke-linecap="round"/><circle cx="12" cy="16" r="1.6" fill="${color}"/></svg>`
  };
  return icons[name] || icons.layers;
}

/**
 * Escolhe o desenho principal de cada tema de acordo com o assunto analisado.
 */
function getThemeIcon(themeId){
  const icons = {
    tabagismo:"cigarette",
    alcool:"glass",
    obesidade:"scale",
    alimentacao:"food",
    atividade:"activity",
    saude:"stetho",
    cancer:"ribbon",
    morbidade:"clipboard",
    transito:"car",
    vigitel:"bars"
  };
  return iconSVG(icons[themeId] || "layers", "#073B70");
}
/**
 * Define o ícone do indicador a partir do tema ao qual ele pertence.
 */
function getIndicatorIcon(indicator){
  const themeId = indicator?.themeId || S.theme?.id;
  return getThemeIcon(themeId);
}
/**
 * Seleciona o ícone correspondente ao tipo de gráfico escolhido pelo usuário.
 */
function getChartIcon(chartId){
  const icons = {line:"line", area:"line", bar:"bars", horizontal:"bars", ranking:"trophy", lollipop:"line", pareto:"line", pie:"pie", donut:"pie", radar:"line", kpi:"bars", gauge:"gauge", treemap:"layers"};
  return iconSVG(icons[chartId] || "bars", "#5479E2");
}

/**
 * Cria cada bloco visual clicável ou arrastável usado na lateral e no fluxo de construção.
 */
function makeBlock({type,id,label,detail,icon,color}){
  const el = document.createElement('div');
  const classMap = {theme:'theme-card', indicator:'indicator-card', filters:'filters-card', chart:'chart-card-block'};
  el.className = `block-card ${classMap[type] || ''}`;
  el.draggable = true;
  el.dataset.type = type;
  el.dataset.id = id;
  el.style.setProperty('--block-color', color || '#0B5DB7');
  const iconMarkup = icon || iconSVG('layers');
  el.innerHTML = `<span class="block-icon">${iconMarkup}</span><span class="block-text"><strong>${esc(label)}</strong><span>${esc(detail||'Selecionar bloco')}</span></span>`;
  el.addEventListener('click',()=>selectBlock(type,id));
  el.addEventListener('dragstart',ev=>{
    ev.dataTransfer.setData('text/plain', JSON.stringify({type,id}));
  });
  return el;
}

/**
 * Mostra os temas em formato de acordeão e coloca os indicadores dentro do tema correspondente.
 */
function renderThemes(){
  const box = $('#themeBlocks');
  box.innerHTML = '';
  const term = ($('#searchInput')?.value || '').toLowerCase().trim();

  DATA.themes.forEach(t=>{
    const indicators = DATA.indicators
      .filter(i=>i.themeId===t.id)
      .filter(i=>!term || (i.label + ' ' + i.description + ' ' + i.id + ' ' + t.label).toLowerCase().includes(term));

    if(term && indicators.length === 0 && !t.label.toLowerCase().includes(term)) return;

    const group = document.createElement('div');
    group.className = 'theme-accordion';
    if(S.theme?.id === t.id || indicators.some(i=>S.indicator?.id === i.id) || term) {
      group.classList.add('open');
    }

    const header = document.createElement('button');
    header.type = 'button';
    header.className = 'theme-header';
    header.draggable = true;
    header.dataset.type = 'theme';
    header.dataset.id = t.id;
    header.innerHTML = `
      <span class="theme-topic-icon">${getThemeIcon(t.id)}</span>
      <span class="theme-title-area">
        <strong>${esc(t.label)}</strong>
        <span>Tema de indicadores</span>
      </span>
      <span class="theme-count">${indicators.length}</span>
      <span class="theme-toggle">${group.classList.contains('open') ? '⌃' : '⌄'}</span>
    `;
    header.addEventListener('dragstart',ev=>{ev.dataTransfer.setData('text/plain', JSON.stringify({type:'theme', id:t.id}));});
    header.addEventListener('click',()=>{
      S.theme = t;
      group.classList.toggle('open');
      header.querySelector('.theme-toggle').textContent = group.classList.contains('open') ? '⌃' : '⌄';
      if(S.indicator && S.indicator.themeId !== t.id) S.indicator = null;
      renderThemes();
      renderSlots();
      saveAnalysisState();
      recordHistory();
      if(hasRequiredBlocks()) scheduleGenerate(0);
    });

    const list = document.createElement('div');
    list.className = 'theme-indicator-list';

    indicators.forEach(i=>{
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'theme-indicator-item';
      item.draggable = true;
      item.dataset.type = 'indicator';
      item.dataset.id = i.id;
      if(S.indicator?.id === i.id) item.classList.add('selected');
      item.innerHTML = `
        <span class="theme-indicator-drag">⋮⋮</span>
        <span class="theme-indicator-label">${esc(i.label)}</span>
        
        <span class="theme-indicator-open">↗</span>
      `;
      item.addEventListener('click',(ev)=>{
        ev.stopPropagation();
        if(ev.target.closest('[data-indicator-help]')) return;
        selectBlock('indicator', i.id);
      });
      item.addEventListener('dragstart',ev=>{
        ev.dataTransfer.setData('text/plain', JSON.stringify({type:'indicator', id:i.id}));
      });
      list.appendChild(item);
    });

    group.appendChild(header);
    group.appendChild(list);
    box.appendChild(group);
  });

  if(!box.children.length) {
    box.innerHTML = `<p class="panel-subtitle">Nenhum tema ou indicador encontrado.</p>`;
  }
}

/**
 * Mantém compatibilidade com a busca; os indicadores agora aparecem dentro dos temas.
 */
function renderIndicators(){
  renderThemes();
}

/**
 * Mostra o bloco de filtros como bloco móvel, mantendo a lógica inicial de arrastar ou clicar.
 */
function renderFilterBlock(){
  const box = $('#filterBlocks'); box.innerHTML='';
  const b=makeBlock({type:'filters',id:'standard',label:'Filtros padronizados',detail:'Ano, sexo, região, UF, idade e população',icon:iconSVG('funnel'),color:'#198754'});
  if(S.filters) b.classList.add('selected');
  box.appendChild(b);
}

/**
 * Renderiza todos os tipos de gráficos disponíveis para seleção.
 */
function renderChartBlocks(){
  const box = $('#chartBlocks'); box.innerHTML='';
  chartTypes.forEach(([id,label,icon])=>{
    const b=makeBlock({type:'chart',id,label,detail:'Tipo de visualização',icon:getChartIcon(id),color:'#0B5DB7'});
    if(S.chart===id) b.classList.add('selected');
    box.appendChild(b);
  });
}

/**
 * Atualiza a indicação visual do tipo de gráfico selecionado.
 */
function renderCurrentChartSelection(){
  if(!hasRequiredBlocks()) return false;
  if(S.lastAnalysisSignature !== analysisRequestSignature()) return false;
  const primaryData = Array.isArray(S.lastPrimaryData) ? S.lastPrimaryData : [];
  const group = S.lastGroup;
  if(!primaryData.length || !group) return false;

  const primaryMeta = S.graphMeta || {
    title: $('#resultTitle')?.textContent || '',
    subtitle: $('#resultSubtitle')?.textContent || '',
    source: 'Fonte: Vigitel | Ministério da Saúde. Gráfico elaborado no Observatório Analítico do Vigitel.'
  };

  drawChart(primaryData, group, '#chart', S.chart, primaryMeta);

  const compareActive = Boolean($('#compareEnabled')?.checked && Array.isArray(S.lastCompareData) && S.lastCompareData.length);
  if(compareActive){
    drawChart(S.lastCompareData, group, '#chartCompare', S.chart, S.compareGraphMeta || primaryMeta);
    $('#chartComparisonGrid')?.classList.add('compare-active');
  }

  updateChartAdvice([...primaryData, ...(compareActive ? S.lastCompareData : [])], group);
  return true;
}

/**
 * Atualiza a análise ao escolher tema, indicador, bloco de filtros ou tipo de gráfico.
 */
function selectBlock(type,id){
  if(type==='theme'){
    S.theme = DATA.themes.find(t=>t.id===id);
    if(S.indicator && S.indicator.themeId!==S.theme.id) S.indicator = null;
    renderThemes();
    renderIndicators();
    renderCompareIndicators();
    renderSlots();
    saveAnalysisState();
    recordHistory();
    if(hasRequiredBlocks()) scheduleGenerate(0);
    return;
  }

  if(type==='indicator'){
    S.indicator = DATA.indicators.find(i=>i.id===id);
    if(S.indicator) S.theme = DATA.themes.find(t=>t.id===S.indicator.themeId) || S.theme;
    renderThemes();
    renderIndicators();
    renderCompareIndicators();
    renderSlots();
    saveAnalysisState();
    recordHistory();
    if(hasRequiredBlocks()) scheduleGenerate(0);
    return;
  }

  if(type==='filters'){
    S.filters = true;
    renderFilterBlock();
    renderSlots();
    saveAnalysisState();
    recordHistory();
    if(hasRequiredBlocks()) scheduleGenerate(0);
    return;
  }

  if(type==='chart'){
    if(!chartTypes.some(item=>item[0]===id)) return;
    S.chart = id;
    clearTimeout(generateTimer);
    currentGenerationToken++;
    renderChartBlocks();
    renderSlots();
    updateChartExplanation();
    saveAnalysisState();
    recordHistory();
    if(hasRequiredBlocks()){
      try{
        const rendered = renderCurrentChartSelection();
        if(!rendered) scheduleGenerate(0);
      }catch(error){
        console.error(`Falha ao trocar para o gráfico ${id}:`, error);
        scheduleGenerate(0);
      }
    }
    return;
  }
}

/**
 * Atualiza os quatro cartões centrais do construtor com o estado atual da análise.
 */
function renderSlots(){
  setSlot('theme', S.theme?.label, S.theme ? 'Tema selecionado' : 'Arraste um tema aqui', S.theme ? getThemeIcon(S.theme.id) : iconSVG('layers'), S.theme?.color);
  setSlot('indicator', S.indicator?.label, S.indicator ? 'Indicador selecionado' : 'Arraste um indicador aqui', S.indicator ? getIndicatorIcon(S.indicator) : iconSVG('line'), DATA.themes.find(t=>t.id===S.indicator?.themeId)?.color);
  const active = activeFilterCount();
  setSlot('filters', S.filters ? 'Filtros aplicados' : '', S.filters ? (active ? `${active} filtro(s) ativo(s)` : 'Sem recorte específico') : 'Arraste o bloco de filtros aqui', iconSVG('funnel'), '#198754');
  setSlot('chart', chartTypes.find(c=>c[0]===S.chart)?.[1] || '', S.chart ? 'Gráfico selecionado' : 'Arraste um gráfico aqui', S.chart ? getChartIcon(S.chart) : iconSVG('bars'), '#7C3FD0');
}

/**
 * Monta um cartão central com número, desenho, instrução e seleção atual.
 */
function setSlot(slot,label,detail,icon,color){
  const target = document.querySelector(`[data-slot="${slot}"] .slot-content`);
  const config = {
    theme: {n:1, title:'Tema', visual: iconSVG('layers'), hint:'Arraste um tema aqui'},
    indicator: {n:2, title:'Indicador', visual: iconSVG('line'), hint:'Arraste um indicador aqui'},
    filters: {n:3, title:'Filtros', visual: iconSVG('funnel'), hint:'Arraste o bloco de filtros aqui'},
    chart: {n:4, title:'Gráfico', visual: iconSVG('bars'), hint:'Arraste um gráfico aqui'}
  }[slot];

  const selected = label ? `
    <div class="workflow-selected">
      <span class="workflow-selected-icon">${icon || config.visual}</span>
      <span class="workflow-selected-text">
        <strong>${esc(label)}</strong>
        <span>${esc(detail)}</span>
      </span>
    </div>
  ` : "";

  target.innerHTML = `
    <div class="workflow-card-head">
      <span class="workflow-number">${config.n}</span>
      <strong>${config.title}</strong>
    </div>
    <div class="workflow-visual">${config.visual}</div>
    <p class="workflow-hint">${esc(label ? detail : config.hint)}</p>
    ${selected}
  `;
}

/**
 * Preenche os filtros da coluna direita com anos, sexo, localização, idade e população.
 */
function renderFilters(){
  fillChecks('#yearChecks', DATA.dims.years, false);
  fillChecks('#ageDetailChecks', DETAILED_AGES, false);
  fillChecks('#ageChecks', DATA.dims.ages, false);
  fillSelect('#sexFilter', ['Nenhum','Todos',...DATA.dims.sexes], 'Todos');
  fillSelect('#regionFilter', ['Nenhum','Brasil',...DATA.dims.regions], 'Brasil');
  fillSelect('#ufFilter', ['Nenhum','Brasil',...DATA.dims.ufs], 'Brasil', v=> v==='Brasil' ? 'Todas as UF' : (v==='Nenhum' ? 'Nenhum' : (UF_NAMES[v]||v)));
  fillSelect('#popFilter', ['Nenhum','Todas',...DATA.dims.pops], 'População Geral');
  fillSelect('#groupFilter', ['Automático','Ano','Região','UF','Sexo','Idade detalhada','Faixa etária quinquenal'], 'Automático');
  updateSummaries();
}

/**
 * Cria listas de caixas de seleção para filtros com múltiplas opções.
 */
function fillChecks(sel, values, checked){
  const box=$(sel); box.innerHTML='';
  values.forEach(v=>{
    const id = sel.replace('#','')+'_'+String(v).replace(/\W/g,'_');
    const lab=document.createElement('label');
    lab.innerHTML = `<input type="checkbox" value="${esc(v)}" ${checked?'checked':''}> ${esc(v)}`;
    box.appendChild(lab);
  });
}

/**
 * Preenche campos de seleção simples, como sexo, UF, região e tipo de população.
 */
function fillSelect(sel, values, selected, formatter=(v)=>v){
  const s=$(sel); s.innerHTML='';
  values.forEach(v=>{
    const o=document.createElement('option'); o.value=v; o.textContent=formatter(v); if(v===selected) o.selected=true; s.appendChild(o);
  });
}

/**
 * Verifica se há blocos suficientes para gerar gráfico automaticamente.
 */
function hasRequiredBlocks(){
  return Boolean(S.theme && S.indicator && S.chart);
}

/**
 * Atualiza resumos, blocos e gráfico quando qualquer filtro ou seleção muda.
 */
function refreshAnalysis(options={}){
  if(options.dataChanged) invalidateAnalysisData();
  updateSummaries();
  renderSlots();
  S.lastAnalysisSignature = '';
  saveAnalysisState();
  if(hasRequiredBlocks()) scheduleGenerate(0);
  else recordHistory();
}

/**
 * Altera campos do painel sem disparar eventos duplicados.
 */
function setControlValue(id, value){
  const el = $('#'+id);
  if(!el) return;
  if(el.type === 'checkbox') el.checked = Boolean(value);
  else el.value = value;
}

/**
 * Limpa apenas os filtros demográficos.
 */
function clearDemographicFilters(){
  setControlValue('sexFilter','Todos');
  setControlValue('popFilter','População Geral');
  $$('#ageDetailChecks input').forEach(i=>i.checked=false);
  $$('#ageChecks input').forEach(i=>i.checked=false);
  enforcePopulationYearUI();
}

/**
 * Limpa apenas os filtros geográficos.
 */
function clearGeographicFilters(){
  setControlValue('regionFilter','Brasil');
  setControlValue('ufFilter','Brasil');
}

/**
 * Limpa recorte e edição visual do gráfico.
 */
function clearOtherFilters(){
  setControlValue('groupFilter','Automático');

  setControlValue('customTitle','');
  setControlValue('customSubtitle','');
  setControlValue('sourceText','');
  setControlValue('xAxisTitle','');
  setControlValue('yAxisTitle','');

  setControlValue('fontFamily','Arial');
  setControlValue('titleAlign','left');
  setControlValue('subtitleAlign','left');
  setControlValue('sourceAlign','left');
  setControlValue('titleSize','22');
  setControlValue('subtitleSize','14');
  setControlValue('fontSize','18');
  setControlValue('axisSize','13');
  setControlValue('valueSize','13');
  setControlValue('legendSize','13');

  setControlValue('primaryColor','#073B70');
  setControlValue('secondaryColor','#0FA7A0');
  const themeDefaults = GRAPH_THEME_DEFAULTS[currentTheme()] || GRAPH_THEME_DEFAULTS.light;
  setControlValue('textColor',themeDefaults.textColor);
  setControlValue('chartBgColor',themeDefaults.chartBgColor);
  setControlValue('plotBgColor',themeDefaults.plotBgColor);
  setControlValue('gridColor',themeDefaults.gridColor);
  setControlValue('borderColor',themeDefaults.borderColor);
  setControlValue('paletteSelect','default');

  setControlValue('labelRotation','auto');
  setControlValue('decimalPlaces','1');
  setControlValue('sortOrder','original');
  setControlValue('valuePosition','outside');
  setControlValue('legendPosition','right');

  setControlValue('barWidthScale','70');
  setControlValue('lineWidth','4');
  setControlValue('pointSize','5');
  setControlValue('donutHole','45');

  setControlValue('showValues',true);
  setControlValue('showGrid',true);
  setControlValue('showLegend',true);
  setControlValue('showSource',true);
  setControlValue('showBorder',true);
  setControlValue('showXAxisTitle',true);
  setControlValue('showYAxisTitle',true);
  setControlValue('showAxisLabels',true);
  setControlValue('showPoints',true);
  setControlValue('showTreemapLabels',true);
}

/**
 * Restaura apenas as opções visuais, preservando indicador e filtros.
 */
function clearAppearanceOnly(){
  const currentGroup = $('#groupFilter')?.value || 'Automático';
  clearOtherFilters();
  setControlValue('groupFilter', currentGroup);
  updateSummaries();
  saveAnalysisState();
  if(hasRequiredBlocks()) scheduleGenerate(0);
  else recordHistory();
}

/**
 * Aplica uma configuração visual predefinida aos controles do gráfico.
 */
function applyAppearancePreset(name){
  const presets = {
    default: {titleSize:'22', subtitleSize:'14', fontSize:'18', axisSize:'13', valueSize:'13', legendSize:'13', lineWidth:'4', pointSize:'5', barWidthScale:'70', paletteSelect:'default', showGrid:true, showLegend:true, showValues:true, chartBgColor:(GRAPH_THEME_DEFAULTS[currentTheme()]||GRAPH_THEME_DEFAULTS.light).chartBgColor, plotBgColor:(GRAPH_THEME_DEFAULTS[currentTheme()]||GRAPH_THEME_DEFAULTS.light).plotBgColor, textColor:(GRAPH_THEME_DEFAULTS[currentTheme()]||GRAPH_THEME_DEFAULTS.light).textColor, gridColor:(GRAPH_THEME_DEFAULTS[currentTheme()]||GRAPH_THEME_DEFAULTS.light).gridColor, borderColor:(GRAPH_THEME_DEFAULTS[currentTheme()]||GRAPH_THEME_DEFAULTS.light).borderColor},
    presentation: {titleSize:'28', subtitleSize:'18', fontSize:'22', axisSize:'17', valueSize:'17', legendSize:'16', lineWidth:'5', pointSize:'7', barWidthScale:'82', paletteSelect:'default', showGrid:true, showLegend:true, showValues:true},
    print: {titleSize:'22', subtitleSize:'14', fontSize:'17', axisSize:'12', valueSize:'12', legendSize:'12', lineWidth:'4', pointSize:'5', barWidthScale:'72', paletteSelect:'mono', textColor:'#112B44', chartBgColor:'#FFFFFF', plotBgColor:'#FFFFFF', gridColor:'#D6DFE8', borderColor:'#C9D4E0', showGrid:true, showBorder:true},
    contrast: {titleSize:'24', subtitleSize:'16', fontSize:'20', axisSize:'15', valueSize:'15', legendSize:'15', lineWidth:'5', pointSize:'7', barWidthScale:'78', paletteSelect:'warm', primaryColor:'#001F54', secondaryColor:'#D7263D', textColor:'#061626', chartBgColor:'#FFFFFF', plotBgColor:'#FFFDF7', gridColor:'#B8C7D6', borderColor:'#8EA2B5', showGrid:true, showLegend:true, showValues:true, showBorder:true}
  };
  const preset = presets[name] || presets.default;
  Object.entries(preset).forEach(([id,value])=>setControlValue(id, value));
  updateSummaries();
  saveAnalysisState();
  if(hasRequiredBlocks()) scheduleGenerate(0);
  else recordHistory();
}

/**
 * Decide qual grupo será limpo ao clicar na lixeira.
 */
function clearFilterSection(section){
  if(section === 'demographic') clearDemographicFilters();
  if(section === 'geographic') clearGeographicFilters();
  if(section === 'other') clearOtherFilters();
  if(section === 'demographic' || section === 'geographic'){
    normalizeFilterState();
    clearLegendStateForNewData();
    invalidateAnalysisData();
  }
  updateSummaries();
  refreshAnalysis({dataChanged:section === 'demographic' || section === 'geographic'});
}

/**
 * Conecta botões, filtros, lixeiras e controles avançados às ações da interface.
 */
function bindEvents(){
  $('#searchInput').addEventListener('input',renderThemes);
  $('#quickBuild').addEventListener('click',()=>{
    S.theme=DATA.themes[0];
    S.indicator=DATA.indicators.find(i=>i.themeId===S.theme.id);
    S.filters=true;
    S.chart='line';
    renderAll();
    saveAnalysisState();
    recordHistory();
    scheduleGenerate(0);
  });
  $('#generate').addEventListener('click',()=>scheduleGenerate(0));
  $('#clear').addEventListener('click',()=>{
    S.theme=null;S.indicator=null;S.filters=false;S.chart=null;S.hiddenCategories=[];S.legendSearch='';S.compareEnabled=false;S.compareIndicatorId=null;
    if($('#compareEnabled')) $('#compareEnabled').checked=false;
    renderAll();
    const legendSearch=$('#legendSearchInput');if(legendSearch) legendSearch.value='';
    $('#resultTitle').textContent='Monte a análise selecionando tema, indicador, filtros e gráfico';
    $('#resultSubtitle').textContent='Escolha um tema, um indicador, os filtros desejados e o tipo de gráfico para visualizar a análise.';
    $('#chart').innerHTML=`<div class="panel-subtitle">Selecione novamente os blocos para gerar um gráfico.</div>`;
    $('#chartCompare').innerHTML='';
    $('#chartComparisonGrid')?.classList.remove('compare-active');
    S.tableRows=[];S.primaryTableRows=[];S.compareTableRows=[];
    renderTable();
    saveAnalysisState();
    recordHistory();
  });
  $('#clearFilters').addEventListener('click',()=>{renderFilters();renderCompareIndicators();populationTransitionState.lastPopulation='População Geral';clearLegendStateForNewData();invalidateAnalysisData();refreshAnalysis({dataChanged:true});});
  $('#clearLegendSearch')?.addEventListener('click', ()=>{const field=$('#legendSearchInput'); if(field) field.value=''; S.legendSearch=''; saveAnalysisState(); if(hasRequiredBlocks()) scheduleGenerate(0);});
  $('#showAllLegendItems')?.addEventListener('click', revealAllCategories);
  $('#saveAnalysisBtn')?.addEventListener('click', ()=>{saveAnalysisState({recordVersion:false});recordHistory();addVersionRecord('Análise salva',{force:true});announceSave('Análise salva no navegador e registrada no histórico.');});
  $('#undoAction')?.addEventListener('click',undoAnalysis);
  $('#redoAction')?.addEventListener('click',redoAnalysis);
  $('#versionHistoryBtn')?.addEventListener('click',()=>{renderVersionHistory();$('#versionHistoryDialog')?.showModal();});
  $('#versionHistoryList')?.addEventListener('click',ev=>{const restore=ev.target.closest('[data-restore-version]');const remove=ev.target.closest('[data-delete-version]');if(restore)restoreVersionRecord(restore.dataset.restoreVersion);if(remove)deleteVersionRecord(remove.dataset.deleteVersion);});
  $('#clearVersionHistory')?.addEventListener('click',clearVersionHistory);
  $('#favoritesBtn')?.addEventListener('click',()=>{renderFavorites();$('#favoritesDialog')?.showModal();});
  $('#saveFavoriteBtn')?.addEventListener('click',saveCurrentFavorite);
  $('#favoriteList')?.addEventListener('click',ev=>{
    const load=ev.target.closest('[data-load-favorite]');
    const del=ev.target.closest('[data-delete-favorite]');
    if(load) loadFavorite(load.dataset.loadFavorite);
    if(del) deleteFavorite(del.dataset.deleteFavorite);
  });
  $('#shareConfigBtn')?.addEventListener('click',shareConfiguration);
  $('#downloadReportPdf')?.addEventListener('click',async()=>{if(await ensureAnalysisCurrent()) generatePdfReport();});
  $('#runTestsBtn')?.addEventListener('click',runAutomatedTests);
  $$('[data-close-dialog]').forEach(btn=>btn.addEventListener('click',()=>$('#'+btn.dataset.closeDialog)?.close()));
  $('#fullscreenChart')?.addEventListener('click', ()=>{const wrap=$('#chartWrapper'); if(!wrap) return; if(document.fullscreenElement) document.exitFullscreen(); else if(wrap.requestFullscreen) wrap.requestFullscreen();});
  document.addEventListener('fullscreenchange',()=>{const btn=$('#fullscreenChart'); if(btn) btn.textContent=document.fullscreenElement?'Sair da tela cheia':'Tela cheia';});
  $('#compareEnabled')?.addEventListener('change',ev=>{S.compareEnabled=ev.target.checked;saveAnalysisState();if(hasRequiredBlocks())scheduleGenerate(0);});
  $('#compareIndicator')?.addEventListener('change',ev=>{S.compareIndicatorId=ev.target.value||null;saveAnalysisState();if($('#compareEnabled')?.checked&&hasRequiredBlocks())scheduleGenerate(0);});
  $('#restoreAppearance')?.addEventListener('click', clearAppearanceOnly);
  $('#presetDefault')?.addEventListener('click', ()=>applyAppearancePreset('default'));
  $('#presetPresentation')?.addEventListener('click', ()=>applyAppearancePreset('presentation'));
  $('#presetPrint')?.addEventListener('click', ()=>applyAppearancePreset('print'));
  $('#presetContrast')?.addEventListener('click', ()=>applyAppearancePreset('contrast'));

  const filterPanel = document.querySelector('.filter-panel');
  if(filterPanel){
    filterPanel.addEventListener('click',ev=>{
      const trash = ev.target.closest('.cluster-trash');
      if(trash){ev.preventDefault();ev.stopPropagation();clearFilterSection(trash.dataset.clearSection);}
    });
  }
  bindAutomaticAnalysisUpdates();

  $('#allYears').addEventListener('click',()=>{$$('#yearChecks input').forEach(i=>{i.checked=!i.disabled;}); queueFilterRefresh($('#yearChecks'),0);});
  $('#noYears').addEventListener('click',()=>{$$('#yearChecks input').forEach(i=>i.checked=false); queueFilterRefresh($('#yearChecks'),0);});
  $('#latestYear').addEventListener('click',()=>{const enabled=$$('#yearChecks input').filter(i=>!i.disabled);$$('#yearChecks input').forEach(i=>i.checked=false);if(enabled.length) enabled.at(-1).checked=true;queueFilterRefresh($('#yearChecks'),0);});
  $('#allAgeDetails').addEventListener('click',()=>{$$('#ageDetailChecks input').forEach(i=>i.checked=true);$$('#ageChecks input').forEach(i=>i.checked=false);queueFilterRefresh($('#ageDetailChecks'),0);});
  $('#noAgeDetails').addEventListener('click',()=>{$$('#ageDetailChecks input').forEach(i=>i.checked=false);queueFilterRefresh($('#ageDetailChecks'),0);});
  $('#allAges').addEventListener('click',()=>{$$('#ageChecks input').forEach(i=>i.checked=true);$$('#ageDetailChecks input').forEach(i=>i.checked=false);queueFilterRefresh($('#ageChecks'),0);});
  $('#noAges').addEventListener('click',()=>{$$('#ageChecks input').forEach(i=>i.checked=false);queueFilterRefresh($('#ageChecks'),0);});

  $('#downloadCsv').addEventListener('click',async()=>{if(!(await ensureAnalysisCurrent())) return;downloadCsv(S.tableRows,'Analise Vigitel.csv');addVersionRecord('Exportação CSV',{force:true});});
  $('#downloadExcel').addEventListener('click',async()=>{if(!(await ensureAnalysisCurrent())) return;downloadExcel(S.tableRows,'Analise Vigitel.xls');addVersionRecord('Exportação Excel',{force:true});});
  $('#downloadBaseCsv').addEventListener('click',async()=>{if(!(await ensureAnalysisCurrent())) return;downloadCsv(currentBaseRowsForExport(),'Base Filtrada Vigitel.csv');addVersionRecord('Exportação da base CSV',{force:true});});
  $('#downloadBaseExcel').addEventListener('click',async()=>{if(!(await ensureAnalysisCurrent())) return;downloadExcel(currentBaseRowsForExport(),'Base Filtrada Vigitel.xls');addVersionRecord('Exportação da base Excel',{force:true});});
  $('#downloadImage').addEventListener('click',async()=>{if(await ensureAnalysisCurrent()) downloadSvg();});
  $('#downloadVectorSvg')?.addEventListener('click',async()=>{if(await ensureAnalysisCurrent()) downloadVectorSvg();});
  $('#legendSearchInput')?.addEventListener('input', ev=>{S.legendSearch=ev.target.value||'';saveAnalysisState();if(hasRequiredBlocks())scheduleGenerate(60);});
  $('#chartWrapper')?.addEventListener('click',ev=>{const item=ev.target.closest('[data-legend-category]');if(item)toggleHiddenCategory(decodeURIComponent(item.getAttribute('data-legend-category')));});
  $('#chartWrapper')?.addEventListener('keydown',ev=>{const item=ev.target.closest('[data-legend-category]');if(item&&(ev.key==='Enter'||ev.key===' ')){ev.preventDefault();toggleHiddenCategory(decodeURIComponent(item.getAttribute('data-legend-category')));}});

  $('#tableSearch')?.addEventListener('input',ev=>{tableState.search=ev.target.value||'';tableState.page=1;saveAnalysisState();renderTable();});
  $('#tableSort')?.addEventListener('change',ev=>{tableState.sort=ev.target.value;tableState.page=1;saveAnalysisState();renderTable();});
  $('#tablePageSize')?.addEventListener('change',ev=>{tableState.pageSize=Number(ev.target.value)||25;tableState.page=1;saveAnalysisState();renderTable();});
  $('#tablePrev')?.addEventListener('click',()=>{tableState.page=Math.max(1,tableState.page-1);renderTable();});
  $('#tableNext')?.addEventListener('click',()=>{tableState.page+=1;renderTable();});

  document.addEventListener('keydown',ev=>{
    const actionTarget=ev.target.closest('.block-card, .theme-header, .theme-indicator-item');
    if(actionTarget&&(ev.key==='Enter'||ev.key===' ')){ev.preventDefault();actionTarget.click();return;}
    if((ev.ctrlKey||ev.metaKey)&&ev.key.toLowerCase()==='z'){ev.preventDefault();ev.shiftKey?redoAnalysis():undoAnalysis();}
    if((ev.ctrlKey||ev.metaKey)&&ev.key.toLowerCase()==='y'){ev.preventDefault();redoAnalysis();}
  });
  window.addEventListener('afterprint',()=>{$('#reportPrintArea')?.setAttribute('aria-hidden','true');});

  $$('.drop-slot').forEach(slot=>{
    slot.addEventListener('dragover',ev=>ev.preventDefault());
    slot.addEventListener('drop',ev=>{
      ev.preventDefault();
      const payload=JSON.parse(ev.dataTransfer.getData('text/plain')||'{}');
      if(payload.type==='theme'&&slot.dataset.slot==='theme')selectBlock('theme',payload.id);
      if(payload.type==='indicator'&&slot.dataset.slot==='indicator')selectBlock('indicator',payload.id);
      if(payload.type==='filters'&&slot.dataset.slot==='filters')selectBlock('filters',payload.id);
      if(payload.type==='chart'&&slot.dataset.slot==='chart')selectBlock('chart',payload.id);
    });
  });
}

/**
 * Atualiza todos os blocos visuais e os cartões do construtor de uma vez.
 */
function renderAll(){renderThemes();renderIndicators();renderFilterBlock();renderChartBlocks();renderCompareIndicators();renderSlots();updateChartExplanation();upgradeAccessibility();}

/**
 * Atualiza os resumos dos filtros e dos controles visuais do painel.
 */
function updateSummaries(){
  enforcePopulationYearUI();

  const pop = $('#popFilter')?.value;
  const y = selectedChecks('#yearChecks');

  $('#yearSummary').textContent = pop === 'População Negra'
    ? '2018 disponível'
    : (y.length===0 || y.length===DATA.dims.years.length ? 'Período completo' : `${y.length} selecionados`);

  const ad = selectedChecks('#ageDetailChecks');
  $('#ageDetailSummary').textContent = ad.length===0 ? 'Nenhuma' : (ad.length===DETAILED_AGES.length ? 'Todas' : `${ad.length} selecionadas`);
  const a = selectedChecks('#ageChecks');
  $('#ageSummary').textContent = a.length===0 ? 'Nenhuma' : (a.length===DATA.dims.ages.length ? 'Todas' : `${a.length} selecionadas`);

  if($('#fontSizeValue') && $('#fontSize')) $('#fontSizeValue').textContent = $('#fontSize').value+' px';
  if($('#titleSizeValue') && $('#titleSize')) $('#titleSizeValue').textContent = $('#titleSize').value+' px';
  if($('#subtitleSizeValue') && $('#subtitleSize')) $('#subtitleSizeValue').textContent = $('#subtitleSize').value+' px';
  if($('#axisSizeValue') && $('#axisSize')) $('#axisSizeValue').textContent = $('#axisSize').value+' px';
  if($('#valueSizeValue') && $('#valueSize')) $('#valueSizeValue').textContent = $('#valueSize').value+' px';
  if($('#legendSizeValue') && $('#legendSize')) $('#legendSizeValue').textContent = $('#legendSize').value+' px';
  if($('#barWidthScaleValue') && $('#barWidthScale')) $('#barWidthScaleValue').textContent = $('#barWidthScale').value+'%';
  if($('#lineWidthValue') && $('#lineWidth')) $('#lineWidthValue').textContent = $('#lineWidth').value+' px';
  if($('#pointSizeValue') && $('#pointSize')) $('#pointSizeValue').textContent = $('#pointSize').value+' px';
  if($('#donutHoleValue') && $('#donutHole')) $('#donutHoleValue').textContent = $('#donutHole').value+'%';
}

/**
 * Retorna os valores marcados em uma lista de checkboxes.
 */
function selectedChecks(sel){return $$(sel+' input:checked').map(i=>i.value);}

/**
 * Conta apenas filtros que realmente restringem a análise, evitando marcar o cartão de filtros sem necessidade.
 */
function activeFilterCount(){
  const f=getFilters();
  let n=0;
  if(f.years.length) n++;
  if(f.ageDetails.length) n++;
  if(f.ages.length) n++;
  if(f.sex!=='Nenhum' && f.sex!=='Todos') n++;
  if(f.region!=='Nenhum' && f.region!=='Brasil') n++;
  if(f.uf!=='Nenhum' && f.uf!=='Brasil') n++;
  if(f.pop!=='Nenhum' && f.pop!=='Todas' && f.pop!=='População Geral') n++;
  return n;
}

/* Cache dos anos disponíveis por indicador e população. Evita percorrer toda a base a cada alteração de filtro. */
const indicatorYearAvailabilityCache = new Map();

/**
 * Retorna os anos que possuem dados para o indicador e a população selecionados.
 */
function availableYearsForIndicator(indicatorId=S.indicator?.id, population=$('#popFilter')?.value || 'População Geral'){
  if(!indicatorId) return [...DATA.dims.years];
  const cacheKey=`${indicatorId}|${population}`;
  if(indicatorYearAvailabilityCache.has(cacheKey)) return indicatorYearAvailabilityCache.get(cacheKey);
  const indicatorIndex=DATA.indicators.findIndex(item=>item.id===indicatorId);
  const allowedPopulations = population === 'Todas' || population === 'Nenhum'
    ? new Set(DATA.dims.pops.map((_,index)=>index))
    : new Set([DATA.dims.pops.indexOf(population)].filter(index=>index>=0));
  const years=[...new Set(DATA.rows
    .filter(row=>row[C.ind]===indicatorIndex && allowedPopulations.has(row[C.pop]) && Number(row[C.den])>0)
    .map(row=>DATA.dims.years[row[C.year]]))]
    .sort((a,b)=>Number(a)-Number(b));
  indicatorYearAvailabilityCache.set(cacheKey,years);
  return years;
}

/**
 * Limita os anos aos realmente disponíveis para o indicador e para a população selecionada.
 */
function enforcePopulationYearUI(){
  const pop = $('#popFilter')?.value || 'População Geral';
  const blackPopulation = pop === 'População Negra';
  const available = new Set(availableYearsForIndicator(S.indicator?.id,pop));

  $$('#yearChecks input').forEach(input=>{
    const label = input.closest('label');
    const allowed = available.has(input.value) && (!blackPopulation || input.value === '2018');
    input.disabled = !allowed;
    if(!allowed) input.checked = false;
    if(blackPopulation && allowed) input.checked = true;
    if(label) label.classList.toggle('disabled-year-option', !allowed);
    input.setAttribute('aria-disabled',String(!allowed));
    if(label) label.title = allowed ? 'Ano disponível para o indicador selecionado' : 'Ano sem dados para o indicador e a população selecionados';
  });
}

/**
 * Lê o estado dos filtros e aplica a regra da População Negra restrita a 2018.
 */
function getFilters(){
  enforcePopulationYearUI();

  const pop = $('#popFilter').value;
  const years = pop === 'População Negra' ? ['2018'] : selectedChecks('#yearChecks');

  return {
    years: years,
    ageDetails:selectedChecks('#ageDetailChecks'),
    ages:selectedChecks('#ageChecks'),
    sex:$('#sexFilter').value,
    region:$('#regionFilter').value,
    uf:$('#ufFilter').value,
    pop:pop,
    group:$('#groupFilter').value
  };
}

/**
 * Extrai a categoria da linha conforme o recorte escolhido.
 */
function rowValue(row, dim){
  if(dim==='Ano') return DATA.dims.years[row[C.year]];
  if(dim==='Região') return DATA.dims.regions[row[C.region]];
  if(dim==='UF') return DATA.dims.ufs[row[C.uf]];
  if(dim==='Sexo') return DATA.dims.sexes[row[C.sex]];
  if(dim==='Faixa etária quinquenal') return DATA.dims.ages[row[C.age]];
  if(dim==='Idade detalhada') return DATA.dims.ages[row[C.age]];
  return '';
}

/**
 * Filtra a base conforme indicador, ano, sexo, população, UF, região e idade.
 */
function filterRows(f, indicatorId=S.indicator?.id){
  const validYears = f.pop === 'População Negra' ? ['2018'] : (f.years.length ? f.years : DATA.dims.years);
  const yearSet = new Set(validYears);
  const ageGroupsFromDetails = (f.ageDetails || []).map(detailToAgeGroup).filter(Boolean);
  const ageSet = new Set([...(f.ages || []), ...ageGroupsFromDetails]);
  const indIdx = DATA.indicators.findIndex(i=>i.id===indicatorId);

  return DATA.rows.filter(r=>{
    if(r[C.ind]!==indIdx) return false;
    if(!yearSet.has(DATA.dims.years[r[C.year]])) return false;
    if(f.sex!=='Nenhum' && f.sex!=='Todos' && DATA.dims.sexes[r[C.sex]]!==f.sex) return false;
    if(f.pop!=='Nenhum' && f.pop!=='Todas' && DATA.dims.pops[r[C.pop]]!==f.pop) return false;
    if(f.uf!=='Nenhum' && f.uf!=='Brasil' && DATA.dims.ufs[r[C.uf]]!==f.uf) return false;
    if((f.uf==='Nenhum' || f.uf==='Brasil') && f.region!=='Nenhum' && f.region!=='Brasil' && DATA.dims.regions[r[C.region]]!==f.region) return false;
    if(ageSet.size && !ageSet.has(DATA.dims.ages[r[C.age]])) return false;
    return true;
  });
}


/**
 * Confere se as linhas filtradas possuem valores e denominadores utilizáveis.
 */
function validateFilteredRows(rows, filters){
  if(filters.sex && !['Nenhum','Todos'].includes(filters.sex)){
    const invalid = rows.some(row=>DATA.dims.sexes[row[C.sex]] !== filters.sex);
    if(invalid) throw new Error(`O filtro de sexo ${filters.sex} não foi respeitado.`);
  }
  if(filters.pop && !['Nenhum','Todas'].includes(filters.pop)){
    const invalid = rows.some(row=>DATA.dims.pops[row[C.pop]] !== filters.pop);
    if(invalid) throw new Error(`O filtro de população ${filters.pop} não foi respeitado.`);
  }
  if(filters.pop === 'População Negra'){
    const invalidYear = rows.some(row=>DATA.dims.years[row[C.year]] !== '2018');
    if(invalidYear) throw new Error('A População Negra deve utilizar exclusivamente a base de 2018.');
  }
  return rows;
}

/**
 * Mantém o recorte escolhido pelo usuário, inclusive idade detalhada.
 */
function effectiveGroup(group){
  return group;
}
/**
 * Escolhe o recorte do gráfico sem trocar idade detalhada por faixa etária.
 */
function chooseGroup(f){
  const supportsExactAge = exactAgeSupported(S.indicator?.id);
  const blackSingleYear = f.pop === 'População Negra' && availableYearsForIndicator(S.indicator?.id,f.pop).length <= 1;

  if((f.ageDetails || []).length > 0 && supportsExactAge){
    return 'Idade detalhada';
  }
  if((f.ageDetails || []).length > 0 && !supportsExactAge){
    return 'Faixa etária quinquenal';
  }

  if(blackSingleYear && ['Automático','Ano'].includes(f.group)){
    return supportsExactAge ? 'Idade detalhada' : 'Faixa etária quinquenal';
  }

  if(f.group === 'Idade detalhada' && !supportsExactAge) return 'Faixa etária quinquenal';
  if(f.group !== 'Automático') return f.group;
  if((f.ages || []).length > 0) return 'Faixa etária quinquenal';
  if(['line','area'].includes(S.chart)) return 'Ano';
  if(f.region !== 'Nenhum' && f.region !== 'Brasil' && (f.uf === 'Nenhum' || f.uf === 'Brasil')) return 'UF';
  if(f.sex === 'Todos') return 'Sexo';
  return 'Região';
}

/**
 * Agrupa os dados; em idade detalhada, distribui a faixa etária disponível pelas idades correspondentes.
 */
function aggregate(rows, group, filters=getFilters()){
  const realGroup = effectiveGroup(group);
  const map = new Map();
  const chosenDetailedAges = new Set(filters?.ageDetails || []);

  rows.forEach(r=>{
    if(realGroup === 'Idade detalhada'){
      const faixa = DATA.dims.ages[r[C.age]];
      let detalhes = detailsFromGroup(faixa);
      if(chosenDetailedAges.size){
        detalhes = detalhes.filter(idade => chosenDetailedAges.has(idade));
      }

      if(!detalhes.length) return;

      const divisor = detalhes.length;
      detalhes.forEach(idade=>{
        if(!map.has(idade)) map.set(idade,{category:idade,numerador:0,denominador:0,n:0,cases:0,w2:0});
        const it = map.get(idade);
        it.numerador += (Number(r[C.num]) || 0) / divisor;
        it.denominador += (Number(r[C.den]) || 0) / divisor;
        it.n += (Number(r[C.n]) || 0) / divisor;
        it.cases += (Number(r[C.cases]) || 0) / divisor;
        it.w2 += (Number(r[C.w2]) || 0) / divisor;
      });
      return;
    }

    const key = rowValue(r, realGroup);
    if(!key) return;
    if(!map.has(key)) map.set(key,{category:key,numerador:0,denominador:0,n:0,cases:0,w2:0});
    const it=map.get(key);
    it.numerador += Number(r[C.num])||0;
    it.denominador += Number(r[C.den])||0;
    it.n += Number(r[C.n])||0;
    it.cases += Number(r[C.cases])||0;
    it.w2 += Number(r[C.w2])||0;
  });

  let data = Array.from(map.values())
    .filter(d=>d.denominador > 0)
    .map(d=>({
      ...d,
      value: d.numerador/d.denominador*100
    }));

  data.sort((a,b)=>sortKey(a.category,realGroup)-sortKey(b.category,realGroup) || String(a.category).localeCompare(String(b.category),'pt-BR',{numeric:true}));
  return data;
}

/**
 * Define a ordem das categorias no eixo ou na legenda do gráfico.
 */
function sortKey(v, group){
  if(group==='Ano') return Number(v);
  if(group==='Região') return DATA.dims.regions.indexOf(v);
  if(group==='UF') return DATA.dims.ufs.indexOf(v);
  if(group==='Sexo') return DATA.dims.sexes.indexOf(v);
  if(group==='Faixa etária quinquenal') return DATA.dims.ages.indexOf(v);
  if(group==='Idade detalhada') return Number(String(v).split(" ")[0]);
  return 999;
}

/**
 * Extrai e ordena os anos presentes no conjunto de linhas recebido.
 */
function yearsFromRows(rows){
  return [...new Set((rows || [])
    .map(row=>DATA.dims.years[row[C.year]])
    .filter(Boolean))]
    .sort((a,b)=>Number(a)-Number(b));
}

/**
 * Monta o título do gráfico a partir do indicador e dos principais filtros.
 */
function buildTitleForIndicator(indicator, filters, group, rows=[]){
  const previous = S.indicator;
  S.indicator = indicator;
  const title = buildTitle(filters, group, yearsFromRows(rows));
  S.indicator = previous;
  return title;
}

/**
 * Converte os dados agregados em linhas prontas para a tabela e para exportações.
 */
function dataToTableRows(data, indicator, group){
  return data.map(d=>{
    const precision = estimatePrecision(d);
    return {
      Indicador: indicator?.label || '',
      Categoria: displayCategory(d.category,effectiveGroup(group)),
      'Valor (%)': fmt(d.value),
      'IC 95% aproximado': Number.isFinite(precision.low) ? `${fmt(precision.low)} – ${fmt(precision.high)}` : 'Não calculável',
      'CV aproximado (%)': Number.isFinite(precision.cv) ? fmt(precision.cv) : 'Não calculável',
      Numerador: Math.round(d.numerador*100)/100,
      Denominador: Math.round(d.denominador*100)/100,
      Casos: Math.round(d.cases||0),
      Entrevistas: Math.round(d.n),
      'Amostra efetiva aproximada': Number.isFinite(precision.nEffective) ? Math.round(precision.nEffective) : '',
      'Precisão amostral': precision.label,
      PrecisaoChave: precision.key,
      Fonte: DATA.meta.source
    };
  });
}

/**
 * Produz uma lista legível dos filtros que restringem a análise.
 */
function activeFilterDescriptions(f){
  const descriptions=[];
  if(f.years?.length && f.years.length < DATA.dims.years.length) descriptions.push(`anos: ${f.years.join(', ')}`);
  if(f.sex && !['Todos','Nenhum'].includes(f.sex)) descriptions.push(`sexo: ${f.sex}`);
  if(f.pop && !['Todas','Nenhum'].includes(f.pop)) descriptions.push(`população: ${f.pop}`);
  if(f.uf && !['Brasil','Nenhum'].includes(f.uf)) descriptions.push(`UF: ${f.uf}`);
  else if(f.region && !['Brasil','Nenhum'].includes(f.region)) descriptions.push(`região: ${f.region}`);
  if(f.ageDetails?.length) descriptions.push(`idades detalhadas: ${f.ageDetails.length} selecionada(s)`);
  if(f.ages?.length) descriptions.push(`faixas etárias: ${f.ages.length} selecionada(s)`);
  return descriptions;
}

/**
 * Identifica quais filtros eliminaram todos os registros e sugere ajustes.
 */
function diagnoseEmptyFilters(f, indicator){
  const unrestricted={years:[],ageDetails:[],ages:[],sex:'Todos',region:'Brasil',uf:'Brasil',pop:'Todas',group:f.group};
  const allIndicatorRows=filterRows(unrestricted,indicator?.id);
  if(!allIndicatorRows.length){
    return {title:'Indicador sem Dados na base ativa',details:`O indicador ${indicator?.id || ''} não possui linhas disponíveis na versão atual da base.`,culprits:[],rowCount:0};
  }

  const tests=[];
  /**
   * Registra um caso de teste e o resultado observado.
   */
  const addTest=(label,change)=>{
    const relaxed={...f,years:[...(f.years||[])],ageDetails:[...(f.ageDetails||[])],ages:[...(f.ages||[])]};
    change(relaxed);
    const count=filterRows(relaxed,indicator?.id).length;
    tests.push({label,count});
  };

  if(f.years?.length && f.years.length < DATA.dims.years.length) addTest('período selecionado',x=>{x.years=[];});
  if(f.sex && !['Todos','Nenhum'].includes(f.sex)) addTest(`sexo ${f.sex}`,x=>{x.sex='Todos';});
  if(f.pop && !['Todas','Nenhum'].includes(f.pop)) addTest(`tipo de população ${f.pop}`,x=>{x.pop='Todas';x.years=[];});
  if(f.uf && !['Brasil','Nenhum'].includes(f.uf)) addTest(`UF ${f.uf}`,x=>{x.uf='Brasil';});
  if((!f.uf || ['Brasil','Nenhum'].includes(f.uf)) && f.region && !['Brasil','Nenhum'].includes(f.region)) addTest(`região ${f.region}`,x=>{x.region='Brasil';});
  if(f.ageDetails?.length || f.ages?.length) addTest('recorte etário selecionado',x=>{x.ageDetails=[];x.ages=[];});

  const direct=tests.filter(test=>test.count>0).sort((a,b)=>b.count-a.count);
  if(direct.length){
    return {title:'Um filtro provavelmente eliminou todos os ResultadosProcessados',details:`Ao retirar ${direct[0].label}, a consulta volta a encontrar ${direct[0].count.toLocaleString('pt-BR')} linha(s).`,culprits:direct,rowCount:direct[0].count};
  }

  const relaxed={...f,years:[...(f.years||[])],ageDetails:[...(f.ageDetails||[])],ages:[...(f.ages||[])]};
  const removed=[];
  const steps=[
    ['recorte etário',x=>{x.ageDetails=[];x.ages=[];}],
    ['UF',x=>{x.uf='Brasil';}],
    ['região',x=>{x.region='Brasil';}],
    ['sexo',x=>{x.sex='Todos';}],
    ['tipo de população',x=>{x.pop='Todas';x.years=[];}],
    ['período',x=>{x.years=[];}]
  ];
  for(const [label,change] of steps){
    change(relaxed);removed.push(label);
    const count=filterRows(relaxed,indicator?.id).length;
    if(count>0){
      return {title:'A combinação de filtros ficou restritiva demais',details:`A consulta volta a ter dados após retirar: ${removed.join(', ')}. Foram encontradas ${count.toLocaleString('pt-BR')} linha(s).`,culprits:removed.map(item=>({label:item,count})),rowCount:count};
    }
  }

  return {title:'Não foi possível localizar o bloqueio automaticamente',details:'A base possui dados para o indicador, mas a combinação atual não encontrou denominadores válidos. Verifique também a versão ativa da base e a validação administrativa.',culprits:tests,rowCount:0};
}

/**
 * Monta a mensagem exibida quando não há dados para a combinação selecionada.
 */
function emptyStateHtml(f, indicator, contextLabel='gráfico principal'){
  const active=activeFilterDescriptions(f);
  const isAdmin=document.body.classList.contains('admin-unlocked');
  const diagnosis=isAdmin ? diagnoseEmptyFilters(f,indicator) : null;
  const firstSuggestion=active.length ? `Comece removendo ou ampliando: ${active[active.length-1]}.` : 'Tente selecionar outro período, localização ou recorte populacional.';
  const adminDetails=diagnosis ? `<div class="empty-state-admin"><strong>Diagnóstico administrativo</strong><p><b>${esc(diagnosis.title)}</b></p><p>${esc(diagnosis.details)}</p>${active.length?`<p><b>Filtros ativos:</b> ${active.map(esc).join(' · ')}</p>`:'<p>Nenhum filtro restritivo foi identificado na interface.</p>'}<p>Contexto: ${esc(contextLabel)} · indicador ${esc(indicator?.id || '')}.</p></div>` : '';
  return `<div class="empty-state-card"><h3>Nenhum resultado para esta combinação</h3><p>Os dados não desapareceram da plataforma; algum filtro ou a combinação entre eles provavelmente deixou a consulta sem observações válidas.</p><ul><li>${esc(firstSuggestion)}</li><li>Use o botão <b>Limpar</b> do grupo de filtros para testar novamente.</li><li>Confira se o ano escolhido está disponível para o tipo de população selecionado.</li></ul>${adminDetails}</div>`;
}

/**
 * Gera a análise completa, comparação opcional, avisos e tabela paginada.
 */
async function generate(options={}){
  const shouldRecord = options.recordHistory !== false;
  const shouldSave = options.save !== false;
  const requestToken = options.requestToken || ++currentGenerationToken;
  try{
    renderSlots();
    updateChartExplanation();
    if(!S.theme || !S.indicator || !S.chart){
      $('#resultTitle').textContent = 'Monte a análise selecionando tema, indicador, filtros e gráfico';
      $('#resultSubtitle').textContent = 'Escolha um tema, um indicador, os filtros desejados e o tipo de gráfico para visualizar a análise.';
      $('#chart').innerHTML = `<div class="panel-subtitle">Selecione um tema, um indicador e um tipo de gráfico para continuar.</div>`;
      $('#chartCompare').innerHTML='';
      $('#chartComparisonGrid')?.classList.remove('compare-active');
      $('#tableBody').innerHTML='';
      S.tableRows=[]; S.primaryTableRows=[]; S.compareTableRows=[];
      updateChartAdvice([], '');
      renderTable();
      return;
    }

    const f=getFilters();
    const group=chooseGroup(f);
    const generationToken=requestToken;
    const requestSignature=analysisRequestSignature(f);
    if(effectiveGroup(group)==='Idade detalhada' || Boolean(f.ageDetails?.length)){
      const ids=[S.indicator.id];
      const compareId=$('#compareEnabled')?.checked ? ($('#compareIndicator')?.value || '') : '';
      if(compareId && compareId!==S.indicator.id) ids.push(compareId);
      $('#chart').innerHTML='<div class="panel-subtitle">Carregando idades exatas calculadas diretamente de q6...</div>';
      try{
        await Promise.all(ids.map(loadExactAgeIndicator));
        if(generationToken!==currentGenerationToken) return;
        analysisCache.clear();
      }catch(error){
        if(generationToken!==currentGenerationToken) return;
        $('#resultTitle').textContent=buildTitle(f,group);
        $('#resultSubtitle').textContent='A idade detalhada não está disponível para este indicador.';
        $('#chart').innerHTML=`<div class="empty-state-card"><h3>Idade detalhada indisponível</h3><p>${esc(error.message || String(error))}</p><p>Escolha outro indicador ou utilize a faixa etária quinquenal.</p></div>`;
        $('#chartCompare').innerHTML='';
        $('#chartComparisonGrid')?.classList.remove('compare-active');
        S.tableRows=[]; S.primaryTableRows=[]; S.compareTableRows=[];
        renderTable();
        return;
      }
    }
    if(generationToken!==currentGenerationToken) return;
    const primaryResult=getAnalysisResult(S.indicator,f,group);
    const rows=primaryResult.rows;
    const data=primaryResult.data;
    if(!data.length){
      $('#resultTitle').textContent = buildTitle(f, group);
      $('#resultSubtitle').textContent = buildSubtitle(f, group, 0);
      $('#chart').innerHTML = emptyStateHtml(f,S.indicator,'gráfico principal');
      $('#chartCompare').innerHTML='';
      $('#chartComparisonGrid')?.classList.remove('compare-active');
      $('#tableBody').innerHTML='';
      S.tableRows=[]; S.primaryTableRows=[]; S.compareTableRows=[];
      updateChartAdvice([], group);
      renderTable();
      return;
    }

    if(generationToken!==currentGenerationToken) return;
    S.rows=rows;
    S.lastGroup=group;
    S.lastFilters=JSON.parse(JSON.stringify(f));
    S.lastPrimaryData=data;
    S.primaryTableRows=dataToTableRows(data,S.indicator,group);
    const availableYears = yearsFromRows(rows);
    const title = buildTitle(f, group, availableYears);
    const subtitle = buildSubtitle(f, group, rows.length);
    $('#resultTitle').textContent = title;
    $('#resultSubtitle').textContent = subtitle;
    const primaryMeta={title, subtitle, source:`Fonte: Vigitel | Ministério da Saúde. Gráfico elaborado no Observatório Analítico do Vigitel.`};
    S.graphMeta=primaryMeta;
    drawChart(data, group, '#chart', S.chart, primaryMeta);

    const compareEnabled=Boolean($('#compareEnabled')?.checked);
    const compareId=$('#compareIndicator')?.value || '';
    const compareIndicator=compareEnabled && compareId && compareId!==S.indicator.id ? DATA.indicators.find(i=>i.id===compareId) : null;
    S.compareEnabled=Boolean(compareIndicator);
    S.compareIndicatorId=compareIndicator?.id || compareId || null;
    const grid=$('#chartComparisonGrid');
    const primaryLabel=$('#primaryChartLabel');
    const secondaryLabel=$('#secondaryChartLabel');
    if(primaryLabel) primaryLabel.textContent=S.indicator.label;

    if(compareIndicator){
      const comparison=getAnalysisResult(compareIndicator,f,group);
      S.lastCompareData=comparison.data;
      S.compareTableRows=dataToTableRows(comparison.data,compareIndicator,group);
      const compareTitle=buildTitleForIndicator(compareIndicator,f,group,comparison.rows);
      const compareSubtitle=buildSubtitle(f,group,comparison.rows.length);
      const compareMeta={title:compareTitle,subtitle:compareSubtitle,source:`Fonte: Vigitel | Ministério da Saúde. Gráfico elaborado no Observatório Analítico do Vigitel.`};
      S.compareGraphMeta=compareMeta;
      if(comparison.data.length){
        drawChart(comparison.data,group,'#chartCompare',S.chart,compareMeta);
      }else{
        $('#chartCompare').innerHTML=emptyStateHtml(f,compareIndicator,'gráfico de comparação');
      }
      if(secondaryLabel) secondaryLabel.textContent=compareIndicator.label;
      grid?.classList.add('compare-active');
    }else{
      S.lastCompareData=[];
      S.compareTableRows=[];
      S.compareGraphMeta=null;
      $('#chartCompare').innerHTML='';
      grid?.classList.remove('compare-active');
    }

    if(generationToken!==currentGenerationToken) return;
    S.tableRows=[...S.primaryTableRows,...S.compareTableRows];
    S.lastAnalysisSignature=requestSignature;
    tableState.page=1;
    safeRun('orientações do gráfico', ()=>updateChartAdvice([...data,...S.lastCompareData], group));
    safeRun('tabela de ResultadosProcessados', ()=>renderTable());
    safeRun('mensagem de salvamento', ()=>announceSave('A análise está salva automaticamente neste navegador.'));
    if(shouldSave) safeRun('salvar análise', ()=>saveAnalysisState());
    if(shouldRecord) safeRun('registrar histórico', ()=>recordHistory());
  }catch(e){
    console.error('Falha geral na geração do gráfico:', e);
    const chartEl = $('#chart');
    S.lastAnalysisSignature = '';
    S.lastPrimaryData = [];
    S.lastCompareData = [];
    S.primaryTableRows = [];
    S.compareTableRows = [];
    S.tableRows = [];
    try{
      const currentFilters = getFilters();
      const currentGroup = chooseGroup(currentFilters);
      const retry = getAnalysisResult(S.indicator,currentFilters,currentGroup);
      if(retry.data.length){
        const title = buildTitle(currentFilters,currentGroup,yearsFromRows(retry.rows));
        const subtitle = buildSubtitle(currentFilters,currentGroup,retry.rows.length);
        $('#resultTitle').textContent=title;
        $('#resultSubtitle').textContent=subtitle;
        const meta={title,subtitle,source:`Fonte: Vigitel | Ministério da Saúde. Gráfico elaborado no Observatório Analítico do Vigitel.`};
        drawChart(retry.data,currentGroup,'#chart','bar',meta);
        S.rows=retry.rows;
        S.lastGroup=currentGroup;
        S.lastFilters=JSON.parse(JSON.stringify(currentFilters));
        S.lastPrimaryData=retry.data;
        S.primaryTableRows=dataToTableRows(retry.data,S.indicator,currentGroup);
        S.tableRows=[...S.primaryTableRows];
        S.graphMeta=meta;
        S.lastAnalysisSignature=analysisRequestSignature(currentFilters);
        renderTable();
      }else if(chartEl){
        chartEl.innerHTML=emptyStateHtml(currentFilters,S.indicator,'gráfico principal');
        renderTable();
      }
    }catch(retryError){
      console.error('Falha também ao recomputar a análise atual:', retryError);
      if(chartEl) chartEl.innerHTML=`<div class="empty-state-card"><h3>Não foi possível concluir a análise</h3><p>Os filtros atuais não foram substituídos por dados anteriores.</p><p>${esc(retryError.message || e.message || 'Revise a seleção e tente novamente.')}</p></div>`;
      renderTable();
    }
  }finally{
    updateLoading(false);
  }
}

/**
 * Converte códigos ou categorias internas em nomes mais claros para exibição.
 */
function displayCategory(v,group){return group==='UF' ? (UF_NAMES[v]||v) : v;}

/**
 * Padroniza títulos com primeira letra maiúscula e restante natural.
 */
function toSentenceCase(text){
  const s = String(text || '').trim();
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}
/**
 * Cria o título do gráfico no padrão escolhido para o relatório.
 */
function buildTitle(f, group, availableYears=null){
  const indicador = toSentenceCase(S.indicator.label);
  const realGroup = effectiveGroup(group);

  const recorteMap = {
    'Ano':'ano',
    'Região':'região',
    'UF':'unidade da federação',
    'Sexo':'sexo',
    'Idade detalhada':'idade detalhada',
    'Faixa etária quinquenal':'faixa etária'
  };

  const local = f.uf !== 'Nenhum' && f.uf !== 'Brasil'
    ? (UF_NAMES[f.uf] || f.uf)
    : (f.region !== 'Nenhum' && f.region !== 'Brasil' ? `região ${f.region}` : 'capitais brasileiras');

  let recortePrincipal = recorteMap[realGroup] || String(realGroup).toLowerCase();
  if(realGroup === 'Sexo' && f.sex === 'Feminino') recortePrincipal = 'sexo feminino';
  if(realGroup === 'Sexo' && f.sex === 'Masculino') recortePrincipal = 'sexo masculino';
  const criterios = [recortePrincipal];

  if(realGroup !== 'Sexo' && f.sex === 'Feminino') criterios.push('sexo feminino');
  if(realGroup !== 'Sexo' && f.sex === 'Masculino') criterios.push('sexo masculino');

  if(f.pop === 'População Negra'){
    criterios.push('população negra');
  }else if(f.pop !== 'Nenhum' && f.pop !== 'Todas' && f.pop !== 'População Geral'){
    criterios.push(f.pop.toLowerCase());
  }

  const textoCriterios = criterios.length > 1
    ? `${criterios.slice(0,-1).join(', ')} e ${criterios.at(-1)}`
    : criterios[0];

  return `${indicador} segundo ${textoCriterios} — ${local}, ${periodLabel(f, availableYears)}`;
}

/**
 * Mostra unidade e fonte de forma discreta abaixo do título.
 */
function buildSubtitle(f, group, count){
  const partes = ['Indicador percentual calculado com dados do Vigitel'];

  if(f.pop === 'População Negra'){
    partes.push('população negra disponível somente para 2018');
  }

  return partes.join(' · ');
}

/**
 * Resume o período selecionado; para População Negra, fixa 2018.
 */
function periodLabel(f, availableYears=null){
  if(f.pop === 'População Negra') return '2018';
  const source = Array.isArray(availableYears) && availableYears.length
    ? availableYears
    : (f.years?.length ? f.years : DATA.dims.years);
  const yrs=[...new Set(source.map(String))].sort((a,b)=>Number(a)-Number(b));
  if(!yrs.length) return 'período sem dados';
  if(yrs.length===1) return yrs[0];
  const start=Number(yrs[0]);
  const end=Number(yrs.at(-1));
  const actual=new Set(yrs.map(Number));
  const missing=[];
  for(let year=start;year<=end;year++) if(!actual.has(year)) missing.push(year);
  if(missing.length===0) return `${start} a ${end}`;
  if(missing.length===1 && missing[0]===2022) return `${start} a ${end} (exceto 2022)`;
  const expectedWithout2022=[];
  for(let year=start;year<=end;year++) if(year!==2022) expectedWithout2022.push(year);
  const completeWithout2022=expectedWithout2022.every(year=>actual.has(year));
  if(completeWithout2022) return `${start} a ${end} (exceto 2022)`;
  return `${start} a ${end} (anos disponíveis)`;
}

/**
 * Lê o painel avançado e devolve todas as opções visuais aplicadas ao gráfico.
 */
function chartOptions(){
  const tamanhoTexto = Math.max(10, Number($('#fontSize')?.value || 18));
  const titulo = Math.max(14, Number($('#titleSize')?.value || 22));
  const subtitulo = Math.max(10, Number($('#subtitleSize')?.value || 14));
  const dec = Number($('#decimalPlaces')?.value || 1);

  return {
    primary: $('#primaryColor')?.value || '#073B70',
    secondary: $('#secondaryColor')?.value || '#0FA7A0',
    text: $('#textColor')?.value || '#16324F',
    chartBg: $('#chartBgColor')?.value || '#FFFFFF',
    plotBg: $('#plotBgColor')?.value || '#FFFFFF',
    gridColor: $('#gridColor')?.value || '#DDE7F2',
    borderColor: $('#borderColor')?.value || '#D6E1EE',
    font: $('#fontFamily')?.value || 'Arial',
    titleAlign: $('#titleAlign')?.value || 'left',
    subtitleAlign: $('#subtitleAlign')?.value || 'left',
    sourceAlign: $('#sourceAlign')?.value || 'left',
    titleSize: titulo,
    subtitleSize: subtitulo,
    axisSize: Math.max(8, Number($('#axisSize')?.value || 13)),
    legendSize: Math.max(8, Number($('#legendSize')?.value || $('#axisSize')?.value || 13)),
    valueSize: Math.max(8, Number($('#valueSize')?.value || 13)),
    size: tamanhoTexto,
    fs: tamanhoTexto,
    decimals: Number.isFinite(dec) ? dec : 1,
    customTitle: ($('#customTitle')?.value || '').trim(),
    customSubtitle: ($('#customSubtitle')?.value || '').trim(),
    sourceText: ($('#sourceText')?.value || '').trim(),
    xAxisTitle: ($('#xAxisTitle')?.value || '').trim(),
    yAxisTitle: ($('#yAxisTitle')?.value || '').trim(),
    labelRotation: $('#labelRotation')?.value || 'auto',
    sortOrder: $('#sortOrder')?.value || 'original',
    valuePosition: $('#valuePosition')?.value || 'outside',
    legendPosition: $('#legendPosition')?.value || 'right',
    paletteName: $('#paletteSelect')?.value || 'default',
    barWidthScale: Math.max(40, Number($('#barWidthScale')?.value || 70)) / 100,
    lineWidth: Math.max(1, Number($('#lineWidth')?.value || 4)),
    pointSize: Math.max(0, Number($('#pointSize')?.value || 5)),
    donutHole: Math.max(25, Number($('#donutHole')?.value || 45)) / 100,
    showValues: $('#showValues')?.checked ?? true,
    showGrid: $('#showGrid')?.checked ?? true,
    showLegend: $('#showLegend')?.checked ?? true,
    showSource: $('#showSource')?.checked ?? true,
    showBorder: $('#showBorder')?.checked ?? true,
    showXAxisTitle: $('#showXAxisTitle')?.checked ?? true,
    showYAxisTitle: $('#showYAxisTitle')?.checked ?? true,
    showAxisLabels: $('#showAxisLabels')?.checked ?? true,
    showPoints: $('#showPoints')?.checked ?? true,
    showTreemapLabels: $('#showTreemapLabels')?.checked ?? true,
    legendSearch: $('#legendSearchInput')?.value || S.legendSearch || ''
  };
}

/**
 * Escolhe a visualização e aplica a preparação dos dados sem esconder idades selecionadas em pizza e rosca.
 */
function drawChart(data, group, targetSelector='#chart', chartType=S.chart, graphMeta=S.graphMeta, optOverride=null){
  const target = typeof targetSelector === 'string' ? $(targetSelector) : targetSelector;
  if(!target) return;
  const previousMeta = S.graphMeta;
  S.graphMeta = graphMeta || previousMeta;
  let d = data
    .map(x=>({...x, label:displayCategory(x.category,effectiveGroup(group))}))
    .filter(x=>Number.isFinite(x.value));

  if(!d.length){
    target.innerHTML = `<div class="panel-subtitle">Não há dados para desenhar o gráfico selecionado.</div>`;
    S.graphMeta = previousMeta;
    return;
  }

  const opt=optOverride || chartOptions();
  const realGroup = effectiveGroup(group);
  const axisLabels = {
    'Ano':'Ano',
    'Região':'Região',
    'UF':'Unidade da Federação',
    'Sexo':'Sexo',
    'Idade detalhada':'Idade detalhada',
    'Faixa etária quinquenal':'Faixa etária'
  };
  const categoryAxisTitle = axisLabels[realGroup] || 'Categoria';
  const horizontalLikeChart = ['horizontal','ranking','lollipop'].includes(chartType);
  if(!opt.xAxisTitle) opt.xAxisTitle = horizontalLikeChart ? 'Prevalência (%)' : categoryAxisTitle;
  if(!opt.yAxisTitle) opt.yAxisTitle = horizontalLikeChart ? categoryAxisTitle : 'Prevalência (%)';
  target.setAttribute('data-chart-type', chartType || 'bar');
  const hiddenKeys = new Set(S.hiddenCategories || []);
  d = d.filter(x => !hiddenKeys.has(categoryToken(x.label)));
  if(!d.length){
    target.innerHTML = `<div class="panel-subtitle">Todas as categorias foram ocultadas pela legenda. Use "Mostrar todas" para restaurar.</div>`;
    S.graphMeta = previousMeta;
    return;
  }

  if(opt.sortOrder === 'desc') d = [...d].sort((a,b)=>b.value-a.value);
  if(opt.sortOrder === 'asc') d = [...d].sort((a,b)=>a.value-b.value);

  const orderedGroup = ['Ano','Idade detalhada','Faixa etária quinquenal'].includes(realGroup);
  if(chartType==='ranking') d = [...d].sort((a,b)=>b.value-a.value);
  if(chartType==='horizontal' && !orderedGroup) d = [...d].sort((a,b)=>b.value-a.value);
  if(['lollipop','pareto'].includes(chartType)){
    if(!(chartType==='lollipop' && orderedGroup)) d = [...d].sort((a,b)=>b.value-a.value);
    if(chartType === 'pareto' && d.length > 0) d = [...d];
  }
  if(['pie','donut'].includes(chartType)){
    const positivos = d.filter(x=>x.value > 0);
    d = positivos.length ? positivos : d;
    if(opt.sortOrder === 'desc') d = [...d].sort((a,b)=>b.value-a.value);
    if(opt.sortOrder === 'asc') d = [...d].sort((a,b)=>a.value-b.value);
  }
  if(chartType === 'radar'){
    // Em séries ordinais (ano e idade), o radar preserva a ordem natural.
    // Valores zero continuam visíveis porque representam categorias válidas.
    if(!orderedGroup){
      if(opt.sortOrder === 'desc') d = [...d].sort((a,b)=>b.value-a.value);
      if(opt.sortOrder === 'asc') d = [...d].sort((a,b)=>a.value-b.value);
    }
  }
  if(chartType === 'treemap'){
    const positivos = d.filter(x=>x.value > 0);
    d = positivos.length ? positivos : d;
    d = [...d].sort((a,b)=>b.value-a.value);
  }
  if(['kpi','gauge'].includes(chartType)) d = [...d].sort((a,b)=>b.value-a.value);

  let svg='';
  try{
    if(chartType==='line') svg=lineSvg(d,opt,false);
    else if(chartType==='area') svg=lineSvg(d,opt,true);
    else if(chartType==='horizontal'||chartType==='ranking') svg=hbarSvg(d,opt);
    else if(chartType==='pie'||chartType==='donut') svg=pieSvg(d,opt,chartType==='donut');
    else if(chartType==='kpi') svg=kpiSvg(d,opt);
    else if(chartType==='gauge') svg=gaugeSvg(d,opt);
    else if(chartType==='lollipop') svg=lollipopSvg(d,opt);
    else if(chartType==='pareto') svg=paretoSvg(d,opt);
    else if(chartType==='radar') svg=radarSvg(d,opt);
    else if(chartType==='treemap') svg=treemapSvg(d,opt);
    else svg=barSvg(d,opt);
  }catch(err){
    console.error(`Falha ao renderizar ${chartType}:`, err);
    if(chartType==='area') svg=lineSvg(d,opt,true);
    else if(chartType==='line') svg=lineSvg(d,opt,false);
    else if(chartType==='horizontal'||chartType==='ranking'||chartType==='lollipop'||chartType==='pareto') svg=hbarSvg(d,opt);
    else if(chartType==='pie'||chartType==='donut'||chartType==='radar'||chartType==='treemap') svg=barSvg(d,opt);
    else if(chartType==='kpi'||chartType==='gauge') svg=barSvg(d,opt);
    else svg=barSvg(d,opt);
  }
  if(!svg || !String(svg).includes('<svg')) throw new Error(`O renderizador ${chartType} não retornou um SVG válido.`);
  target.innerHTML=svg;
  target.setAttribute('data-rendered-chart', chartType || 'bar');
  S.graphMeta = previousMeta;
}






































/**
 * Estima quantos caracteres cabem por linha considerando a largura útil e o tamanho da fonte.
 */
function estimateMaxChars(width, fontSize, marginX, factor=0.52){
  const usableWidth = Math.max(320, width - (marginX * 2));
  return Math.max(32, Math.floor(usableWidth / Math.max(6, fontSize * factor)));
}











/**
 * Divide um texto em linhas simples usando limite aproximado de caracteres por linha.
 */
function wrapTextLines(text, maxChars){
  const words = String(text || '').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  const lines = [];
  let current = '';
  words.forEach(word => {
    const attempt = current ? `${current} ${word}` : word;
    if(current && attempt.length > maxChars){
      lines.push(current);
      current = word;
    }else{
      current = attempt;
    }
  });
  if(current) lines.push(current);
  return lines.length ? lines : [''];
}

/**
 * Ajusta fonte e quebra de linha para o texto caber dentro do SVG sem ultrapassar a imagem.
 */
function fitTextLines(text, maxWidth, initialSize, maxLines=3, minSize=10, widthFactor=0.70){
  const content = String(text || '').trim();
  if(!content) return { size: initialSize, chars: 999, lines: [''] };

  for(let size = initialSize; size >= minSize; size--){
    const chars = Math.max(10, Math.floor(maxWidth / (size * widthFactor)));
    const lines = wrapTextLines(content, chars);
    if(lines.length <= maxLines){
      return { size, chars, lines };
    }
  }

  const chars = Math.max(8, Math.floor(maxWidth / (minSize * widthFactor)));
  return { size: minSize, chars, lines: wrapTextLines(content, chars) };
}

/**
 * Converte um texto em um bloco SVG com várias linhas.
 */
function svgMultilineText(text, x, y, maxChars, lineHeight, attrs=''){
  const lines = wrapTextLines(text, maxChars);
  return `<text x="${x}" y="${y}" ${attrs}>${lines.map((line, i) => `<tspan x="${x}" dy="${i===0 ? 0 : lineHeight}">${esc(line)}</tspan>`).join('')}</text>`;
}

/**
 * Calcula a posição horizontal de textos alinhados à esquerda, centro ou direita.
 */
function alignX(align,width,marginX){
  if(align === 'center') return width / 2;
  if(align === 'right') return width - marginX;
  return marginX;
}

/**
 * Define o text-anchor do SVG com base no alinhamento escolhido.
 */
function alignAnchor(align){
  if(align === 'center') return 'middle';
  if(align === 'right') return 'end';
  return 'start';
}

let SVG_UNIQUE_COUNTER = 0;
/**
 * Gera um identificador único para elementos internos do SVG.
 */
function nextSvgId(prefix='svg'){
  SVG_UNIQUE_COUNTER += 1;
  return `${prefix}-${SVG_UNIQUE_COUNTER}`;
}

/**
 * Monta o documento SVG final, incluindo título, subtítulo, fonte e margens de exportação.
 */
function svgWrap(inner, w=1120, h=560, opt=chartOptions()){
  const meta = S.graphMeta || {};
  const width = w;
  const marginX = 42;
  const available = width - marginX * 2;

  const titleText = opt.customTitle || meta.title || '';
  const subtitleText = opt.customSubtitle || meta.subtitle || '';
  const sourceText = opt.showSource ? (opt.sourceText || meta.source || '') : '';

  const titleFit = fitTextLines(titleText, available, opt.titleSize || 22, 6, 12, 0.76);
  const subtitleFit = fitTextLines(subtitleText, available, opt.subtitleSize || 14, 5, 9, 0.62);
  const sourceFit = fitTextLines(sourceText, available, Math.max(10, (opt.fs || 18) - 7), 4, 9, 0.62);

  const titleLineHeight = titleFit.size + 6;
  const subtitleLineHeight = subtitleFit.size + 5;
  const sourceLineHeight = sourceFit.size + 5;

  const titleY = 38;
  const subtitleY = titleY + titleFit.lines.length * titleLineHeight + 14;
  const plotTop = subtitleY + subtitleFit.lines.length * subtitleLineHeight + 26;
  const sourceGap = 38;
  const sourceY = plotTop + h + sourceGap;
  const outH = sourceText ? sourceY + sourceFit.lines.length * sourceLineHeight + 30 : plotTop + h + 36;

  const border = opt.showBorder ? `stroke="${opt.borderColor}" stroke-width="1.2"` : '';

  const titleSvg = svgMultilineText(
    titleText,
    alignX(opt.titleAlign,width,marginX),
    titleY,
    titleFit.chars,
    titleLineHeight,
    `font-size="${titleFit.size}" font-weight="800" fill="${opt.text}" text-anchor="${alignAnchor(opt.titleAlign)}"`
  );

  const subtitleSvg = svgMultilineText(
    subtitleText,
    alignX(opt.subtitleAlign,width,marginX),
    subtitleY,
    subtitleFit.chars,
    subtitleLineHeight,
    `font-size="${subtitleFit.size}" fill="${opt.text}" opacity=".78" text-anchor="${alignAnchor(opt.subtitleAlign)}"`
  );

  const sourceSvg = sourceText ? svgMultilineText(
    sourceText,
    alignX(opt.sourceAlign,width,marginX),
    sourceY,
    sourceFit.chars,
    sourceLineHeight,
    `font-size="${sourceFit.size}" fill="${opt.text}" opacity=".72" text-anchor="${alignAnchor(opt.sourceAlign)}"`
  ) : '';

  const outerClipId = nextSvgId('chart-clip');
  return `<svg width="100%" height="auto" viewBox="0 0 ${width} ${outH}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(titleText || 'Gráfico Vigitel')}" preserveAspectRatio="xMidYMin meet" style="font-family:${esc(opt.font)};background:${opt.chartBg}"><defs><clipPath id="${outerClipId}"><rect x="0.6" y="0.6" width="${width-1.2}" height="${outH-1.2}" rx="18" ry="18"/></clipPath></defs><rect x="0.6" y="0.6" width="${width-1.2}" height="${outH-1.2}" rx="18" fill="${opt.chartBg}" ${border}/><g clip-path="url(#${outerClipId})">${titleSvg}${subtitleSvg}<g transform="translate(0,${plotTop})"><rect x="0" y="0" width="${w}" height="${h}" fill="${opt.plotBg}"/>${inner}</g>${sourceSvg}</g></svg>`;
}

/**
 * Desenha a grade horizontal padrão e os valores do eixo vertical.
 */
function grid(x1, x2, y1, y2, max, opt){
  if(!opt.showGrid && !opt.showAxisLabels) return '';
  let s = '';
  const fs = Math.max(8, opt.axisSize || 13);
  for(let i=0; i<=4; i++){
    const y = y2 - (y2 - y1) * i / 4;
    const val = max * i / 4;
    if(opt.showGrid) s += `<line x1="${x1}" x2="${x2}" y1="${y}" y2="${y}" stroke="${opt.gridColor}"/>`;
    if(opt.showAxisLabels) s += `<text x="${x1 - 12}" y="${y + 4}" text-anchor="end" font-size="${fs}" fill="${opt.text}">${fmt(val,opt.decimals)}</text>`;
  }
  return s;
}
/**
 * Desenha barras verticais com largura, rótulos, valores e rotação configuráveis.
 */
function barSvg(data, opt){
  const n = data.length || 1;
  const w = Math.max(1120, n > 24 ? 1260 : 1120);
  const h = 590;
  const l = 104, r = 52, t = 28;
  const b = n > 40 ? 154 : (n > 18 ? 134 : 116);
  const max = Math.max(...data.map(d => d.value), 1) * 1.18;
  const pw = w - l - r;
  const ph = h - b - t;
  const step = pw / n;
  const bw = Math.max(6, Math.min(70, step * opt.barWidthScale));
  const labelEvery = n > 60 ? 6 : (n > 42 ? 5 : (n > 28 ? 4 : (n > 16 ? 2 : 1)));
  const labelFs = Math.max(8, opt.axisSize || 13);
  const valueFs = Math.max(8, opt.valueSize || 13);
  const rot = opt.labelRotation === 'auto' ? (n > 10 ? 35 : 0) : Number(opt.labelRotation || 0);
  let s = grid(l, w - r, t, h - b, max, opt);

  data.forEach((d, i) => {
    const x = l + i * step + (step - bw) / 2;
    const bh = Math.max(0, (d.value / max) * ph);
    const y = h - b - bh;
    const label = short(d.label, n > 30 ? 14 : 22);
    s += `<rect x="${x}" y="${y}" width="${bw}" height="${bh}" rx="7" fill="${palette(i, opt)}" opacity="0.96"/>`;

    if(opt.showValues && opt.valuePosition !== 'none' && (n <= 24 || i % labelEvery === 0 || i === n - 1)){
      const inside = opt.valuePosition === 'inside' && bh > 30;
      s += `<text x="${x + bw / 2}" y="${inside ? y + 21 : y - 8}" text-anchor="middle" font-size="${valueFs}" font-weight="800" fill="${inside ? '#fff' : opt.text}">${fmt(d.value,opt.decimals)}</text>`;
    }

    if(opt.showAxisLabels && (i % labelEvery === 0 || i === n-1)){
      if(rot){
        s += `<text x="${x + bw / 2}" y="${h - b + 25}" text-anchor="end" font-size="${labelFs}" fill="${opt.text}" transform="rotate(-${rot} ${x + bw / 2} ${h - b + 25})">${esc(label)}</text>`;
      }else{
        s += `<text x="${x + bw / 2}" y="${h - b + 25}" text-anchor="middle" font-size="${labelFs}" fill="${opt.text}">${esc(label)}</text>`;
      }
    }
  });

  s += axis(w, h, l, b, t, opt, opt.xAxisTitle || 'Categoria', opt.yAxisTitle || 'Prevalência (%)');
  return svgWrap(s, w, h, opt);
}
/**
 * Desenha linha ou área com espessura, pontos e rótulos configuráveis.
 */
function lineSvg(data, opt, area){
  const n = data.length || 1;
  const w = Math.max(1120, n > 24 ? 1260 : 1120);
  const h = 590;
  const l = 96, r = 42, t = 24;
  const b = n > 40 ? 148 : (n > 18 ? 128 : 110);
  const max = Math.max(...data.map(d => d.value), 1) * 1.18;
  const pw = w - l - r;
  const ph = h - b - t;
  const pts = data.map((d, i) => ({ x: n > 1 ? l + i * pw / (n - 1) : l + pw / 2, y: h - b - (d.value / max) * ph, d }));
  const path = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x} ${p.y}`).join(' ');
  const labelEvery = n > 60 ? 6 : (n > 42 ? 5 : (n > 28 ? 4 : (n > 16 ? 2 : 1)));
  const labelFs = Math.max(8, opt.axisSize || 13);
  const valueFs = Math.max(8, opt.valueSize || 13);
  const rot = opt.labelRotation === 'auto' ? (n > 10 ? 35 : 0) : Number(opt.labelRotation || 0);
  let s = grid(l, w - r, t, h - b, max, opt);

  if(area && pts.length){
    s += `<path d="${path} L ${pts.at(-1).x} ${h - b} L ${pts[0].x} ${h - b} Z" fill="${opt.primary}" opacity="0.16"/>`;
  }
  s += `<path d="${path}" fill="none" stroke="${opt.primary}" stroke-width="${opt.lineWidth}" stroke-linecap="round" stroke-linejoin="round"/>`;

  pts.forEach((p, i) => {
    if(opt.showPoints && opt.pointSize > 0) s += `<circle cx="${p.x}" cy="${p.y}" r="${opt.pointSize}" fill="${opt.primary}"/>`;
    if(opt.showValues && opt.valuePosition !== 'none' && (n <= 24 || i % labelEvery === 0 || i === n - 1)){
      s += `<text x="${p.x}" y="${p.y - 12}" text-anchor="middle" font-size="${valueFs}" font-weight="800" fill="${opt.text}">${fmt(p.d.value,opt.decimals)}</text>`;
    }
    if(opt.showAxisLabels && (i % labelEvery === 0 || i === n-1)){
      const label = short(p.d.label, n > 30 ? 14 : 22);
      if(rot){
        s += `<text x="${p.x}" y="${h - b + 26}" text-anchor="end" font-size="${labelFs}" fill="${opt.text}" transform="rotate(-${rot} ${p.x} ${h - b + 26})">${esc(label)}</text>`;
      }else{
        s += `<text x="${p.x}" y="${h - b + 24}" text-anchor="middle" font-size="${labelFs}" fill="${opt.text}">${esc(label)}</text>`;
      }
    }
  });

  s += axis(w, h, l, b, t, opt, opt.xAxisTitle || 'Categoria', opt.yAxisTitle || 'Prevalência (%)');
  return svgWrap(s, w, h, opt);
}
/**
 * Desenha barras horizontais com escala, valores e categorias configuráveis.
 */
function hbarSvg(data, opt){
  const rows = data.length || 1;
  const w = 1180;
  const h = Math.max(430, 110 + rows * 44);
  const l = 280, r = 120, t = 28, b = 82;
  const max = Math.max(...data.map(d => d.value), 1) * 1.12;
  const plotW = w - l - r;
  const rowH = 40;
  const barH = Math.max(10, Math.min(30, 26 * opt.barWidthScale / .7));
  const fs = Math.max(8, opt.axisSize || 13);
  const valueFs = Math.max(8, opt.valueSize || 13);
  let s = '';

  if(opt.showGrid || opt.showAxisLabels){
    for(let i=0;i<=4;i++){
      const x = l + plotW * i / 4;
      const val = max * i / 4;
      if(opt.showGrid) s += `<line x1="${x}" x2="${x}" y1="${t}" y2="${h - b}" stroke="${opt.gridColor}"/>`;
      if(opt.showAxisLabels) s += `<text x="${x}" y="${h - b + 26}" text-anchor="middle" font-size="${fs}" fill="${opt.text}">${fmt(val,opt.decimals)}</text>`;
    }
  }

  data.forEach((d, i) => {
    const y = t + i * rowH;
    const bw = plotW * (d.value / max);
    if(opt.showAxisLabels) s += `<text x="${l - 14}" y="${y + 18}" text-anchor="end" font-size="${fs}" fill="${opt.text}">${esc(short(d.label, 26))}</text>`;
    s += `<rect x="${l}" y="${y}" width="${bw}" height="${barH}" rx="10" fill="${palette(i, opt)}"/>`;
    if(opt.showValues && opt.valuePosition !== 'none'){
      const inside = opt.valuePosition === 'inside' && bw > 56;
      s += `<text x="${inside ? l + bw - 10 : Math.min(w - r + 10, l + bw + 10)}" y="${y + 18}" text-anchor="${inside ? 'end' : 'start'}" font-size="${valueFs}" font-weight="800" fill="${inside ? '#fff' : opt.text}">${fmt(d.value,opt.decimals)}</text>`;
    }
  });

  s += axis(w, h, l, b, t, opt, 'Prevalência (%)', 'Categoria');
  return svgWrap(s, w, h, opt);
}
/**
 * Desenha gráfico de pirulito com linhas, pontos e valores configuráveis.
 */
function lollipopSvg(data, opt){
  const rows = data.length || 1;
  const w = 1180;
  const h = Math.max(430, 110 + rows * 44);
  const l = 260, r = 120, t = 28, b = 82;
  const max = Math.max(...data.map(d => d.value), 1) * 1.12;
  const plotW = w - l - r;
  const rowH = 40;
  const fs = Math.max(8, opt.axisSize || 13);
  const valueFs = Math.max(8, opt.valueSize || 13);
  let s = '';

  if(opt.showGrid || opt.showAxisLabels){
    for(let i=0;i<=4;i++){
      const x = l + plotW * i / 4;
      const val = max * i / 4;
      if(opt.showGrid) s += `<line x1="${x}" x2="${x}" y1="${t}" y2="${h - b}" stroke="${opt.gridColor}"/>`;
      if(opt.showAxisLabels) s += `<text x="${x}" y="${h - b + 26}" text-anchor="middle" font-size="${fs}" fill="${opt.text}">${fmt(val,opt.decimals)}</text>`;
    }
  }

  data.forEach((d, i) => {
    const y = t + i * rowH + 13;
    const x = l + plotW * (d.value / max);
    if(opt.showAxisLabels) s += `<text x="${l - 14}" y="${y + 4}" text-anchor="end" font-size="${fs}" fill="${opt.text}">${esc(short(d.label, 26))}</text>`;
    s += `<line x1="${l}" y1="${y}" x2="${x}" y2="${y}" stroke="#D5E1EF" stroke-width="${Math.max(4,opt.lineWidth+3)}" stroke-linecap="round"/>`;
    s += `<circle cx="${x}" cy="${y}" r="${Math.max(5,opt.pointSize+3)}" fill="${palette(i, opt)}"/>`;
    if(opt.showValues && opt.valuePosition !== 'none') s += `<text x="${Math.min(w - r + 10, x + 14)}" y="${y + 4}" font-size="${valueFs}" font-weight="800" fill="${opt.text}">${fmt(d.value,opt.decimals)}</text>`;
  });

  s += axis(w, h, l, b, t, opt, 'Prevalência (%)', 'Categoria');
  return svgWrap(s, w, h, opt);
}
/**
 * Desenha Pareto com barras ordenadas e linha acumulada sem cortes.
 */
function paretoSvg(data, opt){
  const sorted = [...data]
    .filter(d => Number.isFinite(d.value) && d.value > 0)
    .sort((a, b) => b.value - a.value);
  if(!sorted.length) return barSvg(data, opt);

  const total = sorted.reduce((sum, d) => sum + d.value, 0) || 1;
  const n = sorted.length;
  const w = Math.max(1180, Math.min(2200, 760 + n * 24));
  const h = 680;
  const l = 96, r = 104, t = 30;
  const b = n > 28 ? 150 : 122;
  const barMax = Math.max(...sorted.map(d => d.value), 1) * 1.15;
  const plotW = w - l - r;
  const plotH = h - b - t;
  const step = plotW / n;
  const bw = Math.max(6, Math.min(42, step * Math.max(.35, Math.min(.9, opt.barWidthScale))));
  const labelEvery = n > 55 ? 6 : n > 40 ? 5 : n > 28 ? 4 : n > 18 ? 3 : 1;
  const labelFs = Math.max(8, Math.min(13, opt.axisSize || 13));
  const valueFs = Math.max(8, Math.min(13, opt.valueSize || 13));
  const rot = opt.labelRotation === 'auto' ? 42 : Number(opt.labelRotation || 0);
  let s = '';

  // Grade e escala primária: prevalência das barras.
  for(let i=0;i<=4;i++){
    const y = t + plotH * i / 4;
    const val = barMax * (1 - i / 4);
    if(opt.showGrid) s += `<line x1="${l}" x2="${w-r}" y1="${y}" y2="${y}" stroke="${opt.gridColor}"/>`;
    if(opt.showAxisLabels) s += `<text x="${l-14}" y="${y+5}" text-anchor="end" font-size="${labelFs}" fill="${opt.text}">${fmt(val,opt.decimals)}</text>`;
  }

  let cumulative = 0;
  const pts = [];
  sorted.forEach((d, i) => {
    const x = l + i * step + (step - bw) / 2;
    const bh = (d.value / barMax) * plotH;
    const y = h - b - bh;
    cumulative += d.value;
    const cumulativePct = Math.min(100, cumulative / total * 100);
    const cy = h - b - cumulativePct / 100 * plotH;
    pts.push({x:x+bw/2, y:cy, pct:cumulativePct});
    s += `<rect x="${x}" y="${y}" width="${bw}" height="${bh}" rx="5" fill="${palette(i,opt)}"/>`;
    if(opt.showValues && n <= 24) s += `<text x="${x+bw/2}" y="${Math.max(t+12,y-7)}" text-anchor="middle" font-size="${valueFs}" font-weight="700" fill="${opt.text}">${fmt(d.value,opt.decimals)}</text>`;
    if(opt.showAxisLabels && (i % labelEvery === 0 || i === n-1)){
      const tx=x+bw/2, ty=h-b+24;
      if(rot) s += `<text x="${tx}" y="${ty}" text-anchor="end" font-size="${labelFs}" fill="${opt.text}" transform="rotate(-${rot} ${tx} ${ty})">${esc(short(d.label,16))}</text>`;
      else s += `<text x="${tx}" y="${ty}" text-anchor="middle" font-size="${labelFs}" fill="${opt.text}">${esc(short(d.label,16))}</text>`;
    }
  });

  const path = pts.map((p,i)=>`${i?'L':'M'}${p.x} ${p.y}`).join(' ');
  s += `<path d="${path}" fill="none" stroke="${opt.secondary}" stroke-width="${Math.max(3,opt.lineWidth)}" stroke-linecap="round" stroke-linejoin="round"/>`;
  if(opt.showPoints) pts.forEach(p=>s += `<circle cx="${p.x}" cy="${p.y}" r="${Math.max(3,opt.pointSize)}" fill="${opt.secondary}"/>`);

  // Escala secundária correta do percentual acumulado (0 a 100%).
  if(opt.showAxisLabels){
    for(let i=0;i<=4;i++){
      const y=t+plotH*i/4;
      const pct=100*(1-i/4);
      s += `<text x="${w-r+14}" y="${y+5}" text-anchor="start" font-size="${labelFs}" fill="${opt.text}">${fmt(pct,0)}</text>`;
    }
  }
  s += `<line x1="${l}" y1="${h-b}" x2="${w-r}" y2="${h-b}" stroke="${opt.text}" opacity=".35"/>`;
  s += `<line x1="${l}" y1="${t}" x2="${l}" y2="${h-b}" stroke="${opt.text}" opacity=".35"/>`;
  s += `<line x1="${w-r}" y1="${t}" x2="${w-r}" y2="${h-b}" stroke="${opt.secondary}" opacity=".45"/>`;
  if(opt.showYAxisTitle) s += `<text x="26" y="${t+plotH/2}" text-anchor="middle" font-size="${Math.max(10,opt.fontSize||16)}" font-weight="700" fill="${opt.text}" transform="rotate(-90 26 ${t+plotH/2})">Prevalência (%)</text>`;
  if(opt.showYAxisTitle) s += `<text x="${w-22}" y="${t+plotH/2}" text-anchor="middle" font-size="${Math.max(10,opt.fontSize||16)}" font-weight="700" fill="${opt.secondary}" transform="rotate(90 ${w-22} ${t+plotH/2})">Percentual acumulado (%)</text>`;
  if(opt.showXAxisTitle) s += `<text x="${l+plotW/2}" y="${h-26}" text-anchor="middle" font-size="${Math.max(10,opt.fontSize||16)}" font-weight="700" fill="${opt.text}">${esc(opt.xAxisTitle || 'Categoria')}</text>`;
  return svgWrap(s,w,h,opt);
}

/**
 * Define limites de legenda adequados ao tamanho da área de visualização.
 */
function legendViewportProfile(){
  const fullscreenActive = !!document.fullscreenElement;
  const vw = Math.max(320, window.innerWidth || 1440);
  return {
    fullscreenActive,
    vw,
    compact: vw < 980,
    mobile: vw < 720,
    narrow: vw < 1260
  };
}

/**
 * Calcula a disposição da legenda conforme o espaço disponível e a quantidade de itens.
 */
function adaptiveLegendLayout(count, opt, options={}){
  const profile = legendViewportProfile();
  const preferredBottom = options.preferredBottom ?? false;
  const preferredRightCols = options.preferredRightCols ?? 2;
  const preferredBottomCols = options.preferredBottomCols ?? 4;
  let font = Math.max(8, Math.min(26, opt.legendSize || opt.axisSize || 13));
  let bottom = Boolean(opt.showLegend) && (opt.legendPosition === 'bottom' || preferredBottom || profile.compact || count > (options.autoBottomThreshold || 14));
  let cols = bottom
    ? (count > 40 ? Math.min(preferredBottomCols + 1, 5) : count > 24 ? Math.min(preferredBottomCols, 4) : count > 12 ? Math.min(preferredBottomCols, 3) : 2)
    : (count <= 8 ? 1 : preferredRightCols);

  if(profile.mobile){
    bottom = true;
    cols = count > 14 ? 2 : 1;
    font = Math.min(font, count > 18 ? 10 : 11);
  }else if(profile.compact){
    bottom = true;
    cols = count > 24 ? 3 : 2;
    font = Math.min(font, count > 24 ? 10 : 11);
  }else if(profile.narrow){
    if(bottom) cols = Math.min(cols, 3);
    font = Math.min(font, 12);
  }

  if(count > 36) font = Math.min(font, 10);
  else if(count > 24) font = Math.min(font, 11);

  const rows = Math.max(1, Math.ceil(count / Math.max(1, cols)));
  return { bottom, cols, rows, font, line: font + 13, profile };
}

/**
 * Retorna a configuração do formato de exportação selecionado.
 */
function getExportPreset(){
  return $('#exportPreset')?.value || 'auto';
}

/**
 * Informa se o arquivo exportado deve preservar o fundo transparente.
 */
function exportBackgroundIsTransparent(){
  return Boolean($('#exportTransparentBg')?.checked);
}

/**
 * Retorna dimensões e margens da predefinição de exportação.
 */
function exportPresetSettings(){
  const preset = getExportPreset();
  const transparent = exportBackgroundIsTransparent();
  const baseBg = transparent ? 'transparent' : '#FFFFFF';
  const presets = {
    auto: { width: null, height: null, padding: 54, background: baseBg },
    'a4-portrait': { width: 1240, height: 1754, padding: 78, background: baseBg },
    'a4-landscape': { width: 1754, height: 1240, padding: 78, background: baseBg },
    'slide-16-9': { width: 1600, height: 900, padding: 68, background: baseBg },
    banner: { width: 1800, height: 1000, padding: 70, background: baseBg }
  };
  return { preset, transparent, ...(presets[preset] || presets.auto) };
}

/**
 * Monta as opções visuais específicas da exportação sem alterar o gráfico da tela.
 */
function exportChartOptions(){
  const opt = chartOptions();
  return {
    ...opt,
    text:'#112B44',
    chartBg:'#FFFFFF',
    plotBg:'#FFFFFF',
    gridColor:'#D6DFE8',
    borderColor:'#C9D4E0'
  };
}

/**
 * Gera o SVG do gráfico usando as dimensões e opções de exportação.
 */
function renderExportChartSvg(data, group, chartType, graphMeta){
  if(!Array.isArray(data) || !data.length) return null;
  const holder = document.createElement('div');
  drawChart(data, group, holder, chartType, graphMeta, exportChartOptions());
  return holder.querySelector('svg');
}

/**
 * Insere o gráfico em um documento SVG completo com título, fonte e margens.
 */
function wrapExportDocument(contentNode, contentWidth, contentHeight, ariaLabel='Gráfico do Vigitel'){
  const settings = exportPresetSettings();
  const namespace='http://www.w3.org/2000/svg';
  const padding = settings.padding || 54;
  const width = settings.width || Math.ceil(contentWidth + padding * 2);
  const height = settings.height || Math.ceil(contentHeight + padding * 2);
  const safeWidth = Math.max(1, width - padding * 2);
  const safeHeight = Math.max(1, height - padding * 2);
  const scale = Math.min(safeWidth / contentWidth, safeHeight / contentHeight, 1);
  const scaledW = contentWidth * scale;
  const scaledH = contentHeight * scale;
  const tx = padding + (safeWidth - scaledW) / 2;
  const ty = padding + (safeHeight - scaledH) / 2;
  const outer=document.createElementNS(namespace,'svg');
  outer.setAttribute('xmlns',namespace);
  outer.setAttribute('xmlns:xlink','http://www.w3.org/1999/xlink');
  outer.setAttribute('viewBox',`0 0 ${width} ${height}`);
  outer.setAttribute('width',String(width));
  outer.setAttribute('height',String(height));
  outer.setAttribute('role','img');
  outer.setAttribute('aria-label',ariaLabel);
  if(!settings.transparent){
    const background=document.createElementNS(namespace,'rect');
    background.setAttribute('x','0'); background.setAttribute('y','0');
    background.setAttribute('width',String(width)); background.setAttribute('height',String(height));
    background.setAttribute('fill',settings.background);
    outer.appendChild(background);
  }
  const frame = document.createElementNS(namespace,'g');
  frame.setAttribute('transform',`translate(${tx} ${ty}) scale(${scale})`);
  frame.appendChild(contentNode);
  outer.appendChild(frame);
  return { outer, width, height, scale };
}

/**
 * Desenha pizza ou rosca com legenda interativa, busca e distribuição melhorada.
 */
function pieSvg(data, opt, donut=false){
  const items = data.filter(d => Number.isFinite(d.value));
  const total = items.reduce((a, d) => a + d.value, 0) || 1;
  const count = items.length;
  const layout = adaptiveLegendLayout(count, opt, { preferredBottom: count > 16, preferredBottomCols: 4, preferredRightCols: 2, autoBottomThreshold: 14 });
  const legendFs = layout.font;
  const legendLine = layout.line;
  const legendBottom = opt.showLegend ? layout.bottom : false;
  const legendCols = legendBottom ? layout.cols : Math.max(1, Math.min(2, layout.cols));
  const legendRows = Math.max(1, layout.rows);
  const compactWidth = layout.profile.mobile ? 980 : layout.profile.compact ? 1100 : 0;
  const w = legendBottom ? Math.max(compactWidth || 1180, count > 28 ? 1380 : 1180) : (count <= 10 ? 1220 : 1280);
  const h = opt.showLegend ? (legendBottom ? Math.max(layout.profile.mobile ? 760 : 670, 400 + legendRows * legendLine) : Math.max(560, 180 + legendRows * legendLine)) : 560;
  const rightLegendW = (!legendBottom && opt.showLegend) ? (legendCols === 1 ? 320 : 420) : 0;
  const chartAreaX = 54;
  const chartAreaY = 56;
  const chartAreaW = legendBottom ? (w - 108) : (w - rightLegendW - 120);
  const chartAreaH = legendBottom ? 360 : (h - 110);
  const cx = chartAreaX + chartAreaW / 2;
  const cy = legendBottom ? 210 : Math.max(200, chartAreaY + chartAreaH / 2);
  const r = Math.max(110, Math.min(190, Math.min(chartAreaW, legendBottom ? 320 : chartAreaH) / 2 - 22));
  const gridBox = { x: Math.max(26, cx - r - 44), y: Math.max(24, cy - r - 44), size: (r + 44) * 2 };

  let angle = -90;
  let s = '';
  if(opt.showGrid){
    s += `<rect x="${gridBox.x}" y="${gridBox.y}" width="${gridBox.size}" height="${gridBox.size}" rx="14" fill="none" stroke="${opt.borderColor}" opacity=".8"/>`;
    for(let gx = gridBox.x + 34; gx < gridBox.x + gridBox.size; gx += 34) s += `<line x1="${gx}" y1="${gridBox.y}" x2="${gx}" y2="${gridBox.y + gridBox.size}" stroke="${opt.gridColor}"/>`;
    for(let gy = gridBox.y + 34; gy < gridBox.y + gridBox.size; gy += 34) s += `<line x1="${gridBox.x}" y1="${gy}" x2="${gridBox.x + gridBox.size}" y2="${gy}" stroke="${opt.gridColor}"/>`;
  }

  items.forEach((d, i) => {
    const ang = total ? (d.value / total) * 360 : 0;
    const matched = matchesLegendSearch(d.label, opt.legendSearch);
    const opacity = matched ? 1 : 0.18;
    if(ang > 0.01){
      s += `<path d="${arc(cx, cy, r, angle, angle + ang)}" fill="${palette(i, opt)}" fill-opacity="${opacity}" stroke="#fff" stroke-width="3"/>`;
    }
    angle += ang;
  });

  if(donut){
    const holeR = r * opt.donutHole;
    const holeClipId = nextSvgId('donut-hole-grid-clip');
    s += `<circle cx="${cx}" cy="${cy}" r="${holeR}" fill="${opt.chartBg}"/>`;
    if(opt.showGrid){
      s += `<defs><clipPath id="${holeClipId}"><circle cx="${cx}" cy="${cy}" r="${holeR - 1}"/></clipPath></defs><g clip-path="url(#${holeClipId})">`;
      for(let gx = gridBox.x + 34; gx < gridBox.x + gridBox.size; gx += 34) s += `<line x1="${gx}" y1="${gridBox.y}" x2="${gx}" y2="${gridBox.y + gridBox.size}" stroke="${opt.gridColor}"/>`;
      for(let gy = gridBox.y + 34; gy < gridBox.y + gridBox.size; gy += 34) s += `<line x1="${gridBox.x}" y1="${gy}" x2="${gridBox.x + gridBox.size}" y2="${gy}" stroke="${opt.gridColor}"/>`;
      s += `</g>`;
    }
  }

  if(opt.showLegend){
    const colW = legendBottom ? Math.floor((w - 120) / legendCols) : (legendCols === 1 ? 300 : 190);
    const legendX = legendBottom ? 64 : (chartAreaX + chartAreaW + 28);
    const legendY = legendBottom ? 420 : Math.max(72, cy - (legendRows * legendLine) / 2);

    items.forEach((d, i) => {
      const col = i % legendCols;
      const row = Math.floor(i / legendCols);
      const x = legendX + col * colW;
      const y = legendY + row * legendLine;
      const labelMax = legendBottom ? (layout.profile.mobile ? 22 : (legendCols >= 4 ? 19 : 24)) : (legendCols === 1 ? 30 : 18);
      const encoded = encodeURIComponent(d.label);
      const hidden = isHiddenCategory(d.label);
      const matched = matchesLegendSearch(d.label, opt.legendSearch);
      const opacity = matched ? (hidden ? 0.42 : 1) : 0.18;
      const strikeEnd = x + Math.min(colW - 22, legendBottom ? colW - 34 : 170);
      s += `<g class="legend-item${hidden ? ' hidden' : ''}" tabindex="0" role="button" aria-pressed="${!hidden}" aria-label="${hidden ? 'Mostrar' : 'Ocultar'} categoria ${esc(d.label)}" data-legend-category="${encoded}" opacity="${opacity}"><rect x="${x}" y="${y}" width="15" height="15" rx="4" fill="${palette(i, opt)}"/><text x="${x + 22}" y="${y + 12}" font-size="${layout.font}" fill="${opt.text}">${i + 1}. ${esc(short(d.label, labelMax))} · ${fmt(d.value,opt.decimals)}%</text><line class="legend-strike" x1="${x + 20}" x2="${strikeEnd}" y1="${y + 7}" y2="${y + 7}" stroke="${opt.text}" stroke-width="1.4" opacity=".55" style="display:${hidden ? 'block' : 'none'}"/></g>`;
    });
  }

  return svgWrap(s, w, h, opt);
}
/**
 * Desenha radar centralizado, com legenda interativa e adaptação para muitos rótulos.
 */
function radarSvg(data, opt){
  if(data.length < 3) return barSvg(data,opt);
  const count=data.length;
  const dense=count>24;
  const veryDense=count>48;
  const showLegend=Boolean(opt.showLegend) && count<=18;
  const layout=adaptiveLegendLayout(count,{...opt,showLegend},{preferredBottom:true,preferredBottomCols:4,preferredRightCols:2,autoBottomThreshold:10});
  const legendFs=layout.font;
  const legendCols=showLegend?layout.cols:1;
  const legendRows=showLegend?layout.rows:0;
  const baseW=veryDense?1500:dense?1360:1180;
  const baseH=veryDense?980:dense?840:620;
  const w=baseW;
  const h=baseH+(showLegend?legendRows*(legendFs+12)+70:0);
  const cx=w/2, cy=baseH/2-6;
  const labelOffset=veryDense?72:dense?62:48;
  const r=Math.max(130,Math.min((w-220)/2,(baseH-190)/2)-labelOffset);
  const max=Math.max(...data.map(d=>d.value),1);
  const step=Math.PI*2/count;
  const labelEvery=veryDense?3:dense?2:1;
  const fs=Math.max(8,Math.min(opt.axisSize||13,veryDense?9:dense?10:13));
  const pts=data.map((d,i)=>{
    const a=-Math.PI/2+i*step;
    const rr=r*d.value/max;
    return {x:cx+Math.cos(a)*rr,y:cy+Math.sin(a)*rr,lx:cx+Math.cos(a)*(r+labelOffset),ly:cy+Math.sin(a)*(r+labelOffset),a,d,i};
  });
  let s='';
  [0.2,0.4,0.6,0.8,1].forEach(k=>{
    s+=`<circle cx="${cx}" cy="${cy}" r="${r*k}" fill="none" stroke="${opt.gridColor}"/>`;
    if(opt.showAxisLabels) s+=`<text x="${cx+8}" y="${cy-r*k+14}" font-size="${Math.max(8,fs-1)}" fill="${opt.text}" opacity=".78">${fmt(max*k,opt.decimals)}</text>`;
  });
  pts.forEach((p,i)=>{
    s+=`<line x1="${cx}" y1="${cy}" x2="${cx+Math.cos(p.a)*r}" y2="${cy+Math.sin(p.a)*r}" stroke="${opt.gridColor}" opacity=".8"/>`;
    const showLabel=opt.showAxisLabels && (i%labelEvery===0 || i===count-1);
    if(showLabel){
      const dx=Math.cos(p.a);
      const anchor=Math.abs(dx)<.18?'middle':dx>0?'start':'end';
      const lx=p.lx+(anchor==='start'?4:anchor==='end'?-4:0);
      s+=`<text x="${lx}" y="${p.ly+4}" text-anchor="${anchor}" font-size="${fs}" fill="${opt.text}">${esc(short(p.d.label,dense?15:20))}</text>`;
    }
  });
  s+=`<polygon points="${pts.map(p=>`${p.x},${p.y}`).join(' ')}" fill="${opt.primary}" opacity=".18" stroke="${opt.primary}" stroke-width="${Math.max(2,opt.lineWidth)}"/>`;
  if(opt.showPoints) pts.forEach(p=>s+=`<circle cx="${p.x}" cy="${p.y}" r="${Math.max(2.5,opt.pointSize*.72)}" fill="${opt.primary}"/>`);

  if(showLegend){
    const legendY=baseH+18, colW=Math.floor((w-120)/legendCols);
    data.forEach((d,i)=>{
      const col=i%legendCols,row=Math.floor(i/legendCols),x=64+col*colW,y=legendY+row*(legendFs+12);
      s+=`<g><rect x="${x}" y="${y}" width="15" height="15" rx="4" fill="${opt.primary}"/><text x="${x+22}" y="${y+12}" font-size="${layout.font}" fill="${opt.text}">${i+1}. ${esc(short(d.label,24))} · ${fmt(d.value,opt.decimals)}%</text></g>`;
    });
  }
  if(dense){
    s+=`<text x="${w/2}" y="${h-24}" text-anchor="middle" font-size="${Math.max(9,opt.axisSize||12)}" fill="${opt.text}" opacity=".75">Todos os pontos foram mantidos; alguns rótulos foram espaçados para melhorar a leitura.</text>`;
  }
  return svgWrap(s,w,h,opt);
}

/**
 * Desenha blocos proporcionais e evita textos em espaços pequenos.
 */
function treemapSvg(data, opt){
  const items = [...data].sort((a, b) => b.value - a.value);
  const w = 1180;
  const legendLayout = opt.showLegend ? adaptiveLegendLayout(items.length, opt, { preferredBottom: true, preferredBottomCols: 3, preferredRightCols: 2, autoBottomThreshold: 8 }) : null;
  const h = opt.showLegend ? Math.max(620, 430 + (legendLayout.rows * (legendLayout.line + 8))) : 450;
  const x = 52, y = 84, W = 1070, H = opt.showLegend ? 275 : 315;
  const total = items.reduce((a, d) => a + d.value, 0) || 1;
  let current = x;
  let s = '';
  const legendFs = Math.max(10, opt.axisSize || 13);

  items.forEach((d, i) => {
    let ww = W * (d.value / total);
    if(i === items.length - 1) ww = x + W - current;
    if(ww < 8) ww = 8;
    const fill = palette(i, opt);
    s += `<rect x="${current}" y="${y}" width="${ww}" height="${H}" rx="12" fill="${fill}" opacity="0.95" stroke="#fff" stroke-width="4"/>`;

    if(opt.showTreemapLabels){
      if(ww >= 165){
        s += `<text x="${current + 14}" y="${y + 30}" fill="#fff" font-size="15" font-weight="800">${esc(short(d.label, 20))}</text>`;
        s += `<text x="${current + 14}" y="${y + 54}" fill="#fff" font-size="14">${fmt(d.value,opt.decimals)}%</text>`;
      }else if(ww >= 95){
        s += `<text x="${current + 10}" y="${y + 28}" fill="#fff" font-size="13" font-weight="800">${esc(short(d.label, 11))}</text>`;
        s += `<text x="${current + 10}" y="${y + 48}" fill="#fff" font-size="12">${fmt(d.value,opt.decimals)}%</text>`;
      }else if(ww >= 58){
        s += `<text x="${current + ww / 2}" y="${y + 26}" text-anchor="middle" fill="#fff" font-size="12" font-weight="800">${fmt(d.value,opt.decimals)}%</text>`;
      }
    }
    current += ww;
  });

  if(opt.showLegend){
    const layout = legendLayout;
    const cols = Math.max(1, Math.min(3, layout.cols));
    const colW = Math.floor((w - 140) / cols);
    items.forEach((d, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const lx = 70 + col * colW;
      const ly = 410 + row * (layout.line + 8);
      const encoded = encodeURIComponent(d.label);
      const hidden = isHiddenCategory(d.label);
      const matched = matchesLegendSearch(d.label, opt.legendSearch);
      const opacity = matched ? (hidden ? 0.42 : 1) : 0.18;
      const strikeEnd = lx + Math.min(colW - 22, colW - 34);
      s += `<g class="legend-item${hidden ? ' hidden' : ''}" tabindex="0" role="button" aria-pressed="${!hidden}" aria-label="${hidden ? 'Mostrar' : 'Ocultar'} categoria ${esc(d.label)}" data-legend-category="${encoded}" opacity="${opacity}"><rect x="${lx}" y="${ly}" width="14" height="14" rx="4" fill="${palette(i, opt)}"/><text x="${lx + 22}" y="${ly + 12}" font-size="${legendFs}" fill="${opt.text}">${i+1}. ${esc(short(d.label, cols >= 3 ? 18 : cols === 2 ? 22 : 28))} · ${fmt(d.value,opt.decimals)}%</text><line class="legend-strike" x1="${lx + 20}" x2="${strikeEnd}" y1="${ly + 7}" y2="${ly + 7}" stroke="${opt.text}" stroke-width="1.4" opacity=".55" style="display:${hidden ? 'block' : 'none'}"/></g>`;
    });
  }

  return svgWrap(s, w, h, opt);
}
/**
 * Desenha cartões KPI padronizados e com textos contidos, sem limitar a quantidade de categorias.
 */
function kpiSvg(data,opt){
  const count = Math.max(1, data.length);
  const cols = count <= 3 ? count : (count <= 8 ? 3 : 4);
  const cardW = cols >= 4 ? 245 : 315;
  const gapX = 26;
  const rows = Math.ceil(count / cols);
  const w = Math.max(1180, 70 + cols * cardW + (cols - 1) * gapX + 70);
  const h = 120 + rows * 195 + Math.max(0, rows - 1) * 20;
  let s='';
  data.forEach((d,i)=>{
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = 70 + col * (cardW + gapX);
    const y = 80 + row * 215;
    s += `<rect x="${x}" y="${y}" width="${cardW}" height="155" rx="20" fill="${palette(i,opt)}" opacity=".92"/>`;
    s += `<text x="${x+18}" y="${y+36}" fill="#fff" font-size="${Math.max(11,opt.axisSize)}" font-weight="800">${esc(short(d.label, cardW < 280 ? 20 : 28))}</text>`;
    s += `<text x="${x+18}" y="${y+98}" fill="#fff" font-size="${Math.max(28,opt.titleSize+8)}" font-weight="900">${fmt(d.value,opt.decimals)}%</text>`;
  });
  return svgWrap(s,w,h,opt);
}
/**
 * Desenha medidor(es) sem limitar a quantidade de categorias.
 */
function gaugeSvg(data,opt){
  const items = data.length ? data : [{label:'Valor', value:0}];
  const count = items.length;
  const cols = count === 1 ? 1 : (count <= 4 ? 2 : (count <= 9 ? 3 : 4));
  const rows = Math.ceil(count / cols);
  const cellW = cols >= 4 ? 280 : (cols === 3 ? 340 : 500);
  const cellH = 250;
  const gapX = 24;
  const gapY = 28;
  const w = Math.max(1180, 70 + cols * cellW + (cols - 1) * gapX + 70);
  const h = 90 + rows * cellH + Math.max(0, rows - 1) * gapY + 60;
  let s='';
  items.forEach((d,i)=>{
    const col = i % cols;
    const row = Math.floor(i / cols);
    const boxX = 70 + col * (cellW + gapX);
    const boxY = 70 + row * (cellH + gapY);
    const cx = boxX + cellW / 2;
    const cy = boxY + 130;
    const r = Math.min(88, cellW * 0.28);
    const val = Math.min(100,Math.max(0,d.value));
    s += `<rect x="${boxX}" y="${boxY}" width="${cellW}" height="${cellH}" rx="22" fill="${opt.plotBg}" stroke="${opt.gridColor}"/>`;
    s += `<path d="${arcStroke(cx,cy,r,-90,90)}" fill="none" stroke="#E5EBF2" stroke-width="24" stroke-linecap="round"/>`;
    s += `<path d="${arcStroke(cx,cy,r,-90,-90+180*val/100)}" fill="none" stroke="${palette(i,opt)}" stroke-width="24" stroke-linecap="round"/>`;
    s += `<text x="${cx}" y="${cy-18}" text-anchor="middle" font-size="${Math.max(26,opt.titleSize+8)}" font-weight="900" fill="${opt.text}">${fmt(d.value,opt.decimals)}%</text>`;
    s += `<text x="${cx}" y="${cy+28}" text-anchor="middle" font-size="${Math.max(11,opt.axisSize)}" fill="${opt.text}">${esc(short(d.label, cellW < 300 ? 18 : 30))}</text>`;
  });
  return svgWrap(s,w,h,opt);
}
/**
 * Desenha os títulos dos eixos, respeitando campos personalizados e opção de mostrar/ocultar.
 */
function axis(w,h,l,b,t,opt,xlab,ylab){
  const fs = Math.max(8, opt.axisSize || 13);
  const xTitle = opt.xAxisTitle || xlab;
  const yTitle = opt.yAxisTitle || ylab;
  let s = '';
  if(opt.showXAxisTitle) s += `<text x="${w/2}" y="${h-18}" text-anchor="middle" font-size="${fs}" font-weight="800" fill="${opt.text}">${esc(xTitle)}</text>`;
  if(opt.showYAxisTitle) s += `<text x="28" y="${(h-b+t)/2}" transform="rotate(-90 28 ${(h-b+t)/2})" text-anchor="middle" font-size="${fs}" font-weight="800" fill="${opt.text}">${esc(yTitle)}</text>`;
  return s;
}
/**
 * Define a sequência de cores conforme a paleta escolhida no painel.
 */
function palette(i,opt){
  const palettes = {
    default:[opt.primary,opt.secondary,'#F2B705','#D73372','#7C3FD0','#0997A3','#855744','#48657E','#B22222','#198754'],
    blue:[opt.primary,'#2C7BE5','#5DADEC','#8EC5FC','#0A3D62','#4B6584','#74B9FF','#0984E3','#6C5CE7','#00CEC9'],
    green:[opt.secondary,'#0CA678','#20C997','#63E6BE','#2B8A3E','#66A80F','#94D82D','#12B886','#087F5B','#0B7285'],
    warm:['#C92A2A','#E67700','#F08C00','#F2B705','#D9480F','#A61E4D','#E64980','#F06595','#FF922B','#FAB005'],
    pastel:['#8EC5FC','#E0C3FC','#A8E6CF','#FFD3B6','#FFAAA5','#D4A5A5','#B5EAD7','#C7CEEA','#FFDAC1','#E2F0CB'],
    mono:[opt.primary,'#1B4F72','#2E6F95','#4C89A8','#73A9C2','#9BC4D9','#C3DDE8','#D6E9F2','#EEF7FB','#AAB8C2']
  };
  const arr = palettes[opt.paletteName] || palettes.default;
  return arr[i % arr.length];
}
/**
 * Formata números para o padrão brasileiro usando a quantidade de casas decimais escolhida.
 */
function fmt(v,decimals=1){
  const d = Number.isFinite(Number(decimals)) ? Number(decimals) : 1;
  return Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d});
}
/**
 * Encurta textos muito longos para não poluir o gráfico.
 */
function short(s,n){s=String(s||''); return s.length>n?s.slice(0,n-1)+'…':s}
/**
 * Escapa caracteres especiais para evitar problemas no HTML e no SVG.
 */
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
/**
 * Calcula o caminho de arco usado em gráficos de pizza e rosca.
 */
function arc(cx,cy,r,a0,a1){const p0=polar(cx,cy,r,a1),p1=polar(cx,cy,r,a0),large=a1-a0<=180?0:1;return `M ${cx} ${cy} L ${p1.x} ${p1.y} A ${r} ${r} 0 ${large} 1 ${p0.x} ${p0.y} Z`}
/**
 * Calcula o caminho de arco usado no gráfico de medidor.
 */
function arcStroke(cx,cy,r,a0,a1){const p0=polar(cx,cy,r,a1),p1=polar(cx,cy,r,a0),large=a1-a0<=180?0:1;return `M ${p1.x} ${p1.y} A ${r} ${r} 0 ${large} 1 ${p0.x} ${p0.y}`}
/**
 * Converte ângulos e raio em coordenadas para desenhos circulares.
 */
function polar(cx,cy,r,a){const rad=(a-90)*Math.PI/180;return{x:cx+r*Math.cos(rad),y:cy+r*Math.sin(rad)}}
/**
 * Monta a base filtrada para exportação em CSV ou Excel.
 */
function currentBaseRowsForExport(){
  return S.rows.slice(0,50000).map(r=>({
    ano:DATA.dims.years[r[C.year]], regiao:DATA.dims.regions[r[C.region]], uf:DATA.dims.ufs[r[C.uf]],
    sexo:DATA.dims.sexes[r[C.sex]], idade_detalhada:DATA.dims.ages[r[C.age]], faixa_etaria_quinquenal:DATA.dims.ages[r[C.age]], tipo_populacao:DATA.dims.pops[r[C.pop]],
    indicador_id:DATA.indicators[r[C.ind]].id, indicador:DATA.indicators[r[C.ind]].label,
    numerador:r[C.num], denominador:r[C.den], n_entrevistas:r[C.n], casos:r[C.cases], soma_pesos_quadrados:r[C.w2],
    valor_percentual:r[C.den] ? r[C.num]/r[C.den]*100 : 0
  }));
}
/**
 * Renderiza a tabela abaixo do gráfico com os ResultadosProcessados calculados.
 */
function renderTable(){
  const body=$('#tableBody');
  if(!body) return;
  const rows=getFilteredTableRows();
  const pageSize=Number($('#tablePageSize')?.value||tableState.pageSize||25);
  tableState.pageSize=pageSize;
  const totalPages=Math.max(1,Math.ceil(rows.length/pageSize));
  tableState.page=Math.min(Math.max(1,tableState.page),totalPages);
  const start=(tableState.page-1)*pageSize;
  const pageRows=rows.slice(start,start+pageSize);
  body.innerHTML=pageRows.map(row=>{
    const precision=estimatePrecision(row);
    const rowClass=precision.key==='ok'?'':'low-sample-row';
    return `<tr class="${rowClass}"><td>${esc(row.Indicador||'')}</td><td>${esc(row.Categoria)}</td><td>${esc(row['Valor (%)'])}</td><td>${esc(row['IC 95% aproximado'])}</td><td>${esc(row['CV aproximado (%)'])}</td><td>${esc(row.Casos)}</td><td>${esc(row.Entrevistas)}</td><td><span class="reliability-badge ${precision.className}">${esc(precision.label)}</span></td><td>${esc(row.Fonte)}</td></tr>`;
  }).join('');
  if(!pageRows.length) body.innerHTML='<tr><td colspan="9">Nenhum resultado encontrado na tabela.</td></tr>';
  const status=$('#tableStatus');
  if(status) status.textContent=rows.length?`Página ${tableState.page} de ${totalPages} · ${rows.length} resultado(s)`:'Nenhum resultado';
  if($('#tablePrev')) $('#tablePrev').disabled=tableState.page<=1;
  if($('#tableNext')) $('#tableNext').disabled=tableState.page>=totalPages;
}
/**
 * Transforma a tabela de objetos em texto CSV.
 */
function toCsv(rows){
  if(!rows.length) return '';
  const headers=Object.keys(rows[0]).filter(h=>!['EstabilidadeChave','PrecisaoChave'].includes(h));
  return headers.join(',')+'\n'+rows.map(r=>headers.map(h=>`"${String(r[h]??'').replaceAll('"','""')}"`).join(',')).join('\n');
}
/**
 * Baixa a análise em formato CSV.
 */
function downloadCsv(rows,name){download(toCsv(rows),'text/csv;charset=utf-8',name)}
/**
 * Baixa a análise em formato compatível com Excel.
 */
function downloadExcel(rows,name){download(toCsv(rows).replaceAll(',', '\t'),'application/vnd.ms-excel;charset=utf-8',name)}
/**
 * Cria o arquivo temporário no navegador e dispara o download.
 */
function download(content,type,name){const blob=new Blob([content],{type}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name; a.click(); URL.revokeObjectURL(a.href)}
/**
 * Remove caracteres inadequados e produz um nome seguro para o arquivo exportado.
 */
function sanitizeFileName(value='grafico-vigitel'){
  return String(value || 'grafico-vigitel').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-zA-Z0-9_-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,90) || 'grafico-vigitel';
}

/**
 * Lê as dimensões do SVG e calcula a área útil do desenho.
 */
function svgDimensions(svg){
  const viewBox=svg?.viewBox?.baseVal;
  if(viewBox?.width&&viewBox?.height) return {width:viewBox.width,height:viewBox.height};
  const raw=String(svg?.getAttribute('viewBox')||'').trim().split(/\s+/).map(Number);
  if(raw.length===4&&raw.every(Number.isFinite)) return {width:raw[2],height:raw[3]};
  return {width:Number(svg?.getAttribute('width'))||1120,height:Number(svg?.getAttribute('height'))||700};
}

/**
 * Acrescenta um prefixo aos identificadores do SVG para evitar conflitos.
 */
function prefixSvgIds(root,prefix){
  const idMap=new Map();
  root.querySelectorAll('[id]').forEach(node=>{
    const oldId=node.id;
    const newId=`${prefix}-${oldId}`;
    idMap.set(oldId,newId);
    node.id=newId;
  });
  const attrs=['clip-path','fill','filter','mask','marker-start','marker-mid','marker-end','href','xlink:href','aria-labelledby','aria-describedby'];
  root.querySelectorAll('*').forEach(node=>{
    attrs.forEach(attr=>{
      const value=node.getAttribute(attr);
      if(!value) return;
      let next=value;
      idMap.forEach((newId,oldId)=>{
        next=next.replaceAll(`url(#${oldId})`,`url(#${newId})`).replaceAll(`#${oldId}`,`#${newId}`).replaceAll(oldId,newId);
      });
      node.setAttribute(attr,next);
    });
    const style=node.getAttribute('style');
    if(style){
      let next=style;
      idMap.forEach((newId,oldId)=>{next=next.replaceAll(`url(#${oldId})`,`url(#${newId})`);});
      node.setAttribute('style',next);
    }
  });
  return root;
}

/**
 * Cria uma cópia do SVG e ajusta atributos antes da exportação.
 */
function prepareSvgClone(svg,prefix){
  const clone=prefixSvgIds(svg.cloneNode(true),prefix);
  if(!clone.getAttribute('xmlns')) clone.setAttribute('xmlns','http://www.w3.org/2000/svg');
  clone.setAttribute('xmlns:xlink','http://www.w3.org/1999/xlink');
  const size=svgDimensions(svg);
  clone.setAttribute('width',String(size.width));
  clone.setAttribute('height',String(size.height));
  return {clone,...size};
}

/**
 * Monta o nome do arquivo usado na exportação de comparações.
 */
function comparisonExportName(extension){
  const primary=sanitizeFileName(S.indicator?.label||'Grafico-Vigitel');
  const compare=DATA.indicators.find(item=>item.id===S.compareIndicatorId);
  if(compare&&$('#compareEnabled')?.checked&&$('#chartCompare svg')){
    return `Comparacao-${primary}-x-${sanitizeFileName(compare.label)}.${extension}`;
  }
  return `${primary}.${extension}`;
}

/**
 * Monta o documento SVG final com todos os elementos da exportação.
 */
function buildExportSvgDocument(){
  const primarySvg = renderExportChartSvg(S.lastPrimaryData, S.lastGroup, S.chart, S.graphMeta) || $('#chart svg');
  if(!primarySvg) return null;
  const compareSvg = ($('#compareEnabled')?.checked && Array.isArray(S.lastCompareData) && S.lastCompareData.length)
    ? (renderExportChartSvg(S.lastCompareData, S.lastGroup, S.chart, S.compareGraphMeta || S.graphMeta) || $('#chartCompare svg'))
    : null;
  const primary=prepareSvgClone(primarySvg,'primary');

  if(!compareSvg){
    const wrapped = wrapExportDocument(primary.clone, primary.width, primary.height, 'Gráfico do Vigitel');
    const source=`<?xml version="1.0" encoding="UTF-8"?>
${new XMLSerializer().serializeToString(wrapped.outer)}`;
    return {source,width:wrapped.width,height:wrapped.height,count:1,transparent:exportBackgroundIsTransparent()};
  }

  const secondary=prepareSvgClone(compareSvg,'comparison');
  const gap=44;
  const padding=24;
  const contentHeight=Math.max(primary.height,secondary.height);
  const contentWidth=primary.width+secondary.width+gap+(padding*2);
  const contentNode=document.createElementNS('http://www.w3.org/2000/svg','g');
  primary.clone.setAttribute('x',String(padding));
  primary.clone.setAttribute('y',String(padding+(contentHeight-primary.height)/2));
  secondary.clone.setAttribute('x',String(padding+primary.width+gap));
  secondary.clone.setAttribute('y',String(padding+(contentHeight-secondary.height)/2));
  contentNode.append(primary.clone,secondary.clone);
  const wrapped = wrapExportDocument(contentNode, contentWidth, contentHeight + (padding*2), 'Comparação de dois indicadores do Vigitel');
  const source=`<?xml version="1.0" encoding="UTF-8"?>
${new XMLSerializer().serializeToString(wrapped.outer)}`;
  return {source,width:wrapped.width,height:wrapped.height,count:2,transparent:exportBackgroundIsTransparent()};
}

/**
 * Converte o SVG atual em texto pronto para gravação.
 */
function serializeChartSvg(svg){
  const prepared=prepareSvgClone(svg,'chart');
  return `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(prepared.clone)}`;
}

/**
 * Baixa o gráfico em SVG vetorial usando a configuração selecionada.
 */
function downloadVectorSvg(){
  const exported=buildExportSvgDocument();
  if(!exported){announceSave('Gere um gráfico antes de exportar em SVG.');return;}
  download(exported.source,'image/svg+xml;charset=utf-8',comparisonExportName('svg'));
  addVersionRecord('Exportação SVG',{force:true});
  announceSave(exported.count>1?'A comparação completa foi exportada em um único SVG.':'Gráfico exportado em SVG vetorial.');
}

/**
 * Converte o SVG atual em uma imagem PNG de alta resolução e inicia o download.
 */
function downloadSvg(){
  const exported=buildExportSvgDocument();
  if(!exported){announceSave('Gere um gráfico antes de exportar em PNG.');return;}
  const blob=new Blob([exported.source],{type:'image/svg+xml;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const img=new Image();
  img.onload=function(){
    const minimumWidth=exported.count>1?3200:1600;
    const targetWidth=Math.min(6400,Math.max(minimumWidth,Math.round(exported.width)));
    const scale=targetWidth/exported.width;
    const targetHeight=Math.max(1,Math.round(exported.height*scale));
    const canvas=document.createElement('canvas');
    canvas.width=targetWidth;
    canvas.height=targetHeight;
    const ctx=canvas.getContext('2d');
    if(!exported.transparent){
      ctx.fillStyle='#FFFFFF';
      ctx.fillRect(0,0,canvas.width,canvas.height);
    }else{
      ctx.clearRect(0,0,canvas.width,canvas.height);
    }
    ctx.drawImage(img,0,0,canvas.width,canvas.height);
    const a=document.createElement('a');
    a.download=comparisonExportName('png');
    a.href=canvas.toDataURL('image/png');
    a.click();
    URL.revokeObjectURL(url);
    addVersionRecord('Exportação PNG',{force:true});
    announceSave(exported.count>1?'A comparação completa foi exportada em um único PNG.':'Gráfico exportado em PNG.');
  };
  img.onerror=function(){URL.revokeObjectURL(url);announceSave('Não foi possível gerar a imagem PNG. Tente novamente ou use a exportação SVG.');};
  img.src=url;
}


