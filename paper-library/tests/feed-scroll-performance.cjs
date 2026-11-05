'use strict';
// Deterministic operation counts and simulated scheduling, not browser timings.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(process.argv[2]||'dist/assets/feed-pagination.js','utf8');
function fixture(localCount=0){
 let now=0,top=10000,reads=0,nextId=1,observer;const timers=new Map(),frames=new Map(),requests=[];
 class Node{
  constructor(tag){this.tag=tag;this.children=[];this.events={};this.dataset={};this.value='';this.content={textContent:''};}
  append(...nodes){this.children.push(...nodes)}
  insertBefore(node,ref){this.children.splice(this.children.indexOf(ref),0,node)}
  querySelectorAll(){return []}setAttribute(){}addEventListener(name,callback){this.events[name]=callback}
  getBoundingClientRect(){reads++;return {top}}
  set innerHTML(value){this.content.textContent=value.replace(/<[^>]*>/g,'')}
 }
 const root=new Node('main'),search=new Node('input'),clear=new Node('button');root.dataset.localCount=String(localCount);
 const window={scrollY:0,events:{},addEventListener(name,callback,options){this.events[name]=callback;assert.equal(options.passive,true)},IntersectionObserver:class{constructor(callback){observer=callback}observe(){}}};
 const context={document:{querySelector:s=>({'#papers':root,'#search':search,'#clear':clear}[s]),createElement:t=>new Node(t)},window,innerHeight:800,URLSearchParams,AbortController,performance:{now:()=>now},
  setTimeout:(callback,delay)=>{const id=nextId++;timers.set(id,{at:now+delay,callback});return id},clearTimeout:id=>timers.delete(id),requestAnimationFrame:callback=>{const id=nextId++;frames.set(id,callback);return id},
  fetch:(url,options)=>new Promise((resolve,reject)=>requests.push({url,options,at:now,resolve,reject}))};context.IntersectionObserver=window.IntersectionObserver;
 vm.runInNewContext(source,context);
 const advance=ms=>{const end=now+ms;while(true){const due=[...timers].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!due)break;now=due[1].at;timers.delete(due[0]);due[1].callback()}now=end};
 const frame=()=>{const callbacks=[...frames.values()];frames.clear();callbacks.forEach(callback=>callback(now))};
 const scroll=(dy=10,ms=2)=>{advance(ms);window.scrollY+=dy;window.events.scroll()};
 const response=(items,next='next')=>({ok:true,json:async()=>({message:{items,'next-cursor':next}})});
 const settle=()=>new Promise(resolve=>setImmediate(resolve));
 return {root,search,requests,advance,frame,scroll,response,settle,top:value=>top=value,reads:()=>reads,reset:()=>reads=0,now:()=>now,intersect:()=>observer([{isIntersecting:true}]),more:()=>root.children.at(-1).children[1],input:value=>{search.value=value;search.events.input()},cards:()=>root.children.filter(n=>n.dataset.entry==='')};
}
const record=id=>({DOI:'10.1234/'+id,title:['Paper '+id],published:{'date-parts':[[2024]]}});
(async()=>{
 const f=fixture();for(let i=0;i<40;i++)f.scroll();f.frame();const pending=f.reads();assert.equal(f.requests.length,1);
 f.requests[0].resolve(f.response([record('first')]));await f.settle();f.frame();f.reset();
 for(let i=0;i<40;i++)f.scroll();const beforeFrame=f.reads();f.frame();const eligible=f.reads();
 f.input('private IME 日本語');f.reset();for(let i=0;i<40;i++)f.scroll();f.frame();const filtered=f.reads();assert.equal(f.requests.length,1);
 console.log(JSON.stringify({fixture:'40 scroll events per simulated frame',pendingReads:pending,eligibleReadsBeforeFrame:beforeFrame,eligibleReadsAfterFrame:eligible,filteredReads:filtered}));
 if(process.env.MEASURE_ONLY==='1')return;
 assert.equal(pending,0,'in-flight requests do not force sentinel geometry reads');assert.equal(beforeFrame,0);assert.equal(eligible,1,'eligible scroll bursts read geometry once per frame');assert.equal(filtered,0);
 // An input arriving between a scroll event and its frame suppresses that queued check.
 f.input('');assert.equal(f.requests.length,2);f.requests[1].resolve(f.response([record('second')],'next2'));await f.settle();f.frame();f.reset();f.scroll();f.input('秘密');f.frame();assert.equal(f.reads(),0);assert.equal(f.requests.length,2);
 // The existing near lead still initiates pagination on the next frame; concurrent observer callbacks cannot duplicate it.
 f.input('');f.requests[2].resolve(f.response([record('third')],'next3'));await f.settle();f.frame();f.top(2000);f.scroll();f.frame();assert.equal(f.requests.length,4);f.intersect();assert.equal(f.requests.length,4);
 // Failure disables automatic work, and manual retry preserves all previous cards.
 f.requests[3].reject(Error('offline'));await f.settle();f.reset();for(let i=0;i<40;i++)f.scroll();f.frame();f.intersect();assert.equal(f.reads(),0);assert.equal(f.requests.length,4);assert.equal(f.cards().length,3);
 f.more().events.click();assert.equal(f.requests.length,5);f.requests[4].resolve(f.response([]));await f.settle();f.reset();f.scroll();f.frame();assert.equal(f.reads(),0);assert.equal(f.requests.length,5);
 // Sustained fast motion keeps the 120 ms speculative gate, bounded to existing lead.
 const fast=fixture();fast.advance(1800);fast.requests[0].resolve(fast.response([record('seed')]));await fast.settle();fast.frame();fast.scroll(0,0);fast.frame();fast.top(3500);const start=fast.now();
 fast.scroll(48,16);fast.frame();assert.equal(fast.requests.length,1);
 for(let i=0;i<7;i++){fast.scroll(48,16);fast.frame()}
 assert.equal(fast.requests.length,1,'no speculative request before sustained 120 ms');
 fast.scroll(24,8);assert.equal(fast.requests.length,2);assert.equal(fast.requests[1].at-start,136);assert.equal(fast.cards().length,1);
 console.log(JSON.stringify({scenario:'simulated 1800 ms initial latency, 3 px/ms sustained motion',speculativeRequestAtMs:fast.requests[1].at-start,gateDelayMs:120}));
 // Stopped or reversed motion does not leave a stale speculative request armed.
 const stopped=fixture();stopped.advance(1800);stopped.requests[0].resolve(stopped.response([record('seed')]));await stopped.settle();stopped.frame();stopped.scroll(0,0);stopped.frame();stopped.top(3500);stopped.scroll(48,16);stopped.frame();stopped.advance(200);assert.equal(stopped.requests.length,1);
 stopped.scroll(48,16);stopped.frame();stopped.scroll(-48,16);stopped.frame();stopped.advance(200);assert.equal(stopped.requests.length,1);
 // Local records still render in order, all remaining local papers become searchable, and no query leaves the page.
 const local=fixture(30),papers=Array.from({length:30},(_,i)=>({slug:'paper-'+i,title:'Paper '+i,authors:'Author',category:'Science',url:'https://example.org/'+i,claim:'Claim',limitation:'Limit',visual:'network',year:2024,tags:[]}));
 local.requests[0].resolve({ok:true,json:async()=>({schema_version:1,papers})});await local.settle();local.frame();assert.equal(local.cards().length,12);local.top(2000);local.scroll();local.frame();await local.settle();assert.equal(local.cards().length,24);
 local.input('日本語 private');await local.settle();local.frame();assert.equal(local.cards().length,30);assert.equal(local.requests.length,1);assert.equal(local.requests[0].url,'/data/papers.json');assert.deepEqual(local.cards().map(n=>n.id),papers.map(p=>'paper-'+p.slug));
 assert(f.requests.every(r=>!r.url.includes('query')&&!r.url.includes('秘密')));
 console.log('PASS frame-bounded pagination layout, blocked-state no-read paths, sustained prefetch/stop/reverse, single-flight, retry, local order/completeness and query privacy. Mock scheduling only, not browser performance.');
})().catch(error=>{console.error(error);process.exitCode=1});
