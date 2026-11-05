from html.parser import HTMLParser
from pathlib import Path
import re, sys
html=Path(sys.argv[1] if len(sys.argv)>1 else 'dist/index.html').read_text()
match=re.search(r'<noscript>(.*?)</noscript>',html,re.S)
assert match
fallback=match.group(1)
assert 'class="static-library"' in fallback
assert 'JavaScriptが無効' in fallback and '5件' in fallback and '未作成' in fallback
class Elements(HTMLParser):
 def __init__(self): super().__init__();self.tags=[]
 def handle_starttag(self,t,a): self.tags.append((t,dict(a)))
p=Elements();p.feed(fallback)
assert not any(t in ('button','input','canvas','svg','script') for t,a in p.tags)
links=[a['href'] for t,a in p.tags if t=='a']
assert links==['/notes/attention-is-all-you-need/']
assert Path('dist'+links[0]+'index.html').exists()
style=re.search(r'<style>(.*?)</style>',fallback,re.S).group(1)
assert '#atlas .search,#atlas .world,#atlas .explore-controls,#atlas>.skip{display:none!important}' in style
# The normal JS-enabled DOM excludes noscript content; IDs are unique in either mode.
for content in (html[:match.start()]+html[match.end():],html):
 q=Elements();q.feed(content);ids=[a['id'] for _,a in q.tags if 'id' in a];assert len(ids)==len(set(ids))
assert 'https://github.com/sponsors/Unjuno' in html and 'href="/rights/"' in html
print('PASS no-JS readable real article, no inert fallback controls, scoped hidden dynamic UI, unique IDs, Sponsors and rights retained')
