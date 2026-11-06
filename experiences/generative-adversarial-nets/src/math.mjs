export const P=[.5,.3,.2],Q=[.2,.3,.5];
export const sum=a=>a.reduce((s,x)=>s+x,0);
export const softmax=a=>{const m=Math.max(...a),b=a.map(x=>Math.exp(x-m));return b.map(x=>x/sum(b))};
export const sigmoid=x=>1/(1+Math.exp(-x));
export const optimal=(p,q)=>p.map((x,i)=>x+q[i]===0?.5:x/(x+q[i]));
export const objective=(p,q,d)=>sum(p.map((x,i)=>(x===0?0:x*Math.log(d[i]))+(q[i]===0?0:q[i]*Math.log1p(-d[i]))));
export const jsd=(p,q)=>sum(p.map((x,i)=>{const m=(x+q[i])/2;return (x?x*Math.log(x/m):0)/2+(q[i]?q[i]*Math.log(q[i]/m):0)/2}));
export function dStep(p,q,a,rate){return a.map((x,i)=>x+rate*(p[i]*(1-sigmoid(x))-q[i]*sigmoid(x)))}
export function gStep(q,b,d,rate){const losses=d.map(x=>-Math.log(x)),mean=sum(q.map((x,i)=>x*losses[i]));return b.map((x,i)=>x-rate*q[i]*(losses[i]-mean))}
export function saturation(d){return {minimax:Math.log1p(-d),nonSat:-Math.log(d),gradMinimax:-d,gradNonSat:d-1}}
