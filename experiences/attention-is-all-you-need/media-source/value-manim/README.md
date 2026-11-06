# Mixing Value vectors

48-second Japanese learning unit, rendered with Manim Community 0.19.0 in 1080p/30fps, with synchronized synthetic narration. Burned-in captions and separate SRT/WebVTT are provided. Do not enable duplicate caption overlays by default.

## Exact mathematical setup
Weights are softmax([2,2,0]/sqrt(2)), approximately [0.4458082741,0.4458082741,0.1083834518]. Values A=[1,0], B=[0,1], and initial C=[-1,1]. The weighted sum starts at [0.3374248223,0.5541917259]. Changing only C's first component to 2 yields [0.6625751777,0.5541917259]. Then changing only C's second component to -2 yields [0.6625751777,0.2290413705]. A change of -3 in C's second component produces -3*w_C=-0.3251503554 in the corresponding output component.

Weights are deliberately fixed to isolate Value effects; a real model's input changes can change Q, K, and V together. Values are hand-set toy vectors, not learned model outputs. All calculations use full precision. Contribution labels use four decimals; dynamic outputs use three to match the interaction. The numerical validator imports the actual site math and output functions and checks both endpoints and the full 0.1-step trajectories.

## Reproduction
Install Manim Community 0.19.0 with Pango/Cairo and Noto Serif CJK JP, Noto Sans CJK JP, DejaVu Sans, and Noto Serif Display fonts. Run `manim --media_dir media value_video.py ValueMixing`. Mux `narration/narration-ja-48s.wav` using FFmpeg, copying video, encoding AAC audio, and enabling faststart. Run `node validate_math.mjs` alongside the original experience workspace.

## Reference and audio
Vaswani et al. (2017), Attention Is All You Need, section 3.2.1: https://arxiv.org/abs/1706.03762 . Synthetic voice: Kokoro v1.0, built-in jf_alpha, Apache 2.0 model, no individual voice cloning. Runtime: kokoro-onnx (MIT). See narration/RIGHTS-AND-SOURCES.md for source and license records.

Media decoding, numerical matching, interval duration, non-silence, and automated ASR are checked. This runtime cannot directly listen; do not claim human/subjective listening or word-perfect pronunciation.
