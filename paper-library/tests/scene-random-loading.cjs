'use strict';
// Deterministic event-loop stress; no browser pixels or aesthetic claims.
const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
let source=fs.readFileSync(process.argv[2]||'dist/assets/cinema-field.js','utf8');
source=source.replace('function diagram(kind,alpha,c){','function diagram(kind,alpha,c){return;');
source=source.replace(/\}\)\(\);\s*$/,`window.__inspect=()=>({assets,scenes,phase,activeLoads,pairPrevious,pairA,pairB});
window.__forcePins=()=>{
 let step=0,wanted=[];
 for(;step<scenes.length*3;step++){
  wanted=[...new Set([0,1,2,3].map(offset=>sceneAt(step+offset).asset))];
  if(wanted.length===4&&wanted.every(index=>index!==undefined))break;
 }
 if(wanted.length!==4||wanted.includes(undefined))throw new Error('No four-image look-ahead');
 const other=[...new Set(scenes.map(scene=>scene.asset))].filter(index=>index!==undefined&&!wanted.includes(index));
 const pins=other.slice(0,3),extra=other[3];
 assets.forEach(asset=>{asset.ready=false;asset.requested=false;asset.attempts=0;});activeLoads=0;
 [pairPrevious,pairA,pairB]=pins.map(index=>scenes.find(scene=>scene.asset===index));
 for(const index of [...wanted,...pins,extra]){assets[index].ready=true;assets[index].requested=true;assets[index].image.naturalWidth=1536;assets[index].image.naturalHeight=1024;}
 preloadDirty=true;preload(step);
 return {wanted,pins,ready:assets.filter(asset=>asset.ready).length,visiblePreserved:pins.every(index=>assets[index].ready),omittedRunwayEvicted:!assets[wanted[3]].ready,extraEvicted:!assets[extra].ready};
};})();`);
assert.ok(source.includes('window.__forcePins='),'test exposure installed');
function boot(seed){
 let now=0,id=0,state=seed>>>0,lastCompleted=0;
 const timers=new Map(),frames=new Map(),listeners={};
 const stats={seed,peakActive:0,peakReady:0,peakRAF:0,invalidDraws:0,draws:0,requests:0,failures:0,timeoutsExpected:0,outOfOrder:0,decodes:0};
 function random(){state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;}
 function schedule(fn,delay){const key=++id;timers.set(key,{at:now+delay,fn});return key;}
 class Img{
  constructor(){this.naturalWidth=0;this.naturalHeight=0;this.complete=false;this.generation=0;}
  set src(url){
   this.url=url;const generation=++this.generation;if(!url){this.naturalWidth=0;this.complete=false;return;}
   const request=++stats.requests,delay=50+random()*18000,fail=random()<.17;
   if(delay>12000)stats.timeoutsExpected++;
   schedule(()=>{
    if(generation!==this.generation)return;
    if(request<lastCompleted)stats.outOfOrder++;lastCompleted=Math.max(lastCompleted,request);
    if(fail){stats.failures++;this.onerror?.();return;}
    this.naturalWidth=1536;this.naturalHeight=1024;this.complete=true;this.onload?.();
   },delay);
  }
  get src(){return this.url;}
  decode(){const generation=this.generation;return {then:(resolve,reject)=>schedule(()=>{stats.decodes++;generation===this.generation&&this.naturalWidth?resolve():reject();},10+random()*350)};}
 }
 const context=new Proxy({createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}}),drawImage(image){if(image instanceof Img){stats.draws++;if(!image.naturalWidth||!image.complete)stats.invalidDraws++;}}},{get:(o,k)=>o[k]||(()=>{})});
 const math=Object.create(Math);math.random=()=>((Math.imul(seed,0x9e3779b9)+0x12345)>>>0)/4294967296;
 const env={Math:math,Date:{now:()=>now},setTimeout:schedule,clearTimeout:key=>timers.delete(key),window:{},document:{hidden:false,body:{prepend(){},classList:{contains:()=>false}},createElement:()=>({setAttribute(){},getContext:()=>context,remove(){}}),querySelectorAll:()=>[],querySelector:()=>null,addEventListener(){}},Image:Img,matchMedia:()=>({matches:false,addEventListener(){}}),scrollY:0,innerWidth:390,innerHeight:844,devicePixelRatio:1,requestAnimationFrame(fn){frames.set(++id,fn);stats.peakRAF=Math.max(stats.peakRAF,frames.size);assert.ok(frames.size<=1,'one outstanding RAF, seed '+seed);return id},cancelAnimationFrame:key=>frames.delete(key),addEventListener:(name,fn)=>listeners[name]=fn,MutationObserver:class{observe(){}}};
 vm.runInNewContext(source,env);
 function check(){
  const t=env.window.__inspect(),ready=t.assets.filter(asset=>asset.ready).length;
  stats.peakActive=Math.max(stats.peakActive,t.activeLoads);stats.peakReady=Math.max(stats.peakReady,ready);
  assert.ok(t.activeLoads>=0&&t.activeLoads<=2,'active loads <=2, seed '+seed+' at '+now);
  assert.ok(ready<=6,'decoded ready cache <=6, seed '+seed+' at '+now);
  assert.equal(stats.invalidDraws,0,'no incomplete image drawn');
 }
 return {env,stats,force(){timers.clear();frames.clear();const result=env.window.__forcePins();check();return result;},run(){
  check();for(now=0;now<360000;now+=100){
   for(const [key,timer] of [...timers].sort((a,b)=>a[1].at-b[1].at||a[0]-b[0]))if(timer.at<=now&&timers.has(key)){timers.delete(key);timer.fn();check();}
   if(now%400===0){env.scrollY+=now%1600===0?-300:300;listeners.scroll();check();}
   const pending=[...frames.values()];frames.clear();for(const fn of pending){fn(now);check();}
  }
  assert.ok(stats.draws>0,'images actually draw');assert.ok(stats.decodes>0,'decode completions exercised');
  assert.ok(env.window.__inspect().phase>200,'scrolling playback advances despite failures');return stats;
 }};
}
const forced=boot(7).force();
assert.equal(forced.wanted.length,4);assert.equal(forced.pins.length,3);
assert.equal(new Set([...forced.wanted,...forced.pins]).size,7,'three visible pins are disjoint from four requested assets');
assert.ok(forced.visiblePreserved,'all three visible images remain ready');
assert.ok(forced.ready<=6,'forced over-capacity cache returns to six');
assert.ok(forced.omittedRunwayEvicted,'seventh protected candidate is not pinned');
assert.ok(forced.extraEvicted,'unprotected extra image is evicted');
const results=[];for(let seed=1;seed<=16;seed++)results.push(boot(seed).run());
const totals=results.reduce((sum,item)=>{for(const key of ['requests','failures','timeoutsExpected','outOfOrder','decodes','draws'])sum[key]=(sum[key]||0)+item[key];return sum;},{});
assert.ok(totals.failures>0&&totals.timeoutsExpected>0&&totals.outOfOrder>0,'failure, timeout and out-of-order scenarios exercised');
console.log('PASS randomized image loading: '+JSON.stringify({runs:results.length,minutesPerRun:6,peakActive:Math.max(...results.map(r=>r.peakActive)),peakReady:Math.max(...results.map(r=>r.peakReady)),peakRAF:Math.max(...results.map(r=>r.peakRAF)),invalidDraws:0,forcedPins:forced,...totals})+'. Mock event-loop coverage, not browser QA.');
