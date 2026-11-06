// Native Canvas pixel checks need @napi-rs/canvas. They do not exercise a browser compositor.
'use strict';
const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict'),{createCanvas,loadImage}=require('@napi-rs/canvas');
const directory=process.cwd();
function boot(source,w,h,images){
 const canvases=[];
 function create(){const x=createCanvas(1,1);x.setAttribute=()=>{};x.remove=()=>{};canvases.push(x);return x;}
 const math=Object.create(Math);math.random=()=>.12345;
 const env={Math:math,window:{},document:{hidden:false,body:{prepend(){},classList:{contains:()=>false}},createElement:create,querySelectorAll:()=>[],querySelector:()=>null,addEventListener(){}},Image:class{constructor(){this.naturalWidth=0;this.complete=false;}},matchMedia:()=>({matches:true,addEventListener(){}}),innerWidth:w,innerHeight:h,devicePixelRatio:1,scrollY:0,requestAnimationFrame:()=>1,cancelAnimationFrame(){},setTimeout:()=>1,clearTimeout(){},addEventListener(){},MutationObserver:class{observe(){}}};
 const injected=source.replace('// Fetch the visible image first;',`window.check={assets,render(progress,style){phase=sceneTime(0).seconds*progress;pairStep=0;pairPrevious={asset:3,transition:style};pairA={asset:4,transition:style};pairB={asset:5,transition:style};paint();},transitionNames};\n// Fetch the visible image first;`);
 vm.runInNewContext(injected,env);const t=env.window.check;
 for(const [i,image]of images){t.assets[i].image=image;t.assets[i].ready=true;t.assets[i].requested=true;}
 return{canvas:canvases[0],test:t};
}
(async()=>{
 const candidate=fs.readFileSync(directory+'/dist/assets/cinema-field.js','utf8');const baseline=process.argv[2]?fs.readFileSync(process.argv[2],'utf8'):candidate;
 const images=[];
 for(const [i,file]of [[3,'empty-platform.webp'],[4,'spaceship-window.webp'],[5,'submerged-city.webp']]){const image=await loadImage(directory+'/dist/assets/'+file);Object.defineProperty(image,'naturalWidth',{value:image.width});Object.defineProperty(image,'naturalHeight',{value:image.height});images.push([i,image]);}
 let frames=0,maxChannelDifference=0,maxBrightness=0,minAlpha=255;
 for(const [w,h]of [[195,422],[422,195],[480,300]]){
  const original=boot(baseline,w,h,images),patched=boot(candidate,w,h,images);
  for(const style of patched.test.transitionNames)for(const progress of [0,.2,.4,.5,.6,.8,.999]){
   original.test.render(progress,style);patched.test.render(progress,style);
   const a=original.canvas.getContext('2d').getImageData(0,0,w,h).data,b=patched.canvas.getContext('2d').getImageData(0,0,w,h).data;
   for(let i=0;i<b.length;i+=4){minAlpha=Math.min(minAlpha,b[i+3]);for(let c=0;c<3;c++){maxChannelDifference=Math.max(maxChannelDifference,Math.abs(a[i+c]-b[i+c]));maxBrightness=Math.max(maxBrightness,b[i+c]);}}
   frames++;
  }
 }
 assert.equal(minAlpha,255);assert.ok(maxChannelDifference<=2, 'opaque backing preserves actual image composition');assert.ok(maxBrightness<220,'no white canvas sample');
 console.log(JSON.stringify({NATIVE_CANVAS_NOT_BROWSER:true,baselineCompared:!!process.argv[2],frames,transitionFamilies:15,viewports:3,minAlpha,maxBrightness,maxChannelDifference}));
})().catch(e=>{console.error(e);process.exitCode=1});
