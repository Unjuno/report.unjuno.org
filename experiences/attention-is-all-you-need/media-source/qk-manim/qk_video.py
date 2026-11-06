from manim import *
import numpy as np,json,os,math
config.background_color='#F6F3EC';config.pixel_width=1920;config.pixel_height=1080;config.frame_width=16;config.frame_height=9;config.frame_rate=30
P=os.path.dirname(__file__)
INK='#192A31';MUTE='#647172';BLUE='#2A55EB';A='#B94B2C';B='#417065';C='#566567';LINE='#CAD2CF';SERIF='Noto Serif CJK JP';SANS='Noto Sans CJK JP'
KEYS=np.array([[2.,0.],[0.,2.],[-1.,1.]]);COLORS=[A,B,C]
def pt(x,y):return np.array([(x-960)/120,(540-y)/120,0])
def T(s,x,y,n=34,c=INK,font=SANS,left=False):
 t=Text(s,font=font,color=c,disable_ligatures=True)
 if t.height:t.scale_to_fit_height(n/120)
 t.move_to(pt(x,y),aligned_edge=LEFT if left else ORIGIN);return t

def header(title):return VGroup(T('QUERY & KEY / 01',104,187,22,BLUE,'DejaVu Sans',True),T(title,104,278,65,INK,SERIF,True))
class Digits(Text):
 def __init__(self,text,**kw):super().__init__(text,font='DejaVu Sans',**kw)

def clean(v):return 0. if abs(v)<1e-9 else v

class QKMatching(Scene):
 def until(self,t):
  if t>self.time:self.wait(t-self.time)
  if os.environ.get('QK_PREVIEW_SNAPSHOTS'):
   self.renderer.update_frame(self)
   self.renderer.camera.get_image().save(P+f'/snapshot_{t:.2f}.png')
 def construct(self):
  mast=VGroup(T('ATTENTION IS ALL YOU NEED',104,79,21,INK,'DejaVu Sans',True),T('QUERY · KEY',1816,79,18,MUTE,'DejaVu Sans').align_to(pt(1816,79),RIGHT),Line(pt(104,119),pt(1816,119),color=LINE,stroke_width=1))
  self.add(mast)
  plan=json.load(open(P+'/narration_plan.json'))['segments'];caps=[T(z['caption'],960,970,32) for z in plan]
  for c in caps:
   if c.width>14.5:c.scale_to_fit_width(14.5)
  caption=VGroup().set_z_index(30);state=[-2]
  def cap_update(m,dt):
   t=self.time;i=next((j for j,z in enumerate(plan) if z['start']<=t<z['end']),-1)
   if i!=state[0]:m.become(caps[i].copy() if i>=0 else VGroup());m.set_z_index(30);state[0]=i
   if i>=0:m.set_opacity(max(0,min(1,(t-plan[i]['start'])/.25,(plan[i]['end']-t)/.25)))
  caption.add_updater(cap_update);self.add(caption)
  # Both Q and K are learned projections. The rest isolates the dot product.
  h=header('Q と K は、どう照合する？')
  q=T('Q',590,497,118,BLUE,'Noto Serif Display');k=T('K',1330,497,118,A,'Noto Serif Display')
  ql=T('Query / 問い合わせ',590,616,32,BLUE);kl=T('Key / 照合する鍵',1330,616,32,A)
  x=T('入力の表現',960,805,34,INK,SERIF)
  p1=CubicBezier(pt(880,760),pt(880,700),pt(590,740),pt(590,675),color=BLUE,stroke_width=2.5)
  p2=CubicBezier(pt(1040,760),pt(1040,700),pt(1330,740),pt(1330,675),color=A,stroke_width=2.5)
  learned=T('学習した変換',960,690,25,MUTE)
  intro=VGroup(q,k,ql,kl,x,p1,p2,learned)
  self.play(FadeIn(h),FadeIn(x),Create(p1),Create(p2),FadeIn(learned),FadeIn(VGroup(q,k,ql,kl)),run_time=1.5)
  self.until(5.7);self.play(FadeOut(intro),Transform(h,header('まずは、2次元の小さな例。')),run_time=.5)
  # Shared numeric setup with the site interaction.
  ox,oy,scale=610,620,105
  xy=lambda v:pt(ox+float(v[0])*scale,oy-float(v[1])*scale)
  axes=VGroup()
  for j in [-2,-1,0,1,2]:
   axes.add(Line(xy([-2.2,j]),xy([2.2,j]),color=LINE if j else MUTE,stroke_width=.7 if j else 1.3),Line(xy([j,-2.2]),xy([j,2.2]),color=LINE if j else MUTE,stroke_width=.7 if j else 1.3))
   if j:axes.add(T(str(j),ox+j*scale,oy+24,18,MUTE,'DejaVu Sans'),T(str(j),ox-24,oy-j*scale,18,MUTE,'DejaVu Sans'))
  axes.add(T('第1成分',ox+300,oy+65,21,MUTE),T('第2成分',ox,oy-280,21,MUTE))
  arrows=VGroup(*[Arrow(xy([0,0]),xy(v),buff=0,color=c,stroke_width=3,max_tip_length_to_length_ratio=.12) for v,c in zip(KEYS,COLORS)])
  klabs=VGroup(T('KA',850,645,29,A,'DejaVu Sans'),T('KB',649,392,29,B,'DejaVu Sans'),T('KC',472,493,29,C,'DejaVu Sans'))
  length=ValueTracker(np.sqrt(2));angle=ValueTracker(PI/4)
  def query():return np.array([length.get_value()*np.cos(angle.get_value()),length.get_value()*np.sin(angle.get_value())])
  def qdraw():
   qq=query()
   if np.linalg.norm(qq)<.0001:return Dot(xy([0,0]),radius=.055,color=BLUE)
   return Arrow(xy([0,0]),xy(qq),buff=0,color=BLUE,stroke_width=5,max_tip_length_to_length_ratio=.16)
  qa=always_redraw(qdraw)
  qlabel=always_redraw(lambda:T('Q',ox+query()[0]*scale+18,oy-query()[1]*scale-25,31,BLUE,'DejaVu Sans'))
  qnumbers=VGroup();qprefix=T('Q = [',440,912,30,BLUE,'DejaVu Sans');comma=Text(',',font='DejaVu Sans',font_size=28,color=BLUE).move_to(pt(620,922));close=T(']',770,912,30,BLUE,'DejaVu Sans')
  qnums=[]
  for j,xpos in enumerate([550,685]):
   dec=DecimalNumber(1,mob_class=Digits,num_decimal_places=2,font_size=28,color=BLUE).move_to(pt(xpos,912))
   dec.add_updater(lambda m,dt,j=j,xpos=xpos:m.set_value(clean(query()[j])).move_to(pt(xpos,912)))
   qnums.append(dec)
  qnumbers.add(qprefix,comma,close,*qnums)
  initial=VGroup(T('Q = [1, 1]',1190,450,43,BLUE,'DejaVu Sans',True),T('KA = [2, 0]',1190,560,38,A,'DejaVu Sans',True),T('KB = [0, 2]',1190,660,38,B,'DejaVu Sans',True),T('KC = [−1, 1]',1190,760,38,C,'DejaVu Sans',True))
  note=T('手で設定した2次元の例。学習済みモデルの出力ではありません。',1816,1032,18,MUTE).align_to(pt(1816,1032),RIGHT)
  self.play(Create(axes),LaggedStart(*[GrowArrow(a) for a in arrows],lag_ratio=.15),FadeIn(klabs),FadeIn(qa),FadeIn(qlabel),FadeIn(qnumbers),FadeIn(initial),FadeIn(note),run_time=1.7)
  self.until(11.7)
  # Derive one concrete inner product, without introducing probabilities.
  self.play(Transform(h,header('成分を掛けて、足す。')),FadeOut(initial),run_time=.5)
  algebra=SVGMobject(P+'/dot_equation.svg',color=INK).scale_to_fit_width(6.0).move_to(pt(1405,445))
  terms=VGroup(T('1',1105,618,52,BLUE,'DejaVu Sans'),T('×',1185,618,43,MUTE,'DejaVu Sans'),T('2',1265,618,52,A,'DejaVu Sans'),T('+',1370,618,48,MUTE,'DejaVu Sans'),T('1',1475,618,52,BLUE,'DejaVu Sans'),T('×',1555,618,43,MUTE,'DejaVu Sans'),T('0',1635,618,52,A,'DejaVu Sans'))
  result=T('= 2',1370,775,68,INK,'Noto Serif Display')
  self.play(Write(algebra),LaggedStart(*[FadeIn(t,shift=UP*.08) for t in terms],lag_ratio=.1),run_time=1.6)
  self.play(Indicate(arrows[0],color=A,scale_factor=1.05),FadeIn(result),run_time=.8)
  self.until(17.7);self.play(FadeOut(VGroup(algebra,terms,result)),Transform(h,header('内積の大きさが、照合の点数。')),run_time=.5)
  # Bars and numbers are recalculated for every animation frame.
  score_panel=VGroup(T('照合の点数',1100,369,32,INK,SERIF,True));scores=VGroup();bar_group=VGroup()
  for j,(kv,c,row) in enumerate(zip(KEYS,COLORS,[450,610,770])):
   name=T(['KA = [2, 0]','KB = [0, 2]','KC = [−1, 1]'][j],1100,row-23,29,c,'DejaVu Sans',True)
   base=Line(pt(1190,row+50),pt(1570,row+50),color=LINE,stroke_width=1)
   zero=Line(pt(1380,row+31),pt(1380,row+68),color=MUTE,stroke_width=1)
   num=DecimalNumber(0,mob_class=Digits,num_decimal_places=2,font_size=41,color=c)
   num.add_updater(lambda m,dt,j=j,row=row:m.set_value(clean(float(query()@KEYS[j]))).move_to(pt(1710,row+36)))
   def fill(j=j,c=c,row=row):
    n=clean(float(query()@KEYS[j]));wid=abs(n)*47.5
    if wid<.01:return Dot(pt(1380,row+50),radius=.001,color=c).set_opacity(0)
    return RoundedRectangle(width=wid/120,height=22/120,corner_radius=.04,stroke_width=0,fill_color=c,fill_opacity=.9).move_to(pt(1380+n*47.5/2,row+50))
   bar=always_redraw(fill);score_panel.add(name,base,zero);scores.add(num);bar_group.add(bar)
  before=T('スケーリング・softmax の前',1400,881,24,MUTE)
  self.play(FadeIn(score_panel),FadeIn(scores),FadeIn(bar_group),FadeIn(before),run_time=1.0)
  self.until(23.7)
  # Rotate at fixed Euclidean norm sqrt(2): changes cannot be attributed to length.
  self.play(Transform(h,header('長さを固定して、向きだけ変える。')),run_time=.4)
  control=T('長さ √2 ≈ 1.41（固定）',610,875,25,BLUE)
  self.play(FadeIn(control),run_time=.3)
  self.play(angle.animate.set_value(0),run_time=3.4,rate_func=smooth)
  self.until(29.7)
  # Now only length changes. Ends at the interaction’s right-facing preset.
  self.play(Transform(h,header('向きを固定して、長さを変える。')),Transform(control,T('向き 0°（固定）',610,875,25,BLUE)),run_time=.5)
  self.play(length.animate.set_value(2),run_time=3.1,rate_func=smooth)
  self.until(35.7)
  self.play(Transform(h,header('ゼロの Query は、点数もゼロ。')),FadeOut(control),run_time=.5)
  self.play(length.animate.set_value(0),run_time=2.8,rate_func=smooth)
  self.until(41.7)
  # Stop live updaters before the closing transition.
  for mob in [qa,qlabel,qnums[0],qnums[1],*scores,*bar_group]:mob.clear_updaters()
  field=VGroup(axes,arrows,klabs,qa,qlabel,qnumbers,score_panel,scores,bar_group,before,note)
  self.play(FadeOut(field),Transform(h,header('点数と確率を、分けて考える。')),run_time=.5)
  close=VGroup(T('内積の点数 ≠ 確率',960,500,86,INK,SERIF),T('この先で、スケーリングと softmax。',960,658,35,MUTE),T('Q を動かしてみよう。',960,804,48,BLUE,SERIF),T('Vaswani et al. (2017), §3.2.1  ·  arxiv.org/abs/1706.03762',104,1032,21,MUTE,'DejaVu Sans',True))
  self.play(FadeIn(close,shift=UP*.08),run_time=.8)
  self.until(47.99)
