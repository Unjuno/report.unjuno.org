'use strict';
// Executes the exact script URLs of generated or built HOME in a deterministic
// minimal DOM. Network sinks are intercepted; this is not browser/device QA.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const output = path.resolve(process.argv[2] || 'dist');
const html = fs.readFileSync(path.join(output, 'index.html'), 'utf8');
const decode = value => value.replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const attrs = text => Object.fromEntries([...text.matchAll(/([\w-]+)="([^"]*)"/g)].map(m => [m[1], decode(m[2])]));
const scripts = [...html.matchAll(/<script\b[^>]*src="([^"]+)"[^>]*>/g)].map(m => m[1].split('?')[0]);
assert.deepEqual(scripts, ['feed-position.js','feed.js','cinema-field.js','spline-type.js','scroll-audio.js'].map(x=>'/assets/'+x));
for(const tag of html.matchAll(/<[a-z][^>]*>/gi)){
  const a=attrs(tag[0]);
  assert(!('data-papers-url' in a));
  assert(!['feed-more','load-more','feed-sentinel'].includes(a.id));
}
const records = [...html.matchAll(/<article\b([^>]*\bdata-entry\b[^>]*)>/g)].map(m=>attrs(m[1]));
const flush = async()=>{for(let i=0;i<6;i++)await new Promise(setImmediate)};
async function run({zero=false, canvasAvailable=true, audioAvailable=true}={}) {
  const sinks=[], eventMap=new Map(), frames=new Map(), timers=new Map(); let serial=0;
  const listen=(map,name,fn)=>{if(!map.has(name))map.set(name,[]);map.get(name).push(fn)};
  const emit=async(map,name,event={})=>{for(const fn of map.get(name)||[])await fn(event);await flush()};
  const ctx=new Proxy({createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})}, {get:(o,k)=>o[k]||(()=>{})});
  function node(){return {nodeType:1,hidden:false,value:'',textContent:'',dataset:{},attrs:{},children:[],events:new Map(),style:{},isConnected:true,
    addEventListener(name,fn){listen(this.events,name,fn)},removeEventListener(){},setAttribute(k,v){this.attrs[k]=v},getAttribute(k){return this.attrs[k]},
    querySelector(){return null},querySelectorAll(){return []},matches(){return false},contains(){return false},closest(){return null},
    appendChild(x){this.children.push(x);return x},append(...x){this.children.push(...x)},prepend(...x){this.children.unshift(...x)},remove(){},focus(){this.focused=true},
    getContext(){return canvasAvailable?ctx:null},classList:{contains(){return false},add(){},remove(){},toggle(){return false}}};}
  const search=node(), clear=node(), count=node(), empty=node(), feedback=node(), papers=node(), panel=node();
  const cards=(zero?[]:records).map(r=>Object.assign(node(),{id:r.id,dataset:{search:r['data-search']}}));
  const links=cards.map(c=>Object.assign(node(),{hash:'#'+c.id}));
  const all=s=>s==='[data-entry]'||s==='.entry[data-entry], .entry[data-sponsor]'?cards:s==='.progress a, .sidebar nav a'?links:[];
  papers.querySelectorAll=all;papers.dataset.localCount=String(cards.length);papers.dataset.localRendered=String(cards.length);
  const document={hidden:false,head:node(),body:node(),activeElement:null,querySelector:s=>({'#search':search,'#clear':clear,'#count':count,'#empty':empty,'#filter-feedback':feedback,'#papers':papers,'#scroll-audio':panel}[s]||null),querySelectorAll:all,
    createElement:()=>node(),createElementNS:()=>node(),createTextNode:text=>Object.assign(node(),{textContent:text}),contains:n=>cards.includes(n),
    addEventListener(name,fn){listen(eventMap,'document:'+name,fn)},removeEventListener(){}};
  class Audio {constructor(){this.state='running';this.currentTime=0;this.destination={}}createGain(){return{gain:{setValueAtTime(){},setTargetAtTime(){},value:0},connect(){},disconnect(){}}}resume(){return Promise.resolve()}close(){this.state='closed';return Promise.resolve()}}
  const window={AudioContext:audioAvailable?Audio:undefined,addEventListener:(name,fn)=>listen(eventMap,name,fn),scrollTo(){}};
  const local=ref=>{const u=new URL(ref,'https://home.invalid/');assert.equal(u.origin,'https://home.invalid','external resource requested: '+ref);assert(/^\/assets\//.test(u.pathname),'non-asset retrieval: '+ref);sinks.push(u.pathname);return u};
  const context={window,document,location:{hash:''},history:{scrollRestoration:'auto'},performance:{getEntriesByType:()=>[{type:'navigate'}]},
    addEventListener:(name,fn)=>listen(eventMap,name,fn),removeEventListener(){},requestAnimationFrame:fn=>{frames.set(++serial,fn);return serial},cancelAnimationFrame:id=>frames.delete(id),
    setTimeout:fn=>{timers.set(++serial,fn);return serial},clearTimeout:id=>timers.delete(id),
    fetch:async ref=>{const u=local(ref);assert.equal(u.pathname,'/assets/home-music/catalog.json');throw Error('simulated offline audio catalog')},
    XMLHttpRequest:class {constructor(){assert.fail('XHR must not be used')}},WebSocket:class {constructor(){assert.fail('WebSocket must not be used')}},navigator:{sendBeacon(){assert.fail('Beacon must not be used')}},
    Image:class {constructor(){this.complete=false}set src(ref){if(ref)local(ref)}decode(){return Promise.reject(Error('simulated image unavailable'))}},
    MutationObserver:class {observe(){}},matchMedia:()=>({matches:false,addEventListener(){}}),scrollY:0,innerWidth:390,innerHeight:844,devicePixelRatio:1,
    AbortController,TextDecoder,TextEncoder,URL,URLSearchParams,console};
  vm.createContext(context);
  for(const script of scripts)vm.runInContext(fs.readFileSync(path.join(output,script),'utf8'),context,{filename:script});
  await flush();
  const expected=cards.length;
  assert.equal(count.textContent,expected+'件の論文');assert.equal(empty.hidden,expected!==0);
  const input=async value=>{search.value=value;await emit(search.events,'input',{});};
  await input('Transformer');assert.equal(cards.filter(n=>!n.hidden).length,zero?0:1);
  await input('not-a-created-material');assert.equal(cards.filter(n=>!n.hidden).length,0);assert.equal(empty.hidden,false);
  assert.equal(empty.textContent,zero?'公開中の学習教材はまだありません。':'一致する論文がありません。');
  for(let i=0;i<25;i++){context.scrollY+=200;await emit(eventMap,'scroll');}
  assert.equal(cards.length,expected,'scroll must not append unapproved records');
  await emit(search.events,'compositionstart');search.value='Attention';await emit(search.events,'input',{isComposing:true});assert.equal(cards.filter(n=>!n.hidden).length,0);
  await emit(search.events,'compositionend');assert.equal(cards.filter(n=>!n.hidden).length,zero?0:1);
  await emit(clear.events,'click');assert.equal(cards.filter(n=>!n.hidden).length,expected);assert(search.focused);
  // Manual controls and recovery must not start discovery, including audio retry.
  await emit(eventMap,'document:click',{isTrusted:true,button:0,target:clear});
  await emit(eventMap,'document:keydown',{isTrusted:true,key:'Enter',target:search});
  await emit(eventMap,'pageshow',{persisted:true});await emit(eventMap,'pagehide');
  document.hidden=true;await emit(eventMap,'document:visibilitychange');document.hidden=false;await emit(eventMap,'document:visibilitychange');
  await emit(clear.events,'click');assert.equal(cards.filter(n=>!n.hidden).length,expected);
  assert(sinks.every(ref=>ref.startsWith('/assets/')&&!ref.includes('papers.json')));
  assert.equal(papers.children.length,0,'no dynamically created load-more control or external cards');
  return {zero,canvasAvailable,audioAvailable,cards:expected,localAssetRequests:sinks.length};
}
(async()=>{const outcomes=[];for(const options of [{},{zero:true},{canvasAvailable:false,audioAvailable:false}])outcomes.push(await run(options));console.log(JSON.stringify(outcomes));console.log('PASS exact HOME startup scripts, local/no-match/clear/IME, scroll, manual input and offline/recovery paths: no external discovery; empty catalog stays honest. Deterministic DOM/network mocks, not browser QA.');})().catch(error=>{console.error(error);process.exitCode=1});
