# report.unjuno.org

The root Astro site builds HOME, the existing Attention article, its separately authored learning experience and the rights page. HOME lists only explicitly registered learning materials already integrated into this app. The Attention experience remains work in progress, including unfinished chapter videos; HOME makes no completion claim.

## Source ownership

- `paper-library/`: optimized HOME v106 source, runtime assets, 130 registered backgrounds, 50-track audio catalog and tests. Upstream commit: `7d406b0025056a58c5cccbd7c6b11fdf971c8434`, followed by the documented production-only changes.
- `src/pages/index.astro`: renders HOME at the root route.
- `src/pages/notes/attention-is-all-you-need/index.astro`: canonical authored article, with its original content preserved.
- `src/pages/rights/index.astro`: production policy with museum credits, AI-image disclosures and the current recorded-piano attribution and saved VCSL CC0 licence.
- `scripts/prepare-home.py`: builds HOME and stages only active public assets, never preview HTML routes.
- `scripts/verify-production.py`: verifies source preservation, route ownership, metadata, media and navigation.

## Edit the HOME material list

Edit only `paper-library/content/integrated-materials.json`. It is a JSON array whose entries have **exactly four fields**:

```json
[
  {
    "title": "Attention Is All You Need",
    "authors": ["Ashish Vaswani et al."],
    "summary": "Transformerの仕組みを学ぶ教材です。",
    "url": "/notes/attention-is-all-you-need/learn/"
  }
]
```

This example shows the input format, not a replacement for the saved Attention text. `title` and `summary` are nonempty strings. `authors` is a nonempty array of nonempty display-name strings; you may provide one display label or several names. Listing every author is not required. Outer whitespace is removed from each string. When several names are supplied, the collapsed author label shows the first name plus `et al.` and the expanded details show all supplied names in order. The current Attention entry retains its existing eight-author detail and short label. No old author or summary value can override an edit.

`url` is the **local learning destination**, not the external paper URL. Accepted paths have the form `/notes/<slug>/learn/`, where the route segment uses lowercase ASCII letters and digits separated by single hyphens. A missing final slash is added; outer whitespace is removed. External URLs (including this site's absolute URL), schemes, protocol-relative URLs, query strings, fragments, encodings, backslashes, repeated separators and dot/traversal segments are rejected. Duplicate destinations are rejected after normalization. Titles or author labels may repeat for distinct integrated destinations. An empty array is valid and produces an honest empty state.

The builder derives its stable card ID from the validated URL. You do not supply an ID, slug, year, category, tags, DOI or preservation flag. `content/papers.json` is no longer an input. `dist/data/papers.json` is generated compatibility output and must not be edited; it is rebuilt entirely from the four-field input and admitted source. Its `url` is the local learning route. `authors_full` and `summary_ja` are derived from the input on every build. Existing Attention-only year/category/tags/DOI/visual facts remain optional presentation defaults in `material_policy.py`; new materials need no such values and receive no invented year, keywords or DOI. The external arXiv reference remains in the unchanged authored experience and article, and is exposed as `primary_paper_url` in generated metadata.

HOME currently registers **one** material, Attention at `/notes/attention-is-all-you-need/learn/`; the title and primary CTA both go there. The older article URL remains accessible. `material_policy.py` rejects malformed entries, absent or placeholder routes and absent authored-experience source packages before writing HOME. Register a future material only after implementing its authored package and integrating its Astro wrapper. The current wrapper contract imports that package's `build-production/index.html` as raw HTML and renders it directly; the package identity must match the URL, contain authored units, a builder and lesson source. Other architectures require an intentional validator change. Production verification also checks the actual built route against the authored output. Registration and structural checks do not certify pedagogical completeness. Adding a JSON entry does not create a lesson, route, media or build integration.

Every admitted item is rendered in initial HTML. Search filters only those cards; no-match and zero-material states are local, and clear restores the same list. There is no load-more control, metadata fetch, or external discovery request. Backgrounds and audio still load local assets. `prepare-home.py` excludes the historical external-pagination runtime from staging and the final build. No JavaScript is required to reach all listed materials.

## Build and verify

Requires Python 3 and Node.js 22.23.4 or newer.

```sh
npm ci
npm run build
npm test
npm run test:media
```

The root build generates HOME, stages active files into ignored `.home-public/`, then builds all four Astro routes into ignored `build/`. It rejects missing media, extra article routes and broken internal links. `paper-library/dist/` also contains standalone test fixtures and historical files; only active runtime assets and the HOME document enter production. Astro exclusively owns article and rights routes.

## Publication

Building does not publish or deploy. `.openai/hosting.json` still points to `build/`. The custom domain is hosted separately on CORE; a GitHub update is not a CORE deployment.

See [the integration report](reports/2026-11-05-home-production-integration.md), [CORE hosting history](reports/2026-11-02-core-shared-hosting.md) and [RIGHTS.md](RIGHTS.md). No blanket reuse license is granted.

The v105 quality tests run within `npm test`. Optional `npm run test:pixels` requires `@napi-rs/canvas` available to Node and checks native CPU rendering/restoration, not browser or device behavior.

## Current and historical checks

`npm test` runs the current authored-only builder/admission, actual HOME-script runtime, local filter, media and optimization checks. `scripts/check-home-materials.py --built` verifies built cards, learning links, output provenance and staged runtime exclusions. The empty/15-card cases in `paper-library/tests/feed-build.py` are hypothetical generator fixtures, not 15 real or published materials. Current production verification remains one Attention material and exactly four routes. The editor fixtures check invalid fields/URLs/duplicates, rejection before writes, edited display/search values, escaping, empty/multiple lists and clear behavior. The runtime fixtures intercept all network sinks and exercise startup/search/IME/clear/scroll/manual/recovery paths; they are deterministic DOM mocks, not browser or device certification.

`paper-library` retains `test:legacy-discovery` solely for the unshipped historical Crossref runtime. Its pagination, scrolling and random sponsor insertion assertions are not current production behavior and are excluded from the active review aggregate. Old optional pagination-specific review fixtures similarly do not certify this production policy. Active no-external-search and feed-build tests were replaced with authored-only policy expectations rather than silently passing the old discovery assumptions.
