'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const src=fs.readFileSync('dist/assets/cinema-field.js','utf8');
const body=src.slice(src.indexOf('function diagram('),src.indexOf('\nfunction layer('));
assert.ok(!/fillText|strokeText|drawImage|phase/.test(body),'text-free, fixed procedural scenes');
for(const [w,h] of [[1440,900],[390,844]])for(const kind of ['geometry','network','wave']){
 let operations=0,points=[],depth=0;const context=new Proxy({
  save(){depth++},restore(){depth--},createLinearGradient(){return {addColorStop(){}}},
  moveTo(x,y){points.push([x,y])},lineTo(x,y){points.push([x,y])},
  arc(x,y){points.push([x,y])}
 },{get:(o,k)=>o[k]||(()=>{operations++})});
 const box={f:{w,h},result:null};vm.runInNewContext(body+';result=diagram;',box);box.result(kind,1,context);
 assert.equal(depth,0);assert.ok(points.every(p=>p.every(Number.isFinite)));
 assert.ok(Math.min(...points.map(p=>p[0]))<w*.08);assert.ok(Math.max(...points.map(p=>p[0]))>w*.92);
 assert.ok(Math.max(...points.map(p=>p[1]))-Math.min(...points.map(p=>p[1]))>h*.65);
 assert.ok(points.length<1600,'bounded drawing work');
 console.log(`PASS ${kind} ${w}x${h}: ${points.length} sampled points, full width and depth, balanced canvas state`);
}
