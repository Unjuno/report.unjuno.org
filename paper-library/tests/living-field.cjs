const fs=require('fs'),vm=require('vm'),assert=require('assert');
let q=[],paused=false,draws=0,resize,frame=0;
const context=new Proxy({createRadialGradient(){return {addColorStop(){}}},createLinearGradient(){return {addColorStop(){}}}}, {get(t,k){return k in t?t[k]:(...args)=>{if(k==='lineTo'||k==='ellipse')draws++;}},set(t,k,v){t[k]=v;return true}});
const canvas={dataset:{},setAttribute(){},getContext(){return context},getBoundingClientRect(){return {width:800,height:600}}};
const card={hidden:false,querySelector(){return {append(){}}},classList:{add(){}},getBoundingClientRect(){return {top:100,height:600}}};
let click;const document={hidden:false,querySelectorAll(){return [card]},querySelector(){return {addEventListener(_,fn){click=fn}}},createElement(){return canvas},body:{classList:{contains(){return paused}}},addEventListener(){}};
const window={scrollY:0,innerHeight:800,devicePixelRatio:1,matchMedia(){return {matches:false,addEventListener(){}}},requestAnimationFrame(){},ResizeObserver:true,addEventListener(){}};
function RAF(fn){q.push(fn);return ++frame}function RO(fn){resize=fn;this.observe=()=>{}}
vm.runInNewContext(fs.readFileSync('dist/assets/living-field.js','utf8'),{document,window,ResizeObserver:RO,requestAnimationFrame:RAF,cancelAnimationFrame(){},console});
const seen=new Set();let morphed=false;for(let i=0;i<2700;i++){const fn=q.shift();assert(fn,'live animation schedules a frame');fn(i*50);seen.add(canvas.dataset.subject);if(+canvas.dataset.morph>.25&&+canvas.dataset.morph<.75)morphed=true}
assert.equal(seen.size,8);assert(morphed);assert(draws>1000);paused=true;click();q.shift()(140000);const frozen=JSON.stringify(canvas.dataset),before=draws;assert.equal(q.length,0);resize();assert(draws>before,'paused resize repaints');assert.equal(JSON.stringify(canvas.dataset),frozen);paused=false;click();assert(q.length);console.log('PASS 8 subjects, real contour transition, continuous frames, pause, repaint during paused resize, resume. Mock canvas, not browser.');
