from manim import *
import numpy as np, json, os
config.background_color='#F6F3EC'; config.pixel_width=1920; config.pixel_height=1080
config.frame_width=16; config.frame_height=9; config.frame_rate=30
P=os.path.dirname(__file__)
INK='#192A31'; MUTE='#647172'; BLUE='#2A55EB'; LINE='#CAD2CF'
A='#B94B2C'; B='#417065'; C='#566567'; COLORS=[A,B,C]
SERIF='Noto Serif CJK JP'; SANS='Noto Sans CJK JP'
Z=np.array([2.,2.,0.])/np.sqrt(2); W=np.exp(Z-Z.max()); W/=W.sum()
def pt(x,y):return np.array([(x-960)/120,(540-y)/120,0])
def T(s,x,y,n=34,c=INK,font=SANS,left=False):
    t=Text(s,font=font,color=c,disable_ligatures=True)
    if t.height:t.scale_to_fit_height(n/120)
    return t.move_to(pt(x,y),aligned_edge=LEFT if left else ORIGIN)
def header(title):return VGroup(T('WEIGHTED VALUES / 03',104,187,22,BLUE,'DejaVu Sans',True),T(title,104,278,62,INK,SERIF,True))
class Digits(Text):
    def __init__(self,text,**kw):super().__init__(text,font='DejaVu Sans',**kw)

class ValueMixing(Scene):
    def until(self,t):
        if t>self.time:self.wait(t-self.time)
        if os.environ.get('VALUE_PREVIEW_SNAPSHOTS'):
            self.renderer.update_frame(self)
            self.renderer.camera.get_image().save(P+f'/snapshot_{t:.2f}.png')
    def construct(self):
        mast=VGroup(T('ATTENTION IS ALL YOU NEED',104,79,21,INK,'DejaVu Sans',True),T('VALUE',1816,79,18,MUTE,'DejaVu Sans').align_to(pt(1816,79),RIGHT),Line(pt(104,119),pt(1816,119),color=LINE,stroke_width=1))
        self.add(mast)
        plan=json.load(open(P+'/narration_plan.json'))['segments']; caps=[T(z['caption'],960,970,31) for z in plan]
        for c in caps:
            if c.width>14.5:c.scale_to_fit_width(14.5)
        caption=VGroup().set_z_index(30);state=[-2]
        def cap_update(m,dt):
            t=self.time;i=next((j for j,z in enumerate(plan) if z['start']<=t<z['end']),-1)
            if i!=state[0]:m.become(caps[i].copy() if i>=0 else VGroup()).set_z_index(30);state[0]=i
            if i>=0:m.set_opacity(max(0,min(1,(t-plan[i]['start'])/.25,(plan[i]['end']-t)/.25)))
        caption.add_updater(cap_update);self.add(caption)
        h=header('重みで、Value を混ぜる。')
        intro=VGroup(T('入力の表現',450,525,47,INK,SERIF),T('学習した変換',960,525,40,MUTE),T('V',1460,525,112,C,'Noto Serif Display'),Arrow(pt(650,525),pt(740,525),buff=0,color=LINE,stroke_width=2),Arrow(pt(1180,525),pt(1320,525),buff=0,color=LINE,stroke_width=2),T('Value / 混ぜる情報',1460,672,30,C),T('重みは「どれだけ」、Value は「何を」。',960,827,40,BLUE,SERIF))
        self.play(FadeIn(h),LaggedStart(*[FadeIn(m,shift=UP*.08) for m in intro],lag_ratio=.08),run_time=1.5)
        self.until(5.7)
        self.play(FadeOut(intro),Transform(h,header('前の重みで、3つの Value を混ぜる。')),run_time=.5)
        XS=[560,960,1360]
        labels=VGroup(*[T(n,x,405,34,c,'DejaVu Sans') for n,x,c in zip(['A','B','C'],XS,COLORS)])
        weights=VGroup(*[T(f'{w:.4f}',x,515,68,BLUE,'DejaVu Sans') for w,x in zip(W,XS)])
        weight_tag=T('重み',260,515,30,MUTE)
        vectors=VGroup(*[T(v,x,715,67,c,'DejaVu Sans') for v,x,c in zip(['[1, 0]','[0, 1]','[−1, 1]'],XS,COLORS)])
        value_tag=T('Value',260,715,30,MUTE,'DejaVu Sans')
        fixed_note=T('重み = softmax([2, 2, 0] / √2)   を固定',960,862,29,MUTE)
        note=T('手で設定した2次元の例。表示は概数、計算には丸め前の値を使用。',1816,1032,18,MUTE).align_to(pt(1816,1032),RIGHT)
        self.play(FadeIn(labels),FadeIn(weight_tag),FadeIn(weights),FadeIn(value_tag),LaggedStart(*[FadeIn(m) for m in vectors],lag_ratio=.15),FadeIn(fixed_note),FadeIn(note),run_time=1.4)
        self.until(11.7)
        self.play(Transform(h,header('各 Value に、重みを掛ける。')),FadeOut(VGroup(labels,weights,weight_tag,vectors,value_tag,fixed_note)),run_time=.5)
        products=VGroup()
        for name,w,v,prod,y,c in zip(['A','B','C'],W,['[1, 0]','[0, 1]','[−1, 1]'],['[0.4458, 0]','[0, 0.4458]','[−0.1084, 0.1084]'],[465,630,795],COLORS):
            products.add(VGroup(T(name,220,y,32,c,'DejaVu Sans'),T(f'{w:.4f}',440,y,46,BLUE,'DejaVu Sans'),T('×',650,y,38,MUTE,'DejaVu Sans'),T(v,850,y,45,c,'DejaVu Sans'),T('≈',1080,y,37,MUTE,'DejaVu Sans'),T(prod,1435,y,44,c,'DejaVu Sans')))
        self.play(LaggedStart(*[FadeIn(m,shift=RIGHT*.1) for m in products],lag_ratio=.25),run_time=1.7)
        self.until(17.7)
        self.play(Transform(h,header('成分ごとに、足す。')),FadeOut(products),run_time=.5)
        colheads=VGroup(T('第1成分',780,390,29,MUTE),T('第2成分',1250,390,29,MUTE))
        table=VGroup()
        for name,nums,y,c in zip(['A','B','C'],[['0.4458','0'],['0','0.4458'],['−0.1084','0.1084']],[480,590,700],COLORS):
            table.add(VGroup(T(name,410,y,31,c,'DejaVu Sans'),T(nums[0],780,y,51,c,'DejaVu Sans'),T(nums[1],1250,y,51,c,'DejaVu Sans')))
        rule=Line(pt(560,760),pt(1470,760),color=LINE,stroke_width=2)
        sums=VGroup(T('出力 ≈',410,842,36,BLUE),T('0.3374',780,842,65,BLUE,'DejaVu Sans'),T('0.5542',1250,842,65,BLUE,'DejaVu Sans'))
        self.play(FadeIn(colheads),LaggedStart(*[FadeIn(m) for m in table],lag_ratio=.15),run_time=1.0)
        self.play(Create(rule),FadeIn(sums,shift=DOWN*.1),run_time=.8)
        self.until(23.7)
        self.play(Transform(h,header('横の成分を変えると、横に動く。')),FadeOut(VGroup(colheads,table,rule,sums)),run_time=.5)
        cx=ValueTracker(-1);cy=ValueTracker(1)
        def vc():return np.array([cx.get_value(),cy.get_value()])
        def out():return W[0]*np.array([1.,0.])+W[1]*np.array([0.,1.])+W[2]*vc()
        ox,oy,scale=605,655,100
        xy=lambda v:pt(ox+v[0]*scale,oy-v[1]*scale)
        axes=VGroup()
        for j in [-2,-1,0,1,2]:
            axes.add(Line(xy([-2.2,j]),xy([2.2,j]),color=LINE if j else MUTE,stroke_width=.7 if j else 1.3),Line(xy([j,-2.2]),xy([j,2.2]),color=LINE if j else MUTE,stroke_width=.7 if j else 1.3))
            if j:axes.add(T(str(j),ox+j*scale,oy+24,18,MUTE,'DejaVu Sans'),T(str(j),ox-24,oy-j*scale,18,MUTE,'DejaVu Sans'))
        axes.add(T('第1成分',900,oy+60,21,MUTE),T('第2成分',ox,oy-270,21,MUTE))
        hull=always_redraw(lambda:Polygon(xy([1,0]),xy([0,1]),xy(vc()),color=LINE,stroke_width=1,fill_color=BLUE,fill_opacity=.04))
        fixed_arrows=VGroup(Arrow(xy([0,0]),xy([1,0]),buff=0,color=A,stroke_width=3,max_tip_length_to_length_ratio=.15),Arrow(xy([0,0]),xy([0,1]),buff=0,color=B,stroke_width=3,max_tip_length_to_length_ratio=.15))
        fixed_labels=VGroup(T('VA',750,674,27,A,'DejaVu Sans'),T('VB',577,525,27,B,'DejaVu Sans'))
        ca=always_redraw(lambda:Arrow(xy([0,0]),xy(vc()),buff=0,color=C,stroke_width=3,max_tip_length_to_length_ratio=.13))
        cl=always_redraw(lambda:T('VC',ox+vc()[0]*scale+27,oy-vc()[1]*scale-26,27,C,'DejaVu Sans'))
        oa=always_redraw(lambda:Arrow(xy([0,0]),xy(out()),buff=0,color=BLUE,stroke_width=5,max_tip_length_to_length_ratio=.22))
        od=always_redraw(lambda:Dot(xy(out()),radius=.055,color=BLUE))
        ol=always_redraw(lambda:T('出力',ox+out()[0]*scale+35,oy-out()[1]*scale-40,26,BLUE))
        panel=VGroup(T('Value C',1415,413,37,C,'DejaVu Sans'),T('出力',1415,650,37,BLUE),T('重みは固定',1415,850,28,MUTE))
        dynamic=VGroup()
        for fun,y,c in [(vc,505,C),(out,742,BLUE)]:
            panel.add(T('[',1165,y,51,c,'DejaVu Sans'),T(']',1685,y,51,c,'DejaVu Sans'),Text(',',font='DejaVu Sans',font_size=34,color=c).move_to(pt(1420,y+15)))
            for j,x in enumerate([1295,1545]):
                num=DecimalNumber(0,mob_class=Digits,num_decimal_places=3,font_size=37,color=c)
                num.add_updater(lambda m,dt,j=j,x=x,y=y,fun=fun:m.set_value(float(fun()[j])).scale_to_fit_height(44/120).move_to(pt(x,y)))
                dynamic.add(num)
        control=T('第1成分だけを変更',605,906,27,BLUE)
        self.play(Create(axes),FadeIn(hull),FadeIn(fixed_arrows),FadeIn(fixed_labels),FadeIn(ca),FadeIn(cl),FadeIn(oa),FadeIn(od),FadeIn(ol),FadeIn(panel),FadeIn(dynamic),FadeIn(control),run_time=1.0)
        self.play(cx.animate.set_value(2),run_time=3.1,rate_func=smooth)
        self.until(29.7)
        self.play(Transform(h,header('縦の成分を変えると、縦に動く。')),Transform(control,T('第2成分だけを変更',605,906,27,BLUE)),run_time=.5)
        self.play(cy.animate.set_value(-2),run_time=3.2,rate_func=smooth)
        self.until(35.7)
        for m in [hull,ca,cl,oa,od,ol,*dynamic]:m.clear_updaters()
        field=VGroup(axes,hull,fixed_arrows,fixed_labels,ca,cl,oa,od,ol,panel,dynamic,control)
        self.play(Transform(h,header('動く量も、重みに比例する。')),FadeOut(field),run_time=.5)
        # Same scale: Value C y changes by -3; output y changes by -3*w_C.
        delta=3*float(W[2]);y0=470;unit=105
        change=VGroup(T('Value C の縦方向',580,397,32,C),T('出力の縦方向',1310,397,32,BLUE),Arrow(pt(500,y0),pt(500,y0+3*unit),buff=0,color=C,stroke_width=4,max_tip_length_to_length_ratio=.12),Arrow(pt(1220,y0),pt(1220,y0+delta*unit),buff=0,color=BLUE,stroke_width=4,max_tip_length_to_length_ratio=.28),T('−3',720,590,65,C,'DejaVu Sans'),T('≈ −0.325',1480,590,62,BLUE,'DejaVu Sans'),T('0.108383… × (−3)',1370,710,33,MUTE,'DejaVu Sans'),T('Δ 出力 = 重み C × Δ Value C',960,865,37,INK),T('矢印は同じ縮尺',500,825,23,MUTE))
        self.play(LaggedStart(*[FadeIn(m,shift=UP*.04) for m in change],lag_ratio=.07),run_time=1.4)
        self.until(41.7)
        self.play(Transform(h,header('重みは、混ぜる比率。')),FadeOut(change),FadeOut(note),run_time=.5)
        close=VGroup(T('重み',480,500,71,BLUE,SERIF),T('×',760,500,55,MUTE,'DejaVu Sans'),T('Value',1060,500,81,C,'Noto Serif Display'),Arrow(pt(1300,500),pt(1430,500),buff=0,color=LINE,stroke_width=2),T('足す',1620,500,64,INK,SERIF),T('重みを固定しても、Value が変われば出力が変わる。',960,680,34,MUTE),T('Value C を動かしてみよう。',960,817,46,BLUE,SERIF),T('Vaswani et al. (2017), §3.2.1  ·  arxiv.org/abs/1706.03762',104,1032,21,MUTE,'DejaVu Sans',True))
        self.play(FadeIn(close,shift=UP*.08),run_time=.9)
        self.until(47.99)
