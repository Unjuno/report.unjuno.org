'use strict';
// Deterministic canvas-command regression, not an iOS Safari compositor test.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('dist/assets/cinema-field.js','utf8'),marker='// Fetch the visible image first;';
assert.ok(source.includes(marker));
function run(touch){
 const contexts=[],canvases=[],win={};
 function createCanvas(){
  const calls=[],ctx=new Proxy({
   calls,globalAlpha:1,globalCompositeOperation:'source-over',
   createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),
   createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}}),
   drawImage(source){calls.push(['drawImage',source,this.globalAlpha]);},
   fillRect(){calls.push(['fillRect',this.fillStyle]);},clearRect(){calls.push(['clearRect']);},
   putImageData(){calls.push(['putImageData']);}
  },{get:(obj,key)=>key in obj?obj[key]:()=>{}});
  const canvas={width:0,height:0,setAttribute(){},remove(){},addEventListener(){},getContext(){return ctx;}};
  if(!canvases.length){canvas.clientWidth=390;canvas.clientHeight=844;}
  canvases.push(canvas);contexts.push(ctx);return canvas;
 }
 const env={
  Float32Array,Uint8ClampedArray,Date,Math,window:win,
  document:{hidden:false,body:{prepend(){},classList:{contains(){return false;}}},createElement:createCanvas,querySelector(){return null;},querySelectorAll(){return[];},addEventListener(){}},
  Image:class{constructor(){this.complete=false;this.naturalWidth=1600;this.naturalHeight=900;}set src(value){this.url=value;}},
  matchMedia:query=>({matches:query.includes('(pointer: coarse)')&&touch,addEventListener(){}}),
  innerWidth:390,innerHeight:744,devicePixelRatio:2,scrollY:0,
  requestAnimationFrame:()=>1,cancelAnimationFrame(){},setTimeout:()=>1,clearTimeout(){},addEventListener(){},MutationObserver:class{observe(){}}
 };
 const hooked=source.replace(marker,'window.__probe={dissolve,assets,paint};\n'+marker);
 vm.runInNewContext(hooked,env);
 const assets=win.__probe.assets.map(asset=>asset.image);
 function dissolve(previous,current,next,p){
  contexts.forEach(ctx=>ctx.calls.length=0);
  win.__probe.dissolve(previous,current,next,p,10);
  return {
   images:contexts[0].calls.filter(x=>x[0]==='drawImage'&&assets.includes(x[1])).map(x=>[assets.indexOf(x[1]),x[2]]),
   aux:contexts[1].calls.length,mask:contexts[2].calls.length
  };
 }
 const a={asset:0},b={asset:1},c={asset:2},d={asset:3};
 const incoming=dissolve(a,b,c,.2),outgoing=dissolve(a,b,c,.8);
 const end=dissolve(a,b,c,1),start=dissolve(b,c,d,0),clear=dissolve(a,b,c,.5);
 contexts[0].calls.length=0;win.__probe.paint();
 assert.ok(contexts[0].calls.some(x=>x[0]==='fillRect'&&x[1]==='#101719'),'dark fallback is always filled');
 if(touch){
  assert.deepEqual(incoming.images.map(x=>x[0]),[0,1]);
  assert.deepEqual(outgoing.images.map(x=>x[0]),[1,2]);
  assert.deepEqual(clear.images.map(x=>x[0]),[1]);
  assert.equal(incoming.images[1][1],.75);
  assert.ok(Math.abs(outgoing.images[1][1]-.25)<1e-12);
  assert.deepEqual(end.images,start.images,'no seam discontinuity');
  for(const x of [incoming,outgoing,end,start,clear]){assert.equal(x.aux,0);assert.equal(x.mask,0);}
 }else{
  assert.ok(incoming.aux>0&&outgoing.aux>0,'desktop spatial surface retained');
  assert.ok(incoming.mask>0&&outgoing.mask>0,'desktop alpha mask retained');
 }
 return {touch,drawCount:incoming.images.length,aux:incoming.aux,mask:incoming.mask};
}
console.log('PASS touch compositor fallback (mock; not real Safari)',JSON.stringify({touch:run(true),desktop:run(false)}));
