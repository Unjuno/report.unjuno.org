from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit
import re, subprocess
root=Path(__file__).parent/'dist'
class Page(HTMLParser):
 def __init__(self):super().__init__();self.ids=[];self.refs=[]
 def handle_starttag(self,tag,attrs):
  d=dict(attrs)
  if 'id' in d:self.ids.append(d['id'])
  for k in ['href','src']:
   if k in d:self.refs.append(d[k])
for file in root.rglob('*.html'):
 s=file.read_text(); p=Page();p.feed(s);assert len(p.ids)==len(set(p.ids)),file
 for ref in p.refs:
  url=urlsplit(ref)
  if url.scheme or url.netloc:continue
  target=(root/url.path.lstrip('/')) if url.path.startswith('/') else (file.parent/url.path if url.path else file)
  if target.is_dir():target=target/'index.html'
  assert target.exists(),(file,ref)
  if url.fragment:
   dest=Page();dest.feed(target.read_text());assert url.fragment in dest.ids,(file,ref)
 print('PASS local links:',file.relative_to(root))
s=(root/'index.html').read_text();js=(root/'assets/home-deck.js').read_text();subprocess.run(['node','--check'],input=js,text=True,check=True)
assert s.count('data-paper data-id=')==6
assert s.count('data-sample data-search=')==5
assert '38秒' not in s and '<canvas' in s
assert 'https://report.unjuno.org/notes/' not in s
print('PASS: JS syntax, one real record plus five labeled placeholders, library HOME, same-origin paper navigation')

from hashlib import sha256
for name in ('home-game.css','home-deck.js','home-surface.js','home-view.js','home-landscape.js'):
 fingerprint=sha256((root/'assets'/name).read_bytes()).hexdigest()[:12]
 assert '/assets/'+name+'?v='+fingerprint in s,('stale HOME fingerprint',name)
print('PASS HOME asset URL fingerprints match current bytes')

class ControlPlacement(HTMLParser):
 def __init__(self):
  super().__init__();self.stack=[];self.checked=0;self.primary=0;self.utilities=0
 def handle_starttag(self,tag,attrs):
  attrs=dict(attrs);classes=attrs.get('class','').split()
  if tag=='button' and attrs.get('id') in {'material-view','observe-wave','equation-view'}:
   assert any('representation-controls' in item.get('class','').split() for _,item in self.stack)
   self.primary+=1
  if tag=='button' and attrs.get('id') in {'view-reset','sound-toggle','motion-toggle'}:
   assert any('scene-utilities' in item.get('class','').split() for _,item in self.stack)
   self.utilities+=1
  if 'paper-nav' in classes or 'scene-controls' in classes:
   assert not any(item.get('id')=='specimen-space' for _,item in self.stack),'controls inside rendered world'
   assert any('explore-controls' in item.get('class','').split() for _,item in self.stack)
   self.checked+=1
  if tag not in {'area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'}:
   self.stack.append((tag,attrs))
 def handle_endtag(self,tag):
  if self.stack and self.stack[-1][0]==tag:self.stack.pop()
controls=ControlPlacement();controls.feed(s);assert controls.checked==2
print('PASS primary and display controls are outside the rendered world')

assert controls.primary==3 and controls.utilities==3
assert s.count('class="location-halo"')==6
print('PASS three representation controls separated from three utilities; six locator halos')

assert s.count('class="title-marker-ring"')==6 and s.count('class="title-marker-core"')==6
print("PASS title markers share the six location symbols")
