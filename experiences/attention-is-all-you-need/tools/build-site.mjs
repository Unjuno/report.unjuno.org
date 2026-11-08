import {readFile,writeFile,mkdir,copyFile,stat,rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';import path from 'node:path';import {createHash} from 'node:crypto';
import {transform} from 'esbuild';
import {renderHeader,renderSponsor,escapeHtml as e} from '../src/shared/site-chrome.mjs';
import {renderLab} from '../src/site/labs.mjs';import {LESSONS} from '../src/site/lessons.mjs';
import {GUIDED_PRACTICE} from '../src/site/guided-practice.mjs';
import {renderAttentionFlow} from '../src/site/attention-flow.mjs';
const production=process.argv.includes('--production');
const root=fileURLToPath(new URL('../',import.meta.url)),out=path.join(root,production?'build-production':'build-local');
const read=p=>readFile(path.join(root,p),'utf8');await mkdir(out,{recursive:true});
await rm(path.join(out,'media'),{recursive:true,force:true});
const config=JSON.parse(await read('content/experience.json')),chrome=JSON.parse(await read('content/site-chrome.json'));
const variant=chrome.variants.attention;
if(production){chrome.brand.homeHref='/';chrome.brand.rightsHref='/rights/';}
const activeMedia=[config.overview,...config.units.map(u=>u.video)].filter(m=>m.status==='ready');
const pendingMedia=config.units.length+1-activeMedia.length;
const productionStatus=pendingMedia?'制作中の教材。':'検証中の教材。';
const mediaStatus=pendingMedia?'残る'+pendingMedia+'単位の動画は制作中です。':'概要とすべての理解単位に動画を用意しました。';
const mediaPaths=[];async function checkedCopy(rel){if(typeof rel!=='string'||path.isAbsolute(rel)||rel.split(/[\\/]/).includes('..'))throw new Error('Unsafe media path');const from=path.join(root,'public',rel);if(!(await stat(from)).isFile())throw new Error('Missing ready media: '+rel);const to=path.join(out,rel);await mkdir(path.dirname(to),{recursive:true});await copyFile(from,to);mediaPaths.push(rel);}
const transcripts=new Map();
for(const media of activeMedia){for(const key of ['src','poster','captions']){if(!media[key])throw new Error('Ready media requires '+key);await checkedCopy(media[key]);}
if(typeof media.transcript!=='string'||path.isAbsolute(media.transcript)||media.transcript.split(/[\\/]/).includes('..'))throw new Error('Unsafe or missing transcript');
transcripts.set(media,await read(media.transcript));}
function mediaMarkup(media,overview=false){
if(media.status!=='ready')return '<div class="media-pending"><span class="media-status">'+(overview?'OVERVIEW':'SHORT VIDEO')+' · 制作中</span><p><strong>'+(overview?'全体を見渡す、読み上げ付きの動画を準備しています。':'読み上げ付きの短い動画を準備しています。')+'</strong>いまは下の説明と操作から進めます。未完成の動画を再生できるようには表示しません。</p></div>';
const duration=Number(media.duration_seconds),durationLabel=Number.isFinite(duration)?Math.floor(duration/60)+'分'+String(Math.round(duration%60)).padStart(2,'0')+'秒':'';
const dimensions=Number.isInteger(media.width)&&media.width>0&&Number.isInteger(media.height)&&media.height>0?' width="'+media.width+'" height="'+media.height+'"':'';
const transcript='<details class="transcript"><summary>読み上げ全文を読む</summary><div>'+transcripts.get(media).trim().split(/\n\s*\n/).map(p=>'<p>'+e(p)+'</p>').join('')+'</div></details>';
return '<figure><video controls playsinline preload="none"'+dimensions+' poster="'+e(media.poster)+'" aria-label="'+(overview?'全体の概要動画':'この理解単位の解説動画')+'"><source src="'+e(media.src)+'" type="video/mp4"><track kind="captions" srclang="ja" label="日本語" src="'+e(media.captions)+'"><p>動画を再生できない場合は、下の読み上げ全文をご覧ください。</p></video><figcaption>'+e(durationLabel)+' · '+(media.audio==='none'?'無音・字幕付き':media.audio==='narration'?'日本語読み上げ付き':'音声の状態を確認中')+'<span class="media-credit">'+e(media.audio_label||'')+'</span></figcaption><div class="media-links"><a href="'+e(media.src)+'" download>動画ファイルを保存</a><a href="'+e(media.captions)+'" download>日本語字幕を保存</a></div><p data-media-error hidden role="status">動画を読み込めませんでした。動画ファイルの保存、読み上げ全文、下の説明と操作は利用できます。</p>'+transcript+'</figure>';
}
const toc='<aside class="lesson-index" id="chapter-index" aria-label="章と理解単位"><h2>CHAPTERS / 章から探す</h2><ol>'+config.chapters.map((c,i)=>'<li><a href="#chapter-'+c.id+'">'+String(i+1).padStart(2,'0')+' '+e(c.title)+'</a><ol>'+config.units.filter(u=>u.chapter_ids[0]===c.id).map(u=>'<li><a data-unit-link href="#unit-'+u.id+'">'+e(u.title)+'</a></li>').join('')+'</ol></li>').join('')+'</ol><p class="current-unit">いま見ている単位 <span data-current-unit>1 / '+config.units.length+'</span></p></aside>';
// Anchors verified against arXiv:1706.03762v7 HTML on 2026-11-08.
const PAPER_ANCHORS=Object.freeze({
  '§1':'S1', '§3.1':'S3.SS1',
  '§3.2.1':'S3.SS2.SSS1', '§3.2.2':'S3.SS2.SSS2',
  '§3.2.3':'S3.SS2.SSS3', '§3.5':'S3.SS5',
  '§4':'S4', '§6':'S6', '§6.1':'S6.SS1', '§7':'S7',
  'Table 1':'S4.T1', 'Table 2':'S6.T2'
});
function renderPaperSourceLinks(sourceSections){
  if(config.reference_paper_version!=='1706.03762v7')throw new Error('Reverify source anchors for the new paper version');
  return sourceSections.split('、').map(rawLabel=>{
    const label=rawLabel.trim(),anchor=PAPER_ANCHORS[label];
    if(!anchor)throw new Error('Unmapped source label: '+label);
    const href='https://arxiv.org/html/'+config.reference_paper_version+'#'+anchor;
    return '<a href="'+e(href)+'" target="_blank" rel="noopener noreferrer" aria-label="原論文 '+e(label)+'（新しいタブ）">'+e(label)+' ↗</a>';
  }).join('、');
}
const units=config.units.map((u,i)=>{const l=LESSONS[u.id],practice=GUIDED_PRACTICE[u.id];if(!l)throw new Error('Missing lesson '+u.id);if(!practice?.prediction||!practice?.answer||!practice.steps?.length)throw new Error('Missing guided practice '+u.id);const next=config.units[i+1];return '<section class="learning-unit" id="unit-'+u.id+'" data-unit-order="'+(i+1)+'" aria-labelledby="title-'+u.id+'"><p class="unit-number">UNIT '+String(i+1).padStart(2,'0')+'</p><h3 id="title-'+u.id+'">'+e(u.title)+'</h3><div class="stage"><span class="stage-label">01 / 動画で見る</span><div class="unit-media">'+mediaMarkup(u.video)+(u.video.status==='ready'?'<a class="media-to-lab" href="#practice-'+u.id+'">この例を自分で動かす <span aria-hidden="true">→</span></a>':'')+'</div><details class="unit-more"><summary>文章で確認する</summary><p class="unit-goal">理解の目標：'+e(u.learning_goal)+'</p><p class="unit-intro">'+e(l.intro)+'</p></details></div><div class="stage" id="practice-'+u.id+'"><span class="stage-label">02 / 予想して、触って確かめる</span><div class="guided-practice" aria-labelledby="prediction-'+u.id+'"><h4 id="prediction-'+u.id+'">動かす前に、予想する</h4><p class="practice-prediction">'+e(practice.prediction)+'</p><details class="practice-help"><summary>操作のヒント</summary><ol class="practice-steps">'+practice.steps.map(step=>'<li>'+e(step)+'</li>').join('')+'</ol><p class="practice-note">各単位の初期値は独立しています。前の単位の操作結果は引き継ぎません。操作できないときも、初期例と下の答え合わせを読めます。</p></details></div>'+renderLab(u.id)+'<p class="unit-disclosure">'+e(u.interaction.data_disclosure)+'</p></div><div class="stage"><span class="stage-label">03 / 予想と結果を比べる</span><details class="unit-observation"><summary>答え合わせと理由を開く</summary><p class="practice-answer">'+e(practice.answer)+'</p><p class="practice-meaning">'+e(l.observation)+'</p></details></div><div class="unit-footer"><p class="unit-source">原論文 '+renderPaperSourceLinks(u.interaction.source_sections)+'</p><a class="next-unit" href="'+(next?'#unit-'+next.id:'#source')+'">'+(next?'次へ · '+e(next.title):'出典とまとめへ')+' <span aria-hidden="true">→</span></a></div></section>';});
const chapters=config.chapters.map((c,i)=>'<section class="chapter" id="chapter-'+c.id+'" aria-labelledby="chapter-title-'+c.id+'"><h2 class="chapter-heading" id="chapter-title-'+c.id+'"><span class="chapter-label">CHAPTER '+String(i+1).padStart(2,'0')+'</span>'+e(c.title)+'</h2>'+config.units.map((u,index)=>u.chapter_ids[0]===c.id?units[index]:'').join('')+'</section>').join('');
async function embeddedCSS(p){let css=await read(p);for(const [name,mime]of [['qk-editorial-serif.woff','font/woff'],['qk-editorial-numbers.woff','font/woff']]){const font=await readFile(path.join(root,'public/fonts',name));css=css.replaceAll('../../public/fonts/'+name,'data:'+mime+';base64,'+font.toString('base64'));}return css;}
const styles=await Promise.all(['../shared/site-chrome.css','src/interactives/qk-matching.css','src/interactives/qk-matching.editorial.css','src/site/site.css'].map(embeddedCSS));
function moduleBody(source){return source.replace(/^import[^\n]*\n/gm,'').replace(/\bexport\s+(?=(?:async\s+)?function|const|let|class)/g,'');}
const flowSource=moduleBody(await read('src/site/attention-flow.mjs'));
const mathSource=moduleBody(await read('src/site/math.mjs')),qkMath=moduleBody(await read('src/math/qk-matching.mjs')),qkUI=moduleBody(await read('src/interactives/qk-matching.mjs')),labs=moduleBody(await read('src/site/labs.mjs')),app=moduleBody(await read('src/site/app.mjs'));
const js='(()=>{const math=(()=>{'+mathSource+';return{softmax,attentionWeights,mixValues,positionalEncoding,maskedWeights,toyHeads,REPORTED_EN_DE,fixed};})();const qkMath=(()=>{'+qkMath+';return{INITIAL_QUERY,INITIAL_KEYS,evaluateQuery,formatNumber};})();const qk=(()=>{const{INITIAL_QUERY,INITIAL_KEYS,evaluateQuery}=qkMath;const fmt=qkMath.formatNumber;'+qkUI+';return{mountQK};})();const labs=(()=>{const{softmax,attentionWeights,mixValues,positionalEncoding,maskedWeights,toyHeads,REPORTED_EN_DE}=math;const f=math.fixed;'+labs+';return{mountConceptLabs};})();const flow=(()=>{const{attentionWeights,mixValues}=math;const f=math.fixed;'+flowSource+';return{mountAttentionFlow};})();const{mountAttentionFlow}=flow;const{mountQK}=qk;const{mountConceptLabs}=labs;'+app+';try{initSite(document);}catch(error){const notice=document.querySelector("[data-site-error]");notice.hidden=false;notice.textContent="操作を読み込めませんでした。説明文と初期例はそのまま読めます。";console.error(error);}})();';
// Keep the HTML byte budget without changing its lessons or weakening the size test.
const minifiedJs=(await transform(js,{loader:'js',minify:true,target:'es2020',legalComments:'none',charset:'utf8'})).code;
const fontLicense=await read('public/fonts/qk-fonts-LICENSE.txt');
const head='<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="Attention Is All You Needを、動画と、動かして確かめる操作で学ぶ独立した学習体験。"><meta name="robots" content="noindex,nofollow"><title>Attention Is All You Need · report.unjuno.org</title>'+(production?'<link rel="icon" href="/favicon.svg" type="image/svg+xml">':'')+'<style>'+styles.join('\n')+'</style>';
const body=renderHeader({...chrome.brand,...variant.header})+'<main id="main-content" tabindex="-1"><header class="site-hero"><h1>Attention Is<br>All You Need</h1><div class="paper-meta"><span>Vaswani et al. · 2017</span><span>機械翻訳 / Self-attention</span><a href="https://arxiv.org/abs/1706.03762" target="_blank" rel="noopener noreferrer">原論文 ↗</a></div><section class="overview-section" aria-labelledby="overview-title"><h2 id="overview-title">論文の概要</h2><div class="unit-media">'+mediaMarkup(config.overview,true)+'</div></section>'+renderAttentionFlow()+'</header><div class="status-strip">'+(production?productionStatus:'検証中のローカル版。')+config.units.length+'の理解単位と、概要を含む'+activeMedia.length+'本の動画を掲載しています。'+mediaStatus+'動画の実端末での再生と読み上げの実聴は未確認です。<p data-site-error hidden role="status"></p><noscript><p class="no-js-note">JavaScriptが無効のため、操作ではなく初期例を表示しています。説明と「次へ」のリンクは利用できます。</p></noscript></div><div class="site-content">'+toc+'<div class="learning-flow">'+chapters+'</div></div><section class="site-sources" id="source"><p class="eyebrow">SOURCE / 出典と範囲</p><h2>仕組みと、証拠を分けて読む。</h2><p>Vaswani, A. et al. (2017). <cite>Attention Is All You Need.</cite> NeurIPS 2017. この体験はarXiv:1706.03762v7を参照しています。</p><p><a href="https://arxiv.org/html/1706.03762v7" target="_blank" rel="noopener noreferrer">原論文の本文 ↗</a> · <a href="https://doi.org/10.48550/arXiv.1706.03762" target="_blank" rel="noopener noreferrer">DOI ↗</a></p><p>Attentionの操作は、手で構成した小さな数値例です。BLEUの比較だけはTable 2の報告値を表示しています。このサイトでモデルを学習・翻訳評価したものではありません。</p><p>論文の著者・所属組織の公式サイトではありません。支援先は、この解説体験の制作者です。</p><details class="font-license"><summary>使用フォントのライセンス</summary><pre tabindex="0">'+e(fontLicense)+'</pre></details></section></main>'+renderSponsor(variant.sponsor)+'<script>'+minifiedJs.replace(/<\/script/gi,'<\\/script')+'</script>';
const html='<!doctype html><html lang="ja"><head>'+head+'</head><body>'+body+'</body></html>';
await writeFile(path.join(out,'index.html'),html);
await writeFile(path.join(out,'build-info.json'),JSON.stringify({built_at:new Date().toISOString(),status:production?'production_candidate':'local_prototype',published:false,units:config.units.length,ready_media:activeMedia.length,sha256:createHash('sha256').update(html).digest('hex'),media_files:mediaPaths,entry:'index.html',format:'Static HTML with inline CSS, scripts, and fonts; works without a module server'},null,2)+'\n');
console.log((production?'Built production candidate: ':'Built local site: ')+path.join(out,'index.html')+' ('+Buffer.byteLength(html)+' bytes), '+config.units.length+' units, '+activeMedia.length+' ready videos.');

