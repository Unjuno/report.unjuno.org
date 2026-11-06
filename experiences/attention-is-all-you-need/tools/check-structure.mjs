import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = async (name) => readFile(path.join(root, name), 'utf8');
const data = JSON.parse(await read('content/experience.json'));
assert.equal(data.schema_version, 1);
assert.equal(data.slug, 'attention-is-all-you-need');
assert.deepEqual(data.flow_order, ['overview', 'learning_units', 'sources', 'support']);
assert.equal(data.support.position, 'last');
assert.equal(data.primary_paper_url, 'https://arxiv.org/abs/1706.03762');
assert.equal(data.site_url, null, 'No new published URL is verified yet');

const chapterIds = new Set(data.chapters.map((chapter) => chapter.id));
assert.equal(chapterIds.size, data.chapters.length);
const unitIds = new Set();
for (const [index, unit] of data.units.entries()) {
  assert.ok(!unitIds.has(unit.id), 'Duplicate unit: ' + unit.id);
  unitIds.add(unit.id);
  assert.equal(unit.order, index + 1);
  assert.ok(unit.learning_goal.trim());
  assert.ok(unit.chapter_ids.length > 0);
  unit.chapter_ids.forEach((id) => assert.ok(chapterIds.has(id), 'Unknown chapter: ' + id));
  assert.deepEqual(unit.flow, ['short_video', 'interaction', 'observation', 'next']);
  assert.ok(unit.interaction.prompt.trim());
  assert.ok(unit.interaction.data_disclosure.trim());
  assert.ok(unit.interaction.source_sections.trim());
}
for (const media of [data.overview, ...data.units.map((unit) => unit.video)]) {
  assert.ok(['planned', 'in_production', 'ready'].includes(media.status));
  if (media.status !== 'ready') {
    assert.equal(media.src, null, 'Unverified video must not have a playback URL');
  } else {
    assert.ok(media.src && media.poster && media.captions && media.transcript);
    for (const key of ['src', 'poster', 'captions', 'transcript']) {
      const target = path.resolve(root, key === 'transcript' ? '' : 'public', media[key]);
      assert.ok(target.startsWith(root), 'Media path escapes project');
      assert.ok((await stat(target)).isFile(), 'Missing media: ' + media[key]);
    }
  }
}
for (const dir of ['content/video-scripts', 'src/components', 'src/interactives', 'src/math', 'media-source', 'public/media/videos', 'public/media/posters', 'public/media/captions', 'tests', 'tools', 'reference']) {
  assert.ok((await stat(path.join(root, dir))).isDirectory(), 'Missing folder: ' + dir);
}
const provenance = JSON.parse(await read('reference/provenance.json'));
const original = await readFile(path.join(root, 'reference', provenance.snapshot_path));
const sha = createHash('sha1').update('blob ' + original.length + '\0').update(original).digest('hex');
assert.equal(sha, provenance.git_blob_sha, 'Legacy snapshot changed');
console.log('Structure and baseline checks passed: ' + data.units.length + ' learning units.');
console.log('This checks metadata and the preserved baseline; run the site tests for behavior checks.');

