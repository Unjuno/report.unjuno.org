'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('dist/assets/feed-pagination.js','utf8');
const schedule=source.slice(source.indexOf('const sponsorTemplate='),source.indexOf("let cursor='*'"));
// Exercise the production schedule for many independent random streams, including endpoints.
for(let seed=0;seed<1000;seed++){
 let state=seed+1,random=()=>seed===0?0:seed===1?0.999999999:((state=Math.imul(state,1664525)+1013904223>>>0)/4294967296);
 const sponsor={dataset:{sponsor:''},cloneNode(){return {dataset:{sponsor:''},hidden:false}}};
 const root={children:[{dataset:{entry:''}},{dataset:{entry:''}},{dataset:{entry:''}},sponsor],querySelectorAll:()=>[sponsor],insertBefore(n){this.children.push(n)}};
 const c=vm.createContext({root,document:{querySelector:()=>null},sentinel:{},Math:Object.assign(Object.create(Math),{random})});vm.runInContext(schedule,c);
 let since=0,count=0;const gaps=new Set();
 for(let i=0;i<200;i++){const before=root.children.slice();root.children.push({dataset:{entry:''}});since++;vm.runInContext('appendSponsor()',c);assert.deepEqual(root.children.slice(0,before.length),before,'existing card identity and order preserved');if(root.children.at(-1).dataset.sponsor!==undefined){assert(since>=5&&since<=8);gaps.add(since);since=0;count++;}}
 assert(count>=25&&count<=40);if(seed>1)assert(gaps.size>1,'seeded stream varies gaps');
}
// First placement is always after three papers, including short/empty static feeds.
for(let initial=0;initial<3;initial++){
 const pristine={dataset:{sponsor:''},cloneNode(){return {dataset:{sponsor:''}}}};
 const root={children:Array.from({length:initial},()=>({dataset:{entry:''}})),querySelectorAll:()=>[],insertBefore(n){this.children.push(n)}};
 const c=vm.createContext({root,sentinel:{},document:{querySelector:()=>({content:{firstElementChild:pristine}})},Math});vm.runInContext(schedule,c);
 for(let n=initial;n<3;n++){root.children.push({dataset:{entry:''}});vm.runInContext('appendSponsor()',c);assert.equal(root.children.filter(x=>x.dataset.sponsor!==undefined).length,n===2?1:0);}
 assert.equal(root.children.length,4);
}
assert.match(fs.readFileSync('dist/assets/spline-type.js','utf8'),/\.entry\[data-entry\], \.entry\[data-sponsor\]/);
// Initial and appended sponsors enter the same reveal observer, once per node.
const revealSource=fs.readFileSync('dist/assets/spline-type.js','utf8');
const observed=[],revealContext=vm.createContext({observer:{observe:n=>observed.push(n)},start(){},WeakSet});
vm.runInContext(revealSource.slice(revealSource.indexOf('  const watched ='),revealSource.indexOf('  // Cubic Bézier')),revealContext);
const selector='.entry[data-entry], .entry[data-sponsor]',initialSponsor={};
revealContext.discover({querySelectorAll:s=>s===selector?[initialSponsor]:[]});
const dynamicSponsor={matches:s=>s===selector};revealContext.discover(dynamicSponsor);revealContext.discover(dynamicSponsor);
assert.deepEqual(observed,[initialSponsor,dynamicSponsor]);
// Use the full pagination runtime with real repeated sponsor clones and local filtering.
class N{constructor(tag){this.tag=tag;this.children=[];this.events={};this.value='';this.dataset={};this.content={textContent:''};this.hidden=false}append(...n){this.children.push(...n)}setAttribute(){}addEventListener(e,f){this.events[e]=f}insertBefore(n,ref){this.children.splice(this.children.indexOf(ref),0,n)}getBoundingClientRect(){return {top:99999}}set innerHTML(s){this.content.textContent=s.replace(/<[^>]*>/g,'')}cloneNode(){const n=new N(this.tag);n.dataset={...this.dataset};return n}focus(){}}
const root=new N('main'),search=new N('input'),clear=new N('button'),count=new N('p'),empty=new N('p'),sponsor=new N('aside');sponsor.dataset.sponsor='';root.children=[sponsor];
const all=s=>s==='[data-entry]'?root.children.filter(n=>n.dataset.entry!==undefined):s==='[data-sponsor]'?root.children.filter(n=>n.dataset.sponsor!==undefined):[];root.querySelectorAll=all;
let requests=0,responses=[],observer;const frames=[];
const context={document:{querySelector:s=>({'#papers':root,'#search':search,'#clear':clear,'#count':count,'#empty':empty}[s]),querySelectorAll:all,createElement:t=>new N(t)},window:{},URLSearchParams,AbortController,setTimeout,clearTimeout,innerHeight:800,requestAnimationFrame:f=>frames.push(f),fetch:async()=>{requests++;return responses.shift()}};
const record=i=>({DOI:'10.1234/'+i,title:['Paper '+i]});const response=(a,next)=>({ok:true,json:async()=>({message:{items:a,'next-cursor':next}})});const flush=()=>new Promise(r=>setImmediate(r));
(async()=>{
 responses.push(response(Array.from({length:12},(_,i)=>record(i)),'next'));
 vm.runInNewContext(source,context);await flush();
 responses.push(response(Array.from({length:12},(_,i)=>record(i+12)),'next-2'));root.children.at(-1).children[1].events.click();await flush();assert.equal(all('[data-entry]').length,24);assert(all('[data-sponsor]').length>=4);
 const before=root.children.slice(0,-1);responses.push(response(Array.from({length:12},(_,i)=>record(i)),'duplicates'));root.children.at(-1).children[1].events.click();await flush();assert.deepEqual(root.children.slice(0,-1),before,'duplicates consume neither space nor sponsor schedule');
 const paginationInput=search.events.input;
 vm.runInNewContext(fs.readFileSync('dist/assets/feed.js','utf8'),context);
 search.value='Paper 1';search.events.input({});paginationInput();assert(all('[data-sponsor]').every(n=>n.hidden));assert(all('[data-entry]').some(n=>!n.hidden));const r=requests;await flush();assert.equal(requests,r);
 responses.push(response(Array.from({length:12},(_,i)=>record(i+24)),'later'));
 clear.events.click();paginationInput();await flush();responses.push(response(Array.from({length:8},(_,i)=>record(i+36)),'later-2'));root.children.at(-1).children[1].events.click();await flush();assert(all('[data-sponsor]').every(n=>!n.hidden));assert.equal(all('[data-entry]').length,44);assert.deepEqual(root.children.slice(0,before.length),before,'clear and pagination preserve original card identities');
 assert(!source.includes('query.bibliographic'));const html=fs.readFileSync('dist/index.html','utf8');assert.match(html,/class="entry sponsor-entry has-living-field cinema-field" data-sponsor/);const initialCount=Math.min(12,JSON.parse(fs.readFileSync('dist/data/papers.json','utf8')).papers.length);assert.equal((html.match(/data-sponsor/g)||[]).length,1+(initialCount>=3?1+Math.floor((initialCount-3)/6):0));assert.match(html,/https:\/\/github.com\/sponsors\/Unjuno/);
 console.log('PASS 1,000 random streams, 200,000 papers: 5–8 paper gaps, no adjacent sponsors, append-only identity/order, duplicate pages, filter hide/clear, continued pagination, shared card classes. Mock, not browser geometry.');
})().catch(e=>{console.error(e);process.exitCode=1});
