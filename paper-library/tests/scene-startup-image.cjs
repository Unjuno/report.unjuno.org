'use strict';
// Production renderer + controlled DOM/decoder/event loop. Not browser or iPhone pixels.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const file=process.argv[2]||'dist/assets/cinema-field.js';
const original=fs.readFileSync(file,'utf8');
const source=original.replace(/\}\)\(\);\s*$/,`window.__startupAudit={assets,scenes,sceneAt,sceneTime,state:()=>({phase,initialImageReady,pairPrevious,pairA,pairB,activeLoads})};})();`);
assert.notEqual(source,original,'install read-only closure inspection');
const totals={scenarios:0,requests:0,peakActive:0,peakReady:0,peakRAF:0,invalidDraws:0};
function boot({seed=10,mode='reduced',hidden=false,decode=true}={}){
 let now=0,serial=0,bodyPaused=mode==='paused',graphStrokes=0;
 const events={},timers=new Map(),frames=new Map(),requests=[],draws=[],canvases=[],observers=[];
 const reduced={matches:mode==='reduced',addEventListener:(name,fn)=>events.reduced=fn};
 class Img{
  constructor(){this.complete=false;this.naturalWidth=0;this.naturalHeight=0;this.decoded=false;this.decodes=[];if(!decode)this.decode=undefined;}
  set src(url){this.url=url;if(!url){this.complete=false;this.naturalWidth=0;this.naturalHeight=0;this.decoded=false;return;}requests.push({image:this,url,load:this.onload,error:this.onerror,number:requests.length});totals.requests++;}
  get src(){return this.url;}
  decode(){return new Promise((resolve,reject)=>this.decodes.push({resolve,reject}));}
 }
 function makeCanvas(){
  const index=canvases.length,canvasEvents={};
  const context=new Proxy({drawImage(image){if(image instanceof Img){draws.push(image.url);if(!image.complete||!image.naturalWidth||(decode&&!image.decoded))totals.invalidDraws++;}},stroke(){graphStrokes++;},createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}}),createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)})},{get:(o,k)=>o[k]||(()=>{})});
  const canvas={width:300,height:150,clientWidth:index===0?390:0,clientHeight:index===0?844:0,events:canvasEvents,addEventListener:(name,fn)=>canvasEvents[name]=fn,setAttribute(){},remove(){},getContext:()=>context};canvases.push(canvas);return canvas;
 }
 const math=Object.create(Math);math.random=()=>seed/4294967296;
 const env={Math:math,Date:{now:()=>now},window:{},document:{hidden,body:{prepend(){},classList:{contains:()=>bodyPaused}},createElement:makeCanvas,querySelectorAll:()=>[],querySelector:()=>null,addEventListener:(name,fn)=>events[name]=fn},Image:Img,matchMedia:()=>reduced,innerWidth:390,innerHeight:844,devicePixelRatio:2,scrollY:0,requestAnimationFrame(fn){const key=++serial;frames.set(key,fn);totals.peakRAF=Math.max(totals.peakRAF,frames.size);assert.ok(frames.size<=1,'one RAF');return key;},cancelAnimationFrame:key=>frames.delete(key),setTimeout(fn,delay){const key=++serial;timers.set(key,{fn,at:now+delay});return key;},clearTimeout:key=>timers.delete(key),addEventListener:(name,fn)=>events[name]=fn,MutationObserver:class{constructor(fn){this.fn=fn;}observe(target){if(target===env.document.body)observers.push(this.fn);}}};
 vm.runInNewContext(source,env);
 const api=env.window.__startupAudit;
 function label(scene){return scene?.kind||api.assets[scene?.asset]?.name||null;}
 function state(){const s=api.state();return {...s,pairs:[s.pairPrevious,s.pairA,s.pairB].map(label),ready:api.assets.filter(a=>a.ready).length};}
 function check(){const s=state();totals.peakActive=Math.max(totals.peakActive,s.activeLoads);totals.peakReady=Math.max(totals.peakReady,s.ready);assert.ok(s.activeLoads>=0&&s.activeLoads<=2,'at most two active image requests');assert.ok(s.ready<=6,'at most six ready images');assert.equal(totals.invalidDraws,0,'never draw before successful decode');}
 function start(request){assert.equal(typeof request.image.onload,'function','request is live');request.image.complete=true;request.image.naturalWidth=1672;request.image.naturalHeight=941;request.image.onload();check();}
 async function resolve(request){assert.ok(request.image.decodes.length,'decode was requested');request.image.decoded=true;request.image.decodes.shift().resolve();await Promise.resolve();check();}
 async function load(request){start(request);if(decode)await resolve(request);check();}
 function fail(request){assert.equal(typeof request.image.onerror,'function');request.image.onerror();check();}
 function frame(time=now){now=time;const pending=[...frames.values()];frames.clear();for(const fn of pending){fn(time);check();}}
 function advance(ms){const end=now+ms;let iterations=0;for(;;){const next=[...timers].filter(([,timer])=>timer.at<=end).sort((a,b)=>a[1].at-b[1].at||a[0]-b[0])[0];if(!next)break;assert.ok(iterations++<10000,'finite timers');const [key,timer]=next;timers.delete(key);now=timer.at;timer.fn();check();}now=end;}
 async function settleLive(){for(let i=0;i<requests.length;i++)if(requests[i].image.onload&&!requests[i].image.decodes.length)await load(requests[i]);}
 function visible(){env.document.hidden=false;events.visibilitychange();check();}
 function pause(value){bodyPaused=value;for(const fn of observers)fn();check();}
 function rotate(){canvases[0].clientWidth=844;canvases[0].clientHeight=390;env.innerWidth=844;env.innerHeight=390;events.resize();check();}
 function clearDraws(){draws.length=0;}
 totals.scenarios++;check();return {api,env,events,reduced,requests,draws,frames,timers,canvases,load,start,resolve,fail,frame,advance,settleLive,visible,pause,rotate,clearDraws,state,label,check,graphStrokes:()=>graphStrokes};
}
function currentImage(h){return h.api.assets[h.api.state().pairA?.asset]?.name;}
function assertImage(h,expected,message){assert.equal(currentImage(h),expected,message);assert.ok(h.draws.includes('/assets/'+expected),message+' actually invokes drawImage');}
(async()=>{
 // Three seeds cover all procedural families adjacent to the authored opening image.
 // Both successful completion orders run in reduced, body-paused and normal modes.
 for(const seed of [10,12,26])for(const mode of ['reduced','paused','normal'])for(const reversed of [true,false]){
  const h=boot({seed,mode}),first=h.requests[0],second=h.requests[1];
  const scheduled=Array.from({length:h.api.scenes.length},(_,i)=>h.label(h.api.sceneAt(i)));
  assert.ok(h.api.sceneAt(1).kind,'seed places a procedural scene before second requested image');
  assert.equal(h.requests.length,2);assert.equal(h.draws.length,0,'pending startup is procedural');
  const adopted=reversed?second:first,later=reversed?first:second,expected=adopted.url.split('/').at(-1);
  h.start(adopted);assert.equal(h.state().ready,0);assert.equal(h.draws.length,0,'deferred decode cannot display painting');
  await h.resolve(adopted);if(mode==='normal')h.frame(0);
  assertImage(h,expected,`seed ${seed}, ${mode}, ${reversed?'second':'first'} completes first`);
  const frozen=h.state().pairs.slice(0,2),phase=h.state().phase;
  h.clearDraws();await h.load(later);await h.settleLive();if(mode==='normal')h.frame(100);
  assert.deepEqual(h.state().pairs.slice(0,2),frozen,'later image never replaces adopted endpoints');
  assert.deepEqual([...new Set(h.draws)],['/assets/'+expected],'only adopted image draws during initial shoulder');
  if(mode!=='normal'){assert.equal(h.frames.size,0);assert.equal(h.state().phase,phase);}
  h.events.pageshow();h.rotate();assertImage(h,expected,'BFCache/rotation preserves adopted photo');
  assert.deepEqual(Array.from({length:h.api.scenes.length},(_,i)=>h.label(h.api.sceneAt(i))),scheduled,'ordered scenes are unchanged');
  if(mode==='normal'){
   // The procedural scene remains the scheduled successor, not discarded globally.
   const openingDuration=h.api.sceneTime(0).seconds;
   for(let time=200;h.state().phase<openingDuration+2.4;time+=100)h.frame(time);
   assert.equal(h.api.sceneTime(h.state().phase).step,1);
   assert.equal(h.label(h.api.state().pairA),h.api.sceneAt(1).kind,'next interlude still becomes current');
   assert.ok(h.frames.size===1);
  }
 }
 // Legacy non-decode browsers follow the same startup policy.
 {const h=boot({decode:false});await h.load(h.requests[1]);assertImage(h,h.requests[1].url.split('/').at(-1),'no Image.decode fallback');assert.equal(h.frames.size,0);}
 // Both images may decode before the first active-motion frame. Choose the opening
 // painting in that case; the already-adopted freeze rule begins at actual paint.
 {const h=boot({mode:'normal'});await h.load(h.requests[1]);await h.load(h.requests[0]);assert.equal(h.draws.length,0);h.frame(0);assertImage(h,h.requests[0].url.split('/').at(-1),'two completed loads before first RAF');}
 // Hidden startup and lost-context startup defer painting, then choose a ready image.
 for(const hidden of [true,false]){
  const h=boot({hidden});if(!hidden)h.canvases[0].events.contextlost({});
  const second=h.requests[1],name=second.url.split('/').at(-1);await h.load(second);
  assert.equal(h.draws.length,0);assert.equal(h.frames.size,0);
  if(hidden)h.visible();else h.canvases[0].events.contextrestored({});
  assertImage(h,name,hidden?'hidden startup recovery':'lost-context startup recovery');
  await h.load(h.requests[0]);h.events.pageshow();assertImage(h,name,'late opening after recovery remains frozen');assert.equal(h.frames.size,0);
 }
 // Reduced motion toggled on before the next repaint still adopts the decoded photo.
 {const h=boot({mode:'normal'}),second=h.requests[1];await h.load(second);h.reduced.matches=true;h.events.reduced();assertImage(h,second.url.split('/').at(-1),'reduced-motion change');assert.equal(h.frames.size,0);}
 // Failure and timeout cannot prevent a later successful image from replacing the
 // pre-image procedural fallback. A retry may not displace an adopted painting.
 for(const failure of ['error','timeout']){
  const h=boot(),first=h.requests[0],second=h.requests[1];
  if(failure==='error')h.fail(first);
  else{h.start(first);h.advance(12000);await h.resolve(first);assert.equal(h.state().ready,0,'late decode after timeout remains stale');}
  const target=failure==='error'?second:h.requests.find(r=>r.image.onload);
  assert.ok(target);await h.load(target);const expected=target.url.split('/').at(-1);assertImage(h,expected,failure+' fallback adoption');
  await h.settleLive();h.advance(15000);const retry=h.requests.find(r=>r.url===first.url&&r!==first);assert.ok(retry,'initial image retries once');await h.load(retry);
  assertImage(h,expected,'retry keeps adopted image');assert.equal(h.frames.size,0);
 }
 // Failed decode behaves like failed loading, then preserves the successful fallback.
 {const h=boot(),first=h.requests[0],second=h.requests[1];h.start(first);first.image.decodes.shift().reject(new Error('controlled decode failure'));await Promise.resolve();h.check();await h.load(second);assertImage(h,second.url.split('/').at(-1),'decode-rejection fallback');}
 // If every request really fails, no photo is fabricated and both attempts terminate.
 {const h=boot();for(let i=0;i<h.requests.length;i++)if(h.requests[i].image.onerror)h.fail(h.requests[i]);assert.equal(h.requests.length,h.api.assets.length);h.advance(15000);for(let i=0;i<h.requests.length;i++)if(h.requests[i].image.onerror)h.fail(h.requests[i]);assert.equal(h.requests.length,h.api.assets.length*2);assert.equal(h.state().ready,0);assert.equal(h.state().initialImageReady,false);assert.equal(h.draws.length,0);assert.ok(h.graphStrokes()>0);assert.equal(h.frames.size,0);assert.equal(h.timers.size,0);}
 console.log(JSON.stringify({status:'PASS',scope:'Production source, VM events and draw calls only; no browser/Safari/iPhone verification',seeds:[10,12,26],...totals,coverage:'both load orders; real deferred Promise decode; reduced/body-paused/normal; late-load freeze; procedural successor; hidden/context/pageshow/rotation; no decode; simultaneous completion; errors, stale decode timeout, retry, decode rejection and all-fail fallback'},null,2));
})().catch(error=>{console.error(error);process.exitCode=1});
