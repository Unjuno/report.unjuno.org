/* Original synthesized ambience. No external samples or requests. Autoplay is attempted only within browser policy. */
(()=>{'use strict';
const panel=document.querySelector('#scroll-audio');if(!panel)return;
const Engine=window.AudioContext||window.webkitAudioContext,reduced=matchMedia('(prefers-reduced-motion: reduce)');
const chords=[[48,55,62,64],[45,52,59,60],[41,48,55,57]],hz=m=>440*2**((m-69)/12);
const algorithms=[
 {name:'drifting-arpeggio',hold:8,minStay:24,maxStay:40,rate:1.15,attack:.008,decay:.65,level:.06,octave:24,noteType:'triangle',padType:'sine',padLevel:.1,accents:[1,.65,.82,.65],palette:chords},
 {name:'open-resonance',hold:12,minStay:36,maxStay:56,rate:.45,attack:.2,decay:3.2,level:.045,octave:12,noteType:'sine',padType:'triangle',padLevel:.075,accents:[.85,1,.9,.75],palette:[[48,60,67,74],[45,57,64,71],[41,53,60,67]]}
];
function stayFor(index,random=Math.random){const a=algorithms[index];return a.minStay+(a.maxStay-a.minStay)*Math.max(0,Math.min(1,random()));}
let session=null,revision=0,raf=0,lastFrame=null,lastPaint=0,musicTime=0,lastFlow=null,stale=0,lastBeat=-1,lastChord=-1;
const staticMode=()=>reduced.matches||document.body.classList.contains('paused');
// No visible or announced audio prompts. Genuine touch start/end attempt normal
// AudioContext resume; the browser may still reject a sliding gesture.
function ui(){}
// Site output at unity (100%); retain the downstream limiter and a soft startup.
function gain(){if(session)session.master.gain.setTargetAtTime(session.muted?0:1,session.ctx.currentTime,session.muted?.04:.25);}
function close(s){if(!s)return;clearTimeout(s.timeout);s.ctx.onstatechange=null;try{s.master.gain.setValueAtTime(0,s.ctx.currentTime);s.ctx.close().catch(()=>{});}catch(_){}s.notes.clear();}
function halt(message='再生待ちです。画面を一度タップすると再試行します。'){revision++;cancelAnimationFrame(raf);raf=0;const old=session;session=null;window.__reportAudioIndicatorSource=null;window.HomeSoundIndicator?.setState(document.hidden?'suspended':Engine?'waiting':'unavailable');close(old);lastFrame=null;lastFlow=null;lastBeat=-1;lastChord=-1;ui(message);}
function transitionPlan(flow){const mode=flow?.transition||'';if(/mist|bloom|veil/.test(mode))return {kind:'mist',duration:2.4};if(/wave|vortex|rings|contour/.test(mode))return {kind:'wave',duration:2.1};if(/lateral|ribbon|diagonal/.test(mode))return {kind:'lateral',duration:1.8};if(/particles|local-blends/.test(mode))return {kind:'particles',duration:1.6};return {kind:'mist',duration:2.2};}
function blendWeight(x,kind){x=Math.max(0,Math.min(1,x));const smooth=t=>t*t*(3-2*t);return kind==='wave'?(1-Math.cos(Math.PI*x))/2:kind==='particles'?smooth(smooth(x)):kind==='lateral'?smooth(x):x*x*x*(x*(x*6-15)+10);}
function musicBlend(s){const p=s.musicMix;if(!p)return {from:s.algorithm,to:s.algorithm,weight:1};const x=(s.ctx.currentTime-p.start)/p.duration;if(x>=1){s.musicMix=null;return {from:s.algorithm,to:s.algorithm,weight:1};}return {from:p.from,to:p.to,weight:blendWeight(x,p.kind)};}
function note(s,m){if(s.notes.size>=8)return;const mix=musicBlend(s),index=s.noteIndex++,beat=Math.floor(musicTime/.9),voices=mix.from===mix.to?[[mix.to,1]]:[[mix.from,1-mix.weight],[mix.to,mix.weight]];
 const token={remaining:0};s.notes.add(token);
 for(const [which,weight] of voices){if(weight<=.0001)continue;const a=algorithms[which],midi=a.palette[Math.floor(musicTime/a.hold)%3][which?3-beat%4:beat%4]+a.octave,o=s.ctx.createOscillator(),g=s.ctx.createGain(),t=s.ctx.currentTime,level=a.level*a.accents[index%4]*weight;
  token.remaining++;o.type=a.noteType;o.frequency.value=hz(midi);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(level,t+a.attack);g.gain.exponentialRampToValueAtTime(Math.min(.0001,level*.01),t+a.decay);o.connect(g);g.connect(s.input||s.master);o.onended=()=>{if(--token.remaining===0)s.notes.delete(token);o.disconnect();g.disconnect();};o.start(t);o.stop(t+a.decay+.05);
 }
 if(token.remaining===0)s.notes.delete(token);
}
// Image boundary strength uses the same .4/.6 clear window as the renderer.
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
// Fixed-pitch banks use complementary soft curves; never retune a sounding bank.
function chordTo(s,index,initial=false){
 const t=s.ctx.currentTime;if(!initial&&t<s.fadeUntil)return false;
 const next=initial?0:1-s.activeBank,bank=s.banks[next];
 const a=algorithms[Math.floor(index/3)];bank.level=a.padLevel;bank.oscillators.forEach((o,i)=>{o.type=a.padType;o.frequency.setValueAtTime(hz(a.palette[index%3][i]),t);});
 if(initial){bank.gain.gain.setValueAtTime(bank.level,t);s.banks[1].gain.gain.setValueAtTime(0,t);}
 else{const old=s.banks[s.activeBank],flow=window.__reportFlow,plan=s.musicMix||transitionPlan(flow),speed=Math.max(1,Math.min(7.4,flow?.pvSpeed||s.noteSpeed||1)),duration=s.musicMix?Math.max(.2,plan.start+plan.duration-t):Math.max(1.2,Math.min(plan.duration,a.hold/speed*.8)),out=new Float32Array(65),incoming=new Float32Array(65);
  for(let i=0;i<65;i++){const w=blendWeight(i/64,plan.kind);out[i]=(old.level??.1)*(1-w);incoming[i]=bank.level*w;}
  if(old.gain.gain.setValueCurveAtTime&&bank.gain.gain.setValueCurveAtTime){old.gain.gain.cancelScheduledValues(t);bank.gain.gain.cancelScheduledValues(t);old.gain.gain.setValueCurveAtTime(out,t,duration);bank.gain.gain.setValueCurveAtTime(incoming,t,duration);}else{old.gain.gain.setValueAtTime(old.level??.1,t);old.gain.gain.linearRampToValueAtTime(0,t+duration);bank.gain.gain.setValueAtTime(0,t);bank.gain.gain.linearRampToValueAtTime(bank.level,t+duration);}
  s.fadeUntil=t+duration;
 }
 s.activeBank=next;if(initial)s.fadeUntil=t;return true;
}
function tick(now){raf=0;const s=session;if(!s||!s.ready)return;if(document.hidden)return halt('ページを離れたため音を停止しました。');if(s.ctx.state!=='running')return halt('音声が中断されました。画面を一度タップすると再開を試みます。');
 const dt=lastFrame===null?0:Math.max(0,Math.min(.1,(now-lastFrame)/1000));lastFrame=now;
 const flow=window.__reportFlow;let advance=dt;
 if(!staticMode()&&flow&&!flow.paused&&Number.isFinite(flow.phase)){
  if(lastFlow===null){lastFlow=flow.phase;stale=0;}else if(flow.phase>lastFlow){advance=Math.min(.8,flow.phase-lastFlow);lastFlow=flow.phase;stale=0;}else if(flow.phase===lastFlow){stale+=dt;advance=stale<.5?0:dt;}else{lastFlow=flow.phase;advance=0;}
 }else{lastFlow=null;stale=0;}
 musicTime+=advance;
 if(musicTime>=s.nextSwitch){const plan=transitionPlan(flow);s.musicMix={...plan,from:s.algorithm,to:1-s.algorithm,start:s.ctx.currentTime};s.algorithm=1-s.algorithm;s.noteIndex=0;s.nextSwitch=musicTime+stayFor(s.algorithm);}
 const algorithm=algorithms[s.algorithm];
 const mix=musicBlend(s);s.timbreBlend=mix.from*(1-mix.weight)+mix.to*mix.weight;
 s.algorithmRate=algorithms[mix.from].rate*(1-mix.weight)+algorithms[mix.to].rate*mix.weight;
 const boundary=boundaryState(flow,staticMode());
 // Harmony keeps the authoritative PV clock. Only short-note density is softened.
 const intensity=!staticMode()&&flow&&!flow.paused&&Number.isFinite(flow.scrollEnergy)?Math.max(0,Math.min(1,flow.scrollEnergy)):0;
 const targetSpeed=!staticMode()&&flow&&!flow.paused&&Number.isFinite(flow.pvSpeed)?Math.max(1,Math.min(7.4,flow.pvSpeed)):1+4*intensity;
 s.noteSpeed+=(targetSpeed-s.noteSpeed)*(1-Math.exp(-dt/.35));
 const base=1/.9,ceiling=3.8;
 s.noteRate=base+(ceiling-base)*(1-Math.exp(-Math.max(0,s.noteSpeed/.9-base)/(ceiling-base)));
 s.particleMix+=(boundary.particles-s.particleMix)*(1-Math.exp(-dt/.15));
 s.noteRate=Math.min(ceiling,s.noteRate*(1+.2*s.particleMix)*s.algorithmRate);
 s.notePhase+=s.noteRate*dt;
 if(now-lastPaint>=1000/24){lastPaint=now;colourTo(s,boundary);const chord=Math.floor(musicTime/algorithm.hold)%3,key=s.algorithm*3+chord,beat=Math.floor(musicTime/.9);if(key!==lastChord){if(chordTo(s,key))lastChord=key;}if(s.notePhase>=1){s.notePhase%=1;if(!s.muted)note(s,algorithm.palette[chord][(s.algorithm?3-beat%4:beat%4)]+algorithm.octave);lastBeat=beat;}}
 raf=requestAnimationFrame(tick);
}
async function begin(automatic=false){if(session||!Engine)return;if(document.hidden)return ui('ページを表示してから音をオンにしてください。');const token=++revision;let s;
 try{const ctx=new Engine(),master=ctx.createGain();master.gain.value=0;master.connect(ctx.destination);s={ctx,master,pads:[],banks:[],activeBank:0,fadeUntil:0,notePhase:1,noteRate:1/.9,noteSpeed:1,particleMix:0,notes:new Set(),ready:false,muted:false,timeout:0};s.algorithm=Math.random()<.5?0:1;s.timbreBlend=s.algorithm;s.noteIndex=0;s.algorithmRate=algorithms[s.algorithm].rate;s.nextSwitch=Infinity;session=s;ui('音声を準備しています。');if(automatic&&ctx.state!=='running'){halt('ブラウザの制限で再生待ちです。画面を一度タップしてください。');return;}
 // Resume directly inside the genuine gesture, before graph work or any await.
 const resumed=ctx.resume();resumed.catch(()=>{});
 colourGraph(s);connectIndicator(s);
 for(let b=0;b<2;b++){const bank={oscillators:[],gain:ctx.createGain()};bank.gain.gain.value=0;bank.gain.connect(s.input||master);s.banks.push(bank);for(let i=0;i<4;i++){const o=ctx.createOscillator();o.type='sine';o.frequency.value=hz(chords[0][i]);o.connect(bank.gain);o.start();bank.oscillators.push(o);s.pads.push(o);}}
 s.timeout=setTimeout(()=>{if(session===s)halt('音声の開始がタイムアウトしました。画面を一度タップすると再試行できます。');},5000);
 await resumed;if(token!==revision||session!==s)return;if(document.hidden||ctx.state!=='running')throw Error('audio unavailable');clearTimeout(s.timeout);s.ready=true;window.HomeSoundIndicator?.refresh();
 ctx.onstatechange=()=>{if(session===s&&s.ready&&ctx.state!=='running')halt('音声が中断されました。画面を一度タップすると再開を試みます。');};
 const flow=window.__reportFlow;musicTime=(!staticMode()&&flow&&Number.isFinite(flow.phase))?Math.max(0,flow.phase):0;lastFlow=null;lastFrame=null;lastPaint=0;stale=0;s.nextSwitch=musicTime+stayFor(s.algorithm);lastChord=s.algorithm*3+Math.floor(musicTime/algorithms[s.algorithm].hold)%3;chordTo(s,lastChord,true);gain();ui(staticMode()?'再生中。静止設定のためスクロールでは変化しません。':'再生中。背景の時間に合わせ、スクロールで音の展開が進みます。');raf=requestAnimationFrame(tick);
 }catch(_){if(token===revision)halt('音を再生できませんでした。ブラウザ設定を確認し画面を一度タップすると再試行できます。');else close(s);}
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
