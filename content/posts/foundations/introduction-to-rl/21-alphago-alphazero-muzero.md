---
title: 21. AlphaGo에서 MuZero까지
date: 2026-06-30
tags:
  - Reinforcement Learning
---
[[posts/foundations/introduction-to-rl/20-monte-carlo-tree-search|MCTS]]는 모델(시뮬레이터)로 탐색 트리를 키우는 강력한 계획 기법이지만, 무작위 rollout의 분산과 탐색 공간의 크기라는 한계가 있었다. DeepMind의 AlphaGo 계열은 MCTS에 neural network를 결합해 이 한계를 넘었고, 그 종착점인 **MuZero**는 마침내 환경 모델까지 학습한다. 이 글은 AlphaGo → AlphaGo Zero → AlphaZero → MuZero로 이어지는 진화를, "무엇을 사람이 주고 무엇을 학습하는가"의 관점에서 따라간다.

## AlphaGo: MCTS + 신경망의 첫 결합

**AlphaGo**(2016)는 [[posts/foundations/introduction-to-rl/20-monte-carlo-tree-search|MCTS]]의 두 약점을 두 개의 network로 메웠다.

- **Policy network**: 각 국면에서 유망한 수에 prior를 부여해, MCTS의 selection을 좋은 수 위주로 좁힌다(가지치기). 처음엔 인간 기보를 모방하는 supervised learning으로 학습하고, 이어 self-play 강화학습으로 다듬었다.
- **Value network**: 국면의 가치를 직접 추정해, 끝까지 두는 무작위 rollout을 (부분적으로) 대체한다. 분산이 크고 느린 rollout 대신 안정적인 가치 추정을 제공한다.

Policy network가 selection에 개입하는 방식이 **PUCT**다. [[posts/foundations/introduction-to-rl/20-monte-carlo-tree-search|UCT]]의 탐색 보너스에 network의 prior $P(s,a)$를 곱한다.

$$
a = \arg\max_a \left( Q(s,a) + c_{\text{puct}}\; P(s,a)\, \frac{\sqrt{\sum_b N(s,b)}}{1 + N(s,a)} \right)
$$

UCT가 방문 횟수만으로 탐색을 배분했다면, PUCT에서는 **prior가 낮은 수는 애초에 탐색 예산을 적게 받는다**. 분기 수가 수백에 달하는 바둑에서 모든 수를 한 번씩이라도 찔러보는 것 자체가 낭비인데, 이 한 항이 그 낭비를 잘라낸다. 아직 한 번도 방문하지 않은 수($N = 0$)도 prior만 높으면 우선 시도되므로, network의 직관이 탐색의 출발점을 정하는 셈이다.

이 결합으로 AlphaGo는 2016년 이세돌 9단을 4:1로 꺾었다. 다만 인간 기보로 출발했고, network 구조와 학습 단계가 여럿으로 복잡했다.

> 참고: [AlphaGo (Silver et al., 2016)](https://doi.org/10.1038/nature16961)

## AlphaGo Zero · AlphaZero: 사람을 지우고 일반화하다

**AlphaGo Zero**(2017)는 인간 데이터를 완전히 버렸다. **무작위로 초기화된 상태에서 self-play만으로** 학습하며, policy와 value를 하나의 network로 통합했다.

핵심 아이디어는 **MCTS를 policy improvement operator로 보는 것**이다. network 하나만으로 두는 것보다, 그 network로 MCTS 탐색을 한 결과가 항상 더 좋은 수를 낸다. 그래서 학습은 다음 선순환으로 돌아간다.

1. 현재 network로 MCTS를 돌려 각 수의 **방문 분포**(network 단독보다 개선된 정책)와 게임 결과를 얻는다.
2. network가 그 **개선된 정책과 실제 승패를 맞히도록** 학습한다.
3. 더 좋아진 network로 다시 더 강한 MCTS를 돌린다.

이를 수식으로 쓰면 명확해진다. 뿌리에서 MCTS가 남긴 방문 횟수를 온도 $\tau$로 정규화한 분포가 **개선된 정책** $\boldsymbol{\pi}$가 되고,

$$
\pi(a \mid s) = \frac{N(s,a)^{1/\tau}}{\sum_b N(s,b)^{1/\tau}}
$$

network의 parameter $\theta$는 policy 출력 $\mathbf{p}_\theta$가 이 $\boldsymbol{\pi}$를, value 출력 $v_\theta$가 실제 승패 $z \in \{-1, +1\}$를 맞히도록 다음 손실을 최소화한다.

$$
\mathcal{L}(\theta) = \left( z - v_\theta(s) \right)^2 - \boldsymbol{\pi}^\top \log \mathbf{p}_\theta(s) + c \lVert \theta \rVert^2
$$

첫 항은 value의 회귀, 둘째 항은 MCTS 정책에 대한 cross-entropy(정책의 증류), 셋째 항은 regularization이다. 둘째 항이 이 구조의 심장이다 — [[posts/foundations/introduction-to-rl/04-solving-mdp|policy iteration]]의 언어로 말하면, **MCTS가 policy improvement를 수행하고, cross-entropy 학습이 그 개선분을 network에 저장하는 policy evaluation 겸 일반화** 역할을 한다. 탐색이 만든 국소적 개선이 network를 통해 모든 국면으로 일반화되는 것이다.

즉 planning이 만든 더 나은 정책을 network가 모방하고, 그 network가 다음 planning을 강화하는 구조다. **AlphaZero**(2017)는 이 알고리즘을 바둑뿐 아니라 체스·쇼기까지 **하나의 동일한 방법**으로 정복하도록 일반화했다.

> 참고: [AlphaGo Zero (Silver et al., 2017)](https://doi.org/10.1038/nature24270) · [AlphaZero (Silver et al., 2017)](https://arxiv.org/abs/1712.01815)

여기까지의 공통 전제가 하나 있다. **환경의 규칙(완벽한 모델)이 주어져 있다**는 것이다. 바둑·체스는 다음 수의 결과를 정확히 알 수 있으므로 MCTS가 그 규칙을 시뮬레이터로 그대로 쓴다. 규칙을 모르는 환경에서는 어떻게 할까?

## MuZero: 모델까지 학습하다

**MuZero**(2019)는 규칙을 모르는 채로, 계획에 필요한 모델 자체를 학습한다. 단, [[posts/foundations/introduction-to-rl/18-learning-the-dynamics-model|18장]]처럼 실제 다음 화면(observation)을 복원하는 모델을 배우지 않는다. 대신 **계획에 필요한 양 — 정책, 가치, 보상 — 만 잘 맞히는** 추상적인 latent 모델을 배운다. 세 함수로 구성된다.

- **Representation function** $h$: 관측 $o$를 latent state로 인코딩한다. $s^0 = h(o)$
- **Dynamics function** $g$: latent state와 행동을 받아 다음 latent state와 보상을 예측한다. $(s^{k+1}, r^{k+1}) = g(s^k, a^{k+1})$
- **Prediction function** $f$: latent state에서 정책과 가치를 출력한다. $(p^k, v^k) = f(s^k)$

MCTS는 이제 실제 환경이 아니라 **이 학습된 latent 공간 안에서** 진행된다. 뿌리에서 $h$로 관측을 latent로 바꾼 뒤, 트리를 내려갈 때마다 $g$로 다음 latent와 보상을 상상하고, 각 node에서 $f$로 정책 prior와 가치를 얻는다. 환경의 진짜 규칙은 한 번도 쓰이지 않는다.

![MuZero의 계획·행동·학습](https://ar5iv.labs.arxiv.org/html/1911.08265/assets/images/learned_model_search_play_train.png)

*(A) 학습된 $h, g, f$만으로 latent 공간에서 MCTS를 수행하고, (B) 탐색이 만든 방문 분포 $\pi$로 실제 행동을 고르며, (C) 실제 궤적을 따라 모델을 $K$ step 펼쳐 정책·가치·보상 target에 맞춰 end-to-end 학습한다. 출처: [MuZero 논문](https://arxiv.org/abs/1911.08265) Figure 1*

학습은 세 함수를 **end-to-end로 함께** 한다. 시점 $t$의 관측에서 출발해 실제로 둔 행동 $a_{t+1}, \dots, a_{t+K}$를 따라 모델을 $K$ step 펼치고(unroll), 각 step $k$의 예측을 실제 신호에 맞추는 손실을 최소화한다.

$$
\mathcal{L}_t(\theta) = \sum_{k=0}^{K} \Big[ \ell^{p}\left( \pi_{t+k},\, p^{k} \right) + \ell^{v}\left( z_{t+k},\, v^{k} \right) + \ell^{r}\left( u_{t+k},\, r^{k} \right) \Big] + c \lVert \theta \rVert^2
$$

각 target의 의미는 AlphaZero와 이어진다.

- $\pi_{t+k}$: 그 시점 MCTS의 방문 분포 — 예측 정책 $p^k$가 이를 맞춘다 (AlphaZero의 policy 증류와 동일).
- $z_{t+k}$: 실제 승패, 또는 Atari처럼 중간 보상이 있는 환경에서는 $n$-step return — 예측 가치 $v^k$의 target.
- $u_{t+k}$: 실제로 받은 보상 — 예측 보상 $r^k$의 target.

이 손실의 gradient는 $\ell^{p}, \ell^{v}, \ell^{r}$에서 출발해 **dynamics function $g$를 $k$번 거슬러** representation $h$까지 흐른다. 즉 latent state는 "다음 화면을 복원하라"가 아니라 **"$k$ step 뒤의 정책·가치·보상을 맞힐 수 있게 정보를 유지하라"** 는 압력만 받는다.

여기서 결정적인 점은, $g$가 만드는 latent state가 **실제 state와 닮을 필요가 없다**는 것이다. 오직 정책·가치·보상 예측이 맞기만 하면 된다. 모델을 "현실을 재현하는 것"이 아니라 "계획에 필요한 결과를 재현하는 것"으로 재정의한 이 발상 — 이후 *value equivalence*로 정식화된 원리 — 이 MuZero의 핵심이다.

그 결과 MuZero는 규칙이 주어진 바둑·체스·쇼기에서 AlphaZero에 필적하면서, **규칙을 모르는 Atari**에서도 당시 최고 수준의 성능을 냈다. 하나의 알고리즘이 보드게임과 픽셀 기반 비디오게임을 모두 다룬 것이다.

> 참고: [MuZero (Schrittwieser et al., 2019)](https://arxiv.org/abs/1911.08265)

## 정리

이 계열의 진화는 "사람이 주는 것"을 하나씩 학습으로 대체해 온 역사다. AlphaGo는 인간 기보로 출발했고, AlphaGo Zero·AlphaZero는 self-play만으로 사람 없이 학습했으며, MuZero는 마지막에 남아 있던 **환경 모델마저** 학습으로 끌어들였다. 특히 MuZero가 보여준 "계획에 필요한 양만 예측하는 latent 모델"이라는 관점은, 이어지는 [[posts/foundations/introduction-to-rl/23-world-models-and-dreamer|world model]] 계열과도 통하는 현대 model-based RL의 중요한 줄기다.
