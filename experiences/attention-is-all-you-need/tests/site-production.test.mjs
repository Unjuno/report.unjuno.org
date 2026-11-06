import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
const {Window}=await import(process.env.QK_DOM_MODULE||'happy-dom');
const root=new URL('../',import.meta.url);
const config=JSON.parse(await readFile(new URL('content/experience.json',root),'utf8'));
const html=await readFile(new URL('build-production/index.html',root),'utf8');
const w=new Window({url:'https://report.unjuno.org/notes/attention-is-all-you-need/learn/',settings:{enableJavaScriptEvaluation:false,disableCSSFileLoading:true,disableJavaScriptFileLoading:true}});
w.document.write(html);const d=w.document;
test('learning-page brand returns to this origin HOME, without a separate reading-note link',()=>{
 assert.equal(d.querySelector('.report-header__brand').getAttribute('href'),'/');
 assert.equal(d.querySelector('.report-header__brand').href,'https://report.unjuno.org/');
 assert.equal(d.querySelector('a[href="/notes/attention-is-all-you-need/"]'),null);
 assert.ok(!html.includes('論文ノートを読む'));
 assert.equal(d.querySelector('.report-header__rights').getAttribute('href'),'/rights/');
});
test('release status accurately counts playable videos and missing units',()=>{
 const ready=[config.overview,...config.units.map(u=>u.video)].filter(m=>m.status==='ready');
 const pending=config.units.length+1-ready.length;
 assert.equal(d.querySelectorAll('video').length,ready.length);
 assert.equal(d.querySelectorAll('.media-pending').length,pending);
 const status=d.querySelector('.status-strip').textContent;
 assert.ok(status.includes('概要を含む'+ready.length+'本の動画'));
 if(pending)assert.ok(status.includes('残る'+pending+'単位の動画は制作中'));
 else {assert.ok(status.includes('すべての理解単位に動画を用意'));assert.ok(!status.includes('残る0単位'));}
 assert.ok(d.querySelector('.status-strip').textContent.includes('実聴は未確認'));
 assert.ok(!d.querySelector('.status-strip').textContent.includes('ローカル版'));
});
test('production media remains relative to the learning route and excludes rejected videos',async()=>{
 const expected=new Set([config.overview,...config.units.map(u=>u.video)].filter(m=>m.status==='ready').map(m=>m.src.split('/').pop()));
 assert.deepEqual(new Set(await readdir(new URL('build-production/media/videos/',root))),expected);
 for(const v of d.querySelectorAll('video')){
  const source=v.querySelector('source');assert.ok(source.getAttribute('src').startsWith('media/videos/'));
  assert.ok(source.src.startsWith('https://report.unjuno.org/notes/attention-is-all-you-need/learn/media/videos/'));
  assert.equal(v.preload,'none');assert.ok(v.controls);assert.ok(!v.autoplay);
 }
});
test('production controls initialize and every unit still supplies practice and reset',()=>{
 w.eval(d.querySelector('script').textContent);
 assert.ok(d.documentElement.classList.contains('has-js'));
 assert.ok(d.querySelector('[data-site-error]').hidden);
 assert.equal(d.querySelectorAll('.learning-unit').length,11);
 assert.equal(d.querySelectorAll('.practice-prediction').length,11);
 assert.equal(d.querySelectorAll('.practice-answer').length,11);
 assert.equal(d.querySelectorAll('[data-lab-reset]').length,10);
 assert.equal(d.querySelectorAll('[data-action="reset"]').length,1);
});
