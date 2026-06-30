---
title: 19. Dyna 심화 - Dyna-Q+와 Prioritized Sweeping
date: 2026-06-30
tags:
  - Reinforcement Learning
---
[[posts/foundations/introduction-to-rl/17-model-based-rl|Model-based RL]]에서 **Dyna**는 실제 경험과 모델이 만든 가상 경험을 같은 value function에 합치는 architecture로 소개했다. 이 글은 Dyna를 더 깊이 들여다보고, 기본 Dyna-Q의 두 가지 약점을 보완하는 **prioritized sweeping**과 **Dyna-Q+** 두 기법을 다룬다.

> 참고: Sutton & Barto, *Reinforcement Learning: An Introduction* (2nd ed.), Ch. 8

## Dyna-Q 복습

Dyna-Q는 한 step의 실제 경험으로 세 가지를 동시에 한다.

1. **Direct RL**: 실제 경험 $(s, a, r, s')$로 $Q$를 Q-learning 갱신.

    $$
    Q(s,a) \leftarrow Q(s,a) + \alpha\left( r + \gamma \max_{a'} Q(s', a') - Q(s,a) \right)
    $$

2. **Model learning**: 관측한 $(s,a) \to (r, s')$를 모델 $\hat{P}, \hat{R}$에 기록.
3. **Planning**: 과거 방문 $(s,a)$를 임의로 $n$개 뽑아, 모델이 준 가상 경험으로 1번과 똑같은 갱신을 반복.

여기서 planning은 결국 **모델이 만든 데이터에 대한 model-free 갱신**이다. $n$이 클수록 실제 한 step에서 더 많은 학습을 짜내므로 sample 효율이 오른다. 하지만 이 기본형에는 두 가지 비효율과 취약점이 있다.

- Planning에서 $(s,a)$를 **완전히 무작위로** 뽑는다 → 갱신해봐야 아무것도 안 바뀌는 곳까지 헛돈다.
- 모델을 한번 학습하면 그대로 믿는다 → **환경이 변하면** 낡은 모델에 갇힌다.

각각을 prioritized sweeping과 Dyna-Q+가 푼다.

## Prioritized Sweeping: 중요한 곳부터 갱신하기

무작위 planning의 낭비를 생각해보자. 목표에 처음 도달해 보상을 받으면, 그 직전 state의 가치만 막 바뀐 상태다. 이때 환경 전체에서 $(s,a)$를 무작위로 뽑으면 대부분은 **아직 가치 변화가 전파되지 않은**, 그래서 갱신해도 0에 가까운 곳이다.

**Prioritized sweeping**은 "가치가 크게 바뀐 지점"과 "그 변화의 영향을 받을 지점"에 planning을 집중한다.

1. 각 $(s,a)$의 갱신이 일으킬 변화량(TD error의 크기)을 우선순위로 매겨 **priority queue**에 넣는다.

    $$
    P \leftarrow \left| r + \gamma \max_{a'} Q(s', a') - Q(s,a) \right|
    $$

2. 매 planning step마다 우선순위가 가장 높은 $(s,a)$를 꺼내 갱신한다.
3. 그 갱신으로 $Q(s,a)$가 바뀌었다면, **$s$로 이어지는 이전 state-action들**(predecessors)의 변화량을 계산해 큐에 (역시 우선순위와 함께) 넣는다.

핵심은 3번이다. 가치 변화를 **결과에서 원인 방향으로 역전파**하기 때문에, 보상이 목표에서 출발점 쪽으로 효율적으로 퍼진다. predecessor를 찾으려면 "어떤 $(s,a)$가 이 state로 오는가"를 알아야 하므로, 여기서 [[posts/foundations/introduction-to-rl/18-learning-the-dynamics-model|backward model]]이 쓰인다. 같은 계획 예산으로 무작위 Dyna보다 훨씬 빨리 수렴한다.

> 참고: prioritized sweeping은 Moore & Atkeson (1993)이 제안했다.

## Dyna-Q+: 변하는 환경에 대응하기

Dyna-Q의 더 위험한 약점은 환경이 변할 때 드러난다. Sutton & Barto의 고전적 예시가 직관적이다.

- **Blocking maze**: 처음엔 열려 있던 통로가 어느 순간 막힌다. Dyna-Q는 낡은 모델을 믿고 막힌 길로 계속 가다가, 실제 경험으로 천천히 모델을 고친 뒤에야 우회로를 찾는다.
- **Shortcut maze**: 가던 길은 그대로지만, 새 지름길이 열린다. Dyna-Q는 기존 경로로도 잘 가고 있으니 새 영역을 **탐험할 이유를 못 느껴**, 지름길을 영영 발견하지 못할 수 있다.

문제의 뿌리는 같다. 오래 가보지 않은 $(s,a)$에 대한 모델 정보는 낡았을 수 있는데, agent가 그 사실을 무시한다는 것이다.

Dyna-Q+는 planning 단계의 보상에 **exploration bonus**를 더해 이를 해결한다. $(s,a)$를 마지막으로 시도한 지 $\tau$ step이 지났다면, 모델이 주는 보상을 다음처럼 부풀린다.

$$
r + \kappa \sqrt{\tau}
$$

여기서 $\kappa$는 작은 상수다. 오래 안 가본 $(s,a)$일수록 $\tau$가 커져 보너스가 커지므로, agent는 주기적으로 "안 가본 지 오래된 곳"을 다시 확인하고 싶어 한다. 이 한 항이 blocking maze에서는 막힌 길을 빨리 포기하게, shortcut maze에서는 새 지름길을 발견하게 만든다.

> 이 보너스는 [[posts/foundations/introduction-to-rl/13-soft-actor-critic|SAC]]의 entropy 항처럼 **탐험을 목적함수에 내장**하는 또 다른 방식으로 볼 수 있다. 다만 여기서는 "행동의 무작위성"이 아니라 "정보의 신선도"에 보너스를 준다는 점이 다르다.

## 정리

Dyna는 학습·계획·행동을 한 틀에 녹인 강력한 골격이지만, 기본형은 계획을 무작위로 낭비하고 변하는 환경에 둔하다. Prioritized sweeping은 가치 변화를 역방향으로 전파해 **같은 예산으로 더 빨리** 배우게 하고, Dyna-Q+는 신선도 기반 exploration bonus로 **모델이 낡는 상황에 강건하게** 만든다. 둘 다 "한정된 계획 자원을 어디에 쓸 것인가"라는 질문에 대한 답이다.
