'use strict';
const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const contexts=[],canvases=[],rafs=new Map(),events={},mutations=[];let seq=0,paused=false;
function makeCanvas(){const calls=[],context={calls,save(){},restore(){},setTransform(){},clearRect(){},fillRect(){},translate(){},beginPath(){},closePath(){},lineTo(){},moveTo(){},stroke(){},arc(){},fill(){},bezierCurveTo(){},createLinearGradient(){return{addColorStop(){}}},createImageData(w,h){return{data:new Uint8ClampedArray(w*h*4)}},putImageData(p){this.pixels=new Uint8ClampedArray(p.data)},drawImage(...args){calls.push(args)}};contexts.push(context);const canvas={width:0,height:0,setAttribute(){},remove(){},getContext(){return context}};canvases.push(canvas);return canvas;}
const reduced={matches:false,addEventListener(e,fn){events.reduce=fn}};
const env={Float32Array,Uint8ClampedArray,Date,Math,window:{},document:{hidden:false,body:{prepend(){},classList:{contains:()=>paused}},createElement:makeCanvas,querySelectorAll:()=>[],querySelector:()=>null,addEventListener:(e,f)=>events[e]=f},Image:class{constructor(){this.complete=true;this.naturalWidth=1600;this.naturalHeight=900}},matchMedia:()=>reduced,innerWidth:1440,innerHeight:900,devicePixelRatio:2,scrollY:0,setTimeout:()=>1,clearTimeout(){},requestAnimationFrame(fn){rafs.set(++seq,fn);return seq},cancelAnimationFrame(id){rafs.delete(id)},addEventListener:(e,f)=>events[e]=f,MutationObserver:class{constructor(fn){mutations.push(fn)}observe(){}}};
let source=fs.readFileSync('dist/assets/cinema-field.js','utf8');source=source.replace('// Fetch the visible image first;',"window.test={dissolve,weights,smooth,clamp,assets,scenes,transitionNames,transitionFor,transitionSeed,revealThreshold,revealAlpha,get field(){return maskField},get pixels(){return maskPixels},get phase(){return phase},setPhase(p){phase=p},paint};\n// Fetch the visible image first;");
vm.runInNewContext(source,env);const t=env.window.test;

assert.equal(t.transitionNames.length,15,'twelve existing plus three soft spatial families');
const outgoing={asset:3,transition:'mist'},following={asset:5,transition:'ribbon'};
const metrics=[];
for(const mode of t.transitionNames){
 const subject={asset:4,transition:mode},seed=t.transitionSeed(subject);
 assert.equal(t.transitionFor(subject),mode);
 for(const progress of [0,.1,.3,.4,.600000001,.7,.9,1])for(const threshold of [0,.1,.5,.9,1]){
  const alpha=t.revealAlpha(progress,threshold,mode);
  assert.ok(Number.isFinite(alpha)&&alpha>=-1e-12&&alpha<=1+1e-12,mode+' bounded alpha');
  if(progress===.4)assert.ok(Math.abs(alpha-1)<1e-12,mode+' clear entrance');
  if(progress===.600000001)assert.ok(Math.abs(alpha)<1e-12,mode+' clear exit');
 }
 for(const epsilon of [0,1e-7]){
  t.dissolve(outgoing,outgoing,subject,1-epsilon/11.5,100);
  const left=new Uint8ClampedArray(t.pixels.data);
  t.dissolve(outgoing,subject,following,epsilon/4.8,101);
  assert.ok(left.every((v,i)=>Math.abs(v-t.pixels.data[i])<=(epsilon===0?0:1)),mode+' identical boundary mask across unequal durations');
 }
 t.dissolve(outgoing,outgoing,subject,1,102);
 const alphas=[];let maxGradient=0;
 for(let y=0;y<48;y++)for(let x=0;x<64;x++){
  const v=t.pixels.data[(y*64+x)*4+3];alphas.push(v);
  if(x)maxGradient=Math.max(maxGradient,Math.abs(v-t.pixels.data[(y*64+x-1)*4+3]));
  if(y)maxGradient=Math.max(maxGradient,Math.abs(v-t.pixels.data[((y-1)*64+x)*4+3]));
 }
 assert.ok(maxGradient<=8,mode+' broad soft gradient at handover');
 assert.ok(Math.min(...alphas)>=50&&Math.max(...alphas)<=205,mode+' both images remain visible throughout handover');
 const field=t.field;t.dissolve(outgoing,outgoing,subject,.9,102);assert.equal(t.field,field,'cached field reused');
 for(const p of [.4,.5,.6]){
  contexts.forEach(c=>c.calls.length=0);t.dissolve(outgoing,subject,following,p,103);
  assert.equal(contexts[0].calls.length,1,mode+' clear window retains native image');
  assert.equal(contexts[1].calls.length,0,mode+' clear window bypasses blend surface');
 }
 metrics.push({mode,min:Math.min(...alphas),max:Math.max(...alphas),maxAdjacentAlphaStep:maxGradient});
}
const selected=name=>t.scenes.find(s=>t.assets[s.asset]?.name===name);
for(const [name,mode] of [['garden-conservatory.webp','cloud-banks'],['ocean-corridor.webp','soft-waves'],['submerged-city.webp','soft-waves'],['art-organic-cells-v2.webp','petal-blend']])assert.equal(t.transitionFor(selected(name)),mode,name+' uses a new family');
const unique=new Set();for(const mode of ['soft-waves','cloud-banks','petal-blend'])for(const seed of [1,5,17]){
 const field=[];for(let y=0;y<48;y++)for(let x=0;x<64;x++){const value=t.revealThreshold(x/63,y/47,mode,seed);assert.ok(Number.isFinite(value)&&value>=0&&value<=1);field.push(value.toFixed(3));}unique.add(field.join(','));
}assert.equal(unique.size,9,'source seeds and new families remain distinct');
assert.equal(canvases.length,5,'no additional canvases');assert.equal(canvases[2].width*canvases[2].height,3072,'64 by 48 alpha field retained');assert.ok(canvases[1].width*canvases[1].height<2205000,'existing raster cap retained');
console.log(JSON.stringify({MOCK:true,usedFamilies:[...new Set(t.scenes.map(t.transitionFor))],handoverMasks:metrics}));
console.log('PASS all 15 masks: bounded alpha, exact handovers, clear endpoints/window, broad gradients, deterministic variation, cached fields and unchanged canvas budget. Math/mock, not browser aesthetics.');
