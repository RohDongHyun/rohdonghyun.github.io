---
title: 13. Soft Actor-Critic
date: 2026-06-23
tags:
  - Reinforcement Learning
---
[[posts/foundations/introduction-to-rl/12-ddpg-and-td3|DDPG·TD3]]는 continuous action을 off-policy로 잘 풀었지만, actor가 deterministic이라 탐험을 외부 noise에 의존하고 hyperparameter에 민감했다. **Soft Actor-Critic** (SAC)은 탐험을 외부에서 주입하는 대신 **목적함수 안에 entropy를 직접 넣어** 더 견고하게 학습하는 off-policy actor-critic이다. 오늘날 continuous control의 사실상 표준으로 널리 쓰인다.

> 참고: [SAC (Haarnoja et al., 2018)](https://arxiv.org/abs/1801.01290)

## Maximum Entropy RL

기존 RL의 목적은 누적 보상의 기댓값을 최대화하는 것이었다. Maximum entropy RL은 여기에 **policy의 entropy** 항을 더한다.

$$
J(\pi) = \sum_t \mathbb{E}_{(s_t, a_t) \sim \rho_\pi} \left[ r(s_t, a_t) + \alpha \mathcal{H}(\pi(\cdot \mid s_t)) \right]
$$

여기서 $\mathcal{H}(\pi(\cdot \mid s)) = \mathbb{E}_{a \sim \pi}[-\log \pi(a \mid s)]$는 policy의 entropy, 즉 "행동이 얼마나 무작위한가"를 잰다. 계수 $\alpha$는 **temperature**로, 보상과 entropy 사이의 비중을 조절한다.

이 한 항이 주는 효과를 짚어보자.

- **탐험이 목적이 된다**: 보상만 최대화하면 policy는 가장 좋아 보이는 하나의 행동으로 빠르게 수렴(collapse)해 다른 가능성을 못 본다. Entropy 항은 "되도록 다양한 행동을 유지하라"고 압력을 넣어, 탐험을 학습 목표 자체에 내장한다. DDPG처럼 noise를 손으로 끼얹을 필요가 없다.
- **여러 좋은 해를 함께 잡는다**: 비슷하게 좋은 행동이 여럿이면, 하나만 고르지 않고 확률을 고루 남긴다. 그 결과 환경 변화나 교란에 더 **robust**한 policy가 된다.

> 직관적으로, maximum entropy RL은 "**가능한 한 무작위로 행동하되, 보상은 최대한 챙겨라**" 라고 요구한다. $\alpha$가 크면 탐험을 중시하고, $\alpha \to 0$이면 기존의 보상 최대화 RL로 돌아간다.

## Soft Value Functions

Entropy 항이 들어가면 value function의 정의도 그에 맞게 바뀐다. State value는 Q에 entropy 보너스를 더한 형태가 된다.

$$
V(s) = \mathbb{E}_{a \sim \pi} \left[ Q(s, a) - \alpha \log \pi(a \mid s) \right]
$$

이를 이용한 **soft Bellman target**은 다음과 같다. 즉 다음 state의 value에 entropy 항이 함께 들어간다.

$$
y = r + \gamma \, \mathbb{E}_{a' \sim \pi} \left[ \min_{i=1,2} Q_{w_i^-}(s', a') - \alpha \log \pi(a' \mid s') \right]
$$

여기서 critic이 두 개($\min$)인 것은 [[posts/foundations/introduction-to-rl/12-ddpg-and-td3|TD3]]에서 본 clipped double-Q와 같은 과대평가 억제 장치다. SAC도 같은 trick을 채택한다.

## Policy Update: Boltzmann 분포로 끌어당기기

SAC의 actor는 deterministic이 아니라 **stochastic policy**다. Policy는 매 update에서 "Q 값이 높을수록 확률이 높은" 이상적인 분포, 즉 $\exp(Q(s,\cdot)/\alpha)$에 비례하는 Boltzmann 분포에 가까워지도록 학습된다. 실제로는 다음을 최소화한다.

$$
J_\pi(\theta) = \mathbb{E}_{s \sim \mathcal{D}} \left[ \mathbb{E}_{a \sim \pi_\theta} \left[ \alpha \log \pi_\theta(a \mid s) - \min_{i=1,2} Q_{w_i}(s, a) \right] \right]
$$

두 항의 줄다리기로 읽으면 된다. $-Q$ 항은 Q가 높은 행동의 확률을 키우려 하고(exploitation), $\alpha \log \pi$ 항은 확률이 한 곳에 쏠리지 않게 막는다(entropy 유지, exploration).

이때 $a \sim \pi_\theta$에 대한 gradient를 흘려보내기 위해 **reparameterization trick**을 쓴다. 행동을 $a = f_\theta(\epsilon; s), \; \epsilon \sim \mathcal{N}(0, I)$처럼 noise의 결정적 함수로 표현하면, 확률적 샘플링을 통과해 $\theta$로 backpropagation할 수 있다.

## Automatic Temperature Tuning

$\alpha$는 성능을 크게 좌우하는데, 문제마다·학습 시점마다 적절한 값이 다르다. SAC의 후속 연구는 $\alpha$를 손으로 고정하는 대신, **목표 entropy** $\bar{\mathcal{H}}$를 유지하도록 $\alpha$를 자동으로 조정한다.

$$
J(\alpha) = \mathbb{E}_{a \sim \pi} \left[ -\alpha \left( \log \pi(a \mid s) + \bar{\mathcal{H}} \right) \right]
$$

policy의 entropy가 목표보다 낮아지면 $\alpha$를 키워 탐험을 늘리고, 충분히 높으면 $\alpha$를 줄여 보상에 집중하게 된다. 덕분에 SAC는 TD3에 비해 hyperparameter 튜닝 부담이 작다.

## TD3 vs. SAC

두 알고리즘은 모두 off-policy actor-critic이고 twin critic($\min$)으로 과대평가를 억제한다는 공통점이 있지만, 탐험을 다루는 철학이 다르다.

| | TD3 | SAC |
|---|---|---|
| policy | deterministic $\mu_\theta(s)$ | stochastic $\pi_\theta(a \mid s)$ |
| 탐험 | 외부 noise 주입 | entropy 항으로 목적함수에 내장 |
| 과대평가 억제 | clipped double-Q | clipped double-Q |
| 핵심 손잡이 | noise·delay 등 | temperature $\alpha$ (자동 조정 가능) |
| 성향 | hyperparameter 민감 | 상대적으로 robust |

## 정리

SAC는 maximum entropy 관점으로 RL의 목적함수 자체를 다시 써서, 탐험을 외부 trick이 아닌 학습 목표로 끌어들인 off-policy actor-critic이다. Stochastic policy + entropy 보너스 + twin critic + 자동 temperature 조정의 조합으로, continuous control에서 안정성과 sample 효율을 모두 갖춘 강력한 기본 알고리즘으로 자리 잡았다.

이로써 value-based(DQN)부터 policy gradient(REINFORCE·Actor-Critic·PPO), continuous off-policy(DDPG·TD3·SAC)까지 정통 deep RL의 큰 줄기를 훑었다.
