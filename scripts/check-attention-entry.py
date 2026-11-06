"""Check preserved article text, working narrated-media routes, and final support links."""
from pathlib import Path
from hashlib import sha256
from html.parser import HTMLParser
from urllib.parse import urlsplit
import argparse
import html
import json
import re

ROOT = Path(__file__).resolve().parents[1]
LEGACY_SHA = '8382ebf12498e3ff8b80d928360dade016a89478350f6692ada0ba3a14ec75b0'
SUPPORT = 'https://github.com/sponsors/Unjuno'
LEARN = '/notes/attention-is-all-you-need/learn/'
MARKERS = ('LEARNING ENTRY', 'SUPPORT')

class Page(HTMLParser):
    def __init__(self, content):
        super().__init__(); self.tags = []; self.words = []; self.feed(content)
    def handle_starttag(self, tag, attrs):
        self.tags.append((tag, dict(attrs)))
    def handle_data(self, data):
        self.words.append(data)
    def attrs(self, tag):
        return [a for t, a in self.tags if t == tag]

def preserved_article(source, reference):
    assert sha256(reference.encode()).hexdigest() == LEGACY_SHA, 'Legacy reference changed'
    for label in MARKERS:
        pattern = rf'^    <!-- BEGIN MANAGED ATTENTION {label} -->\n.*?^    <!-- END MANAGED ATTENTION {label} -->\n'
        source, count = re.subn(pattern, '', source, flags=re.M | re.S)
        assert count == 1, f'Expected one managed {label} block'
    assert source == reference, 'Original article content changed outside approved additions'

def sponsor_check(content, name):
    p = Page(content)
    links = [a for a in p.attrs('a') if 'github.com/sponsors' in a.get('href', '')]
    assert len(links) == 1, (name, 'Expected one support link')
    assert links[0]['href'] == SUPPORT, (name, 'Wrong support recipient')
    assert links[0].get('target') == '_blank', (name, 'New-tab support link')
    assert {'noopener', 'noreferrer'} <= set(links[0].get('rel', '').split()), name
    assert '制作活動への任意の支援です。' in ''.join(p.words), name
    return p

def source_check():
    article = (ROOT / 'archive/reading-notes/attention-is-all-you-need.astro').read_text()
    reference = (ROOT / 'experiences/attention-is-all-you-need/reference/legacy-index.astro').read_text()
    preserved_article(article, reference)
    p = sponsor_check(article, 'article source')
    assert len([a for a in p.attrs('a') if a.get('href') == LEARN]) == 1
    assert article.index('BEGIN MANAGED ATTENTION LEARNING ENTRY') < article.index('class="article-grid"')
    assert article.index('BEGIN MANAGED ATTENTION SUPPORT') > article.index('id="source"')
    assert article.index('END MANAGED ATTENTION SUPPORT') < article.rindex('</main>')
    # Negative controls demonstrate these gates catch a body edit and a wrong recipient.
    for broken in [article.replace('Transformerを提案した', 'Transformerを変更した', 1), article.replace('BEGIN MANAGED ATTENTION SUPPORT', 'BEGIN BROKEN SUPPORT', 1)]:
        try: preserved_article(broken, reference)
        except AssertionError: pass
        else: raise AssertionError('Preservation negative control was missed')
    try: sponsor_check(article.replace(SUPPORT, 'https://github.com/sponsors/other'), 'negative')
    except AssertionError: pass
    else: raise AssertionError('Recipient negative control was missed')

def built_check():
    build = ROOT / 'build'
    learn_dir = build / 'notes/attention-is-all-you-need/learn'; content = (learn_dir / 'index.html').read_text()
    p = sponsor_check(content, 'built learning page')
    assert content.index('data-report-support') > content.rindex('</main>'), 'Support must follow the lesson'
    config = json.loads((ROOT / 'experiences/attention-is-all-you-need/content/experience.json').read_text())
    ready = [v for v in [config['overview'], *[u['video'] for u in config['units']]] if v['status'] == 'ready']
    videos = p.attrs('video'); sources = p.attrs('source'); tracks = p.attrs('track')
    assert len(ready) == len(videos) == len(sources) == len(tracks) == 12
    assert {s['src'] for s in sources} == {v['src'] for v in ready}
    assert {t['src'] for t in tracks} == {v['captions'] for v in ready}
    assert all('controls' in v and 'autoplay' not in v and v.get('preload') == 'none' for v in videos)
    words = ' '.join(' '.join(p.words).split())
    assert len(config['units']) == 11
    for unit in config['units']:
        assert unit['learning_goal'] in words, unit['id']
    for media in ready:
        for key in ('src', 'poster', 'captions'):
            url = urlsplit(media[key]); assert not url.scheme and not url.netloc and not url.path.startswith('/')
            target = learn_dir / url.path; assert target.is_file() and target.stat().st_size > 0, target
        assert (learn_dir / media['src']).read_bytes()[4:8] == b'ftyp'
        assert (learn_dir / media['captions']).read_text().startswith('WEBVTT')
        transcript = (ROOT / 'experiences/attention-is-all-you-need' / media['transcript']).read_text()
        assert ' '.join(transcript.split()) in words, media['transcript']
    # All currently built note/learning routes must end with the same recipient.
    for page in build.glob('notes/*/learn/index.html'):
        sponsor_check(page.read_text(), str(page.relative_to(build)))

if __name__ == '__main__':
    parser = argparse.ArgumentParser(); parser.add_argument('--built', action='store_true'); args = parser.parse_args()
    source_check()
    if args.built: built_check()
    print('PASS archived Attention article, only-learn entry, final Unjuno Sponsors links' + ('; 12 videos/captions/transcripts and 11 learning explanations.' if args.built else '.'))
