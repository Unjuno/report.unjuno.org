# Attention: sequence and encoder–decoder clips

Two independent, Japanese-narrated Manim lessons. Each is 68 seconds, 1280×720 at 24 fps, H.264/AAC. Cream/blue/clay styling follows the existing Attention teaching videos. All diagrams are newly drawn vectors; no original figure copied.

## Files and integration
- Course `content/experience.json` and `content/final-unit-videos.json` map each unit ID to the accepted MP4, poster, VTT and spoken-only transcript, with durations and hashes.
- `plan.json` contains four narrated scenes per unit with source sections and timing windows.
- `scenes.py`, `make_plan.py`, `synthesize.py`, `finalize.py` reproduce the outputs.
- `math-validation.json` records independently asserted path counts, shifted targets, causal mask and step 0/1/3 generation inputs.
- `checks/` contains stream probes, decoded-audio checks and representative-frame review records. The locally inspected frame images and decoded WAVs are not bundled.

This package reproduces only these two clips. The course integration separately registers their active assets and playback tests; previous video assets are unchanged.

## Sources and scope
Vaswani et al., Attention Is All You Need (2017), https://arxiv.org/abs/1706.03762, §§1, 3.1, 3.2.3, 4 and Table 1. Consistent with the existing original-paper-backed lessons.mjs, labs.mjs and unit manifest in the read-only Attention reference candidate.

Sequence uses n=6 then n=12: 5 then 11 adjacent connections, versus one direct connection. O(n) and O(1) describe maximum path-length scaling, not seconds. Encoder–decoder shows source representations, cross-attention Q/K/V origins, shifted teacher-forcing inputs, lower-triangular causal attention and autoregressive generation. A/B/C are teaching symbols, not actual translated predictions. Full residual/FFN/normalization stacks are intentionally omitted from the schematic.

## Local reproduction, no install/download
`OMP_NUM_THREADS=2 OPENBLAS_NUM_THREADS=2 python -m manim --silent --disable_caching -r 1280,720 --fps 24 --media_dir render scenes.py Sequence EncoderDecoder`

Run `python synthesize.py`, then `python finalize.py`. Existing local Kokoro jf_alpha, speed 1.05, 24 kHz mono; model files are supplied through KOKORO_MODEL_DIR. Model/source licensing references are available there. No model download, software install, paid API, external write or deployment performed. Manim version notification disabled.

Japanese captions are burned in and also provided as VTT; do not enable both displays at once. Sentence timings are proportional estimates within measured synthesized segments, not word-aligned. Technical decoding and non-silence checks do not constitute direct listening, browser testing or iPhone playback validation.

Reproduction prerequisites: activate an existing Python virtual environment with Manim, Kokoro ONNX and the Japanese frontend/dictionary. Set `KOKORO_MODEL_DIR` to a directory containing `kokoro-v1.0.onnx`, `voices-v1.0.bin` and `kokoro-config.json`. Model weights and dependencies are not bundled; these instructions do not download them.
