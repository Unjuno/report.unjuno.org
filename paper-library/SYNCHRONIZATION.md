# Production HOME integration

- Source: HOME v106, upstream `7d406b0025056a58c5cccbd7c6b11fdf971c8434`; integration base `e9d09a9cbbc24c442765ccc41a94f942b8dbc8c6`.
- HOME registers Attention, GAN and ResNet through the four-field `content/integrated-materials.json`. All three title/primary links point to `/notes/<slug>/learn/`. No external discovery or pagination runtime ships.
- Learning: 3 long-scroll documents, 23 total units/chapters and 26 existing captioned videos. Old note/course/standalone-chapter routes redirect to these pages or anchors. Original note sources are archived outside Astro routes.
- Root build: exactly 22 HTML outputs (HOME, rights, 3 learning documents, 17 navigation-only redirects). Astro owns HTML; course packages stage only their assets.
- Preserved runtime: 130 registered images, 146 scenes and 50 recorded audio tracks. The obsolete two rejected cues and inactive source-only fixtures remain unshipped. VCSL CC0 attribution and rights assets are staged and validated.
- Shared chrome: canonical header, X `@UnJuno_`, and Unjuno GitHub Sponsors components. Sponsors now uses the same local monochrome GitHub mark as HOME. It is a voluntary creator-support link, not an endorsement.
- Tests: root aggregate, all three course tests, actual built-HOME DOM runtime, route/media/hash parity, 17 redirects, static local links and source portability. Hypothetical empty/15-card fixtures test the editor and are not published materials.
- Limits: deterministic DOM/static checks do not establish real-browser playback/rendering, direct audio listening or real-device/iPhone flicker acceptance. Building and preparing a source manifest do not publish or deploy.

`SOURCE_SYNC.json` records the exact selected source file hashes except itself. `files` paths are relative to paper-library; `root_files` are relative to the repository. Generated root builds, caches, node_modules and scratch artifacts are excluded. Source-only retained fixtures remain available for regression tests but are not staged as public HTML.
