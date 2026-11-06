const fs = require('fs'), vm = require('vm'), assert = require('assert');
const source = fs.readFileSync('dist/assets/feed-position.js', 'utf8');
function run(type, {legacy = false, hash = '', previous = 'auto', offset = 2450, unavailable = false} = {}) {
  const listeners = new Map(), calls = [], frames = new Map();
  const history = {scrollRestoration: previous}, location = {hash};
  let frameID = 0, y = offset;
  const add = (name, fn, options = {}) => {
    if (!listeners.has(name)) listeners.set(name, []);
    listeners.get(name).push({fn, once: !!options.once, capture: options === true || !!options.capture});
  };
  const remove = (name, fn, options = {}) => {
    const capture = options === true || !!options.capture;
    listeners.set(name, (listeners.get(name) || []).filter(item => item.fn !== fn || item.capture !== capture));
  };
  const emit = (name, event = {}) => {
    for (const item of [...(listeners.get(name) || [])]) {
      item.fn(event);
      if (item.once) remove(name, item.fn, item.capture);
    }
  };
  const performance = unavailable ? {} : legacy ? {navigation: {type}} : {getEntriesByType: () => [{type}]};
  vm.runInNewContext(source, {
    history, location, performance, addEventListener: add, removeEventListener: remove,
    document: {addEventListener: add, removeEventListener: remove},
    requestAnimationFrame(fn) {frames.set(++frameID, fn); return frameID;},
    cancelAnimationFrame(id) {frames.delete(id);},
    window: {scrollTo(options) {calls.push(options); y = options.top;}}
  });
  return {
    history, location, calls, emit, frames,
    get y() {return y;},
    scroll(value) {y = value;},
    nativeRestore() {if (history.scrollRestoration === 'auto') y = offset;},
    frame() {const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn());},
    remaining() {return [...listeners.values()].reduce((n, items) => n + items.length, 0);}
  };
}
let scenarios = 0;
for (const [type, legacy] of [['navigate', false], ['reload', false], [0, true], [1, true]]) {
  const t = run(type, {legacy});
  assert.equal(t.history.scrollRestoration, 'manual');
  t.emit('DOMContentLoaded');
  assert.equal(t.y, 0, 'fresh visit starts at the first paper');
  t.emit('pageshow', {persisted: false});
  t.nativeRestore();
  assert.equal(t.y, 0, 'late native restoration after pageshow is suppressed');
  assert.equal(t.history.scrollRestoration, 'manual', 'do not re-enable restoration inside pageshow');
  t.frame(); t.frame();
  assert.equal(t.y, 0);
  assert.equal(t.calls.length, 4);
  assert(t.calls.every(c => c.top === 0 && c.left === 0 && c.behavior === 'instant'));
  assert.equal(t.history.scrollRestoration, 'auto');
  assert.equal(t.remaining(), 0, 'startup listeners are removed');
  t.scroll(2400); t.emit('pageshow', {persisted: true}); t.frame();
  assert.equal(t.y, 2400, 'a later BFCache return is not reset');
  scenarios++;
}
for (const [type, legacy] of [['back_forward', false], ['prerender', false], [2, true], [255, true]]) {
  const t = run(type, {legacy}); t.emit('DOMContentLoaded'); t.emit('pageshow'); t.frame();
  assert.equal(t.calls.length, 0); assert.equal(t.history.scrollRestoration, 'auto');
  assert.equal(t.y, 2450, 'history retains the original reading position'); scenarios++;
}
for (const type of ['navigate', 'reload']) for (const hash of ['#top', '#paper-cooperation-networks', '#papers', '#:~:text=Attention']) {
  const t = run(type, {hash}); t.emit('DOMContentLoaded'); t.emit('pageshow'); t.frame();
  assert.equal(t.calls.length, 0); assert.equal(t.history.scrollRestoration, 'auto'); scenarios++;
}
for (const event of ['pointerdown', 'touchstart', 'wheel', 'keydown', 'hashchange', 'popstate']) {
  for (const stage of ['before-dom', 'after-show', 'after-frame']) {
    const t = run('navigate');
    if (stage !== 'before-dom') {t.emit('DOMContentLoaded'); t.emit('pageshow');}
    if (stage === 'after-frame') t.frame();
    t.emit(event); const calls = t.calls.length; t.scroll(1300);
    t.emit('DOMContentLoaded'); t.emit('pageshow'); t.frame(); t.frame();
    assert.equal(t.calls.length, calls, `${event} at ${stage} cancels pending resets`);
    assert.equal(t.y, 1300); assert.equal(t.history.scrollRestoration, 'auto');
    assert.equal(t.remaining(), 0); assert.equal(t.frames.size, 0); scenarios++;
  }
}
for (const stage of ['before-dom', 'after-show']) {
  const t = run('reload'); if (stage === 'after-show') {t.emit('DOMContentLoaded'); t.emit('pageshow');}
  t.emit('pagehide'); const calls = t.calls.length; t.scroll(1800);
  t.emit('DOMContentLoaded'); t.emit('pageshow', {persisted: true}); t.frame(); t.frame();
  assert.equal(t.calls.length, calls); assert.equal(t.y, 1800); assert.equal(t.history.scrollRestoration, 'auto');
  assert.equal(t.remaining(), 0); assert.equal(t.frames.size, 0); scenarios++;
}
{
  const t = run('navigate'); t.emit('pageshow', {persisted: true});
  assert.equal(t.calls.length, 0); assert.equal(t.remaining(), 0); scenarios++;
}
{
  const t = run('navigate'); t.location.hash = '#paper-cooperation-networks'; t.emit('DOMContentLoaded');
  assert.equal(t.calls.length, 0); assert.equal(t.history.scrollRestoration, 'auto'); assert.equal(t.remaining(), 0); scenarios++;
}
{
  const t = run('navigate', {previous: 'manual'}); t.emit('DOMContentLoaded'); t.emit('pageshow'); t.frame(); t.frame();
  assert.equal(t.history.scrollRestoration, 'manual'); scenarios++;
}
{
  const t = run(null, {unavailable: true}); t.emit('DOMContentLoaded'); t.emit('pageshow');
  assert.equal(t.calls.length, 0, 'unknown navigation mode stays native'); scenarios++;
}
const html = fs.readFileSync('dist/index.html', 'utf8');
assert(html.indexOf('/assets/feed-position.js') < html.indexOf('</head>'));
assert(!/feed-position\.js[^>]*\b(?:defer|async)\b/.test(html));
const fingerprint = require('crypto').createHash('sha256').update(source).digest('hex').slice(0, 12);
assert(html.includes('/assets/feed-position.js?v=' + fingerprint), 'generated HTML has the updated position script');
console.log(`PASS ${scenarios} startup/history/anchor/lifecycle regression scenarios (mock DOM, not a browser reproduction).`);
