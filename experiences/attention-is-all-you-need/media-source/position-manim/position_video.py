from manim import *
import numpy as np, json, os
config.background_color='#F6F3EC';config.pixel_width=1920;config.pixel_height=1080
config.frame_width=16;config.frame_height=9;config.frame_rate=30
P=os.path.dirname(__file__)
INK='#192A31';MUTE='#647172';BLUE='#2A55EB';ORANGE='#B94B2C';LINE='#CAD2CF'
SERIF='Noto Serif CJK JP';SANS='Noto Sans CJK JP'
def pt(x,y):return np.array([(x-960)/120,(540-y)/120,0])
def T(s,x,y,n=34,c=INK,font=SANS,left=False):
    t=Text(s,font=font,color=c,disable_ligatures=True)
    if t.height:t.scale_to_fit_height(n/120)
    return t.move_to(pt(x,y),aligned_edge=LEFT if left else ORIGIN)
def header(title):return VGroup(T('POSITIONAL ENCODING / 04',104,187,22,BLUE,'DejaVu Sans',True),T(title,104,278,60,INK,SERIF,True))
class Digits(Text):
    def __init__(self,text,**kw):super().__init__(text,font='DejaVu Sans',**kw)
def encode(pos):
    return np.array([np.sin(pos/10000**(2*(i//2)/8)) if i%2==0 else np.cos(pos/10000**(2*(i//2)/8)) for i in range(8)])

class PositionEncoding(Scene):
    def until(self,t):
        if t>self.time:self.wait(t-self.time)
        if os.environ.get('POSITION_PREVIEW_SNAPSHOTS'):
            self.renderer.update_frame(self)
            self.renderer.camera.get_image().save(P+f'/snapshot_{t:.2f}.png')
    def construct(self):
        mast=VGroup(T('ATTENTION IS ALL YOU NEED',104,79,21,INK,'DejaVu Sans',True),T('POSITION',1816,79,18,MUTE,'DejaVu Sans').align_to(pt(1816,79),RIGHT),Line(pt(104,119),pt(1816,119),color=LINE,stroke_width=1))
        self.add(mast)
        plan=json.load(open(P+'/narration_plan.json'))['segments'];caps=[T(s['caption'],960,970,31) for s in plan]
        for c in caps:
            if c.width>14.5:c.scale_to_fit_width(14.5)
        caption=VGroup().set_z_index(30);state=[-2]
        def update_caption(m,dt):
            t=self.time;i=next((j for j,z in enumerate(plan) if z['start']<=t<z['end']),-1)
            if i!=state[0]:m.become(caps[i].copy() if i>=0 else VGroup()).set_z_index(30);state[0]=i
            if i>=0:m.set_opacity(max(0,min(1,(t-plan[i]['start'])/.25,(plan[i]['end']-t)/.25)))
        caption.add_updater(update_caption);self.add(caption)
        h=header('順番の手掛かりを、加える。')
        opening=VGroup(T('入力の表現',580,510,65,INK,SERIF),T('+',960,510,60,MUTE,'DejaVu Sans'),T('位置の情報',1380,510,65,BLUE,SERIF),T('Positional Encoding',960,710,47,BLUE,'Noto Serif Display'),T('位置ごとの情報を、入力と同じ次元で。',960,832,34,MUTE))
        self.play(FadeIn(h),LaggedStart(*[FadeIn(m,shift=UP*.1) for m in opening],lag_ratio=.1),run_time=1.4)
        self.until(5.7)
        self.play(Transform(h,header('sin と cos を、4組。')),FadeOut(opening),run_time=.5)
        XS=[295+190*i for i in range(8)]
        cells=VGroup();pairs=VGroup()
        for i,x in enumerate(XS):
            c=BLUE if i%2==0 else ORANGE
            cells.add(VGroup(T(str(i),x,432,27,MUTE,'DejaVu Sans'),RoundedRectangle(width=158/120,height=120/120,corner_radius=.05,color=LINE,stroke_width=1.2,fill_color=c,fill_opacity=.04).move_to(pt(x,590)),T('sin' if i%2==0 else 'cos',x,590,48,c,'DejaVu Sans')))
        for i in range(4):
            left,right=XS[2*i]-65,XS[2*i+1]+65;mid=(left+right)/2
            pairs.add(VGroup(Line(pt(left,695),pt(right,695),color=LINE,stroke_width=1.5),Line(pt(left,681),pt(left,695),color=LINE,stroke_width=1.5),Line(pt(right,681),pt(right,695),color=LINE,stroke_width=1.5),T(f'ペア {i}',mid,752,29,MUTE)))
        dimension=T('8次元の説明用：成分 0〜7',960,865,32,INK)
        note=T('原論文の基本モデルは512次元。この図は8次元の説明用。',1816,1032,18,MUTE).align_to(pt(1816,1032),RIGHT)
        self.play(LaggedStart(*[FadeIn(m,shift=UP*.08) for m in cells],lag_ratio=.08),FadeIn(pairs),FadeIn(dimension),FadeIn(note),run_time=1.4)
        self.until(11.7)
        self.play(Transform(h,header('2つずつ、同じ速さのペア。')),FadeOut(VGroup(cells,pairs,dimension)),run_time=.5)
        eqsin=SVGMobject(P+'/sin_equation.svg').set_color(BLUE).scale_to_fit_width(10.3).move_to(pt(960,490))
        eqcos=SVGMobject(P+'/cos_equation.svg').set_color(ORANGE).scale_to_fit_width(10.3).move_to(pt(960,655))
        angles=VGroup(T('ペア 0',385,815,25,MUTE),T('p',385,871,36,INK,'DejaVu Sans'),T('ペア 1',770,815,25,MUTE),T('p / 10',770,871,36,INK,'DejaVu Sans'),T('ペア 2',1155,815,25,MUTE),T('p / 100',1155,871,36,INK,'DejaVu Sans'),T('ペア 3',1540,815,25,MUTE),T('p / 1000',1540,871,36,INK,'DejaVu Sans'))
        self.play(Write(eqsin),Write(eqcos),FadeIn(angles),run_time=1.5)
        self.until(17.7)
        self.play(Transform(h,header('位置0は、sin が0、cos が1。')),FadeOut(VGroup(eqsin,eqcos,angles)),run_time=.5)
        position=ValueTracker(0)
        def pos():return int(np.clip(round(position.get_value()),0,40))
        rows=[465,590,715,840];x0,x1=480,1420
        def curve_point(p,j,which):return pt(x0+(x1-x0)*p/40,rows[j]-42*(np.sin(p/(10**j)) if which==0 else np.cos(p/(10**j))))
        graph=VGroup(T('sin',1580,372,30,BLUE,'DejaVu Sans'),T('cos',1755,372,30,ORANGE,'DejaVu Sans'))
        curves=VGroup();points=VGroup();numbers=VGroup()
        for j,row in enumerate(rows):
            graph.add(T(f'成分 {2*j}・{2*j+1}',235,row-15,28,INK),T('角度 '+('p' if j==0 else f'p / {10**j}'),235,row+33,22,MUTE),Line(pt(x0,row),pt(x1,row),color=LINE,stroke_width=1))
            for tick in [0,10,20,30,40]:graph.add(Line(pt(x0+(x1-x0)*tick/40,row-48),pt(x0+(x1-x0)*tick/40,row+48),color=LINE,stroke_width=.5))
            for which,c in [(0,BLUE),(1,ORANGE)]:
                curve=VMobject(color=c,stroke_width=2.2).set_points_as_corners([curve_point(p,j,which) for p in np.linspace(0,40,801)]);curves.add(curve)
                points.add(always_redraw(lambda j=j,which=which,c=c:Dot(curve_point(pos(),j,which),radius=.046,color=c)))
                x=1580 if which==0 else 1755
                num=DecimalNumber(0,mob_class=Digits,num_decimal_places=3,font_size=25,color=c)
                num.add_updater(lambda m,dt,j=j,which=which,x=x,row=row:m.set_value(float(encode(pos())[j*2+which])).scale_to_fit_height(32/120).move_to(pt(x,row)))
                numbers.add(num)
        for tick in [0,10,20,30,40]:graph.add(T(str(tick),x0+(x1-x0)*tick/40,915,21,MUTE,'DejaVu Sans'))
        graph.add(T('位置 p（整数）',x0-155,915,22,MUTE),T('角度はラジアン',1630,915,22,MUTE))
        marker=always_redraw(lambda:Line(pt(x0+(x1-x0)*pos()/40,406),pt(x0+(x1-x0)*pos()/40,889),color=INK,stroke_width=1.2,stroke_opacity=.55))
        poslabel=T('位置',1540,278,30,MUTE)
        posnum=DecimalNumber(0,mob_class=Digits,num_decimal_places=0,font_size=34,color=BLUE)
        posnum.add_updater(lambda m,dt:m.set_value(pos()).scale_to_fit_height(48/120).move_to(pt(1710,278)))
        self.play(FadeIn(graph),LaggedStart(*[Create(c) for c in curves],lag_ratio=.06),FadeIn(marker),FadeIn(points),FadeIn(numbers),FadeIn(poslabel),FadeIn(posnum),run_time=1.6)
        self.until(23.7)
        self.play(Transform(h,header('位置を変えると、値が変わる。')),run_time=.5)
        self.play(position.animate.set_value(10),run_time=3.2,rate_func=linear)
        self.until(29.7)
        self.play(Transform(h,header('遅いペアも、少しずつ変わる。')),run_time=.5)
        self.play(position.animate.set_value(40),run_time=3.2,rate_func=linear)
        self.until(35.7)
        for m in [marker,posnum,*points,*numbers]:m.clear_updaters()
        self.play(Transform(h,header('連結せず、同じ成分どうしを足す。')),FadeOut(VGroup(graph,curves,marker,points,numbers,poslabel,posnum)),run_time=.5)
        # Addition is elementwise: two d-dimensional vectors yield d dimensions.
        add_diagram=VGroup(T('入力の表現',240,450,30,INK),T('+',240,570,44,MUTE,'DejaVu Sans'),T('位置符号',240,665,30,BLUE),T('加えた表現',240,842,30,INK),Line(pt(420,750),pt(1800,750),color=LINE,stroke_width=1.5))
        top=VGroup();pe=VGroup();sums=VGroup()
        for i in range(8):
            x=505+i*172
            top.add(VGroup(RoundedRectangle(width=140/120,height=91/120,corner_radius=.04,color=LINE,stroke_width=1.2,fill_color=INK,fill_opacity=.025).move_to(pt(x,450)),T('x'+str(i),x,450,31,INK,'DejaVu Sans')))
            pe.add(VGroup(RoundedRectangle(width=140/120,height=91/120,corner_radius=.04,color=LINE,stroke_width=1.2,fill_color=BLUE,fill_opacity=.04).move_to(pt(x,665)),T(f'{encode(40)[i]:.3f}',x,665,24,BLUE,'DejaVu Sans')))
            sums.add(VGroup(RoundedRectangle(width=140/120,height=91/120,corner_radius=.04,color=BLUE,stroke_width=1.2,fill_color=BLUE,fill_opacity=.055).move_to(pt(x,842)),T('和',x,842,28,INK)))
        add_tag=T('8成分のまま',960,920,24,MUTE)
        self.play(FadeIn(add_diagram),FadeIn(top),FadeIn(pe),run_time=.8)
        self.play(LaggedStart(*[FadeIn(m,shift=DOWN*.12) for m in sums],lag_ratio=.08),FadeIn(add_tag),run_time=.8)
        self.until(41.7)
        self.play(Transform(h,header('速い変化と、遅い変化を見比べる。')),FadeOut(VGroup(add_diagram,top,pe,sums,add_tag,note)),run_time=.5)
        closing=VGroup(T('sin',600,515,95,BLUE,'Noto Serif Display'),T('cos',1300,515,95,ORANGE,'Noto Serif Display'),T('ペアごとに、変化の速さが違う。',960,690,39,INK,SERIF),T('位置を動かしてみよう。',960,825,49,BLUE,SERIF),T('Vaswani et al. (2017), §3.5  ·  arxiv.org/abs/1706.03762',104,1032,21,MUTE,'DejaVu Sans',True))
        self.play(FadeIn(closing,shift=UP*.08),run_time=.9)
        self.until(47.99)
