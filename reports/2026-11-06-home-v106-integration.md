# Authored-materials production integration, 2026-11-06

This candidate builds on HOME v106 (7d406b0025056a58c5cccbd7c6b11fdf971c8434) and GitHub main 24c37f1a6f5d17fe69aa5d991493540f7e377e89. It retains 130 registered backgrounds, 146 scenes and 50 active recorded tracks, with the reviewed initial-image and native Arabic-script fixes.

## Current scope

The single editor input is `paper-library/content/integrated-materials.json`. Each item has exactly `title`, `authors`, `summary` and `url`; authors is a nonempty list of names. Slug and compatibility presentation fields are derived internally. The former `content/papers.json` input is removed, and `dist/data/papers.json` is generated output. URL, duplicate, implemented-source and literal-text gates prevent registration from bypassing the authored-material policy.

HOME admits only explicitly registered, authored learning materials with source packages and integrated Astro routes. Attention is the only admitted item. External discovery and pagination are not staged or executed. Local search, IME, clear, empty states and no-JavaScript access preserve this admission rule. Future materials must be explicitly registered after implementation.

The title and primary CTA open the Attention learning route. Eleven units include eight narrated Manim videos with captions, posters and complete transcripts. Four unit videos remain unfinished and labelled. The original article stays at its existing URL; its original source content is preserved exactly apart from two additive navigation/support blocks. Both article routes end with https://github.com/sponsors/Unjuno. HOME's logo uses a native #top target; other-page HOME links retain /.

## Verification and limits

The combined implementation passed four-route build and production checks, exact built-HOME runtime tests, 39 current HOME check commands and 131 Attention tests before the final documentation/hash-ledger refresh. The final release command logs are retained outside this source tree. Verification checks actual local paths and hashes, original article preservation, all learning links, eight video/caption/transcript sets, eleven explanations and the Sponsors recipient. Media AV decode checks were previously passed on unchanged video bytes. No actual browser/iPhone playback, subjective listening, or resolution of reported iPhone compositor flicker is claimed.

ResNet/GAN and expanded audio remain separate candidates. There is no GitHub Actions workflow in this release. GitHub synchronization alone does not publish to CORE or Sites. The current preview must remain unchanged under the latest instruction.
