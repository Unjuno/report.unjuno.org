"""Four-field editor contract and hypothetical 0/15-card generator fixtures.

The copied packages below are structural test fixtures, not published works or
15 real materials. The production build is separately checked as 1 item/4 routes.
"""
from pathlib import Path
import tempfile
import shutil
import json
import subprocess
from hashlib import sha256
from html.parser import HTMLParser

root = Path(__file__).resolve().parents[1]
class Page(HTMLParser):
    def __init__(self, text):
        super().__init__(); self.cards = []; self.empty = None; self.feed(text)
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'article' and 'data-entry' in attrs: self.cards.append(attrs)
        if attrs.get('id') == 'empty': self.empty = attrs

with tempfile.TemporaryDirectory() as t:
    project = Path(t); p = project / 'paper-library'; p.mkdir()
    for name in ('build_feed.py', 'material_policy.py'):
        shutil.copy(root / name, p / name)
    shutil.copytree(root / 'content', p / 'content')
    (p / 'dist/assets').mkdir(parents=True)
    for name in ('feed.css', 'feed.js', 'feed-position.js', 'cinema-field.js', 'spline-type.js', 'scroll-audio.js'):
        shutil.copy(root / 'dist/assets' / name, p / 'dist/assets' / name)
    for name in ('favicon.ico', 'favicon-16x16.png', 'favicon-32x32.png', 'favicon.svg', 'apple-touch-icon.png'):
        shutil.copy(root / 'dist' / name, p / 'dist' / name)
    shutil.copytree(root / 'dist/notes', p / 'dist/notes')
    records = json.loads((p / 'content/integrated-materials.json').read_text())
    wrapper = (root.parent / 'src/pages/notes/attention-is-all-you-need/learn/index.astro').read_text()
    def integrate(slug):
        route = project / f'src/pages/notes/{slug}/learn/index.astro'
        route.parent.mkdir(parents=True, exist_ok=True)
        route.write_text(wrapper.replace('attention-is-all-you-need', slug))
        for name in ('content/experience.json', 'tools/build-site.mjs', 'src/site/lessons.mjs'):
            target = project / 'experiences' / slug / name
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy(root.parent / 'experiences/attention-is-all-you-need' / name, target)
        source = project / 'experiences' / slug / 'content/experience.json'
        data = json.loads(source.read_text()); data['slug'] = slug
        source.write_text(json.dumps(data))
        return route
    route = integrate('attention-is-all-you-need')
    def write(data):
        (p / 'content/integrated-materials.json').write_text(json.dumps(data))
    def snapshot():
        return {str(f.relative_to(p / 'dist')): sha256(f.read_bytes()).hexdigest() for f in (p / 'dist').rglob('*') if f.is_file()}
    def build(ok=True, message=''):
        before = snapshot()
        result = subprocess.run(['python3', str(p / 'build_feed.py')], capture_output=True, text=True)
        if ok:
            assert result.returncode == 0, result.stderr
            return Page((p / 'dist/index.html').read_text())
        assert result.returncode != 0 and message in result.stderr, result.stderr
        assert snapshot() == before, 'Rejected admission must not write generated output'
    def policy_check(ok=True):
        result = subprocess.run(['python3', str(root.parent / 'scripts/check-home-materials.py'), '--root', str(project)], capture_output=True, text=True)
        assert (result.returncode == 0) == ok, result.stdout + result.stderr
    def runtime():
        policy_check()
        subprocess.run(['node', str(root / 'tests/material-editor-runtime.cjs'), str(p / 'dist')], check=True)
    def derived():
        return json.loads((p / 'dist/data/papers.json').read_text())['papers']
    old = (p / 'dist/notes/attention-is-all-you-need/index.html').read_bytes()
    page = build(); assert len(page.cards) == 1; runtime()
    first = snapshot(); build(); assert snapshot() == first, 'Regeneration is byte-idempotent'
    assert derived()[0]['authors'] == 'Ashish Vaswani et al.'
    assert derived()[0]['authors_full'] == records[0]['authors']
    assert derived()[0]['primary_paper_url'] == 'https://arxiv.org/abs/1706.03762'
    assert derived()[0]['year'] == 2017
    # Neither an obsolete source file nor generated output can override edits.
    (p / 'content/papers.json').write_text('not an input')
    (p / 'dist/data/papers.json').write_text('not an input')
    build(); assert snapshot() == first
    (p / 'dist/data/papers.json').unlink(); build(); assert snapshot() == first
    for value in ({}, None, 'bad', [None], [1], [dict(records[0], slug='extra')], [{k:v for k,v in records[0].items() if k != 'summary'}]):
        write(value); build(False)
    for key, values in {'title':['', '  ', None, 1, [], {}], 'summary':['', '\t', None, 1, [], {}], 'authors':['Author', [], [''], ['  '], [1], [None], {}, None, True]}.items():
        for value in values:
            write([dict(records[0], **{key:value})]); build(False, key)
    for value in [None, 7, [], '', '/', 'notes/attention-is-all-you-need/learn/', '/notes/attention-is-all-you-need/', 'https://report.unjuno.org/notes/attention-is-all-you-need/learn/', 'https://evil.invalid/', '//evil.invalid/notes/x/learn/', 'javascript:alert(1)', '/notes/attention-is-all-you-need/learn/?x=1', '/notes/attention-is-all-you-need/learn/#a', '/notes/../learn/', '/notes/a/../attention-is-all-you-need/learn/', '/notes/%2e%2e/learn/', '/notes/attention%2dis-all-you-need/learn/', '/notes/a\\b/learn/', '/notes/a//learn/', '/notes/ATTENTION/learn/', '/notes/a-/learn/', '/notes/a/learn//', '/notes/a/learn/\x00']:
        write([dict(records[0], url=value)]); build(False)
    for invalid in ('[', '[{"title":"A","title":"B","authors":["A"],"summary":"S","url":"/notes/a/learn/"}]'):
        (p / 'content/integrated-materials.json').write_text(invalid); build(False)
    write([records[0], dict(records[0], url='  /notes/attention-is-all-you-need/learn  ')]); build(False, 'Duplicate integrated material URL')
    write([dict(records[0], url='  /notes/attention-is-all-you-need/learn  ')]); build(); assert snapshot() == first
    # One editor change controls visible metadata and local search, including
    # characters that must be escaped, not interpreted as HTML/regex syntax.
    edited = dict(records[0], title='Edited <title> \\1 \"quote\"\nnext', authors=['New <Author> \\Q\nline', 'Second & Author \"quote\"'], summary='Edited <summary> \\g<1> \"quote\"\nnext 背景はAI生成の空想です 構造を想起する概念図・実測値ではありません Crossref load-more data-papers-url data-entry data-search=')
    write([edited]); page = build(); data = derived()[0]
    assert data['title'] == edited['title'] and data['authors_full'] == edited['authors'] and data['summary_ja'] == edited['summary']
    assert data['authors'] == edited['authors'][0] + ' et al.'
    for value in (edited['title'], *edited['authors'], edited['summary'], edited['url']): assert value in page.cards[0]['data-search']
    html = (p / 'dist/index.html').read_text()
    assert 'Edited &lt;title&gt;' in html and 'Second &amp; Author' in html and 'Edited &lt;summary&gt;' in html
    assert 'Ashish Vaswani' not in html and 'RNNやCNN' not in html
    assert html.count('id="search"') == html.count('id="clear"') == 1 and 'class="sidebar"' not in html
    runtime()
    original_home = (p / 'dist/index.html').read_text()
    for markup in ('<button id="load-more">More</button>', '<div data-papers-url="/data/papers.json"></div>'):
        (p / 'dist/index.html').write_text(original_home.replace('</main>', markup + '</main>'))
        policy_check(False)
    (p / 'dist/index.html').write_text(original_home)
    extra = dict(records[0], url='/notes/unimplemented-paper/learn/', title='Metadata only')
    write(records + [extra]); build(False, 'Missing integrated')
    pending = project / 'src/pages/notes/unimplemented-paper/learn/index.astro'; pending.parent.mkdir(parents=True); pending.write_text('<h1>Coming soon</h1>')
    build(False, 'Unimplemented learning route wrapper')
    pending.write_text('<!-- ' + wrapper.replace('attention-is-all-you-need', 'unimplemented-paper') + ' -->'); build(False, 'Unimplemented learning route wrapper')
    pending.write_text(wrapper.replace('attention-is-all-you-need', 'unimplemented-paper')); build(False, 'Missing authored learning source')
    write(records)
    original_route = route.read_text(); route.unlink(); build(False, 'Missing integrated'); route.write_text(original_route)
    route.write_text(wrapper.replace('build-production', 'build-local')); build(False, 'Unimplemented'); route.write_text(original_route)
    source = project / 'experiences/attention-is-all-you-need/content/experience.json'; original_source = source.read_text()
    data = json.loads(original_source); data['slug'] = 'wrong'; source.write_text(json.dumps(data)); build(False, 'identity')
    data['slug'] = 'attention-is-all-you-need'; data['units'] = []; source.write_text(json.dumps(data)); build(False, 'no authored units'); source.write_text(original_source)
    lessons = project / 'experiences/attention-is-all-you-need/src/site/lessons.mjs'; lesson_source = lessons.read_text(); lessons.write_text(''); build(False, 'Missing authored'); lessons.write_text(lesson_source)
    write([]); page = build(); assert not page.cards and 'hidden' not in page.empty and derived() == []; runtime()
    many = list(records)
    for i in range(1, 15):
        slug = f'integrated-fixture-{i}'
        many.append(dict(records[0], url=f'/notes/{slug}/learn/', title=f'Integrated fixture {i}'))
        integrate(slug)
    write(many); page = build(); runtime()
    assert [card['id'] for card in page.cards] == ['paper-' + item['url'].split('/')[2] for item in many]
    assert all('hidden' not in card for card in page.cards)
    assert all(paper['year'] == '' and paper['tags'] == [] for paper in derived()[1:]), 'No invented metadata for new works'
    html = (p / 'dist/index.html').read_text()
    assert 'data-local-count="15" data-local-rendered="15"' in html
    assert not any(x in html for x in ('feed-pagination.js', 'data-papers-url', 'load-more'))
    assert len(list((p / 'dist/notes').glob('*/index.html'))) == 1, 'Metadata never generates articles'
    assert old == (p / 'dist/notes/attention-is-all-you-need/index.html').read_bytes()
print('PASS four-field editor, escaping/display/search, strict types/URLs/duplicates/malformed JSON, missing/stub/mismatched source rejection before writes; hypothetical empty/15-card static fixtures, idempotence, article unchanged. Not 15 production materials.')
