'use strict';
const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const source=fs.readFileSync('dist/assets/cinema-field.js','utf8');
function run({failNew=false,reduced=false,width=1200,height=800}={}){
 let next,draws=[],alpha=1;const listeners={},gradient={addColorStop(){}};
 const ctx=new Proxy({createLinearGradient:()=>gradient,drawImage(...args){draws.push({args,alpha:this.globalAlpha})},fillText(){throw Error('text in background')}},{get:(o,k)=>o[k]||(()=>{})});
 const canvas={setAttribute(){},getContext:()=>ctx,remove(){}};
 const context={setTimeout:()=>1,clearTimeout(){},window:{},document:{hidden:false,body:{prepend(){},classList:{contains:()=>false}},createElement:()=>canvas,querySelectorAll:()=>[],querySelector:()=>({}),addEventListener(){}},Image:class{constructor(){this.complete=false;}set src(x){this.url=x;const fresh=x.includes('quiet-media');if(fresh&&failNew){this.onerror();return;}this.naturalWidth=fresh?2172:1254;this.naturalHeight=fresh?724:1254;this.onload();}},matchMedia:()=>({matches:reduced,addEventListener(){}}),scrollY:0,innerWidth:width,innerHeight:height,devicePixelRatio:1,requestAnimationFrame(fn){next=fn;return 1},cancelAnimationFrame(){},addEventListener:(n,f)=>listeners[n]=f,MutationObserver:class{observe(){}}};
 vm.runInNewContext(source,context);
 if(reduced){assert.equal(next,undefined);const phase=context.window.__reportFlow.phase;context.scrollY=1000;listeners.scroll();assert.equal(context.window.__reportFlow.phase,phase);}
 else for(let i=0;i<4200;i++)next(i*100);
 return draws;
}
for(const [width,height] of [[1200,800],[390,844]]){
 const draws=run({width,height}),fresh=draws.filter(d=>d.args[0].url.includes('quiet-media'));
 assert.equal(new Set(fresh.map(d=>d.args.slice(1,3).join(','))).size,6);
 for(const {args:a} of fresh){assert.equal(a[3],722);assert.equal(a[4],360);assert.ok(a[1]>=1&&a[1]+a[3]<2172&&a[2]>=1&&a[2]+a[4]<724);assert.ok(a[7]>=width&&a[8]>=height);assert.ok(Math.abs(a[7]/a[8]-722/360)<1e-9)}
 assert.ok(fresh.some(d=>d.alpha>0&&d.alpha<1),'new scenes crossfade');
}
const fallback=run({failNew:true});assert.ok(fallback.length>0);assert.ok(fallback.every(d=>!d.args[0].url.includes('quiet-media')));
assert.ok(run({reduced:true}).some(d=>d.args[0].url.includes('empty-platform')),'reduced motion still renders new static scene');
console.log('PASS 6 rectangular atlas scenes: desktop/mobile crop bounds, cover/aspect ratio, crossfade, new-asset failure fallback, reduced-motion static rendering. Mock, not visual browser QA.');
