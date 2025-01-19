---
title: Bayesian Statistics
author: rdh
date: 2024-02-05 11:33:00 +0800
categories: [01. Statistics, 01. Introduction to Statistics]
tags: [bayesian statistics, statistics]
math: true
---
## Bayesian Inference
**Bayesian inference** is a method of statistical inference that updates the probability of a hypothesis as new data becomes available. It is based on Bayesian probability, which treats parameters as random variables and seeks to estimate their distribution.

### Frequentist Approach vs. Bayesian Approach
The **frequentiest approach**, which underpins the traditional methods of statistical inference, assumes that parameters are fixed constants and probabilities are defined as the long-run relative frequency of events over repeated trials. Statistical inference in this context involves estimating these fixed parameters under the assumption that the data follows a specific probability distribution.

To summarize,
* Parameters are fixed constants.
* Probability is interpreted as the frequency of an event in a large number of trials.
* Objective is to estimate parameters using methods like maximum likelihood estimation (MLE).

In contrast, the **Bayesian approach** treats parameters as random variables with their own probability distributions. Bayesian inference combines prior knowledge or beliefs about the parameters (expressed as a prior distribution) with observed data to update their belief about the parameters using Bayes' theorem.

To summarize,
* Parameters are random variables with their own distributions.
* Probability is interpreted as a degree of belief in a hypothesis or event, incorporating subjective perspectives.
* The process updates prior beliefs to a posterior distribution based on observed data.

For example, Consider the statement: "The probability of getting heads when flipping a coin is 50%."

* Frequentist interpretation:  
  If the coin is flipped thousands or millions of times, approximately 50% of the flips will results in heads.
    * Objective probability based on the frequency of outcomes over repeated trials.
* Bayesian interpretation:  
  My confidence that the next flip will result in heads is 50%.
    * Subjective probability based on personal belief or prior knowledge about the coin.

> While one might deny it, most real-world decision-making processes are inherently Bayesian, as they involve subjective probabilities, beliefs, and continuous updates based on new evidence.
{: .prompt-tip}

### Elements Required for Bayesian Inference
Bayesian inference requires three key components:

* **Prior distribution ($\pi(\theta)$)**  
  The prior distribution represents the analysts' knowledge or degree of uncertainty about the parameter $\theta$ before observing the data.
    * $\pi(\theta)$: the distribution of $\theta$ based on prior beliefs or historical information.
    * Often, past data or expert knowledge is used to determine the prior distribution.

* **Probability model ($f(x \mid \theta)$ or $\pi(x \mid \theta)$)**  
  The probability model describes the distribution of the data $x$, given the parameter $\theta$.
    * $x \mid \theta \sim f(x \mid \theta)$ or $\pi(x \mid \theta)$: the likelihood of observing the data under the parameter $\theta$.

* **Posterior distribution ($\pi(\theta \mid x)$)**  
  The posterior distribution reflects the updated knowledge about $\theta$ after observing the data $x$. It represents the degree of uncertainty regarding $\theta$ after incorporating the data.
    * $\pi(\theta \mid x)$: the conditional probability distribution of $\theta$ given $x$.
    * The posterior mean, posterior median, and MAP (Maximum a Posteriori) can be used as Bayesian estimators of the parameter $\theta$.

## Posterior Distribution
In Bayesian inference, the likelihood and posterior distributions are interpreted as conditional probability distributions. Specifically:

$$
f(x \mid \theta) = f(x, \theta) / \pi(\theta), \quad f(\theta \mid x) = f(x, \theta) / f(x).
$$

Using Bayes' theorem, the posterior probability is expressed as follows (here, $f$ and $p$ are used interchangeably):

$$
\pi(\theta \mid x) = f(x \mid \theta)\pi(\theta) / f(x) \propto f(x \mid \theta)\pi(\theta).
$$

> The posterior distribution is proportional to the product of the likelihood and the prior distribution.
{: .prompt-info}

### Example for Normal Distribution
Consider a normal distribution with known variance $\sigma^2$ and mean $\theta$. The likelihood is given by:

$$
f(x \mid \theta, \sigma^2) = \frac{1}{\sqrt{2\pi\sigma^2}}\exp\left( -\frac{(x-\theta)^2}{2\sigma^2} \right), \quad -\infty < \theta < \infty.
$$

Assume a normal priority distribution for the parameter $\theta$.

$$
\theta \sim N(m, s^2)
$$

This reflects the belief that $\theta$ is approximately $m$, with uncertainty $s^2$.

When data $X = (X_1, X_2, \ldots, X_n)$ is observed ($n$ observations), the posterior distribution, using Bayes' theorem, is:

$$
\pi(\theta | x) \propto \frac{1}{\sqrt{2 \pi s^2}} \exp \left\{ - \frac{(\theta - m)^2}{2 s^2} \right\} \left( \frac{1}{\sqrt{2 \pi \sigma^2}} \right)^n \exp \left\{ - \sum_{i=1}^{n} \frac{(X_i - \theta)^2}{2 \sigma^2} \right\}.
$$

Simplifying this expression results in:

$$
\theta | X \sim N \left( \frac{\frac{\bar{X}}{\sigma^2 / n} + \frac{m}{s^2}}{\frac{1}{\sigma^2 / n} + \frac{1}{s^2}}, \left( \frac{1}{\sigma^2 / n} + \frac{1}{s^2} \right)^{-1} \right),
$$

where $\bar{X}$ is the sample mean.

The posterior mean,

$$
\frac{\frac{\bar{X}}{\sigma^2 / n} + \frac{m}{s^2}}{\frac{1}{\sigma^2 / n} + \frac{1}{s^2}}
$$

is a weighted average of the sample mean $\bar{X}$ and the prior mean $m$, with weights inversely proportional to their variances.

> With more data, the posterior distribution becomes more concentrated around the sample mean, reflecting stronger belief in $\theta$ being close to the observed data's mean.
{: .prompt-info}

## Bayesian Decision Theory
**Bayesian decision theory** is a principle for making decisions that minimize errors and associated risks by considering a **loss function** that assigns different weights to errors. The goal is to make decisions that minimize expected loss.

> Bayesian decision theory provides a fundamental statistical framework for pattern classification problems.
{: .prompt-info}

An example of Bayesian estimators derived from decision theory is the posterior mean, which minimize the expected loss under a quadratic loss function.

### Example for Bayesian Decision Theory
Consider a hospital scenario where an X-ray image is taken to diagnose whether a patient has cancer. Bayesian decision theory can guide the determination of the patient's condition.

* Let $x$ represent the X-ray result.
* Let $t$ represent the true condtion: $t=C_1$ (cancer) or $t=C_2$ (no cancer).

The decision is based on the posterior probability $p(C_k \mid x)$, which can be computed using Bayes' theorem:

$$
p(C_k \mid x) = \frac{p(x \mid C_k)p(C_k)}{p(x)}.
$$

Here, $p(C_k)$ is the prior PDF of class $C_k$, and $p(C_k \mid x)$ is the posterior PDF given $x$.

The objective is to minimize the chance of incorrect decisions, such as:

1. Diagnosing cancer when there is none (false positive).
2. Failing to diagnose cancer when it is present (false negative).

The decision rule is required for every $x$. This rule divide the entire input space into decision regions $R_k$, where:

* $x \in R_1$: decide $C_1$ (cancer).
* $x \in R_2$: decide $C_2$ (no cancer).

Then the probability of misclassification, $p(\text{mistake})$, is:

$$
\begin{aligned}
p(\text{mistake}) &= p(x \in R_1, C_2) + p(x \in R_2, C_1)\\
&= \int_{R_1} p(x, C_2)dx + \int_{R_2} p(x, C_1)dx.
\end{aligned}
$$

Thus, the goal is to find $R_1$ and $R_2$ that minimizes $p(\text{mistake})$.

However, in real-world scenarios, the consequences of errors are not equal. For example, diagnosing cancer incorrectly as no cancer (false negative) has far more serious consequences than vice versa.

To account for this, penalties are incorporated using a loss function. For example, if a false negative has 10000 times the penalty of a false positive, the loss matrix could be:

$$
L=
\begin{bmatrix}
0 & 10000 \\
1 & 0
\end{bmatrix}.
$$

Here, rows correspond to the true condition, and columns correspond to the decision.

Finally, the decision-making process is transformed into minimizing the **expected loss**:

$$
\mathbb{E}(L) = \sum_k \sum_j \int_{R_j} L_{kj} p(x, C_k) dx.
$$

By minimizing $\mathbb{E}(L)$, decisions are optimized to account for both the likelihood of outcomes and the associated risks, ensuring that severe misclassification are appropriated penalized.

## Prior Distribution
The prior distribution is the probability distribution of $\theta$, reflecting the uncertainty about $\theta$ before observing data.

### Conjugate Prior
A prior distribution that belongs to the same family of distributions as the posterior distribution (typically, the exponential family) is called a **conjugate prior distribution**.

* E.g.) When the data follows a normal distribution and the prior distribution of the mean is also normal, the posterior distribution of the mean will likewise follow a normal distribution.

### Informative Prior vs. Non-Informative Prior
The prior distribution can be categorized into two types: **informative prior (subjective prior)**, which provides specific information about the parameter, and **non-informative prior (diffuse prior, objective prior)**, which represents general or no information about the parameter.

An informative prior presents detailed information about the parameter and typically has a smaller variance, meaning that the parameter is more likely to be concentrated around a subjectively considered value.

* E.g.) $\mu \sim N(1, 0.1^2)$ vs. $\mu \propto 1 \approx N(1,10^{10})$ or $\mu \sim \text{Unif}(-\infty, \infty)$

### Proper Prior vs. Improper Prior
The prior distribution can also be categorized into two categories: **proper prior**, which is a well-defined probability distribution with a finite integral or sum, and **improper prior**, which is not a well-defined probability distribution because its integral or sum is not finite.

For example, let $X \sim N(\mu, \sigma^2)$ represents a dataset, where the variance is assumed to be known. If there is no information (belief) about the mean, we might wish to assign equal information across all possible values of the mean. This can be done by assuming the mean follows a uniform distribution $\text{Unif}(-\infty, \infty)$. However, such a distribution is not integrable and is therefore an improper prior.

> Even when a prior is improper, the resulting posterior distribution can still be proper. However, this is not guaranteed in all cases, so verification is necessary.
{: .prompt-info}

### Example: Binomial and Beta Prior Distribution
In $n$ independent and consecutive trials, where each has a success probability $\theta$ (with $0 \leq \theta \leq 1$), the number of successes follows a binomial distribution. The PMF of the binomial distribution is given by:

$$
f(x \vert \theta) = \frac{n!}{x!(n-x)!} \theta^x (1-\theta)^{n-x}, \quad 0 \leq \theta \leq 1.
$$

Let's consider a Beta distribution as the prior distribution for the parameter $\theta$: $\theta \sim Beta(\alpha, \beta), \alpha, \beta > 0$.

The PDF of the Beta distribution is following:

$$
f(\theta \mid \alpha, \beta) = \frac{1}{B(\alpha, \beta)} \theta^{\alpha-1} (1-\theta)^{\beta-1}.
$$

Given $n$ trials and $X$ successes, the posterior distribution of $\theta$ can be obtained using Bayes' theorem.

$$
\begin{aligned}
f(\theta \vert X) &\propto Lik(\theta \vert X) \pi(\theta) \\
&\propto \frac{n!}{X!(n-X)!} \theta^X (1-\theta)^{n-X} \cdot \frac{1}{B(\alpha, \beta)} \theta^{\alpha-1} (1-\theta)^{\beta-1} \\
&\propto \theta^{X + \alpha - 1} (1 - \theta)^{n - X + \beta - 1} \\
&\propto \text{pdf of } Beta(\alpha + X, \beta + n - X)
\end{aligned}
$$

Therefore, the posterior distribution of $\theta$ is

$$
\theta \mid X \sim Beta(\alpha + X, \beta + n - X).
$$

The parameters of the posterior $(\alpha + X, \beta + n - X)$ reflect the updated belief about $\theta$, incorporating both the prior information $(\alpha, \beta)$ and the observed data $(X, n)$. As more data $(n)$ is observed, the posterior becomes increasingly dominated by the data, reducing the influence of the prior.

> The Beta distribution is the conjugate prior for the Binomial likelihood, as the posterior distribution remains in the Beta family.
{: .prompt-info}

## Naive Bayes Classifier
In a classification problem involving $N$ features and $K$ classes $(C_1, \cdots, C_K)$, each observation can be represented as a vector of features. Let this vector be a random vector $\mathbf{X} = (X_1, \cdots, X_N)$, where each components $X_i$ corresponds to a specific feature.

The classification task can be framed as determining the most probable class $C_k$ for a given observation $\mathbf{X}$, which requires computing the posterior probability $P(C_k \vert \mathbf{X})$.

Therefore, the objective of the problem is to find $\arg \max_{k \in \{1, \cdots, K\}} P(C_k \vert \mathbf{X})$.

If $P(C_k \vert \mathbf{X}) = f(\mathbf{X})$ is viewed as a function of $\mathbf{X}$, the problem can be considered as estimating $f(\mathbf{X})$ by observing multiple $\mathbf{X}$ values for which the class is known.

**Naive Bayes** is one such method that simplifies $P(C_k \vert \mathbf{X})$ by assuming that the features $(X_j)$ are independent of each other within a given class (even if they are not truly independent), as follows.

$$
\begin{aligned}
P(C_k \vert \mathbf{X}) &= \frac{P(\mathbf{X} \vert C_k)P(C_k)}{P(\mathbf{X})} \quad \text{Bayes' theorem}\\
&= \frac{1}{P(\mathbf{X})}P(C_k)P(X_1, X_2, \cdots, X_N \vert C_k)\\
&\approx \frac{1}{P(\mathbf{X})}P(C_k)\prod_{j=1}^{N} P(X_j \vert C_k) \quad \text{Independence assumption (naive)}
\end{aligned}
$$

Since $\mathbf{X}$ is treated as given in $P(C_k \vert \mathbf{X})$, the Naive Bayes classifier can be expressed as follows:

$$
\begin{aligned}
& \quad \arg \max_{k \in \{1, \ldots, K\}} P(C_k \vert \mathbf{X}) \\
&= \arg \max_{k \in \{1, \ldots, K\}} \frac{1}{P(\mathbf{X})} P(C_k) \prod_{j=1}^{N} P(X_j \vert C_k) \quad \text{Naive Bayes} \\
&= \arg \max_{k \in \{1, \ldots, K\}} P(C_k) \prod_{j=1}^{N} P(X_j \vert C_k) \\
\end{aligned}
$$

Here, $P(C_k)$ is the prior probability of belonging to the $k$-th class. If no prior information is available, we can set $P(C_k) = \frac{1}{K}$. $P(X_j \vert C_k)$ is the probability of the $j$-th feature $X_j$ given class $k$, which is estimated from the data.

For example, if there are $n_k$ observations $X_1^{(k)}, \ldots, X_{n_k}^{(k)}$ belonging to the class $k$, the data for the $j$-th feature can be extracted as $X_{1j}^{(k)}, \ldots, X_{n_k j}^{(k)}$, where each $X_{ij}^{(k)}$ is the $j$-th element of $X_i^{(k)}$. If the $j$-th feature values follow a normal distribution, the parameters $\mu_{kj}$ and $\sigma_{kj}^2$ of the distribution can be estimated using $X_{1j}^{(k)}, \ldots, X_{n_k j}^{(k)}$.

$$
\hat{P}(X_j \vert C_k) = \frac{1}{\sqrt{2 \pi \sigma_{kj}^2}} e^{-\frac{1}{2 \sigma_{kj}^2} (X_j - \hat{\mu}_{kj})^2}.
$$
