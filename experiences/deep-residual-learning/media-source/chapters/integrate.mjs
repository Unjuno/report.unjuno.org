import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {escapeHtml as esc} from '../../src/shared/site-chrome.mjs';
export function integrate(){
const root=new URL('../../',import.meta.url),manifestFile=new URL('media/chapter-videos.json',root);if(!existsSync(manifestFile))return;
const manifest=JSON.parse(readFileSync(manifestFile,'utf8'));let topFile=new URL('public/index.html',root),top=readFileSync(topFile,'utf8');
const summary=manifest.chapters.length===5?'全5章のManim解説動画と日本語音声・字幕・全文を用意しました。':'章別動画は'+manifest.chapters.length+'/5章を制作済みです。残りの章は文章解説で学べます。';
top=top.replace('章別の動画は未制作のため、現在は短い文章解説で学びます。',summary).replace('章別動画は未制作です。',summary);writeFileSync(topFile,top);
for(const c of manifest.chapters){
const file=new URL('public/units/'+c.id+'/index.html',root);let html=readFileSync(file,'utf8');const local=c.transcript.replace('/notes/deep-residual-learning/','');const transcript=readFileSync(new URL(local,root),'utf8');
const video='<section class="chapter-video" aria-labelledby="'+c.id+'-video-title"><h2 id="'+c.id+'-video-title">まず、仕組みを動画で見る</h2><video controls playsinline preload="metadata" poster="'+esc(c.poster)+'" aria-label="'+esc(c.title)+'の日本語解説"><source src="'+esc(c.video)+'" type="video/mp4"><track kind="captions" src="'+esc(c.captions)+'" srclang="ja" label="日本語ナレーション字幕" default>再生できない場合は、下の全文をご利用ください。</video><p class="note">約'+Math.round(c.duration_seconds)+'秒 / Manimによる独自図解 / ローカル日本語合成音声。字幕は実際のナレーションに沿い、文ごとの時刻は音声区間内で推定しています。実ブラウザーでの再生・直接実聴は未確認です。</p><p><a href="'+esc(c.video)+'">動画ファイル</a> · <a href="'+esc(c.transcript)+'">全文テキスト</a></p><details><summary>ナレーション全文と画面の補足表記</summary>'+transcript.split('\n\n').map(s=>'<p>'+esc(s)+'</p>').join('')+'</details></section>';
html=html.replace('<p class="step">01 · 短い解説</p>',video+'<p class="step">01 · 短い解説</p>').replace('章別動画は未制作です。','この章の解説動画・日本語音声・字幕・全文を用意しました。');writeFileSync(file,html);
}
}
