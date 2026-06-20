---
title: 01. 시계열 데이터 특성 및 처리 방법
date: 2026-06-20
private: false
---
시계열(time series) 데이터는 "시간 순서를 갖고 관측된 값들의 나열"이다. 주가, 기온, 공장 설비의 센서 값처럼 우리 주변의 많은 데이터가 시계열이다. 이 글에서는 시계열을 수학적으로 다루기 위한 기본 개념인 **stochastic process**, **stationarity**, **autocorrelation**을 살펴보고, 이를 바탕으로 가장 고전적인 예측 모델인 **ARIMA**까지 정리한다.

## Stochastic Process

**Stochastic process**(확률 과정)는 *시간 $t$에 따라 정의되는 random variable들의 집합*이다.

$$
 X_t \mid t \in T 
$$

여기서 각각의 $X_t$는 자기 자신만의 분포를 갖는 random variable이다. 그리고 우리가 실제로 손에 쥐는 **하나의 시계열 데이터는, 특정 stochastic process에서 모든 $X_t$를 한 번씩 샘플링한 결과**로 이해할 수 있다.

조금 더 직관적으로 말하면, 어떤 시점 $t$의 값 $X_t$는 "확정된 숫자"가 아니라 "주사위처럼 분포를 갖는 대상"이고, 우리가 관측한 시계열은 그 주사위들을 시간 순서대로 한 번씩 던진 결과 하나라는 뜻이다. 같은 process라도 다시 샘플링하면 다른 모양의 시계열이 나올 수 있다.

## Gaussian White Noise Process

가장 기본이 되는 stochastic process는 **Gaussian white noise process** $ \epsilon_t \mid t \in T $ 이다. 다음 세 조건을 만족하는 process를 말한다.

$$
\mathbb{E}[\epsilon_t] = 0
$$

$$
\mathrm{Var}[\epsilon_t] = \sigma^2
$$

$$
\mathrm{Cov}[\epsilon_t, \epsilon_{t'}] = 0 \quad (t \neq t')
$$

즉, 평균이 0이고, 분산이 시점 $t$와 무관하게 항상 $\sigma^2$로 일정하며, 서로 다른 시점의 값들은 통계적으로 독립이다. 이를 간단히 $\epsilon_t \sim N(0, \sigma^2)$로 표기한다.

White noise는 "어떤 패턴도 없는 순수한 잡음"을 의미하며, 뒤에 나오는 모든 모델에서 *예측 불가능한 무작위 충격(random shock)*을 표현하는 재료로 쓰인다.

## Auto-regressive (AR) Process

**Auto-regressive (AR) process**는 현재의 값이 *이전 시점 값들의 선형 결합*으로 표현된다고 보는 모델이다.

$$
\text{AR}(p): \quad X_t = \phi_1 X_{t-1} + \cdots + \phi_p X_{t-p} + \epsilon_t, \quad \epsilon_t \sim \text{i.i.d. } N(0, \sigma^2)
$$

여기서 $p$는 *몇 스텝 전까지의 과거 값을 사용할지*를 정하는 hyperparameter다. 예를 들어 $p=1$이면

$$
\text{AR}(1): \quad X_t = \phi_1 X_{t-1} + \epsilon_t
$$

가 된다. 이는 "가까운 과거의 값이 현재 값에 직접 영향을 준다"는 직관을 담고 있다. 예컨대 1시의 주가가 2시의 주가에 영향을 끼치는 식이다.

## Moving-average (MA) Process

**Moving-average (MA) process**는 현재의 값이 *이전 시점의 noise(error)들의 선형 결합*에 기반한다고 보는 모델이다.

$$
\text{MA}(q): \quad X_t = \epsilon_t + \theta_1 \epsilon_{t-1} + \cdots + \theta_q \epsilon_{t-q}, \quad \epsilon_t \sim \text{i.i.d. } N(0, \sigma^2)
$$

$q$ 역시 몇 스텝 전까지의 noise를 사용할지를 정하는 hyperparameter다. 예를 들어 $q=1$이면

$$
\text{MA}(1): \quad X_t = \epsilon_t + \theta_1 \epsilon_{t-1}
$$

이다. AR이 "과거의 값"을 끌어왔다면, MA는 "과거에 발생한 예측할 수 없는 사건(충격)"이 현재까지 영향을 미치는 상황을 표현한다. 예컨대 1시에 발표된 긴급 통화정책이라는 충격이 2시의 주가에 영향을 끼치는 식이다.

### MA(1) Process는 Stationary할까?

MA(1)을 예로, 이 process가 가진 통계적 성질을 직접 계산해 보자. $X_t = \epsilon_t + \theta_1 \epsilon_{t-1}$ 이므로,

평균은

$$
\mathbb{E}[X_t] = \mathbb{E}[\epsilon_t] + \theta_1 \mathbb{E}[\epsilon_{t-1}] = 0
$$

분산은

$$
\mathrm{Var}[X_t] = \mathbb{E}[(\epsilon_t + \theta_1 \epsilon_{t-1})^2] = \mathbb{E}[\epsilon_t^2] + 2\theta_1 \mathbb{E}[\epsilon_t \epsilon_{t-1}] + \theta_1^2 \mathbb{E}[\epsilon_{t-1}^2] = (1 + \theta_1^2)\sigma^2
$$

한 스텝 떨어진 값들 사이의 공분산은

$$
\mathrm{Cov}[X_t, X_{t-1}] = \mathbb{E}[(\epsilon_t + \theta_1 \epsilon_{t-1})(\epsilon_{t-1} + \theta_1 \epsilon_{t-2})] = \theta_1 \sigma^2
$$

그리고 두 스텝 이상 떨어지면

$$
\tau > 1 \implies \mathrm{Cov}[X_t, X_{t-\tau}] = 0
$$

정리하면, MA(1)의 평균·분산은 시점 $t$와 무관하게 일정하고, 두 값 사이의 공분산은 *시점이 아니라 둘 사이의 시간 간격* $\tau$에만 의존한다. 이런 성질을 갖는 process를 **stationary process**라고 부른다 (자세한 정의는 아래에서 다룬다). 즉, **MA(1) process는 stationary process**다.

## ARMA Process

**Autoregressive moving average (ARMA) process**는 AR과 MA를 함께 사용해 현재 값을 표현한다.

$$
\text{ARMA}(p, q): \quad X_t = \phi_1 X_{t-1} + \cdots + \phi_p X_{t-p} + \epsilon_t + \theta_1 \epsilon_{t-1} + \cdots + \theta_q \epsilon_{t-q}
$$

$p$, $q$는 각각 AR 항과 MA 항에서 몇 스텝의 과거를 사용할지를 정하는 hyperparameter다. 예를 들어 $\text{ARMA}(1,1)$은

$$
X_t = \phi_1 X_{t-1} + \epsilon_t + \theta_1 \epsilon_{t-1}
$$

이 된다. "과거의 값"과 "과거의 충격"을 동시에 반영한다는 점에서 AR·MA보다 표현력이 크다.

## Autocovariance

지금까지 "공분산이 시간 간격에만 의존한다"는 표현을 썼는데, 이를 정식화한 것이 **autocovariance**다. Autocovariance는 *하나의 시계열 데이터 내부의 연관성*을 나타내는 수치로, 시계열을 $\tau$만큼 이동시킨 자기 자신과의 covariance다.

$$
\gamma(\tau) = \gamma_{XX}(\tau) = \mathrm{Cov}[X_t, X_{t-\tau}] = \mathbb{E}[(X_t - \bar{X}*t)(X*{t-\tau} - \bar{X}_{t-\tau})]
$$

실제 데이터로부터 stationary process의 $\gamma(\tau)$를 추정할 때는 다음 식을 쓴다.

$$
\hat{\gamma}(\tau) = \frac{1}{N} \sum_{t=1}^{N-\tau} (X_t - \bar{X})(X_{t+\tau} - \bar{X}), \quad \bar{X} = \frac{1}{N} \sum_{t=1}^{N} X_t
$$

### 계산 예시

$X = [1, 3, 5, 7, 9]$ 라는 (설명을 위한) 시계열을 생각하자. 평균은 $\bar{X} = 5$, 분산은

$$
\hat{\sigma}*X^2 = \frac{\sum*{t=1}^{N}(X_t - \bar{X})^2}{N} = 8
$$

이다. 여기서 stationary process를 가정하면 모든 $t$에 대해 평균과 분산이 동일하다고 본다. $\tau = 1$에서의 autocovariance를 계산해 보면,

$$
\hat{\gamma}(1) = \frac{1}{5}\big[(1-5)(3-5) + (3-5)(5-5) + (5-5)(7-5) + (7-5)(9-5)\big] = \frac{1}{5}(8 + 0 + 0 + 8) = \frac{16}{5}
$$

## Autocorrelation

**Autocorrelation**은 분산을 이용해 autocovariance를 정규화한 값이다.

$$
\rho(\tau) = \rho_{XX}(\tau) = \frac{\gamma_{XX}(\tau)}{\sigma_X  \sigma_{X-\tau}} = \frac{\gamma_{XX}(\tau)}{\gamma_{XX}(0)}
$$

정규화 덕분에 autocorrelation은 항상 $-1$과 $+1$ 사이의 값을 가지며, 서로 다른 시계열끼리 연관성의 강도를 비교하기 좋다. 직관적으로, autocorrelation이 존재한다는 것은 "특정 시간대의 오르내림이 다른 시간대의 오르내림과 상관성을 갖는다"는 의미다. 반대로 white noise처럼 시점 간 상관이 전혀 없으면 ($\tau \neq 0$에서) autocorrelation은 0에 가깝다.

앞의 $X = [1,3,5,7,9]$ 예시에서 $\tau=1$의 autocorrelation을 구하면,

$$
\rho(1) = \frac{\hat{\gamma}(1)}{\hat{\sigma}_X^2} = \frac{16}{5} \times \frac{1}{8} = \frac{2}{5}
$$

> Autocorrelation의 시각적 직관은 Intel의 ["Time Series Analysis" (2018)](https://intel.com/content/www/us/en/developer/learn/course-time-series-analysis.html) 자료를 참고하면 좋다. 상관성이 없는 시계열과 추세가 이어지는 시계열을 나란히 비교해 준다.

![image.png](/images/image-2.png)

## Weak Stationarity vs. Strong Stationarity

앞에서 stationary라는 표현을 직관적으로 썼는데, 엄밀히는 두 종류가 있다.

**Weak stationarity**는 다음 세 조건을 만족하는 경우다. 일반적으로 "stationarity"라고 하면 이 weak stationarity를 가리킨다.

$$
\mu(t) = \mu, \quad \sigma^2(t) = \sigma^2, \quad \mathrm{Cov}[X(t_1), X(t_2)] = \gamma(t_1 - t_2)
$$

즉 평균과 분산이 시간과 무관하게 일정하고, 두 시점의 공분산이 *시점 자체가 아니라 두 시점의 차이*에만 의존하면 된다.

**Strong stationarity**는 한층 강한 조건으로, 시간의 변화와 관계없이 *분포 전체*가 항상 동일할 것을 요구한다. 모든 $n$, $h$, 그리고 시점 $(t_1, t_2, \ldots, t_n)$에 대해

$$
f_{X(t_1), \ldots, X(t_n)}(x_1, \ldots, x_n) = f_{X(t_1 + h), \ldots, X(t_n + h)}(x_1, \ldots, x_n)
$$

이 성립해야 한다. 현실의 데이터에서 이를 정확히 만족하기는 거의 불가능하기 때문에, 실무에서는 보통 weak stationarity를 가정한다.

## Stationarity가 왜 중요한가

Stationarity는 시계열 분석에서 데이터에 부여하는 *가장 중요하고 일반적인 가정*이다.

- 하나의 시계열 데이터가 시간에 상관없이 항상 같은 분포를 따른다는 뜻이다.
- 이 가정이 성립해야 **과거의 관측값으로 미래의 관측값을 예측**하는 것이 정당화된다.
- 머신러닝의 언어로 바꾸면, training data와 test data가 같은 분포에서 나왔다는 가정과 본질적으로 같다.

반대로 시간이 지남에 따라 평균이 점점 커지거나(추세), 분산이 달라지는 데이터는 **non-stationary**하다. 이런 데이터를 그대로 예측에 쓰면, 과거의 통계가 미래에 더 이상 유효하지 않아 예측이 무너진다. 그래서 non-stationary 시계열은 예측 전에 stationary하게 변환해 주는 처리가 필요하다.

## ARIMA Process

**Autoregressive integrated moving average (ARIMA) process**는 바로 이 non-stationary 문제를 다루기 위한 모델이다. 핵심 아이디어는, $X_t$ 자체는 stationary하지 않더라도 *변화량* $\nabla X_t$는 stationary할 수 있다는 가정이다. 그래서 $\nabla^d X_t$에 대해 ARMA$(p, q)$를 적용한다.

$$
\text{ARIMA}(p, d, q): \quad \nabla^d X_t = \phi_1 \nabla^d X_{t-1} + \cdots + \phi_p \nabla^d X_{t-p} + \epsilon_t + \theta_1 \epsilon_{t-1} + \cdots + \theta_q \epsilon_{t-q}
$$

여기서 $p$, $q$는 ARMA에서와 동일하고, 새로 등장한 $d$는 **difference operator** $\nabla$를 몇 번 적용할지를 정하는 hyperparameter다.

$$
\nabla X_t = X_t - X_{t-1}
$$

$$
\nabla^2 X_t = (X_t - X_{t-1}) - (X_{t-1} - X_{t-2})
$$

예를 들어 $\text{ARIMA}(1,1,1)$은 한 번 차분한 $\nabla X_t$에 ARMA$(1,1)$을 적용하는 것이다.

$$
\nabla X_t = \phi_1 \nabla X_{t-1} + \epsilon_t + \theta_1 \epsilon_{t-1}
$$

### ARIMA를 이용한 Forecasting 과정

ARIMA model로 미래를 예측하는 절차는 다음 네 단계로 요약된다. ($p=2$, $d=1$, $q=2$를 가정해 설명한다.)

**1. Hyperparameter 설정.** 먼저 $p$, $d$, $q$를 정한다.

**2. 파라미터 학습.** $\phi_1, \phi_2, \theta_1, \theta_2$를 주어진 데이터의 오차를 최소화하도록 학습한다. 보통 MSE(Mean Squared Error)나 AIC(Akaike's Information Criterion) 같은 기준을 최소화한다. 구체적으로는,

1. AR(2) 모델을 차분된 데이터 $\nabla X$로 학습한다.
2. 학습된 AR(2) 모델로 $\nabla X$의 예측값 $\nabla X'$을 계산한다.
3. 예측 오차 $\epsilon = \nabla X - \nabla X'$을 계산한다.
4. 이 예측 오차 $\epsilon$을 데이터로 사용하여 MA(2) 모델을 학습한다.

**3. 차분값 예측.** $\nabla X_{t-1}, \nabla X_{t-2}, \epsilon_{t-1}, \epsilon_{t-2}$를 대입하여 $t$ 시점의 $\nabla X_t$를 예측한다.

1. $\nabla X_{t-1}, \nabla X_{t-2}$와 AR(2) 모델로 $\nabla X_t'$을 예측한다.
2. $\epsilon_{t-1}, \epsilon_{t-2}$와 MA(2) 모델로 $\epsilon_t'$을 예측한다.
3. 두 예측값 $\nabla X_t'$와 $\epsilon_t'$을 더해 $\nabla X_t$를 얻는다.

**4. 원래 값 복원.** 차분을 되돌려 최종 예측값을 얻는다.

$$
X_t = X_{t-1} + \nabla X_t
$$

## 요약

- **Stochastic process**는 시간에 따라 정의되는 random variable의 집합이고, 시계열 데이터는 그로부터 샘플링된 결과다.
- **Stationarity**(평균·분산이 일정하고 공분산이 시간 간격에만 의존)는 과거로 미래를 예측하기 위한 핵심 가정이며, **autocorrelation**은 시계열 내부의 시간적 연관성을 정규화해 측정한다.
- **AR / MA / ARMA / ARIMA**는 과거 값과 과거 충격을 조합해 시계열을 모델링하며, 특히 ARIMA는 차분(differencing)으로 non-stationary 데이터까지 다룰 수 있다.

