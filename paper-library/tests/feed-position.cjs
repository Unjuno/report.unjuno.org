const fs=require('fs'),vm=require('vm'),assert=require('assert');
const source=fs.readFileSync('dist/assets/feed-position.js','utf8');
function run(type,legacy=false){
 const listeners={},calls=[],history={scrollRestoration:'auto'};
 const add=(name,fn,options={})=>(listeners[name]??=[]).push({fn,options});
 const remove=(name,fn)=>listeners[name]=(listeners[name]||[]).filter(x=>x.fn!==fn);
 const emit=(name,event={})=>{for(const item of [...(listeners[name]||[])]){item.fn(event);if(item.options.once)remove(name,item.fn);}};
 const performance=legacy?{navigation:{type}}:{getEntriesByType:()=>[{type}]};
 vm.runInNewContext(source,{history,performance,addEventListener:add,removeEventListener:remove,document:{addEventListener:add},window:{scrollTo:options=>calls.push(options)}});
 return {history,calls,emit};
}
for(const type of ['navigate','back_forward','prerender']){const t=run(type);t.emit('DOMContentLoaded');t.emit('pageshow');assert.equal(t.calls.length,0);assert.equal(t.history.scrollRestoration,'auto');}
for(const legacy of [false,true]){const t=run(legacy?1:'reload',legacy);assert.equal(t.history.scrollRestoration,'manual');t.emit('DOMContentLoaded');t.emit('pageshow',{persisted:false});assert.equal(t.calls.length,2);assert(t.calls.every(c=>c.top===0&&c.left===0&&c.behavior==='instant'));assert.equal(t.history.scrollRestoration,'auto');t.emit('pageshow',{persisted:true});assert.equal(t.calls.length,2);}
for(const event of ['pointerdown','touchstart','wheel','keydown']){const t=run('reload');t.emit(event);t.emit('DOMContentLoaded');t.emit('pageshow',{persisted:false});assert.equal(t.calls.length,0);assert.equal(t.history.scrollRestoration,'auto');}
{const t=run('reload');t.emit('pagehide');assert.equal(t.history.scrollRestoration,'auto');t.emit('pageshow',{persisted:true});assert.equal(t.calls.length,0);}
const html=fs.readFileSync('dist/index.html','utf8');assert(html.indexOf('/assets/feed-position.js')<html.indexOf('</head>'));assert(!/feed-position\.js[^>]*\b(?:defer|async)\b/.test(html));
console.log('PASS reload-only top reset, ordinary/history navigation, BFCache, interaction cancellation, early departure and parser-blocking head placement (mock DOM).');
