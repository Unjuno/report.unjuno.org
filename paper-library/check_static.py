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
s=(root/'index.html').read_text()
import json
from hashlib import sha256
papers=json.loads((root.parent/'content/papers.json').read_text())
assert s.count('data-entry data-search=')==len(papers)
assert 'data-sample' not in s and '論文サンプル' not in s and '論文ノート' not in s
assert 'home-landscape' not in s and 'home-surface' not in s
for name in ('feed.css','feed.js'):
 fingerprint=sha256((root/'assets'/name).read_bytes()).hexdigest()[:12]
 assert '/assets/'+name+'?v='+fingerprint in s
subprocess.run(['node','--check',str(root/'assets/feed.js')],check=True)
js=(root/'assets/feed.js').read_text()
assert 'fetch(' not in js and 'XMLHttpRequest' not in js and 'innerHTML' not in js
print('PASS static real-paper feed, no samples, direct links, no AJAX, asset fingerprints')
