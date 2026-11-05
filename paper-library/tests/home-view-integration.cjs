// Compose the existing deterministic renderer-loss harness with the real input module.
const fs=require('fs'),path=require('path');const base=path.resolve(__dirname,'..');let s=fs.readFileSync(base+'/tests/home-renderer-loss.cjs','utf8');s=s.slice(0,s.indexOf("ids['equation-view'].events.click();"));s=s.replace('let lost=false,onLoss;','let lost=false,onLoss,viewCalls=[];');s=s.replace('return{resize(){},draw(){','return{setView(y,p){viewCalls.push([y,p]);},resize(){},draw(){');s=s.replace("vm.runInNewContext(fs.readFileSync", "vm.runInNewContext(fs.readFileSync(require('path').join(__dirname,'../dist/assets/home-view.js'),'utf8')+'\\n'+fs.readFileSync");s+=`
assert(!ids['view-control'].hidden);assert(!ids['view-reset'].disabled);
const key=k=>ids['view-control'].events.keydown({key:k,preventDefault(){}});
ids['location-4'].events.click();const selected=nodes[4]['aria-pressed'];ids['motion-toggle'].events.click();assert.equal(frames.size,0);
const d=draws;key('ArrowRight');assert.deepEqual(viewCalls.at(-1),[.06,0]);assert(draws>d);assert.equal(frames.size,0);
const n=viewCalls.length;for(const id of ['material-view','observe-wave','equation-view'])ids[id].events.click();assert.equal(viewCalls.length,n);assert.equal(nodes[4]['aria-pressed'],selected);assert.equal(frames.size,0);
reduced.matches=true;reduced.events.change();key('ArrowDown');assert.deepEqual(viewCalls.at(-1),[.06,.04]);assert.equal(frames.size,0);
ids['view-control'].focus();lost=true;onLoss();assert.equal(doc.activeElement,ids['equation-view'],'GPU loss restores focus to the active representation');assert(ids['view-control'].hidden);assert(ids['view-reset'].disabled);const count=viewCalls.length;key('ArrowRight');assert.equal(viewCalls.length,count);assert.equal(frames.size,0);
console.log('PASS actual view+deck integration: paused/reduced direct draw, state changes retain pose/selection, GL loss hides and disables input, no extra RAF');`;
new Function('require','__dirname',s)(require,base+'/tests');
