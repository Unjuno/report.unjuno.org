# GAN learning prototype

Authored learning package. This implementation does not publish, push, or operate the user’s Codex. Root integration registers the course on HOME.

## Build and deliver

- Run `npm run build` in this directory. No package install needed for build.
- Mount **public/** at `/notes/generative-adversarial-nets/`. All assets and course links use this exact root-relative prefix; a server mounting it only at `/` will not resolve those paths.
- Canonical HTML route: `/notes/generative-adversarial-nets/learn/`. Root Astro serves public/index.html there; assets retain the course prefix.
- Header brand intentionally points to `/` on report.unjuno.org. Shared chrome delegates to the canonical `../shared/site-chrome.*` components.
- Last visible block is the shared sponsor component, destination https://github.com/sponsors/Unjuno.
- For local review use a static HTTP server. Double-click/file:// is not supported because the interactions use ES modules. Actual browser layout/playback remains unverified.

## Learning structure

Seven units: roles, minimax objective, optimal discriminator, equality equilibrium/JSD, alternating updates, saturation/non-saturating loss, original evidence and limitations.
Each follows short prose/video → prediction/selection → manipulable state → answer/reasoning → next link. Feedback is inside the initially collapsed post-lab answer, not disclosed on the prediction block. The overview leads into seven inline chapters on one scrollable page, with section links and no forced progression or persistence. Each chapter has its own experiment and chapter reset; the course-wide reset clears all seven. Answers and progress are not stored.
Static HTML retains every explanation, formula, initial example and answer without JavaScript; controls are disabled until initialization succeeds. Overview video is real native Manim with Japanese narration, captions and transcript. All seven chapters now have actual native Manim animations, local Japanese narration, selectable WebVTT captions, full spoken transcripts and real-frame posters. Browser playback and direct listening remain explicitly unverified.

## Mathematical contract

p=(.5,.3,.2), initial q=(.2,.3,.5). All logs natural. Display controls preserve positive normalized probabilities. D*(x) is optimal only for fixed G with equally weighted real/fake terms. At p=q=0, math.optimal returns .5 as an arbitrary display convention, not a uniquely determined probability. objective handles 0 log 0 as 0 and positive mass log 0 as -Infinity. UI avoids these singular endpoints.
Training is a three-category, exact-expectation toy, not image training: q=softmax(b), D=sigmoid(a). D performs gradient ascent on V; G descends E_q[-log D]. This is not a replication of the original latent-input neural network or stochastic minibatches. Saturation comparison differentiates with respect to the fake-sample discriminator logit, not D or the entire generator parameter vector.
The evidence chapter quotes original Table 1 values (MNIST 225±2, TFD 2057±26) as Gaussian-Parzen mean log-likelihood estimates, with standard errors and their different example/fold aggregation conditions. These are quoted original-paper values, not results from this toy. No generated images are presented as experimental outputs.

## Tests

`npm test`: 13 Node tests, covering optimum/JSD identity, normalization, zero mass/boundaries, finite-difference logit gradients, update signs, static DOM/no-JS content/fragment targets, manipulation, training, predictions and both reset flows.
DOM tests use the package devDependency happy-dom 20.0.10, or an existing module at the path set by QK_DOM_MODULE. No runtime website dependency is added.
No actual browser screenshot/interaction check performed. Do not describe DOM tests as browser verification.

## Primary references

Goodfellow, Pouget-Abadie, Mirza, Xu, Warde-Farley, Ozair, Courville and Bengio. Generative Adversarial Nets, NeurIPS 2014. https://arxiv.org/abs/1406.2661
Primary HTML fetched and read: https://arxiv.org/html/1406.2661v1 (reference/paper.html, paper.txt; research only, not bundled in public).
NeurIPS: https://papers.nips.cc/paper_files/paper/2014/hash/f033ed80deb0234979a61f95710dbe25-Abstract.html
§3 Eq 1 / Algorithm 1: minimax, alternating updates, practical non-saturating objective. §4.1 Proposition 1 / Theorem 1 / Eq 6: D*, equality and JSD. §4.2 Proposition 2: idealized convergence assumptions. §5: MNIST, TFD, CIFAR-10 examples, Parzen estimate caveats. §6: density representation, synchronization and diversity.

## HOME card copy

生成器と識別器を競わせるGANの仕組みを、3種類の確率分布を動かしながら学びます。最適な識別器と分布が一致する条件を確かめ、原著の実験と理論の限界を区別します。

## Media

- public/media/gan-overview-poster.jpg (actual video frame at 29 seconds)
- public/media/gan-overview-ja.mp4
- public/media/gan-overview-ja.vtt
- public/media/gan-overview-transcript-ja.txt
- Full sources and reproduction instructions in media-source/README.md.
- Actual Manim 0.19.0, 1280x720, 24fps, ~78 seconds, Japanese Kokoro jf_alpha narration. Local synthesis only.
- Full audiovisual decode succeeded, six representative frames visually inspected, narration non-silence and segment fit checked; see media-source/validation.json.
- Direct listening, browser playback and ASR pronunciation validation NOT done.

## Source integration boundary

Use integration-manifest.json as the source allowlist. Exclude reference/paper.html and reference/paper.txt from any GitHub or other shared source artifact; these full-text research copies are local only. reference/sources.json retains the primary URLs and section mapping. Render caches, local WAV and logs are also excluded from integration. Only public/ is the deployment payload.

## Current single-page route

`/notes/generative-adversarial-nets/learn/` is the sole generated HTML route. `public/routes.json` is derived from that same contract. The overview and all seven chapters are inline, with one H1 and unique section anchors `#chapter-roles`, `#chapter-objective`, `#chapter-optimal`, `#chapter-equilibrium`, `#chapter-training`, `#chapter-saturation`, and `#chapter-evidence`. The root integration redirects legacy course and chapter URLs to these sections. All eight videos retain captions and transcripts; sources, rights and shared X/Sponsors appear once at the end.

Primary-source recheck: `reference/SOURCE-CHECK.md` maps each formula, cited number, uncertainty convention and limitation to the original paper. Full local research copies remain excluded.

## Chapter-video production phase

The chapter media were originally produced for a multipage baseline and are now reused without modification in the long-scroll course. Original content, Table 1 conditions and interactions are preserved. Historical media-source reports describe the production phase, not the current page layout. See media-source/chapters/README.md for reproducible production, public/media/chapter-videos.json for all per-asset hashes/durations/bytes and validation, and chapter-integration-diff.json for the exact baseline-to-candidate changes. The unchanged overview MP4 SHA256 is 6e272e57b59b44b8f38ccdb5d5006e81c43ff2b3a282e796f40942996dd3439f.

Production used only existing free local Manim/Kokoro tools. No installation, hosted TTS, external charge, publish, GitHub action, user computer or user Codex operation occurred.
