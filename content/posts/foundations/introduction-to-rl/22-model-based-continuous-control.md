---
title: 22. 연속 제어를 위한 Model-based RL
date: 2026-06-30
tags:
  - Reinforcement Learning
---
지금까지의 [[posts/foundations/introduction-to-rl/19-dyna-and-prioritized-sweeping|Dyna]]·[[posts/foundations/introduction-to-rl/20-monte-carlo-tree-search|MCTS]]는 주로 이산적이고 셀 수 있는 환경을 다뤘다. 하지만 로봇 팔이나 보행처럼 **연속적인 state·action**을 가진 제어 문제에서는 트리를 펼치거나 표를 채우는 방식이 통하지 않는다. 이 글은 연속 제어에서 model-based RL이 어떻게 작동하는지를, sample 효율의 상징인 **PILCO**부터 **PETS**, **MBPO**까지 세 알고리즘으로 살펴본다. 관통하는 질문은 하나다 — [[posts/foundations/introduction-to-rl/18-learning-the-dynamics-model|모델 오차]]를 어떻게 다룰 것인가.

## PILCO: 불확실성을 끝까지 끌고 가기

**PILCO**(2011)는 model-based RL의 sample 효율이 얼마나 극단적일 수 있는지를 보여준 이정표다. 단 몇 번의 시도, 수십 초 분량의 실제 상호작용만으로 cart-pole 같은 과제를 푼다.

비결은 **모델의 불확실성을 무시하지 않고 계획에 그대로 반영**하는 데 있다.

- 동역학 모델로 **Gaussian Process**(GP)를 쓴다. GP는 데이터가 많은 영역에서는 자신 있게, 데이터가 없는 영역에서는 "잘 모른다"고 큰 분산으로 정직하게 답한다 ([[posts/foundations/introduction-to-rl/18-learning-the-dynamics-model|epistemic uncertainty]]를 자연스럽게 표현).
- 정책을 평가할 때, 한 점이 아니라 **상태의 분포**를 horizon 동안 모델로 전파한다(moment matching). 그 결과 기대 비용을 **해석적으로** 계산하고, 그 gradient로 정책 parameter를 직접 최적화한다.

핵심은, 모델이 불확실한 영역에서는 그 불확실성이 비용에 반영되어 정책이 함부로 그쪽을 신뢰하지 않게 된다는 것이다. 모델 오차를 **인정한 채로** 계획하므로 적은 데이터로도 안정적이다. 다만 GP는 데이터 수와 차원이 커지면 계산 비용이 급격히 늘어, 고차원·대규모 문제로 확장하기 어렵다.

> 참고: PILCO (Deisenroth & Rasmussen, ICML 2011)

## PETS: 신경망 앙상블 + MPC

**PETS**(2018)는 PILCO의 정신("불확실성을 반영한 계획")을 GP 대신 **신경망**으로 확장해 고차원으로 끌고 간다. 두 축으로 이뤄진다.

**(1) Probabilistic Ensemble 모델.** [[posts/foundations/introduction-to-rl/18-learning-the-dynamics-model|18장]]에서 본 대로, 두 종류의 불확실성을 모두 잡는다.

- 각 network는 다음 state의 **분포**(평균·분산)를 출력한다 → 환경 내재 noise(aleatoric).
- 그런 network를 **여러 개**(ensemble) 둔다 → 데이터 부족에서 오는 모델 무지(epistemic). 모델들이 갈리는 영역이 곧 위험 영역이다.

**(2) MPC(Model Predictive Control)식 계획.** PETS는 정책 network를 따로 학습하지 않는다. 대신 **매 step마다 그 자리에서** 행동을 계획한다.

1. 현재 state에서 앞으로 $H$ step의 **행동 시퀀스** 여러 개를 후보로 놓는다.
2. 각 후보를 probabilistic ensemble 모델로 굴려 기대 누적 보상을 추정한다.
3. **CEM**(Cross-Entropy Method) 같은 sampling 최적화로 가장 좋은 시퀀스를 찾는다.
4. 그 시퀀스의 **첫 행동만** 실제로 실행하고, 다음 state에서 1번부터 다시 계획한다(receding horizon).

매 step 다시 계획하기 때문에, 모델이 조금 틀려도 그 오차가 누적되기 전에 새 관측으로 경로를 바로잡는다. 모델 불확실성(ensemble)과 잦은 replanning(MPC)이 함께 [[posts/foundations/introduction-to-rl/18-learning-the-dynamics-model|compounding error]]를 억제한다.

> 참고: [PETS (Chua et al., 2018)](https://arxiv.org/abs/1805.12114)

## MBPO: 짧은 rollout으로 모델과 model-free 잇기

**MBPO**(2019)는 "모델을 언제 믿을 것인가"라는 질문에 정면으로 답한다. 제목부터 *When to Trust Your Model*이다. 발상은 [[posts/foundations/introduction-to-rl/19-dyna-and-prioritized-sweeping|Dyna]]와 같지만, compounding error를 정면으로 통제한다.

1. 실제 경험으로 ensemble 동역학 모델을 학습한다.
2. replay buffer에서 뽑은 **실제 state를 출발점**으로, 모델로 아주 **짧은 $k$-step rollout**만 만든다 (긴 궤적은 만들지 않는다).
3. 이 짧은 가상 경험을 model 버퍼에 넣고, 실제 경험과 섞어 **model-free 학습기**([[posts/foundations/introduction-to-rl/13-soft-actor-critic|SAC]])를 학습시킨다.

여기서 2번이 핵심이다. 모델로 horizon 끝까지 길게 상상하면 오차가 폭증하지만, **실제 state에서 출발해 몇 step만** 내다보면 오차가 통제 가능한 범위에 머문다. MBPO는 rollout 길이와 모델 오차·성능의 관계를 이론적으로 분석해, "짧은 rollout을 자주" 쓰는 것이 좋은 절충임을 보였다. 그 결과 model-free SAC의 안정적 성능을 유지하면서 sample 효율을 크게 끌어올렸다.

> 참고: [MBPO (Janner et al., 2019)](https://arxiv.org/abs/1906.08253)

## 정리

세 알고리즘은 모두 같은 적(모델 오차)과 싸우지만 무기가 다르다. PILCO는 불확실성을 **해석적으로 계획에 전파**하고, PETS는 **앙상블 + 잦은 MPC replanning**으로 오차가 쌓이기 전에 바로잡으며, MBPO는 **짧은 rollout**으로 신뢰 구간 안에서만 모델을 쓴다. 셋 다 "모델을 얼마나, 어디까지 믿을지"를 다르게 설계한 답이라는 점에서, [[posts/foundations/introduction-to-rl/18-learning-the-dynamics-model|모델 학습]]의 근본 긴장을 그대로 보여준다. 다음 글에서는 모델을 아예 **압축된 latent 공간**에 세우는 world model 계열로 넘어간다.
