# HOME source and regression fixture

This directory contains the optimized HOME v106 mechanism, registered media and tests. Run the root Astro build for production output. Publishing this directory alone does not update the production application.

```sh
npm run build
npm test
npm run test:optimization
npm run test:review
npm run test:recorded-audio
npm run test:paintings
npm run test:quality
```

`content/integrated-materials.json` is the only editable HOME registration file. Each entry has exactly `title` (text), `authors` (one or more display strings), `summary` (text) and `url` (the integrated local learning path). One author label is sufficient; listing every author is optional. See the enclosing README for the full schema, URL normalization and admission contract. The saved Attention entry preserves its existing title, author display and summary. `content/papers.json` has been removed; `dist/data/papers.json` is derived output, never another editor input.

The canonical production article is `../src/pages/notes/attention-is-all-you-need/index.astro`. The builder never creates articles from registration metadata. Root staging excludes all HTML from this directory, so only Astro publishes production article routes.

Production HOME lists only registered entries with an implemented authored-experience package and integrated Astro learning route. All are rendered statically and filtered locally by title, all supplied authors, summary and local URL (plus optional legacy Attention metadata). External discovery and load-more are absent. `dist/assets/feed-pagination.js` remains a historical test fixture only and is not referenced, staged or shipped.

The renderer has 130 registered backgrounds, including 100 generated selections, across 146 scenes. The catalog contains 50 active MP3 tracks. Original image copies and historical runtime files retained for regression tests are not staged for production. The rejected white fern is neither registered nor published.

`test:legacy` and the old one-image `minimal-bundle` test are historical, not production acceptance tests. Active tests provide static, mathematical and mocked-DOM coverage, not real-device frame rates, browser IME verification, visual acceptance or subjective audio review.

See [SOURCE_SYNC.json](SOURCE_SYNC.json) for checksums and [SYNCHRONIZATION.md](SYNCHRONIZATION.md) for integration scope. GitHub publication and CORE deployment are separate actions.

The two superseded 002/069 MP3s remain source-only fixtures. VCSL attribution and the saved CC0 text accompany the active piano replacements. Quality tests use a checksummed v103 catalogue fixture and do not require upstream Git history. Native pixel checks additionally need `@napi-rs/canvas`; these are CPU-rendering checks, not Safari/compositor tests.

`test:legacy-discovery` covers only the unshipped historical pagination runtime. The active test/review aggregates use authored-only admission, source/built linking, complete no-JS listing and local search/empty/clear checks. DOM mocks are not real browser/device verification.

`tests/feed-build.py` runs four-field validation and hypothetical empty/15-card generator fixtures. It executes `tests/material-editor-runtime.cjs` against generated original, edited, empty and multiple lists using the exact production filter in a deterministic DOM mock. This is not evidence of 15 real production materials or browser rendering. The root production build remains one material and four routes.
