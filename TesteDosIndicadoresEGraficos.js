/**
 * Executa verificações de consistência sobre dados, indicadores ou recursos gráficos.
 * Ao acrescentar uma regra, inclua um caso de teste que represente o comportamento esperado.
 * Arquivo: TesteDosIndicadoresEGraficos.js
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
/**
 * Lê um campo da interface sem interromper o fluxo quando o elemento não existe.
 */
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

/**
 * Agrega a série nacional de um indicador para conferir sua renderização em cada tipo de gráfico.
 */
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
let rendered=0;
for (let indicatorIndex=0; indicatorIndex<DATA.indicators.length; indicatorIndex++) {
  const indicator=DATA.indicators[indicatorIndex];
  const series=nationalSeries(indicatorIndex);
  if (!series.length) { failures.push(`${indicator.id}: sem Dados nacionais`); continue; }
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
  'TESTE DE TODOS OS INDICADORES EM TODOS OS GRÁFICOS — V13.0 UNIFICADO',
  '='.repeat(66),
  `Indicadores: ${DATA.indicators.length}`,
  `Tipos de gráfico: ${chartTypes.length}`,
  `Combinações renderizadas: ${rendered}`,
  `Falhas: ${failures.length}`,
  '',
  ...(failures.length ? failures : ['Nenhuma falha encontrada.'])
].join('\n')+'\n';
fs.writeFileSync(path.join(__dirname,'RelatorioDosIndicadoresEGraficos.txt'),report,'utf8');
console.log(report);
if (failures.length) process.exit(1);
