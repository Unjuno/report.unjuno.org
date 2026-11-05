/* Procedural illustration: no photographs, imported models, or runtime services. */
(()=>{'use strict';
const cards=[...document.querySelectorAll('[data-entry]')];
if(!cards.length||!window.requestAnimationFrame)return;
const reduce=window.matchMedia('(prefers-reduced-motion: reduce)');
let time=0,last=0,velocity=0,scroll=window.scrollY,paused=false,raf=0;
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n)),mix=(a,b,t)=>a+(b-a)*t;
const color=(a,b,t)=>'#'+[0,2,4].map(i=>Math.round(mix(parseInt(a.slice(i,i+2),16),parseInt(b.slice(i,i+2),16),t)).toString(16).padStart(2,'0')).join('');
const rand=(n)=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x)};
const names=['FOX','COMPUTER','HUMAN','BIRD','RABBIT','FISH','BUTTERFLY','TREE'];
function shape(c,points,fill,stroke,width=2){c.beginPath();points.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.closePath();c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke()}}
function ellipse(c,x,y,rx,ry,fill,stroke,width=2){c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke()}}
function line(c,p,color,width=1){c.beginPath();p.forEach((x,i)=>i?c.lineTo(...x):c.moveTo(...x));c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.stroke()}
function gradient(c,x,y,r,a,b){const g=c.createRadialGradient(x-r*.2,y-r*.4,1,x,y,r);g.addColorStop(0,a);g.addColorStop(1,b);return g}
function palette(c,real,game){return {outline:`rgba(13,23,27,${mix(.95,.12,real)})`,orange:gradient(c,0,-20,190,color('edb176','e2af78',real),color('bd7857','573a2c',real)),cream:gradient(c,0,0,140,'#e9ded0',color('d5c7ae','827d73',real)),metal:gradient(c,-40,-30,230,'#9eaaa7',color('526e70','293c40',real)),ink:'#13262d',line:mix(3.2,.6,real),real,game}}
function texture(c,real,seed,area){if(real<.05)return;c.globalAlpha=real*.2;for(let i=0;i<260;i++){const x=(rand(i+seed)-.5)*area[0],y=(rand(i+seed+800)-.5)*area[1];line(c,[[x,y],[x+2+rand(i+10)*5,y-2]],i%3?'#eddcc0':'#151d1d',.7)}c.globalAlpha=1}
function eye(c,x,y,p){const r=p.real;ellipse(c,x,y,mix(4.3,4.8,r),mix(6,2.9,r),p.ink);ellipse(c,x-1,y-1,mix(1.3,.8,r),mix(1.8,.7,r),'#e7eee5');if(r>.1)line(c,[[x-5,y-3],[x,y-4],[x+5,y-3]],'rgba(33,37,34,'+r*.45+')',.8)}
function fox(c,p,t){
 c.save();c.rotate(Math.sin(t*.65)*.025);
 // A large tail and tiny shifting paws remain the same geometry in every style.
 c.save();c.translate(-74,47);c.rotate(Math.sin(t)*.08);shape(c,[[-70,40],[-142,5],[-164,-66],[-124,-35],[-66,-21],[-11,29]],p.orange,p.outline,p.line);shape(c,[[-164,-66],[-124,-35],[-110,-6],[-142,5]],p.cream);c.restore();
 ellipse(c,-13,46,91,69,p.orange,p.outline,p.line);ellipse(c,34,61,40,60,p.cream,p.outline,p.line);
 ellipse(c,-54,109,26,10,p.ink);ellipse(c,47,111,22,9,p.ink);
 c.save();c.translate(39,-48+Math.sin(t*.9)*4);c.rotate(Math.sin(t*.5)*.035);
 shape(c,[[-65,-19],[-65,-106],[-15,-69],[32,-69],[77,-103],[68,-7],[14,57]],p.orange,p.outline,p.line);
 shape(c,[[-54,-40],[-54,-85],[-27,-59]],'#553f39');shape(c,[[44,-60],[66,-85],[59,-35]],'#553f39');
 shape(c,[[-64,-10],[-12,3],[14,47],[-35,25]],p.cream);shape(c,[[67,-8],[35,3],[14,47],[56,19]],p.cream);
 eye(c,-23,-17,p);eye(c,40,-18,p);shape(c,[[5,29],[23,29],[14,39]],p.ink);
 line(c,[[14,39],[14,45]],p.ink,1.5);
 c.save();c.beginPath();c.moveTo(-65,-19);c.lineTo(-65,-106);c.lineTo(77,-103);c.lineTo(68,-7);c.lineTo(14,57);c.closePath();c.clip();texture(c,p.real,17,[150,155]);c.restore();c.restore();c.restore();
}
function computer(c,p,t){
 c.save();c.rotate(Math.sin(t*.4)*.025);
 shape(c,[[-114,-102],[97,-102],[127,-70],[127,63],[-102,63],[-122,35]],p.metal,p.outline,p.line);
 shape(c,[[97,-102],[127,-70],[127,63],[97,37]],'#34484d',p.outline,p.line);
 shape(c,[[-97,-84],[78,-84],[78,28],[-97,28]],'#172c32',p.outline,p.line);
 const screen=c.createLinearGradient(-90,-80,70,30);screen.addColorStop(0,'#6ab3aa');screen.addColorStop(1,'#1c4b53');
 shape(c,[[-87,-75],[68,-75],[68,17],[-87,17]],screen);
 c.save();c.beginPath();c.rect(-87,-75,155,92);c.clip();for(let j=0;j<6;j++){const y=-60+j*13;line(c,[[-72,y],[-50+Math.sin(t+j)*15,y],[-37,y-5],[2+j*7,y-5]],`rgba(192,237,207,${.4+j*.07})`,2)}c.restore();
 ellipse(c,77,47,3,3,'#e4b27d');shape(c,[[-39,63],[21,63],[31,83],[-53,83]],p.metal,p.outline,p.line);
 shape(c,[[-130,96],[90,96],[120,127],[-157,127]],p.cream,p.outline,p.line);
 for(let row=0;row<3;row++)for(let col=0;col<13;col++){let x=-120+col*16-row*3,y=101+row*7;line(c,[[x,y],[x+10,y]],'#72827e',3)}
 if(p.real>.05){c.globalAlpha=p.real*.3;shape(c,[[-87,-75],[-10,-75],[50,17],[-87,17]],'#d7f5ea');c.globalAlpha=1;for(let i=0;i<9;i++)line(c,[[104,-45+i*8],[119,-30+i*8]],'#13282e',1)}
 c.restore();
}
function human(c,p,t){
 c.save();c.rotate(Math.sin(t*.45)*.018);const skin=gradient(c,0,-78,78,'#dfb696',color('b98669','815a48',p.real));
 shape(c,[[-46,11],[-79,66],[-65,126],[64,126],[79,61],[45,11]],p.metal,p.outline,p.line);
 shape(c,[[-22,-12],[-22,24],[0,44],[24,23],[24,-12]],skin,p.outline,p.line);
 ellipse(c,0,-69,mix(43,37,p.real),mix(53,57,p.real),skin,p.outline,p.line);
 shape(c,[[-43,-52],[-50,-85],[-35,-124],[7,-137],[41,-111],[47,-64],[28,-85],[4,-98],[-26,-80],[-36,-49]],'#233239',p.outline,p.line);
 eye(c,-14,-65,p);eye(c,15,-65,p);line(c,[[1,-61],[-2,-48],[5,-48]],'#8f6353',p.real+1);line(c,[[-10,-33],[0,-31],[11,-34]],'#704b43',1.5);c.globalAlpha=p.real*.28;ellipse(c,-23,-48,12,6,'#b57162');ellipse(c,23,-48,12,6,'#b57162');line(c,[[-27,-77],[-16,-80],[-9,-77]],'#382d29',1.5);line(c,[[10,-77],[18,-80],[27,-77]],'#382d29',1.5);c.globalAlpha=1;
 shape(c,[[-70,53],[-86,86],[-36,103],[-17,84]],p.metal,p.outline,p.line);shape(c,[[67,52],[82,87],[34,102],[20,84]],p.metal,p.outline,p.line);
 shape(c,[[-37,78],[-3,74],[30,80],[22,120],[-9,116],[-41,120]],p.cream,p.outline,p.line);line(c,[[-3,74],[-9,116]],'#9d998c',1);
 ellipse(c,-42,89,14,9,skin);ellipse(c,35,90,14,9,skin);
 if(p.real>.2){c.globalAlpha=p.real*.5;line(c,[[-42,34],[-51,67]],'#b2bcb6',2);line(c,[[41,35],[52,65]],'#b2bcb6',1);c.globalAlpha=1}c.restore();
}
function bird(c,p,t){
 c.save();c.rotate(Math.sin(t*.8)*.07);shape(c,[[-52,37],[-142,77],[-125,28],[-61,-3]],p.metal,p.outline,p.line);
 ellipse(c,0,12,82,50,p.metal,p.outline,p.line);ellipse(c,54,-33,38,37,p.cream,p.outline,p.line);
 shape(c,[[83,-40],[123,-27],[83,-21]],p.orange,p.outline,p.line);eye(c,62,-40,p);
 c.save();c.rotate(Math.sin(t*1.4)*.12);shape(c,[[-54,1],[-108,-54],[-47,-51],[20,-19],[44,18],[-13,35]],p.metal,p.outline,p.line);
 for(let i=0;i<7;i++)line(c,[[-87+i*13,-42+i*4],[-42+i*11,15+i]],p.real>.3?'#9fbbb4':'#334c52',mix(2,.8,p.real));c.restore();
 line(c,[[20,54],[22,78],[34,81]],p.orange,3);line(c,[[-4,54],[-8,78],[2,81]],p.orange,3);c.restore();
}
function rabbit(c,p,t){
 c.save();c.rotate(Math.sin(t*.45)*.025);ellipse(c,-15,51,76,68,p.cream,p.outline,p.line);ellipse(c,-79,64,23,23,p.cream,p.outline,p.line);
 ellipse(c,-43,113,33,11,p.cream,p.outline,p.line);ellipse(c,44,111,24,11,p.cream,p.outline,p.line);
 c.save();c.translate(34,-31+Math.sin(t*.9)*3);
 c.save();c.rotate(-.22+Math.sin(t)*.035);ellipse(c,-15,-75,17,70,p.cream,p.outline,p.line);ellipse(c,-15,-78,8,48,'#b99088');c.restore();
 c.save();c.rotate(.12);ellipse(c,24,-76,17,70,p.cream,p.outline,p.line);ellipse(c,24,-79,8,48,'#b99088');c.restore();
 ellipse(c,3,0,49,47,p.cream,p.outline,p.line);eye(c,-16,-8,p);eye(c,24,-8,p);shape(c,[[-1,13],[10,13],[5,19]],'#b98b80');
 for(let i=0;i<3;i++){line(c,[[-9,20],[-49,15+i*8]],'#858a7e',.7);line(c,[[17,20],[56,15+i*8]],'#858a7e',.7)}
 c.save();c.beginPath();c.ellipse(3,0,49,47,0,0,Math.PI*2);c.clip();texture(c,p.real,71,[95,90]);c.restore();c.restore();c.restore();
}
function fish(c,p,t){c.save();c.rotate(Math.sin(t*.7)*.06);shape(c,[[-65,-12],[-139,-75],[-122,9],[-139,78],[-65,30]],p.orange,p.outline,p.line);ellipse(c,7,5,104,62,p.metal,p.outline,p.line);shape(c,[[-40,-44],[2,-103],[51,-43]],p.metal,p.outline,p.line);shape(c,[[-5,40],[25,93],[61,38]],p.orange,p.outline,p.line);eye(c,70,-9,p);line(c,[[102,14],[88,18]],p.ink,1.3);line(c,[[44,-36],[34,-4],[43,35]],p.ink,1);for(let row=0;row<5;row++)for(let col=0;col<7;col++){const x=-64+col*14+(row%2)*7,y=-31+row*17;if(x<25){c.beginPath();c.arc(x,y,8,-.7,.7);c.strokeStyle='rgba(209,224,197,'+(.1+p.real*.2)+')';c.lineWidth=.7;c.stroke()}}c.restore()}
function butterfly(c,p,t){c.save();const wing=.78+Math.sin(t*1.2)*.16;c.scale(wing,1);for(const side of [-1,1]){c.save();c.scale(side,1);shape(c,[[0,-10],[33,-98],[102,-126],[148,-76],[128,-3],[68,34],[19,30]],p.orange,p.outline,p.line);shape(c,[[13,16],[85,27],[114,88],[73,128],[25,90]],p.metal,p.outline,p.line);for(let j=0;j<8;j++){line(c,[[8,0],[47+j*10,-83+j*8]],'#553b37',mix(2,.8,p.real));ellipse(c,85+j*3,-75+j*10,6,9,p.cream)}ellipse(c,67,69,20,27,p.orange,p.outline,p.line);ellipse(c,67,69,9,14,p.ink);c.restore()}ellipse(c,0,12,7,57,p.ink);line(c,[[-2,-39],[-19,-69],[-29,-71]],p.cream,1.2);line(c,[[2,-39],[19,-69],[29,-71]],p.cream,1.2);c.restore()}
function tree(c,p,t){const sway=Math.sin(t*.7)*4;shape(c,[[-20,136],[-10,-68],[5,-77],[20,136]],p.orange,p.outline,p.line);for(let j=0;j<24;j++){const a=j*2.399,rad=25+Math.sqrt(j)*19,x=Math.cos(a)*rad+sway,y=-55+Math.sin(a)*rad*.7;line(c,[[0,86-j*3],[x,y]],'#765f49',3);ellipse(c,x,y,33,26,gradient(c,x,y,38,j%2?'#95b6a1':'#aac2a1',p.real>.1?'#31554b':'#52766a'),p.outline,p.line*.5)}for(let j=0;j<5;j++)line(c,[[-10+j*5,72],[-14+j*6,129]],'#ad8f68',.8)}
const subjects=[fox,computer,human,bird,rabbit,fish,butterfly,tree];
// Every transition interpolates one continuous perimeter, not just image opacity.
const outlines=[
[[-164,-66],[-124,-35],[-82,-20],[-26,-45],[-26,-154],[24,-117],[71,-117],[116,-151],[107,-55],[78,13],[88,75],[69,120],[24,120],[-14,108],[-80,120],[-101,100],[-104,70],[-142,5]],
[[-122,-102],[97,-102],[127,-70],[127,63],[21,63],[31,83],[90,96],[120,127],[-157,127],[-130,96],[-53,83],[-39,63],[-102,63],[-122,35]],
[[-50,-85],[-35,-124],[7,-137],[41,-111],[47,-64],[30,-18],[45,11],[79,61],[82,87],[64,126],[-65,126],[-86,86],[-79,66],[-46,11],[-22,-12],[-43,-52]],
[[-142,77],[-125,28],[-61,-3],[-108,-54],[-47,-51],[20,-19],[22,-49],[50,-70],[83,-60],[93,-40],[123,-27],[87,-21],[82,25],[34,60],[34,81],[22,78],[20,54],[-8,78],[-4,54],[-52,37]],
[[-100,64],[-79,41],[-58,0],[-3,-40],[-25,-154],[-14,-174],[4,-153],[15,-72],[38,-173],[54,-177],[68,-157],[61,-55],[80,-31],[80,6],[60,30],[61,96],[68,120],[18,120],[-14,108],[-76,124],[-87,99]],
[[-139,-75],[-65,-12],[-40,-44],[2,-103],[51,-43],[86,-36],[111,-1],[109,26],[61,58],[25,93],[-5,60],[-65,30],[-139,78],[-122,9]],
[[0,-10],[33,-98],[102,-126],[148,-76],[128,-3],[68,34],[114,88],[73,128],[25,90],[0,69],[-25,90],[-73,128],[-114,88],[-68,34],[-128,-3],[-148,-76],[-102,-126],[-33,-98]],
[[-20,136],[-10,35],[-92,15],[-135,-23],[-126,-80],[-77,-112],[-31,-154],[28,-151],[74,-113],[121,-80],[132,-31],[92,9],[15,35],[20,136]]];
function sample(points,n=128){const lens=points.map((p,i)=>Math.hypot(p[0]-points[(i+1)%points.length][0],p[1]-points[(i+1)%points.length][1])),total=lens.reduce((a,b)=>a+b,0);return Array.from({length:n},(_,k)=>{let d=k/n*total,i=0;while(d>lens[i]&&i<lens.length-1)d-=lens[i++];const a=points[i],b=points[(i+1)%points.length];return [mix(a[0],b[0],d/lens[i]),mix(a[1],b[1],d/lens[i])]})}
const contours=outlines.map(x=>sample(x));
function morph(c,a,b,t,p){const k=t*t*(3-2*t),points=contours[a].map((v,i)=>[mix(v[0],contours[b][i][0],k),mix(v[1],contours[b][i][1],k)]);shape(c,points,p.metal,p.outline,p.line);c.save();c.beginPath();points.forEach((v,i)=>i?c.lineTo(...v):c.moveTo(...v));c.closePath();c.clip();texture(c,p.real,23,[280,300]);c.restore()}
// Scene grammar: independently seeded terrain, architecture, weather, lighting,
// camera travel, and companion subjects. No repeating prerecorded background.
const sceneNames=['RIVER','FOREST','CITY','OBSERVATORY','COAST','GARDEN'];
function landscape(c,seed,kind,t,light){
 const hue=150+rand(seed+4)*55,warm=rand(seed+7);const sky=c.createLinearGradient(0,-260,0,240);sky.addColorStop(0,`hsla(${hue},25%,${9+light*8}%,.12)`);sky.addColorStop(.7,`hsla(${hue-20+warm*70},30%,${18+light*8}%,.32)`);sky.addColorStop(1,'rgba(12,24,26,0)');shape(c,[[-1000,-310],[500,-310],[500,260],[-1000,260]],sky);
 const sunX=-70+rand(seed+9)*360,sunY=-210+rand(seed+10)*80;
 ellipse(c,sunX,sunY,27+rand(seed+11)*20,27+rand(seed+11)*20,gradient(c,sunX,sunY,50,'#e6d5ac66','#e6d5ac00'));
 if(light<.5)for(let j=0;j<35;j++){const x=-900+rand(seed+j)*1350,y=-280+rand(seed+j+100)*250;ellipse(c,x,y,.6+rand(j),.6+rand(j),'#c9d7cf55')}
 for(let layer=0;layer<3;layer++){const ridge=[];for(let j=0;j<=35;j++){const x=-1050+j*48,world=j+seed+layer*800;ridge.push([x+Math.sin(t*.05)*layer*9,65+layer*37-Math.pow(rand(world),.7)*(90-layer*22)])}ridge.push([700,260],[-1100,260]);shape(c,ridge,`hsla(${hue},${14+layer*5}%,${20-layer*4}%,${.22+layer*.07})`)}
 if(kind===0||kind===4){for(let j=0;j<21;j++){const y=113+j*5,x=-550+Math.sin(t*.15+j*.4)*18;line(c,[[x,y],[150+Math.sin(j+t*.3)*35,y],[440,y+2]],`rgba(151,194,184,${.035+j*.003})`,1)}for(let j=0;j<7;j++){const x=-460+j*125+Math.sin(t*.1+j)*6;ellipse(c,x,140+rand(seed+j)*70,40+rand(j)*20,3,'#a3b7a612')}}
 if(kind===1||kind===5){for(let j=0;j<14;j++){const x=-800+j*90+rand(seed+j)*60,h=55+rand(seed+j+20)*100,y=120+rand(j+seed)*25;line(c,[[x,y],[x+Math.sin(t*.3+j)*3,y-h]],'#74978444',2);for(let k=0;k<4;k++){const yy=y-h*.3-k*h*.19;ellipse(c,x+(k%2?1:-1)*h*.13,yy,h*.22,h*.1,`rgba(99,139,115,${.13+k*.025})`)}}}
 if(kind===2){for(let j=0;j<22;j++){const x=-900+j*64,h=25+rand(seed+j)*150,w=25+rand(seed+j+40)*30;shape(c,[[x,119],[x,119-h],[x+w,119-h],[x+w,119]],'#6b8d8530');for(let row=0;row<Math.floor(h/15)-1;row++)for(let col=0;col<3;col++)if(rand(seed+j*33+row*3+col)>.45)shape(c,[[x+6+col*11,111-row*15],[x+10+col*11,111-row*15],[x+10+col*11,106-row*15],[x+6+col*11,106-row*15]],'#e9c99140')}}
 if(kind===3){for(let j=0;j<3;j++){c.save();c.translate(-360+j*290,-30-j*25);c.rotate(t*.025*(j%2?1:-1));c.beginPath();c.ellipse(0,0,90+j*15,30+j*7,.7,0,Math.PI*2);c.strokeStyle='#aec5b528';c.lineWidth=1;c.stroke();ellipse(c,(90+j*15)*Math.cos(t*.16+j),(30+j*7)*Math.sin(t*.16+j),5,5,'#bdd1bb66');c.restore()}}
 // Thin rain or pollen is chosen independently of the landscape family.
 const rain=rand(seed+200)>.65;for(let j=0;j<23;j++){const x=-900+rand(seed+j+210)*1400,y=((rand(seed+j+300)*520+t*(rain?34:5))%520)-260;if(rain)line(c,[[x,y],[x-4,y+13]],'#c5ddd51a',.6);else ellipse(c,x+Math.sin(t*.2+j)*10,y,1,1,'#dfd1a829')}
}
function scene(c,seed,t,p){const duration=32,step=Math.floor(t/duration),u=t%duration/duration,blend=clamp((u-.78)/.22),base=seed+step*197;const kind=Math.floor(rand(base+16)*sceneNames.length);c.save();c.globalAlpha=1-blend;landscape(c,base,kind,t,p.real);c.restore();if(blend){c.save();c.globalAlpha=blend;landscape(c,base+197,Math.floor(rand(base+213)*sceneNames.length),t,p.real);c.restore()}
 // Secondary subjects create composed scenes instead of isolated looping icons.
 for(let j=0;j<2;j++){const n=Math.floor(rand(base+50+j)*subjects.length),x=-360+j*610+Math.sin(t*.12+j)*12,y=90+rand(base+j+80)*35,sz=.20+rand(base+j+90)*.15;c.save();c.translate(x,y);c.scale(sz,sz);c.globalAlpha=.34*(1-blend);subjects[n](c,p,t+j*3);c.restore()}return sceneNames[kind];}
function pick(seed,cycle){const block=Math.floor(cycle/subjects.length),order=subjects.map((_,i)=>i).sort((a,b)=>rand(seed+block*97+a)-rand(seed+block*97+b));return order[cycle%subjects.length]}

const fields=cards.map((card,i)=>{const holder=card.querySelector('.art');if(!holder)return null;const canvas=document.createElement('canvas');canvas.setAttribute('aria-hidden','true');canvas.className='living-canvas';holder.append(canvas);const context=canvas.getContext('2d',{alpha:true});if(!context)return null;card.classList.add('has-living-field');return {card,canvas,c:context,i,seed:Math.floor(Math.random()*1000),visible:true}}).filter(Boolean);
function resize(){for(const f of fields){const r=f.canvas.getBoundingClientRect(),d=Math.min(window.devicePixelRatio||1,1.6);f.w=r.width;f.h=r.height;f.d=d;f.canvas.width=Math.round(r.width*d);f.canvas.height=Math.round(r.height*d)}if(paused||reduce.matches)for(const f of fields)if(!f.card.hidden)paint(f)}
if(window.ResizeObserver){const ro=new ResizeObserver(resize);fields.forEach(f=>ro.observe(f.canvas))}else window.addEventListener('resize',resize,{passive:true});
if(window.IntersectionObserver){const io=new IntersectionObserver(es=>es.forEach(e=>{const f=fields.find(x=>x.card===e.target);if(f)f.visible=e.isIntersecting}),{rootMargin:'150px'});fields.forEach(f=>io.observe(f.card))}
window.addEventListener('scroll',()=>{const y=window.scrollY;velocity=Math.min(4,velocity+Math.abs(y-scroll)*.006);scroll=y},{passive:true});
const motion=document.querySelector('#motion');if(motion)motion.addEventListener('click',()=>{paused=document.body.classList.contains('paused');if(!paused)start()});
function paint(f){const {c,w,h,d}=f;if(!w||!h)return;c.setTransform(d,0,0,d,0,0);c.clearRect(0,0,w,h);
 const rect=f.card.getBoundingClientRect(),progress=clamp((window.innerHeight-rect.top)/(window.innerHeight+rect.height));
 const phase=reduce.matches?0:time*.065+progress*2.8+f.i*.7;
 const realism=(1-Math.cos(phase*Math.PI*.5))*.5;
 const game=Math.pow(Math.max(0,Math.sin(phase*Math.PI*.5-1)),6);
 const span=12;const cycle=Math.floor(time/span);const fade=clamp((time%span-8)/4);const choice=pick(f.seed,cycle);const next=pick(f.seed,cycle+1);
 // A quiet elliptical ground ties the figures to the page rather than floating cards.
 const x=w*.73,y=h*.54,scale=Math.min(w/580,h/430)*.9;
 c.save();c.translate(x,y);c.scale(scale,scale);
 const halo=c.createRadialGradient(0,-20,0,0,-20,290);halo.addColorStop(0,`rgba(134,178,166,${.08+realism*.06})`);halo.addColorStop(1,'rgba(134,178,166,0)');ellipse(c,0,-20,300,270,halo);
 ellipse(c,0,133,155,12,gradient(c,0,133,155,'#07121588','#07121500'));
 const p=palette(c,realism,game);f.canvas.dataset.scene=scene(c,f.seed,time,p);
 const draw=(n,a)=>{c.save();c.globalAlpha=a;c.translate(Math.sin(time*.4+f.i)*8,Math.cos(time*.55+f.i)*5);if(game>.1){c.shadowColor='#8fe6c3';c.shadowBlur=game*13}subjects[n](c,p,time);c.restore()};
 if(fade===0)draw(choice,1);else{c.save();c.translate(Math.sin(time*.4+f.i)*8,Math.cos(time*.55+f.i)*5);morph(c,choice,next,clamp((fade-.15)/.7),p);c.restore();if(fade<.15)draw(choice,1-fade/.15);if(fade>.85)draw(next,(fade-.85)/.15)}
 // Sparse, deterministic particles maintain motion when the reader is stationary.
 for(let j=0;j<16;j++){const px=(rand(j+f.seed)-.5)*560,py=((rand(j+f.seed+70)*450-time*(2+rand(j)*4))%450+450)%450-230;c.globalAlpha=.1+rand(j+7)*.22;ellipse(c,px,py,1+rand(j)*1.4,1+rand(j)*1.4,'#c4d7c8')}
 c.globalAlpha=1;
 if(game>.05){c.strokeStyle=`rgba(146,218,195,${game*.18})`;c.lineWidth=.6;for(let j=-4;j<5;j++)line(c,[[j*48,150],[j*100,220]],c.strokeStyle,.6);for(let j=0;j<4;j++)line(c,[[-330,150+j*j*7],[330,150+j*j*7]],c.strokeStyle,.6)}
 c.restore();f.canvas.dataset.subject=names[choice];f.canvas.dataset.realism=realism.toFixed(3);f.canvas.dataset.morph=fade.toFixed(3);f.canvas.dataset.nextSubject=names[next];
}
function tick(stamp){raf=0;const delta=last?Math.min((stamp-last)/1000,.05):0;last=stamp;paused=document.body.classList.contains('paused');if(!paused&&!reduce.matches){time+=delta*(1+velocity*2.2);velocity*=Math.pow(.08,delta)}for(const f of fields)if(f.visible&&!f.card.hidden)paint(f);if(!paused&&!reduce.matches&&!document.hidden)raf=requestAnimationFrame(tick)}
function start(){if(!raf&&!document.hidden){last=0;raf=requestAnimationFrame(tick)}}
document.addEventListener('visibilitychange',()=>{if(document.hidden){if(raf)cancelAnimationFrame(raf);raf=0;last=0}else start()});
reduce.addEventListener('change',()=>{if(raf)cancelAnimationFrame(raf);raf=0;start()});
resize();start();
})();
