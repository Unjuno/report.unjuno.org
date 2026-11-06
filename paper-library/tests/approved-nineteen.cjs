'use strict';
const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const crypto=require('node:crypto'),manifest=JSON.parse(fs.readFileSync('content/selected-home-stills.json','utf8'));
const source=fs.readFileSync('dist/assets/cinema-field.js','utf8');
const approved=JSON.parse(fs.readFileSync('content/approved-nineteen.json'));
assert.equal(approved.added.length,15);
assert.ok(!source.includes('selected-fern-cyanotype-v1.webp'));
for(const item of approved.added){
 const bytes=fs.readFileSync('dist/assets/'+item.name);
 assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),item.sha256);
 assert.equal(bytes.length,item.bytes);
 assert.equal(bytes.readUInt16LE(26)&0x3fff,item.dimensions[0]);
 assert.equal(bytes.readUInt16LE(28)&0x3fff,item.dimensions[1]);
 assert.equal(require('./scene-registry.cjs')().assets.filter(name=>name===item.name).length,1,'one runtime registration per image');
}
function run({failNew=false,reduced=false,initialOnly=false,width=1200,height=800}={}){
 let next,draws=[],alpha=1;const listeners={},gradient={addColorStop(){}};
 const ctx=new Proxy({createLinearGradient:()=>gradient,drawImage(...args){if(!args[0].url)return;draws.push({args,alpha:this.globalAlpha})},fillText(){throw Error('text in background')}},{get:(o,k)=>o[k]||(()=>{})});
 const canvas={setAttribute(){},getContext:()=>ctx,remove(){}};
 const context={setTimeout:()=>1,clearTimeout(){},window:{},document:{hidden:false,body:{prepend(){},classList:{contains:()=>false}},createElement:()=>canvas,querySelectorAll:()=>[],querySelector:()=>({}),addEventListener(){}},Image:class{constructor(){this.complete=false;}set src(x){if(!x)return;this.url=x;const fresh=x.includes('quiet-media');if(/selected-/.test(x)&&failNew){this.onerror();return;}const newer=/forest-library|living-gallery|garden-conservatory|ocean-corridor|forest-theater|city-reflection|model-city|anime-forest-fieldwork-v2|anime-mountain-archive-v2/.test(x);this.naturalWidth=x.includes('selected-api-')?2048:fresh?2172:newer?1536:1672;this.naturalHeight=x.includes('selected-api-')?1152:fresh?724:newer?1024:941;this.onload();}},matchMedia:()=>({matches:reduced,addEventListener(){}}),scrollY:0,innerWidth:width,innerHeight:height,devicePixelRatio:1,requestAnimationFrame(fn){next=fn;return 1},cancelAnimationFrame(){},addEventListener:(n,f)=>listeners[n]=f,MutationObserver:class{observe(){}}};
 vm.runInNewContext(source,context);
 if(reduced){assert.equal(next,undefined);const phase=context.window.__reportFlow.phase;context.scrollY=1000;listeners.scroll();assert.equal(context.window.__reportFlow.phase,phase);}
 else if(!initialOnly)for(let i=0;i<Math.ceil(require('./scene-registry.cjs')().reelSeconds/1.2*10)+100;i++)next(i*100);
 return draws;
}

for(const [width,height] of [[1280,844],[390,844]]){
 const draws=run({width,height});
 for(const [name,focus] of approved.added.map(i=>[i.name,i.focus])){
  const own=draws.filter(d=>d.args[0].url.includes(name));assert.ok(own.length>0);assert.ok(own.some(d=>d.alpha>0&&d.alpha<1));
  for(const {args:a} of own){const old=true,iw=2048,ih=1152;assert.equal(a[3],iw);assert.equal(a[4],ih);assert.ok(a[7]>=width&&a[8]>=height);assert.ok(Math.abs(a[7]/a[8]-iw/ih)<1e-9);const expected=(width-a[7])*(width<650?focus:.5);assert.ok(Math.abs(a[5]-expected)<=width*.012+.001)}
 }
}
const initial=run({initialOnly:true});assert.ok(initial.length>0);assert.ok(new Set(initial.map(d=>d.args[0].url)).size<=2,'random opening still draws at most two source images');
const fallback=run({failNew:true});assert.ok(fallback.length);assert.ok(fallback.every(d=>!/selected-/.test(d.args[0].url)));
assert.ok(run({reduced:true}).length>0,'reduced motion retains a single randomized opening image');
console.log('PASS fifteen added images: hashes, dimensions, unique references, cover/focal/crossfade at desktop/mobile, fallback and reduced motion.');
