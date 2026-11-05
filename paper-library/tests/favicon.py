from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, parse_qs
from hashlib import sha256
import struct, re, subprocess
import xml.etree.ElementTree as ET
root = Path(__file__).resolve().parents[1]
dist = root / 'dist'
expected = {
 '/favicon.svg': ('icon', 'image/svg+xml', 'any'),
}
class Head(HTMLParser):
 def __init__(self): super().__init__(); self.in_head=False; self.icons=[]
 def handle_starttag(self, tag, attrs):
  if tag=='head': self.in_head=True
  a=dict(attrs)
  if tag=='link' and self.in_head and a.get('rel') in ('icon','apple-touch-icon'):
   self.icons.append(a)
 def handle_endtag(self, tag):
  if tag=='head': self.in_head=False
pages=list(dist.rglob('*.html'))
assert pages
before={str(p.relative_to(dist)):p.read_bytes() for p in pages}
for page in pages:
 parser=Head(); parser.feed(page.read_text()); assert len(parser.icons)==len(expected),(page,parser.icons)
 seen=set()
 for a in parser.icons:
  u=urlsplit(a['href']); assert not u.scheme and not u.netloc and u.path in expected,(page,a)
  assert u.path not in seen; seen.add(u.path)
  assert (a['rel'],a['type'],a['sizes'])==expected[u.path],a
  assert parse_qs(u.query)=={'v':[sha256((dist/u.path.lstrip('/')).read_bytes()).hexdigest()[:12]]},a
 for marker in ('<!-- site-favicon:start -->','<!-- site-favicon:end -->'):
  assert page.read_text().count(marker)==1
svg=ET.fromstring((dist/'favicon.svg').read_text());assert svg.attrib['viewBox']=='0 0 32 32';assert not any(x.tag.endswith('script') for x in svg.iter())
assert len([x for x in svg.iter() if x.tag.endswith('path')])==2
subprocess.run(['python3',str(root/'build_feed.py')],check=True,cwd=root)
assert before=={str(p.relative_to(dist)):p.read_bytes() for p in pages},'Rebuild is not idempotent'
print(f'PASS favicon references, hashes, SVG-only bundle and idempotent build on {len(pages)} pages')
