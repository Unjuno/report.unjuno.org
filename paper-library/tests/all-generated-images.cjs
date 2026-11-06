'use strict';
const fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const manifest=JSON.parse(fs.readFileSync('content/all-generated-images.json'));const registry=require('./scene-registry.cjs')();
assert.equal(manifest.added.length,70);assert.equal(registry.assets.length,130);assert.equal(registry.scenes.length,146);
assert.equal(new Set(registry.assets).size,registry.assets.length,'one asset registration per file');
const added=new Set(manifest.added.map(x=>x.name));const generated=registry.assets.filter(n=>n.startsWith('selected-'));
assert.equal(generated.length,100);assert.ok(!registry.assets.includes(manifest.excluded));
for(const name of generated)assert.equal(registry.scenes.filter(s=>s.name===name).length,1,'one scene per generated image: '+name);
assert.deepEqual(JSON.parse(JSON.stringify(registry.scenes.filter(s=>!added.has(s.name)))),manifest.preservedScenes);
assert.deepEqual(Array.from(registry.scenes.slice(0,4),x=>x.name),manifest.preservedScenes.slice(0,4).map(x=>x.name),'initial loading order unchanged');
assert.equal(new Set(manifest.added.map(x=>x.source_sha256)).size,70);
for(const item of manifest.added){const b=fs.readFileSync('dist/assets/'+item.name);assert.equal(b.length,item.bytes);assert.equal(crypto.createHash('sha256').update(b).digest('hex'),item.sha256);assert.ok(item.focus>=0&&item.focus<=1);assert.equal(registry.scenes.find(s=>s.name===item.name).focus,item.focus);}
const source=fs.readFileSync('dist/assets/cinema-field.js','utf8'),byName=new Map(manifest.added.map(x=>[x.name,x]));
function verifyDraws(width,height){let next;const seen=new Set(),blended=new Set();
 const ctx=new Proxy({createLinearGradient:()=>({addColorStop(){}}),drawImage(...args){const image=args[0],name=image.url?.split('/').pop(),item=byName.get(name);if(!item)return;seen.add(name);if(this.globalAlpha>0&&this.globalAlpha<1)blended.add(name);assert.equal(args[3],item.dimensions[0]);assert.equal(args[4],item.dimensions[1]);assert.ok(args[7]>=width&&args[8]>=height);assert.ok(Math.abs(args[7]/args[8]-args[3]/args[4])<1e-9);const expected=(width-args[7])*(width<650?item.focus:.5);assert.ok(Math.abs(args[5]-expected)<=width*.012+.001);}}, {get:(o,k)=>o[k]||(()=>{})});
 const env={window:{},document:{hidden:false,body:{prepend(){},classList:{contains:()=>false}},createElement:()=>({setAttribute(){},getContext:()=>ctx,remove(){}}),querySelectorAll:()=>[],querySelector:()=>({}),addEventListener(){}},Image:class{constructor(){this.complete=false;}set src(url){if(!url)return;this.url=url;const item=byName.get(url.split('/').pop());[this.naturalWidth,this.naturalHeight]=item?.dimensions||[1672,941];this.onload();}},matchMedia:()=>({matches:false,addEventListener(){}}),scrollY:0,innerWidth:width,innerHeight:height,devicePixelRatio:1,requestAnimationFrame(fn){next=fn;return 1},cancelAnimationFrame(){},addEventListener(){},setTimeout:()=>1,clearTimeout(){},MutationObserver:class{observe(){}}};
 vm.runInNewContext(source,env);for(let i=0;i<Math.ceil(registry.reelSeconds/1.2*10)+100;i++)next(i*100);assert.equal(seen.size,70);assert.equal(blended.size,70);
}
verifyDraws(1280,844);verifyDraws(390,844);
console.log('PASS complete generated collection: 100 unique images, 70 additions, no white fern, prior 76 scenes retained in order, all hashes and desktop/mobile cover/focus/crossfade paths. Mock, not real-device acceptance.');
