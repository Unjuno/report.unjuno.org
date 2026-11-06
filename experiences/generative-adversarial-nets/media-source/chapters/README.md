# GAN chapter videos: editable sources and validation

Seven native Manim Community 0.19.0 / Cairo animations. 1280×720, 24fps, H.264/AAC. roles/objective/optimal/equilibrium/training/saturation are 56 seconds each; evidence is 68 seconds. All diagram geometry is original Manim vector content. No paper images or trained image samples are reproduced. Original Table 1 values in evidence are explicitly attributed, unlike the three-bin educational examples.

## Reproduce with existing local tools

Run from the repository root with an existing Python virtual environment containing the required packages activated. Set KOKORO_MODEL_DIR to existing licensed model assets. No model downloads are performed by these commands.

```
python experiences/generative-adversarial-nets/media-source/chapters/make_plan.py
OMP_NUM_THREADS=2 OPENBLAS_NUM_THREADS=1 python experiences/generative-adversarial-nets/media-source/chapters/synthesize.py
OMP_NUM_THREADS=2 OPENBLAS_NUM_THREADS=1 python -m manim --silent --media_dir experiences/generative-adversarial-nets/media-source/chapters/render experiences/generative-adversarial-nets/media-source/chapters/scenes.py Roles Objective Optimal Equilibrium Training Saturation Evidence
OMP_NUM_THREADS=2 OPENBLAS_NUM_THREADS=1 python experiences/generative-adversarial-nets/media-source/chapters/package_media.py
OMP_NUM_THREADS=2 OPENBLAS_NUM_THREADS=1 python experiences/generative-adversarial-nets/media-source/chapters/check_math.py
```

`make_plan.py` is the editable narration/scene plan. `synthesize.py` reuses cached per-passage WAV files; remove only the affected local WAV when changing speech. `scenes.py` contains all geometry and exact toy calculations. `package_media.py` creates final media, captions/transcript references, frame stills, AV inspections and the delivery manifest. After changing graphics, inspect the four extracted frames per chapter and record the actual review in the manifest; automated packaging intentionally leaves visual review pending.

The narration model path in synthesize.py comes from required KOKORO_MODEL_DIR, read-only. Local ONNX Runtime 1.20.1 telemetry is disabled. CPU thread counts are capped. `--silent` and config.notify_outdated_version=False disable Manim’s default post-render PyPI version-check request. Kokoro v1.0 jf_alpha is synthetic speech, not a cloned individual voice. Existing model/runtime license attribution is in ../README.md and ../Kokoro-Apache-2.0.txt.

## Distribution

- `public/media/chapter-videos.json`: source sections, per-video duration/bytes/SHA256, hashes for all four assets, and validation scope.
- `public/media/chapters/<id>.mp4`
- `public/media/chapters/<id>.poster.jpg` (actual frame from beat 3)
- `public/media/chapters/<id>.ja.vtt`
- `public/media/chapters/<id>.transcript.ja.txt`

The website builder reads this manifest and places each chapter's player before prediction/manipulation/answer. The overview video is not rebuilt or replaced.

## Caption and audio contract

Speech, VTT and transcript use the same text, without extra mathematical assertions or omitted spoken sentences. Japanese phonetic spellings are preserved. Captions contain at most two lines of 30 characters; their sentence boundaries are proportional estimates inside each synthesized passage, not word-level forced alignment. All cue bounds/order and concatenated text are checked. Captions are selectable WebVTT, not burned-in text. Normal deliberate pauses occur between narration passages; the soundtrack contains no music.

Validation includes full audiovisual decode, ffprobe codec/size/duration, non-silent decoded AAC over every narration interval, narration fitting its scene, four final-state representative frames per video, and numeric/math assertions. Direct listening, ASR pronunciation checking, and real browser playback have not been performed. DOM checks are not browser verification.

## Source/mathematics mapping

- roles: original §3. Noise → G → sample, with real samples also entering D. Equal mixture is stated.
- objective: §3 Eq (1). D maximizes V, G minimizes V; real term independent of G when D fixed. For A, f(d)=.5 log d+.2 log(1−d), f′(.5)=.6 and d*=5/7.
- optimal: §4.1 Proposition 1, fixed G and equal priors. D*=p/(p+q); zero/zero points arbitrary. Initial values 5/7,1/2,2/7.
- equilibrium: §4.1 Theorem 1 / Eq (6), §4.2 Proposition 2. C=−log4+2JSD. Equal distributions under optimal D distinguished from untrained D≡.5. Sufficient capacity, optimal D at each stage, sufficiently small improving distribution updates are explicit, not a finite-network guarantee.
- training: Algorithm 1 and §6. Original k=1; toy uses exact expectations, q=softmax(b), D=σ(a), learning rate .5, non-saturating generator updates. No claim to replicate the latent-input neural network. Frozen-D example uses D=(.8,.5,.2) and 100 G updates, demonstrating concentration without claiming all dynamics converge.
- saturation: §3 alternative objective. Both displayed losses are minimized. ∂L_MM/∂a=−D and ∂L_NS/∂a=D−1 for D=σ(a); the rest of the generator chain rule is shown separately.
- evidence: §5 Table 1, §6. Quoted adversarial-net means 225±2 (real-valued MNIST, standard error over test examples) and 2057±26 (TFD, standard error across folds). Gaussian Parzen-window estimated mean log-likelihood with validation-selected bandwidth. Independent dataset scales are not compared. High variance/high-dimensional weakness and no superiority claim are explicit.

Primary source: https://arxiv.org/abs/1406.2661 ; section-level recheck retained in ../../reference/SOURCE-CHECK.md. No full-text copy is added to distribution.

Reproduction prerequisites: activate an existing Python virtual environment with Manim, Kokoro ONNX and the Japanese frontend/dictionary. Set `KOKORO_MODEL_DIR` to a directory containing `kokoro-v1.0.onnx`, `voices-v1.0.bin` and `kokoro-config.json`. Model weights and dependencies are not bundled; these instructions do not download them.
