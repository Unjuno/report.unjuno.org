# Multi-head attention

54-second Japanese learning unit rendered with Manim Community 0.19.0 in 1080p/30fps. Native vector and typography animation, Japanese synthetic narration, burned-in captions, plus separate SRT/WebVTT. Do not enable duplicate caption overlays by default.

## Exact interactive example
K=[[2,0],[0,2],[-1,1]], V=[[1,0],[0,1],[-1,1]]. Head 1 uses q=[x,y]; Head 2 uses [y,x]. Query projection matrices are I2 and [[0,1],[1,0]]. Both heads use the same fixed K and V, equivalently identity K/V projections for this example. Each head computes softmax(qK^T/sqrt(2))V.

Outputs are concatenated as [h1_x,h1_y,h2_x,h2_y]. The fixed output matrix is [[0.5,0],[0,0.5],[0.5,0],[0,0.5]], giving the mean of corresponding head components. This mean is an illustrative output projection, not the general definition of multi-head attention.

At q=[1,1], both heads yield [0.3374248223,0.5541917259]. At q=[2,0], outputs are [0.9181677163,0.0684462323] and [-0.1413053380,0.9546116371], concatenation has four components, and final output is [0.3884311892,0.5115289347]. q=[0,2] exchanges the heads and leaves this particular mean unchanged. These facts are checked against the actual toyHeads and rendered multi-head interaction, with 201 assertions including 25 swap-symmetry cases.

## Scope
These are fixed hand-set projections, not learned model results. Actual Transformers learn distinct Q/K/V projections per head and an output projection. No grammatical or other semantic role is assigned in advance. No performance gain is demonstrated by this toy.

Each example head has two Query/Key and two Value dimensions; concatenation has four and the output has two. This is a small algebraic illustration, not the original cost-balanced dimensions: the paper's base model uses eight heads with 64 dimensions per head and 512 model dimensions. Shared fixed K/V and symmetric averaging are special simplifications here. All values are computed at full precision; labels are rounded.

## Reproduction
Install Manim Community 0.19.0 with Pango/Cairo and Noto Serif CJK JP, Noto Sans CJK JP, DejaVu Sans, and Noto Serif Display fonts. Run `manim --media_dir media multihead_video.py MultiHeadAttention`. Mux `narration/narration-ja-54s.wav` using FFmpeg, copying video, encoding AAC, and enabling faststart. `node validate_math.mjs` requires the original sibling experience workspace.

## Reference and voice
Vaswani et al. (2017), Attention Is All You Need, section 3.2.2: https://arxiv.org/abs/1706.03762 . Synthetic narration uses Kokoro v1.0 built-in Japanese jf_alpha (Apache 2.0 model), with no individual voice cloning, via kokoro-onnx (MIT). Full source and license records are in narration/RIGHTS-AND-SOURCES.md.

Audio is not directly listened to in this runtime. Decoding, duration, non-silence, clipping, pronunciation-input sequences and local ASR are verified separately; do not claim human listening or perfect pronunciation.
