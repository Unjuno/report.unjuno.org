import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {GUIDED_PRACTICE} from '../src/site/guided-practice.mjs';
import {DEFAULTS} from '../src/site/labs.mjs';
const {Window}=await import(process.env.QK_DOM_MODULE||'happy-dom');
const html=await readFile(new URL('../build-local/index.html',import.meta.url),'utf8');
const config=JSON.parse(await readFile(new URL('../content/experience.json',import.meta.url),'utf8'));
const settings={enableJavaScriptEvaluation:false,disableCSSFileLoading:true,disableJavaScriptFileLoading:true};
const win=new Window({url:'file:///local/index.html',settings});
win.document.write(html);const doc=win.document;win.eval(doc.querySelector('script').textContent);
const staticWin=new Window({settings});staticWin.document.write(html);
const lab=id=>doc.querySelector('[data-concept-lab="'+id+'"]');
const unit=id=>doc.getElementById('unit-'+id);
const set=(id,name,value)=>{const control=lab(id).querySelector('[data-param="'+name+'"]');control.value=String(value);control.dispatchEvent(new win.Event(control.tagName==='SELECT'?'change':'input',{bubbles:true}));return lab(id);};
const reset=id=>lab(id).querySelector('[data-lab-reset]').click();
const texts=(root,selector)=>[...root.querySelectorAll(selector)].map(el=>el.textContent);
const barValues=id=>texts(lab(id),'.lab-bar strong');
const result=id=>lab(id).querySelector('.lab-result').textContent;

test('all 11 units have their own complete prediction, experiment and answer',()=>{
  assert.deepEqual(Object.keys(GUIDED_PRACTICE),config.units.map(u=>u.id));
  for(const {id} of config.units){const p=GUIDED_PRACTICE[id];assert.ok(p.prediction.length>20);assert.ok(p.answer.length>30);assert.ok(p.steps.length>=2);assert.equal(unit(id).querySelector('.practice-prediction').textContent,p.prediction);assert.deepEqual(texts(unit(id),'.practice-steps li'),p.steps);assert.equal(unit(id).querySelector('.practice-answer').textContent,p.answer);}
});
test('each unit preserves video/read → predict/try → closed answer → next order',()=>{
  for(const {id} of config.units){const u=unit(id),stages=u.querySelectorAll('.stage');assert.equal(stages.length,3);assert.ok(stages[0].querySelector('.unit-media'));assert.ok(stages[1].querySelector('.practice-prediction'));assert.ok(stages[1].querySelector('[data-concept-lab],[data-qk-interactive]'));assert.ok(stages[2].querySelector('.practice-answer'));const answer=u.querySelector('.unit-observation');assert.equal(answer.open,false);assert.equal(answer.firstElementChild.tagName,'SUMMARY');assert.ok(stages[1].innerHTML.indexOf('guided-practice')<stages[1].innerHTML.indexOf('data-concept-lab')||id==='query-key');assert.ok(u.querySelector('.next-unit[href]'));}
});
test('prediction, instructions, native answer reveal and next links exist without JavaScript',()=>{
  const d=staticWin.document;assert.equal(d.querySelectorAll('.practice-prediction').length,11);assert.equal(d.querySelectorAll('.practice-answer').length,11);assert.equal(d.querySelectorAll('.unit-observation:not([open]) > summary').length,11);assert.equal(d.querySelectorAll('.next-unit[href]').length,11);assert.equal(d.querySelectorAll('.guided-practice[aria-labelledby]').length,11);for(const el of d.querySelectorAll('.guided-practice'))assert.ok(d.getElementById(el.getAttribute('aria-labelledby')));
});
test('sequence experiment reproduces five to eleven adjacent links, direct link stays one',()=>{
  reset('sequence');assert.deepEqual(texts(lab('sequence'),'.comparison strong'),['5','1']);set('sequence','n',12);assert.deepEqual(texts(lab('sequence'),'.comparison strong'),['11','1']);reset('sequence');
});
test('QK experiment resets edited Keys before reproducing rightward and zero queries',()=>{
  const qk=unit('query-key');const key=qk.querySelector('[data-vector=k][data-axis="0"]');key.value='-2';key.dispatchEvent(new win.Event('input',{bubbles:true}));qk.querySelector('[data-action=reset]').click();assert.equal(key.value,'2');qk.querySelector('[data-preset=horizontal]').click();assert.deepEqual(texts(qk,'[data-score]'),['4','0','-2']);qk.querySelector('[data-preset=zero]').click();assert.deepEqual(texts(qk,'[data-score]'),['0','0','0']);qk.querySelector('[data-action=reset]').click();
});
test('softmax experiment changes B/C weights despite fixed B/C scores and compares scaling',()=>{
  reset('normalize');assert.deepEqual(barValues('normalize'),['0.446','0.446','0.108']);set('normalize','a',4);assert.deepEqual(barValues('normalize'),['0.768','0.187','0.045']);assert.equal(lab('normalize').querySelector('[data-param=b]').value,'2');assert.equal(lab('normalize').querySelector('[data-param=c]').value,'0');set('normalize','scale','no');assert.deepEqual(barValues('normalize'),['0.867','0.117','0.016']);assert.equal(lab('normalize').querySelector('.lab-result strong').textContent,'1');reset('normalize');
});
test('Value experiment changes only the selected output component with fixed weights',()=>{
  reset('value-mix');const weights=texts(lab('value-mix'),'.matrix-list small');assert.ok(result('value-mix').includes('[0.337, 0.554]'));set('value-mix','cx',2);assert.ok(result('value-mix').includes('[0.663, 0.554]'));set('value-mix','cy',-2);assert.ok(result('value-mix').includes('[0.663, 0.229]'));assert.deepEqual(texts(lab('value-mix'),'.matrix-list small'),weights);reset('value-mix');
});
test('two-head experiment swaps the head results but preserves this fixed average',()=>{
  reset('multi-head');set('multi-head','x',2);set('multi-head','y',0);const heads=texts(lab('multi-head'),'.vector-output');assert.deepEqual(heads,['[0.918, 0.068]','[-0.141, 0.955]']);assert.ok(result('multi-head').includes('[0.388, 0.512]'));const mean=result('multi-head');set('multi-head','x',0);set('multi-head','y',2);assert.deepEqual(texts(lab('multi-head'),'.vector-output'),heads.toReversed());assert.equal(result('multi-head'),mean);assert.ok(GUIDED_PRACTICE['multi-head'].answer.includes('一般のMulti-headで必ず同じになる性質ではありません'));reset('multi-head');
});
test('position experiment shows paired sine/cosine and slower high-index components',()=>{
  reset('position');assert.deepEqual(texts(lab('position'),'.position-values strong'),['0','1','0','1','0','1','0','1']);set('position','position',1);assert.deepEqual(texts(lab('position'),'.position-values strong').slice(0,2),['0.841','0.54']);set('position','position',10);const values=texts(lab('position'),'.position-values strong');assert.deepEqual(values.slice(0,2),['-0.544','-0.839']);assert.deepEqual(values.slice(-2),['0.01','1']);reset('position');
});
test('mask experiment differentiates available shifted input from next target',()=>{
  reset('causal-mask');assert.deepEqual(texts(lab('causal-mask'),'.allowed span'),['BOS','A','B']);assert.deepEqual(texts(lab('causal-mask'),'.masked strong'),['0']);assert.ok(lab('causal-mask').querySelector('[data-lab-output]>p').textContent.includes('C'));set('causal-mask','position',0);assert.deepEqual(texts(lab('causal-mask'),'.allowed strong'),['1']);assert.equal(lab('causal-mask').querySelectorAll('.masked').length,3);set('causal-mask','position',3);assert.equal(lab('causal-mask').querySelectorAll('.masked').length,0);assert.ok(lab('causal-mask').querySelector('[data-lab-output]>p').textContent.includes('EOS'));reset('causal-mask');
});
test('decoder experiment explicitly labels targets rather than presenting them as shifted input',()=>{
  reset('encoder-decoder');assert.ok(lab('encoder-decoder').querySelector('[data-token-row-label]').textContent.includes('Decoder入力はBOS・A・B・C'));assert.deepEqual(texts(lab('encoder-decoder'),'.token-line span'),['A','B','C','EOS']);set('encoder-decoder','mode','generate');set('encoder-decoder','step',0);assert.deepEqual(texts(lab('encoder-decoder'),'.token-line span'),['?','?','?','?']);set('encoder-decoder','step',1);assert.deepEqual(texts(lab('encoder-decoder'),'.token-line span'),['A','?','?','?']);set('encoder-decoder','step',3);assert.deepEqual(texts(lab('encoder-decoder'),'.token-line span'),['A','B','C','?']);reset('encoder-decoder');
});
test('cost experiment produces fourfold attention term and twofold recurrent term',()=>{
  reset('sequence-cost');assert.ok(result('sequence-cost').includes('16,384'));const first=barValues('sequence-cost').map(Number);set('sequence-cost','n',256);assert.ok(result('sequence-cost').includes('65,536'));const second=barValues('sequence-cost').map(Number);assert.equal(second[0]/first[0],4);assert.equal(second[1]/first[1],2);set('sequence-cost','n',512);assert.equal(barValues('sequence-cost')[0],barValues('sequence-cost')[1]);assert.ok(result('sequence-cost').includes('262,144'));reset('sequence-cost');
});
test('reported comparison remains 2.04 BLEU points with benchmark and ensemble caveats',()=>{
  reset('reported-evidence');assert.ok(result('reported-evidence').includes('28.4'));set('reported-evidence','model',0);assert.ok(result('reported-evidence').includes('26.36'));assert.equal(Number((28.4-26.36).toFixed(2)),2.04);assert.ok(unit('reported-evidence').querySelector('.practice-answer').textContent.includes('2.04 BLEUポイント'));assert.ok(unit('reported-evidence').querySelector('.unit-intro').textContent.includes('アンサンブル'));assert.ok(unit('reported-evidence').querySelector('.unit-intro').textContent.includes('単一モデル'));assert.equal(config.units.find(u=>u.id==='reported-evidence').interaction.source_sections,'§6.1、Table 2');reset('reported-evidence');
});
test('scope experiment distinguishes structure, a benchmark result, and unsupported universality',()=>{
  reset('scope');assert.ok(lab('scope').querySelector('.data-label').textContent.includes('構造'));set('scope','claim','quality');assert.ok(lab('scope').querySelector('.scope-limit').textContent.includes('WMT 2014'));set('scope','claim','limit');assert.ok(lab('scope').querySelector('.data-label').textContent.includes('この論文だけでは言えない'));assert.equal(unit('scope').querySelector('.next-unit').getAttribute('href'),'#source');reset('scope');
});
test('repeated answer open/close does not change controls, media, navigation, or other units',()=>{
  const snapshot=()=>JSON.stringify([...doc.querySelectorAll('input,select')].map(el=>[el.id,el.value]));const before=snapshot();const hash=win.location.hash;for(const {id} of config.units){const answer=unit(id).querySelector('.unit-observation');for(let i=0;i<3;i++){answer.open=true;answer.dispatchEvent(new win.Event('toggle'));answer.open=false;answer.dispatchEvent(new win.Event('toggle'));}}assert.equal(snapshot(),before);assert.equal(win.location.hash,hash);assert.equal(doc.querySelectorAll('.unit-observation[open]').length,0);assert.equal(doc.querySelectorAll('video[autoplay]').length,0);assert.equal(doc.querySelectorAll('.next-unit[disabled],.next-unit[aria-disabled=true]').length,0);
});
test('resets restore independent examples even after neighboring units changed',()=>{
  set('normalize','a',-4);set('value-mix','cx',2);reset('value-mix');assert.equal(lab('normalize').querySelector('[data-param=a]').value,'-4');assert.ok(result('value-mix').includes('[0.337, 0.554]'));for(const id of Object.keys(DEFAULTS)){reset(id);for(const [key,value] of Object.entries(DEFAULTS[id]))assert.equal(lab(id).querySelector('[data-param="'+key+'"]').value,String(value));}
});
test('changing a control never opens answers or makes an automatic completion claim',()=>{
  set('sequence','n',12);assert.equal(doc.querySelectorAll('.unit-observation[open]').length,0);assert.equal(win.location.hash,'');assert.equal(doc.querySelectorAll('[data-completed],[data-passed],[data-score-percent]').length,0);assert.ok([...doc.querySelectorAll('.practice-note')].every(el=>el.textContent.includes('前の単位の操作結果は引き継ぎません')));reset('sequence');
});
