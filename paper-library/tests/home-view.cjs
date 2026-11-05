const fs=require('fs'),vm=require('vm'),assert=require('assert');
function element(){return{events:{},attributes:{},hidden:true,disabled:true,captures:0,releases:0,addEventListener(name,handler){this.events[name]=handler},setAttribute(name,value){this.attributes[name]=value},setPointerCapture(){this.captures++},releasePointerCapture(){this.releases++}};}
let now=1000;const windowEvents={},documentEvents={},context={Date:{now:()=>now},window:{addEventListener(name,handler){windowEvents[name]=handler}},document:{hidden:false,addEventListener(name,handler){documentEvents[name]=handler}}};
vm.runInNewContext(fs.readFileSync(require('path').join(__dirname,'../dist/assets/home-view.js'),'utf8'),context);
let restored=0;const area=element(),reset=element(),help=element(),changes=[],control=context.window.ResearchView.attach(area,reset,(...values)=>changes.push(values),help,()=>restored++);
function pointer(type,values={}){const event={pointerId:1,clientX:100,clientY:100,button:0,isPrimary:true,pointerType:'mouse',cancelable:true,preventDefault(){this.prevented=true},...values};area.events[type](event);return event;}
function key(value){area.events.keydown({key:value,preventDefault(){}});}
pointer('pointerdown');pointer('pointermove',{clientX:140});assert.equal(changes.length,0,'disabled view ignores input');
control.setEnabled(true);assert(!area.hidden&&!reset.disabled);pointer('pointerdown');pointer('pointermove',{clientX:120,clientY:120});assert.deepEqual(changes.at(-1),[.08,.06]);assert.equal(area.captures,1);pointer('pointermove',{pointerId:2,clientX:200});assert.equal(changes.length,1);windowEvents.pointerup({pointerId:1});pointer('pointermove',{clientX:200});assert.equal(changes.length,1,'global release ends drag');
reset.events.click();assert.deepEqual(changes.at(-1),[0,0]);const before=changes.length;pointer('pointerdown',{pointerType:'touch'});const vertical=pointer('pointermove',{pointerType:'touch',clientX:102,clientY:120});assert(!vertical.prevented);assert.equal(changes.length,before,'vertical touch stays page scroll');
pointer('pointerdown',{pointerType:'touch'});pointer('pointermove',{pointerType:'touch',clientX:107,clientY:107});assert.equal(changes.length,before,'ambiguous diagonal does not capture');const horizontal=pointer('pointermove',{pointerType:'touch',clientX:130,clientY:102});assert(horizontal.prevented);assert.deepEqual(changes.at(-1),[.12,0]);pointer('pointerdown',{pointerId:2,isPrimary:false});const cancelled=changes.length;pointer('pointermove',{clientX:200});assert.equal(changes.length,cancelled,'second pointer cancels');
key('Home');for(let i=0;i<30;i++){key('ArrowRight');key('ArrowDown');}assert.deepEqual(changes.at(-1),[.35,.18]);key('Escape');assert.deepEqual(changes.at(-1),[0,0]);
pointer('pointerdown');pointer('pointermove',{clientX:115});context.document.hidden=true;documentEvents.visibilitychange();const hidden=changes.length;pointer('pointermove',{clientX:160});assert.equal(changes.length,hidden,'hidden document cancels drag');
context.document.activeElement=area;control.setEnabled(false);assert(area.hidden&&reset.disabled&&help.hidden);assert.equal(restored,1,'focus is recovered before leaving a hidden view');key('ArrowRight');reset.events.click();assert.equal(changes.length,hidden,'unavailable renderer disables controls');
console.log('PASS bounded mouse/keyboard, primary identity, vertical-scroll/diagonal intent, multi-touch cancel, global release, reset, hidden and disabled states; no timers or RAF');

const hitArea=element(),hitReset=element(),host=element(),pointChanges=[];
const hitController=context.window.ResearchView.attach(hitArea,hitReset,(...values)=>pointChanges.push(values),null,null,host);hitController.setEnabled(true);
const point={closest(selector){return selector==='.location-map'?{}:null}},paper={closest(){return null}};
function hostPointer(name,extra={}){host.events[name]({pointerId:9,clientX:100,clientY:100,button:0,isPrimary:true,pointerType:'mouse',target:point,cancelable:true,preventDefault(){},...extra});}
function click(detail=1){let blocked=false;host.events.click({detail,pointerId:9,preventDefault(){blocked=true},stopPropagation(){}});return blocked;}
hostPointer('pointerdown');hostPointer('pointerup');assert(!click(),'short point press remains a paper selection');
hostPointer('pointerdown');hostPointer('pointermove',{clientX:130});hostPointer('pointerup');assert.equal(pointChanges.length,1);assert(click(),'point drag suppresses its compatibility click');
hostPointer('pointerdown');hostPointer('pointermove',{clientX:135});hostPointer('pointerup');assert(!click(0),'assistive/keyboard activation is never suppressed');
hostPointer('pointerdown');hostPointer('pointermove',{clientX:135});hostPointer('pointerup');now+=401;assert(!click(),'suppression expires without a timer');
const pointCount=pointChanges.length;hostPointer('pointerdown',{target:paper});hostPointer('pointermove',{target:paper,clientX:150});assert.equal(pointChanges.length,pointCount,'paper list does not rotate the object');
console.log('PASS SVG short press versus drag, compatibility-click suppression, keyboard/expiry and paper-list exclusion');
