"""Worst-case white backing under the active gradient; not browser/accessibility acceptance."""
from pathlib import Path
source=Path('dist/assets/cinema-field.js').read_text();css=Path('dist/assets/feed.css').read_text()
assert "shade.addColorStop(.84,'#101719cc')" in source
assert '.source-note{background:#101719d9;' in css

def lum(rgb):
 c=[v/255 for v in rgb]
 return sum(k*(v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4) for k,v in zip([.2126,.7152,.0722],c))
for label,fg,a in [('muted',(174,187,185),.8),('title',(241,241,233),.8),('link',(242,198,140),.8),('attribution',(165,182,179),217/255)]:
 bg=[a*b+(1-a)*255 for b in [16,23,25]];ratio=(lum(fg)+.05)/(lum(bg)+.05)
 assert ratio>=4.5,(label,ratio)
 print(label,round(ratio,2))
