"""Original educational diagrams, rendered by real Manim Community 0.19.0.
No reproduced paper figures. All values are explicit teaching examples or sourced tables.
"""
from manim import *
from pathlib import Path
import json
config.notify_outdated_version=False
config.pixel_width=1280;config.pixel_height=720;config.frame_rate=24
config.background_color='#F6F3EC';config.max_files_cached=200
P=Path(__file__).resolve().parent
INK='#192A31';BLUE='#2955DE';GREEN='#4F8073';RED='#CC613B';MUTED='#526461'
def text(s,size=26,color=INK):
 m=Text(s,font='Noto Sans CJK JP',font_size=size,color=color)
 if m.width>12.8:m.scale_to_fit_width(12.8)
 return m

def box(label,pos,color=BLUE,width=2.2,height=.9):
 r=RoundedRectangle(width=width,height=height,corner_radius=.12,color=color,fill_color=color,fill_opacity=.06).move_to(pos)
 t=text(label,23,color).move_to(pos)
 if t.width>width-.15:t.scale_to_fit_width(width-.15)
 return VGroup(r,t)
def arrow(a,b,color=BLUE):return Arrow(a,b,buff=.12,color=color,stroke_width=3,max_tip_length_to_length_ratio=.15)
def signed_row(label,value,y,color):
 origin=np.array([0,y,0]);w=abs(value)*.75
 labelobj=text(label,20).move_to([-4.7,y,0]);v=text(str(value),22,color).move_to([4.3,y,0]);bar=Rectangle(width=max(.015,w),height=.4,stroke_width=0,fill_color=color,fill_opacity=.85).move_to(origin+RIGHT*(w/2 if value>=0 else -w/2))
 return VGroup(labelobj,bar,v)

class Lesson(Scene):
 slug='';source=''
 def start(self):
  self.plan=json.loads((P/self.slug/'timing.json').read_text());self.stage=VGroup()
  mast=text('RESNET / '+self.slug.upper(),15).to_corner(UL)
  source=text(self.source,14,MUTED).to_edge(DOWN)
  self.add(mast,source)
 def heading(self,i,notice=''):
  if len(self.stage):self.play(FadeOut(self.stage),run_time=.35)
  self.stage=VGroup(text(self.plan[i]['title'],33).move_to(UP*2.95),text(notice,16,MUTED).move_to(DOWN*2.65))
  self.play(FadeIn(self.stage),run_time=.35)
 def put(self,*m):self.stage.add(*m);self.play(*[FadeIn(x) for x in m],run_time=.6)
 def end(self,i):self.wait(max(.05,self.plan[i]['end']-self.time))

class ResidualLesson(Lesson):
 slug='residual';source='He et al. · §3.1–3.2 / Eq. (1), Fig. 2'
 def construct(self):
  self.start();self.heading(0,'原論文の残差の定義。加算と加算後の活性化は区別する。')
  x=box('x',LEFT*4);f=box('F(x)',ORIGIN);plus=box('+',RIGHT*4,GREEN)
  self.put(x,f,plus);main=VGroup(arrow(x.get_right(),f.get_left()),arrow(f.get_right(),plus.get_left()))
  skip=VMobject(color=GREEN).set_points_as_corners([x.get_bottom(),x.get_bottom()+DOWN,plus.get_bottom()+DOWN,plus.get_bottom()]);self.stage.add(main,skip);self.play(Create(main),Create(skip),run_time=1.5)
  formula=text('F(x) = H(x) − x    →    H(x) = F(x) + x',26,BLUE).move_to(UP*1.5);self.put(formula)
  dot=Dot(x.get_center(),color=RED);self.stage.add(dot);self.play(MoveAlongPath(dot,skip),run_time=2);self.end(0)
  self.heading(1,'1次元の手計算 / 学習済みモデルの出力ではありません')
  axis=Line([0,-1.8,0],[0,1.8,0],color=MUTED);rows=VGroup(signed_row('入力 x',2,1.2,GREEN),signed_row('残差 F(x)',1,.2,BLUE),signed_row('加算 y',3,-.8,RED));self.put(axis,rows)
  eq=text('2 + 1 = 3',30).move_to(UP*2);self.put(eq);self.wait(2)
  new=VGroup(signed_row('入力 x',2,1.2,GREEN),signed_row('残差 F(x)',0,.2,BLUE),signed_row('加算 y',2,-.8,RED));self.play(Transform(rows,new),Transform(eq,text('2 + 0 = 2',30).move_to(UP*2)),run_time=2);self.end(1)
  self.heading(2,'加算 y とブロック出力 ReLU(y) を分ける')
  rows=VGroup(signed_row('入力 x',2,1.5,GREEN),signed_row('残差 F(x)',1,.5,BLUE),signed_row('加算 y',3,-.5,RED),signed_row('ReLU(y)',3,-1.5,INK));self.put(Line([0,-1.9,0],[0,1.9,0],color=MUTED),rows);self.wait(1)
  new=VGroup(signed_row('入力 x',2,1.5,GREEN),signed_row('残差 F(x)',-3,.5,BLUE),signed_row('加算 y',-1,-.5,RED),signed_row('ReLU(y)',0,-1.5,INK));self.play(Transform(rows,new),run_time=3);self.put(text('2 + (−3) = −1   →   max(0, −1) = 0',24).move_to(UP*2.2));self.end(2)
  self.heading(3,'負の値は、加算後のReLUで保存されない')
  a=box('x = −2',LEFT*4);b=box('F(x) = 0',ORIGIN);c=box('y = −2',RIGHT*4,RED);self.put(a,b,c,arrow(a.get_right(),b.get_left()),arrow(b.get_right(),c.get_left()));self.wait(2)
  self.play(Transform(c,box('ReLU(y) = 0',RIGHT*4,GREEN)),run_time=2);self.put(text('F(x)=0 : 加算は恒等写像 / 活性化後まで同じとは限らない',23).move_to(DOWN*1.5));self.end(3)

class ShapeLesson(Lesson):
 slug='shape';source='He et al. · §3.2–3.3 / Eq. (2), shortcut options A/B'
 def construct(self):
  self.start();self.heading(0,'縦 × 横 × チャネル / 図は模式図、縮尺は一定ではありません')
  a=box('x : 56×56×64',LEFT*3, GREEN,4);b=box('F(x) : 56×56×64',RIGHT*3,BLUE,4);self.put(a,b,text('+',30).move_to(ORIGIN));self.wait(2);self.play(Indicate(a,color=GREEN),Indicate(b,color=GREEN),run_time=1.5);self.put(text('形が一致 → 要素ごとに加算できる',28,GREEN).move_to(DOWN*1.5));self.end(0)
  self.heading(1,'入力をそのまま足すと、形が一致しない')
  a=box('x : 56×56×64',LEFT*3,GREEN,4);b=box('F(x) : 56×56×64',RIGHT*3,BLUE,4);self.put(a,b);self.play(Transform(b,box('F(x) : 28×28×128',RIGHT*3,BLUE,4)),run_time=2);cross=Cross(stroke_color=RED).scale(.45);self.put(cross,text('56 ≠ 28 / 64 ≠ 128',28,RED).move_to(DOWN*1.4));self.end(1)
  self.heading(2,'shortcutを1×1畳み込みで射影する例')
  a=box('56×56×64',LEFT*4, GREEN,2.8);proj=box('1×1 / stride 2',ORIGIN,BLUE,3);b=box('28×28×128',RIGHT*4,GREEN,2.8);self.put(a,proj,b,arrow(a.get_right(),proj.get_left()),arrow(proj.get_right(),b.get_left()));dot=Dot(a.get_center(),color=RED);self.stage.add(dot);self.play(dot.animate.move_to(proj.get_center()),run_time=1.2);self.play(dot.animate.move_to(b.get_center()),run_time=1.2)
  self.put(text('F(x): 28×28×128  +  Wₛx: 28×28×128',24).move_to(DOWN*1.5),text('y = F(x) + Wₛx',28,BLUE).move_to(UP*1.7));self.end(2)
  self.heading(3,'畳み込み重みのみ / バイアス・BNを除く')
  formula=text('1 × 1 × 64 × 128',36,BLUE);self.put(formula);self.wait(2);self.play(Transform(formula,text('8,192 個の学習パラメータ',34,BLUE)),run_time=1.5)
  self.put(text('恒等 shortcut : 重み 0',25,GREEN).move_to(UP*1.5),text('原論文はゼロ埋め（option A）も比較',24).move_to(DOWN*1.5));self.end(3)

class DepthLesson(Lesson):
 slug='depth';source='He et al. · §1, §4.1 / Fig. 1, 4  · 微分は独自の線形教材'
 def construct(self):
  self.start();self.heading(0,'degradation と overfitting を同一視しない')
  train=box('訓練誤差も悪化',LEFT*3,RED,4);test=box('テストで汎化を評価',RIGHT*3,BLUE,4);self.put(train,test);self.play(Indicate(train,color=RED),run_time=1.5);self.put(text('原論文の深いplain network → 最適化の難しさ',24).move_to(DOWN*1.5));self.end(0)
  self.heading(1,'玩具の別々の写像。訓練・精度・実測学習曲線ではありません')
  a=text('plain : zₖ₊₁ = a zₖ',29,RED).move_to(UP);b=text('residual : zₖ₊₁ = zₖ + a zₖ',29,BLUE).move_to(DOWN*.2);self.put(a,b);self.wait(2)
  self.play(Transform(a,text('∂zₙ / ∂z₀ = aⁿ',30,RED).move_to(UP)),Transform(b,text('∂zₙ / ∂z₀ = (1+a)ⁿ',30,BLUE).move_to(DOWN*.2)),run_time=2);self.put(text('同じ a でも、同じ関数の比較ではない',25).move_to(DOWN*1.6));self.end(1)
  self.heading(2,'a=0.1 / 表示値は計算値。点の位置は対数軸を使用。')
  axis=NumberLine(x_range=[-20,2,2],length=10,color=MUTED,include_numbers=False).move_to(DOWN*.9);self.put(axis,text('log₁₀ |微分|',21).move_to(DOWN*1.9),*[text(str(v),16).move_to(axis.n2p(v)+DOWN*.35) for v in [-20,-10,0,2]])
  red=Dot(axis.n2p(-1),color=RED);blue=Dot(axis.n2p(np.log10(1.1)),color=BLUE);label=text('n=1 : plain 0.1 / residual 1.1',25).move_to(UP*1.4);self.put(red,blue,label)
  for n in [5,10,20]:
   self.play(red.animate.move_to(axis.n2p(-n)),blue.animate.move_to(axis.n2p(np.log10(1.1**n))),Transform(label,text(f'n={n} : plain {0.1**n:.1e} / residual {1.1**n:.3f}',25).move_to(UP*1.4)),run_time=1.5)
  self.end(2)
  self.heading(3,'この反例だけでも「必ず保つ」とは言えない')
  eq=text('a=−1 : (1+a)ⁿ = 0ⁿ = 0   (n ≥ 1)',30,BLUE);self.put(eq);self.play(Indicate(eq,color=RED),run_time=1.5)
  self.put(text('実際には ReLU・BN・重み・学習率も関わる',25).move_to(DOWN*1.3));self.end(3)

class BlocksLesson(Lesson):
 slug='blocks';source='He et al. · §4.1 / Fig. 5, Table 1  · 重み数比較は独自教材'
 def construct(self):
  self.start();self.heading(0,'残差経路の基本形 / 原論文の18・34層')
  a=box('3×3',LEFT*2.2,BLUE);b=box('3×3',RIGHT*1.2,BLUE);plus=box('+',RIGHT*4.5,GREEN,1)
  self.put(a,b,plus);link=VGroup(arrow(a.get_right(),b.get_left()),arrow(b.get_right(),plus.get_left()));self.stage.add(link);self.play(Create(link),run_time=1.2)
  skip=VMobject(color=GREEN).set_points_as_corners([[-4.5,0,0],[-4.5,-1.5,0],[4.5,-1.5,0],[4.5,-.5,0]]);self.stage.add(skip);self.play(Create(skip),run_time=1.2);self.put(text('加算後にも ReLU',22).move_to(UP*1.5));self.end(0)
  self.heading(1,'ボトルネック / 原論文の50・101・152層')
  blocks=VGroup(*[Rectangle(width=1.6,height=2.4,color=BLUE,fill_color=BLUE,fill_opacity=.3).move_to([x,0,0]) for x in [-4,-1.3,1.3,4]])
  self.put(blocks);target=blocks.copy();target[1].stretch_to_fit_height(.6);target[2].stretch_to_fit_height(.6);self.play(Transform(blocks,target),run_time=2)
  labels=VGroup(*[text(t,22).move_to([x,-1.9,0]) for x,t in zip([-4,-1.3,1.3,4],['C','b','b','C'])]);ops=VGroup(*[text(t,20).move_to([x,1.8,0]) for x,t in zip([-2.65,0,2.65],['1×1','3×3','1×1'])]);self.put(labels,ops);self.end(1)
  self.heading(2,'同じ入出力 C=256 / 中間 b=64 / 原図5の再現ではない')
  a=Rectangle(width=9,height=.6,stroke_width=0,fill_color=RED,fill_opacity=.8).move_to([0,.6,0]);b=Rectangle(width=9,height=.6,stroke_width=0,fill_color=BLUE,fill_opacity=.8).move_to([0,-.8,0]);self.put(a,b,text('基本 : 18C² = 1,179,648',24).move_to(UP*1.6),text('ボトルネック : 2Cb + 9b² = 69,632',24).move_to(DOWN*1.8));self.play(b.animate.stretch_to_fit_width(9*69632/1179648).align_to(a,LEFT),run_time=2.5);self.end(2)
  self.heading(3,'比較条件を明示 / バイアス・BN・shortcutは数えない')
  a=box('教材 : C=256 同士',LEFT*3,BLUE,5);b=box('原図5 : 64 と 256',RIGHT*3,GREEN,5);self.put(a,b);self.play(Indicate(a),Indicate(b),run_time=1.5);self.put(text('重み数の削減 ≠ 精度向上の保証',27).move_to(DOWN*1.5));self.end(3)

class EvidenceLesson(Lesson):
 slug='evidence';source='He et al. · §4.1–4.2 / Tables 2, 4, 5, 6'
 def bars(self,values,labels):
  group=VGroup()
  for i,(v,label) in enumerate(zip(values,labels)):
   x=-2.5+i*5;h=v/10
   group.add(Rectangle(width=1.6,height=h,stroke_width=0,fill_color=RED if i==0 else BLUE,fill_opacity=.8).move_to([x,-1.2+h/2,0]),text(f'{v:.2f}%',27).move_to([x,-1.8,0]),text(label,23).move_to([x,2,0]))
  return group
 def construct(self):
  self.start();self.heading(0,'Table 2 / ImageNet validation / 10-crop / top-1 error（低いほど良い）')
  bars=self.bars([27.94,27.94],['plain 18層','plain 34層']);self.put(bars);self.play(Transform(bars,self.bars([27.94,28.54],['plain 18層','plain 34層'])),run_time=2);self.end(0)
  self.heading(1,'Table 2 / 同じ評価条件 / 2.85パーセントポイントの改善')
  bars=self.bars([27.88,27.88],['ResNet 18層','ResNet 34層']);self.put(bars);self.play(Transform(bars,self.bars([27.88,25.03],['ResNet 18層','ResNet 34層'])),run_time=2);self.end(1)
  self.heading(2,'条件が異なるため、この2値を同条件の棒グラフにしない')
  a=box('4.49% / 単体152層',LEFT*3,BLUE,5);b=box('3.57% / 6モデル',RIGHT*3,GREEN,5);self.put(a);self.put(text('Table 4 / validation / top-5',20).move_to([-3,-1,0]));self.wait(1.5);self.put(b,text('Table 5 / test / top-5',20).move_to([3,-1,0]));self.play(Indicate(a),Indicate(b),run_time=1.5);self.end(2)
  self.heading(3,'Table 6 / CIFAR-10 test / 110層は5回の最良値との比較')
  bars=self.bars([6.43,6.43],['110層（最良）','1202層']);self.put(bars);self.play(Transform(bars,self.bars([6.43,7.93],['110層（最良）','1202層'])),run_time=2)
  self.put(text('110層 : 5回平均 ± 標準偏差 = 6.61 ± 0.16%',23).move_to(UP*.2));self.end(3)
