---
title: 17. Model-based RL
date: 2026-06-23
tags:
  - Reinforcement Learning
---
시리즈의 출발점이었던 [[posts/foundations/introduction-to-rl/06-model-free-control|Model-free Control]]은 환경의 dynamics를 모른 채, 오직 경험으로 value나 policy를 직접 학습하는 방법이었다. 이번 글은 그 짝이 되는 반대편 축, **model-based RL**을 다룬다. 환경의 모델 — 전이확률 $P(s' \mid s, a)$와 보상 $R(s, a)$ — 을 학습하거나 활용해 **계획**(planning)을 세우는 접근이다.

## Model-free vs. Model-based

핵심 차이는 "경험을 어디에 쓰느냐"다.

- **Model-free**: 경험 $(s, a, r, s')$로 value/policy를 **직접** 업데이트한다. 단순하지만, 환경과 실제로 부딪힌 만큼만 배우므로 sample이 많이 필요하다.
- **Model-based**: 경험으로 먼저 **환경 모델 $\hat{P}, \hat{R}$를 학습**하고, 그 모델로 가상의 경험을 만들어 계획을 세운다. 모델이라는 중간 단계를 둔다.

Model-based의 가장 큰 장점은 **sample efficiency**다. 실제 환경과의 상호작용은 비싸지만(로봇을 망가뜨리거나 시간이 오래 걸린다), 한 번 모델을 얻으면 머릿속에서 값싼 "상상 경험"을 무한히 만들어 학습할 수 있다.

> 단, 공짜는 아니다. 학습된 모델이 틀리면 계획은 그 오차를 파고들어(**model bias**) 실제 환경에서 엉뚱하게 행동한다. "효율적이지만 편향된 모델"과 "비싸지만 정확한 실제 경험" 사이의 trade-off가 model-based RL의 본질적 긴장이다.

## Dyna: 학습·계획·행동의 통합

**Dyna**(Sutton)는 model-free와 model-based를 한 틀에 녹인 고전적 architecture다. 같은 value function을 **실제 경험**과 **모델이 만든 가상 경험** 양쪽으로 업데이트한다.

대표적인 **Dyna-Q**는 다음과 같이 동작한다.

1. 현재 state $s$에서 action $a$를 선택해 실제로 수행, $(r, s')$를 얻는다.
2. **Direct RL**: 이 실제 경험으로 $Q(s,a)$를 업데이트한다 (Q-learning과 동일).

    $$
    Q(s,a) \leftarrow Q(s,a) + \alpha\left( r + \gamma \max_{a'} Q(s', a') - Q(s,a) \right)
    $$

3. **Model learning**: 경험으로 모델 $\hat{P}, \hat{R}$를 갱신한다 (관측한 $(s,a) \to (r, s')$를 기록).
4. **Planning**: 아래를 $n$번 반복한다.
    - 과거에 방문한 $(s, a)$를 임의로 하나 뽑고, 모델로 $(\hat{r}, \hat{s'})$를 질의한 뒤, 그 **가상 경험**으로 2번과 똑같은 $Q$ 업데이트를 수행한다.

여기서 통찰은, **planning이 곧 모델이 만든 데이터에 대한 model-free 업데이트**라는 점이다. Dyna에서 학습과 계획은 같은 갱신 규칙을 실제 데이터에 쓰느냐 상상 데이터에 쓰느냐의 차이일 뿐이다. $n$을 키울수록 실제 한 step당 더 많은 가상 학습을 짜내어 sample 효율이 올라간다.

## MCTS와 AlphaZero: 결정 시점의 계획

Dyna가 전역 value function을 꾸준히 개선하는 **background planning**이라면, **Monte-Carlo Tree Search** (MCTS)는 **지금 이 state에서 어떤 행동을 할지**를 그 자리에서 탐색하는 **decision-time planning**이다.

MCTS는 모델(시뮬레이터)을 이용해 현재 state로부터 탐색 트리를 키우며, 유망한 가지에 탐색을 집중한다. 이때 각 노드에서 다음 **UCT** 기준으로 행동을 고른다 — 즉 [[posts/foundations/introduction-to-rl/06-model-free-control|Model-free Control]]의 $\epsilon$-greedy 대신 UCB 식 exploration을 쓴다.

$$
a = \arg\max_a \left( Q(s, a) + c \sqrt{\frac{\ln N(s)}{N(s, a)}} \right)
$$

여기서 $N(s)$는 state 방문 횟수, $N(s,a)$는 그 행동 선택 횟수로, 적게 시도한 행동에 보너스를 주어 exploration과 exploitation의 균형을 맞춘다.

**AlphaGo·AlphaZero**는 이 MCTS에 neural network를 결합한다.

- Policy network는 탐색을 유망한 수로 좁혀주고(가지치기), value network는 끝까지 시뮬레이션하지 않고도 국면의 가치를 추정한다(무작위 rollout 대체).
- self-play로 데이터를 만들고, network는 **MCTS가 개선한 정책**과 **게임 결과**를 맞히도록 학습된다. 즉 "planning이 만든 더 나은 정책"을 network가 모방하고, 다시 그 network가 다음 planning을 강화하는 선순환이다.
- 바둑·체스의 규칙은 알려진 완벽한 모델이므로, 이는 **알려진 모델 + 학습된 policy/value**를 결합한 model-based RL의 대표 사례다.

## 정리

Model-based RL은 환경 모델을 학습하거나 활용해 가상 경험으로 계획을 세움으로써, model-free의 고질적 약점인 sample 비효율을 공략한다. Dyna는 실제·가상 경험을 같은 value에 합치는 background planning을, MCTS/AlphaZero는 결정 시점마다 탐색하는 decision-time planning을 보여준다. 모델이 정확하다면 강력하지만, 모델 오차가 곧 성능 한계가 된다는 점이 핵심 trade-off다.
