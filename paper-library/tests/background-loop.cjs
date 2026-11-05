'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(process.env.SCENE_SOURCE||'dist/assets/cinema-field.js','utf8').replace('const wanted=[];', 'window.__scans=(window.__scans||0)+1;const wanted=[];');
function harness(reduced=false){
 let clock=0,id=0,draws=[];const frames=new Map(),timers=new Map(),requests=[],listeners={};
 const ctx=new Proxy({drawImage(image){draws.push(image.url)},createLinearGradient:()=>({addColorStop(){}})},{get:(o,k)=>o[k]||(()=>{})});
 const env={Date:{now:()=>clock},setTimeout(fn,ms){timers.set(++id,{fn,at:clock+ms});return id},clearTimeout(id){timers.delete(id)},window:{},document:{hidden:false,body:{prepend(){},classList:{contains:()=>false}},createElement:()=>({setAttribute(){},getContext:()=>ctx,remove(){}}),querySelectorAll:()=>[],querySelector:()=>null,addEventListener(){}},Image:class {constructor(){this.complete=false;}set src(url){this.url=url;if(url)requests.push(this)}get src(){return this.url}decode(){return new Promise((resolve,reject)=>{this.decodeReady=resolve;this.decodeFail=reject})}},matchMedia:()=>({matches:reduced,addEventListener(){}}),scrollY:0,innerWidth:1200,innerHeight:800,devicePixelRatio:1,requestAnimationFrame(fn){frames.set(++id,fn);return id},cancelAnimationFrame(id){frames.delete(id)},addEventListener:(n,fn)=>listeners[n]=fn,MutationObserver:class {observe(){}}};
 vm.runInNewContext(source,env);
 return {env,requests,frames,timers,listeners,flow:()=>env.window.__reportFlow,draws:()=>draws,
 async load(image){image.naturalWidth=1536;image.naturalHeight=1024;image.onload?.();assert.ok(image.decodeReady,'decode is requested');image.decodeReady();await Promise.resolve();},
 frame(now){clock=now;draws=[];const q=[...frames.values()];frames.clear();q.forEach(fn=>fn(now))},
 timersAt(now){clock=now;const q=[...timers.entries()].filter(([,t])=>t.at<=now);q.forEach(([id,t])=>{timers.delete(id);t.fn()})}
 };
}
(async()=>{
 const h=harness();let peakLoads=0,peakReady=0,wraps=0,previousScene=0,settled=0;
 const duration=2*60*60*1000;
 for(let now=0;now<=duration;now+=100){
  // Resolve each pair asynchronously, retaining realistic admission-control behavior.
  for(let guard=0;guard<20;guard++){
   const pending=h.requests.filter(image=>image.onload&&!image.decodeReady);peakLoads=Math.max(peakLoads,pending.length);
   if(!pending.length)break;for(const image of pending){await h.load(image);settled++;}
  }
  h.frame(now);const flow=h.flow();peakReady=Math.max(peakReady,flow.loaded);
  if(flow.scene<previousScene)wraps++;previousScene=flow.scene;
  assert.ok(h.frames.size<=1,'only one animation frame chain');assert.ok(h.timers.size<=2,'no timer accumulation after successful loads');
 }
 assert.ok(wraps===Math.floor(h.flow().phase/h.flow().reelSeconds),'two hours completes every duration-aware reel without skipping a wrap');assert.ok(peakLoads<=2,'bounded concurrency');assert.ok(peakReady<=6,'bounded ready images');
 assert.ok(h.requests.length<=35*(wraps+2),'no repeated requests per frame or retry storms');
 assert.ok(Number.isFinite(h.flow().phase)&&h.flow().phase>7199,'clock continues across loop boundaries');
 const scans=h.env.window.__scans;
 if(!process.env.SCENE_SOURCE)assert.ok(scans<7200,'working-set scans are at least tenfold below frame count');
 console.log(JSON.stringify({simulatedHours:2,frames:72001,wraps,requests:h.requests.length,settled,peakLoads,peakReady,workingSetScans:scans}));
})().catch(error=>{console.error(error);process.exit(1)});
