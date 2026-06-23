---
title: 08. Monte-Carlo Policy Gradient
date: 2025-09-22
tags:
  - Introduction to RL
---
* 참고: [Deep Q-learning](https://velog.io/@rdh7014/Deep-Q-Learning/)

## Policy-based Reinforcement Learning

Deep Q-learning을 생각해보자. 여기서는 value와 action-value 값을 어떤 parameter $\theta$를 갖는 함수로 모델링하였다.

$$
v_\theta(s) \approx v^\pi(s), \quad Q_\theta(s,a) \approx Q^\pi(s,a)
$$

즉, Deep Q-learning은 value function에 대한 추정을 통해 좋은 policy를 생성하는 것이 목적이다. 이러한 학습 방법을 **value-based RL**이라고 한다.

**Policy-based RL**은 value function을 따로 정의하지 않고, policy를 parameterize하여 해당 parameter를 직접적으로 최적화하는 방식을 말한다.

$$
\pi_\theta(s,a) = \mathbb{P}[a \mid s, \theta]
$$

Policy-based RL은 일반적으로 value-based에 비해 convergence가 빠르고, stochastic한 policy를 만들어낼 수 있다는 장점이 있다. 특히, action이 단순하지 않고 high-dimensional하거나 continuous한 경우에 효과적이다. 하지만, 일반적으로 local optimum에 도달할 확률이 높고, 또한 policy에 대한 evaluation이 쉽지 않다는 특징도 있다.

## Policy Gradient in One-Step MDPs
Parameterized policy $\pi_\theta(s,a)$의 reward function은 다음과 같다.

$$
J(\theta) = \mathbb{E}_{\pi_\theta}[r]
$$

Policy-based RL은 $J(\theta)$를 maximize하는 best $\theta$를 찾는 것이 목적이기에, gradient ascent와 같은 알고리즘을 사용하기 위해서는 $J(\theta)$에 대한 gradient $\nabla_\theta J(\theta)$ 계산이 필요하다. 

### Example: One-Step MDPs
$\nabla_\theta J(\theta)$이 어떤 형태의 값을 갖는지 알아보기 위해 우선 간단한 one-step MDP를 고려해보자. 즉, 하나의 time-step이 지나면 reward $r$과 함께 episode가 종료된다.

이 경우, reward function $J(\theta)$는 다음과 같다.

$$
\begin{aligned}
J(\theta) &= \mathbb{E}_{\pi_\theta}[r]\\
&= \sum_{s} d^{\pi_\theta}(s) V^{\pi_\theta}(s) = \sum_{s} d^{\pi_\theta}(s) \sum_{a} \pi_\theta(s, a) R^{a}_{s}
\end{aligned}
$$

여기서 $d^{\pi_\theta}(s)$는 $\pi_\theta$를 따랐을 때의 Markov chain의 stationary distribution을 의미한다.

위 식을 이용하면, $\nabla_\theta J(\theta)$는 다음과 같다.

$$
\nabla_\theta J(\theta) = \sum_s d^{\pi_\theta}(s) \sum_a \nabla_\theta \pi_\theta(s, a) R^{a}_{s}
$$

이 때, $\nabla_\theta \pi_\theta(s, a)$는 **likelihood ratio**로 표현할 수 있다.

$$
\nabla_\theta \pi_\theta(s, a) = \pi_\theta(s, a)\frac{\nabla_\theta \pi_\theta(s, a)}{\pi_\theta(s, a)} = \pi_\theta(s, a) \nabla_\theta \log \pi_\theta(s, a)
$$

위 식를 이용해서 $\nabla_\theta J(\theta)$를 다시 쓰면,

$$
\begin{aligned}
\nabla_\theta J(\theta) &= \sum_s d^{\pi_\theta}(s) \sum_a \nabla_\theta \pi_\theta(s, a) R^{a}_{s}\\
&= \mathbb{E}_{\pi_\theta} [\nabla_\theta \log \pi_\theta(s, a) \; r ]
\end{aligned}
$$

이 때, $\nabla_\theta \log \pi_\theta(s, a)$를 **score function**이라고 부른다.

> 즉, sample을 통해 직접적으로 gradient 계산이 가능하다.

이 변형이 왜 중요한지 짚어보자. 원래 $\nabla_\theta J$에는 우리가 직접 계산하기 어려운 환경 항(상태 분포 $d^{\pi_\theta}$ 등)이 얽혀 있다. 그런데 likelihood ratio trick을 거치면 gradient가 $\mathbb{E}_{\pi_\theta}[\cdots]$ 형태의 **기댓값**으로 바뀌고, 기댓값은 곧 sample 평균으로 근사할 수 있다. 즉 환경의 dynamics를 전혀 몰라도, agent가 직접 굴려 모은 trajectory만으로 gradient를 추정할 수 있게 된다.

직관적으로 update 식 $\nabla_\theta \log \pi_\theta(s,a)\, r$이 하는 일은 단순하다. $\nabla_\theta \log \pi_\theta(s,a)$는 "이 행동의 확률을 높이는 방향"을 가리키고, 거기에 reward $r$이 가중치로 곱해진다. 따라서 **좋은 결과(큰 $r$)를 낸 행동은 더 자주 하도록, 나쁜 결과를 낸 행동은 덜 하도록** policy가 조정된다. 보상으로 행동의 확률을 직접 밀고 당기는 셈이다.

### Softmax Policy: Discrete Actions
Action space가 discrete한 경우에 많이 사용되는 policy로는 **softmax policy**가 있다. Softmax policy의 경우, 각 action에 대해서 state-action feature vector $\phi(s,a)$를 이용하여 다음과 같이 확률을 부여한다.

$$
\pi_\theta(s, a) = \frac{\exp(\phi(s,a)^T \theta)}{\sum_b \exp(\phi(s,b)^T \theta)}
$$

> Softmax policy에 nonlinearity를 부여하기 위해 $\phi(s,a)$를 neural net으로 변경할 수도 있다.

Softmax policy의 score function은 다음과 같다.

$$
\nabla_\theta \log \pi_\theta(s, a) = \phi(s,a) - \mathbb{E}_{\pi_\theta}[\phi(s, \cdot)]
$$

### Gaussian Policy: Continuous Actions
반대로, action space가 continuous한 경우 주로 **Gaussian policy**가 사용된다.

$$
a \sim N(\mu(s), \sigma^2)
$$

여기서 mean은 state feature로써 표현된다: $\mu(s) = \phi(s)^T \theta$. Variance는 일반적으로 constant로 고정시키지만, parameterize할 수도 있다.

> Gaussian policy 역시 $\phi(s)$를 neural net으로 변경하여 nonlinearity를 부여할 수 있다.

Gaussian policy의 score function은 다음과 같다.

$$
\nabla_\theta \log \pi_\theta(s, a) = \frac{(a-\mu(s))\phi(s))}{\sigma^2}
$$

## Monte-Carlo Policy Gradient
### Policy Gradient Theorem
앞서 살펴본 one-step MDP에 적용한 policy gradient 접근 방법을 multi-step MDPs로 일반화할 수 있다. 다음 Theorem은 One-step MDP에서의 reward $r$을 long-term value $Q^{\pi_\theta}(s,a)$로 대체하는 것으로 유도할 수 있다.

> **Theorem: Policy Gradient Theorem**
> For any differentiable policy $\pi_\theta$ and any policy objective function, the policy gradient is
>
>$$
\nabla_\theta J(\theta) = \mathbb{E}_{\pi_\theta} [\nabla_\theta \log \pi_\theta(s, a) \; Q^{\pi_\theta}(s,a) ]
>$$

### REINFORCEMENT Algorithm
Policy gradient theorem에 기반하여 Monte-Carlo estimation을 이용하면 policy gradient RL이 가능해진다. 이를 **REINFORCEMENT** 알고리즘이라고 한다.

REINFORCEMENT 알고리즘은 $Q^{\pi_\theta}(s,a)$에 대한 unbiased sample로 return $G_t$를 사용한다. 즉, true action-value를 모르므로 그 자리에 "그 행동 이후 에피소드 끝까지 실제로 받은 누적 보상" $G_t$를 그대로 꽂아 넣는다.

$$
\Delta \theta_t = \alpha \nabla_\theta \log \pi_\theta(s_t, a_t) \;  G_t
$$

이것이 앞서 말한 밀고 당기기의 구체적 형태다. 에피소드가 끝난 뒤, 좋은 return을 가져다준 $(s_t, a_t)$들의 확률은 올리고 나쁜 것들은 내린다.

> 하지만 $G_t$는 **하나의 에피소드 전체에서 나온 단일 sample**이라는 점이 약점이다. 같은 state에서 같은 행동을 해도, 이후 운에 따라 return이 크게 출렁이므로 $G_t$의 variance가 매우 크다. 그 결과 gradient 추정도 noisy해져 학습이 느리고 불안정하다. 이 높은 variance를 어떻게 줄일 것인가가 다음 글(Actor-Critic)의 출발점이다.

REINFORCEMENT 알고리즘의 pseudocode는 다음과 같다.

1. $\theta$를 임의의 값으로 초기화한다.

2. 각 episode $$\{ s_1, a_1, r_2, \cdots, s_{T-1}, a_{T-1}, r_T \} \sim \pi_\theta$$에 대해, $t=1 \cdots T-1$ 동안 아래 식을 이용해서 update 진행.

    $$
    \theta \leftarrow \theta + \alpha \nabla_\theta \log \pi_\theta(s_t, a_t) G_t
    $$

3. 2번을 반복적으로 수행 후, 최종 $\theta$ return.