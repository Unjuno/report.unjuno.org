'use strict';
// Geometry/mock coverage, not a claim about real-device frame rate.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(process.argv[2]||'dist/assets/cinema-field.js','utf8');
const frames=new Map(),events={},contexts=[];let serial=0;
const makeCanvas=()=>{const calls=[],ctx=new Proxy({calls,drawImage(...args){calls.push(args)},createLinearGradient:()=>({addColorStop(){}}),createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)})},{get:(o,k)=>o[k]||(()=>{})});contexts.push(ctx);return {width:0,height:0,setAttribute(){},remove(){},getContext:()=>ctx}};
const env={window:{},document:{hidden:false,body:{prepend(){},classList:{contains:()=>false}},createElement:makeCanvas,querySelectorAll:()=>[],querySelector:()=>null,addEventListener(){}},Image:class{constructor(){this.complete=false;this.naturalWidth=1672;this.naturalHeight=941}},matchMedia:()=>({matches:false,addEventListener(){}}),innerWidth:390,innerHeight:844,devicePixelRatio:1,scrollY:0,requestAnimationFrame(fn){frames.set(++serial,fn);return serial},cancelAnimationFrame:id=>frames.delete(id),setTimeout:()=>1,clearTimeout(){},addEventListener:(n,f)=>events[n]=f,MutationObserver:class{observe(){}}};
vm.runInNewContext(source.replace('// Fetch the visible image first;',`window.test={layer,assets,scenes,sceneBeats,sceneStarts,transitionNames,transitionFor,transitionSeed,revealThreshold,set(phaseValue,energy,travel){phase=phaseValue;scrollEnergy=energy;cloudTravel=travel}};\n// Fetch the visible image first;`),env);
const t=env.window.test,ctx=contexts[0];let maxRelativeScaleChange=0,maxTranslation=0,samples=0;
for(const [width,height] of [[390,844],[844,390],[1440,900]]){
 env.innerWidth=width;env.innerHeight=height;events.resize();
 for(const scene of t.scenes.filter(s=>s.asset!==undefined)){
  t.set(0,0,0);ctx.calls.length=0;t.layer(scene,1);const reference=ctx.calls.at(-1).slice(1);
  for(const [phase,energy,travel] of [[0,1,0],[20,1,10],[200,.5,-25],[400,0,0]]){
   t.set(phase,energy,travel);ctx.calls.length=0;t.layer(scene,1);const draw=ctx.calls.at(-1),args=draw.slice(1);
   maxRelativeScaleChange=Math.max(maxRelativeScaleChange,Math.abs(args[6]/reference[6]-1));
   maxTranslation=Math.max(maxTranslation,Math.abs(args[4]-reference[4]),Math.abs(args[5]-reference[5]));
   if(process.env.MEASURE_ONLY!=='1')assert.deepEqual(args,reference,'time/scroll cannot zoom, pan or recrop '+t.assets[scene.asset].name);
   if(!scene.framing){const [x,y,dw,dh]=draw.slice(5);assert.ok(x<=0&&y<=0&&x+dw>=width-.000001&&y+dh>=height-.000001,'static cover fills viewport');}
   samples++;
  }
 }
}
console.log(JSON.stringify({MOCK:true,scenes:t.scenes.length,geometrySamples:samples,maxRelativeScaleChange,maxTranslationPixels:maxTranslation}));
if(process.env.MEASURE_ONLY==='1')process.exit();
assert.equal(t.transitionNames.length,15);assert.equal(new Set(t.scenes.map(t.transitionFor)).size,15,'all fifteen families are used');
// Direction-only variants: lateral has no seed-dependent base field, so any
// variation below comes from source-stable orientation, not threshold noise.
const orientations=new Set();
for(const seed of [.05,.1,.2,.3]){
 const field=[];for(let y=0;y<6;y++)for(let x=0;x<8;x++)field.push(t.revealThreshold(x/7,y/5,'lateral-blend',seed).toFixed(6));
 orientations.add(field.join(','));
}
assert.equal(orientations.size,4,'familiar field has four distinct stable directions');
console.log('PASS every image keeps identical framing across time and scroll/reversal in portrait/landscape; 15 used transition families and four deterministic directions.');
