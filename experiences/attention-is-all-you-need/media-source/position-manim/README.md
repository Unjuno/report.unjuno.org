# Positional encoding

48-second Japanese learning unit, rendered with Manim Community 0.19.0 in 1080p/30fps. Native mathematical curves, SVG equations, typography, and synchronized synthetic narration. Japanese captions are burned in; SRT/WebVTT are also provided. Do not enable duplicate caption overlays by default.

## Mathematical scope
The original paper's sinusoidal encoding is shown with d_model=8, matching the local position interaction. The original base model uses 512 dimensions; eight is only an illustrative reduction. For i=0,1,2,3: PE(p,2i)=sin(p/10000^(2i/8)); PE(p,2i+1)=cos(p/10000^(2i/8)). Pair denominators are 1,10,100,1000, with angles in radians. Marker positions and displayed values advance over integer positions 0–40, like the actual slider; continuous curves illustrate the underlying functions.

The film shows positions 0,10,40, then elementwise addition to an equally sized input representation. It does not concatenate vectors, assert unique position recovery, or invent trained embedding values. Symbols x0–x7 represent unspecified input components; the final cells marked 和 represent each corresponding sum with PE(40). All numerical values use full precision internally and are rounded to three decimal places for display.

The validator imports the site's actual positionalEncoding and rendered position output, tests all 41 integer positions, and verifies the four sin/cos pair identities. Endpoints and full output values are recorded in math_validation.json.

## Reproduction
Install Manim Community 0.19.0 with Pango/Cairo and Noto Serif CJK JP, Noto Sans CJK JP, DejaVu Sans, and Noto Serif Display fonts. Run `manim --media_dir media position_video.py PositionEncoding`. The SVG equations are vector math glyphs, not raster screenshots. Mux `narration/narration-ja-48s.wav` with FFmpeg, preserving video, encoding AAC audio, and using faststart. `node validate_math.mjs` requires the sibling experience workspace.

## Reference and narration
Vaswani et al. (2017), Attention Is All You Need, section 3.5: https://arxiv.org/abs/1706.03762 . Synthetic narration uses Kokoro v1.0's built-in Japanese jf_alpha voice (Apache 2.0 model, no individual voice cloning) and kokoro-onnx (MIT). See narration/RIGHTS-AND-SOURCES.md.

This runtime cannot directly listen. Audio decoding, duration, non-silence, clipping, pronunciation-input sequences, and automated ASR are checked separately; do not claim direct listening, word-perfect pronunciation, or subjective voice quality.
