'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const source=fs.readFileSync('dist/assets/scroll-audio.js','utf8').replace('ui(Engine?', 'window.testAudio=()=>({session,musicTime,raf});\nui(Engine?');
function env({reduced=false,unsupported=false,mode='ok',sourceCode=source}={}){
 const els={},events={},frames=new Map(),timeouts=new Map(),contexts=[];let id=0,observer;
 const media={matches:reduced,addEventListener(_,fn){this.change=fn}},body={classList:{contains:()=>body.paused},paused:false};
 for(const key of ['scroll-audio','audio-start','audio-mute','audio-stop','audio-volume','audio-status','audio-summary'])els[key]={value:key==='audio-volume'?'20':'',addEventListener(n,f){this[n]=f},setAttribute(n,v){this[n]=v}};
 class Param{constructor(){this.value=0}setTargetAtTime(v){this.value=v}setValueAtTime(v){this.value=v}linearRampToValueAtTime(){}exponentialRampToValueAtTime(){}}
 class Node{constructor(){this.gain=new Param;this.frequency=new Param}connect(){}start(t){this.started=t;this.pv=this.owner.publishedPhase}stop(t){this.ends=t;this.owner.sounds.push(this)}disconnect(){}}
 class Audio{constructor(){this.state='suspended';this.currentTime=0;this.destination={};this.nodes=[];this.sounds=[];contexts.push(this)}createGain(){return new Node}createOscillator(){const o=new Node;o.owner=this;this.nodes.push(o);return o}resume(){if(mode==='reject')return Promise.reject(Error('blocked'));if(mode==='pending')return new Promise(r=>this.finish=()=>{this.state='running';r()});this.state='running';return Promise.resolve()}close(){this.state='closed';this.closed=true;return Promise.resolve()}}
 const document={body,hidden:false,querySelector:s=>els[s.slice(1)],addEventListener(n,f){events[n]=f}},window={AudioContext:unsupported?undefined:Audio,addEventListener(n,f){events[n]=f},__reportFlow:{phase:0,paused:false}};
 const box={document,window,matchMedia:()=>media,MutationObserver:class{constructor(f){observer=f}observe(){}},requestAnimationFrame:f=>{frames.set(++id,f);return id},cancelAnimationFrame:i=>frames.delete(i),setTimeout:f=>{timeouts.set(++id,f);return id},clearTimeout:i=>timeouts.delete(i),console};vm.runInNewContext(sourceCode,box);
 return{els,events,document,window,media,contexts,frames,timeouts,observer:()=>observer(),get:()=>window.testAudio(),tick(t){const batch=[...frames.values()];frames.clear();batch.forEach(f=>f(t))}};
}

function instrument(code){return code.replace('function note(s,m){if(s.notes.size>=8)return;', 'function note(s,m){s.attempts=(s.attempts||0)+1;if(s.notes.size>=8){s.drops=(s.drops||0)+1;return;}').replace('ui(Engine?', 'window.testAudio=()=>({session,musicTime,raf});\nui(Engine?');}
const current=instrument(fs.readFileSync('baseline-scroll-audio.js','utf8')),candidate=instrument(fs.readFileSync('dist/assets/scroll-audio.js','utf8'));
async function run(code,pattern,delay=0){
 const e=env({sourceCode:code});await e.els['audio-start'].click();const s=e.get().session,c=s.ctx;let phase=0,boost=0,energy=0,maxPhaseError=0,peak=0,lastPaint=-1,lastInput=-1,minRate=99,maxRate=0,maxRateChange=0,lastRate=1/.9;
 const duration=60,dt=1/120;
 for(let frame=0;frame<=duration/dt;frame++){
  const t=frame*dt;c.currentTime=t;
  const active=pattern==='sustained'?t>=5&&t<45:pattern==='bursts'?t>=5&&t<45&&(t%2)<.2:pattern==='stop-go'?t>=5&&t<45&&(t%12)<6:false;
  if(active&&t-lastInput>=.05){boost=Math.min(4,boost+4);lastInput=t;}
  energy+=(Math.min(1,boost/4)-energy)*(1-Math.exp(-6*dt));const next=boost*Math.exp(-2.2*dt);if(frame)phase+=dt+(boost-next)/2.2;boost=next;
  if(t-lastPaint>=1/24-1e-10){e.window.__reportFlow.phase=phase;e.window.__reportFlow.scrollEnergy=energy;lastPaint=t;}
  for(const o of c.sounds)if(!o.ended&&o.ends+delay<=t){o.ended=true;o.onended?.();}
  c.publishedPhase=e.window.__reportFlow.phase;e.tick(t*1000);maxPhaseError=Math.max(maxPhaseError,Math.abs(e.get().musicTime-e.window.__reportFlow.phase));peak=Math.max(peak,s.notes.size);
  if(s.noteRate){minRate=Math.min(minRate,s.noteRate);maxRate=Math.max(maxRate,s.noteRate);maxRateChange=Math.max(maxRateChange,Math.abs(s.noteRate-lastRate));lastRate=s.noteRate;}
 }
 const onset=c.sounds.map(o=>o.started),intervals=onset.slice(1).map((x,i)=>x-onset[i]).sort((a,b)=>a-b);let maxWindow=0;for(const t of onset)maxWindow=Math.max(maxWindow,onset.filter(x=>x>=t&&x<t+1-1e-9).length);
 const beatErrors=c.sounds.map(o=>Math.abs(o.pv/.9-Math.round(o.pv/.9))*.9);const plateau=onset.filter(x=>x>=15&&x<40).length/25;
 return {pattern,callbackDelaySeconds:delay,attempts:s.attempts||0,emitted:onset.length,capDrops:s.drops||0,peakShortVoices:peak,peakTotalVoices:peak+8,maxOneSecondCount:maxWindow,steady15to40Rate:+plateau.toFixed(2),minGapSeconds:+intervals[0].toFixed(4),p95GapSeconds:+intervals[Math.floor(intervals.length*.95)].toFixed(4),maxMusicPhaseErrorSeconds:+maxPhaseError.toFixed(9),finalMusicTime:e.get().musicTime,maxShortNoteBeatOffsetPVSeconds:+Math.max(...beatErrors).toFixed(4),rmsShortNoteBeatOffsetPVSeconds:+Math.sqrt(beatErrors.reduce((a,b)=>a+b*b,0)/beatErrors.length).toFixed(4),softRateRange:s.noteRate?[+minRate.toFixed(3),+maxRate.toFixed(3)]:null,maxSoftRateStep:s.noteRate?+maxRateChange.toFixed(4):null};
}
(async()=>{const output=[];for(const pattern of ['idle','sustained','bursts','stop-go'])for(const delay of [0,.12]){const a=await run(current,pattern,delay),b=await run(candidate,pattern,delay);assert.equal(a.finalMusicTime,b.finalMusicTime,'candidate must not change PV music clock');assert.equal(b.capDrops,0,'candidate short notes must not hit cap');assert(b.peakShortVoices<=7);assert(b.maxOneSecondCount<=4);output.push({baseline:a,candidate:b});}fs.writeFileSync('density-benchmark-results.json',JSON.stringify(output,null,2));console.log(JSON.stringify(output,null,2));})().catch(e=>{console.error(e);process.exitCode=1});
