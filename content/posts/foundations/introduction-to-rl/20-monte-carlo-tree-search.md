---
title: 20. Monte-Carlo Tree Search 깊이 보기
date: 2026-06-30
tags:
  - Reinforcement Learning
---
[[posts/foundations/introduction-to-rl/17-model-based-rl|Model-based RL]]에서 **MCTS**는 전역 value를 꾸준히 개선하는 Dyna식 background planning과 대비되는, **지금 이 state에서 무엇을 할지를 그 자리에서 탐색하는** decision-time planning으로 소개했다. 이 글은 MCTS의 네 단계를 하나씩 뜯어보고, 왜 이 방식이 거대한 탐색 공간에서도 동작하는지를 본다.

> 참고: UCT는 [Kocsis & Szepesvári (2006)](https://doi.org/10.1007/11871842_29)가 제안했다.

## 왜 트리 탐색인가

현재 state에서 시작해 가능한 모든 행동 순서를 끝까지 펼치면 완벽한 계획을 세울 수 있다. 하지만 바둑처럼 분기 수가 크고 깊이가 깊은 문제에서 이 트리는 천문학적으로 커진다. 전체를 다 볼 수 없다면, **유망한 가지에 탐색을 몰아주고 가망 없는 가지는 일찍 접어야** 한다.

MCTS는 이를 위해 모델(시뮬레이터)을 이용해 현재 state를 뿌리로 하는 탐색 트리를 **점진적으로, 비대칭적으로** 키운다. 매 반복마다 아래 네 단계를 거치며, 시간이 허락하는 만큼 반복한 뒤 가장 좋아 보이는 행동을 실제로 둔다.

## 네 단계

**1. Selection (선택).** 뿌리에서 출발해, 이미 트리에 있는 노드 안에서는 **tree policy**에 따라 자식을 골라 내려간다. 아직 펼치지 않은 자식이 있는 노드에 도달할 때까지 내려간다. tree policy로는 보통 **UCT**(아래)를 쓴다.

**2. Expansion (확장).** 도달한 노드에서 아직 시도하지 않은 행동 하나를 골라, 그에 해당하는 자식 노드를 트리에 새로 추가한다.

**3. Simulation (시뮬레이션, rollout).** 새로 추가한 노드에서부터 **default policy**(가장 단순하게는 무작위)로 게임이 끝날 때까지 빠르게 진행해, 그 결과(승패 또는 누적 보상)를 하나 얻는다. 이 단계는 트리에 저장하지 않는, 한 번 쓰고 버리는 추정이다.

**4. Backpropagation (역전파).** 시뮬레이션 결과를 방금 내려온 경로를 따라 뿌리까지 거슬러 올리며, 경로상 각 노드의 방문 횟수 $N$과 가치 추정 $Q$를 갱신한다.

$$
N(s,a) \leftarrow N(s,a) + 1, \quad Q(s,a) \leftarrow Q(s,a) + \frac{1}{N(s,a)}\left( G - Q(s,a) \right)
$$

여기서 $G$는 이번 시뮬레이션에서 얻은 결과다. 즉 각 $(s,a)$의 $Q$는 **그 가지를 지나간 시뮬레이션 결과들의 평균**으로 수렴한다.

이 네 단계를 수천~수십만 번 반복한 뒤, 뿌리에서 **가장 많이 방문된**(또는 가치가 가장 높은) 행동을 실제 수로 선택한다.

## UCT: 탐색과 활용의 균형

Selection 단계의 핵심은 tree policy다. 각 노드에서 어떤 자식으로 내려갈지는 **UCT**(Upper Confidence bounds applied to Trees) 기준으로 정한다. 이는 multi-armed bandit의 UCB1을 트리에 적용한 것이다.

$$
a = \arg\max_a \left( Q(s, a) + c \sqrt{\frac{\ln N(s)}{N(s, a)}} \right)
$$

두 항의 역할이 다르다.

- $Q(s,a)$ — **활용(exploitation)**: 지금까지 좋았던 행동을 선호한다.
- $c \sqrt{\ln N(s) / N(s,a)}$ — **탐색(exploration)**: 부모는 많이 방문됐는데($N(s)$ 큼) 정작 적게 시도된($N(s,a)$ 작음) 행동에 보너스를 준다. $c$는 둘의 비중을 정하는 상수다.

이 보너스 덕분에, 한두 번 운 나쁘게 나쁜 결과가 나온 행동도 영영 버려지지 않고 충분히 재검토된다. 시뮬레이션이 무한히 많아지면 UCT는 최적 행동으로 수렴함이 알려져 있다. [[posts/foundations/introduction-to-rl/06-model-free-control|Model-free Control]]의 $\epsilon$-greedy가 모든 비최적 행동을 똑같은 확률로 찔러보는 것과 달리, UCT는 **불확실한 행동에 더, 확실히 나쁜 행동에 덜** 탐색을 배분한다는 점이 핵심이다.

## 비대칭 트리와 anytime 성질

UCT가 만드는 트리는 **비대칭적**이다. 유망한 수 쪽으로는 트리가 깊고 빽빽하게 자라고, 가망 없는 수 쪽은 얕게 남는다. 인간 기사가 좋은 수 위주로 더 깊이 읽는 것과 닮았다. 전체를 균일하게 펼치는 완전 탐색과 달리, 한정된 계산을 가치 있는 곳에 몰아주는 것이다.

또한 MCTS는 **anytime** 알고리즘이다. 언제 멈추든 그 시점까지의 추정으로 최선의 행동을 답할 수 있고, 시간을 더 줄수록 추정이 좋아진다. 실시간 대국에서 시간 예산에 맞춰 탐색량을 조절할 수 있는 이유다.

## 한계, 그리고 다음

기본 MCTS의 약점은 **simulation 단계의 무작위 rollout**이다. 무작위로 끝까지 두는 추정은 분산이 크고, 분기가 큰 문제에서는 한 번의 rollout이 국면을 제대로 대표하지 못한다. 또 좋은 수로 탐색을 좁히는 일도 순전히 통계에만 의존한다.

[[posts/foundations/introduction-to-rl/21-alphago-alphazero-muzero|AlphaGo·AlphaZero]]는 바로 이 두 약점을 neural network로 메운다. **value network**가 끝까지 두지 않고도 국면 가치를 추정해 무작위 rollout을 대체하고, **policy network**가 selection을 유망한 수로 좁힌다. 다음 글에서 이 결합을 살펴본다.
