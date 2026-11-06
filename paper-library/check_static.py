from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit
import re, subprocess
root=Path(__file__).parent/'dist'
class Page(HTMLParser):
 def __init__(self):super().__init__();self.ids=[];self.refs=[];self.cards=[];self.attrs=[]
 def handle_starttag(self,tag,attrs):
  d=dict(attrs);self.attrs.append(d)
  if tag=='article' and 'data-entry' in d:self.cards.append(d)
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
  # This one additional page belongs to the enclosing Astro app, not this feed.
  if not target.exists() and url.path == '/notes/attention-is-all-you-need/learn/':
   production = root.parent.parent
   assert (production/'src/pages/notes/attention-is-all-you-need/learn/index.astro').is_file()
   target = production/'build/notes/attention-is-all-you-need/learn/index.html'
  assert target.exists(),(file,ref)
  if url.fragment:
   dest=Page();dest.feed(target.read_text());assert url.fragment in dest.ids,(file,ref)
 print('PASS local links:',file.relative_to(root))
s=(root/'index.html').read_text()
import json
from hashlib import sha256
from material_policy import load_materials
papers,_=load_materials(root.parent)
home=Page();home.feed(s)
assert len(home.cards)==len(papers)
assert not any('data-sample' in attrs for attrs in home.attrs)
assert not any(any(name in attrs.get('class','').split() for name in ('home-landscape','home-surface')) for attrs in home.attrs)
for name in ('feed.css','feed.js'):
 fingerprint=sha256((root/'assets'/name).read_bytes()).hexdigest()[:12]
 assert '/assets/'+name+'?v='+fingerprint in s
subprocess.run(['node','--check',str(root/'assets/feed.js')],check=True)
js=(root/'assets/feed.js').read_text()
assert 'fetch(' not in js and 'XMLHttpRequest' not in js and 'innerHTML' not in js
print('PASS static real-paper feed, no samples, direct links, no AJAX, asset fingerprints')
