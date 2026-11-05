'use strict';
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync(process.argv[2] || 'dist/assets/feed.js', 'utf8');

function fixture(size = 2000) {
  const metrics = { normalized: 0, hiddenWrites: 0, textWrites: 0, scans: 0 };
  const element = (extra = {}) => {
    let hidden = false, text = '';
    return Object.assign({
      events: {}, dataset: {}, attrs: {}, value: '', nodeType: 1,
      get hidden() { return hidden; },
      set hidden(value) { metrics.hiddenWrites++; hidden = value; },
      get textContent() { return text; },
      set textContent(value) { metrics.textWrites++; text = value; },
      addEventListener(name, fn) { this.events[name] = fn; },
      setAttribute(name, value) { this.attrs[name] = value; },
      focus() { this.focused = true; },
      matches(selector) { return (selector === '[data-entry]' && 'entry' in this.dataset) || (selector === '[data-sponsor]' && 'sponsor' in this.dataset); },
      querySelector() { return null; }
    }, extra);
  };
  const makeCard = (text, id) => element({ id, dataset: { entry: '', search: text } });
  const cards = Array.from({length: size}, (_, i) => makeCard('Ａｌｐｈａ beta gamma 2024 気候 論文 ' + i, 'paper-' + i));
  const search = element(), clear = element(), count = element(), empty = element(), feedback = element();
  const sponsor = element({dataset:{sponsor:''}}), sponsors = [sponsor], root = element(), category = element({dataset:{category:'気候'}});
  const links = cards.slice(0, 3).map(card => element({hash:'#' + card.id}));
  let observer;
  const document = {
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
  return {cards,search,clear,count,empty,feedback,sponsor,sponsors,links,category,metrics,reset,input,mutation,makeCard,element};
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
if (process.env.MEASURE_ONLY === '1') process.exit(0);
assert.equal(first.normalized, 2001, 'normalize each card once, not once per query term');
assert.equal(repeated.normalized, 1, 'only the query needs normalization on a repeated input');
assert.equal(repeated.hiddenWrites, 0, 'unchanged visibility does not rewrite the DOM');
assert.equal(repeated.textWrites, 0, 'unchanged counts do not rewrite the DOM');
assert.equal(decoration.scans, 0, 'title decoration/status mutations do not refilter every card');
assert.equal(decoration.normalized, 0);

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
small.cards.splice(0,1);
small.mutation([{type:'childList',addedNodes:[],removedNodes:[{nodeType:1,matches:()=>false,querySelector:()=>incoming}]}]);
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
console.log('PASS cached local search, bounded relevant-mutation work, IME interruption, new/changed/removed records, sponsors, counts and links. Mock operations, not browser latency.');
