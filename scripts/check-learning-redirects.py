"""Legacy URLs are navigation-only redirects, never a second reading experience."""
from pathlib import Path
from html.parser import HTMLParser
root=Path(__file__).resolve().parents[1]
redirects={'attention-is-all-you-need':'attention-is-all-you-need','gan':'generative-adversarial-nets','resnet':'deep-residual-learning','generative-adversarial-nets':'generative-adversarial-nets','deep-residual-learning':'deep-residual-learning'}
class Page(HTMLParser):
 def __init__(self,text):
  super().__init__();self.refresh=[];self.refs=[];self.ids=[];self.feed(text)
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if tag=='meta' and a.get('http-equiv','').lower()=='refresh': self.refresh.append(a.get('content',''))
  if tag=='a':self.refs.append(a.get('href'))
  if 'id' in a:self.ids.append(a['id'])
def check(path,target):
 text=path.read_text();p=Page(text)
 assert len(p.refresh)==1 and target in p.refresh[0],path
 assert target in p.refs and '<video' not in text and '論文ノート' not in text,path
 destination,_,fragment=target.partition('#')
 dest=root/'build'/destination.lstrip('/')/'index.html'
 assert dest.is_file(),target
 if fragment:assert fragment in Page(dest.read_text()).ids,target
for old,new in redirects.items():check(root/f'build/notes/{old}/index.html',f'/notes/{new}/learn/')
for slug,units in {'deep-residual-learning':['residual','shape','depth','blocks','evidence'],'generative-adversarial-nets':['roles','objective','optimal','equilibrium','training','saturation','evidence']}.items():
 prefix='chapter-' if slug.startswith('generative') else ''
 for unit in units:check(root/f'build/notes/{slug}/units/{unit}/index.html',f'/notes/{slug}/learn/#{prefix}{unit}')
print('PASS 17 legacy routes redirect directly to the matching learn page or chapter; no separate reading-note content ships.')
