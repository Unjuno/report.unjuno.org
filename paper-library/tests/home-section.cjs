const fs=require('fs'),path=require('path'),assert=require('assert'),base=path.resolve(__dirname,'..');
let setup=fs.readFileSync(base+'/tests/home-surface.cjs','utf8');setup=setup.slice(0,setup.indexOf('const surface=api.create(canvas)'));setup+='return {api,canvas,calls,buffers,uniforms,gl};';
const {api,canvas,calls,buffers,uniforms,gl}=new Function('require','__dirname',setup)(require,base+'/tests');
const renderer=api.create(canvas);renderer.resize(1080,504,2,false);const allocations=buffers.length;
for(let i=0;i<6;i++){
 const curve=api.section(i);assert.equal(curve.length,49);assert.equal(curve[0].u,api.locationU(i));assert.deepEqual(curve[0].point,api.surface(api.locationU(i),0));
 assert(Math.hypot(...curve[0].point.map((x,k)=>x-curve[48].point[k]))<1e-10);
 for(let j=0;j<49;j++)for(let k=0;k<3;k++)assert(Math.abs(buffers[0][(3025+i*49+j)*3+k]-curve[j].point[k])<1e-6,'GPU section vertices evaluate the same surface');
 const n=calls.length;renderer.draw(0,1,5,1,i);assert.equal(calls.length,n+2);assert.equal(calls.at(-1)[1],96);assert.equal(uniforms.wire,2);
 assert(renderer.sectionLabel(i).includes(api.locationU(i).toFixed(3)));
 renderer.setView(.35,-.18);const projected=renderer.draw(2,2,0,1,i);assert.equal(projected.length,6);
}
let n=calls.length;renderer.draw(0,0,0,0,0);assert.equal(calls.length,n+1,'material has no section pass');
n=calls.length;renderer.draw(0,1,0,1,-1);assert.equal(calls.length,n+1,'empty selection has no section');assert.equal(renderer.sectionLabel(-1),'');
assert.equal(buffers.length,allocations,'no per-frame GPU buffers');
let harness=fs.readFileSync(base+'/tests/home-renderer-loss.cjs','utf8');harness=harness.slice(0,harness.indexOf("ids['equation-view'].events.click();"));
harness=harness.replace('let lost=false,onLoss;','let lost=false,onLoss;const sectionCalls=[];');harness=harness.replace('draw(){return lost?', 'sectionLabel(index){return index>=0?"SECTION "+index:"";},draw(...args){sectionCalls.push(args[4]);return lost?');harness+='return {ids,nodes,sectionCalls,frames};';
const a=new Function('require','__dirname',harness)(require,base+'/tests');a.ids['motion-toggle'].events.click();a.ids['equation-view'].events.click();assert(a.ids['geometry-equation'].textContent.includes('SECTION 0'));
a.nodes[2].events.click();assert.equal(a.sectionCalls.at(-1),2);assert(a.ids['geometry-equation'].textContent.includes('SECTION 2'));
a.nodes[1].events.pointerenter({pointerType:'mouse'});assert.equal(a.sectionCalls.at(-1),2,'hover never changes confirmed section');assert(a.ids['geometry-equation'].textContent.includes('SECTION 2'));
a.ids['paper-search'].value='no-match';a.ids['paper-search'].events.input();assert.equal(a.sectionCalls.at(-1),-1);assert(!a.ids['geometry-equation'].textContent.includes('SECTION'));
assert.equal(a.frames.size,0,'paused section selection adds no RAF');
console.log('PASS exact selected sections, closed curves, GPU vertex equivalence, shared projection/depth pipeline, material/empty exclusion, stable buffers, confirmed selection and paused state');
