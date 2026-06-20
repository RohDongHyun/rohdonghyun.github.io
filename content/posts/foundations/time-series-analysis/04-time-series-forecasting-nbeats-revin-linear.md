---
title: 04. 시계열 예측 모델 (2) - N-Beats, RevIN, Linear Models
date: 2026-06-20
tags:
  - Time Series Analysis
private: false
---
[[posts/foundations/time-series-analysis/03-time-series-forecasting-with-transformers|3편]]에서 Transformer 기반 예측(Informer)을 다뤘다. 이번에는 그 외의 대표적인 시계열 예측 방법론으로 순수 MLP 구조인 **N-Beats**, non-stationarity를 정면으로 다루는 정규화 기법 **RevIN**, 그리고 "정말 Transformer가 필요한가?"라는 질문을 던진 **Linear models**를 차례로 살펴본다.

## N-Beats

[N-Beats (Oreshkin et al., ICLR 2019)](https://arxiv.org/abs/1905.10437)는 **fully-connected(FC) layer만으로 구성된** block과 stack의 계층 구조를 제안한 모델이다. 시계열 예측 competition(M3, M4)에서 **순수 딥러닝 구조로는 최초로 SOTA 성능을 달성**한 것으로 유명하다. (당시 SOTA는 통계 기법과 딥러닝을 결합한 하이브리드 모델들이었다.)

### 구조: Block → Stack → Model

N-Beats는 $K$개의 block으로 이루어진 stack을 $M$개 쌓아 만든다.

- 모든 **block들의 출력의 합**이 그 **stack의 출력**이 된다.
- 모든 **stack들의 출력의 합**이 **모델의 최종 출력**(global forecast)이 된다.
- 학습과 예측 속도를 위해 RNN·attention 없이 **MLP layer만** 사용한다.
- block 사이를 잇는 **residual connection**은 vanishing gradient 완화에 효과적이다.

### Block의 두 가지 연산: Forecast와 Backcast

각 block은 FC stack을 거친 뒤 두 갈래로 출력을 낸다.

- **Forecast**: 현재 block의 입력으로 *target(미래 값)을 예측*하는 연산. 각 block의 forecast 출력들이 합쳐져 stack의 출력이 된다.
- **Backcast**: 현재 block의 입력을 *그대로 재구성(reconstruction)* 하는 연산. block의 입력에서 backcast 출력을 뺀 값(residual)이 **다음 block의 입력**이 된다.

즉, 각 block이 "자기가 설명할 수 있는 부분"을 backcast로 떼어내고, 설명하지 못한 나머지(residual)를 다음 block에게 넘기는 구조다. 이렇게 잔차를 따라가며 점진적으로 예측을 정교화한다.

### 결과

N-Beats는 M3, M4, TOURISM 같은 competition 데이터셋에서 기존 통계·하이브리드 SOTA를 sMAPE·OWA·MAPE 기준으로 능가했다. 순수 딥러닝 모델로 통계 기반 모델을 처음 넘어선 기록이라는 점에서 의미가 크다.

## RevIN

[RevIN (Kim et al., ICLR 2022)](https://openreview.net/forum?id=cGDAkQo1C0p)은 시계열 예측의 가장 큰 걸림돌인 **non-stationarity**를 정면으로 다루는 정규화 기법이다.

### 문제: Input과 Output의 분포가 다르다

시계열은 시간이 지나며 평균·분산 같은 통계적 특성이 변한다([[posts/foundations/time-series-analysis/01-time-series-characteristics-and-arima|non-stationary]]). 그래서 모델이 보는 **input series와 예측해야 할 output series 사이에 통계적 특성 차이(distribution shift)** 가 존재하고, 이는 forecasting에서 필연적으로 큰 예측 오차를 만든다. RevIN은 이 분포 차이를 **정규화로 없앴다가, 예측 후 되돌리는(reversible)** 방식으로 해결한다.

### 동작: Normalize → 예측 → Denormalize

**1) Instance Normalization.** 각 input series $x^{(i)}$의 평균과 분산을 구해, series별로 정규화한 뒤 학습 가능한 affine 변환($\gamma, \beta$)을 적용한다.

$$
\hat{x}_t^{(i)} = \gamma \left( \frac{x_t^{(i)} - \mu^{(i)}}{\sigma^{(i)}} \right) + \beta
$$

여기서 $\mu^{(i)} = \mathbb{E}[x_t^{(i)}]$, $\sigma^{(i)} = \sqrt{\mathrm{Var}[x_t^{(i)}]}$이고, $\gamma, \beta$는 학습 parameter다.

**2) 모델 학습 및 예측.** 정규화된 입력으로 forecasting 모델을 학습하고 예측 $\tilde{y}_t^{(i)}$를 얻는다.

**3) Denormalization.** 예측된 output series를 다시 input series의 통계값으로 되돌려, 원래 스케일의 예측값을 복원한다.

$$
\hat{y}_t^{(i)} = \sqrt{\mathrm{Var}[x_t^{(i)}]} \left( \frac{\tilde{y}_t^{(i)} - \beta}{\gamma} \right) + \mathbb{E}[x_t^{(i)}]
$$

정규화 단계에서는 non-stationary한 input과 target의 분포가 서로 비슷해지고, denormalization 단계에서는 원래 분포로 정확히 복원된다. 정규화와 denormalization이 **대칭적(reversible)**으로 짝지어진다는 점이 핵심이다.

![image.png](/images/image-14.png)

### 결과

RevIN은 독립된 모델이 아니라 **기존 forecasting 모델에 끼워 넣는 모듈**이다. Informer, N-Beats 같은 모델에 결합했을 때 모두 유의미한 성능 향상(MSE·MAE 감소)을 보였다.

## Linear Models

마지막으로, [Zeng et al. (AAAI 2023)](https://arxiv.org/abs/2205.13504)은 도발적인 질문을 던졌다. **"Transformer 구조가 정말 시계열 예측에 효과적일까?"**

저자들의 발견은 충격적이었다. **단 하나의 linear layer로 구성된 단순한 모델이 복잡한 Transformer 기반 모델보다 더 좋은 성능을 보였다.** Input time series로 target series를 예측하는 구조이며, 입력 데이터의 순서가 출력에 직접 영향을 주도록 설계된다. 구현은 말 그대로 한 줄짜리에 가깝다.

```python
linear_model = nn.Linear(input_dim, output_dim)
output = linear_model(input)
```

이들은 두 가지 간단한 변형 **DLinear**와 **NLinear**를 제안했다.

### DLinear (Decomposition Linear)

[[posts/foundations/time-series-analysis/02-time-series-decomposition|시계열 분해]] 아이디어를 결합한 모델이다.

1. 원본 데이터에 moving average를 적용해 **trend** series를 추출한다.
2. 원본에서 trend를 빼서 **seasonality** series를 얻는다.
3. 분해된 trend와 seasonality 각각에 **서로 다른 linear 모델**을 학습한다.
4. 두 모델의 예측값을 **더해서** 최종 예측값으로 사용한다.

### NLinear (Normalization Linear)

distribution shift에 대응하는 간단한 정규화를 더한 모델이다.

1. 현재 input series의 모든 값에서 그 series의 **마지막 값**을 빼준다.
2. linear 모델로 target series를 예측한다.
3. 예측된 target series에 처음 뺐던 **마지막 값을 다시 더한다.**

각 series의 마지막 값을 기준으로 빼고 더하는 과정이 일종의 정규화 역할을 해, train과 test 데이터의 분포가 다를 때(distributional shift) 값의 분포를 비슷하게 맞춰준다. RevIN과 통하는 발상이다.

### 결과와 의의

실험에서 linear model들은 ETT 등 여러 벤치마크에서 기존 Transformer 기반 모델(Informer, Autoformer, FEDformer 등)보다 더 좋은 forecasting 성능을 보였다.

> 다만 이 결과는 2022년 8월 기준이다. 현재는 이 현상을 분석·보완·개선하는 후속 연구가 계속 진행 중이며, "Transformer가 무용하다"기보다 "단순 baseline조차 제대로 못 이기는 설계가 많았다"는 경종으로 받아들이는 것이 적절하다.

## 요약

- **N-Beats**: FC layer만으로 block(forecast + backcast) → stack → model의 잔차 기반 계층 구조를 만든, 순수 딥러닝 최초의 competition SOTA.
- **RevIN**: input series의 통계량으로 정규화했다가 예측 후 되돌리는 reversible 기법으로 **non-stationarity(distribution shift)** 를 완화하는, 기존 모델에 끼우는 모듈.
- **Linear Models (DLinear, NLinear)**: 한 개의 linear layer만으로 Transformer 기반 모델을 능가해, 시계열 예측에서 단순 baseline의 중요성을 일깨운 연구.

