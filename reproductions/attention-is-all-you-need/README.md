# Attention Is All You Need — Sites v225 reproduction

An independent static reproduction of the published Attention lesson. This does not change the old Astro source, the existing report routing, or the Sites preview. It does not deploy GitHub Pages.

- Published version: Sites v225, source revision `fffa0e1c0553530bbe2f11d5b890e58feead2c78`
- Source URL: https://report-paper-library-preview.unjuno.chatgpt.site/notes/attention-is-all-you-need/learn/
- Reproduction: `v225/index.html` alongside `v225/media/` and `v225/fonts/`.
- Exactly 104 published files and 80,138,330 bytes. The checksum manifest covers the HTML and every bundled asset.

```sh
cd reproductions/attention-is-all-you-need
(cd v225 && sha256sum -c ../SHA256SUMS)
python3 -m http.server 8000 --directory v225
```

Open http://localhost:8000/ . Video, captions, fonts, lesson diagrams, and interaction code are bundled. Only outbound paper links and site-wide navigation go outside the snapshot. The site will not be fetched when replaying this folder. This is the exact published route, not a rebuild of the full editable Astro project. The separate 12-item design review is not part of v225.
