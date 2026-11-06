# ResNet independent learning prototype

Build: `node build.mjs` (no package installation required).
Tests: `npm test`. Use the devDependency happy-dom 20.0.10, or set QK_DOM_MODULE to an already installed module path.

Deliverable root: `public/` (rebuilt by build.mjs; only static HTML, JS/CSS and media). Serve over HTTP with public/ mounted at the exact production prefix documented below. ES modules may not load from file://. Canonical HTML route: `/notes/deep-residual-learning/learn/`. Root Astro serves public/index.html at that route and stages src/ and media/ under `/notes/deep-residual-learning/`. No publication or push performed. Brand links to `/`, for the report.unjuno.org host.

Five chapters: residual + post-add ReLU; projection/shape matching; optimization/depth caveat; basic/bottleneck; original reported evidence and limits. All five have editable controls, synchronized SVG bars, a pre-operation prediction question, post-operation quiz and answer explanation, reset, next navigation. All explanation/answer/source text is static HTML and readable without JavaScript. Controls require JS. No model inference or training runs are represented by the toy demos.

HOME card summary:
「入力をそのまま運ぶ経路と、変化を学ぶ経路を足すResNet。残差接続・形の一致・ボトルネックを動かし、深さによる最適化の改善とその限界を原論文の条件つきで学びます。」

Bibliography: He, Kaiming; Zhang, Xiangyu; Ren, Shaoqing; Sun, Jian. Deep Residual Learning for Image Recognition. arXiv 2015 / CVPR 2016. https://arxiv.org/abs/1512.03385

See reference/SOURCE-CHECK.md for formula and primary-paper provenance. No figure images from the paper are reproduced. Header and local rights explanation refer to the existing `/rights/` policy without assigning a new license. Controls are disabled in static HTML and enabled only after successful initialization. The generated delivery pages state the actual chapter-video completion status.

Verification boundaries: happy-dom assertions do not substitute for real browser layout/playback or screen-reader testing. Direct audio listening not performed. Manim frame checks and audiovisual decode validation are tracked separately in media/verification.json when available.

Media source: media-source/overview.py is real Manim Community code; synthesize.py uses existing free local Kokoro ONNX model assets, not paid APIs. Set KOKORO_MODEL_DIR to your existing licensed model directory. Do not ship the massive model or Python dependencies with the static site. Overview MP4 and WebVTT are the player assets. All five unit videos are supplied by the independent chapter-video phase described below, alongside the original written explanations.

Current video deliverables: `public/media/overview-ja.mp4` (82.29 seconds, 1280×720, 24fps, real Manim + Japanese Kokoro narration), `overview-ja.vtt`, `transcript-ja.txt`, `poster.jpg`, `verification.json`. Full audiovisual decode passes. Two sampled frames reviewed. Subtitle sentence timings are estimated within exact segment boundaries. Browser playback and direct listening remain unverified. See media/chapter-videos.json for all five chapter-video deliverables.

Media rebuild (existing environment): run `python media-source/synthesize.py`; render `media-source/overview.py ResNetOverview` with `python -m manim`. Combine rendered H.264 with narration.wav using ffmpeg AAC and loudnorm; then run media-source/finalize.py and node build.mjs. Dependencies/model weights are reused locally, not included in public/.

## Single-scroll delivery (current)

The one HTML document is `/notes/deep-residual-learning/learn/`, with overview and all five chapters in order. `public/routes.json` lists only that learning route. Assets retain `/notes/deep-residual-learning/src/` and `/media/` URLs. Root Astro provides legacy URL redirects; this package does not generate chapter HTML.

All six videos, caption tracks, spoken transcripts and five independent predictions/labs/quizzes are inline. Chapter navigation uses #residual, #shape, #depth, #blocks and #evidence. Inputs and answers are not persisted. Input/change/reset updates only the relevant lab; initialization renders all labs. No-JavaScript explanations, initial values, answers, references and optional support remain accessible.

Fifteen tests cover calculations, single-page route and source contracts, all five interaction/reset flows, no-JavaScript disabled state, unique IDs, H1 hierarchy, in-page links, media hashes and scoped live-region writes. Browser layout/playback, screen-reader behavior and direct listening remain unverified.

## Independent chapter-video phase

The retained chapter-video assets provide original Manim animations with free local Japanese narration, WebVTT, spoken transcripts, separately labeled screen supplements and actual-video posters to the five inline chapters. `media/chapter-videos.json` is the authoritative completion/verification manifest; `public/media/chapter-videos.json` is its delivery copy. Build-time completion text reflects the produced chapters, rather than retaining an inaccurate unproduced label. The manifest records the current media state.

See `media-source/chapters/README.md` for exact tools, reproducibility, validation scope and exclusions. Actual browser playback and direct listening remain unverified. No change to the overview video is permitted; SHA equality with the baseline is tested.

Reproduction prerequisites: activate an existing Python virtual environment with Manim, Kokoro ONNX and the Japanese frontend/dictionary. Set `KOKORO_MODEL_DIR` to a directory containing `kokoro-v1.0.onnx`, `voices-v1.0.bin` and `kokoro-config.json`. Model weights and dependencies are not bundled; these instructions do not download them.
