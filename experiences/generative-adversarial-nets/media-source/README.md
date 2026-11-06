# GAN overview media

78-second educational overview of Goodfellow et al., Generative Adversarial Nets (2014), https://arxiv.org/abs/1406.2661 . Native Manim Community 0.19.0 objects, Cairo renderer. All diagrams newly authored; no original-paper figures copied. Three-bin example is illustrative, not trained-model output.

## Reproduce

From the repository root, with an existing Python virtual environment activated:

```
python experiences/generative-adversarial-nets/media-source/narrate.py
python -m manim --media_dir experiences/generative-adversarial-nets/media-source/render --disable_caching experiences/generative-adversarial-nets/media-source/overview.py GANOverview
ffmpeg -y -i experiences/generative-adversarial-nets/media-source/render/videos/overview/720p24/GANOverview.mp4 -i experiences/generative-adversarial-nets/media-source/narration.wav -c:v copy -c:a aac -b:a 128k -movflags +faststart -shortest experiences/generative-adversarial-nets/public/media/gan-overview-ja.mp4
```

Existing installed packages/models are reused read-only; no paid APIs, cloned voices, user Codex actions or external uploads. `narrate.py` requires KOKORO_MODEL_DIR and does not download models.

Speech is synthetic: Kokoro v1.0 / jf_alpha, local ONNX Runtime 1.20.1 with telemetry disabled. Model: https://huggingface.co/hexgrad/Kokoro-82M (Apache 2.0; license included). Runtime: https://github.com/thewh1teagle/kokoro-onnx (MIT). Japanese frontend: https://github.com/hexgrad/misaki (Apache 2.0), UniDic-lite dictionary. Voice catalog: https://huggingface.co/hexgrad/Kokoro-82M/blob/main/VOICES.md . Dependencies and model weights are not bundled with distribution media.

`gan-overview-ja.vtt` contains selectable Japanese captions; full spoken transcript is `gan-overview-transcript-ja.txt`. In-frame explanatory text is complementary to, not a replacement for, captions. Browser playback and direct listening require separate verification and are not claimed.

Reproduction prerequisites: activate an existing Python virtual environment with Manim, Kokoro ONNX and the Japanese frontend/dictionary. Set `KOKORO_MODEL_DIR` to a directory containing `kokoro-v1.0.onnx`, `voices-v1.0.bin` and `kokoro-config.json`. Model weights and dependencies are not bundled; these instructions do not download them.
