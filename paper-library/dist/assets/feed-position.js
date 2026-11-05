/* Reset explicit reloads only. Normal links and history keep native scrolling. */
(() => {
  'use strict';
  const navigation = performance.getEntriesByType?.('navigation')[0];
  const reloading = navigation ? navigation.type === 'reload' : performance.navigation?.type === 1;
  if (!reloading) return;
  const previous = history.scrollRestoration;
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  let interacted = false;
  const stopReset = () => { interacted = true; };
  const events = ['pointerdown', 'touchstart', 'wheel', 'keydown'];
  for (const event of events) addEventListener(event, stopReset, {passive: true});
  const reset = () => {
    if (!interacted) window.scrollTo({top: 0, left: 0, behavior: 'instant'});
  };
  const restore = () => {
    if ('scrollRestoration' in history) history.scrollRestoration = previous;
    for (const event of events) removeEventListener(event, stopReset);
  };
  document.addEventListener('DOMContentLoaded', reset, {once: true});
  addEventListener('pageshow', event => {
    if (!event.persisted) reset();
    restore();
  }, {once: true});
  // Save native restoration before leaving, including a departure before load.
  addEventListener('pagehide', restore, {once: true});
})();
