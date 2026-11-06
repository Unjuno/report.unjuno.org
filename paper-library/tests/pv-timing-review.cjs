'use strict';
const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const ctx=new Proxy({createLinearGradient:()=>({addColorStop(){}})},{get:(o,k)=>o[k]||(()=>{})});
const env={window:{},document:{hidden:false,body:{prepend(){},classList:{contains:()=>false}},createElement:()=>({setAttribute(){},getContext:()=>ctx,remove(){}}),querySelectorAll:()=>[],querySelector:()=>null,addEventListener(){}},Image:class{},matchMedia:()=>({matches:true,addEventListener(){}}),innerWidth:390,innerHeight:844,devicePixelRatio:1,scrollY:0,setTimeout:()=>1,clearTimeout(){},requestAnimationFrame(){},cancelAnimationFrame(){},addEventListener(){},MutationObserver:class{observe(){}}};
const source=fs.readFileSync('dist/assets/cinema-field.js','utf8').replace('// Fetch the visible image first;', 'window.test={sceneTime,sceneBeats,sceneStarts,sequenceFor,reelSeconds,scenes,smooth,weights,assets};\n// Fetch the visible image first;');
vm.runInNewContext(source,env);const t=env.window.test;
// 45 scenes plus acoustics-hall (953bccf) and five reviewed stills (c278390).
const sceneCount=require('./scene-registry.cjs')().scenes.length;
assert.equal(t.scenes.length,sceneCount,'all authored scenes retained');
assert.equal(new Set(t.sceneBeats.map(b=>b.seconds)).size,6,'six intentional durations rather than uniform cuts');
assert.ok(t.sceneBeats.every(b=>b.seconds>=4.8&&b.seconds<=11.5));
for(let lap=0;lap<3;lap++)for(let i=0;i<t.scenes.length;i++){
 const sequence=t.sequenceFor(lap),sourceIndex=sequence.order[i],start=lap*t.reelSeconds+sequence.starts[i],d=t.sceneBeats[sourceIndex].seconds;
 const mid=t.sceneTime(start+d/2);assert.equal(mid.step,lap*sceneCount+i);assert.ok(Math.abs(mid.progress-.5)<1e-10);
 const before=t.sceneTime(start+d-1e-6),after=t.sceneTime(start+d+1e-6);
 assert.equal(before.step,lap*sceneCount+i);assert.equal(after.step,lap*sceneCount+i+1,'scene handover and reel wrap never skip');
 assert.ok(before.progress>.99999&&after.progress<.00001);
 // Durations vary: easing keeps opacity velocity at both ends at zero.
 const e=1e-4,left=(1-t.smooth(1-e/d))/e,right=t.smooth(e/after.seconds)/e;
 assert.ok(Math.abs(left-right)<.00002,'duration changes cannot create a blend-velocity jump');
 const endWeights=t.weights(1),startWeights=t.weights(0),leftWeights=t.weights(1-e/d),rightWeights=t.weights(e/after.seconds);
 assert.ok(Math.abs((endWeights[1]-leftWeights[1])/e-(rightWeights[0]-startWeights[0])/e)<.0001,'actual A weights retain matching boundary velocity across B durations');
 assert.ok(Math.abs((endWeights[2]-leftWeights[2])/e-(rightWeights[1]-startWeights[1])/e)<.0001,'incoming actual A weights retain matching boundary velocity');
 for(const p of [.4,.5,.6])assert.equal(t.weights(t.sceneTime(start+d*p).progress)[1],1,'clear window lasts 20 percent of each duration');

}
let lastStep=-1,lastProgress=0;for(let seconds=0;seconds<t.reelSeconds*2;seconds+=.071){const a=t.sceneTime(seconds);assert.ok(a.step>=lastStep);if(a.step===lastStep)assert.ok(a.progress>=lastProgress);lastStep=a.step;lastProgress=a.progress;}
const roles={};for(const beat of t.sceneBeats)roles[beat.role]=(roles[beat.role]||0)+1;
assert.ok(!t.scenes[t.sceneTime(0).sourceIndex].kind,'random opening is a painting, retaining its own duration');
assert.ok(t.sceneBeats.filter(b=>b.role==='detail').every(b=>b.motion<.5),'reading detailed artwork has quieter camera');
console.log('PASS editorial timeline:',JSON.stringify({sceneCount,reelSeconds:t.reelSeconds,roles}),'three laps/boundaries and duration-independent easing. Math/mock, not visual QA.');
