/**
 * Executa verificações de consistência sobre dados, indicadores e gráficos.
 * Indicadores sem variável na base consolidada são aceitos somente quando a
 * indisponibilidade estiver documentada nos metadados públicos.
 *
 * Cada indicador disponível é testado duas vezes em todos os tipos de gráfico:
 * pela série anual da base principal e pela distribuição de idade detalhada.
 */

const fs = require('fs');
const vm = require('vm');
const path = require('path');

const root = __dirname;
const appSource = fs.readFileSync(path.join(root, 'SistemaAnaliticoDoVigitel.js'), 'utf8');
const dataSource = fs.readFileSync(path.join(root, 'BaseAnaliticaDoVigitel.js'), 'utf8');
const dataMatch = dataSource.match(/const DATA = (\{.*?\});[\s\S]*?const \$\s*=/s);
if (!dataMatch) throw new Error('Não foi possível carregar DATA.');
const DATA = JSON.parse(dataMatch[1]);
const unsupported = DATA.meta?.unsupportedIndicators || {};

const catalogSource = fs.readFileSync(path.join(root, 'CatalogoDeIdadeDetalhada.js'), 'utf8');
const catalogMatch = catalogSource.match(/window\.VIGITEL_AGE_DETAIL=(\{.*?\});window\.VIGITEL_AGE_DETAIL\.loaded=/s);
if (!catalogMatch) throw new Error('Não foi possível carregar o catálogo de idade detalhada.');
const AGE = JSON.parse(catalogMatch[1]);

const start = appSource.indexOf('function displayCategory');
const end = appSource.indexOf('function currentBaseRowsForExport');
if (start < 0 || end < 0) throw new Error('Bloco de renderização não localizado.');
const rendererSource = appSource.slice(start, end);

const target = {
  innerHTML: '', attrs: {},
  setAttribute(name, value) { this.attrs[name] = String(value); },
  querySelector() { return null; }
};
const defaults = {
  fontSize:'18',titleSize:'22',subtitleSize:'14',axisSize:'13',legendSize:'13',valueSize:'13',decimalPlaces:'1',
  primaryColor:'#073B70',secondaryColor:'#0FA7A0',textColor:'#16324F',chartBgColor:'#FFFFFF',plotBgColor:'#FFFFFF',
  gridColor:'#DDE7F2',borderColor:'#D6E1EE',fontFamily:'Arial',titleAlign:'center',subtitleAlign:'center',sourceAlign:'left',
  labelRotation:'auto',sortOrder:'original',valuePosition:'outside',legendPosition:'right',paletteSelect:'default',barWidthScale:'70',
  lineWidth:'4',pointSize:'5',donutHole:'45',customTitle:'',customSubtitle:'',sourceText:'',xAxisTitle:'',yAxisTitle:'',legendSearchInput:''
};
const checked = new Set(['showValues','showGrid','showLegend','showSource','showBorder','showXAxisTitle','showYAxisTitle','showAxisLabels','showPoints','showTreemapLabels']);
const field = id => ({ value: defaults[id] ?? '', checked: checked.has(id) });
const C = {year:0,region:1,uf:2,sex:3,age:4,pop:5,ind:6,num:7,den:8,n:9,cases:10,w2:11};
const AGE_C = {year:0,uf:1,sex:2,age:3,pop:4,num:5,den:6,n:7,cases:8,w2:9};
const context = {
  console, window:{innerWidth:1600}, document:{fullscreenElement:null}, DATA, C,
  S:{graphMeta:{title:'Teste real',subtitle:'Dados reais',source:'Fonte de teste'},hiddenCategories:[],legendSearch:'',chart:'bar',indicator:DATA.indicators[0]},
  UF_NAMES:{}, effectiveGroup:g=>g, categoryToken:l=>String(l), isHiddenCategory:()=>false, matchesLegendSearch:()=>true,
  $:selector=>selector==='#chart'?target:field(selector.replace('#','')), $$:()=>[], target,
  Math,Number,String,Array,Object,Map,Set,Date,Intl,encodeURIComponent,decodeURIComponent
};
vm.createContext(context);
vm.runInContext(rendererSource, context, {timeout:30000});

function nationalSeries(indicatorIndex) {
  const totals = new Map();
  for (const row of DATA.rows) {
    if (row[C.ind] !== indicatorIndex || row[C.pop] !== 0) continue;
    const year = DATA.dims.years[row[C.year]];
    const current = totals.get(year) || {num:0, den:0, n:0, cases:0, w2:0};
    current.num += Number(row[C.num]) || 0;
    current.den += Number(row[C.den]) || 0;
    current.n += Number(row[C.n]) || 0;
    current.cases += Number(row[C.cases]) || 0;
    current.w2 += Number(row[C.w2]) || 0;
    totals.set(year,current);
  }
  return [...totals.entries()].sort((a,b)=>Number(a[0])-Number(b[0])).map(([category,value])=>({
    category, value:value.num/value.den*100, numerador:value.num, denominador:value.den,
    n:value.n, cases:value.cases, w2:value.w2
  }));
}

const bundleCache = new Map();
function exactRows(indicatorId) {
  const fileName = AGE.meta?.files?.[indicatorId];
  if (!fileName) throw new Error(`Catálogo não informa arquivo para ${indicatorId}.`);
  const filePath = path.join(root, fileName);
  if (!fs.existsSync(filePath)) throw new Error(`Arquivo de idade detalhada ausente: ${fileName}.`);
  if (!bundleCache.has(filePath)) bundleCache.set(filePath, fs.readFileSync(filePath, 'utf8'));
  const escaped = indicatorId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = bundleCache.get(filePath).match(new RegExp(`window\\.VIGITEL_AGE_DETAIL\\.loaded\\["${escaped}"\\]=(\\[.*?\\]);`, 's'));
  if (!match) throw new Error(`Dados detalhados não encontrados para ${indicatorId}.`);
  return JSON.parse(match[1]);
}

function detailedAgeSeries(indicatorId) {
  const rows = exactRows(indicatorId).filter(row => Number(row[AGE_C.pop]) === 0);
  if (!rows.length) return [];
  const latestYear = Math.max(...rows.map(row => Number(row[AGE_C.year])));
  const totals = new Map();
  for (const row of rows) {
    if (Number(row[AGE_C.year]) !== latestYear) continue;
    const age = AGE.dims.ages[row[AGE_C.age]];
    const current = totals.get(age) || {num:0, den:0, n:0, cases:0, w2:0, order:Number(row[AGE_C.age])};
    current.num += Number(row[AGE_C.num]) || 0;
    current.den += Number(row[AGE_C.den]) || 0;
    current.n += Number(row[AGE_C.n]) || 0;
    current.cases += Number(row[AGE_C.cases]) || 0;
    current.w2 += Number(row[AGE_C.w2]) || 0;
    totals.set(age,current);
  }
  return [...totals.entries()]
    .sort((a,b)=>a[1].order-b[1].order)
    .filter(([,value])=>value.den>0)
    .map(([category,value])=>({
      category, value:value.num/value.den*100, numerador:value.num, denominador:value.den,
      n:value.n, cases:value.cases, w2:value.w2
    }));
}

function renderAndCheck(series, group, indicator, type, scope, failures) {
  target.innerHTML='';
  target.attrs={};
  context.S.chart=type;
  context.S.indicator=indicator;
  context.S.graphMeta={
    title:indicator.label,
    subtitle:scope === 'idade' ? 'Teste automatizado por idade detalhada' : 'Teste automatizado por ano',
    source:'Vigitel'
  };
  try {
    context.drawChart(series,group,target,type,context.S.graphMeta);
    const ok=target.innerHTML.includes('<svg') && target.attrs['data-rendered-chart']===type && target.attrs['data-chart-type']===type;
    if (!ok) failures.push(`${indicator.id}/${scope}/${type}: SVG ou identificação ausente`);
    return ok;
  } catch (error) {
    failures.push(`${indicator.id}/${scope}/${type}: ${error.message}`);
    return false;
  }
}

const chartTypes=['line','area','bar','horizontal','ranking','lollipop','pareto','pie','donut','radar','kpi','gauge','treemap'];
const failures=[];
const unavailable=[];
let renderedAnnual=0;
let renderedDetailed=0;
let indicatorsWithDetailedAge=0;

for (let indicatorIndex=0; indicatorIndex<DATA.indicators.length; indicatorIndex++) {
  const indicator=DATA.indicators[indicatorIndex];
  const annual=nationalSeries(indicatorIndex);
  if (!annual.length) {
    if (unsupported[indicator.id]) {
      unavailable.push(`${indicator.id}: ${unsupported[indicator.id]}`);
      continue;
    }
    failures.push(`${indicator.id}: sem dados nacionais e sem justificativa de indisponibilidade`);
    continue;
  }

  let detailed=[];
  try {
    detailed=detailedAgeSeries(indicator.id);
  } catch (error) {
    failures.push(`${indicator.id}/idade: ${error.message}`);
  }
  if (!detailed.length) failures.push(`${indicator.id}/idade: nenhuma categoria detalhada disponível`);
  else indicatorsWithDetailedAge++;

  for (const type of chartTypes) {
    if (renderAndCheck(annual,'Ano',indicator,type,'ano',failures)) renderedAnnual++;
    if (detailed.length && renderAndCheck(detailed,'Idade detalhada',indicator,type,'idade',failures)) renderedDetailed++;
  }
}

const testedIndicators=DATA.indicators.length-unavailable.length;
const report=[
  'TESTE DOS INDICADORES E DA IDADE DETALHADA EM TODOS OS GRÁFICOS — V13.0',
  '='.repeat(76),
  `Indicadores cadastrados: ${DATA.indicators.length}`,
  `Indicadores indisponíveis documentados: ${unavailable.length}`,
  `Indicadores testados: ${testedIndicators}`,
  `Indicadores com idade detalhada testada: ${indicatorsWithDetailedAge}`,
  `Tipos de gráfico: ${chartTypes.length}`,
  `Combinações anuais renderizadas: ${renderedAnnual}`,
  `Combinações de idade detalhada renderizadas: ${renderedDetailed}`,
  `Combinações totais renderizadas: ${renderedAnnual+renderedDetailed}`,
  `Falhas: ${failures.length}`,
  '',
  'INDISPONIBILIDADES DOCUMENTADAS',
  ...(unavailable.length ? unavailable : ['Nenhuma.']),
  '',
  'FALHAS',
  ...(failures.length ? failures : ['Nenhuma falha encontrada.'])
].join('\n')+'\n';
fs.writeFileSync(path.join(__dirname,'RelatorioDosIndicadoresEGraficos.txt'),report,'utf8');
console.log(report);
if (failures.length) process.exit(1);
