'use strict';
// Runs the complete spline runtime in a controlled DOM, with optional saved
// baseline comparison. This is not browser shaping, bidi, accessibility, or iPhone QA.
const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const assetPath = process.argv[2] || 'dist/assets/spline-type.js';
const source = fs.readFileSync(assetPath, 'utf8');
const reference = process.argv[3] ? fs.readFileSync(process.argv[3], 'utf8') : null;
function fixture(script, options) {
  const mutations = [], intersections = [], frames = new Map(), events = new Map();
  let document, now = 0, frameId = 0;
  const notify = record => {
    for (const observer of mutations) {
      const {target, options: o} = observer;
      if (!target || !(target === record.target || o.subtree && target.contains(record.target))) continue;
      if (record.type === 'childList' && o.childList || record.type === 'attributes' && o.attributes && (!o.attributeFilter || o.attributeFilter.includes(record.attributeName))) observer.pending.push(record);
    }
  };
  const listen = (map, name, fn) => { if (!map.has(name)) map.set(name, []); map.get(name).push(fn); };
  const fire = (map, name) => { for (const fn of map.get(name) || []) fn({}); };
  class Node {
    constructor(tag, type = 1, text = '') {
      this.tagName = tag; this.nodeType = type; this.parentNode = null; this.childNodes = []; this.attributes = {}; this.events = new Map(); this.style = {}; this.dataset = {}; this._text = text;
      this.classList = {
        contains: name => this.className.split(/\s+/).includes(name),
        add: name => this.classList.toggle(name, true), remove: name => this.classList.toggle(name, false),
        toggle: (name, force) => { const set = new Set(this.className.split(/\s+/).filter(Boolean)); const next = force === undefined ? !set.has(name) : force; if (next) set.add(name); else set.delete(name); this.className = [...set].join(' '); return next; }
      };
    }
    get className() { return this.attributes.class || ''; }
    set className(value) { this.attributes.class = value; notify({type: 'attributes', target: this, attributeName: 'class'}); }
    get children() { return this.childNodes.filter(n => n.nodeType === 1); }
    get firstChild() { return this.childNodes[0] || null; }
    get isConnected() { return !!document && document.contains(this); }
    get textContent() { return this.nodeType === 3 ? this._text : this.childNodes.map(n => n.textContent).join(''); }
    set textContent(value) {
      if (this.nodeType === 3) { this._text = String(value); return; }
      const removed = this.childNodes.splice(0); removed.forEach(n => n.parentNode = null);
      const added = value === '' ? [] : [new Node('#text', 3, String(value))];
      added.forEach(n => { n.parentNode = this; this.childNodes.push(n); });
      notify({type: 'childList', target: this, removedNodes: removed, addedNodes: added});
    }
    appendChild(node) { if (node.parentNode) node.parentNode.removeChild(node); node.parentNode = this; this.childNodes.push(node); notify({type: 'childList', target: this, addedNodes: [node], removedNodes: []}); return node; }
    append(...nodes) { nodes.forEach(n => this.appendChild(n)); }
    removeChild(node) { const i = this.childNodes.indexOf(node); assert(i >= 0); this.childNodes.splice(i, 1); node.parentNode = null; notify({type: 'childList', target: this, addedNodes: [], removedNodes: [node]}); return node; }
    before(node) { const p = this.parentNode; assert(p); if (node.parentNode) node.parentNode.removeChild(node); node.parentNode = p; p.childNodes.splice(p.childNodes.indexOf(this), 0, node); notify({type: 'childList', target: p, addedNodes: [node], removedNodes: []}); }
    contains(node) { return this === node || this.childNodes.some(n => n.contains(node)); }
    setAttribute(name, value) { this.attributes[name] = value; }
    addEventListener(name, fn) { listen(this.events, name, fn); }
    emit(name) { fire(this.events, name); }
    matches(selector) {
      if (this.nodeType !== 1) return false;
      return selector.split(',').some(raw => {
        const parts = raw.trim().split(/\s+/); let node = this;
        const simple = (n, part) => {
          const tag = part.match(/^[a-z][a-z0-9-]*/i)?.[0]; if (tag && n.tagName !== tag) return false;
          for (const [, v] of part.matchAll(/#([\w-]+)/g)) if (n.id !== v) return false;
          for (const [, v] of part.matchAll(/\.([\w-]+)/g)) if (!n.classList.contains(v)) return false;
          for (const [, v] of part.matchAll(/\[data-([\w-]+)\]/g)) if (!(v in n.dataset)) return false;
          return true;
        };
        if (!simple(node, parts.pop())) return false;
        while (parts.length) { const part = parts.pop(); do { node = node.parentNode; } while (node && !simple(node, part)); if (!node) return false; }
        return true;
      });
    }
    querySelectorAll(selector) { const result = []; const visit = n => { for (const c of n.childNodes) { if (c.matches(selector)) result.push(c); visit(c); } }; visit(this); return result; }
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
    closest(selector) { let n = this; while (n && !n.matches(selector)) n = n.parentNode; return n; }
  }
  const html = new Node('html'), head = new Node('head'), body = new Node('body'); html.append(head, body);
  document = {head, body, hidden: false, activeElement: null, contains: n => html.contains(n), createElement: tag => new Node(tag), createElementNS: (_, tag) => new Node(tag), createTextNode: text => new Node('#text', 3, text), querySelector: s => html.querySelector(s), querySelectorAll: s => html.querySelectorAll(s), addEventListener: (name, fn) => listen(events, 'document:' + name, fn)};
  const papers = new Node('main'); papers.id = 'papers'; body.append(papers);
  const create = (title, sponsor = false) => {
    const card = new Node('article'); card.className = 'entry'; card.dataset[sponsor ? 'sponsor' : 'entry'] = '';
    const content = new Node('div'); content.className = 'content'; const h2 = new Node('h2'), link = new Node('a');
    // Multiple original child nodes make destructive textContent rewrites detectable.
    const mark = new Node('em'); mark.textContent = title; const tail = new Node('#text', 3, ''); link.append(mark, tail);
    link.href = 'https://doi.org/10.0000/controlled-fixture'; link.target = '_blank'; link.rel = 'noopener noreferrer';
    const summary = new Node('p'); summary.className = 'paper-summary'; summary.textContent = 'Original summary with enough characters to reveal gradually.';
    h2.append(link); content.append(h2, summary); card.append(content);
    return {card, link, summary, nodes: [...link.childNodes], summaryNodes: [...summary.childNodes], title};
  };
  const nativeTitles = ['سلام', 'لا', 'سَلَام', 'Reading سلام in 2026', 'پژوهش', 'تحقیق', '\uFEFB', '\uFB50', 'ت'.repeat(260), 'x'.repeat(261)];
  const ordinaryTitles = ['Attention Is All You Need', 'この場所を、つくり続ける。', '気候変動', 'electroencephalographically', 'e\u0301 and 👨‍👩‍👧‍👦', 'x'.repeat(260)];
  const native = nativeTitles.map(t => create(t)), ordinary = ordinaryTitles.map((t, i) => create(t, i === 1));
  papers.append(...native.map(r => r.card), ...ordinary.map(r => r.card));
  if (options.focused) document.activeElement = native[0].link;
  class MutationObserver { constructor(callback) { this.callback = callback; this.pending = []; mutations.push(this); } observe(target, opts) { this.target = target; this.options = opts; } }
  class IntersectionObserver { constructor(callback) { this.callback = callback; this.targets = new Set(); intersections.push(this); } observe(target) { this.targets.add(target); } unobserve(target) { this.targets.delete(target); } }
  const reducedEvents = new Map(), reduced = {matches: options.paused, addEventListener: (name, fn) => listen(reducedEvents, name, fn)};
  const window = options.observer ? {IntersectionObserver} : {};
  const context = {document, window, MutationObserver, IntersectionObserver, Intl: options.segmenter ? Intl : {}, scrollY: 0, matchMedia: () => reduced,
    requestAnimationFrame: fn => { const id = ++frameId; frames.set(id, fn); return id; }, cancelAnimationFrame: id => frames.delete(id), addEventListener: (name, fn) => listen(events, name, fn)};
  vm.runInNewContext(script, context, {filename: 'spline-type.js'});
  const drain = () => {
    let rounds = 0;
    while (mutations.some(o => o.pending.length)) {
      assert(++rounds <= 40, 'mutation delivery converges');
      for (const observer of mutations) if (observer.pending.length) observer.callback(observer.pending.splice(0));
    }
  };
  const intersect = () => { for (const observer of intersections) observer.callback([...observer.targets].map(target => ({target, isIntersecting: target.isConnected}))); drain(); };
  const frame = () => { now += 1000 / 60; const queue = [...frames.values()]; frames.clear(); queue.forEach(fn => fn(now)); drain(); };
  const snapshot = node => ({tag: node.tagName, text: node.nodeType === 3 ? node.textContent : undefined, attrs: node.attributes, style: node.style, children: node.childNodes.map(snapshot)});
  const assertNative = record => {
    assert.equal(record.link.textContent, record.title, 'native title is not duplicated');
    assert.deepEqual(record.link.childNodes, record.nodes, 'original title nodes remain in place');
    record.nodes.forEach(n => assert.equal(n.parentNode, record.link));
    assert.equal(record.link.href, 'https://doi.org/10.0000/controlled-fixture'); assert.equal(record.link.target, '_blank'); assert.equal(record.link.rel, 'noopener noreferrer');
    assert.deepEqual(record.summary.childNodes, record.summaryNodes, 'native-fallback card summary remains untouched');
    assert.equal(record.card.querySelectorAll('.spline-title-source, .spline-title-visual, .spline-type-shape, .spline-glyph, .stream-glyph').length, 0, 'fallback card gets no decoration');
  };
  const assertOrdinary = record => {
    const titleSource = record.link.querySelector('.spline-title-source'), visual = record.link.querySelector('.spline-title-visual');
    assert(titleSource && visual, 'ordinary title still decorates');
    assert.equal(titleSource.textContent, record.title); assert.equal(visual.textContent, record.title); assert.equal(visual.attributes['aria-hidden'], 'true');
    assert.deepEqual(titleSource.childNodes, record.nodes, 'ordinary original title nodes are preserved in semantic source');
    assert(record.summary.querySelector('.stream-glyph'), 'ordinary summaries still decorate');
  };
  drain(); intersect();
  return {native, ordinary, papers, document, create, drain, intersect, frame, assertNative, assertOrdinary, snapshot,
    focus: r => { document.activeElement = r.link; r.card.emit('focusin'); drain(); },
    print: () => { fire(events, 'beforeprint'); drain(); },
    reduced: value => { reduced.matches = value; fire(reducedEvents, 'change'); drain(); },
    bodyPaused: value => { body.classList.toggle('paused', value); drain(); },
    visibility: value => { document.hidden = !value; fire(events, 'document:visibilitychange'); drain(); }};
}

let matrices = 0, lifecycleChecks = 0, parityChecks = 0;
for (const segmenter of [true, false]) for (const paused of [true, false]) for (const observer of [true, false]) for (const focused of [true, false]) {
  const options = {segmenter, paused, observer, focused}, f = fixture(source, options), baseline = reference ? fixture(reference, options) : null;
  const check = () => {
    f.native.forEach(f.assertNative); f.ordinary.forEach(f.assertOrdinary); lifecycleChecks++;
    if (baseline) {
      assert.deepEqual(f.ordinary.map(r => f.snapshot(r.card)), baseline.ordinary.map(r => baseline.snapshot(r.card)), 'ordinary card output remains exactly baseline-equivalent');
      parityChecks++;
    }
  };
  const both = fn => { fn(f); if (baseline) fn(baseline); check(); };
  check();
  for (let i = 0; i < 80; i++) both(x => x.frame());
  both(x => x.focus(x.native[0])); both(x => x.focus(x.ordinary[0])); both(x => x.print());
  both(x => x.reduced(true)); both(x => x.reduced(false)); both(x => x.bodyPaused(true)); both(x => x.bodyPaused(false));
  both(x => x.visibility(false)); both(x => x.visibility(true)); both(x => x.intersect());
  const appended = f.create('بحث جديد New paper'); f.papers.append(appended.card); f.drain(); f.intersect(); f.assertNative(appended);
  f.focus(appended); f.print(); f.assertNative(appended);
  f.papers.removeChild(appended.card); f.drain(); f.intersect(); f.papers.append(appended.card); f.drain(); f.intersect(); f.assertNative(appended);
  for (let i = 0; i < 4; i++) f.intersect(); f.assertNative(appended);
  matrices++;
}
console.log(JSON.stringify({scope: 'Whole production spline runtime in controlled DOM; no browser/iPhone, bidi, screen-reader, or live Crossref verification', matrices, lifecycleChecks, parityChecks, assetPath, reference: process.argv[3] || null}, null, 2));
console.log('PASS Arabic-script native titles: joining/vowel/mixed/Persian/Urdu/presentation-form fixtures, original nodes/links, length boundaries, Segmenter on/off, motion on/off, focus/print/visibility, observer fallback, dynamic append/removal/reinsert; Latin/CJK and ordinary summaries retain decoration.');
