'use strict';
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync(process.argv[2] || 'dist/assets/feed.js', 'utf8');

function fixture(size = 2000) {
  const metrics = { normalized: 0, hiddenWrites: 0, hiddenReads: 0, textWrites: 0, scans: 0, recordReads: 0 };
  const element = (extra = {}) => {
    let hidden = false, text = '';
    return Object.assign({
      events: {}, dataset: {}, attrs: {}, value: '', nodeType: 1,
      get hidden() { metrics.hiddenReads++; return hidden; },
      set hidden(value) { metrics.hiddenWrites++; hidden = value; },
      get textContent() { return text; },
      set textContent(value) { metrics.textWrites++; text = value; },
      addEventListener(name, fn) { this.events[name] = fn; },
      setAttribute(name, value) { this.attrs[name] = value; },
      focus() { this.focused = true; },
      matches(selector) { return (selector === '[data-entry]' && 'entry' in this.dataset) || (selector === '[data-sponsor]' && 'sponsor' in this.dataset); },
      querySelector() { return null; },
      querySelectorAll() { return []; }
    }, extra);
  };
  const makeCard = (text, id) => element({ id, dataset: { entry: '',
    get search() { metrics.recordReads++; return text; },
    set search(value) { text = value; }
  } });
  const cards = Array.from({length: size}, (_, i) => makeCard('Ａｌｐｈａ beta gamma 2024 気候 論文 ' + i, 'paper-' + i));
  const search = element(), clear = element(), count = element(), empty = element(), feedback = element();
  const sponsor = element({dataset:{sponsor:''}}), sponsors = [sponsor], root = element(), category = element({dataset:{category:'気候'}});
  root.contains = item => cards.includes(item) || sponsors.includes(item);
  const links = cards.slice(0, 3).map(card => element({hash:'#' + card.id}));
  let observer;
  const document = {
    contains: root.contains,
    querySelector: selector => ({'#search':search,'#clear':clear,'#count':count,'#empty':empty,'#filter-feedback':feedback,'#papers':root}[selector]),
    querySelectorAll(selector) {
      if (selector === '[data-entry]') { metrics.scans++; return cards; }
      if (selector === '[data-sponsor]') return sponsors;
      if (selector === '[data-category]') return [category];
      return links;
    },
    body: {classList:{toggle(){ return false; }}}
  };
  class MutationObserver { constructor(callback) { observer = callback; } observe(target, options) { this.options = options; } }
  const box = vm.createContext({document, window:{MutationObserver}, MutationObserver, metrics});
  vm.runInContext('const originalNormalize = String.prototype.normalize; String.prototype.normalize = function(...args) { metrics.normalized++; return originalNormalize.apply(this, args); };', box);
  vm.runInContext(source, box);
  const reset = () => { for (const key of Object.keys(metrics)) metrics[key] = 0; };
  const input = value => { search.value = value; search.events.input({}); };
  const mutation = records => observer(records);
  return {cards,search,clear,count,empty,feedback,sponsor,sponsors,links,category,root,metrics,reset,input,mutation,makeCard,element};
}

const f = fixture();
f.reset();
f.input('alpha beta gamma');
const first = {...f.metrics};
assert.equal(f.count.textContent, '2000件の論文');
f.reset();
f.input('alpha beta gamma');
const repeated = {...f.metrics};
f.reset();
f.mutation([{type:'childList', addedNodes:[{nodeType:1,matches:()=>false,querySelector:()=>null}], removedNodes:[]}]);
const decoration = {...f.metrics};
console.log(JSON.stringify({fixture:'2000 mocked cards, three matching query terms',first,repeated,decoration}));
const longFeed = fixture(10000);
longFeed.input('alpha');
const nextPage = Array.from({length:12}, (_,i)=>longFeed.makeCard('Alpha next page '+i, 'next-'+i));
longFeed.cards.push(...nextPage);
longFeed.reset();
longFeed.mutation([{type:'childList',addedNodes:nextPage,removedNodes:[]}]);
const append = {...longFeed.metrics};
assert.equal(longFeed.count.textContent, '10012件の論文');
console.log(JSON.stringify({fixture:'10000 filtered cards plus a 12-card append',append}));
const normalFeed = fixture(10000);
const normalPage = Array.from({length:12}, (_,i)=>normalFeed.makeCard('Alpha next page '+i, 'next-'+i));
normalFeed.cards.push(...normalPage);
normalFeed.reset();
normalFeed.mutation([{type:'childList',addedNodes:normalPage,removedNodes:[]}]);
const normalAppend = {...normalFeed.metrics};
assert.equal(normalFeed.count.textContent, '10012件の論文');
console.log(JSON.stringify({fixture:'10000 unfiltered cards plus a normal 12-card append',append:normalAppend}));
if (process.env.MEASURE_ONLY === '1') process.exit(0);
assert.equal(first.normalized, 2001, 'normalize each card once, not once per query term');
assert.equal(repeated.normalized, 1, 'only the query needs normalization on a repeated input');
assert.equal(repeated.hiddenWrites, 0, 'unchanged visibility does not rewrite the DOM');
assert.equal(repeated.textWrites, 0, 'unchanged counts do not rewrite the DOM');
assert.equal(decoration.scans, 0, 'title decoration/status mutations do not refilter every card');
assert.equal(decoration.normalized, 0);
assert.equal(append.scans, 0, 'an append does not rescan the document');
assert.equal(append.recordReads, 12, 'an append only reads the arriving records');
assert.equal(append.normalized, 13, 'normalize the current query and twelve new records');
assert.equal(normalAppend.scans, 0);
assert.equal(normalAppend.hiddenReads, 13, 'only twelve new cards plus the empty-state visibility are read');

// Preserve case/full-width/space normalization, AND matching, empty and clear states.
const small = fixture(3);
small.input('  ＡＬＰＨＡ   beta  ');
assert(small.cards.every(card=>!card.hidden));
small.input('alpha missing');
assert.equal(small.empty.hidden, false);
assert(small.links.every(link=>link.hidden));
assert(small.sponsor.hidden);
small.clear.events.click();
assert.equal(small.search.value, '');
assert(small.search.focused);
assert(small.cards.every(card=>!card.hidden));
assert.equal(small.sponsor.hidden, false);
small.category.events.click();
assert.equal(small.count.textContent, '3件の論文');

// Late arrivals and removals are included; only new/changed search text is normalized.
small.input('alpha');
const newSponsor = small.element({dataset:{sponsor:''}});
small.sponsors.push(newSponsor);
small.mutation([{type:'childList',addedNodes:[newSponsor],removedNodes:[]}]);
assert(newSponsor.hidden, 'a sponsor added independently during a filter stays hidden');
const incoming = small.makeCard('Alpha new paper', 'paper-new');
small.cards.push(incoming);
small.reset();
small.mutation([{type:'childList',addedNodes:[incoming],removedNodes:[]}]);
assert.equal(small.count.textContent, '4件の論文');
assert.equal(small.metrics.normalized, 2);
incoming.dataset.search = 'unrelated';
small.mutation([{type:'attributes',attributeName:'data-search',target:incoming}]);
assert(incoming.hidden);
assert.equal(small.count.textContent, '3件の論文');
const removed = small.cards.splice(0,1)[0];
small.mutation([{type:'childList',addedNodes:[],removedNodes:[small.element({querySelector:()=>removed,querySelectorAll:()=>[removed]})]}]);
assert.equal(small.count.textContent, '2件の論文');

// Structural mutations must not commit a partially composed IME query.
small.search.events.compositionstart();
small.search.value = '存在しない';
small.search.events.input({isComposing:true});
small.reset();
small.mutation([{type:'childList',addedNodes:[incoming],removedNodes:[]}]);
assert.equal(small.metrics.scans, 0);
assert.equal(small.count.textContent, '2件の論文');
small.search.events.compositionend();
assert.equal(small.count.textContent, '0件の論文');
assert.equal(small.empty.hidden, false);
small.clear.events.click();
assert.equal(small.count.textContent, '3件の論文');
// Final membership wins over mutation order, and duplicate records count once.
small.input('alpha');
small.reset();
small.mutation([{type:'childList',addedNodes:[small.cards[0]],removedNodes:[small.cards[0]]},
  {type:'attributes',attributeName:'data-search',target:small.cards[0]}]);
assert.equal(small.count.textContent, '2件の論文');
assert.equal(small.metrics.recordReads, 1);
assert.equal(small.metrics.scans, 0);

// Full filtering is document-wide, so a move outside #papers is not a removal
// while the card still belongs to this document.
const movedOutside = small.cards[0], oldContains = small.root.contains;
small.root.contains = item => item!==movedOutside && oldContains(item);
small.mutation([{type:'childList',addedNodes:[],removedNodes:[movedOutside]}]);
assert.equal(small.count.textContent, '2件の論文');
small.root.contains = oldContains;

// Removal plus metadata edit, absent add/remove, nested insertion and sponsors.
const absent = small.makeCard('alpha absent', 'absent');
small.mutation([{type:'childList',addedNodes:[absent],removedNodes:[absent]}]);
assert.equal(small.count.textContent, '2件の論文');
const nested = small.makeCard('alpha nested', 'nested'), nestedSponsor = small.element({dataset:{sponsor:''}});
small.cards.push(nested);small.sponsors.push(nestedSponsor);
const wrapper = small.element({querySelector:()=>nested,querySelectorAll:()=>[nested,nestedSponsor]});
small.mutation([{type:'childList',addedNodes:[wrapper],removedNodes:[]}]);
assert.equal(small.count.textContent, '3件の論文');assert(nestedSponsor.hidden);
small.cards.splice(small.cards.indexOf(nested),1);small.sponsors.splice(small.sponsors.indexOf(nestedSponsor),1);
nested.dataset.search='unrelated';
small.mutation([{type:'attributes',attributeName:'data-search',target:nested},
  {type:'childList',addedNodes:[],removedNodes:[wrapper]}]);
assert.equal(small.count.textContent, '2件の論文');
small.cards.push(nested);nested.dataset.search='alpha again';
small.mutation([{type:'childList',addedNodes:[nested],removedNodes:[]}]);
assert.equal(small.count.textContent, '3件の論文');

// A user input may run before delivery of the pending structural mutation.
const waiting = small.makeCard('beta deferred', 'waiting');small.cards.push(waiting);
small.input('beta');
const expected = small.count.textContent;
small.mutation([{type:'childList',addedNodes:[waiting],removedNodes:[]}]);
assert.equal(small.count.textContent, expected);
// Preserve the old behavior for programmatic queries observed with a mutation.
small.search.value='deferred';
small.mutation([{type:'attributes',attributeName:'data-search',target:waiting}]);
assert.equal(small.count.textContent, '1件の論文');
assert(!waiting.hidden);
small.clear.events.click();
assert.equal(small.count.textContent, small.cards.length+'件の論文');
assert(!small.sponsor.hidden);

// A bounded deterministic mutation sequence uses an independent result oracle.
const randomFeed = fixture(25);
randomFeed.input('alpha');
let seed = 91273, sequence = 0;
const random = n => ((seed = (Math.imul(seed,1664525)+1013904223)>>>0) % n);
for (let step=0;step<500;step++) {
  const action = random(5);
  if (action===0 || !randomFeed.cards.length) {
    const card = randomFeed.makeCard(random(2)?'alpha new':'beta new', 'random-'+sequence++);
    randomFeed.cards.push(card);
    randomFeed.mutation([{type:'childList',addedNodes:[card],removedNodes:[]}]);
  } else if (action===1) {
    const card = randomFeed.cards.splice(random(randomFeed.cards.length),1)[0];
    randomFeed.mutation([{type:'childList',addedNodes:[],removedNodes:[card]}]);
  } else if (action===2) {
    const card = randomFeed.cards[random(randomFeed.cards.length)];
    card.dataset.search = random(2)?'ＡＬＰＨＡ changed':'beta changed';
    randomFeed.mutation([{type:'attributes',attributeName:'data-search',target:card}]);
  } else if (action===3) {
    const card = randomFeed.cards[random(randomFeed.cards.length)];
    randomFeed.mutation([{type:'childList',addedNodes:[card],removedNodes:[card]}]);
  } else randomFeed.input(['alpha','beta','alpha beta',''][random(4)]);
  const terms = randomFeed.search.value.normalize('NFKC').toLowerCase().trim().split(/\s+/).filter(Boolean);
  const expectedVisible = randomFeed.cards.filter(card=>terms.every(term=>card.dataset.search.normalize('NFKC').toLowerCase().includes(term)));
  assert.equal(randomFeed.count.textContent, expectedVisible.length+'件の論文', 'count at step '+step);
  for (const card of randomFeed.cards) assert.equal(card.hidden,!expectedVisible.includes(card),'visibility at step '+step);
  assert.equal(randomFeed.empty.hidden, expectedVisible.length!==0);
  assert.equal(randomFeed.sponsor.hidden, terms.length>0);
}
console.log('PASS cached local search, incremental append/removal work, IME interruption, mutation races, nested moves, metadata edits, sponsors, counts and links. Mock operations, not browser latency.');
