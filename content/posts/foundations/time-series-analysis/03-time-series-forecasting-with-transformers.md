---
title: 03. 시계열 예측 모델 (1) - Transformer와 Informer
date: 2026-06-20
tags:
  - Time Series Analysis
---

[[posts/foundations/time-series-analysis/01-time-series-characteristics-and-arima|1편]]에서 ARIMA 같은 고전적 통계 모델을 다뤘다면, 이번에는 딥러닝, 특히 **Transformer**를 시계열 예측(forecasting)에 적용하는 방법과 그때 생기는 문제, 그리고 이를 해결한 대표 모델 **Informer**를 살펴본다.

## 시계열 예측이란

**Time series forecasting**은 *과거부터 지금까지 관측된 값을 활용해 미래의 값을 예측*하는 문제다. 현재까지 관측된 데이터를 입력으로 받아, 아직 관측되지 않은 미래 구간의 값을 출력한다.

### Forecasting 데이터 구성

일반적인 머신러닝과 달리, 시계열 예측에서는 데이터를 시간 순서대로 나누는 것이 중요하다.

- **검증(validation) 데이터와 테스트(test) 데이터는 학습(train) 데이터보다 미래의 값으로 설정**한다. 모델의 목적 자체가 미래를 예측하는 것이므로, 미래 데이터로 평가해야 실제 사용 상황과 맞는다. (일반적인 무작위 분할을 쓰면 미래 정보가 학습에 새어 들어가는 data leakage가 생긴다.)
- 모델 학습용 데이터셋은 **일정한 크기의 윈도우(window) 단위**로 잘라서 구성한다.
- 각 윈도우 안에서 앞부분을 **input(주어진 값)**, 뒷부분을 **output(예측할 값)**으로 설정한다. 모델은 input을 보고 output을 맞히도록 학습된다.

## Transformer를 이용한 시계열 예측

[[posts/foundations/introduction-to-dl/11-transformer-and-self-attention|Transformer]]는 본래 자연어 처리를 위해 제안됐지만, 시계열 예측에도 그대로 응용할 수 있다. Encoder에 관측된 시계열을, decoder에 예측할 시점 정보를 넣고, 예측값(predicted outputs)을 출력하도록 구성한다. 회귀 문제이므로 loss function으로는 보통 **MSE(Mean Squared Error)**나 **MAE(Mean Absolute Error)**를 사용한다.

### Transformer의 한계: $O(l^2)$ 복잡도

문제는 **계산 복잡도**다. 길이 $l$의 시계열에 대해 self-attention 연산은 $O(l^2)$의 복잡도를 가진다. 이유를 따라가 보자. Query, Key, Value를 각각 $Q, K, V \in \mathbb{R}^{l \times d}$라 하면, attention map은

$$
A = \text{Softmax}\left(\frac{QK^\top}{\sqrt{d}}\right) \in \mathbb{R}^{l \times l}
$$

로 계산된다. $\mathbb{R}^{l \times d} \times \mathbb{R}^{d \times l} \to \mathbb{R}^{l \times l}$ 이므로 여기서 $O(l^2)$이 발생한다. 이어서 output feature는

$$
O = AV \in \mathbb{R}^{l \times d}
$$

인데, 이 역시 $\mathbb{R}^{l \times l} \times \mathbb{R}^{l \times d} \to \mathbb{R}^{l \times d}$ 라서 $O(l^2)$이다.

즉 시계열이 길어질수록 연산량이 제곱으로 늘어나, **긴 시계열 예측에서 Transformer는 효율성이 크게 떨어진다.** 이 문제를 정조준한 모델이 Informer다.

## Informer

[Informer (Zhou et al., AAAI 2021)](https://arxiv.org/abs/2012.07436)는 긴 시계열 예측을 위해 attention의 $O(l^2)$ 비용을 줄인 Transformer 변형이다.

### Motivation: attention은 대부분 낭비된다

Informer 저자들은 학습된 attention map $A$를 들여다보다 흥미로운 사실을 발견했다. **대부분의 attention score가 매우 낮고, 의미 있는(높은) score를 갖는 부분은 소수**라는 점이다. 실제로 attention score의 분포는 소수의 큰 값과 다수의 작은 값으로 이루어진 **long-tail distribution**을 보였다. 그리고 이런 의미 있는 attention은 *특정 query에 대해서만* 집중적으로 나타났다.

### 핵심 가정: "의미 있는" query가 따로 있다

여기서 Informer는 다음 가정을 세운다. **의미 있는 attention score를 가지는 query가 존재한다.** 이를 판별하는 기준은 분포의 모양이다. 어떤 query의 attention score 분포를 살펴봤을 때,

- 모든 위치에 고르게 attention을 주는 query (모든 확률이 같은 **uniform distribution**에 가까움) → 정보량이 적은 "lazy" query
- 특정 위치에 뾰족하게 attention이 몰린 query (uniform distribution과 크게 다름) → 정보량이 많은 "active" query

즉, *query의 attention 분포가 uniform distribution과 얼마나 다른가*로 그 query의 중요도를 잴 수 있다.

### ProbSparse Attention

이 아이디어를 연산으로 옮긴 것이 **ProbSparse Attention**이다.

1. uniform distribution과의 **KL divergence가 가장 큰 $n$개의 query 벡터만** 골라서 output feature map $O$를 계산한다. ($n \ll l$)
2. 연산에 사용되지 않은 나머지 query들의 output feature vector는, **value 벡터들의 평균 벡터**로 채워 처리한다.

이렇게 query를 확률 분포로 해석해 일부만 골라 sparse한 attention을 만들기 때문에 "ProbSparse"라는 이름이 붙었다. 복잡도 측면에서는

$$
O(l^2) \implies O(l n) \quad (n \ll l)
$$

로 줄고, Informer는 $n := c \log l$ (여기서 $c \in \mathbb{R}$는 hyperparameter)로 설정하므로 최종적으로

$$
O(l^2) \implies O(l \log l)
$$

이 된다. 길이가 길어질수록 절감 효과가 커진다.

### Informer 구조와 입력 세팅

Informer의 구조적 핵심은 단순하다. **Transformer의 attention 연산을 ProbSparse attention으로 교체**한 것이다. Encoder와 decoder 모두 multi-head ProbSparse self-attention을 사용하고, decoder 끝에 fully connected layer를 붙여 예측값을 한 번에 출력한다.

입력 데이터 세팅에도 특징이 있다.

- **Encoder input의 마지막 일부분을 decoder input의 시작 부분으로 사용**한다. 이는 NLP의 start token과 같은 역할을 한다. 단, 학습·평가 시 이 start token 위치의 출력은 loss 계산에 포함하지 않는다.
- **예측하고 싶은 미래 시점의 입력 값은 0으로 채워** 넣는다. (시간 정보는 주되, 값은 아직 모르므로 0으로 둔다.)

### 실험 결과

Informer는 기존 RNN 기반 모델과 Transformer 기반 모델들을 능가하는 예측 성능(MSE·MAE)을 보였고, ProbSparse 덕분에 **inference time도 더 짧게** 기록했다. 즉 정확도와 효율을 동시에 잡은 것이 핵심 기여다.

## 요약

- **Time series forecasting**은 과거 관측값으로 미래를 예측하는 문제로, 데이터를 시간 순서대로(train → validation → test) 나누고 윈도우 단위 input/output으로 구성한다.
- **Transformer**는 시계열 예측에 쓸 수 있으나, self-attention의 $O(l^2)$ 복잡도 때문에 긴 시계열에서 비효율적이다.
- **Informer**는 attention score가 소수 query에 몰린다는 관찰에서 출발해, uniform distribution과의 KL divergence가 큰 query만 골라 쓰는 **ProbSparse Attention**으로 복잡도를 $O(l \log l)$로 낮추고 성능까지 끌어올렸다.
