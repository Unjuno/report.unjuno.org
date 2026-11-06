import test from 'node:test';import assert from 'node:assert/strict';
import {softmax,attentionWeights,mixValues,positionalEncoding,maskedWeights,toyHeads,REPORTED_EN_DE} from '../src/site/math.mjs';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,a+' differs from '+b);
test('softmax is stable and sums to one',()=>{for(const v of [[1000,1000,1000],[-1000,0,1000],[2,2,0]]){const w=softmax(v);w.forEach(x=>assert.ok(Number.isFinite(x)&&x>=0));near(w.reduce((a,b)=>a+b,0),1);}softmax([1000,1000,1000]).forEach(v=>near(v,1/3));});
test('invalid softmax inputs are rejected',()=>{for(const v of [[],[NaN],[Infinity],null])assert.throws(()=>softmax(v));});
test('scaling uses the actual dimensions',()=>{const w=attentionWeights([1,0,-1],2);[.575975345215362,.28399540974126,.140029245043378].forEach((v,i)=>near(w[i],v));assert.ok(attentionWeights([2,2,0])[2]>softmax([2,2,0])[2]);assert.throws(()=>attentionWeights([1],0));});
test('Value output is a weighted sum',()=>{assert.deepEqual(mixValues([.5,.5],[[2,0],[0,2]]),[1,1]);assert.throws(()=>mixValues([1],[[1],[2]]));assert.throws(()=>mixValues([.5,.5],[[1],[1,2]]));});
test('position zero and formula match',()=>{assert.deepEqual(positionalEncoding(0),[0,1,0,1,0,1,0,1]);const v=positionalEncoding(10,8);near(v[0],Math.sin(10));near(v[2],Math.sin(1));near(v[3],Math.cos(1));assert.throws(()=>positionalEncoding(2,3));});
test('causal mask zeroes only future positions and renormalizes',()=>{for(let p=0;p<4;p++){const w=maskedWeights([2,2,0,1],p);near(w.reduce((a,b)=>a+b,0),1);w.slice(p+1).forEach(v=>assert.equal(v,0));}assert.deepEqual(maskedWeights([2,2,0,1],0),[1,0,0,0]);assert.throws(()=>maskedWeights([2],2));});
test('toy head projections are explicit and outputs stay finite',()=>{const h=toyHeads([2,0]);assert.equal(h.heads.length,2);assert.notDeepEqual(h.heads[0].scores,h.heads[1].scores);assert.equal(h.concat.length,4);h.output.forEach((v,i)=>near(v,(h.concat[i]+h.concat[i+2])/2));assert.throws(()=>toyHeads([1]));});
test('reported values are the fixed Table 2 English-German values',()=>{assert.deepEqual(REPORTED_EN_DE.map(v=>v.bleu),[26.36,27.3,28.4]);near(REPORTED_EN_DE[2].bleu-REPORTED_EN_DE[0].bleu,2.04);});

