"""Native anchor contract checks. These do not emulate browser scroll/focus behavior."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlsplit
import re

ROOT = Path(__file__).resolve().parents[1]


class Page(HTMLParser):
    def __init__(self, text):
        super().__init__()
        self.tags = []
        self.header_links = []
        self.in_header = False
        self.feed(text)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        self.tags.append((tag, attrs))
        if tag == 'header':
            self.in_header = True
        if tag == 'a' and self.in_header:
            self.header_links.append(attrs)

    def handle_endtag(self, tag):
        if tag == 'header':
            self.in_header = False


home = Page((ROOT / 'dist/index.html').read_text())
brand, = [attrs for tag, attrs in home.tags
          if tag == 'a' and 'brand' in attrs.get('class', '').split()]
assert brand['href'] == '#top'
assert home.header_links[0] == brand
assert not any(key in brand for key in ('onclick', 'target', 'download', 'tabindex', 'role'))
assert [(tag, attrs) for tag, attrs in home.tags if attrs.get('id') == 'top'] == [
    ('body', {'id': 'top'})
], 'One explicit top target on the document body, not on the sticky header'
assert not any(tag == 'base' for tag, _ in home.tags), 'Fragment must remain in the current document'

# Native same-document resolution retains the current path and query. A repeated
# activation still has the same explicit target. This asserts URL semantics only.
for path in ('/', '/index.html'):
    for suffix in ('', '?source=bookmark', '#paper-cooperation-networks', '?source=bookmark#top'):
        current = 'https://report.example' + path + suffix
        destination = urlsplit(urljoin(current, brand['href']))
        origin = urlsplit(current)
        assert destination._replace(fragment='') == origin._replace(fragment='')
        assert destination.fragment == 'top'

# The native anchor is present outside noscript, so it remains an ordinary
# keyboard-activatable link in both JS-enabled and no-JS documents.
assert any(tag == 'a' and attrs.get('href') == '#papers' for tag, attrs in home.tags)
assert any(tag == 'main' and attrs.get('id') == 'papers' and attrs.get('tabindex') == '-1'
           for tag, attrs in home.tags), 'The existing skip target stays intact'

pages = list((ROOT / 'dist').rglob('*.html'))
for file in pages:
    if file == ROOT / 'dist/index.html':
        continue
    page = Page(file.read_text())
    assert page.header_links and page.header_links[0].get('href') == '/', file
    assert 'onclick' not in page.header_links[0], 'Other-page HOME links use a fixed URL, not history.back()'

css = (ROOT / 'dist/assets/feed.css').read_text()
assert re.search(r'html\s*\{[^}]*scroll-behavior\s*:\s*smooth', css)
assert re.search(r'@media\s*\(prefers-reduced-motion\s*:\s*reduce\)\s*\{\s*html\s*\{[^}]*scroll-behavior\s*:\s*auto', css)
print(f'PASS native HOME #top target, same-document URL/query semantics, keyboard/no-JS markup, '
      f'reduced-motion CSS, and {len(pages) - 1} other-page HOME links. Static checks, not browser verification.')
