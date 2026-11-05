# report.unjuno.org

## Current HOME source: one-background preview

This repository includes a source snapshot of HOME v97 with one representative background. It does not replace or redeploy the existing site.

[`paper-library/`](paper-library/) contains the current HOME source based on [the public Sites preview](https://report-paper-library-preview.unjuno.chatgpt.site), version 97, source commit `644b2da8e16ee999edf056d25166cc7aabb0669b`.

This is a **one-background preview**, not a complete visual mirror: it bundles only `art-archaeology-table-v2.webp`, alongside three procedural interludes and text SVG icons. The complete 51-scene visual rotation, other image assets, and raster app icons are omitted. The reduced bundle filters scene references before timing/loading and uses only the SVG favicon, so omitted images are not requested by the active page.

```sh
cd paper-library
npm run build
npm test
```

Python 3 and Node.js are required; no npm dependencies are needed for this static bundle. Output is `paper-library/dist/`. Search, paper data and pagination source retain v97 behavior. See [`paper-library/SYNCHRONIZATION.md`](paper-library/SYNCHRONIZATION.md) for scope and verification and [`paper-library/SOURCE_SYNC.json`](paper-library/SOURCE_SYNC.json) for checksums. This source synchronization does not deploy to CORE or replace the existing root Astro site.

## Preserved Astro / CORE site

The existing root Astro source, rights policy, historical files, CORE deployment notes and `.openai/hosting.json` are retained unchanged. Root-level `npm run build` still builds the earlier Astro site into `build/`; it does not build the current paper library. The original documentation follows.

An Astro site for one purpose: explain research papers the author has read in clear, traceable language. Each note separates the paper's claims and evidence from the author's interpretation.

## Pages

- `src/pages/index.astro` — home and paper index
- `src/pages/notes/attention-is-all-you-need/index.astro` — first note: Vaswani et al. (2017)
- `src/pages/rights/index.astro` — copyright and reuse policy
- `src/layouts/SiteLayout.astro` — shared page frame
- `src/styles/global.css` — responsive styles
- `archive/previous-static-home.html` — earlier static draft retained for reference

## Develop

Requires Node.js 22.23.4 or newer.

```sh
npm install
npm run build
```

The static site is generated in `build/`. `.openai/hosting.json` points the existing Sites project to that directory.

## Add a paper note

Create `src/pages/notes/<slug>/index.astro`, use `SiteLayout`, and add a card linking to it from `src/pages/index.astro`. Give the paper's authors, publication, year, and primary-source links. Explain the question, method, evidence, limitations, and interpretation in distinct sections.

## Rights and publication

This is a public GitHub repository without a reuse license. Copyright is reserved; see [RIGHTS.md](RIGHTS.md). The website's footer links to the corresponding policy page.

The custom domain `report.unjuno.org` is deployed on CORE at `domains/report.unjuno.org/public_html`. The site is Astro-generated static HTML/CSS; Astro and Node are not needed at request time. The production pages and stylesheet returned HTTP 200 after deployment. CORE has Node 22.23.4 and npm 10.9.9 under NVM, but an isolated Astro 7.4.4 build on CORE aborted with a core dump, so deployment uses the verified local build output. See the deployment and environment findings in [`reports/2026-11-02-core-shared-hosting.md`](reports/2026-11-02-core-shared-hosting.md).

See [`reports/2026-11-02-core-shared-hosting.md`](reports/2026-11-02-core-shared-hosting.md) for the read-only DNS, HTTPS, SSH, and source comparison results.

