import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import units from '../content/units.mjs';
const {Window}=await import(process.env.QK_DOM_MODULE||'happy-dom');
const root=new URL('../public/',import.meta.url);
const BASE='/notes/generative-adversarial-nets/';
const routes=JSON.parse(fs.readFileSync(new URL('routes.json',root),'utf8')).pages;
const html=file=>fs.readFileSync(new URL(file,root),'utf8');
const open=file=>{const w=new Window();w.document.write(html(file));return w;};

test('one canonical learn route contains all seven anchored chapters',()=>{
 assert.equal(routes.length,1);assert.equal(routes[0].path,BASE+'learn/');assert.ok(!fs.existsSync(new URL('units/',root)));
 const d=open('index.html').document;assert.equal(d.querySelectorAll('.unit').length,7);assert.equal(d.querySelector('link[rel=canonical]').getAttribute('href'),'https://report.unjuno.org'+BASE+'learn/');
 assert.equal(d.querySelectorAll('#chapters li').length,7);
 assert.deepEqual([...d.querySelectorAll('#chapters a')].map(x=>x.getAttribute('href')),units.map(u=>'#chapter-'+u.lab));
 assert.match(d.querySelector('#overview').textContent,/予想 → 操作 → 答え合わせ/);
 assert.match(d.querySelector('#chapters').textContent,/学習履歴は保存しません/);
 assert.equal(d.querySelectorAll('video').length,8);
});

test('every page has common header, one h1, correct source links and Sponsors last',()=>{
 for(const r of routes){const d=open(r.file).document;
  assert.equal(d.querySelectorAll('h1').length,1,r.file);
  assert.equal(d.querySelectorAll('[data-report-header]').length,1);
  assert.equal(d.querySelector('.report-header__brand').getAttribute('href'),'/');
  assert.equal(d.querySelector('.report-header__rights').getAttribute('href'),'/rights/');
  assert.equal(d.querySelector('[data-report-support] .report-support__link').getAttribute('href'),'https://github.com/sponsors/Unjuno');
  const last=d.body.lastElementChild.tagName==='SCRIPT'?d.body.lastElementChild.previousElementSibling:d.body.lastElementChild;
  assert.ok(last.hasAttribute('data-report-support'));
  const ids=[...d.querySelectorAll('[id]')].map(x=>x.id);assert.equal(new Set(ids).size,ids.length);
  for(const unit of d.querySelectorAll('.unit'))assert.match(unit.querySelector('.source a').getAttribute('href'),/^https:\/\/arxiv.org\/html\/1406.2661v1#/);
 }
});

test('all internal pages, fragments, module imports and assets resolve',()=>{
 for(const r of routes){const d=open(r.file).document;
  for(const x of d.querySelectorAll('[src],[href],[poster]'))for(const attr of ['src','href','poster']){
   const ref=x.getAttribute(attr);if(!ref)continue;
   const url=new URL(ref,'https://report.unjuno.org'+r.path);
   if(url.origin!=='https://report.unjuno.org')continue;
   if(['/','/rights/','/favicon.svg'].includes(url.pathname))continue;
   assert.ok(url.pathname.startsWith(BASE),ref);
   let rel=url.pathname===BASE+'learn/'?'index.html':url.pathname.slice(BASE.length)||'index.html';if(rel.endsWith('/'))rel+='index.html';
   assert.ok(fs.existsSync(new URL(rel,root)),r.file+' -> '+ref);
   if(url.hash){const target=open(rel).document;assert.ok(target.getElementById(url.hash.slice(1)),r.file+' -> '+ref);}
  }
 }
 assert.ok(fs.existsSync(new URL('math.mjs',root)));
});

test('every scroll chapter preserves no-JS reading, disabled controls and learning order',()=>{
 for(const u of units){const d=open('index.html').document;
  assert.ok(d.querySelector('noscript'));assert.ok([...d.querySelectorAll('button,input,select')].every(x=>x.disabled));
  const unit=d.querySelector('#chapter-'+u.lab),q=unit.querySelector('.quiz'),lab=unit.querySelector('.lab'),answer=unit.querySelector('.answer'),nodes=[...unit.children];
  assert.ok(nodes.indexOf(q)<nodes.indexOf(lab));assert.ok(nodes.indexOf(lab)<nodes.indexOf(answer));
  assert.equal(answer.querySelector('details').open,false);assert.ok(lab.querySelector('.result').textContent.trim());
  assert.ok(unit.querySelector('.next'));assert.ok(unit.querySelector('.previous'));
  assert.equal(unit.querySelectorAll('.chapter-video video').length,1);assert.ok(!unit.textContent.includes('章別動画は未制作'));assert.match(unit.textContent,/直接試聴と実ブラウザー再生は未確認/);
 }
});

test('all seven demos and quizzes interact and reset independently on the same page',async()=>{
 const w=open('index.html'),d=w.document;globalThis.document=d;
 await import('../public/app.mjs?single-page');
 assert.ok([...d.querySelectorAll('button,input,select')].every(x=>!x.disabled));
 for(const [i,u]of units.entries()){
  const unit=d.querySelector('#chapter-'+u.lab),lab=unit.querySelector('.lab'),result=lab.querySelector('.result'),init=result.innerHTML;
  const others=[...d.querySelectorAll('.unit')].filter(x=>x!==unit).map(x=>({unit:x,result:x.querySelector('.result').innerHTML,feedback:x.querySelector('.feedback').textContent}));
  if(u.lab==='training'){lab.querySelector('[data-action=ten]').click();assert.match(result.textContent,/D 更新 10 回 \/ G 更新 10 回/);}
  else if(u.lab==='evidence'){d.getElementById('evidence-select').value='experiment';d.getElementById('evidence-select').dispatchEvent(new w.Event('change',{bubbles:true}));assert.match(result.textContent,/Parzen/);}
  else{const range=lab.querySelector('input');range.value=range.max;range.dispatchEvent(new w.Event('input',{bubbles:true}));}
  assert.notEqual(result.innerHTML,init,u.lab);assert.ok(!/NaN|Infinity/.test(result.textContent),u.lab);
  lab.querySelector('.reset').click();assert.equal(result.innerHTML,init,u.lab);
  const correct=unit.querySelector('.quiz input[value="'+u.answer+'"]');correct.checked=true;correct.dispatchEvent(new w.Event('change',{bubbles:true}));
  assert.match(unit.querySelector('.feedback').textContent,/その予想で合っています/);assert.equal(unit.querySelector('details').open,false);
  unit.querySelector('details').open=true;unit.querySelector('.reset-unit').click();
  assert.equal(result.innerHTML,init);assert.ok([...unit.querySelectorAll('.quiz input')].every(x=>!x.checked));assert.equal(unit.querySelector('details').open,false);assert.equal(unit.querySelector('.feedback').textContent,'');
  for(const other of others){assert.equal(other.unit.querySelector('.result').innerHTML,other.result);assert.equal(other.unit.querySelector('.feedback').textContent,other.feedback);}
  correct.checked=true;correct.dispatchEvent(new w.Event('change',{bubbles:true}));unit.querySelector('details').open=true;
 }
 assert.equal(d.querySelectorAll('.quiz input:checked').length,7);
 d.getElementById('reset-all').click();assert.equal(d.querySelectorAll('.quiz input:checked').length,0);assert.equal(d.querySelectorAll('details[open]').length,0);assert.ok([...d.querySelectorAll('.feedback')].every(x=>!x.textContent));
});

test('media are preserved and disclosures and primary references remain explicit',()=>{
 const d=open('index.html').document;
 assert.match(d.querySelector('#overview').textContent,/直接試聴と実ブラウザでの再生は未検証/);
 assert.match(d.querySelector('#overview').textContent,/章別動画は7本を制作済み/);
 assert.equal(d.querySelector('#rights a').getAttribute('href'),'/rights/');
 assert.match(d.querySelector('#sources').textContent,/命題2/);assert.match(d.querySelector('#sources').textContent,/Parzen/);
 assert.match(fs.readFileSync(new URL('media/gan-overview-ja.vtt',root),'utf8'),/^WEBVTT/);
 assert.equal(createHash('sha256').update(fs.readFileSync(new URL('media/gan-overview-ja.mp4',root))).digest('hex'),'6e272e57b59b44b8f38ccdb5d5006e81c43ff2b3a282e796f40942996dd3439f');
 const poster=d.querySelector('video').getAttribute('poster');assert.equal(poster,BASE+'media/gan-overview-poster.jpg');assert.ok(fs.statSync(new URL(poster.slice(BASE.length),root)).size>1000);
 const manifest=JSON.parse(fs.readFileSync(new URL('../integration-manifest.json',import.meta.url),'utf8'));assert.equal(manifest.route,BASE);
});

test('reported paper values carry the original metric and uncertainty conditions',()=>{const d=open('index.html').document;for(const text of ['225±2','2057±26','標準誤差','実数値版','fold','Parzen'])assert.ok(d.body.textContent.includes(text),text);const theory=open('index.html').document;assert.match(theory.body.textContent,/十分小さな更新/);});

test('seven chapter media manifests are complete, independently linked, and hashes match',()=>{
 const m=JSON.parse(fs.readFileSync(new URL('media/chapter-videos.json',root),'utf8'));assert.equal(m.chapters.length,7);
 assert.deepEqual(m.chapters.map(x=>x.id),units.map(x=>x.lab));
 for(const v of m.chapters){assert.ok(v.duration_seconds>=35&&v.duration_seconds<=75);assert.equal(v.validation.full_av_decode,'passed');assert.match(v.validation.non_silence,/passed/);assert.equal(v.validation.browser_playback,'not performed');assert.equal(v.validation.direct_listening,'not performed');assert.equal(v.validation.frame_visual_review,'passed');assert.equal(v.validation.representative_frames.length,4);
 for(const a of v.assets){const b=fs.readFileSync(new URL(a.path,root));assert.equal(b.byteLength,a.bytes);assert.equal(createHash('sha256').update(b).digest('hex'),a.sha256);}
 const d=open('index.html').document.querySelector('#chapter-'+v.id);assert.equal(d.querySelector('video source').getAttribute('src'),BASE+v.video);assert.equal(d.querySelector('video track').getAttribute('src'),BASE+v.captions);assert.equal(d.querySelector('video').getAttribute('poster'),BASE+v.poster);assert.equal(d.querySelector('.chapter-video a').getAttribute('href'),BASE+v.transcript);
 assert.match(fs.readFileSync(new URL(v.captions,root),'utf8'),/^WEBVTT/);assert.ok(fs.readFileSync(new URL(v.transcript,root),'utf8').includes('原著:'));
 const unit=d,children=[...unit.children];assert.ok(children.indexOf(unit.querySelector('.chapter-video'))<children.indexOf(unit.querySelector('.quiz')));
 }
});
