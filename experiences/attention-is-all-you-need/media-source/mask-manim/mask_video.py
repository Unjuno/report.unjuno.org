from manim import *
import numpy as np,json,os
config.background_color='#F6F3EC';config.pixel_width=1920;config.pixel_height=1080
config.frame_width=16;config.frame_height=9;config.frame_rate=30
P=os.path.dirname(__file__);INK='#192A31';MUTE='#647172';BLUE='#2A55EB';ORANGE='#B94B2C';LINE='#CAD2CF'
SERIF='Noto Serif CJK JP';SANS='Noto Sans CJK JP'
SCORES=np.array([2.,2.,0.,1.]);TOKENS=['BOS','A','B','C'];TARGETS=['A','B','C','EOS'];XS=[500,850,1200,1550]
def pt(x,y):return np.array([(x-960)/120,(540-y)/120,0])
def T(s,x,y,n=34,c=INK,font=SANS,left=False):
    t=Text(s,font=font,color=c,disable_ligatures=True)
    if t.height:t.scale_to_fit_height(n/120)
    return t.move_to(pt(x,y),aligned_edge=LEFT if left else ORIGIN)
def header(title):return VGroup(T('CAUSAL MASK / 05',104,187,22,BLUE,'DejaVu Sans',True),T(title,104,278,60,INK,SERIF,True))
def weights(pos):
    z=SCORES.copy();z[np.arange(4)>pos]=-np.inf;e=np.exp(z-np.max(z));return e/e.sum()
def matrix(selected=None,training=False):
    xs=[700,880,1060,1240];ys=[470,590,710,830];m=VGroup(T('参照する入力',970,335,24,MUTE))
    for x,t in zip(xs,TOKENS):m.add(T(t,x,378,35,INK,'DejaVu Sans'))
    for i,y in enumerate(ys):
        m.add(T(f'位置 {i} → {TARGETS[i]}',145,y,31,BLUE if selected==i or training else INK,SANS,True))
        for j,x in enumerate(xs):
            allowed=j<=i;c=BLUE if allowed else MUTE
            r=RoundedRectangle(width=151/120,height=94/120,corner_radius=.035,stroke_color=BLUE if selected==i and allowed else LINE,stroke_width=2 if selected==i else 1,fill_color=c,fill_opacity=.11 if allowed else .025).move_to(pt(x,y))
            m.add(r,Dot(pt(x,y),radius=.045,color=BLUE) if allowed else T('×',x,y,32,MUTE,'DejaVu Sans'))
    if training:
        m.add(T('ずらした正解列を使用',1580,490,27,INK),T('未来はマスク',1580,610,30,ORANGE),T('各行を並列に計算',1580,760,29,BLUE))
    else:
        m.add(T('位置2：C を予測',1580,490,28,INK),T('入力 B は使える',1580,610,28,BLUE),T('入力 C は未来',1580,690,28,ORANGE),T('対角線も参照できる',1580,810,25,MUTE))
    m.add(T('● 参照できる',760,916,25,BLUE),T('× 未来：参照しない',1160,916,25,MUTE))
    return m
def score_values(pos=None,y=535,n=71):
    return VGroup(*[T(str(int(s)) if pos is None or j<=pos else '−∞',x,y,n,ORANGE if pos is not None and j>pos else INK,'DejaVu Sans') for j,(s,x) in enumerate(zip(SCORES,XS))])
def weight_values(pos):return VGroup(*[T(f'{w:.3f}',x,748,69,BLUE if j<=pos else MUTE,'DejaVu Sans') for j,(w,x) in enumerate(zip(weights(pos),XS))])
def status_labels(pos):return VGroup(*[T('参照できる' if j<=pos else '未来：参照しない',x,837,24,BLUE if j<=pos else ORANGE) for j,x in enumerate(XS)])

class CausalMask(Scene):
    def until(self,t):
        if t>self.time:self.wait(t-self.time)
        if os.environ.get('MASK_PREVIEW_SNAPSHOTS'):
            self.renderer.update_frame(self)
            self.renderer.camera.get_image().save(P+f'/snapshot_{t:.2f}.png')
    def construct(self):
        mast=VGroup(T('ATTENTION IS ALL YOU NEED',104,79,21,INK,'DejaVu Sans',True),T('DECODER SELF-ATTENTION',1816,79,18,MUTE,'DejaVu Sans').align_to(pt(1816,79),RIGHT),Line(pt(104,119),pt(1816,119),color=LINE,stroke_width=1))
        self.add(mast)
        plan=json.load(open(P+'/narration_plan.json'))['segments'];caps=[T(s['caption'],960,970,31) for s in plan]
        for c in caps:
            if c.width>14.5:c.scale_to_fit_width(14.5)
        cap=VGroup().set_z_index(30);state=[-2]
        def update_cap(m,dt):
            t=self.time;i=next((j for j,s in enumerate(plan) if s['start']<=t<s['end']),-1)
            if i!=state[0]:m.become(caps[i].copy() if i>=0 else VGroup()).set_z_index(30);state[0]=i
            if i>=0:m.set_opacity(max(0,min(1,(t-plan[i]['start'])/.25,(plan[i]['end']-t)/.25)))
        cap.add_updater(update_cap);self.add(cap)
        h=header('次の答えを、先に見ない。')
        opening=VGroup(T('既知の出力',570,430,33,MUTE),T('A',460,593,112,INK,'Noto Serif Display'),T('B',700,593,112,INK,'Noto Serif Display'),Arrow(pt(880,593),pt(1120,593),buff=0,color=LINE,stroke_width=2),T('次の予測',1430,430,33,BLUE),T('C',1430,593,112,BLUE,'Noto Serif Display'),T('この正解は、先に見せない。',1430,780,32,ORANGE),T('Decoder の自己Attention',570,800,29,MUTE))
        self.play(FadeIn(h),LaggedStart(*[FadeIn(m,shift=UP*.08) for m in opening],lag_ratio=.08),run_time=1.4)
        self.until(5.7)
        self.play(Transform(h,header('入力を、1つずらす。')),FadeOut(opening),run_time=.5)
        shift=VGroup(T('入力',104,482,30,MUTE,SANS,True),T('予測する正解',104,718,29,MUTE,SANS,True))
        for j,x in enumerate(XS):
            color=BLUE if j==2 else INK
            shift.add(T(f'位置 {j}',x,383,26,MUTE),RoundedRectangle(width=225/120,height=111/120,corner_radius=.04,stroke_color=BLUE if j==2 else LINE,stroke_width=2 if j==2 else 1,fill_color=BLUE,fill_opacity=.045 if j==2 else 0).move_to(pt(x,482)),T(TOKENS[j],x,482,62,color,'DejaVu Sans'),Arrow(pt(x,560),pt(x,636),buff=0,color=BLUE if j==2 else LINE,stroke_width=2),T(TARGETS[j],x,718,62,color,'DejaVu Sans'))
        shift.add(T('BOS：開始記号      EOS：終了記号',960,875,28,MUTE))
        self.play(FadeIn(shift),run_time=1.2);self.until(11.7)
        self.play(Transform(h,header('参照できるのは、自分の位置まで。')),FadeOut(shift),run_time=.5)
        mat=matrix(2);self.play(FadeIn(mat),run_time=1.2);self.until(17.7)
        self.play(Transform(h,header('未来の点数を、−∞ にする。')),FadeOut(mat),run_time=.5)
        labels=VGroup(*[T(t,x,405,38,INK,'DejaVu Sans') for t,x in zip(TOKENS,XS)])
        scores=score_values(None);prediction=T('位置2：C を予測',960,765,37,BLUE)
        scale_note=T('スケーリング後として手で設定した点数',960,861,28,MUTE)
        note=T('マスクだけを見るため、各位置で同じ点数を使う説明用の例。',1816,1032,18,MUTE).align_to(pt(1816,1032),RIGHT)
        self.play(FadeIn(labels),FadeIn(scores),FadeIn(prediction),FadeIn(scale_note),FadeIn(note),run_time=.8)
        self.play(Transform(scores,score_values(2)),run_time=1.0)
        future=T('未来',1550,646,29,ORANGE);self.play(FadeIn(future),run_time=.4)
        self.until(23.7)
        self.play(Transform(h,header('softmax 後、未来の重みは0。')),Transform(scores,score_values(2,510,55)),FadeOut(VGroup(prediction,scale_note,future)),run_time=.5)
        arrows=VGroup(*[Arrow(pt(x,560),pt(x,657),buff=0,color=LINE,stroke_width=2) for x in XS])
        soft=T('softmax',210,611,29,MUTE,'DejaVu Sans')
        w=weight_values(2);status=status_labels(2);sum_note=T('重みの合計 = 1（丸め前）',960,910,28,MUTE)
        self.play(Create(arrows),FadeIn(soft),FadeIn(w),FadeIn(status),FadeIn(sum_note),run_time=1.2)
        self.until(29.7)
        self.play(Transform(h,header('位置0：BOS だけから A を予測。')),Transform(scores,score_values(0,510,55)),Transform(w,weight_values(0)),Transform(status,status_labels(0)),run_time=1.0)
        self.until(35.7)
        self.play(Transform(h,header('位置3：C まで見て EOS を予測。')),Transform(scores,score_values(3,510,55)),Transform(w,weight_values(3)),Transform(status,status_labels(3)),run_time=1.0)
        self.until(41.7)
        self.play(Transform(h,header('学習時は、各位置を並列に。')),FadeOut(VGroup(labels,scores,arrows,soft,w,status,sum_note,note)),run_time=.5)
        training=matrix(training=True);self.play(FadeIn(training),run_time=1.0);self.until(47.7)
        self.play(Transform(h,header('予測位置で、参照範囲が変わる。')),FadeOut(training),run_time=.5)
        ending=VGroup(T('生成時',960,421,31,MUTE),T('既知の出力',570,567,58,INK,SERIF),Arrow(pt(940,567),pt(1120,567),buff=0,color=LINE,stroke_width=2),T('次の予測',1450,567,58,BLUE,SERIF),T('前の出力が必要なので、順に進む。',960,730,33,MUTE),T('予測する位置を変えてみよう。',960,853,44,BLUE,SERIF),T('Vaswani et al. (2017), §3.1–3.2.3  ·  arxiv.org/abs/1706.03762',104,1032,21,MUTE,'DejaVu Sans',True))
        self.play(FadeIn(ending,shift=UP*.08),run_time=.8);self.until(53.99)
