---
title: 08. Variational Inference
date: 2025-09-20
tags:
  - Statistics
---
## RECAP: Approximate Bayesian Method
Bayesian inference를 요약하면 다음과 같다.

* 데이터의 분포에 관한 모형 (likelihood, $L(\theta\mid X)$)와
* 모델을 정하는 모수 (parameter)의 사전분포 (prior distribution, $\pi(\theta)$)를 이용하여
* 모수의 사후확률 (posterior probability, $\pi(\theta\mid X)$)를 구하고,
* 이를 이용하여 모수에 관한 추론을 진행

이 때, likelihood가 복잡하거나, 데이터가 아주 큰 경우에는 사후확률을 계산하는 것이 쉽지 않다.

이에 따라, 여러 **근사 베이지안 방법 (approximate Bayesian method)** 들이 제안되었다.

* 참고: [Markov Chain Monte-Carlo (MCMC)](https://velog.io/@rdh7014/Markov-Chain-Monte-Carlo)

## Variational Inference
**Variational inference (변분 추론)** 은 또다른 근사 베이지안 방법의 일종이다. 이는 사후분포에 가까우면서 sampling이 상대적으로 쉬운 분포를 찾아, 이를 이용해 추론을 진행하는 것이다. 일반적으로 사후분포의 후보가 되는 분포에 대한 class를 정해두고, 이 가운데서 분포를 정하게 된다.

> 일반적으로 variational inference가 MCMC보다 속도가 빠르다.

> 꼭 Bayesian 방법이 아니더라도, MCMC는 분포로부터 표본을 sampling하는 기법으로, variational inference는 분포를 근사시키는 기법으로 사용되고 있다.

> **💡 직관:** MCMC가 사후분포를 "샘플로 탐색"한다면, 변분추론은 사후분포를 "최적화로 근사"한다. 다루기 쉬운 분포들의 후보군(family)을 미리 정해두고, 그 안에서 진짜 사후분포와 가장 닮은 하나를 골라낸다. 적분(추출) 문제를 최적화 문제로 바꾸는 셈이라 보통 더 빠르지만, 후보군 밖의 진짜 모습은 결코 담아내지 못한다는 한계를 같이 떠안는다.

Variational inference의 과정을 설명하기 위해 다음을 가정하자.

* 데이터: $\mathbf{X} = (X_1, \cdots, X_n)$
* 은닉변수(잠재변수): $\mathbf{Z} = (Z_1, \cdots, Z_m)$
* 추가 모수: $\alpha$
* 목적: 사후분포 $p(\mathbf{Z} \mid \mathbf{X}, \alpha)$와 가까우면서 다루기 쉬운 분포(근사분포) $q(\mathbf{Z} \mid \nu)$를 찾아서 $\mathbf{Z}$를 생성하거나 사후분포의 특성값들을 근사적으로 구한다.

### Finding the Approximate Distribution
우선 $p(\mathbf{Z} \mid \mathbf{X}, \alpha)$와 가까운 $q(\mathbf{Z} \mid \nu)$를 찾아내자. 이는 $q(\mathbf{Z} \mid \nu)$가 $p(\mathbf{Z} \mid \mathbf{X}, \alpha)$에 가장 가깝도록 하는 $\nu$를 찾는 문제로 볼 수 있다.

여기서 $\nu$는 **variational parameter (변분 모수)** 라고 부른다. 

그렇다면, 두 분포가 가깝다는 기준, 즉 분포 사이의 "가까움"을 나타내는 기준은 어떻게 정의할 수 있을까? 이에 대해서는 다양한 기준이 존재하지만, 가장 널리 쓰이는 기준으로는 **Kullback–Leibler divergence**, 또는 **KL divergence**가 있다.

#### KL Divergence
KL divergence는 정보이론 (information theory)에서 온 개념으로, 두 distribution의 가까움을 나타내는 값이다.

$$
\begin{aligned}
KL(q \parallel p) &= E_q \left( \log \frac{q(\mathbf{Z})}{p(\mathbf{Z} \mid \mathbf{X})} \right)\\
&= E_q (\log q(\mathbf{Z}) - \log p(\mathbf{Z} \mid \mathbf{X}))\\
&= \sum_{\mathbf{z}} \log \left( \frac{q(\mathbf{z})}{p(\mathbf{z} \mid \mathbf{X})} \right) q(\mathbf{z}) \quad (\text{discrete})\\
&= \int \log \left( \frac{q(\mathbf{z})}{p(\mathbf{z} \mid \mathbf{X})} \right) q(\mathbf{z}) d\mathbf{z} \quad (\text{continuous})
\end{aligned}
$$

* If $q(\mathbf{Z}) = p(\mathbf{Z} \mid \mathbf{X})$, then $KL(q \parallel p) = 0$.
* $KL(q \parallel p) \geq 0$
* Asymmetric: $KL(q \parallel p) \neq KL(p \parallel q)$

> KL divergence는 비대칭이므로 거리(distance)로 볼 수 없다.

> **💡 직관:** $KL(q \parallel p)$가 비대칭이라는 사실은 실무에서 중요하다. 변분추론은 이 방향($KL(q \parallel p)$)을 줄이는데, 식을 보면 $p$가 거의 0인 곳에서 $q$가 큰 값을 가지면 $\log(q/p)$가 폭발해 강하게 벌점을 받는다. 그래서 근사분포 $q$는 "$p$가 0인 영역은 절대 건드리지 말자"는 쪽으로 행동해, $p$의 여러 봉우리 중 하나에 안전하게 몰리는(mode-seeking) 경향을 보인다. 그 대가로 사후분포의 산포(불확실성)는 과소평가하기 쉽다.

![](/images/f842486e-c5a6-4360-bb3d-1b23a1314e9b-image.png)

### Minimize KL Divergence
다시, 원래의 근사분포를 찾는 문제로 돌아가자. KL divergence를 이용하면 해당 문제를 다음과 같이 표현할 수 있다.

$$
q^\ast = \arg\min_{q\in Q} KL\left(q(\mathbf{Z}) \parallel p(\mathbf{Z} \mid \mathbf{X})\right)
$$

$KL(q(\mathbf{Z}) \parallel p(\mathbf{Z} \mid \mathbf{X}))$을 직접 계산하기 위해서는 알지 못하는 분포 $p$에 대한 log 값에 대한 계산이 필요하다. 이에 대한 대체로 **evidence lower bound (ELBO)** 라는 값을 이용한다.

#### Evidence Lower Bound (ELBO)

$$
\begin{aligned}
KL(q(\mathbf{Z}) \parallel p(\mathbf{Z} \mid \mathbf{X})) &= E_q \left( \log \frac{q(\mathbf{Z})}{p(\mathbf{Z} \mid \mathbf{X})} \right)\\
&= E_q (\log q(\mathbf{Z})) - E_q (\log p(\mathbf{Z} \mid \mathbf{X}))\\
&= E_q (\log q(\mathbf{Z})) - E_q (\log p(\mathbf{Z}, \mathbf{X})) + E_q (\log p(\mathbf{X}))\\
&= E_q (\log q(\mathbf{Z})) - E_q (\log p(\mathbf{Z}, \mathbf{X})) + \log p(\mathbf{X})\\
&= -ELBO(q) + \log p(\mathbf{X})
\end{aligned}
$$

즉, evidence lower bound (ELBO)는 다음과 같이 정의된다.

$$
ELBO(q) = E_q\left(\log p(\mathbf{Z}, \mathbf{X})\right) - E_q\left(\log q(\mathbf{Z})\right)
$$

이 때, $\log p(\mathbf{X})$는 $q$에 대해서 상수이므로 KL divergence 최소화 문제에 필요가 없다.

따라서, KL divergence 최소화 문제는 다음과 같이 쓸 수 있다.

$$
\begin{aligned}
q^\ast &= \arg\min_{q\in Q} KL\left(q(\mathbf{Z}) \parallel p(\mathbf{Z} \mid \mathbf{X})\right)\\
&= \arg\max_{q\in Q} ELBO\left(q(\mathbf{Z})\right)
\end{aligned}
$$

> $\log p(X)$는 관측값의 likelihood로 evidence라고도 불리며, ELBO는 이 evidence의 lower bound를 말한다.

> **💡 직관:** 우리가 진짜 줄이고 싶은 $KL(q \parallel p)$ 안에는 계산 불가능한 $\log p(\mathbf{X})$(evidence)가 끼어 있어 직접 다룰 수 없다. 다행히 이 항은 $q$와 무관한 상수라, $\log p(\mathbf{X}) = ELBO(q) + KL(q \parallel p)$에서 evidence가 고정인 이상 "$KL$ 최소화"와 "$ELBO$ 최대화"는 완전히 같은 문제가 된다. 손댈 수 없는 목표를, 계산 가능한 대리 목적함수(ELBO)로 갈아끼우는 것이 핵심 트릭이다.

ELBO는 다음과 같이 다시 쓸 수 있다.

$$
\begin{aligned}
ELBO(q) &= E_q \left( \log p(\mathbf{Z}, \mathbf{X}) \right) - E_q (\log q(\mathbf{Z}))\\
&= E_q \left( \log p(\mathbf{X} \mid \mathbf{Z}) \right) + E_q (\log p(\mathbf{Z})) - E_q (\log q(\mathbf{Z}))\\
&= E_q \left( \log p(\mathbf{X} \mid \mathbf{Z}) \right) - E_q \left( \log \frac{q(\mathbf{Z})}{p(\mathbf{Z})} \right)\\
&= E_q \left( \log p(\mathbf{X} \mid \mathbf{Z}) \right) - KL \left( q(\mathbf{Z}) \parallel p(\mathbf{Z}) \right)
\end{aligned}
$$

마지막 식의 첫번째 항의 $\log p(\mathbf{X} \mid \mathbf{Z})$는 잠재변수 $\mathbf{Z}$가 주어졌을 때의 관측값 $\mathbf{X}$의 확률 (log scale)로, $\mathbf{Z}$의 log-likelihood로 볼 수 있다. 따라서, 첫번째 항은 $\mathbf{Z}$의 log-likelihood의 기대값이 된다. 따라서, ELBO를 최대화 하는 것은 $p(\mathbf{X} \mid \mathbf{Z})$를 크게 하도록 하는 것과 같고, 이는 likelihood를 증가시키는 또는 데이터를 더 잘 설명하는 $q(\mathbf{Z})$를 찾으려 하는 것과 같다고 볼 수 있다.

마지막 식의 두번째 항은 $\mathbf{Z}$의 사전분포 $p(\mathbf{Z})$와 $q(\mathbf{Z})$ 사이의 KL divergence이다. 따라서, ELBO를 최대화 하는 것은 사전분포 $p(\mathbf{Z})$와 가까운 $q(\mathbf{Z})$를 찾으려 하는 것으로 볼 수 있다.

즉, ELBO($q$)를 최대화 하는 것은 likelihood와 prior 사이에서 적절한 $q$를 찾는 것을 말한다.

> **💡 직관:** ELBO 분해는 두 욕심의 줄다리기다. 첫째 항(기대 log-likelihood)은 "데이터를 잘 설명하라"고 밀고, 둘째 항($-KL(q \parallel p(\mathbf{Z}))$)은 "사전믿음에서 너무 멀어지지 마라"고 당긴다. 데이터에만 맞추면 과적합, 사전분포에만 붙으면 데이터를 무시 — 이 둘의 균형점이 좋은 근사분포다. 이는 머신러닝의 "적합도 vs 정규화" 구도와 정확히 같은 형태다.

### Variational Familiy

$$
\begin{aligned}
q^\ast &= \arg\min_{q\in Q} KL\left(q(\mathbf{Z}) \parallel p(\mathbf{Z} \mid \mathbf{X})\right)\\
&= \arg\max_{q\in Q} ELBO\left(q(\mathbf{Z})\right)
\end{aligned}
$$

위 문제에서 $q$를 찾는 것은, $Q$를 어떤 분포 집합 (probability distribution family)으로 놓느냐에 따라 계산 복잡도가 달라진다. 주로 많이 사용되는 가정은 **mean-field variational family**로, 이는 잠재변수가 서로 독립이면서 각기 다른 변분인자 (variational factor)에 의존하는 분포 집합을 말한다. 즉, $q(\mathbf{Z}) = \prod_{j=1}^m q_j(Z_j)$. 따라서, ELBO($q$)를 찾는 $$\{ q_j^\ast \}$$를 찾는 문제가 된다.

> 이러한 variational family는 $\mathbf{X}$에 의존하지 않는다.

> **💡 직관:** 평균장(mean-field) 가정은 "잠재변수들 사이의 상관관계를 포기하는 대신 계산을 산다"는 거래다. $q(\mathbf{Z}) = \prod_j q_j(Z_j)$로 쪼개면 각 변수를 따로 최적화할 수 있어 문제가 단순해지지만, 실제 변수들이 서로 얽혀 있다면 그 의존구조를 표현할 길이 없어 근사가 부정확해진다. 더 풍부한 family를 쓰면 정확도는 오르지만 계산 비용이 함께 커지는, 전형적인 정확도-비용 trade-off다.

Mean-field variational family보다 복잡한 family를 고려할 수도 있으나 일반적으로 계산상의 복잡도가 커진다. 구체적으로 어떤 variational family를 고려할지는 문제에 따라 다르며, variational family가 정해지면 최대화 시키는 최적화 알고리즘을 상황에 맞게 적용한다.

> 주어진 데이터 $\mathbf{X}$와, variational family $Q$가 정해져서 $$\{ q_j^\ast \}$$를 찾으면 필요에 따라 이를 이용하여 $Z_i$를 생성할수 있다. 이렇게 생성된 $$\{Z_i\}$$를 이용하여 데이터 $\mathbf{X}$와 유사한 $\mathbf{X^\ast}$를 생성할 수도 있다 (generative model).