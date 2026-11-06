"""Check active HOME policy and actual built learning destinations (no network)."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit
from hashlib import sha256
import argparse
import importlib.util
import json

parser = argparse.ArgumentParser()
parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[1])
parser.add_argument('--built', action='store_true')
args = parser.parse_args()
root = args.root.resolve()
library = root / 'paper-library'
output = root / 'build' if args.built else library / 'dist'
html = (output / 'index.html').read_text()

class Home(HTMLParser):
    def __init__(self, text):
        super().__init__()
        self.scripts, self.cards, self.ids = [], [], {}
        self.in_card = None
        self.feed(text)
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        assert 'data-papers-url' not in attrs, 'Unexpected discovery data source'
        assert attrs.get('id') not in ('load-more', 'feed-sentinel', 'feed-more'), 'Unexpected discovery control'
        if attrs.get('id'):
            self.ids[attrs['id']] = attrs
        if tag == 'script':
            assert attrs.get('src'), 'Unexpected inline HOME runtime'
            self.scripts.append(urlsplit(attrs['src']).path)
        if tag == 'article' and 'data-entry' in attrs:
            self.in_card = {'attrs': attrs, 'links': []}
            self.cards.append(self.in_card)
        if tag == 'a' and self.in_card is not None:
            self.in_card['links'].append(attrs)
    def handle_endtag(self, tag):
        if tag == 'article':
            self.in_card = None

page = Home(html)
active = ['/assets/' + name for name in ('feed-position.js', 'feed.js', 'cinema-field.js', 'spline-type.js', 'scroll-audio.js')]
assert page.scripts == active, f'Unexpected HOME scripts: {page.scripts}'
# The exact loaded dependency set contains no external discovery client. The
# one permitted fetch implementation is the unchanged local audio player.
for script in page.scripts:
    text = (output / script.lstrip('/')).read_text()
    assert not any(token in text for token in ('api.crossref.org', 'query.bibliographic', 'XMLHttpRequest', 'WebSocket(', 'EventSource(', 'import(')), script
    if script != '/assets/scroll-audio.js':
        assert 'fetch(' not in text and 'sendBeacon(' not in text, script
    else:
        assert "const CATALOG='/assets/home-music/catalog.json?" in text
        assert "!/^\\/assets\\/home-music\\/" in text
spec = importlib.util.spec_from_file_location('material_policy', library / 'material_policy.py')
policy = importlib.util.module_from_spec(spec)
spec.loader.exec_module(policy)
papers, materials = policy.load_materials(library)
assert json.loads((output / 'data/papers.json').read_text())['papers'] == papers
assert [card['attrs']['id'] for card in page.cards] == ['paper-' + paper['slug'] for paper in papers]
assert page.ids['papers']['data-local-count'] == page.ids['papers']['data-local-rendered'] == str(len(papers))
for paper, card in zip(papers, page.cards):
    assert 'hidden' not in card['attrs'], 'All admitted materials must be visible without JS'
    route = materials[paper['slug']]
    # First link is the heading; the only primary read link is the material.
    assert card['links'][0]['href'] == route
    read = [link for link in card['links'] if 'read' in link.get('class', '').split()]
    assert len(read) == 1 and read[0]['href'] == route
    if args.built:
        target = root / 'build' / route.lstrip('/') / 'index.html'
        attention = paper['slug'] == 'attention-is-all-you-need'
        expected = root / 'experiences' / paper['slug'] / ('build-production/index.html' if attention else 'public/index.html')
        assert target.is_file() and expected.is_file(), f'Missing built material: {route}'
        content = target.read_text()
        assert content.strip() == expected.read_text().strip(), f'Built material differs from authored package: {route}'
        assert '<main ' in content and '<h1>' in content
        assert '論文ノートを読む' not in content
        counts = {'attention-is-all-you-need': 12, 'deep-residual-learning': 6, 'generative-adversarial-nets': 8}
        assert content.count('<video ') == counts[paper['slug']], 'Preserve every supplied course video'
        assert '未確認' in content or '未検証' in content or '未実施' in content
assert ('hidden' not in page.ids['empty']) == (not papers)
assert f'{len(papers)}件の論文' in html, 'Count must exist before JavaScript'
if not papers:
    assert '公開中の学習教材はまだありません。' in html
if args.built:
    for stage in (root / '.home-public', root / 'build'):
        for runtime in stage.rglob('*.js'):
            assert 'api.crossref.org' not in runtime.read_text(), f'External discovery shipped: {runtime}'
        for name in ('feed-pagination.js', 'infinite-feed.js'):
            assert not (stage / 'assets' / name).exists(), f'Unapproved runtime shipped: {stage}/{name}'
        for script in active:
            assert sha256((stage / script.lstrip('/')).read_bytes()).digest() == sha256((library / 'dist' / script.lstrip('/')).read_bytes()).digest()
print(f'PASS {"built" if args.built else "source"} HOME: {len(papers)} registered authored materials; complete static/no-JS list; learning links; no discovery runtime.')
