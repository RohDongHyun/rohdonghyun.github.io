---
title: 22. 연속 제어를 위한 Model-based RL
date: 2026-06-30
tags:
  - Reinforcement Learning
---
지금까지의 [[posts/foundations/introduction-to-rl/19-dyna-and-prioritized-sweeping|Dyna]]·[[posts/foundations/introduction-to-rl/20-monte-carlo-tree-search|MCTS]]는 주로 이산적이고 셀 수 있는 환경을 다뤘다. 하지만 로봇 팔이나 보행처럼 **연속적인 state·action**을 가진 제어 문제에서는 트리를 펼치거나 표를 채우는 방식이 통하지 않는다. 이 글은 연속 제어에서 model-based RL이 어떻게 작동하는지를, sample 효율의 상징인 **PILCO**부터 **PETS**, **MBPO**까지 세 알고리즘으로 살펴본다. 관통하는 질문은 하나다 — [[posts/foundations/introduction-to-rl/18-learning-the-dynamics-model|모델 오차]]를 어떻게 다룰 것인가.

## PILCO: 불확실성을 끝까지 끌고 가기

**PILCO**(2011)는 model-based RL의 sample 효율이 얼마나 극단적일 수 있는지를 보여준 이정표다. 단 몇 번의 시도, 수십 초 분량의 실제 상호작용만으로 cart-pole 같은 과제를 푼다.

![Cart-pole](https://upload.wikimedia.org/wikipedia/commons/0/00/Cart-pendulum.svg)

*PILCO의 대표 시연 과제인 cart-pole: 카트를 좌우로 밀어 막대를 세운다. PILCO는 이 과제를 수십 초 분량의 실제 경험만으로 푼다. 출처: [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Cart-pendulum.svg)*

비결은 **모델의 불확실성을 무시하지 않고 계획에 그대로 반영**하는 데 있다. PILCO가 최소화하는 것은 horizon $T$ 동안의 기대 비용이다.

$$
J(\theta) = \sum_{t=0}^{T} \mathbb{E}_{s_t \sim p(s_t)}\left[ c(s_t) \right]
$$

여기서 $p(s_t)$는 정책 $\pi_\theta$를 따랐을 때 시점 $t$에 있을 **state의 분포**다. 점 하나가 아니라 분포를 평가한다는 것이 핵심인데, 이 분포는 모델을 통해 한 step씩 전파된다.

$$
p(s_{t+1}) = \iint p(s_{t+1} \mid s_t, a_t)\; \pi_\theta(a_t \mid s_t)\; p(s_t)\; ds_t\, da_t
$$

이 적분은 일반적으로 계산할 수 없다. PILCO의 답은 두 가지 선택의 조합이다.

- 동역학 모델로 **Gaussian Process**(GP)를 쓴다. GP는 데이터가 많은 영역에서는 자신 있게, 데이터가 없는 영역에서는 "잘 모른다"고 큰 분산으로 정직하게 답한다 ([[posts/foundations/introduction-to-rl/18-learning-the-dynamics-model|epistemic uncertainty]]를 자연스럽게 표현).
- 각 $p(s_t)$를 Gaussian $\mathcal{N}(\mu_t, \Sigma_t)$로 근사하고, GP를 통과한 뒤 분포의 평균·분산을 해석적으로 계산해 다시 Gaussian으로 맞춘다(**moment matching**). 그러면 $(\mu_t, \Sigma_t) \to (\mu_{t+1}, \Sigma_{t+1})$이 미분 가능한 닫힌 형태가 되어, 기대 비용의 gradient가 chain rule로 정확히 계산된다.

$$
\frac{\partial J}{\partial \theta} = \sum_{t} \frac{\partial\, \mathbb{E}[c(s_t)]}{\partial (\mu_t, \Sigma_t)} \cdot \frac{\partial (\mu_t, \Sigma_t)}{\partial \theta}
$$

이 구조가 주는 insight는 두 가지다. 첫째, 정책 갱신에 **실제 sample이 하나도 필요 없다** — gradient가 모델을 통해 해석적으로 나오므로, 실제 경험은 GP를 갱신할 때만 쓰인다. 극단적 sample 효율의 원천이다. 둘째, 모델이 불확실한 영역에서는 $\Sigma_t$가 커지고 그것이 기대 비용에 그대로 반영되어, 정책이 함부로 그쪽을 신뢰하지 않게 된다. 모델 오차를 **인정한 채로** 계획하는 것이다. 다만 GP는 데이터 수와 차원이 커지면 계산 비용이 급격히 늘어, 고차원·대규모 문제로 확장하기 어렵다.

> 참고: [PILCO (Deisenroth & Rasmussen, ICML 2011)](https://dblp.org/rec/conf/icml/DeisenrothR11.html)

## PETS: 신경망 ensemble + MPC

**PETS**(2018)는 PILCO의 정신("불확실성을 반영한 계획")을 GP 대신 **신경망**으로 확장해 고차원으로 끌고 간다. 두 축으로 이뤄진다.

**(1) Probabilistic Ensemble 모델.** [[posts/foundations/introduction-to-rl/18-learning-the-dynamics-model|18장]]에서 본 대로, 두 종류의 불확실성을 모두 잡는다.

- 각 network는 다음 state의 **분포**(평균·분산)를 출력한다 → 환경 내재 noise(aleatoric).
- 그런 network를 **여러 개**(ensemble) 둔다 → 데이터 부족에서 오는 모델 무지(epistemic). 모델들이 갈리는 영역이 곧 위험 영역이다.

**(2) MPC(Model Predictive Control)식 계획.** PETS는 정책 network를 따로 학습하지 않는다. 대신 **매 step마다 그 자리에서** 행동을 계획한다. 매 시점 $t$에 푸는 문제는 다음과 같다.

$$
\mathbf{a}_{t:t+H}^{*} = \arg\max_{\mathbf{a}_{t:t+H}}\ \frac{1}{P} \sum_{p=1}^{P} \sum_{k=t}^{t+H} r\left( s_k^{(p)},\, a_k \right), \qquad s_{k+1}^{(p)} \sim \hat{P}_{\theta_{b(p)}}\left( \cdot \mid s_k^{(p)},\, a_k \right)
$$

행동 시퀀스 하나의 가치는 $P$개의 **particle**로 추정한다. 각 particle $p$는 ensemble에서 뽑힌 모델 $b(p)$의 stochastic 출력을 따라 전파되므로, 이 평균에는 환경 noise(각 모델의 분산)와 모델 무지(모델 간 불일치)가 모두 녹아 있다 — 모델들이 갈리는 행동 시퀀스는 추정 보상의 신뢰도가 낮다는 것이 자동으로 드러난다. 실제 절차는 다음과 같다.

1. 현재 state에서 앞으로 $H$ step의 **행동 시퀀스** 후보들을 Gaussian $\mathcal{N}(\mu, \Sigma)$에서 sampling한다.
2. 각 후보를 위 식대로 particle로 굴려 기대 누적 보상을 추정한다.
3. 점수 상위 후보(elite)들로 $\mu, \Sigma$를 다시 적합하고 1–2를 반복한다 — **CEM**(Cross-Entropy Method). 분포가 좋은 시퀀스 주변으로 좁혀진다.
4. 찾은 $\mathbf{a}^{*}$의 **첫 행동만** 실제로 실행하고, 다음 state에서 처음부터 다시 계획한다(receding horizon).

매 step 다시 계획하기 때문에, 모델이 조금 틀려도 그 오차가 누적되기 전에 새 관측으로 경로를 바로잡는다. 모델 불확실성(ensemble)과 잦은 replanning(MPC)이 함께 [[posts/foundations/introduction-to-rl/18-learning-the-dynamics-model|compounding error]]를 억제한다.

> 참고: [PETS (Chua et al., 2018)](https://arxiv.org/abs/1805.12114)

## MBPO: 짧은 rollout으로 모델과 model-free 잇기

**MBPO**(2019)는 "모델을 언제 믿을 것인가"라는 질문에 정면으로 답한다. 제목부터 *When to Trust Your Model*이다. 발상은 [[posts/foundations/introduction-to-rl/19-dyna-and-prioritized-sweeping|Dyna]]와 같지만, compounding error를 정면으로 통제한다.

1. 실제 경험으로 ensemble 동역학 모델을 학습한다.
2. replay buffer에서 뽑은 **실제 state를 출발점**으로, 모델로 아주 **짧은 $k$-step rollout**만 만든다 (긴 궤적은 만들지 않는다).
3. 이 짧은 가상 경험을 model 버퍼에 넣고, 실제 경험과 섞어 **model-free 학습기**([[posts/foundations/introduction-to-rl/13-soft-actor-critic|SAC]])를 학습시킨다.

여기서 2번이 핵심이다. 모델로 horizon 끝까지 길게 상상하면 오차가 폭증하지만, **실제 state에서 출발해 몇 step만** 내다보면 오차가 통제 가능한 범위에 머문다.

MBPO는 이 직관을 정리(theorem)로 만들었다. 실제 state에서 출발하는 $k$-step rollout으로 학습했을 때, 정책의 **실제 성능** $\eta[\pi]$는 모델 위에서 본 성능 $\eta^{\text{branch}}[\pi]$에서 많아야 다음만큼만 깎인다.

$$
\eta[\pi] \;\ge\; \eta^{\text{branch}}[\pi] \;-\; 2 r_{\max} \left[ \frac{\gamma^{k+1}\, \epsilon_\pi}{(1-\gamma)^2} \;+\; \frac{\gamma^{k}\, \epsilon_\pi}{1-\gamma} \;+\; \frac{k\, \epsilon_{m'}}{1-\gamma} \right]
$$

여기서 $\epsilon_\pi$는 데이터를 모은 정책 $\pi_D$와 현재 정책 $\pi$의 거리 $\max_s D_{TV}\left(\pi \,\Vert\, \pi_D\right)$이고, $\epsilon_{m'}$은 **현재 정책 아래에서의** 모델 한 step 오차다. 이 부등식을 읽는 법:

- 마지막 항 $k\, \epsilon_{m'} / (1-\gamma)$만 rollout 길이 $k$에 **비례해 커진다**. [[posts/foundations/introduction-to-rl/18-learning-the-dynamics-model|compounding error]]가 성능 손실의 언어로 번역된 항이다.
- 앞의 두 항은 반대로 $\gamma^k$을 타고 **$k$와 함께 줄어든다**. 모델 rollout을 쓸수록 낡은 실제 데이터(다른 정책이 모은)에 덜 의존하게 되는 이득이다.
- 따라서 손실을 최소화하는 최적 rollout 길이 $k^{*}$가 존재하고, **모델 오차 $\epsilon_{m'}$이 충분히 작을 때만 $k^{*} > 0$이다**. "모델을 조금은 믿는 것이 이득이 되는 조건"이 수식으로 나온 것이다.

그 결과 MBPO는 model-free SAC의 안정적 성능을 유지하면서 sample 효율을 크게 끌어올렸다. 알고리즘 간 학습 곡선 비교는 [[posts/foundations/introduction-to-rl/24-when-is-model-based-better|24장]]의 그림에서 볼 수 있다.

> 참고: [MBPO (Janner et al., 2019)](https://arxiv.org/abs/1906.08253)

## 정리

세 알고리즘은 모두 같은 적(모델 오차)과 싸우지만 무기가 다르다. PILCO는 불확실성을 **해석적으로 계획에 전파**하고, PETS는 **ensemble + 잦은 MPC replanning**으로 오차가 쌓이기 전에 바로잡으며, MBPO는 **짧은 rollout**으로 신뢰 구간 안에서만 모델을 쓴다. 셋 다 "모델을 얼마나, 어디까지 믿을지"를 다르게 설계한 답이라는 점에서, [[posts/foundations/introduction-to-rl/18-learning-the-dynamics-model|모델 학습]]의 근본 긴장을 그대로 보여준다. 다음 글에서는 모델을 아예 **압축된 latent 공간**에 세우는 world model 계열로 넘어간다.
