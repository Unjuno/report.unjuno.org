/* Read-only waveform display. Never creates/resumes an AudioContext or simulates
   a signal. The audio owner passes a tap after its final gain/limiter. */
(()=>{'use strict';
const root=document.querySelector('#audio-indicator');if(!root)return;
const path=root.querySelector('path'),label=root.querySelector('.audio-indicator-label');
const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
const flat='M2 11H56',states={waiting:['待機','音声: 再生待ち'],suspended:['休止','音声: 休止中'],unavailable:['非対応','音声: このブラウザでは利用できません'],error:['停止','音声: 再生できません'],unmeasured:['未計測','音声: 波形を取得できません'],silent:['無音','音声: 出力信号は無音です'],signal:['音声','音声: 出力信号を検出しています'],reduced:['音声','音声: 出力信号を検出しています。動きを減らす設定のため波形は静止表示です']};
let source=null,samples=null,frame=0,timer=0,lastDraw=-Infinity,fallback=(window.AudioContext||window.webkitAudioContext)?'waiting':'unavailable',currentState='',lastSignal=-Infinity;
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
function state(name){const next=states[name]?name:'waiting';if(next===currentState)return;currentState=next;root.dataset.state=next;label.textContent=states[next][0];root.setAttribute('aria-label',states[next][1]);}
function line(){if(path.getAttribute('d')!==flat)path.setAttribute('d',flat);}
function stop(){if(frame)cancelAnimationFrame(frame);if(timer)clearTimeout(timer);frame=0;timer=0;line();}
function sourceState(){
 if(document.hidden)return 'suspended';
 if(!source)return fallback;
 if(!source.context||source.context.state!=='running')return source.context?.state==='closed'?'error':'suspended';
 let reported;try{reported=source.getState?.();}catch(_){return 'error';}
 if(reported!=='running')return states[reported]?reported:'waiting';
 if(!source.analyser||!samples)return 'unmeasured';
 return 'running';
}
function paint(now){frame=0;const current=sourceState();if(current!=='running'){line();state(current);return;}
 const interval=reduced.matches?500:1000/24;
 if(now-lastDraw>=interval){lastDraw=now;
  try{source.analyser.getFloatTimeDomainData(samples);}catch(_){line();state('unmeasured');return;}
  let power=0;for(let i=0;i<samples.length;i++){const v=Number.isFinite(samples[i])?samples[i]:0;power+=v*v;}
  const rms=Math.sqrt(power/samples.length),hasSignal=rms>.00008;
  if(hasSignal)lastSignal=now;
  // Silence is always a flat line, even during the short label debounce.
  if(!hasSignal||reduced.matches)line();
  else{let d='';const points=58,step=samples.length/(points-1);for(let i=0;i<points;i++){const sample=samples[Math.min(samples.length-1,Math.floor(i*step))];const y=11-clamp(Number.isFinite(sample)?sample:0,-1,1)*9*7;d+=(i?'L':'M')+(2+i*54/(points-1)).toFixed(2)+' '+clamp(y,2,20).toFixed(2);}path.setAttribute('d',d);}
  state(hasSignal||now-lastSignal<350?(reduced.matches?'reduced':'signal'):'silent');
 }
 timer=setTimeout(()=>{timer=0;frame=requestAnimationFrame(paint);},interval);
}
function refresh(){stop();lastDraw=-Infinity;if(sourceState()==='running'){frame=requestAnimationFrame(paint);}else state(sourceState());}
function setSource(next){
 if(source?.context?.removeEventListener)source.context.removeEventListener('statechange',refresh);
 source=next||null;samples=null;lastSignal=-Infinity;
 if(source?.analyser&&typeof source.analyser.getFloatTimeDomainData==='function'){
  const size=Number(source.analyser.fftSize);if(Number.isInteger(size)&&size>=32&&size<=32768)samples=new Float32Array(size);
 }
 if(source?.context?.addEventListener)source.context.addEventListener('statechange',refresh);
 refresh();
}
function setState(next){fallback=states[next]?next:'waiting';setSource(null);}
window.HomeSoundIndicator=Object.freeze({setSource,setState,refresh});
document.addEventListener('visibilitychange',refresh);
window.addEventListener('pagehide',()=>{stop();state('suspended');});
window.addEventListener('pageshow',refresh);
if(reduced.addEventListener)reduced.addEventListener('change',refresh);else reduced.addListener?.(refresh);
setSource(window.__reportAudioIndicatorSource||null);
})();
