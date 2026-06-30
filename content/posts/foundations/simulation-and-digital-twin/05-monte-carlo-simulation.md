---
title: 05. Monte Carlo 시뮬레이션 (정적 시뮬레이션)
date: 2026-06-30
tags:
  - Simulation
---

지금까지 [[posts/foundations/simulation-and-digital-twin/03-random-number-generation|난수]]를 만들고 [[posts/foundations/simulation-and-digital-twin/04-random-variate-generation|원하는 분포로 변환]]하는 법을 다졌다. 이제 이 무작위 표본으로 무엇을 할 수 있는지 첫 번째 답을 본다. **Monte Carlo 시뮬레이션**은 무작위 표본을 대량으로 뽑아 어떤 수치(적분, 기대값, 확률)를 추정하는 방법이다.

[[posts/foundations/simulation-and-digital-twin/02-classifying-simulation-models|2부 분류 글]]에서 보았듯 Monte Carlo는 **정적(static) 시뮬레이션**이다. 시간을 따라가지 않고 "지금 이 양이 얼마인가"를 무작위로 때려 맞춘다. 이 점에서 시간 축을 사건 단위로 전진시키는 DES와 근본적으로 다르다.

## 직관: 넓이를 점으로 재기

가장 유명한 예가 원주율 $\pi$ 추정이다. 한 변이 1인 정사각형 $[0,1]^2$ 안에, 반지름 1인 사분원을 그린다. 정사각형 넓이는 1, 사분원 넓이는 $\pi/4$다. 이제 정사각형 안에 점을 무작위로 $N$개 뿌리고, 그중 원점에서의 거리가 1 이하라 사분원 안에 들어온 점의 개수를 $N_{\text{in}}$이라 하면,

$$
\frac{N_{\text{in}}}{N} \approx \frac{\pi/4}{1} \;\Rightarrow\; \pi \approx 4 \cdot \frac{N_{\text{in}}}{N}
$$

점을 많이 뿌릴수록 추정이 정확해진다. 여기에 미적분이나 기하 공식은 전혀 쓰지 않았다. **무작위 표본의 비율**만으로 넓이를, 따라서 $\pi$를 알아낸 것이다. 이것이 Monte Carlo의 본질이다.

## 일반화: 기대값으로서의 적분

위 아이디어는 적분 계산으로 일반화된다. 어떤 함수 $h(x)$를 구간 $[a,b]$에서 적분하고 싶다고 하자.

$$
I = \int_a^b h(x)\, dx
$$

이를 균일분포에 대한 기대값으로 바꿔 쓸 수 있다. $X \sim \text{Uniform}(a,b)$의 밀도가 $1/(b-a)$이므로,

$$
I = (b-a)\, \mathbb{E}\big[h(X)\big]
$$

이다. 그러면 $X_1, \dots, X_N$을 균일분포에서 독립적으로 뽑아 다음으로 추정한다.

$$
\hat{I} = (b-a)\cdot \frac{1}{N} \sum_{i=1}^{N} h(X_i)
$$

즉 "**적분 = 기대값, 기대값 = 표본평균**"이라는 연결이 Monte Carlo의 엔진이다. 더 일반적으로, 어떤 확률변수의 기대값 $\mathbb{E}[h(X)]$나 사건의 확률 $P(A) = \mathbb{E}[\mathbf{1}_A]$는 모두 같은 방식으로 — 표본을 뽑아 평균 내어 — 추정할 수 있다.

## 추정량의 정확도

Monte Carlo 추정량 $\hat{I}$는 표본평균이므로 두 가지 좋은 성질을 갖는다.

첫째, **불편추정량**(unbiased)이다. 평균적으로 참값을 맞힌다: $\mathbb{E}[\hat{I}] = I$.

둘째, 정확도가 표본 수에 따라 예측 가능하게 좋아진다. 추정량의 표준오차는

$$
\text{SE}(\hat{I}) = (b-a)\,\frac{\sigma}{\sqrt{N}}
$$

로, $N$이 커질수록 $1/\sqrt{N}$ 속도로 줄어든다(여기서 $\sigma$는 $h(X)$의 표준편차이고, 기대값 $\mathbb{E}[h(X)]$를 직접 추정할 때는 계수 $(b-a)$ 없이 $\sigma/\sqrt{N}$이 된다). 이로부터 추정값에 대한 **신뢰구간**을 만들 수 있어, "내 추정이 얼마나 믿을 만한가"를 정량적으로 말할 수 있다.

이 $1/\sqrt{N}$ 수렴 속도에는 양면이 있다.

- **단점**: 느리다. 정확도를 10배 높이려면 표본을 100배 늘려야 한다.
- **결정적 장점**: 이 속도가 **차원과 무관**하다. 격자 기반 수치적분은 차원이 늘면 격자점이 기하급수적으로 폭발하는 *차원의 저주*에 걸리지만, Monte Carlo의 오차는 차원이 1이든 100이든 여전히 $1/\sqrt{N}$이다. 그래서 **고차원 적분에서는 Monte Carlo가 사실상 유일한 실용적 수단**이 된다(금융 파생상품 가치 평가, 베이지안 추론 등).

느린 수렴을 보완하기 위해 같은 $N$으로 분산 $\sigma^2$ 자체를 줄이는 기법들 — control variates, antithetic variates 등 — 이 있으며, 이는 [[posts/foundations/simulation-and-digital-twin/13-variance-reduction-and-doe|4부]]에서 다룬다.

## DES와의 차이, 그리고 통계 시리즈와의 관계

Monte Carlo는 **시간이 없는** 시뮬레이션이라는 점을 다시 강조한다. 대기열 시뮬레이션(DES)이 "오전 9시 5분에 손님 도착, 9시 7분에 서비스 종료…"처럼 사건을 시간 순으로 전개하는 반면, Monte Carlo는 그저 독립 표본을 모아 평균 낼 뿐이다. 둘은 자주 결합된다. 예컨대 DES를 여러 번 반복 실행해 평균 대기시간을 추정하는 것 자체가, 각 실행을 하나의 표본으로 보는 Monte Carlo 절차다.

한편 Monte Carlo는 시뮬레이션만의 것이 아니라 수치계산·통계 전반의 도구다. 이 블로그의 [[posts/foundations/statistics/06-monte-carlo-method|Monte Carlo Method]] 글이 더 일반적인 수치적분·추정 관점을 다루고, 그 발전형인 [[posts/foundations/statistics/07-markov-chain-monte-carlo|MCMC]]는 복잡한 분포에서 표본을 뽑는 문제로 나아간다. 이 글은 그 도구를 "**무작위 표본으로 시스템의 양을 추정하는 정적 시뮬레이션**"이라는 시뮬레이션의 관점에서 본 것이다.

## 정리

- **Monte Carlo 시뮬레이션**은 무작위 표본을 대량으로 뽑아 적분·기대값·확률을 추정하는 **정적 시뮬레이션**이다(시간 개념 없음).
- 핵심 연결은 "**적분 = 기대값 = 표본평균**"이다. $\pi$ 추정도 사분원 넓이를 점의 비율로 잰 것이다.
- 추정량은 **불편**이고 표준오차가 $1/\sqrt{N}$로 줄어 신뢰구간을 줄 수 있다. 수렴은 느리지만 **차원과 무관**해, 고차원 문제에서 강력하다.
- DES(동적)와 결합되며, 통계 시리즈의 [[posts/foundations/statistics/06-monte-carlo-method|Monte Carlo]]·[[posts/foundations/statistics/07-markov-chain-monte-carlo|MCMC]]와도 이어진다.

여기까지가 무작위성의 기초(2부)다. 다음 3부에서는 시간을 사건 단위로 전진시키는 [[posts/foundations/simulation-and-digital-twin/06-discrete-event-simulation-concepts|이산사건 시뮬레이션(DES)]]의 사고방식으로 들어간다.
