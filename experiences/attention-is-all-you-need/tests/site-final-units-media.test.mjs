import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {DEFAULTS,output} from '../src/site/labs.mjs';
import {REPORTED_EN_DE} from '../src/site/math.mjs';
const {Window}=await import(process.env.QK_DOM_MODULE||'happy-dom');
const root=new URL('../',import.meta.url);
const config=JSON.parse(await readFile(new URL('content/experience.json',root),'utf8'));
const manifest=JSON.parse(await readFile(new URL('content/final-unit-videos.json',root),'utf8'));
const ids=['sequence','encoder-decoder','reported-evidence','scope'];
const html=await readFile(new URL('build-local/index.html',root),'utf8');
function page(){const w=new Window({url:'https://report.unjuno.org/notes/attention-is-all-you-need/learn/',settings:{enableJavaScriptEvaluation:false,disableCSSFileLoading:true,disableJavaScriptFileLoading:true}});w.document.write(html);w.eval(w.document.querySelector('script').textContent);return w;}

test('all eleven units and the overview have playable assets, with unverified listening disclosed',()=>{
 const w=page(),d=w.document;
 assert.deepEqual(Object.keys(manifest.videos).sort(),[...ids].sort());
 assert.equal(config.units.length,11);
 assert.ok([config.overview,...config.units.map(u=>u.video)].every(v=>v.status==='ready'));
 assert.equal(d.querySelectorAll('video').length,12);
 assert.equal(d.querySelectorAll('.media-pending').length,0);
 assert.ok(d.querySelector('.status-strip').textContent.includes('実聴は未確認'));
 assert.ok(d.querySelector('.status-strip').textContent.includes('実端末での再生'));
});
for(const id of ids){
 test(id+' film has native playback, optional Japanese captions, transcript and direct practice link',()=>{
  const w=page(),u=w.document.querySelector('#unit-'+id),v=u.querySelector('video'),m=config.units.find(u=>u.id===id).video;
  assert.ok(v.controls&&v.hasAttribute('playsinline'));assert.equal(v.preload,'none');assert.ok(!v.autoplay&&!v.muted);
  assert.equal(v.querySelector('source').getAttribute('src'),m.src);
  assert.equal(v.getAttribute('poster'),m.poster);
  assert.equal(v.querySelector('track').getAttribute('src'),m.captions);
  assert.equal(v.querySelector('track').srclang,'ja');assert.ok(!v.querySelector('track').hasAttribute('default'));
  assert.ok(u.querySelectorAll('.transcript p').length>=4);
  assert.equal(u.querySelector('.media-to-lab').getAttribute('href'),'#practice-'+id);
  assert.ok(u.querySelector('.media-links a[download]'));
 });
 test(id+' film ending never changes the operation, and playback errors remain local',()=>{
  const w=page(),d=w.document,u=d.querySelector('#unit-'+id),v=u.querySelector('video'),lab=u.querySelector('[data-concept-lab]');
  const before=lab.querySelector('[data-lab-output]').innerHTML;
  v.dispatchEvent(new w.Event('ended'));assert.equal(lab.querySelector('[data-lab-output]').innerHTML,before);assert.equal(w.location.hash,'');
  const error=u.querySelector('[data-media-error]');assert.ok(error.hidden);v.querySelector('source').dispatchEvent(new w.Event('error'));assert.ok(!error.hidden);
  for(const e of d.querySelectorAll('[data-media-error]'))if(e!==error)assert.ok(e.hidden);
  v.dispatchEvent(new w.Event('loadeddata'));assert.ok(error.hidden);
  let pauses=0;for(const other of d.querySelectorAll('video'))if(other!==v)other.pause=()=>pauses++;
  v.dispatchEvent(new w.Event('play'));assert.equal(pauses,11);
  lab.querySelector('[data-lab-reset]').click();assert.equal(lab.querySelector('[data-lab-output]').innerHTML,before);
 });
 test(id+' delivered media preserve the final manifest, fast start and caption boundaries',async()=>{
  const entry=manifest.videos[id],m=config.units.find(u=>u.id===id).video;
  for(const key of ['src','poster','captions','transcript']){
   const source=new URL((key==='transcript'?'':'public/')+m[key],root),b=await readFile(source);
   assert.equal(b.length,entry.assets[key].bytes);assert.equal(createHash('sha256').update(b).digest('hex'),entry.assets[key].sha256);
   if(key!=='transcript')assert.deepEqual(await readFile(new URL('build-local/'+m[key],root)),b);
  }
  const b=await readFile(new URL('public/'+m.src,root));let at=0,moov=-1,mdat=-1;
  while(at<b.length){let size=b.readUInt32BE(at);const type=b.toString('ascii',at+4,at+8);if(size===1)size=Number(b.readBigUInt64BE(at+8));if(size===0)size=b.length-at;assert.ok(size>=8&&at+size<=b.length);if(type==='moov')moov=at;if(type==='mdat')mdat=at;at+=size;}
  assert.ok(moov>=0&&moov<mdat);
  const vtt=await readFile(new URL('public/'+m.captions,root),'utf8');assert.ok(vtt.startsWith('WEBVTT\n'));let previous=0;
  const cues=[...vtt.matchAll(/(\d\d):(\d\d):(\d\d)\.(\d\d\d) --> (\d\d):(\d\d):(\d\d)\.(\d\d\d)/g)];assert.ok(cues.length>=4);
  for(const c of cues){const sec=i=>Number(c[i])*3600+Number(c[i+1])*60+Number(c[i+2])+Number(c[i+3])/1000;const start=sec(1),end=sec(5);assert.ok(start>=previous&&end>start&&end<=m.duration_seconds+0.05);previous=end;}
 });
}

test('sequence film examples keep the existing 6-to-12 token interaction and connection-count caveat',()=>{
 assert.deepEqual(DEFAULTS.sequence,{n:6});
 assert.ok(output('sequence',{n:6}).includes('<strong>5</strong>'));
 assert.ok(output('sequence',{n:12}).includes('<strong>11</strong>'));
 for(const n of [6,12]){assert.ok(output('sequence',{n}).includes('<strong>1</strong>'));assert.ok(output('sequence',{n}).includes('秒数ではありません'));}
});
test('encoder-decoder operation preserves the shifted training targets and sequential unknown positions',()=>{
 assert.ok(output('encoder-decoder',{mode:'train',step:0}).includes('BOS・A・B・C'));
 for(const step of [0,1,3]){const s=output('encoder-decoder',{mode:'generate',step});assert.equal((s.match(/class="future"/g)||[]).length,4-step);assert.ok(s.includes('既知の出力 '+step+' 個'));}
});
test('reported evidence remains original Table 2 data, distinct from a controlled ablation',()=>{
 assert.deepEqual(REPORTED_EN_DE.map(x=>x.bleu),[26.36,27.3,28.4]);
 assert.ok(Math.abs(REPORTED_EN_DE[2].bleu-REPORTED_EN_DE[0].bleu-2.04)<1e-12);
 const w=page(),unit=w.document.querySelector('#unit-reported-evidence');assert.ok(unit.textContent.includes('アンサンブル'));assert.ok(unit.textContent.includes('単一モデル'));assert.ok(unit.textContent.includes('Attention単独の効果は分かりません'));
});
test('scope operation does not extend reported translation results into universal performance',()=>{
 assert.ok(output('scope',{claim:'parallel'}).includes('生成時は、前に生成したトークンが必要'));
 assert.ok(output('scope',{claim:'quality'}).includes('あらゆる課題へ一般化しません'));
 assert.ok(output('scope',{claim:'limit'}).includes('常に優れることは示していません'));
});
