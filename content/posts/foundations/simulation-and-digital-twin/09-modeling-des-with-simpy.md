---
title: 09. SimPy로 DES 모델링
date: 2026-06-30
tags:
  - Simulation
---

[[posts/foundations/simulation-and-digital-twin/08-building-des-from-scratch|앞 글]]에서 M/M/1을 사건 중심으로 직접 구현했다. 작동은 했지만, 미래사건 리스트와 사건 처리 규칙을 손으로 일일이 관리해야 했다. 이 글에서는 같은 모델을 **SimPy**로 다시 작성한다. SimPy는 [[posts/foundations/simulation-and-digital-twin/06-discrete-event-simulation-concepts|6번 글]]의 **프로세스 중심(process-interaction)** 관점을 구현한 Python 라이브러리로, "entity의 생애를 시나리오처럼 적는" 방식을 가능하게 한다. 직접 구현과 나란히 두고, 추상화가 무엇을 덜어 주는지 본다.

## SimPy의 핵심 개념

SimPy는 Python의 **generator**(generator)와 `yield`를 영리하게 활용한다.

- **`Environment`**: 시뮬레이션 시계와 사건 처리를 담당하는 엔진. 우리가 직접 짰던 FEL과 루프가 여기 숨어 있다.
- **프로세스(process)**: `yield`를 쓰는 generator 함수로 entity의 생애를 기술한다. `yield`를 만나면 "여기서 시간을 보내거나 무언가를 기다린다"는 뜻이고, 조건이 충족되면 그 지점에서 *다시 깨어나* 이어 실행된다.
- **`env.timeout(d)`**: $d$만큼 시간이 흐르길 기다린다(활동). 내부적으로는 "$d$ 뒤의 사건"을 FEL에 등록하고 깨어나는 것이다.
- **`Resource`**: 용량이 제한된 자원(서버). `request()`로 점유를 요청하면, 자리가 없을 때 자동으로 큐에서 기다린다. 우리가 직접 짰던 큐 관리가 여기에 내장돼 있다.

즉 [[posts/foundations/simulation-and-digital-twin/08-building-des-from-scratch|직접 구현]]에서 가장 번거로웠던 **FEL 관리와 큐잉 로직이 통째로 사라진다.**

## 전체 코드

```python
import math
import random
import simpy


def exp_rv(rate, rng):
    """지수분포 난수 — 역변환법 (04번 글)."""
    return -math.log(1.0 - rng.random()) / rate


def customer(env, server, mu, rng, sojourn_times):
    """손님 한 명의 생애: 도착 → 줄 서기 → 서비스 → 떠남."""
    arrival_time = env.now
    with server.request() as req:      # 서버 점유 요청 (자리 없으면 자동 대기)
        yield req                       # 내 차례가 올 때까지 기다림
        yield env.timeout(exp_rv(mu, rng))   # 서비스 받는 동안 시간 경과
    sojourn_times.append(env.now - arrival_time)   # 떠나며 체류시간 기록


def source(env, server, lam, mu, rng, sojourn_times):
    """도착 과정: 간격마다 새 손님 프로세스를 만든다."""
    while True:
        yield env.timeout(exp_rv(lam, rng))        # 다음 도착까지 대기
        env.process(customer(env, server, mu, rng, sojourn_times))


def simulate_mm1(lam, mu, end_time, seed=0):
    rng = random.Random(seed)
    env = simpy.Environment()
    server = simpy.Resource(env, capacity=1)       # 서버 1대 → M/M/1
    sojourn_times = []
    env.process(source(env, server, lam, mu, rng, sojourn_times))
    env.run(until=end_time)
    W = sum(sojourn_times) / len(sojourn_times)
    return W


W = simulate_mm1(lam=0.8, mu=1.0, end_time=1_000_000, seed=42)
print(f"W ≈ {W:.3f}  (이론값 5.0)")
```

## 직접 구현과 비교

같은 M/M/1인데, 두 코드의 *사고 단위*가 다르다.

- [[posts/foundations/simulation-and-digital-twin/08-building-des-from-scratch|직접 구현]]은 **사건**(arrival/departure)을 중심으로, "이 사건이 일어나면 상태를 어떻게 바꿀까"를 기술했다. 서버가 비었는지 검사하고, 큐에 넣고 빼고, 다음 사건을 예약하는 일을 전부 손으로 했다.
- SimPy 코드는 **손님 한 명의 일생**을 중심으로 읽힌다. `customer` 함수를 위에서 아래로 읽으면 그대로 시나리오다 — *도착해서(arrival_time 기록) → 서버를 요청해 기다리고(`yield req`) → 서비스 시간을 보내고(`yield timeout`) → 떠나며 체류시간을 적는다.* 큐도, FEL도 코드에 드러나지 않는다.

`with server.request() as req` 한 줄이 직접 구현의 "서버가 비었으면 서비스 시작, 아니면 큐에 추가"와 departure 때의 "큐에서 다음 손님 꺼내기"를 **모두 대신한다.** `yield req`에서 손님은 자동으로 줄을 서고, 앞 손님이 자원을 놓는(`with` 블록을 벗어나는) 순간 깨어난다. 이것이 프로세스 중심 관점이 주는 추상화의 이득이다.

## 결과 확인

이 시뮬레이션도 [[posts/foundations/simulation-and-digital-twin/07-queueing-theory-essentials|이론값]] $W = 1/(\mu-\lambda) = 5.0$을 재현한다. 여기서는 체류시간만 모았지만, 평균 손님 수 $L$이 궁금하면 따로 면적을 누적할 필요 없이 [[posts/foundations/simulation-and-digital-twin/07-queueing-theory-essentials|Little's law]]로 $L = \lambda W \approx 0.8 \times 5.0 = 4.0$을 바로 얻을 수 있다.

## 확장이 쉽다

SimPy의 진짜 가치는 **복잡해질수록** 드러난다. 직접 구현에서는 사건 종류가 늘 때마다 루프를 뜯어고쳐야 했지만, SimPy에서는 보통 프로세스 함수에 몇 줄을 더하면 된다.

- **서버 여러 대 (M/M/c)**: `capacity=1`을 `capacity=c`로 바꾸기만 하면 된다. 큐와 자원 분배는 SimPy가 알아서 한다.
- **우선순위**: `simpy.PriorityResource`를 쓰면 된다.
- **장비 고장**: 서버를 점유했다가 일정 시간마다 풀어 주는 별도 프로세스를 추가한다.
- **여러 단계 공정**: `customer` 함수 안에 `request → timeout → release`를 단계마다 이어 쓰면, 손님이 공정을 차례로 거치는 흐름이 자연스럽게 표현된다.

이 밖에도 SimPy는 자원을 **`Resource`**(용량 제한 서버) 외에 **`Store`**(개별 객체를 담고 꺼내는 창고)와 **`Container`**(연속량 — 연료·재고 등)로 제공해, 다양한 시스템을 모델링할 수 있다.

## 정리

- **SimPy**는 [[posts/foundations/simulation-and-digital-twin/06-discrete-event-simulation-concepts|프로세스 중심]] DES 라이브러리로, generator와 `yield`로 **entity의 생애를 시나리오처럼** 기술한다.
- `Environment`(엔진)·프로세스(`yield`)·`env.timeout`(활동)·`Resource`(자원+큐)가 핵심이며, [[posts/foundations/simulation-and-digital-twin/08-building-des-from-scratch|직접 구현]]에서 손으로 짰던 **FEL과 큐 관리가 사라진다.**
- 같은 M/M/1을 훨씬 짧고 읽기 쉽게 작성했고, 동일하게 이론값($W=5.0$)을 재현했다.
- `capacity` 변경만으로 M/M/c가 되는 등 **확장이 쉬운 것**이 추상화의 가장 큰 이득이다.

여기까지가 DES 이론과 구현(3부)이다. 다음 4부에서는 한 발 물러나, 이렇게 만든 시뮬레이터의 *결과를 어떻게 신뢰할 것인가* — 입력 분포를 데이터로 정하고([[posts/foundations/simulation-and-digital-twin/10-input-modeling|input modeling]]), 출력을 통계적으로 분석하고([[posts/foundations/simulation-and-digital-twin/11-output-analysis|output analysis]]), 모델을 검증하는([[posts/foundations/simulation-and-digital-twin/12-verification-and-validation|V&V]]) — 방법론으로 들어간다.
