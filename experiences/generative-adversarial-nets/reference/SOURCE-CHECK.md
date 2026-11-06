# Primary-source audit

Original: Goodfellow et al. (2014), Generative Adversarial Nets.
https://arxiv.org/abs/1406.2661
https://arxiv.org/html/1406.2661v1
https://papers.nips.cc/paper_files/paper/2014/hash/f033ed80deb0234979a61f95710dbe25-Abstract.html

Primary HTML was retrieved and read on 2026-11-06. Full-paper research copies are not distributed. This file is an original summary of verified claims.

- Section 3, Equation 1: D maximizes equally weighted expectations of log D(real) + log(1−D(fake)); G minimizes the latter. Natural logarithms are used in the learning examples.
- Algorithm 1: k discriminator steps per generator step. The original experiments used k=1. The toy directly optimizes a discrete softmax q and sigmoid D, not the original latent-input neural net or minibatches.
- Section 3: when D rejects early generated samples, log(1−D(G(z))) saturates; maximize log D(G(z)) as the practical alternative. The displayed derivatives −D and D−1 are with respect to discriminator logit a, not D itself or every generator parameter. Finite-difference tests verify these identities.
- Section 4.1 Proposition 1: D*=p_data/(p_data+p_g), fixed G, equal weighting. At zero total mass there is no unique optimum; display convention is 0.5. All interactive masses stay positive.
- Section 4.1 Theorem 1 and Equation 6: C(G)=−log 4+2 JSD, unique global minimum at equal distributions. A constant untrained D=0.5 alone does not establish equality.
- Section 4.2 Proposition 2 and proof: sufficient capacity; D reaches its optimum at each stage; improve the distribution-level criterion using sufficiently small updates. Practical parameter optimization is different and nonconvex. The website does not claim guaranteed finite-network convergence.
- Section 5: samples on MNIST, Toronto Face Database and CIFAR-10. Table 1 evaluates MNIST and TFD with Gaussian Parzen windows fit to generated samples; kernel bandwidth is selected on validation data. It is not exact generator likelihood or FID.
- Table 1: Adversarial nets MNIST 225±2; TFD 2057±26. MNIST uses real-valued rather than binary data, mean test-example log likelihood and standard error across examples. TFD uses fold means and standard error across folds, separately cross-validating bandwidth for each fold. The two numbers are not comparable across datasets and the ± terms are not standard deviations or confidence intervals.
- Section 5 explicitly cautions that Parzen estimation has high variance and performs poorly in high dimensions. Authors do not claim samples are superior to existing methods.
- Section 6: implicit density, synchronization of D/G and possible many-z-to-same-x diversity collapse when G is advanced too much without updating D.

Toy p=(0.5,0.3,0.2), q=(0.2,0.3,0.5) and all interactive charts are authored examples, not paper benchmark outputs. D*=(5/7,1/2,2/7); at p=q, C=−log4≈−1.386294. Positive and zero-mass boundary tests, JSD identity, finite differences, and update directions are checked automatically.
