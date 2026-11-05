/* One source, three readings: generated photograph → actual title glyphs → glyph fragments.
   Cached layers share coordinates and sampled colours. No network beyond the local image, no own RAF. */
(function(){
'use strict';
function create(canvas,onReady=()=>{}){
 const ctx=canvas.getContext('2d');if(!ctx)return {isReality:true,failed:true,equation:'',resize(){},draw(){return Array.from({length:6},()=>({x:0,y:0,front:true}));}};
 const image=new Image(),layers=[0,1,2].map(()=>document.createElement('canvas')),reveal=document.createElement('canvas');
 const layerContexts=layers.map(layer=>layer.getContext('2d')),revealContext=reveal.getContext('2d');
 if(layerContexts.some(c=>!c)||!revealContext)return {isReality:true,failed:true,equation:'',resize(){},draw(){return Array.from({length:6},()=>({x:0,y:0,front:true}));}};
 let width=1,height=1,dpr=1,title='Attention Is All You Need',ready=false,key='',boundary=.55,mode=0,fromMode=0,currentMode=0,transitionStart=0,fragments=[],failed=false;
 const sample=(pixels,x,y)=>{const p=(Math.max(0,Math.min(height-1,Math.floor(y)))*width+Math.max(0,Math.min(width-1,Math.floor(x))))*4;return [pixels[p],pixels[p+1],pixels[p+2]];};
 function rebuild(){
  if(!ready)return;const next=[width,height,title].join(':');if(next===key)return;try{
  layers.forEach(layer=>{layer.width=width;layer.height=height;});reveal.width=width;reveal.height=height;
  const [photo,letters,particles]=layerContexts;
  const ratio=Math.max(width/image.naturalWidth,height/image.naturalHeight),w=image.naturalWidth*ratio,h=image.naturalHeight*ratio;
  photo.drawImage(image,(width-w)/2,(height-h)/2,w,h);
  const pixels=photo.getImageData(0,0,width,height).data;
  const font=width<650?15:20,row=font*1.55;letters.font='500 '+font+'px sans-serif';letters.textBaseline='middle';
  // Human-readable words retain their order; colour is sampled from the same photographic place.
  const words=title.split(/\s+/).filter(Boolean);if(!words.length)words.push('論文ノート');
  let wordIndex=0;
  for(let y=row/2;y<height;y+=row){let x=-(Math.floor(y/row)%2)*font*2;
   while(x<width){const word=words[wordIndex++%words.length];for(const glyph of word){const advance=letters.measureText(glyph).width;const rgb=sample(pixels,x+advance/2,y);letters.fillStyle='rgb('+rgb.join(',')+')';letters.fillText(glyph,x,y);x+=advance;}x+=font*.65;}
  }
  // Decomposition samples the very same glyph alpha, not unrelated random particles.
  const glyphPixels=letters.getImageData(0,0,width,height).data,step=width<650?4:5;fragments=[];
  for(let y=0;y<height;y+=step)for(let x=0;x<width;x+=step){const offset=(y*width+x)*4;if(glyphPixels[offset+3]<40)continue;
   const dx=Math.sin(x*.031+y*.017)*10,dy=Math.cos(y*.027-x*.013)*8;
   fragments.push({x,y,dx,dy,size:step*.5,color:'rgba('+glyphPixels[offset]+','+glyphPixels[offset+1]+','+glyphPixels[offset+2]+','+(glyphPixels[offset+3]/255)+')'});
   particles.fillStyle='rgba('+glyphPixels[offset]+','+glyphPixels[offset+1]+','+glyphPixels[offset+2]+','+(glyphPixels[offset+3]/255)+')';particles.fillRect(x+dx,y+dy,step*.5,step*.5);
  }
  key=next;
  }catch(_){ready=false;failed=true;key='';}
 }
 image.onload=()=>{ready=true;rebuild();onReady();};image.onerror=()=>{ready=false;failed=true;onReady();};image.src='/assets/paper-reality.webp';
 function paintLayer(index,alpha=1){ctx.globalAlpha=alpha;ctx.drawImage(layers[index],0,0,width,height);}
 function draw(time,nextMode,_preview,_blend,_selected,animate=true){
  if(nextMode!==mode){fromMode=currentMode;mode=nextMode;transitionStart=time;}
  const t=animate?Math.min(1,Math.max(0,(time-transitionStart)/.18)):1;currentMode=fromMode+(mode-fromMode)*(1-Math.pow(1-t,3));
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);ctx.fillStyle='#111517';ctx.fillRect(0,0,width,height);
  if(ready){
   if(currentMode<1){
    paintLayer(0,.84);const edge=width*Math.max(.05,Math.min(.95,boundary+.06*Math.sin(time*.45)))*(1-currentMode);
    // A spatial boundary retains image contours while samples from that image become words.
    const rc=revealContext;rc.globalCompositeOperation='source-over';rc.clearRect(0,0,width,height);rc.fillStyle='#111517';rc.fillRect(0,0,width,height);rc.drawImage(layers[1],0,0);rc.globalCompositeOperation='destination-in';const mask=rc.createLinearGradient(edge-50,0,edge+50,0);mask.addColorStop(0,'rgba(0,0,0,0)');mask.addColorStop(1,'rgba(0,0,0,1)');rc.fillStyle=mask;rc.fillRect(0,0,width,height);ctx.globalAlpha=1;ctx.drawImage(reveal,0,0);
   }else if(currentMode<1.999){
    const amount=currentMode-1;paintLayer(1,1-amount);ctx.globalAlpha=amount;
    for(const f of fragments){ctx.fillStyle=f.color;ctx.fillRect(f.x+f.dx*amount,f.y+f.dy*amount,f.size,f.size);}
   }else paintLayer(2,1);
   ctx.globalAlpha=1;
   // A broad shadow is part of the shared reading surface, not a separate boxed panel.
   const shade=ctx.createLinearGradient(0,0,width,0);shade.addColorStop(0,'rgba(9,13,15,.65)');shade.addColorStop(.65,'rgba(9,13,15,.30)');shade.addColorStop(1,'rgba(9,13,15,.12)');ctx.fillStyle=shade;ctx.fillRect(0,0,width,height);
  }
  ctx.globalAlpha=1;
  return Array.from({length:6},(_,i)=>({x:width*.5,y:height*(.3+i*.08),front:true}));
 }
 return {isReality:true,get failed(){return failed;},resize(w,h,scale){width=Math.max(1,Math.round(w));height=Math.max(1,Math.round(h));dpr=Math.min(scale,2);canvas.width=width*dpr;canvas.height=height*dpr;rebuild();},setTitle(value){if(value!==title){title=value;rebuild();}},setBoundary(value){boundary=Math.max(.05,Math.min(.95,value));},draw,equation:'',setMaterial(){},sectionLabel(){return '';}};
}
window.ResearchReality={create};
})();
