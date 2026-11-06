import {softmax,attentionWeights,mixValues,positionalEncoding,maskedWeights,toyHeads,REPORTED_EN_DE,fixed as f} from './math.mjs';
const label=(id,name,text,value,min,max,step=1)=>'<label for="'+id+'-'+name+'">'+text+' <output data-for="'+name+'">'+value+'</output></label><input id="'+id+'-'+name+'" data-param="'+name+'" type="range" min="'+min+'" max="'+max+'" step="'+step+'" value="'+value+'">';
const select=(id,name,text,options,value)=>'<label for="'+id+'-'+name+'">'+text+'</label><select id="'+id+'-'+name+'" data-param="'+name+'">'+options.map(([v,l])=>'<option value="'+v+'"'+(String(v)===String(value)?' selected':'')+'>'+l+'</option>').join('')+'</select>';
export const DEFAULTS={
sequence:{n:6},normalize:{a:2,b:2,c:0,scale:'yes'},'value-mix':{cx:-1,cy:1},'multi-head':{x:1,y:1},position:{position:0},'causal-mask':{position:2},'encoder-decoder':{mode:'train',step:2},'sequence-cost':{n:128,d:512},'reported-evidence':{model:2},scope:{claim:'parallel'}
};
function controls(id,s){
switch(id){
case 'sequence':return label(id,'n','トークン数',s.n,2,12);
case 'normalize':return ['a','b','c'].map((n,i)=>label(id,n,'点数 '+['A','B','C'][i],s[n],-4,4,.1)).join('')+select(id,'scale','2次元でのスケーリング',[['yes','√2で割る'],['no','割らない例と比較']],s.scale);
case 'value-mix':return label(id,'cx','Value Cの第1成分',s.cx,-2,2,.1)+label(id,'cy','Value Cの第2成分',s.cy,-2,2,.1);
case 'multi-head':return label(id,'x','Queryの第1成分',s.x,-2,2,.1)+label(id,'y','Queryの第2成分',s.y,-2,2,.1);
case 'position':return label(id,'position','位置',s.position,0,40);
case 'causal-mask':return select(id,'position','予測する位置（入力は1つずらします）',[[0,'0: BOSからAを予測'],[1,'1: Aまで見てBを予測'],[2,'2: Bまで見てCを予測'],[3,'3: Cまで見てEOSを予測']],s.position);
case 'encoder-decoder':return select(id,'mode','計算の場面',[['train','学習時'],['generate','生成時']],s.mode)+label(id,'step','生成時に既知の出力数',s.step,0,3);
case 'sequence-cost':return label(id,'n','系列長 n',s.n,16,1024,16)+select(id,'d','表現次元 d',[[128,'128'],[256,'256'],[512,'512'],[1024,'1024']],s.d);
case 'reported-evidence':return select(id,'model','比較するモデル',REPORTED_EN_DE.map((r,i)=>[i,r.name]),s.model);
case 'scope':return select(id,'claim','主張を選ぶ',[['parallel','学習時の位置計算を並列化できる'],['quality','この翻訳評価で高いBLEUを報告した'],['limit','あらゆる課題で必ず優れる？']],s.claim);
default:return '';
}}
const bar=(name,value,max=1,color='blue')=>'<div class="lab-bar"><span>'+name+'</span><span class="lab-bar-track" aria-hidden="true"><i class="'+color+'" style="width:'+Math.max(0,Math.min(100,value/max*100))+'%"></i></span><strong>'+f(value)+'</strong></div>';
export function output(id,s){
switch(id){
case 'sequence': {const n=Number(s.n);return '<div class="token-line">'+Array.from({length:n},(_,i)=>'<span>'+String(i+1).padStart(2,'0')+'</span>').join('')+'</div><div class="comparison"><div><small>隣り合う位置をたどる模式経路</small><strong>'+(n-1)+'</strong><span>接続を通る</span></div><div><small>端から端へ直接結ぶ模式経路</small><strong>1</strong><span>接続を通る</span></div></div><p>先頭と末尾の間を比較しています。ネットワークの構造の例で、秒数ではありません。</p>';}
case 'normalize': {const raw=[+s.a,+s.b,+s.c],scores=s.scale==='yes'?raw.map(v=>v/Math.sqrt(2)):raw,w=softmax(scores);return '<p class="formula">softmax(['+scores.map(f).join(', ')+'])</p>'+w.map((v,i)=>bar(['A','B','C'][i],v)).join('')+'<p class="lab-result">重みの合計 <strong>'+f(w.reduce((a,b)=>a+b,0))+'</strong></p>';}
case 'value-mix': {const w=attentionWeights([2,2,0]),v=[[1,0],[0,1],[+s.cx,+s.cy]],out=mixValues(w,v);return '<div class="matrix-list">'+v.map((row,i)=>'<p>Value '+['A','B','C'][i]+' = ['+row.map(f).join(', ')+'] <small>× '+f(w[i])+'</small></p>').join('')+'</div><p class="lab-result">出力 = <strong>['+out.map(f).join(', ')+']</strong></p><p>重みは[2,2,0]を√2で割ってsoftmaxした値に固定しています。</p>';}
case 'multi-head': {const h=toyHeads([+s.x,+s.y]);return '<div class="comparison">'+h.heads.map((v,i)=>'<div><small>Head '+(i+1)+'</small><p>Q = ['+(i?[+s.y,+s.x]:[+s.x,+s.y]).map(f).join(', ')+']</p><p>重み ['+v.weights.map(f).join(', ')+']</p><strong class="vector-output">['+v.output.map(f).join(', ')+']</strong></div>').join('')+'</div><p>連結 ['+h.concat.map(f).join(', ')+']</p><p class="lab-result">固定の出力投影 → <strong>['+h.output.map(f).join(', ')+']</strong></p><p>KeyとValueは両Headで同じ固定値です。Head 2のQuery投影は成分の入れ替えです。</p>';}
case 'position': {const pe=positionalEncoding(+s.position);return '<div class="position-values">'+pe.map((v,i)=>'<div><small>'+(i%2?'cos':'sin')+' · '+i+'</small><span class="signed-line"><i style="left:'+(v<0?50+v*50:50)+'%;width:'+Math.abs(v)*50+'%"></i></span><strong>'+f(v)+'</strong></div>').join('')+'</div><p class="formula">PE(pos,2i)=sin(pos / 10000^(2i/8))</p><p>偶数番目はsin、奇数番目は同じ周波数のcosです。</p>';}
case 'causal-mask': {const pos=+s.position,w=maskedWeights([2,2,0,1],pos),tokens=['BOS','A','B','C'];return '<p>位置 '+pos+' で <strong>'+['A','B','C','EOS'][pos]+'</strong> を予測</p><div class="mask-row">'+tokens.map((t,i)=>'<div class="'+(i<=pos?'allowed':'masked')+'"><span>'+t+'</span><strong>'+f(w[i])+'</strong><small>'+(i<=pos?'参照できる':'未来：参照しない')+'</small></div>').join('')+'</div><p>スケーリング後の説明用点数[2,2,0,1]を使います。未来の点数をsoftmaxの対象から外すと、その重みは0になり、参照できる重みの合計は1になります。</p>';}
case 'encoder-decoder': {const train=s.mode==='train',step=+s.step;return '<div class="flow-box"><div>入力文 → Encoder → 入力の表現</div><span aria-hidden="true">↓</span><div>Decoder · '+(train?'正解を1つずらした入力':'BOS + 生成済みの出力')+'</div></div><p class="data-label" data-token-row-label>'+ (train?'予測対象（学習時の正解）。Decoder入力はBOS・A・B・Cで、下の列とは1位置ずれています。':'生成済みの出力と、まだ未知の出力（?）。Decoder入力はBOSと生成済みの出力です。')+'</p><div class="token-line">'+['A','B','C','EOS'].map((v,i)=>'<span class="'+(train||i<step?'known':'future')+'">'+(train||i<step?v:'?')+'</span>').join('')+'</div><p class="lab-result">'+(train?'マスクを使い、各位置の予測を並列に計算':'既知の出力 '+step+' 個。次を予測してから、その次へ')+'</p>';}
case 'sequence-cost': {const n=+s.n,d=+s.d,a=n*n*d,r=n*d*d,max=Math.max(a,r);return '<p class="lab-result">位置の組 <strong>'+new Intl.NumberFormat('ja').format(n*n)+'</strong></p>'+bar('n²d',a,max)+bar('nd²',r,max,'clay')+'<p class="data-label">棒の長さは、その時点の大きい値を100%とした比です。n²dはSelf-attentionの照合・混合、nd²は再帰層の主要項です。</p><p>主要項の比 n²d / nd² = <strong>'+f(n/d)+'</strong>。実測速度や正確なFLOPs数ではありません。</p>';}
case 'reported-evidence': {const selected=REPORTED_EN_DE[+s.model];return '<p class="data-label">原論文 Table 2 · WMT 2014 英→独 · newstest2014</p>'+REPORTED_EN_DE.map((v,i)=>bar(v.name,v.bleu,30,i===+s.model?'blue':'muted')).join('')+'<p class="lab-result">'+selected.name+' <strong>'+selected.bleu+' BLEU</strong></p><p>著者の報告値です。この操作で学習・評価は実行していません。</p>';}
case 'scope': {const claims={parallel:['構造について言える','位置同士の依存をAttentionで扱い、学習時の位置計算を並列化しやすくします。','生成時は、前に生成したトークンが必要です。'],quality:['この評価条件で言える','Table 2の英→独翻訳ではTransformer bigのBLEUが28.4と報告されています。','WMT 2014の翻訳ベンチマークで報告された結果を、あらゆる課題へ一般化しません。'],limit:['この論文だけでは言えない','評価した課題や条件を超えて、常に優れることは示していません。','説明用のAttention重みも、人間が読める説明そのものだとは限りません。']};const c=claims[s.claim];return '<p class="data-label">'+c[0]+'</p><p class="claim-main">'+c[1]+'</p><p class="scope-limit">'+c[2]+'</p>';}
default:throw new Error('Unknown lab '+id);
}}
export function renderLab(id){
if(id==='query-key')return '<div data-qk-interactive><p class="qk-static-fallback">初期例：Q=[1,1]、KA=[2,0]、KB=[0,2]、KC=[−1,1]。内積は順に2、2、0です。操作にはJavaScriptを使います。</p></div>';
const s=DEFAULTS[id];if(!s)throw new Error('Unknown lab '+id);
return '<div class="concept-lab" data-concept-lab="'+id+'"><div class="lab-controls">'+controls(id,s)+'<button type="button" data-lab-reset>初期値に戻す</button></div><div class="lab-output" data-lab-output>'+output(id,s)+'</div><p class="lab-change" role="status" aria-live="polite" aria-atomic="true" data-lab-status></p></div>';
}
export function mountConceptLabs(document){
const cleanups=[];
for(const root of document.querySelectorAll('[data-concept-lab]')){
if(root.dataset.mounted)continue;root.dataset.mounted='true';const id=root.dataset.conceptLab;let state={...DEFAULTS[id]},timer;
const update=()=>{root.querySelector('[data-lab-output]').innerHTML=output(id,state);root.querySelectorAll('[data-for]').forEach(el=>el.textContent=state[el.dataset.for]);clearTimeout(timer);timer=setTimeout(()=>{root.querySelector('[data-lab-status]').textContent='値を変更しました。下の数値と説明を確認してください。';},200);};
const onInput=event=>{const name=event.target.dataset.param;if(!name)return;state[name]=typeof DEFAULTS[id][name]==='number'?Number(event.target.value):event.target.value;update();};
const onClick=event=>{if(!event.target.closest('[data-lab-reset]'))return;state={...DEFAULTS[id]};root.querySelectorAll('[data-param]').forEach(el=>el.value=String(state[el.dataset.param]));update();root.querySelector('[data-lab-status]').textContent='初期値に戻しました。';};
root.addEventListener('input',onInput);root.addEventListener('change',onInput);root.addEventListener('click',onClick);
cleanups.push(()=>{clearTimeout(timer);root.removeEventListener('input',onInput);root.removeEventListener('change',onInput);root.removeEventListener('click',onClick);delete root.dataset.mounted;});
}return()=>cleanups.forEach(fn=>fn());
}

