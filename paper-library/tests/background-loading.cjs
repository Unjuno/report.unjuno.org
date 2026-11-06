'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('dist/assets/cinema-field.js','utf8');
const assetCount=require('./scene-registry.cjs')().assets.length;
function harness(reduced=false){
 let clock=0,id=0,draws=[];const frames=new Map(),timers=new Map(),requests=[],listeners={};
 const ctx=new Proxy({drawImage(image){if(image.url)draws.push(image.url)},createLinearGradient:()=>({addColorStop(){}})},{get:(o,k)=>o[k]||(()=>{})});
 const env={Date:{now:()=>clock},setTimeout(fn,ms){timers.set(++id,{fn,at:clock+ms});return id},clearTimeout(id){timers.delete(id)},window:{},document:{hidden:false,body:{prepend(){},classList:{contains:()=>false}},createElement:()=>({setAttribute(){},getContext:()=>ctx,remove(){}}),querySelectorAll:()=>[],querySelector:()=>null,addEventListener(){}},Image:class {constructor(){this.complete=false;}set src(url){this.url=url;if(url)requests.push(this)}get src(){return this.url}decode(){return new Promise((resolve,reject)=>{this.decodeReady=resolve;this.decodeFail=reject})}},matchMedia:()=>({matches:reduced,addEventListener(){}}),scrollY:0,innerWidth:1200,innerHeight:800,devicePixelRatio:1,requestAnimationFrame(fn){frames.set(++id,fn);return id},cancelAnimationFrame(id){frames.delete(id)},addEventListener:(n,fn)=>listeners[n]=fn,MutationObserver:class {observe(){}}};
 vm.runInNewContext(source,env);
 return {env,requests,frames,timers,listeners,flow:()=>env.window.__reportFlow,draws:()=>draws,
 async load(image){image.naturalWidth=1536;image.naturalHeight=1024;image.onload?.();assert.ok(image.decodeReady,'decode is requested');image.decodeReady();await Promise.resolve();},
 frame(now){clock=now;draws=[];const q=[...frames.values()];frames.clear();q.forEach(fn=>fn(now))},
 timersAt(now){clock=now;const q=[...timers.entries()].filter(([,t])=>t.at<=now);q.forEach(([id,t])=>{timers.delete(id);t.fn()})}
 };
}
(async()=>{
 const h=harness();assert.equal(h.requests.length,2,'only two concurrent initial requests');
 const first=h.requests[0];first.naturalWidth=1536;first.naturalHeight=1024;first.onload();h.listeners.resize();assert.equal(h.flow().loaded,0,'not drawable before decode resolves');
 first.decodeReady();await Promise.resolve();assert.equal(h.requests.length,3,'one completion starts one new request');h.frame(0);h.frame(100);
 const before=h.flow().phase;await h.load(h.requests[1]);h.frame(200);assert.ok(h.flow().phase>before+.09,'load completion must not reset time');assert.deepEqual([...new Set(h.draws())],[first.url],'late decode cannot replace the dissolve endpoints');
 for(let i=2;i<h.requests.length;i++)await h.load(h.requests[i]);
 for(let t=300;t<=300000;t+=100){h.frame(t);for(const image of h.requests.filter(i=>i.onload&&!i.decodeReady))await h.load(image);assert.ok(h.flow().loaded<=6,'decoded working set stays bounded');}
 assert.ok(h.flow().scene!==0,'automatic animation advances through repeated loops');
 const fail=harness();for(let turn=0;turn<assetCount;turn++){const batch=fail.requests.filter(i=>i.onerror);if(!batch.length)break;batch.forEach(i=>i.onerror());}
 assert.equal(fail.requests.length,assetCount,'total initial failure probes all assets');assert.equal(fail.frames.size,0,'no spinning render loop when every image failed');
 fail.timersAt(15000);assert.equal(fail.requests.length,assetCount+2,'retry restarts at most two concurrent requests');await fail.load(fail.requests[assetCount]);fail.frame(15000);fail.frame(15100);assert.ok(fail.flow().phase>0,'a recovered image restarts animation');
 const still=harness(true);await still.load(still.requests[0]);assert.equal(still.flow().loaded,1,'reduced motion paints first decoded image');assert.equal(still.frames.size,0,'reduced motion has no animation loop');const stillDraws=[...new Set(still.draws())];await still.load(still.requests[1]);assert.deepEqual([...new Set(still.draws())],stillDraws,'later initial images do not replace the frozen endpoint');
 const slow=harness(),late=slow.requests[0];late.naturalWidth=1536;late.onload();slow.timersAt(12000);late.decodeReady();await Promise.resolve();slow.listeners.resize();assert.equal(slow.flow().loaded,0,'late decode after timeout cannot resurrect an abandoned request');assert.equal(late.src,'','timeout cancels stale image request');
 console.log('PASS bounded fetches/cache, decode gating, late-image continuity, clock continuity, 5-minute rotation, all-fail recovery and stale-decode timeout (mock DOM).');
})().catch(e=>{console.error(e);process.exit(1)});
