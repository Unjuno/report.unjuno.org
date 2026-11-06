# Primary-source check for the final four videos

Reference: Vaswani et al. (2017), Attention Is All You Need, arXiv:1706.03762v7. https://arxiv.org/html/1706.03762v7

- Sequence: six/twelve positions imply five/eleven adjacent connections and one direct connection. Table 1 O(n)/O(1) describes maximum path length, not elapsed seconds or one-shot autoregressive generation.
- Encoder/decoder: §3.1 and §3.2.3 support shifted teacher-forcing inputs, the causal mask j≤i, parallel training position calculations, autoregressive generation, decoder-side Query and encoder-output Key/Value. A/B/C are invented teaching tokens, not translated predictions.
- Reported evidence: Table 2 WMT 2014 EN–DE values ConvS2S ensemble 26.36, Transformer base 27.3 and big 28.4 yield a 2.04 BLEU difference. These are not a controlled attention-only ablation. §6.1 describes the big model's last-20 checkpoint averaging and beam size 4. This page does not run a reproduction experiment.
- Scope: §6.3 also evaluates English constituency parsing; no claim of universal superiority or modern-LLM performance follows. Illustrative weights do not establish actual model decision explanations.

The script/source checks and representative rendered frames passed. Direct listening, actual browser playback and iPhone behavior remain unverified. No original-paper full text or copied figures is bundled.
