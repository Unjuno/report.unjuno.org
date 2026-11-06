/* Living type: actual glyphs follow time-varying cubic Bézier curves.
 * Semantic titles and anchors remain intact; decoration is accessibility-hidden.
 * No external assets, network calls, or dependencies. */
(() => {
  'use strict';
  if (window.__livingSplineType) return;
  window.__livingSplineType = true;
  const style = document.createElement('style');
  style.textContent = `
    .spline-title-source{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important;user-select:none!important}
    .spline-title-visual{display:inline;pointer-events:none}
    .spline-word{display:inline-block;white-space:nowrap}
    .spline-glyph{display:inline-block;transform-origin:50% 75%}
    .spline-glyph.typing-cursor{box-shadow:2px 0 currentColor}
    .content h2 a:focus .spline-glyph{opacity:1!important;box-shadow:none!important}
    .spline-type-shape{display:block;width:min(240px,60%);height:34px;margin:0 0 12px;overflow:visible;color:inherit;opacity:.5;pointer-events:none}
    .spline-type-shape path{fill:none;stroke:currentColor;stroke-width:1;vector-effect:non-scaling-stroke}
    .spline-type-shape circle{fill:currentColor}
    @media(prefers-reduced-motion:reduce){.spline-glyph,.stream-glyph{transform:none!important;opacity:1!important;box-shadow:none!important}.spline-type-shape{display:none}}
    @media print{.spline-type-shape{display:none}.spline-glyph,.stream-glyph{transform:none!important;opacity:1!important;box-shadow:none!important}}
  `;
  document.head.appendChild(style);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const records = new Map();
  const visible = new Set();
  const ns = 'http://www.w3.org/2000/svg';
  const segmenter = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter(undefined, {granularity:'grapheme'}) : null;
  let phase = 0, last = 0, painted = 0, boost = 0, lastY = scrollY, raf = 0, serial = 0;
  function svgNode(name, attrs) {
    const node = document.createElementNS(ns, name);
    for (const [key,value] of Object.entries(attrs || {})) node.setAttribute(key,value);
    return node;
  }
  const paused = () => reduced.matches || document.body.classList.contains('paused');
  function finish(record) {
    record.revealed=record.glyphs.length;record.age=2;
    record.glyphs.forEach(glyph=>{glyph.style.opacity='1';glyph.classList.remove('typing-cursor');});
  }
  function reveal(record,dt) {
    if(record.revealed>=record.glyphs.length)return;
    record.age+=dt*(1+boost*.5);
    // Short token-like bursts; layout and the accessible full text never change.
    const count=Math.min(record.glyphs.length,Math.max(3,Math.ceil(record.age/1.1*record.glyphs.length/3)*3));
    if(count===record.revealed)return;
    // Initialize hidden glyphs once. Later bursts touch only their newly
    // revealed range and move the cursor, rather than rewriting the full card.
    if(record.revealed===0){
      record.glyphs.forEach((glyph,i)=>{glyph.style.opacity=i<count?'1':'0';glyph.classList.remove('typing-cursor');});
    }else{
      record.glyphs[record.revealed-1].classList.remove('typing-cursor');
      for(let i=record.revealed;i<count;i++)record.glyphs[i].style.opacity='1';
    }
    if(count<record.glyphs.length)record.glyphs[count-1].classList.toggle('typing-cursor',true);
    record.revealed=count;
  }
  function prepare(card) {
    if (records.has(card)) return;
    const link = card.querySelector('.content h2 a');
    if (!link || !link.textContent.trim()) return;
    const title = link.textContent;
    // Arabic-script letters must share a native shaping run. Per-grapheme
    // inline-blocks break joining, including Persian/Urdu and lam-alef forms.
    // Retain the original nodes, as for unusually long titles.
    if (title.length > 260 || /\p{Script=Arabic}/u.test(title)) return;
    const source = document.createElement('span');
    source.className = 'spline-title-source';
    while (link.firstChild) source.appendChild(link.firstChild);
    const visual = document.createElement('span');
    visual.className = 'spline-title-visual';
    visual.setAttribute('aria-hidden','true');
    const words = [];
    for (const token of title.split(/(\s+)/u)) {
      if (!token) continue;
      if (/^\s+$/u.test(token)) { visual.appendChild(document.createTextNode(token)); continue; }
      const word = document.createElement('span');
      word.className = 'spline-word';
      const chars = segmenter ? Array.from(segmenter.segment(token), item => item.segment) : Array.from(token);
      const glyphs = [];
      chars.forEach(character => {
        const glyph = document.createElement('span');
        glyph.className = 'spline-glyph';
        glyph.textContent = character;
        word.appendChild(glyph);
        glyphs.push(glyph);
      });
      // CJK and long unbroken titles must keep natural wrapping on narrow screens.
      if (chars.length > 17 || /[\u3040-\u30ff\u3400-\u9fff]/u.test(token)) {
        word.style.display = 'inline';
        word.style.whiteSpace = 'normal';
      }
      visual.appendChild(word);
      words.push(glyphs);
    }
    link.append(source,visual);
    const shape = svgNode('svg', {class:'spline-type-shape', viewBox:'0 0 240 34', 'aria-hidden':'true', focusable:'false'});
    const paths = [0,1,2].map(i => {
      const path = svgNode('path', {opacity: String(1 - i * .32)});
      shape.appendChild(path);
      return path;
    });
    const dot = svgNode('circle', {r:'2'});
    shape.appendChild(dot);
    link.closest('h2').before(shape);
    const glyphs=words.flat();
    card.querySelectorAll('.paper-summary').forEach(summary=>{
      const text=summary.textContent;if(!text.trim()||text.length>600)return;
      const accessible=document.createElement('span');accessible.className='spline-title-source';
      while(summary.firstChild)accessible.appendChild(summary.firstChild);
      const visualSummary=document.createElement('span');visualSummary.setAttribute('aria-hidden','true');
      const chars=segmenter?Array.from(segmenter.segment(text),item=>item.segment):Array.from(text);
      chars.forEach(character=>{const glyph=document.createElement('span');glyph.textContent=character;glyph.className='stream-glyph';visualSummary.appendChild(glyph);glyphs.push(glyph);});
      summary.append(accessible,visualSummary);
    });
    const record={words,paths,dot,seed:serial++ * 1.83,glyphs,revealed:0,age:0};
    records.set(card,record);
    if(paused() || !observer || card.contains(document.activeElement))finish(record);else reveal(record,0);
    card.addEventListener('focusin',()=>finish(record));
  }
  const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) { prepare(entry.target); visible.add(entry.target); }
      else visible.delete(entry.target);
    });
    start();
  }, {rootMargin:'0px 0px -8% 0px'}) : null;
  const watched = new WeakSet();
  function discover(root) {
    const cards = [];
    if (root.matches?.('.entry[data-entry], .entry[data-sponsor]')) cards.push(root);
    cards.push(...(root.querySelectorAll?.('.entry[data-entry], .entry[data-sponsor]') || []));
    cards.forEach(card => {
      if (watched.has(card)) return;
      watched.add(card);
      if (observer) observer.observe(card);
      else { prepare(card); visible.add(card); }
    });
    start();
  }
  // Cubic Bézier y coordinate and tangent; x is uniformly spaced on the title.
  function cubic(t,a,b,c,d) {
    const s = 1-t;
    return s*s*s*a + 3*s*s*t*b + 3*s*t*t*c + t*t*t*d;
  }
  function paint(record,time) {
    const p = (window.__reportFlow?.phase ?? time) * .55;
    record.words.forEach((glyphs,w) => {
      const k = p + w * .43;
      const a = Math.sin(k) * 1.8;
      const b = Math.sin(k*.83 + 1.2) * 8;
      const c = Math.cos(k*.91 + .7) * 8;
      const d = Math.sin(k + .8) * 1.8;
      glyphs.forEach((glyph,i) => {
        const t = glyphs.length === 1 ? .5 : i/(glyphs.length-1);
        const y = cubic(t,a,b,c,d);
        const slope = 3*(1-t)*(1-t)*(b-a)+6*(1-t)*t*(c-b)+3*t*t*(d-c);
        const rotation = Math.max(-2.5,Math.min(2.5,slope / Math.max(10,glyphs.length*6)));
        glyph.style.transform = `translateY(${y.toFixed(2)}px) rotate(${rotation.toFixed(2)}deg)`;
      });
    });
    record.paths.forEach((path,i) => {
      const a=17+Math.sin(p+i*.6)*4, b=17+Math.sin(p*.7+i)*19;
      const c=17+Math.cos(p*.8+i)*19, d=17+Math.sin(p+1+i*.6)*4;
      path.setAttribute('d',`M0 ${a.toFixed(2)} C80 ${b.toFixed(2)} 160 ${c.toFixed(2)} 240 ${d.toFixed(2)}`);
      if (!i) {
        const t=(Math.sin(p*.4)+1)/2;
        record.dot.setAttribute('cx',(240*t).toFixed(2));
        record.dot.setAttribute('cy',cubic(t,a,b,c,d).toFixed(2));
      }
    });
  }
  function frame(now) {
    raf=0;
    if (document.hidden || paused() || !visible.size) {last=0; return;}
    const dt=last ? Math.min((now-last)/1000,.06) : 0;
    last=now;
    boost*=Math.exp(-dt*3);
    phase+=dt*(.62+boost);
    visible.forEach(card=>{const record=records.get(card);if(record)reveal(record,dt);});
    if (now-painted>32) {
      painted=now;
      visible.forEach(card => {
        if (!card.isConnected) {visible.delete(card);records.delete(card);observer?.unobserve(card);return;}
        const record=records.get(card);
        if (record) paint(record,phase);
      });
    }
    raf=requestAnimationFrame(frame);
  }
  function start() {
    if (!raf && !document.hidden && !paused() && visible.size) raf=requestAnimationFrame(frame);
  }
  addEventListener('scroll',() => {
    const y=scrollY;
    boost=Math.min(2.2,boost+Math.abs(y-lastY)*.002);
    lastY=y;
    start();
  },{passive:true});
  function sync() {
    if(raf)cancelAnimationFrame(raf);raf=0;last=0;
    if(paused())records.forEach(finish);
    start();
  }
  document.addEventListener('visibilitychange',sync);
  reduced.addEventListener('change',sync);
  addEventListener('beforeprint',()=>records.forEach(finish));
  new MutationObserver(sync).observe(document.body,{attributes:true,attributeFilter:['class']});
  discover(document);
  new MutationObserver(changes => {
    changes.forEach(change => change.addedNodes.forEach(node => {if(node.nodeType===1) discover(node);}));
    // Only removed card subtrees need cleanup; title decoration and appended
    // pages must not repeatedly scan every previously encountered record.
    changes.forEach(change => change.removedNodes.forEach(node => {
      if(node.nodeType!==1)return;
      const removed=[];
      if(node.matches?.('.entry[data-entry], .entry[data-sponsor]'))removed.push(node);
      removed.push(...(node.querySelectorAll?.('.entry[data-entry], .entry[data-sponsor]')||[]));
      for(const card of removed)if(!card.isConnected){visible.delete(card);records.delete(card);observer?.unobserve(card);}
    }));
  }).observe(document.querySelector('#papers') || document.body,{childList:true,subtree:true});
})();
