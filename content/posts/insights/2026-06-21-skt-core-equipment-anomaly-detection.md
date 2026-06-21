---
title: 통신 Core 장비 이상 징후 감지 — 시계열 이상 탐지 4대 모델 정리
slug: skt-core-equipment-anomaly-detection
date: 2026-06-21
tags:
  - Anomaly Detection
  - Time Series
private: true
---

SKT 통신 Core 장비(MME)의 트래픽 데이터를 대상으로, 시계열 이상 징후(anomaly)를 감지하는 Guided Project 수업 자료를 정리한다. 데이터 전처리·재구조화부터 **ARIMA → Prophet → LSTM → AutoEncoder** 네 가지 대표 모델까지, 각 기법의 원리와 "어떻게 이상치를 잡아내는가"를 한 줄기로 꿴다. 통계적 시계열 모델에서 딥러닝 기반 비지도 모델로 넘어가는 흐름을 한눈에 잡는 것이 목표다.

> 시계열 자체의 기초는 [[posts/foundations/time-series-analysis/01-time-series-characteristics-and-arima]], [[posts/foundations/time-series-analysis/02-time-series-decomposition]]에서, 딥러닝 이상 탐지 모델의 심화는 [[posts/foundations/time-series-analysis/05-time-series-anomaly-detection-lstmae-usad]], [[posts/foundations/time-series-analysis/06-time-series-anomaly-detection-madgan-anomaly-transformer]]에서 더 깊게 다룬다.

## 1. 무엇을, 왜 푸는가

대상 데이터는 LTE 인증 서버 역할을 하는 **MME(Mobility Management Entity)** 장비의 통신 로그다. 시간에 따라 변수별(`src_nm` 등) 트래픽·성공률 등이 쌓이는 전형적인 시계열이다.

핵심 문제의식은 단순하다. **장비 고장이나 이상을 사전에 예측할 수 있다면, 사고가 터지기 전에 조치할 수 있다.** 통신 인프라에서 이상은 발생 빈도가 매우 낮고(클래스 불균형), 일단 터진 뒤의 사후 대처는 의미가 적다. 그래서 "이상 발생 자체를 미리 막는" 사전 탐지가 중요하다.

이상치(anomaly)는 **정상 모집단의 분포에서 멀리 떨어진 관측치**로 정의한다. 이 프로젝트의 모든 모델이 공유하는 탐지 논리는 결국 하나다 — 모델로 "정상이라면 이래야 한다"는 값을 예측/복원하고, 실제값과의 차이가 임계값을 넘으면 이상으로 판정한다.

```python
if abs(예측값 - 실제값) > Threshold:
    label = "이상"
else:
    label = "정상"
```

탐지에 쓰는 모델은 크게 세 갈래다: **전통적 통계 모델(ARIMA), 통계 기반 예측 라이브러리(Prophet), 딥러닝(LSTM·AutoEncoder).**

## 2. 데이터 재구조화와 전처리

모델에 넣기 전, raw 로그를 시계열 형태로 다듬는 단계다. 도구는 pandas(+ NumPy, scikit-learn, matplotlib/seaborn).

- **결측치 처리 기준**: 자료에서는 결측 비율에 따른 대치 전략을 제시한다(Hair et al., 2016 인용).
  - 10% 미만: 단순 대치(imputation)
  - 10~20%: 모델 기반/단일 대치
  - 20~30%: 모델 기반 다중 대치
  - 30% 이상: 변수 자체 제거 고려

  단, 이 프로젝트는 교육 목적상 결측이 있는 자료도 그대로 데이터에 남겨 다룬다.
- **대치 방법**: 평균(mean)/중앙값(median)/최빈값(mode)에 의한 단일 대치, 그리고 보간(interpolation). 보간은 선형(`linear`)뿐 아니라 다항식(`polynomial`)·스플라인(`spline`)처럼 곡선 추세를 살리는 방식도 쓴다.

  ```python
  df.fillna(df.mean())          # 평균 대치
  df.interpolate(method="spline", order=2)  # 곡선 보간
  ```
- **재구조화 핵심 — `pivot_table`**: 여러 변수가 행으로 길게 쌓인 long-format 로그를, 시간(`event_time`)을 인덱스로, 변수(`variable`)를 컬럼으로 펼쳐 장비 ID별 시계열 테이블로 만든다.

  ```python
  df.pivot_table(index="event_time", columns="variable", aggfunc="sum")
  ```

자료는 pandas를 SQL과 1:1로 대응시켜 설명한다(예: `SELECT * FROM items WHERE ... LIKE`를 `df[df["..."].str.contains(...)]`로). SQL에 익숙한 사람이 pandas로 넘어오기 좋은 구성이다.

## 3. 시계열 데이터의 이해

### 구성 요소와 분해

시계열은 **체계적 성분 + 불규칙 성분**으로 본다.

- **추세(Trend, $T_t$)**: 장기적으로 증가/감소하는 큰 방향.
- **계절성(Seasonal, $S_t$)**: 고정된 주기(요일·월 등)로 반복되는 변동.
- **순환(Cyclic, $C_t$)**: 고정 주기가 없는 장기적 파동.
- **불규칙(Irregular, $I_t$)**: 위로 설명되지 않는 잡음.

이를 결합하는 방식에 따라 두 모형으로 나뉜다.

$$
Z_t = T_t + S_t + C_t + I_t \quad (\text{가법모형, additive})
$$

$$
Z_t = T_t \cdot S_t \cdot C_t \cdot I_t \quad (\text{승법모형, multiplicative})
$$

변동 폭이 수준과 무관하게 일정하면 가법, 수준이 커질수록 변동도 커지면 승법이 적합하다.

### 정상성(Stationarity)

통계적 시계열 분석의 **필수 전제**가 정상성이다. 정상 과정(stationary process)은 시계열의 변화 패턴이 평균을 중심으로 일정한 변동 폭을 갖는다 — 즉 시점이 달라져도 평균·분산 등의 통계적 성질이 변하지 않는다. 현실의 대부분 시계열은 비정상(non-stationary)이므로, **로그 변환·차분(differencing)** 으로 정상 시계열로 바꿔준 뒤 모델링한다.

정상성 판단은 두 가지로 한다.

1. **시각적 분석 — ACF(Auto-Correlation Function)**: 시차 $k$에 대한 자기상관을 본다. ACF가 빠르게 0으로 수렴하면 정상, 천천히 감소하면 비정상이다.

$$
\text{ACF}(k) = \frac{\sum_{t=1}^{n-k}(z_t - \bar{z})(z_{t+k} - \bar{z})}{\sum_{t=1}^{n}(z_t - \bar{z})^2}
$$

2. **통계적 검정 — ADF / KPSS**: p-value로 판정한다. 대표적으로 **ADF(Augmented Dickey-Fuller) 검정**은 p-value가 0.05보다 작으면 정상성을 만족한다고 본다. (예시 출력: ADF Statistic −1.41, p-value 0.58 → 임계값보다 크고 p-value도 높아 비정상.)

## 4. 모델 1 — ARIMA

**ARIMA(p, d, q)** 는 세 요소의 결합이다.

- **AR(p)**: 자기회귀(Auto-Regressive). 과거 관측치로 현재를 설명.
- **I(d)**: 차분(Integrated/Differencing) 횟수. 비정상 → 정상 변환.
- **MA(q)**: 이동평균(Moving Average). 과거 예측 오차로 현재를 설명.

차수 $p, q$는 ACF와 **PACF(Partial ACF)** 의 절단/감소 패턴으로 식별한다.

| Model | ACF | PACF |
|---|---|---|
| AR(p) | 점차 감소 | p차 이후 절단 |
| MA(q) | q차 이후 절단 | 점차 감소 |
| ARMA(p,q) | 점차 감소 | 점차 감소 |

여러 후보 차수 중 최적은 **AIC(Akaike Information Criterion)** 로 고른다. 데이터에 대한 모델의 상대 품질 지표로, **낮을수록 좋다.**

$$
\text{AIC} = -2\ln(L) + 2k
$$

여기서 $L$은 우도(likelihood)의 최댓값, $k$는 추정된 파라미터 개수다.

**이상 탐지 방식**: ARIMA가 예측한 값과 실제값의 잔차(residual)가 클 때를 이상으로 본다. 잔차 제곱의 (평균 + 표준편차)를 임계값으로 삼는다.

```python
squared_errors = model_fit.resid ** 2
threshold = np.mean(squared_errors) + np.std(squared_errors)
data_indices = np.where(squared_errors >= threshold)
```

탐지 순서는 ① 정상성 검정 → ② `(p, d, q)` 탐색(AIC) → ③ 최적 차수로 학습 → ④ 임계값 초과 시점을 이상치로 판정.

## 5. 모델 2 — Prophet

**Prophet**은 Facebook(Meta)이 공개한 시계열 예측 라이브러리다(Taylor & Letham, "Forecasting at Scale", 2017). 가법 모형을 기반으로 고전적 통계 기법을 발전시켰고, 추세 부분은 Harvey & Peters(1990)의 구조적 시계열 모델 추정 기법을 가져왔다.

비선형 추세에 연간·주간·일간 계절성과 휴일 효과를 더하는 구조다.

$$
y(t) = g(t) + s(t) + h(t) + \epsilon_t
$$

- $g(t)$: 추세(trend)
- $s(t)$: 계절성(seasonality)
- $h(t)$: 휴일·이벤트 효과(holiday)
- $\epsilon_t$: 오차

**ARIMA와의 차이**: ARIMA는 `(p, d, q)`를 비전문가가 잡기 어렵지만, Prophet은 파라미터를 직관적으로 조정할 수 있고 결측치·이상치에 비교적 강건하다. 그래서 "스케일에 맞춰 빠르게" 돌리기 좋다.

**이상 탐지 방식**: Prophet은 예측값(`yhat`)과 함께 **신뢰구간(`yhat_lower`, `yhat_upper`)** 을 내준다. 실제값이 이 구간을 벗어나면 이상으로 표시한다.

```python
forecasted.loc[forecasted["real"] > forecasted["yhat_upper"], "anomaly"] = 1
forecasted.loc[forecasted["real"] < forecasted["yhat_lower"], "anomaly"] = -1
```

ARIMA가 "잔차 크기"로 점(point)을 잡는다면, Prophet은 "예측 구간 이탈" 이라는 직관적 기준을 쓴다.

## 6. 모델 3 — LSTM

여기서부터 딥러닝이다. **RNN(Recurrent Neural Network)** 은 순차 데이터를 처리하며 이전 시점 정보를 현재에 반영하고, 가중치(weight)를 시점 간에 공유한다. 다만 시퀀스가 길어지면 **기울기 소실(gradient vanishing)** 로 먼 과거를 못 배운다.

**LSTM(Long Short-Term Memory)** 은 hidden state에 더해 **cell state**, 그리고 **input·forget·output gate** 를 도입해 이 문제를 완화한다. 경량화한 변형이 **GRU**로, LSTM의 게이트를 reset·update 두 개로 줄였다(대략 LSTM의 input/forget → GRU의 reset, output → update에 대응).

입출력 구성은 과제 성격에 따라 다르다 — 다음 한 값을 예측하면 many-to-one, 여러 시점을 출력하면 many-to-many. 이 프로젝트는 여러 변수를 함께 쓰는 **multivariate LSTM** 으로, 입력 타임스텝을 3으로 두고 다음 값을 예측한다.

학습 전 변수 스케일을 맞추기 위해 **표준화(Standardization)** 를 적용한다.

$$
z = \frac{x - \mu}{\sigma}
$$

**이상 탐지 방식**: ARIMA·Prophet과 같은 임계값(Threshold) 논리다. LSTM이 예측한 값과 실제값(또는 loss)의 차이가 임계값을 넘으면 이상으로 본다. 순서는 multivariate LSTM 학습·예측 → 예측/실측 비교 → 임계값 초과 시점 표시.

## 7. 모델 4 — AutoEncoder

마지막은 대표적 **비지도(unsupervised) 딥러닝** 모델인 **AutoEncoder**다. 정상 데이터로만 학습해 "정상의 패턴"을 압축·복원하도록 만드는 것이 핵심 아이디어다.

- **Encoder**: 입력 데이터를 저차원 잠재변수(latent variable, code $z$)로 축소.
- **Decoder**: 그 잠재변수를 다시 원래 차원으로 복원.
- 입력 $X$와 복원 $X'$의 차이(**복원 오차**, MSE/MAE)를 최소화하도록 학습한다.

```
Input X → Encoder → Code z (latent) → Decoder → Output X'
              차이(X, X') > Threshold  ⇒  Anomaly
```

**이상 탐지 방식**: 정상 데이터는 학습된 패턴이라 거의 그대로 복원되어 차이가 작다. 반면 비정상 데이터는 학습한 적 없는 패턴이라 **노이즈처럼 인식돼 복원이 어긋나고 차이가 커진다.** 이 복원 오차가 임계값을 넘으면 이상으로 판정한다 — 정상 데이터만 있으면 학습이 되므로, 이상 라벨이 거의 없는 통신 데이터에 잘 맞는다.

구현 디테일:
- **윈도우 생성**: 연속 시계열을 슬라이딩 윈도우로 자른다(예: 길이 8 시퀀스를 윈도우 4로 잘라 `shape (8,1) → (5,4,1)`).
- **모델 구조**: Encoder는 1D Convolution, Decoder는 그 역연산인 1D ConvTranspose(`ConvTranspose1d`)로 구성한다.

탐지 순서: ① 훈련/테스트 분할(앞 구간 학습, 뒤 구간 테스트) → ② 표준화 → ③ 윈도우 생성 → ④ 모델 학습 → ⑤ 복원 오차가 임계값을 넘는 구간을 이상으로 판정.

## 8. 정리와 인사이트

네 모델을 한 표로 비교하면 다음과 같다.

| 모델 | 계열 | 이상 판정 기준 | 라벨 필요 | 특징 |
|---|---|---|---|---|
| ARIMA | 통계 | 잔차 제곱 > 평균+표준편차 | 불필요 | 정상성 가정·차수 튜닝 필요 |
| Prophet | 통계+분해 | 예측 신뢰구간 이탈 | 불필요 | 파라미터 직관적, 결측·이상에 강건 |
| LSTM | 딥러닝(지도) | 예측-실측 차 > 임계값 | (예측 학습) | 다변량·장기 의존성 처리 |
| AutoEncoder | 딥러닝(비지도) | 복원 오차 > 임계값 | 불필요(정상만) | 라벨 거의 없는 데이터에 적합 |

생각해 볼 점 몇 가지:

- **모든 모델이 결국 "예측/복원 vs 실제"의 임계값 문제로 환원된다.** 차이는 (1) 정상 패턴을 무엇으로 모델링하는가(자기회귀 / 분해 / 시퀀스 신경망 / 복원), (2) 임계값을 무엇에 거는가(잔차 / 신뢰구간 / 복원 오차)일 뿐이다. 이 공통 구조를 잡으면 새 모델도 같은 틀로 읽힌다.
- **임계값(Threshold) 설정이 사실상 성능을 좌우한다.** 자료의 기준(평균+표준편차 등)은 출발점일 뿐, 통신처럼 이상이 극히 드문 불균형 환경에서는 임계값을 낮추면 오탐(false positive)이 폭증하고 높이면 놓친다. 운영에서는 이 트레이드오프 튜닝이 모델 선택만큼 중요하다.
- **라벨 가용성이 모델 선택의 실질 기준이다.** 통신 이상 데이터는 라벨이 거의 없으므로, 정상 데이터만으로 학습하는 **AutoEncoder 같은 비지도 방식의 실용성이 높다.** 통계 모델(ARIMA·Prophet)은 빠른 베이스라인으로, 딥러닝은 다변량·복잡 패턴 단계에서 얹는 그림이 자연스럽다.
- 이 자료는 교육용이라 결측치를 그대로 두는 등 단순화한 선택이 있다. 실제 운영에서는 전처리 정책과 임계값 캘리브레이션을 데이터에 맞춰 다시 설계해야 한다.

> 참고: Taylor SJ, Letham B. "Forecasting at Scale" (2017), [doi:10.7287/peerj.preprints.3190v2](https://doi.org/10.7287/peerj.preprints.3190v2). Harvey AC, Peters S. "Estimation procedures for structural time series models" (1990).
