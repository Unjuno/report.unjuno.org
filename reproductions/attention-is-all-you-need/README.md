# Attention Is All You Need — Sites v225 reproduction

This directory is an independent static reproduction of the published Attention lesson, kept separate from the repository's older editable lesson and from the rest of report.unjuno.org. It does not deploy GitHub Pages, run the old Astro route, or change main.

- Source URL: https://report-paper-library-preview.unjuno.chatgpt.site/notes/attention-is-all-you-need/learn/
- Sites version: 225; Sites source revision: `fffa0e1c0553530bbe2f11d5b890e58feead2c78`
- Reproduction: `v225/index.html` with its sibling `media/` and `fonts/`.
- Check the exact 104 published files, 80,138,330 bytes in total:

```sh
cd reproductions/attention-is-all-you-need
(cd v225 && sha256sum -c ../SHA256SUMS)
python3 -m http.server 8000 --directory v225
```

Then open http://localhost:8000/ . Lesson visuals, interactions, audio/video, captions, and fonts are bundled once the verification job has committed them. Site-wide navigation and outbound paper links are outside this single-lesson snapshot. This preserves the published rendered result, not the full editable Astro project. The 12-item design review is not part of the published v225 revision.
