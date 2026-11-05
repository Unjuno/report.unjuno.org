"""Set HOME asset URLs to fingerprints of their actual bytes."""
from pathlib import Path
from hashlib import sha256
import re
root=Path(__file__).parent/'dist'
page=root/'index.html'
html=page.read_text()
for name in ('home-game.css','home-deck.js','home-surface.js','home-view.js','home-landscape.js'):
    path='/assets/'+name
    fingerprint=sha256((root/path.lstrip('/')).read_bytes()).hexdigest()[:12]
    html,count=re.subn(re.escape(path)+r'(?:\?v=[a-f0-9]+)?',path+'?v='+fingerprint,html)
    assert count==1,(name,count)
page.write_text(html)
print('Stamped HOME CSS/JS byte fingerprints')
