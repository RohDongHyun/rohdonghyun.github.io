---
title: 09. Actor-Critic Policy Gradient
date: 2025-09-22
tags:
  - Introduction to RL
---
* 참고: [Monte-Carlo Policy Gradient](https://velog.io/@rdh7014/Monte-Carlo-Policy-Gradient/)

## Actor-Critic Policy Gradient

Monte-Carlo policy gradient, 또는 REINFORCEMENT 알고리즘의 경우 variance가 무척 크다는 단점이 있다. 즉, 정밀한 estimation을 위해서는 아주 많은 computing이 필요하다. 이러한 이유로, action-value function $Q^{\pi_\theta}(s,a)$에 대한 더 나은 estimation을 찾기 위한 방법론들이 제안되었다.

그 중 하나로, **critic**을 이용하여 $Q^{\pi_\theta}(s,a)$를 예측하는 방법이 제안되었다. 이를 **actor-critic algorithm**이라고 한다.

$$
Q_w(s,a) \approx Q^{\pi_\theta}(s,a)
$$

### Actors and Critics
Actor-critic algorithm은 각각 parameter $w, \theta$를 갖는 두 종류의 함수 **critic**과 **actor**을 이용한다.

Critic은 parameter $w$를 갖는 action-value function $Q_w(s,a)$를 update하는 역할을 갖고, actor는 critic의 suggestion (계산 결과)를 기반으로 parameter $\theta$를 갖는 policy $\pi_\theta$를 update한다.

이름이 어렵게 느껴진다면 **배우(actor)와 평론가(critic)의 역할극**으로 이해하면 쉽다.

* **Actor (배우, $\theta$)**: 실제로 행동을 결정하는 policy $\pi_\theta$. "이 상황에서 무엇을 할까?"를 담당한다.
* **Critic (평론가, $w$)**: 배우가 한 행동/상태가 얼마나 좋았는지 점수를 매기는 가치함수($Q_w$ 또는 뒤에 나올 $V_v$).

둘은 다음 흐름으로 협업한다.

1. Actor가 행동을 한다.
2. Critic이 "그 행동(상태)의 가치는 이 정도"라고 평가한다.
3. Actor는 그 평가를 가중치 삼아 policy를 개선한다.
4. Critic도 실제로 받은 보상을 보고 자신의 평가를 더 정확하게 갱신한다.

> Critic은 현재 policy를 평가하는 역할, actor는 평가를 기반으로 현재 policy를 개선하는 역할이다. 따라서, 일종의 policy iteration으로 볼 수 있다.

핵심 아이디어는 이렇다. REINFORCE에서 variance가 컸던 이유는, 행동의 가치를 한 에피소드의 noisy한 return $G_t$로 통째로 추정했기 때문이다. Actor-critic은 이 역할을 critic이라는 **별도의 학습된 추정기**에게 맡긴다. Critic은 여러 경험에 걸쳐 학습하면서 매끄럽고 안정적인 가치 추정을 제공하므로, actor가 받는 학습 신호의 출렁임이 줄어든다. 단, 학습 중인 critic은 틀릴 수 있으므로 약간의 bias를 감수하는 대신 variance를 크게 낮추는 trade-off를 택한 것이다.

![](/images/23ff662e-2783-4ebb-a6bb-b36450ce9a39-image.png)

Actor-critic algorithm은 $Q^{\pi_\theta}(s,a)$를 $Q_w(s,a)$로 추정하기 때문에, 아래 식을 이용하여 policy gradient를 진행한다.

$$
\nabla_\theta J(\theta) \approx \ \mathbb{E}_{\pi_\theta} [\nabla_\theta \log \pi_\theta(s, a) Q_w(s,a)]
$$

$$
\Delta \theta_t = \alpha \nabla_\theta \log \pi_\theta(s_t, a_t) Q_w(s,a)
$$

### Action-Value Actor-Critic
Critic의 목표는 policy evaluation, 즉 $Q_w(s,a)$를 추정하는 것이다.

현실의 대부분의 문제는 state-action space가 무척 크기 때문에, $Q_w(s,a)$를 추정하기 위해서 neural network를 사용하지만, 여기서는 $Q_w(s,a)$가 linear function을 가지며 TD(0) 알고리즘을 통해 $w$를 업데이트한다고 가정하자.

이 경우, 간단한 actor-critic algorithm의 pseudocode는 다음과 같다.

* $Q_w(s,a) = \phi(s,a)^T w$
* Critic: TD(0) algorithm으로 update $w$
* Actor: policy gradient으로 update $\theta$

1. 초기화: $s, \theta$
2. Sampling: $a \sim \pi_\theta$
3. 하기 과정(1 ~ 6)을 반복
	1. reward $r$와 next state $s'$ 얻음
    2. next action $a' \sim \pi_\theta(s', a')$ 얻음
    3. $\delta = r + \gamma Q_w(s',a') - Q_w(s,a)$
    4. $\theta = \theta + \alpha \nabla_\theta \log \pi_\theta(s_t, a_t) Q_w(s,a)$
    5. $w = w + \beta\delta\phi(s,a)$
    6. $a \leftarrow a', s \leftarrow s'$

## Bias and Variance in Actor-Critic Algorithms
Actor-critic algorithm에서 가장 중요한 부분은 $Q_w(s,a)$를 어떤 함수로 선택할 것인지이다. $Q_w(s,a)$는 필연적으로 bias와 variance를 가지기 때문에, 적절하지 못한 함수를 선택하게되면 학습이 제대로 되지 않게된다.

### Bias in Actor-Critic Algorithms

다행이도, bias는 문제가 되지않도록 만드는 방법이 알려져있다.

> **Theorem: Compatible Function Approximation**
> 만약 하기 두 condition이 만족되는 경우, 
> 
> 1. Value function approximator is compatible to the policy
>
>$$
>\nabla_w Q_w(s,a) = \nabla_\theta \log \pi_\theta(s,a)
>$$
>
> 2. Value function parameters $w$ minimize the mean-squared error
>
>$$
>\varepsilon = \mathbb{E}_{\pi_\theta} [(Q^{\pi_\theta}(s,a) - Q_w(s,a))^2]
>$$
>
> policy gradient 값을 다음 식을 통해 얻을 수 있다.
>
>$$
>\nabla_\theta J(\theta) = \ \mathbb{E}_{\pi_\theta} [\nabla_\theta \log \pi_\theta(s, a) Q_w(s,a)]
>$$

### Reducing Variance Using a Baseline
Variance를 줄이는 방법으로 **baseline** $B(s)$을 이용하는 방법이 있다. Baseline이란 state의 함수로, 다음 식이 성립한다.

$$
\nabla_\theta J(\theta) = \ \mathbb{E}_{\pi_\theta} [\nabla_\theta \log \pi_\theta(s, a) Q^{\pi_\theta}(s,a)]
$$

$$
\Rightarrow \nabla_\theta J(\theta) = \ \mathbb{E}_{\pi_\theta} [\nabla_\theta \log \pi_\theta(s, a) (Q^{\pi_\theta}(s,a)-B(s))]
$$

직관은 이렇다. 어떤 state에서 모든 행동의 $Q$ 값이 +100 근처라면, return이 +100이라는 사실 자체는 그 행동이 특별히 좋았다는 정보를 거의 주지 못한다. 정작 중요한 건 **그 state의 평균적인 수준보다 얼마나 나았는가**이다. Baseline $B(s)$로 이 기준선을 빼주면, "기준 대비 차이"만 학습 신호로 남아 불필요하게 큰 절댓값에서 오는 출렁임이 사라진다.

이렇게 baseline을 빼도 gradient의 expectation은 그대로 유지된다. $B(s)$가 행동 $a$에 의존하지 않는 state만의 함수이기 때문이다.

$$
\begin{aligned}
\mathbb{E}_{\pi_\theta}\left[\nabla_\theta \log \pi_\theta(s, a) B(s)\right] &= \sum_s d^{\pi_\theta}(s) \sum_a \nabla_\theta \pi_\theta(s, a) B(s) \\
&= \sum_s d^{\pi_\theta}(s) B(s) \nabla_\theta \sum_a \pi_\theta(s, a) \\
&= \sum_s d^{\pi_\theta}(s) B(s) \nabla_\theta 1 = 0
\end{aligned}
$$

### Advantage Function

Baseline function으로 state value function $V^{\pi_\theta}(s)$를 사용하면 좋은 성능을 보여준다. 이 때, **advantage function** $A^{\pi_\theta}(s,a)$을 다음과 같이 정의할 수 있다.

$$
A^{\pi_\theta}(s,a) = Q^{\pi_\theta}(s,a) - V^{\pi_\theta}(s)
$$

여기서 baseline으로 쓴 $V^{\pi_\theta}(s)$는 정확히 "그 state에서 현재 policy를 따랐을 때의 평균 가치"이다. 따라서 advantage $A^{\pi_\theta}(s,a)$는 **이 행동이 평균적인 행동보다 얼마나 더 나은가**를 직접 측정한다. $A>0$이면 평균보다 좋은 행동이니 확률을 올리고, $A<0$이면 평균보다 못하니 내린다 — policy gradient가 학습하고 싶은 바로 그 정보다.

Advantage function을 이용하면 policy gradient를 다음과 같이 쓸 수 있다.

$$
\nabla_\theta J(\theta) = \ \mathbb{E}_{\pi_\theta} [\nabla_\theta \log \pi_\theta(s, a) A^{\pi_\theta}(s,a)]
$$

Advantage function은 variance reduction 측면에서 큰 장점을 가지고 있어 일반적으로  critic은 advantage function을 추정하게 된다. 

Advantage function을 추정하기 위해서는 TD error $\delta^{\pi_\theta}$를 활용한다.

$$
\delta^{\pi_\theta} = r + \gamma V^{\pi_\theta}(s') - V^{\pi_\theta}(s)
$$

그런데 advantage를 구하려면 $Q$와 $V$를 둘 다 추정해야 해서 번거롭다. 다행히 TD error 하나면 충분하다. TD error는 advantage function의 unbiased estimate이기 때문이다.

$$
\begin{aligned}
\mathbb{E}_{\pi_\theta}\left[\delta^{\pi_\theta} \mid s, a\right] &= \mathbb{E}_{\pi_\theta}\left[r + \gamma V^{\pi_\theta}(s') \mid s, a\right] - V^{\pi_\theta}(s) \\
&= Q^{\pi_\theta}(s, a) - V^{\pi_\theta}(s) = A^{\pi_\theta}(s, a)
\end{aligned}
$$

따라서, TD error를 이용하면 policy gradient를 다음과 같이 쓸 수 있다.

$$
\nabla_\theta J(\theta) = \ \mathbb{E}_{\pi_\theta} [\nabla_\theta \log \pi_\theta(s, a) \; \delta^{\pi_\theta}]
$$

하지만, true value function 값을 미리 알 수는 없기 때문에, 다음과 같이 TD error에 대한 approximation을 사용한다.

$$
\delta_v = r + \gamma V_v(s') - V_v(s)
$$

> TD error를 추정하기 위해서는 value function에 대한 추정이 필요하다. 따라서, critic은 $Q^{\pi_\theta}(s,a)$와 $V^{\pi_\theta}(s)$를 동시에 추정한다.
>
>$$
>Q_w(s,a) \approx Q^{\pi_\theta}(s,a), \quad V_v(s) \approx V^{\pi_\theta}(s)
>$$
>
>$$
>A(s,a) = Q_w(s,a) - V_v(s)
>$$

### Critics at Different Time-Scale
Critic은 value function $V_v(s)$에 대한 추정을 다음과 같이 다양하게 진행할 수 있다.

* MC: target은 return $G_t$가 된다.
	
    $$
    \Delta v_t = \alpha(G_t - V_v(s))\phi(s)
    $$

* TD(0): target은 TD target $r + \gamma V(s')$가 된다.
	
    $$
    \Delta v_t = \alpha(r + \gamma V(s') - V_v(s))\phi(s)
    $$
    
* TD($\lambda$): target은 TD target $G_t^\lambda$가 된다.
	
    $$
    \Delta v_t = \alpha(G_t^\lambda - V_v(s))\phi(s)
    $$


### Actors at Different Time-Scale
Actor 역시 policy gradient에 대한 추정을 다양하게 진행할 수 있다.

$$
\nabla_\theta J(\theta) = \mathbb{E}_{\pi_\theta} [\nabla_\theta \log \pi_\theta(s, a) A^{\pi_\theta}(s,a)]
$$

* MC policy gradient: return $G_t$ 사용
	
    $$
    \Delta \theta_t = \alpha(G_t - V_v(s_t))\nabla_\theta \log \pi_\theta(s_t, a_t)
    $$

* Actor-critic policy gradient: one-step TD error 사용
	
    $$
    \Delta \theta_t = \alpha(r + \gamma V(s_{t+1}) - V_v(s_t))\nabla_\theta \log \pi_\theta(s_t, a_t)
    $$
    
* TD($\lambda$): TD target $G_t^\lambda$ 사용
	
    $$
    \Delta \theta_t = \alpha(G_t^\lambda - V_v(s_t))\nabla_\theta \log \pi_\theta(s_t, a_t)
    $$

## A3C: Asynchronous Advantage Actor-Critic

지금까지의 actor-critic을 실제 deep RL 알고리즘으로 구현한 대표적인 예가 **A3C (Asynchronous Advantage Actor-Critic)** 이다. 이름을 그대로 뜯어보면 이 글의 내용 위에 서 있음을 알 수 있다.

* **Advantage Actor-Critic**: 학습 신호로 advantage $A(s,a)$(실제로는 TD error $\delta$ 기반)를 사용하는, 앞 절에서 본 바로 그 구조다. 즉 A3C의 알맹이는 이 글에서 이미 다룬 advantage actor-critic이다.
* **Asynchronous**: A3C가 새로 더한 부분이다. 동일한 네트워크를 복사한 여러 **worker**를 서로 다른 환경에서 **병렬로 동시에** 굴리면서, 각자가 계산한 gradient를 공유 네트워크에 비동기적으로 반영한다.

비동기 병렬화가 중요한 이유는 **샘플 간 상관(correlation)** 때문이다. 한 에이전트가 한 환경에서 연속으로 수집한 데이터는 시간적으로 강하게 상관되어 있어 학습을 불안정하게 만든다. DQN은 이 문제를 replay buffer로 과거 경험을 섞어 풀었지만, A3C는 **여러 환경에서 동시에 수집한 서로 다른 경험**을 모아 상관을 깨뜨린다. 그 결과 replay buffer 없이도 안정적이고 빠른 on-policy 학습이 가능하다.

> 비동기(asynchronous)를 빼고 여러 worker의 결과를 한 번에 모아 동기적으로 업데이트하는 단순화 버전을 **A2C (Advantage Actor-Critic)** 라고 한다. 구현이 간단하고 GPU 활용에 유리해 실무에서 자주 쓰이며, 둘 다 advantage actor-critic을 뼈대로 한다.

## Summary of Policy Gradient

Policy gradient는 다음과 같이 다양한 형태를 가질 수 있다.

$$
\begin{aligned}
\nabla_\theta J(\theta) &= \mathbb{E}_{\pi_\theta}\left[\nabla_\theta \log \pi_\theta(s, a) \, G_t\right] \quad &\text{REINFORCE} \\
&= \mathbb{E}_{\pi_\theta}\left[\nabla_\theta \log \pi_\theta(s, a) \, Q_w(s, a)\right] \quad &\text{Q Actor-Critic} \\
&= \mathbb{E}_{\pi_\theta}\left[\nabla_\theta \log \pi_\theta(s, a) \, A(s, a)\right] \quad &\text{Advantage Actor-Critic} \\
&= \mathbb{E}_{\pi_\theta}\left[\nabla_\theta \log \pi_\theta(s, a) \, \delta\right] \quad &\text{TD Actor-Critic}
\end{aligned}
$$

즉, policy gradient 알고리즘은 어떤 방법으로 policy gradient에 대한 estimation을 진행하느냐에 따라 다양한 방법이 존재한다.

> 하지만, policy gradient는 학습이 불안정하고, local optimum에 빠지기 쉬우며, sample을 효율적으로 사용하기 어렵다는 단점이 있어, 실질적으로 사용되기 어려웠다. 따라서, 이를 보완한 알고리즘들(TRPO, PPO 등)이 이후 다양하게 고안되었다.