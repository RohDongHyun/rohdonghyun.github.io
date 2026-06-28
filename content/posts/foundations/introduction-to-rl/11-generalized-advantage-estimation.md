---
title: 11. Generalized Advantage Estimation
date: 2026-06-23
tags:
  - Reinforcement Learning
---
[[posts/foundations/introduction-to-rl/09-actor-critic-policy-gradient|Actor-Critic]]과 [[posts/foundations/introduction-to-rl/10-proximal-policy-optimization|PPO]]까지 오면서, policy gradient를 계산할 때 **advantage function** $A(s,a)$를 쓰면 variance가 크게 줄어든다는 것을 보았다. 그런데 정작 advantage를 *어떻게 추정하느냐*는 깊게 다루지 않고 넘어갔다. 사실 이 추정 방식이 학습의 안정성과 속도를 좌우하며, TRPO·PPO를 비롯한 현대 policy gradient 알고리즘이 거의 예외 없이 사용하는 표준 기법이 바로 **generalized advantage estimation** (GAE)이다.

GAE는 09번 글에서 critic의 target으로 잠깐 등장했던 MC, TD(0), TD($\lambda$)를 advantage 추정이라는 하나의 관점에서 **bias-variance trade-off**로 통합한다.

> 참고: [High-Dimensional Continuous Control Using Generalized Advantage Estimation (Schulman et al., 2016)](https://arxiv.org/abs/1506.02438)

## Advantage 추정의 bias-variance 딜레마

Policy gradient는 다음과 같은 일반형을 갖는다.

$$
\nabla_\theta J(\theta) = \mathbb{E}\left[ \sum_t \Psi_t \, \nabla_\theta \log \pi_\theta(a_t \mid s_t) \right]
$$

여기서 가중치 $\Psi_t$ 자리에는 return $G_t$, action-value $Q(s_t,a_t)$, advantage $A(s_t,a_t)$ 등 여러 값이 들어갈 수 있다. 이 중 advantage가 variance를 가장 낮춰준다는 것은 앞선 글에서 보았다. 문제는 true advantage를 모른다는 점이고, 따라서 우리는 그것을 *추정*해야 한다.

### TD residual: advantage의 한 조각

학습된 value function $V(s)$가 있다고 하자. 한 step의 **TD residual**을 다음과 같이 정의한다.

$$
\delta_t^V = r_t + \gamma V(s_{t+1}) - V(s_t)
$$

09번 글에서 보았듯, 만약 $V$가 정확하다면($V = V^\pi$) $\delta_t^V$는 advantage의 **unbiased estimate**이다.

$$
\mathbb{E}\left[\delta_t^V \mid s_t, a_t\right] = Q^\pi(s_t,a_t) - V^\pi(s_t) = A^\pi(s_t,a_t)
$$

즉 $\delta_t^V$는 "한 step만 실제로 굴려보고 나머지는 $V$의 추정으로 때운" advantage 추정치다.

### $k$-step 추정량: 어디까지 실제로 굴려볼 것인가

$\delta_t$ 하나만 쓰지 않고, 여러 step을 실제 보상으로 채운 뒤 나머지를 $V$로 메울 수도 있다. $k$개의 TD residual을 더한 **$k$-step advantage estimator**는 다음과 같이 정리된다.

$$
\hat{A}_t^{(k)} = \sum_{l=0}^{k-1} \gamma^l \delta_{t+l}^V = -V(s_t) + r_t + \gamma r_{t+1} + \cdots + \gamma^{k-1} r_{t+k-1} + \gamma^k V(s_{t+k})
$$

이 식에서 $k$를 키울수록 실제 보상 $r$을 더 많이 쓰고 $V$에 덜 의존한다. 양 극단을 보자.

- **$k=1$**: $\hat{A}_t^{(1)} = \delta_t = r_t + \gamma V(s_{t+1}) - V(s_t)$
  - 한 step만 실제로 보고 곧장 $V$에 의존한다. $V$가 틀리면 그 오차가 그대로 들어오므로 **bias가 크지만**, 무작위성이 한 step 분량뿐이라 **variance는 작다**.

- **$k=\infty$**: $\hat{A}_t^{(\infty)} = -V(s_t) + \sum_{l=0}^{\infty} \gamma^l r_{t+l}$
  - 에피소드 끝까지 실제 보상을 모두 쓴 Monte-Carlo 추정이다. $V(s_t)$ 하나만 baseline으로 빼므로 **bias는 거의 없지만**, 먼 미래의 운까지 전부 누적되어 **variance가 매우 크다**.

> 결국 $k$는 "미래를 얼마나 실제로 굴려보고, 어디서부터 value 추정에 맡길 것인가"를 정하는 손잡이다. $k$가 작으면 추정기(critic)를 믿는 쪽, 크면 실제 sample을 믿는 쪽이다. 어느 한쪽 $k$를 고르는 대신, **모든 $k$를 부드럽게 섞자**는 것이 GAE의 발상이다.

## Generalized Advantage Estimation

GAE는 위의 $k$-step 추정량들을 $\lambda \in [0,1]$로 **지수 가중 평균**한 것이다.

$$
\hat{A}_t^{\text{GAE}(\gamma,\lambda)} = (1-\lambda)\left( \hat{A}_t^{(1)} + \lambda \hat{A}_t^{(2)} + \lambda^2 \hat{A}_t^{(3)} + \cdots \right)
$$

이 합을 정리하면, 놀랍도록 간단한 형태로 떨어진다.

$$
\hat{A}_t^{\text{GAE}(\gamma,\lambda)} = \sum_{l=0}^{\infty} (\gamma\lambda)^l \, \delta_{t+l}^V
$$

즉 GAE는 **TD residual들을 $\gamma\lambda$로 할인하며 더한 값**이다. 09번 글에서 critic의 target으로 등장했던 TD($\lambda$)가, 여기서는 advantage 추정의 형태로 다시 나타난 것이다.

### $\lambda$가 양 극단을 잇는다

$\lambda$는 앞서 본 bias-variance 손잡이를 연속적으로 조절한다.

- **$\lambda = 0$**: $\hat{A}_t = \delta_t = r_t + \gamma V(s_{t+1}) - V(s_t)$
  - 한 step TD. **low variance, high bias** ($V$에 강하게 의존).

- **$\lambda = 1$**: $\hat{A}_t = \sum_{l=0}^{\infty} \gamma^l \delta_{t+l} = -V(s_t) + \sum_{l=0}^{\infty} \gamma^l r_{t+l}$
  - Monte-Carlo advantage. **high variance, low bias**.

- **$0 < \lambda < 1$**: 두 극단을 부드럽게 보간한다. 실제로는 $\lambda = 0.95$ 부근이 자주 쓰인다.

> 핵심 직관: $\lambda$는 "value function 추정을 얼마나 신뢰할 것인가"를 조절한다. $V$가 정확하다고 믿으면 $\lambda$를 낮춰 한 step만 보고 곧장 $V$에 맡기고($\delta$ 한 항), $V$를 못 믿으면 $\lambda$를 높여 실제 보상을 더 길게 누적한다. 학습 초반에는 $V$가 엉성하니 $\lambda$를 다소 높게, $V$가 정교해질수록 낮춰도 좋다.

### $\gamma$와 $\lambda$는 다른 일을 한다

식에서 $\gamma$와 $\lambda$가 항상 $\gamma\lambda$로 함께 곱해져 나오지만, 둘의 역할은 분명히 다르다.

- **$\gamma$ (discount)**: 미래 보상의 가치를 깎는 비율로, **추정하려는 목적함수 자체**를 정의한다. $\gamma$를 낮추면 먼 미래를 무시하는 근시안적 value를 추정하게 되어 bias가 생긴다.
- **$\lambda$ (GAE parameter)**: 목적함수는 그대로 둔 채, **그 advantage를 추정하는 방식**에서 bias-variance만 조절한다.

즉 $\gamma$는 "무엇을 풀 것인가", $\lambda$는 "어떻게 추정할 것인가"를 정한다.

### 구현: 뒤에서부터 한 번에

GAE의 무한 합은 실제로는 trajectory 끝에서부터 거꾸로 내려오며 한 줄로 계산된다.

$$
\hat{A}_t = \delta_t + \gamma\lambda \, \hat{A}_{t+1}
$$

한 번의 backward pass로 전체 trajectory의 advantage를 구할 수 있어 계산이 매우 가볍다. 이렇게 얻은 $\hat{A}_t$는 그대로 policy gradient의 가중치로, $\hat{A}_t + V(s_t)$는 value function의 회귀 target으로 쓰인다.

## PPO와의 연결, 그리고 정리

이제 [[posts/foundations/introduction-to-rl/10-proximal-policy-optimization|PPO]]의 그림이 완성된다. PPO의 clipped objective에 들어가는 advantage $A^{\pi_{\theta_{\text{old}}}}(s,a)$는 추상적인 기호가 아니라, 바로 이 GAE로 계산된 $\hat{A}_t^{\text{GAE}(\gamma,\lambda)}$다. 실제 PPO 구현은 매 iteration마다

1. 현재 policy로 trajectory를 모으고,
2. critic $V$로 각 step의 $\delta_t$를 구한 뒤,
3. backward recursion으로 GAE advantage $\hat{A}_t$를 계산하고,
4. 그 $\hat{A}_t$로 clipped policy update와 value regression을 함께 수행한다.

정리하면, GAE는 09번 글에서 본 MC/TD/TD($\lambda$)를 advantage 추정이라는 단일 관점으로 묶어, $\lambda$ 하나로 bias와 variance를 매끄럽게 조절하게 해주는 도구다. 추가 계산 비용이 거의 없으면서도 학습 안정성을 크게 끌어올리기 때문에, 오늘날 대부분의 on-policy actor-critic 알고리즘이 기본값으로 채택하고 있다.
