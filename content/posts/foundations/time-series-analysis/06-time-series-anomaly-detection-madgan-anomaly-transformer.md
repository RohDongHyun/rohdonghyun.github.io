---
title: 06. 시계열 이상 탐지 (2) - MAD-GAN과 Anomaly Transformer
date: 2026-06-20
tags:
  - Time Series Analysis
private: false
---
[[posts/foundations/time-series-analysis/05-time-series-anomaly-detection-lstmae-usad|5편]]에서 autoencoder 기반 이상 탐지(LSTM-AE, USAD)를 다뤘다. 이번에는 [[posts/foundations/introduction-to-dl/13-generative-adversarial-network|GAN]] 기반의 **MAD-GAN**과 [[posts/foundations/introduction-to-dl/11-transformer-and-self-attention|Transformer]] 기반의 **Anomaly Transformer**를 살펴본다.

## MAD-GAN

[MAD-GAN (Li et al., ICANN 2019)](https://link.springer.com/chapter/10.1007/978-3-030-30490-4_56)은 GAN을 다변량 시계열 이상 탐지에 적용한 모델이다.

### 핵심 아이디어

핵심 가정은 다음과 같다.

> **정상 데이터로 학습된 GAN의 discriminator는, anomaly 데이터를 가짜(fake) 데이터로 판단할 것이다.**

정상 패턴만 진짜로 인정하도록 배운 discriminator에게는, 이상 데이터가 generator가 만든 가짜처럼 어색하게 보인다는 논리다. MAD-GAN은 generator와 discriminator 모두 [[posts/foundations/introduction-to-dl/08-lstm-and-gru|LSTM]]을 사용한다.

### 학습 과정

학습 자체는 일반적인 GAN과 같다. 정상 학습 데이터로 generator($G$)와 discriminator($D$)를 적대적으로 학습시킨다. generator는 random latent space에서 뽑은 벡터로 그럴듯한 시계열을 만들고, discriminator는 진짜 데이터와 generator의 가짜 데이터를 구별하도록 학습한다.

### 탐지 과정 1: Latent 벡터로의 역매핑

탐지 단계는 두 부분으로 나뉜다. 먼저 검사할 데이터 $X_{test}$를 학습 때 사용된 latent 공간의 벡터 $z^*$로 변환(invert mapping)해야 한다. GAN의 generator는 latent → 데이터 방향만 알고 있어서, 그 역방향을 **최적화로** 찾는다.

1. 표준정규분포 $N(0, I)$에서 임의로 $z$를 생성한다.
2. generator에 $z$를 넣어 시계열 $G(z)$를 생성한다.
3. 생성된 $G(z)$와 변환하려는 $X_{test}$ 사이의 **L1 loss**를 계산한다.
4. 이 L1 loss를 줄이는 방향으로 $z$를 **gradient descent로 업데이트**한다.
5. L1 loss가 threshold보다 작아질 때까지 2)로 돌아가 반복한다.

이렇게 얻은 최적 $z^*$는 "$X_{test}$를 가장 잘 재현하는 latent 벡터"다. (원 논문 실험에서 $z^*$의 차원은 15로 설정했다.)

### 탐지 과정 2: Anomaly Score 계산

이제 $z^*$와 generator로 reconstruction을 수행하고, **reconstruction error와 discriminator loss의 가중합**을 이상 score로 사용한다.

$$
\text{Anomaly Score} = \lambda  | G(z^*) - X_{test} | + (1 - \lambda)(-\log D(X_{test}))
$$

- 첫 항 $|G(z^*) - X_{test}|$은 reconstruction error다. 이상 데이터일수록 generator가 잘 재현하지 못해 커진다.
- 둘째 항 $-\log D(X_{test})$은 discriminator 관점의 점수다. discriminator가 $X_{test}$를 가짜라고 판단할수록(=$D$ 값이 작을수록) 커진다.
- $\lambda$는 두 항의 비중을 정하는 hyperparameter다.

## Anomaly Transformer

[Anomaly Transformer (Xu et al., ICLR 2022)](https://arxiv.org/abs/2110.02642)는 attention의 연관성 구조 자체를 이상 탐지 신호로 활용한 모델이다.

### Motivation: 정상과 이상의 연관성 차이

저자들은 시계열에서 정상점과 이상점이 다른 *연관성(association)* 패턴을 보인다는 데 주목했다.

- **정상 데이터**: series 내 데이터들과 *전체적으로 고르게* 높은 연관성을 가진다. (series의 대부분이 정상이므로, 멀리 있는 정상점들과도 비슷한 패턴을 공유한다.)
- **이상 데이터**: series 내에서 *자신과 시간적으로 가까운 곳들과만* 높은 연관성을 가진다. (이상은 드물고 갑작스러워서, 멀리 있는 데이터와는 패턴이 닮지 않고 바로 주변과만 비슷하다.)

이 차이를 정량화하기 위해 세 가지 지표 **series association**, **prior association**, **association discrepancy**를 제안한다. 모델 구조는 Transformer이고 reconstruction loss로 학습한다.

### Series Association $S_i$

**Series association** $S_i \in \mathbb{R}^N$는 Transformer 내부에서 데이터 $x_i$가 갖는 **attention score** $A_i \in \mathbb{R}^N$를 그대로 사용한 것이다. $A_i$는 $x_i$가 전체 $(x_1, x_2, \ldots, x_N)$과 갖는 연관성을 나타내는 확률 벡터(합이 1)다.

- 정상 데이터: attention이 전체에 고루 퍼진 **uniform distribution**에 가깝다.
- 이상 데이터: 자신 주변에만 attention이 뾰족하게 몰린다.

> 이 관찰은 [[posts/foundations/time-series-analysis/03-time-series-forecasting-with-transformers|Informer]]가 "특정 query만 의미 있는 attention을 갖는다"고 본 것과 결이 비슷하다. 다만 여기서는 그 뾰족함 자체를 이상 신호로 *활용*한다는 점이 다르다.

### Prior Association $P_i$

**Prior association** $P_i \in \mathbb{R}^N$는 "이상점은 시간적으로 가까운 데이터와 연관성이 높을 것"이라는 *사전 지식(prior)* 을 강제로 부여한 연관성 지표다. 두 점 $x_i, x_j$의 연관성을 관측 시간 차이 $|t_i - t_j|$에 대한 **Gaussian kernel**로 정의한다. 즉 $x_i$의 prior association은 자기 위치를 중심으로 하고 학습 가능한 분산 $\sigma_i^2$를 갖는 정규분포의 pdf 값으로 주어진다.

$$
f(|j - i|) = N(|j - i| ; x_i, \sigma_i^2)
$$

거리가 가까울수록 prior association 값이 크고, 멀어질수록 작아진다. (이는 "이상이라면 주변과만 닮았을 것"이라는 가정을 수식으로 구현한 것이다.)

### Association Discrepancy

**Association discrepancy**는 같은 점에 대한 series association $S$와 prior association $P$의 *차이*를 측정한 값이다. 둘 다 확률 분포(확률 벡터)이므로, 분포 간 차이를 재는 대표적 도구인 **KL divergence**를 대칭으로 적용한다.

$$
\text{AssDis}(P, S; X^i) = \mathrm{KL}(P  S) + \mathrm{KL}(S  P)
$$

여기서 핵심은 다음 성질이다.

- **정상 데이터**: series association이 전체로 퍼져 있어, 주변에 집중된 prior association과 크게 다르다 → **AssDis가 크다.**
- **이상 데이터**: series association도 주변에 몰려 있어 prior association과 비슷하다 → **AssDis가 작다.**

### Anomaly Score

최종 이상 score는 **association discrepancy와 reconstruction loss를 함께** 사용한다.

$$
\text{AnomalyScore}(x_i) = e^{-\text{AssDis}(x_i)} \cdot (x_i - \hat{x}_i)^2
$$

- 이상 데이터는 AssDis가 작으므로 $e^{-\text{AssDis}}$가 **크다.**
- 이상 데이터는 reconstruction loss $(x_i - \hat{x}_i)^2$도 **크다.**

두 요소가 모두 이상점에서 score를 키우는 방향으로 작동해, 이상 탐지 민감도를 높인다.

### 실험 결과

Anomaly Transformer는 SMD, MSL, SMAP, SWaT, PSM 등 주요 시계열 이상 탐지 벤치마크에서 당시 기존 모델들(OmniAnomaly, THOC, BeatGAN 등)을 모두 능가하며 가장 높은 F1 성능을 기록했다.

## 요약

- **MAD-GAN**: 정상 데이터로 학습한 GAN의 discriminator는 이상을 가짜로 본다는 가정에서, 테스트 데이터를 latent로 역매핑한 뒤 **reconstruction error + discriminator loss**를 이상 score로 사용한다.
- **Anomaly Transformer**: 이상점은 *주변과만* 연관성이 높다는 관찰을, **series association**(attention)과 **prior association**(Gaussian) 사이의 **association discrepancy**로 포착하고, 이를 reconstruction loss와 결합해 이상 score를 만든다.

