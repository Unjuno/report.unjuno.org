from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, parse_qs
from hashlib import sha256
import struct, re, subprocess
import xml.etree.ElementTree as ET
root = Path(__file__).resolve().parents[1]
dist = root / 'dist'
expected = {
 '/favicon.ico': ('icon', 'image/x-icon', '16x16 32x32 48x48 64x64'),
 '/favicon-16x16.png': ('icon', 'image/png', '16x16'),
 '/favicon-32x32.png': ('icon', 'image/png', '32x32'),
 '/favicon.svg': ('icon', 'image/svg+xml', 'any'),
 '/apple-touch-icon.png': ('apple-touch-icon', 'image/png', '180x180'),
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
for name,size in [('favicon-16x16.png',16),('favicon-32x32.png',32),('apple-touch-icon.png',180)]:
 data=(dist/name).read_bytes(); assert data[:8]==b'\x89PNG\r\n\x1a\n'; assert struct.unpack('>II',data[16:24])==(size,size)
ico=(dist/'favicon.ico').read_bytes(); zero,kind,count=struct.unpack('<HHH',ico[:6]);assert (zero,kind)==(0,1)
sizes={(ico[6+i*16] or 256,ico[7+i*16] or 256) for i in range(count)};assert {(16,16),(32,32),(48,48),(64,64)}<=sizes
svg=ET.fromstring((dist/'favicon.svg').read_text());assert svg.attrib['viewBox']=='0 0 32 32';assert not any(x.tag.endswith('script') for x in svg.iter())
assert len([x for x in svg.iter() if x.tag.endswith('path')])==2
subprocess.run(['python3',str(root/'build_feed.py')],check=True,cwd=root)
assert before=={str(p.relative_to(dist)):p.read_bytes() for p in pages},'Rebuild is not idempotent'
print(f'PASS favicon references, hashes, PNG/ICO sizes, SVG and idempotent build on {len(pages)} pages')
