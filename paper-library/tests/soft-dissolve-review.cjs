'use strict';
const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const contexts=[],canvases=[],rafs=new Map(),events={},mutations=[];let seq=0,paused=false;
function makeCanvas(){const calls=[],context={calls,save(){},restore(){},setTransform(){},clearRect(){},fillRect(){},translate(){},beginPath(){},closePath(){},lineTo(){},moveTo(){},stroke(){},arc(){},fill(){},bezierCurveTo(){},createLinearGradient(){return{addColorStop(){}}},createImageData(w,h){return{data:new Uint8ClampedArray(w*h*4)}},putImageData(p){this.pixels=new Uint8ClampedArray(p.data)},drawImage(...args){calls.push(args)}};contexts.push(context);const canvas={width:0,height:0,setAttribute(){},remove(){},getContext(){return context}};canvases.push(canvas);return canvas;}
const reduced={matches:false,addEventListener(e,fn){events.reduce=fn}};
const env={Float32Array,Uint8ClampedArray,Date,Math,window:{},document:{hidden:false,body:{prepend(){},classList:{contains:()=>paused}},createElement:makeCanvas,querySelectorAll:()=>[],querySelector:()=>null,addEventListener:(e,f)=>events[e]=f},Image:class{constructor(){this.complete=true;this.naturalWidth=1600;this.naturalHeight=900}},matchMedia:()=>reduced,innerWidth:1440,innerHeight:900,devicePixelRatio:2,scrollY:0,setTimeout:()=>1,clearTimeout(){},requestAnimationFrame(fn){rafs.set(++seq,fn);return seq},cancelAnimationFrame(id){rafs.delete(id)},addEventListener:(e,f)=>events[e]=f,MutationObserver:class{constructor(fn){mutations.push(fn)}observe(){}}};
let source=fs.readFileSync('dist/assets/cinema-field.js','utf8');source=source.replace('// Fetch the visible image first;',"window.test={dissolve,weights,smooth,clamp,assets,scenes,get field(){return maskField},get pixels(){return maskPixels},get phase(){return phase},setPhase(p){phase=p},paint};\n// Fetch the visible image first;");
vm.runInNewContext(source,env);const t=env.window.test;
const a={kind:'wave'},b={kind:'network'};
t.dissolve(a,a,b,.8,2);const alpha=[];for(let i=3;i<t.pixels.data.length;i+=4)alpha.push(t.pixels.data[i]);assert.ok(Math.max(...alpha)-Math.min(...alpha)>25,'different regions dissolve at different times');assert.ok(canvases[1].width*canvases[1].height<2205000,'secondary layer follows main canvas raster cap');
for(const offset of t.field){
 const start=t.weights(0,offset),end=t.weights(1,offset);
 assert.equal(start[0],.5);assert.equal(start[1],.5);assert.equal(start[2],0);
 assert.equal(end[0],0);assert.equal(end[1],.5);assert.equal(end[2],.5);
 for(let p=0;p<=1;p+=.01){const weights=t.weights(p,offset);assert.ok(Math.abs(weights.reduce((a,b)=>a+b,0)-1)<1e-10);assert.ok(weights.every(w=>w>=0&&w<=1),'bounded weights');if(p>=.4&&p<=.6)assert.equal(weights[1],1,'clear central window regardless of spatial offset');assert.ok(weights[0]===0||weights[2]===0,'only two scenes overlap');}
 const e=1e-5,before=t.weights(1-e,offset),after=t.weights(e,offset);
 assert.ok(Math.abs((end[1]-before[1])/e-(after[0]-start[0])/e)<.001,'matching boundary velocity for outgoing scene');
 assert.ok(Math.abs((end[2]-before[2])/e-(after[1]-start[1])/e)<.001,'matching boundary velocity for incoming scene');
}
assert.equal(canvases[3].width*canvases[3].height,1536,'tiny diffusion surface');
for(let y=0;y<48;y++)for(let x=0;x<63;x++)assert.ok(Math.abs(alpha[y*64+x]-alpha[y*64+x+1])<10,'broad, smooth spatial changes, no hard tile edges');
const field=t.field;t.dissolve(a,a,b,.8,2);assert.equal(t.field,field,'reuse mask field within transition');t.dissolve(a,a,b,.8,3);assert.notEqual(t.field,field);
function frame(ms){const batch=[...rafs.values()];rafs.clear();batch.forEach(fn=>fn(ms));}
frame(0);frame(100);const before=t.phase;env.scrollY=400;events.scroll();assert.equal(t.phase,before);frame(200);assert.ok(t.phase>before+.1,'scroll accelerates phase continuously');
paused=true;mutations[0]();const frozen=t.phase;assert.equal(rafs.size,0);events.resize();env.scrollY=800;events.scroll();assert.equal(t.phase,frozen);
paused=false;reduced.matches=true;events.reduce();assert.equal(rafs.size,0);assert.equal(t.phase,frozen);
reduced.matches=false;events.reduce();assert.ok(rafs.size);env.document.hidden=true;events.visibilitychange();assert.equal(rafs.size,0);env.document.hidden=false;events.visibilitychange();frame(40000);assert.equal(t.phase,frozen,'visibility resume does not jump');
const main=contexts[0],surface=contexts[1],fog=contexts[3];
const asset={asset:3};main.calls.length=surface.calls.length=fog.calls.length=0;
t.dissolve(a,asset,b,.5,4);
assert.equal(main.calls.length,1,'clear window draws only the original image');
assert.equal(main.calls[0][0],t.assets[3].image,'clear window uses original full resolution source');
assert.equal(surface.calls.length,0,'clear window bypasses intermediate surface');
assert.equal(fog.calls.length,0,'clear window bypasses bloom');
console.log('PASS spatial dissolve: full-detail clear window, two-scene shoulders, unequal alpha, matched endpoints and velocity, cached field, raster cap, scroll continuity, pause, reduced motion, visibility. Mock/math, not browser or device performance.');
