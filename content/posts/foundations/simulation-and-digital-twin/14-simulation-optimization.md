---
title: 14. 시뮬레이션 최적화 개관
date: 2026-06-30
tags:
  - Simulation
---

[[posts/foundations/simulation-and-digital-twin/13-variance-reduction-and-doe|앞 글]]의 실험 설계가 "어떤 요인이 결과에 중요한가"를 가려내는 것이었다면, 한 걸음 더 나아간 질문은 이것이다. **"그래서 최선의 설정은 무엇인가?"** 서버를 몇 대 두고, 버퍼를 얼마로 하고, 어떤 디스패칭 규칙을 쓸 때 처리량이 최대가 되는가. 이렇게 **시뮬레이션을 목적함수로 삼아 최적해를 찾는** 문제가 simulation optimization이다. 이 글은 4부의 마무리로 그 지형을 개관하고, 응용(특히 강화학습)으로 가는 다리를 놓는다.

## 무엇이 어려운가

찾고 싶은 것은 결정변수 $x$(서버 수, 규칙 등)에 대한 목적함수

$$
f(x) = \mathbb{E}[\,\text{시뮬레이션 출력} \mid x\,]
$$

의 최대(또는 최소)다. 그런데 이 $f$는 보통의 최적화 문제와 세 가지 점에서 다르다.

- **닫힌 형태가 없다**: $f(x)$를 알려면 시뮬레이션을 돌려 봐야 한다. 수식으로 미분할 수 없다.
- **잡음이 있다**: [[posts/foundations/simulation-and-digital-twin/11-output-analysis|출력은 표본]]이라, 같은 $x$라도 돌릴 때마다 값이 다르다. 우리가 보는 것은 $f(x)$가 아니라 잡음 섞인 추정치다.
- **평가가 비싸다**: 한 번의 (신뢰할 만한) 평가에도 여러 번의 반복 실행이 필요하다. 그래서 *평가 횟수를 아끼는* 것이 관건이다.

이 세 특성 때문에, 일반적인 [[posts/foundations/optimization-in-learning/06-optimization-vs-learning|최적화]] 기법을 그대로 쓰기 어렵고 전용 접근이 발전했다.

## 대표적 접근

**후보가 유한할 때 — Ranking & Selection.** 비교할 설정이 몇 개에서 수십 개로 한정되면(예: 규칙 A·B·C 중 최선), 각 후보를 충분히 반복 실행해 통계적으로 최선을 가려낸다. "정해진 신뢰수준으로 진짜 최선을 고를" 보장을 어떻게 최소 실행으로 얻느냐가 이론의 초점이다.

**설계 공간이 연속·고차원일 때 — Metamodeling.** 비싼 시뮬레이션을 *값싼 근사 모델*(metamodel, surrogate)로 대체한다. 몇몇 점에서 시뮬레이션을 돌려 얻은 결과로 회귀나 크리깅(Gaussian process) 같은 응답표면(response surface)을 적합하고, 그 싼 모델 위에서 최적점을 탐색한다. 이 발상을 잡음·평가비용에 맞게 정교화한 것이 **베이지안 최적화**(Bayesian optimization)로, 다음에 어디를 평가할지 똑똑하게 고른다.

**구조가 복잡할 때 — Metaheuristics.** 유전 알고리즘(GA), simulated annealing(SA) 등 일반적 탐색 휴리스틱으로 좋은 해를 찾는다. 상용 시뮬레이션 소프트웨어의 최적화 모듈(예: OptQuest)이 대표적으로 이 계열을 쓴다.

## 강화학습으로 가는 다리

지금까지의 접근은 대부분 *정적인* 설정값 $x$를 찾는다. 하지만 많은 운영 문제는 한 번 정하고 끝이 아니라, **시스템 상태를 보며 매 순간 의사결정을 내리는** 동적 제어 문제다 — 어느 장비에 어떤 작업을 언제 넣을지 같은 스케줄링·디스패칭이 그렇다.

이때 관점을 살짝 틀면 시뮬레이션은 곧 **강화학습의 환경(environment)** 이 된다. 시뮬레이터의 상태가 RL의 state, 디스패칭 결정이 action, 성능 지표가 reward가 되어, [[posts/foundations/introduction-to-rl/01-introduction-to-reinforcement-learning|강화학습]] 에이전트가 *정책(policy)* 자체를 학습한다. 정적 설정을 고르는 simulation optimization에서, 상태 의존적 행동 규칙을 학습하는 RL로 넘어가는 것이다.

> 바로 이 지점이 이 시리즈를 떠받치는 동기다. 검증된 시뮬레이터가 있어야 그 위에서 RL로 스케줄링 정책을 학습할 수 있다. 이 시리즈는 그 "검증된 시뮬레이터"를 만들기 위한 이론적 토대였다. 실제 도메인(반도체 제조 등)에 이를 적용하는 과정은 **별도의 응용 글**에서 다룬다.

## 정리

- **시뮬레이션 최적화**는 시뮬레이션을 목적함수 $f(x)=\mathbb{E}[\text{출력}\mid x]$로 삼아 최선의 설정을 찾는다.
- $f$는 **닫힌 형태가 없고, 잡음이 있고, 평가가 비싸서** 전용 기법이 필요하다.
- 후보가 유한하면 **ranking & selection**, 연속·고차원이면 **metamodeling/베이지안 최적화**, 복잡하면 **metaheuristics**를 쓴다.
- 정적 설정을 넘어 *상태 의존적 동적 제어*가 필요하면, 시뮬레이터는 **강화학습의 환경**이 된다 — 응용으로 가는 다리.

여기까지가 시뮬레이션 실험·분석 방법론(4부)이다. 다음 5부에서는 DES 바깥의 다른 패러다임, [[posts/foundations/simulation-and-digital-twin/15-continuous-simulation-system-dynamics|연속 시뮬레이션과 System Dynamics]]로 시야를 넓힌다.
