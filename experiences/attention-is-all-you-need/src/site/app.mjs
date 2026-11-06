import {mountQK} from '../interactives/qk-matching.mjs';
import {mountConceptLabs} from './labs.mjs';
import {mountAttentionFlow} from './attention-flow.mjs';
export function initSite(document=globalThis.document) {
  const cleanups=[];
  for(const root of document.querySelectorAll('[data-qk-interactive]')){
    const controller=mountQK(root,{theme:'editorial'});cleanups.push(()=>controller.destroy());
  }
  cleanups.push(mountConceptLabs(document));
  cleanups.push(mountAttentionFlow(document));
  for(const video of document.querySelectorAll('video')){
    const pauseOthers=()=>{document.querySelectorAll('video').forEach(other=>{if(other!==video)other.pause();});};
    const onError=()=>{const message=video.closest('.unit-media')?.querySelector('[data-media-error]');if(message)message.hidden=false;};
    const onReady=()=>{const message=video.closest('.unit-media')?.querySelector('[data-media-error]');if(message)message.hidden=true;};
    video.addEventListener('play',pauseOthers);video.addEventListener('error',onError);
    video.addEventListener('loadeddata',onReady);
    const sources=[...video.querySelectorAll('source')];sources.forEach(source=>source.addEventListener('error',onError));
    cleanups.push(()=>{video.removeEventListener('play',pauseOthers);video.removeEventListener('error',onError);video.removeEventListener('loadeddata',onReady);sources.forEach(source=>source.removeEventListener('error',onError));});
  }
  const progress=document.querySelector('[data-current-unit]');
  const links=[...document.querySelectorAll('[data-unit-link]')];
  const setCurrent=id=>{const unit=document.getElementById(id);if(!unit?.dataset.unitOrder)return;if(progress)progress.textContent=unit.dataset.unitOrder+' / '+document.querySelectorAll('[data-unit-order]').length;links.forEach(a=>a.getAttribute('href')==='#'+id?a.setAttribute('aria-current','location'):a.removeAttribute('aria-current'));};
  const onHash=()=>setCurrent(document.defaultView.location.hash.slice(1));document.defaultView.addEventListener('hashchange',onHash);cleanups.push(()=>document.defaultView.removeEventListener('hashchange',onHash));onHash();
  if(document.defaultView.IntersectionObserver){
    const observer=new document.defaultView.IntersectionObserver(entries=>{const visible=entries.filter(e=>e.isIntersecting).sort((a,b)=>a.boundingClientRect.top-b.boundingClientRect.top);if(visible[0])setCurrent(visible[0].target.id);},{rootMargin:'-15% 0px -55% 0px'});
    document.querySelectorAll('[data-unit-order]').forEach(el=>observer.observe(el));cleanups.push(()=>observer.disconnect());
  }
  document.documentElement.classList.add('has-js');
  return ()=>{cleanups.forEach(fn=>fn());document.documentElement.classList.remove('has-js');};
}

