from manim import *
import numpy as np,json,os
config.background_color='#F6F3EC';config.pixel_width=1920;config.pixel_height=1080
config.frame_width=16;config.frame_height=9;config.frame_rate=30
P=os.path.dirname(__file__);INK='#192A31';MUTE='#647172';BLUE='#2A55EB';ORANGE='#B94B2C';LINE='#CAD2CF'
SERIF='Noto Serif CJK JP';SANS='Noto Sans CJK JP';COLORS=[BLUE,ORANGE];CENTERS=[530,1390]
KEYS=np.array([[2.,0.],[0.,2.],[-1.,1.]]);VALUES=np.array([[1.,0.],[0.,1.],[-1.,1.]])
def pt(x,y):return np.array([(x-960)/120,(540-y)/120,0])
def T(s,x,y,n=34,c=INK,font=SANS,left=False):
    t=Text(s,font=font,color=c,disable_ligatures=True)
    if t.height:t.scale_to_fit_height(n/120)
    return t.move_to(pt(x,y),aligned_edge=LEFT if left else ORIGIN)
def header(title):return VGroup(T('MULTI-HEAD ATTENTION / 06',104,187,22,BLUE,'DejaVu Sans',True),T(title,104,278,59,INK,SERIF,True))
def heads(q):
    result=[]
    for query in [np.array(q),np.array(q)[::-1]]:
        scores=KEYS@query;z=scores/np.sqrt(2);e=np.exp(z-z.max());w=e/e.sum();result.append((query,scores,w,w@VALUES))
    return result
def vec(v,d=3):return '['+', '.join(f'{x:.{d}f}' for x in v).replace('-', '−')+']'
class Digits(Text):
    def __init__(self,text,**kw):super().__init__(text,font='DejaVu Sans',**kw)

class MultiHeadAttention(Scene):
    def until(self,t):
        if t>self.time:self.wait(t-self.time)
        if os.environ.get('MULTIHEAD_PREVIEW_SNAPSHOTS'):
            self.renderer.update_frame(self)
            self.renderer.camera.get_image().save(P+f'/snapshot_{t:.2f}.png')
    def construct(self):
        mast=VGroup(T('ATTENTION IS ALL YOU NEED',104,79,21,INK,'DejaVu Sans',True),T('MULTI-HEAD',1816,79,18,MUTE,'DejaVu Sans').align_to(pt(1816,79),RIGHT),Line(pt(104,119),pt(1816,119),color=LINE,stroke_width=1))
        self.add(mast)
        plan=json.load(open(P+'/narration_plan.json'))['segments'];caps=[T(z['caption'],960,970,31) for z in plan]
        for c in caps:
            if c.width>14.5:c.scale_to_fit_width(14.5)
        cap=VGroup().set_z_index(30);state=[-2]
        def cap_update(m,dt):
            t=self.time;i=next((j for j,z in enumerate(plan) if z['start']<=t<z['end']),-1)
            if i!=state[0]:m.become(caps[i].copy() if i>=0 else VGroup()).set_z_index(30);state[0]=i
            if i>=0:m.set_opacity(max(0,min(1,(t-plan[i]['start'])/.25,(plan[i]['end']-t)/.25)))
        cap.add_updater(cap_update);self.add(cap)
        h=header('異なる投影で、複数の Attention。')
        opening=VGroup(T('Q / K / V',960,425,65,INK,'Noto Serif Display'),CubicBezier(pt(890,500),pt(890,565),pt(530,535),pt(530,625),color=BLUE,stroke_width=2.5),CubicBezier(pt(1030,500),pt(1030,565),pt(1390,535),pt(1390,625),color=ORANGE,stroke_width=2.5),T('それぞれの投影',960,567,28,MUTE),T('Head 1',530,704,69,BLUE,'Noto Serif Display'),T('Head 2',1390,704,69,ORANGE,'Noto Serif Display'),T('Attention',530,820,32,BLUE,'DejaVu Sans'),T('Attention',1390,820,32,ORANGE,'DejaVu Sans'))
        note=T('2次元・2Headの例（原論文の基本モデルは8Head）。表示は概数、計算は丸め前。',1816,1032,18,MUTE).align_to(pt(1816,1032),RIGHT)
        self.play(FadeIn(h),LaggedStart(*[FadeIn(m,shift=UP*.06) for m in opening],lag_ratio=.08),FadeIn(note),run_time=1.5)
        self.until(5.7)
        self.play(Transform(h,header('この例では、Q の成分を入れ替える。')),FadeOut(opening),run_time=.5)
        qx=ValueTracker(1);qy=ValueTracker(1)
        def q():return np.array([qx.get_value(),qy.get_value()])
        def current():return heads(q())
        titles=VGroup(*[T(f'Head {j+1}',x,390,44,c,'Noto Serif Display') for j,(x,c) in enumerate(zip(CENTERS,COLORS))])
        qstatic=VGroup();qnums=VGroup()
        for j,(x,c) in enumerate(zip(CENTERS,COLORS)):
            qstatic.add(T('Q =',x-255,490,34,c,'DejaVu Sans'),T('[',x-165,490,44,c,'DejaVu Sans'),T(']',x+235,490,44,c,'DejaVu Sans'),Text(',',font='DejaVu Sans',font_size=28,color=c).move_to(pt(x+28,502)))
            for k,dx in enumerate([-80,130]):
                n=DecimalNumber(1,mob_class=Digits,num_decimal_places=3,font_size=28,color=c)
                n.add_updater(lambda m,dt,j=j,k=k,x=x,dx=dx:m.set_value(float(current()[j][0][k])).scale_to_fit_height(37/120).move_to(pt(x+dx,490)));qnums.add(n)
        projection_labels=VGroup(T('そのまま',530,683,38,BLUE),T('第1成分と第2成分を交換',1390,683,34,ORANGE))
        shared=T('K と V は、両Headで同じ固定値',960,849,30,MUTE)
        equal=T('初期値 [1, 1] では、2つの Q は同じ',960,911,25,MUTE)
        self.play(FadeIn(titles),FadeIn(qstatic),FadeIn(qnums),FadeIn(projection_labels),FadeIn(shared),FadeIn(equal),run_time=1.1)
        self.until(11.7)
        self.play(Transform(h,header('Q が変わると、重みが分かれる。')),FadeOut(projection_labels),FadeOut(equal),Transform(shared,T('K と V は固定。各Headで √2 で割り、softmax。',960,901,26,MUTE)),run_time=.5)
        bars=VGroup();wnums=VGroup();barstatic=VGroup()
        for j,(x,c) in enumerate(zip(CENTERS,COLORS)):
            for k,dx in enumerate([-190,0,190]):
                xx=x+dx;barstatic.add(Line(pt(xx-65,800),pt(xx+65,800),color=LINE,stroke_width=1),T(['A','B','C'][k],xx,820,20,MUTE,'DejaVu Sans'))
                def bar(j=j,k=k,xx=xx,c=c):
                    hh=max(float(current()[j][2][k])*122,.01)
                    return RoundedRectangle(width=105/120,height=hh/120,corner_radius=min(.04,hh/300),fill_color=c,fill_opacity=.85,stroke_width=0).move_to(pt(xx,800-hh/2))
                bars.add(always_redraw(bar))
                n=DecimalNumber(0,mob_class=Digits,num_decimal_places=3,font_size=25,color=c)
                n.add_updater(lambda m,dt,j=j,k=k,xx=xx:m.set_value(float(current()[j][2][k])).scale_to_fit_height(33/120).move_to(pt(xx,800-float(current()[j][2][k])*122-36)));wnums.add(n)
        self.play(FadeIn(barstatic),FadeIn(bars),FadeIn(wnums),run_time=.6)
        self.play(qx.animate.set_value(2),qy.animate.set_value(0),run_time=3.1,rate_func=smooth)
        self.until(17.7)
        self.play(Transform(h,header('Head ごとに、Value を混ぜる。')),FadeOut(shared),run_time=.5)
        fixed=heads([2,0]);outputs=VGroup(*[T(vec(fixed[j][3]),x,907,48,c,'DejaVu Sans') for j,(x,c) in enumerate(zip(CENTERS,COLORS))])
        output_tags=VGroup(*[T('出力',x,855,23,c) for x,c in zip(CENTERS,COLORS)])
        # Keep the compact A/B/C labels separate from the output label below.
        self.play(FadeIn(output_tags),FadeIn(outputs,shift=DOWN*.08),run_time=.8)
        self.until(23.7)
        for m in [*qnums,*bars,*wnums]:m.clear_updaters()
        self.play(Transform(h,header('まず、出力をそのまま連結する。')),FadeOut(VGroup(titles,qstatic,qnums,bars,wnums,barstatic,output_tags)),Transform(outputs[0],T(vec(fixed[0][3]),600,493,55,BLUE,'DejaVu Sans')),Transform(outputs[1],T(vec(fixed[1][3]),1320,493,55,ORANGE,'DejaVu Sans')),run_time=.7)
        headtags=VGroup(T('Head 1',600,390,32,BLUE,'DejaVu Sans'),T('Head 2',1320,390,32,ORANGE,'DejaVu Sans'))
        concat_values=[*fixed[0][3],*fixed[1][3]];concat=VGroup(*[T(f'{v:.3f}'.replace('-','−'),x,742,62,BLUE if i<2 else ORANGE,'DejaVu Sans') for i,(v,x) in enumerate(zip(concat_values,[465,795,1125,1455]))])
        join=VGroup(CubicBezier(pt(600,552),pt(600,620),pt(630,620),pt(630,668),color=BLUE,stroke_width=2),CubicBezier(pt(1320,552),pt(1320,620),pt(1290,620),pt(1290,668),color=ORANGE,stroke_width=2),T('[',230,742,83,INK,'DejaVu Sans'),T(']',1690,742,83,INK,'DejaVu Sans'),T('Head 1 の2成分',630,848,29,BLUE),T('Head 2 の2成分',1290,848,29,ORANGE),T('連結：4成分',960,910,26,MUTE))
        self.play(FadeIn(headtags),Create(join),LaggedStart(*[FadeIn(m,shift=DOWN*.1) for m in concat],lag_ratio=.12),run_time=1.5)
        self.until(29.7)
        self.play(Transform(h,header('連結した結果を、出力へ変換する。')),FadeOut(VGroup(outputs,headtags,concat,join)),run_time=.5)
        projection=VGroup(T('この例の固定出力投影：対応する成分の平均',960,430,31,MUTE),T('第1成分',210,568,26,MUTE),T('第2成分',210,690,26,MUTE),T('(0.9182 − 0.1413) ÷ 2 ≈ 0.388',1040,568,46,INK,'DejaVu Sans'),T('(0.0684 + 0.9546) ÷ 2 ≈ 0.512',1040,690,46,INK,'DejaVu Sans'))
        final_value=T(vec((fixed[0][3]+fixed[1][3])/2),960,853,68,INK,'DejaVu Sans')
        self.play(FadeIn(projection),FadeIn(final_value,shift=DOWN*.1),run_time=1.2)
        self.until(35.7)
        self.play(Transform(h,header('入れ替えても、この平均は同じ。')),FadeOut(projection),run_time=.5)
        swap_title=T('Q : [2, 0] → [0, 2]',960,413,45,INK,'DejaVu Sans')
        swap_tags=VGroup(T('Head 1',600,544,32,BLUE,'DejaVu Sans'),T('Head 2',1320,544,32,ORANGE,'DejaVu Sans'))
        swap_outputs=VGroup(T(vec(fixed[0][3]),600,657,54,BLUE,'DejaVu Sans'),T(vec(fixed[1][3]),1320,657,54,ORANGE,'DejaVu Sans'))
        swap_note=T('この固定平均の例。一般の出力投影で同じになるとは限らない。',960,920,23,MUTE)
        self.play(FadeIn(swap_title),FadeIn(swap_tags),FadeIn(swap_outputs),FadeIn(swap_note),run_time=.7)
        swapped=heads([0,2]);self.play(Transform(swap_outputs[0],T(vec(swapped[0][3]),600,657,54,BLUE,'DejaVu Sans')),Transform(swap_outputs[1],T(vec(swapped[1][3]),1320,657,54,ORANGE,'DejaVu Sans')),run_time=1.4)
        self.until(41.7)
        self.play(Transform(h,header('実際の投影は、学習で決まる。')),FadeOut(VGroup(swap_title,swap_tags,swap_outputs,swap_note,final_value,note)),run_time=.5)
        learned=VGroup(T('各Headの Q/K/V の投影',620,505,39,BLUE),T('出力の投影',1400,505,46,ORANGE),T('いずれも、学習で決まる。',960,676,48,INK,SERIF),T('平均は、この例の設定。',960,823,38,MUTE),T('Head に「文法用」などの固定の役割は割り当てていません。',960,905,24,MUTE))
        self.play(FadeIn(learned),run_time=1.0);self.until(47.7)
        self.play(Transform(h,header('Q を動かして、Head を比べる。')),FadeOut(learned),run_time=.5)
        close=VGroup(T('複数の Attention',420,520,46,INK,SERIF),Arrow(pt(755,520),pt(885,520),buff=0,color=LINE,stroke_width=2),T('連結',1050,520,58,INK,SERIF),Arrow(pt(1205,520),pt(1335,520),buff=0,color=LINE,stroke_width=2),T('出力投影',1585,520,48,INK,SERIF),T('Head ごとの違いと、最後の出力を見比べよう。',960,740,38,BLUE,SERIF),T('Q の2成分を動かしてみよう。',960,860,36,MUTE),T('Vaswani et al. (2017), §3.2.2  ·  arxiv.org/abs/1706.03762',104,1032,21,MUTE,'DejaVu Sans',True))
        self.play(FadeIn(close,shift=UP*.08),run_time=.9);self.until(53.99)
