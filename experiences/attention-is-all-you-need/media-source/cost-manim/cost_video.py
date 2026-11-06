from manim import *
import numpy as np,json,os
config.background_color='#F6F3EC';config.pixel_width=1920;config.pixel_height=1080
config.frame_width=16;config.frame_height=9;config.frame_rate=30
P=os.path.dirname(__file__);INK='#192A31';MUTE='#647172';BLUE='#2A55EB';ORANGE='#B94B2C';LINE='#CAD2CF'
SERIF='Noto Serif CJK JP';SANS='Noto Sans CJK JP'
def pt(x,y):return np.array([(x-960)/120,(540-y)/120,0])
def T(s,x,y,n=34,c=INK,font=SANS,left=False):
    t=Text(s,font=font,color=c,disable_ligatures=True)
    if t.height:t.scale_to_fit_height(n/120)
    return t.move_to(pt(x,y),aligned_edge=LEFT if left else ORIGIN)
def header(title):return VGroup(T('SEQUENCE LENGTH / 07',104,187,22,BLUE,'DejaVu Sans',True),T(title,104,278,59,INK,SERIF,True))
def grid(cx,cy,size,num,c):
    g=VGroup(Rectangle(width=size/120,height=size/120,stroke_color=c,stroke_width=2,fill_color=c,fill_opacity=.055).move_to(pt(cx,cy)))
    for k in range(1,num):
        x=cx-size/2+k*size/num;y=cy-size/2+k*size/num
        g.add(Line(pt(x,cy-size/2),pt(x,cy+size/2),color=c,stroke_width=.8,stroke_opacity=.32),Line(pt(cx-size/2,y),pt(cx+size/2,y),color=c,stroke_width=.8,stroke_opacity=.32))
    return g
class Digits(Text):
    def __init__(self,text,**kw):super().__init__(text,font='DejaVu Sans',**kw)
class SequenceCost(Scene):
    def until(self,t):
        if t>self.time:self.wait(t-self.time)
        if os.environ.get('COST_PREVIEW_SNAPSHOTS'):
            self.renderer.update_frame(self);self.renderer.camera.get_image().save(P+f'/snapshot_{t:.2f}.png')
    def construct(self):
        mast=VGroup(T('ATTENTION IS ALL YOU NEED',104,79,21,INK,'DejaVu Sans',True),T('COMPUTATIONAL COMPLEXITY',1816,79,18,MUTE,'DejaVu Sans').align_to(pt(1816,79),RIGHT),Line(pt(104,119),pt(1816,119),color=LINE,stroke_width=1))
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
        h=header('長さ2倍で、位置の組は4倍。')
        left=grid(470,620,220,4,BLUE);right=grid(1360,620,440,8,BLUE)
        opening=VGroup(T('n × n',470,434,44,BLUE,'DejaVu Sans'),T('2n × 2n',1360,363,44,BLUE,'DejaVu Sans'),T('n²',470,830,64,BLUE,'DejaVu Sans'),T('4n²',1360,892,57,BLUE,'DejaVu Sans'),Arrow(pt(715,620),pt(1000,620),buff=0,color=LINE,stroke_width=2),T('縦も横も2倍',860,557,27,MUTE))
        self.play(FadeIn(h),Create(left),FadeIn(opening),run_time=1)
        self.play(TransformFromCopy(left,right),run_time=1.5)
        quadrant=Rectangle(width=220/120,height=220/120,stroke_color=BLUE,stroke_width=2,fill_color=BLUE,fill_opacity=.14).move_to(pt(1250,510))
        self.play(FadeIn(quadrant),run_time=.6);self.until(5.7)
        self.play(Transform(h,header('論文 Table 1 の、主要項を比べる。')),FadeOut(VGroup(left,right,opening,quadrant)),run_time=.5)
        formula=VGroup(T('Self-attention',530,465,43,BLUE,'DejaVu Sans'),T('再帰層（RNN）',1390,465,43,ORANGE),T('O(n²d)',530,624,104,BLUE,'DejaVu Sans'),T('O(nd²)',1390,624,104,ORANGE,'DejaVu Sans'),T('n : 系列長',595,832,38,INK),T('d : 表現次元',1325,832,38,INK),T('1層あたりの比較。定数係数や他の処理は省く。',960,906,27,MUTE))
        self.play(LaggedStart(*[FadeIn(m,shift=UP*.05) for m in formula],lag_ratio=.12),run_time=1.2);self.until(11.7)
        self.play(Transform(h,header('初期値では、比は4分の1。')),FadeOut(formula),run_time=.5)
        tracker=ValueTracker(128);d_value=[512]
        def data():
            n=int(round(tracker.get_value()/16))*16;d=d_value[0];return n,d,n*n,n*n*d,n*d*d,n/d
        allnums=VGroup();labels=VGroup()
        def num(getter,x,y,size=43,color=INK,dec=0):
            m=DecimalNumber(getter(),mob_class=Digits,num_decimal_places=dec,group_with_commas=True,font_size=28,color=color)
            m.add_updater(lambda m,dt:m.set_value(getter()).scale_to_fit_height(size/120).move_to(pt(x,y)))
            allnums.add(m);return m
        labels.add(T('n =',170,406,37,INK,'DejaVu Sans'),T('d =',665,406,37,INK,'DejaVu Sans'),T('比 n/d =',1230,406,34,INK,'DejaVu Sans'))
        num(lambda:data()[0],345,406);num(lambda:data()[1],850,406);num(lambda:data()[5],1510,406,47,BLUE,2)
        bars=VGroup();staticbars=VGroup()
        for index,y,color,name in [(3,610,BLUE,'n²d'),(4,770,ORANGE,'nd²')]:
            staticbars.add(T(name,190,y,47,color,'DejaVu Sans'),Line(pt(410,y+27),pt(1720,y+27),color=LINE,stroke_width=1))
            def drawbar(index=index,y=y,color=color):
                a=data();width=a[index]/max(a[3],a[4])*1310
                return Rectangle(width=width/120,height=40/120,stroke_width=0,fill_color=color,fill_opacity=.87).move_to(pt(410+width/2,y))
            bars.add(always_redraw(drawbar));num(lambda index=index:data()[index],1070,y-61,47,color)
        labels.add(T('棒は、各時点の大きい値を基準にした比',960,477,24,MUTE))
        labels.add(T('位置の組 n² =',595,880,31,MUTE));num(lambda:data()[2],1035,880,37,INK)
        foot=T('定数を省いた式の値。実測の秒数・FLOPsではありません。',1816,1032,19,MUTE).align_to(pt(1816,1032),RIGHT)
        self.play(FadeIn(labels),FadeIn(allnums),FadeIn(staticbars),FadeIn(bars),FadeIn(foot),run_time=1.0);self.until(17.7)
        self.play(Transform(h,header('n を2倍にすると、4倍と2倍。')),run_time=.5)
        self.play(tracker.animate.set_value(256),run_time=2.9,rate_func=smooth);self.until(23.7)
        self.play(Transform(h,header('n = d で、主要項は等しくなる。')),run_time=.5)
        self.play(tracker.animate.set_value(512),run_time=2.9,rate_func=smooth);self.until(29.7)
        self.play(Transform(h,header('n が d を超えると、比が逆転する。')),run_time=.5)
        self.play(tracker.animate.set_value(1024),run_time=2.9,rate_func=smooth);self.until(35.7)
        self.play(Transform(h,header('d も変えると、交点も変わる。')),run_time=.5)
        self.wait(.6)
        # d is a select in the real interaction, not a continuous control.
        # Change from 512 to its next selectable value 1024 in one step.
        d_value[0]=1024;self.wait(.1)
        marker=SurroundingRectangle(allnums[1],color=ORANGE,buff=.15,stroke_width=2)
        self.play(Create(marker),run_time=.6);self.play(FadeOut(marker),run_time=.5);self.until(41.7)
        for m in [*allnums,*bars]:m.clear_updaters()
        self.play(Transform(h,header('これは、完全なモデルの速度ではない。')),FadeOut(VGroup(labels,allnums,staticbars,bars,foot)),run_time=.5)
        scope=VGroup(T('比べたもの',104,433,28,BLUE,left=True),T('n²d と nd² の、増え方',104,531,55,INK,SERIF,True),Line(pt(104,626),pt(1816,626),color=LINE,stroke_width=1),T('省いたもの',104,694,28,ORANGE,left=True),T('Q/K/V・出力の投影、Feed-forward、定数係数',104,784,35,INK,left=True),T('実行時間は、実装・並列化・メモリにも左右される。',104,888,31,MUTE,left=True))
        self.play(LaggedStart(*[FadeIn(m,shift=UP*.05) for m in scope],lag_ratio=.08),run_time=1);self.until(47.7)
        self.play(Transform(h,header('長さと次元で、増え方を確かめる。')),FadeOut(scope),run_time=.5)
        close=VGroup(T('n²d / nd² = n / d',960,542,94,INK,'DejaVu Sans'),T('n < d',420,752,49,BLUE,'DejaVu Sans'),T('n = d',960,752,49,INK,'DejaVu Sans'),T('n > d',1500,752,49,ORANGE,'DejaVu Sans'),T('比 < 1',420,849,35,BLUE),T('比 = 1',960,849,35,INK),T('比 > 1',1500,849,35,ORANGE),T('Vaswani et al. (2017), Table 1 / §4  ·  arxiv.org/abs/1706.03762',104,1032,20,MUTE,'DejaVu Sans',True))
        self.play(FadeIn(close,shift=UP*.08),run_time=.9);self.until(53.99)
