// Verify capability gating with the real input module and the deterministic DOM harness.
const fs=require('fs'),path=require('path'),base=path.resolve(__dirname,'..');
for(const unavailable of ['main','offscreen']){
 let s=fs.readFileSync(base+'/tests/home-renderer-loss.cjs','utf8');
 s=s.slice(0,s.indexOf("ids['equation-view'].events.click();"));
 if(unavailable==='main')s=s.replace("ids['research-canvas'].getContext=()=>ctx","ids['research-canvas'].getContext=()=>null");
 else s=s.replace('e.getContext=()=>artContext','e.getContext=()=>null');
 s=s.replace('let lost=false,onLoss;','let lost=false,onLoss,glCreates=0;');
 s=s.replace('create(canvas,notify){onLoss=notify;','create(canvas,notify){glCreates++;onLoss=notify;');
 s=s.replace('const root={',"ids['view-control'].hidden=true;ids['view-reset'].disabled=true;ids['view-help','material-options','metal-material','stone-material'].hidden=true;const root={");
 s=s.replace('vm.runInNewContext(fs.readFileSync',"vm.runInNewContext(fs.readFileSync(require('path').join(__dirname,'../dist/assets/home-view.js'),'utf8')+'\\n'+fs.readFileSync");
 s+=`
 assert.equal(glCreates,0,'no unusable GPU allocation');assert(ids['view-control'].hidden);assert(ids['view-help','material-options','metal-material','stone-material'].hidden);assert(ids['view-reset'].disabled);
 for(const id of ['material-view','observe-wave','equation-view','motion-toggle'])assert(ids[id].disabled);
 assert.equal(frames.size,0);assert.equal(ids['location-map']['aria-hidden'],'true');assert.equal(ids['location-map'].style.visibility,'hidden');
 for(let i=0;i<6;i++){assert.equal(ids['location-'+i].style.display,'none');assert.equal(ids['location-'+i].tabindex,'-1');}
 ids['paper-search'].value='ATTENTION';ids['paper-search'].events.input();assert(!nodes[0].hidden);assert(!ids['open-paper'].hidden);assert.equal(ids['open-paper'].href,'/notes/attention-is-all-you-need/');
 ids['paper-search'].value='no-match';ids['paper-search'].events.input();assert(!ids['empty-state'].hidden);ids['clear-search'].events.click();assert(!nodes[0].hidden);assert.equal(frames.size,0);
 console.log('PASS ${unavailable} 2D unavailable: no GPU/view/RAF; accessible search and article preserved');
 `;
 new Function('require','__dirname',s)(require,base+'/tests');
}
