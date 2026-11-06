# Causal masking: no future information

54-second Japanese learning unit rendered with Manim Community 0.19.0 in 1080p/30fps, with Japanese synthetic narration and burned-in captions. Separate SRT/WebVTT are supplied. Do not enable duplicate caption overlays by default.

## Scope
This unit concerns the original Decoder's masked self-attention. Inputs [BOS,A,B,C] are aligned with prediction targets [A,B,C,EOS]. At position 2, the current input is B and the target is C, so allowing the diagonal does not reveal the target. The lower-triangular mask permits j<=i and excludes future input positions.

The hand-set score vector [2,2,0,1] is treated as already scaled. No extra sqrt(d_k) division is performed; this matches the local causal-mask interaction. All rows reuse this score vector solely to isolate the effect of the mask. They are not claimed as trained model scores. Future logits are replaced by negative infinity before softmax. The interaction's implementation takes softmax over the allowed prefix, then appends zeros, which is mathematically equivalent.

Exact weight states, displayed to three decimals:
- Position 0, target A: [1,0,0,0].
- Position 1, target B: [0.5,0.5,0,0].
- Position 2, target C: [0.4683105308,0.4683105308,0.0633789383,0].
- Position 3, target EOS: [0.3994863047,0.3994863047,0.0540645922,0.1469627985].

Rounded labels may sum to 0.999; exact weights sum to 1. Future scores have no influence on allowed weights. Training can compute masked rows in parallel from shifted ground-truth inputs. Autoregressive generation still depends on previous outputs. The video does not claim parallel whole-sequence generation.

## Reproduction
Install Manim Community 0.19.0 with Pango/Cairo and the Noto Serif CJK JP, Noto Sans CJK JP, DejaVu Sans, and Noto Serif Display fonts. Run `manim --media_dir media mask_video.py CausalMask`. Mux `narration/narration-ja-54s.wav` with FFmpeg, copying video, encoding AAC, and enabling faststart. Run `node validate_math.mjs` with the original sibling experience workspace to check all four states, masking invariance, and actual interaction output.

## Reference and voice
Vaswani et al. (2017), Attention Is All You Need, sections 3.1 and 3.2.3: https://arxiv.org/abs/1706.03762 . Synthetic voice: Kokoro v1.0 built-in Japanese jf_alpha, Apache 2.0 model, no individual voice cloning. Runtime: kokoro-onnx (MIT). See narration/RIGHTS-AND-SOURCES.md for source and license records.

No direct listening is available in this runtime. Decoding, duration, non-silence, clipping, pronunciation-input sequences, and automated ASR are checked, but do not establish human listening or word-perfect pronunciation.
