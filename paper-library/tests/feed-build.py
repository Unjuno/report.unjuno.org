from pathlib import Path
import tempfile,shutil,json,subprocess
root=Path(__file__).resolve().parents[1]
with tempfile.TemporaryDirectory() as t:
 p=Path(t);shutil.copy(root/'build_feed.py',p);shutil.copytree(root/'content',p/'content');shutil.copytree(root/'dist',p/'dist')
 records=json.loads((p/'content/papers.json').read_text());extra=dict(records[1]);extra.update(slug='build-fixture-only',title='Build fixture only');records.append(extra);(p/'content/papers.json').write_text(json.dumps(records))
 old=(p/'dist/notes/attention-is-all-you-need/index.html').read_bytes();subprocess.run(['python3',str(p/'build_feed.py')],check=True)
 assert (p/'dist/notes/build-fixture-only/index.html').exists();assert (p/'dist/index.html').read_text().count('data-entry data-search=')==len(records)
 assert old==(p/'dist/notes/attention-is-all-you-need/index.html').read_bytes()
print('PASS adding one data record builds a static page/feed entry; preserved article unchanged; fixture never published')
