# Primary-source audit

Author: Kaiming He, Xiangyu Zhang, Shaoqing Ren, Jian Sun.
Title: Deep Residual Learning for Image Recognition.
arXiv:1512.03385 (December 2015); CVPR 2016 pp. 770–778.
https://arxiv.org/abs/1512.03385
https://www.cv-foundation.org/openaccess/content_cvpr_2016/html/He_Deep_Residual_Learning_CVPR_2016_paper.html

Primary paper in-body passages retrieved on 2026-11-06 via Firecrawl paper reader (arxiv:1512.03385); metadata and abstract checked against CVF and arXiv via Exa fetch. This is a human-readable audit of checked claims, not a copy of the paper.

- §3.1 F(x):=H(x)−x; same-dimensional mapping reformulation, not a loss or prediction error.
- §3.2 Eq(1) y=F(x,{Wi})+x; second nonlinearity applied after addition. Arbitrary negative x is not preserved by post-addition ReLU even when F=0.
- §3.2 Eq(2) y=F(x,{Wi})+Ws x, projection to match dimensions.
- §3.3 option A zero-padding for increased channels; option B 1×1 projection. Across spatial sizes both use stride 2. Identity introduces no learned parameters; projection does.
- §4.1 Fig5 basic 3×3,3×3 and bottleneck 1×1,3×3,1×1. Fig5 basic width64 and bottleneck 256→64→64→256 have similar complexity. Our C→C vs C→C/4→C/4→C comparison intentionally fixes equal external widths; not a reproduction of Fig5 numbers.
- §4.1 Table2 ImageNet validation, 10-crop, top-1 error: plain18 27.94%; plain34 28.54%; residual18 27.88%; residual34 25.03%. Differences on site are percentage points, not relative percent.
- §4.1 Table4 single-model ResNet152 top-5 validation 4.49% with best-results testing protocol; Table5 six-model ensemble test top-5 3.57%. Do not label 3.57% single-model or validation.
- §4.1 notes that plain nets with BN show healthy signal/gradient norms; degradation not equated with simple vanishing gradients.
- §4.2 Table6 CIFAR10 ResNet110: best 6.43%, five-run mean±std 6.61±0.16%; ResNet1202 7.93%. §4.2 reports very low training error and discusses overfitting; depth is not a universal generalization guarantee.

Toy checks: x2 + F−3 = −1, ReLU=0; projection weights64×128=8192 excluding BN/bias; basic parameters 18C²; bottleneck 2Cb+9b²; C256,b64 → 1,179,648 vs69,632. Scalar chain derivatives a^n and (1+a)^n refer to two different toy mappings, not matched-trained networks and not evidence about benchmark accuracy.

Multi-page recheck: each unit carries its section/table reference and a direct primary-paper URL. The evidence unit retains ImageNet Table2 10-crop/validation/top-1, Table4 single-model/validation/top-5 4.49%, Table5 six-model/test/top-5 3.57%, and CIFAR-10 Table6 110-layer best vs five-run mean±std vs 1202-layer result. Splitting pages changes neither claims nor toy calculations. Original-paper full text is not included in public/.
