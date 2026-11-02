# report.unjuno.org

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
