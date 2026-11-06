/* HOME recorded music: 50 original synthesized cues, current/next buffers only.
   Browser-policy startup and real-output indicator behavior are retained.
   Cue cuts/crossfades are numerically screened, not listening/iOS certified. */
(() => {
'use strict';
const panel=document.querySelector('#scroll-audio');if(!panel)return;
const Engine=window.AudioContext||window.webkitAudioContext,reduced=matchMedia('(prefers-reduced-motion: reduce)');
// Version the changed cue bank too: a new player must not receive a cached 2 s bank.
const CATALOG='/assets/home-music/catalog.json?v=piano-v3',OVERLAP=.8,HEADROOM=10**(-3.1/20),FETCH_MS=7000;
let session=null,revision=0,raf=0,lastPaint=0,catalogPromise=null,shuffleBag=[],lastSelectedId=null;
// A full shuffled bag is consumed before reshuffling. Keep it across hide/show
// restarts in this page, but do not store listening history or preload the bank.
function randomIndex(limit){
 if(window.crypto?.getRandomValues){
  const value=new Uint32Array(1),ceiling=Math.floor(4294967296/limit)*limit;
  do{window.crypto.getRandomValues(value);}while(value[0]>=ceiling);
  return value[0]%limit;
 }
 return Math.floor(Math.random()*limit);
}
function drawTrack(tracks,avoidId=lastSelectedId){
 if(shuffleBag.length===1&&shuffleBag[0].id===avoidId&&tracks.length>1)shuffleBag=[];
 if(!shuffleBag.length){
  shuffleBag=tracks.slice();
  for(let i=shuffleBag.length-1;i>0;i--){const j=randomIndex(i+1);[shuffleBag[i],shuffleBag[j]]=[shuffleBag[j],shuffleBag[i]];}
  // The new round must not immediately repeat the preceding selected track.
  if(shuffleBag.length>1&&shuffleBag[0].id===avoidId){const j=1+randomIndex(shuffleBag.length-1);[shuffleBag[0],shuffleBag[j]]=[shuffleBag[j],shuffleBag[0]];}
 }
 // A failed request or interrupted session can leave the current cue in a bag.
 if(shuffleBag.length>1&&shuffleBag[0].id===avoidId){const j=1+randomIndex(shuffleBag.length-1);[shuffleBag[0],shuffleBag[j]]=[shuffleBag[j],shuffleBag[0]];}
 const track=shuffleBag.shift();lastSelectedId=track.id;return track;
}
const staticMode=()=>reduced.matches||document.body.classList.contains('paused');
function ui(){} // Retain the existing no-prompt surface.
function valid(s){return session===s&&!s.closed&&!document.hidden;}
function diagnostics(s){
 if(!s||session!==s)return;
 const buffers=new Set([s.current?.buffer,s.next?.buffer,s.loaded?.buffer].filter(Boolean));
 window.__homeMusicStatus=Object.freeze({engine:'recorded-music',order:'shuffle-bag',crossfadeSeconds:OVERLAP,catalogCount:s.tracks?.length||0,currentId:s.current?.track.id||null,nextId:s.next?.track.id||null,currentStart:s.current?.start??null,currentEnd:s.current?.end??null,nextStart:s.next?.start??null,nextEnd:s.next?.end??null,decodedBuffers:buffers.size,sourceNodes:s.voices.size,pendingLoad:!!s.pending,fallback:!!s.next?.fallback,ready:s.ready,error:s.error||null});
}
function releaseVoice(s,v){if(!v||v.released)return;v.released=true;v.source.onended=null;try{v.source.disconnect();v.gain.disconnect();v.source.buffer=null;}catch(_){}v.buffer=null;s.voices.delete(v);}
function close(s){
 if(!s||s.closed)return;s.closed=true;clearTimeout(s.timeout);s.pending?.controller.abort();s.abort.abort();s.ctx.onstatechange=null;
 for(const v of [...s.voices]){try{v.source.stop();}catch(_){}releaseVoice(s,v);}
 s.current=null;s.next=null;s.loaded=null;try{s.master.gain.setValueAtTime(0,s.ctx.currentTime);s.ctx.close().catch(()=>{});}catch(_){}
}
function halt(message='再生待ちです。画面を一度タップすると再試行します。'){
 revision++;cancelAnimationFrame(raf);raf=0;const old=session;session=null;window.__reportAudioIndicatorSource=null;window.__homeMusicStatus=Object.freeze({engine:'recorded-music',ready:false,decodedBuffers:0,sourceNodes:0,catalogCount:old?.tracks?.length||0});window.HomeSoundIndicator?.setState(document.hidden?'suspended':Engine?'waiting':'unavailable');close(old);ui(message);
}
async function timedFetch(url,signal){
 const controller=new AbortController(),abort=()=>controller.abort();signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)controller.abort();
 const timer=setTimeout(abort,FETCH_MS);
 try{const response=await fetch(url,{signal:controller.signal,credentials:'same-origin'});if(!response.ok)throw Error('audio fetch '+response.status);return await response.arrayBuffer();}
 finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
}
function validateCatalog(data){
 if(!data||!Array.isArray(data.tracks)||data.tracks.length!==50||data.crossfade_seconds!==OVERLAP||data.master_gain_db!==-3.1)throw Error('invalid audio catalog');
 const ids=new Set(),urls=new Set();
 for(const t of data.tracks){
  if(!Number.isInteger(t.id)||ids.has(t.id)||!/^\/assets\/home-music\/\d{3}_[a-z0-9_]+\.mp3$/.test(t.url)||urls.has(t.url)||!/^[a-f0-9]{64}$/.test(t.sha256))throw Error('invalid audio track identity');
  if(![t.cue_in_seconds,t.cue_out_seconds,t.decoded_duration_seconds].every(Number.isFinite)||t.cue_in_seconds<0||t.cue_out_seconds>t.decoded_duration_seconds+.05||t.cue_out_seconds-t.cue_in_seconds<OVERLAP*2+1||t.decoded_duration_seconds>90)throw Error('invalid audio cues');
  ids.add(t.id);urls.add(t.url);
 }
 return data.tracks;
}
async function catalog(s){
 // Metadata is shared only after a successful parse. An aborted first session cannot poison later starts.
 if(!catalogPromise)catalogPromise=timedFetch(CATALOG,s.abort.signal).then(bytes=>validateCatalog(JSON.parse(new TextDecoder().decode(bytes)))).catch(error=>{catalogPromise=null;throw error;});
 return catalogPromise;
}
async function loadTrack(s,track,signal){
 const bytes=await timedFetch(track.url,signal);if(!valid(s)||signal.aborted)throw Error('cancelled');
 if(bytes.byteLength!==track.bytes||!window.crypto?.subtle)throw Error('audio integrity unavailable');
 const digest=Array.from(new Uint8Array(await window.crypto.subtle.digest('SHA-256',bytes)),x=>x.toString(16).padStart(2,'0')).join('');
 if(digest!==track.sha256)throw Error('audio hash mismatch');
 const buffer=await s.ctx.decodeAudioData(bytes);if(!valid(s)||signal.aborted)throw Error('cancelled');
 if(!Number.isFinite(buffer.duration)||buffer.duration+.05<track.cue_out_seconds||buffer.numberOfChannels!==2)throw Error('invalid decoded audio');
 return buffer;
}
const FADE_IN=new Float32Array(2048),FADE_OUT=new Float32Array(2048);
for(let i=0;i<FADE_IN.length;i++){const t=i/(FADE_IN.length-1)*Math.PI/2;FADE_IN[i]=Math.sin(t);FADE_OUT[i]=Math.cos(t);}FADE_OUT[FADE_OUT.length-1]=0;
function voice(s,track,buffer,start,fadeIn){
 const source=s.ctx.createBufferSource(),g=s.ctx.createGain();source.buffer=buffer;source.playbackRate.value=1;source.connect(g);g.connect(s.input||s.master);
 const duration=track.cue_out_seconds-track.cue_in_seconds,v={source,gain:g,track,buffer,start,end:start+duration,released:false,fallback:false};s.voices.add(v);
 g.gain.setValueAtTime(0,start);
 if(fadeIn)g.gain.setValueCurveAtTime(FADE_IN,start,OVERLAP);else g.gain.linearRampToValueAtTime(1,start+.1);
 source.onended=()=>ended(s,v);source.start(start,track.cue_in_seconds,duration);return v;
}
function queue(s,track,buffer,fallback=false){
 const current=s.current;if(!valid(s)||!current||s.next)return false;
 const start=current.end-OVERLAP;
 if(start<s.ctx.currentTime+.03){s.error='late-transition';return false;}
 current.gain.gain.setValueCurveAtTime(FADE_OUT,start,OVERLAP);
 s.next=voice(s,track,buffer,start,true);s.next.fallback=fallback;diagnostics(s);return true;
}
function arm(s){
 if(!valid(s)||!s.current)return;
 if(s.loaded){const loaded=s.loaded;s.loaded=null;if(!queue(s,loaded.track,loaded.buffer,false)){s.loaded=loaded;return;}}
 else if(!queue(s,s.current.track,s.current.buffer,true))return;
 // The fallback is scheduled before any request: network delay alone cannot create an ending gap.
 if(s.next.fallback)prepareNext(s);
 diagnostics(s);
}
function ended(s,v){
 if(!valid(s)){releaseVoice(s,v);return;}
 if(v!==s.current){releaseVoice(s,v);return;}
 const next=s.next;s.current=next;s.next=null;releaseVoice(s,v);
 if(!next){halt('音声の接続に失敗しました。画面を一度タップすると再試行します。');return;}
 // A frozen event loop may return after both already-scheduled sources finished.
 if(next.end<=s.ctx.currentTime+.05){releaseVoice(s,next);s.current=null;halt('音声が中断されました。画面を一度タップすると再試行します。');return;}
 arm(s);
}
function acceptLoaded(s,track,buffer){
 if(!valid(s))return;
 const fallback=s.next;
 if(fallback?.fallback&&fallback.start>s.ctx.currentTime+.25){
  fallback.source.onended=null;try{fallback.source.stop();}catch(_){}releaseVoice(s,fallback);s.next=null;
  // The outgoing fade already has the exact tested timing, so it is not rescheduled.
  const replacement=voice(s,track,buffer,fallback.start,true);s.next=replacement;
 }else s.loaded={track,buffer};
 diagnostics(s);
}
async function prepareNext(s){
 if(!valid(s)||s.pending||s.loaded||!s.next?.fallback)return;
 const pending={controller:new AbortController()};s.pending=pending;const abort=()=>pending.controller.abort();s.abort.signal.addEventListener('abort',abort,{once:true});diagnostics(s);
 try{
  // At most two candidates per cue cycle; an already-scheduled repeat covers both failures.
  for(let attempt=0;attempt<2;attempt++){
   const track=drawTrack(s.tracks,s.current.track.id);
   try{const buffer=await loadTrack(s,track,pending.controller.signal);if(!valid(s)||s.pending!==pending)return;s.error=null;acceptLoaded(s,track,buffer);return;}
   catch(error){if(!valid(s)||pending.controller.signal.aborted)return;s.error=String(error.message||'audio load failed');}
  }
 }finally{s.abort.signal.removeEventListener('abort',abort);if(s.pending===pending)s.pending=null;diagnostics(s);}
}
function boundaryState(flow,quiet=false){const zero={mist:0,wave:0,lateral:0,particles:0,pan:0};if(quiet||!flow||flow.paused||(!Number.isFinite(flow.sceneProgress)&&!Number.isFinite(flow.transitionMix)))return zero;
 const p=Math.max(0,Math.min(1,Number(flow.sceneProgress)||0)),smooth=t=>t*t*(3-2*t),amount=Number.isFinite(flow.transitionMix)?Math.max(0,Math.min(1,flow.transitionMix)):(p<.4?1-smooth(p/.4):p>.6?smooth((p-.6)/.4):0);
 const mode=({mist:'mist',wave:'wave','horizontal-wave':'wave',lateral:'lateral','lateral-blend':'lateral',ribbon:'lateral','diagonal-flow':'lateral',particles:'particles','local-blends':'particles',vortex:'wave','depth-rings':'wave','contour-bands':'wave','light-bloom':'mist','chromatic-veil':'mist'})[flow.transition];if(!mode)return zero;
 zero[mode]=amount;zero.pan=mode==='lateral'?.28*amount*Math.max(-1,Math.min(1,Number.isFinite(flow.flowDirection)?flow.flowDirection:1)):0;return zero;
}
function colourGraph(s){const c=s.ctx;s.input=s.master;
 if(!c.createBiquadFilter||!c.createWaveShaper)return;
 const input=c.createGain(),dry=c.createGain(),warm=c.createGain(),low=c.createBiquadFilter(),resonance=c.createBiquadFilter(),pan=c.createStereoPanner?c.createStereoPanner():null,limit=c.createWaveShaper();
 dry.gain.value=1;warm.gain.value=0;low.type='lowpass';low.frequency.value=800;low.Q.value=.55;resonance.type='peaking';resonance.frequency.value=650;resonance.Q.value=.7;resonance.gain.value=0;
 // Linear below .45, soft knee thereafter; curve amplitude never exceeds .6.
 const curve=new Float32Array(4097);for(let i=0;i<curve.length;i++){const x=i/(curve.length-1)*2-1,a=Math.abs(x);curve[i]=Math.sign(x)*(a<=.45?a:.45+.15*Math.tanh((a-.45)/.15));}limit.curve=curve;
 s.master.disconnect();s.master.connect(limit);limit.connect(c.destination);
 input.connect(dry);input.connect(low);low.connect(warm);dry.connect(resonance);warm.connect(resonance);if(pan){resonance.connect(pan);pan.connect(s.master);}else resonance.connect(s.master);
 s.input=input;s.colour={dry,warm,resonance,pan,limit};
}
// Observe the final signal after gain and limiter; never synthesize a display trace.
function connectIndicator(s){
 const output=s.colour?.limit||s.master,c=s.ctx;let analyser=null;
 if(c.createAnalyser){try{analyser=c.createAnalyser();analyser.fftSize=512;output.disconnect();output.connect(analyser);analyser.connect(c.destination);}catch(_){try{output.disconnect();output.connect(c.destination);}catch(_){}analyser=null;}}
 const source={analyser,context:c,getState:()=>session===s&&s.ready&&!s.muted?'running':'waiting'};
 window.__reportAudioIndicatorSource=source;window.HomeSoundIndicator?.setSource(source);
}
function colourTo(s,b){if(!s.colour)return;const t=s.ctx.currentTime,k=.08,c=s.colour;
 c.dry.gain.setTargetAtTime(1-.35*b.mist,t,k);c.warm.gain.setTargetAtTime(.35*b.mist,t,k);
 c.resonance.gain.setTargetAtTime(b.wave+1.5*s.timbreBlend,t,k);c.resonance.frequency.setTargetAtTime(650-180*b.wave-260*s.timbreBlend,t,k);
 if(c.pan)c.pan.pan.setTargetAtTime(b.pan,t,k);
}
function tick(now){
 raf=0;const s=session;if(!s||!s.ready)return;if(document.hidden)return halt();if(s.ctx.state!=='running')return halt();
 // MP3 pitch and pace stay fixed; existing visual transitions still colour/pan the sound.
 if(now-lastPaint>=1000/24){lastPaint=now;colourTo(s,boundaryState(window.__reportFlow,staticMode()));}
 raf=requestAnimationFrame(tick);
}
async function begin(automatic=false){
 if(session||!Engine||document.hidden)return;const token=++revision;let s;
 try{
  const ctx=new Engine(),master=ctx.createGain();master.gain.value=0;master.connect(ctx.destination);
  s={ctx,master,voices:new Set(),current:null,next:null,loaded:null,pending:null,tracks:null,abort:new AbortController(),ready:false,muted:false,closed:false,timeout:0,timbreBlend:0,error:null};session=s;
  if(automatic&&ctx.state!=='running'){halt();return;}
  // Preserve synchronous resume inside a genuine gesture before any fetch/decode/await.
  const resumed=ctx.resume();resumed.catch(()=>{});
  colourGraph(s);connectIndicator(s);s.timeout=setTimeout(()=>{if(session===s)halt('音声の開始がタイムアウトしました。');},25000);
  await resumed;if(token!==revision||!valid(s)||ctx.state!=='running')throw Error('audio unavailable');
  ctx.onstatechange=()=>{if(session===s&&s.ready&&ctx.state!=='running')halt();};
  s.tracks=await catalog(s);if(token!==revision||!valid(s))return;
  let first=null,buffer=null;
  for(let attempt=0;attempt<2;attempt++){first=drawTrack(s.tracks);try{buffer=await loadTrack(s,first,s.abort.signal);break;}catch(error){if(!valid(s)||s.abort.signal.aborted)throw error;s.error=String(error.message||error);}}
  if(!buffer)throw Error('no initial audio');if(token!==revision||!valid(s))return;
  clearTimeout(s.timeout);s.error=null;s.current=voice(s,first,buffer,ctx.currentTime+.1,false);s.ready=true;arm(s);
  master.gain.setTargetAtTime(HEADROOM,ctx.currentTime,.25);window.HomeSoundIndicator?.refresh();lastPaint=0;raf=requestAnimationFrame(tick);diagnostics(s);
 }catch(_){if(token===revision)halt('音を再生できませんでした。画面を一度タップすると再試行できます。');else close(s);}
}
let tap=null,ignoreClickUntil=0,scrollProbeDone=false;
const editable=event=>!!event.target?.closest?.('input,textarea,select,[contenteditable]');
const eventTime=event=>Number.isFinite(event.timeStamp)?event.timeStamp:Date.now();
function genuineStart(event){
 if(event.isTrusted!==true||document.hidden||editable(event))return;
 if(!session)return begin(false);
 // A previous gesture may have left resume pending. Retry synchronously on the
 // same context in this genuine event, not after a timer or synthetic click.
 if(session.ctx.state==='suspended'||session.ctx.state==='interrupted'){
  try{session.ctx.resume().catch(()=>{});}catch(_){}
 }
}
window.addEventListener('scroll',()=>{if(!scrollProbeDone&&!session&&!document.hidden){scrollProbeDone=true;begin(true);}},{passive:true});
document.addEventListener('click',event=>{if(Date.now()<ignoreClickUntil||event.button>0)return;return genuineStart(event);},true);
document.addEventListener('keydown',event=>{if(event.repeat||event.ctrlKey||event.metaKey||event.altKey||!['Enter',' '].includes(event.key))return;return genuineStart(event);},true);
document.addEventListener('touchstart',event=>{tap=null;if(event.isTrusted!==true||event.touches?.length!==1||editable(event))return;const t=event.touches[0];tap={id:t.identifier,x:t.clientX,y:t.clientY,start:eventTime(event),moved:false};genuineStart(event);},{passive:true,capture:true});
document.addEventListener('touchmove',event=>{if(!tap)return;if(event.touches?.length!==1){tap.moved=true;return;}const t=event.touches[0];if(t.identifier!==tap.id||Math.hypot(t.clientX-tap.x,t.clientY-tap.y)>10)tap.moved=true;},{passive:true,capture:true});
document.addEventListener('touchend',event=>{const t=tap;tap=null;if(!t)return;genuineStart(event);if(t.moved||event.touches?.length||eventTime(event)-t.start>700){ignoreClickUntil=Date.now()+600;return;}return genuineStart(event);},{passive:true,capture:true});
document.addEventListener('touchcancel',()=>{tap=null;ignoreClickUntil=Date.now()+600;},{passive:true,capture:true});
document.addEventListener('visibilitychange',()=>{if(document.hidden){if(session)halt('ページ非表示中は音を休止します。');}else{scrollProbeDone=false;begin(true);}});window.addEventListener('pagehide',()=>halt());
// Reduced-motion/paused mode is read by tick; sound can continue at base pace.
window.addEventListener('pageshow',()=>{if(!document.hidden)begin(true);});
ui(Engine?'再生を準備します。ブラウザの制限時は画面を一度タップしてください。':'このブラウザでは音声機能を利用できません。論文はそのまま読めます。');
if(!document.hidden)begin(true);
})();
