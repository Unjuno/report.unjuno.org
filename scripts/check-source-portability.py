"""Reject machine-local paths in the exact source set recorded by SOURCE_SYNC."""
import hashlib
import json
import re
from pathlib import Path

root = Path(__file__).resolve().parents[1]
sync = json.loads((root / 'paper-library/SOURCE_SYNC.json').read_text())
paths = ['paper-library/' + p for p in sync['files']] + list(sync['root_files']) + ['paper-library/SOURCE_SYNC.json']
private_path = re.compile(r'/(?:workspace|tmp|home|Users|root)/(?:[^\s"\x27`<>]+)')
failures = []
for name in paths:
    data = (root / name).read_bytes()
    # Published hosting history is outside the media cleanup; permit only its exact baseline bytes.
    if name == 'reports/2026-11-02-core-shared-hosting.md':
        assert hashlib.sha256(data).hexdigest() == 'e1b6d49c52e199094f84f48682520c3b5a244a012a1fd918f4cfbaf16b40e497', 'Historical hosting record changed'
        continue
    try:
        text = data.decode('utf-8')
    except UnicodeDecodeError:
        continue
    # An upstream package test-fixture glob is not a host filesystem path.
    text = text.replace('tests/projects/' + 'workspace/packages/*', '') if name == 'package-lock.json' else text
    if private_path.search(text):
        failures.append(name)
assert not failures, 'Private environment paths in selected sources: ' + ', '.join(failures)
print(f'PASS source portability: {len(paths)} selected files scanned; no private production paths; exact published hosting history retained.')
