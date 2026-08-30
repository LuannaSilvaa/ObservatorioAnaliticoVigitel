/**
 * Concentra o sistema analítico com limpeza independente do período, a construção dos gráficos, as
 * tabelas e as exportações. Mudanças nesta camada devem ser
 * acompanhadas pelos testes de gráficos, filtros e atualização automática.
 */

const THEME_STORAGE_KEY = 'vigitel-theme';
const THEME_MODE_STORAGE_KEY = 'vigitel-theme-mode';
// A chave histórica é mantida para que configurações salvas em versões anteriores continuem disponíveis.
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
    textColor:'#16324F',
    chartBgColor:'#FFFFFF',
    plotBgColor:'#FFFFFF',
    gridColor:'#DDE7F2',
    borderColor:'#D6E1EE'
  }
};
const THEME_MEDIA_QUERY = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

/**
 * Determina se o painel deve usar o modo claro, o modo escuro ou a preferência do sistema.
 */
function resolveThemeMode(){
  try{
    return localStorage.getItem(THEME_MODE_STORAGE_KEY) || document.documentElement.dataset.themeMode || 'light';
  }catch(error){
    return document.documentElement.dataset.themeMode || 'light';
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
let explicitNoYears = false;
let themeCatalogOpen = false;
let filterAccordionOpen = false;
let chartAccordionOpen = false;
let mobileResultScrollPending = false;
const populationTransitionState = {
  lastPopulation: 'População Geral',
  savedYears: [],
  savedNoYears: false,
  savedGroup: 'Automático',
  autoAdjustedGroup: false
};
const DATA_FILTER_IDS = new Set(['popFilter','regionFilter','ufFilter','groupFilter']);

const MULTI_FILTER_DEFAULTS = {
  popFilter:['População Geral'],
  regionFilter:['Brasil'],
  ufFilter:['Brasil']
};
const MULTI_FILTER_NEUTRALS = {
  popFilter:new Set(['Todas','Nenhum']),
  regionFilter:new Set(['Brasil','Nenhum']),
  ufFilter:new Set(['Brasil','Nenhum'])
};

/** Remove duplicidades e valores vazios das listas de seleção múltipla. */
function uniqueSelectionValues(values=[]){
  return [...new Set((values || []).map(value=>String(value || '').trim()).filter(Boolean))];
}

/** Retorna os valores neutros de um filtro com suporte a múltipla seleção. */
function multiFilterNeutralSet(filterId=''){
  return MULTI_FILTER_NEUTRALS[filterId] || new Set();
}

/** Retorna o valor padrão de cada filtro com múltipla seleção. */
function multiFilterDefaults(filterId=''){
  return [...(MULTI_FILTER_DEFAULTS[filterId] || [])];
}

/** Normaliza a lista escolhida em filtros que podem comparar várias opções. */
function normalizeMultiFilterValues(filterId='', values=[]){
  const selected = uniqueSelectionValues(values);
  const defaults = multiFilterDefaults(filterId);
  return selected.length ? selected : defaults;
}

/** Lê os valores armazenados para filtros com seleção múltipla. */
function readMultiFilterValues(filterRef, fallbackValue=null){
  const field = typeof filterRef === 'string' ? ((filterRef.startsWith('#') ? $(filterRef) : $('#'+filterRef))) : filterRef;
  if(!field) return fallbackValue == null ? [] : normalizeMultiFilterValues('', [fallbackValue]);
  let parsed = [];
  try{
    parsed = JSON.parse(field.dataset.multiValues || '[]');
  }catch(error){
    parsed = [];
  }
  const normalized = normalizeMultiFilterValues(field.id, parsed.length ? parsed : [field.value || fallbackValue || multiFilterDefaults(field.id)[0] || '']);
  if(field.dataset.multiValues !== JSON.stringify(normalized)) field.dataset.multiValues = JSON.stringify(normalized);
  return normalized;
}

/** Atualiza o seletor original e espelha nele o estado da seleção múltipla. */
function applyMultiFilterValues(filterRef, values=[]){
  const field = typeof filterRef === 'string' ? ((filterRef.startsWith('#') ? $(filterRef) : $('#'+filterRef))) : filterRef;
  if(!field) return [];
  const normalized = normalizeMultiFilterValues(field.id, values);
  const neutrals = multiFilterNeutralSet(field.id);
  const specifics = normalized.filter(value=>!neutrals.has(value));
  let mirror = normalized[0] || multiFilterDefaults(field.id)[0] || '';

  if(field.id === 'popFilter'){
    if(specifics.length > 1) mirror = 'Todas';
    else if(specifics.length === 1) mirror = specifics[0];
    else if(normalized.includes('Nenhum')) mirror = 'Nenhum';
    else if(normalized.includes('Todas')) mirror = 'Todas';
    else mirror = 'População Geral';
  }else{
    if(specifics.length > 1) mirror = 'Brasil';
    else if(specifics.length === 1) mirror = specifics[0];
    else if(normalized.includes('Nenhum')) mirror = 'Nenhum';
    else mirror = 'Brasil';
  }

  field.dataset.multiValues = JSON.stringify(normalized);
  field.dataset.multiSummary = formatMultiFilterSummary(field.id, normalized);
  if([...field.options].some(option=>option.value === mirror)) field.value = mirror;
  return normalized;
}

/** Indica se o usuário escolheu populações específicas ou a visão agregada. */
function specificPopulationSelections(filters=null){
  const selected = filters?.pops || readMultiFilterValues('popFilter', filters?.pop || 'População Geral');
  const normalized = normalizeMultiFilterValues('popFilter', selected);
  const specifics = normalized.filter(value=>!['Todas','Nenhum'].includes(value));
  if(normalized.includes('Todas')) return [...new Set([...(DATA.dims.pops || []), ...specifics])];
  return specifics;
}

/** Indica se o usuário escolheu regiões específicas. */
function specificRegionSelections(filters=null){
  const selected = filters?.regions || readMultiFilterValues('regionFilter', filters?.region || 'Brasil');
  return normalizeMultiFilterValues('regionFilter', selected).filter(value=>!['Brasil','Nenhum'].includes(value));
}

/** Indica se o usuário escolheu unidades da federação específicas. */
function specificUfSelections(filters=null){
  const selected = filters?.ufs || readMultiFilterValues('ufFilter', filters?.uf || 'Brasil');
  return normalizeMultiFilterValues('ufFilter', selected).filter(value=>!['Brasil','Nenhum'].includes(value));
}

/** Lista todas as séries de população que devem aparecer no gráfico. */
function selectedPopulationEntries(filters=null){
  const normalized = normalizeMultiFilterValues('popFilter', filters?.pops || readMultiFilterValues('popFilter', filters?.pop || 'População Geral'));
  const entries = [];
  if(normalized.includes('Todas')) entries.push({kind:'População',value:'Todas',label:'Todas as populações'});
  normalized.filter(value=>!['Todas','Nenhum'].includes(value)).forEach(value=>entries.push({kind:'População',value,label:value}));
  return entries.length ? entries : [{kind:'População',value:'População Geral',label:'População Geral'}];
}

/** Resume a seleção múltipla em um texto curto para botões e cartões. */
function formatMultiFilterSummary(filterId, values=[]){
  const normalized = normalizeMultiFilterValues(filterId, values);
  const displayValues = filterId === 'ufFilter'
    ? normalized.map(value=>value === 'Brasil' ? 'Todas as UF' : (UF_NAMES[value] || value))
    : normalized.map(value=>value === 'Todas' ? 'Todas as populações' : value);
  if(!displayValues.length) return filterId === 'popFilter' ? 'População Geral' : 'Brasil';
  if(displayValues.length === 1) return displayValues[0];
  return `${displayValues.length} selecionados`;
}

/** Lista localidades escolhidas pelo usuário para comparação, inclusive o Brasil. */
function selectedGeographyEntries(filters=null){
  const ufs = normalizeMultiFilterValues('ufFilter', filters?.ufs || readMultiFilterValues('ufFilter', filters?.uf || 'Brasil'));
  const regions = normalizeMultiFilterValues('regionFilter', filters?.regions || readMultiFilterValues('regionFilter', filters?.region || 'Brasil'));
  const entries = [];
  const add = entry=>{ if(!entries.some(item=>item.kind===entry.kind && item.value===entry.value)) entries.push(entry); };
  if(ufs.includes('Brasil') || regions.includes('Brasil')) add({kind:'Brasil',value:'Brasil',label:'Brasil'});
  regions.filter(value=>!['Brasil','Nenhum'].includes(value)).forEach(value=>add({kind:'Região',value,label:value}));
  ufs.filter(value=>!['Brasil','Nenhum'].includes(value)).forEach(value=>add({kind:'UF',value,label:UF_NAMES[value] || value}));
  return entries;
}

/** Garante que um filtro múltiplo preserve suas várias escolhas na próxima atualização. */
function queueMultiFilterRefresh(field){
  if(!field) return;
  field.dataset.preserveMultiSelection = 'true';
  queueFilterRefresh(field,0);
}

/**
 * Informa se o evento partiu de um controle que altera os dados da análise.
 */
function isDataFilterTarget(target){
  if(!target) return false;
  if(DATA_FILTER_IDS.has(target.id)) return true;
  return Boolean(target.closest?.('#yearChecks, #sexChecks, #ageDetailChecks, #ageChecks'));
}

const AUTOMATIC_UPDATE_IGNORED_IDS = new Set([
  'searchInput','legendSearchInput','tableSearch','tableSort','tablePageSize',
  'favoriteName','glossarySearch','exportPreset','exportTransparentBg',
  'compareEnabled','compareIndicator','ageRangeMin','ageRangeMax','ageMinInput','ageMaxInput','ageIntervalInput'
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
  if(Object.values(SEX_COLOR_CONTROL_IDS).includes(target.id)) syncSexColorPickers();
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
 * Descarta resultados processados em cache quando uma seleção modifica a análise.
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
  const preserveMulti = changedTarget?.dataset?.preserveMultiSelection === 'true';
  if(preserveMulti) delete changedTarget.dataset.preserveMultiSelection;
  const popField = $('#popFilter');
  const groupField = $('#groupFilter');
  const regionField = $('#regionFilter');
  const ufField = $('#ufFilter');
  if(changedId === 'popFilter' && popField && !preserveMulti) applyMultiFilterValues(popField,[popField.value || 'População Geral']);
  if(changedId === 'regionFilter' && regionField && !preserveMulti) applyMultiFilterValues(regionField,[regionField.value || 'Brasil']);
  if(changedId === 'ufFilter' && ufField && !preserveMulti) applyMultiFilterValues(ufField,[ufField.value || 'Brasil']);
  const selectedPopulations = readMultiFilterValues(popField,'População Geral');
  const pop = selectedPopulations.length === 1 ? selectedPopulations[0] : (selectedPopulations.includes('Nenhum') ? 'Nenhum' : 'Todas');
  const supportsExactAge = exactAgeSupported(S.indicator?.id);

  if(changedTarget?.closest?.('#sexChecks')){
    const checked=$$('#sexChecks input[type="checkbox"]:checked');
    if(!checked.length && changedTarget.type==='checkbox') changedTarget.checked=true;
  }

  if(changedTarget?.closest?.('#yearChecks')){
    explicitNoYears = pop !== 'População Negra' && selectedChecks('#yearChecks').length === 0;
  }
  if(pop === 'População Negra') explicitNoYears = false;

  if(changedTarget?.closest?.('#ageDetailChecks') && changedTarget.checked){
    $('#ageChecks input').forEach(input=>{ input.checked = false; });
  }
  if(changedTarget?.closest?.('#ageChecks') && changedTarget.checked){
    $('#ageDetailChecks input').forEach(input=>{ input.checked = false; });
  }

  if(!preserveMulti && changedId === 'ufFilter' && ufField){
    const uf = ufField.value;
    if(uf && !['Brasil','Nenhum'].includes(uf) && regionField){
      regionField.value = UF_REGION_MAP[uf] || 'Brasil';
      applyMultiFilterValues(regionField,[regionField.value || 'Brasil']);
    }
  }

  if(!preserveMulti && changedId === 'regionFilter' && regionField && ufField){
    const region = regionField.value;
    const uf = ufField.value;
    if(region && !['Brasil','Nenhum'].includes(region) && uf && !['Brasil','Nenhum'].includes(uf) && UF_REGION_MAP[uf] !== region){
      ufField.value = 'Brasil';
      applyMultiFilterValues(ufField,['Brasil']);
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
    populationTransitionState.savedNoYears = explicitNoYears;
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
    explicitNoYears = Boolean(populationTransitionState.savedNoYears) && selectedChecks('#yearChecks').length === 0;
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
  map:{title:'Mapa por UF',use:'Compara as unidades da Federação por intensidade de cor.',best:'Ideal para observar diferenças geográficas e padrões regionais.',avoid:'Com uma única UF selecionada, as demais aparecem sem dados para preservar o contexto nacional.'},
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
let AGE_DETAIL_UPDATE_LOAD = null;

/**
 * Informa se o indicador selecionado possui resultados processados válidos por idade exata.
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
 * Carrega uma única vez o complemento produzido pela área administrativa.
 */
function loadExactAgeUpdate(){
  const updateFile=window.VIGITEL_AGE_DETAIL?.meta?.updateFile;
  if(!updateFile) return Promise.resolve(null);
  if(window.VIGITEL_AGE_DETAIL_UPDATE) return Promise.resolve(window.VIGITEL_AGE_DETAIL_UPDATE);
  if(AGE_DETAIL_UPDATE_LOAD) return AGE_DETAIL_UPDATE_LOAD;
  AGE_DETAIL_UPDATE_LOAD=new Promise((resolve,reject)=>{
    const script=document.createElement('script');
    script.src=`${String(updateFile).split('/').map(encodeURIComponent).join('/')}?edicao=${encodeURIComponent(AGE_DETAIL_VERSION)}`;
    script.async=true;
    /** Entrega o complemento administrativo depois que o navegador conclui o carregamento. */
    script.onload=()=>resolve(window.VIGITEL_AGE_DETAIL_UPDATE || null);
    /** Informa a indisponibilidade do complemento sem ocultar a causa do carregamento. */
    script.onerror=()=>reject(new Error('Não foi possível carregar o complemento administrativo de idade detalhada.'));
    document.head.appendChild(script);
  });
  return AGE_DETAIL_UPDATE_LOAD;
}

/**
 * Substitui somente os anos importados e remapeia os índices da base anterior.
 */
function mergeExactAgeUpdate(indicatorId, baseRows, update){
  const ageStore=window.VIGITEL_AGE_DETAIL;
  const baseYears=ageStore.meta?.baseYears || ageStore.dims.years;
  const basePops=ageStore.meta?.basePops || ageStore.dims.pops;
  const affected=new Set((update?.affected || []).map(item=>`${item[0]}|${item[1]}`));
  const preserved=(baseRows || []).filter(row=>{
    const year=baseYears[row[AGE_C.year]];
    const pop=basePops[row[AGE_C.pop]];
    return !affected.has(`${year}|${pop}`);
  }).map(row=>{
    const copy=row.slice();
    copy[AGE_C.year]=ageStore.dims.years.indexOf(baseYears[row[AGE_C.year]]);
    copy[AGE_C.pop]=ageStore.dims.pops.indexOf(basePops[row[AGE_C.pop]]);
    return copy;
  }).filter(row=>row[AGE_C.year]>=0 && row[AGE_C.pop]>=0);
  return preserved.concat(update?.loaded?.[indicatorId] || []);
}

/**
 * Carrega sob demanda o arquivo de idade detalhada do indicador selecionado.
 */
function loadExactAgeIndicator(indicatorId){
  const ageStore = window.VIGITEL_AGE_DETAIL = window.VIGITEL_AGE_DETAIL || {loaded:{}, loadedVersion:{}};
  ageStore.loaded = ageStore.loaded || {};
  ageStore.loadedVersion = ageStore.loadedVersion || {};
  ageStore.mergedVersion = ageStore.mergedVersion || {};
  if(ageStore.loaded[indicatorId] && ageStore.mergedVersion[indicatorId] === AGE_DETAIL_VERSION) return Promise.resolve(ageStore.loaded[indicatorId]);
  if(!exactAgeSupported(indicatorId)) return Promise.reject(new Error(exactAgeUnsupportedReason(indicatorId)));
  if(AGE_DETAIL_LOADS.has(indicatorId)) return AGE_DETAIL_LOADS.get(indicatorId);
  const indicatorFile=window.VIGITEL_AGE_DETAIL?.meta?.files?.[indicatorId];
  if(!indicatorFile) return Promise.reject(new Error(`O catálogo não informa o arquivo de idade detalhada de ${indicatorId}.`));
  const baseLoad=ageStore.loaded[indicatorId]
    ? Promise.resolve()
    : new Promise((resolve,reject)=>{
      const script=document.createElement('script');
      script.src=`${String(indicatorFile).split('/').map(encodeURIComponent).join('/')}?edicao=${encodeURIComponent(AGE_DETAIL_VERSION)}`;
      script.async=true;
      /** Libera a etapa de combinação assim que o arquivo temático estiver disponível. */
      script.onload=resolve;
      /** Rejeita o carregamento para impedir que uma série incompleta seja apresentada. */
      script.onerror=()=>reject(new Error(`Não foi possível carregar a idade detalhada de ${indicatorId}.`));
      document.head.appendChild(script);
    });
  const promise=Promise.all([baseLoad,loadExactAgeUpdate()]).then(([,update])=>{
    const baseRows=ageStore.loaded[indicatorId] || [];
    const rows=mergeExactAgeUpdate(indicatorId,baseRows,update);
    if(!rows.length) throw new Error(`Os arquivos de idade detalhada de ${indicatorId} não retornaram dados.`);
    ageStore.loaded[indicatorId]=rows;
    ageStore.loadedVersion[indicatorId]=AGE_DETAIL_VERSION;
    ageStore.mergedVersion[indicatorId]=AGE_DETAIL_VERSION;
    return rows;
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
  if(filters.noYears && filters.pop !== 'População Negra') return [];
  const validYears=filters.pop==='População Negra' ? ['2018'] : (filters.years.length ? filters.years : dims.years);
  const yearSet=new Set(validYears);
  const selectedAges=new Set(filters.ageDetails || []);
  const selectedBands=new Set(filters.ages || []);
  const selectedSexes=normalizeSexSelections(filters.sexes || [filters.sex]);
  const allSexes=selectedSexes.includes('Todos');
  const normalizedPops = normalizeMultiFilterValues('popFilter', filters.pops || [filters.pop]);
  const popSet=new Set(specificPopulationSelections(filters));
  const normalizedRegions = normalizeMultiFilterValues('regionFilter', filters.regions || [filters.region]);
  const normalizedUfs = normalizeMultiFilterValues('ufFilter', filters.ufs || [filters.uf]);
  const regionSet=new Set(specificRegionSelections(filters));
  const ufSet=new Set(specificUfSelections(filters));
  const hasGeoRestriction=!(normalizedRegions.includes('Brasil') || normalizedUfs.includes('Brasil')) && (regionSet.size > 0 || ufSet.size > 0);
  const hasPopRestriction=!normalizedPops.includes('Todas') && popSet.size > 0;
  return all.filter(row=>{
    const year=dims.years[row[AGE_C.year]];
    const uf=dims.ufs[row[AGE_C.uf]];
    const sex=dims.sexes[row[AGE_C.sex]];
    const age=dims.ages[row[AGE_C.age]];
    const pop=dims.pops[row[AGE_C.pop]];
    if(!yearSet.has(year)) return false;
    if(!allSexes && !selectedSexes.includes(sex)) return false;
    if(hasPopRestriction && !popSet.has(pop)) return false;
    if(hasGeoRestriction){
      const region=UF_REGION_MAP[uf];
      if(!ufSet.has(uf) && !regionSet.has(region)) return false;
    }
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

const SEX_FILTER_VALUES = ['Todos','Feminino','Masculino'];
const DEFAULT_SEX_SERIES_COLORS = {Todos:'#073B70',Feminino:'#D73372',Masculino:'#0FA7A0'};

/** Normaliza as escolhas de sexo, preservando a ordem visual da interface. */
function normalizeSexSelections(values){
  const source = Array.isArray(values) ? values : [values];
  const selected = new Set(source.filter(Boolean));
  const result = SEX_FILTER_VALUES.filter(value=>selected.has(value));
  return result.length ? result : ['Todos'];
}

/** Lê as caixas de sexo visíveis no painel lateral. */
function selectedSexesFromUi(){
  const inputs = $$('#sexChecks input[type="checkbox"]:checked');
  return normalizeSexSelections(inputs.map(input=>input.value));
}

/** Aplica uma ou mais escolhas de sexo às caixas permanentes. */
function applySexSelections(values){
  const selected = new Set(normalizeSexSelections(values));
  $$('#sexChecks input[type="checkbox"]').forEach(input=>{ input.checked = selected.has(input.value); });
}

const SEX_FILTER_META = {
  Todos:'Série geral da população',
  Feminino:'Série da população feminina',
  Masculino:'Série da população masculina'
};
const SEX_COLOR_CONTROL_IDS = {Todos:'sexColorTodos',Feminino:'sexColorFeminino',Masculino:'sexColorMasculino'};

/** Mantém todos os seletores de cor por sexo sincronizados entre os painéis. */
function syncSexColorPickers(){
  SEX_FILTER_VALUES.forEach(value=>{
    const source=$('#'+SEX_COLOR_CONTROL_IDS[value]);
    const color=source?.value || DEFAULT_SEX_SERIES_COLORS[value];
    document.querySelectorAll(`[data-sex-inline-color="${value}"], [data-quick-sex-color="${value}"]`).forEach(input=>{
      if(input.value !== color) input.value=color;
    });
  });
}

/** Cria as três opções de sexo como cartões simples, com cor automática definida na edição do gráfico. */
function renderSexChecks(selected=['Todos']){
  const box = $('#sexChecks');
  if(!box) return;
  const active = new Set(normalizeSexSelections(selected));
  box.innerHTML = SEX_FILTER_VALUES.map(value=>`<label class="sex-check-option ${active.has(value)?'selected':''}">
      <input type="checkbox" value="${esc(value)}" ${active.has(value)?'checked':''}/>
      <span class="sex-check-mark" aria-hidden="true"></span>
      <span class="sex-check-copy"><strong>${esc(value)}</strong></span>
    </label>`).join('');
}

/** Compacta números consecutivos em intervalos, útil para anos e outras escalas discretas. */
function compressNumberRanges(values){
  const nums=[...new Set((values || []).map(Number).filter(Number.isFinite))].sort((a,b)=>a-b);
  if(!nums.length) return '';
  const chunks=[];
  let start=nums[0],previous=nums[0];
  for(let i=1;i<=nums.length;i++){
    const current=nums[i];
    if(current===previous+1){ previous=current; continue; }
    chunks.push(start===previous ? String(start) : `${start}-${previous}`);
    start=current; previous=current;
  }
  return chunks.join(', ');
}

/** Resume uma seleção de sexo para títulos, chips e relatórios. */
function sexSelectionLabel(filters){
  const values = normalizeSexSelections(filters?.sexes || [filters?.sex]);
  if(values.length === 3) return 'Todos · Feminino · Masculino';
  return values.join(' · ');
}

/** Retorna a cor personalizada de cada série de sexo. */
function sexSeriesColor(series,opt={}){
  const colors = opt.sexColors || {};
  if(colors[series]) return colors[series];
  if(DEFAULT_SEX_SERIES_COLORS[series]) return DEFAULT_SEX_SERIES_COLORS[series];
  if(!series) return opt.primary || '#073B70';
  const hash = Array.from(String(series)).reduce((acc,char)=>acc + char.charCodeAt(0),0);
  return palette(hash,opt);
}


/** Define um traço visual para séries que podem se sobrepor no gráfico. */
function seriesStrokeDasharray(name=''){
  const label = String(name || '');
  if(label.includes('Todas as populações')) return '10 7';
  if(label.includes('População Negra')) return '4 6';
  return '';
}

/** Ajusta a ordem de desenho para não esconder séries quase idênticas. */
function seriesDrawPriority(name=''){
  const label = String(name || '');
  if(label.includes('População Geral')) return 1;
  if(label.includes('Todas as populações')) return 2;
  if(label.includes('População Negra')) return 3;
  return 1;
}

/** Converte o rótulo de idade detalhada para o número utilizado nos controles. */
function ageNumberFromLabel(label){
  const value = Number(String(label || '').match(/\d+/)?.[0]);
  return Number.isFinite(value) ? Math.max(18,Math.min(80,value)) : null;
}

/** Converte um número do seletor para o rótulo existente na base detalhada. */
function ageLabelFromNumber(age){
  const value = Math.max(18,Math.min(80,Number(age) || 18));
  return value >= 80 ? '80 anos ou mais' : `${value} anos`;
}

/** Retorna as idades exatas atualmente selecionadas no estado interno. */
function selectedDetailedAgeNumbers(){
  return selectedChecks('#ageDetailChecks').map(ageNumberFromLabel).filter(Number.isFinite).sort((a,b)=>a-b);
}

/** Compacta idades selecionadas em uma expressão legível, inclusive intervalos descontínuos. */
function compressAgeNumbers(values){
  const ages = [...new Set((values || []).map(Number).filter(Number.isFinite).map(v=>Math.max(18,Math.min(80,v))))].sort((a,b)=>a-b);
  if(!ages.length) return '';
  const groups=[];
  let start=ages[0], previous=ages[0];
  for(let i=1;i<=ages.length;i++){
    const current=ages[i];
    if(current === previous + 1){ previous=current; continue; }
    const startLabel = start === 80 ? '80+' : String(start);
    const endLabel = previous === 80 ? '80+' : String(previous);
    groups.push(start === previous ? startLabel : `${startLabel}-${endLabel}`);
    start=current; previous=current;
  }
  return groups.join(', ');
}

/** Resume o filtro etário, tratando a faixa completa como ausência de recorte. */
function ageSelectionSummary(){
  const ages = selectedDetailedAgeNumbers();
  if(!ages.length) return '18 a 80+';
  return compressAgeNumbers(ages).replaceAll('-', ' a ');
}

/** Atualiza todos os controles de idade visíveis a partir da seleção interna. */
function syncAgeRangeControls(){
  const ages = selectedDetailedAgeNumbers();
  const min = ages.length ? ages[0] : 18;
  const max = ages.length ? ages.at(-1) : 80;
  const expression = ages.length ? compressAgeNumbers(ages) : '';
  document.querySelectorAll('[data-age-range-ui]').forEach(container=>{
    const minRange=container.querySelector('[data-age-min-range]');
    const maxRange=container.querySelector('[data-age-max-range]');
    const minNumber=container.querySelector('[data-age-min-number]');
    const maxNumber=container.querySelector('[data-age-max-number]');
    const interval=container.querySelector('[data-age-interval]');
    const summary=container.querySelector('[data-age-range-summary]');
    const dual=container.querySelector('[data-age-dual-range]');
    if(minRange) minRange.value=String(min);
    if(maxRange) maxRange.value=String(max);
    if(minNumber) minNumber.value=String(min);
    if(maxNumber) maxNumber.value=String(max);
    if(interval) interval.value=expression;
    if(summary) summary.textContent=ages.length ? ageSelectionSummary() : '18 a 80+ · todas';
    if(dual){
      const minPct=((min-18)/(80-18))*100;
      const maxPct=((max-18)/(80-18))*100;
      dual.style.setProperty('--age-min-pct',`${minPct}%`);
      dual.style.setProperty('--age-max-pct',`${maxPct}%`);
    }
  });
}

/** Aplica um conjunto de idades exatas. A faixa completa equivale a sem recorte. */
function applyDetailedAgeNumbers(values){
  const ages=[...new Set((values || []).map(Number).filter(Number.isFinite).map(v=>Math.max(18,Math.min(80,Math.round(v)))))].sort((a,b)=>a-b);
  const allSelected=ages.length===63 && ages[0]===18 && ages.at(-1)===80;
  const selected = new Set(allSelected ? [] : ages.map(ageLabelFromNumber));
  $$('#ageDetailChecks input').forEach(input=>{ input.checked=selected.has(input.value); });
  $$('#ageChecks input').forEach(input=>{ input.checked=false; });
  syncAgeRangeControls();
}

/** Encurta os rótulos quinquenais somente na interface visual. */
function ageGroupShortLabel(value){
  const label=String(value || '');
  if(/^65\s+anos\s+ou\s+mais$/i.test(label)) return '65+';
  return label.replace(/\s+anos$/i,'');
}

/** Aplica faixas etárias quinquenais ao estado interno e limpa a idade detalhada quando necessário. */
function applyAgeGroupSelections(values=[]){
  const selected=new Set((values || []).map(String));
  $$('#ageChecks input').forEach(input=>{ input.checked=selected.has(input.value); });
  if(selected.size){
    $$('#ageDetailChecks input').forEach(input=>{ input.checked=false; });
  }
  syncAgeRangeControls();
}

/** Aplica um intervalo contínuo, corrigindo automaticamente limites invertidos. */
function applyAgeRangeBounds(minValue,maxValue){
  let min=Math.max(18,Math.min(80,Math.round(Number(minValue)||18)));
  let max=Math.max(18,Math.min(80,Math.round(Number(maxValue)||80)));
  if(min>max) [min,max]=[max,min];
  const ages=[];
  for(let age=min;age<=max;age++) ages.push(age);
  applyDetailedAgeNumbers(ages);
  return {min,max};
}

/** Interpreta entradas como "18-24, 30-35, 50" e devolve as idades escolhidas. */
function parseAgeIntervalExpression(text){
  const clean=String(text || '').trim();
  if(!clean) return [];
  const ages=[];
  for(const rawPart of clean.split(/[,;]+/)){
    const part=rawPart.trim().replace(/\s+/g,' ');
    if(!part) continue;
    const range=part.match(/^(\d{1,3})\s*(?:-|–|—|a|até)\s*(\d{1,3}|80\+)$/i);
    if(range){
      let start=Number(range[1]);
      let end=range[2].includes('+') ? 80 : Number(range[2]);
      if(!Number.isFinite(start)||!Number.isFinite(end)) continue;
      start=Math.max(18,Math.min(80,start)); end=Math.max(18,Math.min(80,end));
      if(start>end) [start,end]=[end,start];
      for(let age=start;age<=end;age++) ages.push(age);
      continue;
    }
    const single=part.match(/^(\d{1,3})(?:\+)?$/);
    if(single){ ages.push(Math.max(18,Math.min(80,Number(single[1])))); }
  }
  return [...new Set(ages)].sort((a,b)=>a-b);
}

/** Liga um seletor de idade, permanente ou criado no popover rápido, ao estado interno. */
function bindAgeRangeUi(container){
  if(!container || container.dataset.ageRangeBound==='true') return;
  container.dataset.ageRangeBound='true';
  const minRange=container.querySelector('[data-age-min-range]');
  const maxRange=container.querySelector('[data-age-max-range]');
  const minNumber=container.querySelector('[data-age-min-number]');
  const maxNumber=container.querySelector('[data-age-max-number]');
  const interval=container.querySelector('[data-age-interval]');
  const applyButton=container.querySelector('[data-age-apply]');
  const clearButton=container.querySelector('[data-age-clear]');
  /** Normaliza e aplica os limites escolhidos no seletor de idade. */
  const applyBounds=source=>{
    const min=source==='range' ? minRange?.value : minNumber?.value;
    const max=source==='range' ? maxRange?.value : maxNumber?.value;
    const normalized=applyAgeRangeBounds(min,max);
    if(interval) interval.value='';
    if(minRange) minRange.value=String(normalized.min);
    if(maxRange) maxRange.value=String(normalized.max);
    if(minNumber) minNumber.value=String(normalized.min);
    if(maxNumber) maxNumber.value=String(normalized.max);
    queueFilterRefresh($('#ageDetailChecks'),0);
  };
  minRange?.addEventListener('input',()=>applyBounds('range'));
  maxRange?.addEventListener('input',()=>applyBounds('range'));
  minNumber?.addEventListener('change',()=>applyBounds('number'));
  maxNumber?.addEventListener('change',()=>applyBounds('number'));
  applyButton?.addEventListener('click',()=>{
    const ages=parseAgeIntervalExpression(interval?.value);
    if(!ages.length && String(interval?.value || '').trim()){
      announceSave('Digite idades entre 18 e 80, por exemplo: 18-24, 30-35, 50.');
      return;
    }
    if(ages.length) applyDetailedAgeNumbers(ages); else applyDetailedAgeNumbers(Array.from({length:63},(_,i)=>18+i));
    queueFilterRefresh($('#ageDetailChecks'),0);
  });
  interval?.addEventListener('keydown',event=>{ if(event.key==='Enter'){event.preventDefault();applyButton?.click();} });
  clearButton?.addEventListener('click',()=>{
    applyDetailedAgeNumbers(Array.from({length:63},(_,i)=>18+i));
    queueFilterRefresh($('#ageDetailChecks'),0);
  });
}

const chartTypes = [
  ["line","Série temporal","L"],["area","Área","A"],["bar","Barras verticais","B"],
  ["horizontal","Barras horizontais","H"],["ranking","Ranking","R"],["lollipop","Pirulito","I"],
  ["pareto","Pareto","T"],["pie","Pizza","P"],["donut","Rosca","D"],["radar","Radar","D"],
  ["kpi","Cartões KPI","K"],["gauge","Medidor","G"],["map","Mapa por UF","M"],["treemap","Treemap","M"]
];
const chartChoiceDescriptions = {
  line:"Mostra a evolução do indicador ao longo dos anos.",
  area:"Destaca a evolução e o volume da série.",
  bar:"Compara os resultados em colunas.",
  horizontal:"Compara resultados com rótulos mais longos.",
  ranking:"Ordena os resultados do maior para o menor.",
  lollipop:"Compara valores usando pontos e hastes.",
  pareto:"Mostra valores ordenados e a participação acumulada.",
  pie:"Mostra a participação de cada categoria no total.",
  donut:"Mostra proporções em formato de anel.",
  radar:"Compara perfis em vários eixos.",
  kpi:"Resume os principais valores em cartões.",
  gauge:"Destaca um valor em formato de medidor.",
  map:"Compara as unidades da Federação no mapa.",
  treemap:"Compara proporções por meio de áreas."
};

// A aba escolhida é visual, portanto não interfere nos dados nem nos cálculos.
let resultView = 'chart';
let lastNonMapChart = 'line';
let resultDemographicAgeSection = '';
const RESULT_TOOLBAR_ORDER_STORAGE_KEY = 'vigitel-result-toolbar-order-v1';
let activeResultChoiceDrag = null;

/**
 * Prepara uma análise nacional de atividade física para que a página inicial
 * já apresente o novo painel de resultados. A pessoa pode trocar qualquer
 * escolha pelos controles do topo, sem perder os demais recursos do sistema.
 */
function applyDefaultResultAnalysis(){
  const theme = DATA.themes.find(item=>item.id === 'atividade') || DATA.themes[0] || null;
  const indicator = DATA.indicators.find(item=>item.id === 'AF01')
    || DATA.indicators.find(item=>item.themeId === theme?.id)
    || null;

  S.theme = theme;
  S.indicator = indicator;
  S.filters = true;
  S.chart = 'line';
  resultView = 'chart';
  lastNonMapChart = 'line';

  renderAll();
  updateSummaries();
  saveAnalysisState({recordVersion:false});
  recordHistory(true);
  scheduleGenerate(0);
}

/**
 * Converte somente as antigas cores automáticas do gráfico escuro para a
 * superfície branca atual. Cores personalizadas continuam preservadas.
 */
function migrateLegacyDarkGraphAppearance(){
  if(currentTheme() !== 'dark') return false;
  const replacements = {
    textColor:['#E7EEF8','#e7eef8','#F1F5F9','#f1f5f9'],
    chartBgColor:['#0F1923','#0f1923'],
    plotBgColor:['#111E2A','#111e2a'],
    gridColor:['#30465A','#30465a'],
    borderColor:['#3A5168','#3a5168']
  };
  let changed = false;
  Object.entries(replacements).forEach(([id,legacyValues])=>{
    const control = $('#'+id);
    const nextValue = GRAPH_THEME_DEFAULTS.dark[id];
    if(!control || !nextValue || !legacyValues.includes(control.value)) return;
    control.value = nextValue;
    changed = true;
  });
  return changed;
}

/**
 * Inicializa o painel. Um link compartilhado ou uma análise completa salva
 * pode ser restaurado; no primeiro acesso, todas as escolhas permanecem vazias.
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
  ensureClearAnalysisButton();
  bindEvents();
  $('#resultTitle').textContent = 'Monte a análise selecionando tema, indicador, filtros e gráfico';
  $('#resultSubtitle').textContent = '';
  $('#chart').innerHTML = `<div class="panel-subtitle">Selecione um tema, um indicador e um tipo de gráfico para gerar a visualização.</div>`;
  const sharedLoaded = applySharedConfigurationFromUrl();
  // Uma abertura comum sempre começa vazia. Apenas um link de análise válido
  // pode preencher o painel automaticamente.
  if(!sharedLoaded) clearEntireAnalysis({silent:true,preserveUrl:true});
  const graphAppearanceMigrated = migrateLegacyDarkGraphAppearance();
  if(graphAppearanceMigrated){
    saveAnalysisState({recordVersion:false});
    if(hasRequiredBlocks()) scheduleGenerate(0);
  }
  upgradeAccessibility();
}

/**
 * Garante a presença do botão mesmo quando o navegador reutiliza uma versão
 * antiga da estrutura HTML. O evento é ligado depois pela rotina principal.
 */
function ensureClearAnalysisButton(){
  const tabs = document.querySelector('.result-view-tabs');
  if(!tabs) return null;
  let button = $('#resultClearAnalysis');
  if(!button){
    button = document.createElement('button');
    button.id = 'resultClearAnalysis';
    button.className = 'result-clear-analysis';
    button.type = 'button';
    button.title = 'Apagar tema, indicador, filtros, gráfico e personalizações';
    button.setAttribute('aria-label','Limpar toda a análise');
    button.innerHTML = '<span aria-hidden="true">↻</span>Limpar análise';
  }

  // Move o elemento real para logo depois de Mapa. As propriedades inline com
  // prioridade máxima neutralizam folhas antigas que possam estar em cache.
  const mapButton = $('#resultViewMap');
  tabs.insertBefore(button,mapButton?.nextSibling || null);
  const forcedStyles = {
    display:'inline-flex', visibility:'visible', opacity:'1', position:'relative',
    margin:'0 0 8px auto', minWidth:'148px', minHeight:'38px', padding:'8px 15px',
    alignItems:'center', justifyContent:'center', gap:'7px', flex:'0 0 auto',
    border:'1px solid #0B4F97', borderRadius:'9px',
    background:'linear-gradient(135deg,#0B4F97,#073B70)', color:'#FFFFFF',
    fontSize:'11px', fontWeight:'850', lineHeight:'1', whiteSpace:'nowrap',
    cursor:'pointer', zIndex:'5'
  };
  Object.entries(forcedStyles).forEach(([property,value])=>{
    const cssProperty = property.replace(/[A-Z]/g,letter=>`-${letter.toLowerCase()}`);
    button.style.setProperty(cssProperty,value,'important');
  });
  button.hidden = false;
  return button;
}

/**
 * Mostra um resumo da base carregada, indicando quantidade de linhas, indicadores e período.
 */
function buildHeaderStatus(){
  $('#dataStatus').textContent = `Base agregada: ${DATA.meta.rows.toLocaleString('pt-BR')} linhas · ${DATA.indicators.length} indicadores · idade detalhada recalculada diretamente de q6 para os indicadores compatíveis · ${DATA.meta.yearsLabel}.`;
  const versionName = $('#baseVersionName');
  const versionDetails = $('#baseVersionDetails');
  const coveredPeriod = $('#periodoCobertoDoPainel');
  if(versionName) versionName.textContent = `Base de dados ${String(DATA.meta.baseVersion || 'incorporada').split(' - ')[0]}`;
  if(versionDetails) versionDetails.textContent = `Mapa real do Brasil e experiência móvel atualizada · ${DATA.meta.yearsLabel}. ${DATA.meta.weightLimitation || ''}`.trim();
  if(coveredPeriod) coveredPeriod.textContent = `A versão atual reúne dados de ${DATA.meta.yearsLabel}, conforme as edições efetivamente presentes na base validada. O painel também considera a base específica de População Negra de 2018 quando aplicável.`;
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
  return ['customTitle','customSubtitle','sourceText','xAxisTitle','yAxisTitle','fontFamily','titleAlign','subtitleAlign','sourceAlign','titleSize','subtitleSize','fontSize','axisSize','valueSize','legendSize','primaryColor','secondaryColor','sexColorTodos','sexColorFeminino','sexColorMasculino','textColor','chartBgColor','plotBgColor','gridColor','borderColor','paletteSelect','showBorder','showXAxisTitle','showYAxisTitle','showAxisLabels','showGrid','labelRotation','decimalPlaces','sortOrder','showValues','valuePosition','showLegend','legendPosition','showSource','barWidthScale','lineWidth','pointSize','showPoints','donutHole','showTreemapLabels'];
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
  const sexes = selectedSexesFromUi();
  const pops = readMultiFilterValues('popFilter','População Geral');
  const regions = readMultiFilterValues('regionFilter','Brasil');
  const ufs = readMultiFilterValues('ufFilter','Brasil');
  const specificPops = specificPopulationSelections({pops});
  const specificRegions = specificRegionSelections({regions});
  const specificUfs = specificUfSelections({ufs});
  return {
    sexes,
    sex: sexes.length === 1 ? sexes[0] : 'Todos',
    pops,
    pop: specificPops.length === 1 ? specificPops[0] : (pops.includes('Nenhum') ? 'Nenhum' : (pops.includes('Todas') || specificPops.length > 1 ? 'Todas' : 'População Geral')),
    regions,
    region: specificRegions.length === 1 ? specificRegions[0] : (regions.includes('Nenhum') ? 'Nenhum' : 'Brasil'),
    ufs,
    uf: specificUfs.length === 1 ? specificUfs[0] : (ufs.includes('Nenhum') ? 'Nenhum' : 'Brasil'),
    group: $('#groupFilter')?.value || 'Automático',
    years: selectedChecks('#yearChecks'),
    noYears: explicitNoYears,
    ageDetails: selectedChecks('#ageDetailChecks'),
    ages: selectedChecks('#ageChecks')
  };
}

/**
 * Restaura os filtros a partir de uma configuração salva.
 */
function applyFilterSnapshot(snapshot={}){
  applySexSelections(snapshot.sexes || [snapshot.sex || 'Todos']);
  applyMultiFilterValues('popFilter', snapshot.pops || [snapshot.pop || 'População Geral']);
  applyMultiFilterValues('regionFilter', snapshot.regions || [snapshot.region || 'Brasil']);
  applyMultiFilterValues('ufFilter', snapshot.ufs || [snapshot.uf || 'Brasil']);
  setControlValue('groupFilter', snapshot.group || 'Automático');
  explicitNoYears = Boolean(snapshot.noYears);
  const yearSet = new Set(snapshot.years || []);
  const ageDetailSet = new Set(snapshot.ageDetails || []);
  const ageSet = new Set(snapshot.ages || []);
  $$('#yearChecks input').forEach(i=>i.checked = yearSet.has(i.value));
  $$('#ageDetailChecks input').forEach(i=>i.checked = ageDetailSet.has(i.value));
  $$('#ageChecks input').forEach(i=>i.checked = ageSet.has(i.value));
  syncAgeRangeControls();
  populationTransitionState.lastPopulation = (snapshot.pops || [snapshot.pop || 'População Geral']).length === 1 ? ((snapshot.pops || [snapshot.pop || 'População Geral'])[0]) : 'Todas';
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
    // O tema pertence ao site, não à análise. Histórico, favorito, gráfico,
    // tabela ou mapa só podem restaurá-lo quando isso for solicitado de forma explícita.
    if(options.restoreTheme === true && payload.themeMode){
      applyThemeMode(payload.themeMode, {save:options.saveTheme !== false, updateChart:false, syncGraph:false});
    }
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
    const complete = Boolean(
      payload?.selectedThemeId
      && payload?.selectedIndicatorId
      && payload?.selectedChart
      && payload?.filtersSelected !== false
    );
    if(!complete) return false;
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
  const selectedSexes=normalizeSexSelections(filters.sexes || [filters.sex]);
  if(!(selectedSexes.length===1 && selectedSexes[0]==='Todos')) details.push(`Sexo: ${selectedSexes.join(' + ')}`);
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
 * Monta um endereço legível com tema, indicador, gráfico e todos os filtros
 * necessários para reproduzir a análise em outro navegador.
 */
function buildSharedAnalysisUrl(){
  const filters = getFilterSnapshot();
  const url = new URL(location.href);
  const singleParameters = {
    temaAnalise: S.theme?.id || '',
    indicador: S.indicator?.id || '',
    grafico: S.chart || '',
    populacao: filters.pop,
    regiao: filters.region,
    uf: filters.uf,
    recorte: filters.group
  };
  const knownParameters = ['temaAnalise','indicador','grafico','sexo','populacao','regiao','uf','recorte','ano','semAno','idade','faixa'];

  url.hash = '';
  knownParameters.forEach(name=>url.searchParams.delete(name));
  Object.entries(singleParameters).forEach(([name,value])=>url.searchParams.set(name,String(value ?? '')));
  normalizeSexSelections(filters.sexes || [filters.sex]).forEach(value=>url.searchParams.append('sexo',String(value)));
  (filters.years || []).forEach(value=>url.searchParams.append('ano',String(value)));
  if(filters.noYears) url.searchParams.set('semAno','1');
  (filters.ageDetails || []).forEach(value=>url.searchParams.append('idade',String(value)));
  (filters.ages || []).forEach(value=>url.searchParams.append('faixa',String(value)));
  return url.toString();
}

/**
 * Reconstrói o estado essencial da análise a partir dos parâmetros legíveis
 * presentes no endereço compartilhado.
 */
function sharedStateFromQuery(){
  const parameters = new URLSearchParams(location.search);
  // `tema=dark|light|auto` pertence à aparência geral do site. Uma análise
  // compartilhada só existe quando indicador e gráfico também estão presentes.
  const hasIndicator = parameters.has('indicador');
  const hasChart = parameters.has('grafico');
  if(!hasIndicator && !hasChart) return null;
  if(!hasIndicator || !hasChart) throw new Error('O endereço não contém uma análise completa.');

  // `tema` permanece como alternativa apenas para links produzidos antes da
  // separação entre tema visual e tema da análise.
  const themeId = parameters.get('temaAnalise') || parameters.get('tema') || '';
  const indicatorId = parameters.get('indicador') || '';
  const chartId = parameters.get('grafico') || '';
  const theme = DATA.themes.find(item=>item.id===themeId);
  const indicator = DATA.indicators.find(item=>item.id===indicatorId);
  const validChart = chartTypes.some(item=>item[0]===chartId);
  if(!theme || !indicator || indicator.themeId!==theme.id || !validChart) throw new Error('O endereço não contém uma análise válida.');
  const querySexes=normalizeSexSelections(parameters.getAll('sexo').filter(Boolean).length ? parameters.getAll('sexo').filter(Boolean) : [parameters.get('sexo') || 'Todos']);

  return {
    selectedThemeId: theme.id,
    selectedIndicatorId: indicator.id,
    selectedChart: chartId,
    filtersSelected: true,
    filters: {
      sexes: querySexes,
      sex: querySexes.length===1 ? querySexes[0] : 'Todos',
      pop: parameters.get('populacao') || 'População Geral',
      region: parameters.get('regiao') || 'Brasil',
      uf: parameters.get('uf') || 'Brasil',
      group: parameters.get('recorte') || 'Automático',
      years: parameters.getAll('ano').filter(Boolean),
      noYears: parameters.get('semAno') === '1',
      ageDetails: parameters.getAll('idade').filter(Boolean),
      ages: parameters.getAll('faixa').filter(Boolean)
    }
  };
}

/**
 * Copia ou compartilha o endereço capaz de reconstruir a análise atual.
 */
let shareConfigurationInProgress = false;
const shareIntent = new WeakMap();

/**
 * Registra a intenção no início da interação. Isso impede que uma mudança de
 * layout termine o clique sobre o botão de compartilhamento por acidente.
 */
function registerShareIntent(event){
  const button = event.currentTarget;
  if(!button || !['shareConfigBtn','resultShareAnalysis'].includes(button.id)) return;
  if(event.type === 'keydown' && !['Enter',' '].includes(event.key)) return;
  shareIntent.set(button,{time:Date.now(),pointerId:event.pointerId ?? null,type:event.type});
}

/** Confirma e consome uma interação iniciada no mesmo botão. */
function consumeShareIntent(button,event){
  const intent = shareIntent.get(button);
  shareIntent.delete(button);
  if(!intent || Date.now() - intent.time > 1800) return false;
  if(intent.type === 'pointerdown' && event.detail === 0) return false;
  return true;
}

/** Liga o compartilhamento sem aceitar ativações sintéticas ou acidentais. */
function bindExplicitShareButton(button){
  if(!button || button.dataset.explicitShareBound === 'true') return;
  button.dataset.explicitShareBound = 'true';
  button.addEventListener('pointerdown',registerShareIntent);
  button.addEventListener('keydown',registerShareIntent);
  button.addEventListener('click',shareConfiguration);
}

/**
 * Compartilha a configuração completa da análise somente após uma ação real do
 * usuário. A validação protege a área de transferência contra cópias causadas
 * por atualizações de tela e mantém no endereço os filtros necessários para
 * reconstruir o resultado em outro navegador.
 */
async function shareConfiguration(event){
  // A área de transferência só pode ser alterada por um clique real e direto
  // do usuário. Mudanças de aba, restaurações de estado e chamadas por .click()
  // feitas pelo próprio sistema nunca devem copiar o endereço.
  if(!event || event.isTrusted !== true) return;
  const shareButton = event.currentTarget;
  if(!shareButton || !['shareConfigBtn','resultShareAnalysis'].includes(shareButton.id)) return;
  if(!consumeShareIntent(shareButton,event)) return;
  if(shareConfigurationInProgress) return;

  if(!hasRequiredBlocks()){
    announceSave('Complete tema, indicador, filtros e gráfico antes de compartilhar.');
    return;
  }

  shareConfigurationInProgress = true;
  const url = buildSharedAnalysisUrl();
  try{
    if(typeof navigator.share === 'function' && location.protocol !== 'file:'){
      await navigator.share({
        title: $('#resultTitle')?.textContent || 'Análise do Observatório do Vigitel',
        text: 'Abra esta análise no Observatório Analítico do Vigitel.',
        url
      });
      announceSave('Link da análise compartilhado.');
      return;
    }
    await navigator.clipboard.writeText(url);
    announceSave('Link da análise copiado.');
  }catch(error){
    if(error?.name === 'AbortError') return;
    const field = document.createElement('textarea');
    field.value = url;
    field.setAttribute('readonly','');
    field.style.position = 'fixed';
    field.style.opacity = '0';
    document.body.appendChild(field);
    field.select();
    const copied = document.execCommand('copy');
    field.remove();
    announceSave(copied ? 'Link da análise copiado.' : 'Não foi possível copiar o link neste navegador.');
  }finally{
    shareConfigurationInProgress = false;
  }
}

/**
 * Lê a análise presente no endereço e mantém compatibilidade com os links
 * codificados produzidos pelas versões anteriores.
 */
function applySharedConfigurationFromUrl(){
  try{
    let state = sharedStateFromQuery();
    if(!state){
      const legacyMatch = location.hash.match(/^#config=(.+)$/);
      if(!legacyMatch) return false;
      state = decodeSharedState(legacyMatch[1]);
    }
    applyAnalysisState(state, {generate:true, saveTheme:true});
    saveAnalysisState();
    recordHistory(true);
    announceSave('Análise compartilhada carregada.');
    return true;
  }catch(error){
    console.error('Análise compartilhada inválida.', error);
    announceSave('O link compartilhado não contém uma análise válida.');
    return false;
  }
}

/**
 * Exibe mensagens de salvamento e atualização para o usuário e para tecnologias assistivas.
 */
function announceSave(message='Análise salva no navegador.'){
  const status = $('#analysisSaveStatus');
  if(status) status.textContent = message;
  const region = $('#toastRegion');
  if(!region || !message) return;

  const toast = document.createElement('div');
  toast.className = 'app-toast';
  const icon = document.createElement('span');
  icon.className = 'app-toast-icon';
  icon.setAttribute('aria-hidden','true');
  icon.textContent = '✓';
  const text = document.createElement('span');
  text.className = 'app-toast-text';
  text.textContent = message;
  toast.append(icon,text);
  region.appendChild(toast);

  while(region.children.length > 3) region.firstElementChild?.remove();
  window.requestAnimationFrame(()=>toast.classList.add('show'));
  window.setTimeout(()=>{
    toast.classList.remove('show');
    window.setTimeout(()=>toast.remove(),220);
  },3200);
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
  const comparisonRequested = Boolean(S.compareEnabled || $('#compareEnabled')?.checked);
  const preferred = comparisonRequested
    ? (current && current!==S.indicator?.id && DATA.indicators.some(i=>i.id===current) ? current : DATA.indicators.find(i=>i.id!==S.indicator?.id)?.id || '')
    : '';
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
function updateLoading(show, message='Atualizando a análise'){
  const mask = $('#chartLoading');
  if(mask){
    mask.classList.toggle('show', Boolean(show));
    mask.setAttribute('aria-hidden', String(!show));
  }
  const text = $('#chartLoadingText');
  if(text && message) text.textContent = message;
}

/**
 * Registra que a seleção do usuário acabou de completar as quatro etapas da
 * análise. Alterações posteriores de filtros não provocam novos saltos na tela.
 */
function scheduleMobileResultScroll(previouslyComplete=false){
  if(!previouslyComplete && hasRequiredBlocks()) mobileResultScrollPending = true;
}

/**
 * Conduz o usuário móvel até o resultado depois que o gráfico termina de ser
 * gerado, respeitando a preferência do sistema por menos movimento.
 */
function scrollGeneratedResultOnMobile(options={}){
  const force = options.force === true;
  if(!force && !mobileResultScrollPending) return false;
  mobileResultScrollPending = false;

  const isMobile = window.matchMedia
    ? window.matchMedia('(max-width: 900px)').matches
    : window.innerWidth <= 900;
  const results = $('.results');
  if(!isMobile || !results || results.hidden) return false;

  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  window.setTimeout(()=>{
    results.scrollIntoView({behavior:reduceMotion ? 'auto' : 'smooth', block:'start'});
  }, 90);
  return true;
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
 * Monta a chave usada para armazenar e recuperar resultados processados calculados.
 */
function analysisCacheKey(indicatorId, filters, group){
  return JSON.stringify({indicatorId,filters,group});
}

/**
 * Retorna o resultado da análise atual, reutilizando o cache quando possível.
 */
function getAnalysisResult(indicator, filters, group){
  if(!indicator) return {rows:[],data:[]};
  const exactAge = exactAgeSupported(indicator.id) && (effectiveGroup(group)==='Idade detalhada' || Boolean(filters.ageDetails?.length));
  const key = analysisCacheKey(indicator.id, filters, `${group}:${exactAge?'q6':'faixa'}`);
  if(analysisCache.has(key)){
    const cached = analysisCache.get(key);
    analysisCache.delete(key);
    analysisCache.set(key,cached);
    return cached;
  }
  const rows = exactAge ? filterExactAgeRows(filters, indicator.id) : filterRows(filters, indicator.id);
  if(!exactAge) validateFilteredRows(rows, filters);
  const data = aggregateSexSeries(rows,group,filters,exactAge);
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
  const selectedSexes=normalizeSexSelections(f.sexes || [f.sex]);
  if(!(selectedSexes.length===1 && selectedSexes[0]==='Todos')) parts.push(`Sexo: ${selectedSexes.join(', ')}`);
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
  area.innerHTML=`<h1>Relatório Analítico do Vigitel</h1><p><strong>Gerado em:</strong> ${new Date().toLocaleString('pt-BR')}</p><p><strong>Análise:</strong> ${esc($('#resultTitle')?.textContent || '')}</p><h2>Filtros utilizados</h2><ul>${filterItems}</ul><h2>Visualização e metodologia</h2><div class="report-chart">${primarySvg}</div>${primaryMethod}${compareSvg ? `<div class="report-chart">${compareSvg}</div>${compareMethod}` : ''}<h2>Tabela de resultados processados</h2><div class="report-table-contexts">${tableContexts}</div><table><thead><tr><th>Indicador</th><th>Categoria</th><th>Valor (%)</th><th>IC 95% aproximado</th><th>CV aproximado (%)</th><th>Casos</th><th>Entrevistas</th><th>Precisão amostral</th></tr></thead><tbody>${tableHtml}</tbody></table><h2>Notas metodológicas gerais</h2><p>As estimativas são obtidas pela razão entre a soma ponderada do numerador e a soma ponderada do denominador elegível. O IC95% e o CV são aproximações baseadas no tamanho efetivo de Kish, calculado pela soma dos pesos e pela soma dos pesos ao quadrado. A sinalização considera baixa precisão quando há 20 casos ou menos ou CV aproximado ≥35%, e cautela quando o CV está entre 20% e 35%. Essas medidas não substituem a análise completa do desenho amostral. Fonte: Vigitel - Ministério da Saúde.</p>`;
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
 * Executa os testes internos do painel e apresenta um resumo dos resultados processados.
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
  test('Renderizadores de gráficos',()=>{const names=['lineSvg','barSvg','hbarSvg','pieSvg','radarSvg','kpiSvg','gaugeSvg','lollipopSvg','paretoSvg','mapSvg','treemapSvg']; const missing=names.filter(name=>typeof window[name]!=='function'); if(missing.length) throw new Error(`Funções ausentes: ${missing.join(', ')}`); return `${names.length} renderizadores disponíveis`;});
  test('Renderização de todos os formatos',()=>{
    const mock=[{label:'A',category:'A',value:12,n:100},{label:'B',category:'B',value:24,n:120},{label:'C',category:'C',value:36,n:140},{label:'D',category:'D',value:48,n:160},{label:'E',category:'E',value:20,n:110}];
    const opt=chartOptions();
    const oldMeta=S.graphMeta;
    S.graphMeta={title:'Teste automático',subtitle:'Validação interna',source:'Fonte de teste'};
    const mapMock=[{label:'Acre',category:'AC',value:18,n:100},{label:'Rio Grande do Norte',category:'RN',value:31,n:120},{label:'São Paulo',category:'SP',value:47,n:140}];
    const outputs=[lineSvg(mock,opt,false),lineSvg(mock,opt,true),barSvg(mock,opt),hbarSvg(mock,opt),lollipopSvg(mock,opt),paretoSvg(mock,opt),pieSvg(mock,opt,false),pieSvg(mock,opt,true),radarSvg(mock,opt),kpiSvg(mock,opt),gaugeSvg(mock,opt),mapSvg(mapMock,opt),treemapSvg(mock,opt)];
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
    analytics: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20V5M4 20h16" fill="none" stroke="${color}" stroke-width="1.7" stroke-linecap="round"/><rect x="6.3" y="14" width="2.8" height="6" rx=".7" fill="none" stroke="${color}" stroke-width="1.5"/><rect x="10.8" y="10" width="2.8" height="10" rx=".7" fill="none" stroke="${color}" stroke-width="1.5"/><path d="m6.7 11 4-3.4 3 2.1 4.6-5" fill="none" stroke="${color}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><circle cx="18.3" cy="4.7" r="1.4" fill="${color}"/></svg>`,
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
    gauge: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 16a8 8 0 0 1 16 0" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round"/><path d="M12 16l4-5" stroke="${color}" stroke-width="1.8" stroke-linecap="round"/><circle cx="12" cy="16" r="1.6" fill="${color}"/></svg>`,
    map: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 5 5-2 6 2 5-2v16l-5 2-6-2-5 2V5Z" fill="none" stroke="${color}" stroke-width="1.7" stroke-linejoin="round"/><path d="M9 3v16M15 5v16" fill="none" stroke="${color}" stroke-width="1.4"/><path d="M12 8.2c1.7 0 3 1.3 3 3 0 2.2-3 5.6-3 5.6s-3-3.4-3-5.6c0-1.7 1.3-3 3-3Z" fill="none" stroke="${color}" stroke-width="1.5"/><circle cx="12" cy="11.2" r="1" fill="${color}"/></svg>`
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
    vigitel:"layers"
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
  const icons = {line:"line", area:"line", bar:"bars", horizontal:"bars", ranking:"trophy", lollipop:"line", pareto:"line", pie:"pie", donut:"pie", radar:"line", kpi:"bars", gauge:"gauge", map:"map", treemap:"layers"};
  return iconSVG(icons[chartId] || "analytics", "#0B7F8C");
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
 * Mostra todo o catálogo de temas em um acordeão principal e mantém os
 * indicadores organizados dentro do respectivo tema.
 */
function renderThemes(){
  const box = $('#themeBlocks');
  box.innerHTML = '';
  const term = ($('#searchInput')?.value || '').toLowerCase().trim();
  const catalog = document.createElement('div');
  catalog.className = 'theme-accordion theme-catalog-accordion';
  if(themeCatalogOpen) catalog.classList.add('open');

  const selectedTheme = S.theme;
  const selectedIndicator = S.indicator;
  const catalogSubtitle = selectedIndicator
    ? `${selectedTheme?.label || 'Tema'} · ${selectedIndicator.label}`
    : selectedTheme
      ? `${selectedTheme.label} selecionado`
      : 'Escolha o tema e o indicador';

  const catalogHeader = document.createElement('button');
  catalogHeader.type = 'button';
  catalogHeader.className = 'theme-header theme-catalog-header';
  catalogHeader.setAttribute('aria-controls','themeCatalogOptions');
  catalogHeader.setAttribute('aria-expanded',String(themeCatalogOpen));
  catalogHeader.innerHTML = `
    <span class="theme-topic-icon">${iconSVG('layers','#0B7F8C')}</span>
    <span class="theme-title-area">
      <strong>Temas e indicadores</strong>
      <span title="${esc(catalogSubtitle)}">${esc(catalogSubtitle)}</span>
    </span>
    <span class="theme-count">${DATA.themes.length}</span>
    <span class="theme-toggle">${themeCatalogOpen ? '⌃' : '⌄'}</span>
  `;
  catalogHeader.addEventListener('click',()=>{
    themeCatalogOpen = !themeCatalogOpen;
    renderThemes();
  });

  const catalogContent = document.createElement('div');
  catalogContent.id = 'themeCatalogOptions';
  catalogContent.className = 'theme-catalog-content';
  catalogContent.hidden = !themeCatalogOpen;

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
    catalogContent.appendChild(group);
  });

  if(!catalogContent.children.length) {
    catalogContent.innerHTML = `<p class="panel-subtitle">Nenhum tema ou indicador encontrado.</p>`;
  }

  catalog.appendChild(catalogHeader);
  catalog.appendChild(catalogContent);
  box.appendChild(catalog);
}

/**
 * Mantém compatibilidade com a busca; os indicadores agora aparecem dentro dos temas.
 */
function renderIndicators(){
  renderThemes();
}

/**
 * Leva o usuário ao grupo de filtros escolhido e abre o painel móvel quando
 * necessário, sem modificar os valores já selecionados.
 */
function openFilterSection(sectionId){
  const cluster = document.querySelector(`.filter-panel .filter-cluster[data-filter-section="${sectionId}"]`);
  if(!cluster) return;

  cluster.open = true;
  const isMobile = window.matchMedia
    ? window.matchMedia('(max-width: 900px)').matches
    : window.innerWidth <= 900;
  if(isMobile) window.VigitelMobile?.openFilters();

  window.setTimeout(()=>{
    const panel = $('#mobileFilterDrawer');
    if(panel?.scrollTo) panel.scrollTo({top:Math.max(0,cluster.offsetTop-76),behavior:'smooth'});
    cluster.querySelector('summary')?.focus({preventScroll:true});
  }, isMobile ? 240 : 40);
}

/**
 * Mostra os quatro grupos de filtros no mesmo acordeão usado pelos temas e
 * pelos tipos de gráfico, preservando o arraste do bloco completo.
 */
function renderFilterBlock(){
  const box = $('#filterBlocks');
  box.innerHTML='';
  const filterSections = [
    {id:'period',label:'Período',detail:'Anos disponíveis',icon:'line'},
    {id:'demographic',label:'Demográficos',detail:'Sexo, idades e população',icon:'stetho'},
    {id:'geographic',label:'Geográficos',detail:'Região e unidade da Federação',icon:'map'},
    {id:'other',label:'Outros filtros',detail:'Recorte, textos, cores e estilo',icon:'dots'}
  ];
  const group = document.createElement('div');
  group.className = 'theme-accordion filter-accordion';
  if(filterAccordionOpen) group.classList.add('open');
  if(S.filters) group.classList.add('selected');

  const header = document.createElement('button');
  header.type = 'button';
  header.className = 'theme-header filter-accordion-header';
  header.draggable = true;
  header.dataset.type = 'filters';
  header.dataset.id = 'standard';
  header.setAttribute('aria-controls','filterTypeOptions');
  header.setAttribute('aria-expanded',String(filterAccordionOpen));
  const filterSubtitle = S.filters
    ? 'Filtros adicionados à análise'
    : 'Escolha os recortes da análise';
  header.innerHTML = `
    <span class="theme-topic-icon">${iconSVG('funnel','#0B7F8C')}</span>
    <span class="theme-title-area">
      <strong>Filtros</strong>
      <span>${esc(filterSubtitle)}</span>
    </span>
    <span class="theme-count">${filterSections.length}</span>
    <span class="theme-toggle">${filterAccordionOpen ? '⌃' : '⌄'}</span>
  `;
  header.addEventListener('dragstart',ev=>{
    ev.dataTransfer.setData('text/plain', JSON.stringify({type:'filters',id:'standard'}));
  });
  header.addEventListener('click',()=>{
    filterAccordionOpen = !filterAccordionOpen;
    renderFilterBlock();
  });

  const list = document.createElement('div');
  list.id = 'filterTypeOptions';
  list.className = 'theme-indicator-list filter-type-list';
  list.hidden = !filterAccordionOpen;
  filterSections.forEach(section=>{
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'theme-indicator-item chart-type-item filter-type-item';
    item.draggable = true;
    item.dataset.type = 'filters';
    item.dataset.id = 'standard';
    item.innerHTML = `
      <span class="theme-indicator-drag">⋮⋮</span>
      <span class="filter-type-icon">${iconSVG(section.icon,'#0B7F8C')}</span>
      <span class="chart-type-label"><strong>${esc(section.label)}</strong><small>${esc(section.detail)}</small></span>
      <span class="theme-indicator-open">↗</span>
    `;
    item.addEventListener('click',()=>{
      filterAccordionOpen = false;
      selectBlock('filters','standard');
      openFilterSection(section.id);
    });
    item.addEventListener('dragstart',ev=>{
      ev.dataTransfer.setData('text/plain', JSON.stringify({type:'filters',id:'standard'}));
    });
    list.appendChild(item);
  });

  group.appendChild(header);
  group.appendChild(list);
  box.appendChild(group);
}

/**
 * Renderiza os tipos de gráfico em um acordeão compacto, seguindo o mesmo padrão visual de temas e indicadores.
 */
function renderChartBlocks(){
  const box = $('#chartBlocks');
  box.innerHTML='';
  const group = document.createElement('div');
  group.className = 'theme-accordion chart-accordion';
  if(chartAccordionOpen) group.classList.add('open');

  const header = document.createElement('button');
  header.type = 'button';
  header.className = 'theme-header chart-accordion-header';
  header.setAttribute('aria-controls','chartTypeOptions');
  header.setAttribute('aria-expanded',String(chartAccordionOpen));
  header.innerHTML = `
    <span class="theme-topic-icon">${iconSVG('analytics','#0B7F8C')}</span>
    <span class="theme-title-area">
      <strong>Tipos de gráfico</strong>
      <span>Escolha a visualização</span>
    </span>
    <span class="theme-count">${chartTypes.length}</span>
    <span class="theme-toggle">${chartAccordionOpen ? '⌃' : '⌄'}</span>
  `;
  header.addEventListener('click',()=>{
    chartAccordionOpen = !chartAccordionOpen;
    renderChartBlocks();
  });

  const list = document.createElement('div');
  list.id = 'chartTypeOptions';
  list.className = 'theme-indicator-list chart-type-list';
  list.hidden = !chartAccordionOpen;
  chartTypes.forEach(([id,label,icon])=>{
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'theme-indicator-item chart-type-item';
    item.draggable = true;
    item.dataset.type = 'chart';
    item.dataset.id = id;
    if(S.chart===id) item.classList.add('selected');
    item.innerHTML = `
      <span class="theme-indicator-drag">⋮⋮</span>
      <span class="chart-type-icon">${getChartIcon(id)}</span>
      <span class="chart-type-label"><strong>${esc(label)}</strong><small>Tipo de visualização</small></span>
      <span class="theme-indicator-open">↗</span>
    `;
    item.addEventListener('click',()=>selectBlock('chart',id));
    item.addEventListener('dragstart',ev=>{
      ev.dataTransfer.setData('text/plain', JSON.stringify({type:'chart',id}));
    });
    list.appendChild(item);
  });
  group.appendChild(header);
  group.appendChild(list);
  box.appendChild(group);
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
    setComparisonLayoutActive(true);
  }

  return true;
}

/** Mantém o contêiner externo sincronizado com o modo de comparação. */
function setComparisonLayoutActive(active){
  const enabled=Boolean(active);
  $('#chartComparisonGrid')?.classList.toggle('compare-active',enabled);
  $('#chartWrapper')?.classList.toggle('comparison-active',enabled);
}

/**
 * Atualiza a análise ao escolher tema, indicador, bloco de filtros ou tipo de gráfico.
 */
function selectBlock(type,id){
  const previouslyComplete = hasRequiredBlocks();

  if(type==='theme'){
    S.theme = DATA.themes.find(t=>t.id===id);
    if(S.indicator && S.indicator.themeId!==S.theme.id) S.indicator = null;
    scheduleMobileResultScroll(previouslyComplete);
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
    themeCatalogOpen = false;
    scheduleMobileResultScroll(previouslyComplete);
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
    scheduleMobileResultScroll(previouslyComplete);
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
    scheduleMobileResultScroll(previouslyComplete);
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
  const currentSlot = nextIncompleteAnalysisStep();
  setSlot('theme', S.theme?.label, S.theme ? 'Tema selecionado' : '', S.theme ? getThemeIcon(S.theme.id) : iconSVG('layers'), S.theme?.color, currentSlot);
  setSlot('indicator', S.indicator?.label, S.indicator ? 'Indicador selecionado' : '', S.indicator ? getIndicatorIcon(S.indicator) : iconSVG('line'), DATA.themes.find(t=>t.id===S.indicator?.themeId)?.color, currentSlot);
  const active = activeFilterCount();
  setSlot('filters', S.filters ? 'Filtros adicionados' : '', S.filters ? (active ? `${active} recorte(s) ativo(s)` : 'Sem recorte específico') : '', iconSVG('funnel'), '#198754', currentSlot);
  setSlot('chart', chartTypes.find(c=>c[0]===S.chart)?.[1] || '', S.chart ? 'Visualização selecionada' : '', S.chart ? getChartIcon(S.chart) : iconSVG('bars'), '#7C3FD0', currentSlot);
  updateAnalysisStageVisibility();
}

/**
 * Monta um cartão central com número, desenho, instrução e seleção atual.
 */
function setSlot(slot,label,detail,icon,color,currentSlot){
  const target = document.querySelector(`[data-slot="${slot}"] .slot-content`);
  const card = target?.closest('.drop-slot');
  if(!target || !card) return;
  const config = {
    theme: {n:1, title:'Tema', visual: iconSVG('layers'), hint:'Toque para escolher o tema'},
    indicator: {n:2, title:'Indicador', visual: iconSVG('line'), hint:S.theme ? 'Toque para escolher o indicador' : 'Escolha o tema primeiro'},
    filters: {n:3, title:'Filtros', visual: iconSVG('funnel'), hint:'Toque para adicionar os filtros'},
    chart: {n:4, title:'Gráfico', visual: iconSVG('bars'), hint:'Toque para escolher o gráfico'}
  }[slot];
  const complete = Boolean(label);
  const current = currentSlot === slot;
  card.classList.toggle('is-complete', complete);
  card.classList.toggle('is-current', current);
  card.setAttribute('aria-current', current ? 'step' : 'false');
  card.setAttribute('aria-label', complete
    ? `${config.title}: ${label}. Toque para alterar.`
    : `${config.title}. ${config.hint}.`);

  const selected = complete ? `
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
      <span class="workflow-number">${complete ? '✓' : config.n}</span>
      <strong>${config.title}</strong>
    </div>
    <div class="workflow-visual">${config.visual}</div>
    <p class="workflow-hint">${esc(complete ? 'Toque para alterar' : config.hint)}</p>
    ${selected}
  `;
}

/**
 * Retorna a primeira escolha que ainda falta para concluir a análise.
 */
function nextIncompleteAnalysisStep(){
  if(!S.theme) return 'theme';
  if(!S.indicator) return 'indicator';
  if(!S.filters) return 'filters';
  if(!S.chart) return 'chart';
  return null;
}

/**
 * Abre na lateral exatamente o catálogo relacionado ao cartão tocado.
 * O arraste continua disponível, mas clicar passa a ser o caminho principal.
 */
function openAnalysisStep(requestedStep){
  const step = requestedStep === 'indicator' && !S.theme ? 'theme' : requestedStep;
  let selector = '';

  if(step === 'theme' || step === 'indicator'){
    themeCatalogOpen = true;
    renderThemes();
    selector = step === 'indicator'
      ? '#themeBlocks .theme-accordion.open .theme-header:not(.theme-catalog-header)'
      : '#themeBlocks .theme-catalog-header';
  }else if(step === 'filters'){
    filterAccordionOpen = true;
    renderFilterBlock();
    selector = '#filterBlocks .filter-accordion-header';
  }else if(step === 'chart'){
    chartAccordionOpen = true;
    renderChartBlocks();
    selector = '#chartBlocks .chart-accordion-header';
  }

  const target = document.querySelector(selector);
  if(!target) return false;
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  target.scrollIntoView({behavior:reduceMotion ? 'auto' : 'smooth', block:'center'});
  window.setTimeout(()=>target.focus({preventScroll:true}), reduceMotion ? 0 : 260);
  return true;
}

/**
 * Preenche os filtros da coluna direita com anos, sexo, localização, idade e população.
 */
function renderFilters(){
  fillChecks('#yearChecks', DATA.dims.years, false);
  fillChecks('#ageDetailChecks', DETAILED_AGES, false);
  fillChecks('#ageChecks', DATA.dims.ages, false);
  renderSexChecks(['Todos']);
  renderVisibleAgeGroups();
  fillSelect('#regionFilter', ['Nenhum','Brasil',...DATA.dims.regions], 'Brasil');
  fillSelect('#ufFilter', ['Nenhum','Brasil',...DATA.dims.ufs], 'Brasil', v=> v==='Brasil' ? 'Todas as UF' : (v==='Nenhum' ? 'Nenhum' : (UF_NAMES[v]||v)));
  fillSelect('#popFilter', ['Nenhum','Todas',...DATA.dims.pops], 'População Geral');
  applyMultiFilterValues('regionFilter',['Brasil']);
  applyMultiFilterValues('ufFilter',['Brasil']);
  applyMultiFilterValues('popFilter',['População Geral']);
  fillSelect('#groupFilter', ['Automático','Ano','Região','UF','Sexo','Idade detalhada','Faixa etária quinquenal'], 'Automático');
  bindAgeRangeUi($('#ageRangeFilter'));
  syncAgeRangeControls();
  updateSummaries();
}


/** Renderiza a versão visível das faixas quinquenais no painel lateral. */
function renderVisibleAgeGroups(){
  const box=$('#ageQuickGroups');
  if(!box) return;
  const selected=new Set(selectedChecks('#ageChecks'));
  box.innerHTML=(DATA.dims.ages || []).map(value=>`<button aria-pressed="${selected.has(value)}" class="${selected.has(value)?'selected':''}" data-visible-age-group="${esc(value)}" type="button">${esc(ageGroupShortLabel(value))}</button>`).join('');
  box.querySelectorAll('[data-visible-age-group]').forEach(button=>button.addEventListener('click',()=>{
    const input=$$('#ageChecks input').find(item=>item.value===button.dataset.visibleAgeGroup);
    if(!input) return;
    input.checked=!input.checked;
    if(input.checked) $$('#ageDetailChecks input').forEach(other=>{ other.checked=false; });
    queueFilterRefresh(input,0);
    renderVisibleAgeGroups();
  }));
  const all=$('#visibleAllAges');
  const none=$('#visibleNoAges');
  if(all && !all.dataset.bound){
    all.dataset.bound='true';
    all.addEventListener('click',()=>{
      $$('#ageChecks input').forEach(input=>{ input.checked=true; });
      $$('#ageDetailChecks input').forEach(input=>{ input.checked=false; });
      queueFilterRefresh($('#ageChecks'),0);
      renderVisibleAgeGroups();
    });
  }
  if(none && !none.dataset.bound){
    none.dataset.bound='true';
    none.addEventListener('click',()=>{
      $$('#ageChecks input').forEach(input=>{ input.checked=false; });
      queueFilterRefresh($('#ageChecks'),0);
      renderVisibleAgeGroups();
    });
  }
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
  return Boolean(S.theme && S.indicator && S.filters && S.chart);
}

/**
 * Exibe uma ilustração no lugar do gráfico enquanto faltam escolhas. Além de
 * orientar a montagem, toda a área continua sendo um destino de arraste.
 */
function renderAnalysisDropPlaceholder(){
  const chart = $('#chart');
  if(!chart || hasRequiredBlocks()) return;
  const missing = [
    ['theme','Tema',Boolean(S.theme)],
    ['indicator','Indicador',Boolean(S.indicator)],
    ['filters','Filtros',Boolean(S.filters)],
    ['chart','Gráfico',Boolean(S.chart)]
  ];
  const next = missing.find(item=>!item[2]);
  const completed = missing.filter(item=>item[2]).length;
  chart.removeAttribute('data-rendered-chart');
  chart.removeAttribute('data-chart-type');
  chart.classList.remove('chart-border-hidden');
  chart.style.removeProperty('--rendered-chart-ratio');
  chart.innerHTML = `
    <div class="analysis-drop-placeholder" data-analysis-drop-placeholder>
      <div class="analysis-drop-art" aria-hidden="true">
        <svg viewBox="0 0 520 270" role="presentation">
          <defs>
            <linearGradient id="emptyChartFill" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stop-color="#DFF8F5"/>
              <stop offset="1" stop-color="#EAF2FF"/>
            </linearGradient>
          </defs>
          <rect x="20" y="18" width="480" height="232" rx="24" fill="url(#emptyChartFill)"/>
          <path d="M82 205V70M82 205H449" fill="none" stroke="#9DB8D0" stroke-width="3" stroke-linecap="round"/>
          <path d="M83 169H449M83 132H449M83 95H449" fill="none" stroke="#C8DAE8" stroke-width="2" stroke-dasharray="6 8"/>
          <rect x="121" y="155" width="42" height="50" rx="8" fill="#73CFC8" opacity=".88"/>
          <rect x="196" y="121" width="42" height="84" rx="8" fill="#36B8B0" opacity=".9"/>
          <rect x="271" y="139" width="42" height="66" rx="8" fill="#3795D6" opacity=".84"/>
          <rect x="346" y="88" width="42" height="117" rx="8" fill="#226CB5" opacity=".9"/>
          <path d="m126 139 91-43 75 20 76-61" fill="none" stroke="#073B70" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
          <circle cx="126" cy="139" r="9" fill="#FFF" stroke="#073B70" stroke-width="5"/>
          <circle cx="217" cy="96" r="9" fill="#FFF" stroke="#073B70" stroke-width="5"/>
          <circle cx="292" cy="116" r="9" fill="#FFF" stroke="#073B70" stroke-width="5"/>
          <circle cx="368" cy="55" r="9" fill="#FFF" stroke="#073B70" stroke-width="5"/>
        </svg>
        <span class="analysis-drop-arrow">↓</span>
      </div>
      <div class="analysis-drop-copy">
        <strong>Arraste os blocos para montar o gráfico</strong>
        <span>Solte Tema, Indicador, Filtros ou Tipo de gráfico nesta área.</span>
      </div>
      <div class="analysis-drop-progress" aria-label="${completed} de 4 escolhas concluídas">
        ${missing.map(([,label,done],index)=>`<span class="${done?'done':''}"><b>${done?'✓':index+1}</b>${label}</span>`).join('')}
      </div>
      ${next ? `<button class="analysis-drop-next" data-analysis-drop-next="${next[0]}" type="button">Escolher ${next[1].toLowerCase()}</button>` : ''}
    </div>`;
  chart.querySelector('[data-analysis-drop-next]')?.addEventListener('click',event=>{
    const key = event.currentTarget.dataset.analysisDropNext;
    const toolbarKey = key === 'filters' ? 'period' : key;
    document.querySelector(`[data-toolbar-block="${toolbarKey}"]`)?.click();
  });
  if($('#chartCompare')) $('#chartCompare').innerHTML = '';
}

/**
 * Alterna a prévia e os resultados e mantém a ação principal ligada à etapa que ainda falta.
 */
function updateAnalysisStageVisibility(){
  const steps = [
    {id:'theme', complete:Boolean(S.theme), button:'Escolher tema'},
    {id:'indicator', complete:Boolean(S.indicator), button:'Escolher indicador'},
    {id:'filters', complete:Boolean(S.filters), button:'Adicionar filtros'},
    {id:'chart', complete:Boolean(S.chart), button:'Escolher gráfico'}
  ];
  const ready = steps.every(step=>step.complete);
  const nextIndex = steps.findIndex(step=>!step.complete);
  const results = document.querySelector('.results');
  const workspace = $('#painel');
  const resultToolbar = $('#resultToolbar');
  const resultSummary = $('#resultAnalysisSummary');
  const clearAnalysisButton = $('#resultClearAnalysis');
  const primaryButton = $('#generate');
  const keepResultLayout = Boolean(workspace?.classList.contains('keep-result-layout'));
  const showResultLayout = ready || keepResultLayout;
  if(results) results.hidden = !showResultLayout;
  if(resultToolbar) resultToolbar.hidden = !showResultLayout;
  if(resultSummary) resultSummary.hidden = !showResultLayout;
  // O botão de limpeza pertence à linha de visualizações e não deve sumir
  // quando a análise ainda está vazia ou incompleta.
  if(clearAnalysisButton) clearAnalysisButton.hidden = false;
  workspace?.classList.toggle('analysis-ready',showResultLayout);
  if(!showResultLayout) workspace?.classList.remove('result-editing');
  if(showResultLayout && !ready) renderAnalysisDropPlaceholder();
  if(primaryButton){
    primaryButton.textContent = ready ? 'Ver resultado' : (steps[nextIndex]?.button || 'Continuar');
    primaryButton.dataset.nextStep = ready ? 'result' : (steps[nextIndex]?.id || '');
  }
  updateResultLayout();
}

/**
 * Resume os anos escolhidos em um texto curto para a barra e para a lateral.
 */
function resultPeriodLabel(filters){
  if(filters?.noYears) return '0 anos';
  const allYears = (DATA.dims.years || []).map(String).sort((a,b)=>Number(a)-Number(b));
  const selected = (filters?.years || []).map(String).sort((a,b)=>Number(a)-Number(b));
  const years = !selected.length || selected.length === allYears.length ? allYears : selected;
  if(!years.length) return 'Período completo';
  if(years.length === 1) return years[0];
  const first = years[0];
  const last = years.at(-1);
  const contiguous = years.every((year,index)=>index === 0 || Number(year) === Number(years[index-1]) + 1);
  return contiguous ? `${first}–${last}` : `${years.length} anos`;
}

/**
 * Retorna o recorte geográfico mais específico sem repetir seleções neutras.
 */
function resultLocationLabel(filters){
  const selected = selectedGeographyEntries(filters);
  if(selected.length > 1) return `${selected.length} locais selecionados`;
  if(selected.length === 1) return selected[0].label;
  if(filters?.uf && !['Brasil','Nenhum'].includes(filters.uf)) return UF_NAMES[filters.uf] || filters.uf;
  if(filters?.region && !['Brasil','Nenhum'].includes(filters.region)) return filters.region;
  return 'Brasil';
}

/**
 * Resume sexo, idades e população no chip demográfico sem esconder os
 * recortes que realmente estão ativos.
 */
function resultDemographicLabel(filters){
  const parts = [];
  const selectedSexes=normalizeSexSelections(filters?.sexes || [filters?.sex]);
  const populationEntries=selectedPopulationEntries(filters);
  if(!(selectedSexes.length===1 && selectedSexes[0]==='Todos')) parts.push(selectedSexes.join(' + '));
  if(filters?.ageDetails?.length) parts.push(`${filters.ageDetails.length} ${filters.ageDetails.length === 1 ? 'idade' : 'idades'}`);
  if(filters?.ages?.length) parts.push(`${filters.ages.length} ${filters.ages.length === 1 ? 'faixa' : 'faixas'}`);
  if(populationEntries.length === 1 && populationEntries[0].label !== 'População Geral') parts.push(populationEntries[0].label);
  else if(populationEntries.length > 1) parts.push(`${populationEntries.length} tipos de população`);
  if(parts.length) return parts.join(' · ');
  return `Todos · ${populationEntries.length > 1 ? 'Múltiplas populações' : (populationEntries[0]?.label || 'População Geral')}`;
}

/**
 * Retorna somente os seis blocos reorganizáveis da barra de resultados.
 */
function resultToolbarBlocks(toolbar){
  if(!toolbar) return [];
  return Array.from(toolbar.querySelectorAll('.result-filter-chip[data-toolbar-block]'));
}

/**
 * Guarda a ordem escolhida sem misturá-la ao estado dos filtros ou do gráfico.
 */
function saveResultToolbarOrder(toolbar){
  const order = resultToolbarBlocks(toolbar).map(block=>block.dataset.toolbarBlock);
  toolbar.dataset.blockOrder = order.join(',');
  try{
    localStorage.setItem(RESULT_TOOLBAR_ORDER_STORAGE_KEY,JSON.stringify(order));
  }catch(error){}
  return order;
}

/**
 * Reaplica a disposição salva. Blocos adicionados em versões futuras entram
 * depois dos já conhecidos e antes do botão Editar filtros.
 */
function restoreResultToolbarOrder(toolbar){
  if(!toolbar || toolbar.classList.contains('is-reordering')) return;
  const blocks = resultToolbarBlocks(toolbar);
  const blockMap = new Map(blocks.map(block=>[block.dataset.toolbarBlock,block]));
  let savedOrder = [];
  try{
    const parsed = JSON.parse(localStorage.getItem(RESULT_TOOLBAR_ORDER_STORAGE_KEY) || '[]');
    if(Array.isArray(parsed)) savedOrder = parsed.filter(key=>blockMap.has(key));
  }catch(error){}

  const used = new Set(savedOrder);
  const completeOrder = savedOrder.concat(blocks
    .map(block=>block.dataset.toolbarBlock)
    .filter(key=>!used.has(key)));
  const boundary = toolbar.querySelector('.result-edit-filters');
  completeOrder.forEach(key=>{
    const block = blockMap.get(key);
    if(block) toolbar.insertBefore(block,boundary || null);
  });
  toolbar.dataset.blockOrder = completeOrder.join(',');
}

/** Recoloca os blocos na ordem original quando toda a análise é apagada. */
function restoreDefaultResultToolbarOrder(){
  const toolbar = $('#resultToolbar');
  if(!toolbar) return;
  const boundary = toolbar.querySelector('.result-edit-filters');
  ['theme','indicator','chart','period','demographic','geographic'].forEach(key=>{
    const block = toolbar.querySelector(`[data-toolbar-block="${key}"]`);
    if(block) toolbar.insertBefore(block,boundary || null);
  });
  toolbar.dataset.blockOrder = 'theme,indicator,chart,period,demographic,geographic';
  try{localStorage.removeItem(RESULT_TOOLBAR_ORDER_STORAGE_KEY);}catch(error){}
}

/**
 * Move um bloco antes ou depois de outro e informa se a ordem realmente mudou.
 */
function moveResultToolbarBlock(toolbar,source,target,after=false){
  if(!toolbar || !source || !target || source === target) return false;
  const before = resultToolbarBlocks(toolbar).map(block=>block.dataset.toolbarBlock).join(',');
  const reference = after ? target.nextElementSibling : target;
  toolbar.insertBefore(source,reference || toolbar.querySelector('.result-edit-filters') || null);
  const afterOrder = saveResultToolbarOrder(toolbar).join(',');
  return before !== afterOrder;
}

/**
 * Limpa os realces temporários usados durante o arraste.
 */
function clearResultToolbarDragState(toolbar){
  if(!toolbar) return;
  toolbar.classList.remove('is-reordering');
  resultToolbarBlocks(toolbar).forEach(block=>{
    block.classList.remove('is-toolbar-dragging','is-toolbar-drop-before','is-toolbar-drop-after');
    delete block.dataset.toolbarDropPosition;
  });
}

/**
 * Atualiza os textos da nova composição a partir do mesmo estado usado pelos
 * gráficos. Assim, nenhum resumo pode ficar diferente da consulta executada.
 */
function updateResultLayout(){
  if(!$('#resultToolbar') || !$('#popFilter')) return;
  const filters = getFilters();
  const values = {
    theme:S.theme?.label || 'Não selecionado',
    indicator:S.indicator?.label || 'Não selecionado',
    chart:chartTypes.find(item=>item[0] === S.chart)?.[1] || 'Não selecionado',
    period:S.filters ? resultPeriodLabel(filters) : 'Não selecionado',
    sex:S.filters ? sexSelectionLabel(filters) : 'Não selecionado',
    demographic:S.filters ? resultDemographicLabel(filters) : 'Não selecionado',
    location:S.filters ? resultLocationLabel(filters) : 'Não selecionado'
  };
  const targets = {
    resultToolbarTheme:values.theme,
    resultToolbarIndicator:values.indicator,
    resultToolbarChart:values.chart,
    resultToolbarPeriod:values.period,
    resultToolbarDemographic:values.demographic,
    resultToolbarLocal:values.location,
    resultSummaryTheme:values.theme,
    resultSummaryIndicator:values.indicator,
    resultSummaryPeriod:values.period,
    resultSummarySex:values.sex,
    resultSummaryLocal:values.location
  };
  Object.entries(targets).forEach(([id,value])=>{
    const element=$('#'+id);
    if(!element) return;
    element.textContent=value;
    if(id.startsWith('resultToolbar')) element.title=value;
  });

  if(resultView !== 'table') resultView = S.chart === 'map' ? 'map' : 'chart';
  const results = document.querySelector('.results');
  if(results) results.dataset.resultView = resultView;
  $$('[data-result-view]').forEach(button=>{
    const active = button.dataset.resultView === resultView;
    button.classList.toggle('active',active);
    button.setAttribute('aria-selected',String(active));
  });
  restoreResultToolbarOrder($('#resultToolbar'));
}

/**
 * Alterna entre gráfico, tabela e mapa preservando a análise atual.
 */
function setResultView(view){
  closeResultChoice(false);
  if(view === 'table'){
    resultView = 'table';
    updateResultLayout();
    return;
  }
  if(view === 'map'){
    if(S.chart !== 'map') lastNonMapChart = S.chart || lastNonMapChart;
    resultView = 'map';
    if(S.chart !== 'map') selectBlock('chart','map');
    else updateResultLayout();
    return;
  }
  resultView = 'chart';
  if(S.chart === 'map') selectBlock('chart',lastNonMapChart || 'line');
  else updateResultLayout();
}

/**
 * Abre a gaveta completa somente quando a pessoa pede para editar todos os filtros.
 */
function openResultFilterPanel(){
  closeResultChoice(false);
  if(!S.filters){
    S.filters = true;
    renderFilterBlock();
    renderSlots();
    saveAnalysisState({recordVersion:false});
  }
  window.VigitelMobile?.openFilters?.();
  window.setTimeout(()=>{
    const target = document.querySelector('#mobileFilterDrawer > .filter-cluster[data-filter-section="other"]');
    if(target){
      target.open = true;
      const panel = document.querySelector('#mobileFilterDrawer');
      panel?.scrollTo?.({top:0,behavior:'auto'});
      target.querySelector('summary')?.focus({preventScroll:true});
    }
  },60);
}

/**
 * Fecha qualquer lista compacta da barra sem alterar a análise.
 */
function closeResultChoice(restoreFocus=true){
  clearResultChoiceDragState();
  const popover = $('#resultChoicePopover');
  const toolbar = $('#resultToolbar');
  toolbar?.classList.remove('popover-open');
  document.body.classList.remove('result-choice-open');
  if(!popover || popover.hidden) return;
  const mode = popover.dataset.mode || '';
  const filterMode = mode.startsWith('filter-');
  const trigger = filterMode
    ? document.querySelector(`[data-result-filter="${mode.replace('filter-','')}"]`)
    : document.querySelector(`[data-result-editor="${mode}"]`);
  popover.hidden = true;
  popover.dataset.mode = '';
  popover.style.left = '';
  popover.style.top = '';
  popover.style.transform = '';
  popover.style.width = '';
  $$('[data-result-editor], [data-result-filter]').forEach(button=>button.setAttribute('aria-expanded','false'));
  if(restoreFocus) trigger?.focus({preventScroll:true});
}

/**
 * Relaciona cada tipo de opção ao bloco que pode recebê-la.
 */
function resultChoiceTargetKey(mode){
  return {theme:'theme',indicator:'indicator',chart:'chart'}[mode] || '';
}

/**
 * Remove os realces usados ao arrastar uma opção de dentro da lista.
 */
function clearResultChoiceDragState(){
  activeResultChoiceDrag = null;
  document.body.classList.remove('result-choice-dragging');
  $('#chartWrapper')?.classList.remove('is-block-drop-target');
  $$('.result-choice-option.is-choice-dragging').forEach(option=>option.classList.remove('is-choice-dragging'));
  $$('.result-filter-chip.is-choice-drop-target, .result-filter-chip.is-choice-drop-hover').forEach(block=>{
    block.classList.remove('is-choice-drop-target','is-choice-drop-hover');
  });
}

/**
 * Abre a edição do bloco arrastado para o gráfico ou aplica diretamente uma
 * opção retirada das listas e dos catálogos.
 */
function applyDropToChart(payload){
  if(!payload) return false;
  if(payload.mode && payload.id){
    applyResultChoiceSelection(payload.mode,payload.id);
    announceSave(`${payload.label || 'Opção'} aplicada ao gráfico.`);
    return true;
  }
  if(payload.type && payload.id){
    if(payload.type === 'theme') applyResultChoiceSelection('theme',payload.id);
    if(payload.type === 'indicator') selectBlock('indicator',payload.id);
    if(payload.type === 'filters') selectBlock('filters',payload.id);
    if(payload.type === 'chart'){
      resultView = payload.id === 'map' ? 'map' : 'chart';
      if(payload.id !== 'map') lastNonMapChart = payload.id;
      selectBlock('chart',payload.id);
    }
    announceSave('Bloco aplicado e gráfico atualizado.');
    return true;
  }
  const key = typeof payload === 'string' ? payload : payload.toolbarBlock;
  const trigger = key ? document.querySelector(`[data-toolbar-block="${key}"]`) : null;
  if(!trigger) return false;
  const selected = {
    theme:Boolean(S.theme),
    indicator:Boolean(S.indicator),
    chart:Boolean(S.chart),
    period:Boolean(S.filters),
    demographic:Boolean(S.filters),
    geographic:Boolean(S.filters)
  }[key];
  if(selected){
    renderSlots();
    if(hasRequiredBlocks()) scheduleGenerate(0);
    else renderAnalysisDropPlaceholder();
    announceSave('Bloco aplicado à montagem do gráfico.');
    return true;
  }
  if(['theme','indicator','chart'].includes(key)) openResultChoice(key,trigger);
  else trigger.click();
  announceSave('Escolha uma opção; depois ela será aplicada ao gráfico.');
  return true;
}

/** Torna a própria área do gráfico um destino para os blocos da análise. */
function bindChartBlockDropZone(){
  const zone=$('#chartWrapper');
  if(!zone || zone.dataset.blockDropBound === 'true') return;
  zone.dataset.blockDropBound='true';
  let dragDepth=0;
  /**
   * Retira o destaque da área do gráfico e reinicia a contagem usada durante
   * a passagem de elementos filhos. Esse cuidado evita que a indicação de
   * destino permaneça visível depois que o bloco é solto ou sai da área.
   */
  const clear=()=>{
    dragDepth=0;
    zone.classList.remove('is-block-drop-target');
  };
  zone.addEventListener('dragenter',event=>{
    event.preventDefault();
    dragDepth+=1;
    zone.classList.add('is-block-drop-target');
  });
  zone.addEventListener('dragover',event=>{
    event.preventDefault();
    event.dataTransfer.dropEffect=activeResultChoiceDrag ? 'copy' : 'move';
    zone.classList.add('is-block-drop-target');
  });
  zone.addEventListener('dragleave',()=>{
    dragDepth=Math.max(0,dragDepth-1);
    if(!dragDepth) zone.classList.remove('is-block-drop-target');
  });
  zone.addEventListener('drop',event=>{
    event.preventDefault();
    let payload=activeResultChoiceDrag ? {...activeResultChoiceDrag} : null;
    if(!payload){
      const raw=event.dataTransfer.getData('text/plain') || '';
      try{ payload=JSON.parse(raw); }
      catch(error){ payload=raw; }
    }
    clear();
    applyDropToChart(payload);
    clearResultChoiceDragState();
  });
  zone.addEventListener('dragend',clear);
}

/**
 * Aplica uma opção clicada ou solta sobre o bloco correspondente.
 */
function applyResultChoiceSelection(mode,id){
  if(mode === 'theme'){
    const firstIndicator = S.indicator?.themeId === id
      ? S.indicator
      : DATA.indicators.find(item=>item.themeId === id);
    if(firstIndicator) selectBlock('indicator',firstIndicator.id);
  }else if(mode === 'chart'){
    resultView = id === 'map' ? 'map' : 'chart';
    if(id !== 'map') lastNonMapChart = id;
    selectBlock('chart',id);
  }else if(mode === 'indicator'){
    selectBlock('indicator',id);
  }
  closeResultChoice();
}

/**
 * Posiciona a caixa acima de todas as áreas do resultado e a mantém ligada
 * visualmente ao botão acionado.
 */
function positionResultPopover(popover,toolbar,trigger,maximumWidth=430){
  const viewportWidth = document.documentElement.clientWidth;
  const viewportHeight = document.documentElement.clientHeight;
  const triggerRect = trigger.getBoundingClientRect();
  const isMobileViewport = viewportWidth <= 760;
  const isDemographic = popover.dataset.mode === 'filter-demographic';
  const isGeographic = popover.dataset.mode === 'filter-geographic';

  // Os filtros mais largos devem ficar centralizados na viewport.
  // Isso evita desalinhamento quando o botão acionador está próximo da borda.
  if(isDemographic || isGeographic){
    const popoverWidth = isDemographic
      ? Math.min(520,Math.max(300,viewportWidth - 24))
      : Math.min(520,Math.max(300,viewportWidth - 24));
    popover.style.width = `${popoverWidth}px`;
    popover.style.left = '50%';
    popover.style.top = `${Math.max(8,Math.min(14,viewportHeight * 0.02))}px`;
    popover.style.transform = 'translateX(-50%)';
    return;
  }

  if(isMobileViewport){
    const mobileWidth = Math.min(Math.max(280,viewportWidth - 28),640);
    popover.style.width = `${mobileWidth}px`;
    popover.style.left = '50%';
    popover.style.top = '50%';
    popover.style.transform = 'translate(-50%,-50%)';
    return;
  }

  popover.style.transform = '';
  const availableWidth = Math.max(240,Math.min(toolbar.clientWidth - 24,viewportWidth - 24));
  const popoverWidth = Math.min(maximumWidth,availableWidth);
  popover.style.width = `${popoverWidth}px`;
  const maximumLeft = Math.max(12,viewportWidth - popoverWidth - 12);
  const left = Math.max(12,Math.min(triggerRect.left,maximumLeft));
  popover.style.left = `${left}px`;
  const measuredHeight = Math.min(popover.scrollHeight,viewportHeight - 24);
  const below = triggerRect.bottom + 10;
  const above = triggerRect.top - measuredHeight - 10;
  const top = below + measuredHeight <= viewportHeight - 12
    ? below
    : Math.max(12,above);
  popover.style.top = `${top}px`;
}

/**
 * Monta as opções de um campo de seleção rápida preservando os nomes oficiais.
 */
function quickFilterSelectOptions(values,current,formatter=(value)=>value){
  return values.map(value=>`<option value="${esc(value)}" ${value === current ? 'selected' : ''}>${esc(formatter(value))}</option>`).join('');
}


/** Monta um campo de seleção múltipla com visual semelhante ao seletor já usado no painel. */
function quickFilterMultiChecklist({filterId,label,values,selectedValues,formatter=(value)=>value}){
  const summary = formatMultiFilterSummary(filterId, selectedValues);
  const selectedCount = normalizeMultiFilterValues(filterId, selectedValues).filter(value=>value !== 'Nenhum').length;
  const checklistId = `quick-multi-list-${filterId}`;
  return `<section class="quick-multi-field" data-quick-multi-field="${esc(filterId)}" data-open="false">
    <div class="quick-multi-label-row"><span>${esc(label)}</span><b ${selectedCount>1 ? '' : 'hidden'}>${selectedCount} selecionadas</b></div>
    <button class="quick-multi-trigger" type="button" aria-expanded="false" aria-controls="${esc(checklistId)}">
      <strong>${esc(summary)}</strong>
      <span class="quick-multi-chevron" aria-hidden="true">⌄</span>
    </button>
    <div class="quick-multi-list" id="${esc(checklistId)}" role="group" aria-label="${esc(label)}" hidden>
      ${values.map(value=>{
        const checked = normalizeMultiFilterValues(filterId, selectedValues).includes(value);
        return `<label class="quick-multi-option ${checked?'checked':''}">
          <input type="checkbox" data-quick-multi-filter="${esc(filterId)}" value="${esc(value)}" ${checked?'checked':''}/>
          <span class="quick-multi-box" aria-hidden="true"></span>
          <span class="quick-multi-text">${esc(formatter(value))}</span>
        </label>`;
      }).join('')}
    </div>
  </section>`;
}

/** Controla a abertura do seletor múltiplo, mantendo-o fechado ao iniciar. */
function bindQuickMultiChecklist(container,filterId,section){
  const source = $('#'+filterId);
  const field = container?.querySelector?.(`[data-quick-multi-field="${filterId}"]`);
  if(!container || !source || !field) return;
  const trigger = field.querySelector('.quick-multi-trigger');
  const summaryLabel = trigger?.querySelector('strong');
  const counter = field.querySelector('.quick-multi-label-row b');
  const list = field.querySelector('.quick-multi-list');
  const defaultValues = filterId === 'popFilter' ? ['População Geral'] : ['Brasil'];

  const setOpen = open=>{
    field.dataset.open = open ? 'true' : 'false';
    trigger?.setAttribute('aria-expanded', String(open));
    if(list) list.hidden = !open;
  };

  const syncChecklistUi = selectedValues=>{
    const normalized = normalizeMultiFilterValues(filterId, selectedValues);
    const selectedCount = normalized.filter(value=>value !== 'Nenhum').length;
    if(summaryLabel) summaryLabel.textContent = formatMultiFilterSummary(filterId, normalized);
    if(counter){
      counter.textContent = `${selectedCount} selecionadas`;
      counter.hidden = selectedCount <= 1;
    }
    field.querySelectorAll(`[data-quick-multi-filter="${filterId}"]`).forEach(input=>{
      const checked = normalized.includes(input.value);
      input.checked = checked;
      input.closest('.quick-multi-option')?.classList.toggle('checked', checked);
    });
  };

  setOpen(false);
  syncChecklistUi(readMultiFilterValues(source, source.value || defaultValues[0]));

  trigger?.addEventListener('click',()=>{
    const willOpen = field.dataset.open !== 'true';
    container.querySelectorAll('.quick-multi-field').forEach(other=>{
      other.dataset.open = 'false';
      other.querySelector('.quick-multi-trigger')?.setAttribute('aria-expanded','false');
      const otherList = other.querySelector('.quick-multi-list');
      if(otherList) otherList.hidden = true;
    });
    setOpen(willOpen);
  });

  field.querySelectorAll(`[data-quick-multi-filter="${filterId}"]`).forEach(input=>input.addEventListener('change',()=>{
    const currentInputs = Array.from(field.querySelectorAll(`[data-quick-multi-filter="${filterId}"]`));
    let values = currentInputs.filter(item=>item.checked).map(item=>item.value);
    if(values.includes('Nenhum') && values.length > 1){
      values = values.filter(value=>value !== 'Nenhum');
      currentInputs.forEach(other=>{ if(other.value === 'Nenhum') other.checked = false; });
    }
    if(!values.length){
      values = [...defaultValues];
      currentInputs.forEach(other=>{ other.checked = values.includes(other.value); });
    }
    const normalized = applyMultiFilterValues(source, values);
    syncChecklistUi(normalized);
    queueMultiFilterRefresh(source);
    setOpen(true);
  }));
}

/**
 * Mostra somente o filtro relacionado ao chip acionado. Os filtros mais
 * detalhados continuam disponíveis no botão Editar filtros.
 */
function renderResultQuickFilter(section){
  const target = $('#resultChoiceOptions');
  if(!target) return;
  target.classList.add('quick-filter');
  target.setAttribute('role','group');

  if(section === 'period'){
    const periodFilters = getFilters();
    const originalInputs = $$('#yearChecks input');
    const enabledInputs = originalInputs.filter(input=>!input.disabled);
    const enabledYears = enabledInputs.map(input=>Number(input.value)).filter(Number.isFinite).sort((a,b)=>a-b);
    const selectedYears = enabledInputs.filter(input=>input.checked).map(input=>Number(input.value)).filter(Number.isFinite).sort((a,b)=>a-b);
    const firstAvailable = enabledYears[0] ?? Number(DATA.dims.years?.[0] || new Date().getFullYear());
    const lastAvailable = enabledYears.at(-1) ?? firstAvailable;
    const noYears = Boolean(periodFilters.noYears);
    const effectiveSelected = selectedYears.length ? selectedYears : (noYears ? [] : enabledYears);
    const rangeMin = effectiveSelected[0] ?? firstAvailable;
    const rangeMax = effectiveSelected.at(-1) ?? lastAvailable;
    const span = Math.max(1,lastAvailable-firstAvailable);
    const minPct = ((rangeMin-firstAvailable)/span)*100;
    const maxPct = ((rangeMax-firstAvailable)/span)*100;
    const expression = selectedYears.length
      ? compressNumberRanges(selectedYears)
      : '';
    const periodHelp = `Digite anos ou faixas separados por vírgula. Ex.: ${firstAvailable}-${Math.min(firstAvailable+4,lastAvailable)}, ${Math.max(firstAvailable,lastAvailable-2)}-${lastAvailable}.`;
    const summary = noYears ? 'Nenhum ano' : (selectedYears.length ? resultPeriodLabel(periodFilters) : 'Sem recorte');

    target.innerHTML = `
      <div class="period16-summary"><span>Período atual</span><strong>${esc(summary)}</strong></div>
      <section class="period16-card" data-period-range-ui>
        <div class="period16-head"><h3>Ano</h3><b>${esc(noYears ? '0 anos' : (effectiveSelected.length === enabledYears.length ? `${firstAvailable} a ${lastAvailable}` : `${rangeMin} a ${rangeMax}`))}</b></div>
        <div class="period16-scale"><span>${esc(firstAvailable)}</span><div class="age-dual-range" data-period-dual-range style="--age-min-pct:${minPct}%;--age-max-pct:${maxPct}%"><div class="age-dual-range-track"></div><div class="age-dual-range-fill"></div><input aria-label="Ano inicial" data-period-min-range min="${firstAvailable}" max="${lastAvailable}" step="1" type="range" value="${rangeMin}"/><input aria-label="Ano final" data-period-max-range min="${firstAvailable}" max="${lastAvailable}" step="1" type="range" value="${rangeMax}"/></div><span>${esc(lastAvailable)}</span></div>
        <div class="period16-fields">
          <label><span>Começar em</span><input data-period-min-number min="${firstAvailable}" max="${lastAvailable}" inputmode="numeric" type="number" value="${rangeMin}"/></label>
          <label><span>Finalizar em</span><input data-period-max-number min="${firstAvailable}" max="${lastAvailable}" inputmode="numeric" type="number" value="${rangeMax}"/></label>
          <div class="period16-interval"><div class="period16-label">Intervalos específicos <button class="period16-help" type="button" aria-label="Ajuda sobre intervalos de anos" title="${esc(periodHelp)}">?</button></div><div class="period16-interval-control"><input data-period-interval placeholder="Ex.: 2006-2010, 2018" type="text" value="${esc(expression)}"/><button data-period-apply type="button">Aplicar</button></div></div>
        </div>
        <div class="period16-actions"><button data-period-action="all" type="button">Usar todos os anos</button><button data-period-action="clear" type="button">Limpar período</button><button data-period-action="latest" type="button">Mais recente</button></div>
      </section>`;

    /** Aplica ao estado do painel a lista de anos selecionada no filtro rápido. */
    const applyYears=(values,{emptyMeansClear=false}={})=>{
      const wanted=new Set((values || []).map(Number).filter(Number.isFinite).map(String));
      originalInputs.forEach(input=>{ input.checked=!input.disabled && wanted.has(String(input.value)); });
      explicitNoYears = emptyMeansClear && ($('#popFilter')?.value !== 'População Negra');
      queueFilterRefresh($('#yearChecks'),0);
      window.setTimeout(()=>renderResultQuickFilter('period'),0);
    };
    /** Retorna os anos disponíveis compreendidos entre os dois limites informados. */
    const rangeValues=(minValue,maxValue)=>{
      let min=Math.max(firstAvailable,Math.min(lastAvailable,Math.round(Number(minValue)||firstAvailable)));
      let max=Math.max(firstAvailable,Math.min(lastAvailable,Math.round(Number(maxValue)||lastAvailable)));
      if(min>max) [min,max]=[max,min];
      return enabledYears.filter(year=>year>=min && year<=max);
    };
    /** Interpreta anos e intervalos digitados manualmente pelo usuário. */
    const parseYearExpression=value=>{
      const allowed=new Set(enabledYears);
      const values=[];
      for(const raw of String(value || '').split(/[,;]+/)){
        const part=raw.trim();
        if(!part) continue;
        const range=part.match(/^(\d{4})\s*(?:-|–|—|a|até)\s*(\d{4})$/i);
        if(range){
          let a=Number(range[1]),b=Number(range[2]);
          if(a>b) [a,b]=[b,a];
          enabledYears.forEach(year=>{ if(year>=a && year<=b) values.push(year); });
          continue;
        }
        const single=Number(part);
        if(Number.isFinite(single) && allowed.has(single)) values.push(single);
      }
      return [...new Set(values)].sort((a,b)=>a-b);
    };

    const minRange=target.querySelector('[data-period-min-range]');
    const maxRange=target.querySelector('[data-period-max-range]');
    const minNumber=target.querySelector('[data-period-min-number]');
    const maxNumber=target.querySelector('[data-period-max-number]');
    const interval=target.querySelector('[data-period-interval]');
    /** Converte os limites do controle em anos e aplica o período resultante. */
    const applyRange=source=>{
      const values=rangeValues(source==='range'?minRange?.value:minNumber?.value,source==='range'?maxRange?.value:maxNumber?.value);
      applyYears(values);
    };
    minRange?.addEventListener('change',()=>applyRange('range'));
    maxRange?.addEventListener('change',()=>applyRange('range'));
    minNumber?.addEventListener('change',()=>applyRange('number'));
    maxNumber?.addEventListener('change',()=>applyRange('number'));
    target.querySelector('[data-period-apply]')?.addEventListener('click',()=>{
      const values=parseYearExpression(interval?.value);
      if(!values.length && String(interval?.value || '').trim()){
        announceSave(`Digite anos disponíveis entre ${firstAvailable} e ${lastAvailable}, por exemplo: ${firstAvailable}-${Math.min(firstAvailable+4,lastAvailable)}, ${lastAvailable}.`);
        return;
      }
      applyYears(values,{emptyMeansClear:!values.length});
    });
    interval?.addEventListener('keydown',event=>{ if(event.key==='Enter'){ event.preventDefault(); target.querySelector('[data-period-apply]')?.click(); } });
    target.querySelectorAll('[data-period-action]').forEach(button=>button.addEventListener('click',()=>{
      const action=button.dataset.periodAction;
      if(action==='all') applyYears(enabledYears);
      else if(action==='latest') applyYears(lastAvailable ? [lastAvailable] : []);
      else applyYears([],{emptyMeansClear:true});
    }));
    return;
  }

  if(section === 'demographic'){
    const selectedSexes = new Set(selectedSexesFromUi());
    const currentPopulation = readMultiFilterValues('popFilter','População Geral');
    const populationOptions = [...new Set(['Todas',...(DATA.dims.pops || [])])];
    const filters = getFilters();
    const ageSummary = filters.ageDetails?.length ? ageSelectionSummary() : '18 a 80+';
    const selectedAgeGroups = new Set(selectedChecks('#ageChecks'));
    const demographicSummary = [
      sexSelectionLabel(filters),
      currentPopulation === 'Todas' ? 'Todas as populações' : currentPopulation,
      filters.ageDetails?.length ? ageSummary : null,
      (!filters.ageDetails?.length && filters.ages?.length) ? `${filters.ages.length} ${filters.ages.length === 1 ? 'faixa' : 'faixas'}` : null
    ].filter(Boolean).join(' • ');
    const ageHelp='Use o marcador para selecionar uma faixa contínua. Em intervalos específicos, digite exemplos como 18-24, 30-35, 50.';

    target.innerHTML = `
      <div class="demo6-summary"><span>Recortes demográficos</span><strong>${esc(demographicSummary || 'Todos • População Geral')}</strong></div>

      <div class="demo6-top">
        <section class="demo6-sex">
          <h3>Sexo</h3>
          <div class="demo6-sex-grid" role="group" aria-label="Sexo">
            ${SEX_FILTER_VALUES.map(value=>`<label class="demo6-sex-choice ${selectedSexes.has(value)?'selected':''}">
              <input type="checkbox" data-quick-sex-value="${esc(value)}" value="${esc(value)}" ${selectedSexes.has(value)?'checked':''}/>
              <span class="demo6-check" aria-hidden="true"></span>
              <strong>${esc(value)}</strong>
            </label>`).join('')}
          </div>
        </section>

        <div class="demo6-population">
          ${quickFilterMultiChecklist({filterId:'popFilter',label:'Tipo de população',values:populationOptions,selectedValues:currentPopulation,formatter:value=>value === 'Todas' ? 'Todas as populações' : value})}
        </div>
      </div>

      <section class="demo6-age" data-age-range-ui data-quick-age-range>
        <div class="demo6-section-head">
          <div class="demo6-title-with-help"><h3>Idade</h3></div>
          <b data-age-range-summary>${esc(ageSummary)}</b>
        </div>

        <div class="demo6-age-scale"><span>18</span><div class="age-dual-range" data-age-dual-range><div class="age-dual-range-track"></div><div class="age-dual-range-fill"></div><input aria-label="Idade inicial" data-age-min-range max="80" min="18" step="1" type="range"/><input aria-label="Idade final" data-age-max-range max="80" min="18" step="1" type="range"/></div><span>80+</span></div>

        <div class="demo10-age-row">
          <label class="demo10-age-field">
            <span class="demo10-field-label">Começar em</span>
            <input data-age-min-number inputmode="numeric" max="80" min="18" type="number"/>
          </label>
          <label class="demo10-age-field">
            <span class="demo10-field-label">Finalizar em</span>
            <input data-age-max-number inputmode="numeric" max="80" min="18" type="number"/>
          </label>
          <div class="demo10-interval-field">
            <div class="demo10-field-label">Intervalos específicos <button class="demo6-help small" type="button" aria-label="Ajuda sobre intervalos" title="Digite faixas ou idades separadas por vírgula. Ex.: 18-24, 30-35, 50.">?</button></div>
            <div class="demo10-interval-controls"><input data-age-interval placeholder="Ex.: 18-24, 30-35, 50" type="text"/><button data-age-apply type="button">Aplicar</button></div>
          </div>
        </div>

        <button class="demo6-clear-age" data-age-clear type="button">Usar todas as idades</button>
      </section>

      <section class="demo6-quinquenal">
        <div class="demo6-quin-head">
          <div><h3>Faixa etária quinquenal</h3><small>Grupos de idade usados na comparação</small></div>
          <div class="demo6-quin-actions">
            <button data-quick-age-group-action="all" type="button">Selecionar todas</button>
            <button data-quick-age-group-action="clear" type="button">Sem recorte</button>
          </div>
        </div>
        <div class="demo6-age-groups" role="group" aria-label="Faixa etária quinquenal">
          ${(DATA.dims.ages || []).map(value=>`<button aria-pressed="${selectedAgeGroups.has(value)}" class="${selectedAgeGroups.has(value)?'selected':''}" data-quick-age-group="${esc(value)}" type="button">${esc(ageGroupShortLabel(value))}</button>`).join('')}
        </div>
      </section>

      <div class="demo6-footer"><span>As escolhas atualizam os gráficos automaticamente.</span><button data-quick-demographic-clear type="button">Limpar demográficos</button></div>`;

    target.querySelectorAll('[data-quick-sex-value]').forEach(input=>input.addEventListener('change',()=>{
      const source = $$('#sexChecks input[type="checkbox"]').find(item=>item.value===input.value);
      if(!source) return;
      source.checked=input.checked;
      if(!selectedSexesFromUi().length){ source.checked=true; input.checked=true; }
      queueFilterRefresh(source,0);
      window.setTimeout(()=>renderResultQuickFilter('demographic'),0);
    }));

    bindQuickMultiChecklist(target,'popFilter','demographic');

    bindAgeRangeUi(target.querySelector('[data-quick-age-range]'));
    syncAgeRangeControls();

    target.querySelectorAll('[data-quick-age-group]').forEach(button=>button.addEventListener('click',()=>{
      const source = $$('#ageChecks input').find(item=>item.value === button.dataset.quickAgeGroup);
      if(!source) return;
      source.checked = !source.checked;
      if(source.checked) $$('#ageDetailChecks input').forEach(input=>{ input.checked=false; });
      queueFilterRefresh(source,0);
      window.setTimeout(()=>renderResultQuickFilter('demographic'),0);
    }));

    target.querySelectorAll('[data-quick-age-group-action]').forEach(button=>button.addEventListener('click',()=>{
      const action=button.dataset.quickAgeGroupAction;
      const inputs=$$('#ageChecks input');
      if(action==='all'){
        inputs.forEach(input=>{ input.checked=true; });
        $$('#ageDetailChecks input').forEach(input=>{ input.checked=false; });
      }else{
        inputs.forEach(input=>{ input.checked=false; });
      }
      queueFilterRefresh($('#ageChecks'),0);
      window.setTimeout(()=>renderResultQuickFilter('demographic'),0);
    }));

    target.querySelector('[data-quick-demographic-clear]')?.addEventListener('click',()=>{
      clearDemographicFilters();
      queueFilterRefresh($('#popFilter'),0);
      window.setTimeout(()=>renderResultQuickFilter('demographic'),0);
    });
    return;
  }

  const currentRegion = readMultiFilterValues('regionFilter','Brasil');
  const currentUf = readMultiFilterValues('ufFilter','Brasil');
  const currentLocationLabel = resultLocationLabel(getFilters());
  target.innerHTML = `
    <div class="geoquick-summary"><span>Local selecionado</span><strong>${esc(currentLocationLabel || 'Brasil')}</strong></div>
    <div class="geoquick-fields geoquick-fields-checklist">
      ${quickFilterMultiChecklist({filterId:'regionFilter',label:'Região',values:['Brasil',...(DATA.dims.regions || [])],selectedValues:currentRegion})}
      ${quickFilterMultiChecklist({filterId:'ufFilter',label:'UF',values:['Brasil',...(DATA.dims.ufs || [])],selectedValues:currentUf,formatter:value=>value === 'Brasil' ? 'Todas as UF' : (UF_NAMES[value] || value)})}
    </div>
    <div class="geoquick-footer"><span>Marque uma ou mais opções para comparar no gráfico.</span><button data-quick-location-clear type="button">Limpar local</button></div>`;

  bindQuickMultiChecklist(target,'regionFilter','geographic');
  bindQuickMultiChecklist(target,'ufFilter','geographic');
  target.querySelector('[data-quick-location-clear]')?.addEventListener('click',()=>{
    clearGeographicFilters();
    queueMultiFilterRefresh($('#ufFilter'));
    window.setTimeout(()=>renderResultQuickFilter('geographic'),0);
  });
}

/**
 * Abre Período, Demográficos ou Local em uma caixa compacta sobre os resultados.
 */
function openResultQuickFilter(section,trigger){
  const popover = $('#resultChoicePopover');
  const toolbar = $('#resultToolbar');
  const search = $('#resultChoiceSearch');
  const target = $('#resultChoiceOptions');
  if(!popover || !toolbar || !trigger || !search || !target) return;
  if(!S.filters){
    S.filters = true;
    renderFilterBlock();
    renderSlots();
    saveAnalysisState({recordVersion:false});
  }
  const mode = `filter-${section}`;
  if(!popover.hidden && popover.dataset.mode === mode){
    closeResultChoice();
    return;
  }

  const copy = {
    period:{eyebrow:'Filtro rápido',title:'Escolha o período'},
    demographic:{eyebrow:'Filtros demográficos',title:'Sexo, idade e população'},
    geographic:{eyebrow:'Filtro rápido',title:'Escolha o local'}
  }[section] || {eyebrow:'Filtro rápido',title:'Ajuste o filtro'};
  popover.dataset.mode = mode;
  $('#resultChoiceEyebrow').textContent = copy.eyebrow;
  $('#resultChoiceTitle').textContent = copy.title;
  search.closest('.result-choice-search').hidden = true;
  popover.hidden = false;
  toolbar.classList.add('popover-open');
  document.body.classList.add('result-choice-open');
  $$('[data-result-editor], [data-result-filter]').forEach(button=>button.setAttribute('aria-expanded',String(button === trigger)));
  renderResultQuickFilter(section);
  positionResultPopover(popover,toolbar,trigger,section === 'demographic' ? 520 : 430);
  window.setTimeout(()=>{
    if(section === 'demographic' || section === 'geographic'){
      popover.querySelector('.result-choice-close')?.focus({preventScroll:true});
      return;
    }
    target.querySelector('button:not([disabled]), select')?.focus({preventScroll:true});
  },0);
}

/**
 * Desenha as opções correspondentes ao campo aberto e aplica a busca digitada.
 */
function renderResultChoiceOptions(){
  const popover = $('#resultChoicePopover');
  const target = $('#resultChoiceOptions');
  const search = $('#resultChoiceSearch');
  if(!popover || !target) return;
  target.classList.remove('quick-filter');
  target.setAttribute('role','listbox');
  const mode = popover.dataset.mode;
  const term = normalizeText(search?.value || '');
  const source = mode === 'theme'
    ? DATA.themes
    : mode === 'chart'
      ? chartTypes.map(([id,label])=>({id,label,description:chartChoiceDescriptions[id]}))
      : DATA.indicators.filter(item=>item.themeId === S.theme?.id);
  const options = source.filter(item=>{
    const content = `${item.label} ${item.raw || ''} ${item.description || ''}`;
    return !term || normalizeText(content).includes(term);
  });

  if(!options.length){
    target.innerHTML = '<p class="result-choice-empty">Nenhuma opção encontrada. Tente outra busca.</p>';
    return;
  }

  target.innerHTML = options.map(item=>{
    const selected = mode === 'theme'
      ? item.id === S.theme?.id
      : mode === 'chart'
        ? item.id === S.chart
        : item.id === S.indicator?.id;
    const detail = mode === 'theme'
      ? `${DATA.indicators.filter(indicator=>indicator.themeId === item.id).length} indicador(es)`
      : (item.description || 'Indicador do Vigitel');
    const icon = mode === 'theme'
      ? getThemeIcon(item.id)
      : mode === 'chart'
        ? getChartIcon(item.id)
        : getIndicatorIcon(item);
    return `<button aria-selected="${selected}" aria-roledescription="opção arrastável" class="result-choice-option ${selected?'selected':''}" data-result-choice-id="${esc(item.id)}" data-result-choice-mode="${esc(mode)}" draggable="true" role="option" title="Arraste até o bloco correspondente ou clique para selecionar" type="button"><span aria-hidden="true" class="result-choice-option-icon">${icon}</span><span class="result-choice-option-copy"><strong>${esc(item.label)}</strong><small>${esc(detail)}</small></span><span aria-hidden="true" class="result-choice-option-check">${selected?'✓':'›'}</span></button>`;
  }).join('');

  Array.from(target.querySelectorAll('[data-result-choice-id]')).forEach(button=>{
    button.addEventListener('click',()=>applyResultChoiceSelection(mode,button.dataset.resultChoiceId));
    button.addEventListener('dragstart',event=>{
      activeResultChoiceDrag = {
        mode,
        id:button.dataset.resultChoiceId,
        label:button.querySelector('strong')?.textContent || ''
      };
      const targetKey = resultChoiceTargetKey(mode);
      const targetBlock = document.querySelector(`[data-toolbar-block="${targetKey}"]`);
      button.classList.add('is-choice-dragging');
      targetBlock?.classList.add('is-choice-drop-target');
      document.body.classList.add('result-choice-dragging');
      event.dataTransfer.effectAllowed = 'copy';
      event.dataTransfer.setData('text/plain',JSON.stringify(activeResultChoiceDrag));
    });
    button.addEventListener('dragend',clearResultChoiceDragState);
  });
}

/**
 * Abre uma lista sobre a própria barra de resultados, mantendo gráfico,
 * resumo e demais seleções visíveis ao fundo.
 */
function openResultChoice(mode,trigger){
  const popover = $('#resultChoicePopover');
  const toolbar = $('#resultToolbar');
  const search = $('#resultChoiceSearch');
  if(!popover || !toolbar || !trigger) return;
  if(!popover.hidden && popover.dataset.mode === mode){
    closeResultChoice();
    return;
  }

  popover.dataset.mode = mode;
  search.closest('.result-choice-search').hidden = false;
  const choiceCopy = {
    theme:{
      eyebrow:'Tema da análise',
      title:'Escolha o tema',
      placeholder:'Buscar tema...'
    },
    indicator:{
      eyebrow:`Tema: ${S.theme?.label || 'não selecionado'}`,
      title:'Escolha o indicador',
      placeholder:'Buscar indicador...'
    },
    chart:{
      eyebrow:'Visualização do resultado',
      title:'Escolha o tipo de gráfico',
      placeholder:'Buscar tipo de gráfico...'
    }
  }[mode] || {
    eyebrow:'Alterar seleção',
    title:'Escolha uma opção',
    placeholder:'Buscar...'
  };
  $('#resultChoiceEyebrow').textContent = choiceCopy.eyebrow;
  $('#resultChoiceTitle').textContent = choiceCopy.title;
  search.placeholder = choiceCopy.placeholder;
  search.value = '';
  popover.hidden = false;
  toolbar.classList.add('popover-open');
  document.body.classList.add('result-choice-open');
  $$('[data-result-editor], [data-result-filter]').forEach(button=>button.setAttribute('aria-expanded',String(button === trigger)));
  renderResultChoiceOptions();
  positionResultPopover(popover,toolbar,trigger);
  window.setTimeout(()=>search.focus({preventScroll:true}),0);
}

/** Apaga todo o estado temporário da análise e retorna ao construtor vazio. */
function clearEntireAnalysis(options={}){
  closeResultChoice(false);
  clearTimeout(generateTimer);
  currentGenerationToken++;
  updateLoading(false);

  Object.assign(S,{
    theme:null, indicator:null, filters:false, chart:null,
    rows:[], tableRows:[], primaryTableRows:[], compareTableRows:[],
    hiddenCategories:[], legendSearch:'', graphMeta:null, compareGraphMeta:null,
    compareEnabled:false, compareIndicatorId:null, lastGroup:null,
    lastPrimaryData:[], lastCompareData:[], lastFilters:null, lastAnalysisSignature:''
  });

  resultView = 'chart';
  lastNonMapChart = 'line';
  resultDemographicAgeSection = '';
  mobileResultScrollPending = false;
  themeCatalogOpen = false;
  filterAccordionOpen = false;
  chartAccordionOpen = false;
  populationTransitionState.lastPopulation = 'População Geral';
  populationTransitionState.savedYears = [];
  populationTransitionState.savedGroup = 'Automático';
  populationTransitionState.autoAdjustedGroup = false;

  if($('#compareEnabled')) $('#compareEnabled').checked = false;
  if($('#compareIndicator')) $('#compareIndicator').value = '';
  if($('#legendSearchInput')) $('#legendSearchInput').value = '';
  if($('#tableSearch')) $('#tableSearch').value = '';
  $('#painel')?.classList.remove('result-editing');
  $('#painel')?.classList.add('keep-result-layout');

  renderFilters();
  clearOtherFilters();
  $$('.filter-panel .filter-cluster, .filter-panel .mini-filter').forEach(details=>{details.open=false;});
  restoreDefaultResultToolbarOrder();
  renderAll();
  updateSummaries();
  setComparisonLayoutActive(false);
  if($('#resultTitle')) $('#resultTitle').textContent = 'Monte a análise selecionando tema, indicador, filtros e gráfico';
  if($('#resultSubtitle')) $('#resultSubtitle').textContent = 'Escolha um tema, um indicador, os filtros desejados e o tipo de gráfico para visualizar a análise.';
  renderAnalysisDropPlaceholder();
  if($('#chartCompare')) $('#chartCompare').innerHTML = '';
  renderTable();

  historyState.undo = [];
  historyState.redo = [];
  historyState.applying = false;
  historyState.lastSignature = '';
  updateHistoryButtons();
  try{localStorage.removeItem(ANALYSIS_STORAGE_KEY);}catch(error){}
  if(options.preserveUrl !== true){
    try{
      if(location.search) history.replaceState(null,'',`${location.pathname}${location.hash || ''}`);
    }catch(error){}
  }
  if(options.silent !== true){
    announceSave('Análise limpa. Todas as escolhas e personalizações foram removidas.');
  }
}

/**
 * Atende ao botão apresentado na linha das visualizações e encaminha a
 * limpeza para a rotina central. Manter esse ponto de entrada separado ajuda
 * a preservar o mesmo comportamento quando o botão mudar de posição.
 */
function resetResultAnalysis(){ clearEntireAnalysis(); }

/**
 * Liga a barra, as listas compactas, as abas e os botões laterais às rotinas existentes.
 */
function bindResultLayoutEvents(){
  const toolbar = $('#resultToolbar');
  if(!toolbar || toolbar.dataset.bound === 'true') return;
  toolbar.dataset.bound = 'true';
  restoreResultToolbarOrder(toolbar);
  bindChartBlockDropZone();

  let draggedResultBlock = null;
  let resultToolbarLastDragAt = 0;
  const movableBlocks = resultToolbarBlocks(toolbar);
  movableBlocks.forEach(block=>{
    block.setAttribute('aria-roledescription','bloco reorganizável');
    block.setAttribute('aria-keyshortcuts','Alt+ArrowLeft Alt+ArrowRight');

    block.addEventListener('dragstart',event=>{
      draggedResultBlock = block;
      closeResultChoice(false);
      toolbar.classList.add('is-reordering');
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain',block.dataset.toolbarBlock || '');
      window.requestAnimationFrame(()=>block.classList.add('is-toolbar-dragging'));
    });

    block.addEventListener('dragover',event=>{
      if(activeResultChoiceDrag){
        const expectedTarget = resultChoiceTargetKey(activeResultChoiceDrag.mode);
        if(block.dataset.toolbarBlock !== expectedTarget) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
        block.classList.add('is-choice-drop-target','is-choice-drop-hover');
        return;
      }
      if(!draggedResultBlock || draggedResultBlock === block) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      const rect = block.getBoundingClientRect();
      const after = event.clientX >= rect.left + rect.width / 2;
      movableBlocks.forEach(item=>item.classList.remove('is-toolbar-drop-before','is-toolbar-drop-after'));
      block.classList.add(after ? 'is-toolbar-drop-after' : 'is-toolbar-drop-before');
      block.dataset.toolbarDropPosition = after ? 'after' : 'before';
    });

    block.addEventListener('drop',event=>{
      if(activeResultChoiceDrag){
        const choice = {...activeResultChoiceDrag};
        const expectedTarget = resultChoiceTargetKey(choice.mode);
        if(block.dataset.toolbarBlock !== expectedTarget) return;
        event.preventDefault();
        applyResultChoiceSelection(choice.mode,choice.id);
        announceSave(`${choice.label || 'Opção'} aplicada ao bloco.`);
        clearResultChoiceDragState();
        return;
      }
      if(!draggedResultBlock || draggedResultBlock === block) return;
      event.preventDefault();
      const moved = moveResultToolbarBlock(
        toolbar,
        draggedResultBlock,
        block,
        block.dataset.toolbarDropPosition === 'after'
      );
      resultToolbarLastDragAt = Date.now();
      if(moved) announceSave('Ordem dos blocos atualizada e salva.');
      clearResultToolbarDragState(toolbar);
    });

    block.addEventListener('dragend',()=>{
      resultToolbarLastDragAt = Date.now();
      draggedResultBlock = null;
      clearResultToolbarDragState(toolbar);
    });

    block.addEventListener('keydown',event=>{
      if(!event.altKey || !['ArrowLeft','ArrowRight'].includes(event.key)) return;
      const blocks = resultToolbarBlocks(toolbar);
      const currentIndex = blocks.indexOf(block);
      const direction = event.key === 'ArrowLeft' ? -1 : 1;
      const target = blocks[currentIndex + direction];
      if(!target) return;
      event.preventDefault();
      const moved = moveResultToolbarBlock(toolbar,block,target,direction > 0);
      if(moved){
        block.focus({preventScroll:true});
        announceSave('Ordem dos blocos atualizada e salva.');
      }
    });
  });

  const downloadsTarget = $('#resultSummaryDownloads');
  const exportRow = document.querySelector('.export-row');
  if(downloadsTarget && exportRow) downloadsTarget.appendChild(exportRow);

  $$('[data-result-view]').forEach(button=>button.addEventListener('click',()=>setResultView(button.dataset.resultView)));
  $$('[data-result-editor]').forEach(button=>{
    button.setAttribute('aria-haspopup','listbox');
    button.setAttribute('aria-controls','resultChoicePopover');
    button.setAttribute('aria-expanded','false');
    button.addEventListener('click',event=>{
      if(Date.now() - resultToolbarLastDragAt < 350){event.preventDefault();return;}
      openResultChoice(button.dataset.resultEditor,button);
    });
  });
  $$('[data-result-filter]').forEach(button=>{
    button.setAttribute('aria-haspopup','dialog');
    button.setAttribute('aria-controls','resultChoicePopover');
    button.setAttribute('aria-expanded','false');
    button.addEventListener('click',event=>{
      if(Date.now() - resultToolbarLastDragAt < 350){event.preventDefault();return;}
      openResultQuickFilter(button.dataset.resultFilter,button);
    });
  });
  $('#resultChoiceSearch')?.addEventListener('input',renderResultChoiceOptions);
  $('#resultChoiceClose')?.addEventListener('click',()=>closeResultChoice());
  $('#resultEditFilters')?.addEventListener('click',()=>openResultFilterPanel());
  $('#resultClearAnalysis')?.addEventListener('click',resetResultAnalysis);
  $('#resultDownloadChart')?.addEventListener('click',()=>$('#downloadImage')?.click());
  bindExplicitShareButton($('#resultShareAnalysis'));
  document.addEventListener('pointerdown',event=>{
    const popover = $('#resultChoicePopover');
    if(!popover || popover.hidden) return;
    if(popover.contains(event.target) || event.target.closest?.('[data-result-editor], [data-result-filter]')) return;
    closeResultChoice(false);
  });
  document.addEventListener('keydown',event=>{
    if(event.key === 'Escape' && !$('#resultChoicePopover')?.hidden) closeResultChoice();
  });
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
 * Limpa a seleção de período de forma explícita, deixando zero anos selecionados.
 */
function clearPeriodFilters(){
  $$('#yearChecks input').forEach(input=>{input.checked=false;});
  explicitNoYears = $('#popFilter')?.value !== 'População Negra';
  enforcePopulationYearUI();
}

/**
 * Limpa apenas os filtros demográficos.
 */
function clearDemographicFilters(){
  applySexSelections(['Todos']);
  applyMultiFilterValues('popFilter',['População Geral']);
  $$('#ageDetailChecks input').forEach(i=>i.checked=false);
  $$('#ageChecks input').forEach(i=>i.checked=false);
  syncAgeRangeControls();
  enforcePopulationYearUI();
}

/**
 * Limpa apenas os filtros geográficos.
 */
function clearGeographicFilters(){
  applyMultiFilterValues('regionFilter',['Brasil']);
  applyMultiFilterValues('ufFilter',['Brasil']);
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
  setControlValue('sexColorTodos',DEFAULT_SEX_SERIES_COLORS.Todos);
  setControlValue('sexColorFeminino',DEFAULT_SEX_SERIES_COLORS.Feminino);
  setControlValue('sexColorMasculino',DEFAULT_SEX_SERIES_COLORS.Masculino);
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
  if(section === 'period') clearPeriodFilters();
  if(section === 'demographic') clearDemographicFilters();
  if(section === 'geographic') clearGeographicFilters();
  if(section === 'other') clearOtherFilters();
  if(section === 'period' || section === 'demographic' || section === 'geographic'){
    normalizeFilterState();
    clearLegendStateForNewData();
    invalidateAnalysisData();
  }
  updateSummaries();
  refreshAnalysis({dataChanged:section === 'period' || section === 'demographic' || section === 'geographic'});
}

/**
 * Conecta botões, filtros, lixeiras e controles avançados às ações da interface.
 */
function bindEvents(){
  $('#searchInput').addEventListener('input',()=>{
    themeCatalogOpen = true;
    renderThemes();
  });
  $('#quickBuild').addEventListener('click',()=>{
    const previouslyComplete = hasRequiredBlocks();
    S.theme=DATA.themes[0];
    S.indicator=DATA.indicators.find(i=>i.themeId===S.theme.id);
    S.filters=true;
    S.chart='line';
    scheduleMobileResultScroll(previouslyComplete);
    renderAll();
    saveAnalysisState();
    recordHistory();
    scheduleGenerate(0);
  });
  $('#generate').addEventListener('click',async()=>{
    const nextStep = nextIncompleteAnalysisStep();
    if(nextStep){
      openAnalysisStep(nextStep);
      return;
    }
    if(!(await ensureAnalysisCurrent())) return;
    $('#painel')?.classList.remove('result-editing');
    const results = document.querySelector('.results');
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    results?.scrollIntoView({behavior:reduceMotion ? 'auto' : 'smooth', block:'start'});
  });
  $('#clear').addEventListener('click',clearEntireAnalysis);
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
  bindExplicitShareButton($('#shareConfigBtn'));
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

  $('#downloadCsv').addEventListener('click',async()=>{if(!(await ensureAnalysisCurrent())) return;downloadCsv(S.tableRows,'Analise Vigitel.csv');addVersionRecord('Exportação CSV',{force:true});announceSave('Resultado da análise baixado em CSV.');});
  $('#downloadExcel').addEventListener('click',async()=>{if(!(await ensureAnalysisCurrent())) return;downloadExcel(S.tableRows,'Analise Vigitel.xls');addVersionRecord('Exportação Excel',{force:true});announceSave('Resultado da análise baixado em Excel.');});
  $('#downloadBaseCsv').addEventListener('click',async()=>{if(!(await ensureAnalysisCurrent())) return;downloadCsv(currentBaseRowsForExport(),'Base Filtrada Vigitel.csv');addVersionRecord('Exportação da base CSV',{force:true});announceSave('Base filtrada baixada em CSV.');});
  $('#downloadBaseExcel').addEventListener('click',async()=>{if(!(await ensureAnalysisCurrent())) return;downloadExcel(currentBaseRowsForExport(),'Base Filtrada Vigitel.xls');addVersionRecord('Exportação da base Excel',{force:true});announceSave('Base filtrada baixada em Excel.');});
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
  $('#tableBody')?.addEventListener('click',ev=>{
    const button=ev.target.closest('.table-detail-toggle');
    if(!button) return;
    const detail=$('#'+button.getAttribute('aria-controls'));
    if(!detail) return;
    const expanded=button.getAttribute('aria-expanded')==='true';
    button.setAttribute('aria-expanded',String(!expanded));
    button.textContent=expanded?'Ver detalhes':'Ocultar detalhes';
    detail.hidden=expanded;
  });

  document.addEventListener('keydown',ev=>{
    const actionTarget=ev.target.closest('.block-card, .theme-header, .theme-indicator-item');
    if(actionTarget&&(ev.key==='Enter'||ev.key===' ')){ev.preventDefault();actionTarget.click();return;}
    if((ev.ctrlKey||ev.metaKey)&&ev.key.toLowerCase()==='z'){ev.preventDefault();ev.shiftKey?redoAnalysis():undoAnalysis();}
    if((ev.ctrlKey||ev.metaKey)&&ev.key.toLowerCase()==='y'){ev.preventDefault();redoAnalysis();}
  });
  window.addEventListener('afterprint',()=>{$('#reportPrintArea')?.setAttribute('aria-hidden','true');});
  bindResultLayoutEvents();

  $$('.drop-slot').forEach(slot=>{
    /** Abre o seletor relacionado ao cartão central acionado. */
    const activate=()=>{
      openAnalysisStep(slot.dataset.slot);
    };
    slot.addEventListener('click',activate);
    slot.addEventListener('keydown',ev=>{
      if(ev.key==='Enter'||ev.key===' '){
        ev.preventDefault();
        activate();
      }
    });
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

  const popSelections = readMultiFilterValues('popFilter','População Geral');
  const pop = popSelections.length === 1 ? popSelections[0] : 'Todas';
  applyMultiFilterValues('popFilter',popSelections);
  applyMultiFilterValues('regionFilter',readMultiFilterValues('regionFilter','Brasil'));
  applyMultiFilterValues('ufFilter',readMultiFilterValues('ufFilter','Brasil'));
  const y = selectedChecks('#yearChecks');

  $('#yearSummary').textContent = pop === 'População Negra'
    ? '2018 disponível'
    : (explicitNoYears ? 'Nenhum ano' : (y.length===0 || y.length===DATA.dims.years.length ? 'Período completo' : `${y.length} selecionados`));

  const ad = selectedChecks('#ageDetailChecks');
  $('#ageDetailSummary').textContent = ad.length===0 ? 'Nenhuma' : (ad.length===DETAILED_AGES.length ? 'Todas' : `${ad.length} selecionadas`);
  const a = selectedChecks('#ageChecks');
  $('#ageSummary').textContent = a.length===0 ? 'Nenhuma' : (a.length===DATA.dims.ages.length ? 'Todas' : `${a.length} selecionadas`);
  syncAgeRangeControls();
  renderVisibleAgeGroups();

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
  updateResultLayout();
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
  if(!(f.sexes?.length===1 && f.sexes[0]==='Todos')) n++;
  if(selectedGeographyEntries(f).length) n++;
  const selectedPops = specificPopulationSelections(f);
  if(selectedPops.length > 1 || (selectedPops.length === 1 && selectedPops[0] !== 'População Geral')) n++;
  return n;
}

/* Cache dos anos disponíveis por indicador e população. Evita percorrer toda a base a cada alteração de filtro. */
const indicatorYearAvailabilityCache = new Map();

/**
 * Retorna os anos que possuem dados para o indicador e a população selecionados.
 */
function availableYearsForIndicator(indicatorId=S.indicator?.id, population=readMultiFilterValues('popFilter','População Geral')){
  if(!indicatorId) return [...DATA.dims.years];
  const populationValues = Array.isArray(population) ? population : [population];
  const normalizedPopulations = normalizeMultiFilterValues('popFilter', populationValues);
  const cacheKey=`${indicatorId}|${normalizedPopulations.join('|')}`;
  if(indicatorYearAvailabilityCache.has(cacheKey)) return indicatorYearAvailabilityCache.get(cacheKey);
  const indicatorIndex=DATA.indicators.findIndex(item=>item.id===indicatorId);
  const specificPopulations = normalizedPopulations.filter(value=>!['Todas','Nenhum'].includes(value));
  const allowedPopulations = specificPopulations.length
    ? new Set(specificPopulations.map(value=>DATA.dims.pops.indexOf(value)).filter(index=>index>=0))
    : new Set(DATA.dims.pops.map((_,index)=>index));
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
  const selectedPopulations = readMultiFilterValues('popFilter','População Geral');
  const pop = selectedPopulations.length === 1 ? selectedPopulations[0] : 'Todas';
  const blackPopulation = selectedPopulations.length === 1 && pop === 'População Negra';
  const available = new Set(availableYearsForIndicator(S.indicator?.id,selectedPopulations));

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

  const pops = readMultiFilterValues('popFilter','População Geral');
  const regions = readMultiFilterValues('regionFilter','Brasil');
  const ufs = readMultiFilterValues('ufFilter','Brasil');
  const pop = pops.length === 1 ? pops[0] : (pops.includes('Nenhum') ? 'Nenhum' : 'Todas');
  const regionSpecific = specificRegionSelections({regions});
  const ufSpecific = specificUfSelections({ufs});
  const region = regionSpecific.length === 1 ? regionSpecific[0] : (regions.includes('Nenhum') ? 'Nenhum' : 'Brasil');
  const uf = ufSpecific.length === 1 ? ufSpecific[0] : (ufs.includes('Nenhum') ? 'Nenhum' : 'Brasil');
  const years = pop === 'População Negra' ? ['2018'] : selectedChecks('#yearChecks');
  const sexes = selectedSexesFromUi();

  return {
    years: years,
    noYears: pop !== 'População Negra' && explicitNoYears,
    ageDetails:selectedChecks('#ageDetailChecks'),
    ages:selectedChecks('#ageChecks'),
    sexes,
    sex:sexes.length === 1 ? sexes[0] : 'Todos',
    regions,
    region,
    ufs,
    uf,
    pops,
    pop,
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
  if(f.noYears && f.pop !== 'População Negra') return [];
  const validYears = f.pop === 'População Negra' ? ['2018'] : (f.years.length ? f.years : DATA.dims.years);
  const yearSet = new Set(validYears);
  const ageGroupsFromDetails = (f.ageDetails || []).map(detailToAgeGroup).filter(Boolean);
  const ageSet = new Set([...(f.ages || []), ...ageGroupsFromDetails]);
  const indIdx = DATA.indicators.findIndex(i=>i.id===indicatorId);
  const selectedSexes=normalizeSexSelections(f.sexes || [f.sex]);
  const allSexes=selectedSexes.includes('Todos');
  const normalizedPops = normalizeMultiFilterValues('popFilter', f.pops || [f.pop]);
  const popSet = new Set(specificPopulationSelections(f));
  const normalizedRegions = normalizeMultiFilterValues('regionFilter', f.regions || [f.region]);
  const normalizedUfs = normalizeMultiFilterValues('ufFilter', f.ufs || [f.uf]);
  const regionSet = new Set(specificRegionSelections(f));
  const ufSet = new Set(specificUfSelections(f));
  const hasGeoRestriction = !(normalizedRegions.includes('Brasil') || normalizedUfs.includes('Brasil')) && (regionSet.size > 0 || ufSet.size > 0);
  const hasPopRestriction = !normalizedPops.includes('Todas') && popSet.size > 0;

  return DATA.rows.filter(r=>{
    if(r[C.ind]!==indIdx) return false;
    if(!yearSet.has(DATA.dims.years[r[C.year]])) return false;
    if(!allSexes && !selectedSexes.includes(DATA.dims.sexes[r[C.sex]])) return false;
    if(hasPopRestriction && !popSet.has(DATA.dims.pops[r[C.pop]])) return false;
    if(hasGeoRestriction){
      const rowUf = DATA.dims.ufs[r[C.uf]];
      const rowRegion = DATA.dims.regions[r[C.region]];
      if(!ufSet.has(rowUf) && !regionSet.has(rowRegion)) return false;
    }
    if(ageSet.size && !ageSet.has(DATA.dims.ages[r[C.age]])) return false;
    return true;
  });
}


/**
 * Confere se as linhas filtradas possuem valores e denominadores utilizáveis.
 */
function validateFilteredRows(rows, filters){
  const selectedSexes=normalizeSexSelections(filters.sexes || [filters.sex]);
  if(!selectedSexes.includes('Todos')){
    const allowed=new Set(selectedSexes);
    const invalid = rows.some(row=>!allowed.has(DATA.dims.sexes[row[C.sex]]));
    if(invalid) throw new Error(`O filtro de sexo ${selectedSexes.join(', ')} não foi respeitado.`);
  }
  const selectedPops = specificPopulationSelections(filters);
  if(selectedPops.length){
    const allowed = new Set(selectedPops);
    const invalid = rows.some(row=>!allowed.has(DATA.dims.pops[row[C.pop]]));
    if(invalid) throw new Error(`O filtro de população ${selectedPops.join(', ')} não foi respeitado.`);
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
  const selectedSexes = normalizeSexSelections(f.sexes || [f.sex]);

  if(S.chart === 'map'){
    return 'UF';
  }

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
  if(selectedSexes.length > 1) return 'Ano';
  if(f.region !== 'Nenhum' && f.region !== 'Brasil' && (f.uf === 'Nenhum' || f.uf === 'Brasil')) return 'UF';
  if(selectedSexes.length === 1 && selectedSexes[0] === 'Todos') return 'Sexo';
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

/** Soma um conjunto de linhas em um único valor percentual. */
function aggregateSeriesTotal(rows, exactAge=false){
  const total=(rows || []).reduce((acc,row)=>{
    const numIndex=exactAge ? AGE_C.num : C.num;
    const denIndex=exactAge ? AGE_C.den : C.den;
    const nIndex=exactAge ? AGE_C.n : C.n;
    const casesIndex=exactAge ? AGE_C.cases : C.cases;
    const w2Index=exactAge ? AGE_C.w2 : C.w2;
    acc.numerador+=Number(row[numIndex])||0;
    acc.denominador+=Number(row[denIndex])||0;
    acc.n+=Number(row[nIndex])||0;
    acc.cases+=Number(row[casesIndex])||0;
    acc.w2+=Number(row[w2Index])||0;
    return acc;
  },{numerador:0,denominador:0,n:0,cases:0,w2:0});
  return total.denominador>0 ? {...total,value:total.numerador/total.denominador*100} : null;
}

/**
 * Cria séries independentes para Todos, Feminino e Masculino sem duplicar a base filtrada.
 * Em gráficos agrupados por sexo, cada escolha vira uma série sobre uma categoria única.
 */
function aggregateSexSeries(rows, group, filters=getFilters(), exactAge=false){
  const selectedSexes=normalizeSexSelections(filters.sexes || [filters.sex]);
  const realGroup=effectiveGroup(group);
  const dims=exactAge ? window.VIGITEL_AGE_DETAIL?.dims : DATA.dims;
  const sexIndex=exactAge ? AGE_C.sex : C.sex;
  const popIndex=exactAge ? AGE_C.pop : C.pop;
  const ufIndex=exactAge ? AGE_C.uf : C.uf;
  const selectedPops=selectedPopulationEntries(filters);
  const selectedGeographies=selectedGeographyEntries(filters);

  const splitSex = !(selectedSexes.length===1 && selectedSexes[0]==='Todos');
  const splitPop = selectedPops.length > 1;
  const splitGeo = selectedGeographies.length > 1;

  if(realGroup==='Sexo' && !splitPop && !splitGeo){
    if(selectedSexes.length===1 && selectedSexes[0]==='Todos') return exactAge ? aggregateExactRows(rows,group) : aggregate(rows,group,filters);
    return selectedSexes.map(series=>{
      const subset = series==='Todos' ? rows : rows.filter(row=>dims?.sexes?.[row[sexIndex]]===series);
      const total=aggregateSeriesTotal(subset,exactAge);
      return total ? {...total,category:'Prevalência',series} : null;
    }).filter(Boolean);
  }

  const sexCombos = splitSex ? selectedSexes : [null];
  const popCombos = splitPop ? selectedPops : [null];
  const geoCombos = splitGeo ? selectedGeographies : [null];
  const seriesResults = [];

  sexCombos.forEach(sexValue=>{
    popCombos.forEach(popValue=>{
      geoCombos.forEach(geoValue=>{
        const subset = rows.filter(row=>{
          if(sexValue && sexValue!=='Todos' && dims?.sexes?.[row[sexIndex]]!==sexValue) return false;
          if(popValue && popValue.value !== 'Todas' && dims?.pops?.[row[popIndex]]!==popValue.value) return false;
          if(geoValue){
            const rowUf=dims?.ufs?.[row[ufIndex]];
            const rowRegion = geoValue.kind === 'Região' ? (UF_REGION_MAP[rowUf] || rowUf) : null;
            if(geoValue.kind === 'UF' && rowUf !== geoValue.value) return false;
            if(geoValue.kind === 'Região' && rowRegion !== geoValue.value) return false;
          }
          return true;
        });
        if(!subset.length) return;
        const grouped = exactAge
          ? aggregateExactRows(subset,group)
          : aggregate(subset,group,{
              ...filters,
              sex:sexValue || filters.sex,
              sexes:sexValue ? [sexValue] : filters.sexes,
              pop:popValue?.value || filters.pop,
              pops:popValue ? [popValue.value] : (filters.pops || [filters.pop]),
              region:geoValue?.kind === 'Região' ? geoValue.value : (geoValue?.kind === 'Brasil' ? 'Brasil' : filters.region),
              regions:geoValue ? [geoValue.value] : (filters.regions || [filters.region]),
              uf:geoValue?.kind === 'UF' ? geoValue.value : (geoValue?.kind === 'Brasil' ? 'Brasil' : filters.uf),
              ufs:geoValue ? [geoValue.value] : (filters.ufs || [filters.uf])
            });
        if(!grouped.length) return;
        const labelParts=[];
        if(splitGeo && geoValue) labelParts.push(geoValue.label);
        if(splitPop && popValue) labelParts.push(popValue.label || popValue.value || popValue);
        if(splitSex && sexValue) labelParts.push(sexValue);
        const seriesLabel = labelParts.join(' · ');
        grouped.forEach(item=>seriesResults.push(seriesLabel ? {...item,series:seriesLabel} : item));
      });
    });
  });

  if(seriesResults.length) return seriesResults;
  return exactAge ? aggregateExactRows(rows,group) : aggregate(rows,group,filters);
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
      ...(d.series ? {Sexo:d.series} : {}),
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
  const selectedSexes=normalizeSexSelections(f.sexes || [f.sex]);
  const selectedPops=specificPopulationSelections(f);
  const selectedLocations=selectedGeographyEntries(f);
  if(!(selectedSexes.length===1 && selectedSexes[0]==='Todos')) descriptions.push(`sexo: ${selectedSexes.join(', ')}`);
  if(selectedPops.length===1 && selectedPops[0] !== 'População Geral') descriptions.push(`população: ${selectedPops[0]}`);
  else if(selectedPops.length>1) descriptions.push(`populações: ${selectedPops.length} selecionadas`);
  if(selectedLocations.length===1) descriptions.push(`${selectedLocations[0].kind.toLowerCase()}: ${selectedLocations[0].label}`);
  else if(selectedLocations.length>1) descriptions.push(`locais: ${selectedLocations.length} selecionados`);
  if(f.ageDetails?.length) descriptions.push(`idades detalhadas: ${f.ageDetails.length} selecionada(s)`);
  if(f.ages?.length) descriptions.push(`faixas etárias: ${f.ages.length} selecionada(s)`);
  return descriptions;
}

/**
 * Identifica quais filtros eliminaram todos os registros e sugere ajustes.
 */
function diagnoseEmptyFilters(f, indicator){
  const selectedSexes=normalizeSexSelections(f.sexes || [f.sex]);
  const unrestricted={years:[],ageDetails:[],ages:[],sexes:['Todos'],sex:'Todos',region:'Brasil',uf:'Brasil',pop:'Todas',group:f.group};
  const allIndicatorRows=filterRows(unrestricted,indicator?.id);
  if(!allIndicatorRows.length){
    return {title:'Indicador sem Dados na base ativa',details:`O indicador ${indicator?.id || ''} não possui linhas disponíveis na versão atual da base.`,culprits:[],rowCount:0};
  }

  const tests=[];
  /**
   * Registra um caso de teste e o resultado observado.
   */
  const addTest=(label,change)=>{
    const relaxed={...f,years:[...(f.years||[])],ageDetails:[...(f.ageDetails||[])],ages:[...(f.ages||[])],sexes:[...(f.sexes||[f.sex||'Todos'])]};
    change(relaxed);
    const count=filterRows(relaxed,indicator?.id).length;
    tests.push({label,count});
  };

  if(f.years?.length && f.years.length < DATA.dims.years.length) addTest('período selecionado',x=>{x.years=[];});
  if(!(selectedSexes.length===1 && selectedSexes[0]==='Todos')) addTest(`sexo ${selectedSexes.join(', ')}`,x=>{x.sexes=['Todos'];x.sex='Todos';});
  if(f.pop && !['Todas','Nenhum'].includes(f.pop)) addTest(`tipo de população ${f.pop}`,x=>{x.pop='Todas';x.years=[];});
  if(f.uf && !['Brasil','Nenhum'].includes(f.uf)) addTest(`UF ${f.uf}`,x=>{x.uf='Brasil';});
  if((!f.uf || ['Brasil','Nenhum'].includes(f.uf)) && f.region && !['Brasil','Nenhum'].includes(f.region)) addTest(`região ${f.region}`,x=>{x.region='Brasil';});
  if(f.ageDetails?.length || f.ages?.length) addTest('recorte etário selecionado',x=>{x.ageDetails=[];x.ages=[];});

  const direct=tests.filter(test=>test.count>0).sort((a,b)=>b.count-a.count);
  if(direct.length){
    return {title:'Um filtro provavelmente eliminou todos os resultados processados',details:`Ao retirar ${direct[0].label}, a consulta volta a encontrar ${direct[0].count.toLocaleString('pt-BR')} linha(s).`,culprits:direct,rowCount:direct[0].count};
  }

  const relaxed={...f,years:[...(f.years||[])],ageDetails:[...(f.ageDetails||[])],ages:[...(f.ages||[])],sexes:[...(f.sexes||[f.sex||'Todos'])]};
  const removed=[];
  const steps=[
    ['recorte etário',x=>{x.ageDetails=[];x.ages=[];}],
    ['UF',x=>{x.uf='Brasil';}],
    ['região',x=>{x.region='Brasil';}],
    ['sexo',x=>{x.sexes=['Todos'];x.sex='Todos';}],
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
      setComparisonLayoutActive(false);
      $('#tableBody').innerHTML='';
      S.tableRows=[]; S.primaryTableRows=[]; S.compareTableRows=[];
      renderTable();
      return;
    }

    const f=getFilters();
    const group=chooseGroup(f);
    const generationToken=requestToken;
    const requestSignature=analysisRequestSignature(f);
    const compareAgeId=$('#compareEnabled')?.checked ? ($('#compareIndicator')?.value || '') : '';
    const exactAgeIds=[S.indicator.id,compareAgeId].filter((id,index,array)=>id && array.indexOf(id)===index && exactAgeSupported(id));
    if((effectiveGroup(group)==='Idade detalhada' || Boolean(f.ageDetails?.length)) && exactAgeIds.length){
      const ids=exactAgeIds;
      updateLoading(true,'Carregando idades exatas');
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
        setComparisonLayoutActive(false);
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
      setComparisonLayoutActive(false);
      $('#tableBody').innerHTML='';
      S.tableRows=[]; S.primaryTableRows=[]; S.compareTableRows=[];
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
      setComparisonLayoutActive(true);
    }else{
      S.lastCompareData=[];
      S.compareTableRows=[];
      S.compareGraphMeta=null;
      $('#chartCompare').innerHTML='';
      setComparisonLayoutActive(false);
    }

    if(generationToken!==currentGenerationToken) return;
    S.tableRows=[...S.primaryTableRows,...S.compareTableRows];
    S.lastAnalysisSignature=requestSignature;
    tableState.page=1;
    safeRun('tabela de resultados processados', ()=>renderTable());
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
    scrollGeneratedResultOnMobile();
  }
}

/**
 * Converte códigos ou categorias internas em nomes mais claros para exibição.
 */
function displayCategory(v,group){return group==='UF' ? (UF_NAMES[v]||v) : v;}

/**
 * Limites vetoriais das unidades da Federação, derivados de @svg-maps/brazil 2.0.0.
 * Fonte cartográfica: MapSVG, licença Creative Commons Attribution 4.0.
 */
const BRAZIL_SVG_STATES = [{"uf":"AC","name":"Acre","path":"m 30.732574,238.03114 -2.08,-0.04 0.54,-1.81 -0.21,-0.83 -0.25,-0.49 -1.25,-0.7 -0.14,-0.45 0.27,-1.15 -0.77,-1.95 -1.09,-0.64 -5.6,-1.25 -7.34,-0.19 0.27,-0.56 2.49,-2.26 0.89,-1.23 0.29,-1.2 -0.22,-1.23 -0.68,-0.91 -0.83,-0.44 -1.68,-2.95 -0.77,-0.44 -0.9,-0.19 -1.13,-1.13 -0.92,-2.38 -2,-1.53 -0.98,-3.62 -0.87,-1.64 -1.88,-1.08 -0.08,-1.17 0.81,0.1 0.42,-0.52 0.07,-0.67 -0.2,-0.42 -2.12,-0.93 -0.36,-0.66 -2.16999996,-1.89 0.04,-0.37 0.62,-0.05 0.49999996,-1.32 -0.01,-1.31 3.01,-0.39 0.5,-0.39 -0.22,-1.35 -1.17,-1.57 0,0 17.95,7.48 23.66,5.66 12.14,3.14 26.44,14.17 28.509996,12.13 0,0 2.97,1.26 0,0 -0.3,0.48 -1.57,0.66 -2.09,1.59 -2.86,2.79 -1.65,0.86 -0.66,-0.18 -1.53,0.18 -0.05,0.56 -1.92,1.3 -2.08,0.99 -1.439996,1.83 -0.44,1.18 -0.61,0.28 -1.17,-0.75 -0.76,-0.13 -2.37,0.05 -0.68,0.26 -0.63,0.45 -0.36,0.86 -2.44,3.48 -3.77,1.25 -0.84,0.69 -1.94,0.51 -1.03,0.03 0.08,-2.11 -1.36,0.2 -3.55,-0.77 -5.24,-0.47 -5.09,0.38 -0.66,-0.58 -2.27,-0.17 -3.56,1.83 -2.73,0.62 -1.68,-0.67 -1.4,-1.44 -1.64,1.16 0.04,-17.55 0.05,-1.1 0.47,-0.71 0.07,-2.35 -0.26,-0.88 0.97,-1.18 0.48,-1.14 -1.16,0.2 -2.97,2.59 -1.6,1.01 -2.06,2.38 -1.95,0.67 -0.65,1.08 -1.81,0.99 z"},{"uf":"AL","name":"Alagoas","path":"m 562.17257,230.56114 -0.2,-0.73 -1.42,-0.78 -0.45,0.09 -1.02,-0.29 -0.54,-1.4 0,0 1.32,-1.07 0.64,-1.09 2.17,-0.76 2.38,-3.29 0.09,-0.69 0.82,-0.6 1,1.22 1.67,0.3 1.08,-0.12 2.55,2.02 1.9,2.12 1.78,1.05 1.91,0.48 2.5,-0.65 3.14,0.29 1.17,-0.11 1.86,-1.06 1.16,0.05 1.81,-1.11 2.18,-2.29 0.12,-0.45 1.55,-1.24 2,-0.24 2.24,0.85 2.56,-1.29 1.47,-0.19 1.92,0.81 2.9,0.27 0.27,0.21 0,0 -2.78,4.96 -4.55,5.13 -3.58,3.58 -3.04,4.58 -3.33,2.88 -1,2.03 -1.32,1.79 0,0 -0.6,-1.31 -3.59,-2.23 -0.46,-0.03 -1.66,-0.79 -1.76,-1.45 -1.3,-2.45 -5.42,-3.07 -3.68,-0.95 z"},{"uf":"AP","name":"Amapá","path":"m 345.24257,99.961144 -0.94,-0.06 -0.77,0.339996 -1.3,0.12 -2.79,-0.679996 -1.45,-1.03 -0.43,-1.5 -1.87,-1.39 -0.11,-1.3 0.21,-0.69 -0.31,-1.58 -0.33,-0.47 -0.95,-0.19 -0.41,-0.94 0.08,-2.43 -2.93,-3.28 -0.78,0.36 -0.82,-0.19 -1.5,-3.48 0.13,-1.58 -0.59,-1.81 -0.62,-0.56 -0.67,-1.51 -0.19,-2.11 0.43,-3.14 -0.17,-0.33 -2.57,-0.73 -2.02,-2.26 -0.76,-2.83 0.19,-0.72 0.68,-0.23 -0.49,-1.18 -0.68,0.03 -2.84,-2.66 -0.94,0.14 -0.38,0.42 -1.33,0.14 -0.84,-0.27 -0.8,-0.98 -1.14,-0.84 -1.19,-0.12 -0.49,-1.28 -0.67,-0.8 -1.93,-1.05 -1.29,-0.49 -3.39,-0.37 -1.08,0.29 -1.17,-0.02 -0.31,-0.54 -0.24,-1.44 0.25,-4.54 0.62,-1.3 -0.37,-2.3 -0.62,-0.57 0,0 0.35,-0.21 0.99,0.3 -0.01,0.81 -0.29,0.18 0.34,0.97 1.47,-0.06 0.82,0.23 0.35,0.9 0.84,0.71 2.25,0.78 3.29,0.75 2.76,-1.78 0.35,-0.76 1.73,-1.17 0.83,-0.29 0.69,0.94 2.71,0.94 1.08,-0.12 1.72,-1.01 0.12,-0.42 0.32,0.03 1.46,1.3 -0.2,0.87 2.37,-0.17 0.51,0.5 0.95,0.17 0.62,-0.01 0.91,-0.48 1.67,-1.5 1.78,-1.1 1.75,-2.3 0.37,-1 -0.2,-0.54 3.13,-6.5 0.11,-1.82 1.11,-1.3 0.73,-0.19 3.6,-5.79 0.23,-1.15 0.84,-1.2 1.79,-1.55 0.63,-1.66 2.11,-1.14 0.47,-0.92 1.04,-0.58 0.56,1.46 0.88,1.36 -1.67,-4.8 -0.07,-1.29 0.18,-0.33 3.37,2.42 1.14,1.21 0.91,1.22 0.52,1.19 0.03,1.58 0.44,0.31 0.32,-0.48 0.38,-0.1 0.21,0.4 0.21,7.89 0.66,3.87 2.71,6.05 2.66,8.94 3.32,5 1.01,0.35 3.27,-0.08 2.78,0.94 1.29,0.85 0.77,2.65 -0.16,3.33 -1.29,0.96 -1.73,0.43 -0.38,0.33 1.79,-0.15 1.04,-0.42 0.28,0.23 0.12,0.59 -0.17,0.73 -5.03,4.06 -1.17,2.1 -2.15,1.41 -1.94,3.72 -2.91,3.5 -0.7,0.46 -0.94,-0.09 -1.45,0.52 -2.08,2.98 0,0 -1.34,0.07 -0.75,0.9 0,0 -1.47,1.68 -0.97,2.22 -1.12,1.87 -0.84,0.65 -3.01,3.45 -0.36,2.4 0.17,1.8 -1.95,1.81 -0.98,0.12 z m 23.36,-46.99 -0.45,-0.33 -1.1,-1.86 0.07,-0.88 0.23,-0.41 1.66,-0.45 0.43,0.39 0.83,2.27 -0.99,1.1 -0.68,0.17 z m 2.49,17.61 -0.4,-0.25 -0.08,-0.71 1.11,-1.1 0.88,-0.15 1.25,0.24 0.46,-0.11 0.44,-0.64 0.05,0.59 -0.97,1.44 -0.99,0.5 -1.75,0.19 z m 3.44,-2.87 -0.78,-0.23 0,-0.56 0.72,-1.04 1.25,-0.1 0.18,0.35 -0.1,0.51 -1.27,1.07 z m -7.19,-18.42 -0.76,-0.5 0.26,-0.83 0.88,-0.17 0.86,0.32 0.01,0.73 -1.25,0.45 z"},{"uf":"AM","name":"Amazonas","path":"m 166.08257,47.551144 0.72,0.78 0.75,0.34 0.61,0.01 1.13,-0.42 0.63,0.11 0.06,0.96 1.21,1.17 0.97,0.37 0.88,-0.21 1.36,0.11 1.95,0.95 0.49,0.66 -0.91,3.32 -0.71,1.5 2.73,3.74 1.66,4.76 0.19,2.26 0.87,1.12 0.05,0.45 -1.62,1.46 0.36,1.59 0.66,1.58 -0.77,3.04 -0.57,0.96 0.29,4.98 0.88,2.17 1.22,0.84 0.58,0.9 1.13,4.33 -0.06,0.58 -1.14,1.32 -1.84,-0.33 -0.14,1.14 5.01,4.42 0.52,0.04 1.96,1.31 1.48,1.649996 1.04,2.04 0.53,0.07 1.34,-0.42 2.36,1.04 -0.44,-2.11 0.75,-2.289996 0.25,-1.73 -0.37,-1.8 0.82,-2.97 1.02,-1.26 1.28,-0.69 2.09,-0.71 0.55,-0.89 1.6,-0.06 2.83,0.93 1.87,2.04 0.92,2.51 1.82,0.23 1.25,-0.46 1.41,-1.41 2.03,-0.55 0.42,-0.39 0.02,-0.53 -1.14,-1.41 -0.23,-0.73 0.11,-0.66 1.15,-2.64 0.07,-1.13 1.66,-3.03 2.33,-3.26 -0.03,-0.68 18.49,0.07 0,0 0.4,4.86 -0.43,1.45 0.18,2.27 0.24,0.68 1.7,0.85 0.18,0.41 -0.35,0.69 -0.05,2.11 1.83,1.99 0.36,0.19 0.7,-0.18 1.84,1.23 0.55,1.83 0.04,0.93 0.3,0.45 4.64,3.769996 4.58,2.54 0.63,0.9 1.35,1.09 1.88,0.67 2.37,1.31 2.26,0.65 1.36,0.15 1.32,0.82 0.08,0.61 1.27,1.34 2.7,1.44 1.1,2.17 1.87,0.79 0.85,-0.61 1.38,-0.35 0.19,0.48 -0.13,0.78 1.81,1.67 -29.9,64.24 -0.78,1.31 -1.45,1.13 -0.58,0.97 -0.03,1.13 0.82,2.33 0.38,0.57 1.07,0.58 1.58,1.56 0.64,1.26 0.15,1.96 0.57,0.57 0,0 -1.18,1.2 -0.2,0.61 -0.06,0.76 0.34,0.84 -0.27,1.01 -1.2,1.82 -0.86,0.64 -0.42,0.85 0.1,0.85 0.66,1.37 0.46,1.94 -1.38,4.22 -1.18,5.22 -1.21,0.73 -47.85,0.32 0,0 0.04,-0.7 -0.36,-0.38 -1.39,-0.28 -1.92,1.08 -0.54,1.74 -0.68,0.19 -3.24,-1.48 -0.68,-2.88 -0.62,-0.2 -0.98,0.13 -0.46,-0.21 -1.25,-3.27 -2.54,-0.98 -1.33,-1.27 -0.8,-1.91 -0.45,-0.49 -2.15,-1.13 -10.79,0.06 -1.38,2.56 -1.72,0.5 0.09,1.17 -0.26,0.22 -2.48,0.53 -1.19,1.59 -0.05,0.67 0.9,0.7 0.17,0.45 -0.36,1.02 -0.81,1.15 -2.06,1.21 -0.11,1.81 0.24,1.46 -3.87,-0.46 -2.13,0.38 -1.2,1.07 -1.79,-0.1 -0.84,-0.55 -0.46,-0.02 -1.75,1.26 -0.53,0.84 0.26,1.75 -2.54,3.16 -0.68,0.08 -0.68,-0.53 -0.64,-2.26 -0.38,-0.09 -1.84,1.02 -1.3,1.21 -1.37,0.39 -0.77,-0.13 -1.08,0.5 -0.41,0.53 -0.13,0.72 -1.22,0.79 -0.37,0.02 -2.31,-2.33 -0.72,-0.37 -2.87,0.33 -3.96,-0.26 0.16,1.29 -0.15,0.56 -1.55,1.81 -1.92,0.58 -3.26,2.56 0,0 -28.509996,-12.13 -26.44,-14.17 -12.14,-3.14 -23.66,-5.66 -17.95,-7.48 0,0 -0.07,-0.65 0.7,-2.92 1.22,-1.4 4.92,-3.47 2.26,-0.24 0.47,-0.3 0.98,-1.56 0.08,-1.03 -1.74,-4.49 0.38,-1.19 1.18,-2.19 1.28,-1.32 0.92,-1.25 0.42,-0.98 0.3,-1.74 -0.29,-1.32 0.67,-2.04 0.31,-2.31 0.73,-0.75 3.66,-1.63 2.19,-1.23 1.15,-1.04 0.44,-1.4 0.78,-0.37 1.41,-0.11 1.65,-0.93 3.54,-2.73 2.42,-0.43 1.51,0.29 4.19,-1.22 1.5,-0.77 1.82,-0.36 3.33,0.38 1.3,-1.59 0.63,-1.45 1.09,-0.61 2.14,0.2 0.64,0.54 1.32,-0.24 1.1,-0.74 1.71,0.12 0.31,0.53 -0.02,1.18 1.61,1.29 2.83,0.08 0.58,-0.4 0.46,-0.78 -0.11,-0.39 1.17,-4.92 6.7,-37.17 1.16,-2.92 -0.99,-4.959996 0.12,-0.26 -1.3,-1.05 -1.48,-2.75 -0.04,-0.49 0.65,-1.39 -0.52,-1.78 -0.37,-0.4 -1.7,-0.59 -3.03,-2.35 -1.94,-2.28 0.2,-11.51 3.89,-0.26 1.75,-1.17 3.5,-0.92 2.68,1.76 1.22,0.11 1.27,-0.43 -0.49,-1.69 0.3,-1.72 -1.37,-2.1 -0.57,-0.54 -1.15,-0.6 -1.51,0.53 -2.79,-0.61 -3.57,0.09 -0.06,-9.9 0.96,0.04 1.32,-0.58 2.28,-0.6 2.84,0.87 19.03,0.06 -0.46,-0.66 -0.79,-0.14 -0.38,-1.2 0.95,-1.93 1.43,0.4 0.61,1.52 0.87,1.32 0.66,0.35 0.83,0.01 1.61,-0.61 1.94,-2.09 0.32,-0.84 1.259996,-1.24 2.55,-1.39 1.29,0.46 1.17,2.58 1.62,1.99 0.74,1.3 0.66,1.78 0.23,1.55 -0.49,3.63 0.2,1.76 3.2,-0.75 8.31,7.06 0.79,0.28 2.5,0.21 2.3,-1 1.7,-1.7 2.11,-1.16 2.19,-0.11 0.56,0.29 0.77,1.08 -0.02,0.97 -1.11,1.7 0.37,0.98 0.58,0.27 1.33,-0.72 0.56,-0.91 0.23,-1.29 1,-1.16 0.47,-0.23 1,0.18 0.55,-0.18 0.41,-0.66 0.46,-2.31 0.51,-0.37 1.51,-0.36 2.93,-1.77 0.97,0.55 0.93,-0.29 1.6,-1.04 1.02,-1.61 2.11,-1.21 2.03,0.55 2.36,-1.65 0.55,-0.82 0.44,-2.66 -0.03,-1.29 0.77,-0.92 1.03,-0.42 1.74,-0.02 1.34,-0.39 2.06,-1.6 0.96,-0.37 2.28,-0.3 z"},{"uf":"BA","name":"Bahia","path":"m 527.76257,365.59114 -0.36,-0.83 0.68,-1.35 -0.01,-0.53 -0.53,-1.04 -4.13,-3.05 -0.15,-0.51 0.22,-1.51 -0.57,-1.23 -0.65,0.24 -0.2,0.45 -0.34,0.18 -0.22,-0.25 0.53,-4.4 0.82,-3.3 0.82,-0.88 2.47,0.24 1.02,-0.71 0,-0.42 -0.56,-1.02 0.16,-2.65 4.96,-4.22 1.47,-3.08 -0.42,-1.17 -0.78,-1.02 -0.89,-0.06 -0.73,-0.38 -2.83,-2.47 -2.12,0.02 -2.19,-0.6 -2.27,-1.08 -2.73,-0.56 -1.98,-0.14 -1.32,0.99 -1.47,0.5 -2.61,-0.45 -0.57,0.21 -0.44,-3.96 -6.52,-6.2 -0.38,-0.18 -4.39,1.23 -1.53,-1.24 -0.51,0.21 -0.93,-0.22 -2.54,-1.22 -2.17,-1.62 -0.98,0.18 -4.35,-3.63 -1.1,-0.54 -2.73,-0.75 -1.77,0.25 -1.88,0.9 -0.81,1.12 -0.64,0.18 -5.33,-1.47 -0.61,-0.49 -0.26,-1.5 0.14,-0.89 1.29,-2.74 -0.86,-0.46 -2.28,-0.52 -2.18,-0.04 -1.2,-0.5 -1.79,-0.08 -3.83,1.58 -4.26,3.03 -0.64,1.11 -3.37,1.87 -2.02,0.4 -0.95,1.18 -1.81,1.55 -1.43,0.52 -1,-0.15 -1.85,2.58 -1.04,0.77 -2.13,-0.38 -0.72,0.13 -0.69,1 -1.34,0.92 -0.4,-0.24 1.43,-3.43 -0.51,-2.41 0,0 1.48,-1.97 0.25,-0.77 -0.23,-1.27 -0.67,-1.72 0.1,-0.67 0.71,-1.42 -0.05,-0.46 -3.21,-2.62 -1.69,-3.46 -0.62,-3.52 0.05,-1.55 1.2,-3.83 1.59,-1.03 0.23,-0.38 0.06,-0.94 -1.63,-0.84 -0.11,-0.33 0.48,-2.52 1.43,-1.06 -0.02,-0.37 -2.72,-2.46 0,0 -0.04,-0.93 1.36,-2.38 -0.04,-1.07 -0.17,-0.42 -1.46,-0.49 -0.94,-0.65 -0.35,-1.26 0.06,-2.92 0.19,-0.85 1.95,-1.67 1.14,-0.42 0.96,-0.72 -0.29,-0.63 -0.58,-0.52 -0.92,-0.29 -1.03,0.18 -0.35,-0.33 -0.09,-0.5 0.42,-0.96 2.04,-0.82 0.56,-0.45 -0.04,-0.76 -1.88,-0.98 -3.58,-0.67 -1.86,-1.96 -0.23,-0.92 0.5,-1.16 1.01,-0.73 1.52,-3.48 0.9,-0.61 1.01,-0.27 0.35,-0.38 -1.29,-1.8 0.19,-0.37 3.21,-2.62 3.82,-2.02 0.56,-0.47 0.22,-0.98 0.69,-0.65 0,0 2.33,-0.02 1.44,1.34 0.66,1.04 0.53,2.21 1.76,2.49 4.18,1.86 1.8,-0.52 2.11,0.18 0.33,-0.21 0.75,-1.45 1.14,-0.37 0.67,-0.87 1.17,-0.89 2.21,-0.75 1.33,0.17 1.48,0.53 1.35,-0.42 2.97,-2.42 2.95,-5.05 0.72,-0.86 0.24,-0.92 0.3,-2.56 -0.12,-1.16 -2.24,-4.43 0.05,-0.93 3.24,-1.65 1.95,-0.02 1.5,0.46 0.41,0.93 0.32,0.18 2.12,-0.43 1.39,-0.54 1.33,0.38 1.71,0.99 -0.13,0.65 0.19,0.29 0.82,0.28 3,-0.11 1.47,-0.64 1.7,-0.1 0.82,-1.22 1.51,-1.34 2.73,-0.34 0.77,-0.36 0.81,-0.98 2.17,0.01 0.62,0.63 0.31,0.05 1.86,-1.81 -0.1,-2.4 1.99,-0.38 0.79,0.18 1.05,-0.66 1.5,-2.31 0.46,-1.15 0,0 0.89,0.4 1.16,-0.27 2.2,0.29 2.82,1.39 0.44,0.51 -0.06,2.73 0.72,1.94 2.21,0.91 0.27,2 -0.92,1.68 1.83,0.62 0.96,-0.22 0.82,-0.92 2.87,-0.88 0.77,-3.58 0.5,-0.87 0.75,-0.16 0.78,0.53 0.63,0.05 2.39,-1.02 1.1,-1.24 0.17,-0.59 -0.25,-1.36 0.29,-0.25 2.24,-0.45 0.77,-2.05 1.65,-0.44 2.53,-1.46 0.59,-0.1 1.49,0.56 0.83,1.44 1.36,0.81 2.36,0.78 2.99,0.4 1.58,1.15 0.54,1.65 0.39,0.27 0.43,-0.15 0.29,-1.75 0.43,-0.44 1,-0.01 0.45,0.32 0.02,0.63 -0.62,0.88 0.45,0.83 0.5,0.37 2.1,0.86 0.02,0.94 1.22,3.05 0,0 0.54,1.4 1.02,0.29 0.45,-0.09 1.43,0.79 0.2,0.72 0,0 -0.67,1.16 0.21,2.14 1.28,2.5 1.99,1.95 0.75,1.15 -0.08,3.12 -0.66,1.62 -0.09,0.88 0.76,2.75 -0.3,0.58 -0.69,0.55 -2.55,1 -1.13,-0.75 -1.71,-0.01 -0.32,0.3 -0.59,1.58 0.02,0.77 0.95,1.6 1.1,0.66 0.52,1.49 1.43,1.51 0.15,0.39 -0.13,1.42 -0.34,0.39 0.12,0.42 0.59,0.52 1.93,0.92 0.48,0.71 0.54,0.34 1.55,0.64 2.89,-0.88 0,0 0.64,-0.02 0.36,0.41 -4.08,8.83 -3.83,5.19 -1.03,2.33 -5.03,5.74 -2.45,1.26 -0.87,-0.01 0.3,-1.43 0.37,-0.15 0.14,-1.1 -0.45,-1.93 -1.87,-0.25 -0.43,-1.3 -0.68,-0.75 -0.37,0.6 -0.46,2.33 -0.5,0.87 -0.55,0.38 -0.56,-0.29 -0.49,-1.74 0.11,-0.32 0.31,-0.13 -0.03,-0.39 -0.87,1.29 0.93,1.69 0.46,0.23 0.37,-0.15 1.15,0.26 -0.46,1.81 -1.21,1.15 -0.25,1.82 -1.25,0.97 -0.35,0.67 -0.2,0.84 0.18,0.85 -1.35,-0.39 -0.21,0.39 -0.36,2.52 0.36,-0.72 0.75,0.21 0.24,0.54 -0.23,0.41 0.06,0.62 0.3,0.3 0.33,1 -1.04,2.51 0.57,3.44 -0.55,0.49 -0.57,-0.22 -0.14,1.13 0.59,0.46 1.21,-1.72 -0.47,-2.21 0.82,-0.61 0.25,0.54 -0.06,1.76 -0.96,2.61 -0.74,5.43 -0.51,1.81 0.2,2.47 0.78,2.85 0.19,4.54 0.87,6.41 0.99,3.42 -2.21,6.66 -1.35,6.65 -0.47,1.01 -0.16,2.86 -1.06,3.72 -0.09,2.33 0.39,4.42 0.89,1.71 -2.24,2.98 -1.81,0.67 -0.94,0.64 -2.72,3.89 -0.57,2.04 0,0 -8.09,-5.14 -0.31,-0.53 z m 22.28,-78 -0.23,-1.2 0.74,-0.41 1.06,-1.04 0.16,-0.64 -0.37,-0.73 0.76,0.14 0.82,1.05 -0.05,0.53 -2.89,2.3 z m -2.53,6.85 -0.63,-0.03 0.01,-0.67 0.26,-0.36 -0.8,-0.22 -0.42,-0.4 0.13,-1.07 1.87,-0.15 0.16,0.2 0.11,1.13 -0.69,1.57 z"},{"uf":"CE","name":"Ceará","path":"m 574.05257,157.11114 -4.89,1.59 -2.61,2.01 -3.3,6.69 -0.84,1.12 -0.87,0.57 -0.65,1.67 0.15,0.74 -1.4,2.44 -1.46,1.51 -0.57,1.1 -1.03,0.26 -0.78,-0.51 -0.51,0.07 -0.84,0.88 -1.41,2.25 -0.34,1.97 0.64,0.17 0.66,-0.38 0,0 -0.08,0.54 -0.84,1.15 -1.03,3 0.52,1.31 -0.66,1.31 -1.09,0.63 -0.17,0.38 -0.12,0.93 0.24,0.41 0.58,0.29 0.35,0.72 -0.02,1.66 1.24,0.89 0.69,0.08 0.34,1.19 -1.61,3.49 -1.19,1.12 0.17,0.25 0,0 -1.59,0.49 -1.07,0.83 -1.54,2.29 -1.65,0.05 -0.63,-1.64 -0.78,-0.57 -1.36,-0.48 -1.01,-1.07 -0.46,-0.99 -1.83,-0.83 -2.85,-1.9 -3.08,-0.42 -1.29,0.1 -2.14,0.8 -1.63,0.19 -0.89,-0.24 -4.93,-0.2 0,0 0.06,-1.32 -0.68,-0.68 -0.08,-0.97 1.14,-3.11 1.5,-2.25 0.01,-0.69 -0.77,-1.16 -2.56,-0.47 -1.31,-0.65 -1.01,-2.67 -1.05,-5.2 -0.76,-2.57 0.24,-0.45 -0.94,-8.16 -0.11,-0.38 -0.92,-0.69 0.8,-0.58 0.59,-1.58 -0.6,-2.99 -1,-2.01 0.48,-1.6 -0.79,-3.87 0.74,-1.36 0.02,-0.76 -1.36,-1.59 -0.44,-1.73 -3.15,-6.42 -1.8,-4.72 -0.29,-1.29 0.18,-1.46 1.58,-1.97 1.09,-1.85 0.11,-0.8 0,0 0.19,-0.14 -0.04,-0.62 -0.4,-0.66 0.65,-0.81 6.74,-0.22 2.89,-0.43 2.07,-0.66 7.4,0.79 2.12,1.12 1.94,1.5 4.12,2.18 1.46,0.52 4.82,3 1.21,0.2 2.22,2.29 2.99,2.11 2.57,0.72 2.44,2.91 1.22,0.61 2.96,3.81 4.16,3.08 1.46,2 1.04,0.99 1.5,0.82 1.15,0.03 2.37,0.92 0.79,0.67 z"},{"uf":"DF","name":"Distrito Federal","path":"m 416.97257,334.13114 -14.69,-0.02 -0.52,-3.26 0.92,-1.83 0.38,-3.73 11.95,0.01 1.83,1.98 0.06,2.21 -0.59,1.19 -0.21,2.44 z"},{"uf":"ES","name":"Espírito Santo","path":"m 501.89257,411.63114 -0.29,-0.14 0.44,-2.34 0.57,-1.3 -0.59,-3.12 0.16,-0.42 1.72,-2.06 5.15,0.03 0.55,-0.32 0.97,-3.24 1.11,-1.27 0.88,-2.29 0.24,-1.72 0.26,-0.44 1.24,-0.86 1.71,-2.09 0.54,-2.97 -0.29,-2.43 -1.27,-2.81 -1.1,-1.27 -0.52,-0.09 -0.45,0.29 -0.76,-0.28 -0.49,-0.71 0.43,-0.55 1.48,-0.09 0.8,0.35 0.97,0.03 0.95,-0.24 0.32,-0.42 -0.17,-1.72 -1.31,-0.35 -0.21,-0.41 0.3,-1.54 0.03,-1.92 -0.52,-0.66 -1.33,-0.67 -0.3,-0.7 1.17,-1.93 2.17,-1.31 0.31,-0.02 1.05,0.74 1.13,0.11 0.02,-0.81 -1.67,-2.27 1.34,0.13 2.18,-0.29 0.84,-0.61 1.08,-0.32 1.58,-0.08 2.54,0.81 0.91,0.55 0,0 0,0 0,0 0.3,0.53 8.1,5.14 0,0 -0.93,3.35 -0.31,2.86 0.12,3.59 0.72,6.15 -0.31,2.47 -1.49,3.18 -2.75,1.39 -0.55,0.6 -1.67,3.33 -0.98,3.8 -0.77,1.47 -0.83,-0.68 -0.88,-0.13 -0.29,1.28 1.35,0.52 -1.94,4.24 -3.45,3.84 -0.24,-0.27 -1.86,0.66 -0.8,1.23 -0.06,1.39 -0.42,1.25 -1.59,2.02 -0.29,1.13 0,0 -1.62,-1.06 -2.99,0.37 -4.34,-1.01 -2.5,-1.13 -0.67,-4.71 z"},{"uf":"GO","name":"Goiás","path":"m 416.97257,334.13114 -0.87,-1.01 0.21,-2.44 0.59,-1.19 -0.06,-2.21 -1.83,-1.98 -11.95,-0.01 -0.38,3.73 -0.92,1.83 0.52,3.26 14.69,0.02 0,0 0,0 0,0 -0.53,1.52 0.31,1.57 -0.68,1.59 -1.04,1.25 -0.41,1.47 0.85,1.21 0.85,0.34 1.42,1.03 1.65,4.56 0,0.6 -2.32,2.71 -3.24,3.01 -0.43,2.14 1.09,1.11 0.9,-0.47 1.58,0.57 0.47,0.61 0.18,1 -0.17,0.71 -0.73,0.9 -0.51,1.89 1.19,3.46 -3.09,2.06 -1.16,0.2 -0.86,0.9 -0.48,1.12 -4.89,2.74 -0.7,-0.77 -4.35,-1.86 -0.55,0.48 -0.58,0.09 -1.75,0.01 -1.48,-0.28 -3.86,0.16 -2.01,-0.89 -4.13,2.64 -2.91,2.92 -0.33,0 -1.31,-1.42 -1.52,-0.3 -3.19,1.64 -3.71,-0.62 -2.48,0.96 -2.23,0.54 -1.41,2.1 -1.21,2.46 0.06,1 -0.84,1.3 -0.82,0.28 -0.84,-0.16 -0.45,0.14 -0.94,0.74 -1.64,2.1 -0.57,1.9 0.56,0.61 -0.01,0.34 -0.36,0.23 -0.86,-0.46 0,0 -0.24,-0.45 -2.66,-2.24 -3.15,-0.61 -1.62,-1.55 -1.9,-0.43 -1.49,-0.04 -3.35,-1.34 -0.68,-0.85 -3.07,-1.56 -0.67,-0.61 -1.44,-0.71 -1.14,-0.17 -2.7,-1.68 -2.78,0.16 -3.8,-0.7 -0.13,-0.33 0.26,-0.84 0.57,-1.17 1.31,-1.76 -0.08,-0.42 -2.25,-0.9 -1.14,0.67 -0.66,-0.19 -0.28,-0.41 -0.23,-1.11 0.26,-2.58 -0.19,-1.77 0,0 -0.95,-2.2 -0.18,-3.43 -1.41,-2.19 -0.16,-0.71 0.4,-3.41 2.55,-3.85 0.38,-2.91 0.7,-0.77 2.02,-0.84 1.92,-1.77 1.25,-2.02 0.33,-1.95 0.5,-1.01 1.28,-1.04 0.82,-1.43 0.08,-1.54 1.75,-0.97 1.4,-2.62 2.65,-0.13 2.72,-0.86 0.32,-0.28 1.98,-4.19 0.71,-0.96 0.64,-4.1 0.38,-0.74 1.92,-1.94 1.65,-1.01 1.07,-0.26 1.23,0.68 1.21,-0.73 1.39,-1.43 0.84,-2.93 1.17,-2.87 -0.01,-0.8 -0.48,-1.14 0.58,-2.74 1.6,-3.09 -0.12,-5.18 1.21,-0.78 1.03,-2.63 2,-3.17 0.39,-1.07 -0.16,-2.72 0.35,-0.9 0.97,-0.86 0.27,-1.13 -0.08,-0.63 0,0 0.34,-0.45 0.2,-1.88 0.66,-1.23 1.81,-2.09 0.56,-0.3 -0.03,1.71 -1.22,1.88 -0.52,2.34 2.4,0.4 2.2,1.03 3.93,0.4 3.09,1.71 4.07,1.43 0.63,-0.23 1.63,-5.94 1.47,-2.39 1.18,-0.97 1.15,1.31 1.04,1.88 1.11,3.71 0.61,3.1 1.14,0.05 0.75,-0.75 0.3,-1 0.56,-0.54 2.76,0.34 4.53,-0.53 0.22,0.74 -0.56,1.56 3.13,1.47 3.35,0.68 0.69,-0.08 0.51,-3.3 0.55,0.03 1.51,2.62 0.46,0.24 1.78,-0.9 2.52,-2.08 4.53,-1 1.55,0 2.56,-1.1 1.74,-1.34 5.36,-1.42 0,0 2.72,2.46 0.02,0.38 -1.43,1.06 -0.48,2.52 0.1,0.33 1.63,0.84 -0.06,0.94 -0.23,0.38 -1.59,1.03 -1.19,3.83 -0.05,1.55 0.62,3.52 1.7,3.46 3.21,2.62 0.05,0.47 -0.72,1.42 -0.1,0.67 0.67,1.72 0.23,1.28 -0.25,0.77 -1.48,1.97 0,0 -1,1.01 -3.23,-0.34 -0.9,-1.76 -2.42,-1.48 -1.17,1.49 0.58,3.77 -0.57,0.54 -0.4,0.13 -2.78,-1.14 -1.17,0.23 -0.37,0.28 -0.72,3.18 0.72,0.1 0.49,1.16 -0.57,0.94 -0.73,0.7 0.04,1.9 0.42,0.61 0.53,0.19 0.69,4.26 -0.53,0.53 -3.36,0.9 -2.29,1.51 z"},{"uf":"MA","name":"Maranhão","path":"m 458.83257,129.18114 -0.04,0.33 -2.04,2.15 -0.43,0.17 -0.04,1.44 1.97,-1.7 0.68,-1.21 2.12,-1.58 0.89,-1.14 1.03,-6.33 1.15,-0.7 1.11,-0.12 1.67,-0.92 0.65,-0.13 0.46,0.12 0.08,1.63 -0.2,0.45 -1.42,1.87 -3.21,1.75 -0.03,0.72 0.73,0.12 0.45,-0.81 1.15,-0.31 0.22,0.83 -0.59,0.51 0.25,0.3 4.21,-4.97 0.86,0.33 2.58,-0.93 4.04,0.43 -0.46,-2.41 0.61,-0.23 2.42,0.08 1.78,0.38 2.63,1.05 1.04,0.11 2.15,1.38 1.4,0.03 1.26,1.3 1.89,1.32 2.5,0.58 1.16,-0.19 0.56,0.76 0.34,0.05 1.59,-0.09 2.46,0.66 0.26,-0.9 -0.67,-0.47 1.67,-0.38 0.57,0.11 -0.09,0.42 0,0 -0.46,1.43 0.23,0.72 0.63,0.54 -0.38,1.53 -1.79,2.27 -4.13,3.97 -3.32,0.46 -0.8,-0.16 -2.92,3.4 0.04,1.8 -0.88,1.83 -1.89,1.85 -0.82,1.98 -0.64,0.17 -0.77,1.05 0.36,1.92 1.23,0.83 0.38,1.28 -0.28,1.46 -1.14,2.87 1.58,2.81 0.55,2.98 -0.11,2.43 -0.21,0.55 -4.1,4.42 -0.17,2.48 0.12,2.11 0.51,2.3 1.78,2.04 1.61,0.91 0.17,0.5 0.13,0.84 -0.39,2.2 -0.29,0.44 -0.12,1.21 -0.5,1.46 -1.21,1.31 -2.29,0.29 -0.65,-0.28 -0.83,0.04 -2.43,0.86 -1.52,0.11 -2.5,-1.82 -1.01,-0.21 -1.46,0.19 -1.01,0.6 -1.12,0.26 -0.23,-0.3 -0.84,0.24 -0.5,0.22 -1.9,1.91 0.01,0.46 -0.63,0.87 -2.01,2 -2.34,0.91 -2.87,2.56 -1.33,0.53 -1.05,0.04 -1.7,1.53 -1.08,0.36 -2.61,0.32 -2.72,0.76 -2.13,1.95 -0.98,2.97 -0.39,2.97 -0.63,2.32 -1.45,2.74 -0.3,0.22 -0.34,0.82 -0.13,1.52 -1.2,2.48 -1.7,1.4 -0.73,2 0.71,1.94 0.47,3.18 1.73,3.06 -0.04,0.52 -0.76,1.4 -0.13,6.36 -1.15,2.45 -0.26,1.06 -0.05,1.92 0,0 -1.28,-0.66 -0.61,-0.82 -0.82,-0.45 -0.99,-0.29 -1.78,0.2 -0.71,-0.18 -1.35,-2 -0.99,-2.86 -2.13,-1.62 -0.14,-1.65 1.64,-1.81 -0.08,-0.53 -3.88,-1.95 -0.62,-1.05 -0.06,-1.66 -0.75,-1.59 -0.94,-0.69 -2.08,-0.28 -0.2,-0.42 0.26,-0.71 2.63,-2.54 -0.37,-1.31 0.73,-2.68 0.69,-1.43 0.57,-0.55 1.34,-0.54 3.39,-0.35 -0.39,-1.35 0.64,-3.25 -0.08,-1.76 -1.8,-1.21 -4.27,0.94 -2.15,1.34 -2.27,-3.02 -0.91,-0.85 -3,-4.15 -0.88,0.07 -0.84,-1.44 0.61,-1.19 -0.11,-0.88 -0.25,-0.34 -1.37,-0.24 -0.42,0.27 -1.93,-1.33 0.18,-0.71 1.76,-0.66 1.75,-2.04 0.25,-1.59 -0.28,-1 0.31,-2.36 1.77,-6.16 0.01,-0.43 -0.68,-1.14 -0.23,-1.08 0.21,-3.72 -0.64,-1.5 -0.47,-3.49 -0.84,-1.03 -3.4,-1.44 -1.22,-0.02 -0.28,-0.32 -0.08,-1.03 -0.59,-0.69 -1.74,-0.29 -0.96,0.52 -1.4,-0.09 -2.78,-1.51 -0.86,-0.06 -1.96,0.53 -2.62,1.85 -0.53,0.64 0,0 -0.49,-0.08 14.71,-11.83 2.35,0.23 1.17,-0.92 1.55,-2.17 0.43,-1.15 1.55,-1.17 0.62,-2.88 1.12,-0.46 2.44,-2.32 0.47,-1.21 0.29,-1.9 1.6,-4.69 1.96,-1.54 1.48,-1.76 0.83,-1.45 0.46,-1.28 -0.18,-1.82 0.79,-0.81 -1.04,-1.58 3.68,-3.09 -0.13,-1.64 0.5,-2.38 1.74,-1.57 0.36,-0.71 0.9,-3.02 0.08,-1.61 -0.43,-0.53 -0.99,0.16 -0.27,-0.49 0.05,-0.62 1.14,-0.15 0.57,-0.74 0.71,-4.39 -0.16,-1.38 0.47,-1.03 0.77,-0.45 0,0 0.63,0 0.24,-0.24 -0.06,-0.54 0.34,-0.749996 0.58,-0.53 1.34,0.98 0.45,1.839996 1.19,0.12 0.77,-1.36 0.61,2.93 0.99,0.04 0.29,-0.49 0.07,-0.94 0.85,-0.04 1.69,0.53 0.5,0.69 -1.43,1.7 0.67,0.7 0.02,0.55 1.21,-2.04 0.49,-1.54 0.45,0 0.4,1.02 0,0.58 -0.87,0.92 -0.27,0.99 0.08,2.71 0.26,0.33 0.47,0.12 0.58,-0.14 0.96,-0.93 -0.47,-1 0.14,-0.6 1.32,-1.43 1.05,-0.25 2.13,0.59 1.5,-1.11 0.05,0.92 -0.36,0.21 -1.13,1.53 0.59,0.58 0.1,-0.37 1.25,-0.6 0.58,0.79 -0.14,1.21 1.63,1.75 0.86,-0.44 1.58,0.67 0.77,2.4 -0.11,0.95 -2.19,2.73 -0.38,0.89 0.1,0.66 0.6,-1.03 1.75,-1.68 0.83,-0.03 0.87,0.81 0.52,1.89 -0.27,1.23 -0.97,0.19 -1.03,0.91 -1.16,1.49 0.07,0.77 -1.16,2.35 -0.62,3.52 0.21,0.34 0.87,0.23 z m 0.52,0.45 -0.06,-0.79 0.53,-1.53 -0.41,-1.07 0.13,-0.66 0.91,-1.24 0.55,-0.19 0.05,2.35 -0.22,1.34 -0.8,0.6 -0.68,1.19 z m -6.3,-25.76 -0.44,-0.46 -0.08,-0.6 0.8,-1.12 0.84,-0.03 0.68,0.42 0.1,0.34 -0.19,0.36 -1.71,1.09 z m 3.5,4.18 -0.29,-0.3 0.06,-0.53 1.06,-0.89 0.48,0.07 0.5,0.85 -0.14,0.61 -0.4,-0.17 -1.27,0.36 z m -14.16,-4.81 -0.21,-0.05 0.95,-3.579996 0.3,0.09 0.03,0.23 -0.41,3.059996 -0.66,0.25 z"},{"uf":"MT","name":"Mato Grosso","path":"m 207.22257,296.31114 1.47,-1.43 4.11,-2.57 0.52,-2.45 1.43,-3.78 0.93,-1.08 1.64,-0.53 0.43,-0.41 0.58,-0.84 0.52,-2.25 1.66,-2.01 0.56,-2.24 0.07,-1.71 -0.58,-1.49 0.04,-2.05 -1.53,-3.34 -0.9,0.03 -0.58,-0.51 -0.43,-3.25 0.14,-1.32 1.36,-1.08 1.4,-1.75 0.17,-0.75 -1.41,-3.59 -1.07,-0.43 -1.11,-0.11 -3.5,0.09 -1.22,-1.11 0.24,-0.56 -17.16,-0.05 0.9,-9 -1.5,-2.75 -0.27,-1.76 0.03,-0.8 1,-3.52 -0.38,-1.93 0.94,-1.67 -0.83,-2.27 -0.15,-1.39 -0.26,-0.61 -0.78,-0.47 -0.06,-0.35 1.29,-4.99 0.76,-1.42 -0.6,-1.24 -1.4,-0.97 0,0 47.85,-0.32 1.21,-0.73 1.18,-5.22 1.38,-4.22 -0.46,-1.94 -0.66,-1.37 -0.1,-0.85 0.42,-0.85 0.86,-0.64 1.2,-1.82 0.27,-1.01 -0.34,-0.84 0.06,-0.76 0.2,-0.61 1.18,-1.2 0,0 1.17,1.08 2.45,4.06 0.4,1.76 1.37,3.96 1.32,1.93 0.77,1.62 -0.23,2.44 0.48,2.4 0.73,2.2 1.53,1.11 3,2.75 3.38,1.7 0.23,0.94 -0.04,1.1 0.23,0.49 0.95,0.4 0.82,-0.17 1.63,0.45 0.54,0.72 0.2,1.08 0.35,0.32 1.37,-0.45 3.69,1.49 34.04,2.42 62.97,3.48 0,0 -0.65,1.02 -0.56,1.89 -1.1,1.25 -0.44,3.14 -0.43,0.85 -0.37,0.27 -1.94,5.29 -0.54,2.97 -0.04,2.95 -1.88,5.99 0.06,0.86 1.39,1.34 -0.16,0.87 -0.82,0.89 -0.05,0.5 1.1,2.25 -0.47,3.31 0.01,1.57 0.52,0.58 0.44,3.05 -0.74,2.76 0.98,3.34 0.96,0.51 0.8,0.02 0,0 0.08,0.63 -0.27,1.13 -0.97,0.86 -0.35,0.9 0.16,2.72 -0.39,1.07 -2,3.17 -1.03,2.63 -1.21,0.78 0.12,5.18 -1.6,3.09 -0.58,2.74 0.48,1.14 0.01,0.8 -1.17,2.87 -0.84,2.93 -1.39,1.43 -1.21,0.73 -1.23,-0.68 -1.07,0.26 -1.65,1.01 -1.92,1.94 -0.38,0.74 -0.64,4.1 -0.71,0.96 -1.98,4.19 -0.32,0.28 -2.72,0.86 -2.65,0.13 -1.4,2.62 -1.75,0.97 -0.08,1.54 -0.82,1.43 -1.28,1.04 -0.5,1.01 -0.33,1.95 -1.25,2.02 -1.92,1.77 -2.02,0.84 -0.7,0.77 -0.38,2.91 -2.55,3.85 -0.4,3.41 0.16,0.71 1.41,2.19 0.18,3.43 0.95,2.2 0,0 -1.55,0.31 -1.17,-0.57 -0.87,-0.08 -2.66,0.08 -0.57,0.57 -4.62,-0.27 -1.74,-1.27 -1.3,-0.11 -0.15,-0.53 0.19,-0.46 1.66,-2.83 1.8,-0.7 1.23,-6.61 -1.34,0.13 -5.62,6.01 -1.01,-0.06 -2.13,0.88 -0.99,-0.04 -0.24,-0.25 -0.3,-1.37 -1.59,-1.04 -2.44,-0.07 -1.43,0.61 -0.49,0.85 -1.26,0.8 -4.52,0.63 -1.24,-0.57 -1.26,-1.11 -3.03,-1.16 -0.78,-1.02 -0.27,-0.86 -0.65,-0.35 -2.62,-0.47 -2.79,-1.25 -0.76,-1.15 -1.27,-0.2 -2.02,0.49 -1.35,1.25 -1.66,0.51 -0.77,-0.34 -1.56,0.22 -2.59,-0.03 -1.4,1.45 -0.09,1.17 -2.02,2.95 -2.05,2 -5.62,1.97 -2.15,-1.52 -1.02,-1.1 -0.7,-0.2 0,0 -0.66,-0.67 -0.32,-0.8 0.54,-0.71 -2.44,-2.15 -1.28,0.63 -0.52,-0.05 -1.17,-0.68 -0.45,-0.7 -2.02,-1.41 -1.89,-0.76 -0.3,-0.32 -0.3,-1.12 -0.23,-2.93 -0.61,-1.77 -0.19,-3.66 0.88,-1.64 1.14,-1.09 0.34,-1.78 -0.05,-1.89 -0.96,0.06 -0.4,0.6 -0.38,0.16 -26.86,-1.08 -1.05,-12.65 -5.37,-6.13 4.88,-0.06 -0.35,-7.55 -2.64,-5.32 -0.49,-1.97 0.26,-1.06 0.61,-0.55 0.65,-1.28 -1.44,-2.93 -3.11,-1.04 z"},{"uf":"MS","name":"Mato Grosso do Sul","path":"m 359.21257,400.07114 -0.4,2.46 -0.28,0.4 -1.5,0.78 -1.32,0.04 -0.47,0.22 -1.22,1.03 -1.99,2.68 -0.73,0.65 -1.01,0.3 -0.62,1.68 -0.16,2.93 -2.59,3.64 -0.96,0.52 -0.23,0.38 0.31,1.93 -0.08,0.95 -1.21,2.34 -2,2.26 0.35,0.85 -0.28,1.21 -1.44,1.03 -0.4,1.21 -1.73,1.69 -1.26,2.44 -1.95,1.87 -7.56,4.53 -1.26,1.14 -0.74,1.54 -0.84,1.08 0,0 -5.41,2.27 -1.11,0.82 -0.93,2.33 0.02,1.15 -1.45,3.56 -0.67,0.68 -1.66,1.01 -1.11,0.32 -0.33,0.35 -1.57,7.92 -0.36,0.82 -2.38,1.56 0,0 -2.55,-2.33 -3.41,-1.89 -3.99,1.97 -0.68,0.75 -1.66,0.49 -2.58,0.43 -2.36,-0.46 -1.01,-0.65 -0.47,-4.27 -0.32,-0.7 -0.9,-0.95 -0.23,-2.47 0.51,-1.34 -0.64,-0.79 -0.09,-0.44 0,-2.87 -0.89,-1.97 -0.6,-2.74 -0.05,-0.72 0.59,-1.36 0.02,-1.61 -1.57,-1.09 -0.38,-0.8 -0.16,-2.16 -1.65,-1.82 -2.17,-0.26 -1.51,0.31 -1.83,-0.29 -2.46,-1.96 -0.56,-1.49 -1.54,0.33 -2.17,2.74 -1,-0.6 -1.72,0.81 -1.08,0.16 -1.74,-0.69 -2.56,-0.49 -3.46,0.23 -3.66,-0.71 -0.48,-0.91 -1.99,-0.13 -0.89,0.52 -2.5,-0.88 0.91,-7.27 -0.43,-2.38 0.6,-1.42 0.98,-1.46 0.6,-6.03 -0.66,-2.33 -0.05,-1.73 -0.76,-0.96 -0.43,-0.09 -0.49,0.65 -0.64,-3.26 -0.79,-1.87 -1.21,-2.02 -0.35,-1.83 4.03,-2.3 0.76,-0.88 -4.2,-3.86 5.38,-11.42 1.12,-0.06 -0.28,-2.13 -0.74,-0.13 3.23,-10.33 0.66,-1.16 -3.09,-5.85 0.03,-1.91 0,0 0.7,0.2 1.02,1.1 2.15,1.52 5.62,-1.97 2.05,-2 2.02,-2.95 0.09,-1.17 1.4,-1.45 2.59,0.03 1.56,-0.22 0.77,0.34 1.66,-0.51 1.35,-1.25 2.02,-0.49 1.27,0.2 0.76,1.15 2.79,1.25 2.62,0.47 0.65,0.35 0.27,0.86 0.78,1.02 3.03,1.16 1.26,1.11 1.24,0.57 4.52,-0.63 1.26,-0.8 0.49,-0.85 1.43,-0.61 2.44,0.07 1.59,1.04 0.3,1.37 0.24,0.25 0.99,0.04 2.13,-0.88 1.01,0.06 5.62,-6.01 1.34,-0.13 -1.23,6.61 -1.8,0.7 -1.66,2.83 -0.19,0.46 0.15,0.53 1.3,0.11 1.74,1.27 4.62,0.27 0.57,-0.57 2.66,-0.08 0.87,0.08 1.17,0.57 1.55,-0.31 0,0 0.19,1.77 -0.26,2.58 0.23,1.11 0.28,0.41 0.66,0.19 1.14,-0.67 2.25,0.9 0.08,0.42 -1.31,1.76 -0.57,1.17 -0.26,0.84 0.13,0.33 3.8,0.7 2.78,-0.16 2.7,1.68 1.14,0.17 1.44,0.71 0.67,0.61 3.07,1.56 0.68,0.85 3.35,1.34 1.49,0.04 1.9,0.43 1.62,1.55 3.15,0.61 2.66,2.24 0.24,0.45 0,0 -0.58,0.25 -0.99,4.18 0.59,3.21 z"},{"uf":"MG","name":"Minas Gerais","path":"m 527.76257,365.59114 -0.91,-0.55 -2.54,-0.81 -1.58,0.08 -1.08,0.32 -0.84,0.61 -2.18,0.29 -1.34,-0.13 1.67,2.27 -0.02,0.81 -1.13,-0.11 -1.05,-0.74 -0.31,0.02 -2.17,1.31 -1.17,1.93 0.3,0.7 1.33,0.67 0.52,0.66 -0.03,1.92 -0.3,1.54 0.21,0.41 1.31,0.35 0.17,1.72 -0.32,0.42 -0.95,0.24 -0.97,-0.03 -0.8,-0.35 -1.48,0.09 -0.43,0.55 0.49,0.71 0.76,0.28 0.45,-0.29 0.52,0.09 1.1,1.27 1.27,2.81 0.29,2.43 -0.54,2.97 -1.71,2.09 -1.24,0.86 -0.26,0.44 -0.24,1.72 -0.88,2.29 -1.11,1.27 -0.97,3.24 -0.55,0.32 -5.15,-0.03 -1.72,2.06 -0.16,0.42 0.59,3.12 -0.57,1.3 -0.44,2.34 0.29,0.14 0,0 -2.53,2.35 -1.24,0.27 -0.56,0.5 0.74,0.7 -2.36,6.05 -1.9,3.71 -0.09,0.75 1.44,0.13 0.29,0.61 -0.21,0.52 -2.53,0.98 -9.51,4.53 -1.37,0.2 0.02,-0.46 -0.49,-0.17 -2.53,-0.27 -0.57,0.06 -1.62,0.94 -1.25,0.16 -3.2,0.08 -0.36,-0.32 -0.51,0.08 -4.1,1.78 -1.05,0.77 -1.71,0.77 -0.5,-0.28 -2.59,0.17 -2.91,1.34 -2.42,0.74 -0.68,0.49 0,0 -1.25,0.73 -2.2,0.22 -1.93,1.02 -1.23,1.24 -1.79,0.67 -2.38,0.25 -2.34,-0.08 -0.01,-0.49 0.35,-0.49 -0.09,-0.35 -1.19,0.33 -0.18,2.3 0.24,0.23 -0.05,0.84 -0.75,0.98 -1.3,0.32 -0.57,-0.43 -3.61,1 -0.19,-0.53 -2.01,0.24 -1.12,-0.25 -2.03,-3.31 1.22,-0.71 -0.52,-1.71 -1.8,-0.83 -1.79,-1.23 -0.71,-1.61 0.53,-1.56 0.19,-3.45 -0.26,-2.94 1.86,-2.72 0.7,-2.18 0.05,-1.27 -0.23,-0.37 -3.7,-1.32 -1,0.05 -0.28,0.36 -0.78,0.31 -1.61,0.05 0.03,-0.85 -0.83,-1.99 -1.3,-1.79 -0.37,-2.21 -0.31,-0.62 -0.79,-0.74 0.19,-1.94 1.52,-2.03 0.06,-0.56 -0.4,-1.55 -1.88,-1.21 -0.58,-0.61 0.29,-2.37 0.57,-1.01 -0.2,-1.04 -3.27,-3.35 -1.3,0.29 -0.85,0.64 -1.65,-0.78 -2.38,0.11 -0.31,0.61 0.2,0.46 -0.44,0.99 -2.78,0.68 -1.11,-0.43 -1.51,-1.45 -1.01,1.25 -8.18,0.68 -0.46,0.48 -0.48,1.19 0.27,2.54 -0.41,0.44 -1.19,-0.52 -0.01,-2.78 -0.25,-0.96 -0.36,-0.39 -0.56,-0.05 -0.26,0.19 -0.41,1.13 -0.67,0.94 -0.54,0.32 -0.62,-0.02 -1.21,-2.1 -0.33,-1.42 0.14,-0.91 -1.68,-0.79 -2.18,-1.42 -1.99,0.59 -1.62,-0.22 -1.67,0.35 -4.29,-0.96 -2.55,-0.08 -1.73,-1.55 -0.75,-0.14 -1.5,0.61 -1.43,1.69 -1.92,0.37 -2.15,1.11 -1.22,1.13 0,0 0.31,-2.62 -0.59,-3.21 0.99,-4.18 0.58,-0.25 0,0 0.86,0.46 0.36,-0.23 0.01,-0.34 -0.56,-0.61 0.57,-1.9 1.64,-2.1 0.94,-0.74 0.45,-0.14 0.84,0.16 0.82,-0.28 0.84,-1.3 -0.06,-1 1.21,-2.46 1.41,-2.1 2.23,-0.54 2.48,-0.96 3.71,0.62 3.19,-1.64 1.52,0.3 1.31,1.42 0.33,0 2.91,-2.92 4.13,-2.64 2.01,0.89 3.86,-0.16 1.48,0.28 1.75,-0.01 0.58,-0.09 0.55,-0.48 4.35,1.86 0.7,0.77 4.89,-2.74 0.48,-1.12 0.86,-0.9 1.16,-0.2 3.09,-2.06 -1.19,-3.46 0.51,-1.89 0.73,-0.9 0.17,-0.71 -0.18,-1 -0.47,-0.61 -1.58,-0.57 -0.9,0.47 -1.09,-1.11 0.43,-2.14 3.24,-3.01 2.32,-2.71 0,-0.6 -1.65,-4.56 -1.42,-1.03 -0.85,-0.34 -0.85,-1.21 0.41,-1.47 1.04,-1.25 0.68,-1.59 -0.31,-1.57 0.53,-1.52 1.27,-0.12 2.29,-1.51 3.36,-0.9 0.53,-0.53 -0.69,-4.26 -0.53,-0.19 -0.42,-0.61 -0.04,-1.9 0.73,-0.7 0.57,-0.94 -0.49,-1.16 -0.72,-0.1 0.72,-3.18 0.37,-0.28 1.17,-0.23 2.78,1.14 0.4,-0.13 0.57,-0.54 -0.58,-3.77 1.17,-1.49 2.42,1.48 0.9,1.76 3.23,0.34 1,-1.01 0,0 0.51,2.41 -1.43,3.44 0.4,0.23 1.34,-0.91 0.7,-1 0.72,-0.13 2.13,0.38 1.04,-0.77 1.85,-2.57 0.99,0.15 1.43,-0.53 1.81,-1.55 0.95,-1.17 2.02,-0.41 3.37,-1.86 0.64,-1.11 4.27,-3.03 3.82,-1.58 1.8,0.09 1.2,0.5 2.18,0.03 2.28,0.53 0.85,0.46 -1.29,2.74 -0.15,0.89 0.26,1.49 0.61,0.5 5.33,1.46 0.64,-0.17 0.81,-1.12 1.88,-0.89 1.77,-0.26 2.73,0.75 1.1,0.54 4.35,3.64 0.98,-0.18 2.17,1.62 2.53,1.22 0.93,0.22 0.51,-0.21 1.53,1.24 4.39,-1.23 0.38,0.18 6.52,6.2 0.44,3.96 0.57,-0.21 2.61,0.45 1.47,-0.5 1.32,-0.99 1.99,0.15 2.73,0.56 2.26,1.08 2.19,0.61 2.12,-0.03 2.83,2.47 0.73,0.38 0.89,0.07 0.78,1.02 0.42,1.17 -1.47,3.08 -4.96,4.22 -0.15,2.65 0.56,1.02 0,0.42 -1.02,0.71 -2.48,-0.24 -0.82,0.88 -0.82,3.3 -0.53,4.4 0.22,0.25 0.35,-0.19 0.2,-0.45 0.64,-0.24 0.58,1.23 -0.22,1.51 0.15,0.51 4.14,3.06 0.53,1.04 0.01,0.53 -0.68,1.35 z"},{"uf":"PA","name":"Pará","path":"m 371.29257,235.50114 -62.97,-3.48 -34.04,-2.42 -3.69,-1.49 -1.37,0.45 -0.35,-0.31 -0.2,-1.09 -0.55,-0.72 -1.63,-0.45 -0.82,0.17 -0.95,-0.39 -0.23,-0.5 0.04,-1.1 -0.23,-0.94 -3.38,-1.7 -3,-2.76 -1.54,-1.11 -0.72,-2.2 -0.48,-2.39 0.23,-2.44 -0.77,-1.63 -1.33,-1.93 -1.37,-3.95 -0.39,-1.76 -2.45,-4.06 -1.18,-1.08 0,0 -0.57,-0.56 -0.15,-1.96 -0.64,-1.26 -1.59,-1.56 -1.07,-0.58 -0.37,-0.57 -0.83,-2.34 0.03,-1.13 0.58,-0.97 1.45,-1.13 0.78,-1.31 29.9,-64.24 -1.81,-1.67 0.13,-0.78 -0.19,-0.48 -1.39,0.35 -0.85,0.61 -1.87,-0.78 -1.1,-2.17 -2.69,-1.45 -1.27,-1.34 -0.08,-0.6 -1.32,-0.82 -1.37,-0.15 -2.25,-0.65 -2.38,-1.31 -1.88,-0.67 -1.35,-1.09 -0.63,-0.9 -4.58,-2.54 -4.64,-3.769996 -0.3,-0.44 -0.04,-0.93 -0.55,-1.83 -1.84,-1.23 -0.7,0.19 -0.36,-0.2 -1.83,-1.98 0.05,-2.11 0.35,-0.69 -0.18,-0.41 -1.69,-0.85 -0.24,-0.68 -0.18,-2.27 0.43,-1.45 -0.4,-4.86 0,0 -1.59,-16.97 0,0 0.75,0.32 0.43,0.58 -0.02,0.48 0.45,0.4 0.92,0.28 1.37,-0.71 0.47,-0.81 2.71,0.23 0.81,-1.05 -0.54,-1.81 1.79,-0.36 1.41,-1.63 2.64,1.01 1.88,0.03 0.54,-1.52 3.33,-1.62 1.97,0.39 1.16,-0.11 0.49,-0.25 1.2,-1.48 0.4,-1.4 1.46,-1.1 0.86,-0.11 0.65,0.46 2.11,-1.13 0.41,0.11 0.37,0.99 0.73,0.45 2.03,0.48 1.61,0.25 0.56,-0.6 1.67,-0.39 0.78,0.28 0.82,-0.01 0.86,-0.34 2.24,0.3 4.67,1.38 0.96,-0.14 1,-0.87 -0.03,-2.28 -2.07,-2.5 -1.24,-0.63 0.49,-1.68 1.31,-1.45 0.28,-1.11 0.31,-0.17 0.71,0.19 0.83,0.76 2.35,1.11 11.62,-2.33 1.57,1.69 1.02,0.06 0.44,-0.29 0,0 0.62,0.57 0.37,2.3 -0.62,1.3 -0.25,4.54 0.24,1.44 0.31,0.54 1.17,0.02 1.08,-0.29 3.39,0.37 1.29,0.49 1.93,1.05 0.67,0.8 0.49,1.28 1.19,0.12 1.14,0.84 0.8,0.98 0.84,0.27 1.33,-0.14 0.38,-0.42 0.94,-0.14 2.84,2.66 0.68,-0.03 0.49,1.18 -0.68,0.23 -0.19,0.72 0.76,2.83 2.02,2.26 2.57,0.73 0.17,0.33 -0.43,3.14 0.19,2.11 0.67,1.51 0.62,0.56 0.59,1.81 -0.13,1.58 1.5,3.48 0.82,0.19 0.78,-0.36 2.93,3.28 -0.08,2.43 0.41,0.94 0.95,0.19 0.33,0.47 0.31,1.58 -0.21,0.69 0.11,1.3 1.87,1.39 0.43,1.5 1.45,1.03 2.79,0.679996 1.3,-0.12 0.77,-0.339996 0.94,0.06 0,0 -0.53,0.739996 0.29,1.59 -0.17,0.53 -1.29,1.11 -1.39,0.17 -0.5,-0.18 -0.84,-0.79 -0.66,-0.15 -3.38,1.58 -0.37,0.54 -1.6,0.72 -0.63,-0.02 -1.55,0.59 0.04,0.58 6.46,-1.06 0.88,0.66 0.13,0.46 0,0.66 -0.62,0.5 0.3,0.36 0.63,-0.2 0.86,-1 1.02,-0.01 0.53,-0.27 0.6,0.12 1.07,-0.42 1.14,-0.57 3.28,-2.34 1.5,-0.35 1.84,-0.81 3.16,-1.84 0.54,-0.999996 0.67,-0.52 2.09,-1.01 0.66,-0.72 -0.25,-0.67 0.21,-0.41 1.13,-0.28 1.09,0.06 0.41,0.21 0.38,3.799996 -0.52,2.58 0.33,1.62 0.81,1.6 1.31,1.35 0.3,1.64 -0.12,0.47 -1.84,1.84 -0.47,0.13 -0.87,-0.52 -1.82,-0.52 -1.26,-0.31 -0.93,0.14 -2.13,-1.04 -0.26,-1.12 -0.88,-0.53 -2.28,3.82 -0.61,2.37 0.68,2.97 0.48,0.64 0.92,0.62 -1.01,-1.14 -0.43,-2.69 0.12,-0.52 2.57,-4.22 2.31,1.18 0.11,0.45 2.53,2.45 -0.25,2.02 -0.74,0.55 0.4,2.33 0.52,1.13 1.12,0.75 0.74,0.15 0.52,0.49 -0.34,-0.64 -0.77,-0.24 -1.2,-1.04 -0.22,-0.68 0.34,-4.2 0.82,-1.19 1.43,0.73 0.83,1.2 -0.09,0.79 1.2,0.86 0.25,-0.29 -1,-1.26 -0.92,-2.1 0,-0.44 2.26,-2.32 1.62,0.09 1.93,0.64 0.34,0.56 -0.61,0.59 0.32,0.28 0.48,0.03 1.03,-0.17 1.33,-0.9 4.09,-0.96 0.77,0.2 1.74,1.06 3.17,-0.42 1.07,-0.41 1.02,-1.01 0.98,-0.59 1.74,-0.51 0.77,0.07 0.06,0.75 -2.04,4.02 -0.24,1.5 -0.46,1.07 -0.83,1.03 -0.01,0.88 0.58,1.42 -0.32,2.47 0.88,-1.19 0.01,-1.4 1.54,-3 1.13,-3.19 1.12,-1.56 0.27,-0.27 0.76,-0.05 0.58,-0.35 1.82,-0.23 0.88,-1.35 1.51,-1.69 1.36,-2.26 0.52,-0.46 0.79,0.49 0.62,-0.46 1.62,2.34 1.19,0.59 -0.05,-0.74 -0.35,-0.75 0.62,-1.01 3.51,-0.51 -1.03,-0.32 -3.51,0.46 -0.31,-0.21 0.29,-2.43 0.51,-0.29 0.67,0.38 1.02,0.11 1.07,-3.099996 -0.68,-1.39 0.03,-0.68 1.17,-1.81 2.84,-2.48 0.36,-0.08 1.11,1.14 2.93,-2.09 0.46,-0.07 0.4,0.45 0.1,0.57 -0.32,0.67 1.07,-0.16 0.81,-0.58 0.36,-0.78 0.63,-0.19 0.28,0.15 0.74,1.39 1.33,1.2 0.2,-0.56 -0.11,-0.38 -0.96,-0.49 -0.14,-0.29 -0.13,-1.2 0.17,-0.42 0.44,-0.19 2.28,0.26 1.18,0.65 0.62,1.02 1.63,0.71 1.65,-0.78 0.53,2.14 -0.5,0.31 -0.03,0.59 0.92,-0.52 1.16,-2.35 0.38,0.23 -0.23,1.33 0.41,0.44 2.51,-0.26 0.45,0.65 0.46,1.68 -0.6,0.95 0.85,-0.5 0.26,0.37 1.89,0.14 3.53,-1.24 -0.31,1.58 -0.75,1.829996 1.47,-0.489996 0.59,-0.62 0.63,1.619996 0,0 -0.77,0.45 -0.47,1.03 0.16,1.38 -0.71,4.39 -0.57,0.74 -1.14,0.15 -0.05,0.62 0.27,0.49 0.99,-0.16 0.43,0.53 -0.08,1.61 -0.9,3.02 -0.36,0.71 -1.74,1.57 -0.5,2.38 0.13,1.64 -3.68,3.09 1.04,1.58 -0.79,0.81 0.18,1.82 -0.46,1.28 -0.83,1.45 -1.48,1.76 -1.96,1.54 -1.6,4.69 -0.29,1.9 -0.47,1.21 -2.44,2.32 -1.12,0.46 -0.62,2.88 -1.55,1.17 -0.43,1.15 -1.55,2.17 -1.17,0.92 -2.35,-0.23 -14.71,11.83 0.49,0.08 0,0 2.29,0.81 1.87,-0.24 1.29,0.12 1.02,1.66 0.39,0.31 0.87,0.14 1.26,1.17 -0.04,0.63 -0.37,0.67 -0.72,0.37 -0.97,0.07 -0.29,0.28 0.09,1.41 1.01,1.34 -0.92,2.75 -0.64,0.48 -1.46,0.46 -0.25,0.46 0.29,1.2 -0.19,1.34 -1.3,0.15 -1.51,1.34 -0.85,1.27 0.15,1.51 -0.24,0.5 -2.5,1.2 -3.41,1.14 -2.47,1.78 -0.19,0.35 0.43,2.19 0.06,2.67 -1.28,2.1 -1.41,1.68 -0.15,0.57 0.17,0.88 0.59,0.96 1.67,1.74 0.75,0.32 0.15,0.3 -0.66,4.04 -1.76,5.15 -1.08,0.81 -1.7,3.24 -0.18,0.99 -0.94,1.54 -0.74,0.85 -1.05,0.16 -1.37,0.92 -1.03,1.92 -1.21,1.68 -1.18,1.09 -1.15,1.58 -1.13,4.46 -1.6,3.66 z m 21.16,-130.31 -4.52,1.96 -3.39,0.52 -2.02,-0.31 -0.65,1.13 -1.84,1.19 -0.72,-0.61 -0.61,-1.53 -0.23,0.28 0.42,1.23 -0.34,0.81 -0.71,0.41 -3.77,-1.64 -0.8,0.72 -4.19,1.26 -3.2,-0.57 -0.81,-0.61 -0.24,-1.85 -0.23,-0.41 -1.11,-1.02 -1.06,-1.6 -0.21,-1.78 0.52,-2.75 0.62,-0.379996 1.76,0.359996 0.93,-0.749996 0.08,-0.56 -1.3,0.43 -1.22,-0.13 -0.94,-0.71 -0.18,-1.05 0.34,-5.08 0.73,-0.76 0.35,0.75 1.76,0.6 0.55,-0.06 -0.46,-0.42 -1.27,-0.22 -0.9,-2.16 0.36,-1.68 0.89,-1.97 1.33,-1.33 0.96,-0.57 1.34,-0.49 1.32,-0.13 3.46,0.52 7.21,1.77 3.7,-0.46 0.11,-0.3 1.14,-0.62 2.16,-0.37 2.89,0.29 2.8,0.82 6.48,0.85 0.63,0.47 -0.05,1.23 -0.7,0.74 -0.68,1.5 -0.36,2.65 -0.86,3.3 -1.29,0.68 -0.35,0.69 0.23,1.19 -1.98,2.579996 -1.39,3.5 -0.49,0.45 z m -47.21,-0.17 -0.75,-0.51 1.1,-2.25 -0.09,-1.79 0.25,-0.21 2.33,-0.479996 0.9,-0.86 0.15,-0.5 -0.2,-2.34 0.86,-2.58 1.26,-1.49 2.29,-1.47 2.87,-0.2 0.72,2.36 -1.1,2.19 -0.85,3.04 -1.1,0.67 -1.34,2.029996 -0.78,0.72 -4.94,3.31 -1.58,0.36 z m 28.48,-22.899996 -1.03,-0.25 -2.45,0.08 -0.79,-0.16 -0.29,-0.26 -0.38,-1.09 0.01,-1.24 1.51,-0.42 1.89,0.04 2.19,-1.29 4.81,-0.6 0.77,0.26 0.68,0.68 -0.18,1.02 -2.56,1.39 -1.78,2.48 -1.1,0.5 -1.3,-1.14 z m 4.79,0 1.86,-1.2 1.98,0.03 1.65,0.62 0.53,0.99 0.05,0.62 -0.88,0.77 -2.85,0.28 -1.17,0.32 -2.26,-0.89 -0.2,-0.53 1.29,-1.01 z m -16.98,4.39 -0.5,-0.26 -0.61,0.04 -1.54,-0.69 0.21,-1.16 0.64,-0.92 1.92,-0.4 2.36,-0.9 1.32,0.08 0.8,0.68 0.09,0.13 -1.93,1.61 -1.07,0.34 -1.69,1.45 z m 9.42,-9.69 -0.82,-0.3 -0.17,-1.66 0.15,-0.6 1.17,-1.31 2.45,-0.92 0.25,0.12 0.53,0.68 0.04,0.89 -1.95,1.99 -1.65,1.11 z m -13.83,20.22 -0.14,-0.41 0.19,-0.93 1.04,-2.81 2.59,-1.69 0.72,-0.28 0.69,0.14 -0.16,1.79 -1.56,0.44 -1.62,2.19 -1.75,1.56 z m 10.91,-17.57 -1.19,-0.31 -0.3,-0.48 0.88,-0.96 0.71,-3.95 0.89,-1.23 0.29,0.13 0.07,0.32 -0.02,2.48 0.6,1.87 -0.32,0.88 -1.03,0.4 -0.58,0.85 z m -14.81,10.19 -0.27,-0.19 0.12,-0.61 0.55,-0.36 1.19,-1.71 0.76,-1.54 0.73,-0.66 1.45,-0.54 -0.2,1.49 -0.4,1 -1.72,1.66 -2.21,1.46 z m 13.87,-7.03 -0.6,-0.15 -0.84,-0.71 -0.96,-1.64 -0.05,-0.38 0.23,-0.29 0.81,-0.58 1.85,0.84 0.29,0.43 0.24,2.09 -0.97,0.39 z m -5.38,30.559996 -0.65,-0.11 -0.88,-0.52 -0.69,0.46 -0.75,-0.28 -1.68,-1.74 0,-0.61 1.28,-0.01 3.06,1.32 0.31,1.49 z m -21.15,-5.54 0.04,-1.03 -0.2,-0.3 0.6,-0.99 2.36,-0.88 0.78,0.38 0.87,0.86 -0.29,0.35 -1.03,0.47 -2.54,0.41 -0.59,0.73 z m 12.7,-6.69 -0.18,-0.03 0.01,-0.35 0.54,-0.939996 1.79,-1.62 0.42,-1.24 0.05,-1.3 0.24,-0.3 0.32,0.44 0,1.51 -0.89,2.73 -0.62,0.649996 -1.68,0.45 z m 6.3,-9.899996 1.65,-2.96 0.88,-0.21 0.71,0.19 0.27,0.87 -0.58,0.71 -2.93,1.4 z m 31.42,18.969996 -0.84,-0.35 -0.34,-1.06 1.04,-1.72 1.07,-0.33 0.19,0.1 -0.02,0.74 -0.74,2.24 -0.36,0.38 z m -33.48,-19.469996 -0.54,-0.2 0.32,-2.04 1.33,-1.81 0.23,0.04 1.29,0.88 -0.01,0.25 -1.55,0.64 -1.07,2.24 z m 2.23,5.03 0.72,0.03 -0.4,0.45 -0.94,0.31 -0.11,1.12 -0.79,0.71 -1.69,0.84 -0.16,-0.18 0.27,-0.83 0.47,-0.63 1.73,-1.67 0.9,-0.15 z m -22.56,10.209996 -0.55,-0.19 -0.07,-0.35 0.43,-0.4 3.56,-1.6 0.54,0.7 -0.01,0.2 -1.4,0.73 -2.5,0.91 z m 63.53,-4.78 -1.03,-0.19 -0.82,-0.79 0.87,-1.249996 1.34,-0.01 0.19,1.19 -0.1,0.589996 -0.45,0.46 z m -37.25,-18.899996 -2.36,0.7 -0.59,0.01 -0.18,-0.21 1.03,-1.04 1.04,-0.51 1.04,0.17 0.44,0.34 0.15,0.23 -0.15,0.21 -0.42,0.1 z m -5.27,8.59 -0.08,-0.76 0.25,-0.5 2.48,-1.46 -0.9,2 -0.81,0.63 -0.94,0.09 z m 2.14,4.53 -0.45,-0.12 -0.07,-0.23 0.78,-1.5 1.19,0.02 -0.12,1.35 -1.33,0.48 z m 28.04,15.829996 -0.28,-0.23 0.9,-1.6 0.68,-0.4 0.23,0.75 0.51,0.37 -0.26,0.52 -0.43,0.34 -0.63,-0.18 -0.72,0.43 z m -26.66,-23.319996 -0.89,-0.07 0.02,-0.19 2.36,-1.84 0.04,0.96 -0.23,0.63 -0.25,0.34 -1.05,0.17 z m 67.46,10.22 -0.38,-0.53 0.19,-0.76 1.02,-0.91 0.25,0.15 0.23,1.75 -1.31,0.3 z"},{"uf":"PB","name":"Paraíba","path":"m 610.69257,199.41114 -2.5,-2.06 -0.82,-0.26 -2.65,-0.21 -2.31,1.07 -1.48,1.28 -0.45,1.8 -1.9,1.03 -2.01,0.45 -1.14,-0.02 0,0.6 -0.8,0.53 -2.18,0.29 -3.88,-0.26 -1.61,0.88 -0.55,0.64 -1.82,0.1 -0.89,0.69 -0.54,0.76 0.39,0.73 0.01,0.54 -0.4,0.48 -1.78,1.53 -1.34,0.16 -1.65,0.84 -1.6,-0.79 -0.95,-0.94 -0.35,-2.24 0.24,-0.49 -0.18,-0.3 -1.14,-0.32 -0.44,0.29 -1.51,0.25 0.04,-0.45 2.53,-2.64 0.17,-0.43 -0.72,-1.87 -0.04,-0.47 0.37,-0.78 3,-1.07 0.11,-0.3 -0.5,-1.39 -3.5,-1.92 -1.48,0.41 -2.22,1.26 -0.93,1.51 -1.48,0.87 -1.05,0.31 -2.7,1.88 -1.52,1.64 -1.63,0.23 -2.63,0.97 -0.77,-0.33 0.05,-0.68 -0.63,-1.24 -0.38,-0.08 -0.93,0.73 -1.51,0.32 -0.99,-0.33 -1.4,-1.91 -0.4,-0.09 0,0 -0.17,-0.25 1.19,-1.12 1.61,-3.49 -0.34,-1.19 -0.69,-0.08 -1.24,-0.89 0.02,-1.66 -0.35,-0.72 -0.58,-0.29 -0.24,-0.41 0.12,-0.93 0.17,-0.38 1.09,-0.63 0.66,-1.31 -0.52,-1.31 1.03,-3 0.84,-1.15 0.08,-0.54 0,0 0.57,-0.46 1.93,1.64 0.9,0.42 2.88,0.61 1.16,-1.13 3.23,-1.66 0.82,-0.71 0.1,-1.04 0.41,-0.95 3.18,-1.21 1.43,-0.12 3.26,-1.04 0.64,0.08 0.53,0.44 0.01,1.19 -2.99,3.21 -0.44,0.96 -0.38,1.74 -0.41,0.38 -0.85,0.25 -0.21,0.31 -0.08,1.72 3.53,0.52 0.32,0.23 0.31,1.38 0.29,0.23 3.15,-1.26 1.77,-0.08 1.95,0.3 0.89,1.17 -0.52,1.54 0.83,0.74 2.35,-0.93 0.5,-0.74 0.55,-1.21 -0.47,-0.94 -0.16,-1.42 0.48,-0.59 1.01,0.32 -0.53,-1.53 -0.72,-0.78 0.31,-1.48 1.82,-1.35 1.38,-0.05 0.42,0.39 -0.1,1 0.62,0.49 3.42,0.4 0.53,0.35 5.83,-0.39 2.17,0.3 2.46,1.1 1.04,-0.4 3.5,0.21 0.93,-0.24 0,0 0.09,2.4 1.45,4.39 0.06,0.64 -0.18,0.94 -0.37,0.45 -0.03,0.88 0.58,-0.74 0.51,-1.5 0.01,1.98 0.59,1.01 -0.27,5.18 -0.36,0.6 z"},{"uf":"PR","name":"Paraná","path":"m 397.01257,499.66114 -5.24,-0.03 -0.33,0.44 -1.74,0.24 -0.76,-0.07 -0.11,-0.39 -1.57,0.57 -1.35,1.43 -3.35,2.13 -1.44,-0.16 -1.23,-0.62 -3.13,-2.6 -1.03,-0.39 -0.76,-0.01 -2.84,0.73 -2.33,0.17 -0.81,-0.03 -1.42,-0.76 -1.11,0.14 -1.53,0.65 -0.59,1.47 -0.73,0.87 -1.87,0.98 -3.57,-0.41 -2,1.15 -0.72,0.77 -0.69,1.59 0.85,2.99 -0.87,0.86 -0.92,0.02 -0.75,0.38 -0.17,0.49 -1.33,-1.89 -4.25,0.13 -3.76,-0.43 -1.58,-1.18 -0.16,-0.41 -1.03,-0.63 -4.26,-0.36 -5.29,-1.68 -2.34,0.57 -2.69,-0.03 -2.02,-1.41 -0.32,-0.51 -1.06,-0.24 -0.53,-0.01 -0.71,0.37 -3.63,-0.02 0,0 -0.22,-1.21 -2.53,-4.18 0.02,-2.59 -0.99,-2.88 -3.42,-2.37 -1.09,1.13 -2.12,-0.11 -1.1,0.43 -1.07,0.9 -1.46,-1.08 -0.82,0.06 -0.28,-2.2 0.66,-1.57 1.07,-1.27 1.22,-2.18 0.06,-0.34 -0.49,-0.75 0.02,-1.24 0.9,-3.64 1.26,-3.02 -0.25,-2.3 1.28,-2.38 -0.21,-1.02 -0.84,-0.88 -0.31,-1.6 0.66,-1.06 0.79,-0.54 0,0 2.38,-1.56 0.36,-0.82 1.57,-7.92 0.33,-0.35 1.11,-0.32 1.66,-1.01 0.67,-0.68 1.45,-3.56 -0.02,-1.15 0.93,-2.33 1.11,-0.82 5.41,-2.27 0,0 3.26,-2.29 3.83,0.65 4.01,-0.11 3.27,0.29 1.21,-0.62 0.35,-0.6 0.73,-0.37 1.17,0.29 1.48,0.78 2.52,0.46 2.64,1.09 1.31,0.13 1.07,-0.54 2.58,-0.01 0.78,1 1.75,0.84 3.51,0.8 0.63,0.51 0.71,1.32 1.73,0.07 0.42,-0.34 1.65,0.15 0.66,0.54 5.31,0.13 2.97,-0.85 1.13,1.55 3.59,2.83 0.89,1.76 0.01,2.74 -0.39,0.58 -0.16,0.81 0.38,1.84 1.3,1.51 -0.08,1.76 -0.36,0.56 1.49,3 1.21,1.15 0.67,0.28 0.5,0.68 -0.05,0.89 0.92,1.97 0.6,0.29 0.25,0.44 -0.25,1.05 -1.27,2.13 0.32,2.04 0.6,0.38 1.01,0.21 2.38,-0.12 3.42,-0.53 0.5,0.39 1.58,-0.19 1.59,0.13 1.61,1.26 -0.14,0.41 -0.89,0.65 -0.69,3.3 0.35,0.78 1.07,0.53 0.65,-0.85 1.1,-2.76 0.76,-0.17 2.14,0.58 -0.4,1.95 0.73,3.3 1.42,0.58 0.16,1.32 0,0 -1.35,1.02 -0.61,1.48 -0.55,-0.12 0.27,-1.94 1.44,-0.95 -1.41,0.28 -0.89,0.49 -0.87,-0.02 -0.34,-0.39 -0.57,-0.17 -0.54,0.37 -0.28,0.93 0.52,0.8 -0.73,0.96 -0.3,0.1 -2.48,-0.53 -0.79,-0.54 -0.45,0.12 -0.18,0.9 0.34,0.37 1.61,0.56 1.4,-0.25 2.13,0.6 0.27,0.48 -0.97,0.68 -1.54,2.78 -1.24,0.77 -2.42,0.57 -0.2,0.45 2.95,-0.2 0.15,1.19 z"},{"uf":"PE","name":"Pernambuco","path":"m 558.54257,227.45114 -1.22,-3.04 -0.01,-0.94 -2.11,-0.86 -0.5,-0.37 -0.45,-0.83 0.61,-0.89 -0.02,-0.62 -0.45,-0.32 -1,0.01 -0.43,0.44 -0.29,1.74 -0.43,0.15 -0.39,-0.26 -0.54,-1.65 -1.58,-1.15 -2.99,-0.4 -2.36,-0.77 -1.35,-0.81 -0.83,-1.44 -1.49,-0.56 -0.59,0.11 -2.53,1.46 -1.65,0.44 -0.77,2.05 -2.23,0.45 -0.29,0.25 0.25,1.36 -0.17,0.59 -1.1,1.24 -2.39,1.03 -0.64,-0.06 -0.77,-0.53 -0.76,0.17 -0.5,0.87 -0.77,3.57 -2.87,0.88 -0.82,0.92 -0.96,0.23 -1.84,-0.62 0.92,-1.68 -0.26,-2 -2.21,-0.91 -0.72,-1.94 0.06,-2.73 -0.44,-0.51 -2.81,-1.38 -2.2,-0.29 -1.16,0.26 -0.9,-0.4 0,0 2.62,-1.27 1.97,-1.71 0.54,-0.87 2.29,-1.33 0.97,-0.28 3.89,-3.87 0.74,-1.76 0.06,-2.27 -0.29,-0.54 -1.62,-1.58 0.07,-2.19 -0.6,-1.13 -0.06,-0.95 0.11,-0.45 0.52,-0.33 1.79,-0.16 0,0 4.93,0.2 0.89,0.24 1.63,-0.19 2.14,-0.8 1.29,-0.1 3.08,0.42 2.85,1.9 1.83,0.83 0.46,0.99 1.01,1.07 1.36,0.48 0.78,0.57 0.63,1.64 1.65,-0.05 1.54,-2.29 1.07,-0.83 1.59,-0.49 0,0 0.4,0.09 1.4,1.91 0.99,0.33 1.51,-0.32 0.93,-0.73 0.38,0.08 0.63,1.24 -0.05,0.68 0.77,0.33 2.63,-0.97 1.63,-0.23 1.52,-1.64 2.7,-1.88 1.05,-0.31 1.48,-0.87 0.93,-1.51 2.22,-1.26 1.48,-0.41 3.5,1.92 0.5,1.39 -0.11,0.3 -3,1.07 -0.37,0.78 0.04,0.47 0.72,1.87 -0.17,0.43 -2.53,2.64 -0.04,0.45 1.51,-0.25 0.44,-0.29 1.14,0.32 0.18,0.3 -0.24,0.49 0.35,2.24 0.95,0.94 1.6,0.79 1.65,-0.84 1.34,-0.16 1.78,-1.53 0.4,-0.48 -0.01,-0.54 -0.39,-0.73 0.54,-0.76 0.89,-0.69 1.82,-0.1 0.55,-0.64 1.61,-0.88 3.88,0.26 2.18,-0.29 0.8,-0.53 0,-0.6 1.14,0.02 2.01,-0.45 1.9,-1.03 0.45,-1.8 1.48,-1.28 2.31,-1.07 2.65,0.21 0.82,0.26 2.5,2.06 0,0 0.88,0.23 0.55,1.22 -1.27,1.72 -0.11,0.55 0.01,0.48 0.7,0.37 0.27,0.5 0.19,1.06 -1.96,6.38 -3.25,8.95 0,0 -0.27,-0.21 -2.9,-0.27 -1.92,-0.81 -1.47,0.19 -2.56,1.29 -2.24,-0.85 -2,0.24 -1.55,1.24 -0.12,0.45 -2.18,2.29 -1.81,1.11 -1.16,-0.05 -1.86,1.06 -1.17,0.11 -3.14,-0.29 -2.5,0.65 -1.91,-0.48 -1.78,-1.05 -1.9,-2.12 -2.55,-2.02 -1.08,0.12 -1.67,-0.3 -1,-1.22 -0.82,0.6 -0.09,0.69 -2.38,3.29 -2.17,0.76 -0.64,1.09 z"},{"uf":"PI","name":"Piauí","path":"m 505.96257,127.17114 1.31,0.12 0.69,-0.23 2.24,0.51 0.99,0.85 0.32,0.6 0,0 -0.11,0.8 -1.09,1.85 -1.58,1.97 -0.18,1.46 0.29,1.29 1.8,4.72 3.15,6.42 0.44,1.73 1.36,1.59 -0.02,0.76 -0.74,1.36 0.79,3.87 -0.48,1.6 1,2.01 0.6,2.99 -0.59,1.58 -0.8,0.58 0.92,0.69 0.11,0.38 0.94,8.16 -0.24,0.45 0.76,2.57 1.05,5.2 1.01,2.67 1.31,0.65 2.56,0.47 0.77,1.16 -0.01,0.69 -1.5,2.25 -1.14,3.11 0.08,0.97 0.68,0.68 -0.06,1.32 0,0 -1.79,0.16 -0.52,0.33 -0.11,0.45 0.06,0.95 0.6,1.13 -0.07,2.19 1.62,1.58 0.29,0.54 -0.06,2.27 -0.74,1.76 -3.89,3.87 -0.97,0.28 -2.29,1.33 -0.54,0.87 -1.97,1.71 -2.62,1.27 0,0 -0.45,1.16 -1.5,2.3 -1.05,0.67 -0.79,-0.18 -2,0.38 0.11,2.4 -1.86,1.8 -0.32,-0.05 -0.62,-0.62 -2.16,-0.01 -0.82,0.98 -0.77,0.36 -2.73,0.34 -1.51,1.34 -0.82,1.22 -1.7,0.1 -1.48,0.64 -3,0.11 -0.82,-0.28 -0.19,-0.28 0.13,-0.66 -1.71,-0.98 -1.33,-0.39 -1.39,0.55 -2.13,0.43 -0.32,-0.18 -0.41,-0.93 -1.5,-0.46 -1.95,0.02 -3.24,1.65 -0.06,0.93 2.24,4.44 0.12,1.15 -0.29,2.57 -0.25,0.91 -0.72,0.86 -2.95,5.05 -2.97,2.42 -1.35,0.42 -1.48,-0.53 -1.34,-0.17 -2.2,0.75 -1.17,0.89 -0.67,0.87 -1.14,0.38 -0.75,1.45 -0.33,0.21 -2.11,-0.18 -1.8,0.52 -4.18,-1.85 -1.77,-2.49 -0.53,-2.21 -0.66,-1.04 -1.44,-1.34 -2.33,0.02 0,0 -2.94,-0.21 0,0 0.05,-1.92 0.26,-1.06 1.15,-2.45 0.13,-6.36 0.76,-1.4 0.03,-0.51 -1.73,-3.06 -0.47,-3.19 -0.7,-1.94 0.73,-2 1.7,-1.4 1.2,-2.48 0.13,-1.51 0.34,-0.83 0.3,-0.21 1.44,-2.74 0.63,-2.32 0.39,-2.97 0.98,-2.98 2.13,-1.95 2.72,-0.76 2.61,-0.31 1.07,-0.37 1.7,-1.53 1.05,-0.04 1.34,-0.52 2.86,-2.57 2.34,-0.91 2.01,-2 0.63,-0.87 0,-0.46 1.9,-1.92 0.5,-0.22 0.84,-0.24 0.23,0.3 1.12,-0.26 1,-0.6 1.46,-0.19 1.01,0.21 2.51,1.82 1.51,-0.1 2.44,-0.86 0.83,-0.04 0.65,0.28 2.28,-0.29 1.21,-1.31 0.5,-1.46 0.12,-1.21 0.29,-0.44 0.39,-2.2 -0.13,-0.85 -0.17,-0.5 -1.61,-0.91 -1.78,-2.03 -0.51,-2.3 -0.11,-2.11 0.17,-2.48 4.1,-4.43 0.21,-0.55 0.1,-2.43 -0.55,-2.98 -1.58,-2.8 1.14,-2.87 0.28,-1.47 -0.38,-1.27 -1.23,-0.84 -0.35,-1.92 0.77,-1.05 0.64,-0.17 0.82,-1.98 1.89,-1.85 0.88,-1.83 -0.04,-1.79 2.92,-3.41 0.81,0.16 3.31,-0.46 4.13,-3.97 1.79,-2.27 0.39,-1.53 -0.64,-0.53 -0.22,-0.72 0.46,-1.44 0,0 0.73,0.12 1.47,0.87 0.51,0.51 -0.13,0.31 z"},{"uf":"RJ","name":"Rio de Janeiro","path":"m 468.61257,450.54114 -0.07,-0.78 0.38,-0.27 3.19,0.22 2.59,-0.59 -2.53,-1.55 -1.4,-0.5 -2.81,0.68 -1.36,1.6 -1.03,0.32 -0.7,-0.05 -1.35,-2.15 -0.48,0 -0.9,0.42 -0.96,1.06 -3.15,0.8 -0.34,0.91 -0.19,1.9 2.19,0.13 1.07,1.01 -1.15,1.08 -0.94,-0.17 -1.42,0.17 0,0 -0.48,-0.26 -1.63,-1.73 -0.05,-0.41 1.09,-3.5 1.09,-1.15 2.35,-1.01 0.5,0.15 2.77,-0.36 1.5,-0.71 1.65,-2.15 -0.75,-1.64 -1.7,-0.01 -3.15,0.53 -1.77,-0.39 -1.23,-1.59 -0.56,-1.17 -1.27,-0.54 0,0 0.68,-0.49 2.42,-0.74 2.91,-1.34 2.58,-0.17 0.5,0.27 1.72,-0.77 1.05,-0.77 4.09,-1.79 0.52,-0.07 0.36,0.31 3.2,-0.07 1.25,-0.17 1.63,-0.94 0.57,-0.06 2.53,0.27 0.49,0.17 -0.02,0.47 1.38,-0.2 9.51,-4.53 2.53,-0.99 0.21,-0.52 -0.28,-0.61 -1.44,-0.13 0.09,-0.75 1.89,-3.71 2.36,-6.04 -0.73,-0.71 0.56,-0.49 1.24,-0.27 2.53,-2.36 0,0 1.93,0.76 0.67,4.71 2.5,1.13 4.33,1.01 2.99,-0.37 1.62,1.06 0,0 -0.08,1.27 -0.94,1.61 -0.22,2.13 1.14,6.78 -0.5,0.68 -3.08,1.75 -5.97,1.94 -2.83,1.72 -3.5,3.69 -0.11,1.66 0.31,1.19 -0.19,1.62 -0.73,1.48 -1.82,0.51 -6.55,-0.17 -5.79,0.7 -2.39,-0.46 -0.49,-0.38 -0.06,-0.68 1.03,-1.48 0.67,-1.45 -0.09,-0.62 -0.78,-0.18 -2.79,1.15 -0.26,0.69 0.31,0.79 1.38,1.17 0.25,0.97 -0.59,0.52 -1.63,0.51 -1.57,-0.03 -8.04,1.07 -1.46,0.45 z m -5.11,1.99 -0.67,-0.97 2.11,-1.55 1.86,0.94 0.43,0.7 -2.46,0.5 -0.41,-0.35 -0.47,0 -0.39,0.73 z"},{"uf":"RN","name":"Rio Grande do Norte","path":"m 609.55257,183.17114 -0.93,0.24 -3.5,-0.21 -1.04,0.4 -2.46,-1.1 -2.17,-0.3 -5.83,0.39 -0.53,-0.35 -3.42,-0.4 -0.62,-0.49 0.1,-1 -0.42,-0.39 -1.38,0.05 -1.82,1.35 -0.31,1.48 0.72,0.78 0.53,1.53 -1.01,-0.32 -0.48,0.59 0.16,1.42 0.47,0.94 -0.55,1.21 -0.5,0.74 -2.35,0.93 -0.83,-0.74 0.52,-1.54 -0.89,-1.17 -1.95,-0.3 -1.77,0.08 -3.15,1.26 -0.29,-0.23 -0.31,-1.38 -0.32,-0.23 -3.53,-0.52 0.08,-1.72 0.21,-0.31 0.85,-0.25 0.41,-0.38 0.38,-1.74 0.44,-0.96 2.99,-3.21 -0.01,-1.19 -0.53,-0.44 -0.64,-0.08 -3.26,1.04 -1.43,0.12 -3.18,1.21 -0.41,0.95 -0.1,1.04 -0.82,0.71 -3.23,1.66 -1.16,1.13 -2.88,-0.61 -0.9,-0.42 -1.93,-1.64 -0.57,0.46 0,0 -0.66,0.38 -0.64,-0.17 0.34,-1.97 1.41,-2.25 0.84,-0.88 0.51,-0.07 0.78,0.51 1.03,-0.26 0.57,-1.1 1.46,-1.51 1.4,-2.44 -0.15,-0.74 0.65,-1.67 0.87,-0.57 0.84,-1.12 3.3,-6.69 2.61,-2.01 4.89,-1.59 0,0 0.47,0.76 0.86,0.75 3.13,-0.01 1.22,0.41 1.69,1.75 1.32,0.5 3.33,-0.32 2.88,0.52 2.54,-0.24 2.33,-0.73 4.5,0.92 1.27,0.04 1.95,0.86 1.02,0.82 0.64,0.94 2.31,4.74 0.5,1.79 -0.04,0.75 1.48,5.38 0.21,1.68 0.72,0.54 0.96,2.69 z"},{"uf":"RS","name":"Rio Grande do Sul","path":"m 322.25257,638.78114 -0.36,0.01 -1.94,-1.11 -0.2,-0.46 0.52,-4.27 -0.46,-4.25 0.15,-1.07 0.63,-1.24 2.84,-2.38 0.83,-1.56 2.3,-2.56 -1.46,-1.65 -1.07,-0.62 -2.25,-0.6 -2.32,-2.25 -1.21,-1.62 -0.1,-1.59 -0.43,-1.18 -1.23,-2.03 -2.06,-2.24 -0.67,-0.59 -2.39,-1.21 -1.45,0.21 -1.9,-1.51 -1.52,-1.63 -1.25,-0.78 -0.14,-1.7 -1.9,-2.16 -3.32,-0.46 -0.92,-0.47 -1.73,-1.66 -1.76,0.13 -2.17,-1.38 -1.91,-3.71 -1.11,-1.49 -2.53,-2.12 -0.7,0.08 -0.67,1.79 -2.59,2.24 -2.67,0.12 0.1,-2.86 0.4,-1.28 -0.39,-1 -3.65,-4.29 -2.37,-1.77 -2.18,-2.06 -1.75,-2.11 -2.69,-2.21 -1.9,-0.14 -2.15,0.21 -1.14,1.36 -0.06,0.96 -1.03,0.97 -1.11,0.02 -0.58,-0.48 -3.16,0.14 -0.65,-0.48 -0.16,-0.91 -0.49,-0.22 0.85,-0.22 1.04,-0.72 2.52,-2.77 0.11,-1.84 0.6,-1.25 0.82,-0.45 1.29,-0.07 0.64,-0.26 0.92,-1 5.45,-6.48 0.63,-1.42 0.17,-1.11 0.82,-1.07 1.2,-0.85 1.37,-0.41 1.96,-4.22 0.1,-0.61 0.31,-0.37 1.64,-0.86 1.63,-1.8 0.85,-1.15 0.51,-1.29 1.34,-2.1 0.93,-0.29 1.57,0.18 0.55,0.79 0.47,-1.28 -0.21,-0.58 -1.35,-0.82 -0.05,-0.36 0.35,-0.33 1.08,-0.38 0.82,-0.96 2.79,-0.95 1.05,-1.07 0.1,-0.92 0.82,-0.91 2.21,-1.15 2.47,-0.4 1.77,-1.81 0.15,-1.06 1.32,-2.36 0.33,-0.04 0.05,0.36 0.29,0.2 1.33,-0.17 2.44,-1.13 2.68,-0.59 1.21,-0.57 2.1,-2.35 0.5,0.01 0.67,-0.39 1.01,-1.35 2.31,-0.73 0.3,0.38 0,0 3.52,0.39 3.26,-1.15 0.56,-0.81 1.35,0.58 -0.15,0.92 3.08,-0.03 1.63,0.99 2.56,-0.37 1.92,1.15 2.58,-0.41 1.54,0.18 2.8,-0.16 2.26,0.92 2.48,1.4 1,2.44 1.59,0.19 0.09,-0.48 1.81,-0.35 5.56,3.54 1.37,1.55 0.71,-0.03 1.56,0.98 3.03,3.49 1.64,2.21 0.48,1.48 2.17,2.66 1.17,0.55 6.69,1.06 2.11,-0.4 3.35,0.34 0.88,2.34 -2.08,1.58 -1.27,0.41 -0.73,1.86 0.22,2.19 -0.38,1.56 -0.52,1.3 -1.18,0.2 -1.29,1.69 -0.03,1.41 1.8,1.17 0.27,-0.2 -0.28,-0.97 0.01,-0.96 1.49,-0.82 1.58,0.64 0.73,0.91 1.17,0.85 0.45,-0.03 0,0 -1.4,1.73 -3.9,7.04 -4.21,11.6 -6.3,10.48 -5.44,6.66 -6.51,5.96 -6.09,3.68 -3.1,4.31 -0.18,-0.43 0.65,-1.58 0.34,-2.18 -1.18,-1.71 0.1,-0.42 0.93,-0.17 1.01,0.4 0.56,0.58 1.02,0.04 2.58,-1.41 0.82,-0.68 2.85,-3.71 0.75,-0.69 0.45,0.19 1.02,-0.19 1.05,-0.84 0.93,-1.27 0.37,-1.48 0.18,-0.93 -0.23,-2.1 0.2,-1.37 1.57,-0.07 0.74,0.3 0.27,0.83 0.35,-0.26 -0.29,-1.4 0.51,-2.07 0.48,-0.57 2.74,-1.59 0.73,-1.08 0.47,-2.75 -0.21,-2.28 0.56,-0.68 0.5,0.8 0.37,0.03 0.43,-0.42 0.47,-3.08 -0.1,-0.44 -0.95,-1.22 -0.67,-0.03 -0.26,0.69 0.17,0.39 -0.14,0.57 -0.35,0.2 -1.51,-0.02 -2.01,0.4 -0.34,1.61 -0.53,0.05 -0.81,-0.44 0.1,-1.71 -0.82,-0.89 -1.04,0.33 -0.6,-0.48 -0.73,-1.26 -0.4,-1.45 0.12,-0.57 -0.64,-0.69 -0.61,2.71 0.44,2.25 1.25,2.11 -0.57,0.81 -0.74,2.54 0.38,3.03 -0.18,0.77 -0.48,-0.37 0.26,-0.24 -0.03,-0.71 -0.47,-1.28 -0.45,-0.39 -0.53,0.66 -0.03,1.37 -1.41,3.27 -0.05,1.89 0.22,0.52 -0.72,0.7 -1.61,0.64 -0.61,1.58 -4.09,1.57 -0.72,0.53 -0.53,1.59 -0.1,2.27 -0.97,2.27 -2.36,1.3 -0.11,1.76 0.48,0.83 0.25,1.02 -0.95,0.56 -0.25,1.51 0.43,0.6 0.68,-0.14 1.3,0.63 0.15,0.91 -2.13,1.65 -2.32,4.52 -1.93,6.88 -2.01,4.49 -1.68,2.52 -7.79,7.53 z"},{"uf":"RO","name":"Rondônia","path":"m 187.58257,291.21114 -1.29,-1.45 -0.44,-1.88 -1.56,-0.52 -0.86,0.32 -1.81,0.08 -4.07,-1.81 -0.01,-0.4 -0.66,-0.61 -1.27,0.59 -1.98,-1.68 -1.52,-0.97 -0.86,-1.46 -0.28,-1.39 -1.04,-0.39 -1.77,1.12 -1.22,-0.03 -1.41,-0.8 -0.87,-1.33 -3.13,-1.58 -1.96,-0.17 -1.14,0.54 -0.9,0.85 -1.43,-0.17 -0.31,-0.3 -2.14,-0.51 -3.06,-0.28 -0.76,-0.43 -1.18,-1.19 -0.3,-1.97 -1.58,-0.49 -1.89,-0.97 -0.82,-1.72 -0.29,-0.2 -2.72,-0.28 -0.38,-0.35 -0.84,-3.71 -0.88,-0.89 -0.48,1.16 -0.66,-0.32 -0.27,-0.64 0.62,-1.53 -0.84,-1.52 -1.36,-0.39 -1.26,-3.47 -0.17,-1.66 1.55,-2.91 -0.21,-1.66 -1.16,-1.97 -0.75,-2.16 -0.06,-2.29 0.62,-0.5 0.38,-1.37 1.04,-1.05 0.36,-1.47 -0.24,-1.49 -0.42,-0.89 -0.09,-1.53 0.54,-1.65 -1.17,-2.18 -1.02,-0.38 -1.09,0.98 -0.06,0.51 -0.84,0.96 -0.57,0 -2.18,-1.02 -5.18,0.08 -5.61,1.78 -1.69,-0.01 -1.48,0.48 0,0 -2.97,-1.26 0,0 3.26,-2.56 1.92,-0.58 1.55,-1.81 0.15,-0.56 -0.16,-1.29 3.96,0.26 2.87,-0.33 0.72,0.37 2.31,2.33 0.37,-0.02 1.22,-0.79 0.13,-0.72 0.41,-0.53 1.08,-0.5 0.77,0.13 1.37,-0.39 1.3,-1.21 1.84,-1.02 0.38,0.09 0.64,2.26 0.68,0.53 0.68,-0.08 2.54,-3.16 -0.26,-1.75 0.53,-0.84 1.75,-1.26 0.46,0.02 0.84,0.55 1.79,0.1 1.2,-1.07 2.13,-0.38 3.87,0.46 -0.24,-1.46 0.11,-1.81 2.06,-1.21 0.81,-1.15 0.36,-1.02 -0.17,-0.45 -0.9,-0.7 0.05,-0.67 1.19,-1.59 2.48,-0.53 0.26,-0.22 -0.09,-1.17 1.72,-0.5 1.38,-2.56 10.79,-0.06 2.15,1.13 0.45,0.49 0.8,1.91 1.33,1.27 2.54,0.98 1.25,3.27 0.46,0.21 0.98,-0.13 0.62,0.2 0.68,2.88 3.24,1.48 0.68,-0.19 0.54,-1.74 1.92,-1.08 1.39,0.28 0.36,0.38 -0.04,0.7 0,0 1.4,0.97 0.6,1.24 -0.76,1.42 -1.29,4.99 0.06,0.35 0.78,0.47 0.26,0.61 0.15,1.39 0.83,2.27 -0.94,1.67 0.38,1.93 -1,3.52 -0.03,0.8 0.27,1.76 1.5,2.75 -0.9,9 17.16,0.05 -0.24,0.56 1.22,1.11 3.5,-0.09 1.11,0.11 1.07,0.43 1.41,3.59 -0.17,0.75 -1.4,1.75 -1.36,1.08 -0.14,1.32 0.43,3.25 0.58,0.51 0.9,-0.03 1.53,3.34 -0.04,2.05 0.58,1.49 -0.07,1.71 -0.56,2.24 -1.66,2.01 -0.52,2.25 -0.58,0.84 -0.43,0.41 -1.64,0.53 -0.93,1.08 -1.43,3.78 -0.52,2.45 -4.11,2.57 -1.47,1.43 0,0 -0.74,-0.04 -2.59,-1.55 -1.27,-1.43 -7.08,0.96 -1.32,-0.43 -0.25,-0.3 -3.38,0.66 -0.48,-0.16 -0.52,-1.35 z"},{"uf":"RR","name":"Roraima","path":"m 234.87257,61.661144 1.6,16.97 0,0 -18.49,-0.07 0.03,0.68 -2.33,3.26 -1.66,3.03 -0.07,1.13 -1.15,2.64 -0.11,0.66 0.23,0.73 1.14,1.41 -0.02,0.53 -0.42,0.39 -2.03,0.55 -1.41,1.41 -1.25,0.46 -1.82,-0.23 -0.92,-2.51 -1.87,-2.04 -2.83,-0.93 -1.6,0.06 -0.55,0.89 -2.09,0.71 -1.28,0.69 -1.02,1.26 -0.82,2.97 0.37,1.8 -0.25,1.73 -0.75,2.289996 0.44,2.11 -2.36,-1.04 -1.34,0.42 -0.53,-0.07 -1.04,-2.04 -1.48,-1.649996 -1.96,-1.31 -0.52,-0.04 -5.01,-4.42 0.14,-1.14 1.84,0.33 1.14,-1.32 0.06,-0.58 -1.13,-4.33 -0.58,-0.9 -1.22,-0.84 -0.88,-2.17 -0.29,-4.98 0.57,-0.96 0.77,-3.04 -0.66,-1.58 -0.36,-1.59 1.62,-1.46 -0.05,-0.45 -0.87,-1.12 -0.19,-2.26 -1.66,-4.76 -2.73,-3.74 0.71,-1.5 0.91,-3.32 -0.49,-0.66 -1.95,-0.95 -1.36,-0.11 -0.88,0.21 -0.97,-0.37 -1.21,-1.17 -0.06,-0.96 -0.63,-0.11 -1.13,0.42 -0.61,-0.01 -0.75,-0.34 -0.72,-0.78 0,0 0.3,-0.46 0.23,-2.28 -0.3,-0.22 -3.37,-0.23 -3.75,0.14 -3.31,-0.7 -0.2,-0.6 0.8,-1.76 0.12,-1.48 -0.73,-1.77 -1.94,-3.54 -0.73,-2.06 -0.47,-3.72 0.79,-1.48 -0.08,-0.96 -1.84,-2 -2.16,-1.06 -2.81,-2.78 -1.06,-1.81 -0.29,-0.96 -1.14,-0.65 -0.25,-0.39 0.03,-0.84 0.29,-0.33 0.9,0.07 1.12,0.66 0.94,1.73 0.61,0.09 3.39,-0.5 1.35,0.1 1.91,0.59 0.61,1.2 0.55,1.93 0.54,0.35 0.96,-0.08 0.74,-0.65 0.95,-0.4 3.18,0.16 0.47,0.05 1.31,1.21 0.6,0.15 0.52,-0.14 0.61,-1.56 1.31,0.14 1.45,0.93 3.93,4.57 1.05,0.57 0.71,0.11 1.51,-0.68 0.74,-1.13 0.1,-0.84 -0.83,-2.76 0.36,-1.74 0.46,-0.28 1.93,-0.05 1.01,-1.1 1.55,-1.09 0.75,0.05 3.9,1.34 0.59,-0.17 0.8,-0.72 1.03,-0.3 1.13,0.35 1.03,-0.21 1.34,-1.28 1,-0.25 1.15,0.23 1.11,-0.07 0.68,-0.85 0.05,-1.35 3.03,-1.81 2.33,0.19 2.76,-0.39 0.89,-1.13 0.09,-0.71 0.59,-1.1199998 0.75,-0.13 1.85,-0.9 1.1,-1.04 1.11,-1.71 -1.2,-3.56 -1.17,-0.36 0.64,-0.18 1.43,0.07 0.8,0.32 3.57,-0.1 1.06,-0.95 0.74,-0.22 1.37,0.42 0.53,1.31 1.04,0.8 0.48,1.37 -0.67,4.9 -0.72,1.3799998 -1.25,0.7 0.06,0.83 1.61,0.41 1.62,-0.22 2.35,0.81 1.82,1.1 -0.88,1.43 -0.01,1.15 2.34,3.42 0.2,1.55 -1.51,2.92 -1.88,1.41 -0.72,1.5 0.27,0.39 0.06,2.17 -1.47,2.41 -0.9,2.77 -0.31,2.57 -0.09,2.67 0.98,1.87 0.51,1.76 -0.01,1.4 1.57,1.03 0.9,0.2 0.13,0.68 -0.46,5.15 0.12,0.74 1.81,0.29 -0.66,1.17 0.46,0.5 2.15,0.74 1.46,1.92 2.66,2.74 z"},{"uf":"SC","name":"Santa Catarina","path":"m 379.56257,558.27114 -0.45,0.03 -1.17,-0.85 -0.73,-0.92 -1.59,-0.63 -1.48,0.82 -0.01,0.96 0.28,0.97 -0.27,0.2 -1.8,-1.17 0.04,-1.41 1.28,-1.69 1.18,-0.2 0.53,-1.31 0.37,-1.55 -0.22,-2.19 0.73,-1.86 1.27,-0.42 2.08,-1.58 -0.88,-2.34 -3.35,-0.34 -2.11,0.4 -6.69,-1.06 -1.16,-0.54 -2.17,-2.66 -0.49,-1.48 -1.63,-2.21 -3.03,-3.49 -1.57,-0.99 -0.71,0.03 -1.37,-1.55 -5.56,-3.54 -1.81,0.34 -0.09,0.48 -1.6,-0.19 -1,-2.44 -2.47,-1.39 -2.27,-0.93 -2.79,0.16 -1.54,-0.18 -2.59,0.41 -1.91,-1.15 -2.57,0.36 -1.63,-0.98 -3.08,0.03 0.15,-0.93 -1.35,-0.58 -0.56,0.81 -3.26,1.16 -3.52,-0.39 0,0 1.45,-2.93 0.73,-2.09 -0.58,-3.25 0.41,-3.21 -0.04,-2.55 0.96,-1.75 0,0 3.63,0.02 0.71,-0.38 0.53,0.01 1.06,0.24 0.31,0.51 2.03,1.41 2.68,0.03 2.34,-0.58 5.29,1.68 4.26,0.36 1.02,0.63 0.17,0.41 1.57,1.18 3.77,0.42 4.25,-0.13 1.33,1.9 0.18,-0.5 0.74,-0.38 0.92,-0.02 0.87,-0.86 -0.85,-2.99 0.69,-1.58 0.72,-0.78 2,-1.14 3.57,0.4 1.87,-0.97 0.73,-0.87 0.59,-1.48 1.53,-0.65 1.11,-0.14 1.42,0.76 0.81,0.03 2.33,-0.17 2.84,-0.73 0.75,0.01 1.04,0.4 3.12,2.6 1.23,0.62 1.44,0.16 3.35,-2.13 1.35,-1.43 1.56,-0.57 0.12,0.39 0.76,0.07 1.74,-0.23 0.33,-0.44 5.24,0.03 0,0 -0.39,1.32 0.51,1.65 -0.07,0.39 -1.5,1.14 -0.98,-0.48 -0.82,-2.53 -0.02,1.12 0.59,2.72 1.71,1.66 0.56,0.95 -1.01,2.29 -0.16,2.32 0.1,0.43 0.76,0.73 0.26,5.86 0.31,0.55 0.43,0.2 0.77,-0.51 0.35,0.72 0.1,0.87 -0.47,0.06 -0.43,-0.28 -1.19,0.63 -0.34,3.84 0.57,2.59 -0.57,0.75 0.31,1.93 0.91,1.88 -0.86,2.34 -0.52,4.01 -1.71,4.68 -0.34,-0.1 -0.36,-0.76 0.21,-0.97 -0.92,-1.18 -0.26,0.33 0.18,2.43 1.16,0.83 -0.92,1.66 -1.64,0.65 -4.13,3.04 -2.8,2.56 -3.75,4.44 -1.04,1.88 z m 17.88,-26.55 -0.15,-0.47 0.25,-1.75 0.76,-2.4 -0.4,-1.18 0.16,-1.02 1.4,-0.76 0.22,0.06 0.66,0.94 -0.54,2.56 -0.82,0.86 -0.59,1.22 0.2,1.17 -1.15,0.77 z m -0.45,-24.37 -1.87,-2.02 2.55,-2.44 0.25,0.04 0.65,1.05 -0.86,1.32 -0.72,2.05 z"},{"uf":"SP","name":"São Paulo","path":"m 404.84257,488.18114 -0.16,-1.33 -1.42,-0.57 -0.73,-3.3 0.4,-1.95 -2.14,-0.58 -0.76,0.17 -1.1,2.77 -0.66,0.85 -1.06,-0.53 -0.35,-0.78 0.69,-3.3 0.89,-0.66 0.14,-0.4 -1.61,-1.27 -1.59,-0.13 -1.58,0.19 -0.5,-0.38 -3.41,0.53 -2.38,0.12 -1.01,-0.21 -0.6,-0.39 -0.33,-2.04 1.28,-2.12 0.25,-1.05 -0.25,-0.44 -0.6,-0.3 -0.92,-1.97 0.06,-0.89 -0.5,-0.68 -0.67,-0.29 -1.21,-1.14 -1.49,-3.01 0.36,-0.55 0.08,-1.76 -1.3,-1.52 -0.38,-1.84 0.17,-0.81 0.39,-0.58 -0.02,-2.74 -0.89,-1.76 -3.59,-2.83 -1.13,-1.55 -2.97,0.86 -5.31,-0.13 -0.66,-0.54 -1.65,-0.14 -0.42,0.34 -1.72,-0.07 -0.72,-1.32 -0.63,-0.51 -3.51,-0.8 -1.75,-0.84 -0.78,-1 -2.58,0.01 -1.07,0.54 -1.32,-0.13 -2.64,-1.09 -2.53,-0.46 -1.48,-0.79 -1.17,-0.29 -0.73,0.37 -0.34,0.6 -1.21,0.62 -3.28,-0.29 -4.01,0.11 -3.83,-0.65 -3.25,2.29 0,0 0.84,-1.08 0.73,-1.54 1.26,-1.14 7.56,-4.54 1.95,-1.87 1.26,-2.43 1.73,-1.69 0.4,-1.21 1.44,-1.03 0.28,-1.22 -0.35,-0.84 2,-2.26 1.21,-2.34 0.07,-0.94 -0.31,-1.93 0.23,-0.39 0.96,-0.52 2.6,-3.64 0.16,-2.93 0.62,-1.68 1.01,-0.3 0.73,-0.64 1.99,-2.68 1.22,-1.02 0.47,-0.23 1.31,-0.04 1.5,-0.78 0.28,-0.4 0.4,-2.46 0,0 1.22,-1.13 2.15,-1.11 1.92,-0.37 1.43,-1.69 1.5,-0.61 0.75,0.14 1.73,1.55 2.55,0.08 4.29,0.96 1.67,-0.36 1.62,0.22 2,-0.59 2.18,1.42 1.67,0.79 -0.13,0.92 0.33,1.42 1.21,2.09 0.63,0.03 0.54,-0.32 0.67,-0.94 0.41,-1.13 0.26,-0.19 0.55,0.05 0.36,0.39 0.25,0.96 0.01,2.78 1.2,0.53 0.41,-0.45 -0.27,-2.54 0.49,-1.19 0.45,-0.48 8.18,-0.67 1.01,-1.25 1.5,1.46 1.12,0.43 2.78,-0.69 0.44,-0.99 -0.2,-0.46 0.31,-0.61 2.38,-0.11 1.66,0.78 0.85,-0.64 1.31,-0.29 3.26,3.35 0.2,1.04 -0.57,1.01 -0.29,2.37 0.58,0.61 1.89,1.21 0.4,1.55 -0.06,0.56 -1.52,2.03 -0.18,1.94 0.79,0.74 0.31,0.61 0.37,2.21 1.3,1.8 0.83,1.99 -0.03,0.85 1.61,-0.05 0.78,-0.31 0.28,-0.36 1,-0.05 3.7,1.32 0.23,0.37 -0.05,1.27 -0.7,2.18 -1.86,2.72 0.26,2.94 -0.19,3.45 -0.53,1.56 0.72,1.6 1.78,1.24 1.81,0.83 0.51,1.72 -1.21,0.7 2.02,3.31 1.13,0.25 2.01,-0.24 0.18,0.53 3.62,-1 0.56,0.42 1.31,-0.32 0.75,-0.98 0.05,-0.84 -0.24,-0.24 0.17,-2.3 1.19,-0.33 0.09,0.35 -0.35,0.49 0.01,0.48 2.34,0.08 2.39,-0.25 1.79,-0.67 1.23,-1.24 1.93,-1.02 2.21,-0.22 1.24,-0.73 0,0 1.27,0.54 0.56,1.17 1.23,1.59 1.77,0.39 3.15,-0.53 1.7,0.01 0.75,1.64 -1.65,2.15 -1.5,0.71 -2.77,0.36 -0.5,-0.15 -2.35,1.01 -1.09,1.15 -1.09,3.5 0.05,0.41 1.63,1.73 0.48,0.26 0,0 -0.06,0.2 -1.69,0.42 -1.06,-0.82 -1.48,1.11 -0.43,0.65 0.27,0.22 -0.76,0.64 -3.22,1.55 -2.25,0.7 -0.28,0.44 0.04,0.96 0.5,1.55 -0.32,0.42 -1.4,0.26 -0.7,-0.64 -1.34,-0.29 -3.12,-0.5 -0.86,0.15 -1.32,0.34 -1.73,0.82 -0.5,0.51 -1.21,2.15 -1.31,0.57 -0.5,-0.12 0.58,-0.47 -0.48,-1.22 -1.17,-0.85 -0.83,1.23 0.26,0.75 -0.3,0.61 -7.62,4.24 -0.95,0.82 -0.31,1.16 -3.27,3 -3.25,1.95 -1.92,0.53 -4.5,3.21 -2.33,1.96 -0.67,0.08 -0.44,0.62 0.9,0.43 0.66,0.06 0.93,-0.36 0,0.76 -0.62,1.31 -1.32,0.85 -1.06,1.48 z m 44.31,-23.01 -1.54,-0.65 -1.16,0.18 -0.49,-0.38 0.1,-0.78 0.95,-0.65 1.09,-1.85 0.72,0.25 0.66,0.65 0.13,2.91 -0.46,0.32 z"},{"uf":"SE","name":"Sergipe","path":"m 570.20257,261.95114 -2.9,0.89 -1.55,-0.64 -0.54,-0.34 -0.48,-0.72 -1.92,-0.92 -0.6,-0.52 -0.12,-0.41 0.34,-0.39 0.13,-1.42 -0.15,-0.39 -1.43,-1.51 -0.52,-1.49 -1.09,-0.67 -0.96,-1.6 -0.02,-0.77 0.59,-1.58 0.32,-0.3 1.7,0.01 1.13,0.75 2.55,-0.99 0.69,-0.55 0.3,-0.58 -0.76,-2.75 0.08,-0.88 0.66,-1.62 0.08,-3.11 -0.75,-1.15 -1.99,-1.95 -1.27,-2.5 -0.22,-2.14 0.67,-1.15 0,0 6.46,2.98 3.68,0.95 5.42,3.07 1.3,2.45 1.76,1.45 1.66,0.79 0.46,0.03 3.59,2.23 0.6,1.31 0,0 -2.38,0.76 -4.57,2.94 -0.97,0.89 -1.55,2.21 -0.32,-0.02 0.11,-1.1 -1.05,-1.82 -0.99,0.16 0.34,1.16 1.24,0 0.23,0.24 -0.52,1.97 -1.27,2.09 -0.53,-0.35 -0.37,-0.67 -0.99,-0.16 0.2,0.68 1.13,0.62 -0.26,1.77 -0.86,1.15 -0.93,2.03 -0.78,0.15 -0.3,-0.46 0.48,-1.4 0.41,-0.13 0.31,-0.43 0.37,-1.04 -0.81,-0.37 0.1,0.68 -0.45,1.13 -0.48,0.5 -0.26,1.09 0.28,0.72 -0.26,0.52 z"},{"uf":"TO","name":"Tocantins","path":"m 433.61257,282.08114 -5.36,1.42 -1.74,1.34 -2.56,1.1 -1.55,0 -4.53,1 -2.52,2.08 -1.78,0.9 -0.46,-0.24 -1.51,-2.62 -0.55,-0.03 -0.51,3.3 -0.69,0.08 -3.35,-0.68 -3.13,-1.47 0.56,-1.56 -0.22,-0.74 -4.53,0.53 -2.76,-0.34 -0.56,0.54 -0.3,1 -0.75,0.75 -1.14,-0.05 -0.61,-3.1 -1.11,-3.71 -1.04,-1.88 -1.15,-1.31 -1.18,0.97 -1.47,2.39 -1.63,5.94 -0.63,0.23 -4.07,-1.43 -3.09,-1.71 -3.93,-0.4 -2.2,-1.03 -2.4,-0.4 0.52,-2.34 1.22,-1.88 0.03,-1.71 -0.56,0.3 -1.81,2.09 -0.66,1.23 -0.2,1.88 -0.34,0.45 0,0 -0.8,-0.02 -0.96,-0.51 -0.98,-3.34 0.74,-2.76 -0.44,-3.05 -0.52,-0.58 -0.01,-1.57 0.47,-3.31 -1.1,-2.25 0.05,-0.5 0.82,-0.89 0.16,-0.87 -1.39,-1.34 -0.06,-0.86 1.88,-5.99 0.04,-2.95 0.54,-2.97 1.94,-5.29 0.37,-0.27 0.43,-0.85 0.44,-3.14 1.1,-1.25 0.56,-1.89 0.65,-1.02 0,0 1.62,-3.69 1.13,-4.45 1.15,-1.58 1.19,-1.1 1.21,-1.68 1.03,-1.92 1.37,-0.92 1.05,-0.16 0.73,-0.85 0.94,-1.54 0.18,-0.99 1.7,-3.24 1.09,-0.8 1.76,-5.15 0.66,-4.04 -0.15,-0.3 -0.74,-0.32 -1.67,-1.74 -0.6,-0.95 -0.16,-0.88 0.14,-0.57 1.41,-1.69 1.29,-2.1 -0.06,-2.67 -0.43,-2.18 0.19,-0.35 2.47,-1.78 3.41,-1.14 2.5,-1.21 0.24,-0.5 -0.15,-1.51 0.86,-1.27 1.51,-1.34 1.29,-0.15 0.19,-1.34 -0.29,-1.2 0.25,-0.46 1.46,-0.46 0.64,-0.48 0.93,-2.75 -1.02,-1.34 -0.09,-1.4 0.29,-0.28 0.97,-0.08 0.72,-0.37 0.37,-0.66 0.03,-0.64 -1.26,-1.17 -0.87,-0.14 -0.39,-0.31 -1.02,-1.66 -1.29,-0.12 -1.87,0.25 -2.29,-0.81 0,0 0.53,-0.64 2.62,-1.85 1.96,-0.53 0.87,0.05 2.78,1.52 1.4,0.08 0.95,-0.52 1.74,0.29 0.59,0.69 0.08,1.03 0.28,0.32 1.22,0.03 3.4,1.43 0.84,1.03 0.47,3.5 0.64,1.5 -0.21,3.72 0.23,1.08 0.67,1.13 -0.01,0.44 -1.77,6.15 -0.31,2.37 0.28,1 -0.25,1.59 -1.75,2.04 -1.76,0.67 -0.18,0.71 1.94,1.32 0.42,-0.27 1.37,0.24 0.25,0.35 0.11,0.88 -0.62,1.19 0.85,1.44 0.88,-0.07 3,4.16 0.91,0.85 2.28,3.02 2.14,-1.34 4.27,-0.94 1.8,1.22 0.08,1.75 -0.64,3.25 0.39,1.35 -3.39,0.35 -1.34,0.54 -0.57,0.55 -0.68,1.43 -0.73,2.68 0.37,1.3 -2.63,2.55 -0.26,0.7 0.2,0.42 2.08,0.29 0.94,0.69 0.74,1.59 0.06,1.66 0.62,1.04 3.88,1.95 0.09,0.53 -1.64,1.81 0.13,1.65 2.14,1.62 0.99,2.87 1.34,2 0.71,0.18 1.78,-0.21 1,0.3 0.82,0.44 0.61,0.82 1.28,0.66 0,0 2.94,0.21 0,0 -0.69,0.65 -0.22,0.98 -0.56,0.47 -3.82,2.02 -3.21,2.62 -0.19,0.37 1.29,1.8 -0.36,0.39 -1.01,0.27 -0.9,0.61 -1.52,3.49 -1.01,0.72 -0.5,1.16 0.23,0.92 1.86,1.95 3.59,0.67 1.87,0.99 0.05,0.76 -0.56,0.45 -2.04,0.81 -0.43,0.96 0.09,0.5 0.35,0.33 1.03,-0.18 0.92,0.29 0.58,0.51 0.29,0.64 -0.96,0.71 -1.15,0.42 -1.95,1.67 -0.19,0.85 -0.05,2.92 0.35,1.25 0.94,0.66 1.05,0.24 0.41,0.25 0.17,0.42 0.05,1.06 -1.36,2.38 z"}];

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

  const selectedLocations = selectedGeographyEntries(f);
  const local = selectedLocations.length > 1
    ? `${selectedLocations.length} locais selecionados`
    : (selectedLocations.length === 1
      ? selectedLocations[0].label
      : (f.uf !== 'Nenhum' && f.uf !== 'Brasil'
        ? (UF_NAMES[f.uf] || f.uf)
        : (f.region !== 'Nenhum' && f.region !== 'Brasil' ? `região ${f.region}` : 'capitais brasileiras')));

  let recortePrincipal = recorteMap[realGroup] || String(realGroup).toLowerCase();
  const selectedSexes=normalizeSexSelections(f.sexes || [f.sex]);
  const criterios = [recortePrincipal];

  if(realGroup !== 'Sexo' && !(selectedSexes.length===1 && selectedSexes[0]==='Todos')){
    criterios.push(`comparação por sexo (${selectedSexes.join(', ')})`);
  }

  const selectedPopulations = selectedPopulationEntries(f);
  if(selectedPopulations.length > 1){
    criterios.push(`${selectedPopulations.length} tipos de população`);
  }else if(f.pop === 'População Negra'){
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
  const geoSelections = selectedGeographyEntries(f);
  const popSelections = selectedPopulationEntries(f);
  if(geoSelections.length > 1 || popSelections.length > 1 || normalizeSexSelections(f.sexes || [f.sex]).length > 1){
    partes.push('comparação simultânea entre recortes selecionados');
  }
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
    sexColors: {
      Todos: $('#sexColorTodos')?.value || DEFAULT_SEX_SERIES_COLORS.Todos,
      Feminino: $('#sexColorFeminino')?.value || DEFAULT_SEX_SERIES_COLORS.Feminino,
      Masculino: $('#sexColorMasculino')?.value || DEFAULT_SEX_SERIES_COLORS.Masculino
    },
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
 * Amplia os textos na comparação lado a lado para compensar a redução
 * proporcional do SVG em cada metade da tela.
 */
function comparisonChartOptions(){
  const opt = chartOptions();
  // Calcula um tamanho ampliado, respeitando o mínimo legível definido.
  const enlarged = (value,factor,minimum)=>Math.max(minimum,Math.round(Number(value || 0)*factor));
  const bodySize = enlarged(opt.size,1.12,18);
  return {
    ...opt,
    titleSize:enlarged(opt.titleSize,1.15,25),
    subtitleSize:enlarged(opt.subtitleSize,1.15,16),
    axisSize:enlarged(opt.axisSize,1.22,16),
    legendSize:enlarged(opt.legendSize,1.22,16),
    valueSize:enlarged(opt.valueSize,1.22,16),
    size:bodySize,
    fs:bodySize,
    comparisonLayout:true
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

  const comparisonMode = Boolean(
    $('#compareEnabled')?.checked &&
    $('#compareIndicator')?.value &&
    $('#compareIndicator')?.value !== S.indicator?.id
  );
  const opt=optOverride || (comparisonMode ? comparisonChartOptions() : chartOptions());
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

  const hasSeries = d.some(item=>Boolean(item.series));
  const supportsMultiSeries = ['line','area','bar','horizontal','ranking','lollipop','radar','map'].includes(chartType);
  if(hasSeries && !supportsMultiSeries){
    d = d.map(item=>item.series ? ({...item,label:`${item.series} · ${item.label}`}) : item);
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
    if(hasSeries && chartType==='line') svg=seriesLineSvg(d,opt,false);
    else if(hasSeries && chartType==='area') svg=seriesLineSvg(d,opt,true);
    else if(hasSeries && chartType==='bar') svg=seriesBarSvg(d,opt);
    else if(hasSeries && (chartType==='horizontal'||chartType==='ranking')) svg=seriesHbarSvg(d,opt,chartType==='ranking');
    else if(hasSeries && chartType==='lollipop') svg=seriesLollipopSvg(d,opt);
    else if(hasSeries && chartType==='radar') svg=seriesRadarSvg(d,opt);
    else if(hasSeries && chartType==='map') svg=seriesMapSvg(d,opt);
    else if(chartType==='line') svg=lineSvg(d,opt,false);
    else if(chartType==='area') svg=lineSvg(d,opt,true);
    else if(chartType==='horizontal'||chartType==='ranking') svg=hbarSvg(d,opt);
    else if(chartType==='pie'||chartType==='donut') svg=pieSvg(d,opt,chartType==='donut');
    else if(chartType==='kpi') svg=kpiSvg(d,opt);
    else if(chartType==='gauge') svg=gaugeSvg(d,opt);
    else if(chartType==='lollipop') svg=lollipopSvg(d,opt);
    else if(chartType==='pareto') svg=paretoSvg(d,opt);
    else if(chartType==='radar') svg=radarSvg(d,opt);
    else if(chartType==='map') svg=mapSvg(d,opt);
    else if(chartType==='treemap') svg=treemapSvg(d,opt);
    else svg=barSvg(d,opt);
  }catch(err){
    console.error(`Falha ao renderizar ${chartType}:`, err);
    if(hasSeries && chartType==='area') svg=seriesLineSvg(d,opt,true);
    else if(hasSeries && chartType==='line') svg=seriesLineSvg(d,opt,false);
    else if(hasSeries && chartType==='bar') svg=seriesBarSvg(d,opt);
    else if(hasSeries && (chartType==='horizontal'||chartType==='ranking')) svg=seriesHbarSvg(d,opt,chartType==='ranking');
    else if(hasSeries && chartType==='lollipop') svg=seriesLollipopSvg(d,opt);
    else if(hasSeries && chartType==='radar') svg=seriesRadarSvg(d,opt);
    else if(hasSeries && chartType==='map') svg=seriesMapSvg(d,opt);
    else if(hasSeries) svg=seriesBarSvg(d,opt);
    else if(chartType==='area') svg=lineSvg(d,opt,true);
    else if(chartType==='line') svg=lineSvg(d,opt,false);
    else if(chartType==='horizontal'||chartType==='ranking'||chartType==='lollipop'||chartType==='pareto') svg=hbarSvg(d,opt);
    else if(chartType==='pie'||chartType==='donut'||chartType==='radar'||chartType==='map'||chartType==='treemap') svg=barSvg(d,opt);
    else if(chartType==='kpi'||chartType==='gauge') svg=barSvg(d,opt);
    else svg=barSvg(d,opt);
  }
  if(!svg || !String(svg).includes('<svg')) throw new Error(`O renderizador ${chartType} não retornou um SVG válido.`);
  target.innerHTML=svg;
  target.setAttribute('data-rendered-chart', chartType || 'bar');
  target.classList?.toggle('chart-border-hidden',!opt.showBorder);
  const renderedSvg = target.querySelector?.(':scope > svg');
  const viewBox = renderedSvg?.getAttribute('viewBox')?.trim().split(/\s+/).map(Number);
  if(viewBox?.length === 4 && viewBox[2] > 0 && viewBox[3] > 0){
    target.style?.setProperty('--rendered-chart-ratio',`${viewBox[2]} / ${viewBox[3]}`);
  }else{
    target.style?.removeProperty('--rendered-chart-ratio');
  }
  if(chartType === 'map' && !hasSeries) initializeMapInteraction(target,d,opt);
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

  const comparisonLayout = Boolean(opt.comparisonLayout);
  const titleFit = fitTextLines(titleText, available, opt.titleSize || 22, comparisonLayout ? 3 : 6, 12, 0.76);
  const subtitleFit = fitTextLines(subtitleText, available, opt.subtitleSize || 14, comparisonLayout ? 2 : 5, 9, 0.62);
  const sourceFit = fitTextLines(sourceText, available, Math.max(10, (opt.fs || 18) - 7), 4, 9, 0.62);

  const titleLineHeight = titleFit.size + 6;
  const subtitleLineHeight = subtitleFit.size + 5;
  const sourceLineHeight = sourceFit.size + 5;

  const titleY = 38;
  const titleSlots = comparisonLayout ? Math.max(3,titleFit.lines.length) : titleFit.lines.length;
  const subtitleSlots = comparisonLayout ? Math.max(2,subtitleFit.lines.length) : subtitleFit.lines.length;
  const subtitleY = titleY + titleSlots * titleLineHeight + 14;
  const plotTop = subtitleY + subtitleSlots * subtitleLineHeight + 26;
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
 * Converte uma cor hexadecimal em componentes numéricos usados pela escala do mapa.
 */
function mapHexToRgb(color){
  const clean=String(color || '').replace('#','');
  if(!/^[0-9a-f]{6}$/i.test(clean)) return {r:7,g:59,b:112};
  return {r:parseInt(clean.slice(0,2),16),g:parseInt(clean.slice(2,4),16),b:parseInt(clean.slice(4,6),16)};
}

/**
 * Combina duas cores para produzir os tons intermediários do mapa coroplético.
 */
function mixMapColor(start,end,ratio){
  const a=mapHexToRgb(start),b=mapHexToRgb(end);
  const t=Math.max(0,Math.min(1,Number(ratio)||0));
  /** Interpola e converte um canal RGB isolado para a escrita hexadecimal. */
  const value=channel=>Math.round(a[channel]+(b[channel]-a[channel])*t).toString(16).padStart(2,'0');
  return `#${value('r')}${value('g')}${value('b')}`;
}

/**
 * Escolhe texto claro ou escuro para manter as siglas legíveis sobre cada tom do mapa.
 */
function mapLabelColor(background){
  const rgb=mapHexToRgb(background);
  const brightness=(rgb.r*299+rgb.g*587+rgb.b*114)/1000;
  return brightness<146 ? '#FFFFFF' : '#12314D';
}

/**
 * Torna o mapa explorável por mouse, toque e teclado. O cartão abaixo do SVG
 * mantém o último estado escolhido visível, o que resolve a limitação dos
 * tooltips nativos em celulares.
 */
function initializeMapInteraction(target,data,opt){
  if(!target || typeof target.querySelectorAll !== 'function') return;
  const paths=Array.from(target.querySelectorAll('[data-map-uf]'));
  if(!paths.length) return;
  const byUf=new Map(data.map(item=>[String(item.category || '').toUpperCase(),item]));
  const ranked=[...byUf.entries()]
    .filter(([,item])=>Number.isFinite(item?.value))
    .sort((a,b)=>b[1].value-a[1].value);
  const detail=document.createElement('div');
  detail.className='map-live-detail';
  detail.setAttribute('role','status');
  detail.setAttribute('aria-live','polite');
  target.appendChild(detail);

  /**
   * Atualiza o destaque visual e descreve posição, região e prevalência.
   */
  const selectState=(uf)=>{
    const code=String(uf || '').toUpperCase();
    const path=paths.find(item=>item.dataset.mapUf===code);
    if(!path) return;
    paths.forEach(item=>{
      const selected=item===path;
      item.classList.toggle('is-selected',selected);
      item.setAttribute('aria-pressed',String(selected));
    });
    const item=byUf.get(code);
    const hasValue=Boolean(item && Number.isFinite(item.value));
    const name=UF_NAMES[code] || path.dataset.mapName || code;
    const rankIndex=ranked.findIndex(([rankedUf])=>rankedUf===code);
    const rankText=rankIndex>=0 ? `${rankIndex+1}º maior valor entre as UF com dados` : 'Sem posição disponível';
    const fill=path.getAttribute('fill') || opt.primary;
    detail.innerHTML=`
      <span class="map-live-swatch" style="--map-selected-color:${esc(fill)}">${esc(code)}</span>
      <span class="map-live-copy"><small>Estado selecionado</small><strong>${esc(name)}</strong><span>${esc(UF_REGION_MAP[code] || 'Brasil')} · ${esc(rankText)}</span></span>
      <span class="map-live-value">${hasValue ? `${fmt(item.value,opt.decimals)}<small>%</small>` : '<small>Sem dados</small>'}</span>`;
  };

  paths.forEach(path=>{
    const uf=path.dataset.mapUf;
    path.addEventListener('pointerenter',()=>selectState(uf));
    path.addEventListener('focus',()=>selectState(uf));
    path.addEventListener('click',event=>{event.preventDefault();selectState(uf);});
    path.addEventListener('keydown',event=>{
      if(event.key==='Enter' || event.key===' '){
        event.preventDefault();
        selectState(uf);
      }
    });
  });
  selectState(ranked[0]?.[0] || paths[0].dataset.mapUf);
}

/** Desenha pequenos múltiplos do mapa quando mais de um sexo é selecionado. */
function seriesMapSvg(data,opt){
  const series=SEX_FILTER_VALUES.filter(name=>data.some(item=>item.series===name));
  data.forEach(item=>{if(item.series && !series.includes(item.series)) series.push(item.series);});
  if(!series.length) return mapSvg(data,opt);
  const count=series.length;
  const cols=count===1?1:(count===2?2:3);
  const panelW=cols===1?720:(cols===2?560:370);
  const panelH=610;
  const gap=24;
  const margin=26;
  const w=margin*2+cols*panelW+(cols-1)*gap;
  const h=margin*2+panelH;
  let s='';
  series.forEach((name,index)=>{
    const x=margin+index*(panelW+gap);
    const y=margin;
    const rows=data.filter(item=>item.series===name);
    const byUf=new Map(rows.map(item=>[String(item.category||'').toUpperCase(),item]));
    const available=[...byUf.values()].filter(item=>Number.isFinite(item.value));
    const values=available.map(item=>item.value);
    const min=values.length?Math.min(...values):0;
    const max=values.length?Math.max(...values):0;
    const color=sexSeriesColor(name,opt);
    const base=mixMapColor(opt.chartBg||'#FFFFFF',color,.10);
    const noData=mixMapColor(opt.chartBg||'#FFFFFF',opt.gridColor||'#DDE7F2',.72);
    const mapScale=cols===1?.78:(cols===2?.62:.45);
    const mapX=x+(cols===1?100:(cols===2?62:25));
    const mapY=y+95;
    s+=`<rect x="${x}" y="${y}" width="${panelW}" height="${panelH}" rx="24" fill="${opt.chartBg}" stroke="${opt.borderColor}"/>`;
    s+=`<circle cx="${x+30}" cy="${y+36}" r="8" fill="${color}"/><text x="${x+48}" y="${y+42}" font-size="18" font-weight="900" fill="${opt.text}">${esc(name)}</text>`;
    s+=`<text x="${x+24}" y="${y+69}" font-size="11.5" fill="${opt.text}" opacity=".70">Mapa por UF · prevalência (%)</text>`;
    s+=`<g transform="translate(${mapX},${mapY}) scale(${mapScale})">`;
    BRAZIL_SVG_STATES.forEach(state=>{
      const item=byUf.get(state.uf);
      const has=Boolean(item&&Number.isFinite(item.value));
      const ratio=has?(max===min?.68:(item.value-min)/(max-min)):0;
      const fill=has?mixMapColor(base,color,.18+.82*ratio):noData;
      const stateName=UF_NAMES[state.uf]||state.name||state.uf;
      const detail=has?`${stateName}: ${fmt(item.value,opt.decimals)}%`:`${stateName}: sem dados`;
      s+=`<path d="${state.path}" fill="${fill}" stroke="${opt.chartBg}" stroke-width="2.5" vector-effect="non-scaling-stroke"><title>${esc(detail)}</title></path>`;
    });
    s+='</g>';
    const legendY=y+455;
    s+=`<rect x="${x+24}" y="${legendY}" width="${panelW-48}" height="10" rx="5" fill="${base}"/>`;
    s+=`<rect x="${x+24}" y="${legendY}" width="${panelW-48}" height="10" rx="5" fill="${color}" opacity=".72"/>`;
    s+=`<text x="${x+24}" y="${legendY+28}" font-size="10.5" fill="${opt.text}">${values.length?fmt(min,opt.decimals)+'%':'Sem dados'}</text><text x="${x+panelW-24}" y="${legendY+28}" text-anchor="end" font-size="10.5" fill="${opt.text}">${values.length?fmt(max,opt.decimals)+'%':''}</text>`;
    const top=[...available].sort((a,b)=>b.value-a.value).slice(0,3);
    top.forEach((item,i)=>{
      const uf=String(item.category||'').toUpperCase();
      const yy=legendY+58+i*24;
      s+=`<text x="${x+24}" y="${yy}" font-size="10.5" font-weight="750" fill="${opt.text}">${i+1}. ${esc(UF_NAMES[uf]||uf)}</text><text x="${x+panelW-24}" y="${yy}" text-anchor="end" font-size="10.5" font-weight="900" fill="${color}">${fmt(item.value,opt.decimals)}%</text>`;
    });
  });
  return svgWrap(s,w,h,opt);
}

/**
 * Define pontos de leitura das siglas sobre o mapa vetorial do Brasil.
 * Pequenos ajustes evitam sobreposição nos estados do litoral nordestino.
 */
const BRAZIL_STATE_LABEL_POSITIONS = {
  AC:[58,224],AL:[584,233],AP:[338,57],AM:[140,142],BA:[500,293],CE:[542,165],
  DF:[409,330],ES:[520,393],GO:[382,334],MA:[449,171],MT:[283,281],MS:[304,410],
  MG:[446,376],PA:[336,139],PB:[583,193],PR:[354,477],PE:[557,213],PI:[481,189],
  RJ:[486,434],RN:[582,174],RS:[318,579],RO:[167,251],RR:[190,52],SC:[358,529],
  SP:[396,442],SE:[573,247],TO:[402,226]
};

/**
 * Desenha um mapa coroplético vetorial do Brasil e atualiza cada estado conforme os valores por UF.
 */
function mapSvg(data,opt){
  const mobileMap=typeof window!=='undefined' && window.innerWidth<=760;
  const w=mobileMap ? 480 : 1200;
  const h=mobileMap ? 1020 : 700;
  const mapCard={x:mobileMap?16:24,y:mobileMap?16:24,width:mobileMap?448:690,height:mobileMap?520:652};
  const mapTransform=mobileMap ? 'translate(47,88) scale(.63)' : 'translate(72,88) scale(.92)';
  const legendX=mobileMap ? 16 : 744;
  const legendY=mobileMap ? 560 : 24;
  const legendW=mobileMap ? 448 : 432;
  const legendH=mobileMap ? 430 : 652;
  const scaleX=legendX+(mobileMap?28:34);
  const scaleY=legendY+(mobileMap?126:146);
  const scaleW=legendW-(mobileMap?56:68);
  const bodySize=mobileMap ? 13 : 13;
  const rankSize=mobileMap ? 12.5 : 12.5;
  const byUf=new Map(data.map(item=>[String(item.category || '').toUpperCase(),item]));
  const available=[...byUf.values()].filter(item=>Number.isFinite(item.value));
  const values=available.map(item=>item.value);
  const min=values.length ? Math.min(...values) : 0;
  const max=values.length ? Math.max(...values) : 0;
  const transparentPlot=['transparent','none'].includes(String(opt.plotBg || '').toLowerCase());
  const transparentChart=['transparent','none'].includes(String(opt.chartBg || '').toLowerCase());
  const effectivePlotBg=transparentPlot ? '#FFFFFF' : (opt.plotBg || '#FFFFFF');
  const effectiveChartBg=transparentChart ? '#FFFFFF' : (opt.chartBg || '#FFFFFF');
  const lightBase=mapLabelColor(effectivePlotBg)==='#FFFFFF' ? '#DDE8F1' : '#EEF5FA';
  const noDataFill=mixMapColor(effectivePlotBg,opt.gridColor || '#DDE7F2',.72);
  const gradientStart=mixMapColor(lightBase,opt.primary,.18);
  const gradientId=nextSvgId('map-gradient');
  const shadowId=nextSvgId('map-shadow');
  const oceanFill=mixMapColor(effectivePlotBg,'#DCEFFA',.22);
  let s=`<defs><linearGradient id="${gradientId}" x1="0" x2="1" y1="0" y2="0"><stop offset="0%" stop-color="${gradientStart}"/><stop offset="100%" stop-color="${opt.primary}"/></linearGradient><filter id="${shadowId}" x="-15%" y="-15%" width="130%" height="140%"><feDropShadow dx="0" dy="8" stdDeviation="10" flood-color="#12314D" flood-opacity=".10"/></filter></defs>`;

  s+=`<rect x="${mapCard.x}" y="${mapCard.y}" width="${mapCard.width}" height="${mapCard.height}" rx="24" fill="${opt.chartBg}" stroke="${opt.borderColor}" filter="url(#${shadowId})"/>`;
  s+=`<rect x="${mapCard.x+18}" y="${mapCard.y+78}" width="${mapCard.width-36}" height="${mapCard.height-104}" rx="20" fill="${oceanFill}" opacity=".72"/>`;
  s+=`<text x="${mapCard.x+26}" y="${mapCard.y+38}" font-size="${mobileMap?22:22}" font-weight="900" fill="${opt.text}">Mapa coroplético do Brasil</text>`;
  s+=`<text x="${mapCard.x+26}" y="${mapCard.y+63}" font-size="${mobileMap?12.5:12.5}" fill="${opt.text}" opacity=".74">${mobileMap?'Toque':'Passe o cursor'} ou use Tab para consultar uma UF.</text>`;
  s+=`<g transform="${mapTransform}">`;
  BRAZIL_SVG_STATES.forEach(state=>{
    const item=byUf.get(state.uf);
    const hasValue=Boolean(item && Number.isFinite(item.value));
    const ratio=hasValue ? (max===min ? .68 : (item.value-min)/(max-min)) : 0;
    const fill=hasValue ? mixMapColor(gradientStart,opt.primary,.16+.84*ratio) : noDataFill;
    const stateName=UF_NAMES[state.uf] || state.name || state.uf;
    const detail=hasValue ? `${stateName}: ${fmt(item.value,opt.decimals)}%` : `${stateName}: sem dados para os filtros atuais`;
    s+=`<path aria-label="${esc(detail)}" aria-pressed="false" class="map-state-shape" data-map-name="${esc(stateName)}" data-map-uf="${state.uf}" data-map-value="${hasValue?item.value:''}" d="${state.path}" fill="${fill}" role="button" stroke="${effectiveChartBg}" stroke-width="2.2" tabindex="0" vector-effect="non-scaling-stroke"><title>${esc(detail)}</title></path>`;
  });
  BRAZIL_SVG_STATES.forEach(state=>{
    const position=BRAZIL_STATE_LABEL_POSITIONS[state.uf];
    if(!position) return;
    const item=byUf.get(state.uf);
    const hasValue=Boolean(item && Number.isFinite(item.value));
    const ratio=hasValue ? (max===min ? .68 : (item.value-min)/(max-min)) : 0;
    const fill=hasValue ? mixMapColor(gradientStart,opt.primary,.16+.84*ratio) : noDataFill;
    const labelColor=hasValue ? mapLabelColor(fill) : opt.text;
    const smallState=['AL','DF','PB','PE','RN','SE'].includes(state.uf);
    const labelSize=mobileMap ? (smallState?15:19) : (smallState?11.5:13.5);
    s+=`<text x="${position[0]}" y="${position[1]+4}" text-anchor="middle" font-size="${labelSize}" font-weight="950" fill="${labelColor}" stroke="${fill}" stroke-width="2.8" paint-order="stroke" pointer-events="none">${state.uf}</text>`;
  });
  s+=`</g>`;

  s+=`<rect x="${legendX}" y="${legendY}" width="${legendW}" height="${legendH}" rx="24" fill="${opt.chartBg}" stroke="${opt.borderColor}" filter="url(#${shadowId})"/>`;
  s+=`<text x="${scaleX}" y="${legendY+44}" font-size="${mobileMap?21:22}" font-weight="900" fill="${opt.text}">Como ler as cores</text>`;
  s+=`<text x="${scaleX}" y="${legendY+72}" font-size="${bodySize}" fill="${opt.text}" opacity=".76">Mais escuro = maior prevalência estimada.</text>`;
  s+=`<text x="${scaleX}" y="${legendY+96}" font-size="${bodySize}" fill="${opt.text}" opacity=".76">A cor principal pode ser alterada em Aparência.</text>`;
  s+=`<rect x="${scaleX}" y="${scaleY}" width="${scaleW}" height="${mobileMap?18:22}" rx="11" fill="url(#${gradientId})"/>`;
  s+=`<text x="${scaleX}" y="${scaleY+40}" font-size="12" fill="${opt.text}">${values.length?`${fmt(min,opt.decimals)}%`:'Sem valor mínimo'}</text>`;
  s+=`<text x="${scaleX+scaleW}" y="${scaleY+40}" text-anchor="end" font-size="12" fill="${opt.text}">${values.length?`${fmt(max,opt.decimals)}%`:'Sem valor máximo'}</text>`;
  s+=`<rect x="${scaleX}" y="${scaleY+56}" width="18" height="18" rx="5" fill="${noDataFill}" stroke="${opt.borderColor}"/><text x="${scaleX+29}" y="${scaleY+70}" font-size="12" fill="${opt.text}">Sem dados no recorte</text>`;

  const ranked=[...available].sort((a,b)=>b.value-a.value).slice(0,mobileMap?4:6);
  if(ranked.length){
    s+=`<line x1="${scaleX}" x2="${scaleX+scaleW}" y1="${scaleY+98}" y2="${scaleY+98}" stroke="${opt.borderColor}"/>`;
    s+=`<text x="${scaleX}" y="${scaleY+128}" font-size="15" font-weight="900" fill="${opt.text}">Maiores valores do recorte</text>`;
    ranked.forEach((item,index)=>{
      const uf=String(item.category || '').toUpperCase();
      const ratio=max===min ? .68 : (item.value-min)/(max-min);
      const fill=mixMapColor(gradientStart,opt.primary,.16+.84*ratio);
      const y=scaleY+160+index*(mobileMap?36:43);
      s+=`<circle cx="${scaleX+9}" cy="${y-5}" r="${mobileMap?10:9}" fill="${fill}"/><text x="${scaleX+30}" y="${y}" font-size="${rankSize}" font-weight="750" fill="${opt.text}">${index+1}. ${esc(UF_NAMES[uf] || uf)}</text><text x="${scaleX+scaleW}" y="${y}" text-anchor="end" font-size="${rankSize}" font-weight="900" fill="${opt.text}">${fmt(item.value,opt.decimals)}%</text>`;
    });
  }

  s+=`<text x="${mobileMap?24:40}" y="${h-9}" font-size="${mobileMap?9.5:10.5}" fill="${opt.text}" opacity=".62">Geometria vetorial: MapSVG / @svg-maps/brazil, CC BY 4.0.</text>`;
  return svgWrap(s,w,h,opt);
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

/** Retorna as séries e categorias presentes nos dados multissérie. */
function seriesChartStructure(data){
  const series=SEX_FILTER_VALUES.filter(name=>data.some(item=>item.series===name));
  data.forEach(item=>{ if(item.series && !series.includes(item.series)) series.push(item.series); });
  const categories=[];
  data.forEach(item=>{ if(!categories.includes(item.label)) categories.push(item.label); });
  const lookup=new Map(data.map(item=>[`${item.series}|||${item.label}`,item]));
  return {series,categories,lookup};
}

/** Desenha uma legenda compacta para Todos, Feminino e Masculino. */
function sexSeriesLegendSvg(series,opt,x=110,y=18){
  if(!opt.showLegend || !series.length) return '';
  let cursor=x;
  return series.map(name=>{
    const color=sexSeriesColor(name,opt);
    const dash=seriesStrokeDasharray(name);
    const width=Math.max(92,58+String(name).length*7.1);
    const marker = dash
      ? `<line x1="${cursor}" y1="${y-3}" x2="${cursor+16}" y2="${y-3}" stroke="${color}" stroke-width="4" stroke-linecap="round" ${dash ? `stroke-dasharray="${dash}"` : ''}/>`
      : `<rect x="${cursor}" y="${y-11}" width="14" height="14" rx="4" fill="${color}"/>`;
    const out=`<g>${marker}<text x="${cursor+24}" y="${y+1}" font-size="${Math.max(9,opt.legendSize||12)}" font-weight="700" fill="${opt.text}">${esc(name)}</text></g>`;
    cursor+=width;
    return out;
  }).join('');
}

/** Desenha linhas ou áreas independentes para cada sexo marcado. */
function seriesLineSvg(data,opt,area=false){
  const {series,categories,lookup}=seriesChartStructure(data);
  const n=Math.max(1,categories.length);
  const w=Math.max(1120,n>24?1260:1120), h=620;
  const l=96,r=42,t=58,b=n>40?148:(n>18?128:110);
  const max=Math.max(...data.map(d=>d.value),1)*1.18;
  const pw=w-l-r, ph=h-b-t;
  const labelEvery=n>60?6:(n>42?5:(n>28?4:(n>16?2:1)));
  const labelFs=Math.max(8,opt.axisSize||13), valueFs=Math.max(8,opt.valueSize||13);
  const rot=opt.labelRotation==='auto'?(n>10?35:0):Number(opt.labelRotation||0);
  const denseComparison = series.length > 2 || (series.length > 1 && n > 10) || series.length > 6 || (series.length > 4 && n > 8);
  const drawSeries=[...series].sort((a,b)=>seriesDrawPriority(a)-seriesDrawPriority(b));
  let s=grid(l,w-r,t,h-b,max,opt)+sexSeriesLegendSvg(series,opt,l,25);
  drawSeries.forEach((name,seriesIndex)=>{
    const color=sexSeriesColor(name,opt);
    const dash=seriesStrokeDasharray(name);
    const pts=categories.map((label,i)=>{
      const d=lookup.get(`${name}|||${label}`);
      if(!d) return null;
      return {x:n>1?l+i*pw/(n-1):l+pw/2,y:h-b-(d.value/max)*ph,d,i};
    }).filter(Boolean);
    if(!pts.length) return;
    const path=pts.map((p,i)=>`${i?'L':'M'}${p.x} ${p.y}`).join(' ');
    if(area && pts.length>1) s+=`<path d="${path} L ${pts.at(-1).x} ${h-b} L ${pts[0].x} ${h-b} Z" fill="${color}" opacity=".08"/>`;
    s+=`<path d="${path}" fill="none" stroke="${color}" stroke-width="${dash ? Number(opt.lineWidth||3)+0.6 : opt.lineWidth}" stroke-linecap="round" stroke-linejoin="round" ${dash ? `stroke-dasharray="${dash}"` : ''}/>`;
    pts.forEach(p=>{
      if(opt.showPoints && opt.pointSize>0) s+=`<circle cx="${p.x}" cy="${p.y}" r="${opt.pointSize}" fill="${color}" stroke="${opt.chartBg}" stroke-width="1.5"/>`;
      if(opt.showValues && opt.valuePosition!=='none' && !denseComparison){
        const valueOffset = -11;
        s+=`<text x="${p.x}" y="${p.y+valueOffset}" text-anchor="middle" font-size="${Math.max(8,valueFs-1)}" font-weight="800" fill="${color}" stroke="${opt.chartBg}" stroke-width="3" paint-order="stroke">${fmt(p.d.value,opt.decimals)}</text>`;
      }
    });
  });
  if(opt.showAxisLabels) categories.forEach((label,i)=>{
    if(i%labelEvery!==0 && i!==n-1) return;
    const x=n>1?l+i*pw/(n-1):l+pw/2;
    const text=short(label,n>30?14:22);
    if(rot) s+=`<text x="${x}" y="${h-b+26}" text-anchor="end" font-size="${labelFs}" fill="${opt.text}" transform="rotate(-${rot} ${x} ${h-b+26})">${esc(text)}</text>`;
    else s+=`<text x="${x}" y="${h-b+24}" text-anchor="middle" font-size="${labelFs}" fill="${opt.text}">${esc(text)}</text>`;
  });
  s+=axis(w,h,l,b,t,opt,opt.xAxisTitle||'Categoria',opt.yAxisTitle||'Prevalência (%)');
  return svgWrap(s,w,h,opt);
}

/** Desenha barras verticais agrupadas por categoria e sexo. */
function seriesBarSvg(data,opt){
  const {series,categories,lookup}=seriesChartStructure(data);
  const n=Math.max(1,categories.length), m=Math.max(1,series.length);
  const w=Math.max(1120,n>24?1320:1120),h=620,l=104,r=52,t=58,b=n>40?154:(n>18?134:116);
  const max=Math.max(...data.map(d=>d.value),1)*1.18,pw=w-l-r,ph=h-b-t,step=pw/n;
  const groupW=Math.min(step*.82,Math.max(20,step-6)),barW=Math.max(3,Math.min(42,(groupW/m)*opt.barWidthScale));
  const innerGap=m>1?Math.max(2,(groupW-barW*m)/(m-1)):0;
  const labelEvery=n>60?6:(n>42?5:(n>28?4:(n>16?2:1)));
  const labelFs=Math.max(8,opt.axisSize||13),valueFs=Math.max(8,opt.valueSize||13);
  const rot=opt.labelRotation==='auto'?(n>10?35:0):Number(opt.labelRotation||0);
  let s=grid(l,w-r,t,h-b,max,opt)+sexSeriesLegendSvg(series,opt,l,25);
  categories.forEach((label,i)=>{
    const start=l+i*step+(step-groupW)/2;
    series.forEach((name,j)=>{
      const d=lookup.get(`${name}|||${label}`); if(!d) return;
      const x=start+j*(barW+innerGap),bh=Math.max(0,(d.value/max)*ph),y=h-b-bh,color=sexSeriesColor(name,opt);
      s+=`<rect x="${x}" y="${y}" width="${barW}" height="${bh}" rx="5" fill="${color}" opacity=".96"/>`;
      if(opt.showValues && opt.valuePosition!=='none'){
        const inside=opt.valuePosition==='inside' && bh>30;
        s+=`<text x="${x+barW/2}" y="${inside?y+18:y-7}" text-anchor="middle" font-size="${Math.max(8,valueFs-1)}" font-weight="800" fill="${inside?'#fff':color}">${fmt(d.value,opt.decimals)}</text>`;
      }
    });
    if(opt.showAxisLabels && (i%labelEvery===0 || i===n-1)){
      const x=l+i*step+step/2,text=short(label,n>30?14:22);
      if(rot) s+=`<text x="${x}" y="${h-b+25}" text-anchor="end" font-size="${labelFs}" fill="${opt.text}" transform="rotate(-${rot} ${x} ${h-b+25})">${esc(text)}</text>`;
      else s+=`<text x="${x}" y="${h-b+25}" text-anchor="middle" font-size="${labelFs}" fill="${opt.text}">${esc(text)}</text>`;
    }
  });
  s+=axis(w,h,l,b,t,opt,opt.xAxisTitle||'Categoria',opt.yAxisTitle||'Prevalência (%)');
  return svgWrap(s,w,h,opt);
}

/** Desenha barras horizontais agrupadas por categoria e sexo. */
function seriesHbarSvg(data,opt,ranking=false){
  const structure=seriesChartStructure(data);
  let categories=[...structure.categories];
  if(ranking){
    categories.sort((a,b)=>{
      /** Calcula a média das séries para ordenar as categorias do ranking. */
      const avg=label=>structure.series.reduce((sum,name)=>sum+(structure.lookup.get(`${name}|||${label}`)?.value||0),0)/Math.max(1,structure.series.length);
      return avg(b)-avg(a);
    });
  }
  const {series,lookup}=structure,m=Math.max(1,series.length),rows=Math.max(1,categories.length);
  const w=1180,l=280,r=120,t=58,b=82,rowH=Math.max(50,m*22+18),h=Math.max(460,110+rows*rowH);
  const max=Math.max(...data.map(d=>d.value),1)*1.12,plotW=w-l-r,barH=Math.max(8,Math.min(17,14*opt.barWidthScale/.7));
  const fs=Math.max(8,opt.axisSize||13),valueFs=Math.max(8,opt.valueSize||13);
  let s=sexSeriesLegendSvg(series,opt,l,25);
  if(opt.showGrid||opt.showAxisLabels){
    for(let i=0;i<=4;i++){
      const x=l+plotW*i/4,val=max*i/4;
      if(opt.showGrid) s+=`<line x1="${x}" x2="${x}" y1="${t}" y2="${h-b}" stroke="${opt.gridColor}"/>`;
      if(opt.showAxisLabels) s+=`<text x="${x}" y="${h-b+26}" text-anchor="middle" font-size="${fs}" fill="${opt.text}">${fmt(val,opt.decimals)}</text>`;
    }
  }
  categories.forEach((label,i)=>{
    const groupY=t+i*rowH;
    if(opt.showAxisLabels) s+=`<text x="${l-14}" y="${groupY+(m*22)/2+3}" text-anchor="end" font-size="${fs}" fill="${opt.text}">${esc(short(label,26))}</text>`;
    series.forEach((name,j)=>{
      const d=lookup.get(`${name}|||${label}`); if(!d) return;
      const y=groupY+j*22,bw=plotW*(d.value/max),color=sexSeriesColor(name,opt);
      s+=`<rect x="${l}" y="${y}" width="${bw}" height="${barH}" rx="7" fill="${color}"/>`;
      if(opt.showValues && opt.valuePosition!=='none') s+=`<text x="${Math.min(w-r-4,l+bw+8)}" y="${y+barH-2}" text-anchor="start" font-size="${Math.max(8,valueFs-1)}" font-weight="800" fill="${color}">${fmt(d.value,opt.decimals)}</text>`;
    });
  });
  s+=axis(w,h,l,b,t,opt,opt.xAxisTitle||'Prevalência (%)',opt.yAxisTitle||'Categoria');
  return svgWrap(s,w,h,opt);
}

/** Desenha pirulitos horizontais agrupados por categoria e sexo. */
function seriesLollipopSvg(data,opt){
  const structure=seriesChartStructure(data);
  const {series,lookup}=structure,m=Math.max(1,series.length);
  const categories=[...structure.categories];
  const rows=Math.max(1,categories.length);
  const w=1180,l=280,r=120,t=58,b=82,rowH=Math.max(50,m*22+18),h=Math.max(460,110+rows*rowH);
  const max=Math.max(...data.map(d=>d.value),1)*1.12,plotW=w-l-r;
  const fs=Math.max(8,opt.axisSize||13),valueFs=Math.max(8,opt.valueSize||13);
  let s=sexSeriesLegendSvg(series,opt,l,25);
  if(opt.showGrid||opt.showAxisLabels){
    for(let i=0;i<=4;i++){
      const x=l+plotW*i/4,val=max*i/4;
      if(opt.showGrid) s+=`<line x1="${x}" x2="${x}" y1="${t}" y2="${h-b}" stroke="${opt.gridColor}"/>`;
      if(opt.showAxisLabels) s+=`<text x="${x}" y="${h-b+26}" text-anchor="middle" font-size="${fs}" fill="${opt.text}">${fmt(val,opt.decimals)}</text>`;
    }
  }
  categories.forEach((label,i)=>{
    const groupY=t+i*rowH;
    if(opt.showAxisLabels) s+=`<text x="${l-14}" y="${groupY+(m*22)/2+3}" text-anchor="end" font-size="${fs}" fill="${opt.text}">${esc(short(label,26))}</text>`;
    series.forEach((name,j)=>{
      const d=lookup.get(`${name}|||${label}`); if(!d) return;
      const y=groupY+j*22+8,x=l+plotW*(d.value/max),color=sexSeriesColor(name,opt);
      s+=`<line x1="${l}" y1="${y}" x2="${x}" y2="${y}" stroke="#D5E1EF" stroke-width="${Math.max(4,opt.lineWidth+3)}" stroke-linecap="round"/>`;
      s+=`<circle cx="${x}" cy="${y}" r="${Math.max(5,opt.pointSize+3)}" fill="${color}"/>`;
      if(opt.showValues && opt.valuePosition!=='none') s+=`<text x="${Math.min(w-r+10,x+14)}" y="${y+4}" font-size="${valueFs}" font-weight="800" fill="${color}">${fmt(d.value,opt.decimals)}</text>`;
    });
  });
  s+=axis(w,h,l,b,t,opt,opt.xAxisTitle||'Prevalência (%)',opt.yAxisTitle||'Categoria');
  return svgWrap(s,w,h,opt);
}

/** Desenha várias séries sobre os mesmos eixos do radar. */
function seriesRadarSvg(data,opt){
  const {series,categories,lookup}=seriesChartStructure(data);
  if(categories.length<3) return seriesBarSvg(data,opt);
  const count=categories.length,w=count>24?1360:1180,h=count>24?820:660,cx=w/2,cy=(h-80)/2,r=Math.max(130,Math.min((w-240)/2,(h-210)/2));
  const max=Math.max(...data.map(d=>d.value),1),step=Math.PI*2/count,fs=Math.max(8,Math.min(opt.axisSize||13,count>24?10:13));
  let s=sexSeriesLegendSvg(series,opt,80,25);
  [0.2,0.4,0.6,0.8,1].forEach(k=>s+=`<circle cx="${cx}" cy="${cy}" r="${r*k}" fill="none" stroke="${opt.gridColor}"/>`);
  categories.forEach((label,i)=>{
    const a=-Math.PI/2+i*step,lx=cx+Math.cos(a)*(r+42),ly=cy+Math.sin(a)*(r+42),anchor=Math.abs(Math.cos(a))<.18?'middle':Math.cos(a)>0?'start':'end';
    s+=`<line x1="${cx}" y1="${cy}" x2="${cx+Math.cos(a)*r}" y2="${cy+Math.sin(a)*r}" stroke="${opt.gridColor}"/>`;
    if(opt.showAxisLabels) s+=`<text x="${lx}" y="${ly+4}" text-anchor="${anchor}" font-size="${fs}" fill="${opt.text}">${esc(short(label,count>20?14:20))}</text>`;
  });
  series.forEach(name=>{
    const color=sexSeriesColor(name,opt);
    const pts=categories.map((label,i)=>{const d=lookup.get(`${name}|||${label}`);const a=-Math.PI/2+i*step;const rr=r*((d?.value||0)/max);return {x:cx+Math.cos(a)*rr,y:cy+Math.sin(a)*rr,d};});
    s+=`<polygon points="${pts.map(p=>`${p.x},${p.y}`).join(' ')}" fill="${color}" opacity=".10" stroke="${color}" stroke-width="${Math.max(2,opt.lineWidth)}"/>`;
    if(opt.showPoints) pts.forEach(p=>s+=`<circle cx="${p.x}" cy="${p.y}" r="${Math.max(2.5,opt.pointSize*.72)}" fill="${color}"/>`);
  });
  return svgWrap(s,w,h,opt);
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
    s += `<rect x="${x}" y="${y}" width="${bw}" height="${bh}" rx="7" fill="${datumColor(d,i,opt)}" opacity="0.96"/>`;

    if(opt.showValues && opt.valuePosition !== 'none'){
      const inside = opt.valuePosition === 'inside' && bh > 30;
      s += `<text x="${x + bw / 2}" y="${inside ? y + 21 : y - 8}" text-anchor="middle" font-size="${Math.max(8,valueFs-1)}" font-weight="800" fill="${inside ? '#fff' : opt.text}" stroke="${inside ? 'none' : opt.chartBg}" stroke-width="${inside ? 0 : 3}" paint-order="stroke">${fmt(d.value,opt.decimals)}</text>`;
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
    if(opt.showValues && opt.valuePosition !== 'none'){
      s += `<text x="${p.x}" y="${p.y - 12}" text-anchor="middle" font-size="${Math.max(8,valueFs-1)}" font-weight="800" fill="${opt.text}" stroke="${opt.chartBg}" stroke-width="3" paint-order="stroke">${fmt(p.d.value,opt.decimals)}</text>`;
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
    s += `<rect x="${l}" y="${y}" width="${bw}" height="${barH}" rx="10" fill="${datumColor(d,i,opt)}"/>`;
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
    s += `<circle cx="${x}" cy="${y}" r="${Math.max(5,opt.pointSize+3)}" fill="${datumColor(d,i,opt)}"/>`;
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
    s += `<rect x="${x}" y="${y}" width="${bw}" height="${bh}" rx="5" fill="${datumColor(d,i,opt)}"/>`;
    if(opt.showValues) s += `<text x="${x+bw/2}" y="${Math.max(t+12,y-7)}" text-anchor="middle" font-size="${Math.max(8,valueFs-1)}" font-weight="700" fill="${opt.text}" stroke="${opt.chartBg}" stroke-width="3" paint-order="stroke">${fmt(d.value,opt.decimals)}</text>`;
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
  const transparent = exportBackgroundIsTransparent();
  return {
    ...opt,
    text:'#112B44',
    chartBg:transparent ? 'transparent' : '#FFFFFF',
    plotBg:transparent ? 'transparent' : '#FFFFFF',
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
      s += `<path d="${arc(cx, cy, r, angle, angle + ang)}" fill="${datumColor(d,i,opt)}" fill-opacity="${opacity}" stroke="#fff" stroke-width="3"/>`;
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
      s += `<g class="legend-item${hidden ? ' hidden' : ''}" tabindex="0" role="button" aria-pressed="${!hidden}" aria-label="${hidden ? 'Mostrar' : 'Ocultar'} categoria ${esc(d.label)}" data-legend-category="${encoded}" opacity="${opacity}"><rect x="${x}" y="${y}" width="15" height="15" rx="4" fill="${datumColor(d,i,opt)}"/><text x="${x + 22}" y="${y + 12}" font-size="${layout.font}" fill="${opt.text}">${i + 1}. ${esc(short(d.label, labelMax))} · ${fmt(d.value,opt.decimals)}%</text><line class="legend-strike" x1="${x + 20}" x2="${strikeEnd}" y1="${y + 7}" y2="${y + 7}" stroke="${opt.text}" stroke-width="1.4" opacity=".55" style="display:${hidden ? 'block' : 'none'}"/></g>`;
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
    const fill = datumColor(d,i,opt);
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
      s += `<g class="legend-item${hidden ? ' hidden' : ''}" tabindex="0" role="button" aria-pressed="${!hidden}" aria-label="${hidden ? 'Mostrar' : 'Ocultar'} categoria ${esc(d.label)}" data-legend-category="${encoded}" opacity="${opacity}"><rect x="${lx}" y="${ly}" width="14" height="14" rx="4" fill="${datumColor(d,i,opt)}"/><text x="${lx + 22}" y="${ly + 12}" font-size="${legendFs}" fill="${opt.text}">${i+1}. ${esc(short(d.label, cols >= 3 ? 18 : cols === 2 ? 22 : 28))} · ${fmt(d.value,opt.decimals)}%</text><line class="legend-strike" x1="${lx + 20}" x2="${strikeEnd}" y1="${ly + 7}" y2="${ly + 7}" stroke="${opt.text}" stroke-width="1.4" opacity=".55" style="display:${hidden ? 'block' : 'none'}"/></g>`;
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
    s += `<rect x="${x}" y="${y}" width="${cardW}" height="155" rx="20" fill="${datumColor(d,i,opt)}" opacity=".92"/>`;
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
    s += `<path d="${arcStroke(cx,cy,r,-90,-90+180*val/100)}" fill="none" stroke="${datumColor(d,i,opt)}" stroke-width="24" stroke-linecap="round"/>`;
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

/** Usa a cor escolhida para o sexo quando o dado pertence a uma série demográfica. */
function datumColor(datum,index,opt){
  return datum?.series ? sexSeriesColor(datum.series,opt) : palette(index,opt);
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
 * Renderiza a tabela abaixo do gráfico com os resultados processados calculados.
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
  body.innerHTML=pageRows.map((row,index)=>{
    const precision=estimatePrecision(row);
    const rowClass=precision.key==='ok'?'':'low-sample-row';
    const detailId=`tableDetails_${start+index}`;
    return `<tr class="data-table-main-row ${rowClass}"><td data-label="Indicador">${esc(row.Indicador||'')}</td><td data-label="Categoria">${esc(row.Categoria)}</td><td data-label="Valor (%)"><strong>${esc(row['Valor (%)'])}</strong></td><td data-label="Precisão"><span class="reliability-badge ${precision.className}">${esc(precision.label)}</span></td><td data-label="Detalhes"><button aria-controls="${detailId}" aria-expanded="false" class="table-detail-toggle" type="button">Ver detalhes</button></td></tr><tr class="table-detail-row" hidden="" id="${detailId}"><td colspan="5"><div class="table-detail-grid"><div><span>IC 95% aproximado</span><strong>${esc(row['IC 95% aproximado'])}</strong></div><div><span>CV aproximado</span><strong>${esc(row['CV aproximado (%)'])}</strong></div><div><span>Casos</span><strong>${esc(row.Casos)}</strong></div><div><span>Entrevistas</span><strong>${esc(row.Entrevistas)}</strong></div><div class="table-detail-source"><span>Fonte</span><strong>${esc(row.Fonte)}</strong></div></div></td></tr>`;
  }).join('');
  if(!pageRows.length) body.innerHTML='<tr><td colspan="5">Nenhum resultado encontrado na tabela.</td></tr>';
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
  /** Desenha o SVG carregado em uma tela de alta resolução e inicia o download em PNG. */
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
  /** Libera o endereço temporário e orienta o uso do SVG quando a conversão falha. */
  img.onerror=function(){URL.revokeObjectURL(url);announceSave('Não foi possível gerar a imagem PNG. Tente novamente ou use a exportação SVG.');};
  img.src=url;
}

/* Exportação explícita para o carregador progressivo. */
window.VigitelAnalitico = window.VigitelAnalitico || {};
window.VigitelAnalitico.init = init;

