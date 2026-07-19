---
title: 26. Digital Twin 동기화와 모델 자동 생성
date: 2026-07-18
tags:
  - Simulation
  - Digital Twin
---

[[posts/foundations/simulation-and-digital-twin/17-digital-twin|17편]]은 이렇게 끝났다 — 디지털 트윈의 시뮬레이션 모델은 한 번 만들고 끝이 아니라, **실물이 마모되고 변하면 쌍둥이도 따라 변해야 진짜 쌍둥이**라고. 앞 글 [[posts/foundations/simulation-and-digital-twin/25-digital-twin-architecture-and-standards|25편]]이 트윈의 *정적* 구조(아키텍처와 표준)를 다뤘다면, 이 글은 *동적* 측면을 다룬다. 즉, 트윈을 실물과 **계속 같게 유지하는** 기술이다. 참고로 ISO 23247은 물리 대상과 디지털 표현 사이의 **동기화(synchronization)** 를 디지털 트윈 정의 자체에 포함시킬 만큼, 이것을 트윈의 본질로 본다.

문제는 두 층위로 나뉜다.

1. **parameter가 변한다** — 모델의 구조는 그대로인데 공정 시간·고장률 같은 수치가 실물에서 서서히 흘러간다. 해법은 가동 중 데이터로 parameter를 계속 맞추는 **온라인 보정(online calibration)**.
2. **구조 자체가 변한다** — 라인이 개편되어 흐름 자체가 달라지면 parameter 보정으로는 부족하다. 해법은 더 급진적인 **모델 자동 생성(automated model generation)**.

[[posts/foundations/simulation-and-digital-twin/12-verification-and-validation|12편]]의 V&V가 모델 *구축 시점*에 사람이 주도하는 오프라인 검증이었다면, 여기서는 그 보정 루프가 **가동 중 흘러드는 데이터 위에서 자동으로** 돌아야 한다는 점이 다르다.

## 온라인 보정 = data assimilation

먼저 parameter 층위를 정식화하자. 시뮬레이션 모델의 parameter를 $\theta$라 하자 — 예컨대 장비의 공정 시간 분포 모수, 고장률, 수율 같은 것들이다. 실물에서는 마모·환경 변화로 $\theta$가 시간에 따라 서서히 변하므로, 시점 $t$의 값 $\theta_t$를 추적해야 한다. 우리가 가진 것은 센서·MES에서 흘러드는 관측 스트림 $y_1, y_2, \dots$ (throughput, cycle time, 대기열 길이 등)이다. 목표는 관측이 쌓일 때마다 다음 분포를 갱신하는 것이다.

$$
p(\theta_t \mid y_{1:t})
$$

이 식이 말하는 것: 단일 추정값이 아니라 **"지금 parameter가 어디쯤 있을지"에 대한 확률 분포**를 유지한다는 것이다. 분포를 유지하면 추정의 불확실성까지 알 수 있고, 관측이 새로 올 때마다 베이즈 규칙으로 갱신하면 된다.

이런 문제 설정을 **data assimilation**(자료 동화)이라 부른다. 원래 **기상 예보**에서 온 발상이다 — 대기 모델은 시간이 지나면 실제 날씨와 어긋나므로, 관측소·위성 데이터로 모델의 상태를 주기적으로 교정하면서 예측을 이어간다. "모델의 예측을 관측으로 계속 잡아당긴다"는 이 구도가 디지털 트윈의 동기화와 정확히 같다.

수식으로는 두 개의 식으로 이루어진 **state-space model**(상태공간 모델 — 숨은 상태의 전이와, 상태로부터 관측이 나오는 과정을 분리해 적는 틀)이다.

$$
\theta_t = \theta_{t-1} + \varepsilon_t
$$

이 식이 말하는 것: parameter는 한순간에 점프하지 않고 잡음 $\varepsilon_t$만큼씩 **천천히 흘러간다(drift)** 는 가정이다. $\varepsilon_t$의 크기가 "실물이 얼마나 빨리 변한다고 믿는가"를 표현한다.

$$
y_t \sim p(y_t \mid \theta_t)
$$

이 식이 말하는 것: parameter가 $\theta_t$일 때 관측 $y_t$가 나올 그럴듯함(likelihood)인데, 디지털 트윈에서는 이 분포를 **시뮬레이션 모델 자체가 정의한다**. "parameter를 $\theta_t$로 놓고 시뮬레이션을 돌리면 어떤 출력이 나오는가"가 곧 likelihood다. 닫힌 수식이 없어도 시뮬레이션을 *실행*해서 평가할 수 있다는 점이 핵심이다.

두 식을 베이즈 규칙으로 엮으면 갱신 재귀가 나온다.

$$
p(\theta_t \mid y_{1:t}) \;\propto\; p(y_t \mid \theta_t) \int p(\theta_t \mid \theta_{t-1})\, p(\theta_{t-1} \mid y_{1:t-1})\, d\theta_{t-1}
$$

이 식이 말하는 것: 두 단계의 반복이다. 적분 부분은 **예측(predict)** — 어제까지의 믿음을 drift 모델로 한 걸음 퍼뜨린다(불확실성이 늘어난다). 앞의 $p(y_t \mid \theta_t)$는 **교정(update)** — 오늘의 관측과 잘 맞는 $\theta$ 쪽으로 믿음을 다시 좁힌다. 트윈이 "실물을 따라가는" 메커니즘이 바로 이 늘었다 좁혔다의 반복이다.

### particle filter로 푸는 이유

문제는 저 적분이다. 시뮬레이션이 likelihood를 정의하는 상황에서는 적분을 해석적으로 풀 수 없다. 그래서 대표적인 접근이 **particle filter**(입자 필터 — 분포를 수식 대신 가중치 붙은 표본들의 집합으로 근사하는 순차 Monte Carlo 방법)다. 1990년대 초에 제안된 이래 항법·표적 추적·로보틱스 등에서 비선형·비가우시안 상태 추정의 표준 도구로 자리 잡은 방법이다. [[posts/foundations/simulation-and-digital-twin/05-monte-carlo-simulation|5편]]에서 적분·기대값을 무작위 표본으로 추정했던 그 발상을, 시간에 따라 *순차적으로* 반복하는 것이다.

parameter 가설 입자 $N$개와 가중치의 집합 $\{(\theta_t^{(i)}, w_t^{(i)})\}_{i=1}^{N}$을 유지한다. 관측 $y_t$가 들어오면 먼저 각 입자를 drift 모델대로 한 걸음 옮기고($\theta_t^{(i)} = \theta_{t-1}^{(i)} + \varepsilon_t^{(i)}$ — 위 재귀의 예측 단계에 해당), 이어서 가중치를 갱신한다.

$$
w_t^{(i)} \;\propto\; w_{t-1}^{(i)}\; p\!\left(y_t \,\middle|\, \theta_t^{(i)}\right), \qquad \hat{\theta}_t = \sum_{i=1}^{N} w_t^{(i)}\, \theta_t^{(i)}
$$

이 식이 말하는 것: 각 입자는 "parameter가 이 값일 것"이라는 하나의 가설이고, **입자마다 그 parameter로 시뮬레이션을 돌려** 출력을 실제 관측과 비교한다. 관측과 잘 맞는 입자는 가중치가 커지고, 안 맞는 입자는 작아진다. 가중 평균 $\hat{\theta}_t$가 현재의 parameter 추정치다. 시간이 지나며 소수 입자에 가중치가 쏠리면(degeneracy), 가중치에 비례해 입자를 다시 뽑는 resampling으로 표본을 갱신한다 — [[posts/foundations/simulation-and-digital-twin/04-random-variate-generation|4편]]에서 다룬 분포 샘플링이 그대로 쓰이는 지점이다.

이 접근이 시뮬레이션 기반 디지털 트윈에 잘 맞는 이유는 분명하다. **모델을 미분하거나 수식으로 풀 필요 없이, "실행할 수 있다"는 것만으로 보정이 된다.** 실제로 [Hu & Yan (WSC 2024)](https://informs-sim.org/wsc24papers/inv175.pdf)는 particle filter 기반 data assimilation으로 시뮬레이션 디지털 트윈의 **여러 모델 parameter를 동시에 온라인 추정**하는 사례 연구를 제시했다.

간단한 예로 감을 잡자. 어떤 장비의 처리 시간 평균이 마모 때문에 5.0분에서 몇 주에 걸쳐 5.6분으로 서서히 늘고 있다고 하자. 오프라인 모델은 여전히 5.0분으로 돌면서 cycle time을 낙관적으로 예측할 것이다. particle filter 트윈이라면 — 예컨대 평균 4.8, 5.0, 5.2, …, 6.0분짜리 입자들을 유지하면서 — 매 시간 관측되는 실제 cycle time과 각 입자의 시뮬레이션 출력을 비교해, 가중치가 점점 5.5~5.7분 입자 쪽으로 옮겨 간다. 사람이 "모델이 안 맞네"라고 알아채기 전에 추정치가 실물을 따라가는 것이다.

## 동기화 주기와 fidelity의 트레이드오프

그렇다면 얼마나 자주, 얼마나 정교한 모델로 동기화해야 할까. 여기에는 정답이 하나로 정해진 공식은 없지만, 일반적으로 다음의 긴장 관계가 성립한다.

- **동기화 주기를 짧게** 할수록 실물 추적은 정확해지지만, 계산·통신 비용이 커진다. 매 갱신마다 입자 수만큼 시뮬레이션을 돌려야 한다는 점을 떠올리면 비용의 출처가 분명하다.
- **모델 fidelity**(충실도 — 모델이 실물의 세부를 얼마나 정교하게 담는가)**를 높일수록** 1회 보정에 드는 시뮬레이션 비용이 커져, 역설적으로 실시간성이 떨어진다. 가장 정교한 모델이 가장 좋은 트윈이 아닐 수 있다는 뜻이다.

그래서 실무에서 흔한 패턴은 **용도별로 주기와 fidelity를 다르게 가져가는 것**이다. 제어·모니터링처럼 빠른 반응이 필요한 용도에는 짧은 주기 + 가벼운 모델을, 생산 계획이나 정책 학습(예: 강화학습 환경)처럼 깊은 분석이 필요한 용도에는 느린 주기 + 무거운 모델을 쓴다. 결과적으로 "하나의 트윈"이 아니라, 같은 실물을 바라보는 **fidelity가 다른 모델 패밀리**를 운영하게 된다. 25편에서 본 "fit for purpose"(목적에 맞는 디지털 표현)라는 표준의 문구가 실무에서 이런 모습으로 나타나는 셈이다.

## 모델 자동 생성: 모델을 데이터에서 뽑아내기

온라인 보정은 모델의 *구조*는 맞다고 전제하고 *parameter*만 맞춘다. 하지만 라인이 개편되고 장비가 추가되고 흐름이 바뀌는 공장에서는 구조 자체가 낡는다. 수작업으로 만든 시뮬레이션 모델은 완성되는 순간부터 낡기 시작하는데, 이를 **model obsolescence**(모델 노후화)라 부른다. 여기서 더 급진적인 질문이 나온다 — **"모델을 사람이 만들지 말고, 데이터에서 자동으로 뽑아내면 안 되나?"**

다행히 공장에는 재료가 이미 있다. MES와 장비가 남기는 **이벤트 로그** — "어느 lot이, 언제, 어느 공정/장비를 지났는가"의 기록이다. 예를 들면 이런 식이다.

```text
lot_id  activity      timestamp
L001    ETCH-01 시작   09:00:12
L001    ETCH-01 종료   09:07:45
L001    CLEAN-02 시작  09:11:03
L002    ETCH-01 시작   09:08:10
...
```

이 로그에서 시뮬레이션 모델을 뽑아내는 파이프라인은 대략 다음과 같다.

1. **Process discovery** — **process mining**(이벤트 로그에서 실제 업무·공정 흐름을 자동으로 발견·분석하는 데이터 분석 분야)의 핵심 기법으로, 로그로부터 "어떤 공정 다음에 어떤 공정이 오는가"의 흐름 구조(Petri net이나 material flow 그래프)를 자동 발견한다.
2. **DES 모델 변환 + parameter 적합** — 발견된 흐름 구조를 DES 모델(station, queue, routing)로 변환하고, 각 공정의 처리 시간 분포 등을 로그 데이터로 적합한다. 이 단계가 바로 [[posts/foundations/simulation-and-digital-twin/10-input-modeling|10편의 input modeling]]이다 — 히스토그램을 그리고, 분포 가족을 고르고, MLE로 모수를 추정하고, 적합도를 검정하는 그 절차가 자동 파이프라인 안에 그대로 들어간다.
3. **검증·튜닝** — 생성된 모델이 로그의 실제 성능(cycle time, throughput)을 재현하는지 확인한다. [[posts/foundations/simulation-and-digital-twin/12-verification-and-validation|12편]]의 historical validation이 자동화된 형태다.

대표 연구가 [Lugaresi & Matta (2021)](https://doi.org/10.1016/j.jmsy.2021.01.005)다 (*Journal of Manufacturing Systems*, [오픈액세스](https://hal.science/hal-03880463/)). 이벤트 로그에서 제조 시스템의 material flow 그래프를 발견하고, 이를 DES 기반 디지털 트윈으로 자동 생성하는 방법을 제시했다.

이것이 왜 중요한가. 자동 생성이 가능하면 **자동 재생성**도 가능하기 때문이다. 라인이 바뀌면 최신 로그로 모델을 다시 뽑으면 된다 — 트윈 유지보수의 병목이었던 "모델을 실물에 맞게 고치는 사람 손"이 루프에서 빠지고, model obsolescence 문제가 구조적으로 완화된다. 온라인 보정이 parameter 수준의 동기화라면, 자동 재생성은 **모델 구조 수준의 동기화**인 셈이다.

이 방향은 이제 하나의 연구 흐름으로 자리 잡았다. WSC 2024의 논문 ["Process Mining as Catalyst of Digital Twins for Production Systems"](https://dl.acm.org/doi/10.5555/3712729.3712985)는 process mining과 디지털 트윈 결합의 과제와 연구 기회를 정리했고, 최근에는 [LLM으로 DES 모델 생성을 시도하는 연구](https://www.sciencedirect.com/science/article/pii/S0278612526000427) (*Journal of Manufacturing Systems*, 2026)까지 등장했다 — 로그와 구조화된 데이터뿐 아니라 자연어로 된 공정 기술(description)에서도 모델을 뽑아내려는 시도다.

## 정리

- 디지털 트윈을 트윈답게 만드는 것은 **동기화**다 (ISO 23247은 이를 정의에 포함한다). 동기화는 **parameter 수준**(온라인 보정)과 **구조 수준**(모델 자동 재생성)으로 나뉜다.
- 온라인 보정은 **data assimilation** 문제다: drift하는 parameter $\theta_t$를 관측 스트림으로 추적하며 $p(\theta_t \mid y_{1:t})$를 갱신한다. 시뮬레이션이 likelihood를 정의하므로 **particle filter** — parameter 가설 입자마다 시뮬레이션을 돌려 관측과 맞는 입자에 가중치를 주는 방법 — 가 잘 맞는다 (Hu & Yan, WSC 2024).
- **동기화 주기 ↑ → 정확도 ↑, 비용 ↑** / **fidelity ↑ → 1회 보정 비용 ↑ → 실시간성 ↓** 의 트레이드오프 때문에, 실무에서는 용도별로 fidelity가 다른 **모델 패밀리**를 운영한다.
- **모델 자동 생성**은 이벤트 로그 → process discovery → DES 변환 + input modeling → 검증의 파이프라인으로 모델을 데이터에서 뽑아낸다 (Lugaresi & Matta, 2021). 자동 재생성은 **model obsolescence**를 구조적으로 완화하며, process mining·LLM과의 결합으로 연구가 이어지고 있다.

다음 글 [[posts/foundations/simulation-and-digital-twin/27-digital-twin-trends|27편]]에서는 디지털 트윈의 최신 트렌드를 살펴본다.

## 참고문헌

- X. Hu, M. Yan, "Data Assimilation for Online Calibration of Simulation Digital Twin — A Case Study with Multiple Model Parameters," *Proc. Winter Simulation Conference (WSC)*, 2024. [PDF](https://informs-sim.org/wsc24papers/inv175.pdf) / [DOI: 10.1109/WSC63780.2024.10838855](https://doi.org/10.1109/WSC63780.2024.10838855)
- G. Lugaresi, A. Matta, "Automated manufacturing system discovery and digital twin generation," *Journal of Manufacturing Systems*, 59, pp. 51–66, 2021. [DOI: 10.1016/j.jmsy.2021.01.005](https://doi.org/10.1016/j.jmsy.2021.01.005) / [오픈액세스 (HAL)](https://hal.science/hal-03880463/)
- G. Lugaresi et al., "Process Mining as Catalyst of Digital Twins for Production Systems: Challenges and Research Opportunities," *Proc. Winter Simulation Conference (WSC)*, 2024. [ACM DL](https://dl.acm.org/doi/10.5555/3712729.3712985) / [IEEE Xplore](https://ieeexplore.ieee.org/document/10838896/)
- "LLM-driven discrete-event simulation: A generative AI framework for automated model generation, adaptation, and evaluation in manufacturing," *Journal of Manufacturing Systems*, 2026. [ScienceDirect](https://www.sciencedirect.com/science/article/pii/S0278612526000427)
- ISO 23247-1:2021, *Digital twin framework for manufacturing — Part 1: Overview and general principles*. [ISO](https://www.iso.org/standard/78743.html)
