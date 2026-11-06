from manim import *
import numpy as np, json, os

config.background_color = '#F6F3EC'
config.pixel_width = 1920
config.pixel_height = 1080
config.frame_width = 16
config.frame_height = 9
config.frame_rate = 30
P = os.path.dirname(__file__)
INK='#192A31'; MUTE='#647172'; BLUE='#2A55EB'; LINE='#CAD2CF'
COLORS=['#B94B2C','#417065','#566567']
SERIF='Noto Serif CJK JP'; SANS='Noto Sans CJK JP'
XS=[560,960,1360]

def pt(x,y): return np.array([(x-960)/120,(540-y)/120,0])
def T(s,x,y,n=34,c=INK,font=SANS,left=False):
    t=Text(s,font=font,color=c,disable_ligatures=True)
    if t.height: t.scale_to_fit_height(n/120)
    return t.move_to(pt(x,y),aligned_edge=LEFT if left else ORIGIN)
def header(title):
    return VGroup(T('SCORES → WEIGHTS / 02',104,187,22,BLUE,'DejaVu Sans',True),T(title,104,278,62,INK,SERIF,True))
class Digits(Text):
    def __init__(self,text,**kw): super().__init__(text,font='DejaVu Sans',**kw)
def stable_softmax(z):
    e=np.exp(z-np.max(z)); return e/e.sum()

class SoftmaxWeights(Scene):
    def until(self,t):
        if t>self.time: self.wait(t-self.time)
        if os.environ.get('SOFTMAX_PREVIEW_SNAPSHOTS'):
            self.renderer.update_frame(self)
            self.renderer.camera.get_image().save(P+f'/snapshot_{t:.2f}.png')
    def construct(self):
        mast=VGroup(T('ATTENTION IS ALL YOU NEED',104,79,21,INK,'DejaVu Sans',True),T('SOFTMAX',1816,79,18,MUTE,'DejaVu Sans').align_to(pt(1816,79),RIGHT),Line(pt(104,119),pt(1816,119),color=LINE,stroke_width=1))
        self.add(mast)
        plan=json.load(open(P+'/narration_plan.json'))['segments']
        caps=[T(z['caption'],960,970,31) for z in plan]
        for c in caps:
            if c.width>14.5: c.scale_to_fit_width(14.5)
        caption=VGroup().set_z_index(30); state=[-2]
        def update_caption(m,dt):
            t=self.time; i=next((j for j,z in enumerate(plan) if z['start']<=t<z['end']),-1)
            if i!=state[0]:
                m.become(caps[i].copy() if i>=0 else VGroup()).set_z_index(30); state[0]=i
            if i>=0: m.set_opacity(max(0,min(1,(t-plan[i]['start'])/.25,(plan[i]['end']-t)/.25)))
        caption.add_updater(update_caption); self.add(caption)
        h=header('点数を、混ぜるための重みに。')
        labels=VGroup(*[T(name,x,460,35,c,'DejaVu Sans') for name,x,c in zip(['A','B','C'],XS,COLORS)])
        raw=VGroup(*[T(str(v),x,615,108,c,'Noto Serif Display') for v,x,c in zip([2,2,0],XS,COLORS)])
        raw_label=T('内積の点数',960,790,34,MUTE)
        note=T('手で設定した2次元の例。図の小数は概数、計算は丸めずに実行。',1816,1032,18,MUTE).align_to(pt(1816,1032),RIGHT)
        self.play(FadeIn(h),LaggedStart(*[FadeIn(m,shift=UP*.1) for m in labels],lag_ratio=.1),LaggedStart(*[FadeIn(m,shift=UP*.12) for m in raw],lag_ratio=.1),FadeIn(raw_label),FadeIn(note),run_time=1.4)
        self.until(5.7)

        # The first operation uses d_k, not the number of keys: here d_k=2.
        self.play(Transform(h,header('まず、点数の大きさを整える。')),FadeOut(raw_label),*[m.animate.move_to(pt(x,370)) for m,x in zip(labels,XS)],*[Transform(m,T(str(v),x,455,60,c,'DejaVu Sans')) for m,v,x,c in zip(raw,[2,2,0],XS,COLORS)],run_time=.5)
        scale_arrows=VGroup(*[VGroup(Arrow(pt(x,505),pt(x,590),buff=0,color=LINE,stroke_width=2),T('÷ √2',x+94,548,29,MUTE)) for x in XS])
        scaled=VGroup(*[T(v,x,665,73,c,'DejaVu Sans') for v,x,c in zip(['1.414','1.414','0'],XS,COLORS)])
        dimension=T('dₖ = 2     →     √dₖ = √2',960,823,39,INK,'DejaVu Sans')
        self.play(LaggedStart(*[FadeIn(m) for m in scale_arrows],lag_ratio=.15),LaggedStart(*[FadeIn(m,shift=DOWN*.1) for m in scaled],lag_ratio=.15),FadeIn(dimension),run_time=1.5)
        self.until(11.7)

        self.play(Transform(h,header('指数関数で、正の値へ。')),FadeOut(raw),FadeOut(scale_arrows),FadeOut(dimension),*[m.animate.scale(.82).move_to(pt(x,455)) for m,x in zip(scaled,XS)],run_time=.5)
        exp_arrows=VGroup(*[VGroup(Arrow(pt(x,505),pt(x,590),buff=0,color=LINE,stroke_width=2),T('exp',x+92,548,30,MUTE,'DejaVu Sans')) for x in XS])
        exp_values=VGroup(*[T(v,x,665,73,c,'DejaVu Sans') for v,x,c in zip(['4.113','4.113','1'],XS,COLORS)])
        exp_label=T('exp(z) = eᶻ',960,823,43,INK,'DejaVu Sans')
        self.play(LaggedStart(*[FadeIn(m) for m in exp_arrows],lag_ratio=.13),LaggedStart(*[FadeIn(m,shift=DOWN*.1) for m in exp_values],lag_ratio=.13),FadeIn(exp_label),run_time=1.5)
        self.until(17.7)

        self.play(Transform(h,header('合計で割れば、重みになる。')),FadeOut(scaled),FadeOut(exp_arrows),FadeOut(exp_label),*[m.animate.scale(.82).move_to(pt(x,455)) for m,x in zip(exp_values,XS)],run_time=.5)
        frac_lines=VGroup(*[Line(pt(x-150,502),pt(x+150,502),color=c,stroke_width=2) for x,c in zip(XS,COLORS)])
        denominators=VGroup(*[T('9.227',x,551,43,MUTE,'DejaVu Sans') for x in XS])
        norm_results=VGroup(*[T(v,x,725,82,BLUE,'DejaVu Sans') for v,x in zip(['0.446','0.446','0.108'],XS)])
        equals=VGroup(*[T('≈',x,640,36,MUTE,'DejaVu Sans') for x in XS])
        # Exact denominator is 9.226500757565854; display rounds to 9.227.
        sum_note=T('合計 ≈ 9.227      /      重みの合計 = 1',960,850,31,MUTE)
        self.play(Create(frac_lines),FadeIn(denominators),FadeIn(sum_note),run_time=.7)
        self.play(FadeIn(equals),LaggedStart(*[FadeIn(m,shift=DOWN*.1) for m in norm_results],lag_ratio=.16),run_time=1.0)
        self.until(23.7)

        self.play(Transform(h,header('点数0でも、重みは0ではない。')),FadeOut(VGroup(labels,exp_values,frac_lines,denominators,norm_results,equals,sum_note)),run_time=.5)
        av=ValueTracker(2); bv=ValueTracker(2); cv=ValueTracker(0); divisor=ValueTracker(np.sqrt(2))
        def values(): return np.array([av.get_value(),bv.get_value(),cv.get_value()])
        def weights(): return stable_softmax(values()/divisor.get_value())
        chart_static=VGroup()
        numbers=VGroup(); bars=VGroup(); raw_nums=VGroup()
        for j,(x,c,name) in enumerate(zip(XS,COLORS,['A','B','C'])):
            chart_static.add(T(name,x,390,33,c,'DejaVu Sans'),T('点数',x-55,447,26,MUTE),Line(pt(x-115,850),pt(x+115,850),color=LINE,stroke_width=1))
            rn=DecimalNumber(0,mob_class=Digits,num_decimal_places=1,font_size=29,color=c)
            rn.add_updater(lambda m,dt,j=j,x=x:m.set_value(values()[j]).move_to(pt(x+43,447)))
            raw_nums.add(rn)
            def draw_bar(j=j,x=x):
                hh=max(float(weights()[j])*310,.01)
                return RoundedRectangle(width=180/120,height=hh/120,corner_radius=min(.05,hh/300),stroke_width=0,fill_color=BLUE,fill_opacity=.86).move_to(pt(x,850-hh/2))
            bars.add(always_redraw(draw_bar))
            num=DecimalNumber(0,mob_class=Digits,num_decimal_places=3,font_size=43,color=BLUE)
            num.add_updater(lambda m,dt,j=j,x=x:m.set_value(float(weights()[j])).move_to(pt(x,850-float(weights()[j])*310-42)))
            numbers.add(num)
        mode=T('√2 で割る',365,898,29,MUTE)
        sum_one=T('重みの合計 = 1',1500,898,29,INK)
        self.play(FadeIn(chart_static),FadeIn(raw_nums),FadeIn(bars),FadeIn(numbers),FadeIn(mode),FadeIn(sum_one),run_time=1.0)
        zero_note=T('点数0 → 重み 約0.108',1360,550,26,COLORS[2])
        self.play(FadeIn(zero_note),run_time=.5)
        self.until(29.7)

        self.play(Transform(h,header('一つの点数で、全体が変わる。')),FadeOut(zero_note),run_time=.5)
        self.play(av.animate.set_value(4),run_time=3.2,rate_func=smooth)
        self.until(35.7)

        self.play(Transform(h,header('割らない場合と、比べてみる。')),Transform(mode,T('比較用：スケーリングなし',480,898,28,MUTE)),run_time=.5)
        self.play(divisor.animate.set_value(1),run_time=3.2,rate_func=smooth)
        self.until(41.7)

        self.play(Transform(h,header('同じ点数なら、同じ重み。')),Transform(mode,T('√2 で割る',365,898,29,MUTE)),run_time=.5)
        self.play(divisor.animate.set_value(np.sqrt(2)),run_time=.7)
        self.play(av.animate.set_value(2),cv.animate.set_value(2),run_time=2.5,rate_func=smooth)
        thirds=T('それぞれ正確に 1/3（表示は四捨五入）',960,510,25,MUTE)
        self.play(FadeIn(thirds),run_time=.4)
        self.until(47.7)

        for m in [*numbers,*bars,*raw_nums]: m.clear_updaters()
        self.play(Transform(h,header('重みを、自分の手で確かめる。')),FadeOut(VGroup(chart_static,raw_nums,bars,numbers,mode,sum_one,thirds,note)),run_time=.5)
        closing=VGroup(T('点数',480,497,65,INK,SERIF),T('softmax',960,497,69,BLUE,'Noto Serif Display'),T('重み',1440,497,65,INK,SERIF),Arrow(pt(625,497),pt(750,497),buff=0,color=LINE,stroke_width=2),Arrow(pt(1170,497),pt(1300,497),buff=0,color=LINE,stroke_width=2),T('参照先を混ぜる比率。正解の確率ではありません。',960,670,34,MUTE),T('次は、点数 A・B・C を動かしてみよう。',960,817,43,BLUE,SERIF),T('Vaswani et al. (2017), §3.2.1  ·  arxiv.org/abs/1706.03762',104,1032,21,MUTE,'DejaVu Sans',True))
        self.play(FadeIn(closing,shift=UP*.1),run_time=1)
        self.until(53.99)
