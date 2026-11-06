# Sequence length and computational complexity

54-second Japanese learning unit rendered using Manim Community 0.19.0 (Cairo), 1920x1080 at 30fps, with Japanese synthetic narration and burned-in captions. SRT and WebVTT are supplied separately. Do not enable an additional subtitle track by default because captions are already burned in.

## What is being compared

Vaswani et al. (2017), Table 1 and section 4 compare the leading per-layer terms O(n²d) for self-attention and O(nd²) for recurrence. Here n is sequence length and d is representation dimension. The animation and matching interaction evaluate the monomials n²d and nd² with coefficient 1. Their ratio is n/d, and their crossing in this simplified comparison is n=d. These are not exact FLOP counts, timings, model evaluation results, or complete model costs.

Projected self-attention also includes O(nd²) projection work. A complete Transformer layer has feed-forward work O(n d d_ff), normalization and other costs. Constants, implementation, parallelism, memory, hardware, and generation strategy affect real execution time. The comparison does not imply that generation becomes parallel, that the full model always outperforms recurrence, or that every implementation materializes an n² memory array. The initial n-by-n graphic illustrates ordered position pairs including the diagonal, not physical memory use.

## Exact interactive states

The `sequence-cost` interaction starts at n=128 and d=512. n accepts 16..1024 in steps of 16; d is selected from 128,256,512,1024. The video follows these five valid states:

| n | d | n² pairs | n²d | nd² | ratio |
|---:|---:|---:|---:|---:|---:|
|128|512|16,384|8,388,608|33,554,432|0.25|
|256|512|65,536|33,554,432|67,108,864|0.5|
|512|512|262,144|134,217,728|134,217,728|1|
|1024|512|1,048,576|536,870,912|268,435,456|2|
|1024|1024|1,048,576|1,073,741,824|1,073,741,824|1|

n animates only through the interaction's integer multiples of16. d changes from512 to1024 in one step, matching its select control. Bar widths are normalized to the larger current term exactly as in the interaction; the scale changes at each state, and this is labeled on screen. Numeric values, not absolute screen width across frames, establish the increase factors.

`node validate_math.mjs` checks all256 allowed states against actual rendered interaction output, all allowed n doublings and d doublings, and the five video states: 2,923 assertions. It requires the sibling experience workspace. `math_validation.json` records the results and limitations.

## Reproduction

Use Manim Community0.19.0 with Pango/Cairo, Noto Serif CJK JP, Noto Sans CJK JP and DejaVu Sans. Run `manim --media_dir media cost_video.py SequenceCost`. Mux `narration/narration-ja-54s.wav` with FFmpeg using copied video, AAC and faststart. The source uses native Manim vectors and typography, not wrapped raster frames.

## References and voice

Vaswani et al., Attention Is All You Need (2017): https://arxiv.org/abs/1706.03762 (Table1, section4). Japanese narration uses the built-in Kokoro v1.0 `jf_alpha` catalog voice, not an individual voice clone. The model is Apache2.0 and kokoro-onnx is MIT; full records are in narration/RIGHTS-AND-SOURCES.md.

Narration cannot be directly listened to in this runtime. Duration, decoding, non-silence, clipping, phoneme input, and local ASR are separate checks. They do not establish subjective voice quality or perfect pronunciation.
