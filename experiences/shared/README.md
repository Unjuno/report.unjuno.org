# Shared learning-page chrome

Attention, ResNet and GAN use the same `site-chrome.mjs` and `site-chrome.css` in this directory. Their `src/shared` files are source adapters, not separate implementations.

- `renderHeader(config)` retains each course's title, context and navigation.
- `renderSponsor(config)` renders the common support area. Each course supplies its own ID, title and description.
- `renderXLink({label})` and `mountXLink(container, config)` also work without a support area. The verified X destination stays fixed. Labels are escaped plain text; repeated instances add no IDs.
- `mountHeader` and `mountSponsor` support existing DOM-based consumers.

A new course imports the canonical module or a source adapter and includes the canonical CSS in its build. The published page must not depend on the source directory layout: Attention embeds this CSS; ResNet emits standalone CSS and JS; GAN emits standalone CSS. Do not copy an adapter into a delivered asset without resolving it.

The support destination remains GitHub Sponsors for Unjuno and the X destination remains `https://x.com/UnJuno_`. No account data is fetched and no third-party script, font or image is added by these components.

Run the repository's `npm test` and `npm run test:attention` after changes. The aggregate check verifies all 15 learning routes, including the single X link and support area on each route, safe destinations, standalone styles, captions and navigation. Real-browser layout, touch and audio checks remain separate.

The support button reuses the monochrome local GitHub mark from `paper-library/dist/assets/github-mark.svg`, also used on HOME. It is decorative; the visible link text carries the accessible name. GitHub is a third-party brand and the mark does not imply GitHub endorses this learning site.
