export function softmax(values) {
  if (!Array.isArray(values) || !values.length || !values.every(Number.isFinite)) throw new TypeError('Finite scores required');
  const top=Math.max(...values), exp=values.map(v=>Math.exp(v-top)), total=exp.reduce((a,b)=>a+b,0);
  return exp.map(v=>v/total);
}
export function attentionWeights(scores, dimensions=2) {
  if (!Number.isInteger(dimensions)||dimensions<1) throw new RangeError('Positive dimension required');
  return softmax(scores.map(v=>v/Math.sqrt(dimensions)));
}
export function mixValues(weights, values) {
  if(weights.length!==values.length||!values.length||!weights.every(Number.isFinite))throw new TypeError('Matching weights and values required');
  const d=values[0].length;if(!d||values.some(v=>v.length!==d||!v.every(Number.isFinite)))throw new TypeError('Finite matching vectors required');
  return Array.from({length:d},(_,i)=>weights.reduce((sum,w,j)=>sum+w*values[j][i],0));
}
export function positionalEncoding(position,dimensions=8) {
  if(!Number.isFinite(position)||!Number.isInteger(dimensions)||dimensions<2||dimensions%2)throw new TypeError('Position and even dimensions required');
  return Array.from({length:dimensions},(_,i)=>{const angle=position/10000**(2*Math.floor(i/2)/dimensions);return i%2?Math.cos(angle):Math.sin(angle);});
}
export function maskedWeights(scores,position) {
  if(!Number.isInteger(position)||position<0||position>=scores.length)throw new RangeError('Position outside sequence');
  const allowed=softmax(scores.slice(0,position+1));return scores.map((_,i)=>i<=position?allowed[i]:0);
}
export function toyHeads(q) {
  if(!Array.isArray(q)||q.length!==2||!q.every(Number.isFinite))throw new TypeError('2D query required');
  const keys=[[2,0],[0,2],[-1,1]], values=[[1,0],[0,1],[-1,1]];
  const heads=[q,[q[1],q[0]]].map(query=>{const scores=keys.map(k=>query[0]*k[0]+query[1]*k[1]);const weights=attentionWeights(scores);return {scores,weights,output:mixValues(weights,values)};});
  return {heads,concat:heads.flatMap(h=>h.output),output:heads[0].output.map((v,i)=>(v+heads[1].output[i])/2)};
}
export const REPORTED_EN_DE=Object.freeze([{name:'ConvS2S ensemble',bleu:26.36},{name:'Transformer base',bleu:27.3},{name:'Transformer big',bleu:28.4}]);
export const fixed=n=>Number(n.toFixed(3)).toString();

