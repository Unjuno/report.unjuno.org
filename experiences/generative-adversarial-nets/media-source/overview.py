from manim import *
config.background_color='#101719';config.pixel_width=1280;config.pixel_height=720;config.frame_rate=24
config.frame_width=16;config.frame_height=9
INK='#f1f1e9';MUTE='#aebbb9';BLUE='#91b6f5';GOLD='#f2c68c';GREEN='#91cbb2'
def txt(s,size=32,color=INK):
 t=Text(s,font='Noto Sans CJK JP',font_size=size,color=color)
 if t.width>14:t.scale_to_fit_width(14)
 return t
def box(label,x,y,c):
 r=RoundedRectangle(width=3.0,height=1.2,corner_radius=.15,stroke_color=c,fill_color=c,fill_opacity=.07).move_to([x,y,0]);t=txt(label,27,c).move_to(r);return VGroup(r,t)
def foot(s):return txt(s,23,MUTE).move_to([0,-3.7,0])
class GANOverview(Scene):
 def construct(self):
  mast=txt('PAPER LAB  /  GENERATIVE ADVERSARIAL NETS  /  2014',16,MUTE).to_edge(UP,buff=.25)
  self.add(mast,Line([-7.2,3.85,0],[7.2,3.85,0],stroke_color='#344245'))
  titles=['01  作る役と、見分ける役','02  同じゲーム、逆向きの更新','03  画像の前に、三つの箱で','04  理想の識別器を計算する','05  分布が等しくなったら','06  理論と、実際の学習を分ける']
  for i,title in enumerate(titles):
   start=i*13;h=txt(title,38).move_to([0,3.0,0]);g=VGroup(h)
   if i==0:
    z=box('ノイズ z',-5,0,GOLD);gen=box('生成器 G',-1,0,GREEN);d=box('識別器 D',4,0,BLUE)
    real=txt('実データ x',26,GOLD).move_to([4,1.8,0]);a=Arrow(z.get_right(),gen.get_left(),buff=.1,color=GREEN);b=Arrow(gen.get_right(),d.get_left(),buff=.1,color=BLUE);c=Arrow(real.get_bottom(),d.get_top(),buff=.1,color=GOLD)
    g.add(z,gen,d,real,a,b,c,foot('D(x) は「実データ由来」の確率を予測'))
   elif i==1:
    g.add(txt('min G    max D',36,GOLD).move_to([0,1.6,0]),txt('V = E_data[log D(x)] + E_z[log(1 − D(G(z)))]',29).move_to([0,.3,0]),txt('識別器 D：V を増やす ↑',29,BLUE).move_to([-3,-1.3,0]),txt('生成器 G：V を減らす ↓',29,GREEN).move_to([3,-2.2,0]),foot('原論文 §3・式 (1)  /  log は自然対数'))
   elif i==2:
    p=[.5,.3,.2];q=[.2,.3,.5]
    for j in range(3):
     x=(j-1)*4
     for off,v,col in [(-.45,p[j],GOLD),(.45,q[j],GREEN)]:
      r=Rectangle(width=.7,height=v*4,stroke_width=0,fill_color=col,fill_opacity=1).move_to([x+off,-.8+v*2,0]);g.add(r,txt(f'{v:.1f}',23,col).move_to([x+off,v*4-.5,0]))
     g.add(txt('ABC'[j],27).move_to([x,-1.3,0]))
    g.add(txt('実データ p  ■',23,GOLD).move_to([-3,-2.4,0]),txt('生成分布 q  ■',23,GREEN).move_to([3,-2.4,0]),foot('教育用の離散分布  /  p も q も合計 1'))
   elif i==3:
    g.add(txt('D*(x) = p(x) / (p(x) + q(x))',38,BLUE).move_to([0,1.4,0]))
    for j,(name,n,d,val) in enumerate([('A','0.5','0.7','0.714'),('B','0.3','0.6','0.500'),('C','0.2','0.7','0.286')]):
     g.add(txt(name,35,GOLD).move_to([(j-1)*4,0,0]),txt(f'{n} / {d}',28).move_to([(j-1)*4,-1,0]),txt(val,32,BLUE).move_to([(j-1)*4,-2,0]))
    g.add(foot('原論文 §4.1・命題 1  /  G を固定したときの最適解'))
   elif i==4:
    g.add(txt('p = q',65,GREEN).move_to([-3,.7,0]),Arrow([-1,.7,0],[1,.7,0],color=MUTE),txt('D* = 1/2',50,BLUE).move_to([3,.7,0]),txt('C(G) = −log 4 + 2 JSD(p ∥ q)',32).move_to([0,-1.1,0]),txt('最小値 −log 4 ≈ −1.386',27,GOLD).move_to([0,-2.1,0]),foot('D が弱いだけでも 1/2 は出る。分布の一致と区別する。'))
   else:
    g.add(box('D を更新',-3,1.1,BLUE),box('G を更新',3,1.1,GREEN),Arrow([-1.3,1.1,0],[1.3,1.1,0],color=MUTE),txt('勾配への対策：−log D(G(z)) を最小化',31,GOLD).move_to([0,-.6,0]),txt('飽和を避け、より強い勾配を得る別の目的',26).move_to([0,-1.5,0]),txt('十分な表現力・最適な D などが理論の条件',25,MUTE).move_to([0,-2.4,0]),foot('原論文 §3・Algorithm 1・§4.2  /  次は自分で動かそう'))
   self.play(FadeIn(g,shift=UP*.1),run_time=.6)
   self.wait(max(0,start+12.5-self.time));self.play(FadeOut(g),run_time=.5)
