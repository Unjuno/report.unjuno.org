'use strict';
// Schedule invariants only: this VM does not claim browser or aesthetic coverage.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const sourcePath=process.argv[2]||'dist/assets/cinema-field.js';
const original=fs.readFileSync(sourcePath,'utf8');
const marker='// Fetch the visible image first;';
assert.ok(original.includes(marker),'runtime test exposure marker exists');
const source=original.replace(marker,'window.test={scenes,sceneBeats,reelSeconds,sequenceFor,sceneAt,sceneTime,get cacheSize(){return typeof sequences!=="undefined"?sequences.size:null;}};\n'+marker);
function boot(seed){
 const context=new Proxy({createLinearGradient:()=>({addColorStop(){}})},{get:(o,k)=>o[k]||(()=>{})});
 const math=Object.create(Math);let calls=0;math.random=()=>{calls++;return seed;};
 const env={Math:math,window:{},document:{hidden:true,body:{prepend(){},classList:{contains:()=>false}},createElement:()=>({setAttribute(){},getContext:()=>context,remove(){}}),querySelectorAll:()=>[],querySelector:()=>null,addEventListener(){}},Image:class{},matchMedia:()=>({matches:true,addEventListener(){}}),innerWidth:390,innerHeight:844,devicePixelRatio:1,scrollY:0,setTimeout:()=>1,clearTimeout(){},requestAnimationFrame(){throw new Error('reduced motion must not animate');},cancelAnimationFrame(){},addEventListener(){},MutationObserver:class{observe(){}}};
 vm.runInNewContext(source,env,{filename:sourcePath});
 return {api:env.window.test,randomCalls:()=>calls};
}
const family=s=>s.asset===undefined?'procedural':'asset:'+s.asset;
const ordersAcrossSeeds=new Set();let testedScenes=0,testedCycles=0;
for(let seedIndex=0;seedIndex<64;seedIndex++){
 const seed=seedIndex===0?0:seedIndex===63?1-Number.EPSILON:((Math.imul(seedIndex,0x9e3779b9)+0x12345)>>>0)/4294967296;
 const {api:t,randomCalls}=boot(seed),n=t.scenes.length;
 assert.ok(n>1);
 const authoredScenes=JSON.stringify(t.scenes),authoredBeats=JSON.stringify(t.sceneBeats);
 const expectedIndices=Array.from({length:n},(_,i)=>i);
 const checkCache=()=>{if(t.cacheSize!==null)assert.ok(t.cacheSize<=3,'schedule cache bounded to three cycles');};
 const zero=Array.from(t.sequenceFor(0).order);ordersAcrossSeeds.add(zero.join(','));
 const cycleOrders=new Set();
 for(const lap of [-3,-2,-1,0,1,2,3,4,8,17,100,10000]){
  const sequence=t.sequenceFor(lap),order=Array.from(sequence.order),starts=Array.from(sequence.starts);
  checkCache();cycleOrders.add(order.join(','));
  assert.deepEqual([...order].sort((a,b)=>a-b),expectedIndices,'every authored scene occurs exactly once');
  assert.equal(starts[0],0,'each cycle starts at zero');
  assert.notEqual(t.scenes[order[0]].asset,undefined,'each cycle opens on an image');
  const next=t.sequenceFor(lap+1);checkCache();
  assert.notEqual(family(t.scenes[order[n-1]]),family(t.scenes[next.order[0]]),'cycle seam does not repeat a source family');
  let elapsed=0;
  for(let slot=0;slot<n;slot++){
   const sourceIndex=order[slot],scene=t.scenes[sourceIndex],beat=t.sceneBeats[sourceIndex];
   assert.ok(Math.abs(starts[slot]-elapsed)<1e-8,'slot start follows shuffled source duration');
   assert.equal(t.sceneAt(lap*n+slot),scene,'global step maps to the exact authored scene');
   if(slot)assert.notEqual(family(scene),family(t.scenes[order[slot-1]]),'adjacent slots have distinct source families');
   for(const progress of [.00001,.25,.5,.75,.99999]){
    const timing=t.sceneTime(lap*t.reelSeconds+elapsed+beat.seconds*progress);
    assert.equal(timing.step,lap*n+slot,'global step agrees with shuffled time');
    assert.equal(timing.index,slot,'index is the shuffled slot');
    assert.equal(timing.sourceIndex,sourceIndex,'sourceIndex identifies authored scene');
    assert.ok(Math.abs(timing.progress-progress)<1e-7,'progress preserves local source duration');
    for(const key of Object.keys(beat))assert.equal(timing[key],beat[key],'per-source '+key+' retained');
    checkCache();
   }
   const edge=lap*t.reelSeconds+elapsed+beat.seconds;
   assert.equal(t.sceneTime(edge-1e-6).step,lap*n+slot,'boundary left side');
   assert.equal(t.sceneTime(edge+1e-6).step,lap*n+slot+1,'boundary right side');
   elapsed+=beat.seconds;testedScenes++;
  }
  assert.ok(Math.abs(elapsed-t.reelSeconds)<1e-8,'cycle duration remains unchanged');
  if(starts.length===n+1)assert.ok(Math.abs(starts[n]-t.reelSeconds)<1e-8,'terminal offset matches cycle duration');
  assert.deepEqual(Array.from(t.sequenceFor(lap).order),order,'same cycle is stable after neighboring queries');
  testedCycles++;
 }
 // Additional full-width cycle hashes exercise repair without repeating timing work.
 for(let probe=0;probe<64;probe++){
  const lap=(Math.imul(probe+1,0x85ebca6b)>>>0)%1000000;
  const order=Array.from(t.sequenceFor(lap).order),next=t.sequenceFor(lap+1).order;
  assert.deepEqual([...order].sort((a,b)=>a-b),expectedIndices);
  for(let i=1;i<n;i++)assert.notEqual(family(t.scenes[order[i-1]]),family(t.scenes[order[i]]),'stress adjacency');
  assert.notEqual(family(t.scenes[order[n-1]]),family(t.scenes[next[0]]),'stress seam');
  assert.notEqual(t.scenes[order[0]].asset,undefined,'stress image opening');
  checkCache();testedCycles++;
 }
 assert.ok(cycleOrders.size>1,'cycles vary within a visit');
 assert.deepEqual(Array.from(t.sequenceFor(0).order),zero,'evicted cycle regenerates deterministically');
 assert.deepEqual(Array.from(boot(seed).api.sequenceFor(0).order),zero,'identical session seed reproduces schedule');
 assert.equal(JSON.stringify(t.scenes),authoredScenes,'authored scene registry is not mutated');
 assert.equal(JSON.stringify(t.sceneBeats),authoredBeats,'authored beat registry is not mutated');
 assert.equal(randomCalls(),1,'session samples nondeterministic randomness only once');
 checkCache();
}
assert.ok(ordersAcrossSeeds.size>=60,'different visits produce diverse opening cycles');
console.log('PASS randomized scene schedule: '+JSON.stringify({sessionSeeds:64,distinctOpeningCycles:ordersAcrossSeeds.size,testedCycles,testedScenes})+'. VM invariants, not browser visual QA.');
