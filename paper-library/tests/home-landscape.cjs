const fs=require('fs'),vm=require('vm'),assert=require('assert');
let img,draws=0;const calls=[];
const ctx=new Proxy({drawImage(...args){draws++;calls.push(args)},createLinearGradient(){return{addColorStop(){}}}},{get(t,k){return k in t?t[k]:(()=>{})}});
const canvas=()=>({getContext:()=>ctx});
class Image{constructor(){img=this;this.naturalWidth=1536;this.naturalHeight=1024}set src(v){assert.equal(v,'/assets/river-city-dawn.webp')}}
const env={window:{},document:{createElement:canvas},Image};vm.runInNewContext(fs.readFileSync('dist/assets/home-landscape.js','utf8'),env);
const {create,crop,VIEWS}=env.window.ResearchReality;
for(const [w,h] of [[1080,520],[343,540],[280,800]])for(const v of [...VIEWS,{...VIEWS[0],zoom:.996}])for(const p of [-1,0,1]){const c=crop(1536,1024,w,h,v,p);assert(c.sx>=0&&c.sy>=0&&c.sx+c.sw<=1536.001&&c.sy+c.sh<=1024.001);assert(Math.abs(c.sw/c.sh-w/h)<1e-8)}
let ready=0;const out=canvas(),r=create(out,()=>ready++);r.resize(1080,520,3);assert.equal(out.width,2160);img.onload();assert.equal(ready,1);
const crops=[];for(let mode=0;mode<3;mode++){calls.length=0;r.draw(0,mode,0,0,0,false);crops.push(calls[0].slice(1,5).join(','));assert.equal(calls.length,2,'paused uses image and composite only')}
assert.equal(new Set(crops).size,3);r.draw(.2,0);r.draw(.3,2);r.draw(.8,2);r.setBoundary(-999);r.draw(1,1);r.setBoundary(999);r.draw(2,0);img.onerror();assert(r.failed);r.draw(3,0);
const bad=create({getContext:()=>null});assert(bad.failed);assert.equal(bad.draw().length,6);
ctx.drawImage=()=>{throw Error('image unavailable')};const fail=create(canvas());img.onload();fail.draw(0,0);assert(fail.failed);
console.log('PASS generated landscape crop bounds/aspect, three views, paused immediate change, interruption, pan, DPR cap and image/canvas failure. Mock only.');
