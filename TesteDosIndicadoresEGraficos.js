/**
 * Executa verificações de consistência sobre dados, indicadores e gráficos.
 * Indicadores sem variável na base consolidada são aceitos somente quando a
 * indisponibilidade estiver documentada nos metadados públicos.
 */

const fs = require('fs');
const vm = require('vm');
const path = require('path');

const root = __dirname;
const appSource = fs.readFileSync(path.join(root, 'SistemaAnaliticoDoVigitel.js'), 'utf8');
const dataSource = fs.readFileSync(path.join(root, 'BaseAnaliticaDoVigitel.js'), 'utf8');
const match = dataSource.match(/const DATA = (\{.*?\});[\s\S]*?const \$\s*=/s);
if (!match) throw new Error('Não foi possível carregar DATA.');
const DATA = JSON.parse(match[1]);
const unsupported = DATA.meta?.unsupportedIndicators || {};
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
    const current = totals.get(year) || {num:0, den:0, n:0};
    current.num += Number(row[C.num]) || 0;
    current.den += Number(row[C.den]) || 0;
    current.n += Number(row[C.n]) || 0;
    totals.set(year,current);
  }
  return [...totals.entries()].sort((a,b)=>Number(a[0])-Number(b[0])).map(([category,value])=>({
    category, value:value.num/value.den*100, numerador:value.num, denominador:value.den, n:value.n
  }));
}

const chartTypes=['line','area','bar','horizontal','ranking','lollipop','pareto','pie','donut','radar','kpi','gauge','treemap'];
const failures=[];
const unavailable=[];
let rendered=0;
for (let indicatorIndex=0; indicatorIndex<DATA.indicators.length; indicatorIndex++) {
  const indicator=DATA.indicators[indicatorIndex];
  const series=nationalSeries(indicatorIndex);
  if (!series.length) {
    if (unsupported[indicator.id]) {
      unavailable.push(`${indicator.id}: ${unsupported[indicator.id]}`);
      continue;
    }
    failures.push(`${indicator.id}: sem dados nacionais e sem justificativa de indisponibilidade`);
    continue;
  }
  context.S.indicator=indicator;
  context.S.graphMeta={title:indicator.label,subtitle:'Teste automatizado',source:'Vigitel'};
  for (const type of chartTypes) {
    target.innerHTML=''; target.attrs={}; context.S.chart=type;
    try {
      context.drawChart(series,'Ano',target,type,context.S.graphMeta);
      const ok=target.innerHTML.includes('<svg') && target.attrs['data-rendered-chart']===type && target.attrs['data-chart-type']===type;
      if (!ok) failures.push(`${indicator.id}/${type}: SVG ou identificação ausente`);
      else rendered++;
    } catch (error) {
      failures.push(`${indicator.id}/${type}: ${error.message}`);
    }
  }
}

const report=[
  'TESTE DOS INDICADORES DISPONÍVEIS EM TODOS OS GRÁFICOS — V13.0',
  '='.repeat(66),
  `Indicadores cadastrados: ${DATA.indicators.length}`,
  `Indicadores indisponíveis documentados: ${unavailable.length}`,
  `Indicadores testados: ${DATA.indicators.length - unavailable.length}`,
  `Tipos de gráfico: ${chartTypes.length}`,
  `Combinações renderizadas: ${rendered}`,
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
