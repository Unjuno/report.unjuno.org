# HOME v105 production integration

Prepared against `Unjuno/report.unjuno.org` main `24c37f1a6f5d17fe69aa5d991493540f7e377e89`, using saved HOME v105 source `afed6d46bdf72a72a3b60964ec60d8bcb7f2fe57`.

## Scope and ownership

The root Astro homepage renders HOME. Production staging includes 130 registered images (100 generated selections and 30 other backgrounds), 146 scenes and exactly 50 catalogue-selected MP3s. The five approved v2 image replacements and two recorded-piano replacements from v105 are included. Superseded image/audio originals and lossless provenance remain source-only.

The canonical Attention Astro source, shared layout, stylesheet, dependency lock and hosting configuration are unchanged from the production base. Local metadata contains Attention only. The two former generated preview summaries remain removed. Root routes are exactly `/`, `/notes/attention-is-all-you-need/` and `/rights/`. Existing `/#notes`, `/#papers` and `/#about` links remain valid. Query-free Crossref discovery stays separate from authored pages. No future paper-specific videos, interactive lessons or independent-site URLs are invented.

The production rights page includes the current VCSL Steinway B attribution for tracks 002/069. Their catalogue `source_license` is staged to `/assets/licenses/VCSL-CC0.txt` and verified byte-for-byte. No blanket reuse licence is added.

v105 renderer fixes preserve image selection and audio behavior while adding opaque viewport rendering, stable viewport sizing, Canvas context restoration and bounded requestAnimationFrame scheduling. All runtime JavaScript, CSS and active media originate from the verified v105 snapshot.

## Reproducibility

`paper-library/SOURCE_SYNC.json` records current source hashes. The portable `content/audio-baseline-v103.json` fixture is byte-identical to the v103 catalogue; its SHA-256 is asserted by the quality regression so production Git history need not contain Sites commits. Source material, score files, manifests and numerical reports are retained under `paper-library/source/quality-20261105/`. Its prototype README documents an earlier pre-integration state, not current deployment status.

## Verification for this integration

Validation completed on 2026-11-05 with Node 24.22.1, npm 11.9.0 and Astro 7.4.4. The already-installed dependencies corresponding to the unchanged lockfile were reused; a new `npm ci` was not run.

- Root build passed: 200 files, 68,120,569 bytes and exactly three HTML routes.
- `npm test` passed: standard static/favicons/search tests, optimization, review, motion/Canvas lifecycle mocks, recorded-audio checks and the portable quality-replacement test.
- `npm run test:media` passed: complete image integrity, desktop/mobile geometry, error recovery, reduced motion and the two-simulated-hour bounded loading regression.
- Production validation checked unique image and audio registrations, all catalogue bytes/hashes, active-only media staging, CC0 licence bytes, local links/fragments and duplicate IDs.
- A separate clean build of the production base produced byte-identical Attention HTML. Its SHA-256 is `42de5574fdb775e242ff7e02ac9498c10e792d6285bb8abc51e79427d3d16a51`.
- Attention source SHA-256 remains `8382ebf12498e3ff8b80d928360dade016a89478350f6692ada0ba3a14ec75b0`.

Native pixel tests were not rerun because `@napi-rs/canvas` is unavailable. No software was installed for those optional checks. Real iPhone/Safari scrolling, GPU/compositor behavior, visual acceptance and subjective listening were not tested in this integration. Mocked/CPU tests are not evidence that a device-reported flicker is resolved.

## Publication safeguards

GitHub publication is separate from CORE and Sites deployment. Building does not deploy. Recheck main, create the new tree from the exact current production tree, parent the commit to that head, and update main with an expected-head lease and no force. Reconcile and revalidate if the head changes. Verify remote commit/tree hashes afterward. No server deployment is included in this synchronization.
