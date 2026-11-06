'use strict';
// Canvas state/resize regression. This is not an iOS compositor reproduction.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(process.argv[2]||'dist/assets/cinema-field.js','utf8');
function setup(hasStableCSS=true){
 const events={},canvases=[],contexts=[],frames=new Map();let serial=0;
 function makeCanvas(){
  const calls=[],options=[],writes=[];let width=300,height=150;
  const ctx=new Proxy({calls,clearRect(...args){calls.push(['clearRect',...args]);},fillRect(...args){calls.push(['fillRect',this.fillStyle,this.globalAlpha,this.globalCompositeOperation,...args]);},drawImage(...args){calls.push(['drawImage',...args]);},setTransform(...args){calls.push(['setTransform',...args]);},createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}}),createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)})},{get:(o,k)=>o[k]||(()=>{})});
  const canvas={writes,options,get width(){return width},set width(v){writes.push(['width',v]);width=v;},get height(){return height},set height(v){writes.push(['height',v]);height=v;},setAttribute(){},remove(){},getContext(kind,value){options.push(value);return ctx;}};
  if(canvases.length===0&&hasStableCSS){canvas.clientWidth=390;canvas.clientHeight=844;}
  canvases.push(canvas);contexts.push(ctx);return canvas;
 }
 const reduced={matches:false,addEventListener:(e,fn)=>events.reduced=fn};
 const env={window:{},document:{hidden:false,body:{prepend(){},classList:{contains:()=>false}},createElement:makeCanvas,querySelectorAll:()=>[],querySelector:()=>null,addEventListener:(e,fn)=>events[e]=fn},Image:class{constructor(){this.complete=false;this.naturalWidth=0;}},matchMedia:()=>reduced,innerWidth:390,innerHeight:744,devicePixelRatio:2,scrollY:0,requestAnimationFrame(fn){frames.set(++serial,fn);return serial},cancelAnimationFrame:key=>frames.delete(key),setTimeout:()=>1,clearTimeout(){},addEventListener:(e,fn)=>events[e]=fn,MutationObserver:class{observe(){}}};
 vm.runInNewContext(source,env);
 return {env,events,canvases,canvas:canvases[0],context:contexts[0],contexts,reduced,frames};
}
const t=setup();
assert.equal(t.canvas.options[0]?.alpha,false,'visible canvas requests an opaque backing');
assert.ok(t.canvases.slice(1).every(canvas=>canvas.options.every(value=>value===undefined)), 'dissolve mask canvases retain alpha');
assert.equal(t.canvas.width,585);assert.equal(t.canvas.height,1266,'raster uses the CSS large viewport, not the shrinking visual viewport');
const dimensions=t.canvas.writes.length,paints=t.context.calls.length;
for(let i=0;i<160;i++){
 t.env.innerHeight=744+i%101;t.events.resize();t.env.scrollY+=i%2?-40:80;t.events.scroll();
}
assert.equal(t.canvas.writes.length,dimensions,'browser-bar resize/scroll leaves the bitmap intact');
assert.equal(t.context.calls.length,paints,'unchanged CSS viewport does not paint synchronously on resize');
assert.equal(t.frames.size,0,'resize does not create a second animation scheduler');
assert.equal(t.context.calls.filter(call=>call[0]==='clearRect').length,0,'visible frame is never transparently cleared');
const firstFill=t.context.calls.find(call=>call[0]==='fillRect');
assert.deepEqual(firstFill,['fillRect','#101719',1,'source-over',0,0,390,844],'startup begins with a full dark opaque fill before assets load');
// Rotation is a real layout change and must still redraw at the same phase.
const phase=t.env.window.__reportFlow.phase;
t.canvas.clientWidth=844;t.canvas.clientHeight=390;t.env.innerWidth=844;t.env.innerHeight=340;t.events.resize();
assert.equal(t.canvas.width,1266);assert.equal(t.canvas.height,585);assert.equal(t.env.window.__reportFlow.phase,phase);
assert.equal(t.canvas.writes.length,dimensions+2);
// DPR changes redraw, while a duplicate resize does not clear the bitmap again.
t.env.devicePixelRatio=1;t.events.resize();assert.equal(t.canvas.width,844);assert.equal(t.canvas.height,390);
const dprWrites=t.canvas.writes.length;t.events.resize();assert.equal(t.canvas.writes.length,dprWrites);
// When no CSS box can be measured, retain the ordinary inner-viewport fallback.
const old=setup(false);assert.equal(old.canvas.height,1116);old.env.innerHeight=800;old.events.resize();assert.equal(old.canvas.height,1200);
const css=fs.readFileSync('dist/assets/feed.css','utf8');
assert.match(css,/html\{background:#101719\}/,'document backdrop stays dark outside the canvas');
const rule=css.match(/\.continuous-canvas\{([^}]*)\}/)[1];
assert.match(rule,/height:100%;height:100vh;height:100lvh/,'stable height has a legacy fallback');assert.match(rule,/background:#101719/,'CSS backdrop survives discarded bitmap');
console.log('PASS opaque startup/paint, dark document and canvas backdrops, 160 toolbar resize/scroll events without bitmap resets, rotation/DPR updates and unmeasurable CSS-box fallback. Mock only; iOS compositor unverified.');
