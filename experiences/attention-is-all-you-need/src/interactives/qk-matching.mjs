import {INITIAL_QUERY, INITIAL_KEYS, evaluateQuery, formatNumber as fmt} from '../math/qk-matching.mjs';
let sequence = 0;
const PALETTES = {dark:{Q:'#66e2bd',A:'#79bfff',B:'#c3a3ff',C:'#ffce79'},editorial:{Q:'#2a55eb',A:'#b94b2c',B:'#417065',C:'#566567'}};
const vectorText = vector => `[${vector.map(fmt).join(', ')}]`;
const signed = number => number < 0 ? `(${fmt(number)})` : fmt(number);
const presets = {horizontal:[2,0],vertical:[0,2],opposite:[-2,0],zero:[0,0]};
export function mountQK(root, {theme = 'dark'} = {}) {
  if (!(root instanceof HTMLElement)) throw new TypeError('mountQK requires an HTMLElement.');
  if (root.dataset.qkMounted) return root.qkController;
  root.dataset.qkMounted = 'true';
  root.dataset.qkTheme = theme;
  const COLORS = PALETTES[theme] || PALETTES.dark;
  const prefix = `qk-${++sequence}`;
  const abort = new AbortController();
  let query = [...INITIAL_QUERY];
  let keys = INITIAL_KEYS.map(key => ({id:key.id, vector:[...key.vector]}));
  let selected = 'A';
  root.classList.add('qk-lab');
  const control = (type, axis, label, value) => `<label class="qk-slider-label" for="${prefix}-${type}-${axis}"><span>${label}</span><output data-value="${type}-${axis}" for="${prefix}-${type}-${axis}">${value}</output></label><input id="${prefix}-${type}-${axis}" type="range" min="-2" max="2" step="0.1" value="${value}" data-vector="${type}" data-axis="${axis}" aria-label="${type === 'q' ? 'Query' : '選択中のKey'} の${axis === 0 ? '第1' : '第2'}成分"><div class="qk-range-ends" aria-hidden="true"><span>−2</span><span>0</span><span>2</span></div>`;
  root.innerHTML = `
    <div class="qk-topline"><span class="qk-kicker">TRY IT · 触って確かめる</span><button class="qk-reset" type="button" data-action="reset">最初に戻す</button></div>
    <h3>Queryを変えると、照合の点数はどう変わる？</h3>
    <p class="qk-intro">まずQueryを動かしてみましょう。各Keyとの内積を、その場で計算します。</p>
    <div class="qk-layout">
      <div class="qk-controls">
        <fieldset class="qk-fieldset qk-query"><legend>Q <span>問い合わせ</span> <output data-query-label></output></legend>${control('q',0,'第1成分 q₁',1)}${control('q',1,'第2成分 q₂',1)}</fieldset>
        <fieldset class="qk-presets"><legend>形を選んで比べる</legend><div class="qk-buttons"><button type="button" data-preset="horizontal">右向き</button><button type="button" data-preset="vertical">上向き</button><button type="button" data-preset="opposite">左向き</button><button type="button" data-preset="zero">ゼロ</button></div></fieldset>
        <details class="qk-key-editor"><summary>Keyも動かす</summary><fieldset class="qk-fieldset"><legend>編集するKey</legend><div class="qk-key-picker">${keys.map(key=>`<label style="--key-color:${COLORS[key.id]}"><input type="radio" name="${prefix}-key" value="${key.id}" ${key.id==='A'?'checked':''}> K${key.id}</label>`).join('')}</div><p class="qk-key-selected" data-selected-key></p>${control('k',0,'第1成分 k₁',2)}${control('k',1,'第2成分 k₂',0)}</fieldset></details>
      </div>
      <div class="qk-visual"><div class="qk-plot-caption"><span>2次元のベクトル</span><span>矢印の長さも点数に効く</span></div><svg class="qk-plot" viewBox="0 0 420 420" role="img" aria-labelledby="${prefix}-plot-title ${prefix}-plot-desc"><title id="${prefix}-plot-title">Queryと3つのKeyのベクトル</title><desc id="${prefix}-plot-desc"></desc><defs>${Object.entries(COLORS).map(([id,color])=>`<marker id="${prefix}-arrow-${id}" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L7,3.5 L0,7 Z" fill="${color}"/></marker>`).join('')}</defs><g data-grid></g><g data-arrows></g></svg><div class="qk-legend">${Object.entries(COLORS).map(([id,color])=>`<span style="--key-color:${color}"><i></i>${id==='Q'?'Q':`K${id}`}</span>`).join('')}</div></div>
    </div>
    <div class="qk-results"><div class="qk-results-head"><h4>照合の点数</h4><span>内積 q · k = q₁k₁ + q₂k₂</span></div><p class="qk-score-note">この点数は確率ではありません。負の値にもなります。</p><div data-scores class="qk-scores"></div><p class="qk-winner" role="status" aria-live="polite" aria-atomic="true" data-summary></p></div>
    <details class="qk-observation"><summary>見えてきたことを確かめる</summary><ul><li>Q = [2, 0]なら、初期のKAの点数は4、KBは0、KCは−2になります。</li><li>Q = [0, 0]なら、どのKeyとの点数も0になります。</li><li>同じ向きでも、ベクトルを長くすると内積は変わります。内積は角度だけの比較ではありません。</li></ul><p>実際のSelf-Attentionでは、入力表現に学習された行列を掛けてQとKを作ります。ここでは、その後の内積だけを2次元の小さな例で見ています。</p></details>
    <p class="qk-disclosure">説明用に手で設定した数値です。学習済みモデルの出力ではありません。ここではスケーリングとsoftmaxの前までを扱います。</p>
  `;
  const grid = root.querySelector('[data-grid]');
  const origin = 210, scale = 70;
  const point = vector => [origin+vector[0]*scale,origin-vector[1]*scale];
  grid.innerHTML = [-2,-1,0,1,2].map(n=>`<path d="M70 ${origin-n*scale} H350 M${origin+n*scale} 70 V350" stroke="${n===0?'#5f7289':'#243449'}" stroke-width="${n===0?1.6:1}"/>${n!==0?`<text x="${origin+n*scale}" y="232" text-anchor="middle" class="qk-grid-number">${n}</text><text x="192" y="${origin-n*scale+5}" text-anchor="end" class="qk-grid-number">${n}</text>`:''}`).join('') + '<text x="365" y="215" class="qk-axis-name">第1</text><text x="198" y="48" class="qk-axis-name">第2</text>';
  let announcementTimer;
  function update({announce = true} = {}) {
    const result = evaluateQuery(query, keys);
    root.querySelector('[data-query-label]').textContent = vectorText(query);
    const activeKey = keys.find(key=>key.id===selected);
    root.querySelector('[data-selected-key]').textContent = `K${selected} = ${vectorText(activeKey.vector)}`;
    for (const input of root.querySelectorAll('input[data-vector]')) {
      const value = (input.dataset.vector==='q'?query:activeKey.vector)[Number(input.dataset.axis)];
      input.value = value;
      input.setAttribute('aria-valuetext', fmt(value));
      if (input.dataset.vector === 'k') input.setAttribute('aria-label', `Key ${selected} の第${Number(input.dataset.axis)+1}成分`);
      root.querySelector(`[data-value="${input.dataset.vector}-${input.dataset.axis}"]`).textContent = fmt(value);
    }
    const vectors = [...keys.map(key=>({id:key.id,vector:key.vector})),{id:'Q',vector:query}];
    root.querySelector('[data-arrows]').innerHTML = vectors.map(({id,vector},i)=>{
      const [x,y]=point(vector), isZero=vector.every(value=>Math.abs(value)<1e-9);
      const labelOffset = id==='Q'?-12:18;
      return `<g><path d="M210 210 L${x} ${y}" stroke="${COLORS[id]}" stroke-width="${id==='Q'?4:2.5}" ${id==='Q'?'stroke-dasharray="9 3"':''} marker-end="url(#${prefix}-arrow-${id})"/><circle cx="${x}" cy="${y}" r="${isZero?6:3}" fill="${COLORS[id]}"/><text x="${Math.min(368,Math.max(35,x+12))}" y="${Math.min(385,Math.max(26,y+labelOffset+(isZero?i*17:0)))}" fill="${COLORS[id]}" class="qk-vector-label">${id==='Q'?'Q':`K${id}`}</text></g>`;
    }).join('');
    root.querySelector(`#${prefix}-plot-desc`).textContent = vectors.map(({id,vector})=>`${id}は${vectorText(vector)}`).join('、');
    root.querySelector('[data-scores]').innerHTML = result.rows.map(row=>{
      const fraction = Math.min(50,Math.abs(row.score)/8*50);
      return `<div class="qk-score" style="--key-color:${COLORS[row.id]}"><div class="qk-score-label"><strong>K${row.id}</strong><span>${vectorText(row.vector)}</span><b data-score="${row.id}">${fmt(row.score)}</b></div><div class="qk-score-meter" aria-hidden="true"><span class="qk-score-zero"></span><span class="qk-score-fill" style="left:${row.score>=0?50:50-fraction}%;width:${fraction}%"></span></div><p class="qk-equation">${signed(query[0])} × ${signed(row.vector[0])} + ${signed(query[1])} × ${signed(row.vector[1])} = <strong>${fmt(row.score)}</strong></p></div>`;
    }).join('');
    const allZero = result.rows.every(row=>Math.abs(row.score)<1e-9);
    const summary = allZero ? 'すべての点数が0です。まだ参照する割合は決まっていません。' : `${result.winnerIds.map(id=>`K${id}`).join('と')}の点数が最も高く、${fmt(result.maximum)}です。${result.winnerIds.length>1?'同点です。':''}`;
    clearTimeout(announcementTimer);
    if (announce) announcementTimer = setTimeout(()=>{ root.querySelector('[data-summary]').textContent=summary; },150);
    else root.querySelector('[data-summary]').textContent=summary;
    root.dispatchEvent(new CustomEvent('qk:change',{bubbles:true,detail:{query:[...query],keys:keys.map(key=>({id:key.id,vector:[...key.vector]})),...result}}));
  }
  root.addEventListener('input',event=>{
    const input=event.target;
    if (!input.matches('input[data-vector]')) return;
    const vector=input.dataset.vector==='q'?query:keys.find(key=>key.id===selected).vector;
    vector[Number(input.dataset.axis)]=Number(input.value);
    update();
  },{signal:abort.signal});
  root.addEventListener('change',event=>{
    if (!event.target.matches('input[type="radio"]')) return;
    selected=event.target.value; update({announce:false});
  },{signal:abort.signal});
  root.addEventListener('click',event=>{
    const button=event.target.closest('button');
    if (!button) return;
    if (button.dataset.action==='reset') {
      query=[...INITIAL_QUERY]; keys=INITIAL_KEYS.map(key=>({id:key.id,vector:[...key.vector]})); selected='A';
      root.querySelector(`input[type="radio"][value="A"]`).checked=true;
      update();
    } else if (button.dataset.preset in presets) {
      query=[...presets[button.dataset.preset]]; update();
    }
  },{signal:abort.signal});
  const controller = {getState:()=>({query:[...query],keys:keys.map(key=>({id:key.id,vector:[...key.vector]})),selected}),destroy:()=>{abort.abort();clearTimeout(announcementTimer);delete root.dataset.qkMounted;delete root.qkController;root.innerHTML='';}};
  root.qkController=controller; update({announce:false}); return controller;
}
