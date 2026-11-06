'use strict';
// Generated card metadata + exact production filter in a deterministic DOM mock.
// This checks the four-field editor output, not browser rendering or IME devices.
const fs=require('node:fs'), path=require('node:path'), vm=require('node:vm'), assert=require('node:assert/strict');
const output=path.resolve(process.argv[2] || 'dist');
const html=fs.readFileSync(path.join(output,'index.html'),'utf8');
const data=JSON.parse(fs.readFileSync(path.join(output,'data/papers.json'),'utf8')).papers;
const decode=s=>s.replace(/&quot;/g,'"').replace(/&#x27;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
const attributes=s=>Object.fromEntries([...s.matchAll(/([\w-]+)="([^"]*)"/g)].map(m=>[m[1],decode(m[2])]));
const make=()=>({events:{},hidden:false,value:'',textContent:'',attrs:{},addEventListener(k,f){this.events[k]=f},setAttribute(k,v){this.attrs[k]=v},focus(){this.focused=true}});
const cards=[...html.matchAll(/<article\b([^>]*\bdata-entry\b[^>]*)>([\s\S]*?)<\/article>/g)].map(m=>{
 const a=attributes(m[1]);return Object.assign(make(),{id:a.id,dataset:{search:a['data-search']},html:m[2]});
});
assert.equal(cards.length,data.length);
const search=make(),clear=make(),count=make(),empty=make(),feedback=make();
const links=cards.map(c=>Object.assign(make(),{hash:'#'+c.id}));
const document={querySelector:s=>({'#search':search,'#clear':clear,'#count':count,'#empty':empty,'#filter-feedback':feedback}[s]||null),querySelectorAll:s=>s==='[data-entry]'?cards:s==='.progress a, .sidebar nav a'?links:[],body:make()};
vm.runInNewContext(fs.readFileSync(path.join(output,'assets/feed.js'),'utf8'),{document,window:{}});
assert.equal(count.textContent,data.length+'件の論文');
for(let index=0;index<data.length;index++){
 const p=data[index],card=cards[index];
 assert.equal(card.id,'paper-'+p.slug);
 assert(card.html.includes('href="'+p.url+'"'),'editor URL is the card destination');
 for(const term of [p.title,...p.authors_full,p.summary_ja,p.url]){
  assert(card.dataset.search.includes(term),'the four-field value reaches data-search');
  search.value=term;search.events.input({});assert.equal(card.hidden,false,'editable field remains searchable: '+term);
 }
}
search.value='__no_material_matches_123__';search.events.input({});assert(cards.every(c=>c.hidden));assert.equal(empty.hidden,false);
clear.events.click();assert(cards.every(c=>!c.hidden));assert.equal(search.value,'');assert.equal(search.focused,true);assert.equal(count.textContent,data.length+'件の論文');assert.equal(empty.hidden,Boolean(data.length));
console.log('PASS generated editor fields: '+data.length+' card(s), identity/link/search/no-match/clear; deterministic DOM mock, not browser QA.');
