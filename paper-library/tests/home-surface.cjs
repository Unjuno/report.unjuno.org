const fs=require('fs'),vm=require('vm'),assert=require('assert');
const context={window:{}};
vm.runInNewContext(fs.readFileSync(require('path').join(__dirname,'../dist/assets/home-surface.js'),'utf8'),context);
const api=context.window.ResearchSurface,TAU=Math.PI*2;
for(let i=0;i<121;i++)for(let j=0;j<25;j++){
 const u=i/120*TAU,v=j/24*TAU,p=api.surface(u,v),n=api.normal(u,v);
 assert(p.every(Number.isFinite));assert(n.every(Number.isFinite));assert(Math.abs(Math.hypot(...n)-1)<1e-8);
 const r=1+.36*Math.cos(v)*Math.cos(u/2)-.035*Math.sin(v)*Math.sin(u/2);
 assert(Math.abs(p[0]-r*Math.cos(u))<1e-12);assert(Math.abs(p[1]-r*Math.sin(u))<1e-12);
 assert(Math.abs(p[2]-(.36*Math.cos(v)*Math.sin(u/2)+.035*Math.sin(v)*Math.cos(u/2)))<1e-12);
}
for(let j=0;j<25;j++){
 const a=api.surface(0,j/24*TAU),b=api.surface(TAU,j/24*TAU+Math.PI);
 assert(Math.hypot(...a.map((x,i)=>x-b[i]))<1e-8,'twisted closed cross-section seam');
}
let calls=[],buffers=[];const events={},uniforms={};
const gl=new Proxy({COMPILE_STATUS:1,LINK_STATUS:2,TRIANGLES:4,LINES:1,FLOAT:5126,UNSIGNED_SHORT:5123,getShaderParameter(){return true},getProgramParameter(){return true},getAttribLocation(){return 0},getUniformLocation(program,name){return name},uniform2f(name,a,b){uniforms[name]=[a,b]},uniform1f(name,a){uniforms[name]=a},uniformMatrix3fv(name,transpose,matrix){uniforms[name]=matrix},isContextLost(){return false},bufferData(target,data){buffers.push(data)},drawElements(...a){calls.push(a)}},{get(t,k){return k in t?t[k]:(()=>({}))}});
const canvas={width:0,height:0,getContext(){return gl},addEventListener(k,f){events[k]=f}};
const surface=api.create(canvas);assert(surface);surface.resize(1080,568,2,false);
const points=surface.draw(0,0);assert.equal(points.length,6);assert(points.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)));assert(points[0].front,'default selection is front-facing');assert.equal(calls.at(-1)[0],gl.TRIANGLES);
assert(buffers.every(buffer=>Array.from(buffer).every(Number.isFinite)));
surface.draw(0,1);assert.equal(calls.at(-1)[0],gl.LINES);assert(surface.equation.includes('0.035'));
const beforeRevealCalls=calls.length,beforeRevealBuffers=buffers.length;assert.deepEqual(surface.draw(0,1,0,.5),points,'UV reveal keeps the same projected locations');assert.equal(uniforms.reveal,.5);assert.equal(calls.length,beforeRevealCalls+2);assert.deepEqual(calls.slice(-2).map(call=>call[0]),[gl.TRIANGLES,gl.LINES]);assert.equal(buffers.length,beforeRevealBuffers,'reveal reuses the same static mesh buffers');

surface.resize(343,900,2,true);const narrow=surface.draw(0,0);surface.resize(343,574,2,true);assert.deepEqual(surface.draw(0,0),narrow,'mobile projection independent of reading height');
for(const viewportHeight of [504,568]){surface.resize(1080,viewportHeight,2,false);
for(let t=0;t<=500;t+=5){surface.draw(t,0);for(let i=0;i<=120;i++)for(let j=0;j<=24;j++){
 const p=api.transformed(api.surface(i/120*TAU,j/24*TAU),uniforms.rotation),scale=uniforms.scale*4.5/(4.5-p[2]);
 const x=uniforms.center[0]+p[0]*scale,y=uniforms.center[1]-p[1]*scale;
 assert(y>15&&y<viewportHeight,'whole mesh stays within world, before separate controls');assert(x>1080*.49&&x<1080,'whole mesh stays out of title lane and within viewport');
}}
}
for(const w of [320,343,390,570]){surface.resize(w,900,2,true);for(let t=0;t<=500;t+=.5){for(const p of surface.draw(t,0)){assert(p.y-24>110,'location stays below headline');assert(p.y+24<280,'location stays above scene controls');assert(p.x-24>=0&&p.x+24<=w,'touch target stays within narrow screen');}}}
surface.resize(343,900,2,true);
for(let time=0;time<=500;time+=5){surface.draw(time,0);for(let i=0;i<=120;i++)for(let j=0;j<=24;j++){
 const p=api.transformed(api.surface(i/120*TAU,j/24*TAU),uniforms.rotation),y=uniforms.center[1]-p[1]*uniforms.scale*4.5/(4.5-p[2]);
 assert(y>110&&y<264,'entire mobile mesh stays between headline and reading lane with margin');
}}
// Actual view uniforms must retain safe bounds while pointer/keyboard orientation changes.
for(const [w,h,mobile] of [[343,900,true],[586,504,false],[1080,504,false],[1080,900,false]]){
 surface.resize(w,h,2,mobile);
 for(const yaw of [-.35,0,.35])for(const pitch of [-.18,0,.18])for(const time of [0,Math.PI/2/.13,Math.PI*1.5/.13]){
  surface.setView(yaw,pitch);const locations=surface.draw(time,0);
  assert.deepEqual(surface.draw(time,1),locations,'material and structure preserve pose and locations');
  for(const point of locations){assert(point.x-24>=0&&point.x+24<=w);assert(point.y-24>(mobile?110:0)&&point.y+24<(mobile?264:h));}
  for(let i=0;i<=120;i++)for(let j=0;j<=24;j++){
   const p=api.transformed(api.surface(i/120*TAU,j/24*TAU),uniforms.rotation),perspective=uniforms.scale*4.5/(4.5-p[2]);
   const x=uniforms.center[0]+p[0]*perspective,y=uniforms.center[1]-p[1]*perspective;
   assert(x>(mobile?0:w*.49)&&x<w);assert(y>(mobile?110:0)&&y<(mobile?264:h));
  }
 }
}
let facingChecks=0;
for(let iy=0;iy<=14;iy++)for(let ip=0;ip<=18;ip++)for(const time of [0,Math.PI/2/.13,3*Math.PI/2/.13]){
 const yaw=-.35+iy*.05,pitch=-.18+ip*.02;surface.setView(yaw,pitch);const projected=surface.draw(time,0);
 for(let i=0;i<6;i++){
  const u=((i+2.24)%6)/6*TAU,p=api.transformed(api.surface(u,0),uniforms.rotation),n=api.transformed(api.normal(u,0),uniforms.rotation);
  const cameraDot=-p[0]*n[0]-p[1]*n[1]+(4.5-p[2])*n[2];
  assert.equal(projected[i].front,cameraDot>=0,'location facing agrees with the shader perspective camera');facingChecks++;
 }
}
assert.equal(facingChecks,5130);
console.log('PASS 5130 perspective-facing cases (orientation only, not occlusion)');
surface.setView(0,0);
events.webglcontextlost();assert.equal(surface.draw(0,0),null,'context loss requests 2D fallback');assert.equal(api.create({getContext(){return null}}),null);
console.log('PASS 3025 finite surface/normals, exact equation, seam, 6 projected locations, solid/wire draws, mobile bounds and context-loss fallback');
