const SUPPORT_URL = 'https://github.com/sponsors/Unjuno';
const ID = /^[A-Za-z][A-Za-z0-9_-]*$/;
function text(value, field, {optional = false} = {}) {
  if (optional && (value === undefined || value === null || value === '')) return '';
  if (typeof value !== 'string' || !value.trim()) throw new TypeError(field + ' must be nonempty text');
  return value.trim();
}
function id(value, field) {
  if (typeof value !== 'string' || !ID.test(value)) throw new TypeError(field + ' must be a simple unique HTML id');
  return value;
}
export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
export function safeHref(value) {
  const href = text(value, 'href');
  if (/[\u0000-\u0020\u007f\\]/.test(href)) throw new TypeError('Invalid URL characters');
  if (href.startsWith('#')) { id(href.slice(1), 'fragment'); return href; }
  if (href.startsWith('/') && !href.startsWith('//')) return href;
  let url;
  try { url = new URL(href); } catch { throw new TypeError('URL must be HTTPS, site-relative, or a fragment'); }
  if (url.protocol !== 'https:' || url.username || url.password) throw new TypeError('Only credential-free HTTPS URLs are supported');
  return href;
}
export function renderHeader(config) {
  const mainId = id(config.mainId ?? 'main-content', 'mainId');
  const brand = escapeHtml(text(config.brandLabel ?? 'report.unjuno.org', 'brandLabel'));
  const home = escapeHtml(safeHref(config.homeHref));
  const rights = escapeHtml(safeHref(config.rightsHref));
  const context = text(config.context, 'context', {optional:true});
  if (!Array.isArray(config.links ?? [])) throw new TypeError('links must be an array');
  const links = (config.links ?? []).map((link) => '<a class="report-header__link" href="' + escapeHtml(safeHref(link.href)) + '">' + escapeHtml(text(link.label, 'link label')) + '</a>').join('');
  return '<a class="report-skip" href="#' + mainId + '">本文へ移動</a><header class="report-header" data-report-header><div class="report-header__identity"><a class="report-header__brand" href="' + home + '">' + brand + '</a>' + (context ? '<span class="report-header__context">' + escapeHtml(context) + '</span>' : '') + '</div><div class="report-header__tools" data-report-header-tools></div><nav class="report-header__nav" aria-label="サイト内の移動">' + links + '<a class="report-header__rights" href="' + rights + '">著作権・再利用方針</a></nav></header>';
}
export function renderSponsor(config) {
  const componentId = id(config.id, 'sponsor id');
  const level = config.headingLevel ?? 2;
  if (![2,3].includes(level)) throw new TypeError('headingLevel must be 2 or 3');
  const href = safeHref(config.href ?? SUPPORT_URL);
  if (href !== SUPPORT_URL) throw new TypeError('This component currently supports only the verified Unjuno support destination');
  const title = escapeHtml(text(config.title, 'title'));
  const description = escapeHtml(text(config.description, 'description'));
  return '<aside class="report-support" data-report-support aria-labelledby="' + componentId + '-title"><div class="report-support__content"><p class="report-support__eyebrow">制作を支援 · GitHub Sponsors</p><h' + level + ' id="' + componentId + '-title" class="report-support__title">' + title + '</h' + level + '><p class="report-support__description">' + description + '</p><a class="report-support__link" href="' + href + '" target="_blank" rel="noopener noreferrer">GitHub Sponsorsで支援する <span aria-hidden="true">↗</span><span class="report-visually-hidden">（新しいタブで開きます）</span></a><p class="report-support__disclosure">制作活動への任意の支援です。</p></div></aside>';
}
// Existing controls are moved as DOM nodes, never accepted as raw HTML strings.
// Moving nodes preserves IDs, state, and attached event listeners.
export function mountHeader(container, config, {tools = []} = {}) {
  const document = container.ownerDocument;
  if (!Array.isArray(tools) || tools.some((node) => !(node instanceof document.defaultView.HTMLElement))) {
    throw new TypeError('tools must be existing HTML elements');
  }
  const template = document.createElement('template');
  template.innerHTML = renderHeader(config);
  container.replaceChildren(template.content);
  const slot = container.querySelector('[data-report-header-tools]');
  tools.forEach((node) => slot.append(node));
  return container.querySelector('[data-report-header]');
}
export function mountSponsor(container, config) {
  const template = container.ownerDocument.createElement('template');
  template.innerHTML = renderSponsor(config);
  container.replaceChildren(template.content);
  return container.querySelector('[data-report-support]');
}

