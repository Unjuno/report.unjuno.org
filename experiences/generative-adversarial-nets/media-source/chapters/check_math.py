from scenes import P,Q,dstar,js,sm,sig,ds,gs
from pathlib import Path
import numpy as np,json
ROOT=Path(__file__).resolve().parent
assert np.isclose(sum(P),1) and np.isclose(sum(Q),1)
assert np.allclose(dstar(Q),[5/7,.5,2/7]);assert np.allclose(dstar(P),[.5,.5,.5])
V=lambda q,d:float(np.dot(P,np.log(d))+np.dot(q,np.log1p(-d)))
assert np.isclose(V(Q,dstar(Q)),-np.log(4)+2*js(Q))
assert np.isclose(V(P,dstar(P)),-np.log(4));assert np.isclose(js(P),0)
assert np.isclose(.5/.5-.2/(1-.5),.6)
assert np.isclose(.5/(5/7)-.2/(1-5/7),0)
a=np.zeros(3);b=np.log(Q);snapshots=[]
assert np.allclose(gs(b,sig(a)),b)
for n in range(1,81):
 a=ds(a,sm(b));b=gs(b,sig(a));q=sm(b);assert np.isclose(sum(q),1) and (q>0).all()
 if n in [1,10,30,80]:snapshots.append({'pairs':n,'q':q.tolist(),'d':sig(a).tolist(),'jsd':js(q)})
assert js(sm(b))<js(Q)
b=np.log(Q);d=np.array([.8,.5,.2]);frozen=[]
for n in range(1,101):
 b=gs(b,d)
 if n in [10,30,100]:frozen.append({'g_steps':n,'q':sm(b).tolist()})
assert sm(b)[0]>.9
for d in [.001,.01,.5,.99]:
 a=np.log(d/(1-d));h=1e-5
 mm=(np.log1p(-sig(a+h))-np.log1p(-sig(a-h)))/(2*h)
 ns=(-np.log(sig(a+h))+np.log(sig(a-h)))/(2*h)
 assert abs(mm+d)<1e-7;assert abs(ns-(d-1))<1e-7
(ROOT/'math-validation.json').write_text(json.dumps({'checks':'passed: normalization, optimum, JSD identity, toy updates, finite difference logit gradients','initial_q':Q.tolist(),'initial_dstar':dstar(Q).tolist(),'initial_jsd':js(Q),'alternating_snapshots':snapshots,'frozen_d_snapshots':frozen,'table1':{'MNIST':{'mean':225,'standard_error':2,'aggregation':'real-valued test examples'},'TFD':{'mean':2057,'standard_error':26,'aggregation':'dataset folds'},'metric':'Gaussian Parzen-window estimated mean log-likelihood; bandwidth selected using validation data; quoted paper values, not toy results'}},ensure_ascii=False,indent=2)+'\n')
print('All chapter math checks passed')
