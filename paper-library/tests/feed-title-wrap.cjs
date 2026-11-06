'use strict';
// Runs the production prepare() function against a small DOM fixture.
// These assertions verify wrapping styles, not browser layout or screen readers.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync('dist/assets/spline-type.js', 'utf8');
const css = fs.readFileSync('dist/assets/feed.css', 'utf8');
const start = source.indexOf('  function prepare(card)');
const end = source.indexOf('  const observer =', start);
assert(start >= 0 && end > start, 'production prepare function is available');

class Node {
  constructor(text = '') { this.text = text; this.children = []; this.style = {}; this.attrs = {}; }
  get textContent() { return this.text + this.children.map(n => n.textContent).join(''); }
  set textContent(value) { this.text = value; this.children = []; }
  get firstChild() { return this.children[0] || null; }
  append(...nodes) { nodes.forEach(n => this.appendChild(n)); }
  appendChild(node) {
    if (node.parent) node.parent.children.splice(node.parent.children.indexOf(node), 1);
    node.parent = this; this.children.push(node); return node;
  }
  setAttribute(name, value) { this.attrs[name] = value; }
  before() {}
}
const records = new Map();
const context = {
  records, serial: 0, segmenter: new Intl.Segmenter(undefined, {granularity: 'grapheme'}),
  document: {createElement: () => new Node(), createTextNode: text => new Node(text)},
  svgNode: () => new Node(), paused: () => true, observer: null,
  finish: record => { record.finished = true; }
};
vm.createContext(context);
vm.runInContext(source.slice(start, end), context);

function prepare(title) {
  const link = new Node(); link.append(new Node(title)); link.closest = () => new Node();
  const card = {querySelector: () => link, querySelectorAll: () => [], addEventListener() {}};
  context.prepare(card);
  assert(records.get(card).finished, 'reduced-motion preparation remains complete');
  assert.equal(link.children[0].textContent, title, 'accessible original title is retained');
  const visual = link.children[1];
  assert.equal(visual.attrs['aria-hidden'], 'true');
  assert.equal(visual.textContent, title, 'visual title retains all characters');
  return visual.children.filter(n => n.className === 'spline-word');
}

// The real sponsor heading overflows a 320px card if nowrap is inherited.
for (const title of ['この場所を、つくり続ける。', '気候変動', 'electroencephalographically']) {
  const words = prepare(title);
  assert.equal(words.length, 1);
  assert.equal(words[0].style.display, 'inline');
  assert.equal(words[0].style.whiteSpace, 'normal', 'override the class nowrap rule');
}
const ordinary = prepare('Attention Is All You Need');
assert(ordinary.every(word => word.style.whiteSpace === undefined), 'ordinary word grouping remains unchanged');
assert.match(source, /\.spline-word\{display:inline-block;white-space:nowrap\}/);
assert.match(css, /summary:focus-visible\{[^}]*outline:2px solid var\(--gold\)/);
assert.match(css, /\.paper-metadata summary\{min-height:44px;padding-block:10px\}/);
console.log('PASS production title preparation: CJK and long-token wrapping styles, ordinary word grouping, semantic text, summary focus and tap-target declarations. Mock/static only; not browser layout or accessibility verification.');
