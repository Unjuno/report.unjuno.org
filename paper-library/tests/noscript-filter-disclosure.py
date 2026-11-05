"""Static contract only: no browser/computed-style or accessibility measurement."""
from pathlib import Path
import re, sys
root=Path(__file__).resolve().parents[1]
page=Path(sys.argv[1]) if len(sys.argv)>1 else root/'dist/index.html'
html=page.read_text()
nojs=''.join(re.findall(r'<noscript>(.*?)</noscript>',html,re.S))
assert re.search(r'<details class="feed-search">.*?<summary>フィルター</summary>',html,re.S)
# Hide the whole JS-only disclosure, not just .search: .feed-search .search
# has higher specificity than the old .search-only noscript rule.
assert re.search(r'(?:^|[>,}\s])\.feed-search(?:\s*,[^{}]*)?\s*\{\s*display\s*:\s*none\s*;?\s*\}',nojs), 'noscript must hide the filter disclosure itself'
assert '.feed-search,.search,.motion,.categories' in (root/'build_feed.py').read_text(), 'generator must retain the fix'
assert '<main id="papers">' in html and html.count('data-entry')>=3
assert 'href="/rights/"' in html and 'https://github.com/sponsors/Unjuno' in html
# No non-noscript style should globally hide the disclosure when JS is on.
css=(root/'dist/assets/feed.css').read_text()
assert not re.search(r'\.feed-search\s*\{[^}]*display\s*:\s*none',css)
print('PASS static no-JS filter parent hidden; generator, JS-enabled control, article/policy/support markup preserved. Not browser QA.')
