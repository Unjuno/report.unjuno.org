'use strict';
const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const crypto=require('node:crypto'),manifest=JSON.parse(fs.readFileSync('content/webp-three-trial.json','utf8'));
const source=fs.readFileSync('dist/assets/cinema-field.js','utf8');
let optimizedBytes=0;
for(const item of manifest.assets){
 const image=fs.readFileSync('dist/assets/'+item.name);
 assert.equal(crypto.createHash('sha256').update(image).digest('hex'),item.sha256);
 assert.equal(image.length,item.bytes);
 assert.equal(image.toString('ascii',0,4),'RIFF');assert.equal(image.toString('ascii',8,16),'WEBPVP8 ');
 assert.equal(image.readUInt16LE(26)&0x3fff,1672);assert.equal(image.readUInt16LE(28)&0x3fff,941);
 assert.ok(source.includes(item.name));optimizedBytes+=image.length;
}
assert.equal(manifest.assets.length,3);assert.equal(optimizedBytes,1071498);
function run({failNew=false,reduced=false,initialOnly=false,width=1200,height=800}={}){
 let next,draws=[],alpha=1;const listeners={},gradient={addColorStop(){}};
 const ctx=new Proxy({createLinearGradient:()=>gradient,drawImage(...args){if(!args[0].url)return;draws.push({args,alpha:this.globalAlpha})},fillText(){throw Error('text in background')}},{get:(o,k)=>o[k]||(()=>{})});
 const canvas={setAttribute(){},getContext:()=>ctx,remove(){}};
 const context={setTimeout:()=>1,clearTimeout(){},window:{},document:{hidden:false,body:{prepend(){},classList:{contains:()=>false}},createElement:()=>canvas,querySelectorAll:()=>[],querySelector:()=>({}),addEventListener(){}},Image:class{constructor(){this.complete=false;}set src(x){if(!x)return;this.url=x;const fresh=x.includes('quiet-media');if(/selected-/.test(x)&&failNew){this.onerror();return;}const newer=/forest-library|living-gallery|garden-conservatory|ocean-corridor|forest-theater|city-reflection|model-city|anime-forest-fieldwork-v2|anime-mountain-archive-v2/.test(x);this.naturalWidth=fresh?2172:newer?1536:1672;this.naturalHeight=fresh?724:newer?1024:941;this.onload();}},matchMedia:()=>({matches:reduced,addEventListener(){}}),scrollY:0,innerWidth:width,innerHeight:height,devicePixelRatio:1,requestAnimationFrame(fn){next=fn;return 1},cancelAnimationFrame(){},addEventListener:(n,f)=>listeners[n]=f,MutationObserver:class{observe(){}}};
 vm.runInNewContext(source,context);
 if(reduced){assert.equal(next,undefined);const phase=context.window.__reportFlow.phase;context.scrollY=1000;listeners.scroll();assert.equal(context.window.__reportFlow.phase,phase);}
 else if(!initialOnly)for(let i=0;i<4200;i++)next(i*100);
 return draws;
}

for(const [width,height] of [[1280,844],[390,844]]){
 const draws=run({width,height});
 for(const [name,focus] of [['selected-unconformity-q92',.6],['selected-moon-q92',.92],['selected-culture-q92',.5]]){
  const own=draws.filter(d=>d.args[0].url.includes(name));assert.ok(own.length>0);assert.ok(own.some(d=>d.alpha>0&&d.alpha<1));
  for(const {args:a} of own){const old=true,iw=old?1672:1536,ih=old?941:1024;assert.equal(a[3],iw);assert.equal(a[4],ih);assert.ok(a[7]>=width&&a[8]>=height);assert.ok(Math.abs(a[7]/a[8]-iw/ih)<1e-9);const expected=(width-a[7])*(width<650?focus:.5);assert.ok(Math.abs(a[5]-expected)<=width*.012+.001)}
 }
}
const initial=run({initialOnly:true});assert.ok(initial.length>0);assert.ok(initial.every(d=>!/cinema-atlas|river-city|selected-unconformity|selected-moon|selected-culture/.test(d.args[0].url)),'later legacy assets not loaded upfront');
const fallback=run({failNew:true});assert.ok(fallback.length);assert.ok(fallback.every(d=>!/selected-/.test(d.args[0].url)));
assert.ok(run({reduced:true}).some(d=>d.args[0].url.includes('empty-platform')));
console.log('PASS three WebP trials:',JSON.stringify({optimizedBytes}),'cover, mobile focal points, crossfade, deferred loading, failure fallback and reduced motion. File checks and mock, not browser QA.');
