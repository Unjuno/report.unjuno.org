/* One continuous viewport world: clear paintings with soft dissolves, no per-card canvases. */
(()=>{'use strict';
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const canvas=document.createElement('canvas');canvas.className='continuous-canvas';canvas.setAttribute('aria-hidden','true');document.body.prepend(canvas);
// The viewport world is opaque. Keep transparency only on the dissolve masks.
const c=canvas.getContext('2d',{alpha:false});if(!c){canvas.remove();return;}
const f={w:0,h:0,d:1};
let contextLost=false,revealLost=false,mistLost=false;
// A small, smoothly sampled opacity field, not a shader or full-frame pixel filter.
const reveal=document.createElement('canvas'),rc=reveal.getContext('2d');
const mist=document.createElement('canvas'),mc=mist.getContext('2d');
const bloom=document.createElement('canvas'),bc=bloom.getContext('2d');bloom.width=48;bloom.height=32;
// One reusable soft cloud texture. Six bounded draws, no particle system or blur filter.
const cloud=document.createElement('canvas'),cc=cloud.getContext('2d');cloud.width=128;cloud.height=128;
let cloudReady=false;
function rebuildCloud(){
 cloudReady=false;
 if(cc&&typeof cc.createRadialGradient==='function'){
  const glow=cc.createRadialGradient(64,64,4,64,64,64);
  if(glow&&typeof glow.addColorStop==='function'){
   glow.addColorStop(0,'rgba(177,201,196,.8)');glow.addColorStop(.35,'rgba(139,179,181,.5)');glow.addColorStop(1,'rgba(100,155,167,0)');
   cc.clearRect(0,0,128,128);cc.fillStyle=glow;cc.fillRect(0,0,128,128);cloudReady=true;
  }
 }
}
rebuildCloud();
const MASK_W=64,MASK_H=48;mist.width=MASK_W;mist.height=MASK_H;
let maskPixels=null,maskStep=-1,maskStyle=null,maskSeed=-1,maskField=null;
if(rc&&mc&&typeof mc.createImageData==='function'){
 maskPixels=mc.createImageData(MASK_W,MASK_H);
 if(!maskPixels?.data)maskPixels=null;
}
// Choose the overlap from the incoming image's subject, never from a random cut.
// Names describe procedural alpha fields, not semantic image analysis.
const transitionNames=['mist','horizontal-wave','lateral-blend','particles','vortex','depth-rings','light-bloom','chromatic-veil','contour-bands','local-blends','diagonal-flow','ribbon','soft-waves','cloud-banks','petal-blend'];
const transitionModes=new Set(transitionNames);
function transitionFor(scene){
 if(transitionModes.has(scene?.transition))return scene.transition;
 const name=scene?.asset===undefined?'':assets[scene.asset].name;
 if(scene?.tile!==undefined)return transitionNames[scene.tile%transitionNames.length];
 if(/cosmic/.test(name))return 'vortex';
 if(/organic-cells/.test(name))return 'petal-blend';
 if(/garden/.test(name))return 'cloud-banks';
 if(/ocean|submerged/.test(name))return 'soft-waves';
 if(/optical|wave-light/.test(name))return 'light-bloom';
 if(/mountain|history/.test(name))return 'contour-bands';
 if(/gallery|social-dialogue/.test(name))return 'chromatic-veil';
 if(/platform|spaceship/.test(name))return 'depth-rings';
 if(/river|city-reflection/.test(name))return 'lateral-blend';
 if(/robot|model-city/.test(name))return 'diagonal-flow';
 if(/library|books|archaeology|mosaic/.test(name))return 'mist';
 if(scene?.kind==='wave'||/wave|ocean|submerged/.test(name))return 'horizontal-wave';
 if(scene?.kind==='network'||/cells|forest|garden/.test(name))return 'particles';
 if(scene?.kind==='geometry'||/mobius|gestural/.test(name))return 'ribbon';
 return 'mist';
}
function transitionSeed(scene){return scene?.asset===undefined?({wave:5,network:9,geometry:13}[scene?.kind]||1):(scene.asset+1)*.73+(scene.tile||0)*.37;}
function overlapField(nx,ny,style,seed){
 // Low-frequency fields cached once per shoulder; no image resampling,
 // depth estimation, contour extraction, optical flow, or color matching.
 const dx=nx-.5,dy=ny-.5,r=Math.hypot(dx,dy);
 if(style==='lateral-blend')return .31*Math.tanh(dx*2.4);
 if(style==='vortex')return .28*(dx*Math.cos(r*8+seed)-dy*Math.sin(r*8+seed));
 if(style==='depth-rings')return .27*Math.cos(r*7+seed*.3);
 if(style==='light-bloom')return .32*(Math.exp(-((nx-.68)**2+(ny-.36)**2)*6)-.5);
 if(style==='chromatic-veil')return .22*Math.sin(nx*2.6-ny*1.8+seed)+.06*Math.cos(ny*3);
 if(style==='contour-bands')return .26*Math.sin(ny*5+Math.sin(nx*4+seed)*.8);
 if(style==='local-blends'){
  const a=Math.exp(-((nx-.22)**2+(ny-.30)**2)*9);
  const b=Math.exp(-((nx-.72)**2+(ny-.68)**2)*8);
  const d=Math.exp(-((nx-.72)**2+(ny-.18)**2)*7);
  return .30*Math.tanh((a+b-d-.25)*1.5);
 }
 if(style==='diagonal-flow')return .29*Math.tanh((dx+dy)*1.8);
 if(style==='horizontal-wave')return .29*(nx*2-1)+.055*Math.sin(ny*6+seed);
 if(style==='ribbon')return .26*Math.sin(nx*3.8+ny*2+seed)+.07*Math.cos(ny*5-seed);
 if(style==='particles'){
  let density=0;
  for(let i=0;i<8;i++){
   const x=.5+.43*Math.sin(seed+i*2.399963),y=.5+.43*Math.cos(seed*.7+i*1.7);
   const dx=nx-x,dy=ny-y;density+=Math.exp(-(dx*dx+dy*dy)*(15+i%3*8));
  }
  return .32*Math.tanh((density-.8)*1.2);
 }
 return .16*Math.sin(nx*5+seed)+.12*Math.cos(ny*4-seed*.7)+.07*Math.sin((nx+ny)*4+seed*.3);
}
// A moving, feathered reveal spans both scene shoulders. Its position does
// not reset to a uniform half-opacity image at a scene handover.
function revealThreshold(x,y,style,seed){
 // Four source-stable orientations vary familiar families without moving the
 // boundary pattern during a handover or adding textures, canvases or draws.
 const turn=Math.floor(seed*11)%4,ox=x,oy=y;
 if(turn===1){x=oy;y=1-ox;}else if(turn===2){x=1-ox;y=1-oy;}else if(turn===3){x=1-oy;y=ox;}
 const dx=x-.5,dy=y-.5;
 // These low-frequency variations are evaluated once per cached field, not per frame.
 if(style==='soft-waves')return clamp(.5+.26*Math.sin((x*.8+y)*4+seed*.3)+.16*Math.cos(x*3-seed*.5));
 if(style==='cloud-banks')return clamp(.5+overlapField(x,y,'mist',seed)*.65+.13*Math.sin((x-y)*3+seed*.5));
 if(style==='petal-blend'){const r=Math.hypot(dx,dy);return clamp(.18+r*(.95+.22*Math.sin(Math.atan2(dy,dx)*3+seed)));}
 if(style==='lateral-blend')return x;
 if(style==='horizontal-wave')return clamp(x+.12*Math.sin(y*7+seed));
 if(style==='diagonal-flow')return (x+y)/2;
 if(style==='depth-rings')return clamp(Math.hypot(dx,dy)/.7072);
 if(style==='light-bloom')return clamp(Math.hypot(x-.68,y-.36)/.94);
 if(style==='contour-bands')return clamp(y+.13*Math.sin(x*6+seed));
 if(style==='ribbon')return clamp(Math.abs(y-.5-.20*Math.sin(x*5+seed))*1.7);
 if(style==='vortex')return clamp(.5+1.9*(dx*Math.cos(Math.hypot(dx,dy)*9+seed)-dy*Math.sin(Math.hypot(dx,dy)*9+seed)));
 if(style==='particles'||style==='local-blends'){
  let distance=1;
  const count=style==='particles'?8:3;
  for(let i=0;i<count;i++){
   const px=.5+.40*Math.sin(seed+i*2.399963),py=.5+.40*Math.cos(seed*.7+i*1.7);
   const d=Math.hypot(x-px,y-py)*(style==='particles'?2.2:1.5)+(style==='local-blends'?i*.12:0);
   distance=Math.min(distance,d);
  }
  return clamp(distance);
 }
 if(style==='chromatic-veil')return 1-y;
 return clamp(.5+overlapField(x,y,style,seed)*1.3);
}
function revealAlpha(progress,threshold,style){
 const outgoing=progress>.6,t=clamp(outgoing?(progress-.6)/.4:progress/.4);
 const power=style==='particles'?1.5:style==='light-bloom'?.75:style==='local-blends'?1.2:1;
 const u=smooth(t),q=outgoing?.5*Math.pow(u,power):.5+.5*(1-Math.pow(1-u,power));
 const feather=(style==='mist'||style==='cloud-banks')?.52:style==='chromatic-veil'?.44:style==='particles'?.30:.36;
 const spatial=smooth(clamp((q*(1+feather)-threshold)/feather));
 // Retain the traveling shape, but soften its pure-image regions with a
 // wide overlap around the handover. Clear endpoints remain untouched.
 const diffuse=.42;
 return spatial*(1-diffuse)+q*diffuse;
}
// Smooth only the tiny alpha surface, never the full-resolution image.
// Sliding sums bound work and reuse24KiB of buffers; no Canvas filter/GPU blur.
const alphaRow=new Float32Array(MASK_W*MASK_H),alphaSoft=new Float32Array(MASK_W*MASK_H);
function softMask(progress,style){
 const radius=10,span=radius*2+1;
 for(let i=0;i<maskField.length;i++)alphaRow[i]=255*revealAlpha(progress,maskField[i],style);
 for(let y=0;y<MASK_H;y++){
  const row=y*MASK_W;let sum=0;
  for(let k=-radius;k<=radius;k++)sum+=alphaRow[row+Math.max(0,Math.min(MASK_W-1,k))];
  for(let x=0;x<MASK_W;x++){
   alphaSoft[row+x]=sum/span;
   sum+=alphaRow[row+Math.min(MASK_W-1,x+radius+1)]-alphaRow[row+Math.max(0,x-radius)];
  }
 }
 for(let x=0;x<MASK_W;x++){
  let sum=0;for(let k=-radius;k<=radius;k++)sum+=alphaSoft[Math.max(0,Math.min(MASK_H-1,k))*MASK_W+x];
  for(let y=0;y<MASK_H;y++){
   maskPixels.data[(y*MASK_W+x)*4+3]=Math.round(sum/span);
   sum+=alphaSoft[Math.min(MASK_H-1,y+radius+1)*MASK_W+x]-alphaSoft[Math.max(0,y-radius)*MASK_W+x];
  }
 }
}
// Bounded soft motes sit over intact images; they never break an image into pixels.
function transitionMotes(scene,softness){
 if(!cloudReady||softness<=0)return;
 const {w,h}=f,seed=transitionSeed(scene),unit=Math.min(w,h);
 c.save();
 for(let i=0;i<12;i++){
  const t=phase*(.035+(i%3)*.008)+seed+i*2.399963;
  const x=w*(.5+.47*Math.sin(t+cloudTravel*.08)),y=h*(.5+.46*Math.cos(t*.73+i));
  const radius=unit*(.012+(i%4)*.006);
  c.globalAlpha=softness*(.12+scrollEnergy*.1)*(.55+.45*Math.sin(t*.6+i)**2);
  c.drawImage(cloud,x-radius,y-radius,radius*2,radius*2);
 }
 c.restore();
}
// Keep a fully clear central window; only adjacent scenes share each shoulder.
// Endpoints remain 50/50, with zero velocity, so interval handovers stay soft.
function weights(progress,offset=0){
 const p=clamp(progress);
 if(p<.4){const t=p/.4,u=clamp(t+Math.sin(Math.PI*t)**2*offset);const previous=.5*(1-smooth(u));return [previous,1-previous,0];}
 if(p>.6){const t=(p-.6)/.4,u=clamp(t+Math.sin(Math.PI*t)**2*offset);const next=.5*smooth(u);return [0,1-next,next];}
 return [0,1,0];
}
function dissolve(previous,a,b,progress,step){
 const {w,h}=f,weight=weights(progress),softness=2*(1-Math.max(...weight));
 const incoming=progress<.5?a:b,style=transitionFor(incoming),seed=transitionSeed(incoming);
 // Native capped canvas resolution preserves the painting's fine detail.
 // The clear window bypasses all intermediate surfaces and optical overlays.
 if(weight[1]===1){layer(a||previous||b,1);return;}
 // On the outgoing shoulder the previous scene has exactly zero weight.
 // Draw the current scene directly as the base instead of drawing, fully
 // covering, and masking an invisible previous scene.
 const outgoing=progress>.6,base=outgoing?a:(previous||a);
 const spatial=rc&&mc&&maskPixels&&!revealLost&&!mistLost;
 if(spatial){
  const scale=f.d;
  const rw=Math.max(1,Math.round(w*scale)),rh=Math.max(1,Math.round(h*scale));
  if(reveal.width!==rw||reveal.height!==rh){reveal.width=rw;reveal.height=rh;}
  // Match the main canvas sampling resolution at interval handovers.
  rc.setTransform(rw/w,0,0,rh/h,0,0);rc.clearRect(0,0,w,h);layer(base,1,rc);c.drawImage(reveal,0,0,w,h);
  if(maskStep!==step||maskStyle!==style||maskSeed!==seed){
   maskStep=step;maskStyle=style;maskSeed=seed;maskField=new Float32Array(MASK_W*MASK_H);
   for(let y=0;y<MASK_H;y++)for(let x=0;x<MASK_W;x++){
    const nx=x/(MASK_W-1),ny=y/(MASK_H-1);
    maskField[y*MASK_W+x]=revealThreshold(nx,ny,style,seed);
   }
  }
 }
 if(!spatial)layer(base,1);
 for(const [scene,index] of (outgoing?[[b,2]]:[[a,1],[b,2]])){
  if(!scene)continue;
  const alpha=index===1?weight[1]/(1-weight[2]):weight[2];
  if(alpha<.001)continue;
  if(!spatial){layer(scene,alpha);continue;}
  softMask(progress,style);
  mc.putImageData(maskPixels,0,0);
  rc.setTransform(reveal.width/w,0,0,reveal.height/h,0,0);rc.clearRect(0,0,w,h);layer(scene,1,rc);
  rc.save();rc.globalCompositeOperation='destination-in';rc.imageSmoothingEnabled=true;rc.drawImage(mist,0,0,w,h);rc.restore();
  c.drawImage(reveal,0,0,w,h);
 }
 // Keep the painting at native capped resolution. Only alpha masks and soft
 // motes are low-resolution; never downsample and reconstruct the image.
 if(style==='particles')transitionMotes(incoming,softness);
 if(style==='light-bloom'&&cloudReady){
  // A single soft light sprite, not an HDR/glow convolution.
  c.save();c.globalAlpha=.055*softness;c.drawImage(cloud,w*.12,-h*.2,w*1.12,h*1.2);c.restore();
 }
 c.save();c.globalAlpha=(style==='chromatic-veil'?.045:.018)*softness;
 const haze=c.createLinearGradient(0,h*.2,w,h*.8);
 haze.addColorStop(0,'#416e70');haze.addColorStop(.5,'#96b7ad');haze.addColorStop(1,'#284b58');
 c.fillStyle=haze;c.fillRect(0,0,w,h);c.restore();
}
const assets=['cinema-atlas.webp','river-city-dawn.webp','quiet-media-atlas-v1.webp','empty-platform.webp','spaceship-window.webp','submerged-city.webp','forest-library.webp','living-gallery.webp','garden-conservatory.webp','ocean-corridor.webp','forest-theater.webp','city-reflection.webp','model-city.webp'].map(name=>({name,image:new Image(),ready:false,failed:false,attempts:0,retryAt:0}));
// Illustrative imagery, not evidence from the listed papers.
// Backgrounds are text-free: omit computer key legends and the inscribed armillary scene.
const scenes=[{asset:3,focus:.69},{asset:4,focus:.69},{asset:5,focus:.47},{asset:6,focus:0.6},{asset:7,focus:0.43},{asset:8,focus:0.67},{asset:9,focus:0.65},{asset:10,focus:0.5},{asset:11,focus:0.62},{asset:12,focus:0.58},{asset:2,tile:0,cols:3,rows:2},{asset:2,tile:1,cols:3,rows:2},{asset:2,tile:2,cols:3,rows:2},{asset:2,tile:3,cols:3,rows:2},{asset:2,tile:4,cols:3,rows:2},{asset:2,tile:5,cols:3,rows:2},{asset:1},{kind:'geometry'},{asset:0,tile:0},{kind:'network'},{asset:0,tile:6},{asset:0,tile:8},{kind:'wave'},{asset:0,tile:9},{asset:0,tile:12},{asset:0,tile:15},{asset:0,tile:4},{asset:0,tile:14},{asset:0,tile:10}];
// Original anime scenes: generated illustration, not paper evidence.
for(const [name,position,focus] of [['anime-forest-fieldwork-v2.webp',1,.7],['anime-mountain-archive-v2.webp',6,.74]]){const asset=assets.length;assets.push({name,image:new Image(),ready:false,failed:false,attempts:0,retryAt:0});scenes.splice(position,0,{asset,focus});}
// Original books and history illustrations, not documentary evidence.
for(const [name,position,focus] of [['books-vault-v1.webp',3,.7],['history-atelier-v1.webp',9,.62]]){const asset=assets.length;assets.push({name,image:new Image(),ready:false,failed:false,attempts:0,retryAt:0});scenes.splice(position,0,{asset,focus});}
// Ten user-selected original art images, illustrative, not research evidence.
for(const [name,position,focus] of [['art-cosmic-cells-v2.webp',2,0.55],['art-mobius-sculpture-v2.webp',6,0.50],['art-mosaic-restoration-v2.webp',10,0.53],['art-social-dialogue-v2.webp',14,0.60],['art-optical-bench-v2.webp',18,0.52],['art-robot-workshop-v2.webp',22,0.58],['art-archaeology-table-v2.webp',26,0.50],['art-organic-cells-v2.webp',30,0.55],['art-wave-light-v2.webp',34,0.58],['art-gestural-lines-v2.webp',38,0.52]]){const asset=assets.length;assets.push({name,image:new Image(),ready:false,failed:false,attempts:0,retryAt:0});scenes.splice(position,0,{asset,focus});}
// AI-generated editorial illustration: fictional researcher and hall, not a paper record.
// Preserve existing scene order; add the listening scene after the blue wave artwork.
{
 const name='acoustics-hall-v1.webp',asset=assets.length;
 assets.push({name,image:new Image(),ready:false,failed:false,attempts:0,retryAt:0});
 const after=scenes.findIndex(scene=>scene.asset!==undefined&&assets[scene.asset].name==='art-wave-light-v2.webp');
 scenes.splice(after<0?scenes.length:after+1,0,{asset,focus:.40,transition:'mist'});
}
// Editorial beats: wide landscapes breathe, tactile work has a medium pace,
// abstract/atlas inserts move faster. Keep the authored sequence and every scene.

// Independent comparison only: authentic museum originals, no generative replacement.
for(const [name,framing] of [['bruegel-harvesters-2048.webp','bruegel'],['atkins-ptilota-2560.webp','atkins']]){const asset=assets.length;assets.push({name,image:new Image(),ready:false,failed:false,attempts:0,retryAt:0});scenes.push({asset,framing,transition:'mist'});}
// Five reviewed stills served as smaller WebP copies; original PNG bytes remain archived here.
// Keep all existing scenes and the existing bounded decoder/cache.
for(const [name,position,focus,transition] of [["selected-ceramic-sherds-v1.webp", 4, 0.78, "mist"], ["selected-star-trails-v1.webp", 12, 0.88, "depth-rings"], ["selected-shared-plaza-v1.webp", 20, 0.78, "local-blends"], ["selected-milkweed-seeds-v1.webp", 36, 0.8, "particles"]]){const asset=assets.length;assets.push({name,image:new Image(),ready:false,failed:false,attempts:0,retryAt:0});scenes.splice(position,0,{asset,focus,transition});}
// Fifteen further approved illustrations. First four selected stills remain once; white fern excluded.
for(const [name,position,focus,transition] of [["selected-api-06-woven-air.webp", 5, 0.58, "mist"], ["selected-api-07-folded-city.webp", 7, 0.65, "diagonal-flow"], ["selected-api-08-magnetic-field.webp", 11, 0.65, "contour-bands"], ["selected-api-09-glass-river.webp", 15, 0.65, "horizontal-wave"], ["selected-api-10-listening-room.webp", 19, 0.72, "local-blends"], ["selected-api-11-amber-network.webp", 23, 0.64, "particles"], ["selected-api-12-felt-mobius.webp", 27, 0.55, "ribbon"], ["selected-api-13-dune-markers.webp", 31, 0.68, "contour-bands"], ["selected-api-14-blue-fabric.webp", 35, 0.68, "ribbon"], ["selected-api-15-singing-bowls.webp", 39, 0.65, "light-bloom"], ["selected-api-16-night-flock.webp", 43, 0.7, "particles"], ["selected-api-17-blue-mended-paper.webp", 47, 0.85, "mist"], ["selected-api-18-ripple-orbits.webp", 51, 0.78, "depth-rings"], ["selected-api-19-woven-corridor.webp", 55, 0.56, "depth-rings"], ["selected-api-20-rose-orbits.webp", 59, 0.66, "ribbon"]]){const asset=assets.length;assets.push({name,image:new Image(),ready:false,failed:false,attempts:0,retryAt:0});scenes.splice(position,0,{asset,focus,transition});}
// Eleven further reviewed illustrations; additions only. Retain every prior scene.
// Names, rather than numeric offsets, keep the v99 authored sequence stable.
for (const item of [{"name":"selected-api-next-observatory-v1.webp","after":"spaceship-window.webp","focus":0.99,"transition":"depth-rings"},{"name":"selected-api-next-library-v1.webp","after":"books-vault-v1.webp","focus":0.93,"transition":"mist"},{"name":"selected-api-next-bamboo-v1.webp","after":"forest-theater.webp","focus":0.9,"transition":"mist"},{"name":"selected-api-next-polarized-mineral-v1.webp","after":"art-optical-bench-v2.webp","focus":0.7,"transition":"contour-bands"},{"name":"selected-api-next-silver-sculpture-v1.webp","after":"selected-api-12-felt-mobius.webp","focus":0.83,"transition":"ribbon"},{"name":"selected-api-next-piano-room-v1.webp","after":"acoustics-hall-v1.webp","focus":0.9,"transition":"mist"},{"name":"selected-api-next-city-print-v1.webp","after":"city-reflection.webp","focus":0.85,"transition":"lateral-blend"},{"name":"selected-api-next-watercolor-hills-v1.webp","after":"anime-mountain-archive-v2.webp","focus":0.76,"transition":"contour-bands"},{"name":"selected-api-next-desert-v1.webp","after":"selected-api-13-dune-markers.webp","focus":0.5,"transition":"contour-bands"},{"name":"selected-api-next-plaster-v1.webp","after":"history-atelier-v1.webp","focus":0.45,"transition":"mist"},{"name":"selected-api-next-sea-glass-v1.webp","after":"submerged-city.webp","focus":0.6,"transition":"local-blends"}]) {
 const asset=assets.length;
 assets.push({name:item.name,image:new Image(),ready:false,failed:false,attempts:0,retryAt:0});
 const after=scenes.findIndex(scene=>scene.asset!==undefined&&assets[scene.asset].name===item.after);
 scenes.splice(after<0?scenes.length:after+1,0,{asset,focus:item.focus,transition:item.transition});
}
// Complete the requested 99-image generated collection in one batch. The excluded white fern stays unused.
// Preserve the first four scenes and every existing scene's relative order; interleave the remaining images.
const remainingGenerated=[{"name":"selected-api-candidate-02-v1.webp","focus":0.77,"transition":"contour-bands"},{"name":"selected-api-candidate-03-v1.webp","focus":0.78,"transition":"local-blends"},{"name":"selected-api-candidate-04-v1.webp","focus":0.84,"transition":"ribbon"},{"name":"selected-api-candidate-05-v1.webp","focus":0.75,"transition":"lateral-blend"},{"name":"selected-api-candidate-06-v1.webp","focus":0.73,"transition":"mist"},{"name":"selected-api-candidate-07-v1.webp","focus":0.8,"transition":"depth-rings"},{"name":"selected-api-candidate-08-v1.webp","focus":0.74,"transition":"contour-bands"},{"name":"selected-api-candidate-10-v1.webp","focus":0.81,"transition":"ribbon"},{"name":"selected-api-candidate-11-v1.webp","focus":0.73,"transition":"lateral-blend"},{"name":"selected-api-candidate-12-v1.webp","focus":0.8,"transition":"mist"},{"name":"selected-api-candidate-13-v1.webp","focus":0.8,"transition":"depth-rings"},{"name":"selected-api-candidate-14-v1.webp","focus":0.8,"transition":"contour-bands"},{"name":"selected-api-candidate-15-v1.webp","focus":0.72,"transition":"local-blends"},{"name":"selected-api-candidate-16-v1.webp","focus":0.78,"transition":"ribbon"},{"name":"selected-api-candidate-18-v1.webp","focus":0.77,"transition":"mist"},{"name":"selected-api-candidate-19-v1.webp","focus":0.79,"transition":"depth-rings"},{"name":"selected-api-candidate-20-v1.webp","focus":0.75,"transition":"contour-bands"},{"name":"selected-api-candidate-21-v1.webp","focus":0.74,"transition":"local-blends"},{"name":"selected-api-candidate-22-v2.webp","focus":0.78,"transition":"ribbon"},{"name":"selected-api-candidate-23-v1.webp","focus":0.79,"transition":"lateral-blend"},{"name":"selected-api-candidate-24-v1.webp","focus":0.76,"transition":"mist"},{"name":"selected-api-candidate-25-v1.webp","focus":0.76,"transition":"depth-rings"},{"name":"selected-api-candidate-26-v1.webp","focus":0.77,"transition":"contour-bands"},{"name":"selected-api-candidate-27-v2.webp","focus":0.5,"transition":"local-blends"},{"name":"selected-api-candidate-28-v1.webp","focus":0.8,"transition":"ribbon"},{"name":"selected-api-candidate-29-v1.webp","focus":0.74,"transition":"lateral-blend"},{"name":"selected-api-candidate-31-v1.webp","focus":0.76,"transition":"depth-rings"},{"name":"selected-api-candidate-32-v1.webp","focus":0.77,"transition":"contour-bands"},{"name":"selected-api-candidate-33-v1.webp","focus":0.71,"transition":"local-blends"},{"name":"selected-api-candidate-34-v1.webp","focus":0.8,"transition":"ribbon"},{"name":"selected-api-candidate-36-v1.webp","focus":0.72,"transition":"mist"},{"name":"selected-api-candidate-37-v1.webp","focus":0.5,"transition":"depth-rings"},{"name":"selected-api-candidate-38-v2.webp","focus":0.45,"transition":"contour-bands"},{"name":"selected-api-candidate-40-v1.webp","focus":0.5,"transition":"ribbon"},{"name":"selected-api-candidate-41-v1.webp","focus":0.78,"transition":"lateral-blend"},{"name":"selected-api-candidate-42-v1.webp","focus":0.45,"transition":"mist"},{"name":"selected-api-candidate-43-v1.webp","focus":0.31,"transition":"depth-rings"},{"name":"selected-api-candidate-44-v1.webp","focus":0.32,"transition":"contour-bands"},{"name":"selected-api-candidate-45-v1.webp","focus":0.4,"transition":"local-blends"},{"name":"selected-api-candidate-46-v1.webp","focus":0.65,"transition":"ribbon"},{"name":"selected-api-candidate-47-v1.webp","focus":0.4,"transition":"lateral-blend"},{"name":"selected-api-candidate-49-v1.webp","focus":0.3,"transition":"depth-rings"},{"name":"selected-api-candidate-50-v1.webp","focus":0.66,"transition":"contour-bands"},{"name":"selected-api-candidate-51-v2.webp","focus":0.73,"transition":"local-blends"},{"name":"selected-api-candidate-54-v1.webp","focus":0.25,"transition":"mist"},{"name":"selected-api-candidate-55-v1.webp","focus":0.28,"transition":"depth-rings"},{"name":"selected-api-candidate-56-v1.webp","focus":0.77,"transition":"contour-bands"},{"name":"selected-api-candidate-57-v1.webp","focus":0.25,"transition":"local-blends"},{"name":"selected-api-candidate-58-v1.webp","focus":0.5,"transition":"ribbon"},{"name":"selected-api-candidate-59-v1.webp","focus":0.28,"transition":"lateral-blend"},{"name":"selected-api-candidate-60-v1.webp","focus":0.3,"transition":"mist"},{"name":"selected-api-candidate-61-v1.webp","focus":0.5,"transition":"depth-rings"},{"name":"selected-api-candidate-62-v1.webp","focus":0.5,"transition":"contour-bands"},{"name":"selected-api-candidate-63-v1.webp","focus":0.45,"transition":"local-blends"},{"name":"selected-api-candidate-64-v1.webp","focus":0.23,"transition":"ribbon"},{"name":"selected-api-candidate-65-v1.webp","focus":0.35,"transition":"lateral-blend"},{"name":"selected-api-candidate-66-v1.webp","focus":0.68,"transition":"mist"},{"name":"selected-api-candidate-67-v1.webp","focus":0.35,"transition":"depth-rings"},{"name":"selected-api-candidate-68-v1.webp","focus":0.5,"transition":"contour-bands"},{"name":"selected-api-candidate-70-v1.webp","focus":0.69,"transition":"ribbon"},{"name":"selected-api-candidate-72-v1.webp","focus":0.4,"transition":"mist"},{"name":"selected-api-candidate-73-v1.webp","focus":0.45,"transition":"depth-rings"},{"name":"selected-api-candidate-74-v1.webp","focus":0.4,"transition":"contour-bands"},{"name":"selected-api-candidate-75-v2.webp","focus":0.65,"transition":"local-blends"},{"name":"selected-api-candidate-76-v1.webp","focus":0.5,"transition":"ribbon"},{"name":"selected-api-candidate-77-v1.webp","focus":0.5,"transition":"lateral-blend"},{"name":"selected-api-candidate-78-v1.webp","focus":0.5,"transition":"mist"},{"name":"selected-api-candidate-79-v1.webp","focus":0.38,"transition":"depth-rings"},{"name":"selected-api-candidate-80-v1.webp","focus":0.63,"transition":"contour-bands"}];
const priorSceneCount=scenes.length;
for(let index=remainingGenerated.length-1;index>=0;index--){
 const item=remainingGenerated[index],asset=assets.length;
 assets.push({name:item.name,image:new Image(),ready:false,failed:false,attempts:0,retryAt:0});
 const position=4+Math.floor(index*(priorSceneCount-4)/remainingGenerated.length);
 scenes.splice(position,0,{asset,focus:item.focus,transition:item.transition});
}
// The 100th generated image is additive: the full prior sequence stays in order.
{
 const asset=assets.length;
 assets.push({name:'selected-api-100-dawn-lake-v1.webp',image:new Image(),ready:false,failed:false,attempts:0,retryAt:0});
 const after=scenes.findIndex(scene=>scene.asset!==undefined&&assets[scene.asset].name==='selected-api-next-watercolor-hills-v1.webp');
 scenes.splice(after<0?scenes.length:after+1,0,{asset,focus:.57,transition:'mist'});
}
// Each source keeps its own camera identity across both sides of a dissolve.
const sceneBeats=scenes.map(scene=>{
 const name=scene.asset===undefined?'':assets[scene.asset].name;
 if(scene.kind)return {seconds:4.8,motion:.35,tempo:.075,role:'interlude'};
 if(scene.tile!==undefined)return {seconds:5.6,motion:.5,tempo:.065,role:'montage'};
 if(/empty-platform|spaceship-window|submerged-city|ocean-corridor|forest-theater/.test(name))return {seconds:11.5,motion:.8,tempo:.038,role:'vista'};
 if(/cosmic-cells|mobius-sculpture|wave-light/.test(name))return {seconds:9.2,motion:1,tempo:.055,role:'reveal'};
 if(/books-vault|history-atelier|mosaic-restoration|archaeology-table/.test(name))return {seconds:8.4,motion:.4,tempo:.042,role:'detail'};
 return {seconds:7,motion:.65,tempo:.05,role:'journey'};
});
const sceneStarts=[0];for(const beat of sceneBeats)sceneStarts.push(sceneStarts[sceneStarts.length-1]+beat.seconds);
const reelSeconds=sceneStarts[scenes.length];
// One visit-local random seed; no identity, storage, cookie or network request.
// Keep the authored registry intact. Playback uses bounded, reproducible-per-cycle bags.
const sessionSeed=Math.floor(Math.random()*4294967296)>>>0,sequences=new Map();
const sourceKey=index=>scenes[index].asset===undefined?'procedural':'image:'+scenes[index].asset;
function validSwap(order,a,b){
 const at=i=>order[i===a?b:i===b?a:i];
 for(const edge of new Set([a-1,a,b-1,b]))if(edge>=0&&edge<order.length-1&&sourceKey(at(edge))===sourceKey(at(edge+1)))return false;
 return true;
}
function shuffledOrder(lap){
 let state=(sessionSeed^Math.imul(lap+1,0x9e3779b9))>>>0;
 const random=()=>{state=(state+0x6d2b79f5)>>>0;let n=state;n=Math.imul(n^(n>>>15),n|1);n^=n+Math.imul(n^(n>>>7),n|61);return ((n^(n>>>14))>>>0)/4294967296;};
 const order=scenes.map((_,index)=>index);
 for(let i=order.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[order[i],order[j]]=[order[j],order[i]];}
 // Start with a painting, including in reduced motion; procedural interludes still appear once.
 if(scenes[order[0]].kind){const first=order.findIndex(index=>!scenes[index].kind);[order[0],order[first]]=[order[first],order[0]];}
 // Atlas crops share a source. Keep those and procedural scenes apart without
 // dropping a scene, retrying randomness indefinitely or changing source metadata.
 for(let i=1;i<order.length;i++)if(sourceKey(order[i])===sourceKey(order[i-1])){
  const j=order.findIndex((_,j)=>j>0&&j!==i&&validSwap(order,i,j));
  if(j>0)[order[i],order[j]]=[order[j],order[i]];
 }
 return order;
}
function sequenceFor(lap){
 if(sequences.has(lap))return sequences.get(lap);
 const order=shuffledOrder(lap),last=order.length-1,nextFirst=shuffledOrder(lap+1)[0];
 // The next bag's first entry never changes during its own tail repair.
 // Resolve the seam in advance, so look-ahead loading sees the final order.
 if(sourceKey(order[last])===sourceKey(nextFirst)){
  const j=order.findIndex((_,j)=>j>0&&j<last&&sourceKey(order[j])!==sourceKey(nextFirst)&&validSwap(order,last,j));
  if(j>0)[order[last],order[j]]=[order[j],order[last]];
 }
 const starts=[0];let tenths=0;for(const index of order){tenths+=Math.round(sceneBeats[index].seconds*10);starts.push(tenths/10);}
 const sequence={order,starts};sequences.set(lap,sequence);
 while(sequences.size>3)sequences.delete(sequences.keys().next().value);
 return sequence;
}
function sceneAt(step){const lap=Math.floor(step/scenes.length),index=step-lap*scenes.length;return scenes[sequenceFor(lap).order[index]];}
function sceneTime(time){
 const lap=Math.floor(time/reelSeconds),local=time-lap*reelSeconds,sequence=sequenceFor(lap);
 let index=0;while(index<scenes.length-1&&local>=sequence.starts[index+1])index++;
 const sourceIndex=sequence.order[index],beat=sceneBeats[sourceIndex];
 return {step:lap*scenes.length+index,index,sourceIndex,progress:clamp((local-sequence.starts[index])/beat.seconds),...beat};
}
const FRAME=1000/24,ASSET_TIMEOUT=12000,MAX_LOADING=2,MAX_READY=6;
// Keep paintings readable: a slightly calmer idle pace and at most 2x while scrolling.
// Input still adds speed, never a position jump, then eases back to the idle pace.
// Scroll energy affects the soft overlay only, never the image framing.
const IDLE_SPEED=1.2,SCROLL_GAIN=.0048,MAX_BOOST=1.2,BOOST_DECAY=2.2;
let phase=0,last=null,lastPaint=-Infinity,raf=0,previousScroll=scrollY,paintPending=true,scrollBoost=0,scrollEnergy=0,cloudTravel=0,flowDirection=0,scrollDirection=1;
let activeLoads=0,pairStep=-1,pairPrevious=null,pairA=null,pairB=null,initialImageReady=false,preloadStep=-1,preloadDirty=true;
const clamp=x=>Math.max(0,Math.min(1,x)),smooth=x=>x*x*(3-2*x);
const paused=()=>reduced.matches||document.body.classList.contains('paused');
const ready=()=>assets.some(a=>a.ready);
function mark(root=document){
 const cards=[];if(root.matches?.('[data-entry]'))cards.push(root);
 cards.push(...(root.querySelectorAll?.('[data-entry]')||[]));
 for(const card of cards)card.classList.add('has-living-field','cinema-field');
}
function size(){
 // CSS uses the large viewport height so mobile browser bars can slide without
 // repeatedly clearing/reallocating the canvas bitmap during a scroll.
 const w=canvas.clientWidth||innerWidth,h=canvas.clientHeight||innerHeight;
 const d=Math.min(devicePixelRatio||1,1.5,Math.sqrt(2200000/Math.max(1,w*h)));
 if(f.w===w&&f.h===h&&f.d===d)return;
 f.w=w;f.h=h;f.d=d;
 const width=Math.round(w*d),height=Math.round(h*d);
 if(canvas.width!==width)canvas.width=width;
 if(canvas.height!==height)canvas.height=height;
 paintPending=true;if(!document.hidden)paint();
}
function available(index,imagesOnly=false){for(let offset=0;offset<scenes.length;offset++){const scene=sceneAt(index+offset);if(scene.kind?!imagesOnly:assets[scene.asset].ready)return scene;}return null;}
// Text-free imagined research landscapes, not plots of measured paper data.
// Fixed geometry keeps the dissolve calm; bounded paths avoid per-frame particles.
function diagram(kind,alpha,c){const {w,h}=f;
 c.save();c.globalAlpha=alpha;
 const ground=c.createLinearGradient(0,0,w,h);
 ground.addColorStop(0,'#102429');ground.addColorStop(.5,'#1c3b40');ground.addColorStop(1,'#142c36');
 c.fillStyle=ground;c.fillRect(0,0,w,h);
 // Broad, quiet light gives every scene depth without a luminous central icon.
 const light=c.createLinearGradient(0,h,w,0);
 light.addColorStop(0,'#659c9720');light.addColorStop(.58,'#92bfb232');light.addColorStop(1,'#c9c9a908');
 c.fillStyle=light;c.fillRect(0,0,w,h);c.lineWidth=1;
 if(kind==='geometry'){
  // Continuous folded contours: foreground strata open toward distant ridges.
  for(let row=0;row<22;row++){
   const depth=row/21;c.beginPath();
   for(let j=0;j<=56;j++){
    const nx=j/56,px=nx*w;
    const ridge=Math.sin(nx*6.4+depth*1.9)*.075+Math.sin(nx*13-depth*2.4)*.024;
    const py=h*(.13+depth*.86+ridge*(.35+depth*.85));
    j?c.lineTo(px,py):c.moveTo(px,py);
   }
   c.strokeStyle=`rgba(160,205,190,${.15+depth*.34})`;c.stroke();
  }
  // Crossing grain hints at a surface, without axes, numbers or a wireframe cage.
  for(let col=0;col<9;col++){
   c.beginPath();for(let j=0;j<=28;j++){
    const depth=j/28,nx=(col+.5)/9+Math.sin(depth*3+col*.7)*.035;
    const ridge=Math.sin(nx*6.4+depth*1.9)*.075+Math.sin(nx*13-depth*2.4)*.024;
    const px=nx*w,py=h*(.13+depth*.86+ridge*(.35+depth*.85));
    j?c.lineTo(px,py):c.moveTo(px,py);
   }c.strokeStyle='rgba(140,188,181,.12)';c.stroke();
  }
 }else if(kind==='network'){
  // An irregular archipelago of connections reaches past both viewport edges.
  const points=[];
  for(let row=0;row<6;row++)for(let col=0;col<9;col++){
   const i=row*9+col,nx=(col-.2)/8+Math.sin(i*2.7)*.036;
   const ny=(row+.25)/6+Math.cos(i*1.9)*.054;
   points.push([nx*w,ny*h]);
  }
  points.forEach(([px,py],i)=>{
   for(const offset of [1,9,10]){
    const q=points[i+offset];if(!q||(offset!==9&&i%9===8))continue;
    c.beginPath();c.moveTo(px,py);
    c.bezierCurveTo(px+(q[0]-px)*.35,py-12,px+(q[0]-px)*.7,q[1]+12,q[0],q[1]);
    c.strokeStyle=offset===9?'rgba(145,191,188,.16)':'rgba(172,209,192,.29)';c.stroke();
   }
   const r=i%7===0?3.5:1.6;
   if(i%7===0){c.beginPath();c.arc(px,py,9,0,Math.PI*2);c.fillStyle='rgba(180,216,190,.08)';c.fill();}
   c.beginPath();c.arc(px,py,r,0,Math.PI*2);c.fillStyle=i%7===0?'#b8ccb0':'#79aba8';c.fill();
  });
 }else if(kind==='wave'){
  // A wide interference field, with overlapping translucent bands like tidal light.
  for(let row=0;row<24;row++){
   const depth=row/23;c.beginPath();
   for(let j=0;j<=56;j++){
    const nx=j/56,px=nx*w;
    const envelope=.35+.65*Math.sin(nx*Math.PI)**2;
    const py=h*(.1+depth*.84+Math.sin(nx*8.2-depth*2.6)*.055*envelope+Math.cos(nx*15+depth*4)*.018);
    j?c.lineTo(px,py):c.moveTo(px,py);
   }
   c.strokeStyle=`rgba(145,197,198,${.18+.28*Math.sin(depth*Math.PI)})`;c.stroke();
   if(row%4===0){c.lineTo(w,h);c.lineTo(0,h);c.closePath();c.fillStyle='rgba(100,167,175,.025)';c.fill();}
  }
 }
 c.restore();
}
function layer(scene,alpha,c=canvas.getContext('2d')){if(!scene||alpha<.001)return;if(scene.kind){diagram(scene.kind,alpha,c);return;}const image=assets[scene.asset].image,{w,h}=f;
 let sx=0,sy=0,sw=image.naturalWidth,sh=image.naturalHeight||image.height||sw;
 if(scene.tile!==undefined){const cols=scene.cols||4,rows=scene.rows||4,tw=sw/cols,th=sh/rows;sx=(scene.tile%cols)*tw+1;sy=Math.floor(scene.tile/cols)*th+1;sw=tw-2;sh=th-2;}
 // Fixed museum comparison frames: no phase, scroll zoom, drift, or extra cover crop.
 if(scene.framing){
  const portrait=w<h;
  const rect=scene.framing==='atkins'?(portrait?[190,270,2650,3210]:[190,2040,2510,1450]):(portrait?[1918,47,1254,2714]:[64,400,3682,2301]);
  const bx=scene.framing==='atkins'?3266:3811,by=scene.framing==='atkins'?4000:2809;
  const [rx,ry,rw,rh]=rect.map((v,i)=>v*(i%2?image.naturalHeight/by:image.naturalWidth/bx)),scale=Math.min(w/rw,h/rh),dw=rw*scale,dh=rh*scale;
  c.globalAlpha=alpha;c.fillStyle=scene.framing==='atkins'?'#154b6a':'#302a18';c.fillRect(0,0,w,h);
  c.drawImage(image,rx,ry,rw,rh,(w-dw)/2,(h-dh)/2,dw,dh);c.globalAlpha=1;return;
 }
 // Cover the whole viewport, including the spaces between cards. No slice distortion.
 // Stable cover framing: scrolling and scene time never push an image closer.
 // Keep the existing cover margin and authored mobile focal point.
 const scale=Math.max(w/sw,h/sh)*1.035,dw=sw*scale,dh=sh*scale;
 const focus=w<650?(scene.focus??.5):.5;
 const x=(w-dw)*focus,y=(h-dh)*.5;
 c.globalAlpha=alpha;c.drawImage(image,sx,sy,sw,sh,x,y,dw,dh);c.globalAlpha=1;
}
function preload(step){
 // Recheck the working set only at a scene boundary or when a request settles.
 if(step===preloadStep&&!preloadDirty)return;preloadStep=step;preloadDirty=false;
 // Keep a short runway, but never let speculative requests crowd out the feed.
 const wanted=[],visible=new Set([pairPrevious?.asset,pairA?.asset,pairB?.asset].filter(index=>index!==undefined));
 for(let offset=0;offset<4;offset++){const index=sceneAt(step+offset).asset;if(index!==undefined&&!wanted.includes(index)&&new Set([...visible,...wanted,index]).size<=MAX_READY)wanted.push(index);}
 const pinned=new Set([...wanted,...visible]);
 for(const asset of assets){if(assets.filter(a=>a.ready).length<=MAX_READY)break;if(asset.ready&&!pinned.has(assets.indexOf(asset))){asset.ready=false;asset.requested=false;asset.image=new Image();asset.attempts=0;}}
 for(const index of wanted){if(activeLoads>=MAX_LOADING)break;loadAsset(index);}
}
function clouds(softness=1){
 if(!cloudReady||!softness)return;
 const {w,h}=f;
 c.save();
 for(let i=0;i<6;i++){
  const t=phase*(.025+i*.003)+i*2.399963;
  const x=w*(.5+.46*Math.sin(t+cloudTravel*.16*(i%2?1:-1)));
  const y=h*(.5+.43*Math.cos(t*.73+i+cloudTravel*.11));
  const width=w*(.46+(i%3)*.12),height=h*(.28+(i%2)*.16);
  c.globalAlpha=softness*(.025+scrollEnergy*.18)*(.65+.35*Math.sin(t*.51+i)**2);
  c.drawImage(cloud,x-width/2,y-height/2,width,height);
 }
 c.restore();
}
function paint(){if(!f.w||document.hidden||contextLost)return;const {w,h,d}=f;c.setTransform(d,0,0,d,0,0);
 // Never expose a transparent viewport between frames, even before a decoded
 // image is available. The CSS backing also covers a discarded browser layer.
 c.globalAlpha=1;c.globalCompositeOperation='source-over';c.fillStyle='#101719';c.fillRect(0,0,w,h);
 const timing=sceneTime(phase),{step,progress}=timing,blend=smooth(progress);
 preload(step);
 // Freeze each dissolve's endpoints. A late image must not replace a visible layer mid-fade.
 // The first decoded image must replace a procedural startup fallback, even
 // when a nearer interlude precedes it and reduced motion freezes this step.
 if(pairStep!==step){pairStep=step;pairPrevious=pairA||available(step,initialImageReady);pairA=pairB||pairPrevious;pairB=available(step+1);}
 // A's weights already ease each shoulder to zero velocity. Use one raw
 // duration-normalized progress for both composition and cloud attenuation.
 dissolve(pairPrevious,pairA,pairB,progress,step);
 clouds(2*(1-Math.max(...weights(progress))));
 c.save();c.globalAlpha=.16;c.strokeStyle='#c7e2cf';c.lineWidth=1;
 for(let line=0;line<3;line++){const y=h*(.2+line*.28),drift=Math.sin(phase*.08+line)*h*.035;c.beginPath();c.moveTo(w*.35,y+drift);c.bezierCurveTo(w*.55,y-h*.16,w*.74,y+h*.16,w*1.08,y-drift);c.stroke();}c.restore();
 const shade=c.createLinearGradient(0,0,w,0);shade.addColorStop(0,'#101719ed');shade.addColorStop(.55,'#101719cc');shade.addColorStop(.84,'#101719cc');shade.addColorStop(1,w<650?'#101719cc':'#10171966');c.fillStyle=shade;c.fillRect(0,0,w,h);
 window.__reportFlow={pvSpeed:IDLE_SPEED+scrollBoost,transitionVersion:4,transitionMix:2*(1-Math.max(...weights(progress))),phase,scrollEnergy,cloudTravel,flowDirection,paused:paused(),scene:step%scenes.length,sceneIndex:timing.sourceIndex,sequenceCycle:Math.floor(step/scenes.length),sequenceMode:'shuffle-bag',sceneDuration:timing.seconds,sceneRole:timing.role,transition:transitionFor(progress<.5?pairA:pairB),sceneProgress:progress,reelSeconds,blend,loaded:assets.filter(a=>a.ready).length};paintPending=false;
}
function tick(now){raf=0;if(document.hidden||contextLost||paused()||!ready()){last=null;scrollBoost=0;return;}
 const dt=last===null?0:Math.min((now-last)/1000,.1);last=now;
 const nextBoost=scrollBoost*Math.exp(-BOOST_DECAY*dt);
 phase+=IDLE_SPEED*dt+(scrollBoost-nextBoost)/BOOST_DECAY;
 // Input changes a target, never pixels directly. Only the soft overlay follows.
 const follow=1-Math.exp(-6*dt);
 scrollEnergy+=(clamp(scrollBoost/MAX_BOOST)-scrollEnergy)*follow;
 flowDirection+=(scrollDirection-flowDirection)*follow;
 cloudTravel+=dt*scrollEnergy*flowDirection*1.7;
 scrollBoost=nextBoost;
 if(paintPending||now-lastPaint>=FRAME){paint();lastPaint=now;}if(!raf)raf=requestAnimationFrame(tick);
}
function sync(){if(raf)cancelAnimationFrame(raf);raf=0;last=null;if(paused()||document.hidden||contextLost)scrollBoost=0;paintPending=true;if(document.hidden||contextLost)return;paint();if(!raf&&!paused()&&ready())raf=requestAnimationFrame(tick);}
addEventListener('scroll',()=>{const movement=scrollY-previousScroll,delta=Math.abs(movement);previousScroll=scrollY;if(!paused()&&!document.hidden&&!contextLost&&ready()&&delta){scrollDirection=Math.sign(movement);scrollBoost=Math.min(MAX_BOOST,scrollBoost+delta*SCROLL_GAIN);}},{passive:true});
addEventListener('resize',size);reduced.addEventListener('change',sync);document.addEventListener('visibilitychange',sync);
// Canvas 2D restores by default: do not cancel contextlost (unlike WebGL).
// Restore a paused/reduced-motion frame too, without changing its scene clock.
canvas.addEventListener?.('contextlost',()=>{contextLost=true;scrollBoost=0;if(raf)cancelAnimationFrame(raf);raf=0;last=null;paintPending=true;});
canvas.addEventListener?.('contextrestored',()=>{contextLost=false;sync();});
function restoreMask(){maskStep=-1;maskStyle=null;maskSeed=-1;maskField=null;sync();}
reveal.addEventListener?.('contextlost',()=>{revealLost=true;sync();});
reveal.addEventListener?.('contextrestored',()=>{revealLost=false;restoreMask();});
mist.addEventListener?.('contextlost',()=>{mistLost=true;sync();});
mist.addEventListener?.('contextrestored',()=>{mistLost=false;restoreMask();});
cloud.addEventListener?.('contextlost',()=>{cloudReady=false;sync();});
cloud.addEventListener?.('contextrestored',()=>{rebuildCloud();sync();});
// A BFCache return can restore a paused page without a visibility transition.
addEventListener('pageshow',()=>{size();sync();});
const cards=document.querySelector('#papers');if(cards)new MutationObserver(changes=>{for(const change of changes)for(const node of change.addedNodes)if(node.nodeType===1)mark(node);}).observe(cards,{childList:true});
// The feed's existing pause button changes body.paused. Stop scheduling, not only motion.
new MutationObserver(sync).observe(document.body,{attributes:true,attributeFilter:['class']});mark();size();
// Requests are bounded, decoded before drawing, and retried once after a timeout/error.
function recoverAssets(){
 if(ready()||activeLoads>=MAX_LOADING)return;
 const scene=scenes.find(scene=>{const asset=assets[scene.asset];return asset&&!asset.requested&&!asset.ready&&asset.attempts<2&&Date.now()>=asset.retryAt;});
 if(scene)loadAsset(scene.asset);
}
function loadAsset(index){
 const asset=assets[index];if(asset.requested||asset.ready||activeLoads>=MAX_LOADING||Date.now()<asset.retryAt||asset.attempts>=2)return;
 asset.requested=true;asset.failed=false;asset.attempts++;activeLoads++;
 const image=asset.image;let settled=false;
 const timer=setTimeout(()=>finish(false),ASSET_TIMEOUT);
 function finish(ok){
  if(settled)return;settled=true;clearTimeout(timer);image.onload=image.onerror=null;activeLoads--;
  asset.ready=!!ok;asset.failed=!ok;preloadDirty=true;
  if(!ok){image.src='';asset.image=new Image();asset.requested=false;asset.retryAt=Date.now()+15000;if(asset.attempts<2)setTimeout(()=>{preloadDirty=true;preload(sceneTime(phase).step);recoverAssets();},15000);}
  // Initial paint may adopt the first image; later loads never reset the animation clock.
  if(ok&&!initialImageReady){initialImageReady=true;pairStep=-1;pairPrevious=pairA=pairB=null;}
  paintPending=true;
  preload(sceneTime(phase).step);recoverAssets();
  if(!document.hidden&&!contextLost&&ready()){if(paused())paint();else if(!raf)raf=requestAnimationFrame(tick);}
 }
 image.decoding='async';image.fetchPriority=index===sceneAt(0).asset?'high':'low';
 function decoded(){if(settled)return;if(typeof image.decode==='function')image.decode().then(()=>finish(!!image.naturalWidth),()=>finish(false));else finish(!!image.naturalWidth);}
 image.onload=decoded;image.onerror=()=>finish(false);
 image.src='/assets/'+asset.name;if(image.complete&&image.naturalWidth)decoded();
}
// Fetch the visible image first; the compact atlas remains a recovery fallback.
preload(0);
})();
