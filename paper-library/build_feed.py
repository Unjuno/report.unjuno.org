"""Build the complete static HOME listing of explicitly integrated authored materials."""
from pathlib import Path
from html import escape as e
from hashlib import sha256
import json, math
from material_policy import load_materials
ROOT=Path(__file__).parent; DIST=ROOT/'dist'
# Validate the complete editor input before any generated file is written.
papers, materials = load_materials(ROOT)
# Every registered material is present in the initial HTML, with or without JS.
def art(p):
 # Illustrative topology only. None of these marks represents reported measurements.
 lines=[]
 if p['visual']=='attention':
  for i in range(8):
   x=180+i*75
   for j in range(8):
    lines.append(f'<path d="M{x} 210 Q500 {290+abs(i-j)*16} {180+j*75} 490" opacity="{.08+.07*(i==j)}"/>')
   lines.append(f'<path d="M{x-12} 192h24v30h-24z M{x-12} 478h24v30h-24z" fill="currentColor" stroke="none" opacity=".7"/>')
 elif p['visual']=='network':
  points=[(500+220*math.cos(i*math.tau/24),350+220*math.sin(i*math.tau/24)) for i in range(24)]
  for i,(x,y) in enumerate(points):
   for delta in (1,4):
    X,Y=points[(i+delta)%24];lines.append(f'<path d="M{x} {y}L{X} {Y}" opacity=".2"/>')
   lines.append(f'<circle cx="{x}" cy="{y}" r="5" fill="currentColor"/>')
 else:
  for i in range(24):
   t=i/23; y=130+440*t; x=420+80*math.sin(t*4)
   lines.append(f'<path d="M500 580 Q{x} {y+30} {250+140*math.sin(t*2)} {y} M500 580 Q{1000-x} {y+30} {750-140*math.sin(t*2)} {y}" opacity=".3"/>')
 return '<svg viewBox="0 0 1000 700" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><g class="drift">'+''.join(lines)+'</g></svg>'
def url(p):return materials[p['slug']]
entries=[]
for i,p in enumerate(papers):
 search=' '.join([p['title'],p['authors'],p['category'],str(p['year']),p['claim'],*p['tags']])
 entries.append(f'''<article id="paper-{e(p['slug'])}" class="entry" data-entry data-search="{e(search,quote=True)}"><div class="art" style="color:var(--tint)">{art(p)}</div><div class="content"><p class="meta"><span class="index">{i+1:02d}</span><span>{p['year']}</span></p><h2><a href="{url(p)}">{e(p['title'])}</a></h2><a class="read" href="{url(p)}">学習教材を読む<span aria-hidden="true">↗</span></a></div><span class="source-note">構造を想起する概念図・実測値ではありません</span></article>''')
css=sha256((DIST/'assets/feed.css').read_bytes()).hexdigest()[:12];js=sha256((DIST/'assets/feed.js').read_bytes()).hexdigest()[:12]
rail=''.join(f'<a href="#paper-{e(p["slug"])}" aria-label="{e(p["title"],quote=True)}"><i aria-hidden="true"></i></a>' for p in papers)
(DIST/'index.html').write_text(f'''<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>report.unjuno.org — 論文を探す</title><link rel="stylesheet" href="/assets/feed.css?v={css}"></head><body id="top"><a class="skip" href="#papers">論文へ</a><header><a class="brand" href="#top">report.unjuno.org</a><div class="search"><label class="sr-only" for="search">掲載中の学習教材を絞り込む</label><input id="search" type="search" placeholder="論文・分野・著者を探す" autocomplete="off"><button class="clear" id="clear" type="button">クリア</button></div><a class="sponsor" aria-label="GitHub Sponsorsで制作を支援（新しいタブ）" href="https://github.com/sponsors/Unjuno" target="_blank" rel="noopener noreferrer"><img src="/assets/github-mark.svg" width="24" height="24" alt=""><span>GitHub Sponsors<small>制作を支援</small></span></a></header><div class="intro"><p id="count" role="status" aria-live="polite">{len(papers)}件の論文</p><p>自然・社会・計算を、論文から。</p></div><span id="notes" aria-hidden="true"></span><main id="papers" tabindex="-1" aria-label="論文一覧" data-local-count="{len(papers)}" data-local-rendered="{len(papers)}">{''.join(entries)}<div class="empty" id="empty"{' hidden' if papers else ''}>{'一致する論文がありません。' if papers else '公開中の学習教材はまだありません。'}</div></main><nav class="progress" aria-label="論文の位置">{rail}</nav><footer id="about"><p>実在する論文と一次資料への入口です。掲載はユーザーの読了を意味しません。</p><button class="motion" id="motion" type="button" aria-pressed="false">背景を停止</button><a href="/rights/">著作権・再利用方針</a></footer><noscript><style>.feed-search,.search,.motion,.categories{{display:none}}</style></noscript><script src="/assets/feed.js?v={js}" defer></script></body></html>''')
print(f'Built {len(papers)} static authored-material entries; article routes remain separately owned')
# Temporary navigation markup is consolidated below; anchors work without JS.
home=(DIST/'index.html').read_text()
start=home.index('<div class="search">');end=home.index('</div>',start)+6
search=home[start:end];home=home[:start]+home[end:]
nav=''.join(f'<a href="#paper-{e(p["slug"])}">{e(p["title"])}</a>' for p in papers)
categories=''.join(f'<button type="button" data-category="{e(c,quote=True)}">{e(c)}</button>' for c in dict.fromkeys(p['category'] for p in papers))
sidebar=f'<aside class="sidebar" aria-label="論文の検索と移動"><details open><summary>論文を探す</summary>{search}<div class="categories" aria-label="分野から探す">{categories}</div><nav aria-label="掲載論文">{nav}</nav></details></aside>'
home=home.replace('</header>','</header>'+sidebar,1)
(DIST/'index.html').write_text(home)

# Versioned procedural canvas enhancement; the SVG remains a no-script fallback.
home=(DIST/'index.html').read_text()
visual_hash=sha256((DIST/'assets/cinema-field.js').read_bytes()).hexdigest()[:12]
home=home.replace('</body>',f'<script src="/assets/cinema-field.js?v={visual_hash}" defer></script></body>')
(DIST/'index.html').write_text(home)

home=(DIST/'index.html').read_text()
button='<button class="motion" id="motion" type="button" aria-pressed="false">背景を停止</button>'
home=home.replace(button,'').replace('<a class="sponsor"',button+'<a class="sponsor"',1)
(DIST/'index.html').write_text(home)

# The feed owns the space. No permanent directory or taxonomy UI.
import re
home=(DIST/'index.html').read_text()
search_match=re.search(r'<div class="search">.*?</div>',home)
search_markup=search_match.group(0).replace('論文・分野・著者を探す','キーワード・著者・年で絞り込む')
home=re.sub(r'<aside class="sidebar".*?</aside>','',home,flags=re.S)
sponsor=re.search(r'<a class="sponsor".*?</a>',home).group(0)
home=home.replace(sponsor,'',1)
home=home.replace('</header>',f'<details class="feed-search"><summary>フィルター</summary>{search_markup}</details></header>',1)
# Static placement reserves the full card before first paint. Dynamic additions
# continue from this position without moving any already-rendered card.
sponsor_card='<aside class="entry sponsor-entry has-living-field cinema-field" data-sponsor aria-label="制作を支援"><div class="art" aria-hidden="true"></div><div class="content"><p class="meta">制作を支援 · GitHub Sponsors</p><h2><a href="https://github.com/sponsors/Unjuno" target="_blank" rel="noopener noreferrer">この場所を、つくり続ける。</a></h2><p class="paper-summary">論文との出会いを、これからも。</p><a class="read" href="https://github.com/sponsors/Unjuno" target="_blank" rel="noopener noreferrer" aria-label="GitHub Sponsorsで制作を支援（新しいタブ）">GitHub Sponsorsで支援する <span aria-hidden="true">↗</span></a></div></aside>'
static_count=0
def insert_sponsor(match):
 global static_count
 static_count+=1
 return match.group(0)+(sponsor_card if static_count>=3 and (static_count-3)%6==0 else '')
home=re.sub(r'</article>',insert_sponsor,home)
# Keep a pristine, inert template even when fewer than three static papers exist.
home=home.replace('</main>','</main><template id="sponsor-card-template">'+sponsor_card+'</template>',1)
(DIST/'index.html').write_text(home)

# Automatic motion; the complete authored-material list needs no pagination.
home=re.sub(r'<button class="motion"[^>]*>.*?</button>','',home)
(DIST/'index.html').write_text(home)

home=re.sub(r'<div class="intro">.*?</div>',f'<span class="sr-only" id="count" role="status" aria-live="polite">{len(papers)}件の論文</span>',home)
(DIST/'index.html').write_text(home)

# Expose the actual metadata used by the filter.
for paper in papers:
 marker='id="paper-'+paper['slug']+'"'
 identity=' data-paper-title="'+e(paper['title'],quote=True)+'" data-paper-authors="'+e(', '.join(paper.get('authors_full') or [paper['authors']]),quote=True)+'" data-paper-year="'+str(paper['year'])+'"'
 home=home.replace(marker,marker+identity,1)
 start=home.index(marker); end=home.index('</article>',start)
 part=home[start:end]
 detail='<details class="paper-metadata"><summary>著者: '+e(paper['authors'])+'</summary><p>'+e(paper['authors'])+'</p><p>キーワード: '+e(' · '.join(paper['tags']))+'</p></details>'
 part=part.replace('<a class="read"',detail+'<a class="read"')
 home=home[:start]+part+home[end:]
(DIST/'index.html').write_text(home)

spline_hash=sha256((DIST/'assets/spline-type.js').read_bytes()).hexdigest()[:12]
home=home.replace('</body>',f'<script src="/assets/spline-type.js?v={spline_hash}" defer></script></body>')
(DIST/'index.html').write_text(home)

# Publish the same structured source used for the static cards.
(DIST/'data').mkdir(exist_ok=True)
(DIST/'data/papers.json').write_text(json.dumps({'schema_version':1,'papers':papers},ensure_ascii=False,indent=2)+'\n')
for paper in papers:
 marker='id="paper-'+paper['slug']+'"'
 start=home.index(marker); end=home.index('</article>',start)
 part=home[start:end]
 summary=paper.get('summary_ja') or paper['claim']
 part=part.replace('</h2>','</h2><p class="paper-summary">'+e(summary)+'</p>',1)
 if paper.get('authors_full'):
  part=part.replace('<p>'+e(paper['authors'])+'</p>','<p>'+e(', '.join(paper['authors_full']))+'</p>')
 if paper.get('doi'):
  part=part.replace('</details>','<p>DOI: <a href="https://doi.org/'+e(paper['doi'])+'" target="_blank" rel="noopener noreferrer">'+e(paper['doi'])+'</a></p></details>',1)
 fields=[paper['title'],str(paper['year']),paper['authors'],*paper.get('authors_full',[]),*paper.get('tags',[]),paper.get('doi',''),paper.get('summary_ja') or paper['claim'],paper['category'],paper['url']]
 part=re.sub(r'data-search="[^"]*"',lambda match: 'data-search="'+e(' '.join(fields),quote=True)+'"',part)
 home=home[:start]+part+home[end:]
(DIST/'index.html').write_text(home)

# Review candidate: keep the home focused on reading.
home=re.sub(r'<span class="source-note">.*?</span>','',home)
(DIST/'index.html').write_text(home)

# No discovery or pagination runtime: all admitted materials are static.

# Preserve the structured DOI on each static card.
for paper in papers:
 if paper.get('doi'):
  doi=paper['doi'].strip().lower()
  doi=re.sub(r'^https?://(?:dx\.)?doi\.org/', '', doi)
  doi=re.sub(r'^doi:\s*', '', doi)
  marker='id="paper-'+paper['slug']+'"'
  home=home.replace(marker,marker+' data-doi="'+e(doi,quote=True)+'"',1)
(DIST/'index.html').write_text(home)

# Preserve the active author's local-filter feedback addition.
home=home.replace('</details></header>','<p id="filter-feedback" role="status" aria-live="polite"></p></details></header>')
(DIST/'index.html').write_text(home)

# Keep policy accessible without the redundant home footer explanation.
home=re.sub(r'<footer id="about">.*?</footer>','',home,flags=re.S)
home=home.replace('</header>','<a id="about" class="rights-link" href="/rights/">著作権・再利用方針</a></header>',1)
(DIST/'index.html').write_text(home)

# Establish the fresh-visit policy before parsing the feed or restoring its offset.
# Deliberately not deferred: anchors and Back/Forward remain native.
position_hash=sha256((DIST/'assets/feed-position.js').read_bytes()).hexdigest()[:12]
home=home.replace('<title>',f'<script src="/assets/feed-position.js?v={position_hash}"></script><title>',1)
(DIST/'index.html').write_text(home)

# Optional original synthesized ambience. The visual PV remains authoritative.
audio_markup='''<div id="scroll-audio" hidden></div>'''

home=home.replace('</header>',audio_markup+'</header>',1)
for asset in ('scroll-audio.js',):
 fingerprint=sha256((DIST/'assets'/asset).read_bytes()).hexdigest()[:12]
 if asset.endswith('.css'):home=home.replace('</head>',f'<link rel="stylesheet" href="/assets/{asset}?v={fingerprint}"></head>',1)
 else:home=home.replace('</body>',f'<script src="/assets/{asset}?v={fingerprint}" defer></script></body>',1)
home=home.replace('</noscript>','<style>.audio-control{display:none}</style></noscript>',1)
(DIST/'index.html').write_text(home)

# Approved report R favicon. Apply to generated and preserved documents alike;
# only this managed head block is changed, leaving article bodies untouched.
favicon_assets = (
 ('icon', 'favicon.ico', 'image/x-icon', '16x16 32x32 48x48 64x64'),
 ('icon', 'favicon-16x16.png', 'image/png', '16x16'),
 ('icon', 'favicon-32x32.png', 'image/png', '32x32'),
 ('icon', 'favicon.svg', 'image/svg+xml', 'any'),
 ('apple-touch-icon', 'apple-touch-icon.png', 'image/png', '180x180'),
)
favicon_links = []
for rel, filename, mime, sizes in favicon_assets:
 digest = sha256((DIST / filename).read_bytes()).hexdigest()[:12]
 favicon_links.append(f'<link rel="{rel}" href="/{filename}?v={digest}" type="{mime}" sizes="{sizes}">')
favicon_block = '<!-- site-favicon:start -->' + ''.join(favicon_links) + '<!-- site-favicon:end -->'
for page in DIST.rglob('*.html'):
 original = page.read_text()
 updated = re.sub(r'<!-- site-favicon:start -->.*?<!-- site-favicon:end -->', '', original, flags=re.S)
 # Replace legacy icon declarations too, but never touch stylesheet links.
 favicon_rel = re.compile(r"\brel\s*=\s*(['\"])(?:shortcut\s+)?(?:icon|apple-touch-icon(?:-precomposed)?)\1", re.I)
 def clean_favicon_head(head):
  return re.sub(r'<link\b[^>]*>', lambda tag: '' if favicon_rel.search(tag.group(0)) else tag.group(0), head.group(0), flags=re.I)
 updated = re.sub(r'<head\b[^>]*>.*?</head\s*>', clean_favicon_head, updated, count=1, flags=re.I | re.S)
 updated, count = re.subn(r'</head\s*>', lambda match: favicon_block + match.group(0), updated, count=1, flags=re.I)
 if count != 1:
  raise ValueError(f'Cannot add favicon: missing head in {page}')
 if updated != original:
  page.write_text(updated)
print('Applied approved report R favicon to every HTML page')
