"""Build HOME and stage only its active public files for the root Astro build."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit
import json
import shutil
import subprocess

ROOT = Path(__file__).resolve().parents[1]
LIBRARY = ROOT / 'paper-library'
DIST = LIBRARY / 'dist'
STAGE = ROOT / '.home-public'

subprocess.run(['python3', 'build_feed.py'], cwd=LIBRARY, check=True)
registry = json.loads(subprocess.check_output(
    ['node', '-e', "console.log(JSON.stringify(require('./tests/scene-registry.cjs')()))"],
    cwd=LIBRARY, text=True))
catalog = json.loads((DIST / 'assets/home-music/catalog.json').read_text())
assert len(registry['assets']) == 130
assert len([name for name in registry['assets'] if name.startswith('selected-')]) == 100
assert len(catalog['tracks']) == 50

files = {'assets/' + name for name in registry['assets']}
files.add('assets/home-music/catalog.json')
files.update(track['url'].lstrip('/') for track in catalog['tracks'])
files.update(track['source_license'].lstrip('/') for track in catalog['tracks'] if track.get('source_license'))
files.update({'data/papers.json', 'assets/github-mark.svg'})

class References(HTMLParser):
    def handle_starttag(self, tag, attrs):
        for key, value in attrs:
            if key not in ('href', 'src') or not value:
                continue
            url = urlsplit(value)
            if url.scheme or url.netloc or not url.path.startswith('/'):
                continue
            name = url.path.lstrip('/')
            if (DIST / name).is_file():
                files.add(name)

References().feed((DIST / 'index.html').read_text())
# Historical discovery assets may remain as test fixtures, never production.
for name in ('assets/feed-pagination.js', 'assets/infinite-feed.js'):
    assert name not in files, f'Unapproved discovery runtime: {name}'
if STAGE.exists():
    shutil.rmtree(STAGE)
shutil.copytree(ROOT / 'public', STAGE)
for name in sorted(files):
    source = DIST / name
    if not source.is_file():
        raise FileNotFoundError(source)
    destination = STAGE / name
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(source, destination)
assert not list(STAGE.rglob('*.html')), 'Astro owns all page routes'
for runtime in STAGE.rglob('*.js'):
    assert 'api.crossref.org' not in runtime.read_text(), f'External discovery runtime staged: {runtime}'
for name in ('assets/feed-pagination.js', 'assets/infinite-feed.js'):
    assert not (STAGE / name).exists(), f'Unapproved discovery runtime staged: {name}'
print(f'Staged {len(files)} HOME files: 130 registered images and 50 tracks; Astro owns all routes.')
