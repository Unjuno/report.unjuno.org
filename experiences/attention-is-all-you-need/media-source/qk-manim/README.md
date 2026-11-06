# Query and Key: a small learning unit

48-second Japanese explanation rendered with Manim Community 0.19.0, 1080p/30fps. The video is a native vector/typographic animation, with synchronized Japanese synthetic narration and burned-in captions. The separate VTT supports accessible players. Do not enable duplicate overlay captions by default when using the burned-in version.

## Mathematical scope
The example is hand-set, two-dimensional, and shows raw dot products before scaling and softmax. Q=[1,1], KA=[2,0], KB=[0,2], KC=[-1,1]. First rotate Q while preserving its norm, then change only length. Dot products depend on direction and length and are not probabilities. Numerical tests use the existing site interaction module.

## Reproduction
Install Manim Community 0.19.0 with Pango/Cairo support and Noto Serif CJK JP, Noto Sans CJK JP, DejaVu Sans, and Noto Serif Display fonts. Run `manim --media_dir media qk_video.py QKMatching`. Mux `narration/narration-ja-48s.wav` with the rendered MP4 using FFmpeg; keep a 48-second timeline, copy video, encode audio as AAC, and use faststart.

## Sources
Vaswani et al. (2017), Attention Is All You Need, §3.2.1: https://arxiv.org/abs/1706.03762
Synthetic narration: Kokoro v1.0, built-in Japanese voice jf_alpha. Model license: Apache 2.0. No user or requested person voice was cloned. Model: https://huggingface.co/hexgrad/Kokoro-82M . Runtime: https://github.com/thewh1teagle/kokoro-onnx (MIT).
