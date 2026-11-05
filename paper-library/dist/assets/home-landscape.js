/* One generated place, observed at three distances. The library is stable over the scene.
   Camera and water share the existing clock; no new RAF, pixel readback or outside service. */
(function(){
'use strict';
const VIEWS=[{x:.5,y:.5,zoom:1,water:.58},{x:.52,y:.76,zoom:1.4,water:.28},{x:.82,y:.48,zoom:1.45,water:.78}];
function crop(iw,ih,w,h,view,pan=0){const fit=Math.max(w/iw,h/ih)*Math.max(1,view.zoom),sw=w/fit,sh=h/fit;return{sx:Math.max(0,Math.min(iw-sw,view.x*iw-sw/2+pan*iw*.035)),sy:Math.max(0,Math.min(ih-sh,view.y*ih-sh/2)),sw,sh};}
function create(canvas,onReady=()=>{}){
 const ctx=canvas.getContext('2d'),scene=document.createElement('canvas'),sceneCtx=scene.getContext('2d');
 const failure={isReality:true,failed:true,equation:'',resize(){},draw(){return Array.from({length:6},()=>({x:0,y:0,front:true}));}};
 if(!ctx||!sceneCtx)return failure;
 const image=new Image();let ready=false,failed=false,width=1,height=1,dpr=1,mode=0,start=0,pan=0,current={...VIEWS[0]},from={...current};
 image.onload=()=>{ready=true;onReady();};image.onerror=()=>{failed=true;ready=false;onReady();};image.src='/assets/river-city-dawn.webp';
 function draw(time,nextMode,_preview,_blend,_selected,animate=true){
  nextMode=Math.max(0,Math.min(2,nextMode));if(nextMode!==mode){from={...current};mode=nextMode;start=time;}
  const t=animate?Math.max(0,Math.min(1,(time-start)/.45)):1,ease=t*t*(3-2*t);for(const k of ['x','y','zoom','water'])current[k]=from[k]+(VIEWS[mode][k]-from[k])*ease;
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);ctx.fillStyle='#10191c';ctx.fillRect(0,0,width,height);
  if(ready){try{
   const view={...current,zoom:current.zoom*(1+(animate?.004*Math.sin(time*.19):0))},c=crop(image.naturalWidth,image.naturalHeight,width,height,view,pan);
   sceneCtx.drawImage(image,c.sx,c.sy,c.sw,c.sh,0,0,width,height);ctx.drawImage(scene,0,0,width,height);
   // A restrained, clearly authored movement in the water; no measured weather claim.
   if(animate){const top=Math.floor(height*current.water),step=10;ctx.save();ctx.beginPath();ctx.rect(0,top,width,height-top);ctx.clip();
    for(let y=top;y<height;y+=step){const h=Math.min(step,height-y),strength=(y-top)/Math.max(1,height-top),dx=Math.sin(y*.075-time*.85)*strength*1.5;ctx.drawImage(scene,0,y,width,h,dx,y,width,h);}ctx.restore();}
   const shade=ctx.createLinearGradient(0,0,width,0);shade.addColorStop(0,'rgba(6,14,18,.76)');shade.addColorStop(.47,'rgba(6,14,18,.46)');shade.addColorStop(.70,'rgba(6,14,18,.08)');shade.addColorStop(1,'rgba(6,14,18,.04)');ctx.fillStyle=shade;ctx.fillRect(0,0,width,height);
  }catch(_){failed=true;ready=false;}}
  return Array.from({length:6},(_,i)=>({x:width*.3,y:height*(.25+i*.1),front:true}));
 }
 return{isReality:true,get failed(){return failed;},equation:'',resize(w,h,scale){width=Math.max(1,Math.round(w));height=Math.max(1,Math.round(h));dpr=Math.min(2,scale);canvas.width=width*dpr;canvas.height=height*dpr;scene.width=width;scene.height=height;},setBoundary(v){pan=Math.max(-1,Math.min(1,(v-.5)*2));},setTitle(){},draw};
}
window.ResearchReality={create,crop,VIEWS};
})();
