---
title: 12. DDPG and TD3
date: 2026-06-23
tags:
  - Reinforcement Learning
---
지금까지 본 알고리즘을 두 축으로 나눠보자. [[posts/foundations/introduction-to-rl/07-deep-q-learning|DQN]]은 value-based이자 off-policy지만 **discrete action**에서만 동작하고, [[posts/foundations/introduction-to-rl/10-proximal-policy-optimization|PPO]]는 continuous action을 다룰 수 있지만 **on-policy**라 sample 효율이 떨어진다. 그렇다면 "continuous action을 다루면서 동시에 off-policy인" 알고리즘은 없을까? 이 빈자리를 채우는 대표적인 방법이 **DDPG**와 그 개선판인 **TD3**다.

> 참고: [DDPG (Lillicrap et al., 2016)](https://arxiv.org/abs/1509.02971) / [TD3 (Fujimoto et al., 2018)](https://arxiv.org/abs/1802.09477)

## 연속 행동 공간이라는 문제

DQN의 핵심은 TD target을 만들 때 $\max_{a'} Q(s', a')$를 쓰는 것이었다. 그런데 이 $\max$는 action을 일일이 훑어볼 수 있는 **discrete** action에서만 가능하다. 로봇 관절 토크처럼 action이 연속적이면 후보가 무한히 많아 $\max$를 직접 구할 수 없다.

Policy gradient 계열(PPO 등)은 continuous action을 자연스럽게 다루지만, 매 update마다 현재 policy로 새 데이터를 모아야 하는 on-policy라 과거 경험을 재사용하지 못한다.

DDPG는 두 세계의 장점을 합친다. **DQN의 off-policy 학습(replay, target network)** 위에, $\max$ 연산을 **deterministic actor**로 대체하는 것이다. 즉, "그 state에서 Q를 최대로 만드는 action"을 매번 탐색하는 대신, 그 action을 직접 출력하는 함수 $\mu_\theta(s)$를 학습한다.

## Deterministic Policy Gradient

[[posts/foundations/introduction-to-rl/08-monte-carlo-policy-gradient|policy gradient]]에서 policy는 확률분포 $\pi_\theta(a \mid s)$였다. DDPG의 actor는 분포가 아니라 **하나의 action을 결정적으로 내놓는** 함수다.

$$
a = \mu_\theta(s)
$$

이런 deterministic policy의 gradient는 **deterministic policy gradient (DPG) theorem**으로 주어진다.

$$
\nabla_\theta J(\theta) = \mathbb{E}_{s \sim \rho^\beta} \left[ \nabla_\theta \mu_\theta(s) \, \nabla_a Q^\mu(s, a) \big|_{a = \mu_\theta(s)} \right]
$$

직관은 chain rule 하나로 끝난다. Critic $Q$는 "이 action이 얼마나 좋은가"의 지형을 알려주고, $\nabla_a Q$는 그 지형에서 **Q가 커지는 action 방향**을 가리킨다. Actor는 그 방향을 따라 자신의 출력 $\mu_\theta(s)$를 밀어 올린다. 즉 actor는 "critic이 더 좋다고 말하는 쪽으로 행동을 조금씩 옮기는" 역할이다.

> Stochastic policy gradient가 "좋았던 행동의 확률을 높였다"면, DPG는 "행동 값 자체를 더 좋은 쪽으로 직접 옮긴다". $\nabla_a Q$라는 gradient 정보를 활용할 수 있기 때문에, 고차원 continuous action에서 특히 효율적이다.

## DDPG

DDPG는 critic과 actor를 번갈아 학습하는 off-policy actor-critic이다.

- **Critic** $Q_w(s,a)$: DQN과 똑같이 TD로 학습한다. 단, 다음 action을 $\max$가 아니라 target actor로 정한다.

    $$
    y = r + \gamma Q_{w^-}(s', \mu_{\theta^-}(s'))
    $$

    $$
    \mathcal{L}(w) = \mathbb{E}_{(s,a,r,s') \sim \mathcal{D}} \left[ \left( y - Q_w(s,a) \right)^2 \right]
    $$

- **Actor** $\mu_\theta(s)$: 위의 DPG로 critic의 $Q$를 높이는 방향으로 update한다.

여기에 [[posts/foundations/introduction-to-rl/07-deep-q-learning|DQN]]에서 본 안정화 장치들이 그대로 들어간다.

- **Replay buffer** $\mathcal{D}$: off-policy이므로 과거 경험을 재사용한다.
- **Target network** $w^-, \theta^-$: 움직이는 과녁 문제를 막기 위해 target을 별도로 둔다. 단, DQN처럼 주기적으로 통째로 복사하는 대신 매 step 조금씩 따라가는 **soft update** (Polyak averaging)를 쓴다.

    $$
    w^- \leftarrow \tau w + (1-\tau) w^-, \quad \theta^- \leftarrow \tau \theta + (1-\tau) \theta^-, \quad \tau \ll 1
    $$

- **Exploration noise**: actor가 deterministic하므로 그대로 두면 탐험을 전혀 하지 않는다. 따라서 실제 행동에는 noise를 더한다: $a = \mu_\theta(s) + \mathcal{N}$. 이렇게 behavior policy(noise 포함)와 target policy(deterministic $\mu$)가 달라지므로 자연히 off-policy가 된다.

문제는 DDPG가 악명 높게 **불안정하고 hyperparameter에 민감**하다는 점이다. 특히 critic이 $Q$ 값을 실제보다 **과대평가**(overestimation)하는 경향이 있는데, actor는 그 부풀려진 Q를 보고 학습하므로 오차가 눈덩이처럼 커지기 쉽다.

## TD3

**TD3** (Twin Delayed DDPG)는 DDPG의 불안정성을 세 가지 trick으로 잡은 알고리즘이다. 각 trick이 어떤 문제를 겨냥하는지로 이해하면 좋다.

### 1. Clipped Double Q-learning — 과대평가 억제

$Q$ 과대평가는 $\max$(혹은 그에 준하는 greedy 선택)가 추정 오차 중 *운 좋게 큰 값*을 골라내는 데서 온다. TD3는 critic을 **두 개** $Q_{w_1}, Q_{w_2}$ 두고, target을 만들 때 **둘 중 작은 값**을 쓴다.

$$
y = r + \gamma \min_{i=1,2} Q_{w_i^-}(s', \tilde{a})
$$

작은 쪽을 택함으로써 과대평가를 보수적으로 눌러준다. [[posts/foundations/introduction-to-rl/07-deep-q-learning|DQN]]의 Double DQN과 같은 정신이다.

### 2. Delayed Policy Updates — 오차 누적 차단

Critic이 아직 엉성한데 actor를 매번 같이 update하면, actor가 잘못된 Q를 좇다가 둘이 함께 발산하기 쉽다. TD3는 **critic을 여러 번 update할 때마다 actor와 target network는 한 번만** update한다(보통 2:1). Critic이 어느 정도 안정된 뒤에 actor가 그걸 활용하도록 하는 것이다. 09에서 본 fixed target의 "과녁을 잠시 고정한다"는 발상과 통한다.

### 3. Target Policy Smoothing — 날카로운 봉우리 방지

Critic은 종종 특정 action에서 비현실적으로 뾰족한 $Q$ 봉우리를 만들고, deterministic actor는 그 틈을 파고들어 과대평가를 악용한다. 이를 막기 위해 target action에 작은 noise를 더해 **비슷한 action은 비슷한 값을 갖도록** 매끄럽게 만든다.

$$
\tilde{a} = \mu_{\theta^-}(s') + \text{clip}(\epsilon, -c, c), \quad \epsilon \sim \mathcal{N}(0, \sigma)
$$

이는 일종의 regularization으로, value 추정의 분산을 줄여준다.

## 정리

DDPG는 "DQN의 off-policy 골격 + deterministic policy gradient"로 continuous control을 off-policy로 푼 첫 단추이고, TD3는 과대평가·오차 누적·뾰족한 value라는 세 약점을 각각의 trick으로 보완해 훨씬 안정적으로 만든 개선판이다.

다만 DDPG·TD3의 actor는 deterministic이라 탐험을 외부 noise에 의존한다는 한계가 있다. 탐험 자체를 목적함수에 녹여 더 견고하게 학습하는 방법이 다음 글에서 볼 [[posts/foundations/introduction-to-rl/13-soft-actor-critic|Soft Actor-Critic]]이다.
