# Final four Attention unit videos

The two independent source packages produce sequence / encoder-decoder and reported-evidence / scope. Their local synthesis uses existing Kokoro v1.0 jf_alpha model assets. Set KOKORO_MODEL_DIR to a directory containing kokoro-v1.0.onnx, voices-v1.0.bin and kokoro-config.json; supply existing licensed dependencies and Japanese dictionary. The scripts do not download or install anything. Manim version notifications are disabled.

Original diagrams only. Primary source: https://arxiv.org/abs/1706.03762 (v7). Table 1 path lengths, §3 masking/architecture, Table 2/§6.1 reported translation results and §6.3 parsing were checked against the scripts. No full paper or original figure is included. Existing repository rights and Kokoro/Manim dependency licences still apply; no new blanket reuse licence.

Public MP4s, posters and VTTs live under public/media/. The page transcript contains only spoken passages from plan.json, while production outputs may include headings and source notes. Technical and representative-frame checks pass; direct listening, browser and iPhone playback have not been performed. Sentence-level subtitles are not word-aligned. SOURCE_SYNC and content/final-unit-videos.json identify the accepted source and assets.

Intermediate WAVs, rendered caches, logs, full-paper text and model weights are excluded from the source handoff and public output. Reproduction generates those locally. Read each package README for the scene names and order; replace historical environment locations with your existing Manim/TTS environment paths.
