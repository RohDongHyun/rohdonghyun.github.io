---
title: 18. 환경 모델 학습하기
date: 2026-06-30
tags:
  - Reinforcement Learning
---
[[posts/foundations/introduction-to-rl/17-model-based-rl|Model-based RL]]에서 우리는 환경 모델 — 전이 $\hat{P}(s' \mid s, a)$와 보상 $\hat{R}(s, a)$ — 을 "가지고 있다"고 가정하고 계획을 세웠다. 바둑처럼 규칙이 알려진 문제라면 모델은 그냥 시뮬레이터로 주어진다. 하지만 로봇이나 실제 환경에서는 모델조차 우리가 **데이터로부터 학습**해야 한다. 이 글은 그 모델을 어떻게 정의하고 학습하며, 학습된 모델이 가진 본질적 약점이 무엇인지를 다룬다.

## 모델이란 무엇인가

RL에서 **모델**은 환경의 동역학(dynamics)을 흉내 내는 함수다. 주어진 $(s, a)$에 대해 다음에 무슨 일이 일어날지 — 다음 state와 reward — 를 예측한다.

$$
\hat{P}(s' \mid s, a) \approx P(s' \mid s, a), \quad \hat{R}(s, a) \approx \mathbb{E}[r \mid s, a]
$$

모델은 여러 형태로 나뉜다.

- **Forward model**: $(s, a) \to (s', r)$. 가장 흔한 형태로, "이 행동을 하면 어떻게 될까"를 예측한다. 이하에서 다루는 모델은 모두 forward model이다.
- **Inverse model**: $(s, s') \to a$. "이 상태로 가려면 무슨 행동을 해야 하나"를 예측한다. 표현 학습이나 일부 imitation 기법에 쓰인다.
- **Backward model**: $s' \to (s, a)$. 어떤 state에 도달하게 만든 이전 $(s,a)$를 예측한다. 아래의 prioritized sweeping 같은 역방향 계획에 유용하다.

또한 모델이 불확실성을 어떻게 다루느냐에 따라 구분된다.

- **Deterministic model**: 하나의 $s'$를 점추정한다. 환경이 거의 결정적일 때 충분하다.
- **Stochastic(probabilistic) model**: $s'$의 **분포**를 출력한다. 환경에 noise가 있거나, 모델 자신의 불확실성을 표현하고 싶을 때 쓴다.
- **Expectation model**: 분포 대신 기댓값 $\mathbb{E}[s']$ 하나만 내놓는다. 계산은 싸지만, 분포가 multi-modal일 때 "평균 state"가 실제로는 존재하지 않는 엉뚱한 지점일 수 있다.

## 모델을 학습하는 법

모델 학습은 본질적으로 **supervised learning**이다. Agent가 환경과 상호작용하며 모은 경험 $(s, a, r, s')$들이 곧 학습 데이터 $(\text{입력}=(s,a),\ \text{정답}=(s', r))$가 된다.

가장 단순한 deterministic 모델은 회귀로 학습한다.

$$
\mathcal{L}(\theta) = \mathbb{E}_{(s,a,s') \sim \mathcal{D}} \left[ \left\lVert f_\theta(s, a) - s' \right\rVert^2 \right]
$$

실무에서는 $s'$을 직접 예측하는 대신 **변화량** $\Delta s = s' - s$를 예측해 $\hat{s'} = s + f_\theta(s, a)$로 두는 경우가 많다. 연속된 state는 대개 비슷하므로, 작은 차이만 학습하는 편이 안정적이고 정확하기 때문이다.

Stochastic 모델은 분포의 parameter를 출력하도록 학습한다. 예컨대 Gaussian을 가정하면 network가 평균과 분산 $(\mu_\theta(s,a),\ \Sigma_\theta(s,a))$를 내놓고, negative log-likelihood를 최소화한다.

$$
\mathcal{L}(\theta) = \mathbb{E}_{(s,a,s') \sim \mathcal{D}} \left[ -\log \mathcal{N}\left(s' \mid \mu_\theta(s,a),\ \Sigma_\theta(s,a)\right) \right]
$$

이렇게 분산까지 학습하면, 모델은 "다음 state가 무엇인지"뿐 아니라 "그 예측을 얼마나 믿어도 되는지"까지 표현하게 된다. 이 점은 아래에서 다시 중요해진다.

## Compounding Error: 모델의 근본 약점

모델이 한 step 예측에서 작은 오차 $\epsilon$만 내더라도, 그 모델로 여러 step을 굴리면(rollout) 문제가 커진다. 두 번째 step은 **이미 틀어진 $\hat{s}_1$을 입력으로** 받으므로, 학습 데이터에서 본 적 없는 영역으로 들어가 더 큰 오차를 낸다. 이 오차가 다음 입력을 또 틀어지게 만들어, 예측 궤적은 시간이 갈수록 실제 궤적에서 **지수적으로 멀어진다**.

이를 **compounding error**(누적 오차)라 한다. Model-based RL이 "모델 안에서 마음껏 상상하면 되지 않나"라는 직관만큼 잘 안 되는 핵심 이유다.

> 한 step 오차율이 작아도 horizon $H$가 길어지면 rollout 끝의 state는 신뢰할 수 없다. 그래서 실전 알고리즘들은 **긴 rollout을 피하는** 방향으로 설계된다. 뒤에서 볼 [[posts/foundations/introduction-to-rl/22-model-based-continuous-control|MBPO]]가 짧은 $k$-step rollout만 쓰는 것이 대표적인 처방이다.

## 불확실성을 모델에 담기

Compounding error를 줄이는 열쇠는 모델이 **자신이 모르는 영역을 아는 것**이다. 모델의 불확실성은 두 종류로 나뉜다.

- **Aleatoric uncertainty**: 환경 자체의 내재적 randomness. 데이터를 아무리 모아도 사라지지 않는다 (예: 주사위). Stochastic 모델의 출력 분산이 이를 잡는다.
- **Epistemic uncertainty**: 데이터가 부족해서 생기는 모델의 무지. 충분히 많이 가본 영역에서는 작고, 안 가본 영역에서는 크다. 데이터가 늘면 줄어든다.

특히 epistemic uncertainty가 중요하다. 계획 알고리즘은 모델이 좋다고 말하는 행동을 고르는데, 모델이 **안 가본 영역을 근거 없이 좋다고 착각**하면 계획은 그 환상을 파고든다(model exploitation). 모델이 "여기는 잘 모른다"고 표시할 수 있으면, 그런 영역을 피하거나 보수적으로 다룰 수 있다.

가장 널리 쓰이는 방법은 **ensemble**이다. 서로 다른 초기값·데이터 순서로 여러 개의 모델을 학습시키면, 잘 학습된 영역에서는 모델들의 예측이 일치하고, 데이터가 없는 영역에서는 예측이 크게 갈린다. 이 **예측 불일치(disagreement)의 크기가 곧 epistemic uncertainty의 추정치**가 된다.

$$
\hat{s'}_i = f_{\theta_i}(s, a), \quad i = 1, \dots, K \quad \Rightarrow \quad \text{불확실성} \approx \mathrm{Var}_i\left[\hat{s'}_i\right]
$$

[[posts/foundations/introduction-to-rl/22-model-based-continuous-control|PETS]]는 여기에 더해 각 모델을 stochastic(분산 출력)하게 만들어 두 종류의 불확실성을 함께 잡는 **probabilistic ensemble**을 쓴다.

## 정리

학습된 모델은 model-based RL에 sample efficiency라는 큰 이점을 주지만, 그 모델은 결국 데이터에서 근사된 함수이고 compounding error라는 근본 한계를 갖는다. 그래서 좋은 모델 학습의 관건은 단순히 정확한 예측이 아니라, **자신이 모르는 영역을 아는 것**(불확실성 정량화)이다. 이어지는 글들은 이 모델을 실제로 어떻게 계획에 쓰는지 — tabular [[posts/foundations/introduction-to-rl/19-dyna-and-prioritized-sweeping|Dyna]]부터 연속 제어와 world model까지 — 를 다룬다.
