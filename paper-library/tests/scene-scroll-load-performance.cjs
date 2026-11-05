'use strict';
// Simulated scheduling and request/decode counts. Not browser FPS or network latency.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(process.argv[2]||'dist/assets/cinema-field.js','utf8');
async function run(scrollPixels){
 let clock=0,serial=0,paints=0,scrollInputRequests=0,sceneChanges=0,previousScene=0,peakReady=0,peakLoading=0;
 const requests=[],frames=new Map(),timers=new Map(),events={};
 const ctx=new Proxy({createLinearGradient:()=>({addColorStop(){}})}, {get:(o,k)=>o[k]||(()=>{})});
 const env={Date:{now:()=>clock},window:{},document:{hidden:false,body:{prepend(){},classList:{contains:()=>false}},createElement:()=>({setAttribute(){},getContext:()=>ctx,remove(){}}),querySelectorAll:()=>[],querySelector:()=>null,addEventListener(){}},
  Image:class{constructor(){this.complete=false;}set src(url){this.url=url;if(url)requests.push(this)}decode(){return Promise.resolve()}},
  matchMedia:()=>({matches:false,addEventListener(){}}),innerWidth:390,innerHeight:844,devicePixelRatio:1,scrollY:0,
  requestAnimationFrame(fn){frames.set(++serial,fn);return serial},cancelAnimationFrame:id=>frames.delete(id),
  setTimeout(fn,ms){timers.set(++serial,{fn,at:clock+ms});return serial},clearTimeout:id=>timers.delete(id),addEventListener:(name,fn)=>events[name]=fn,
  MutationObserver:class{observe(){}},countPaint(){paints++}};
 vm.runInNewContext(source.replace('function paint(){','function paint(){countPaint();'),env);
 const settle=async()=>{
  for(let guard=0;guard<40;guard++){
   const pending=requests.filter(image=>image.onload&&!image.settled);peakLoading=Math.max(peakLoading,pending.length);
   if(!pending.length)return;
   for(const image of pending){image.settled=true;image.naturalWidth=1672;image.naturalHeight=941;image.onload();await Promise.resolve();}
  }
  assert.fail('image loading should settle in a bounded number of turns');
 };
 for(let now=0;now<=120000;now+=100){
  clock=now;await settle();
  if(scrollPixels&&now){
   const before=requests.length,beforePaints=paints;
   env.scrollY+=scrollPixels;events.scroll();
   scrollInputRequests+=requests.length-before;
   assert.equal(paints,beforePaints,'scroll handler never draws a frame synchronously');
  }
  const batch=[...frames.values()];frames.clear();for(const fn of batch)fn(now);
  const flow=env.window.__reportFlow;
  if(flow.scene!==previousScene){sceneChanges++;previousScene=flow.scene;}
  peakReady=Math.max(peakReady,flow.loaded);
  assert.ok(frames.size<=1,'one animation loop');
  assert.ok(flow.loaded<=6,'decoded working set stays bounded');
 }
 await settle();
 const flow=env.window.__reportFlow;
 assert.equal(scrollInputRequests,0,'scroll event itself never starts an image request');
 assert.ok(peakLoading<=2,'at most two concurrent image loads');
 return {durationSeconds:120,scrollPixelsPer100ms:scrollPixels,sceneChanges,imageRequests:requests.length,peakLoading,peakReady,phase:Number(flow.phase.toFixed(6)),reportedSpeed:Number(flow.pvSpeed.toFixed(6))};
}
(async()=>{
 const idle=await run(0),scrolling=await run(180);
 console.log(JSON.stringify({idle,scrolling}));
 if(process.env.MEASURE_ONLY==='1')return;
 assert.ok(Math.abs(idle.phase-144)<1e-6,'120 seconds at the calmer idle pace');
 assert.ok(scrolling.phase>idle.phase&&scrolling.phase<=288,'continuous scroll cannot exceed twice idle motion');
 assert.ok(scrolling.reportedSpeed<=2.4,'continuous scroll speed remains capped');
 assert.ok(scrolling.imageRequests<=32,'two-minute continuous scroll stays within the measured loading budget');
 console.log('PASS calmer motion bounds image turnover without synchronous scroll loads or paints; decode concurrency/cache remain bounded. Mock only.');
})().catch(error=>{console.error(error);process.exitCode=1});
