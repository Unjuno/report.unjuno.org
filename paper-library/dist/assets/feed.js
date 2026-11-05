(() => {
  'use strict';
  const search = document.querySelector('#search'), clear = document.querySelector('#clear');
  const items = [...document.querySelectorAll('[data-entry]')];
  const count = document.querySelector('#count'), empty = document.querySelector('#empty');
  const links = [...document.querySelectorAll('.progress a, .sidebar nav a')];
  const motion = document.querySelector('#motion');
  let composing = false;
  const norm = text => text.normalize('NFKC').toLowerCase().trim();
  // Normalize an unchanged record once, rather than once per term on every key.
  // Keep the source string so late metadata edits invalidate the cached value.
  const searchText = new WeakMap(), linksByHash = new Map();
  for (const link of links) {
    if (!linksByHash.has(link.hash)) linksByHash.set(link.hash, []);
    linksByHash.get(link.hash).push(link);
  }
  function normalizedText(item) {
    const source = item.dataset.search || '', cached = searchText.get(item);
    if (cached && cached.source === source) return cached.text;
    const text = norm(source);
    searchText.set(item, {source, text});
    return text;
  }
  function hide(element, hidden) {
    if (element.hidden !== hidden) element.hidden = hidden;
  }
  function label(element, text) {
    if (element && element.textContent !== text) element.textContent = text;
  }
  function filter() {
    const terms = norm(search.value).split(/\s+/).filter(Boolean);
    let n = 0;
    for (const item of document.querySelectorAll('[data-entry]')) {
      const text = terms.length ? normalizedText(item) : '';
      const hidden = !terms.every(term => text.includes(term));
      hide(item, hidden);
      if (!hidden) n++;
      for (const link of linksByHash.get('#' + item.id) || []) hide(link, hidden);
    }
    for (const sponsor of document.querySelectorAll('[data-sponsor]')) hide(sponsor, terms.length > 0);
    label(count, n + '件の論文');
    label(document.querySelector('#filter-feedback'), terms.length ? n + '件を表示中' : '');
    hide(empty, n !== 0);
  }
  search.addEventListener('compositionstart', () => composing = true);
  search.addEventListener('compositionend', () => { composing = false; filter(); });
  search.addEventListener('input', event => { if (!composing && !event.isComposing) filter(); });
  clear.addEventListener('click', () => { composing = false; search.value = ''; filter(); search.focus(); });
  motion?.addEventListener('click', () => {
    const paused = document.body.classList.toggle('paused');
    motion.textContent = paused ? '背景を再開' : '背景を停止';
    motion.setAttribute('aria-pressed', String(paused));
  });
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting && !entry.target.hidden) {
        for (const link of links) link.setAttribute('aria-current', String(link.hash === '#' + entry.target.id));
      }
    }, {rootMargin:'-25% 0px -25% 0px', threshold:0});
    items.forEach(item => io.observe(item));
  }
  document.querySelectorAll('[data-category]').forEach(button => button.addEventListener('click', () => {
    composing = false; search.value = button.dataset.category; filter(); search.focus();
  }));
  const papers = document.querySelector('#papers');
  if (window.MutationObserver && papers) {
    const containsFilterable = node => node.nodeType === 1 &&
      (node.matches?.('[data-entry]') || node.matches?.('[data-sponsor]') ||
       node.querySelector?.('[data-entry], [data-sponsor]'));
    new MutationObserver(changes => {
      // Decoration and loading-label changes do not change searchable records.
      // compositionend applies any pending changes without committing partial IME text.
      if (composing) return;
      if (changes.some(change => change.type === 'attributes'
        ? change.target.matches('[data-entry]')
        : [...change.addedNodes, ...change.removedNodes].some(containsFilterable))) filter();
    }).observe(papers, {childList:true, subtree:true, attributes:true, attributeFilter:['data-search']});
  }
  filter();
})();
