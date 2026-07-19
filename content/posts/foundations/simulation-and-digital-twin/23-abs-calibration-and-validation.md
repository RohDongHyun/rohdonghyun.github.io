---
title: 23. ABS 보정과 검증
date: 2026-07-18
tags:
  - Simulation
---

[[posts/foundations/simulation-and-digital-twin/22-odd-protocol|앞 글]]이 agent-based 모델을 "어떻게 빠짐없이 기술하는가"(ODD protocol)였다면, 이 글은 그다음 두 질문을 다룬다. **parameter를 어떻게 데이터에 맞추고**(calibration, 보정), **나온 결과를 어떻게 믿을 수 있는가**(validation). [[posts/foundations/simulation-and-digital-twin/16-agent-based-simulation|16편]]에서 ABM의 대가로 짚었던 "행동 규칙과 parameter가 많아 검증·보정이 어렵다"는 문제를, 이제 정면으로 파고든다.

ABM의 보정은 일반적인 통계 추정과 근본적으로 다르다. 셋이 겹쳐서 어렵다. (1) parameter가 많고, (2) 시뮬레이션 한 번이 비싸고, (3) **likelihood를 쓸 수 없다.** 특히 세 번째가 핵심이다. 아래에서 왜 그런지부터 본다.

## 왜 표준 통계 추정이 안 되나

보통의 모수 추정은 관측 데이터 $y_{obs}$가 주어졌을 때, 그 데이터가 나올 확률을 최대로 만드는 parameter를 고른다 — 이것이 **최대우도추정**(maximum likelihood, likelihood는 "주어진 $\theta$에서 관측이 나올 그럴듯함"을 뜻하는 $p(y_{obs}\mid\theta)$)이다.

$$
\hat{\theta} = \arg\max_{\theta}\; p(y_{obs} \mid \theta)
$$

이 식이 성립하려면 $p(y \mid \theta)$를 **계산할 수 있어야** 한다. 정규분포·포아송처럼 밀도함수가 수식으로 주어지는 [[posts/foundations/simulation-and-digital-twin/10-input-modeling|input modeling]]에서는 이게 가능하다. 그런데 ABM은 그런 밀도함수를 주지 않는다. parameter $\theta$를 넣으면 모델 $M$은 확률을 알려주는 대신, 표본 하나 $y_{sim}$을 뱉을 뿐이다.

$$
y_{sim} \sim M(\theta)
$$

이 식이 말하는 것은, ABM이 **표본 추출기(sampler)일 뿐 밀도 계산기가 아니라는** 점이다. $\theta$를 넣고 돌리면 결과 하나가 나오지만, "이 특정 $y_{obs}$가 나올 확률이 얼마냐"는 물어볼 수 없다. 수천 개 에이전트의 상호작용을 거친 출력의 분포에는 닫힌 형태가 없기 때문이다. 그래서 위의 $\arg\max p(y_{obs}\mid\theta)$를 아예 쓸 수 없다. 이것이 **likelihood-free**(우도 없음) 또는 **simulation-based inference**(시뮬레이션 기반 추론) 문제다.

[[posts/foundations/simulation-and-digital-twin/05-monte-carlo-simulation|5편]]의 Monte Carlo가 "표본을 뽑아 기대값을 추정"하는 도구였다면, 여기서는 그 표본 추출 능력만 가지고 거꾸로 **parameter를 추론**해야 한다. 표본은 마음껏 뽑을 수 있지만 확률은 못 읽는 상황 — 이 제약이 아래 모든 기법의 출발점이다.

## Pattern-Oriented Modeling: 여러 패턴으로 거르기

Grimm 등이 생태학에서 제안한 **Pattern-Oriented Modeling(POM)** 은 통계적 추론에 앞서 던지는 더 근본적인 실용 전략이다. 아이디어는 이렇다. 단일 지표 하나에 모델을 맞추지 말고, **여러 수준에서 관측되는 패턴을 동시에 재현**하는 모델 구조·parameter만 살아남게 하라.

왜 이게 강력한가. 패턴 하나는 **우연히도** 맞출 수 있다. 예컨대 "전체 개체 수의 평균"만 맞추는 parameter 조합은 수없이 많다. 그런데 거시 패턴(전체 개체 수 곡선)과 미시 패턴(개체별 이동 거리 분포, 공간적 군집 형태)을 **여러 개 동시에** 맞추라고 하면, 우연히 다 맞기는 급격히 어려워진다. 즉 여러 패턴은 겹겹의 **필터**로 작동해, 현실을 제대로 담지 못한 모델을 걸러낸다.

POM은 통계량 하나로 요약할 때 잃어버리는 정보를 되살린다는 점에서, ABM 보정의 지침 같은 역할을 한다. 뒤에 볼 equifinality(서로 다른 모델이 같은 거시 패턴을 내는 문제)를 완화하는 핵심 장치이기도 하다. 출처: V. Grimm et al., "Pattern-Oriented Modeling of Agent-Based Complex Systems: Lessons from Ecology", *Science* 310(5750), 2005. [DOI](https://doi.org/10.1126/science.1116681)

## ABC: likelihood 없이 베이지안 추론

**Approximate Bayesian Computation(ABC)** 은 likelihood를 계산하지 못하는 상황에서 베이지안 사후분포를 근사하는 대표적 방법이다. 베이지안 추론은 원래 사전분포 $p(\theta)$와 likelihood $p(y_{obs}\mid\theta)$를 곱해 사후분포 $p(\theta\mid y_{obs})$를 얻는데, likelihood를 못 쓰니 **시뮬레이션으로 대신한다**는 것이 발상의 전부다.

가장 기본형인 **rejection ABC** 알고리즘은 다음과 같다.

1. 사전분포에서 parameter를 하나 뽑는다: $\theta^{(i)} \sim p(\theta)$.
2. 그 parameter로 모델을 돌려 가상 데이터를 얻는다: $y^{(i)} \sim M(\theta^{(i)})$.
3. 가상 데이터가 관측과 충분히 비슷하면 채택한다. 즉 요약통계(summary statistic) $S(\cdot)$로 요약한 뒤 거리가 문턱값 이하이면($d(S(y^{(i)}), S(y_{obs})) \le \epsilon$) $\theta^{(i)}$를 남기고, 아니면 버린다.

여기서 **요약통계** $S$는 고차원 출력(예: 시계열 전체)을 몇 개의 숫자(평균, 분산, 자기상관 등)로 압축한 것이고, $d$는 그 숫자들 사이의 거리다. 이렇게 채택된 표본들이 이루는 분포가 근사 사후분포다.

$$
p_\epsilon(\theta \mid y_{obs}) \propto p(\theta)\, \Pr\!\bigl[\, d(S(y_{sim}), S(y_{obs})) \le \epsilon \,\bigr]
$$

이 식이 말하는 것은, likelihood $p(y_{obs}\mid\theta)$의 자리를 **"이 $\theta$로 돌렸을 때 관측과 $\epsilon$ 이내로 가까운 결과가 나올 확률"** 이 대신한다는 점이다. 밀도를 못 읽으니, "가깝게 재현할 수 있느냐"라는 시뮬레이션 가능한 사건의 확률로 갈아 끼운 것이다. $\theta$가 관측을 잘 재현할수록 이 확률이 커지고, 따라서 사후분포에서 더 큰 비중을 갖는다.

핵심 트레이드오프는 문턱값 $\epsilon$에 있다.

- $\epsilon \to 0$: 채택 조건이 엄격해져 근사가 참 사후분포에 가까워진다. 그러나 조건을 통과하는 표본이 거의 없어 **채택률이 0으로** 떨어진다 — 비싼 시뮬레이션을 무수히 버리게 된다.
- $\epsilon$이 큼: 웬만하면 채택되어 효율적이지만, 관측과 꽤 다른 $\theta$까지 살아남아 **부정확**해진다.

또 하나 주의할 점은 요약통계 $S$의 선택이 사실상 **모델링 결정**이라는 것이다. $S$가 관측의 중요한 정보를 버리면(예: 평균만 보고 분산을 무시), 그 정보에 관해서는 아무리 $\epsilon$을 줄여도 parameter를 식별할 수 없다. 앞의 POM이 "패턴을 여러 개 보라"고 한 것과 정확히 같은 문제다 — $S$를 잘 고르는 일이 곧 좋은 패턴 집합을 고르는 일이다.

기본 rejection ABC는 사전분포에서 마구잡이로 뽑아 대부분 버리므로 비효율적이다. 이를 개선하려고 [[posts/foundations/statistics/07-markov-chain-monte-carlo|MCMC]](사후분포가 높은 영역을 집중 탐색하는 표본 추출법)와 결합한 **ABC-MCMC**, 순차적으로 $\epsilon$을 줄여 가는 ABC-SMC 같은 변형이 있다. 여기서는 이런 갈래가 있다는 정도만 짚어 둔다.

## Surrogate 기반 보정: 비싼 시뮬레이터 대신 근사 모델

세 어려움 중 "시뮬레이션이 비싸다"는 문제는 [[posts/foundations/simulation-and-digital-twin/14-simulation-optimization|14편 simulation optimization]]에서 이미 만난 적 있다. 거기서 쓴 처방이 여기서도 그대로 통한다. 입력 $\theta$에서 출력(또는 출력과 관측의 불일치)으로 가는 관계를 **값싼 근사 모델**(surrogate, emulator, metamodel)로 학습해, 진짜 시뮬레이터 대신 그 위에서 탐색·추론하는 것이다.

가장 흔한 선택은 Gaussian process(가우스 과정)다. 몇몇 $\theta$ 점에서만 실제 시뮬레이션을 돌려 데이터를 얻고, 그 사이를 부드럽게 이어 붙여 "안 돌려 본 $\theta$에서 출력이 대략 얼마일지 + 그 예측이 얼마나 불확실한지"를 함께 준다. 이 불확실성 정보가 있어야 "다음엔 어디를 실제로 돌려 볼지"를 똑똑하게 고를 수 있다.

보정을 하나의 최적화 문제로 보면 이 연결이 더 선명하다. 관측과 시뮬레이션 출력의 불일치를 목적함수로 두면,

$$
\hat{\theta} = \arg\min_{\theta}\; d\bigl(S(y_{obs}),\, S(M(\theta))\bigr)
$$

**"관측과 가장 덜 어긋나는 parameter 찾기"** 가 된다. 이 식은 [[posts/foundations/simulation-and-digital-twin/14-simulation-optimization|14편]]의 $\arg\max_x f(x)$와 형태가 똑같다 — 결정변수가 설계값 $x$에서 parameter $\theta$로 바뀌었을 뿐이다. 그래서 14편의 metamodeling·베이지안 최적화 기법이 그대로 보정에 쓰인다. ABC가 사후분포 **전체**(불확실성까지)를 원할 때의 답이라면, 이 최적화 관점은 **점 추정** 하나면 충분할 때의 값싼 답이다.

## Validation: ABM에 V&V를 적용할 때의 추가 쟁점

[[posts/foundations/simulation-and-digital-twin/12-verification-and-validation|12편]]에서 세운 V&V 틀 — verification(코드가 모델대로 도는가)과 validation(모델이 현실대로인가) — 은 ABM에도 그대로 적용된다. 다만 ABM 특유의 어려움 때문에 세 가지 쟁점이 더 붙는다.

**(a) Stylized facts 검증.** ABM은 출력을 실데이터와 숫자 대 숫자로 정확히 맞추기 어려울 때가 많다. 이때는 정량 적합 대신 **정성적 규칙성**(stylized facts, 그 분야에서 반복 관찰되는 질적 특징 — 예: 금융 시장의 "수익률은 무상관이나 변동성은 뭉쳐 나타난다", 도시의 "인구는 멱법칙 분포를 따른다")을 모델이 재현하는지 본다. 12편의 face validity를 한 단계 정량화한 형태로 볼 수 있다.

**(b) 민감도 분석의 2단계화.** ABM은 parameter가 많아 [[posts/foundations/simulation-and-digital-twin/12-verification-and-validation|12편]]에서 말한 민감도 분석을 순진하게 하면 조합이 폭발한다. 그래서 두 단계로 나눈다. 먼저 **Morris screening**(각 parameter를 한 번에 하나씩 조금씩 바꿔 영향의 크기를 대략 재는 값싼 스크리닝)으로 중요한 소수 parameter를 거르고, 그 소수에 대해서만 **Sobol index**(출력 분산 중 각 parameter와 그 상호작용이 설명하는 비율을 정밀히 분해하는 지표)로 정밀 분석한다. 값싼 필터로 좁힌 뒤 비싼 분석을 집중하는 이 발상은 [[posts/foundations/simulation-and-digital-twin/13-variance-reduction-and-doe|13편 실험 설계]]의 정신과 같다.

**(c) Equifinality.** ABM validation에서 가장 미묘한 함정이다. **equifinality**란 서로 다른 규칙·parameter 조합이 **똑같은 거시 패턴**을 낼 수 있다는 성질이다. 예를 들어 도시가 분리되는 패턴은 강한 개인 선호로도, 약한 선호에 특정 이동 규칙이 겹쳐서도 나올 수 있다. 그래서 "내 모델이 관측된 창발 패턴을 그럴듯하게 재현했다"는 사실은 그 모델이 **옳다는 증거가 되지 못한다.** 같은 결과를 내는 다른 모델이 얼마든지 있기 때문이다. [[posts/foundations/simulation-and-digital-twin/16-agent-based-simulation|16편]]에서 "그럴듯한 창발이 나왔다고 모델이 옳다는 보장은 없다"고 경계한 것이 바로 이 문제다.

여기서 앞의 POM이 다시 등장한다. 패턴 하나만 맞추면 그 패턴을 내는 수많은 모델이 모두 통과하지만(equifinality), 거시·미시 패턴 여러 개를 동시에 요구하면 그중 대부분이 걸러진다. POM은 equifinality를 **완전히 없애지는 못해도 크게 좁히는** 장치다.

## 정리

- ABM 보정이 어려운 근본 이유는 **likelihood-free** — 모델이 밀도 $p(y\mid\theta)$를 주지 않고 표본 $y_{sim}\sim M(\theta)$만 뱉어, 표준 최대우도추정 $\arg\max p(y_{obs}\mid\theta)$를 쓸 수 없다.
- **POM**은 여러 수준의 패턴을 동시에 재현하도록 요구해, 현실을 못 담은 모델을 겹겹의 필터로 걸러낸다.
- **ABC**는 likelihood 자리에 "관측과 $\epsilon$ 이내로 재현할 확률"을 넣어 사후분포를 근사한다. $\epsilon$은 정확도-효율 트레이드오프이고, 요약통계 $S$의 선택이 곧 모델링 결정이다.
- 시뮬레이터가 비싸면 **surrogate**로 근사해, 보정을 [[posts/foundations/simulation-and-digital-twin/14-simulation-optimization|14편]]식 최적화로 풀 수 있다.
- Validation의 추가 쟁점: **stylized facts**(정성적 재현), **Morris→Sobol 2단계 민감도 분석**, 그리고 **equifinality**(같은 패턴을 내는 다른 모델이 많으므로, 창발 재현이 정당성의 증거가 아니다) — POM이 이를 완화한다.

여기까지가 ABM을 신뢰할 수 있게 만드는 방법이다. 다음 글에서는 지금까지 본 여러 패러다임(DES·SD·ABM)을 한 모델 안에 섞는 [[posts/foundations/simulation-and-digital-twin/24-hybrid-simulation|24편 하이브리드 시뮬레이션]]을 다룬다.

## 참고문헌

- V. Grimm et al., "Pattern-Oriented Modeling of Agent-Based Complex Systems: Lessons from Ecology", *Science* 310(5750), 2005. [DOI](https://doi.org/10.1126/science.1116681)
- V. Grimm et al., "The ODD Protocol for Describing Agent-Based and Other Simulation Models: A Second Update to Improve Clarity, Replication, and Structural Realism", *JASSS* 23(2), 2020. [DOI](https://doi.org/10.18564/jasss.4259)
