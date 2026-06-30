---
title: 23. World Models와 Dreamer
date: 2026-06-30
tags:
  - Reinforcement Learning
---
[[posts/foundations/introduction-to-rl/22-model-based-continuous-control|연속 제어]]에서 본 PETS·MBPO는 관측 공간에서 직접 모델을 굴렸다. 하지만 입력이 고해상도 이미지라면, 픽셀 단위로 다음 화면을 예측하는 것은 비효율적이고 어렵다. **World model** 계열은 발상을 바꾼다 — 환경을 **압축된 latent 공간**으로 인코딩하고, 그 작은 공간 안에서 모델을 세워 "상상만으로" 행동을 학습한다. 이 글은 그 출발점인 *World Models*와, 오늘날의 대표 주자 **Dreamer** 시리즈를 다룬다.

## World Models: 꿈속에서 학습하기

Ha & Schmidhuber의 *World Models*(2018)는 환경을 세 모듈로 분해했다.

- **V (Vision)**: [[posts/foundations/introduction-to-dl/12-variational-autoencoders|VAE]]로 각 화면을 저차원 latent vector $z$로 압축한다. 고차원 픽셀을 "장면의 요약"으로 줄인다.
- **M (Memory)**: RNN(MDN-RNN)으로 $z$의 동역학을 학습한다. 현재 latent와 행동으로 **다음 latent의 분포** $P(z_{t+1} \mid z_t, a_t, h_t)$를 예측한다. 이 모듈이 곧 "world model"이다.
- **C (Controller)**: $z$와 RNN의 hidden state $h$를 받아 행동을 내는 아주 작은(선형) 정책. 파라미터가 적어 진화 전략(CMA-ES) 같은 단순한 방법으로도 학습된다.

가장 인상적인 결과는, **C를 실제 환경이 아니라 M이 만든 "꿈"(학습된 world model) 안에서 학습**시킨 뒤 실제 환경으로 옮겨도 잘 동작했다는 점이다. 무거운 인식(V)과 동역학(M)을 미리 학습해두면, 정작 의사결정(C)은 값싼 상상 속에서 배울 수 있다는 것을 보였다.

> 참고: [World Models (Ha & Schmidhuber, 2018)](https://arxiv.org/abs/1803.10122)

## Dreamer: latent imagination으로 행동을 학습하다

**Dreamer**(2019)는 이 아이디어를 end-to-end로 다듬어 현대 model-based RL의 표준 골격을 세웠다. 두 가지가 핵심이다.

**(1) 잠재 동역학 모델(RSSM).** 픽셀 관측을 latent state로 인코딩하고, 그 latent 공간에서 다음 state·보상을 예측하는 모델을 학습한다. 이후의 모든 계획은 이 latent 공간 안에서 이뤄지므로, 무거운 픽셀을 매번 만들 필요가 없다.

**(2) Latent imagination으로 actor-critic 학습.** Dreamer는 학습된 모델 안에서 latent 궤적을 **상상**으로 펼치고, 그 상상 궤적 위에서 [[posts/foundations/introduction-to-rl/09-actor-critic-policy-gradient|actor-critic]]을 학습한다.

- **critic**(value)은 상상 궤적의 누적 보상을 추정한다.
- **actor**(policy)는 그 가치를 높이도록 갱신되는데, 결정적으로 **학습된 동역학이 미분 가능**하다는 점을 활용한다. 가치의 gradient를 모델을 거쳐 정책으로 직접 흘려보내(analytic gradient) 효율적으로 정책을 개선한다.

이 점이 [[posts/foundations/introduction-to-rl/22-model-based-continuous-control|앞 글]]의 방식들과 갈린다. PETS는 정책 없이 매번 MPC로 행동을 탐색하고, MBPO는 모델 rollout을 model-free SAC에 먹였다. Dreamer는 **학습된 latent 모델을 통해 gradient를 역전파**하며 정책을 직접 학습한다. 실제 환경 상호작용은 데이터 수집에만 쓰고, 행동 개선은 거의 전부 상상 속에서 일어난다.

## v1 → v2 → v3: 점점 범용으로

Dreamer는 세 세대를 거치며 적용 범위를 크게 넓혔다.

- **DreamerV1**(2019): 픽셀 기반 연속 제어를 latent imagination으로 풀어, 같은 과제에서 당시 model-free 기법에 필적하거나 앞서면서 sample 효율을 크게 높였다.
- **DreamerV2**(2020): latent를 **이산(categorical)** 표현으로 바꿔, world model 기반 agent로는 처음으로 Atari 벤치마크에서 인간 수준 성능에 도달했다. 그것도 단일 GPU로.
- **DreamerV3**(2023): **고정된 하이퍼파라미터 하나로** 제어·Atari·내비게이션 등 150여 개의 다양한 과제를 두루 풀어내며 범용성과 안정성을 입증했다. 특히 인간 데이터 없이 밑바닥부터 학습해 Minecraft에서 다이아몬드를 캐낸 결과로 주목받았다.

> 참고: [Dreamer (Hafner et al., 2019)](https://arxiv.org/abs/1912.01603) · [DreamerV2](https://arxiv.org/abs/2010.02193) · [DreamerV3](https://arxiv.org/abs/2301.04104)

## 정리

World model 계열은 "고차원 환경을 압축한 latent 공간에서 모델을 세우고, 그 안에서 상상으로 행동을 학습한다"는 발상을 공유한다. *World Models*가 "꿈속 학습"이 가능함을 보였고, Dreamer는 미분 가능한 latent 모델을 통해 actor-critic을 상상으로 학습하는 틀을 완성해 점점 범용 agent로 나아갔다. [[posts/foundations/introduction-to-rl/21-alphago-alphazero-muzero|MuZero]]가 "계획에 필요한 양만 예측하는 latent 모델"이었다면, Dreamer는 "행동을 상상으로 학습하기 위한 latent 모델"이라는 점에서 현대 model-based RL의 두 큰 줄기를 이룬다.
