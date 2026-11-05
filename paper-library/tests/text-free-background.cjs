'use strict';
const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const source=fs.readFileSync('dist/assets/cinema-field.js','utf8');
assert.ok(!/\b(?:fillText|strokeText)\s*\(/.test(source),'background renderer never draws text');
assert.ok(!/kind:'(?:equations|code)'|tile:2\}|research-world\.webp/.test(source),'text-bearing scenes excluded');
let next,strokes=0,images=0;
const seen=new Set(),loaded=[];
const gradient={addColorStop(){}};
const ctx=new Proxy({createLinearGradient:()=>gradient,stroke(){strokes++},drawImage(){images++},fillText(){throw Error('background text')},strokeText(){throw Error('background text')}},{get:(o,k)=>o[k]||(()=>{})});
const canvas={setAttribute(){},getContext:()=>ctx,remove(){}};
const context={setTimeout:()=>1,clearTimeout(){},window:{},document:{hidden:false,body:{prepend(){},classList:{contains:()=>false}},createElement:()=>canvas,querySelectorAll:()=>[],querySelector:()=>({}),addEventListener(){}},Image:class{constructor(){this.complete=true;this.naturalWidth=400;this.naturalHeight=400;}set src(x){loaded.push(x)}},matchMedia:()=>({matches:false,addEventListener(){}}),scrollY:0,innerWidth:1200,innerHeight:800,devicePixelRatio:1,requestAnimationFrame(fn){next=fn;return 1},cancelAnimationFrame(){},addEventListener(){},MutationObserver:class{observe(){}}};
vm.runInNewContext(source,context);
for(let i=0;i<4200;i++){next(i*100);seen.add(context.window.__reportFlow.scene)}
assert.equal(seen.size,29,'all 29 text-free scenes exercised over a complete loop');
assert.ok(strokes>100&&images>100,'photos, geometry, network and wave continue rendering');
assert.deepEqual(loaded.sort(),['cinema-atlas','river-city-dawn','quiet-media-atlas-v1','empty-platform','spaceship-window','submerged-city','forest-library','living-gallery','garden-conservatory','ocean-corridor','forest-theater','city-reflection','model-city'].map(n=>'/assets/'+n+'.webp').sort());
console.log('PASS text-free background: all 29 scenes exercised with zero canvas text calls; text-bearing image scenes excluded; photos/lines preserved. Mock, not browser visual QA.');
