const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const later=new Set(JSON.parse(fs.readFileSync('content/all-generated-images.json')).added.map(x=>x.name));
const manifest=JSON.parse(fs.readFileSync('content/approved-eleven.json'));const registry=require('./scene-registry.cjs')();
registry.assets=registry.assets.filter(n=>!later.has(n)); registry.scenes=registry.scenes.filter(s=>!later.has(s.name));
assert.equal(manifest.added.length,11);assert.equal(registry.assets.length,60);assert.equal(registry.scenes.length,76);
assert.equal(new Set(registry.assets).size,registry.assets.length);
const names=new Set(manifest.added.map(x=>x.name));assert.deepEqual(JSON.parse(JSON.stringify(registry.scenes.filter(s=>!names.has(s.name)))),manifest.preservedScenes);
for(const x of manifest.added){const bytes=fs.readFileSync('dist/assets/'+x.name);assert.equal(bytes.length,x.bytes);assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),x.sha256);assert.equal(registry.assets.filter(n=>n===x.name).length,1);const index=registry.scenes.findIndex(s=>s.name===x.name);assert.ok(index>0);assert.equal(registry.scenes[index-1].name,x.after);assert.equal(registry.scenes[index].focus,x.focus);assert.equal(registry.scenes[index].transition,x.transition);assert.ok(x.focus>=0&&x.focus<=1);}
console.log('PASS 11 additions: asset hashes, unique registrations, named anchors, focus/transition settings, all 65 prior scenes preserved in order.');
