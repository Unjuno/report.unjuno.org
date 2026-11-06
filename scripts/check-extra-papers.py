"""Check the two authored single-scroll packages without network access."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit
from hashlib import sha256
import argparse
import json

parser = argparse.ArgumentParser()
parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[1])
parser.add_argument('--built', action='store_true')
args = parser.parse_args()
root = args.root.resolve()
packages = {
    'deep-residual-learning': {
        'units': ['residual', 'shape', 'depth', 'blocks', 'evidence'],
        'video': 'media/overview-ja.mp4',
        'hash': '6836b0de9b8becd396d40b86c51d9c7cbd17120ac1c84863c6e3a315d21d2f23',
    },
    'generative-adversarial-nets': {
        'units': ['roles', 'objective', 'optimal', 'equilibrium', 'training', 'saturation', 'evidence'],
        'video': 'media/gan-overview-ja.mp4',
        'hash': '6e272e57b59b44b8f38ccdb5d5006e81c43ff2b3a282e796f40942996dd3439f',
    },
}

class Page(HTMLParser):
    def __init__(self, text):
        super().__init__(); self.ids = []; self.refs = []; self.h1 = 0; self.brand = []; self.support = []; self.video = 0; self.feed(text)
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if 'id' in attrs: self.ids.append(attrs['id'])
        if tag == 'h1': self.h1 += 1
        if tag == 'video': self.video += 1
        if 'report-header__brand' in attrs.get('class', '').split(): self.brand.append(attrs.get('href'))
        if 'data-report-support' in attrs: self.support.append(attrs)
        self.refs.extend(attrs[key] for key in ('href', 'src', 'poster') if key in attrs)

route_count = 0
for slug, config in packages.items():
    prefix = '/notes/' + slug + '/'
    public = root / 'experiences' / slug / 'public'
    expected = {'index.html'}
    assert {str(p.relative_to(public)) for p in public.rglob('*.html')} == expected, slug
    assert sha256((public / config['video']).read_bytes()).hexdigest() == config['hash'], slug
    assert not (public / 'reference').exists(), 'Full research paper must not ship'
    chapter_manifest = public / 'media/chapter-videos.json'
    clips = json.loads(chapter_manifest.read_text())['chapters'] if chapter_manifest.is_file() else []
    ready = {clip['id']: clip for clip in clips}
    assert len(ready) == len(clips) and set(ready) <= set(config['units']), slug
    for clip in clips:
        for key in ('video', 'poster', 'captions', 'transcript'):
            value = clip[key]
            if value.startswith('/'):
                assert value.startswith(prefix), (slug, key)
                value = value[len(prefix):]
            rel = Path(value)
            assert not rel.is_absolute() and '..' not in rel.parts and (public / rel).is_file(), (slug, key)
        video_rel = clip['video'][len(prefix):] if clip['video'].startswith(prefix) else clip['video']
        video = (public / video_rel).read_bytes()
        assert len(video) == clip['bytes'] and sha256(video).hexdigest() == clip['sha256'], (slug, clip['id'])
    wrapper = root / 'src/pages/notes' / slug / 'learn/index.astro'
    assert wrapper.is_file(), slug
    assert 'public/index.html?raw' in wrapper.read_text()
    for name in sorted(expected):
        path = public / name; text = path.read_text(); page = Page(text)
        assert page.h1 == 1 and page.brand == ['/'] and len(page.support) == 1, (slug, name)
        assert len(page.ids) == len(set(page.ids)), (slug, name)
        unit = name.split('/')[1] if name.startswith('units/') else None
        assert page.video == 1 + len(config['units']), (slug, name)
        assert '未検証' in text or '未実施' in text, (slug, name)
        if unit in ready:
            clip = ready[unit]
            assert all((clip[key] if clip[key].startswith(prefix) else prefix + clip[key]) in page.refs for key in ('video', 'poster', 'captions', 'transcript')), (slug, unit)
        elif unit is not None:
            assert '未制作' in text or '制作中' in text, (slug, name)
        if unit is None and len(ready) < len(config['units']):
            assert '未制作' in text or '制作中' in text, (slug, name)
        if args.built:
            built = root / 'build/notes' / slug / 'learn' / name
            assert built.is_file() and built.read_text().strip() == text.strip(), (slug, name)
        for ref in page.refs:
            url = urlsplit(ref)
            if url.scheme or url.netloc: continue
            if url.path in ('/', '/rights/', '/favicon.svg'):
                if args.built:
                    target = root / 'build' / url.path.lstrip('/')
                    if target.is_dir(): target /= 'index.html'
                    assert target.is_file(), ref
                continue
            if url.path:
                assert url.path.startswith(prefix), (slug, name, ref)
                rel = url.path[len(prefix):] or 'index.html'
                if rel == 'learn/': rel = 'index.html'
                target = public / rel
                if target.is_dir(): target /= 'index.html'
            else: target = path
            assert target.is_file(), (slug, name, ref)
            if url.fragment: assert url.fragment in Page(target.read_text()).ids, (slug, name, ref)
    if args.built:
        for source in public.rglob('*'):
            if not source.is_file() or source.suffix == '.html': continue
            rel = source.relative_to(public)
            for stage in (root / '.home-public/notes' / slug, root / 'build/notes' / slug):
                assert (stage / rel).is_file() and (stage / rel).read_bytes() == source.read_bytes(), (stage, rel)
        assert not list((root / '.home-public/notes' / slug).rglob('*.html')), 'Astro owns every HTML page'
    route_count += len(expected)
print(f'PASS {route_count} single-scroll authored pages; exact chapter sets; isolated video hashes; HOME/rights/Sponsors; internal links; source/built/media parity.')
