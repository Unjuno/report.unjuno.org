# Scores to softmax weights

A 54-second Japanese learning unit rendered with Manim Community 0.19.0, 1080p/30fps. Native vector and typographic animation with Japanese synthetic narration, burned-in captions, and separate SRT/WebVTT. Do not enable duplicate overlay captions by default.

## Scope and exact numbers
The hand-set example matches the local normalize interaction: dot-product scores [2,2,0], Key dimension d_k=2. Divide by sqrt(2), exponentiate, and divide by the sum. Exact calculations yield weights [0.4458082741,0.4458082741,0.1083834518]. Raising A to4 yields [0.7679179361,0.1866937009,0.0453883629]. The no-scaling comparison on [4,2,0] yields [0.8668133322,0.1173104278,0.0158762400]. Restoring scaling and setting [2,2,2] yields one third each.

The three keys do not imply d_k=3: d_k is the Key vector dimension. No-scaling is explicitly a comparison, not the original paper procedure. Weights describe how reference values are mixed; they are not the probability that a statement is correct. All displayed decimals are rounded; calculations use full precision. The interaction implements numerically stable softmax by subtracting the maximum, which is mathematically equivalent to the displayed derivation.

## Reproduction
Install Manim Community 0.19.0 with Pango/Cairo support and Noto Serif CJK JP, Noto Sans CJK JP, DejaVu Sans, and Noto Serif Display fonts. Run `manim --media_dir media softmax_video.py SoftmaxWeights`. Mux the 54-second narration WAV using FFmpeg, copy video, encode audio as AAC, and use faststart. `node validate_math.mjs` tests the actual site math/interaction outputs and requires the sibling experience workspace.

## Reference and voice
Vaswani et al. (2017), Attention Is All You Need, section 3.2.1: https://arxiv.org/abs/1706.03762
Synthetic voice: Kokoro v1.0, catalog Japanese voice jf_alpha. Model Apache 2.0. No individual voice was cloned. Model: https://huggingface.co/hexgrad/Kokoro-82M . Runtime: https://github.com/thewh1teagle/kokoro-onnx (MIT). Full license/source records are in narration/RIGHTS-AND-SOURCES.md.

## Verification boundary
Video frames, numerical consistency, media decoding, narration interval duration and non-silence are checked separately. Local ASR assists content checks but does not prove word-perfect pronunciation. This runtime cannot directly listen to the audio; do not describe the narration as personally listened to or subjectively verified.
