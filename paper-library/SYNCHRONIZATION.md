# Production HOME integration

- Upstream: HOME v106, commit `7d406b0025056a58c5cccbd7c6b11fdf971c8434`.
- Production base: `Unjuno/report.unjuno.org` main `24c37f1a6f5d17fe69aa5d991493540f7e377e89`.
- Scope: the root Astro HOME consumes the full optimized mechanism, all 130 registered images and 50 active audio tracks, replacing the earlier one-background preview.
- Article ownership: the original Attention content is preserved exactly after removing the two approved additive learning-entry and Sponsors blocks. Shared layout and styles remain unchanged. Standalone fixture HTML is excluded from production staging.
- Local metadata: Attention only. The sole editor input is `content/integrated-materials.json`, with exactly `title`, `authors` (one or more display strings), `summary` and `url` (the local learning destination). Slug/ID and compatibility metadata are derived; no second `content/papers.json` edit is needed. Generated `dist/data/papers.json` is output only. The registry admits only authored learning experiences with actual integrated routes and source packages. External Crossref discovery, pagination, and unproduced-paper cards are excluded from the production runtime. Historical fixtures remain source-only.
- Navigation: `/#notes`, `/#papers` and `/#about` remain valid. HOME title and primary CTA open `/notes/attention-is-all-you-need/learn/`. The original article URL remains accessible and links to that learning route. HOME logo targets #top; other pages return to HOME.
- Rights: museum credits and AI-image disclosures are retained; obsolete live-synthesis wording now describes the recorded 50-track bank without granting a new license.
- Source-only extras: original PNGs and historical scripts used by tests remain in this directory but are not published by the root build. The two rejected MP3 cues remain omitted. Superseded 002/069 originals are retained for the quality regression; the active catalogue alone determines production audio.
- Verification: current production is one registered material and four routes. Empty/15-card cases are hypothetical generator fixtures, not additional published materials. Four-field edits, literal text/escaping, URL normalization/duplicates and fail-before-write admission are covered alongside the current authored-only builder, admission rules, built-HOME runtime, local search/IME/clear/empty/no-JS paths, production routes, source preservation, recorded audio and painting suites. Historical discovery tests remain separately labelled and do not certify current production behavior. Browser/device performance and subjective listening require separate acceptance.

`SOURCE_SYNC.json` records SHA-256 hashes of bundled files except itself. Building does not deploy the site.

- v105 refinements: five approved image replacements, two recorded piano replacements with VCSL CC0 attribution, opaque viewport rendering, stable viewport sizing, Canvas context recovery and single-frame scheduling guards.
- Portable regression baseline: `content/audio-baseline-v103.json` is byte-identical to the v103 source catalogue and has an asserted SHA-256 in the quality test.
- Production licence staging: each active track’s `source_license` is staged and checked against the rights page, alongside all audio hashes.
- Source provenance: `source/quality-20261105/` retains original image/audio inputs and numerical reports. Its prototype README describes the earlier pre-integration state, not current deployment status.

- v106 refinements: touch-only compositor mitigation, incremental search updates and reduced text-reveal work. Tests cover synthetic behavior; actual iPhone flicker resolution remains unverified.

- Authored learning delivery: 11 Attention units and eight narrated Manim videos with captions, posters and full transcripts. Four unit videos remain explicitly unfinished. Both the original article and learning page end with the verified Unjuno GitHub Sponsors recipient.
- Later reviewed runtime fixes: reduced-motion initial-image adoption and native Arabic-script title shaping. These do not establish a fix for reported iPhone compositor flicker.
- Additional ResNet/GAN and expanded music candidates are not included. This state is source ready for GitHub synchronization, not proof of deployment.
