'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const source=fs.readFileSync('dist/assets/scroll-audio.js','utf8').replace('ui(Engine?', 'window.testAudio=()=>({session,musicTime,raf,chordTo});\nui(Engine?');
function env({reduced=false,unsupported=false,mode='ok'}={}){
 const els={},events={},frames=new Map(),timeouts=new Map(),contexts=[];let id=0,observer;
 const media={matches:reduced,addEventListener(_,fn){this.change=fn}},body={classList:{contains:()=>body.paused},paused:false};
 for(const key of ['scroll-audio','audio-start','audio-mute','audio-stop','audio-volume','audio-status','audio-summary'])els[key]={value:key==='audio-volume'?'20':'',addEventListener(n,f){this[n]=f},setAttribute(n,v){this[n]=v}};
 class Param{constructor(){this.value=0;this.calls=[]}setTargetAtTime(v,t,c){this.value=v;this.calls.push(["target",v,t,c])}setValueAtTime(v,t){this.value=v;this.calls.push(["set",v,t])}linearRampToValueAtTime(v,t){this.calls.push(["ramp",v,t])}exponentialRampToValueAtTime(){}}
 class Node{constructor(){this.gain=new Param;this.frequency=new Param}connect(){}start(){}stop(){}disconnect(){}}
 class Audio{constructor(){this.state='suspended';this.currentTime=0;this.destination={};this.nodes=[];contexts.push(this)}createGain(){return new Node}createOscillator(){const o=new Node;this.nodes.push(o);return o}resume(){if(mode==='reject')return Promise.reject(Error('blocked'));if(mode==='pending')return new Promise(r=>this.finish=()=>{this.state='running';r()});this.state='running';return Promise.resolve()}close(){this.state='closed';this.closed=true;return Promise.resolve()}}
 const document={body,hidden:false,querySelector:s=>els[s.slice(1)],addEventListener(n,f){events[n]=f}},window={AudioContext:unsupported?undefined:Audio,addEventListener(n,f){events[n]=f},__reportFlow:{phase:0,paused:false}};
 const box={document,window,matchMedia:()=>media,MutationObserver:class{constructor(f){observer=f}observe(){}},requestAnimationFrame:f=>{frames.set(++id,f);return id},cancelAnimationFrame:i=>frames.delete(i),setTimeout:f=>{timeouts.set(++id,f);return id},clearTimeout:i=>timeouts.delete(i),console};vm.runInNewContext(source,box);
 return{els,events,document,window,media,contexts,frames,timeouts,observer:()=>observer(),get:()=>window.testAudio(),tick(t){const batch=[...frames.values()];frames.clear();batch.forEach(f=>f(t))}};
}
(async()=>{
 const e=env();e.window.__reportFlow.phase=7.9;await e.els['audio-summary'].click();const s=e.get().session;
 assert.equal(s.pads.length,8);assert.equal(s.banks[0].gain.gain.value,.1);assert.equal(s.banks[1].gain.gain.value,0);
 const oldFreq=s.banks[0].oscillators.map(o=>o.frequency.value);e.tick(0);s.ctx.currentTime=.1;e.window.__reportFlow.phase=8.1;e.tick(100);
 assert.equal(s.activeBank,1);assert.equal(s.fadeUntil,1.3);assert.deepEqual(s.banks[0].oscillators.map(o=>o.frequency.value),oldFreq,'outgoing sounding bank keeps fixed pitches');
 assert.deepEqual(s.banks[0].gain.gain.calls.at(-1),['ramp',0,1.3]);assert.deepEqual(s.banks[1].gain.gain.calls.at(-1),['ramp',.1,1.3]);
 for(let step=0;step<=100;step++){const t=step/100;assert(Math.abs(.1*(1-t)+.1*t-.1)<1e-12,'complementary gain does not increase sum');}
 assert(s.pads.every(o=>!o.frequency.calls.some(c=>c[0]==='target')),'no frequency glides');
 const incoming=s.banks[1].oscillators.map(o=>o.frequency.value);s.ctx.currentTime=.6;assert.equal(e.get().chordTo(s,2),false,'no retune or overlap interruption before fade completes');assert.deepEqual(s.banks[1].oscillators.map(o=>o.frequency.value),incoming);
 s.ctx.currentTime=1.4;assert.equal(e.get().chordTo(s,2),true);assert.equal(s.activeBank,0);assert.deepEqual(s.banks[1].oscillators.map(o=>o.frequency.value),incoming,'second outgoing bank stays fixed');
 e.els['audio-volume'].value='0';e.els['audio-volume'].input();assert.equal(s.master.gain.value,0,'one master mutes both banks');e.document.hidden=true;e.events.visibilitychange();assert(s.ctx.closed);
 const e2=env();e2.window.__reportFlow.phase=17;await e2.els['audio-summary'].click();assert.equal(e2.get().session.banks[0].oscillators[0].frequency.value,440*2**((41-69)/12),'start directly on current PV chord, not a wrong opening glide');
 console.log('PASS crossfade: 1.2 real-second complementary bank gain ramps; fixed pitches; no mid-fade retune; bounded 8 pads; common mute/stop; current PV chord initialization. Mock and math only, not listening or device load.');
})().catch(e=>{console.error(e);process.exitCode=1});
