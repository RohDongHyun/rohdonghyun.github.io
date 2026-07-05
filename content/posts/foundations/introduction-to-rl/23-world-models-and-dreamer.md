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
- **C (Controller)**: $z$와 RNN의 hidden state $h$를 받아 행동을 내는 아주 작은(선형) 정책. parameter가 적어 진화 전략(CMA-ES) 같은 단순한 방법으로도 학습된다.

![World Models의 V-M-C 구조](https://worldmodels.github.io/assets/world_model_schematic.svg)

*관측 픽셀은 V(VAE)에서 $z$로 압축되고, M(MDN-RNN)이 $z$의 동역학을 추적하며, C는 $z$와 $h$만 보고 행동을 낸다. 무거운 인식·예측은 world model(점선 상자)이, 가벼운 의사결정은 C가 맡는 분업 구조다. 출처: [World Models interactive article](https://worldmodels.github.io/)*

가장 인상적인 결과는, **C를 실제 환경이 아니라 M이 만든 "꿈"(학습된 world model) 안에서 학습**시킨 뒤 실제 환경으로 옮겨도 잘 동작했다는 점이다. 무거운 인식(V)과 동역학(M)을 미리 학습해두면, 정작 의사결정(C)은 값싼 상상 속에서 배울 수 있다는 것을 보였다.

> 참고: [World Models (Ha & Schmidhuber, 2018)](https://arxiv.org/abs/1803.10122)

## Dreamer: latent imagination으로 행동을 학습하다

**Dreamer**(2019)는 이 아이디어를 end-to-end로 다듬어 현대 model-based RL의 표준 골격을 세웠다. 두 가지가 핵심이다.

![Dreamer의 세 단계](https://ar5iv.labs.arxiv.org/html/1912.01603/assets/x1.png)

*Dreamer의 구성 요소: (위) 실제 경험 데이터셋 → (가운데) latent 동역학 모델 학습 → (아래) latent 상상 속에서 value와 action 학습. 출처: [Dreamer 논문](https://arxiv.org/abs/1912.01603)*

**(1) 잠재 동역학 모델(RSSM).** 픽셀 관측을 latent state로 인코딩하고, 그 latent 공간에서 다음 state·보상을 예측하는 모델을 학습한다. **RSSM**(Recurrent State-Space Model)은 state를 결정적 부분과 확률적 부분으로 나눠 유지한다.

$$
\begin{aligned}
&\text{recurrent state:} && h_t = f_\phi\left( h_{t-1}, z_{t-1}, a_{t-1} \right) \\
&\text{prior:} && \hat{z}_t \sim p_\phi\left( \hat{z}_t \mid h_t \right) \\
&\text{posterior:} && z_t \sim q_\phi\left( z_t \mid h_t, o_t \right)
\end{aligned}
$$

$h_t$는 과거를 요약하는 결정적 기억, prior $\hat{z}_t$는 **관측 없이** 다음 latent를 예측한 것, posterior $z_t$는 실제 관측 $o_t$까지 반영해 얻은 latent다.

여기에 latent에서 관측·보상을 복원하는 decoder $p_\phi(o_t \mid h_t, z_t)$, $p_\phi(r_t \mid h_t, z_t)$가 붙고, 전체는 VAE처럼 ELBO 형태의 손실로 학습된다.

$$
\mathcal{L}(\phi) = \mathbb{E} \left[ \sum_t \Big( -\ln p_\phi\left(o_t \mid h_t, z_t\right) - \ln p_\phi\left(r_t \mid h_t, z_t\right) + \beta\, D_{\mathrm{KL}}\Big[ q_\phi\left(z_t \mid h_t, o_t\right) \,\Big\Vert\, p_\phi\left(\hat{z}_t \mid h_t\right) \Big] \Big) \right]
$$

주목할 것은 KL 항의 역할이다. 관측을 본 posterior와 관측 없이 예측한 prior를 가깝게 만드는데, 이는 곧 **prior가 "다음에 무엇을 보게 될지"를 관측 없이 맞히도록** 훈련시키는 것이다. 그래서 상상 rollout은 $h_t \to \hat{z}_t \to h_{t+1} \to \cdots$처럼 prior만으로 진행할 수 있다 — 픽셀을 한 장도 생성하지 않고 미래를 시뮬레이션하는 것이다. 무거운 decoder는 학습 신호를 줄 때만 쓰인다.

**(2) Latent imagination으로 actor-critic 학습.** Dreamer는 학습된 모델 안에서 latent 궤적을 상상으로 $H$ step 펼치고, 그 위에서 [[posts/foundations/introduction-to-rl/09-actor-critic-policy-gradient|actor-critic]]을 학습한다. 상상 궤적의 가치는 [[posts/foundations/introduction-to-rl/11-generalized-advantage-estimation|GAE]]에서 본 것과 같은 정신의 **$\lambda$-return**으로 추정한다.

$$
V^{\lambda}(s_\tau) = \hat{r}_\tau + \gamma \Big( (1 - \lambda)\, v_\psi(s_{\tau+1}) + \lambda\, V^{\lambda}(s_{\tau+1}) \Big), \qquad V^{\lambda}(s_{\tau+H}) = v_\psi(s_{\tau+H})
$$

$\lambda = 0$이면 한 step 만에 critic으로 bootstrap하는 편향 큰 추정, $\lambda = 1$이면 상상 horizon 끝까지의 보상을 다 쓰는 분산 큰 추정이고, 그 사이를 섞는다. actor와 critic의 목적은 다음과 같다.

$$
\max_{\theta}\ \mathbb{E}\left[ \sum_{\tau=t}^{t+H} V^{\lambda}(s_\tau) \right], \qquad \min_{\psi}\ \mathbb{E}\left[ \sum_{\tau=t}^{t+H} \frac{1}{2} \left( v_\psi(s_\tau) - \operatorname{sg}\left( V^{\lambda}(s_\tau) \right) \right)^2 \right]
$$

($\operatorname{sg}$는 stop-gradient — critic은 target을 따라가기만 한다.) 결정적인 것은 actor의 gradient 경로다. $V^{\lambda}$ 안의 보상과 state들은 모두 **미분 가능한 학습된 동역학**을 통해 정책의 행동에 연결되어 있으므로, 가치의 gradient가 모델을 거슬러 정책 parameter까지 **직접**(analytic gradient) 흘러간다. [[posts/foundations/introduction-to-rl/08-monte-carlo-policy-gradient|REINFORCE]]식 score function 추정보다 분산이 훨씬 낮은 학습 신호를 얻는 것이다.

이 점이 [[posts/foundations/introduction-to-rl/22-model-based-continuous-control|앞 글]]의 방식들과 갈린다. PETS는 정책 없이 매번 MPC로 행동을 탐색하고, MBPO는 모델 rollout을 model-free SAC에 먹였다. Dreamer는 **학습된 latent 모델을 통해 gradient를 역전파**하며 정책을 직접 학습한다. 실제 환경 상호작용은 데이터 수집에만 쓰고, 행동 개선은 거의 전부 상상 속에서 일어난다.

## v1 → v2 → v3: 점점 범용으로

Dreamer는 세 세대를 거치며 적용 범위를 크게 넓혔다.

- **DreamerV1**(2019): 픽셀 기반 연속 제어를 latent imagination으로 풀어, 같은 과제에서 당시 model-free 기법에 필적하거나 앞서면서 sample 효율을 크게 높였다.
- **DreamerV2**(2020): latent를 **이산(categorical)** 표현으로 바꿔, world model 기반 agent로는 처음으로 Atari 벤치마크에서 인간 수준 성능에 도달했다. 그것도 단일 GPU로.
- **DreamerV3**(2023): **고정된 hyperparameter 설정 하나로** 제어·Atari·내비게이션 등 150여 개의 다양한 과제를 두루 풀어내며 범용성과 안정성을 입증했다. 특히 인간 데이터 없이 밑바닥부터 학습해 Minecraft에서 다이아몬드를 캐낸 결과로 주목받았다.

> 참고: [Dreamer (Hafner et al., 2019)](https://arxiv.org/abs/1912.01603) · [DreamerV2](https://arxiv.org/abs/2010.02193) · [DreamerV3](https://arxiv.org/abs/2301.04104)

## 정리

World model 계열은 "고차원 환경을 압축한 latent 공간에서 모델을 세우고, 그 안에서 상상으로 행동을 학습한다"는 발상을 공유한다. *World Models*가 "꿈속 학습"이 가능함을 보였고, Dreamer는 미분 가능한 latent 모델을 통해 actor-critic을 상상으로 학습하는 틀을 완성해 점점 범용 agent로 나아갔다. [[posts/foundations/introduction-to-rl/21-alphago-alphazero-muzero|MuZero]]가 "계획에 필요한 양만 예측하는 latent 모델"이었다면, Dreamer는 "행동을 상상으로 학습하기 위한 latent 모델"이라는 점에서 현대 model-based RL의 두 큰 줄기를 이룬다.
