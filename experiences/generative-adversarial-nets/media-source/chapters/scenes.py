"""Native Manim vectors; exact educational distributions, never trained images."""
from manim import *
import numpy as np,json,os
from pathlib import Path
config.notify_outdated_version=False
config.background_color='#101719';config.pixel_width=1280;config.pixel_height=720;config.frame_rate=24
config.frame_width=16;config.frame_height=9
ROOT=Path(__file__).resolve().parent;PLAN=json.loads((ROOT/'plan.json').read_text())
INK='#f1f1e9';MUTE='#aebbb9';BLUE='#91b6f5';GOLD='#f2c68c';GREEN='#91cbb2';LINE='#344245';RED='#e79b95'
P=np.array([.5,.3,.2]);Q=np.array([.2,.3,.5])
def T(s,size=28,c=INK,pos=None,maxw=14):
 t=Text(s,font='Noto Sans CJK JP',font_size=size,color=c,disable_ligatures=True)
 if t.width>maxw:t.scale_to_fit_width(maxw)
 if pos is not None:t.move_to(pos)
 return t
def card(s,x,y,c=BLUE,width=3.1):
 r=RoundedRectangle(width=width,height=1.05,corner_radius=.14,stroke_color=c,fill_color=c,fill_opacity=.08).move_to([x,y,0]);return VGroup(r,T(s,27,c,r.get_center(),width-.25))
def arrow(a,b,c=BLUE):return Arrow(a,b,color=c,buff=.15,stroke_width=3)
def dist(q,d=None):
 g=VGroup();cols=[GOLD,GREEN] if d is None else [GOLD,GREEN,BLUE]
 for j in range(3):
  x=(j-1)*4.3
  vals=[P[j],q[j]] if d is None else [P[j],q[j],d[j]]
  for k,(v,col) in enumerate(zip(vals,cols)):
   off=(k-(len(vals)-1)/2)*.75;h=max(.012,float(v)*2.5)
   r=Rectangle(width=.55,height=h,stroke_width=0,fill_color=col,fill_opacity=1).move_to([x+off,-.9+h/2,0]);g.add(r,T(f'{v:.3f}',19,col,[x+off,-.72+h,0],.85))
  g.add(T('ABC'[j],28,INK,[x,-1.35,0]))
 g.add(T('実データ p',23,GOLD,[-4,-2.05,0]),T('生成分布 q',23,GREEN,[0,-2.05,0]))
 if d is not None:g.add(T('識別器 D',23,BLUE,[4,-2.05,0]))
 return g
def dstar(q):return P/(P+q)
def js(q):
 m=(P+q)/2;return float((P*np.log(P/m)+q*np.log(q/m)).sum()/2)
def sm(b):
 v=np.exp(b-max(b));return v/v.sum()
def sig(a):return 1/(1+np.exp(-a))
def ds(a,q,lr=.5):return a+lr*(P*(1-sig(a))-q*sig(a))
def gs(b,d,lr=.5):
 q=sm(b);l=-np.log(d);return b-lr*q*(l-np.dot(q,l))
def numrow(s,y=-2.75,c=MUTE):return T(s,25,c,[0,y,0])
class GANChapter(Scene):
 chapter_id='roles'
 def construct(self):
  c=next(x for x in PLAN['chapters'] if x['id']==self.chapter_id);self.c=c
  self.mast=VGroup(T('PAPER LAB / GAN 2014 / '+self.chapter_id.upper(),16,MUTE,[0,4.15,0]),Line([-7.2,3.83,0],[7.2,3.83,0],color=LINE));self.add(self.mast)
  for k,b in enumerate(c['beats']):
   self.add(T(f'{k+1:02}  '+b['heading'],35,INK,[0,3.17,0]),T('原著 '+c['source_sections']+('  ·  数値は原著の報告値／図は新規作成' if self.chapter_id=='evidence' else '  ·  教材の数値は独立した説明例'),19,MUTE,[0,-3.9,0]))
   getattr(self,'draw_'+self.chapter_id)(k)
   remaining=(k+1)*c['slot']-.35-self.time
   if remaining>0:self.wait(remaining)
   objects=[o for o in self.mobjects if o is not self.mast]
   self.play(*[FadeOut(o) for o in objects],run_time=.35)
 def appear(self,*g):self.play(*[FadeIn(x,shift=UP*.08) for x in g],run_time=.7)
 def draw_roles(self,k):
  if k<2:
   z=card('ノイズ z',-5,0,GOLD,2.4);g=card('生成器 G',-1.5,0,GREEN,2.4);x=card('サンプル G(z)',2,0,GREEN,2.8);d=card('識別器 D',5.5,0,BLUE,2.4)
   self.appear(z,g,x,d)
   links=[arrow(z.get_right(),g.get_left(),GREEN),arrow(g.get_right(),x.get_left(),GREEN),arrow(x.get_right(),d.get_left(),BLUE)]
   for a in links:
    self.play(GrowArrow(a),run_time=.4);dot=Dot(a.get_start(),color=GOLD);self.add(dot);self.play(dot.animate.move_to(a.get_end()),run_time=.6);self.remove(dot)
   if k==0:self.appear(numrow('G が出力するのは、由来の確率ではなくサンプル。',-2.1))
   else:
    real=card('実データ x',3.6,1.8,GOLD,2.8);self.appear(real);self.play(GrowArrow(arrow(real.get_right(),d.get_top(),GOLD)),run_time=.6)
    self.appear(numrow('本物：生成物 = 1：1 で提示',-1.6,GOLD),numrow('D(x) → 実データ由来と予測する確率',-2.4,BLUE))
  else:
   q=Q.copy();bars=dist(q);self.appear(bars,T('Σp = 1     Σq = 1',28,INK,[0,2.0,0]))
   if k==3:
    for q in [np.array([.35,.3,.35]),P.copy()]:self.play(Transform(bars,dist(q)),run_time=1.7);self.wait(.6)
    self.appear(numrow('同じ分布へ近づけるのは、手動の例。学習結果ではない。',-2.8))
   else:self.appear(numrow('A は実データが多く、C は生成物が多い。',-2.8))
 def draw_objective(self,k):
  if k==0:
   a=card('本物：E_p[log D]',-3,1.2,GOLD,5.5);b=card('生成物：E_q[log(1−D)]',3,1.2,GREEN,5.5);self.appear(a);self.appear(b)
   self.play(a.animate.shift(DOWN*.6),b.animate.shift(DOWN*.6),run_time=.8)
   self.appear(T('V = E_p[log D] + E_q[log(1−D)]',32,INK,[0,-.7,0]),numrow('各期待値は、それぞれの分布で重みづけする。',-2.3),numrow('D ≡ 0.5 なら V = −log 4 ≈ −1.386294',-2.95,GOLD))
  elif k==1:
   self.appear(T('min_G  max_D  V(G,D)',46,INK,[0,1.6,0]));d=card('D：V を増やす',-3,-.1,BLUE,5);g=card('G：V を減らす',3,-.1,GREEN,5);self.appear(d,g)
   self.play(d.animate.shift(UP*.7),g.animate.shift(DOWN*.7),run_time=1.6)
   self.appear(numrow('G の更新中は D を固定。本物側の項は G に依存しない。',-2.35),numrow('この V は正解率ではない。log は自然対数。',-3.05))
  else:
   ax=Axes(x_range=[0,1,.2],y_range=[-2.5,0,.5],x_length=10,y_length=3,axis_config={'include_tip':False,'color':MUTE}).move_to([0,-.1,0])
   fn=lambda x:.5*np.log(x)+.2*np.log(1-x)
   graph=ax.plot(fn,x_range=[.01,.99,.01],color=BLUE);self.play(Create(ax),Create(graph),run_time=1.6)
   self.appear(T('A の寄与：f(d)=0.5 log d + 0.2 log(1−d)',28,INK,[0,2.1,0]),T('d = D(A)',22,MUTE,[5.8,-1.8,0]),T('f(d)',22,MUTE,[-5.6,1.4,0]))
   val=.5;dot=Dot(ax.c2p(val,fn(val)),color=GOLD);label=numrow(f'd={val:.3f}    f(d)={fn(val):.6f}',-2.6,GOLD);self.appear(dot,label)
   for val in ([.6,5/7] if k==2 else [5/7,.9,5/7]):
    self.play(dot.animate.move_to(ax.c2p(val,fn(val))),Transform(label,numrow(f'd={val:.3f}    f(d)={fn(val):.6f}',-2.6,GOLD)),run_time=1.2)
   self.appear(numrow('f′(0.5) = 0.5/0.5 − 0.2/0.5 = 0.6' if k==2 else 'f′(5/7) = 0   →   固定した q に対する最大値',-3.2))
 def draw_optimal(self,k):
  if k==0:
   self.appear(T('固定した G  /  本物と生成物は等 prior',29,GOLD,[0,2.0,0]))
   p=card('p(x)',-3.5,.6,GOLD,2.6);q=card('q(x)',.0,.6,GREEN,2.6);self.appear(p,q)
   self.play(p.animate.move_to([-2.0,.6,0]),q.animate.move_to([2.0,.6,0]),run_time=1)
   self.appear(T('D*(x) = p(x) / [p(x)+q(x)]',39,BLUE,[0,-1.0,0]),numrow('p と q を混ぜた中で、本物が占める割合。',-2.6))
  elif k==1:
   self.appear(dist(Q));self.wait(.4)
   for j in range(3):
    x=(j-1)*4.3;label=T(f'{P[j]:.1f}/({P[j]:.1f}+{Q[j]:.1f})',23,INK,[x,2.0,0],4);res=T(f'D* = {dstar(Q)[j]:.3f}',25,BLUE,[x,1.5,0],4);self.appear(label);self.play(Write(res),run_time=.8)
   self.appear(numrow('D* は各点の確率。A・B・C の合計が1である必要はない。',-2.8))
  elif k==2:
   bars=dist(Q,dstar(Q));self.appear(bars);title=T('q(t)=(1−t)q₀ + t p     t=0.00',28,INK,[0,2.2,0]);self.appear(title)
   for t in [.25,.5,.75,1]:
    q=(1-t)*Q+t*P;self.play(Transform(bars,dist(q,dstar(q))),Transform(title,T(f'q(t)=(1−t)q₀ + t p     t={t:.2f}',28,INK,[0,2.2,0])),run_time=1.3)
   self.appear(numrow('青は理想の D*。実際の D が最適とは限らない。',-2.9,BLUE))
  else:
   cards=[card('固定した G',-4.5,1.1,BLUE,4),card('等しい prior',0,1.1,GOLD,4),card('最適な D',4.5,1.1,GREEN,4)]
   for c in cards:self.appear(c)
   self.appear(T('p(x)=q(x)=0',38,INK,[0,-.5,0]));self.play(Write(T('0 / 0  →  最適値は任意',33,GOLD,[0,-1.5,0])),run_time=1)
   self.appear(numrow('この操作例では正の確率を使い、未定義の点を避ける。',-2.8))
 def draw_equilibrium(self,k):
  if k==0:
   self.appear(T('C(G) = max_D V(G,D)',36,BLUE,[0,1.8,0]));self.appear(T('= −log 4 + 2 JSD(p ∥ q)',39,INK,[0,.5,0]));self.play(Write(T('JSD ≥ 0',42,GOLD,[0,-1,0])),run_time=1)
   self.appear(numrow('最適な D* を代入したときの目的関数。',-2.4),numrow(f'初期例：JSD = {js(Q):.6f}  /  C = {-np.log(4)+2*js(Q):.6f}',-3.05))
  elif k==1:
   bars=dist(Q,dstar(Q));m=numrow(f'JSD={js(Q):.6f}     C={-np.log(4)+2*js(Q):.6f}',-2.9);self.appear(bars,m,T('理想の D* と、分布の一致',28,INK,[0,2.1,0]))
   for t in [.25,.5,.75,1]:
    q=(1-t)*Q+t*P;self.play(Transform(bars,dist(q,dstar(q))),Transform(m,numrow(f'JSD={js(q):.6f}     C={-np.log(4)+2*js(q):.6f}',-2.9)),run_time=1.4)
  elif k==2:
   bars=dist(P,np.ones(3)*.5);label=T('最適な D*：p=q のとき 0.5',29,BLUE,[0,2.1,0]);self.appear(bars,label);self.wait(1)
   self.play(Transform(bars,dist(Q,np.ones(3)*.5)),Transform(label,T('未学習の D ≡ 0.5：p ≠ q でも起こる',29,BLUE,[0,2.1,0])),run_time=1.8)
   self.appear(numrow('p ≠ q でも、未学習の D ≡ 0.5 は存在する。',-2.8,GOLD))
  else:
   for i,(s,col) in enumerate([('十分な容量',BLUE),('各段階で D を最適化',GOLD),('分布 p_g を改善する十分小さな更新',GREEN)]):self.appear(card(s,0,1.6-i*1.3,col,12))
   self.appear(numrow('分布レベルの仮定 ≠ 有限ニューラルネットの収束保証',-2.9,RED))
 def draw_training(self,k):
  if k==0:
   d=card('D を k 回更新',-3,1,BLUE,5);g=card('G を 1 回更新',3,1,GREEN,5);self.appear(d,g);self.play(GrowArrow(arrow(d.get_right(),g.get_left())),run_time=.8)
   self.play(Indicate(d),run_time=.8);self.play(Indicate(g),run_time=.8)
   self.appear(T('原著の実験：k = 1',36,GOLD,[0,-.6,0]),numrow('片方の更新中、もう片方のパラメータは固定する。',-2.2))
  elif k==1:
   a=np.zeros(3);bars=dist(Q,sig(a));self.appear(bars,T('q=softmax(b)     D=σ(a)',28,INK,[0,2.2,0]));self.wait(.5)
   a=ds(a,Q);self.play(Transform(bars,dist(Q,sig(a))),run_time=2)
   self.appear(numrow('D 1ステップ：a ← a + 0.5[p(1−D)−qD]',-2.8,BLUE))
  elif k==2:
   a=np.zeros(3);b=np.log(Q);bars=dist(Q,sig(a));m=numrow('交互更新 0 組 / 学習率 0.5',-2.85);self.appear(bars,m,T('G 損失：E_q[−log D]（非飽和）',28,INK,[0,2.2,0]))
   for n in range(1,81):
    a=ds(a,sm(b));b=gs(b,sig(a))
    if n in [1,10,30,80]:self.play(Transform(bars,dist(sm(b),sig(a))),Transform(m,numrow(f'交互更新 {n} 組   JSD={js(sm(b)):.6f}',-2.85)),run_time=1.4)
  else:
   d=np.array([.8,.5,.2]);b=np.log(Q);bars=dist(Q,d);m=numrow('D=(0.8, 0.5, 0.2) に固定 / G 更新 0 回',-2.8);self.appear(bars,m,T('固定した高得点を、追い続けると？',29,INK,[0,2.2,0]))
   for n in range(1,101):
    b=gs(b,d)
    if n in [10,30,100]:self.play(Transform(bars,dist(sm(b),d)),Transform(m,numrow(f'D 固定 / G 更新 {n} 回 / q(A)={sm(b)[0]:.3f}',-2.8)),run_time=1.5)
 def draw_saturation(self,k):
  if k==0:
   self.appear(card('生成器が弱い',-3,1.3,GREEN,5),card('D(G(z)) ≈ 0',3,1.3,BLUE,5));self.play(GrowArrow(arrow([-1,1.3,0],[1,1.3,0])),run_time=.8)
   self.appear(T('L_MM = log(1−D)',36,GOLD,[0,-.2,0]));self.appear(T('L_NS = −log D',36,GREEN,[0,-1.4,0]),numrow('どちらも G が最小化する。非飽和は代替目的。',-2.8))
  elif k==1:
   self.appear(T('D = σ(a)     ∂D/∂a = D(1−D)',32,BLUE,[0,2.0,0]))
   self.appear(T('∂L_MM/∂a = [−1/(1−D)] × D(1−D)',28,GOLD,[0,.6,0]));self.play(Write(T('= −D',40,GOLD,[0,-.2,0])),run_time=1)
   self.appear(T('∂L_NS/∂a = (−1/D) × D(1−D)',28,GREEN,[0,-1.1,0]));self.play(Write(T('= D−1',40,GREEN,[0,-1.9,0])),run_time=1)
   self.appear(numrow('a は生成サンプルに対する識別器ロジット。',-3.0))
  elif k==2:
   ax=Axes(x_range=[0,1,.2],y_range=[-1,0,.2],x_length=9,y_length=3,axis_config={'include_tip':False,'color':MUTE}).move_to([0,-.1,0]);self.play(Create(ax),run_time=.8)
   self.play(Create(ax.plot(lambda d:-d,color=GOLD)),Create(ax.plot(lambda d:d-1,color=GREEN)),run_time=1.5)
   self.appear(T('微分値：金 −D / 緑 D−1',28,INK,[0,2.2,0]),T('D',23,MUTE,[5,-1.7,0]))
   dots=VGroup(Dot(ax.c2p(.5,-.5),color=GOLD),Dot(ax.c2p(.5,-.5),color=GREEN));self.appear(dots)
   self.play(dots[0].animate.move_to(ax.c2p(.01,-.01)),dots[1].animate.move_to(ax.c2p(.01,-.99)),run_time=2)
   self.appear(numrow('D=0.01：−0.01 対 −0.99（ロジット微分）',-2.8))
  else:
   self.appear(T('D=0.01',33,BLUE,[0,2.2,0]),card('L_MM ≈ −0.01005',-3.4,.9,GOLD,6.2),card('L_NS ≈ 4.60517',3.4,.9,GREEN,6.2))
   self.play(Write(T('∂L/∂θ_G = (∂L/∂a) × (∂a/∂θ_G)',33,INK,[0,-.6,0])),run_time=1.3)
   self.appear(T('↑ 今比べた部分                 ↑ 連鎖律の残り',24,MUTE,[0,-1.5,0]),numrow('損失値・ロジット微分・全パラメータ勾配を区別する。',-2.85))
 def draw_evidence(self,k):
  if k==0:
   cs=[card(s,(i-1)*4.6,1.2,c,4.2) for i,(s,c) in enumerate([('MNIST',GOLD),('TFD',BLUE),('CIFAR-10',GREEN)])]
   for c in cs:self.appear(c)
   self.appear(T('§5：生成サンプルを提示',32,INK,[0,-.1,0]));self.play(cs[0].animate.shift(DOWN*.2),cs[1].animate.shift(DOWN*.2),run_time=1)
   self.appear(T('Table 1：MNIST と TFD の定量評価',29,GOLD,[0,-1.5,0]),numrow('画像は転載せず、原著の評価対象を整理。',-2.8))
  elif k==1:
   self.appear(T('Gaussian Parzen 窓の平均対数尤度推定',28,INK,[0,2.15,0]))
   for x,label,mean,se,col in [(-3.6,'MNIST',225,2,GOLD),(3.6,'TFD',2057,26,BLUE)]:
    self.appear(T(label,32,col,[x,1.2,0]));n=T('0',46,col,[x,.25,0]);self.add(n)
    for value in [round(mean*.4),round(mean*.75),mean]:self.play(Transform(n,T(str(value),46,col,[x,.25,0])),run_time=.4)
    self.appear(T('± '+str(se),30,col,[x,-.55,0]));line=Line([x-1.3,-1.3,0],[x+1.3,-1.3,0],color=col);self.play(Create(line),run_time=.5)
    self.appear(T(f'{mean-se}     {mean}     {mean+se}',21,col,[x,-1.85,0],5.6))
   self.appear(numrow('左右は異なるデータセット。値を横断比較しない。',-2.95))
  elif k==2:
   self.appear(card('MNIST：実数値版',-3.5,1.6,GOLD,6.3),card('TFD：データセットのfold',3.5,1.6,BLUE,6.3))
   for x,col in [(-3.5,GOLD),(3.5,BLUE)]:
    dots=VGroup(*[Dot([x+(i-2)*.5,.3+(i%2)*.3,0],color=col) for i in range(5)]);self.play(LaggedStart(*[FadeIn(d) for d in dots],lag_ratio=.15),run_time=1)
    self.play(dots.animate.scale(.5).move_to([x,-.5,0]),run_time=1)
   self.appear(T('テスト例にわたる標準誤差',23,GOLD,[-3.5,-1.3,0],6.4),T('fold 間の標準誤差',23,BLUE,[3.5,-1.3,0],6.4),numrow('カーネル幅 σ は検証データで選択。± は標準偏差ではない。',-2.8))
  else:
   for i,(label,col) in enumerate([('厳密なモデル尤度ではない',GOLD),('高い分散・高次元での弱さ',BLUE),('既存手法より優れるという主張ではない',GREEN)]):self.appear(card(label,0,1.65-i*1.25,col,12))
   self.appear(numrow('理論の成立条件・実験の測り方・画像品質を分ける。',-2.9,RED))
class Roles(GANChapter):chapter_id='roles'
class Objective(GANChapter):chapter_id='objective'
class Optimal(GANChapter):chapter_id='optimal'
class Equilibrium(GANChapter):chapter_id='equilibrium'
class Training(GANChapter):chapter_id='training'
class Saturation(GANChapter):chapter_id='saturation'
class Evidence(GANChapter):chapter_id='evidence'
