# Attention: evidence and scope clips

Two original Japanese Manim animations, generated in an isolated cloud production directory. Existing application/source/media were not modified. No deployment, user-device operation, model download, package installation, or paid API was used.

- reported-evidence → existing unit `reported-evidence`, existing `reported-evidence` interaction. Table 2 EN-DE values: ConvS2S ensemble 26.36, Transformer base 27.3, Transformer big 28.4. Difference 2.04 BLEU. Explicitly distinguishes ensembles from a single checkpoint-averaged model, and states this is not a controlled architecture-only comparison.
- scope → existing unit `scope`, existing `claim-evidence` interaction. Beats 2–3 correspond to `parallel`, beat 4 to `quality`, beats 5–6 to `limit`. Final beat invites the existing selection exercise.

## Primary evidence

Vaswani et al. (2017), Attention Is All You Need: https://arxiv.org/abs/1706.03762 . Verified full paper via read-only https://arxiv.org/html/1706.03762v7 on 2026-11-06. Table 2 and §6.1 support numbers and averaging the final 20 big-model checkpoints, beam size 4. §3/3.1 support autoregressive generation and masking. §4/Table 1 support within-sequence parallelization, not parallel autoregressive output generation. §6.3 reports English constituency parsing, not all current LLM capabilities. §7 describes future directions rather than general superiority. The statement that the teaching weights do not prove a model's reasoning is a pedagogical scope boundary, not a quoted experimental result.

Original vector/text schematics only; no copyrighted figures reproduced. Table values are attributed factual data. No new translation experiments or trained attention inspection are claimed. EN-FR numbers were intentionally not introduced because this unit compares EN-DE.

## Reproduction

Use an existing licensed Kokoro/Manim environment and set KOKORO_MODEL_DIR as described in the parent README. From source: run make_plan.py, synthesize.py, then python -m manim --silent --disable_caching --media_dir render scenes.py ReportedEvidence Scope, then package_media.py. Manim config.notify_outdated_version=False prevents update checks. Kokoro v1.0 jf_alpha reads existing local model files; ONNX Runtime telemetry is disabled. No dependency installation/download step is supplied.

## Deliverables and checks

The course content/final-unit-videos.json and content/experience.json map accepted assets, unit IDs, duration, resolution and SHA-256. Accepted H.264/AAC MP4s, posters and Japanese VTTs are under the course public/media/ folders, and spoken-only transcripts under content/video-scripts/. Reproduction outputs a local media directory; representative QA images are not part of the source bundle. Source retains narration plans, synthesis and Manim scripts, and per-clip validation. Raw audio, model files, logs and caches are excluded.

The video includes full Japanese passage captions; VTT cues use synthesized passage start/end, not word-level forced alignment. Timing checks verify speech inside each scene and ordered caption bounds. Technical validation includes full AV decode, H.264/AAC 1280×720 24fps, and measured decoded audio per passage. Direct listening, browser playback, and iPhone playback have not been performed. Do not claim those checks. See validation.json for actual frame-review status.

Validation metadata uses repository-root-relative MP4 paths. The `stills` paths are optional extraction outputs relative to this evidence pipeline directory; those intermediate JPGs are not included in the selected source bundle. Measurements and review results are retained unchanged.
