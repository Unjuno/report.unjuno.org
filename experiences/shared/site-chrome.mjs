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
// Reusable on any page that includes site-chrome.css. No IDs or sponsor dependency.
// Keep the verified account fixed; optional labels are plain text, never HTML.
export function renderXLink({label = 'X · @UnJuno_'} = {}) {
  return '<a class="report-x-link" href="https://x.com/UnJuno_" target="_blank" rel="noopener noreferrer">' + escapeHtml(text(label, 'X link label')) + ' <span aria-hidden="true">↗</span><span class="report-visually-hidden">（新しいタブで開きます）</span></a>';
}
export function mountXLink(container, config) {
  const template = container.ownerDocument.createElement('template');
  template.innerHTML = renderXLink(config);
  container.replaceChildren(template.content);
  return container.querySelector('.report-x-link');
}
export function renderSponsor(config) {
  const componentId = id(config.id, 'sponsor id');
  const level = config.headingLevel ?? 2;
  if (![2,3].includes(level)) throw new TypeError('headingLevel must be 2 or 3');
  const href = safeHref(config.href ?? SUPPORT_URL);
  if (href !== SUPPORT_URL) throw new TypeError('This component currently supports only the verified Unjuno support destination');
  const title = escapeHtml(text(config.title, 'title'));
  const description = escapeHtml(text(config.description, 'description'));
  return '<aside class="report-support" data-report-support aria-labelledby="' + componentId + '-title"><div class="report-support__content"><p class="report-support__eyebrow">制作を支援 · GitHub Sponsors</p><h' + level + ' id="' + componentId + '-title" class="report-support__title">' + title + '</h' + level + '><p class="report-support__description">' + description + '</p><p class="report-support__social">' + renderXLink() + '</p><a class="report-support__link" href="' + href + '" target="_blank" rel="noopener noreferrer"><svg class="report-support__github" aria-hidden="true" focusable="false" fill="currentColor" width="24" height="24" viewBox="0 0 24 24"><path d="M10.226 17.284c-2.965-.36-5.054-2.493-5.054-5.256 0-1.123.404-2.336 1.078-3.144-.292-.741-.247-2.314.09-2.965.898-.112 2.111.36 2.83 1.01.853-.269 1.752-.404 2.853-.404 1.1 0 1.999.135 2.807.382.696-.629 1.932-1.1 2.83-.988.315.606.36 2.179.067 2.942.72.854 1.101 2 1.101 3.167 0 2.763-2.089 4.852-5.098 5.234.763.494 1.28 1.572 1.28 2.807v2.336c0 .674.561 1.056 1.235.786 4.066-1.55 7.255-5.615 7.255-10.646C23.5 6.188 18.334 1 11.978 1 5.62 1 .5 6.188.5 12.545c0 4.986 3.167 9.12 7.435 10.669.606.225 1.19-.18 1.19-.786V20.63a2.9 2.9 0 0 1-1.078.224c-1.483 0-2.359-.808-2.987-2.313-.247-.607-.517-.966-1.034-1.033-.27-.023-.359-.135-.359-.27 0-.27.45-.471.898-.471.652 0 1.213.404 1.797 1.235.45.651.921.943 1.483.943.561 0 .92-.202 1.437-.719.382-.381.674-.718.944-.943"/></svg><span class="report-support__label">GitHub Sponsorsで支援する</span><span class="report-support__arrow" aria-hidden="true">↗</span><span class="report-visually-hidden">（新しいタブで開きます）</span></a><p class="report-support__disclosure">制作活動への任意の支援です。</p></div></aside>';
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

