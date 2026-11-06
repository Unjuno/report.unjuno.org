/* Normal feed pagination never uses the local filter as a remote search query. */
(()=>{'use strict';const root=document.querySelector('#papers'),filter=document.querySelector('#search');if(!root||!filter)return;
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text)n.textContent=text;return n;},norm=s=>String(s||'').normalize('NFKC').toLowerCase().trim();
function normDoi(value){let doi=norm(value).replace(/^https?:\/\/(?:dx\.)?doi\.org\//,'').replace(/^doi:\s*/,'');try{return decodeURIComponent(doi).toLowerCase();}catch(_){return doi;}}
function plain(value){const template=document.createElement('template');template.innerHTML=String(value||'');let text=template.content.textContent||'';for(let pass=0;pass<3;pass++){const decoded=text.replace(/&(?:#[0-9]{1,7}|#x[0-9a-f]{1,6}|[a-z][a-z0-9]{1,31});/gi,entity=>{const decoder=document.createElement('template');decoder.innerHTML=entity;return decoder.content.textContent||entity;});if(decoded===text)break;text=decoded;}return text.replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();}
const sentinel=el('section','load-more'),status=el('p'),more=el('button','','続きを読み込む');status.setAttribute('role','status');more.type='button';sentinel.append(status,more);root.append(sentinel);
const seen=new Set([...root.querySelectorAll('[data-doi]')].map(n=>normDoi(n.dataset.doi)).filter(Boolean));
// DOI is authoritative. Bibliographic fallback applies only to an unclaimed DOI-less local card.
function bibliographicKey(p){
 const title=norm(p.title).replace(/\s+/g,' '),authors=norm(p.authors_full?.length?p.authors_full.join(', '):p.authors).replace(/\s+/g,' '),year=String(p.year||'');
 if(!title||!authors||!/^[0-9]{4}$/.test(year)||/\bet\s+al\b|\.\.\.|…|著者情報なし|著者不明|(?:^|[,\s])(?:他|ほか)(?:$|[,\s])/i.test(authors))return '';
 return JSON.stringify([title,authors,year]);
}
const unidentifiedKeys=new Set(),claimedFallback=new Map();
for(const card of root.querySelectorAll('[data-entry]'))if(!normDoi(card.dataset.doi)){
 const key=bibliographicKey({title:card.dataset.paperTitle,authors:card.dataset.paperAuthors,year:card.dataset.paperYear});if(key)unidentifiedKeys.add(key);
}
// One stable schedule per page visit; count only accepted, unique papers.
// Every later sponsor is appended, never inserted ahead of an existing paper.
const sponsorTemplate=document.querySelector('#sponsor-card-template')?.content?.firstElementChild||root.querySelectorAll('[data-sponsor]')[0];
let papersSinceSponsor=0,hasSponsor=false;
for(const card of root.children){if(card.dataset?.sponsor!==undefined){papersSinceSponsor=0;hasSponsor=true;}else if(card.dataset?.entry!==undefined)papersSinceSponsor++;}
const sponsorGap=()=>5+Math.floor(Math.random()*4);
let nextSponsorGap=hasSponsor?sponsorGap():3;
function appendSponsor(){
 if(!sponsorTemplate||++papersSinceSponsor<nextSponsorGap)return;
 const card=sponsorTemplate.cloneNode(true);card.hidden=false;
 root.insertBefore(card,sentinel);papersSinceSponsor=0;nextSponsorGap=sponsorGap();
}
let cursor='*',loading=false,ended=false,failed=false,emptyPages=0,restarts=0,scheduleEpoch=0,bufferedPage=null;
// Both local JSON and Crossref records enter the same paper-card renderer.
const localSlugs=new Set([...root.querySelectorAll('[data-entry]')].map(n=>n.id?.replace(/^paper-/,'')));
let localIndex=Number(root.dataset.localRendered||0),localTotal=Number(root.dataset.localCount||0),localRecords=null;
// Crossref abstract reuse is not verified per record. Import bibliographic metadata only; local summaries remain unchanged.
function fromCrossref(record){return {doi:record.DOI,title:plain(record.title?.[0]),authors:(record.author||[]).map(a=>plain([a.given,a.family].filter(Boolean).join(' '))).join(', '),year:record.published?.['date-parts']?.[0]?.[0],category:plain(record['container-title']?.[0]),tags:(record.subject||[]).map(plain),summary_ja:'',local:false};}
function appendPaper(p){const doi=normDoi(p.doi),title=p.local?String(p.title):plain(p.title),key=bibliographicKey({...p,title});
 if(!title||(p.local?localSlugs.has(p.slug):(!doi||seen.has(doi))))return false;
 if(!p.local&&key&&unidentifiedKeys.has(key)&&!claimedFallback.has(key)){claimedFallback.set(key,doi);seen.add(doi);return false;}
 if(p.local){localSlugs.add(p.slug);if(!doi&&key)unidentifiedKeys.add(key);}if(doi)seen.add(doi);
 const authorText=(p.authors_full?.length?p.authors_full.join(', '):p.authors)||'',authors=p.local?authorText:plain(authorText),article=el('article','entry'),art=el('div','art'),content=el('div','content'),h=el('h2'),a=el('a','',title),read=el('a','read',p.local?(p.preserve?'解説を読む ↗':'原論文の概要を読む ↗'):'原論文を読む ↗');
 article.dataset.entry='';if(doi)article.dataset.doi=doi;article.dataset.search=[doi,title,authors,p.category,p.year,p.summary_ja||p.claim||'',...(p.tags||[])].join(' ');article.id=p.local?'paper-'+p.slug:'doi-'+doi.replace(/[^a-z0-9]/g,'-');
 a.href=p.local?'/notes/'+p.slug+'/':'https://doi.org/'+encodeURIComponent(doi);if(!p.local){a.target='_blank';a.rel='noopener noreferrer';}read.href=a.href;if(!p.local){read.target=a.target;read.rel=a.rel;}
 h.append(a);content.append(el('p','meta',[p.year,p.category].filter(Boolean).join(' · ')),h);const summary=p.summary_ja||p.claim;if(summary)content.append(el('p','paper-summary',p.local?summary:plain(summary)));
 const details=el('details','paper-metadata');details.append(el('summary','',authors?'著者: '+authors:'著者情報'),el('p','',authors||'著者情報なし'));if(p.tags?.length)details.append(el('p','','キーワード: '+(p.local?p.tags:p.tags.map(plain)).join(' · ')));if(p.local&&doi){const link=el('a','',doi);link.href='https://doi.org/'+encodeURIComponent(doi);link.target='_blank';link.rel='noopener noreferrer';details.append(link);}content.append(details,read);article.append(art,content);root.insertBefore(article,sentinel);appendSponsor();return true;}
function validateLocal(data){
 if(data?.schema_version!==1||!Array.isArray(data.papers))throw Error('Local paper JSON schema mismatch');
 const slugs=new Set();for(const [i,p] of data.papers.entries()){
  for(const key of ['slug','title','authors','category','url','claim','limitation','visual'])if(typeof p?.[key]!=='string'||!p[key].trim())throw Error('Local paper '+i+' missing '+key);
  if(!/^[a-z0-9-]+$/.test(p.slug)||slugs.has(p.slug)||!p.url.startsWith('https://')||!Number.isInteger(p.year)||!Array.isArray(p.tags)||p.tags.some(t=>typeof t!=='string')||!['attention','network','ecology'].includes(p.visual))throw Error('Invalid local paper '+i);
  for(const key of ['summary_ja','mechanism_ja','doi'])if(key in p&&typeof p[key]!=='string')throw Error('Invalid local paper '+i+' '+key);
  if('authors_full' in p&&(!Array.isArray(p.authors_full)||p.authors_full.some(a=>typeof a!=='string')))throw Error('Invalid local authors '+i);
  if('preserve' in p&&typeof p.preserve!=='boolean')throw Error('Invalid local preserve '+i);slugs.add(p.slug);
 }
 if(data.papers.length!==localTotal)throw Error('Local paper JSON count mismatch');return data.papers;
}
async function loadLocal(signal){
 if(!localRecords){const response=await fetch(root.dataset.papersUrl||'/data/papers.json',{signal});if(!response.ok)throw Error('Local paper HTTP '+response.status);localRecords=validateLocal(await response.json());}
 const end=filtered()?localRecords.length:Math.min(localIndex+12,localRecords.length);for(;localIndex<end;localIndex++)appendPaper({...localRecords[localIndex],local:true});
 status.textContent='';more.textContent='続きを読み込む';sentinel.hidden=filtered()&&localIndex>=localTotal;
}
function filtered(){return !!norm(filter.value);}
// Experimental bounded velocity/latency lead. Early requests require sustained motion.
const clock=()=>globalThis.performance?.now?.()??Date.now();
let velocity=0,lastY=window.scrollY||0,lastTime=clock(),latency=1800,earlyTimer=0,idleTimer=0,scrollFrame=0,speculativeGate=0;
const baseLead=()=>Math.max(1100,innerHeight*1.8);
function cancelEarly(){clearTimeout(earlyTimer);earlyTimer=0;}
function canPrefetch(){return velocity>0&&!loading&&!failed&&!ended&&!filtered()&&emptyPages<3;}
function considerEarly(){
 if(!canPrefetch()){cancelEarly();return;}
 const top=sentinel.getBoundingClientRect().top;
 const lead=Math.max(baseLead(),Math.min(4320,velocity*latency+200));
 if(top>=innerHeight+lead){cancelEarly();return;}
 if(top<innerHeight+baseLead()){cancelEarly();load();return;}
 if((window.scrollY||0)<speculativeGate){cancelEarly();return;}
 if(!earlyTimer)earlyTimer=setTimeout(()=>{earlyTimer=0;if(!canPrefetch()||clock()-lastTime>60)return;const currentLead=Math.max(baseLead(),Math.min(4320,velocity*latency+200)),top=sentinel.getBoundingClientRect().top;if(top<innerHeight+currentLead){speculativeGate=(window.scrollY||0)+top-innerHeight-baseLead();load();}},velocity>=2.4?120:600);
}
window.addEventListener?.('scroll',()=>{
 const now=clock(),y=window.scrollY||0,elapsed=now-lastTime;
 velocity=elapsed>0?Math.max(0,(y-lastY)/elapsed):0;lastY=y;lastTime=now;
 clearTimeout(idleTimer);idleTimer=setTimeout(()=>{velocity=0;cancelEarly();},100);
// Keep event-time velocity samples, but read layout at most once per rendered frame.
 if(!scrollFrame)scrollFrame=requestAnimationFrame(()=>{scrollFrame=0;considerEarly();});
},{passive:true});

async function load(){if(loading||ended||(filtered()&&localIndex>=localTotal)||failed||emptyPages>=3)return;scheduleEpoch++;cancelEarly();const started=clock();loading=true;more.disabled=true;sentinel.setAttribute('aria-busy','true');status.textContent='';const loadingNotice=setTimeout(()=>{if(loading&&!filtered()){sentinel.classList?.add('loading');status.textContent='続きを準備しています…';}},1000);const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),18000);const loadingLocal=localIndex<localTotal;try{if(loadingLocal){await loadLocal(controller.signal);return;}// During active downward motion, fetch two small batches in one request.
// Keep the second batch off-DOM until another normal pagination trigger.
// The cursor is committed only after both halves are consumed.
const cached=bufferedPage;let records,next;if(cached){records=cached.records;next=cached.next;bufferedPage=null;}else{const rows=velocity>0&&clock()-lastTime<=100?24:12;const params=new URLSearchParams({rows:String(rows),cursor,filter:'type:journal-article',select:'DOI,title,author,published,container-title,subject',sort:'is-referenced-by-count',order:'desc'});let response=await fetch('https://api.crossref.org/works?'+params,{signal:controller.signal});if(!response.ok&&[400,404,410].includes(response.status)&&cursor!=='*'&&restarts<1){restarts++;params.set('cursor','*');response=await fetch('https://api.crossref.org/works?'+params,{signal:controller.signal});}if(!response.ok)throw Error('HTTP '+response.status);const data=await response.json();records=data.message?.items;next=data.message?.['next-cursor'];latency=Math.min(5000,Math.max(100,clock()-started));if(!Array.isArray(records)||records.length>rows)throw Error('Invalid metadata');}
// A filter entered during the request freezes the existing set; replay this cursor when cleared.
if(filtered()){status.textContent='フィルター解除後に続きを読み込めます。';return;}
const remainder=records.length>12?{records:records.slice(12),next}:null;if(remainder)records=records.slice(0,12);
let added=0;for(const record of records)if(appendPaper(fromCrossref(record)))added++;bufferedPage=remainder;ended=!records.length||(!bufferedPage&&(!next||next===cursor));if(!bufferedPage)cursor=next||cursor;failed=false;emptyPages=added?0:emptyPages+1;status.textContent=ended?'現在取得できる論文はここまでです。':emptyPages>=3?'新しい論文が見つかりませんでした。続きを手動で確認できます。':'';more.hidden=ended;more.textContent='続きを読み込む';
}catch(error){failed=true;status.textContent=loadingLocal?'登録論文のJSONを読み込めませんでした。内容または接続を確認して再試行してください。表示済みの論文はそのままです。':'追加分を取得できませんでした。表示済みの論文はそのままです。';more.textContent='続きから再試行';}finally{clearTimeout(timeout);clearTimeout(loadingNotice);loading=false;sentinel.setAttribute('aria-busy','false');sentinel.classList?.remove('loading');more.disabled=false;if(!failed&&!ended&&!filtered()&&emptyPages<3){const continuationEpoch=scheduleEpoch;requestAnimationFrame(()=>{if(continuationEpoch!==scheduleEpoch||loading||failed||ended||filtered()||emptyPages>=3)return;if(sentinel.getBoundingClientRect().top<innerHeight+Math.max(1100,innerHeight*1.8))load();});}}}
more.addEventListener('click',()=>{failed=false;emptyPages=0;restarts=0;load();});
function updateFilter(){scheduleEpoch++;sentinel.hidden=filtered()&&localIndex>=localTotal;if((!filtered()||localIndex<localTotal)&&!failed&&!ended&&emptyPages<3)load();}
filter.addEventListener('input',updateFilter);filter.addEventListener('compositionend',updateFilter);document.querySelector('#clear')?.addEventListener('click',updateFilter);
if(window.IntersectionObserver)new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)&&!failed&&emptyPages<3)load();},{rootMargin:Math.max(1100,Math.round(innerHeight*1.8))+'px'}).observe(sentinel);
updateFilter();
})();
