'use strict';
// Runs production reveal/finish functions. Counts DOM writes, not browser time.
const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const source = fs.readFileSync('dist/assets/spline-type.js', 'utf8');
const baselinePath = process.argv[2];
const reference = baselinePath ? fs.readFileSync(baselinePath, 'utf8') : `
  function finish(record) {
    record.revealed=record.glyphs.length;record.age=2;
    record.glyphs.forEach(glyph=>{glyph.style.opacity='1';glyph.classList.remove('typing-cursor');});
  }
  function reveal(record,dt) {
    if(record.revealed>=record.glyphs.length)return;
    record.age+=dt*(1+boost*.5);
    const count=Math.min(record.glyphs.length,Math.max(3,Math.ceil(record.age/1.1*record.glyphs.length/3)*3));
    record.glyphs.forEach((glyph,i)=>{glyph.style.opacity=i<count?'1':'0';glyph.classList.toggle('typing-cursor',i===count-1&&count<record.glyphs.length);});
    record.revealed=count;
  }
  function prepare(card) {}
`;
function functions(text) {
  const start = text.indexOf('  function finish(record)'), end = text.indexOf('  function prepare(card)', start);
  assert(start>=0 && end>start);
  const context = vm.createContext({boost:0});
  vm.runInContext(text.slice(start,end),context);
  return context;
}
function record(length) {
  const metrics = {opacityWrites:0,cursorWrites:0};
  const glyphs = Array.from({length},()=>{
    let opacity;
    const classes = new Set(['unrelated-class']);
    return {classes,style:{get opacity(){return opacity;},set opacity(v){metrics.opacityWrites++;opacity=v;}},classList:{
      toggle(name,force){metrics.cursorWrites++;if(force)classes.add(name);else classes.delete(name);},
      remove(name){metrics.cursorWrites++;classes.delete(name);}
    }};
  });
  return {glyphs,revealed:0,age:0,metrics};
}
const before = functions(reference), after = functions(source);
const snapshot = record => ({revealed:record.revealed,age:record.age,glyphs:record.glyphs.map(g=>[g.style.opacity,[...g.classes].sort()])});
let comparisons = 0;
const measurements = [];
for (const length of [0,1,2,3,4,30,90,260,860]) for (const hz of [30,60,120,240]) for (const boosted of [false,true]) {
  const a=record(length),b=record(length);
  before.boost=after.boost=0;
  before.reveal(a,0);after.reveal(b,0);
  assert.deepEqual(snapshot(b),snapshot(a));comparisons++;
  for(let frame=1;frame<=hz*2;frame++) {
    before.boost=after.boost=boosted ? (frame%11)/5 : 0;
    before.reveal(a,1/hz);after.reveal(b,1/hz);
    assert.deepEqual(snapshot(b),snapshot(a),`length=${length}, hz=${hz}, frame=${frame}, boost=${boosted}`);comparisons++;
  }
  assert.equal(b.revealed,length);
  assert(b.metrics.opacityWrites<=a.metrics.opacityWrites);
  assert(b.metrics.cursorWrites<=a.metrics.cursorWrites);
  if (length===90 || length===860) measurements.push({length,hz,boosted,before:a.metrics,after:b.metrics});
}
// Simulate uneven animation frames and the production frame() 60ms dt cap.
for(const length of [4,90,260,860])for(const boosted of [false,true]){
  const a=record(length),b=record(length);
  const rawIntervals=[0,1/240,1/120,1/60,1/30,.4,.001];
  before.boost=after.boost=0;before.reveal(a,0);after.reveal(b,0);
  for(let frame=0;frame<300;frame++){
    before.boost=after.boost=boosted?(frame%12)*.2:0;
    const dt=Math.min(rawIntervals[frame%rawIntervals.length],.06);
    before.reveal(a,dt);after.reveal(b,dt);
    assert.deepEqual(snapshot(b),snapshot(a),`jitter length=${length}, frame=${frame}, boost=${boosted}`);comparisons++;
  }
  assert.equal(b.revealed,length);
  assert(b.metrics.opacityWrites<=a.metrics.opacityWrites);
  assert(b.metrics.cursorWrites<=a.metrics.cursorWrites);
}
// Repeated zero-time frames cannot change visibility or the typing cursor.
const idle=record(90);after.reveal(idle,0);const initial={...idle.metrics};
for(let i=0;i<200;i++)after.reveal(idle,0);
assert.deepEqual(idle.metrics,initial);
// Keyboard focus, reduced motion and print finish every glyph immediately.
// Repeated finish and a subsequent frame must not restart the reveal.
for(const finishAt of [0,1,7,40]) {
  const a=record(180),b=record(180);
  before.boost=after.boost=0;
  for(let frame=0;frame<finishAt;frame++){before.reveal(a,1/120);after.reveal(b,1/120);}
  before.finish(a);after.finish(b);
  for(let frame=0;frame<200;frame++){before.reveal(a,1/120);after.reveal(b,1/120);}
  assert.deepEqual(snapshot(b),snapshot(a));
  assert(b.glyphs.every(g=>g.style.opacity==='1'&&!g.classes.has('typing-cursor')));
  before.finish(a);after.finish(b);assert.deepEqual(snapshot(b),snapshot(a));
  a.revealed=b.revealed=0;a.age=b.age=0;
  before.reveal(a,0);after.reveal(b,0);assert.deepEqual(snapshot(b),snapshot(a));
}
console.log(JSON.stringify({scope:'VM DOM-write counts and exact per-frame states, not device/browser performance',reference:baselinePath||'embedded v105 reveal contract',comparisons,measurements},null,2));
console.log('PASS reveal timing/state parity across 30/60/120/240 Hz, nine sampled lengths 0–860 glyphs, jitter/clamped frames, scroll boost, no-change frames, focus/reduced-motion/print finish and replay.');
