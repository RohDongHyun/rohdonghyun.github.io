---
title: Markov Chain Monte-Carlo
author: rdh
date: 2024-02-07 11:33:00 +0800
categories: [01. Statistics, 01. Introduction to Statistics]
tags: [approximate Bayesian, MCMC, statistics]
math: true
---
## Approximate Bayesian Method
Bayesian inference is performing inference on a parameter using the posterior probability $\pi(\theta\mid X)$, which is derived from a model for the data distribution (likelihood, $L(\theta\mid X)$) and a prior distribution for the model parameters ($\pi(\theta)$).

However, when the likelihood is complex or when the data is very large, calculating the posterior probability becomes difficult.

As a result, several **approximate Bayesian methods** have been proposed to address these challenges.

## Markov Chain Monte Carlo (MCMC)
**Markov chain Monte Carlo (MCMC)** is a type of approximate Bayesian methods, which proceeds as follows:

1. Instead of directly calculating the posterior distribution, we construct a Markov chain that has the desired posterior distribution as its asymptotic distribution.
2. We run the chain for a sufficient number of steps, allowing it to converge to the posterior distribution, from which we can then extract samples.
3. These samples can be considered samples from the posterior distribution, which can then be used for inference.

Depending on the form of the posterior distribution, **Gibbs sampling** or **Metropolis-Hastings sampling** can be used.

> MCMC methods can be slow to compute, especially dealing with complex models or large datasets.
{: .prompt-info}

### Markov Chain

Let $X_t$ be a state vector at time $t$ with distribution $\pi_t(\cdot)$. The **Markov property** states that the next state $X_{t+1}$ depends only on the current state $X_{t}$ and is independent of past states. In other words, the future and past states are independent given the current state.

$$
P(X_{n+1} = x \mid X_n = x_n, \cdots, X_1 = x_1) = P(X_{n+1} = x \mid X_n = x_n).
$$

> Markov property is also referred to as the memorylessness.
{: .prompt-info}

A **Markov chain** is a mathematical system where a sequence of random variables $X_1, X_2, \cdots$ represent states transitioning between a set of possible states. Each state transitions to the next stated based on a probability distribution known as the **transition probability**. This transition probability can be represented as a matrix or a function, referred to as the transition matrix or function.

By applying the transition probabilities repeatedly, the system's state distribution will eventually reach a condition where the probability distribution of the state at time $t$ is the same as the probability distribution at $t-1$. This equilibrium distribution is known as the **stationary distribution** or **limiting distribution**, and it does not depend on the initial state.

### Procedure of MCMC
1. Generate a Markov chain $X_0, \cdots, X_t$ with an asymptotic distribution $\pi(x)$.
2. Increase $t$ sufficiently to ensure that $X_t$ is close enough to following $\pi(x)$, and from that point onward, store $X_{t+1}, \cdots, X_{t+m}$.
3. Treat $X_{t+1}, \cdots, X_{t+m}$ as samples from $\pi(x)$.

> The process of increasing $t$ sufficiently to eliminate the influence of the initial state is referred to as the burn-in period.
{: .prompt-info}

The key challenge now is how to construct such a Markov chain. One possible solution is the **Metropolis-Hastings algorithm**.

## Metropolis-Hastings Algorithm
In the Metropolis-Hastings algorithm, the next state $X_{t+1}$ of the Markov chain at time $t$ is determined via the following steps:

1. Sampling a candidate point:
    * A sample $Y$ is drawn from the proposal distribution $q(\cdot\mid X_t)$, which is dependent on the current state $X_t$.
    * For example, $q(\cdot\mid X_t)$ could be a multivariate normal distribution with mean $X_t$ and a fixed covariance matrix.

2. Acceptance ratio:
    * The acceptance ratio is calculated to decide whether to accept the candidate $Y$ as the next state. The ratio is given by:

    $$
    \alpha(X, Y) = \min \left( 1, \frac{\pi(Y)q(X \vert Y)}{\pi(X)q(Y \vert X)} \right)
    $$

    * The candidate $Y$ is accepted with probability $\alpha(X_t, Y)$.

3. State Transition:
    * If $Y$ is accepted, then $X_{t+1} = Y$.
    * If $Y$ is rejected, then $X_{t+1} = X_t$.

> The Metropolis-Hastings algorithm has the advantage that it does not require knowledge of the exact distribution $\pi(\cdot)$. In other words, the algorithm can be used even if only the un-normalized distribution proportional to it is known, not the exact probability distribution. However, it may take a long time for the chain to converge to the target distribution $\pi(\cdot)$.
{: .prompt-info}

### Example of Metropolis-Hastings Algorithm - Cauchy Model
Consider the case where we have data $Y_1, \cdots, Y_n \sim N(\theta, 1)$ (*i.i.d.*). The prior distribution $\theta$ is given by:

$$
\pi_0(\theta) = \frac{1}{\pi(1 + \theta^2)}.
$$

According to Bayes' theorem, the posterior distribution of $\theta$ is:

$$
\begin{aligned}
\pi(\theta \mid Y_1, \cdots , Y_n) &\propto \exp \left( -\frac{\sum_{i=1}^{n} (Y_i - \theta)^2}{2} \right) \times \frac{1}{1 + \theta^2} \\
&\propto \exp \left( -\frac{n(\theta - \bar{Y})^2}{2} \right) \times \frac{1}{1 + \theta^2}.
\end{aligned}
$$

This posterior distribution does not correspond to a standard known distribution, so we will use the Metropolis-Hastings algorithm to generate a Markov chain whose stationary distribution $\pi(\theta \mid Y_1, \cdots , Y_n)$ and use it for sampling.

We begin by selecting the proposal distribution $q(\theta \mid \theta^\ast)$. Here, we use a normal distribution:

$$
q(\theta \mid \theta^\ast) = N(\bar{Y}, \frac{1}{n}).
$$

The acceptance ratio $\alpha$ is computed as follows:

$$
\begin{aligned}
\alpha(\theta^{(i-1)}, \tilde{\theta}) &= \min \left( 1, \frac{\pi(\tilde{\theta} \mid Y_1, \cdots , Y_n)q(\theta^{(i-1)} \mid \tilde{\theta})}{\pi(\theta^{(i-1)} \mid Y_1, \cdots , Y_n)q(\tilde{\theta} \mid \theta^{(i-1)})} \right) \\
&= \min \left( 1, \frac{1 + (\theta^{(i-1)})^2}{1 + (\tilde{\theta})^2} \right).
\end{aligned}
$$

The Metropolis-Hastings algorithm proceeds as follows:
  
1. Set the initial value $\theta^{(0)}$. For example, $\theta^{(0)} = 1$. Then, iterate from $i = 1$ to $N$ with the following steps.
2. Generate a candidate $\tilde{\theta}$ from the proposal distribution $q(\theta \mid \theta^{(i-1)})$.
3. Compute the acceptance ratio $\alpha$.
4. Generate a sample $r \sim \text{Unif}(0,1)$.
5. If $r < \alpha$, set $\theta^{(i)} = \tilde{\theta}$. Otherwise, $\theta^{(i)} = \theta^{(i-1)}$.

> By generating samples in this way, we can approximate posterior quantities such as the posterior mean, median, and mode of $\theta$.
{: .prompt-tip}

## Gibbs Sampling
**Gibbs sampling** is one of the approximate Bayesian methods for generating samples from multivariate probability distributions. It simplifies the sampling problem for complex multivariate distributions by breaking it down into conditional distributions for each variable.

The basic idea is to generate a Markov chain from the posterior distribution of $p$-dimensional parameters by using the conditional posterior distributions for each of the $p$ one-dimensional parameters.

For example, suppose data $Y_1, \cdots, Y_n$ follows $N(\mu, \sigma^2)$. Here, the parameters of interest are $\Theta = (\mu, \sigma^2)^T$. Then, the posterior distribution is given by $\pi(\Theta \mid Y_1, \cdots, Y_n) = \pi(\mu, \sigma^2 \mid Y_1, \cdots, Y_n)$.

Given the starting point of the Markov chain as $\Theta^{(0)} = (\theta_1^{(0)}, \cdots, \theta_p^{(0)})^T$, the Gibbs sampler updates $\Theta^{(s-1)}$ to $\Theta^{(s)}$ using the following algorithm:

$$
\begin{cases}
\theta_1^{(s)} &\sim \pi(\theta_1 \mid \theta_2^{(s-1)}, \theta_3^{(s-1)}, \cdots, \theta_p^{(s-1)}, \text{Data}) \\
\theta_2^{(s)} &\sim \pi(\theta_2 \mid \theta_1^{(s)}, \theta_3^{(s-1)}, \cdots, \theta_p^{(s-1)}, \text{Data}) \\
&\cdots \\
\theta_p^{(s)} &\sim \pi(\theta_p \mid \theta_1^{(s)}, \theta_2^{(s)}, \cdots, \theta_{p-1}^{(s)}, \text{Data}).
\end{cases}
$$

> When these conditional distributions are known, sampling can proceed directly. If not, sampling is performed using the Metropolis-Hastings algorithm.
{: .prompt-info}

The Gibbs sampling process generates the following sequence of random vectors:

$$
\begin{align*}
\Theta^{(1)} &= (\theta_1^{(1)}, \cdots, \theta_p^{(1)})' \\
\Theta^{(2)} &= (\theta_1^{(2)}, \cdots, \theta_p^{(2)})' \\
&\vdots \\
\Theta^{(S)} &= (\theta_1^{(S)}, \cdots, \theta_p^{(S)})'
\end{align*}.
$$

In this sequence, $\Theta^{(s)}$ depends only on $\Theta^{(0)}, \cdots, \Theta^{(s-1)}$, satisfying the Markov property, where $\Theta^{(s)}$ is conditionally independent of $\Theta^{(0)}, \cdots, \Theta^{(s-2)}$ given $\Theta^{(s-1)}$.

### Example of Gibbs Sampling
Let’s apply Gibbs sampling to perform Bayesian inference for $\mu$ and $\sigma^2$ when data follows a normal distribution.

Assume the yield data for wafers from each lot follows a normal distribution. andomly sampling 50 lots, we define the lot-wise yield data as $X_1, \cdots , X_{n=50} \sim N(\mu, \sigma^2)$ (*i.i.d.*).

For priors, we assume that $\mu$ follows $\text{Unif}(\mathbb{R})$ (an improper prior) and $\sigma^2$ follows Jeffreys' prior ($1/\sigma^2$).

Thus:

$$
\pi(\mu) \propto 1, \quad \pi(\sigma^2) \propto \frac{1}{\sigma^2}.
$$

> Here, $\pi(\theta) = \pi(\mu)\pi(\sigma^2)$, assuming independence between the parameters.
{: .prompt-info}

Given the data $X = (X_1, \cdots , X_n)^T$, the conditional posterior distributions are"

$$
\mu \mid X, \sigma^2 \sim N\left( \bar{X}, \frac{\sigma^2}{n} \right),
$$

$$
\sigma^2 \mid X, \mu \sim \text{IGamma} \left( \frac{n}{2}, \frac{1}{2}\sum_{i=1}^n (X_i - \mu)^2 \right).
$$

As a result, the Gibbs sampling algorithm proceeds as follows:

1. Initialize $(\mu^{(0)}, \sigma^{2(0)})$.
2. For $s = 1$ to $N$, repeat the following:
    * Sample $\mu^{(s)} \sim N\left( \bar{X}, \frac{\sigma^{2(s-1)}}{n} \right)$.
    * Sample $\sigma^{2(s)} \sim \text{IGamma} \left( \frac{n}{2}, \frac{1}{2}\sum_{i=1}^n (X_i - \mu^{(s)})^2 \right)$.

## Convergence of MCMC
To check the convergence of MCMC, the **Gelman and Rubin diagnostic** is commonly used. It relies on between-chain variance and within-chain variance.

Assume that $M>1$ chains, each of length $N$. For parameter $\theta$, let:

* $$\hat{\theta}_m$$: posterior mean of the $m$-th chain. 
* $$\hat{\sigma}_m^2$$: posterior variance of the $m$-th chain. 
* $$\hat{\theta} = \frac{1}{M}\sum_{m=1}^M \hat{\theta}_m$$: overall posterior mean.

The between-chain variance $B$ and within-chain variance $W$ are computed as:

$$
B = \frac{N}{M-1} \sum_{m=1}^M (\hat{\theta}_m - \hat{\theta})^2, \quad W = \frac{1}{M} \sum_{m=1}^M \hat{\sigma}_m^2.
$$

Using $B$ and $W$, compute:

$$
R = \sqrt{\frac{d + 3 \hat{V}}{d + 1} \frac{\hat{V}}{W}},
$$

where $\hat{V}$ (the combined variance under certain stationary conditions) is:

$$
\hat{V} = \frac{N-1}{N} W + \frac{M+1}{MN} B, \quad d = \frac{2 \hat{V}^2}{\text{Var}(\hat{V})}.
$$

The statistic $R$ is called the **potential scale reduction factor (PSRF)**, approaches 1 if the $M$ chains converge to the target posterior distribution.

> If $R < 1.2$ for all parameters, the MCMC is considered to have converged.
{: .prompt-info}