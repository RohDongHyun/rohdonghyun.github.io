---
title: 08. DES를 바닥부터 구현해보기 (Python)
date: 2026-06-30
tags:
  - Simulation
---

[[posts/foundations/simulation-and-digital-twin/06-discrete-event-simulation-concepts|6번 글]]에서 DES의 사건 중심(event-scheduling) 관점을, [[posts/foundations/simulation-and-digital-twin/07-queueing-theory-essentials|7번 글]]에서 M/M/1의 닫힌 해를 보았다. 이제 둘을 합칠 차례다. M/M/1 대기열을 **라이브러리 없이 Python으로 직접 구현**하고, 그 결과를 큐잉 이론 공식과 맞춰 본다. 직접 만들어 보는 이유는, 추상화된 도구(SimPy) 안에서 *실제로 무슨 일이 일어나는지*를 손으로 느끼기 위해서다.

## 설계: 무엇이 필요한가

[[posts/foundations/simulation-and-digital-twin/06-discrete-event-simulation-concepts|6번 글]]의 엔진을 그대로 코드로 옮긴다. 필요한 것은 다음과 같다.

- **미래사건 리스트(FEL)**: "가장 이른 사건"을 빠르게 꺼내야 하므로 **최소 힙**(min-heap)으로 구현한다(Python `heapq`).
- **시뮬레이션 시계**: 현재 시각 하나.
- **상태 변수**: 서버가 누구를 서비스 중인지, 큐에 누가 기다리는지, 시스템 내 손님 수.
- **난수**: 도착 간격과 서비스 시간을 지수분포에서 샘플링. [[posts/foundations/simulation-and-digital-twin/04-random-variate-generation|역변환법]]으로 $-\ln(U)/\text{rate}$.
- **통계 누적기**: 시간 평균 $L$을 위한 면적, 개체 평균 $W$를 위한 체류시간 합.

## 전체 코드

```python
import heapq
import math
import random


def exp_rv(rate, rng):
    """지수분포 난수 — 역변환법: -ln(U)/rate (04번 글)."""
    return -math.log(1.0 - rng.random()) / rate


def simulate_mm1(lam, mu, end_time, seed=0):
    rng = random.Random(seed)

    # 상태
    in_service = None          # 서비스 중인 손님의 '도착 시각' (없으면 None)
    queue = []                 # 기다리는 손님들의 도착 시각 (FIFO)

    # 미래사건 리스트: (사건 시각, 일련번호, 종류)
    fel = []
    seq = 0
    def schedule(t, kind):
        nonlocal seq
        heapq.heappush(fel, (t, seq, kind))
        seq += 1

    # 첫 도착 예약
    schedule(exp_rv(lam, rng), "arrival")

    # 통계
    num_in_system = 0
    area_L = 0.0               # ∫(시스템 내 손님 수) dt
    last_t = 0.0
    completed = 0
    total_sojourn = 0.0

    while fel:
        t, _, kind = heapq.heappop(fel)
        if t > end_time:
            break

        # 직전 사건 이후 구간의 면적을 누적 (시간 평균용)
        area_L += num_in_system * (t - last_t)
        last_t = t

        if kind == "arrival":
            num_in_system += 1
            schedule(t + exp_rv(lam, rng), "arrival")      # 다음 도착 예약
            if in_service is None:                          # 서버가 비었으면 즉시 서비스
                in_service = t
                schedule(t + exp_rv(mu, rng), "departure")
            else:                                           # 바쁘면 줄 서기
                queue.append(t)

        else:  # departure
            num_in_system -= 1
            completed += 1
            total_sojourn += t - in_service                 # 이 손님의 체류시간
            if queue:                                       # 다음 손님 서비스 시작
                arrival_time = queue.pop(0)
                in_service = arrival_time
                schedule(t + exp_rv(mu, rng), "departure")
            else:
                in_service = None                           # 서버 유휴

    L = area_L / last_t
    W = total_sojourn / completed
    return L, W


L, W = simulate_mm1(lam=0.8, mu=1.0, end_time=1_000_000, seed=42)
print(f"L ≈ {L:.3f}  (이론값 4.0)")
print(f"W ≈ {W:.3f}  (이론값 5.0)")
```

## 코드 읽기

핵심은 `while` 루프 단 하나다. 이것이 [[posts/foundations/simulation-and-digital-twin/06-discrete-event-simulation-concepts|6번 글]]에서 말한 엔진 — "가장 이른 사건을 꺼내 → 시계를 옮기고 → 처리하며 새 사건을 등록" — 그 자체다.

- **FEL과 `schedule`**: `heapq`는 튜플을 첫 원소(시각) 기준으로 정렬하므로, `heappop`은 항상 가장 이른 사건을 준다. 같은 시각의 사건이 충돌해 종류 문자열끼리 비교되는 일을 막으려고, 시각 다음에 **일련번호** `seq`를 끼워 tie-breaker로 쓴다.
- **상태 표현의 요령**: `in_service`에 단순한 `True/False`가 아니라 *서비스 중인 손님의 도착 시각*을 담았다. 그래야 departure 때 `t - in_service`로 그 손님의 체류시간을 바로 계산할 수 있다. 큐도 같은 이유로 도착 시각을 저장한다.
- **시간 평균 $L$**: 매 사건마다 `num_in_system * (t - last_t)`를 더해 면적을 쌓는다. 손님 수가 일정했던 구간의 직사각형 넓이를 누적하는 것으로, [[posts/foundations/simulation-and-digital-twin/06-discrete-event-simulation-concepts|6번 글]]의 "시간-상태 그래프 아래 면적"을 그대로 구현한 것이다. 마지막에 총 시간으로 나누면 시간 평균이 된다.
- **개체 평균 $W$**: 떠나는 손님마다 체류시간을 더하고(`total_sojourn`), 완료 손님 수로 나눈다.

## 결과: 이론과 맞는가

$\lambda=0.8$, $\mu=1.0$이면 $\rho=0.8$이므로, [[posts/foundations/simulation-and-digital-twin/07-queueing-theory-essentials|7번 글]]의 공식으로

$$
L = \frac{\rho}{1-\rho} = \frac{0.8}{0.2} = 4.0, \qquad W = \frac{1}{\mu-\lambda} = \frac{1}{0.2} = 5.0
$$

이다. 위 코드를 충분히 길게(여기서는 100만 시간 단위) 돌리면 $L \approx 4.0$, $W \approx 5.0$에 가까운 값이 나온다. 시뮬레이션이 이론값을 재현한다는 것은, **우리 엔진이 올바르게 구현되었다는 강력한 증거**다. 이것이 [[posts/foundations/simulation-and-digital-twin/07-queueing-theory-essentials|큐잉 이론을 검증 기준선]]으로 쓴다는 말의 실제 모습이다. Little's law $L = \lambda W$도 직접 확인할 수 있다: $0.8 \times 5.0 = 4.0$.

> 주의: 한 번의 실행으로 나온 값이 정확히 4.0이 아니라 4.05나 3.97처럼 흔들리는 것은 정상이다. 결과는 [[posts/foundations/simulation-and-digital-twin/01-introduction-to-simulation|표본]]이기 때문이다. "얼마나 길게 돌려야 하나", "이 오차를 어떻게 신뢰구간으로 말하나"는 4부 [[posts/foundations/simulation-and-digital-twin/11-output-analysis|output analysis]]의 주제다. 또 시작 직후 시스템이 비어 있던 구간(warm-up)이 평균을 끌어내리는 문제도 거기서 다룬다.

## 직접 구현의 한계

이 코드는 작동하지만, 사건 종류가 두 개뿐인데도 이미 신경 쓸 것이 많다. 서버를 여러 대로 늘리거나, 우선순위 큐·고장·여러 단계 공정을 더하면 사건 종류와 상태 변수가 빠르게 불어나고, FEL을 직접 관리하는 코드는 점점 복잡하고 버그가 끼기 쉬워진다.

여기서 [[posts/foundations/simulation-and-digital-twin/06-discrete-event-simulation-concepts|6번 글]]의 **프로세스 중심 관점**이 빛을 발한다. "손님은 도착해 → 기다리고 → 서비스받고 → 떠난다"는 자연스러운 시나리오를 그대로 적게 해 주는 라이브러리, **SimPy**를 [[posts/foundations/simulation-and-digital-twin/09-modeling-des-with-simpy|다음 글]]에서 같은 M/M/1에 적용해, 추상화가 무엇을 덜어 주는지 비교한다.

## 정리

- M/M/1을 **`heapq` 기반 FEL + 단일 이벤트 루프**로 직접 구현했다. 이것이 사건 중심 DES 엔진의 민낯이다.
- 상태(`in_service`·`queue`)에 **도착 시각을 담아** 체류시간을 계산하고, **면적 누적**으로 시간 평균 $L$을, **체류시간 합**으로 개체 평균 $W$를 얻었다.
- 결과가 큐잉 이론의 $L=4.0$, $W=5.0$을 재현해 **엔진의 정확성을 검증**했다(Little's law도 확인).
- 사건·상태가 늘면 직접 구현은 급격히 복잡해진다 → 프로세스 중심 도구(SimPy)로 넘어갈 동기.

다음 글에서는 같은 모델을 [[posts/foundations/simulation-and-digital-twin/09-modeling-des-with-simpy|SimPy]]로 다시 작성한다.
