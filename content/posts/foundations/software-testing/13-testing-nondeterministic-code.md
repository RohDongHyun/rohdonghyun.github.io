---
title: 13. 비결정적 코드 테스트 — 시간, 난수, 동시성
date: 2026-07-06
tags:
  - Software Engineering
  - Testing
---

[[posts/foundations/software-testing/03-anatomy-of-a-unit-test|3편]]의 FIRST 원칙 중 **Repeatable** 은 "같은 코드에 같은 테스트를 돌리면 언제 어디서든 같은 결과가 나와야 한다"는 요구였다. 그런데 어떤 코드는 **코드 자체가 실행마다 다르게 동작한다** — 현재 시각을 읽고, 난수를 뽑고, 스레드가 어떤 순서로 끼어들지 OS에 달려 있다. 이런 **비결정적(non-deterministic)** 코드를 순진하게 테스트하면 [[posts/foundations/software-testing/10-integration-and-e2e-testing|10편]]에서 본 flaky 테스트 — 코드 변경 없이 성공과 실패를 오가는 테스트 — 가 되고, flaky 테스트는 신호로서의 가치를 잃는다. Martin Fowler의 표현대로 비결정성은 "감염(infection)"이다: 스위트에 하나만 있어도 "빨간불 = 버그"라는 등식이 무너져 스위트 전체의 신뢰가 무너진다.

비결정성의 원천은 실무에서 대부분 셋 중 하나다 — **시간, 난수, 동시성**. 이번 편은 이 셋을 앞의 것부터(다루기 쉬운 순서로) 하나씩 결정적으로 만드는 법을 다룬다.

## 시간: clock을 주입하라

가장 흔한 범인은 코드 한가운데의 `datetime.now()`다. Q-time(공정 간 대기 시간 제한) 위반 검사를 보자.

```python
from datetime import datetime, timedelta

def is_qtime_violated(lot) -> bool:
    deadline = lot.step_end_time + timedelta(minutes=lot.qtime_limit)
    return datetime.now() > deadline          # ← 숨은 입력
```

이 함수는 "언제 실행하느냐"가 숨은 입력이라 테스트가 원리적으로 불가능하다 — "지금부터 60분 뒤 위반"을 검증하려면 60분을 기다리거나, fixture의 시각을 실행 시점 기준으로 계산해야 하는데 후자는 자정 근처에서 날짜가 넘어가며 깨지는 전형적인 flaky 테스트가 된다. 해법은 [[posts/foundations/software-testing/06-design-for-testability|6편]]의 의존성 주입 그대로다. **시간도 의존성이다** — 현재 시각을 인자로 받으면 함수는 순수해진다.

```python
def is_qtime_violated(lot, now: datetime) -> bool:
    deadline = lot.step_end_time + timedelta(minutes=lot.qtime_limit)
    return now > deadline

def test_violated_exactly_after_limit():
    lot = make_lot(step_end_time=datetime(2026, 7, 6, 23, 30), qtime_limit=60)
    assert not is_qtime_violated(lot, now=datetime(2026, 7, 7, 0, 30))   # 정확히 60분 — 경계
    assert is_qtime_violated(lot, now=datetime(2026, 7, 7, 0, 30, 1))    # 1초 초과
```

시각이 명시적 값이 되는 순간, 지금까지 배운 기법이 전부 적용된다 — 경계값 테스트, [[posts/foundations/software-testing/08-property-based-testing|property-based testing]], parametrize. 특히 시간 관련 버그는 **경계에 산다**: 자정을 넘는 교대(shift) 구간, 월말·연말 집계, 시간대(timezone) 변환, DST(일광절약시간 — 1년에 두 번 한 시간이 사라지거나 반복되는 날) 전환. clock이 주입되면 이런 날짜를 fixture로 박아 두고 영원히 재검증할 수 있다.

고칠 수 없는 코드 — 레거시이거나 라이브러리 내부에서 `now()`를 부르는 경우 — 에는 [freezegun](https://github.com/spulec/freezegun)이나 더 빠른 대안 [time-machine](https://github.com/adamchainz/time-machine)처럼 프로세스 전체의 시계를 지정 시각으로 바꿔치기하는 라이브러리를 쓴다.

```python
import time_machine

@time_machine.travel("2026-07-06 23:59:30")
def test_shift_report_crossing_midnight():
    report = build_shift_report()             # 내부의 datetime.now()가 위 시각을 반환
    assert report.shift == "N"                # 야간 교대로 분류되는가
```

다만 이것은 [[posts/foundations/software-testing/12-testing-legacy-code|12편]]의 seam 만들기와 같은 성격의 우회로다 — 전역 monkeypatch라 병렬 실행과 충돌할 수 있고, 정석은 어디까지나 clock 주입이다.

## 난수: seed 고정의 효용과 한계

난수 의존 코드의 1차 처방은 잘 알려져 있다: **seed를 고정하면 의사난수(PRNG)는 결정적이다** ([[posts/foundations/simulation-and-digital-twin/03-random-number-generation|simulation 시리즈 3편]]에서 봤듯 PRNG는 애초에 결정론적 점화식이다). `random.seed(42)` 한 줄이면 같은 수열이 재현된다. 그러나 두 가지 한계를 알아야 한다.

1. **구현 결합.** seed가 고정하는 것은 *수열*이지 *결과*가 아니다. 코드를 리팩토링하다 난수 호출 순서가 하나 바뀌면 — 예컨대 도착 시각과 서비스 시간의 샘플링 순서를 바꾸면 — 같은 seed로도 전혀 다른 결과가 나와 테스트가 깨진다. 동작은 그대로인데 내부 순서 때문에 깨지는 테스트, 정확히 [[posts/foundations/software-testing/04-behavior-vs-implementation|4편]]에서 경고한 구현 결합 테스트다.
2. **표본 하나의 함정.** seed 하나로 통과한 테스트는 가능한 실행 중 *한 가지*가 괜찮았다는 뜻일 뿐이다. "평균 대기시간을 잘 추정하는가" 같은 질문에 seed 42 하나의 점 비교로 답하는 것은, 분포를 검증해야 할 자리에 표본 하나를 놓는 것이다.

전역 seed 고정보다 나은 패턴은 시간과 똑같다 — **RNG를 주입하라.** `random.Random` instance나 NumPy의 `numpy.random.Generator`를 인자로 받으면, 전역 상태를 건드리지 않아 테스트 간 격리(FIRST의 Isolated)가 지켜지고, 병렬 테스트끼리 seed를 밟는 사고도 없다.

```python
import random

def sample_process_time(rng: random.Random, mean_min: float = 45.0) -> float:
    return rng.expovariate(1.0 / mean_min)

def test_process_time_is_reproducible():
    assert sample_process_time(random.Random(42)) == sample_process_time(random.Random(42))

def test_process_time_is_positive():              # seed에 무관한 성질도 함께
    rng = random.Random(7)
    assert all(sample_process_time(rng) > 0 for _ in range(1000))
```

## 출력이 분포일 때: 통계적 테스트

시뮬레이션·RL처럼 **출력 자체가 확률 분포** 인 코드는 점 비교로 검증할 수 없다. 이때의 정석은 [[posts/foundations/simulation-and-digital-twin/12-verification-and-validation|simulation 시리즈의 V&V]]에서 다룬 접근 그대로다 — **이론값이 알려진 케이스를 골라, 다수 replication(seed만 바꾼 독립 반복 실행)의 추정치가 이론값 근처에 오는지** 를 확인한다. [[posts/foundations/simulation-and-digital-twin/08-building-des-from-scratch|M/M/1 시뮬레이터]]라면 $\lambda = 0.8$, $\mu = 1.0$일 때 시스템 내 평균 고객 수의 닫힌 해 $L = \rho/(1-\rho) = 4.0$과 비교할 수 있다.

```python
import math, statistics

def test_mm1_mean_in_system_matches_theory():
    theory_L = 0.8 / (1 - 0.8)                          # ρ/(1-ρ) = 4.0
    estimates = [simulate_mm1(lam=0.8, mu=1.0, horizon=50_000, seed=s).mean_in_system
                 for s in range(20)]                     # replication 20회, seed는 명시적으로
    mean = statistics.mean(estimates)
    half_width = 2.093 * statistics.stdev(estimates) / math.sqrt(20)   # 95% CI, t(0.975; 19)
    assert abs(mean - theory_L) <= half_width + 0.05 * theory_L        # CI + 여유분
```

replication 20회의 표본평균 $\bar{X}$와 표본표준편차 $s$로 만든 95% 신뢰구간 $\bar{X} \pm t_{0.975,\,19}\, s/\sqrt{20}$ 안에(약간의 여유를 더해) 이론값이 들어오는지 assert한다. 여기서 정직하게 인정할 것이 하나 있다: **통계적 테스트는 그 자체로 확률적으로 실패한다.** 유의수준 5%로 판정한다는 말은 코드가 완벽해도 스무 번에 한 번은 빨간불이 켜진다는 뜻 — 유의수준이 곧 *내재된 flakiness* 다. 실무 대응은 절충이다.

- **임계값을 느슨하게**: 통계 테스트의 목적은 정밀 추정이 아니라 "코드가 크게 틀렸는가"의 검출이다. 허용오차를 이론값의 5~10%처럼 넉넉히 잡아 오탐 확률을 유의수준보다 훨씬 낮춘다.
- **계층 분리**: CI의 매 커밋 경로에는 **seed 고정 smoke 테스트**(결정적, 빠름 — 회귀 검출용)를 두고, seed를 바꿔 가며 도는 **통계 테스트는 야간(nightly) job으로 분리** 한다. [[posts/foundations/software-testing/11-testing-in-ci|11편]]의 계층별 분리를 비결정성 축으로 적용한 것이다.

## 동시성: 왜 근본적으로 어려운가

시간과 난수는 "숨은 입력을 명시적으로 만들면" 결정적으로 바뀌었다. 동시성은 다르다. 스레드들이 어떤 순서로 끼워 넣어져 실행되는가(interleaving)는 OS 스케줄러가 정하며, **테스트 코드가 주입할 수 있는 인자가 아니다.** 두 스레드가 공유 변수 하나를 두고 read-modify-write를 하다 한쪽의 갱신이 사라지는 lost update 같은 race condition(실행 순서에 따라 결과가 달라지는 버그)은 수백만 interleaving 중 극소수에서만 발현하므로, 버그가 *있어도* 테스트는 거의 항상 통과한다 — 10편에서 flaky 테스트로 위장해 나타난다고 했던 바로 그 부류다. 1,000번 반복해 통과한 스트레스 테스트도 "버그 없음"의 증명이 아니라 "이 머신의 이 부하에서는 안 걸렸음"일 뿐이다.

그래서 동시성에 대한 가장 실용적인 테스트 전략은 역설적이게도 **테스트할 동시성을 줄이는 설계** 다. 6편의 functional core, imperative shell을 다시 소환하면 — dispatching 점수 계산, 스케줄 생성 같은 로직은 순수 함수로 뽑아 **단일 스레드에서 결정적으로** 테스트하고, 스레드·lock·큐를 다루는 코드는 얇은 껍데기에 격리해 그 양 자체를 최소화한다. 남은 동시성 코드에는 [pytest-repeat](https://github.com/pytest-dev/pytest-repeat) 같은 반복 실행 도구로 발현 확률을 높이는 스트레스 테스트를 걸되 한계를 인지하고, 언어에 따라 [ThreadSanitizer](https://clang.llvm.org/docs/ThreadSanitizer.html)(C/C++/Go 계열) 같은 race detector — 실행을 관찰해 data race를 탐지하는 동적 분석 도구 — 를 병행한다. 동시성 테스트는 그 자체로 한 분야(결정적 interleaving 재생, model checking 등)라 여기서는 개요까지만 적는다.

## 요약

비결정성의 세 원천에 대한 처방을 한 줄씩으로 압축하면:

- **시간** — 시간은 의존성이다. clock(또는 `now`)을 주입해 순수 함수로 만들고, 자정·월말·DST 같은 경계를 fixture로 고정하라. 못 고치는 코드에만 freezegun/time-machine.
- **난수** — seed 고정으로 재현성은 얻지만, 수열 고정은 구현 결합(호출 순서에 취약)이고 표본 하나일 뿐이다. 전역 seed 대신 `random.Random`/`numpy.random.Generator`를 주입하라.
- **확률적 출력** — 점 비교 대신 이론값 대비 통계량 검증(다수 replication + 신뢰구간/허용오차). 유의수준만큼의 flakiness는 내재적이므로, seed 고정 smoke(매 커밋)와 통계 테스트(야간)를 분리하라.
- **동시성** — interleaving은 주입할 수 없어 근본적으로 어렵다. 최선의 테스트 전략은 동시성 코드 자체를 최소화·격리하는 설계이고, 스트레스 테스트·race detector는 보조 수단이다.

셋을 관통하는 원리는 하나다 — **비결정성을 없앨 수는 없지만, 로직 밖으로 밀어낼 수는 있다.** 시각·난수·스레드라는 숨은 입력을 경계로 밀어내고 나면, 안쪽에 남는 것은 이 시리즈 내내 다뤄 온 평범한 결정적 코드다. 다음 편은 시리즈의 마지막으로, AI 코딩 에이전트 시대에 테스트가 갖는 새로운 지위 — 스펙이자 검증 루프 — 를 다룬다.

## 참고문헌

- Martin Fowler, [Eradicating Non-Determinism in Tests](https://martinfowler.com/articles/nonDeterminism.html) (2011) — 비결정성을 "감염"으로 규정하고 시간·난수·비동기·격리 실패를 분류한 고전적 글.
- Titus Winters, Tom Manshreck & Hyrum Wright, *Software Engineering at Google* (O'Reilly, 2020) 11장 — Google 규모에서의 flaky 테스트 비용과 운영.
- [freezegun](https://github.com/spulec/freezegun), [time-machine](https://github.com/adamchainz/time-machine) — Python 시간 mocking 라이브러리.
- [NumPy random Generator 문서](https://numpy.org/doc/stable/reference/random/generator.html) — 전역 상태 대신 `default_rng(seed)`로 Generator를 만들어 주입하는 현행 권장 API.
- [pytest-repeat](https://github.com/pytest-dev/pytest-repeat) — 테스트 반복 실행 플러그인; [ThreadSanitizer](https://clang.llvm.org/docs/ThreadSanitizer.html) — 동적 data race 탐지기.
- Averill M. Law, *Simulation Modeling and Analysis* (5th ed., McGraw-Hill, 2015) — replication 기반 출력 분석과 신뢰구간 구성의 표준 교재.
