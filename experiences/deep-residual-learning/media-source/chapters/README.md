# ResNet chapter videos: reproducible free local pipeline

These are original Manim Community 0.19.0 Cairo animations, not rendered slide exports or copied original-paper figures. Five scenes cover explicit computations, moving branches, shape changes, channel widths, scalar chain derivatives and original reported experimental values. Source references are continuously visible in each video. Section titles, exact numbers and qualifications are also available in static HTML.

## Inputs and tooling
- `plan.json`: exact pronunciation-script text, explanatory on-screen/caption plan and titles for all five chapters. Narration transcript and actual WebVTT follow `speech`; additional explanatory text is labeled separately in the transcript.
- `scenes.py`: real Manim scenes. No TeX dependency or external media downloads.
- `synthesize.py`: existing local Kokoro v1.0 ONNX model, jf_alpha voice, two CPU threads, telemetry disabled in existing ONNX Runtime 1.20.1. Set KOKORO_MODEL_DIR to an existing licensed model directory.
- `package.py`: ffmpeg mux/loudness normalization, full AV decode, ffprobe, decoded PCM speech interval checks, frame and poster extraction, subtitles, transcripts, manifest. No uploaded audio or network TTS.
- `integrate.mjs`: adds completed video metadata to the independently copied course. `node build.mjs` invokes it after ordinary page generation.

## Rebuild in the provisioned environment
From this copied course root:

1. `OMP_NUM_THREADS=2 OPENBLAS_NUM_THREADS=2 python media-source/chapters/synthesize.py`
2. From `media-source/chapters/`, run `OMP_NUM_THREADS=2 OPENBLAS_NUM_THREADS=2 python -m manim --silent --media_dir render --disable_caching scenes.py ResidualLesson ShapeLesson DepthLesson BlocksLesson EvidenceLesson`.
3. `python media-source/chapters/package.py residual shape depth blocks evidence`
4. Review representative frames and the source/number checks. A fresh package marks visual review pending; do not automatically carry an old human-review verdict to changed media.
5. `node build.mjs`, then `npm test` with existing happy-dom 20.0.10. Dependencies are not included in source control.

No software/model installation, network TTS, spending, publication, repository push, local computer access or user Codex operation was performed.

## Verification boundaries

`media/chapter-videos.json` and its copied public equivalent are the authoritative media index. All asset paths there are site-root-relative under `/notes/deep-residual-learning/`. It contains each file's bytes/SHA-256, duration, codec, audio interval RMS/peak, normalization values, ordered subtitle-range checks, extracted representative-frame list and review state.

WebVTT sentence boundaries are proportional estimates within the exact generated speech interval. They are not forced-aligned and exact word-level sync is not claimed. Numbers/formulas in the separate screen supplement can be more detailed than speech; actual speech remains fully available. Captions follow actual speech with minimal display spelling changes (ReLU, 110). Speech ends before each visual interval ends; the final tail trimmed by `-shortest` contains only silence, not words. Audio is normalized to target -17 LUFS / -1.5 dBTP. No music.

Browser playback and direct listening have not been verified. Do not describe those as passed, nor conflate ffmpeg decode with browser QA. Overview media are copied byte-for-byte from the baseline and must retain their hashes. Raw narration WAVs, decoded WAVs, partial render files and local node_modules are intermediates, not intended for repository integration. Keep plan/scenes/scripts/timing, final media, tests, validation metadata and the selected representative frame proofs.

The original rendering used Manim's default update-notification setting. Reproduction now disables this unnecessary version-check behavior both with `--silent` and `config.notify_outdated_version=False`. Existing final media are not rerendered and retain their verified hashes.

Reproduction prerequisites: activate an existing Python virtual environment with Manim, Kokoro ONNX and the Japanese frontend/dictionary. Set `KOKORO_MODEL_DIR` to a directory containing `kokoro-v1.0.onnx`, `voices-v1.0.bin` and `kokoro-config.json`. Model weights and dependencies are not bundled; these instructions do not download them.
