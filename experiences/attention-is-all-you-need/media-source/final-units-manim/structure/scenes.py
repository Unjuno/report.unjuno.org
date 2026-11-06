from manim import *
from pathlib import Path
import json
config.notify_outdated_version=False
config.background_color='#F6F3EC';config.pixel_width=1280;config.pixel_height=720;config.frame_rate=24;config.frame_width=16;config.frame_height=9
ROOT=Path(__file__).parent;PLAN=json.loads((ROOT/'plan.json').read_text())
INK='#192A31';BLUE='#2A55EB';ORANGE='#B94B2C';MUTE='#647172';LINE='#CAD2CF';GREEN='#257864'
def T(s,size=28,c=INK,pos=None,maxw=14):
 t=Text(s,font='Noto Sans CJK JP',font_size=size,color=c,disable_ligatures=True)
 if t.width>maxw:t.scale_to_fit_width(maxw)
 if pos is not None:t.move_to(pos)
 return t
def card(s,x,y,c=BLUE,w=2.3):
 r=RoundedRectangle(width=w,height=.8,corner_radius=.10,stroke_color=c,fill_color=c,fill_opacity=.06).move_to([x,y,0]);return VGroup(r,T(s,24,c,r.get_center(),w-.2))
def arrow(a,b,c=BLUE):return Arrow(a,b,buff=.08,color=c,stroke_width=3,max_tip_length_to_length_ratio=.15)
def row(labels,y=0,c=BLUE):return VGroup(*[card(v,(i-(len(labels)-1)/2)*2.5,y,c,2.1) for i,v in enumerate(labels)])
class Lesson(Scene):
 chapter_id='sequence'
 def appear(self,*g):self.play(*[FadeIn(x,shift=UP*.08) for x in g],run_time=.7)
 def construct(self):
  c=next(x for x in PLAN['chapters'] if x['id']==self.chapter_id)
  mast=VGroup(T('ATTENTION IS ALL YOU NEED',18,INK,[-4.3,4.05,0]),T(self.chapter_id.upper(),17,MUTE,[4.7,4.05,0],4.6),Line([-7.2,3.72,0],[7.2,3.72,0],color=LINE));self.add(mast)
  for k,b in enumerate(c['beats']):
   self.add(T(f'{k+1:02}  '+b['heading'],35,INK,[0,3.12,0]),T('原著 '+c['source_sections']+'  /  構造の模式図・実測速度ではありません',17,MUTE,[0,-4.15,0]))
   getattr(self,'draw_'+self.chapter_id.replace('-','_'))(k)
   self.wait(max(.01,(k+1)*c['slot']-.4-self.time));self.play(*[FadeOut(x) for x in self.mobjects if x is not mast],run_time=.4)
 def chain(self,n,y,c=ORANGE):
  nodes=VGroup(*[Circle(radius=.24,stroke_color=c,fill_color=c,fill_opacity=.08).move_to([-5.9+i*11.8/(n-1),y,0]) for i in range(n)])
  nums=VGroup(*[T(str(i+1),19,c,node.get_center()) for i,node in enumerate(nodes)]);return VGroup(nodes,nums)
 def draw_sequence(self,k):
  if k==0:
   g=self.chain(6,.3);self.appear(g,T('再帰層：前の結果を次へ渡す',28,ORANGE,[0,1.65,0]))
   for a,b in zip(g[0],g[0][1:]):
    ar=arrow(a.get_right(),b.get_left(),ORANGE);self.play(GrowArrow(ar),run_time=.5);self.play(Indicate(b,color=ORANGE),run_time=.3)
   self.appear(T('n = 6     先頭 → 末尾：5 接続',34,ORANGE,[0,-1.6,0]),T('隣接する位置を、一つずつたどる。',26,MUTE,[0,-2.4,0]))
  elif k==1:
   g=self.chain(6,.2,BLUE);self.appear(g,T('Self-attention：位置同士を直接参照',28,BLUE,[0,1.7,0]))
   links=VGroup(*[ArcBetweenPoints(g[0][i].get_top(),g[0][j].get_top(),angle=-.35,color=LINE,stroke_width=1) for i in range(6) for j in range(i+1,6)])
   self.play(Create(links),run_time=2)
   ar=CurvedArrow(g[0][0].get_bottom(),g[0][-1].get_bottom(),angle=.5,color=BLUE);self.play(Create(ar),run_time=1)
   self.appear(T('n = 6     先頭 → 末尾：1 接続',34,BLUE,[0,-1.8,0]),T('全位置を直接つなぐ、情報経路の模式図。',25,MUTE,[0,-2.5,0]))
  elif k==2:
   a=self.chain(6,1.3);b=self.chain(12,-.2);self.appear(a,T('n = 6',25,ORANGE,[-6,2,0]));self.play(TransformFromCopy(a,b),run_time=1.6)
   for g in [a,b]:self.play(*[GrowArrow(arrow(x.get_right(),y.get_left(),ORANGE)) for x,y in zip(g[0],g[0][1:])],run_time=1)
   self.appear(T('n = 12',25,ORANGE,[-6,-.9,0]),T('隣接経路：5 → 11     直接経路：1 → 1',30,INK,[0,-1.7,0]),T('Table 1 最大経路長：再帰層 O(n) ／ Self-attention O(1)',25,BLUE,[0,-2.5,0]))
  else:
   a=card('入力が全位置にある',-3.6,1.4,BLUE,5.4);b=card('各位置の計算を並列化',3.5,1.4,BLUE,5.4);self.appear(a,b);self.play(GrowArrow(arrow(a.get_right(),b.get_left())),run_time=.6)
   r=row(['BOS','A','B','…'],-.4,ORANGE);self.appear(r)
   for x,y in zip(r,r[1:]):self.play(GrowArrow(arrow(x.get_right(),y.get_left(),ORANGE)),run_time=.5)
   self.appear(T('生成時：前に出したトークンが、次の入力になる。',28,ORANGE,[0,-1.8,0]),T('短い情報経路 ≠ 一度に文章を生成',30,INK,[0,-2.5,0]))
 def draw_encoder_decoder(self,k):
  if k==0:
   enc=card('Encoder',-4,1.1,BLUE,3.4);dec=card('Decoder',4,1.1,ORANGE,3.4);att=card('Cross-attention',0,-1,INK,4.2);self.appear(enc,dec,att,T('入力文 → 入力の表現',26,BLUE,[-4,2.1,0]),T('既知の出力',26,ORANGE,[4,2.1,0]))
   self.play(GrowArrow(arrow(enc.get_bottom(),att.get_left(),BLUE)),GrowArrow(arrow(dec.get_bottom(),att.get_right(),ORANGE)),run_time=1)
   self.appear(T('K・V',28,BLUE,[-3,-.5,0]),T('Q',28,ORANGE,[3,-.5,0]),T('Q：Decoder側     K・V：Encoderの出力',29,INK,[0,-2.5,0]))
  elif k==1:
   a=row(['BOS','A','B','C'],.9);b=row(['A','B','C','EOS'],-.8,ORANGE);self.appear(T('Decoder の入力',25,BLUE,[0,1.9,0]),a)
   self.appear(T('予測する正解',25,ORANGE,[0,-1.75,0]),b)
   self.play(*[GrowArrow(arrow(x.get_bottom(),y.get_top())) for x,y in zip(a,b)],run_time=1.4)
   self.appear(T('BOS：開始記号     EOS：終了記号',24,MUTE,[0,-2.6,0]))
  elif k==2:
   cells=VGroup()
   for i in range(4):
    for j in range(4):
     x=-2.1+j*.9;y=1.3-i*.9;c=BLUE if j<=i else LINE
     cells.add(Square(side_length=.8,stroke_color=c,fill_color=c,fill_opacity=.16 if j<=i else .03).move_to([x,y,0]),T('✓' if j<=i else '×',24,c,[x,y,0]))
   self.appear(cells,T('参照する入力位置 →',22,MUTE,[-.75,2.05,0]),T('未来の参照は不可',29,ORANGE,[4,.8,0],5),T('各行の計算は並列',29,BLUE,[4,-.3,0],5))
   self.appear(T('位置 i は j ≤ i の入力のみ参照できる',27,INK,[0,-2.5,0]))
  else:
   enc=card('Encoder の入力表現',0,1.8,BLUE,7);self.appear(enc)
   r=row(['BOS','?','?','?','?'],.1,ORANGE);self.appear(r)
   for i,label in enumerate(['A','B','C','EOS'],1):
    self.play(GrowArrow(arrow(enc.get_bottom(),r[i].get_top(),BLUE)),run_time=.5)
    nxt=card(label,r[i].get_center()[0],.1,ORANGE,2.1);self.play(Transform(r[i],nxt),run_time=.6);self.wait(.5)
   self.appear(T('予測した出力を、次の入力に追加する。',28,ORANGE,[0,-1.7,0]),T('生成例は模式的。実際の翻訳は実行していません。',24,MUTE,[0,-2.5,0]))
class Sequence(Lesson):chapter_id='sequence'
class EncoderDecoder(Lesson):chapter_id='encoder-decoder'
