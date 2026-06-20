---
title: 02. 시계열 분해 기법
date: 2026-06-20
tags:
  - Time Series Analysis
---

[[posts/foundations/time-series-analysis/01-time-series-characteristics-and-arima|이전 글]]에서 시계열을 stochastic process로 보고 stationarity와 ARIMA를 다뤘다. 이번에는 시계열을 *눈에 보이는 구성 요소*로 쪼개어 이해하는 **time series decomposition**(시계열 분해)을 살펴본다. 분해를 통해 데이터를 더 깊이 해석하고, 각 요소에 맞는 모델링을 따로 적용할 수 있다.

## 시계열의 세 가지 구성 요소

하나의 시계열 데이터는 보통 **trend**(추세), **seasonality**(계절성), **residual**(잔차)의 세 요소로 분해할 수 있다. 관측된 시계열(observed)을 이 세 가지로 나누어 보면, 겉으로는 복잡해 보이던 데이터가 훨씬 명확하게 해석된다.

### Trend

**Trend**는 시계열 데이터의 증가·감소 같은 *전체적인 경향성*을 표현한다.

- 데이터가 장기적으로 어느 방향으로 움직이는지를 나타낸다.
- 랜덤한 잡음이 없는 **deterministic**(결정적)한 요소다. 즉, 단기적인 흔들림이 아니라 큰 흐름을 담는다.

### Seasonality

**Seasonality**는 시계열 데이터의 *주기성*을 표현한다.

- 일정한 간격으로 비슷한 패턴이 반복되는 성질이다.
- 주기성은 여러 요인에서 비롯될 수 있다. 예를 들어 시간(하루 중 시각), 요일, 월, 연도, 계절 등이 주기의 단위가 된다.

> 예: 아이스크림 판매량은 매년 여름에 오르고 겨울에 내려가는 연 단위 seasonality를 가지며, 지하철 승객 수는 요일·시간 단위 seasonality를 가진다.

### Residual

**Residual**은 trend와 seasonality를 제거하고 *남은 랜덤한 요소*다.

- 이상적으로는 white noise에 가까운, 패턴이 없는 잡음이어야 한다.
- 만약 trend와 seasonality를 완전히 제거하지 못하면, residual에 여전히 특정 경향성이나 주기성이 남아 있을 수 있다. 이는 분해가 충분하지 않았다는 신호로 볼 수 있다.

## Additive vs. Multiplicative

세 요소가 결합되는 방식은 크게 **합(additive)**과 **곱(multiplicative)** 두 가지다.

**Case 1) Additive:**

$$
\text{Data} = \text{Trend} + \text{Seasonality} + \text{Residual}
$$

- Trend의 방향과 무관하게, 시간이 지나도 *변동폭(진폭)이 일정*하게 유지되는 경우다.

**Case 2) Multiplicative:**

$$
\text{Data} = \text{Trend} \times \text{Seasonality} \times \text{Residual}
$$

- Trend가 커질수록 *변동폭도 함께 커지는*, 즉 시간에 따라 진폭이 일정하지 않은 경우다.

곱의 형태는 다루기 까다롭지만, **log 변환**을 취하면 합의 형태로 바꿀 수 있다는 유용한 성질이 있다.

$$
\log(\text{Data}) = \log(\text{Trend}) + \log(\text{Seasonality}) + \log(\text{Residual})
$$

따라서 multiplicative 데이터도 로그를 씌운 뒤 additive 분해 기법을 그대로 적용할 수 있다.

## 분해는 왜 하는가

시계열을 요소별로 분해하면 두 가지 큰 이점이 있다.

- 데이터에 대한 **더 깊은 이해와 해석**이 가능하다. (장기 추세는 어떤지, 어떤 주기로 반복되는지, 설명되지 않는 잡음은 얼마나 되는지)
- 각 요소별로 **적합한 모델링 방식을 따로 선택**해서 적용할 수 있다.

## Data Smoothing

그렇다면 실제로 어떻게 trend를 뽑아낼까? 가장 기본적인 도구가 **data smoothing**이다. Smoothing은 데이터의 잡음을 깎아내 부드러운 곡선을 만드는 작업으로, 이를 통해 trend를 추출하고 residual(잡음)을 걸러낼 수 있다. 대표적으로 **moving average**와 **exponential moving average**가 있다.

### Moving Average

**Moving average**(이동평균)는 가장 간단한 smoothing 방식이다. 한 값을 기준으로, 정해 놓은 크기의 범위만큼 양옆 값들의 평균을 취한다. 예를 들어 윈도우 크기가 5라면,

$$
X'_t = \frac{X_{t-2} + X_{t-1} + X_t + X_{t+1} + X_{t+2}}{5}
$$

이렇게 주변 값을 평균 내면 무작위한 흔들림이 상쇄되어, 시계열에서 잡음을 제거하는 데 사용할 수 있다.

### Exponential Moving Average

**Exponential moving average (EMA)**는 모든 값을 같은 중요도로 평균 내지 않는다. *가까운 시점의 관측치일수록 더 높은 가중치*를 주어 평균을 취한다. $0 < w < 1$인 가중치 $w$를 두고, 거리가 멀어질수록 $w$의 거듭제곱으로 가중치가 작아지게 한다.

$$
X'_t = w^3 X_{t-2} + w^2 X_{t-1} + w X_t + w^2 X_{t+1} + w^3 X_{t+2}
$$

$w$가 1보다 작으므로 $w > w^2 > w^3$이고, 따라서 중심에서 멀어질수록 영향력이 빠르게 줄어든다. EMA는 단순 moving average보다 최근 변화에 민감하게 반응하므로, 데이터에서 **trend를 추출**하는 데 특히 효과적이다.

## 분해 절차

지금까지의 도구를 모아, 실제로 시계열을 세 요소로 분해하는 절차는 다음과 같다.

**1) Trend 추출.** 데이터에 moving average를 적용해 trend 성분을 분리한다.

**2) Seasonality 추출.**

- 먼저 **de-trended data**를 계산한다: $\text{De-trended data} = \text{Time series data} - \text{Trend}$
- de-trended data에서 *특정 주기를 단위로* 관측값들의 평균을 구한다.
- 예를 들어 일주일 단위 주기성을 갖는 교통량 데이터가 10주간 관측되었다면, 요일별로 10주치 교통량의 평균값 7개를 각각 계산한다.
- 이 평균값(요일별 7개)을 주기(일주일)마다 반복해서 이어 붙이면 seasonal 성분이 된다.

**3) Residual 추출.** de-trended data에서 seasonal 성분을 빼면 residual이 남는다.

$$
\text{Residual} = \text{De-trended data} - \text{Seasonality}
$$

이렇게 하면 하나의 시계열이 trend + seasonality + residual로 깔끔하게 분해된다.

## 요약

- 시계열은 **trend**(전체 경향), **seasonality**(주기성), **residual**(남은 잡음)의 세 요소로 분해할 수 있다.
- 세 요소는 **additive**($+$) 또는 **multiplicative**($\times$) 형태로 결합되며, 곱 형태는 log 변환으로 합 형태로 바꿀 수 있다.
- **Data smoothing**(moving average, exponential moving average)으로 trend를 추출하고, de-trending과 주기별 평균을 거쳐 seasonality와 residual을 차례로 분리한다.

> 그림 출처: Intel "Time Series Analysis" (2018), Kevin Kotze "Time Series Analysis" (University of Cape Town, 2021), Ceylan Yozgatligil "Applied Time Series Analysis" (METU, 2011).
