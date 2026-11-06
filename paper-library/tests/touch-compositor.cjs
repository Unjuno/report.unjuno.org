'use strict';
// CSS contract using a real parser and a deliberately limited cascade evaluator.
// This does not measure computed layout, paint order, WebKit, or GPU composition.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),css=require('css-tree');
const baseline=process.argv[2];
const after=fs.readFileSync('dist/assets/feed.css','utf8');
const marker='/* Touch scrolling: keep the opaque canvas,';
const split=after.indexOf(marker);
assert.ok(split>0&&split===after.lastIndexOf(marker),'one final touch override block');
const before=after.slice(0,split).trimEnd();
if(baseline)assert.equal(before,fs.readFileSync(path.join(baseline,'dist/assets/feed.css'),'utf8').trimEnd(),'existing CSS is unchanged');
const patch=css.parse(after.slice(split));
const patchRules=patch.children.toArray().filter(node=>node.type!=='Comment');
assert.equal(patchRules.length,1,'touch mitigation must stay in one media rule');
assert.equal(css.generate(patchRules[0].prelude),'(hover:none) and (pointer:coarse)');
const aliases={header:new Set(['header','body>header']),entry:new Set(['.entry','.cinema-field','.has-living-field','#papers>.entry']),before:new Set(['.entry:before','.entry::before','.cinema-field:before','.cinema-field::before','#papers>.entry::before']),after:new Set(['.entry:after','.entry::after','.cinema-field:after','.cinema-field::after','#papers>.entry::after'])};
function media(raw,device){
 const s=raw.replace(/\s/g,'');
 if(s==='print')return false;
 if(s==='(prefers-reduced-motion:reduce)')return device.reducedMotion;
 const max=s.match(/max-width:(\d+)px/),min=s.match(/min-width:(\d+)px/);
 if(max&&device.width>Number(max[1]))return false;
 if(min&&device.width<Number(min[1]))return false;
 if(s.includes('hover:none')&&device.hover!=='none')return false;
 if(s.includes('pointer:coarse')&&device.pointer!=='coarse')return false;
 assert(/max-width|min-width|hover:none|pointer:coarse/.test(s),'unexpected media query '+s);
 return true;
}
function specificity(s){return (s.match(/#[\w-]+/g)||[]).length*100+(s.match(/\.[\w-]+/g)||[]).length*10+(s.match(/(^|>)[a-z][\w-]*/g)||[]).length+(s.match(/::?(before|after)/g)||[]).length;}
function cascade(source,target,device){
 const result={},priority={};let order=0;
 function visit(list){for(const node of list||[]){
  if(node.type==='Atrule'){if(node.name==='media'&&media(css.generate(node.prelude),device))visit(node.block.children);continue;}
  if(node.type!=='Rule')continue;
  const selectors=css.generate(node.prelude).split(',').filter(s=>aliases[target].has(s));
  order++;if(!selectors.length)continue;
  const rank=Math.max(...selectors.map(specificity))*10000+order;
  for(const decl of node.block.children){if(decl.type!=='Declaration')continue;const score=rank+(decl.important?1e9:0);if(score>=(priority[decl.property]??-1)){priority[decl.property]=score;result[decl.property]=css.generate(decl.value);}}
 }}
 visit(css.parse(source).children);return result;
}
const results=[];
for(const width of [320,390,650,844,1280])for(const hover of ['none','hover'])for(const pointer of ['fine','coarse'])for(const reducedMotion of [false,true]){
 const device={width,hover,pointer,reducedMotion};
 const touch=hover==='none'&&pointer==='coarse';
 const old=Object.fromEntries(Object.keys(aliases).map(t=>[t,cascade(before,t,device)]));
 const now=Object.fromEntries(Object.keys(aliases).map(t=>[t,cascade(after,t,device)]));
 if(!touch)assert.deepEqual(now,old,'outside the touch query CSS must stay unchanged');
 else{
  assert.equal(old.header['backdrop-filter'],'blur(15px)');assert.equal(now.header['backdrop-filter'],'none');assert.equal(now.header['-webkit-backdrop-filter'],'none');assert.equal(now.header.background,'#101719');
  assert.equal(old.entry.isolation,'isolate');assert.equal(now.entry.isolation,'isolate','preserve per-card stacking, including no-JS artwork');
  assert.deepEqual(now.entry,old.entry,'all reading geometry and entry stacking rules stay unchanged');
  for(const target of ['before','after']){assert.notEqual(old[target]['mask-image'],'none');assert.equal(now[target]['mask-image'],'none');assert.equal(now[target]['-webkit-mask-image'],'none');assert.equal(now[target].display,'none');assert.equal(now[target].content,'none');}
  for(const key of ['margin-block-start','padding-block','min-height','padding','position'])assert.equal(now.entry[key],old.entry[key],key+' preserves reading geometry');
 }
 results.push({...device,touch,headerBackdrop:now.header['backdrop-filter'],entryMasksEnabled:['before','after'].filter(t=>now[t].display!=='none'&&now[t]['mask-image']!=='none').length});
}
// Optional release comparison checks every asset, not just the active runtime.
let unchangedAssets=0;
if(baseline){
 function compare(relative){
  const current=path.join('dist/assets',relative),previous=path.join(baseline,'dist/assets',relative);
  if(fs.statSync(current).isDirectory()){
   assert.deepEqual(fs.readdirSync(current).sort(),fs.readdirSync(previous).sort(),relative+' asset inventory');
   for(const name of fs.readdirSync(current))compare(path.join(relative,name));
  }else if(relative!=='feed.css'){
   assert.deepEqual(fs.readFileSync(current),fs.readFileSync(previous),relative+' unchanged');unchangedAssets++;
  }
 }
 compare('');
}
console.log(JSON.stringify({CSS_CONTRACT_NOT_GPU_TEST:true,baselineCompared:!!baseline,unchangedAssets,profileCount:results.length,touchProfileCount:results.filter(x=>x.touch).length,profiles:results},null,2));
