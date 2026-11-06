'use strict';
const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const sha=path=>crypto.createHash('sha256').update(fs.readFileSync(path)).digest('hex');
const changes=JSON.parse(fs.readFileSync('content/quality-replacements-20261105.json')),registry=require('./scene-registry.cjs')(),bank=JSON.parse(fs.readFileSync('dist/assets/home-music/catalog.json'));
// Exact v103 source catalogue, retained independently of production Git history.
assert.equal(changes.base_commit,'f915185060390c41b05427d57407226fc543de85');
assert.equal(sha('content/audio-baseline-v103.json'),'83c5231f6b7fe182d425c027f340ba41877281955fac7db6c46e15215f38b25a');
const before=JSON.parse(fs.readFileSync('content/audio-baseline-v103.json','utf8'));
assert.equal(changes.images.length,5);assert.equal(registry.scenes.length,146);assert.equal(registry.assets.length,130);assert.equal(registry.assets.filter(n=>n.startsWith('selected-')).length,100);
for(const image of changes.images){
 assert.equal(sha('dist/assets/'+image.previous.name),image.previous.sha256,'original image remains byte-identical');
 assert.equal(sha('dist/assets/'+image.current.name),image.current.sha256,'approved replacement served');
 assert.equal(sha(image.source_file),image.current.source_sha256,'lossless approved source retained');
 assert(!registry.assets.includes(image.previous.name));assert.equal(registry.scenes.filter(s=>s.name===image.current.name).length,1);
 assert.equal(registry.scenes.find(s=>s.name===image.current.name).focus,image.current.focus);
}
assert.equal(bank.tracks.length,50);assert.deepEqual(bank.tracks.map(t=>t.id),before.tracks.map(t=>t.id),'active fifty identities and order preserved');
for(const old of before.tracks){
 const track=bank.tracks.find(t=>t.id===old.id);assert.equal(sha('dist/assets/home-music/'+old.file),old.sha256,'every original audio file is retained');
 assert.equal(track.cue_in_seconds,old.cue_in_seconds);assert.equal(track.cue_out_seconds,old.cue_out_seconds);assert.equal(track.retained_seconds,old.retained_seconds);
 if(![2,69].includes(old.id))assert.deepEqual(track,old,'other 48 tracks untouched');
 else{assert.notEqual(track.sha256,old.sha256);assert.match(track.file,/_piano_v2\.mp3$/);assert.equal(sha('dist/assets/home-music/'+track.file),track.sha256);}
}
assert.equal(bank.crossfade_seconds,.8);assert.equal(bank.verification.directed_pairs_screened,2500);assert.equal(bank.verification.full_decode_tracks,50);assert.equal(bank.verification.full_decode_clip_samples,0);assert.equal(bank.verification.numeric_pair_result.clip_samples,0);
const rights=fs.readFileSync('dist/rights/index.html','utf8');assert(rights.includes('VCSL'));assert(rights.includes('CC0 1.0'));assert(rights.includes('/assets/licenses/VCSL-CC0.txt'));assert(!rights.includes('音声サンプルを読み込んで再生する方式ではありません'));
assert(fs.readFileSync('dist/assets/licenses/VCSL-CC0.txt','utf8').includes('CC0'));
assert(fs.readFileSync('dist/assets/scroll-audio.js','utf8').includes('catalog.json?v=piano-v3'));
console.log('PASS exactly five new images and two piano replacements; originals retained, 100 generated images/146 scenes/50 tracks, cues and remaining 48 audio assets unchanged, current integrity hashes, CC0 attribution and cache-safe URLs.');
