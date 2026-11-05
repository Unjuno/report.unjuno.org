(function(){
'use strict';
const root=document.getElementById('atlas'),$=s=>root.querySelector(s);
const input=$('#paper-search'),space=$('#research-space'),canvas=$('#research-canvas'),ctx=canvas.getContext('2d');
const previous=$('#previous-paper'),next=$('#next-paper'),status=$('#result-status'),empty=$('#empty-state');
const groupStatus=$('#group-status'),selectedAction=$('#selected-action');
const title=$('#selected-title'),open=$('#open-paper'),unavailable=$('#unavailable');
const nodes=Array.from(root.querySelectorAll('[data-paper]')).map((element,index)=>({element,index,id:element.dataset.id,sample:element.hasAttribute('data-sample'),search:(element.dataset.search||'').normalize('NFKC').toLocaleLowerCase(),title:element.querySelector('.node-title').textContent.replace(/\s+/g,' ').trim()}));
// Keep exploration in this history entry, without changing the URL or sending a query.
const HISTORY_KEY='reportHome';
function plainRecord(value){if(!value||typeof value!=='object'||Array.isArray(value))return false;const proto=Object.getPrototypeOf(value);return proto===null||Object.getPrototypeOf(proto)===null;}
function readReadingState(){
 try{const state=window.history?.state;if(!plainRecord(state))return null;const saved=state[HISTORY_KEY];
  if(!plainRecord(saved)||saved.version!==1||typeof saved.query!=='string'||saved.query.length>2048)return null;
  if(saved.selectedId!==null&&!nodes.some(record=>record.id===saved.selectedId))return null;
  return saved;
 }catch(_){return null;}
}
const restoredReading=readReadingState();if(restoredReading)input.value=restoredReading.query;
let committedQuery=input.value;
let visible=nodes.slice(),selectedId=restoredReading?.selectedId||nodes[0]?.id||null,drag=null,suppressClick=null;
function rememberReadingState(){
 try{const history=window.history;if(!history?.replaceState)return;const state=history.state;if(state!==null&&!plainRecord(state))return;
  const saved=committedQuery.length<=2048?{version:1,query:committedQuery,selectedId}:null,old=state?.[HISTORY_KEY];
  if(old?.version===1&&saved&&old.query===saved.query&&old.selectedId===saved.selectedId)return;
  history.replaceState({...state,[HISTORY_KEY]:saved},'');
 }catch(_){/* History retention is optional; reading and search must still work. */}
}
let shownRecords=nodes.slice(0,3),hoveredId=null,focusedId=null,previewSource='pointer';
const narrow=window.matchMedia('(max-width: 650px)'),reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
const motionButton=$('#motion-toggle'),observeButton=$('#observe-wave'),probeStatus=$('#probe-status');
let structure=false,representation=0,revealFrom=0,revealStart=0;
const world=$('#specimen-space'),art=document.createElement('canvas'),artCtx=art.getContext('2d');
const canRender=!!ctx&&!!artCtx;
const surfaceCanvas=document.createElement('canvas'),surface=canRender?((window.ResearchReality||window.ResearchSurface)?.create(surfaceCanvas,()=>draw())||null):null;
let surfaceActive=!!surface,viewController=null;
const viewElement=$('#view-control'),viewReset=$('#view-reset'),viewHelp=$('#view-help');
const equation=$('#geometry-equation'),materialButton=$('#material-view'),equationButton=$('#equation-view');
const materialOptions=$('#material-options'),metalMaterial=$('#metal-material'),stoneMaterial=$('#stone-material');
let materialKind='stone';surface?.setMaterial?.(materialKind);
const locations=nodes.map((record,index)=>{const element=$('#location-'+index),label=element.querySelector?.('.location-label');return {record,element,label,fullLabel:label?.textContent||record.title,labelWidth:0};});
let motionEnabled=true,inView=true,frameId=null,lastFrame=null,phase=0,width=0,height=0,artKey='',points=[];
function locationPoints(){
 const positions=narrow.matches?[[.10,.25],[.35,.28],[.60,.24],[.88,.27],[.73,.32],[.19,.34]]:[[.60,.33],[.77,.18],[.92,.35],[.84,.68],[.61,.70],[.96,.61]];
 return positions.map(([x,y])=>({x:x*width,y:y*(narrow.matches?574:height)}));
}
function renderField(){
 if(!ctx||!artCtx)return;
 artCtx.clearRect(0,0,width,height);
 // A shared visual surface, not a citation network or measured scientific data.
 const radius=narrow.matches?574*.11:height*.29;
 function traceSurface(u,reverse=false){
  const spread=(u-.5)*radius,vertices=points.map((point,i)=>({x:point.x+Math.sin(i*1.9)*spread,y:point.y+Math.cos(i*1.4)*spread*.65}));
  const segments=vertices.map((a,i)=>{const b=vertices[(i+1)%vertices.length];return {a,b,c:{x:a.x+(b.x-a.x)*.20+(b.y-a.y)*.28,y:a.y+(b.y-a.y)*.20-(b.x-a.x)*.28},d:{x:a.x+(b.x-a.x)*.80+(b.y-a.y)*.28,y:a.y+(b.y-a.y)*.80-(b.x-a.x)*.28}};});
  const ordered=reverse?segments.slice().reverse():segments;
  artCtx.moveTo(ordered[0][reverse?'b':'a'].x,ordered[0][reverse?'b':'a'].y);
  for(const segment of ordered){const c=segment[reverse?'d':'c'],d=segment[reverse?'c':'d'],end=segment[reverse?'a':'b'];artCtx.bezierCurveTo(c.x,c.y,d.x,d.y,end.x,end.y);}
  artCtx.closePath();
 }
 // Three translucent surfaces share the exact contour geometry. One light direction.
 for(const start of [.06,.36,.68]){
  artCtx.beginPath();traceSurface(start);traceSurface(start+.18,true);
  const material=artCtx.createLinearGradient(width*.55,height*.15,width*.94,height*.85);
  material.addColorStop(0,'rgba(70,89,86,.16)');material.addColorStop(.35,'rgba(173,160,132,.23)');material.addColorStop(.48,'rgba(255,255,250,.8)');material.addColorStop(.6,'rgba(173,185,180,.29)');material.addColorStop(1,'rgba(60,80,77,.20)');
  artCtx.fillStyle=material;artCtx.shadowColor='rgba(57,51,39,.08)';artCtx.shadowBlur=14;artCtx.shadowOffsetY=10;if(!structure)artCtx.fill('evenodd');artCtx.shadowBlur=0;artCtx.shadowOffsetY=0;
 }
 for(let ribbon=0;ribbon<42;ribbon++){
  const u=ribbon/41,spread=(u-.5)*radius;
  artCtx.beginPath();
  for(let i=0;i<points.length;i++){
   const a=points[i],b=points[(i+1)%points.length];
   const ax=a.x+Math.sin(i*1.9)*spread,ay=a.y+Math.cos(i*1.4)*spread*.65;
   const nextIndex=(i+1)%points.length,bx=b.x+Math.sin(nextIndex*1.9)*spread,by=b.y+Math.cos(nextIndex*1.4)*spread*.65;
   if(i===0)artCtx.moveTo(ax,ay);
   artCtx.bezierCurveTo(ax+(bx-ax)*.20+(by-ay)*.28,ay+(by-ay)*.20-(bx-ax)*.28,ax+(bx-ax)*.80+(by-ay)*.28,ay+(by-ay)*.80-(bx-ax)*.28,bx,by);
  }
  const ink=artCtx.createLinearGradient(width*.45,0,width,height);
  ink.addColorStop(0,'rgba(71,81,80,.08)');ink.addColorStop(.25,'rgba(133,170,174,.65)');ink.addColorStop(.48,'rgba(179,159,124,.56)');ink.addColorStop(.58,'rgba(255,255,250,.92)');ink.addColorStop(.78,'rgba(149,182,186,.65)');ink.addColorStop(1,'rgba(68,82,81,.12)');
  artCtx.shadowColor='rgba(46,43,38,.12)';artCtx.shadowBlur=3;artCtx.shadowOffsetY=3;
  artCtx.strokeStyle=ink;artCtx.lineWidth=ribbon%7===0?2.4:1.1;if(structure||ribbon%7===0)artCtx.stroke();
  artCtx.shadowBlur=0;artCtx.shadowOffsetY=0;
 }
}
// Label metrics are prepared during layout, never in the animation loop.
function measureLabels(){
 for(const location of locations){
  const label=location.label;if(!label)continue;
  const style=window.getComputedStyle?.(label),fontSize=parseFloat(style?.fontSize)||(narrow.matches?11:12);
  if(artCtx)artCtx.font=style?.font||fontSize+'px sans-serif';
  const textWidth=text=>{const measured=artCtx?.measureText?.(text)?.width;return Number.isFinite(measured)?measured:text.length*fontSize;};
  const available=Math.max(0,width-16),full=location.fullLabel;
  let text=full;
  if(textWidth(text)>available){
   const chars=Array.from(full);let lo=0,hi=chars.length;
   while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(textWidth(chars.slice(0,mid).join('')+'…')<=available)lo=mid;else hi=mid-1;}
   text=chars.slice(0,lo).join('')+'…';
  }
  label.textContent=text;location.labelWidth=textWidth(text);
 }
}
function placeLabel(location,point){
 const label=location.label;if(!label)return;
 const leftPreferred=point.x>width*(narrow.matches?.5:.8);
 const desired=point.x+(leftPreferred?-18-location.labelWidth:18);
 const left=Math.max(8,Math.min(desired,width-8-location.labelWidth));
 label.setAttribute('text-anchor','start');label.setAttribute('x',String(left-point.x));
}
function measure(){
 width=world.clientWidth;height=world.clientHeight;measureLabels();
 const dpr=Math.min(window.devicePixelRatio||1,2),key=[width,height,dpr,representation,narrow.matches].join(':');
 if(key===artKey)return;artKey=key;points=locationPoints();
 canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);art.width=canvas.width;art.height=canvas.height;
 if(ctx)ctx.setTransform(dpr,0,0,dpr,0,0);if(artCtx)artCtx.setTransform(dpr,0,0,dpr,0,0);
 $('#location-map').setAttribute('viewBox','0 0 '+width+' '+height);
 $('#location-map').style.visibility=canRender&&!surface?.isReality?'visible':'hidden';
 $('#location-map').setAttribute('aria-hidden',String(!canRender||!!surface?.isReality));
 locations.forEach((location,index)=>{
  const point=points[index];
  location.element.setAttribute('transform','translate('+point.x+' '+point.y+')');
  placeLabel(location,point);
 });
 if(surface)surface.resize(width,height,dpr,narrow.matches);
 if(!surface?.isReality)renderField();
}
function layout(){measure();draw();}
// Preview points to an entry without changing the committed reading destination.
function previewId(){return previewSource==='focus'?(focusedId||hoveredId):(hoveredId||focusedId);}
function syncPreview(redraw=true){
 const id=previewId();
 nodes.forEach(record=>record.element.setAttribute('data-preview',String(record.id===id)));
 locations.forEach(({record,element})=>element.setAttribute('data-preview',String(record.id===id)));
 if(redraw&&frameId===null)draw();
}
function bindPreview(element,record){
 element.addEventListener('pointerenter',event=>{if(event.pointerType==='touch'||!shownRecords.includes(record))return;hoveredId=record.id;previewSource='pointer';syncPreview();});
 element.addEventListener('pointerleave',()=>{if(hoveredId===record.id){hoveredId=null;syncPreview();}});
 element.addEventListener('focus',()=>{if(shownRecords.includes(record)){focusedId=record.id;previewSource='focus';syncPreview();}});
 element.addEventListener('blur',()=>{if(focusedId===record.id){focusedId=null;syncPreview();}});
}
function representationBlend(){
 const target=representation>0?1:0;
 if(!motionEnabled||reduced.matches||document.hidden||!inView||!surfaceActive){revealFrom=target;return target;}
 const progress=Math.max(0,Math.min(1,(phase-revealStart)/.18));
 return revealFrom+(target-revealFrom)*(1-Math.pow(1-progress,3));
}
function draw(){
 if(!ctx||!artCtx)return;ctx.clearRect(0,0,width,height);
 if(surface){
  if(surface.isReality)surface.setTitle?.(nodes.find(record=>record.id===selectedId)?.title||'論文ノート');
  const projected=surface.draw(phase,representation,nodes.findIndex(record=>record.id===(previewId()||selectedId)),representationBlend(),nodes.findIndex(record=>record.id===selectedId),motionEnabled&&!reduced.matches&&!document.hidden&&inView);
  if(projected){surfaceActive=true;syncMaterialControls();if(surface.isReality){[materialButton,observeButton,equationButton].forEach(button=>button.disabled=!!surface.failed);if(surface.failed)probeStatus.textContent='背景画像を読み込めません。論文は読めます。';}if(viewController)viewController.setEnabled(!surface.isReality);syncEquation();ctx.drawImage(surfaceCanvas,0,0,surfaceCanvas.width,surfaceCanvas.height,0,0,width,height);
   locations.forEach((location,index)=>{const {element,label}=location,point=projected[index];element.setAttribute('transform','translate('+point.x+' '+point.y+')');element.style.opacity=point.front?'1':'.3';if(label)label.style.visibility=point.front?'visible':'hidden';placeLabel(location,point);});return;}
  surfaceActive=false;syncMaterialControls();if(viewController)viewController.setEnabled(false);syncEquation();
 }
 locations.forEach((location,index)=>{const {element,label}=location,point=points[index];element.setAttribute('transform','translate('+point.x+' '+point.y+')');element.style.opacity='1';if(label)label.style.visibility='visible';placeLabel(location,point);});
 ctx.save();ctx.globalAlpha=.87+.13*Math.cos(phase*.35);ctx.drawImage(art,0,0,art.width,art.height,0,0,width,height);ctx.restore();
 const index=nodes.findIndex(record=>record.id===selectedId),point=points[index];
 if(point&&visible.length){ctx.beginPath();ctx.arc(point.x,point.y,22+2*Math.sin(phase*.6),0,Math.PI*2);ctx.strokeStyle='rgba(244,199,138,.55)';ctx.lineWidth=1;ctx.stroke();}
}
function syncEquation(){
 const sectionText=surfaceActive&&representation===2?surface.sectionLabel?.(nodes.findIndex(record=>record.id===selectedId))||'':'';
 const text=surfaceActive?surface.equation+(sectionText?'\n'+sectionText:''):'B(t) = (1−t)³ P₀ + 3(1−t)²t P₁ + 3(1−t)t² P₂ + t³ P₃';
 if(equation.textContent!==text)equation.textContent=text;
}
function syncMaterialControls(){const hide=representation!==0||!surfaceActive||!canRender||!!surface?.isReality;if(hide&&[metalMaterial,stoneMaterial].includes(document.activeElement))focusVisible([materialButton,observeButton,equationButton][representation]);materialOptions.hidden=hide;metalMaterial.disabled=stoneMaterial.disabled=!surfaceActive||!canRender;}
function chooseMaterial(kind){if(!surfaceActive||!canRender)return;materialKind=kind;surface.setMaterial?.(kind);metalMaterial.setAttribute('aria-pressed',String(kind==='metal'));stoneMaterial.setAttribute('aria-pressed',String(kind==='stone'));draw();}
metalMaterial.addEventListener('click',()=>chooseMaterial('metal'));stoneMaterial.addEventListener('click',()=>chooseMaterial('stone'));syncMaterialControls();
function setRepresentation(mode){
 if(!ctx||!artCtx)return;revealFrom=representationBlend();revealStart=phase;representation=mode;structure=representation>0;
 [materialButton,observeButton,equationButton].forEach((button,index)=>button.setAttribute('aria-pressed',String(index===representation)));
 equation.hidden=representation!==2||!!surface?.isReality;syncMaterialControls();
 syncEquation();
 canvas.style.opacity=surface?.isReality?'1':representation===2?'.3':'1';
 probeStatus.textContent=surface?.isReality?['生成した同じ場所の全景を表示しています。','川辺へ視点を近づけています。','街へ視点を近づけています。'][representation]:['面の質感を表示しています。','同じ面の構造線を表示しています。','表示中の面を生成する式です。論文の実験データではありません。'][representation];layout();
}
[materialButton,observeButton,equationButton].forEach((button,index)=>{button.disabled=!ctx||!artCtx;button.addEventListener('click',()=>setRepresentation(index));});
locations.forEach(({record,element})=>{
 bindPreview(element,record);bindPreview(record.element,record);
 element.addEventListener('click',()=>select(record.id,false,true));
 element.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();select(record.id,true,true);}});
});
// Optional, user-started feedback. Search and reading never require sound.
const soundButton=$('#sound-toggle');
const AudioEngine=window.AudioContext||window.webkitAudioContext;
let soundEnabled=false,audio=null,master=null,audioRevision=0;
soundButton.disabled=!AudioEngine;
if(!AudioEngine)soundButton.textContent='音声非対応';
function playSelection(index){
 if(!soundEnabled||!audio||audio.state!=='running'||!master)return;
 const time=audio.currentTime,oscillator=audio.createOscillator(),gain=audio.createGain();
 oscillator.type='sine';oscillator.frequency.setValueAtTime([174.61,220,261.63,293.66,349.23,440][Math.max(0,index)%6],time);
 gain.gain.setValueAtTime(0,time);gain.gain.linearRampToValueAtTime(.045,time+.008);gain.gain.exponentialRampToValueAtTime(.0001,time+.18);
 oscillator.connect(gain);gain.connect(master);oscillator.start(time);oscillator.stop(time+.20);
 oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
}
soundButton.addEventListener('click',async()=>{
 if(!AudioEngine)return;
 const revision=++audioRevision;
 soundEnabled=!soundEnabled;
 soundButton.setAttribute('aria-pressed',String(soundEnabled));soundButton.textContent=soundEnabled?'音を消す':'音を入れる';
 if(!soundEnabled){if(master)master.gain.setValueAtTime(0,audio.currentTime);return;}
 try{
  if(!audio){audio=new AudioEngine();master=audio.createGain();master.connect(audio.destination);}
  await audio.resume();
  if(revision!==audioRevision)return;
  if(soundEnabled){master.gain.setValueAtTime(1,audio.currentTime);playSelection(nodes.findIndex(record=>record.id===selectedId));}
 }catch(error){
  if(revision!==audioRevision)return;
  soundEnabled=false;if(master)master.gain.setValueAtTime(0,audio.currentTime);
  soundButton.setAttribute('aria-pressed','false');soundButton.textContent='音を入れる';
 }
});
function focusVisible(element){
 element.focus({preventScroll:true});
 const rect=element.getBoundingClientRect();
 if(rect.top<0||rect.bottom>window.innerHeight)element.scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'});
}
function select(id,focus=false,audible=false){
 const record=visible.find(item=>item.id===id)||visible[0];selectedId=record?.id||null;
 if(audible&&record)playSelection(record.index);
 const index=visible.indexOf(record),start=Math.floor(Math.max(0,index)/3)*3,shown=visible.slice(start,start+3);shownRecords=shown;
 if(!shown.some(item=>item.id===hoveredId))hoveredId=null;if(!shown.some(item=>item.id===focusedId))focusedId=null;
 nodes.forEach(item=>{item.element.hidden=!shown.includes(item);if(item.element.parentElement?.classList.contains('paper-slot'))item.element.parentElement.hidden=item.element.hidden;});
 nodes.forEach(item=>{item.element.setAttribute('aria-pressed',String(item.id===selectedId));item.element.setAttribute('tabindex',item.id===selectedId?'0':'-1');});
 locations.forEach(({record,element})=>{element.style.display=canRender&&!surface?.isReality&&shown.includes(record)?'':'none';element.setAttribute('aria-pressed',String(record.id===selectedId));element.setAttribute('data-in-group',String(shown.includes(record)));element.setAttribute('tabindex',canRender&&!surface?.isReality&&shown.includes(record)?'0':'-1');});
 if(record)record.element.after(selectedAction);selectedAction.hidden=!record;
 title.textContent=record?record.title:'選択なし';open.hidden=!record||!record.element.dataset.href;unavailable.hidden=!record||!record.sample;
 if(record?.element.dataset.href)open.href=record.element.dataset.href;
 previous.disabled=!visible.length||start===0;next.disabled=!visible.length||start+3>=visible.length;groupStatus.textContent=visible.length?(start+1)+'–'+Math.min(start+3,visible.length)+' / '+visible.length:'0 / 0';
 const hiddenFocus=nodes.some(item=>item.element===document.activeElement&&item.element.hidden)||(document.activeElement===open&&open.hidden)||locations.some(item=>item.element===document.activeElement&&!shown.includes(item.record));
 if((focus||hiddenFocus)&&record)focusVisible(record.element);else if(hiddenFocus)input.focus();syncPreview(false);measure();draw();rememberReadingState();
}
function move(delta,focus=false,originId=selectedId){if(!visible.length)return;const index=visible.findIndex(record=>record.id===originId);select(visible[Math.max(0,Math.min(visible.length-1,index+delta))].id,focus,true);}
function search(){committedQuery=input.value;const terms=input.value.normalize('NFKC').toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);visible=nodes.filter(record=>{const match=terms.every(term=>record.search.includes(term));record.element.hidden=!match;return match;});status.textContent=visible.length+'件 · 表示確認用サンプル'+visible.filter(record=>record.sample).length+'件';empty.hidden=visible.length!==0;select(selectedId);}
// Keep the reading view stable while Japanese IME candidates are still uncommitted.
let searchComposing=false;
input.addEventListener('compositionstart',()=>{searchComposing=true;});
input.addEventListener('compositionend',()=>{searchComposing=false;search();});
input.addEventListener('input',event=>{if(!searchComposing&&!event?.isComposing)search();});
$('#clear-search').addEventListener('click',()=>{searchComposing=false;input.value='';search();input.focus();});
nodes.forEach(record=>record.element.addEventListener('click',()=>select(record.id,false,true)));
previous.addEventListener('click',event=>move(-3,event?.detail===0));next.addEventListener('click',event=>move(3,event?.detail===0));
space.addEventListener('keydown',event=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){event.preventDefault();const delta=event.key==='ArrowRight'?3:event.key==='ArrowLeft'?-3:event.key==='ArrowDown'?1:-1;const focusedNode=event.target?.closest?.('[data-paper]');const origin=visible.find(record=>record.element===focusedNode&&!record.element.hidden);move(delta,true,origin?.id||selectedId);}});
function cancelDrag(){drag=null;}
space.addEventListener('pointerdown',event=>{
 suppressClick=null;
 if(event.isPrimary===false){cancelDrag();return;}
 if(event.button!==undefined&&event.button!==0)return;
 drag={x:event.clientX,y:event.clientY,id:event.pointerId,time:Date.now()};
});
space.addEventListener('pointerup',event=>{
 if(!drag||event.pointerId!==drag.id)return;
 const dx=event.clientX-drag.x,dy=event.clientY-drag.y,duration=Date.now()-drag.time;cancelDrag();
 if(Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy)*1.4){suppressClick={id:event.pointerId,until:Date.now()+400};move(dx<0?3:-3);}

});
space.addEventListener('click',event=>{
 const swipe=suppressClick;suppressClick=null;
 // Keyboard/assistive activation is never a synthetic swipe click.
 if(swipe&&event.detail!==0&&Date.now()<=swipe.until&&(event.pointerId===undefined||event.pointerId===swipe.id)){event.preventDefault();event.stopPropagation();}
},true);
space.addEventListener('pointercancel',cancelDrag);
space.addEventListener('lostpointercapture',cancelDrag);
space.addEventListener('pointerleave',event=>{if(event.pointerType==='mouse')cancelDrag();});
space.addEventListener('keydown',event=>{if(event.key==='Escape')cancelDrag();});
window.addEventListener('blur',cancelDrag);
document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelDrag();});
narrow.addEventListener('change',layout);if(typeof ResizeObserver!=='undefined')new ResizeObserver(layout).observe(world);else window.addEventListener('resize',layout);
function syncMotion(){const running=!!ctx&&!!artCtx&&motionEnabled&&!reduced.matches;motionButton.disabled=!ctx||!artCtx||reduced.matches;motionButton.setAttribute('aria-pressed',String(running));motionButton.textContent=(!ctx||!artCtx)?'動きなし（描画非対応）':reduced.matches?'動きなし（端末設定）':running?'動きを止める':'動きを再開';if(frameId!==null){cancelAnimationFrame(frameId);frameId=null;}if(running&&!document.hidden&&inView&&ctx){lastFrame=null;frameId=requestAnimationFrame(tick);}else draw();}
function tick(time){frameId=null;if(!motionEnabled||reduced.matches||document.hidden||!inView||!ctx)return;if(lastFrame===null){lastFrame=time;draw();}else if(time-lastFrame>=1000/24){phase+=(time-lastFrame)/1000;lastFrame=time;draw();}frameId=requestAnimationFrame(tick);}
motionButton.addEventListener('click',()=>{motionEnabled=!motionEnabled;syncMotion();});
reduced.addEventListener('change',syncMotion);
document.addEventListener('visibilitychange',syncMotion);
if(typeof IntersectionObserver!=='undefined')new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;syncMotion();},{threshold:0}).observe(world);
if(window.ResearchView&&!surface?.isReality){viewController=window.ResearchView.attach(viewElement,viewReset,(yaw,pitch)=>{if(surface){surface.setView(yaw,pitch);if(frameId===null)draw();}},viewHelp,()=>focusVisible([materialButton,observeButton,equationButton][representation]),world);viewController.setEnabled(!!surface);}
if(document.fonts){document.fonts.ready.then(layout);document.fonts.addEventListener?.('loadingdone',layout);}
if(surface?.isReality){
 [materialButton,observeButton,equationButton].forEach((button,index)=>button.textContent=['全景','川辺','街'][index]);
 viewElement.hidden=true;viewReset.hidden=true;viewHelp.hidden=true;
 world.addEventListener('pointermove',event=>{if(event.pointerType==='touch')return;const rect=world.getBoundingClientRect();surface.setBoundary((event.clientX-rect.left)/Math.max(1,rect.width));if(frameId===null)draw();});
}
layout();search();syncMotion();
})();
