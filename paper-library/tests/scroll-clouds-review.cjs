'use strict';
const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const contexts=[],canvases=[],rafs=new Map(),events={},mutations=[];let seq=0,paused=false;
function makeCanvas(){const calls=[],context={calls,save(){},restore(){},setTransform(){},clearRect(){},fillRect(){},translate(){},beginPath(){},closePath(){},lineTo(){},moveTo(){},stroke(){},arc(){},fill(){},bezierCurveTo(){},createRadialGradient(){return{addColorStop(){}}},createLinearGradient(){return{addColorStop(){}}},createImageData(w,h){return{data:new Uint8ClampedArray(w*h*4)}},putImageData(p){this.pixels=new Uint8ClampedArray(p.data)},drawImage(...args){calls.push(args)}};contexts.push(context);const canvas={width:0,height:0,setAttribute(){},remove(){},getContext(){return context}};canvases.push(canvas);return canvas;}
const reduced={matches:false,addEventListener(e,fn){events.reduce=fn}};
const env={Float32Array,Uint8ClampedArray,Date,Math,window:{},document:{hidden:false,body:{prepend(){},classList:{contains:()=>paused}},createElement:makeCanvas,querySelectorAll:()=>[],querySelector:()=>null,addEventListener:(e,f)=>events[e]=f},Image:class{constructor(){this.complete=false;this.naturalWidth=1600;this.naturalHeight=900}},matchMedia:()=>reduced,innerWidth:1440,innerHeight:900,devicePixelRatio:2,scrollY:0,setTimeout:()=>1,clearTimeout(){},requestAnimationFrame(fn){rafs.set(++seq,fn);return seq},cancelAnimationFrame(id){rafs.delete(id)},addEventListener:(e,f)=>events[e]=f,MutationObserver:class{constructor(fn){mutations.push(fn)}observe(){}}};
let source=fs.readFileSync('dist/assets/cinema-field.js','utf8');source=source.replace('// Fetch the visible image first;',"window.test={sceneTime,sceneBeats,sceneStarts,sequenceFor,dissolve,weights,smooth,clamp,assets,scenes,layer,clouds,get energy(){return scrollEnergy},get travel(){return cloudTravel},get direction(){return flowDirection},get field(){return maskField},get pixels(){return maskPixels},get phase(){return phase},setPhase(p){phase=p},paint};\n// Fetch the visible image first;");
vm.runInNewContext(source,env);const t=env.window.test;for(const asset of t.assets)asset.ready=true;mutations[0]();
const a={kind:'wave'},b={kind:'network'};
t.dissolve(a,a,b,.9,2);const alpha=[];for(let i=3;i<t.pixels.data.length;i+=4)alpha.push(t.pixels.data[i]);assert.ok(Math.max(...alpha)-Math.min(...alpha)>25,'different regions dissolve at different times');assert.ok(canvases[1].width*canvases[1].height<2205000,'secondary layer follows main canvas raster cap');
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
const field=t.field;t.dissolve(a,a,b,.9,2);assert.equal(t.field,field,'reuse mask field within transition');t.dissolve(a,a,b,.9,3);assert.notEqual(t.field,field);
function frame(ms){const batch=[...rafs.values()];rafs.clear();batch.forEach(fn=>fn(ms));}
frame(0);frame(100);const before=t.phase;const beforeEnergy=t.energy;env.scrollY=400;events.scroll();assert.equal(t.phase,before);assert.equal(t.energy,beforeEnergy,'input never jumps cloud opacity or camera');frame(200);assert.ok(t.phase>before+.1,'scroll accelerates phase continuously');assert.ok(t.energy>0&&t.energy<1,'visual response eases in');assert.ok(t.travel>0,'cloud movement responds to scrolling');
const sprite=canvases[4];assert.equal(sprite.width*sprite.height,16384,'one small cloud texture');
const calls=contexts[0].calls.length;t.clouds();assert.equal(contexts[0].calls.length-calls,6,'bounded six cloud draws');
const direction=t.direction;env.scrollY=0;events.scroll();assert.equal(t.direction,direction,'reverse input does not teleport clouds');frame(300);assert.ok(t.direction<direction,'reverse motion eases toward new direction');
for(let i=4;i<120;i++)frame(i*100);assert.ok(t.energy<.00001,'cloud intensity settles when scrolling ends');
const auto=t.phase;frame(12000);assert.ok(t.phase>auto,'autonomous playback continues after scroll settles');
// Repeated fast scrolling at portrait and landscape sizes never exposes source edges.
let cameraClock=12000;for(const [w,h] of [[390,844],[1440,900]]){
 env.innerWidth=w;env.innerHeight=h;events.resize();
 for(let j=0;j<30;j++){env.scrollY+=(j%2?1:-1)*10000;events.scroll();frame(cameraClock+=100);const n=contexts[0].calls.length;t.layer(t.scenes[0],1);const draw=contexts[0].calls.at(-1);assert.ok(contexts[0].calls.length>n);const [x,y,dw,dh]=draw.slice(5);assert.ok(x<=0&&y<=0&&x+dw>=w-.000001&&y+dh>=h-.000001,'camera overscan covers viewport');assert.ok(t.energy<=1&&t.energy>=0);}
}

paused=true;mutations[0]();const frozen=t.phase,frozenEnergy=t.energy,frozenTravel=t.travel;assert.equal(rafs.size,0);events.resize();env.scrollY=800;events.scroll();assert.equal(t.phase,frozen);assert.equal(t.energy,frozenEnergy);assert.equal(t.travel,frozenTravel);
paused=false;reduced.matches=true;events.reduce();assert.equal(rafs.size,0);assert.equal(t.phase,frozen);
reduced.matches=false;events.reduce();assert.ok(rafs.size);env.document.hidden=true;events.visibilitychange();assert.equal(rafs.size,0);env.document.hidden=false;events.visibilitychange();frame(40000);assert.equal(t.phase,frozen,'visibility resume does not jump');
console.log('PASS scroll clouds: smooth input/reversal/decay, six cached-texture draws, camera edge coverage on portrait/landscape, autonomous motion, pause/reduced-motion freeze, continuous dissolve. Mock/math, not device visual/performance verification.');

for(let i=0;i<t.sceneBeats.length;i++){
 const sequence=t.sequenceFor(0);t.setPhase(sequence.starts[i]+t.sceneBeats[sequence.order[i]].seconds*.5);contexts[0].calls.length=0;t.paint();
 assert.ok(!contexts[0].calls.some(args=>args[0]===sprite),'A clear window suppresses cloud sprite for every B duration');
}
console.log('PASS A+B shared progress: all '+t.sceneBeats.length+' clear windows have no cloud overlay.');
