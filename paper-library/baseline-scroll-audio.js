/* Original synthesized ambience. No external samples, requests, or autoplay. */
(()=>{'use strict';
const panel=document.querySelector('#scroll-audio');if(!panel)return;
const $=id=>document.querySelector('#'+id),start=$('audio-start'),mute=$('audio-mute'),stop=$('audio-stop'),volume=$('audio-volume'),status=$('audio-status'),summary=$('audio-summary');
const Engine=window.AudioContext||window.webkitAudioContext,reduced=matchMedia('(prefers-reduced-motion: reduce)');
const chords=[[48,55,62,64],[45,52,59,60],[41,48,55,57]],hz=m=>440*2**((m-69)/12);
let session=null,revision=0,raf=0,lastFrame=null,lastPaint=0,musicTime=0,lastFlow=null,stale=0,lastBeat=-1,lastChord=-1;
const staticMode=()=>reduced.matches||document.body.classList.contains('paused');
function ui(message){const on=!!session,muted=on&&session.muted;start.disabled=on||!Engine;mute.disabled=!on||!session.ready;stop.disabled=!on;volume.disabled=!Engine;mute.textContent=muted?'ミュート解除':'ミュート';mute.setAttribute('aria-pressed',String(!!muted));summary.textContent=on?(muted?'音：ミュート':session.ready?'音：オン':'音：準備中'):'音：オフ';if(message)status.textContent=message;}
function gain(){if(session)session.master.gain.setTargetAtTime(session.muted?0:Number(volume.value)/100,session.ctx.currentTime,.04);}
function close(s){if(!s)return;clearTimeout(s.timeout);s.ctx.onstatechange=null;try{s.master.gain.setValueAtTime(0,s.ctx.currentTime);s.ctx.close().catch(()=>{});}catch(_){}s.notes.clear();}
function halt(message='音を停止しました。再開は「音をオン」から。'){revision++;cancelAnimationFrame(raf);raf=0;const old=session;session=null;close(old);lastFrame=null;lastFlow=null;lastBeat=-1;lastChord=-1;ui(message);}
function note(s,m){if(s.notes.size>=8)return;const o=s.ctx.createOscillator(),g=s.ctx.createGain(),t=s.ctx.currentTime;o.type='sine';o.frequency.value=hz(m);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.065,t+.03);g.gain.exponentialRampToValueAtTime(.0001,t+1.6);o.connect(g);g.connect(s.master);s.notes.add(o);o.onended=()=>{s.notes.delete(o);o.disconnect();g.disconnect();};o.start(t);o.stop(t+1.65);}
// Two fixed-pitch banks overlap for 1.2 real seconds. Never bend sounding pitches.
function chordTo(s,index,initial=false){
 const t=s.ctx.currentTime;if(!initial&&t<s.fadeUntil)return false;
 const next=initial?0:1-s.activeBank,bank=s.banks[next];
 bank.oscillators.forEach((o,i)=>o.frequency.setValueAtTime(hz(chords[index][i]),t));
 if(initial){bank.gain.gain.setValueAtTime(.1,t);s.banks[1].gain.gain.setValueAtTime(0,t);}
 else{const old=s.banks[s.activeBank];old.gain.gain.setValueAtTime(.1,t);old.gain.gain.linearRampToValueAtTime(0,t+1.2);bank.gain.gain.setValueAtTime(0,t);bank.gain.gain.linearRampToValueAtTime(.1,t+1.2);}
 s.activeBank=next;s.fadeUntil=initial?t:t+1.2;return true;
}
function tick(now){raf=0;const s=session;if(!s||!s.ready)return;if(document.hidden)return halt('ページを離れたため音を停止しました。');if(s.ctx.state!=='running')return halt('音声が中断されました。「音をオン」で再開できます。');
 const dt=lastFrame===null?0:Math.max(0,Math.min(.1,(now-lastFrame)/1000));lastFrame=now;
 const flow=window.__reportFlow;let advance=dt;
 if(!staticMode()&&flow&&!flow.paused&&Number.isFinite(flow.phase)){
  if(lastFlow===null){lastFlow=flow.phase;stale=0;}else if(flow.phase>lastFlow){advance=Math.min(.5,flow.phase-lastFlow);lastFlow=flow.phase;stale=0;}else if(flow.phase===lastFlow){stale+=dt;advance=stale<.5?0:dt;}else{lastFlow=flow.phase;advance=0;}
 }else{lastFlow=null;stale=0;}
 musicTime+=advance;
 if(now-lastPaint>=1000/24){lastPaint=now;const chord=Math.floor(musicTime/8)%3,beat=Math.floor(musicTime/.9);if(chord!==lastChord){if(chordTo(s,chord))lastChord=chord;}if(beat!==lastBeat){if(!s.muted&&Number(volume.value)>0)note(s,chords[chord][beat%4]+24);lastBeat=beat;}}
 raf=requestAnimationFrame(tick);
}
start.addEventListener('click',async()=>{if(session||!Engine)return;if(document.hidden)return ui('ページを表示してから音をオンにしてください。');const token=++revision;let s;
 try{const ctx=new Engine(),master=ctx.createGain();master.gain.value=0;master.connect(ctx.destination);s={ctx,master,pads:[],banks:[],activeBank:0,fadeUntil:0,notes:new Set(),ready:false,muted:false,timeout:0};session=s;ui('音声を準備しています。停止ボタンで中止できます。');
 for(let b=0;b<2;b++){const bank={oscillators:[],gain:ctx.createGain()};bank.gain.gain.value=0;bank.gain.connect(master);s.banks.push(bank);for(let i=0;i<4;i++){const o=ctx.createOscillator();o.type='sine';o.frequency.value=hz(chords[0][i]);o.connect(bank.gain);o.start();bank.oscillators.push(o);s.pads.push(o);}}
 s.timeout=setTimeout(()=>{if(session===s)halt('音声の開始がタイムアウトしました。「音をオン」で再試行できます。');},5000);
 await ctx.resume();if(token!==revision||session!==s)return;if(document.hidden||ctx.state!=='running')throw Error('audio unavailable');clearTimeout(s.timeout);s.ready=true;
 ctx.onstatechange=()=>{if(session===s&&s.ready&&ctx.state!=='running')halt('音声が中断されました。「音をオン」で再開できます。');};
 const flow=window.__reportFlow;musicTime=(!staticMode()&&flow&&Number.isFinite(flow.phase))?Math.max(0,flow.phase):0;lastFlow=null;lastFrame=null;lastPaint=0;stale=0;lastChord=Math.floor(musicTime/8)%3;chordTo(s,lastChord,true);gain();ui(staticMode()?'再生中。静止設定のためスクロールでは変化しません。':'再生中。背景の時間に合わせ、スクロールで音の展開が進みます。');raf=requestAnimationFrame(tick);
 }catch(_){if(token===revision)halt('音を再生できませんでした。ブラウザ設定を確認し「音をオン」で再試行できます。');else close(s);}
});
mute.addEventListener('click',()=>{if(!session||!session.ready)return;session.muted=!session.muted;gain();ui(session.muted?'ミュート中。音楽の時間は進みます。':'ミュートを解除しました。');});stop.addEventListener('click',()=>halt());volume.addEventListener('input',gain);
document.addEventListener('visibilitychange',()=>{if(document.hidden&&session)halt('ページを離れたため音を停止しました。');});window.addEventListener('pagehide',()=>halt());
reduced.addEventListener('change',()=>{if(session)halt('動きの設定が変わったため音を停止しました。必要なら再開してください。');});
let wasStatic=staticMode();new MutationObserver(()=>{const next=staticMode();if(next!==wasStatic){wasStatic=next;if(session)halt('背景の動きの設定が変わったため音を停止しました。');}}).observe(document.body,{attributes:true,attributeFilter:['class']});
ui(Engine?'初期状態は無音です。音をオンにするとスクロールに合わせて響きが変わります。':'このブラウザでは音声機能を利用できません。論文はそのまま読めます。');
})();
