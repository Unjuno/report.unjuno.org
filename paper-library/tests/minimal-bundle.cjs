'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(process.env.SCENE_SOURCE||'dist/assets/cinema-field.js','utf8').replace('const wanted=[];', 'window.__scans=(window.__scans||0)+1;const wanted=[];');
function harness(reduced=false){
 let clock=0,id=0,draws=[],paused=false,observers=[];const frames=new Map(),timers=new Map(),requests=[],listeners={};
 const ctx=new Proxy({drawImage(image){draws.push(image.url)},createLinearGradient:()=>({addColorStop(){}})},{get:(o,k)=>o[k]||(()=>{})});
 const env={Date:{now:()=>clock},setTimeout(fn,ms){timers.set(++id,{fn,at:clock+ms});return id},clearTimeout(id){timers.delete(id)},window:{__reportBundledImages:["art-archaeology-table-v2.webp"]},document:{hidden:false,body:{prepend(){},classList:{contains:()=>paused}},createElement:()=>({setAttribute(){},getContext:()=>ctx,remove(){}}),querySelectorAll:()=>[],querySelector:()=>null,addEventListener(){}},Image:class {constructor(){this.complete=false;}set src(url){this.url=url;if(url)requests.push(this)}get src(){return this.url}decode(){return new Promise((resolve,reject)=>{this.decodeReady=resolve;this.decodeFail=reject})}},matchMedia:()=>({matches:reduced,addEventListener(){}}),scrollY:0,innerWidth:1200,innerHeight:800,devicePixelRatio:1,requestAnimationFrame(fn){frames.set(++id,fn);return id},cancelAnimationFrame(id){frames.delete(id)},addEventListener:(n,fn)=>listeners[n]=fn,MutationObserver:class {constructor(fn){observers.push(fn)}observe(){}}};
 vm.runInNewContext(source,env);
 return {pause(value){paused=value;observers.forEach(fn=>fn())},env,requests,frames,timers,listeners,flow:()=>env.window.__reportFlow,draws:()=>draws,
 async load(image){image.naturalWidth=1672;image.naturalHeight=941;image.onload?.();assert.ok(image.decodeReady,'decode is requested');image.decodeReady();await Promise.resolve();},
 frame(now){clock=now;draws=[];const q=[...frames.values()];frames.clear();q.forEach(fn=>fn(now))},
 timersAt(now){clock=now;const q=[...timers.entries()].filter(([,t])=>t.at<=now);q.forEach(([id,t])=>{timers.delete(id);t.fn()})}
 };
}
(async()=>{
 const html=fs.readFileSync('dist/index.html','utf8');
 assert.ok(html.includes('window.__reportBundledImages=["art-archaeology-table-v2.webp"]'));
 assert.ok(html.indexOf('window.__reportBundledImages=')<html.indexOf('src="/assets/cinema-field.js'),'config precedes cinema script');
 const images=fs.readdirSync('dist/assets').filter(name=>/\.(png|webp|ico|jpe?g)$/i.test(name));
 assert.deepEqual(images,['art-archaeology-table-v2.webp']);
 const h=harness();let wraps=0,previous=0;
 for(let now=0;now<=120000;now+=100){
  for(const image of h.requests.filter(image=>image.onload&&!image.decodeReady))await h.load(image);
  h.frame(now);const flow=h.flow();if(flow.scene<previous)wraps++;previous=flow.scene;
  assert.ok(flow.scene>=0&&flow.scene<4,'one image plus three procedural scenes');
  assert.ok(h.frames.size<=1);assert.ok(flow.loaded<=1);
 }
 assert.ok(wraps>=4,'reduced reel loops repeatedly');
 assert.ok(h.requests.length>0);
 assert.ok(h.requests.every(image=>image.url==='/assets/art-archaeology-table-v2.webp'),'no missing image requests');
 h.pause(true);const phase=h.flow().phase;assert.equal(h.frames.size,0);h.frame(130000);assert.equal(h.flow().phase,phase);
 h.pause(false);assert.equal(h.frames.size,1);h.frame(130100);h.frame(130200);assert.ok(h.flow().phase>phase);
 const reduced=harness(true);for(const image of reduced.requests)await reduced.load(image);
 const still=reduced.flow().phase;reduced.frame(100000);assert.equal(reduced.frames.size,0);assert.equal(reduced.flow().phase,still);
 assert.ok(reduced.requests.every(image=>image.url==='/assets/art-archaeology-table-v2.webp'));
 console.log('PASS minimal bundle: one image, four scenes, loop, no omitted image requests, pause/resume and reduced motion');
})().catch(error=>{console.error(error);process.exit(1)});
