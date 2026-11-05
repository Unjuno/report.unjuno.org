const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const audio=fs.readFileSync('dist/assets/scroll-audio.js','utf8'),visual=fs.readFileSync('dist/assets/cinema-field.js','utf8');
const ctx={clamp:x=>Math.max(0,Math.min(1,x)),smooth:x=>x*x*(3-2*x)};vm.createContext(ctx);
vm.runInContext(visual.slice(visual.indexOf('function weights('),visual.indexOf('function dissolve('))+audio.slice(audio.indexOf('function boundaryState'),audio.indexOf('function colourGraph')),ctx);
const groups={mist:'mist','horizontal-wave':'wave','lateral-blend':'lateral',particles:'particles',vortex:'wave','depth-rings':'wave','light-bloom':'mist','chromatic-veil':'mist','contour-bands':'wave','local-blends':'particles','diagonal-flow':'lateral',ribbon:'lateral'};
for(const [transition,group] of Object.entries(groups))for(const p of [0,.2,.4,.5,.6,.8,1]){const transitionMix=2*(1-Math.max(...ctx.weights(p)));const flow={transition,sceneProgress:p,transitionMix,flowDirection:1};const b=ctx.boundaryState(flow);assert.equal(b[group],transitionMix);assert.equal(ctx.boundaryState({...flow,paused:true})[group],0);assert.equal(ctx.boundaryState(flow,true)[group],0);}
assert(visual.includes('transitionMix:2*(1-Math.max(...weights(progress)))'));
console.log('PASS minimal integration: all 12 names map to four sound families; renderer/audio shared transitionMix; clear interval and quiet neutral. No rendered/audio assessment.');
