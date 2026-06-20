---
title: 05. 시계열 이상 탐지 (1) - LSTM-AE와 USAD
date: 2026-06-20
tags:
  - Time Series Analysis
---

지금까지는 시계열 *예측(forecasting)*을 다뤘다. 이번 글부터는 다른 과제인 **시계열 이상 탐지(anomaly detection)**를 살펴본다. 여기서는 [[posts/foundations/introduction-to-dl/09-autoencoder|autoencoder]] 기반의 대표적인 두 모델, **LSTM-AE**와 **USAD**를 소개한다.

## 시계열 이상 탐지란

**Time series anomaly detection**은 *시계열 데이터 안에서 경향성을 벗어나는 한 점 또는 구간을 자동으로 탐지*하는 과제다. 반도체 설비의 센서 모니터링, 서버 장애 감지, 금융 사기 탐지 등 실무 활용이 매우 넓다.

대표적인 이상 데이터 유형은 다음과 같다.

- **평균 값을 벗어남**: 정상 범위(예: 관리 상한·하한선, UCL/LCL)를 갑자기 튀어나가는 spike.
- **주기성을 벗어남**: 값 자체는 정상 범위 안이지만, 데이터가 따르던 주기적 패턴이 깨지는 경우.
- **심한 노이즈가 계속됨**: 특정 구간에서 비정상적으로 큰 잡음이 지속적으로 함께 측정되는 경우.

핵심 어려움은, 현실에서 **이상 데이터의 라벨을 확보하기 어렵다**는 점이다. 이상은 드물고 종류도 다양해서, "정상이 아닌 모든 것"을 미리 라벨링할 수 없다. 그래서 정상 데이터만으로 학습하는 **비지도(unsupervised)** 접근이 자연스럽고, autoencoder가 그 중심에 있다.

## LSTM Autoencoder

### 핵심 아이디어

LSTM-AE는 [[posts/foundations/introduction-to-dl/08-lstm-and-gru|LSTM]] 기반 [[posts/foundations/introduction-to-dl/09-autoencoder|autoencoder]] 구조를 이상 탐지에 활용한다. 핵심 가정은 단순하다.

> **정상 데이터로만 학습된 autoencoder는, 정상 데이터를 이상 데이터보다 더 잘 reconstruction할 것이다.**

정상 패턴만 압축·복원하도록 배웠으니, 처음 보는 이상 패턴은 잘 복원하지 못해 큰 오차를 낸다는 논리다.

### 학습 과정

1. **Encoding**: LSTM으로 학습 데이터를 시간 순서대로 인코딩한다.
2. **Decoding**: 인코딩 결과를 decoder의 LSTM에 넣어, 입력과 동일한 값을 출력하도록 한다. 이때 **encoder의 마지막 hidden state를 decoder의 초기 hidden vector로 설정**한다.
3. **학습**: 원본 데이터 $x$와 출력 $\hat{x}$ 사이의 **reconstruction error**를 줄이도록 모델을 학습한다.

### 탐지 과정

- 검사할 데이터를 학습된 autoencoder에 통과시켜 reconstruction을 수행한다.
- **reconstruction error를 이상 탐지 score로 사용**한다.
- score가 기준(threshold)보다 **높으면 이상**, **낮으면 정상**으로 판정한다.
- threshold는 hyperparameter이며, threshold를 바꿔가며 그린 **AUROC curve**로 모델 성능을 검증한다.

## USAD (UnSupervised Anomaly Detection)

[USAD (Audibert et al., KDD 2020)](https://dl.acm.org/doi/10.1145/3394486.3403392)는 autoencoder 기반 이상 탐지에 **적대적 학습(adversarial training)**을 더해 성능을 끌어올린 모델이다.

### 핵심 아이디어

LSTM-AE에는 약점이 있다. autoencoder가 너무 강력하면 이상 데이터마저 적당히 잘 복원해버려, 정상과 이상의 reconstruction error 차이가 줄어든다. USAD는 [[posts/foundations/introduction-to-dl/13-generative-adversarial-network|GAN]]식 적대적 학습으로 이 차이를 *일부러 키운다*.

구조는 **하나의 공유 encoder $E$와 두 개의 decoder $D_1, D_2$**로 이루어진다. 즉 두 개의 autoencoder $AE_1 = E + D_1$, $AE_2 = E + D_2$가 encoder를 공유한다. 학습은 두 단계로 진행된다.

### 단계 1: Reconstruction

먼저 두 autoencoder 모두 입력 $W$를 잘 복원하도록 학습한다. $Z = E(W)$라 할 때, $D_1, D_2$가 각각 $W^{1\prime} = D_1(Z)$, $W^{2\prime} = D_2(Z)$를 $W$에 가깝게 만든다. 일반적인 autoencoder 학습이다.

### 단계 2: Adversarial Training

여기서 USAD만의 핵심이 등장한다. $D_1$이 만든 출력 $W^{1\prime}$을 다시 encoder에 넣어 latent를 구하고, 이를 $D_2$로 복원한 것을 $W^{2\prime\prime}$이라 하자.

$$
W^{2\prime\prime} = D_2(E(W^{1\prime}))
$$

이제 두 decoder는 서로 경쟁한다.

- **$D_2$ (discriminator 역할)**: 진짜 데이터 $W$는 잘 복원하고, $D_1$이 만든 "가짜" 데이터 $W^{1\prime}$은 잘 복원하지 못하도록 학습한다. 즉 $\| W - W^{2\prime\prime} \|$을 **키우려** 한다.
- **$D_1$ (generator 역할)**: 자신이 만든 $W^{1\prime}$을 진짜 $W$와 구별하기 어려울 만큼 비슷하게 만들어 $D_2$를 속이려 한다. $W^{1\prime}$이 $W$와 비슷할수록 $D_2$가 $\| W - W^{2\prime\prime} \|$을 키우기 어려워진다.

이 경쟁을 반영한 두 autoencoder의 손실은 다음과 같다. ($n$은 epoch 번호, $\| \cdot \|_2$는 L2 norm)

$$
\mathcal{L}_{AE_1} = \frac{1}{n}\| W - W^{1\prime} \|_2 + \left(1 - \frac{1}{n}\right)\| W - W^{2\prime\prime} \|_2
$$

$$
\mathcal{L}_{AE_2} = \frac{1}{n}\| W - W^{2\prime} \|_2 - \left(1 - \frac{1}{n}\right)\| W - W^{2\prime\prime} \|_2
$$

$\mathcal{L}_{AE_1}$은 $W^{2\prime\prime}$ 오차를 **줄이려**(속이기) 하고, $\mathcal{L}_{AE_2}$는 같은 항을 **늘리려**(구별하기) 한다는 점에서 부호가 반대다. 또한 가중치 $\frac{1}{n}$, $1 - \frac{1}{n}$ 때문에, 학습 초반($n$이 작을 때)에는 reconstruction을 중시하고 epoch이 진행될수록 adversarial 항의 비중이 커진다.

### 탐지 과정

학습이 끝나면, 검사할 데이터 $W$에 대해 두 종류의 reconstruction error를 가중합하여 이상 탐지 score $\mathcal{A}$로 사용한다.

$$
\mathcal{A} = \alpha \, \| W - W^{1\prime} \|_2 + \beta \, \| W - W^{2\prime\prime} \|_2
$$

여기서 $W^{1\prime} = D_1(E(W))$, $W^{2\prime\prime} = D_2(E(W^{1\prime}))$이고, $\alpha, \beta$는 두 오차의 비중을 정하는 hyperparameter다. $\mathcal{A}$가 threshold $\lambda$ 이상이면 이상($y=1$), 미만이면 정상($y=0$)으로 판정한다. 첫 번째 항은 기본적인 reconstruction 능력을, 두 번째 항은 적대적으로 증폭된 이상 민감도를 반영한다.

## 요약

- **시계열 이상 탐지**는 데이터의 경향성을 벗어나는 점·구간을 찾는 과제로, 라벨 확보가 어려워 정상 데이터만으로 학습하는 autoencoder 기반 비지도 접근이 표준적이다.
- **LSTM-AE**: 정상 데이터로 학습한 LSTM autoencoder의 **reconstruction error**를 이상 score로 사용한다.
- **USAD**: encoder를 공유하는 두 decoder를 **적대적으로 학습**시켜, 정상과 이상의 reconstruction error 차이를 키운다. 두 오차의 가중합을 이상 score로 사용한다.

> 참고: 시계열 이상 탐지 개요는 [Choi et al., "Deep Learning for Anomaly Detection in Time-Series Data" (IEEE Access 2021)](https://ieeexplore.ieee.org/document/9523565), [Darban et al., "Deep Learning for Time Series Anomaly Detection: A Survey" (arXiv 2022)](https://arxiv.org/abs/2211.05244)를 참고했다.
