---
title: 34. DES를 RL 환경으로 만들기
date: 2026-07-18
tags:
  - Simulation
  - AI Scheduling
---

[[posts/foundations/simulation-and-digital-twin/31-des-for-dispatching-evaluation|31편]]은 이렇게 끝났다 — 고정된 룰이나 점수식을 버리고, 디스패칭을 **시스템 상태를 보고 그때그때 행동을 고르는 문제**로 일반화하면 강화학습의 문이 열린다. 강화학습(RL)은 environment(환경)와의 상호작용 — 상태를 관측하고, 행동을 하고, 보상을 받는 반복 — 을 통해 policy(정책, 상태를 행동으로 사상하는 규칙)를 배우는 방법이다. RL 자체의 기초는 [[posts/foundations/introduction-to-rl/01-introduction-to-reinforcement-learning|RL 시리즈 1편]]과 [[posts/foundations/introduction-to-rl/02-markov-decision-process|2편(MDP)]]에 맡기고, 이 글은 공학 문제 하나에 집중한다.

RL은 시행착오로 배운다. 그런데 실물 fab에서 시행착오는 불가능하다 — "이 정책이 나쁜지 보려고 한 달치 웨이퍼를 희생"할 수는 없다. 그래서 **시뮬레이터가 곧 환경이다.** 에이전트는 실물 대신 DES 시뮬레이터와 수백만 번 상호작용하며 정책을 배운다. 문제는, 우리가 1~9편에서 만든 DES 시뮬레이터는 RL이 기대하는 "환경"의 모양을 하고 있지 않다는 것이다. 이 글은 그 사이를 잇는 법 — DES 시뮬레이터를 RL 환경으로 포장(wrapping)하는 법 — 을 다룬다.

## 표준 인터페이스: Gymnasium 스타일

RL 쪽에는 환경의 사실상 표준 인터페이스가 있다. **[Gymnasium](https://gymnasium.farama.org/)**(구 OpenAI Gym) API로, 핵심은 딱 두 함수다.

- `reset()` — 환경을 초기 상태로 되돌리고 첫 관측을 돌려준다.
- `step(action)` — 행동을 적용하고 `(관측, 보상, terminated, truncated, info)`를 돌려준다. `terminated`는 과제가 자연스럽게 끝났다는 뜻(게임 승패 등), `truncated`는 끝나지 않았지만 정해진 한도에서 잘랐다는 뜻이다.

이 인터페이스의 가치는 **분리**에 있다. 에이전트(학습 알고리즘) 쪽 코드는 환경 내부가 Atari 게임이든 로봇이든 fab 시뮬레이터든 똑같이 동작한다. 우리가 할 일은 fab DES를 이 두 함수 뒤에 숨기는 것이고, 그러면 기존 RL 알고리즘 구현들을 그대로 물릴 수 있다.

## 핵심 질문: "step"은 언제인가

여기가 이 글의 중심이다. Atari류 환경에서 step은 자명하다 — 고정 시간 간격(프레임)마다 행동을 하나씩 낸다. **DES는 다르다.** DES에서는 시간이 이벤트 단위로 흐르고, 결정할 것이 있는 순간도 이벤트로 정의된다. 디스패칭이라면 "장비가 비었고, 그 앞 큐에 lot이 2개 이상 대기 중"일 때에만 고를 것이 있다. lot이 1개면 그것을 태우면 그만이고(결정이 아니다), 장비가 돌고 있는 동안에는 물을 것 자체가 없다.

이런 순간을 **decision point(결정 시점)** 라 부르자. 환경의 시간 축을 결정 시점의 열 $t_0 < t_1 < t_2 < \cdots$ 로 보면, $k$번째 step에서 에이전트는 관측 $s_k$를 받고 행동 $a_k$를 내며, 환경은 다음 결정 시점 $t_{k+1}$까지 진행한 뒤 $s_{k+1}$과 보상을 돌려준다. 즉 DES 환경에서 `step(action)`의 의미는 이것이다.

> **행동을 시뮬레이터에 적용하고, 다음 결정 시점이 올 때까지 시뮬레이션을 진행한 뒤, 그 시점의 새 관측을 돌려준다.**

한 번의 step 동안 시뮬레이션 안에서는 수십 개의 이벤트(도착, 공정 완료, 고장, 수리)가 지나갈 수 있다. 그리고 결정 시점 사이의 간격

$$
\tau_k = t_{k+1} - t_k
$$

는 고정 상수가 아니라 이벤트가 결정하는 확률적 값이다 — 어떤 결정의 다음 결정은 1분 뒤에, 어떤 것은 세 시간 뒤에 온다. 이 식이 말하는 것: **step 번호 $k$(에이전트의 시계)와 시뮬레이션 시각 $t$(모델의 시계)가 분리된다.** 같은 "한 스텝"이라도 실세계 시간으로는 전혀 다른 길이일 수 있다는 뜻인데, 그러면 미래 보상을 얼마나 할인할지(스텝당 일정하게? 경과 시간에 비례해서?) 같은 문제가 생긴다. 이 가변 간격을 수학적으로 제대로 다루는 틀이 Semi-MDP이고, 다음 글 [[posts/foundations/simulation-and-digital-twin/35-semi-mdp-formulation|35편]]의 주제다.

## 제어 역전: 누가 주도권을 쥐는가

개념은 정리됐다. 구현에서 부딪히는 문제는 **inversion of control(제어 역전)** — 두 코드가 서로 자기가 주도하려 한다는 것이다.

- [[posts/foundations/simulation-and-digital-twin/09-modeling-des-with-simpy|9편]]에서 봤듯, SimPy 같은 프로세스 기반 엔진은 `env.run()`을 부르면 시뮬레이션이 **자기 주도**로 끝까지 흘러간다. 디스패칭 결정은 프로세스 코드 안에서 (예: 룰 함수 호출로) 내부적으로 처리된다.
- RL 학습 루프는 반대로 **에이전트가 주도**한다 — 에이전트가 `step()`을 부를 때마다 환경이 한 걸음 움직여 주기를 기대한다.

둘을 이으려면 시뮬레이션이 **결정 시점마다 일시정지하고 제어를 바깥(에이전트)에 넘기는** 구조가 필요하다. SimPy에서 쓰는 대표적 패턴은 두 가지다.

1. **부분 실행**: `env.run(until=결정_이벤트)`처럼 "다음 결정 이벤트가 발생할 때까지만" 실행한다. 결정 이벤트가 트리거되면 `run()`이 반환되며 제어가 wrapper로 돌아오고, wrapper는 관측을 만들어 에이전트에 준다.
2. **행동 대기 이벤트**: 디스패칭을 담당하는 프로세스가 결정 시점에 "action이 채워지길 기다리는 이벤트"를 `yield`한다. 바깥에서 `step(action)`이 그 이벤트에 action을 실어 succeed시키면 프로세스가 깨어나 해당 lot을 할당하고 계속 진행한다.

어느 쪽이든 골자는 같다 — 9편에서 룰 함수가 앉아 있던 자리에 "바깥에 묻고 답을 기다리는 구멍"을 뚫는 것이다. 구조를 코드로 스케치하면 다음과 같다. **실행 가능한 코드가 아니라 구조 전달이 목적**이다.

```python
class FabEnv:
    """SimPy fab 시뮬레이터를 Gymnasium 스타일로 감싼 구조 스케치."""

    def reset(self, seed=None):
        self.sim = build_fab_simulator(seed)   # SimPy Environment + fab 모델 구성
        self._run_until_next_decision()        # 첫 결정 시점까지 시뮬레이션 진행
        return self._observe(), {}

    def step(self, action):
        self.sim.apply(action)                 # 행동 적용: 선택된 lot을 장비에 할당
        self._run_until_next_decision()        # 다음 결정 시점까지 시뮬레이션 진행
        obs = self._observe()                  # 새 결정 시점의 상태를 관측으로 변환
        reward = self._compute_reward()        # 이번 구간에서 실현된 성과를 보상으로
        terminated = False                     # fab은 스스로 끝나지 않는다
        truncated = self.sim.env.now >= self.horizon   # 정한 horizon에서 자른다
        return obs, reward, terminated, truncated, {}

    def _run_until_next_decision(self):
        # SimPy: 다음 결정 이벤트가 트리거될 때까지만 실행 (패턴 1)
        self.sim.env.run(until=self.sim.next_decision_event)
```

`reset()`이 "시뮬레이터 초기화 + 첫 결정 시점까지 진행"인 것에 주목하자. 빈 fab의 $t=0$은 결정할 것이 없는 시각이므로, 첫 관측은 첫 결정 시점의 상태여야 한다.

## 설계 결정 세 가지

인터페이스 틀이 잡혀도, 그 안을 채우는 세 가지 설계 결정이 남는다. 각각이 학습 성패를 좌우한다.

### 관측: 무엇을 보여줄 것인가

fab의 전역 상태 — 수만 lot 각각의 위치·진도·이력, 수천 장비의 상태 — 를 전부 관측으로 주는 것은 비현실적이다. 벡터가 너무 크고, lot 수에 따라 크기가 변하며, 대부분은 지금 결정과 무관하다. 실무는 두 층으로 요약한다.

- **국소 정보**: 결정이 일어나는 툴그룹 큐의 lot별 feature — 대기 시간, 잔여 처리 시간, 납기 여유(예: 31편의 CR 값), lot 우선순위 등.
- **전역 요약**: fab 전체의 압축 신호 — 구간별 WIP 분포, 병목 툴그룹의 가동률과 큐 길이 등. 룰의 근시안을 넘어서는 것이 목적이므로, "세 스텝 뒤 병목이 어떤 상태인가"류의 정보가 여기에 실려야 한다.

실무적으로 중요한 것이 **정규화**(feature의 스케일을 비슷한 범위로 맞추는 것)다. 큐 길이는 0~50, 납기 여유는 분 단위로 수천 — 스케일이 뒤섞인 입력은 neural network 학습을 불안정하게 만든다. 큐 길이는 용량으로, 시간 feature는 대표 처리 시간으로 나누는 식으로 단위를 통일한다.

### 행동: 무엇을 고르게 할 것인가

행동 공간의 설계에는 세 가지 대표 선택지가 있다.

- **(a) 후보 lot 직접 선택**: 가장 직접적이지만, 큐에 있는 lot 수가 매번 달라 **행동 공간 크기가 가변**이라는 문제를 안는다. 후보별 점수를 내는 구조나 최대 후보 수 고정 + masking 같은 장치가 필요하다.
- **(b) 룰 선택**: 행동을 "이 순간 어느 디스패칭 룰을 쓸 것인가"로 정의한다. [[posts/foundations/simulation-and-digital-twin/31-des-for-dispatching-evaluation|31편]]의 FIFO·SPT·EDD·CR이 그대로 **행동 메뉴**가 되고, 행동 공간이 작고 고정되어 학습이 쉽다. 상태에 따라 룰을 갈아타는 것만으로도 단일 룰을 넘어설 수 있다.
- **(c) parameter 조정**: 31편 말미의 가중 점수식을 유지하되, 그 가중치를 상태에 따라 조정하는 연속 행동으로 본다.

어느 설계든 **invalid action 처리**가 필요하다. 예컨대 (a)에서 "후보 슬롯 7번"이 비어 있는데 에이전트가 그것을 고를 수 있으면 안 된다. 표준 처리는 **masking** — 불가능한 행동의 선택 확률을 0으로 강제해, 에이전트가 애초에 고르지 못하게 하는 기법 — 이다.

### 에피소드 경계: 언제 끝나는가

RL의 에피소드(episode)는 reset부터 종료까지의 한 판이다. 게임은 이기거나 지면 끝나지만, **fab은 끝나지 않는다** — 24시간 연속 운영이라 자연 종결이 없다. 선택지는 둘이다.

- **고정 horizon으로 자르기**: 시뮬레이션 시간 기준 예컨대 7일씩 돌리고 truncation으로 끝낸다. 구현이 단순해 널리 쓰이지만, warm-up([[posts/foundations/simulation-and-digital-twin/11-output-analysis|11편]])과 "horizon 끝 직전의 결정은 결과를 보지 못한다"는 경계 왜곡을 관리해야 한다.
- **연속 과제(continuing task)로 보기**: 에피소드 없이 무한히 이어지는 과제로 정식화한다. fab의 실제 모습에 충실하지만 평균 보상 기준 등 다른 수학적 틀이 필요하다.

Gymnasium이 `terminated`와 `truncated`를 굳이 구분하는 이유가 여기서 실질적 의미를 가진다. horizon에서 자른 종료는 "이 상태의 미래 가치가 0"이라는 뜻이 아니다(fab은 계속 돌아갈 것이므로). 이 구분을 뭉개면 학습 알고리즘이 horizon 끝 상태의 가치를 잘못 추정한다.

## 보상: 예고만

마지막 조각인 보상은 이 글에서는 문제 제기만 한다. fab에서 우리가 진짜 원하는 성과 — cycle time, tardiness — 는 lot이 **완료될 때에야** 실현된다. 그런데 그 lot의 운명은 수 주에 걸친 수백 번의 디스패칭 결정이 함께 만든 것이다. 행동과 보상 사이의 이 긴 지연은 RL에서 **credit assignment 문제**(받은 보상을 과거의 어느 행동 덕분/탓으로 배분할 것인가)를 극단적으로 어렵게 만든다. 그래서 매 step 계산 가능한 중간 보상(proxy — 예: 그 구간의 WIP 감소량)을 쓸 것인가, 쓴다면 그것이 진짜 목적과 어긋나지는 않는가 하는 딜레마가 생긴다. 이 문제는 [[posts/foundations/simulation-and-digital-twin/35-semi-mdp-formulation|35편]](정식화)과 36편(보상 설계)에서 본격적으로 다룬다.

## 정리

- 실물 fab에서 시행착오는 불가능하므로 **DES 시뮬레이터가 RL의 environment가 된다.** 표준 모양은 Gymnasium 스타일 — `reset()`과 `step(action) → (관측, 보상, terminated, truncated, info)`.
- DES 환경의 핵심 특성: step은 고정 시간 간격이 아니라 **decision point(이벤트로 정의되는 결정 시점)** 단위다. `step(action)` = 행동 적용 + **다음 결정 시점까지 시뮬레이션 진행**. 간격 $\tau_k$가 가변이라 에이전트의 시계와 모델의 시계가 분리된다 — Semi-MDP([[posts/foundations/simulation-and-digital-twin/35-semi-mdp-formulation|35편]], 예정)의 복선.
- 구현의 관문은 **inversion of control**: 자기 주도로 흐르는 SimPy 시뮬레이션을 결정 시점마다 멈춰 제어를 에이전트에 넘긴다 — `env.run(until=결정_이벤트)` 부분 실행 또는 action을 기다리는 이벤트 `yield`.
- 설계 결정 세 가지: **관측**(국소 lot feature + 전역 요약, 정규화 필수), **행동**(lot 직접 선택 vs **룰 선택** — 31편의 룰들이 행동 메뉴 — vs parameter 조정, invalid action은 masking), **에피소드 경계**(끝나지 않는 fab을 truncation으로 자를 것인가, 연속 과제로 볼 것인가 — terminated/truncated 구분이 실질 의미를 가진다).
- **보상은 완료 시점에야 실현**되는 긴 지연이 특징 — credit assignment의 난제로, 35·36편에서 본격화한다.

다음 글에서는 이 글이 미뤄 둔 수학 — 가변 시간 간격 $\tau_k$를 할인과 함께 제대로 다루는 **Semi-MDP 정식화**([[posts/foundations/simulation-and-digital-twin/35-semi-mdp-formulation|35편]], 예정) — 로 들어간다.
