# report.unjuno.org

Three authored learning experiences are served as long, scrollable pages. HOME lists all three in its initial HTML, including when JavaScript is disabled.

- `/notes/attention-is-all-you-need/learn/`: 11 learning units and 12 narrated videos.
- `/notes/generative-adversarial-nets/learn/`: 7 chapters and 8 narrated videos.
- `/notes/deep-residual-learning/learn/`: 5 chapters and 6 narrated videos.

Each page includes Japanese captions, transcripts, hands-on calculations, no-JavaScript reading and answers, primary references, and the shared X and GitHub Sponsors components. Chapter links stay within the same page. Inputs and answers are not persisted. Old note/course URLs and chapter URLs redirect to the relevant learning page or section. Reading-note content is archived in `archive/reading-notes/` and is not built as a separate article.

## Source ownership

`paper-library/` owns HOME, its local search and background/audio runtime, 130 registered background images and 50 recorded audio tracks. `experiences/` owns the three learning packages. `experiences/shared/` owns common header, X and Sponsors rendering. Root Astro wrappers exclusively own HTML routes; each course builder owns its generated learning document and assets. `scripts/prepare-extra-papers.mjs` stages non-HTML assets only.

## Edit the HOME list

`paper-library/content/integrated-materials.json` is the sole list input. Each record has exactly four fields: `title`, `authors` (a nonempty array of display names), `summary`, and `url` (`/notes/<slug>/learn/`). The builder validates the route and implemented source package before writing output. Metadata alone cannot create an unimplemented course. `dist/data/papers.json` is derived output and must not be edited.

Attention uses its `content/experience.json`, `tools/build-site.mjs`, and `src/site/lessons.mjs` authoring contract. ResNet and GAN use the explicitly supported units/build/app/math contracts in `material_policy.py` and generate `public/index.html`. New architectures require an intentional admission change. Static HTML verification also checks the actual built learning destinations and all 26 video entries.

Every listed material is visible without JavaScript. Search is local. No external discovery, infinite feed, or unproduced-paper cards are shipped. Empty/15-card generator cases are hypothetical fixtures, not real extra materials.

## Build and verify

Requires Python 3 and Node.js 22.23.4 or newer.

    npm ci
    npm run build
    npm test
    npm run test:attention
    npm run test:media

In restricted environments, `ASTRO_TELEMETRY_DISABLED=1` avoids Astro creating an unrelated home-directory telemetry configuration.

The root build outputs 22 HTML routes: 3 learning pages, 17 compatibility redirects, HOME and rights. It validates local links and anchors, route ownership, preserved media, HOME cards, learning output parity, and redirect targets. `npm test` also exercises HOME search/IME/clear/no-JavaScript behavior and its existing visual/audio regression contracts, all ResNet/GAN math and DOM tests, and shared chrome. `npm run test:attention` runs Attention's build, structure, math, DOM and media tests. Tests use deterministic DOM implementations and static/decoder checks; they do not establish real-browser rendering/playback, subjective listening, or physical-device behavior.

## Publication and rights

Building does not push or deploy. `.openai/hosting.json` points to `build/`; GitHub synchronization alone is not a custom-domain deployment. Original scientific reference/content/media files and the existing HOME media catalog are preserved. The HOME registration JSON is intentionally expanded to three materials. No blanket reuse license is granted. See `RIGHTS.md` and the built rights page. The GitHub mark in the shared support button matches the existing local HOME asset and does not imply endorsement.
