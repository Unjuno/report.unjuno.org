'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..'),integrated=fs.existsSync(path.join(root,'dist/assets/home-music/catalog.json')),assetRoot=integrated?path.join(root,'dist/assets/home-music'):path.join(root,'audio');
const bank=JSON.parse(fs.readFileSync(integrated?path.join(assetRoot,'catalog.json'):path.join(root,'manifest.json'),'utf8'));
const raw=fs.readFileSync(path.join(root,integrated?'dist/assets/scroll-audio.js':'player/scroll-audio.js'),'utf8');
const instrumented=raw.replace('let tap=null','window.__test={get:()=>session,begin,halt,boundaryState,drawTrack,resetBag:()=>{shuffleBag=[];lastSelectedId=null;}};\nlet tap=null');
const flush=async()=>{for(let i=0;i<8;i++)await new Promise(setImmediate);};
function env(options={}){
 let now=0,id=0,fetchCount=0;const events={},timers=new Map(),frames=new Map(),contexts=[],requests=[],decodeWaiters=new Map();
 const document={hidden:false,body:{classList:{contains:()=>false}},querySelector:s=>s==='#scroll-audio'?{}:null,addEventListener(n,f){events[n]=f;}};
 class Param{constructor(v=0){this.value=v;this.calls=[];}setTargetAtTime(v,t,c){this.value=v;this.calls.push(['target',v,t,c]);}setValueAtTime(v,t){this.value=v;this.calls.push(['set',v,t]);}linearRampToValueAtTime(v,t){this.calls.push(['ramp',v,t]);}setValueCurveAtTime(v,t,d){for(const c of this.calls)if(c[0]==='curve')assert.ok(t>=c[2]+c[3]-1e-8||t+d<=c[2]+1e-8,'gain curves must not overlap');this.calls.push(['curve',v,t,d]);}}
 class Node{constructor(){this.gain=new Param();this.frequency=new Param();this.playbackRate=new Param(1);this.connections=[];this.buffer=null;}connect(n){this.connections.push(n);}disconnect(){this.connections=[];this.disconnected=true;}}
 class Audio{
  constructor(){this.state=options.initialState||'running';this.currentTime=now;this.destination={};this.sources=[];this.gains=[];this.order=[];contexts.push(this);}
  createGain(){const n=new Node();this.gains.push(n);return n;}
  createBufferSource(){this.order.push('source');const n=new Node();n.start=(at,offset,duration)=>{n.startAt=at;n.offset=offset;n.endAt=at+duration;n.started=true;};n.stop=(at=this.currentTime)=>{n.endAt=Math.min(n.endAt??Infinity,at);n.stopped=true;};this.sources.push(n);return n;}
  resume(){this.order.push('resume');if(options.resumeReject)return Promise.reject(Error('policy'));if(options.resumePending)return new Promise(r=>{this.finishResume=()=>{this.state='running';r();};});this.state='running';return Promise.resolve();}
  decodeAudioData(bytes){const trackId=new DataView(bytes).getUint32(0,true),t=bank.tracks.find(x=>x.id===trackId);this.order.push('decode:'+trackId);const buffer={duration:t.decoded_duration_seconds,numberOfChannels:2,id:trackId};if(options.deferDecodeId===trackId)return new Promise(r=>decodeWaiters.set(trackId,()=>r(buffer)));return Promise.resolve(buffer);}
  close(){this.closed=true;this.state='closed';return Promise.resolve();}
 }
 const window={AudioContext:options.unsupported?undefined:Audio,crypto:{subtle:{async digest(_,bytes){const tid=new DataView(bytes).getUint32(0,true),track=bank.tracks.find(x=>x.id===tid);return Uint8Array.from((options.badHash&&tid===bank.tracks[0].id?'0'.repeat(64):track.sha256).match(/../g),x=>parseInt(x,16)).buffer;}}},addEventListener(n,f){events[n]=f;},__reportFlow:{phase:0,sceneProgress:.9,transition:'mist'},HomeSoundIndicator:{setSource(s){this.source=s;},setState(s){this.state=s;},refresh(){this.refreshed=true;}}};
 const fetch=async(url,{signal}={})=>{requests.push(url);fetchCount++;if(signal?.aborted)throw Error('aborted');if(url.split('?')[0].endsWith('catalog.json'))return{ok:true,arrayBuffer:async()=>new TextEncoder().encode(JSON.stringify(options.badCatalog?{tracks:[]}:bank)).buffer};const t=bank.tracks.find(x=>x.url===url);if(!t)throw Error('missing');if(options.failNext&&url!==bank.tracks[0].url)throw Error('offline');const bytes=new ArrayBuffer(t.bytes);new DataView(bytes).setUint32(0,t.id,true);return{ok:true,arrayBuffer:async()=>bytes};};
 let seed=options.seed??1;const testMath=Object.create(Math);testMath.random=options.random||(()=>options.seed===undefined?.999999999:((seed=(Math.imul(1664525,seed)+1013904223)>>>0)/4294967296));
 const box={document,window,matchMedia:()=>({matches:!!options.reduced}),fetch,AbortController,TextDecoder,TextEncoder,Uint8Array,Uint32Array,Float32Array,DataView,Number,Math:testMath,Promise,Date,console,requestAnimationFrame:f=>{frames.set(++id,f);return id;},cancelAnimationFrame:i=>frames.delete(i),setTimeout:(f,ms)=>{timers.set(++id,{f,at:now+ms/1000});return id;},clearTimeout:i=>timers.delete(i)};
 vm.runInNewContext(instrumented,box);
 async function advance(t,{runFrames=true,runTimers=true}={}){now=t;for(const c of contexts)if(c.state==='running')c.currentTime=t;if(runTimers){for(const [key,item]of [...timers])if(item.at<=t){timers.delete(key);item.f();}}for(const c of contexts){for(const n of [...c.sources])if(!n.ended&&n.started&&n.endAt<=t){n.ended=true;n.onended?.();}}if(runFrames){const batch=[...frames.values()];frames.clear();for(const f of batch)f(t*1000);}await flush();}
 return {document,window,contexts,requests,events,timers,frames,decodeWaiters,get:()=>window.__test.get(),advance,async nextEnd(){const s=this.get();await advance(s.current.end+.00001);},async gesture(){await events.click({isTrusted:true,button:0});await flush();},async hide(){document.hidden=true;events.visibilitychange();await flush();}};
}
test('catalog assets and 2500 numeric pair identities are exact',()=>{assert.equal(bank.tracks.length,50);assert.equal(new Set(bank.tracks.map(t=>t.id)).size,50);assert.equal(bank.verification.directed_pairs_screened,2500);for(const t of bank.tracks){const bytes=fs.readFileSync(path.join(assetRoot,t.file));assert.equal(bytes.length,t.bytes);assert.equal(require('node:crypto').createHash('sha256').update(bytes).digest('hex'),t.sha256);}});
test('allowed startup loads only metadata/current/next, keeps pitch, headroom and real-output indicator',async()=>{const e=env();await flush();const s=e.get();assert(s.ready);assert.equal(s.tracks.length,50);assert.equal(e.requests.length,3);assert.equal(e.window.__homeMusicStatus.decodedBuffers,2);assert.equal(e.window.__homeMusicStatus.sourceNodes,2);assert.equal(s.current.track.id,1);assert.equal(s.next.track.id,2);assert.equal(s.next.fallback,false);assert(Math.abs(s.current.end-s.next.start-bank.crossfade_seconds)<1e-10);assert.equal(s.current.source.playbackRate.value,1);assert.equal(s.next.source.playbackRate.value,1);assert(Math.abs(s.master.gain.value-10**(-3.1/20))<1e-10);assert.equal(e.contexts[0].order[0],'resume');assert.equal(e.window.HomeSoundIndicator.source.context,s.ctx);assert.equal(e.window.HomeSoundIndicator.source.getState(),'running');});
test('55 successive cue endings cover all 50 while never retaining over two buffers/sources',async()=>{const e=env();await flush();const played=[];for(let n=0;n<55;n++){const s=e.get();played.push(s.current.track.id);assert.equal(s.ctx.state,'running');assert(e.window.__homeMusicStatus.decodedBuffers<=2);assert(e.window.__homeMusicStatus.sourceNodes<=2);assert.equal(s.next.fallback,false);assert.equal(s.current.source.playbackRate.value,1);await e.nextEnd();}assert.equal(new Set(played.slice(0,50)).size,50);assert.equal(played[0],played[50]);assert(e.contexts[0].sources.filter(n=>n.buffer).length<=2);});
test('blocked automatic startup fetches nothing; trusted gesture resumes before decode and duplicate events do not restart',async()=>{const e=env({initialState:'suspended'});await flush();assert.equal(e.requests.length,0);assert.equal(e.contexts.length,1);assert(e.contexts[0].closed);await e.events.click({isTrusted:false,button:0});assert.equal(e.requests.length,0);await e.gesture();assert(e.get().ready);assert.equal(e.contexts.at(-1).order[0],'resume');const count=e.contexts.length;await e.gesture();e.events.pageshow();await flush();assert.equal(e.contexts.length,count);});
test('next-file failures leave scheduled same-cue fallback without a gap or busy retry loop',async()=>{const e=env({failNext:true});await flush();const s=e.get();assert(s.ready);assert(s.next.fallback);assert.equal(s.current.buffer,s.next.buffer);assert.equal(e.requests.length,4);assert.equal(e.window.__homeMusicStatus.decodedBuffers,1);assert(Math.abs(s.current.end-s.next.start-bank.crossfade_seconds)<1e-10);assert(s.error.includes('offline'));await e.nextEnd();assert(e.get().ready);assert(e.get().next.fallback);assert.equal(e.requests.length,6);assert.equal(e.window.__homeMusicStatus.decodedBuffers,1);});
test('late decode waits across an already-started fallback, never creates a third buffer/source',async()=>{const e=env({deferDecodeId:2});await flush();let s=e.get();assert(s.next.fallback);await e.advance(s.next.start+.5);e.decodeWaiters.get(2)();await flush();s=e.get();assert(s.next.fallback);assert.equal(s.loaded.track.id,2);assert.equal(e.window.__homeMusicStatus.decodedBuffers,2);assert.equal(e.window.__homeMusicStatus.sourceNodes,2);await e.nextEnd();s=e.get();assert.equal(s.current.track.id,1);assert.equal(s.next.track.id,2);assert.equal(s.next.fallback,false);assert.equal(s.loaded,null);assert.equal(e.window.__homeMusicStatus.decodedBuffers,2);});
test('hide during decode closes, clears buffers and late completion cannot restart sound',async()=>{const e=env({deferDecodeId:2});await flush();const s=e.get();await e.hide();assert.equal(e.get(),null);assert(s.ctx.closed);assert.equal(e.window.__homeMusicStatus.decodedBuffers,0);e.decodeWaiters.get(2)();await flush();assert.equal(e.get(),null);assert.equal(e.window.__homeMusicStatus.sourceNodes,0);assert(s.ctx.sources.every(n=>n.buffer===null));assert.equal(e.frames.size,0);});
test('pending resume cannot restart after hiding and a policy rejection releases context',async()=>{let e=env({initialState:'suspended',resumePending:true});const pending=e.events.click({isTrusted:true,button:0});const c=e.contexts.at(-1);await e.hide();c.finishResume();await pending;await flush();assert.equal(e.get(),null);assert.equal(e.requests.length,0);e=env({initialState:'suspended',resumeReject:true});await e.gesture();assert.equal(e.get(),null);assert(e.contexts.every(x=>x.closed));assert.equal(e.requests.length,0);});
test('invalid catalog halts; bad first hash is skipped with no decoding; absent audio API is inert',async()=>{let e=env({badCatalog:true});await flush();assert.equal(e.get(),null);assert.equal(e.requests.length,1);e=env({badHash:true});await flush();assert.equal(e.get().current.track.id,2);assert(!e.contexts[0].order.includes('decode:1'));e=env({unsupported:true});await flush();assert.equal(e.requests.length,0);assert.equal(e.contexts.length,0);});
test('interruption and visibility/pagehide stop both voices; effects respect reduced motion',async()=>{let e=env();await flush();const s=e.get();s.ctx.state='interrupted';s.ctx.onstatechange();assert.equal(e.get(),null);assert(s.ctx.closed);e=env({reduced:true});await flush();const b=e.window.__test.boundaryState(e.window.__reportFlow,true);assert.equal(b.mist,0);e.events.pagehide();await flush();assert.equal(e.get(),null);assert.equal(e.frames.size,0);});
test('a long main-thread stall fails closed rather than resurrecting expired sources',async()=>{const e=env();await flush();const s=e.get();await e.advance(s.next.end+10);assert.equal(e.get(),null);assert.equal(e.window.__homeMusicStatus.sourceNodes,0);});

test('shuffle bags randomize first cue/order while covering every track once per normal round',async()=>{
 const starts=new Set(),orders=new Set();
 for(let seed=1;seed<=20;seed++){
  const e=env({seed});await flush();const played=[];
  for(let n=0;n<101;n++){
   const s=e.get();played.push(s.current.track.id);
   assert(e.window.__homeMusicStatus.decodedBuffers<=2);assert(e.window.__homeMusicStatus.sourceNodes<=2);
   await e.nextEnd();
  }
  starts.add(played[0]);orders.add(played.slice(0,50).join(','));
  assert.equal(new Set(played.slice(0,50)).size,50);assert.equal(new Set(played.slice(50,100)).size,50);
  for(let i=1;i<played.length;i++)assert.notEqual(played[i],played[i-1]);
 }
 assert(starts.size>=10);assert.equal(orders.size,20);
});
test('hide/show retains unconsumed shuffle bag rather than resetting to signature or first cue',async()=>{
 const e=env({seed:13});await flush();const ids=[e.get().current.track.id,e.get().next.track.id];await e.hide();
 e.document.hidden=false;await e.events.visibilitychange();await flush();assert(e.get().ready);assert(!ids.includes(e.get().current.track.id));
});
test('cryptographic random selection uses rejection sampling and avoids round-boundary repeat',async()=>{
 const e=env({initialState:'suspended'});await flush();let calls=0;
 e.window.crypto.getRandomValues=values=>{values[0]=calls++===0?4294967295:0;return values;};
 const api=e.window.__test;api.resetBag();const three=bank.tracks.slice(0,3),out=[];
 for(let i=0;i<12;i++)out.push(api.drawTrack(three).id);
 assert(calls>3);for(let i=0;i<12;i+=3)assert.equal(new Set(out.slice(i,i+3)).size,3);
 for(let i=1;i<out.length;i++)assert.notEqual(out[i],out[i-1]);
});

test('last remaining unavailable/current cue is skipped when rebuilding a retry bag',async()=>{
 const e=env({initialState:'suspended',random:()=>.99999999});await flush();const api=e.window.__test;api.resetBag();const three=bank.tracks.slice(0,3);
 assert.equal(api.drawTrack(three).id,three[0].id);assert.equal(api.drawTrack(three).id,three[1].id);
 assert.notEqual(api.drawTrack(three,three[2].id).id,three[2].id);
});

test('catalog request has a revision key to avoid an old overlap catalog after deployment',async()=>{
 const e=env();await flush();assert(e.requests[0].includes('catalog.json?v=piano-v3'));assert.equal(e.window.__homeMusicStatus.order,'shuffle-bag');assert.equal(e.window.__homeMusicStatus.crossfadeSeconds,.8);
});
