"""Verify shared chrome on every delivered learning route, without a browser."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit

root = Path(__file__).resolve().parents[1]
shared = root / 'experiences/shared'
css = (shared / 'site-chrome.css').read_bytes()
module = (shared / 'site-chrome.mjs').read_bytes()

class Page(HTMLParser):
    def __init__(self, text):
        super().__init__()
        self.ids = []; self.support = []; self.x = []; self.buttons = []
        self.links = []; self.videos = []; self.captions = []; self.scripts = []; self.nav = []
        self.video_captions = []; self.current_video = None
        self.feed(text)
    def handle_starttag(self, tag, attrs):
        a = dict(attrs); classes = a.get('class', '').split()
        if 'id' in a: self.ids.append(a['id'])
        if 'data-report-support' in a: self.support.append(a)
        if 'report-x-link' in classes: self.x.append(a)
        if 'report-support__link' in classes: self.buttons.append(a)
        if tag == 'a': self.links.append(a.get('href', ''))
        if tag == 'nav': self.nav.append(a)
        if tag == 'video':
            self.videos.append(a); self.video_captions.append([]); self.current_video = len(self.videos) - 1
        if tag == 'track' and a.get('kind') == 'captions':
            self.captions.append(a)
            assert self.current_video is not None, 'Caption outside a video'
            self.video_captions[self.current_video].append(a)
        if tag == 'script' and 'src' in a: self.scripts.append(a['src'])

    def handle_endtag(self, tag):
        if tag == 'video': self.current_video = None

courses = {
    'attention-is-all-you-need/learn': (1, 12),
    'deep-residual-learning/learn': (1, 6),
    'generative-adversarial-nets/learn': (1, 8),
}
total_pages = total_videos = 0
for slug, (page_count, video_count) in courses.items():
    pages = sorted((root / 'build/notes' / slug).rglob('*.html'))
    assert len(pages) == page_count, (slug, len(pages))
    videos = 0
    for path in pages:
        text = path.read_text(); page = Page(text)
        assert len(page.ids) == len(set(page.ids)), path
        assert len(page.support) == len(page.x) == len(page.buttons) == 1, path
        assert text.count('class="report-support__github"') == 1, path
        assert '論文ノートを読む' not in text and '/units/' not in text, path
        for link, url in [(page.x[0], 'https://x.com/UnJuno_'), (page.buttons[0], 'https://github.com/sponsors/Unjuno')]:
            assert link['href'] == url and link['target'] == '_blank', path
            assert {'noopener', 'noreferrer'} <= set(link['rel'].split()), path
        assert '/rights/' in page.links and '/' in page.links, path
        assert any('report-header__nav' in n.get('class', '').split() for n in page.nav), path
        if slug.startswith('attention'):
            assert 'chapter-index' in page.ids, path
        elif slug.startswith('deep-residual-learning'):
            assert any('chapters' in n.get('class', '').split() for n in page.nav), path
            assert all('#' + unit in page.links for unit in ['residual', 'shape', 'depth', 'blocks', 'evidence']), path
        else:
            assert any(n.get('id') == 'chapters' or 'chapter-list' in n.get('class', '').split() for n in page.nav), path
            assert all('#chapter-' + unit in page.links for unit in ['roles', 'objective', 'optimal', 'equilibrium', 'training', 'saturation', 'evidence']), path
        assert len(page.videos) == len(page.captions), path
        assert all(len(tracks) == 1 for tracks in page.video_captions), path
        assert all(t.get('srclang') == 'ja' for t in page.captions), path
        assert all('autoplay' not in v for v in page.videos), path
        assert all(not urlsplit(src).scheme and not src.startswith('//') for src in page.scripts), path
        assert text.index('https://x.com/UnJuno_') < text.index('https://github.com/sponsors/Unjuno'), path
        if slug.startswith('attention'):
            assert css.decode() in text, 'Attention must embed canonical CSS, not the source adapter'
        videos += len(page.videos)
    assert videos == video_count, (slug, videos)
    total_pages += len(pages); total_videos += videos
resnet = root / 'build/notes/deep-residual-learning/src/shared'
assert (resnet / 'site-chrome.css').read_bytes() == css
assert (resnet / 'site-chrome.mjs').read_bytes() == module
assert (root / 'build/notes/generative-adversarial-nets/site-chrome.css').read_bytes() == css
print(f'PASS shared chrome: {total_pages} learning routes, {total_videos} captioned videos, one X/Sponsors pair each, canonical standalone styles, safe links and preserved navigation.')
