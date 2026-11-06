// Native Canvas pixel checks need @napi-rs/canvas. They do not exercise a browser compositor.
'use strict';
const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict'),{createCanvas,loadImage}=require('@napi-rs/canvas');
const directory=process.cwd();
function boot(source,w,h,images){
 const canvases=[];
 function create(){const x=createCanvas(1,1);x.setAttribute=()=>{};x.remove=()=>{};x.events={};x.addEventListener=(name,fn)=>x.events[name]=fn;canvases.push(x);return x;}
 const math=Object.create(Math);math.random=()=>.12345;
 const env={Math:math,window:{},document:{hidden:false,body:{prepend(){},classList:{contains:()=>false}},createElement:create,querySelectorAll:()=>[],querySelector:()=>null,addEventListener(){}},Image:class{constructor(){this.naturalWidth=0;this.complete=false;}},matchMedia:()=>({matches:true,addEventListener(){}}),innerWidth:w,innerHeight:h,devicePixelRatio:1,scrollY:0,requestAnimationFrame:()=>1,cancelAnimationFrame(){},setTimeout:()=>1,clearTimeout(){},addEventListener(){},MutationObserver:class{observe(){}}};
 const injected=source.replace('// Fetch the visible image first;',`window.check={assets,render(progress,style){phase=sceneTime(0).seconds*progress;pairStep=0;pairPrevious={asset:3,transition:style};pairA={asset:4,transition:style};pairB={asset:5,transition:style};paint();},transitionNames};\n// Fetch the visible image first;`);
 vm.runInNewContext(injected,env);const t=env.window.check;
 for(const [i,image]of images){t.assets[i].image=image;t.assets[i].ready=true;t.assets[i].requested=true;}
 return{canvas:canvases[0],canvases,test:t};
}

(async()=>{
 const source=fs.readFileSync('dist/assets/cinema-field.js','utf8');const images=[];
 for(const [i,file]of [[3,'empty-platform.webp'],[4,'spaceship-window.webp'],[5,'submerged-city.webp']]){const image=await loadImage('dist/assets/'+file);Object.defineProperty(image,'naturalWidth',{value:image.width});Object.defineProperty(image,'naturalHeight',{value:image.height});images.push([i,image]);}
 let cases=0,maxChannelDifference=0,minAlpha=255;
 for(const style of ['mist','particles','light-bloom','chromatic-veil']){
  const run=boot(source,195,422,images);run.test.render(.2,style);
  const reference=run.canvas.getContext('2d').getImageData(0,0,195,422).data;
  for(const i of [0,1,2,4]){
   const target=run.canvases[i];assert.equal(typeof target.events.contextlost,'function');assert.equal(typeof target.events.contextrestored,'function');
   target.events.contextlost({preventDefault(){throw Error('2D automatic restoration canceled');}});
   // A native bitmap reset models the blank store returned on restoration.
   target.width=target.width;
   target.events.contextrestored({});
   const b=run.canvas.getContext('2d').getImageData(0,0,195,422).data;
   for(let p=0;p<b.length;p+=4){minAlpha=Math.min(minAlpha,b[p+3]);for(let c=0;c<3;c++)maxChannelDifference=Math.max(maxChannelDifference,Math.abs(reference[p+c]-b[p+c]));}
   cases++;
  }
 }
 assert.equal(minAlpha,255);assert.equal(maxChannelDifference,0,'paused main/mask/cloud restoration rebuilds the exact frame');
 console.log(JSON.stringify({NATIVE_CANVAS_NOT_BROWSER:true,paused:true,restorationCases:cases,canvases:['main','reveal','mist','cloud'],minAlpha,maxChannelDifference}));
})().catch(e=>{console.error(e);process.exitCode=1});
