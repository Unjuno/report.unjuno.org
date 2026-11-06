from manim import *
from pathlib import Path
import json
config.background_color='#F6F3EC'
config.pixel_width=1280;config.pixel_height=720;config.frame_rate=24
INK='#192A31';BLUE='#2955DE';GREEN='#4F8073';ORANGE='#D96B40'
P=Path(__file__).resolve().parent
class ResNetOverview(Scene):
 def construct(self):
  plan=json.loads((P/'timing.json').read_text())
  header=Text('RESNET / DEEP RESIDUAL LEARNING',font='DejaVu Sans',font_size=16,color=INK).to_edge(UP).to_edge(LEFT)
  self.add(header)
  for i,s in enumerate(plan):
   title=Text(s['title'],font='Noto Sans CJK JP',font_size=32,color=INK).move_to(UP*2.5)
   formula=Text(s['formula'],font='DejaVu Sans',font_size=23,color=BLUE)
   if formula.width>12:formula.scale_to_fit_width(12)
   formula.move_to(DOWN*1.6)
   group=VGroup(title,formula)
   if i in [1,2,3]:
    boxes=VGroup(*[RoundedRectangle(width=2,height=1,corner_radius=.1,color=col) for col in [INK,BLUE,GREEN]]).arrange(RIGHT,buff=2)
    words=['x','F(x)','+']
    labels=VGroup(*[Text(t,font='DejaVu Sans',font_size=28,color=INK).move_to(b) for t,b in zip(words,boxes)])
    links=VGroup(Arrow(boxes[0].get_right(),boxes[1].get_left(),buff=.05,color=INK),Arrow(boxes[1].get_right(),boxes[2].get_left(),buff=.05,color=BLUE))
    bypass=VMobject(color=GREEN).set_points_as_corners([boxes[0].get_bottom(),boxes[0].get_bottom()+DOWN*.6,boxes[2].get_bottom()+DOWN*.6,boxes[2].get_bottom()])
    group.add(boxes,labels,links,bypass)
    if i==3:group.add(Text('Wₛ x',font='DejaVu Sans',font_size=20,color=GREEN).move_to(DOWN*.85))
   elif i==4:
    blocks=VGroup(*[Rectangle(width=1.2,height=h,fill_color=BLUE,fill_opacity=.65,stroke_width=0) for h in [2,.6,.6,2]]).arrange(RIGHT,buff=1)
    group.add(blocks)
   else:
    heights=[.7,1.3,2.0,2.8] if i==0 else [1.7,2.1]
    bars=VGroup(*[Rectangle(width=.8,height=h,fill_color=GREEN if i==0 else ORANGE,fill_opacity=.8,stroke_width=0) for h in heights]).arrange(RIGHT,buff=.8,aligned_edge=DOWN).move_to(ORIGIN)
    group.add(bars)
    note=Text('概念図 / 実測の学習曲線ではありません',font='Noto Sans CJK JP',font_size=15,color=INK).move_to(DOWN*2.25)
    group.add(note)
   foot=Text(f'{i+1:02} / 06  •  He et al. 2015 / CVPR 2016',font='DejaVu Sans',font_size=14,color=INK).to_edge(DOWN)
   group.add(foot)
   self.play(FadeIn(group,shift=UP*.1),run_time=.6)
   self.wait(max(.1,s['end']-self.time-.5))
   self.play(FadeOut(group),run_time=.5)
