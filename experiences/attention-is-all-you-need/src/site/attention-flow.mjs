import {attentionWeights,mixValues,fixed as f} from './math.mjs';

// Deliberately small, fixed teaching vectors. These are not learned embeddings.
const FLOW_KEYS=[[2,0],[0,2],[-1,1]];
const FLOW_NAMES=['A','B','C'];
const FLOW_DEFAULT={qx:1,qy:1,cx:-1,cy:1};
const FLOW_PRESETS={a:[2,0],b:[0,2],c:[-2,1],equal:[0,0]};
const coordinate=n=>140+n*50;
const ordinate=n=>140-n*50;
const vector=v=>'['+v.map(f).join(', ')+']';
export function evaluateAttentionFlow(state){
  if(!state||!Object.keys(FLOW_DEFAULT).every(k=>Number.isFinite(state[k])&&Math.abs(state[k])<=2))throw new RangeError('Finite coordinates between -2 and 2 required');
  const query=[state.qx,state.qy],scores=FLOW_KEYS.map(k=>k[0]*query[0]+k[1]*query[1]);
  const weights=attentionWeights(scores,2),values=[[1,0],[0,1],[state.cx,state.cy]];
  const contributions=values.map((v,i)=>v.map(x=>x*weights[i]));
  return {query,scores,weights,values,contributions,output:mixValues(weights,values)};
}
function axes(){return '<path class="af-grid" d="M40 40V240M90 40V240M140 40V240M190 40V240M240 40V240M40 40H240M40 90H240M40 140H240M40 190H240M40 240H240"/><path class="af-axis" d="M30 140H250M140 30V250"/><g class="af-tick"><text x="40" y="158">−2</text><text x="237" y="158">2</text><text x="147" y="44">2</text><text x="147" y="242">−2</text></g>';}
function point(name,v,kind){return '<g data-af-point="'+name+'" class="af-point '+kind+'" transform="translate('+coordinate(v[0])+' '+ordinate(v[1])+')"><circle r="'+(kind==='af-draggable'?11:6)+'"/><text x="13" y="-12">'+name+'</text></g>';}
function controls(){return Object.entries({qx:'Q の横',qy:'Q の縦',cx:'Value C の横',cy:'Value C の縦'}).map(([key,label])=>'<label for="af-'+key+'">'+label+'<output data-af-number="'+key+'">'+FLOW_DEFAULT[key]+'</output></label><input type="range" id="af-'+key+'" data-af-control="'+key+'" min="-2" max="2" step="0.05" value="'+FLOW_DEFAULT[key]+'">').join('');}
function weightRows(result){return FLOW_NAMES.map((name,i)=>'<div class="af-weight-row" data-af-row="'+i+'"><strong>'+name+'</strong><span data-af-score>'+f(result.scores[i])+'</span><span class="af-meter" aria-hidden="true"><i style="width:'+(result.weights[i]*100)+'%"></i></span><span data-af-weight>'+f(result.weights[i])+'</span></div>').join('');}
export function renderAttentionFlow(){
  const result=evaluateAttentionFlow(FLOW_DEFAULT);
  return '<section class="attention-flow" id="attention-playground" data-attention-flow aria-labelledby="attention-flow-title"><h2 id="attention-flow-title">Attentionの重みと出力の変化を試す</h2><p class="af-data-note">説明用の2次元・3トークン。学習済みモデルではありません。</p><div class="af-beginner" data-af-beginner><p>Self-attentionは、その層の入力 x を学習で調整される3種類の変換（行列）W_Q・W_K・W_Vで変換します（Q=xW_Q、K=xW_K、V=xW_V）。最初の入力は、単語の数列表現（<strong>埋め込み</strong>）に順番を表す<strong>位置情報</strong>を足したものです。この図は、入力からの変換・学習・位置情報を省略した数値例です。</p><p><strong>Q（Query）</strong>は探したい情報、<strong>K（Key）</strong>は照合する手がかり、<strong>V（Value）</strong>は混ぜる情報を表す数の組です。</p><p>点数は、QとKの内積。同じ位置の数を掛けて足します。たとえば [1,2]·[3,4] = 1×3 + 2×4 = 11。点数は向きだけでなく、数値の大きさにも左右されます。</p><p>次元が増えると内積の振れ幅が大きくなりやすいため、Kの成分数 d_k の平方根<strong>√d_kで割ります</strong>。重みの極端な偏りを和らげる狙いです。この例は2次元なので<strong>√2</strong>です。</p><p><strong>softmax</strong>は、点数が高いほど大きい、合計1の重みに変える計算です。その重みをV A・V B・V Cに掛けて足したものが、右の<strong>出力</strong>です。Transformer全体の構造を示すものではありません。</p></div><p class="af-instruction" data-af-instruction>QとValue Cの図をクリック・ドラッグ。重みと出力を見比べよう。</p><div class="af-buttons af-enhanced"><button type="button" data-af-preset="a">A を強める</button><button type="button" data-af-preset="b">B を強める</button><button type="button" data-af-preset="c">C を強める</button><button type="button" data-af-preset="equal">Q をゼロに</button><button type="button" data-af-reset>最初に戻す</button></div><div class="af-panels"><section class="af-panel"><h3>1 · Query と Key</h3><svg viewBox="0 0 280 280" role="img" aria-label="Queryと固定Keyの2次元配置" aria-describedby="af-query-readout" data-af-pad="query">'+axes()+FLOW_KEYS.map((k,i)=>point('K'+FLOW_NAMES[i],k,'af-fixed')).join('')+'<path data-af-query-line class="af-query-line" d="M140 140L190 90"/>'+point('Q',result.query,'af-draggable')+'</svg><p id="af-query-readout">Q = <output data-af-query>'+vector(result.query)+'</output></p></section><section class="af-panel af-weights"><h3>2 · 点数 → 重み</h3><p class="af-table-header"><span>Key</span><span>Q·K</span><span>softmax(Q·K / √2)</span></p>'+weightRows(result)+'<p class="af-total">重みの合計 <output data-af-total>1</output></p><div class="af-mix-caption">この割合で Value を混ぜる <span aria-hidden="true">→</span></div></section><section class="af-panel"><h3>3 · Value → 出力</h3><svg viewBox="0 0 280 280" role="img" aria-label="Valueの三角形と重み付き平均の出力" aria-describedby="af-output-readout" data-af-pad="value">'+axes()+'<path data-af-triangle class="af-triangle" d="M190 140L140 90L90 90Z"/>'+point('VA',result.values[0],'af-fixed')+point('VB',result.values[1],'af-fixed')+point('VC',result.values[2],'af-draggable')+point('出力',result.output,'af-result')+'</svg><p id="af-output-readout">出力 = <output data-af-output>'+vector(result.output)+'</output></p></section></div><details class="af-numeric af-enhanced"><summary>キーボード・数値で動かす</summary><div class="af-sliders">'+controls()+'</div></details><p class="af-feedback" data-af-feedback>Qを変えると重みが変わる。Value Cだけなら、重みはそのまま。</p><details class="af-calculation"><summary>計算と、この例の範囲</summary><p>手で作った2次元・3トークンの1 Headです。KeyとValue A・Bは固定。学習したモデルの出力ではありません。</p><p>K A=[2,0]、K B=[0,2]、K C=[−1,1]。Value A=[1,0]、Value B=[0,1]。</p><p>Value C = <output data-af-value>'+vector(result.values[2])+'</output></p><p data-af-calculation>'+result.contributions.map(vector).join(' + ')+' = '+vector(result.output)+'</p><p>原論文 <a href="https://arxiv.org/html/1706.03762v7#S3.SS2.SSS1" target="_blank" rel="noopener noreferrer">§3.2.1 / Scaled Dot-Product Attention ↗</a>。表示は小数3桁に丸め、計算は丸めずに行います。</p></details><p class="af-static-note">初期例を表示しています。操作はJavaScriptを有効にすると使えます。</p><p class="af-announcement" data-af-status role="status" aria-live="polite" aria-atomic="true"></p><a class="media-to-lab" href="#unit-query-key">動画で仕組みを確かめる →</a></section>';
}
export function mountAttentionFlow(document){
  const cleanups=[];
  for(const root of document.querySelectorAll('[data-attention-flow]')){
    if(root.dataset.afMounted)continue;
    root.dataset.afMounted='true';
    let state={...FLOW_DEFAULT},drag=null,timer=null,destroyed=false;
    const view=document.defaultView,pads=[...root.querySelectorAll('[data-af-pad]')];
    const find=selector=>root.querySelector(selector);
    function render(message,announce=true){
      const result=evaluateAttentionFlow(state);
      const move=(name,v)=>find('[data-af-point="'+name+'"]').setAttribute('transform','translate('+coordinate(v[0])+' '+ordinate(v[1])+')');
      move('Q',result.query);move('VC',result.values[2]);move('出力',result.output);
      find('[data-af-query-line]').setAttribute('d','M140 140L'+coordinate(state.qx)+' '+ordinate(state.qy));
      find('[data-af-triangle]').setAttribute('d',result.values.map((v,i)=>(i?'L':'M')+coordinate(v[0])+' '+ordinate(v[1])).join('')+'Z');
      find('[data-af-query]').textContent=vector(result.query);find('[data-af-output]').textContent=vector(result.output);
      find('[data-af-value]').textContent=vector(result.values[2]);
      find('[data-af-calculation]').textContent=result.contributions.map(vector).join(' + ')+' = '+vector(result.output);
      root.querySelectorAll('[data-af-row]').forEach((row,i)=>{row.querySelector('[data-af-score]').textContent=f(result.scores[i]);row.querySelector('[data-af-weight]').textContent=f(result.weights[i]);row.querySelector('i').style.width=(result.weights[i]*100)+'%';});
      find('[data-af-total]').textContent=f(result.weights.reduce((a,b)=>a+b,0));
      root.querySelectorAll('[data-af-control]').forEach(el=>{el.value=String(state[el.dataset.afControl]);});
      root.querySelectorAll('[data-af-number]').forEach(el=>el.textContent=f(state[el.dataset.afNumber]));
      find('[data-af-feedback]').textContent=message;
      view.clearTimeout(timer);if(announce)timer=view.setTimeout(()=>{if(!destroyed)find('[data-af-status]').textContent=message+' 出力 '+vector(result.output)+'。重み '+result.weights.map(f).join('、')+'。';},180);
    }
    function cancelDrag(){if(!drag)return;const current=drag;drag=null;try{if(current.pad.hasPointerCapture?.(current.id))current.pad.releasePointerCapture(current.id);}catch{ /* Capture may have ended before cancellation. */ }}
    const onInput=event=>{const key=event.target.dataset.afControl;if(!Object.hasOwn(FLOW_DEFAULT,key))return;const number=Number(event.target.value);if(!Number.isFinite(number))return;cancelDrag();state[key]=Math.min(2,Math.max(-2,number));render(key.startsWith('q')?'Q → 点数 → 重み → 出力が連動します。':'Value Cを変更。点数と重みは変わりません。');};
    const onClick=event=>{const button=event.target.closest('[data-af-preset],[data-af-reset]');if(!button||!root.contains(button))return;cancelDrag();if(button.hasAttribute('data-af-reset')){state={...FLOW_DEFAULT};render('最初のQとValueに戻しました。');}else{const preset=FLOW_PRESETS[button.dataset.afPreset];if(!preset)return;[state.qx,state.qy]=preset;render(button.dataset.afPreset==='equal'?'Qがゼロなら点数はすべて0。重みは3分の1ずつ。':'Qを変更。Valueはそのまま、混ぜる割合が変わります。');}};
    function place(event,pad){const rect=pad.getBoundingClientRect();if(!rect.width||!rect.height)return;const clamp=n=>Math.round(Math.min(2,Math.max(-2,n))*20)/20;const x=clamp(((event.clientX-rect.left)/rect.width*280-140)/50),y=clamp((140-(event.clientY-rect.top)/rect.height*280)/50);if(!Number.isFinite(x)||!Number.isFinite(y))return;const query=pad.dataset.afPad==='query';if(query){state.qx=x;state.qy=y;}else{state.cx=x;state.cy=y;}render(query?'Q → 点数 → 重み → 出力が連動します。':'Value Cを変更。点数と重みは変わりません。');}
    const onDown=event=>{if(event.isPrimary===false||event.button>0||drag)return;const pad=event.currentTarget;drag={pad,id:event.pointerId};try{pad.setPointerCapture?.(event.pointerId);}catch{ /* Window listeners also finish uncaptured gestures. */ }event.preventDefault();place(event,pad);};
    const onMove=event=>{if(drag&&event.pointerId===drag.id)place(event,drag.pad);};
    const onEnd=event=>{if(drag&&event.pointerId===drag.id)cancelDrag();};
    const onVisibility=()=>{if(document.visibilityState==='hidden')cancelDrag();};
    const onLost=event=>{if(drag&&event.pointerId===drag.id)cancelDrag();};
    pads.forEach(pad=>{pad.addEventListener('pointerdown',onDown);pad.addEventListener('lostpointercapture',onLost);});
    root.addEventListener('input',onInput);root.addEventListener('change',onInput);root.addEventListener('click',onClick);
    view.addEventListener('pointermove',onMove);view.addEventListener('pointerup',onEnd);view.addEventListener('pointercancel',onEnd);view.addEventListener('blur',cancelDrag);document.addEventListener('visibilitychange',onVisibility);
    find('[data-af-status]').textContent='';
    render('Qを変えると重みが変わる。Value Cだけなら、重みはそのまま。',false);
    cleanups.push(()=>{destroyed=true;cancelDrag();view.clearTimeout(timer);pads.forEach(pad=>{pad.removeEventListener('pointerdown',onDown);pad.removeEventListener('lostpointercapture',onLost);});root.removeEventListener('input',onInput);root.removeEventListener('change',onInput);root.removeEventListener('click',onClick);view.removeEventListener('pointermove',onMove);view.removeEventListener('pointerup',onEnd);view.removeEventListener('pointercancel',onEnd);view.removeEventListener('blur',cancelDrag);document.removeEventListener('visibilitychange',onVisibility);delete root.dataset.afMounted;});
  }
  return ()=>cleanups.forEach(fn=>fn());
}
