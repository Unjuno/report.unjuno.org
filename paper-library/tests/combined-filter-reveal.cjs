'use strict';
// Both complete runtime scripts share a deterministic DOM/observer fixture.
// This is not browser layout, native MutationObserver/IntersectionObserver, or an IME test.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const assetDirectory = process.argv[2] || 'dist/assets';
const feed = fs.readFileSync(path.join(assetDirectory, 'feed.js'), 'utf8');
const spline = fs.readFileSync(path.join(assetDirectory, 'spline-type.js'), 'utf8');

function fixture(reverseDelivery) {
  const mutations = [], intersections = [], frames = new Map(), events = new Map();
  let document, now = 0, frameId = 0, entryScans = 0, delivered = 0;
  const notify = record => {
    for (const observer of mutations) {
      const { target, options } = observer;
      if (!target || !(target === record.target || options.subtree && target.contains(record.target))) continue;
      if (record.type === 'childList' && options.childList || record.type === 'attributes' && options.attributes && (!options.attributeFilter || options.attributeFilter.includes(record.attributeName))) observer.pending.push(record);
    }
  };
  const listen = (map, name, fn) => { if (!map.has(name)) map.set(name, []); map.get(name).push(fn); };
  const fire = (map, name, event = {}) => { for (const fn of map.get(name) || []) fn(event); };
  class Node {
    constructor(tag, type = 1, text = '') {
      this.tagName = tag; this.nodeType = type; this.parentNode = null; this.childNodes = []; this.attributes = {}; this.events = new Map(); this.style = {}; this.value = ''; this._text = text; this._hidden = false;
      this.dataset = new Proxy({}, { set: (obj, name, value) => { obj[name] = value; notify({ type: 'attributes', target: this, attributeName: 'data-' + name.replace(/[A-Z]/g, c => '-' + c.toLowerCase()) }); return true; } });
      this.classList = {
        contains: name => this.className.split(/\s+/).includes(name),
        add: name => this.classList.toggle(name, true), remove: name => this.classList.toggle(name, false),
        toggle: (name, force) => { const set = new Set(this.className.split(/\s+/).filter(Boolean)); const next = force === undefined ? !set.has(name) : force; if (next) set.add(name); else set.delete(name); this.className = [...set].join(' '); return next; }
      };
    }
    get className() { return this.attributes.class || ''; }
    set className(value) { this.attributes.class = value; notify({ type: 'attributes', target: this, attributeName: 'class' }); }
    get hidden() { return this._hidden; }
    set hidden(value) { this._hidden = value; notify({ type: 'attributes', target: this, attributeName: 'hidden' }); }
    get children() { return this.childNodes.filter(node => node.nodeType === 1); }
    get firstChild() { return this.childNodes[0] || null; }
    get isConnected() { return !!document && document.contains(this); }
    get textContent() { return this.nodeType === 3 ? this._text : this.childNodes.map(node => node.textContent).join(''); }
    set textContent(value) {
      if (this.nodeType === 3) { this._text = String(value); return; }
      const removed = this.childNodes.splice(0); removed.forEach(node => node.parentNode = null);
      const added = value === '' ? [] : [new Node('#text', 3, String(value))];
      added.forEach(node => { node.parentNode = this; this.childNodes.push(node); });
      notify({ type: 'childList', target: this, removedNodes: removed, addedNodes: added });
    }
    appendChild(node) { if (node.parentNode) node.parentNode.removeChild(node); node.parentNode = this; this.childNodes.push(node); notify({ type: 'childList', target: this, addedNodes: [node], removedNodes: [] }); return node; }
    append(...nodes) { nodes.forEach(node => this.appendChild(typeof node === 'string' ? new Node('#text', 3, node) : node)); }
    removeChild(node) { const index = this.childNodes.indexOf(node); assert(index >= 0); this.childNodes.splice(index, 1); node.parentNode = null; notify({ type: 'childList', target: this, addedNodes: [], removedNodes: [node] }); return node; }
    before(node) { const parent = this.parentNode; assert(parent); if (node.parentNode) node.parentNode.removeChild(node); node.parentNode = parent; parent.childNodes.splice(parent.childNodes.indexOf(this), 0, node); notify({ type: 'childList', target: parent, addedNodes: [node], removedNodes: [] }); }
    contains(node) { return this === node || this.childNodes.some(child => child.contains(node)); }
    setAttribute(name, value) { if (name === 'class') this.className = value; else { this.attributes[name] = value; notify({ type: 'attributes', target: this, attributeName: name }); } }
    getAttribute(name) { return this.attributes[name]; }
    addEventListener(name, fn) { listen(this.events, name, fn); }
    emit(name, event) { fire(this.events, name, event); }
    focus() { document.activeElement = this; }
    matches(selector) {
      if (this.nodeType !== 1) return false;
      return selector.split(',').some(raw => {
        const parts = raw.trim().split(/\s+/); let node = this;
        const simple = (target, part) => {
          const tag = part.match(/^[a-z][a-z0-9-]*/i)?.[0]; if (tag && target.tagName !== tag) return false;
          for (const [, value] of part.matchAll(/#([\w-]+)/g)) if (target.id !== value) return false;
          for (const [, value] of part.matchAll(/\.([\w-]+)/g)) if (!target.classList.contains(value)) return false;
          for (const [, value] of part.matchAll(/\[([\w-]+)\]/g)) {
            if (value.startsWith('data-')) { const key = value.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase()); if (!(key in target.dataset)) return false; }
            else if (!(value in target.attributes)) return false;
          }
          return true;
        };
        if (!simple(node, parts.pop())) return false;
        while (parts.length) { const part = parts.pop(); do { node = node.parentNode; } while (node && !simple(node, part)); if (!node) return false; }
        return true;
      });
    }
    querySelectorAll(selector) { const result = []; const visit = node => { for (const child of node.childNodes) { if (child.matches(selector)) result.push(child); visit(child); } }; visit(this); return result; }
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
    closest(selector) { let node = this; while (node && !node.matches(selector)) node = node.parentNode; return node; }
  }
  const html = new Node('html'), head = new Node('head'), body = new Node('body'); html.append(head, body);
  document = { head, body, hidden: false, activeElement: null, contains: node => html.contains(node), createElement: tag => new Node(tag), createElementNS: (_, tag) => new Node(tag), createTextNode: text => new Node('#text', 3, text),
    querySelector: selector => html.querySelector(selector), querySelectorAll: selector => { if (selector === '[data-entry]') entryScans++; return html.querySelectorAll(selector); }, addEventListener: (name, fn) => listen(events, 'document:' + name, fn) };
  const make = (tag, id) => { const node = new Node(tag); node.id = id; body.append(node); return node; };
  const search = make('input', 'search'), clear = make('button', 'clear'), count = make('p', 'count'), empty = make('p', 'empty'), feedback = make('p', 'filter-feedback'), papers = make('main', 'papers');
  const createCard = (id, text, sponsor = false) => {
    const card = new Node('article'); card.id = id; card.className = 'entry'; card.dataset[sponsor ? 'sponsor' : 'entry'] = ''; card.dataset.search = text;
    const content = new Node('div'); content.className = 'content'; const title = new Node('h2'), link = new Node('a'); link.textContent = text;
    const summary = new Node('p'); summary.className = 'paper-summary'; summary.textContent = 'Accessible summary with enough glyphs to reveal gradually.';
    title.append(link); content.append(title, summary); card.append(content); return card;
  };
  const first = createCard('alpha', 'Alpha existing paper'), second = createCard('beta', 'Beta existing paper'), sponsor = createCard('sponsor', 'Sponsor title', true); papers.append(first, second, sponsor);
  class MutationObserver { constructor(callback) { this.callback = callback; this.pending = []; mutations.push(this); } observe(target, options) { this.target = target; this.options = options; } }
  class IntersectionObserver { constructor(callback, options) { this.callback = callback; this.options = options; this.targets = new Set(); intersections.push(this); } observe(target) { this.targets.add(target); } unobserve(target) { this.targets.delete(target); } }
  const reducedEvents = new Map(), reduced = { matches: false, addEventListener: (name, fn) => listen(reducedEvents, name, fn) };
  const window = { MutationObserver, IntersectionObserver };
  const context = { document, window, MutationObserver, IntersectionObserver, Intl, scrollY: 0, matchMedia: () => reduced,
    requestAnimationFrame: callback => { const id = ++frameId; frames.set(id, callback); return id; }, cancelAnimationFrame: id => frames.delete(id), addEventListener: (name, fn) => listen(events, name, fn) };
  vm.runInNewContext(feed, context, { filename: 'feed.js' }); vm.runInNewContext(spline, context, { filename: 'spline-type.js' });
  const drain = () => {
    let rounds = 0;
    while (mutations.some(observer => observer.pending.length)) {
      assert(++rounds <= 50, 'mutation callbacks must converge, not loop');
      for (const observer of reverseDelivery ? [...mutations].reverse() : mutations) {
        if (!observer.pending.length) continue; const records = observer.pending.splice(0); delivered += records.length; observer.callback(records);
      }
    }
  };
  const intersect = () => { for (const observer of intersections) observer.callback([...observer.targets].map(target => ({ target, isIntersecting: target.isConnected && !target.hidden }))); drain(); };
  const frame = () => { now += 1000 / 60; const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(callback => callback(now)); drain(); };
  const input = text => { search.value = text; search.emit('input', {}); drain(); intersect(); };
  const glyphs = card => card.querySelectorAll('.spline-glyph, .stream-glyph');
  const assertFinished = card => { const chars = glyphs(card); assert(chars.length > 0); assert(chars.every(glyph => glyph.style.opacity === '1' && !glyph.classList.contains('typing-cursor')), 'all visual glyphs finish visibly without a cursor'); };
  const assertDecoratedOnce = card => { assert.equal(card.querySelectorAll('.spline-title-visual').length, 1, 'one title decoration per card'); assert.equal(card.querySelectorAll('.spline-title-source').length, 2, 'two accessible source wrappers per card'); assert.equal(card.querySelectorAll('.spline-type-shape').length, 1, 'one decorative shape per card'); };
  drain();
  return { document, papers, first, second, sponsor, createCard, count, search, clear, empty, feedback, drain, intersect, frame, input, glyphs, assertFinished, assertDecoratedOnce,
    scans: () => entryScans, delivered: () => delivered,
    focus(card) { document.activeElement = card.querySelector('a'); card.emit('focusin'); drain(); },
    reduce() { reduced.matches = true; fire(reducedEvents, 'change'); drain(); },
    print() { fire(events, 'beforeprint'); drain(); },
    getFrames: () => frames.size,
    composeStart() { search.emit('compositionstart'); }, composeEnd() { search.emit('compositionend'); drain(); intersect(); }
  };
}

const outcomes = [];
for (const reverseDelivery of [false, true]) {
  const f = fixture(reverseDelivery); assert.equal(f.count.textContent, '2件の論文');
  const beforeDecoration = f.scans(); f.intersect(); for (let i = 0; i < 4; i++) f.frame();
  assert.equal(f.scans(), beforeDecoration, 'title/summary decoration must not cause full search scans');
  f.assertDecoratedOnce(f.first); f.assertDecoratedOnce(f.second); f.assertDecoratedOnce(f.sponsor);
  assert(f.glyphs(f.first).some(glyph => glyph.style.opacity === '0'), 'first card is only partly revealed');
  const sourceText = f.first.querySelector('.spline-title-source').textContent;
  assert.equal(sourceText, 'Alpha existing paper');
  f.input('beta'); assert(f.first.hidden); assert(!f.second.hidden); assert(f.sponsor.hidden); assert.equal(f.count.textContent, '1件の論文');
  const hiddenOpacities = f.glyphs(f.first).map(glyph => glyph.style.opacity);
  for (let i = 0; i < 8; i++) f.frame();
  assert.deepEqual(f.glyphs(f.first).map(glyph => glyph.style.opacity), hiddenOpacities, 'non-intersecting card keeps its partial reveal');
  const incoming = f.createCard('next-beta', 'Beta arriving paper'), excluded = f.createCard('next-alpha', 'Alpha arriving paper'), sponsor = f.createCard('next-sponsor', 'New sponsor', true);
  f.papers.append(incoming, excluded, sponsor); f.drain(); f.intersect();
  assert.equal(f.count.textContent, '2件の論文'); assert(!incoming.hidden); assert(excluded.hidden); assert(sponsor.hidden); f.assertDecoratedOnce(incoming);
  incoming.dataset.search = 'Gamma retagged paper'; f.drain(); f.intersect(); assert(incoming.hidden); assert.equal(f.count.textContent, '1件の論文');
  f.clear.emit('click'); f.drain(); f.intersect();
  assert.equal(f.count.textContent, '4件の論文'); assert.equal(f.search.value, ''); assert.equal(f.document.activeElement, f.search);
  for (const card of [f.first, f.second, incoming, excluded, f.sponsor, sponsor]) { assert(!card.hidden); f.assertDecoratedOnce(card); }
  f.focus(f.first); f.assertFinished(f.first);
  for (let i = 0; i < 110; i++) f.frame();
  for (const card of [f.first, f.second, incoming, excluded, f.sponsor, sponsor]) f.assertFinished(card);
  assert.equal(f.first.querySelector('.spline-title-source').textContent, sourceText);
  // Print must complete a genuinely partial new card, independently of reduced motion.
  const printCard = f.createCard('print', 'Print fresh partial paper'); f.papers.append(printCard); f.drain(); f.intersect();
  assert(f.glyphs(printCard).some(glyph => glyph.style.opacity === '0'));
  f.print(); f.assertFinished(printCard); f.papers.removeChild(printCard); f.drain(); f.intersect();
  assert.equal(f.count.textContent, '4件の論文');
  // IME deferral and an arriving node are reconciled while both observers are active.
  f.composeStart(); f.search.value = 'unmatched'; f.search.emit('input', { isComposing: true });
  const duringIme = f.createCard('ime', 'Unmatched arriving paper'); f.papers.append(duringIme); f.drain();
  assert.equal(f.count.textContent, '4件の論文', 'composition does not commit partial search/count');
  f.composeEnd(); assert.equal(f.count.textContent, '1件の論文'); assert(!duringIme.hidden); assert(f.first.hidden); f.assertDecoratedOnce(duringIme);
  f.reduce(); f.assertFinished(duringIme); assert.equal(f.getFrames(), 0, 'reduced motion cancels animation');
  // Removing a decorated node reconciles filter state without observer loops.
  f.papers.removeChild(duringIme); f.drain(); f.intersect(); assert.equal(f.count.textContent, '0件の論文'); assert.equal(f.empty.hidden, false);
  f.clear.emit('click'); f.drain(); f.intersect(); assert.equal(f.count.textContent, '4件の論文');
  outcomes.push({ reverseDelivery, passed: true, totalMutationRecordsDelivered: f.delivered() });
}
console.log(JSON.stringify({ scope: 'whole feed.js + spline-type.js in shared synthetic DOM/observer model; no computed CSS/browser/IME/device verification', assetDirectory, outcomes }, null, 2));
