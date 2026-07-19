---
title: "18. DES 형식론 (1): Event Graph"
date: 2026-07-17
tags:
  - Simulation
---

입문 편(01~17)에서 DES의 동작 원리 — 이벤트, 시뮬레이션 클록, 미래사건 리스트(FEL) — 를 보고([[posts/foundations/simulation-and-digital-twin/06-discrete-event-simulation-concepts|06편]]), 그 엔진을 직접 코드로 만들어도 봤다([[posts/foundations/simulation-and-digital-twin/08-building-des-from-scratch|08편]]). 심화 편은 방향을 바꾼다. **DES 모델을 코드가 아닌 수학적 형식으로 엄밀하게 기술하는 방법**, 즉 *형식론(formalism)* 부터 시작한다. 그 첫 번째가 이 글의 주인공, 가장 작고 우아한 형식론인 **event graph**다.

## 왜 형식론인가

SimPy로 짠 시뮬레이션 코드를 열어 보면, "은행 창구가 어떻게 동작하는가"라는 *모델*과 "제너레이터를 어떻게 굴리는가"라는 *구현*이 한 파일에 뒤섞여 있다. 이 상태에서는 곤란한 질문들이 생긴다. 이 코드가 표현하는 모델은 정확히 무엇인가? 다른 사람이 다른 언어로 짠 시뮬레이터가 *같은 모델*을 구현한 것인지 어떻게 판단하나?

형식론은 이 문제를 "모델이 무엇인가"를 **시뮬레이터와 독립적으로 명세**함으로써 푼다. 얻는 것은 세 가지다.

- **모호성 제거**: 상태가 무엇이고, 어떤 사건이 상태를 어떻게 바꾸는지가 수학적으로 확정된다. 말이나 코드 주석으로는 남는 해석의 여지가 사라진다.
- **검증과 재사용**: 모델 자체를 (구현 없이) 분석하고, 같은 명세를 여러 구현·도구에서 재사용할 수 있다.
- **동등성 판단**: 서로 다른 구현이 같은 명세를 따르는지 비교할 기준이 생긴다.

이는 [[posts/foundations/simulation-and-digital-twin/12-verification-and-validation|V&V]]에서 본 구분 — validation("모델이 현실에 비추어 옳은가")과 verification("구현이 모델에 비추어 옳은가") — 을 실제로 분리 가능하게 만드는 토대다. 명세가 따로 존재해야 "구현이 명세대로인가"를 물을 수 있기 때문이다.

## 세 가지 worldview, 다시

[[posts/foundations/simulation-and-digital-twin/06-discrete-event-simulation-concepts|06편]]에서 본 세 가지 worldview를 형식론의 눈으로 다시 정리하자.

- **Event scheduling**(사건 중심): 이벤트마다 "이 이벤트가 일어나면 상태를 이렇게 바꾸고, 미래 이벤트를 이렇게 예약한다"를 기술한다.
- **Activity scanning**(활동 중심): "이 조건이 만족되면 이 활동을 시작한다"는 조건–활동 규칙들로 기술한다.
- **Process interaction**(프로세스 중심): entity 하나의 생애 전체를 하나의 프로세스로 기술한다. SimPy가 이 방식이다.

셋은 *같은 시스템*의 서로 다른 기술 방식일 뿐이며, 내부적으로는 모두 같은 next-event 엔진으로 귀결된다. 이 글의 event graph는 이 중 **event scheduling worldview를 형식화**한 것이다.

## Event Graph (Schruben, 1983)

Event graph는 Lee Schruben이 1983년에 제안한 DES 명세 언어다. 아이디어는 극단적으로 단순하다. **모델을 방향 그래프(directed graph) 하나로 그린다.**

- **node = 이벤트**: 상태 변수를 바꾸는 순간. 각 node에는 그 이벤트가 실행할 상태 변화(state change)가 붙는다.
- **edge = 스케줄링 관계**: 이벤트 사이의 인과. edge에는 라벨 $(t, c)$ — 지연시간 $t$와 조건 $c$ — 가 붙는다.

edge $A \xrightarrow{(t,\, c)} B$의 의미는 하나의 문장으로 읽힌다.

> 이벤트 $A$가 발생하면, 그 시점에 조건 $c$가 참일 때, $t$ 시간 후에 이벤트 $B$를 FEL에 스케줄한다.

조건 $c$는 $A$의 상태 변화가 **반영된 직후에** 평가된다 — 예컨대 도착 이벤트가 $Q$를 늘린 *다음* 조건을 본다. 조건 $c$가 없으면(항상 참) 무조건 스케줄이고, $t = 0$이면 "지금 즉시"(같은 클록 시각에) 스케줄한다는 뜻이다. 이게 전부다. 상태 변수, 이벤트 node, 라벨 붙은 edge — 이 세 가지로 어떤 DES든 기술한다.

### 예시: M/M/1 큐

06·08편에서 다룬 단일 서버 대기열을 event graph로 명세해 보자. 상태 변수는 두 개다.

- $Q$: 대기 중인 손님 수
- $B$: 서버 사용 중 여부 ($B = 1$이면 busy, $B = 0$이면 idle)

이벤트는 세 개 — **Arrival**(손님 도착), **Start**(서비스 시작), **End**(서비스 종료) — 이고, 각 node의 상태 변화와 나가는 edge는 다음과 같다. $t_a$는 도착 간격, $t_s$는 서비스 시간으로, 둘 다 [[posts/foundations/simulation-and-digital-twin/04-random-variate-generation|분포에서 샘플링]]되는 확률변수다.

| 이벤트 (node) | 상태 변화 | 나가는 edge: 대상 (지연, 조건) |
|---|---|---|
| **Arrival** | $Q \leftarrow Q + 1$ | Arrival ($t_a$, 항상) / Start ($0$, $B = 0$) |
| **Start** | $B \leftarrow 1$, $Q \leftarrow Q - 1$ | End ($t_s$, 항상) |
| **End** | $B \leftarrow 0$ | Start ($0$, $Q > 0$) |

표를 그래프의 언어로 풀면 이렇다.

- **Arrival → Arrival** ($t_a$ 후, 무조건): 도착이 일어나면 *다음 도착*을 $t_a$ 후에 예약한다. 자기 자신으로 돌아가는 이 self-loop가 도착 스트림을 무한히 만들어 내는 발생기다. 시뮬레이션 시작 시 첫 Arrival 하나만 $t = 0$에 FEL에 넣어 두면 이후는 이 edge가 알아서 이어 간다.
- **Arrival → Start** (지연 $0$, 조건 $B = 0$): 도착했는데 서버가 놀고 있으면 즉시 서비스를 시작한다. 서버가 바쁘면($B=1$) 이 edge는 발화하지 않고, 손님은 $Q$ 증가로만 기록된다 — "큐에 줄 선다"가 상태 변수 하나로 표현되는 것이다.
- **Start → End** ($t_s$ 후, 무조건): 서비스가 시작되면 $t_s$ 후 종료가 예약된다.
- **End → Start** (지연 $0$, 조건 $Q > 0$): 서비스가 끝났을 때 대기자가 있으면 즉시 다음 서비스를 시작한다. 없으면 $B = 0$인 채로 조용히 멈춘다.

06편에서 산문으로 4~5줄씩 적었던 도착·종료 처리 규칙이, node 3개와 edge 4개로 남김없이 압축되었다. 특히 "서버가 비면 시작, 끝났는데 대기자 있으면 또 시작"이라는 로직이 **Start라는 하나의 이벤트로 합쳐져** 두 곳에서 재사용되는 점을 눈여겨보자. 코드였다면 두 함수에 중복 작성되기 쉬운 부분이다.

### 취소 edge (cancelling edge)

기본 edge가 "미래 이벤트를 예약"한다면, **cancelling edge**는 반대로 **이미 FEL에 예약된 이벤트를 취소**하는 관계다(보통 점선으로 그린다). 이것이 필요한 대표적 상황 두 가지다.

- **장비 고장**: 서비스 중 장비가 고장 나면, 예약해 둔 End 이벤트는 더 이상 유효하지 않다. Failure 이벤트에서 End로 향하는 cancelling edge가 이를 명세한다.
- **타임아웃**: "손님이 10분 안에 서비스를 못 받으면 떠난다"를 모델링하려면, 도착 시 Renege(포기) 이벤트를 10분 후로 예약해 두고, 서비스가 시작되면 그 Renege를 취소하면 된다.

예약(scheduling)과 취소(cancelling), 이 두 종류의 edge만으로 인터럽트·선점·이탈 같은 까다로운 동작까지 그래프 안에서 표현된다.

### 최소주의의 힘

Event graph의 미덕은 **프리미티브가 단 하나 — 이벤트 — 뿐**이라는 점이다. 프로세스도, 자원도, 큐도 별도의 기본 개념으로 제공하지 않는다. 큐는 상태 변수 $Q$로, 자원은 $B$로, 프로세스는 이벤트들의 연쇄로 환원된다. 그럼에도 (예약·취소 edge를 갖춘) event graph는 어떤 이산사건 시스템이든 표현할 수 있다.

또 하나의 실용적 이점은 **모델의 구조가 그래프로 한눈에 보인다**는 것이다. 코드에 파묻히면 보이지 않던 것들 — 어떤 이벤트가 어떤 상태 변수를 읽고 바꾸는지, 어떤 이벤트가 어떤 이벤트를 유발하는지 — 이 정적 분석(실행하지 않고 하는 분석)의 대상이 된다. 예컨대 "End는 $Q$를 읽기만 하고 바꾸지는 않는다", "Start를 유발하는 경로는 Arrival과 End 둘뿐이다" 같은 사실을 그래프만 보고 확인할 수 있다.

## Event graph에서 시뮬레이터로

Event graph는 사실상 **"FEL 기반 엔진에 넣을 사양서"** 다. [[posts/foundations/simulation-and-digital-twin/08-building-des-from-scratch|08편]]에서 직접 만든 엔진과의 대응이 정확히 일치한다.

- **node의 상태 변화** = 이벤트 처리 루틴(이벤트 타입별 handler 함수)의 본문
- **edge $(t, c)$** = 그 루틴 안의 `if c: schedule(B, now + t)` 호출
- **cancelling edge** = FEL에서 해당 이벤트를 제거하는 `cancel(...)` 호출

즉 event graph가 주어지면 시뮬레이터 구현은 기계적인 번역이 된다. 거꾸로, 08편처럼 손으로 짠 엔진 코드에서 schedule 호출들을 추적해 그래프를 복원할 수도 있다 — 이것이 앞서 말한 "구현이 명세대로인가"(verification)를 점검하는 한 방법이다.

## 한계, 그리고 다음 글

이 우아함에는 대가가 있다. Event graph는 **평평(flat)하다.** 모델 전체가 하나의 전역 상태 공간 위에서 하나의 그래프로 그려진다. M/M/1처럼 작은 모델에서는 미덕이지만, 수백 대의 장비와 수십 개의 공정이 얽힌 반도체 fab 같은 시스템을 node 수백 개짜리 그래프 하나로 그리는 것은 현실적이지 않다. 부분 모델을 만들고 → 검증하고 → 조립해 큰 모델을 만드는 **계층적·모듈적 구성**이 event graph에는 없다.

이 문제를 정면으로 해결한 형식론이 다음 글의 주제인 [[posts/foundations/simulation-and-digital-twin/19-devs-formalism|DEVS]]다. 모델을 입출력 포트를 가진 부품으로 정의하고, 부품을 결합해 더 큰 부품을 만드는 체계를 제공한다.

## 정리

- **형식론**은 "모델이 무엇인가"를 시뮬레이터와 독립적으로 명세해, 모호성 제거·모델 검증·구현 간 동등성 판단을 가능하게 한다. V&V의 validation/verification 분리가 서는 토대다.
- **Event graph**(Schruben, 1983)는 event scheduling worldview의 형식화다. **node = 이벤트(상태 변화), edge = 스케줄링 관계**이며, edge 라벨 $(t, c)$는 "조건 $c$가 참이면 $t$ 후에 대상 이벤트를 스케줄"을 뜻한다.
- M/M/1은 상태 변수 $Q, B$와 이벤트 **Arrival·Start·End** 세 개, edge 네 개로 완전히 명세된다.
- **Cancelling edge**는 예약된 이벤트의 취소를 명세해 고장·타임아웃 등을 표현한다.
- 이벤트라는 **단 하나의 프리미티브**로 어떤 DES든 표현하는 최소주의이며, 그래프 구조 덕에 정적 분석이 가능하다. 다만 **flat**해서 큰 시스템의 계층적 구성이 어렵고, 이는 다음 글의 **DEVS**가 해결한다.

## 참고문헌

- Lee Schruben, "Simulation modeling with event graphs", *Communications of the ACM* 26(11), pp. 957–963, 1983. [DOI](https://doi.org/10.1145/182.358460)
