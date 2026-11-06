from manim import *
import numpy as np,json,os,math
config.background_color='#F6F3EC'
config.pixel_width=1920;config.pixel_height=1080;config.frame_rate=30
config.frame_width=16;config.frame_height=9
config.max_files_cached=500
P=os.path.dirname(__file__)
INK='#192A31';MUTE='#647172';BLUE='#2A55EB';ORANGE='#DD663C';SAGE='#4F8073';LINE='#CAD2CF'
SERIF='Noto Serif CJK JP';SANS='Noto Sans CJK JP'
COLS=[SAGE,MUTE,ORANGE,MUTE,BLUE];WORDS=['僕','は','本','を','読む'];WEIGHTS=np.array([.25,.05,.5,.05,.15])
VALUES=np.array([[.5,.8,.3,.5,.7,.25],[.2,.4,.9,.2,.4,.3],[.9,.3,.65,.95,.4,.75],[.3,.4,.15,.5,.2,.3],[.5,.6,.4,.8,.3,.65]])
def pt(x,y):return np.array([(x-960)/120,(540-y)/120,0])
def T(s,x,y,n=35,c=INK,font=SANS,left=False):
 m=Text(s,font=font,color=c,disable_ligatures=True)
 if m.height:m.scale_to_fit_height(n/120)
 m.move_to(pt(x,y),aligned_edge=LEFT if left else ORIGIN)
 return m

def bars(vals,x,y,c=BLUE,spacing=24,width=15,unit=100):
 g=VGroup()
 for j,v in enumerate(vals):
  h=max(.8,float(v)*unit);m=RoundedRectangle(width=width/120,height=h/120,corner_radius=min(width/240,h/240),stroke_width=0,fill_color=c,fill_opacity=1)
  m.move_to(pt(x+(j-(len(vals)-1)/2)*spacing,y-h/2));g.add(m)
 return g

def curve(x1,y1,x2,y2,c=BLUE,bend=100,width=2):
 return CubicBezier(pt(x1,y1),pt(x1,y1-bend),pt(x2,y2-bend),pt(x2,y2),color=c,stroke_width=width)

def header(k,title):return VGroup(T(k,105,187,22,BLUE,'DejaVu Sans',True),T(title,104,278,66,INK,SERIF,True))
def link(x1,y1,x2,y2,c=BLUE):return Arrow(pt(x1,y1),pt(x2,y2),buff=0,stroke_width=2,color=c,max_tip_length_to_length_ratio=.2)

class AttentionOverview(Scene):
 def until(self,t):
  if t>self.time:self.wait(t-self.time)
 def wipe(self,g,d=.5):
  self.play(FadeOut(g),run_time=d)
 def construct(self):
  mast=VGroup(T('ATTENTION IS ALL YOU NEED',104,79,21,INK,'DejaVu Sans',True),T('A VISUAL INTRODUCTION',1816,79,18,MUTE,'DejaVu Sans').align_to(pt(1816,79),RIGHT),Line(pt(104,119),pt(1816,119),color=LINE,stroke_width=1))
  self.add(mast)
  raw=json.load(open(P+'/narration_plan.json'))['segments']
  display=[
   'ひとつの言葉は、ひとつでは決まらない。','「読む」を手がかりに、文の中の情報を見比べる。','関係の強さを、情報を混ぜるための重みに変える。','重みをかけて足す。文脈を含んだ、新しい表現ができる。','同じ入力を、学習した3つの変換で Q・K・V に分ける。','Q と K を照合し、softmax で合計1の重みをつくる。','その重みで V を混ぜる。これが Attention の計算。','異なる射影で Attention を並列に計算する。','複数の出力を結合し、線形変換してまとめる。','単語の情報だけでは、語順の手がかりが足りない。','埋め込みに位置情報を足し、並び順を伝える。','元論文は、Encoder と Decoder を組み合わせたモデル。','Decoder は未来を隠し、Encoder の出力も参照する。','Attention に加え、FFN・残差接続・正規化を使う。','学習中は、未来を隠したまま各位置をまとめて計算できる。','生成時は、基本的に1トークンずつ続きを作る。','情報を選び、混ぜ、何層も更新する。これが Transformer。','ここからは、ひとつの仕組みを短く見て、自分で動かす。']
  caps=[T(s,960,970,32) for s in display]
  for c in caps:
   if c.width>14.5:c.scale_to_fit_width(14.5)
  caption=VGroup().set_z_index(20);state=[-2]
  def update_caption(m,dt):
   now=self.time;idx=next((i for i,z in enumerate(raw) if z['start']<=now<z['end']),-1)
   if idx!=state[0]:
    m.become(caps[idx].copy() if idx>=0 else VGroup());m.set_z_index(20);state[0]=idx
   if idx>=0:
    z=raw[idx];alpha=min(1,(now-z['start'])/.28,(z['end']-now)/.28);m.set_opacity(max(0,alpha))
  caption.add_updater(update_caption);self.add(caption)
  # 0–5: one word in a field of relationships.
  titles=VGroup(T('言葉は、',108,341,100,INK,SERIF,True),T('つながりで変わる。',108,479,100,INK,SERIF,True),T('Attention',110,665,66,BLUE,'Noto Serif Display',True))
  read=T('読む',1458,480,98,BLUE,SERIF)
  circ=Circle(radius=2.1,color=LINE,stroke_width=1).move_to(pt(1458,480))
  nodes=VGroup(*[Dot(pt(1458+211*np.cos(j*TAU/9),480+177*np.sin(j*TAU/9)),radius=.04,color=[BLUE,SAGE,ORANGE][j%3]) for j in range(9)])
  webs=VGroup(*[Line(nodes[j].get_center(),nodes[(j+3)%9].get_center(),color=LINE,stroke_width=.8) for j in range(9)])
  self.play(FadeIn(titles,shift=UP*.1),FadeIn(read),Create(circ),LaggedStart(*[FadeIn(n) for n in nodes],lag_ratio=.07),run_time=1.6)
  self.play(LaggedStart(*[Create(e) for e in webs],lag_ratio=.04),run_time=1.4)
  self.play(Rotate(VGroup(nodes,webs),angle=.13,about_point=pt(1458,480)),run_time=1.7,rate_func=linear)
  self.until(5)
  # 5–16.5: words, attention strengths, values.
  xs=[350,655,960,1265,1570];words=VGroup(*[T(w,x,565,76 if i<4 else 82,COLS[i] if i in [2,4] else INK,SERIF) for i,(w,x) in enumerate(zip(WORDS,xs))])
  h=header('01 / SELF-ATTENTION','「読む」は、どこを見る？')
  self.play(FadeOut(VGroup(titles,circ,nodes,webs)),Transform(read,words[4]),FadeIn(VGroup(*words[:4])),FadeIn(h),run_time=.8)
  self.remove(read);self.add(words[4])
  arcs=VGroup(*[curve(1570,500,x,500,COLS[j],120+(4-j)*18,3 if j==2 else 2) for j,x in enumerate(xs[:4])])
  self.until(7.2);self.play(LaggedStart(*[Create(q) for q in arcs],lag_ratio=.15),run_time=2.0)
  dots=VGroup(*[Dot(radius=.04,color=COLS[j]).move_to(arcs[j].get_start()) for j in range(4)])
  self.add(dots);self.play(*[MoveAlongPath(dots[j],arcs[j]) for j in range(4)],run_time=2.2,rate_func=linear)
  nums=VGroup(*[T(f'{WEIGHTS[j]:.2f}',x,675,39,COLS[j],'Noto Serif Display') for j,x in enumerate(xs)])
  vals=VGroup(*[bars(VALUES[j],x,809,COLS[j],24,15,94) for j,x in enumerate(xs)])
  note=T('図の重みとベクトルは説明用。学習済みモデルの測定値ではありません。',1808,1032,18,MUTE).align_to(pt(1808,1032),RIGHT)
  self.until(11.8);self.play(FadeIn(nums),LaggedStart(*[GrowFromEdge(v,DOWN) for v in vals],lag_ratio=.1),FadeIn(note),run_time=1.5)
  self.until(16.5)
  # 16.5–24.6: rescale every value and really add its components.
  h2=header('02 / WEIGHTED SUM','選んだ情報を、ひとつの表現へ。')
  self.play(Transform(h,h2),FadeOut(arcs),FadeOut(dots),FadeOut(note),FadeOut(nums),words.animate.shift(UP*1.45),*[(vals[j].animate.shift(UP*1.5)) for j in range(5)],run_time=.7)
  multipliers=VGroup(*[T(f'× {WEIGHTS[j]:.2f}',x,703,31,COLS[j],'Noto Serif Display') for j,x in enumerate(xs)])
  weighted=VGroup(*[bars(VALUES[j]*WEIGHTS[j],x,635,COLS[j],24,15,110) for j,x in enumerate(xs)])
  self.play(*[Transform(vals[j],weighted[j]) for j in range(5)],FadeIn(multipliers),run_time=1.6)
  self.until(19.2)
  pieces=VGroup();cum=np.zeros(6)
  for j in range(5):
   group=VGroup()
   for k in range(6):
    hh=float(VALUES[j,k]*WEIGHTS[j]*390);xx=960+(k-2.5)*44;bottom=812-cum[k]
    piece=RoundedRectangle(width=26/120,height=max(.01,hh/120),corner_radius=min(.04,hh/240),stroke_width=0,fill_color=COLS[j],fill_opacity=1).move_to(pt(xx,bottom-hh/2));group.add(piece);cum[k]+=hh
   pieces.add(group)
  self.play(*[ReplacementTransform(vals[j],pieces[j]) for j in range(5)],FadeOut(words),FadeOut(multipliers),run_time=2.5)
  outlabel=T('新しい「読む」の表現',960,876,30,BLUE)
  self.play(FadeIn(outlabel),run_time=.4);self.until(24.1);self.wipe(VGroup(h,pieces,outlabel),.5)
  # 25–42: Q K V are learned projections; real typeset equation.
  h=header('03 / QUERY · KEY · VALUE','選ぶための Q・K、集める V。')
  inp=bars([.5,.8,.3,.65,.4,.75],315,635,INK,29,18,150);il=T('入力 X',315,727,32,INK,SERIF)
  qgroups=VGroup();paths=VGroup()
  for j,(lab,c,y) in enumerate(zip(['Q','K','V'],[BLUE,ORANGE,SAGE],[430,600,770])):
   g=VGroup(T(lab,973,y-40,70,c,'Noto Serif Display'),bars([.4,.7,.45,.8,.5,.3],1105,y+6,c,24,14,95),T(['問い合わせ','照合する鍵','集める情報'][j],1070,y+65,29,c))
   qgroups.add(g);paths.add(CubicBezier(pt(420,590),pt(650,590),pt(710,y),pt(900,y),color=c,stroke_width=2))
  wl=VGroup(*[T(v,713,y-30,23,c,'DejaVu Sans') for v,y,c in zip(['WQ','WK','WV'],[430,600,770],[BLUE,ORANGE,SAGE])])
  self.play(FadeIn(h),FadeIn(inp),FadeIn(il),LaggedStart(*[Create(p) for p in paths],lag_ratio=.1),FadeIn(wl),FadeIn(qgroups),run_time=1.6)
  self.until(30)
  target=VGroup(*[g.copy().shift(pt(480+j*480,515)-pt(1060,[430,600,770][j])) for j,g in enumerate(qgroups)])
  self.play(FadeOut(VGroup(inp,il,paths,wl)),*[Transform(qgroups[j],target[j]) for j in range(3)],run_time=1.4)
  eq=SVGMobject(P+'/attention_equation.svg',color=INK).scale_to_fit_width(11.9).move_to(pt(960,776))
  sub=T('各 Query ごとに重みを計算し、Value の加重和をとる。',960,887,25,MUTE)
  self.play(Write(eq),run_time=2.2);self.play(FadeIn(sub),run_time=.4)
  self.until(36.6);self.play(Indicate(qgroups[2],color=SAGE,scale_factor=1.06),run_time=1.2)
  self.until(41.5);self.wipe(VGroup(h,qgroups,eq,sub),.5)
  # 42–54: distinct heads, concatenate, project.
  h=header('04 / MULTI-HEAD ATTENTION','見方を増やし、ひとつにまとめる。')
  inp=bars([.5,.8,.4,.65,.3,.7],250,645,INK,21,13,115);il=T('入力',250,720,30,INK,SERIF)
  hv=VGroup(*[bars([.45+j*.1,.8-j*.1,.4+j*.05,.65],615,y,c,28,17,110) for j,(y,c) in enumerate(zip([435,615,795],[BLUE,ORANGE,SAGE]))])
  hl=VGroup(*[T(f'Head {j+1}',430,y-30,27,c,'DejaVu Sans') for j,(y,c) in enumerate(zip([435,615,795],[BLUE,ORANGE,SAGE]))])
  paths=VGroup(*[CubicBezier(pt(280,615),pt(410,615),pt(410,y),pt(535,y),color=c,stroke_width=2) for y,c in zip([435,615,795],[BLUE,ORANGE,SAGE])])
  note=T('図は3ヘッドの模式図。論文の基本モデルでは8ヘッド。',960,887,23,MUTE)
  self.play(FadeIn(h),FadeIn(inp),FadeIn(il),FadeIn(hl),LaggedStart(*[Create(p) for p in paths],lag_ratio=.15),LaggedStart(*[GrowFromEdge(g,DOWN) for g in hv],lag_ratio=.1),FadeIn(note),run_time=1.8)
  self.until(48.2)
  targets=VGroup(*[bars([.45+j*.1,.8-j*.1,.4+j*.05,.65],1040+(j-1)*132,680,c,28,17,110) for j,c in enumerate([BLUE,ORANGE,SAGE])])
  self.play(*[Transform(hv[j],targets[j]) for j in range(3)],FadeOut(VGroup(inp,il,hl,paths)),run_time=1.8)
  cl=T('結合',1040,755,32,INK,SERIF);arr=link(1260,620,1430,620,BLUE);ln=T('線形変換',1345,552,25,MUTE);ov=bars([.65,.4,.8,.5,.68,.38],1605,680,BLUE,32,20,175);ol=T('新しい表現',1605,755,30,BLUE,SERIF)
  self.play(FadeIn(cl),Create(arr),FadeIn(ln),GrowFromEdge(ov,DOWN),FadeIn(ol),run_time=1)
  self.until(53.5);self.wipe(VGroup(h,hv,note,cl,arr,ln,ov,ol),.5)
  # 54–66: position signals are added, not concatenated.
  h=header('05 / POSITIONAL ENCODING','言葉に、位置という手がかりを。');xs=[350,655,960,1265,1570]
  words=VGroup(*[T(w,x,411,70,INK,SERIF) for w,x in zip(WORDS,xs)]);nums=VGroup(*[T(str(j+1),x,484,26,MUTE,'Noto Serif Display') for j,x in enumerate(xs)])
  emb=VGroup(*[bars(np.array([.4,.7,.5,.3,.65,.4])+j*.025,x,634,BLUE,22,13,100) for j,x in enumerate(xs)])
  waves=VGroup(*[ParametricFunction(lambda z,j=j,x=x:pt(x-79+z*160,745+23*np.sin(z*TAU+j*.72)),t_range=[0,1,.01],color=ORANGE,stroke_width=2) for j,x in enumerate(xs)])
  plus=VGroup(*[T('+',x,681,34,MUTE,'DejaVu Sans') for x in xs])
  note=T('元論文では sin / cos による位置符号化を使用。図は模式図。',960,887,23,MUTE)
  self.play(FadeIn(h),FadeIn(words),FadeIn(nums),FadeIn(emb),LaggedStart(*[Create(w) for w in waves],lag_ratio=.1),FadeIn(plus),FadeIn(note),run_time=1.8)
  self.until(60)
  targets=VGroup(*[bars(np.clip(np.array([.4,.7,.5,.3,.65,.4])+j*.025+.16*np.sin(np.arange(6)+j*.72),.1,1),x,823,BLUE,24,15,130) for j,x in enumerate(xs)])
  self.play(*[Transform(emb[j],targets[j]) for j in range(5)],*[waves[j].animate.move_to(targets[j]).set_opacity(0) for j in range(5)],FadeOut(plus),run_time=2.4)
  self.until(65.5);self.wipe(VGroup(h,words,nums,emb,waves,note),.5)
  # 66–85: architecture is a native Manim vector drawing.
  h=header('06 / THE ORIGINAL TRANSFORMER','読む塔と、続きをつくる塔。')
  def layer(x,y,w,label,c):
   return VGroup(T(label,x,y,31,c),Line(pt(x-w/2,y+27),pt(x+w/2,y+27),color=c,stroke_width=1.5))
  arch=VGroup(T('ENCODER',575,390,25,BLUE,'DejaVu Sans'),T('DECODER',1320,390,25,ORANGE,'DejaVu Sans'))
  for x,y,w,lab,c in [(575,724,365,'Self-Attention',BLUE),(575,590,365,'Feed-Forward',BLUE),(1320,791,410,'Masked Self-Attention',ORANGE),(1320,667,410,'Cross-Attention',ORANGE),(1320,543,410,'Feed-Forward',ORANGE)]:
   arch.add(layer(x,y,w,lab,c),T('残差接続 ＋ LayerNorm',x,y-48,21,MUTE))
  for x,y1,y2,c in [(343,500,765,BLUE),(1062,458,833,ORANGE)]:
   arch.add(VMobject(color=c,stroke_width=1.5).set_points_as_corners([pt(x+14,y1),pt(x,y1),pt(x,y2),pt(x+14,y2)]),T('× 6',x-41,(y1+y2)/2,27,c,'DejaVu Sans'))
  arch.add(link(770,698,770,624,BLUE),link(1543,761,1543,697,ORANGE),link(1543,637,1543,573,ORANGE),T('入力の埋め込み ＋ 位置',575,867,27,BLUE),T('1位置ずらした出力 ＋ 位置',1320,894,27,ORANGE),link(575,832,575,754,BLUE),link(1320,859,1320,821,ORANGE),T('線形層 → softmax → 次のトークン',1320,436,24,INK))
  cross=CubicBezier(pt(760,530),pt(930,530),pt(900,667),pt(1100,667),color=SAGE,stroke_width=2.5);kv=T('K / V',942,592,24,SAGE,'DejaVu Sans')
  self.play(FadeIn(h),LaggedStart(*[FadeIn(m) for m in arch],lag_ratio=.025),run_time=2)
  self.until(70);self.play(Create(cross),FadeIn(kv),run_time=1.3)
  traveler=Dot(radius=.045,color=SAGE);self.add(traveler);self.play(MoveAlongPath(traveler,cross),run_time=1.7,rate_func=linear)
  mask=T('未来の出力は見ない',1715,791,23,ORANGE)
  self.until(73);self.play(FadeIn(mask),run_time=.5);self.play(MoveAlongPath(traveler,cross),run_time=2.5,rate_func=linear)
  self.until(79);self.play(Indicate(arch[3],color=BLUE,scale_factor=1.03),run_time=1)
  self.until(84.5);self.wipe(VGroup(h,arch,cross,kv,traveler,mask),.5)
  # 85–99: a causal mask is parallel in training; generation is sequential.
  h=header('07 / TRAINING & GENERATION','並列に学び、順番に生成する。')
  label=VGroup(T('学習',530,412,41,BLUE,SERIF),T('生成',1430,412,41,ORANGE,SERIF),Line(pt(960,397),pt(960,873),color=LINE,stroke_width=1))
  cells=VGroup()
  for row in range(5):
   for col in range(5):
    cells.add(RoundedRectangle(width=49/120,height=49/120,corner_radius=.04,stroke_width=0,fill_color=BLUE if col<=row else LINE,fill_opacity=.7 if col<=row else .25).move_to(pt(379+col*65,510+row*65)))
  ml=T('過去・自分 ✓   未来 ×',530,856,25,MUTE)
  words=VGroup(*[T(w,1130+j*145,628,60,INK,SERIF).set_opacity(.12) for j,w in enumerate(WORDS)])
  gl=T('予測 → 追加 → 繰り返す',1430,753,30,ORANGE)
  note=T('通常の Self-Attention では、系列長の2乗に比例する計算が必要。',960,902,22,MUTE)
  self.play(FadeIn(h),FadeIn(label),LaggedStart(*[FadeIn(c) for c in cells],lag_ratio=.025),FadeIn(ml),FadeIn(words),FadeIn(gl),FadeIn(note),run_time=1.8)
  self.until(87.5);self.play(Indicate(cells,color=BLUE,scale_factor=1.025),run_time=1.6)
  self.until(92)
  arrows=VGroup()
  for j in range(5):
   self.play(words[j].animate.set_opacity(1).set_color(ORANGE),run_time=.4)
   if j>0:
    a=link(1130+(j-1)*145+48,628,1130+(j-1)*145+95,628,ORANGE);arrows.add(a);self.play(Create(a),words[j-1].animate.set_color(INK),run_time=.25)
   self.wait(.45)
  self.until(98.5);self.wipe(VGroup(h,label,cells,ml,words,gl,note,arrows),.5)
  # 99–110: close with a complete summary and source.
  end=VGroup(T('THE BIG PICTURE',105,218,22,BLUE,'DejaVu Sans',True),T('情報を選ぶ。',104,385,90,INK,SERIF,True),T('混ぜる。更新する。',104,506,90,INK,SERIF,True),T('Transformer',105,653,64,BLUE,'Noto Serif Display',True),T('次は、Q と K の照合へ。',105,786,34,MUTE,SANS,True),T('短い動画 → 自分で動かす → 変化を確かめる',105,850,30,MUTE,SANS,True))
  out=bars(WEIGHTS@VALUES,1460,657,BLUE,44,26,390)
  source=VGroup(T('Vaswani et al. (2017), Attention Is All You Need',104,1032,21,MUTE,'DejaVu Sans',True),T('arxiv.org/abs/1706.03762',1816,1032,21,MUTE,'DejaVu Sans').align_to(pt(1816,1032),RIGHT))
  self.play(FadeIn(end,shift=UP*.08),GrowFromEdge(out,DOWN),FadeIn(source),run_time=1.4)
  self.until(109.99)
