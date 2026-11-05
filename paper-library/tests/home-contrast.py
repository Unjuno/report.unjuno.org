"""Numeric CSS text contrast checks. Not a screenshot or browser audit."""
from pathlib import Path
import re
css=(Path(__file__).resolve().parents[1]/'dist/assets/home-game.css').read_text()
def property_value(selector,property_name):
    rule=re.search(re.escape(selector)+r'\{([^}]+)\}',css)
    assert rule,selector
    color=re.search(r'(?:^|;)'+re.escape(property_name)+r':(#[0-9a-fA-F]{6})(?:;|$)',rule.group(1))
    assert color,(selector,property_name)
    return color.group(1)
def luminance(color):
    channels=[int(color[i:i+2],16)/255 for i in (1,3,5)]
    linear=[value/12.92 if value<=.04045 else ((value+.055)/1.055)**2.4 for value in channels]
    return sum(a*b for a,b in zip(linear,(.2126,.7152,.0722)))
bg=property_value('body','background')
for selector in ('.paper-node','#result-status','#unavailable','.scene-controls button','footer','.hero-copy p','.sponsor small'):
    fg=property_value(selector,'color')
    a,b=sorted((luminance(bg),luminance(fg)))
    ratio=(b+.05)/(a+.05)
    assert ratio>=4.5,(selector,fg,bg,round(ratio,3))
    print('PASS text contrast',selector,round(ratio,2))
