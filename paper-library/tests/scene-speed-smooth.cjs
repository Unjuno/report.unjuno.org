'use strict';
const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
// Calmer motion requested 2026-11-05: idle 1.2, at most 2x while scrolling.
// Phase runs at 1.2 units/second; scroll adds at most 1.2, decaying at 2.2/s.
// Pin those values independently of the source so accidental speed changes fail.
const IDLE_SPEED=1.2,SCROLL_GAIN=.0048,MAX_BOOST=1.2,BOOST_DECAY=2.2,DT=.1;
const phaseStep=boost=>IDLE_SPEED*DT+boost*(1-Math.exp(-BOOST_DECAY*DT))/BOOST_DECAY;
const frames=new Map(),listeners={},documentListeners={},observers=[],loads=[];let serial=0,paused=false,paints=0;
const reduced={matches:false,addEventListener(n,fn){this.change=fn}};
const context2d=new Proxy({createLinearGradient:()=>({addColorStop(){}}),clearRect(){}},{get:(o,k)=>o[k]||(()=>{})});
const env={setTimeout:()=>1,clearTimeout(){},window:{},document:{hidden:false,body:{prepend(){},classList:{contains:()=>paused}},createElement:()=>({setAttribute(){},getContext:()=>context2d,remove(){}}),querySelectorAll:()=>[],querySelector:()=>({}),addEventListener:(n,f)=>documentListeners[n]=f},Image:class{constructor(){this.complete=false;}set src(url){loads.push(()=>{this.naturalWidth=1536;this.naturalHeight=1024;this.onload();})}},matchMedia:()=>reduced,scrollY:0,innerWidth:1200,innerHeight:800,devicePixelRatio:1,requestAnimationFrame(fn){frames.set(++serial,fn);return serial},cancelAnimationFrame(id){frames.delete(id)},addEventListener:(n,f)=>listeners[n]=f,MutationObserver:class{constructor(fn){this.fn=fn}observe(target){if(target===env.document.body)observers.push(this.fn)}}};
env.countPaint=()=>paints++;
vm.runInNewContext(fs.readFileSync(process.argv[2]||'dist/assets/cinema-field.js','utf8').replace('function paint(){', 'function paint(){countPaint();'),env);
function flush(){while(loads.length)loads.shift()();}
flush();
function frame(time){const queue=[...frames.values()];frames.clear();queue.forEach(fn=>fn(time));flush();}
function flow(){return env.window.__reportFlow;}
function close(a,b,msg){assert.ok(Math.abs(a-b)<1e-8,`${msg}: ${a} versus ${b}`)}
frame(0);close(flow().pvSpeed,IDLE_SPEED,'calmer idle speed remains 1.2');
for(let i=1;i<=48;i++)frame(i*100);
close(flow().phase,4.8*IDLE_SPEED,'phase follows wall time at the calmer idle speed');assert.ok(Math.abs(flow().blend-.5)<.002,'vista midpoint is nearly half blended');assert.equal(flow().sceneDuration,11.5);assert.equal(flow().scene,0);
for(let i=49;i<=95;i++)frame(i*100);assert.equal(flow().scene,0);assert.ok(flow().blend>.999,'phase blend approaches the boundary');
frame(9600);assert.equal(flow().scene,1,'11.5 phase units finish after about 9.58 wall-clock seconds');assert.ok(flow().blend<.001,'next phase interval starts gently');
frame(9700); // Establish the frame clock after the next asset completes.
const beforeScroll=flow().phase;env.scrollY=180;listeners.scroll();close(flow().phase,beforeScroll,'scroll never jumps the scene position');
frame(9800);const boostedStep=flow().phase-beforeScroll;
close(boostedStep,phaseStep(180*SCROLL_GAIN),'180px scroll adds the reduced gain with continuous exponential decay');
close(flow().pvSpeed,IDLE_SPEED+180*SCROLL_GAIN*Math.exp(-BOOST_DECAY*DT),'reported speed tracks decayed scroll gain');
close(flow().scrollEnergy,.72*(1-Math.exp(-6*DT)),'normalized cloud/camera response is not amplified by the lower speed cap');
for(let i=99;i<=148;i++)frame(i*100);
const settled=flow().phase;frame(14900);const settledStep=flow().phase-settled;
assert.ok(settledStep>=IDLE_SPEED*DT-1e-8&&settledStep<IDLE_SPEED*DT+.00001,'acceleration decays back to the 1.2 autonomous speed');
const beforeBurst=flow().phase;env.scrollY=100000;listeners.scroll();close(flow().phase,beforeBurst,'large scroll jump cannot jump images');
frame(15000);close(flow().phase-beforeBurst,phaseStep(MAX_BOOST),'large scroll clamps added speed to 1.2 phase units/second');assert.ok(flow().phase-beforeBurst<=(IDLE_SPEED+MAX_BOOST)*DT,'total instantaneous speed is bounded to 2.4 phase units/second');
// Reversing direction still accelerates forward rather than rewinding the scene.
const beforeReverse=flow().phase;env.scrollY=0;listeners.scroll();frame(15100);close(flow().phase-beforeReverse,phaseStep(MAX_BOOST),'reverse scroll moves forward with the same acceleration cap');

paused=true;observers.forEach(fn=>fn());assert.equal(frames.size,0);const frozen=flow().phase;env.scrollY=900;listeners.scroll();listeners.resize();frame(8000);close(flow().phase,frozen,'pause freezes time, scroll and resize');
paused=false;observers.forEach(fn=>fn());frame(100000);close(flow().phase,frozen,'resume does not catch up elapsed time');frame(100100);close(flow().phase-frozen,IDLE_SPEED*DT,'pause discards pending scroll acceleration');
env.document.hidden=true;documentListeners.visibilitychange();assert.equal(frames.size,0);const hidden=flow().phase;env.scrollY=1500;listeners.scroll();frame(120000);close(flow().phase,hidden,'hidden tab stays frozen');
env.document.hidden=false;documentListeners.visibilitychange();frame(150000);close(flow().phase,hidden,'visibility resume does not jump');
reduced.matches=true;reduced.change();assert.equal(frames.size,0);const reducedPhase=flow().phase;env.scrollY=2100;listeners.scroll();listeners.resize();close(flow().phase,reducedPhase,'reduced motion freezes scroll and resize');
reduced.matches=false;reduced.change();frame(200000);const beforePaints=paints;for(let i=1;i<=240;i++)frame(200000+i*1000/240);assert.ok(paints-beforePaints<=24,'paint frequency remains at most 24fps');
console.log('PASS calmer 1.2 idle speed, variable scene duration continuous dissolve, smooth boundary, .0048 scroll gain, 1.2-unit acceleration cap and decay, unchanged normalized visual response, pause/resume, hidden-tab resume, reduced motion and 24fps cap (mock DOM).');
