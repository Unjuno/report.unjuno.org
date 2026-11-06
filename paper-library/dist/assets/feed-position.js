/* Start fresh visits at the top; preserve anchors and native history scrolling. */
(() => {
  'use strict';
  const navigation = performance.getEntriesByType?.('navigation')[0];
  const legacy = performance.navigation?.type;
  const type = navigation?.type ?? (legacy === 0 ? 'navigate' : legacy === 1 ? 'reload' : 'other');
  if ((type !== 'navigate' && type !== 'reload') || location.hash) return;
  const previous = history.scrollRestoration;
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  let active = true, frame = 0;
  const events = ['pointerdown', 'touchstart', 'wheel', 'keydown', 'hashchange', 'popstate'];
  const finish = () => {
    if (!active) return;
    active = false;
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    if ('scrollRestoration' in history) history.scrollRestoration = previous;
    for (const event of events) removeEventListener(event, finish, true);
    document.removeEventListener('DOMContentLoaded', reset);
    removeEventListener('pageshow', shown);
    removeEventListener('pagehide', finish);
  };
  const reset = () => {
    if (!active) return;
    if (location.hash) { finish(); return; }
    window.scrollTo({top: 0, left: 0, behavior: 'instant'});
  };
  const shown = event => {
    if (event.persisted) { finish(); return; }
    reset();
    if (!active) return;
    // Native scroll restoration can run after pageshow. Keep it manual until
    // startup has settled, then release it for normal Back/Forward behavior.
    frame = requestAnimationFrame(() => {
      frame = 0;
      reset();
      if (!active) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        reset();
        finish();
      });
    });
  };
  // Never pull the reader back after they start scrolling or follow an anchor.
  for (const event of events) addEventListener(event, finish, {passive: true, capture: true});
  document.addEventListener('DOMContentLoaded', reset, {once: true});
  addEventListener('pageshow', shown, {once: true});
  addEventListener('pagehide', finish, {once: true});
})();
