'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const baseline=process.argv[2];
let source;
function setup(hasStableCSS=true,cachedImages=false){
 const events={},canvases=[],contexts=[],images=[],frames=new Map();let serial=0;
 function makeCanvas(){
  const calls=[],options=[],writes=[],canvasEvents={};let width=300,height=150;
  const ctx=new Proxy({calls,clearRect(...args){calls.push(['clearRect',...args]);},fillRect(...args){calls.push(['fillRect',this.fillStyle,this.globalAlpha,this.globalCompositeOperation,...args]);},drawImage(...args){calls.push(['drawImage',...args]);},setTransform(...args){calls.push(['setTransform',...args]);},createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}}),createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)})},{get:(o,k)=>o[k]||(()=>{})});
  const canvas={writes,options,canvasEvents,addEventListener(name,fn){canvasEvents[name]=fn;},get width(){return width},set width(v){writes.push(['width',v]);width=v;},get height(){return height},set height(v){writes.push(['height',v]);height=v;},setAttribute(){},remove(){},getContext(kind,value){options.push(value);return ctx;}};
  if(canvases.length===0&&hasStableCSS){canvas.clientWidth=390;canvas.clientHeight=844;}
  canvases.push(canvas);contexts.push(ctx);return canvas;
 }
 const reduced={matches:false,addEventListener:(e,fn)=>events.reduced=fn};
 const math=Object.create(Math);math.random=()=>.12345;
 const env={Math:math,window:{},document:{hidden:false,body:{prepend(){},classList:{contains:()=>false}},createElement:makeCanvas,querySelectorAll:()=>[],querySelector:()=>null,addEventListener:(e,fn)=>events[e]=fn},Image:class{constructor(){this.complete=false;this.naturalWidth=0;images.push(this);}set src(value){this._src=value;if(cachedImages&&value){this.complete=true;this.naturalWidth=1672;this.naturalHeight=941;}}},matchMedia:()=>reduced,innerWidth:390,innerHeight:744,devicePixelRatio:2,scrollY:0,requestAnimationFrame(fn){frames.set(++serial,fn);return serial},cancelAnimationFrame:key=>frames.delete(key),setTimeout:()=>1,clearTimeout(){},addEventListener:(e,fn)=>events[e]=fn,MutationObserver:class{observe(){}}};
 vm.runInNewContext(source,env);
 return {env,events,canvases,canvas:canvases[0],context:contexts[0],contexts,reduced,frames,images};
}

function ready(t){const image=t.images.find(x=>typeof x.onload==='function');assert.ok(image);image.naturalWidth=1672;image.naturalHeight=941;image.complete=true;image.onload();assert.ok(t.frames.size>0);}
function probe(root){
 source=fs.readFileSync(path.join(root,'dist/assets/cinema-field.js'),'utf8');
 const css=fs.readFileSync(path.join(root,'dist/assets/feed.css'),'utf8');
 const rule=css.match(/\.continuous-canvas\{([^}]*)\}/)[1];
 const heights=Array.from(rule.matchAll(/(?:^|;)height:([^;]+)/g),m=>m[1]);
 const fallback=heights.filter(x=>x!=='100lvh').at(-1);
 const t=setup(true),before=t.canvas.writes.length;
 // Model the legacy browser contract: vh is large/stable, percentages follow bars.
 for(let i=0;i<160;i++){t.env.innerHeight=744+i%101;t.canvas.clientHeight=fallback==='100vh'?844:t.env.innerHeight;t.events.resize();}
 const mobileWrites=t.canvas.writes.length-before;
 const p=setup(true);ready(p);p.reduced.matches=true;p.events.reduced();
 const phase=p.env.window.__reportFlow.phase,pre=p.context.calls.length;let canceled=false;
 p.canvas.canvasEvents.contextlost?.({preventDefault(){canceled=true;}});
 p.canvas.canvasEvents.contextrestored?.({});
 const repaint=p.context.calls.length-pre;
 // Cached synchronous loads without Image.decode may settle during paint/preload.
 const cached=setup(true,true);let peakRAF=cached.frames.size;
 for(let frame=0;frame<300;frame++){const entry=cached.frames.entries().next().value;assert.ok(entry);cached.frames.delete(entry[0]);entry[1](frame*100);peakRAF=Math.max(peakRAF,cached.frames.size);}
 if(root===process.cwd()){
  assert.equal(fallback,'100vh');assert.equal(mobileWrites,0);assert.ok(repaint>0);assert.equal(canceled,false,'2D automatic restoration must not be canceled');assert.equal(p.frames.size,0,'paused restoration must not animate');assert.equal(p.env.window.__reportFlow.phase,phase);
  // Active loss suspends scheduling; repeated restores never create parallel loops.
  const a=setup(true);ready(a);const beforeLoss=a.context.calls.length;
  a.canvas.canvasEvents.contextlost({preventDefault(){throw Error('2D restore canceled')}});assert.equal(a.frames.size,0);
  a.env.scrollY=200;a.events.scroll();a.events.visibilitychange();assert.equal(a.frames.size,0);assert.equal(a.context.calls.length,beforeLoss);
  a.canvas.canvasEvents.contextrestored({});assert.equal(a.frames.size,1);
  a.canvas.canvasEvents.contextrestored({});assert.equal(a.frames.size,1);
  assert.equal(peakRAF,1,'cached loads during a paint cannot start a second RAF loop');
  const hidden=setup(true);ready(hidden);hidden.canvas.canvasEvents.contextlost({});hidden.env.document.hidden=true;
  const hiddenCalls=hidden.context.calls.length;hidden.canvas.canvasEvents.contextrestored({});assert.equal(hidden.frames.size,0);assert.equal(hidden.context.calls.length,hiddenCalls);
  hidden.env.document.hidden=false;hidden.events.visibilitychange();assert.equal(hidden.frames.size,1);
  // All auxiliary canvas events are handled, without enabling paused RAF.
  for(const i of [1,2,4]){const aux=p.canvases[i];assert.ok(aux.canvasEvents.contextlost&&aux.canvasEvents.contextrestored);const offsets=p.contexts.map(ctx=>ctx.calls.length);aux.canvasEvents.contextlost({});for(let j=0;j<p.contexts.length;j++)assert.ok(p.contexts[j].calls.slice(offsets[j]).every(call=>call[0]!=='drawImage'||call[1]!==aux),'lost auxiliary bitmap must not be read');aux.canvasEvents.contextrestored({});assert.equal(p.frames.size,0);}
  const cloud=p.contexts[4],cloudPaints=cloud.calls.filter(x=>x[0]==='fillRect').length;
  p.canvases[4].canvasEvents.contextlost({});p.canvases[4].canvasEvents.contextrestored({});assert.equal(cloud.calls.filter(x=>x[0]==='fillRect').length,cloudPaints+1,'cloud texture is rebuilt');
  const b=p.context.calls.length;p.events.pageshow();assert.ok(p.context.calls.length>b);assert.equal(p.frames.size,0);
  // Desktop/keyboard changes to the actual CSS box remain authoritative.
  p.canvas.clientHeight=620;p.events.resize();assert.equal(p.canvas.height,930);
  p.canvas.clientWidth=844;p.canvas.clientHeight=390;p.events.resize();assert.equal(p.canvas.width,1266);assert.equal(p.canvas.height,585);
  p.env.devicePixelRatio=1;p.events.resize();assert.equal(p.canvas.width,844);assert.equal(p.canvas.height,390);
 }
 return {fallback,modeledToolbarEvents:160,bitmapWrites:mobileWrites,pausedRestorationDrawingCalls:repaint,restorationCanceled:canceled,cachedLoadsPeakRAF:peakRAF};
}
const before=baseline?probe(baseline):null,after=probe(process.cwd());
if(before){assert.equal(before.bitmapWrites,160);assert.equal(before.pausedRestorationDrawingCalls,0);}
console.log(JSON.stringify({scope:'VM lifecycle plus modeled legacy stable-vh CSS selection; not real Safari/iPhone compositor',before,after,extraChecks:'active/paused recovery, one RAF, auxiliary surfaces, pageshow, desktop/keyboard box resize, orientation and DPR'},null,2));
