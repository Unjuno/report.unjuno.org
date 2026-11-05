# report.unjuno.org — one-background paper feed

This static HOME bundle is based on v97. It includes one representative WebP image and three procedural scenes, rather than the complete visual rotation. Only SVG favicon/icons are shipped. See [SYNCHRONIZATION.md](SYNCHRONIZATION.md) for the exact scope.

## Build and check

```sh
npm run build
npm test
```

Python 3 and Node.js are required, with no npm dependencies. Serve `dist/` from a site root. The builder injects `window.__reportBundledImages` before the deferred cinema script runs. That optional allowlist filters assets and remaps scenes before their timings are calculated. Without the allowlist, the original full-scene algorithm remains available to upstream mock tests, but its image files are not included in this bundle.

`npm test` checks local links, feed/search behavior, build fixtures, SVG favicon hashes, rebuild idempotence, the shipped one-image runtime, pause/resume/reduced motion and scroll scheduling. `npm run test:review` exercises additional source/mock regressions. Mock tests are not browser FPS, real-device or accessibility measurements.

`npm run test:full-source` is explicitly for the complete upstream asset distribution: its paintings and raster-icon checks are retained, but require the omitted assets and the original full-icon builder configuration. It is not expected to pass on this reduced bundle. `npm run test:legacy` retains older renderer regression tests; those renderers are not loaded by the current HOME.

## Add a paper

1. Add a record to `content/papers.json` with a unique slug, verified title, authors, year, category, HTTPS primary-source URL, scoped claim and limitation, tags and an illustrative visual type.
2. Run the build and tests. `preserve:true` keeps an existing individually authored article, except its managed favicon head block. Do not use it for a missing article.
3. Review citations and limitations before publication. Introductory summaries do not claim that the author read or fully reviewed a paper.

Search and local feed behavior are retained from v97. The feed uses ordinary document scrolling and keeps article links available without JavaScript. The existing external discovery pagination remains unchanged. Diagrams and backgrounds are illustrative, not research evidence.
