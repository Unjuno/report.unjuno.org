'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('dist/assets/cinema-field.js','utf8');
function run(fail){
 const requests=[],pending=[],frames=new Map();let id=0,strokes=0;
 const c=new Proxy({createLinearGradient:()=>({addColorStop(){}}),stroke(){strokes++}},{get:(o,k)=>o[k]||(()=>{})});
 const ctx={setTimeout:()=>1,clearTimeout(){},window:{},document:{hidden:false,body:{prepend(){},classList:{contains:()=>false}},createElement:()=>({setAttribute(){},getContext:()=>c,remove(){}}),querySelectorAll:()=>[],querySelector:()=>({}),addEventListener(){}},Image:class{constructor(){this.complete=false;}set src(url){if(!url)return;this.url=url;requests.push(url);pending.push(()=>{if(fail(url))this.onerror();else{this.naturalWidth=1536;this.naturalHeight=1024;this.onload();}})}},matchMedia:()=>({matches:false,addEventListener(){}}),scrollY:0,innerWidth:390,innerHeight:844,devicePixelRatio:1,requestAnimationFrame(fn){frames.set(++id,fn);return id},cancelAnimationFrame(id){frames.delete(id)},addEventListener(){},MutationObserver:class{observe(){}}};
 vm.runInNewContext(source,ctx);
 const initial=[...requests];let guard=0;while(pending.length){assert.ok(++guard<=35,'bounded recovery');pending.shift()();}
 const before=ctx.window.__reportFlow.phase;for(let i=0;i<20;i++){const f=[...frames.values()];frames.clear();for(const cb of f)cb(i*100);while(pending.length)pending.shift()();}
 assert.equal(new Set(requests).size,requests.length,'no failed asset retried');
 return {initial,requests,frames,flow:ctx.window.__reportFlow,before,strokes};
}
const first=/empty-platform|spaceship-window|submerged-city|anime-forest-fieldwork-v2|quiet-media|art-/;
let result=run(url=>first.test(url));assert.equal(result.initial.length,2);assert.ok(result.requests.some(url=>url.includes('books-vault')));assert.ok(result.flow.loaded>0);assert.ok(result.flow.phase>result.before,'recovers time progression');
result=run(()=>true);assert.equal(result.requests.length,35,'all finite assets tried exactly once');assert.equal(result.flow.loaded,0);assert.equal(result.frames.size,0,'all failures stop scheduling');assert.ok(result.strokes>0,'static geometry remains safe');
result=run(()=>false);assert.equal(result.requests.length,4,'normal initial batch stays bounded');
console.log('PASS async initial failures recover to later image and resume; all 35 failures tried once and safely stop; normal initial fetch is 2 concurrent requests with 4 assets ahead.');
