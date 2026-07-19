---
title: "19. DES 형식론 (2): DEVS"
date: 2026-07-17
tags:
  - Simulation
---

[[posts/foundations/simulation-and-digital-twin/18-event-graph|18편]]의 event graph는 event scheduling worldview를 그래프 하나로 형식화하는 깔끔한 언어였다. 하지만 한계도 분명했다. event graph는 모델 전체가 **하나의 평평한(flat) 사건 네트워크**다. 장비 하나를 그래프로 그리고, 그 장비 열 대로 이루어진 라인을 그리려면 그래프를 통째로 다시 그려야 한다. "장비 모델을 부품처럼 만들어 두고, 그것을 조립해 라인을, 라인을 조립해 공장을 만든다"는 **계층적(hierarchical)·모듈식(modular) 모델링**을 지원하는 수학적 장치가 없다.

이 문제를 정면으로 푼 것이 Bernard Zeigler가 1970년대에 제안한 **DEVS**(Discrete Event System Specification)다. DEVS는 이산사건 시스템 형식론의 정점으로 꼽히는데, 그 이유는 두 가지다. (1) 하나의 컴포넌트가 어떻게 동작하는지를 완결된 수학적 대상(atomic DEVS)으로 정의하고, (2) 컴포넌트들을 결합한 네트워크가 **다시 하나의 컴포넌트와 동등함**(closure under coupling)을 증명해, 조립을 무한히 중첩할 수 있게 했다. 이 글에서 그 두 축을 차례로 본다.

## Atomic DEVS: 컴포넌트 하나의 완결된 명세

DEVS의 기본 단위인 **atomic DEVS**는 다음 7-tuple로 정의된다.

$$
M = (X, Y, S, \delta_{ext}, \delta_{int}, \lambda, ta)
$$

각 성분을 하나씩 풀면 이렇다.

- $X$: **입력 이벤트 집합**. 이 컴포넌트가 외부로부터 받을 수 있는 사건들 (예: "job 도착").
- $Y$: **출력 이벤트 집합**. 이 컴포넌트가 외부로 내보낼 수 있는 사건들 (예: "job 완료").
- $S$: **상태 집합**. 컴포넌트 내부 상태가 취할 수 있는 값들.
- $ta: S \to \mathbb{R}^+_{0,\infty}$: **time advance 함수**. 상태 $s$에 (외부 방해가 없을 때) 머무는 시간이다. 두 극단값이 특히 중요하다. $ta(s) = \infty$면 그 상태는 외부 입력이 올 때까지 영원히 대기하는 **passive 상태**(예: 유휴 서버)이고, $ta(s) = 0$이면 진입하자마자 즉시 전이하는 **transitory 상태**다.
- $\delta_{int}: S \to S$: **internal transition 함수**. 상태 $s$에 머문 시간이 $ta(s)$에 도달해 *스스로* 일어나는 전이. "서비스 시간이 다 되어 작업이 끝난다"가 여기에 해당한다.
- $\lambda: S \to Y$: **output 함수**. internal transition이 일어나기 **직전**에 출력을 낸다. 즉 DEVS에서 출력은 오직 내부 전이의 순간에만 발생한다 — 외부 입력을 받는 순간에는 출력이 나가지 않는다는 것이 형식론의 규칙이다.
- $\delta_{ext}: Q \times X \to S$: **external transition 함수**. 외부 입력이 도착했을 때의 전이. 정의역의 $Q$가 핵심인데,

$$
Q = \{(s, e) \mid s \in S,\ 0 \le e \le ta(s)\}
$$

로 정의되는 **total state**(전체 상태) 집합이다. 여기서 $e$는 현재 상태에 머문 **경과 시간**(elapsed time)이다. 이 식이 말하는 것은, external transition이 "지금 상태가 무엇인가"($s$)뿐 아니라 **"그 상태에 얼마나 오래 있었는가"($e$)에도 의존할 수 있다**는 점이다. 예컨대 서비스 중인 서버에 고장 사건이 도착하면, 남은 서비스 시간 $ta(s) - e$를 기억했다가 수리 후 이어서 처리하는 모델을 자연스럽게 쓸 수 있다. "같은 입력이라도 언제 도착했느냐에 따라 다음 상태가 다르다"를 형식화한 것이다.

### 동작 시맨틱스: 한 컴포넌트의 일생

7-tuple이 실제로 어떻게 굴러가는지를 시나리오로 서술하면 다음과 같다. 컴포넌트가 상태 $s$에 진입했다고 하자.

1. 컴포넌트는 $ta(s)$ 동안 그 상태에 머물 예정으로 대기한다.
2. **(a) 그 사이 아무 입력도 없으면**: 시간이 $ta(s)$에 도달하는 순간, 먼저 출력 $\lambda(s)$를 내보내고, 곧바로 새 상태 $s' = \delta_{int}(s)$로 전이한다. 그리고 새 상태에서 다시 1로 돌아간다.
3. **(b) 경과 시간 $e < ta(s)$에 입력 $x$가 도착하면**: 출력 없이 즉시 $s' = \delta_{ext}((s, e), x)$로 전이한다. 예정되어 있던 internal transition은 취소되고, 새 상태 $s'$에서 다시 1로 돌아간다.

이 규칙은 [[posts/foundations/simulation-and-digital-twin/06-discrete-event-simulation-concepts|6편]]에서 본 next-event 엔진의 동작 — "다음 사건 시각까지 점프한다" — 을 컴포넌트 하나의 관점에서 다시 쓴 것이다. $ta(s)$가 그 컴포넌트의 "다음 내부 사건까지 남은 시간"이고, 외부 입력은 그 예약을 중간에 갈아치우는 사건이다.

## 예시: 단일 서버 큐를 atomic DEVS로

6편의 단일 서버 대기열을 atomic DEVS로 옮겨 보자. 상태를 $(phase, q)$ 쌍으로 두는데, $phase \in \{\text{idle}, \text{busy}\}$는 서버 상태, $q \in \{0, 1, 2, \dots\}$는 대기 중인 job 수다. 입력은 job 도착($X = \{\text{arrive}\}$), 출력은 job 완료($Y = \{\text{done}\}$), 서비스 시간은 $t_s$로 고정한다(확률적 서비스 시간은 상태에 샘플링된 잔여 시간을 넣는 식으로 확장할 수 있다).

| 성분 | 정의 | 의미 |
|---|---|---|
| $S$ | $\{\text{idle}, \text{busy}\} \times \{0,1,2,\dots\}$ | (서버 상태, 대기 job 수) |
| $ta(\text{idle}, q)$ | $\infty$ | 유휴면 입력이 올 때까지 영원히 대기 (passive) |
| $ta(\text{busy}, q)$ | $t_s$ | 서비스 중이면 $t_s$ 뒤에 완료 |
| $\delta_{ext}(((\text{idle}, 0), e), \text{arrive})$ | $(\text{busy}, 0)$ | 유휴 서버에 job 도착 → 즉시 서비스 시작 |
| $\delta_{ext}(((\text{busy}, q), e), \text{arrive})$ | $(\text{busy}, q+1)$ | 서비스 중 도착 → 큐에 추가 (진행 중 서비스는 그대로) |
| $\lambda(\text{busy}, q)$ | $\text{done}$ | 서비스 완료 직전, 완료된 job을 출력 |
| $\delta_{int}(\text{busy}, q)$ | $q > 0$이면 $(\text{busy}, q-1)$, $q = 0$이면 $(\text{idle}, 0)$ | 큐에 job이 남았으면 다음 서비스 시작, 없으면 유휴로 |

6편에서 "도착 사건 처리 루틴"과 "종료 사건 처리 루틴"으로 절차적으로 적었던 내용이, 여기서는 함수 몇 개의 **선언적 정의**로 바뀌었다. 어느 쪽이 실행되는지는 이제 모델이 아니라 (뒤에서 볼) 시뮬레이터의 몫이다.

한 가지 짚을 점: 위 $\delta_{ext}$에서 "서비스 중 도착 → 큐에 추가"라고만 했는데, 진행 중이던 서비스의 남은 시간은 어떻게 되는가? Classic DEVS의 규칙상 external transition이 일어나면 새 상태에서 $ta$가 새로 시작되므로, 남은 서비스 시간을 유지하려면 상태에 잔여 시간 $\sigma$를 명시적으로 넣고 $\delta_{ext}$에서 $\sigma \leftarrow \sigma - e$로 갱신하는 것이 표준 기법이다. 위 표는 이해를 위해 이 세부를 생략한 단순화다.

## Coupled DEVS: 컴포넌트를 조립하기

atomic DEVS가 부품이라면, **coupled DEVS**는 부품들을 배선한 조립도다. coupled 모델은 대략 다음으로 명세된다.

- **컴포넌트 집합** $\{M_1, \dots, M_n\}$: 각각 atomic DEVS이거나, *또 다른 coupled DEVS*여도 된다.
- **EIC**(external input coupling): 결합 모델의 외부 입력 포트를 어느 컴포넌트의 입력에 연결할지.
- **EOC**(external output coupling): 어느 컴포넌트의 출력을 결합 모델의 외부 출력 포트로 내보낼지.
- **IC**(internal coupling): 컴포넌트끼리의 연결 — 누구의 출력이 누구의 입력이 되는지.

즉 coupled DEVS는 새로운 동역학을 정의하지 않는다. 컴포넌트들의 동작은 각자의 7-tuple이 이미 정하고 있고, coupled 모델은 **오직 배선만** 정한다.

### Closure under coupling: 계층화의 수학적 근거

여기서 DEVS의 핵심 정리가 나온다.

> **Closure under coupling**: 임의의 coupled DEVS에 대해, 그것과 동일하게 동작하는 atomic DEVS가 존재한다.

증명의 아이디어는 결합 모델 전체의 상태를 "각 컴포넌트의 total state들의 곱"으로 잡고, 전체의 $ta$를 "컴포넌트들 중 가장 임박한 내부 전이까지의 시간"으로 정의하는 것이다 — next-event 엔진이 FEL에서 최솟값을 꺼내는 것과 정확히 같은 구조다.

이 정리가 왜 중요한가? **coupled 모델도 결국 atomic과 같은 종류의 수학적 대상이므로, coupled 모델을 다시 부품으로 삼아 더 큰 coupled 모델을 만들 수 있다.** 조립의 중첩이 어느 깊이까지든 정당화된다는 뜻이다. 공장 모델링에 대입하면:

- 장비 한 대 = atomic DEVS (도착 job을 받아 처리하고 완료 job을 출력)
- 라인 = 장비 atomic들을 IC로 배선한 coupled DEVS
- 공장 = 라인 coupled들을 다시 배선한 coupled-of-coupled DEVS

라인 모델을 검증해 두면 공장 모델에서는 라인을 블랙박스 부품으로 쓸 수 있다. 18편의 event graph에서는 이런 조립이 형식론 차원에서 지원되지 않았다 — 바로 이것이 DEVS가 "형식론의 정점"으로 불리는 첫 번째 이유다.

## 모델과 시뮬레이터의 분리: abstract simulator

DEVS의 두 번째 기여는 **모델(what)과 시뮬레이터(how)의 분리**다. 위에서 정의한 7-tuple과 결합 명세는 "무엇을 계산해야 하는가"만 말할 뿐, 그것을 *어떻게 실행하는지*는 전혀 담고 있지 않다. Zeigler는 실행 쪽을 **abstract simulator**라는 별도의 알고리즘 명세로 정의했다. atomic 모델마다 simulator가, coupled 모델마다 coordinator가 붙어, 메시지를 주고받으며 "가장 임박한 컴포넌트를 찾고 → 출력을 배선대로 전달하고 → 전이를 수행"하는 표준 절차를 따른다.

이 분리의 실용적 의미는 크다. **어떤 DEVS 모델이든, 7-tuple의 조건만 만족하면 표준 abstract simulator가 올바르게 실행함이 보장된다.** 모델러는 "내 시뮬레이션 코드의 시간 전진 로직이 맞나"를 매번 걱정할 필요 없이 모델 명세에만 집중하면 되고, 엔진 구현의 검증([[posts/foundations/simulation-and-digital-twin/12-verification-and-validation|V&V]]의 verification 쪽 부담)은 한 번 검증된 시뮬레이터가 흡수한다. 6편에서 "세 worldview가 모두 같은 next-event 엔진으로 귀결된다"고 했던 직관을, DEVS는 정리와 알고리즘으로 못 박은 셈이다.

## 변형들: Parallel DEVS와 하이브리드

지금까지 본 것은 **Classic DEVS**다. Classic DEVS에는 실무적 골칫거리가 하나 있는데, **동시 이벤트**다. 결합 모델 안에서 두 컴포넌트의 internal transition이 같은 시각에 예정되면, Classic DEVS는 **select 함수**로 어느 쪽을 먼저 처리할지 순서를 일일이 정해 줘야 한다. 이 순서 지정은 번거로울 뿐 아니라 모델의 의미를 인위적으로 직렬화한다.

**Parallel DEVS**(Chow & Zeigler가 1994년 Winter Simulation Conference에서 제안)는 이를 구조적으로 해결한 변형이다. 입력·출력을 단일 사건이 아니라 **bag**(중복을 허용하는 집합)으로 받아 동시 사건 여러 개를 한 번에 처리하고, 내부 전이와 외부 입력이 *정확히 같은 순간* 충돌하는 경우를 위해 **confluent transition 함수** $\delta_{con}$을 추가로 정의한다. "시간이 다 된 그 순간에 입력도 도착했다면 어떻게 할지"를 모델러가 명시적으로 지정하는 것이다. 오늘날 DEVS 도구 다수가 Parallel DEVS를 기본으로 채택한다.

연속 동역학과 이산 사건이 섞인 하이브리드 시스템(예: 탱크 수위가 연속으로 변하다 임계값에서 밸브 사건 발생)을 위해서는 **DEV&DESS**라는 확장이 있다는 것만 이름으로 언급해 둔다.

## 관점: DEVS는 "시뮬레이션을 위한" 형식론

이산사건 시스템을 수학적으로 다루는 갈래는 DEVS만이 아니다. **supervisory control**(Ramadge–Wonham) 이론은 시스템이 나쁜 상태에 빠지지 않도록 사건을 허용/금지하는 **제어기 합성**을 목표로 하고, **timed automata**는 시간 제약이 있는 시스템의 성질을 **모델 체킹으로 검증**하는 데 초점을 둔다. 이들과 비교하면 DEVS의 위치가 선명해진다. DEVS는 제어기 합성도 자동 검증도 아닌, **시스템의 거동을 올바르고 조립 가능하게 시뮬레이션하기 위한** 형식론이다. 무엇을 증명하고 싶은지가 아니라 무엇을 실행하고 싶은지가 출발점이다.

## 정리

- Event graph의 평평한 구조와 달리, DEVS는 **atomic(부품) + coupled(조립)** 의 2층 구조로 계층적·모듈식 모델링을 지원한다.
- **Atomic DEVS**는 7-tuple $(X, Y, S, \delta_{ext}, \delta_{int}, \lambda, ta)$로 컴포넌트 하나를 완결적으로 명세한다. $ta$가 상태에 머무는 시간을, $\delta_{int}$/$\delta_{ext}$가 자발적/입력 유발 전이를, $\lambda$가 내부 전이 직전의 출력을 정한다. external transition이 **경과 시간 $e$** 에 의존한다는 점(total state)이 표현력의 핵심이다.
- **Coupled DEVS**는 컴포넌트 집합과 배선(EIC·EOC·IC)만으로 네트워크를 정의하며, **closure under coupling** 덕분에 결합 모델을 다시 부품으로 쓰는 무한 중첩 조립이 수학적으로 정당화된다.
- **모델과 abstract simulator의 분리**로, 명세만 맞으면 표준 알고리즘이 올바른 실행을 보장한다 — verification 부담이 줄어든다.
- 동시 이벤트 처리를 위해 $\delta_{con}$을 갖춘 **Parallel DEVS**가 실무 표준이며, 하이브리드 확장으로 DEV&DESS가 있다. supervisory control·timed automata와 달리 DEVS는 **시뮬레이션을 위한** 형식론이다.

형식론으로 "무엇을 계산할지"는 정해졌다. 다음 글 [[posts/foundations/simulation-and-digital-twin/20-inside-a-des-engine|20편]]부터는 엔진 쪽 — 그것을 "어떻게 빨리 계산할지"로 넘어간다.

## 참고문헌

- B. P. Zeigler, A. Muzy, E. Kofman, *Theory of Modeling and Simulation: Discrete Event & Iterative System Computational Foundations*, 3rd ed., Academic Press, 2018. [ScienceDirect](https://www.sciencedirect.com/book/9780128133705/theory-of-modeling-and-simulation)
- A. C. Chow, B. P. Zeigler, "Parallel DEVS: A Parallel, Hierarchical, Modular Modeling Formalism", *Proceedings of the Winter Simulation Conference*, 1994, pp. 716–722. [ACM DL](https://dl.acm.org/doi/10.5555/193201.194336)
