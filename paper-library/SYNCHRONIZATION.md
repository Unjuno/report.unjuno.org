# Source synchronization

- Source: public Sites HOME v97, commit `644b2da8e16ee999edf056d25166cc7aabb0669b`.
- Scope: source synchronization under `paper-library/`; existing root Astro source and deployment configuration are not replaced. No deployment is performed by this build.
- Visual subset: exactly one raster file, `dist/assets/art-archaeology-table-v2.webp`, unchanged from v97. Three procedural interludes remain. Other scene images, duplicate originals, PNG/ICO favicons and Apple touch icons are omitted. SVG icons remain. This is not a full visual mirror.
- Source changes: an optional scene allowlist filters/remaps assets before timing; the builder enables the subset and emits SVG-only favicon links. Upstream source tests still run the full algorithm when the allowlist is absent. Search, paper data, pagination, CSS and audio source are unchanged.
- Generated changes: HOME contains the allowlist and updated cinema fingerprint; every HTML page has an SVG-only managed favicon block. Article bodies are unchanged. No new speculative preload behavior is introduced.
- Cleanup: generated Python bytecode and two development review reports are excluded. Historical source/test files remain for reference, not as active runtime assets.
- Verification: `npm run build`, `npm test`, `npm run test:review` and the upstream two-hour `tests/background-loop.cjs` mock passed. Tests cover local links, hashes, idempotence, search/pagination, one-image requests, looping, pause/resume, reduced motion, and bounded scheduling. Real-device/browser performance was not measured here.
- Full-distribution checks: `npm run test:full-source` retains asset-dependent painting and original raster-icon checks, which require restoring the complete upstream distribution/configuration and are not applicable to this subset. They are not silently marked passed.
- Deployment: this source snapshot does not change the live Sites or CORE deployment.

`SOURCE_SYNC.json` records SHA-256 hashes of all bundled files except itself and separately records the root README hash.
