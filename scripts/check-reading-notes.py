"""Candidate-only semantic regression guard; no browser/layout claim."""
from pathlib import Path
from html.parser import HTMLParser
import argparse
import json

VOID = {'area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'}
class Node:
    def __init__(self, tag='', attrs=()):
        self.tag=tag; self.attrs=dict(attrs); self.children=[]
    def all(self, tag=None, cls=None):
        out=[]
        for n in self.children:
            if isinstance(n,Node):
                if (tag is None or n.tag==tag) and (cls is None or cls in n.attrs.get('class','').split()): out.append(n)
                out.extend(n.all(tag,cls))
        return out
    def text(self): return ''.join(n.text() if isinstance(n,Node) else n for n in self.children)
class Parser(HTMLParser):
    def __init__(self, html):
        super().__init__(convert_charrefs=True); self.root=Node(); self.stack=[self.root]; self.feed(html)
    def handle_starttag(self, tag, attrs):
        n=Node(tag,attrs); self.stack[-1].children.append(n)
        if tag not in VOID: self.stack.append(n)
    def handle_startendtag(self, tag, attrs): self.stack[-1].children.append(Node(tag,attrs))
    def handle_endtag(self, tag):
        for i in range(len(self.stack)-1,0,-1):
            if self.stack[i].tag==tag: del self.stack[i:]; break
    def handle_data(self, text): self.stack[-1].children.append(text)

def one(nodes,label):
    assert len(nodes)==1, f'{label}: expected exactly one, got {len(nodes)}'
    return nodes[0]
def home_anchor(nodes,label):
    a=one(nodes,label)
    assert a.attrs.get('href')=='/', f'{label}: must return to HOME /'
    assert 'ホーム' in (a.text()+a.attrs.get('aria-label','')), f'{label}: missing HOME label'

def check(build):
    rows=[]
    for slug,paper,topic,disclaimer in [
        ('gan','1406.2661','theory','動画・操作教材や学習済みモデルの公開を意味しません。'),
        ('resnet','1512.03385','evidence','実装済みの推論モデルや動画教材の提供を意味しません。')]:
        root=Parser((build/f'notes/{slug}/index.html').read_text()).root
        main=one(root.all('main'),slug+' main')
        title=one(main.all('h1'),slug+' h1'); assert title.text().strip(),slug+' empty h1'
        article=one(main.all('article','article-body'),slug+' article')
        ids=[n.attrs['id'] for n in root.all() if 'id' in n.attrs]
        assert len(ids)==len(set(ids)),slug+' duplicate ids'
        for section in ['question','mechanism',topic,'limits','source']:
            s=one([n for n in article.all('section') if n.attrs.get('id')==section],slug+' section '+section)
            assert one(s.all('h2'),slug+' heading '+section).text().strip()
            assert any(p.text().strip() for p in s.all('p')),slug+' section body '+section
        home_anchor(root.all('a','wordmark'),slug+' wordmark')
        home_anchor(one(main.all('div','article-top'),slug+' breadcrumb').all('a'),slug+' breadcrumb HOME')
        home_anchor(one(article.all('div','next-note'),slug+' next-note').all('a','back-link'),slug+' bottom HOME')
        course = 'generative-adversarial-nets' if slug == 'gan' else 'deep-residual-learning'
        entry = one(main.all('aside','course-entry'),slug+' prominent course entry')
        link = one(entry.all('a'),slug+' course link')
        assert link.attrs.get('href') == f'/notes/{course}/' and '動画で学ぶ' in link.text(),slug+' course destination'
        assert (build/f'notes/{course}/index.html').is_file(),slug+' course missing'
        assert '未実施' in entry.text(),slug+' verification disclosure'
        text=article.text()
        assert 'このページは原論文の読解ノートです。' in text and disclaimer in text,slug+' disclaimer'
        assert not main.all('video'),slug+' unexpected video'
        refs=[n.attrs.get('href') for n in article.all('a')]
        assert f'https://arxiv.org/abs/{paper}' in refs,slug+' paper URL'
        assert f'https://doi.org/10.48550/arXiv.{paper}' in refs,slug+' DOI URL'
        sponsor=[a for a in main.all('a') if a.attrs.get('href')=='https://github.com/sponsors/Unjuno']
        s=one(sponsor,slug+' sponsor')
        assert s.attrs.get('target')=='_blank' and {'noopener','noreferrer'}<=set(s.attrs.get('rel','').split()),slug+' sponsor attributes'
        assert main.all('a')[-1] is s,slug+' sponsor must be final main link'
        assert '制作活動への任意の支援です。' in main.text(),slug+' voluntary support'
        rows.append({'slug':slug,'reading_note':True,'home_links':3,'sections':5,'sponsor_final':True,'video_count':0})
    return rows

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('build',type=Path);a=p.parse_args()
    print(json.dumps({'passed':check(a.build),'scope':'HTML semantics only; no rendered layout/browser/device verification'},ensure_ascii=False))
