/* Direct, bounded observation. No inertia, network, timers or independent RAF. */
(function () {
  'use strict';
  function attach(element, resetButton, onChange, help=null, onUnavailable=null, pointerHost=element) {
    let yaw=0,pitch=0,drag=null,enabled=false,suppressClick=null;
    const clamp=(value,limit)=>Math.max(-limit,Math.min(limit,value));
    function cancel(){const id=drag?.id;drag=null;element.setAttribute('data-dragging','false');if(id!==undefined)try{element.releasePointerCapture(id);}catch(_) {}}
    function setView(nextYaw,nextPitch){
      yaw=clamp(nextYaw,.35);pitch=clamp(nextPitch,.18);
      onChange(yaw,pitch);
    }
    function reset(){if(enabled){cancel();setView(0,0);}}
    pointerHost.addEventListener('pointerdown',event=>{
      suppressClick=null;
      const allowed=pointerHost===element||event.target===element||element.contains?.(event.target)||event.target?.closest?.('.location-map');
      if(!enabled||!allowed||event.isPrimary===false){cancel();return;}
      if(event.button!==undefined&&event.button!==0)return;
      drag={id:event.pointerId,x:event.clientX,y:event.clientY,yaw,pitch,touch:event.pointerType==='touch',active:false};
    });
    pointerHost.addEventListener('pointermove',event=>{
      if(!enabled||!drag||event.pointerId!==drag.id)return;
      const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
      // Vertical touch remains ordinary page scrolling; mouse supports both axes.
      if(!drag.active&&drag.touch&&Math.abs(dy)>8&&Math.abs(dy)>Math.abs(dx)*1.2){cancel();return;}
      if(!Number.isFinite(dx)||!Number.isFinite(dy)){cancel();return;}
      if(!drag.active&&drag.touch&&(Math.abs(dx)<8||Math.abs(dx)<Math.abs(dy)*1.2))return;
      if(!drag.active&&!drag.touch&&Math.hypot(dx,dy)<6)return;
      if(!drag.active){drag.active=true;element.setAttribute('data-dragging','true');try{element.setPointerCapture(event.pointerId);}catch(_) {}}
      if(event.cancelable)event.preventDefault();
      setView(drag.yaw+dx*.004,drag.pitch+(drag.touch?0:dy*.003));
    });
    function finish(event){if(drag&&event.pointerId===drag.id){if(drag.active)suppressClick={id:drag.id,until:Date.now()+400};cancel();}}
    pointerHost.addEventListener('pointerup',finish);
    pointerHost.addEventListener('click',event=>{
      const pending=suppressClick;suppressClick=null;
      if(pending&&event.detail!==0&&Date.now()<=pending.until&&(event.pointerId===undefined||event.pointerId===pending.id)){event.preventDefault();event.stopPropagation();}
    },true);
    pointerHost.addEventListener('pointercancel',cancel);
    element.addEventListener('lostpointercapture',cancel);
    pointerHost.addEventListener('pointerleave',event=>{if(drag&&!drag.active&&event.pointerType==='mouse')cancel();});
    element.addEventListener('keydown',event=>{
      if(!enabled)return;
      const steps={ArrowLeft:[-.06,0],ArrowRight:[.06,0],ArrowUp:[0,-.04],ArrowDown:[0,.04]};
      if(event.key==='Home'||event.key==='Escape'){event.preventDefault();reset();}
      else if(steps[event.key]){event.preventDefault();cancel();setView(yaw+steps[event.key][0],pitch+steps[event.key][1]);}
    });
    resetButton.addEventListener('click',reset);
    window.addEventListener('blur',cancel);
    window.addEventListener('pointerup',finish);
    window.addEventListener('pointercancel',cancel);
    document.addEventListener('visibilitychange',()=>{if(document.hidden)cancel();});
    return {setEnabled(value){if(enabled===!!value)return;const restore=!value&&(document.activeElement===element||document.activeElement===resetButton);enabled=!!value;element.hidden=!enabled;resetButton.disabled=!enabled;if(help)help.hidden=!enabled;if(!enabled)cancel();if(restore&&onUnavailable)onUnavailable();},reset};
  }
  window.ResearchView={attach};
})();
