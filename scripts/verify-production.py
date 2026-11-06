"""Verify production ownership, media coverage, navigation and the final static build."""
from pathlib import Path
from hashlib import sha256
from html.parser import HTMLParser
from urllib.parse import urlsplit
import argparse
import json
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
LIBRARY = ROOT / 'paper-library'
DIST = LIBRARY / 'dist'
parser = argparse.ArgumentParser()
parser.add_argument('--built', action='store_true')
args = parser.parse_args()
subprocess.run(['python3', str(ROOT / 'scripts/check-attention-entry.py'), *(['--built'] if args.built else [])], check=True)

# These production files are deliberately preserved byte for byte from main 24c37f1.
# The article has only two approved additive blocks; its original content is checked separately.
preserved = {
    'src/layouts/SiteLayout.astro': '9e700957c5b8cbc1fdf75129eb748b8e8817e2f851586eaa5ff242980071f00a',
    'src/styles/global.css': 'd730832579484b928c94d862ad50758df098bb71ca5a5e1083e3984e2b4b9e88',
    '.openai/hosting.json': 'ed208961802d2f3bad3f5fcbee1deb5b500ae8857280187d6d254c842a385060',
    'package-lock.json': '030427eacdbe482cc23f2954725b4c9b311c69bddaf3790cd4a9063732b02f36',
}
for name, expected in preserved.items():
    assert sha256((ROOT / name).read_bytes()).hexdigest() == expected, name
sys.path.insert(0, str(LIBRARY))
from material_policy import load_materials
papers, _ = load_materials(LIBRARY)
assert [p['slug'] for p in papers] == ['attention-is-all-you-need']
assert papers[0]['preserve'] is True
assert json.loads((DIST / 'data/papers.json').read_text())['papers'] == papers
assert sorted(str(p.relative_to(DIST)) for p in (DIST / 'notes').rglob('*.html')) == ['notes/attention-is-all-you-need/index.html']
subprocess.run(['python3', str(ROOT / 'scripts/check-home-materials.py')] + (['--built'] if args.built else []), check=True)
registry = json.loads(subprocess.check_output(
    ['node', '-e', "console.log(JSON.stringify(require('./tests/scene-registry.cjs')()))"],
    cwd=LIBRARY, text=True))
assert len(registry['assets']) == len(set(registry['assets'])) == 130
assert len([name for name in registry['assets'] if name.startswith('selected-')]) == 100
assert len(registry['scenes']) == 146
assert 'selected-fern-cyanotype-v1.webp' not in registry['assets']
catalog = json.loads((DIST / 'assets/home-music/catalog.json').read_text())
assert len(catalog['tracks']) == 50
assert len({track['id'] for track in catalog['tracks']}) == 50
for track in catalog['tracks']:
    data = (DIST / track['url'].lstrip('/')).read_bytes()
    assert len(data) == track['bytes']
    assert sha256(data).hexdigest() == track['sha256']
# Superseded originals stay in the source bundle; only catalogue tracks ship.
catalog_paths = {track['url'].lstrip('/') for track in catalog['tracks']}
assert len(catalog_paths) == 50
licenses = {track['source_license'].lstrip('/') for track in catalog['tracks'] if track.get('source_license')}
assert licenses == {'assets/licenses/VCSL-CC0.txt'}
for name in licenses:
    assert 'CC0' in (DIST / name).read_text()
    assert '/' + name in (ROOT / 'src/pages/rights/index.astro').read_text()
assert 'その場で合成しています' not in (ROOT / 'src/pages/rights/index.astro').read_text()

class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = []
        self.card_count = 0
        self.refs = []
    def handle_starttag(self, tag, attrs):
        data = dict(attrs)
        if tag == 'article' and 'data-entry' in data:
            self.card_count += 1
        if 'id' in data:
            self.ids.append(data['id'])
        self.refs.extend(data[k] for k in ('href', 'src') if k in data)

if args.built:
    build = ROOT / 'build'
    pages = sorted(str(p.relative_to(build)) for p in build.rglob('*.html'))
    assert pages == ['index.html', 'notes/attention-is-all-you-need/index.html', 'notes/attention-is-all-you-need/learn/index.html', 'notes/gan/index.html', 'notes/resnet/index.html', 'rights/index.html'], pages
    subprocess.run(['python3', str(ROOT / 'scripts/check-reading-notes.py'), str(build)], check=True)
    home = (build / 'index.html').read_text()
    assert home.lower().count('<!doctype html>') == 1
    assert home.count('<html ') == home.count('</html>') == 1
    home_page = Page(); home_page.feed(home)
    assert home_page.card_count == 1
    assert 'id="notes"' in home and 'id="papers"' in home and 'id="about"' in home
    for name in registry['assets']:
        assert (build / 'assets' / name).read_bytes() == (DIST / 'assets' / name).read_bytes()
    assert len(list((build / 'assets/home-music').glob('*.mp3'))) == 50
    assert {str(path.relative_to(build)) for path in (build / 'assets/home-music').glob('*.mp3')} == catalog_paths
    for name in licenses:
        assert (build / name).read_bytes() == (DIST / name).read_bytes()
    assert not (build / 'assets/selected-fern-cyanotype-v1.webp').exists()
    assert not (build / 'assets/selected-star-trails-v1.png').exists()
    for track in catalog['tracks']:
        assert sha256((build / track['url'].lstrip('/')).read_bytes()).hexdigest() == track['sha256']
    for name in pages:
        path = build / name
        page = Page()
        page.feed(path.read_text())
        assert len(page.ids) == len(set(page.ids)), name
        for ref in page.refs:
            url = urlsplit(ref)
            if url.scheme or url.netloc:
                continue
            target = build / url.path.lstrip('/') if url.path.startswith('/') else path.parent / url.path if url.path else path
            if target.is_dir():
                target /= 'index.html'
            assert target.is_file(), (name, ref)
            if url.fragment:
                destination = Page()
                destination.feed(target.read_text())
                assert url.fragment in destination.ids, (name, ref)
    print('PASS root build: exactly 6 routes; 1 preserved article, 2 new reading notes and 1 learning experience; all links/anchors; 130 images and 50 tracks.')
print('PASS production source preservation, registered authored materials only, no production discovery, and complete media.')
