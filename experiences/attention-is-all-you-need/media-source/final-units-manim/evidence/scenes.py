from manim import *
import json,numpy as np
from pathlib import Path
config.notify_outdated_version=False
config.background_color='#F6F3EC';config.pixel_width=1280;config.pixel_height=720
config.frame_width=16;config.frame_height=9;config.frame_rate=24
P=Path(__file__).parent
INK='#192A31';MUTE='#647172';BLUE='#2A55EB';ORANGE='#B94B2C';LINE='#CAD2CF';SANS='Noto Sans CJK JP';SERIF='Noto Serif CJK JP'
def T(s,x,y,size=32,color=INK,font=SANS,maxw=14):
 t=Text(s,font=font,font_size=size,color=color,disable_ligatures=True)
 if t.width>maxw:t.scale_to_fit_width(maxw)
 return t.move_to([x,y,0])
def wrap(s,n=32):return '\n'.join(s[i:i+n] for i in range(0,len(s),n))
class Lesson(Scene):
 unit=''
 def construct(self):
  p=json.loads((P/self.unit/'narration_plan.json').read_text())
  self.add(T('ATTENTION IS ALL YOU NEED',-4.7,3.95,19,font='DejaVu Sans',maxw=6),T('PAPER EVIDENCE / 2017',4.9,3.95,17,MUTE,font='DejaVu Sans',maxw=5),Line([-7.1,3.55,0],[7.1,3.55,0],color=LINE))
  self.add(T('Vaswani et al. (2017)  |  '+p['sections']+'  |  arxiv.org/abs/1706.03762',0,-4.13,14,MUTE,font='DejaVu Sans'))
  previous=VGroup()
  for i,b in enumerate(p['beats']):
   h=T(b['heading'],0,2.65,39,font=SERIF)
   tag=T(f'{i+1:02} / 07   '+p['title'],0,3.16,16,BLUE)
   v=b['visual'];body=VGroup()
   if v[0]=='bars':
    body.add(T('WMT 2014 / EN → DE / BLEU',0,1.75,22,MUTE))
    for j,(name,value,color) in enumerate([('ConvS2S ensemble',26.36,ORANGE),('Transformer base',27.3,BLUE),('Transformer big',28.4,BLUE)]):
     y=.85-j*.9;w=value/30*7
     body.add(T(name,-4.7,y,22,color,maxw=4),Rectangle(width=w,height=.42,stroke_width=0,fill_color=color,fill_opacity=.8).move_to([-2+w/2,y,0]),T(str(value),5.6,y,28,color))
    body.add(T('0 を起点にした棒 / 論文の報告値・再実験ではありません',0,-2,19,MUTE))
   elif len(v)>1 and v[1]=='parallel':
    body.add(T(v[0],0,1.45,30,BLUE))
    for j,l in enumerate(['BOS','A','B','C']):
     x=-4.5+j*3;body.add(RoundedRectangle(width=1.6,height=.7,corner_radius=.1,color=BLUE).move_to([x,.2,0]),T(l,x,.2,25,BLUE),Arrow([x,-.3,0],[x,-1.0,0],color=BLUE,buff=0),T(['A','B','C','EOS'][j],x,-1.4,25))
    body.add(T('マスクにより未来の正解を参照しない',0,-2.15,22,MUTE))
   else:
    for j,s in enumerate(v[:3]):
     body.add(T(s,0,1.2-j*1.35,39 if j==0 else 32,BLUE if j==0 else (ORANGE if j==1 else MUTE),maxw=13.8))
    body.add(Line([-5.5,.55,0],[5.5,.55,0],color=LINE))
   caption=T(wrap(b['text']),0,-3.22,21,maxw=14.1)
   group=VGroup(h,tag,body,caption)
   if i:self.play(FadeOut(previous),run_time=.25)
   self.play(FadeIn(h,shift=UP*.07),FadeIn(tag),FadeIn(caption),run_time=.4)
   self.play(LaggedStart(*[FadeIn(m,shift=UP*.05) for m in body],lag_ratio=.07),run_time=1.0)
   self.wait(max(.1,b['end']-self.time))
   previous=group
class ReportedEvidence(Lesson):unit='reported-evidence'
class Scope(Lesson):unit='scope'
