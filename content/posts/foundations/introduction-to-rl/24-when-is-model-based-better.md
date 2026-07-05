---
title: 24. Model-based는 언제 유리한가
date: 2026-06-30
tags:
  - Reinforcement Learning
---
[[posts/foundations/introduction-to-rl/18-learning-the-dynamics-model|18장]]부터 [[posts/foundations/introduction-to-rl/23-world-models-and-dreamer|23장]]까지 model-based RL의 여러 알고리즘을 살펴봤다. 그렇다면 실제 문제 앞에서 model-based와 model-free 중 무엇을 골라야 할까? 이 글은 둘의 trade-off를 정리하고, 현대 기법들이 어떻게 그 경계를 흐려 왔는지를 본다.

## 핵심 trade-off: 효율 vs. 점근 성능

두 접근의 차이는 결국 **sample efficiency**(적은 경험으로 얼마나 빨리 배우나)와 **asymptotic performance**(무한히 학습했을 때 최종 도달 성능) 사이의 절충으로 요약된다.

- **Model-based**는 경험으로 모델을 세우고 그 안에서 값싼 상상 경험을 무한히 만들어 쓰므로, **초반에 가파르게** 배운다. 실제 상호작용이 비싼 문제(로봇, 실제 공정)에서 결정적 이점이다.
- **Model-free**는 경험을 value/policy에 직접 쓴다. 느리지만 **모델 오차라는 천장이 없어**, 충분한 데이터가 주어지면 보통 더 높은 최종 성능에 도달한다.

이 대비의 뿌리는 [[posts/foundations/introduction-to-rl/18-learning-the-dynamics-model|모델 오차]]다. Model-based는 "모델"이라는 지렛대로 효율을 얻는 대신, 그 모델이 틀린 만큼 성능에 상한이 생긴다. Model-free는 지렛대가 없어 느리지만 환경의 진짜 신호만 보므로 편향이 없다.

"모델이 틀린 만큼"은 정량화할 수 있다. [[posts/foundations/introduction-to-rl/22-model-based-continuous-control|MBPO]]의 분석에 따르면, 모델 위에서 측정한 정책의 성능 $\hat{\eta}[\pi]$와 실제 성능 $\eta[\pi]$의 gap은 다음처럼 제한된다.

$$
\eta[\pi] \;\ge\; \hat{\eta}[\pi] \;-\; \underbrace{\left( \frac{2\gamma\, r_{\max} \left( \epsilon_m + 2 \epsilon_\pi \right)}{(1-\gamma)^2} + \frac{4 r_{\max}\, \epsilon_\pi}{1-\gamma} \right)}_{C(\epsilon_m,\ \epsilon_\pi)}
$$

$\epsilon_m$은 모델의 한 step 예측 오차, $\epsilon_\pi$는 데이터를 모은 정책에서 현재 정책이 벗어난 정도다. 이 식이 위의 trade-off를 그대로 담고 있다.

- 모델 안에서 성능 $\hat{\eta}$를 아무리 끌어올려도, 실제 성능은 $C$만큼 낮을 수 있다. **$C$가 곧 model-based의 천장**이고, $\epsilon_m \to 0$일 때만 천장이 사라진다.
- $C$의 분모 $(1-\gamma)^2$는 유효 horizon의 제곱 스케일이다. 한 step 오차가 horizon을 따라 누적된다는 [[posts/foundations/introduction-to-rl/18-learning-the-dynamics-model|compounding error]]가 성능의 언어로 번역된 것이다.
- 반대로 $C$가 작게 유지되는 한, 모델 안의 개선은 실제 개선을 보증한다. 모델을 "신뢰 구간 안에서만" 쓰라는 처방의 이론적 근거다.

> 한 줄 요약: **실제 경험이 비쌀수록 model-based가, 시뮬레이션이 값싸고 데이터가 무한할수록 model-free가 유리**하다. 그래서 게임(값싼 시뮬레이터)에서는 model-free가 오래 강세였고, 실물 로봇에서는 model-based가 빛난다.

이 trade-off는 학습 곡선에서 눈으로 확인할 수 있다.

![알고리즘별 학습 곡선 비교](https://ar5iv.labs.arxiv.org/html/1906.08253/assets/x2.png)

*연속 제어 벤치마크의 학습 곡선 (MBPO와 5개 baseline). 하이브리드인 MBPO(파랑)는 model-free인 SAC(초록)·PPO(보라)보다 훨씬 적은 step으로 같은 성능에 도달한다(sample efficiency) — 예컨대 Ant에서 MBPO의 30만 step 성능은 SAC의 300만 step 성능과 맞먹는다. 순수 MPC 계열인 PETS(주황)는 InvertedPendulum 같은 쉬운 과제에서는 가장 빠르지만, Hopper·Walker2d·Ant처럼 dynamics가 어려운 과제에서는 낮은 성능에서 정체된다 — 모델 오차의 천장이다. 출처: [Janner et al. (2019)](https://arxiv.org/abs/1906.08253) Figure 2*

## 무엇이 model-based를 어렵게 만드나

Model-based가 늘 이기지 못하는 이유는 분명하다.

- **모델 학습 자체가 어렵다.** 동역학이 복잡하거나 고차원이면 정확한 모델을 얻기 힘들다.
- **[[posts/foundations/introduction-to-rl/18-learning-the-dynamics-model|Compounding error]].** 한 step 오차가 rollout을 따라 누적돼, 길게 내다볼수록 계획이 환상에 빠진다.
- **Model exploitation.** 계획은 모델이 좋다고 말하는 행동을 고르는데, 모델이 안 가본 영역을 근거 없이 좋다고 착각하면 그 허점을 파고든다.

흥미롭게도 앞 글들에서 본 처방은 대부분 이 문제들에 대한 답이었다. [[posts/foundations/introduction-to-rl/22-model-based-continuous-control|PILCO]]의 불확실성 전파, PETS의 ensemble + 잦은 MPC replanning, MBPO의 짧은 rollout, Dreamer의 latent 모델은 모두 "모델 오차를 어떻게 통제하며 그 이점만 취할까"에 대한 서로 다른 설계다.

## 스펙트럼으로 보기

Model-based와 model-free는 양자택일이 아니라 **연속적인 스펙트럼**으로 보는 편이 정확하다. "모델을 얼마나, 어디에 쓰는가"의 정도 차이일 뿐이다.

- **순수 계획(MPC)** — [[posts/foundations/introduction-to-rl/22-model-based-continuous-control|PETS]]: value/policy를 거의 학습하지 않고 매 순간 모델로 행동을 탐색한다. 모델 의존도가 가장 높다.
- **Background planning(Dyna류)** — [[posts/foundations/introduction-to-rl/19-dyna-and-prioritized-sweeping|Dyna]], [[posts/foundations/introduction-to-rl/22-model-based-continuous-control|MBPO]]: 모델이 만든 데이터로 model-free 학습기를 돕는다. 모델과 model-free의 중간.
- **Decision-time planning + 학습** — [[posts/foundations/introduction-to-rl/21-alphago-alphazero-muzero|AlphaZero·MuZero]]: 학습된 value/policy를 MCTS 계획으로 매번 개선한다.
- **순수 model-free** — [[posts/foundations/introduction-to-rl/13-soft-actor-critic|SAC]], [[posts/foundations/introduction-to-rl/10-proximal-policy-optimization|PPO]]: 모델 없이 경험으로 직접 학습한다.

오른쪽으로 갈수록 단순하고 편향이 없지만 느리고, 왼쪽으로 갈수록 효율적이지만 모델 품질에 민감하다.

## 하이브리드가 경계를 흐린다

최근 성공작들은 대부분 **양쪽의 장점을 섞은 하이브리드**다. 명확한 두 사례가 이미 앞 글에 있었다.

- **MBPO**는 model-based로 데이터를 값싸게 늘리되, 학습 자체는 model-free([[posts/foundations/introduction-to-rl/13-soft-actor-critic|SAC]])에 맡긴다. 모델은 sample 효율을 위한 보조 장치이고, 최종 성능은 model-free가 책임진다. "효율은 model-based에서, 점근 성능은 model-free에서" 가져오는 전형이다.
- **MuZero**는 학습된 latent 모델로 계획(MCTS)하되, 그 계획 결과로 다시 policy/value network를 학습한다. 계획과 학습이 서로를 강화한다.

즉 "model-based냐 model-free냐"라는 이분법은 점점 의미가 옅어지고, **제한된 실제 경험을 어디에 — 모델 학습에, 직접 학습에, 계획에 — 얼마나 배분할 것인가**라는 설계 문제로 수렴하고 있다.

## 정리

Model-based RL의 매력은 sample 효율이고, 약점은 모델 오차에서 오는 편향이다. 실제 경험이 비싼 문제일수록 모델의 지렛대가 값지지만, 모델이 틀린 만큼 대가를 치른다. 그래서 현대의 흐름은 둘 중 하나를 고르기보다, 모델을 **신뢰할 수 있는 범위 안에서만** 활용해 효율을 얻고 나머지는 실제 경험과 model-free 학습으로 메우는 하이브리드로 향한다. 이 시리즈에서 본 Dyna, MCTS/MuZero, PILCO·PETS·MBPO, Dreamer는 모두 그 균형점을 다르게 잡은 답들이다.
