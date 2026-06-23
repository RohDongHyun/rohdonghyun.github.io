---
title: 06. Model-free Control
date: 2025-09-22
tags:
  - Introduction to RL
private: false
---
- 참고: [Model-free Prediction](https://velog.io/@rdh7014/Model-free-Prediction/)

**Model-free control**이란 환경이 주어져 있지 않거나, 또는 환경을 알 수 있으나 다루기에 너무 큰 상황(예. Robot walking 등)에서 optimal policy를 찾기 위한 방법을 말한다.

## Model-free Policy Improvement

Model-free policy improvement 역시 현재 상태에서 얻어낸 value function을 maximize하는 action을 선택하는 것을 통해 얻어낼 수 있다. 이렇게 얻은 **greedy policy $\pi'$** 은 다음과 같다.

$$
\begin{aligned}
\pi'(s) &= \arg\max_{a \in A} \left( R^a_s + \gamma \sum_{s' \in S} P_{ss'}^a V_{\pi}(s') \right)
&= \arg\max\limits_{a \in \mathcal{A}} Q_\pi(s,a)
\end{aligned}
$$

다만 model-free 환경에서는 transition probability와 reward를 미리 알 수 없기 때문에, action-value function $Q(s,a)$을 사용해야만 한다.

즉, model-free prediction 방법론을 $Q(s,a)$에 대해 적용하는 것이 필요하다.

### $\epsilon$-greedy Policy Improvement

하지만, $Q(s,a)$를 이용한 greedy policy는 우리가 충분한 action-state pair에 대해 탐색하지 않으면 제대로 동작하지 않을 가능성이 높다. 이러한 문제를 개선하기 위해 등장한 것이 바로 **$\epsilon$-greedy policy improvement**이다.

일반적인 $\epsilon$-greedy policy improvement에서는 $1-\epsilon$의 확률로 greedy action을, $\epsilon$의 확률로 임의의 행동을 선택한다. 이를 수식으로 표현하면 다음과 같다.

$$
\pi(a|s) = 
\begin{cases} 
\frac{\epsilon}{m} + 1 - \epsilon & \text{for } a^* = \arg\max\limits_{a \in A} Q(s, a)  
\frac{\epsilon}{m} & \text{for other } a 
\end{cases}
$$

## Model-free Control

앞서 언급했듯이, model-free control의 경우 $Q(s,a)$에 대해 evaluation하는 방법이 필요하다. 일전에 설명한 Monte-Carlo (MC) evaluation 또는 temporal difference (TD) learning을 사용할 수 있다. 

하지만 일반적으로 MC evaluation에 비해 TD learning 방법이 더 널리 사용되므로 여기서는 TD learning을 이용한 evaluation에 대해서만 설명하고자 한다. TD learning을 이용한 model-free evaluation 방법은 **SARSA**와 **Q-learning**이 있다.

### SARSA

**SARSA**는 대표적인 on-policy 알고리즘으로 다음과 같이 동작한다.

1. 모든 $s, a$에 대해서 $Q(s,a)$를 초기화한다.
2. 현재 state $S$에서 policy $\pi$를 기반으로 action $A$를 선택한다.
3. Action $A$를 수행하고, 새로운 state $S'$과 reward $R$을 얻는다.
4. 새로운 state $S'$에서 policy $\pi$를 기반으로 action $A'$를 선택한다.
5. 다음 식으로 $(S,A)$에서의 action-value $Q(S,A)$를 update한다.

  $$  
  Q(S,A) \leftarrow Q(S,A) + \alpha(R + \gamma Q(S',A') - Q(S,A))  
  $$
6. $S\leftarrow S'$, $A\leftarrow A'$. 이후, 2번으로 돌아간다.

> SARSA는 state-action-reward-state-action 각각의 앞글자를 따 정해진 이름이다.

SARSA는 GLIE를 만족하는 policy $\pi$와 Robbins-Monro sequence에 해당하는 step-size $\alpha$에 대해 optimal로 수렴한다는 것이 알려져 있다.

- GLIE: Greedy in the Limit with Infinite Exploration, 모든 state-action pair가 무수히 많이 explored되는 경우 greedy policy로 수렴하는 (in probability) 성질.
- Robbins-Monro sequence: $\sum_{t=1}^\infty \alpha_t = \infty$ and $\sum_{t=1}^\infty \alpha_t^2 = 1$.

### Q-learning

**Q-learning**는 대표적인 off-policy 알고리즘이다. 

Off-policy 알고리즘에서는 두 개의 서로 다른 policy를 사용한다.

- Agent의 action-value를 update할 때 사용되는 다음 시점의 $Q(S_{t+1},A')$ 중 $A'$을 결정하는 policy: **target policy** $\pi$ ($A' \sim \pi(\cdot \mid S_t)$)

  $$  
  Q(S_t,A_t) \leftarrow Q(S_t,A_t) + \alpha(R_{t+1} + \gamma Q(S_{t+1},A') - Q(S_t,A_t))  
  $$  
- Agent의 실제 action 결정하는 policy: **behavior policy** $\mu$ ($A_{t+1} \sim \mu(\cdot \mid S_t)$)

Q-learning에서는 target policy로 greedy policy ($\pi(S_{t+1}) = \arg\max\limits_{a'}Q(S_{t+1}, a')$를, behavior policy로 $\epsilon$-greedy policy를 사용한다. 즉, Q-learning은 다음과 같이 동작한다.

1. 모든 $s, a$에 대해서 $Q(s,a)$를 초기화한다.
2. 현재 state $S$에서 $\epsilon$-greedy policy를 기반으로 action $A$를 선택한다.
3. Action $A$를 수행하고, 새로운 state $S'$과 reward $R$을 얻는다.
4. 다음 식으로 $(S,A)$에서의 action-value $Q(S,A)$를 update한다.

  $$  
  Q(S,A) \leftarrow Q(S,A) + \alpha(R + \gamma \max_{a'} Q(S',a') - Q(S,A))  
  $$
5. $S\leftarrow S'$. 이후, 2번으로 돌아간다.

> Q-learning 역시 SARSA와 마찬가지로 optimal로 수렴한다는 것이 알려져 있다.

### On-policy vs. Off-policy

SARSA와 Q-learning은 유사한 알고리즘이나, 각각 on-policy와 off-policy 알고리즘이라는 차이가 존재한다. 많은 사람들이 헷갈려하는 개념이니, 천천히 근본부터 풀어보자.

#### 하나의 policy가 맡는 두 가지 역할

핵심은, RL에서 policy가 **서로 다른 두 가지 일**을 동시에 한다는 사실을 분리해서 보는 것이다.

- **Behavior policy** (행동 정책): agent가 환경에서 **실제로 action을 고를 때** 사용하는 정책. 즉, 경험(데이터) $(S, A, R, S')$를 만들어내는 주체다.
- **Target policy** (목표 정책): 우리가 **학습하고 개선하려는** 정책. value function이 "이 정책이 얼마나 좋은가"를 평가하는 대상이다.

이 두 역할을 **같은 policy 하나로** 수행하면 **on-policy**, **서로 다른 두 policy로** 나눠 수행하면 **off-policy**다. 한 문장으로 줄이면 이렇다.

> On-policy는 *내가 지금 따르고 있는 정책*을 평가·개선하고, off-policy는 *내가 따르는 정책과 별개의 정책*을 평가·개선한다.

#### 운전 비유

운전을 배우는 상황으로 생각해보자.

- **On-policy**는, 내가 실제로 운전하는 방식 그대로를 평가하고 다듬는 것이다. 나는 초보라 가끔 겁이 나서 엉뚱한 시도(exploration)도 하는데, 학습하는 "좋은 운전 정책"에는 그런 머뭇거림과 실수까지 포함된다. 평가 대상과 실제 운전이 같은 사람이다.
- **Off-policy**는, 내가 조심조심·이것저것 시도하며 운전하면서도, 머릿속으로는 "베테랑이라면 이 상황에서 어떻게 했을까"라는 **이상적인 정책**을 따로 배우는 것이다. 실제로 핸들을 잡는 정책(behavior)과 배우려는 정책(target)이 다르다. 심지어 내가 운전하지 않고 **남의 운전 영상이나 과거의 주행 기록**만 봐도 그 이상적 정책을 배울 수 있다.

이 "남의/과거의 데이터로도 배울 수 있다"는 점이 off-policy의 본질적 힘인데, 잠시 뒤에 다시 짚겠다.

#### 왜 굳이 나누는가: exploration의 딜레마

좋은 policy를 찾으려면 agent는 (1) 아직 안 가본 state-action을 **탐험(exploration)** 해야 하고, 동시에 (2) 지금까지 알아낸 최선의 행동을 **활용(exploitation)** 해야 한다. 그런데 이 둘은 충돌한다. 최적이라 믿는 행동만 반복하면 더 나은 길을 영영 못 찾고, 계속 탐험만 하면 최적 행동을 못 한다.

- **On-policy**는 행동과 학습이 같은 정책이라, 탐험을 정책 *안에* 섞어 넣어야 한다 ($\epsilon$-greedy처럼). 그 결과, 평가되는 정책은 "**탐험까지 포함한** 정책"이 된다. 즉 $\epsilon$ 확률로 무작위 행동을 하는 그 버릇까지 통째로 학습 대상이 된다.
- **Off-policy**는 행동(behavior)은 마음껏 탐험적으로 하되, 학습(target)은 깔끔한 greedy 정책에 대해 진행한다. 탐험이라는 "지저분한 일"을 학습 목표로부터 떼어낼 수 있는 것이다.

#### 근본적 차이: TD target에 무엇을 넣는가

이 추상적인 차이는 SARSA와 Q-learning의 update 식 **딱 한 항**에서 구체적으로 드러난다. 같은 경험 $(S, A, R, S')$가 주어졌을 때 두 알고리즘의 TD target은 다음과 같다 (자세한 알고리즘은 아래에서 다룬다).

$$  
\begin{aligned}  
\text{SARSA:} \quad & R + \gamma Q(S', A') \quad &(A' \text{는 behavior policy로 } \textbf{실제로 선택한} \text{ 다음 action})  
\text{Q-learning:} \quad & R + \gamma \max_{a'} Q(S', a') \quad &(\max \text{는 greedy target policy가 } \textbf{했을} \text{ 행동})  
\end{aligned}  
$$

차이는 "다음 state $S'$에서의 가치를 누구의 행동으로 추정하느냐"다.

- **SARSA**는 agent가 $S'$에서 $\epsilon$-greedy로 **실제 골라 둔** action $A'$의 값 $Q(S', A')$를 가져온다. 따라서 SARSA가 학습하는 $Q$는 "**내가 지금 쓰는 (탐험이 섞인) 정책을 계속 따랐을 때**의 가치"다. 가끔 무작위로 사고를 치는 자기 자신을 그대로 평가한다.
- **Q-learning**은 $S'$에서 실제로 무엇을 하든 무시하고, **그 자리에서 가능한 최선의 값** $\max_{a'} Q(S', a')$를 가져온다. 따라서 Q-learning이 학습하는 $Q$는 "**지금부터 항상 greedy(optimal)하게 행동했을 때**의 가치"다. 실제 행동은 탐험적이어도, 배우는 대상은 optimal policy다.

> 즉 같은 경험이 들어와도, SARSA는 "내가 다음에 **실제로** 한 행동"을 target에 넣고, Q-learning은 "**최선이었을** 행동"을 target에 넣는다. 이 한 글자(`A'` vs `max`) 차이가 on/off-policy를 가른다.

이것이 바로 아래 **Cliff Walking** 예시에서 SARSA가 절벽을 피해 도는 안전한 길을, Q-learning이 절벽 끝을 따라가는 최적의 길을 배우는 이유다. SARSA는 "나는 $\epsilon$ 확률로 헛발질을 하니 절벽 옆은 위험해"라는 자기 인식을 가치에 반영하지만, Q-learning은 헛발질을 학습 대상에서 배제하고 순수한 최적 경로만 본다.

#### Off-policy가 주는 본질적 자유와 그 대가

target policy가 데이터를 만든 behavior policy와 분리된다는 것은 곧 **데이터의 출처를 자유롭게 고를 수 있다**는 뜻이다. 학습하려는 정책이 그 데이터를 직접 만들어야 한다는 제약이 사라지기 때문이다. 이로부터 off-policy의 강력한 장점들이 나온다.

- **데이터 재사용**: 과거의 자신이 만든 경험을 buffer에 모아 두고 반복해 학습할 수 있다. [[posts/foundations/introduction-to-rl/07-deep-q-learning]]의 experience replay가 가능한 근본 이유가 바로 이것이다 (replay는 off-policy에서만 쓸 수 있다).
- **다양한 출처 활용**: 사람의 시연(demonstration), 다른 알고리즘이 만든 로그, 완전히 무작위인 탐험 정책의 데이터로도 optimal policy를 배울 수 있다.
- **exploration과 학습의 분리**: 행동은 적극적으로 탐험하면서도 학습 목표는 항상 optimal policy로 고정할 수 있어, 종종 더 빠르게 수렴한다.

대신 대가도 있다. 행동한 정책과 평가하려는 정책의 **분포가 다르기 때문에**, 일반적으로는 그 차이를 보정해줘야 하고(importance sampling), 함수 근사·bootstrapping과 결합되면 학습이 불안정해지기 쉽다(이른바 deadly triad). Q-learning은 target policy가 greedy로 고정돼 있어 $\max$ 연산만으로 보정 없이 동작하는 운 좋은 특수 사례다.

정리하면 다음과 같다.


|  | On-policy (예: SARSA) | Off-policy (예: Q-learning) |
| ------------------ | -------------------- | -------------------------- |
| behavior vs target | 같은 policy | 다른 policy |
| 학습하는 대상 | 탐험까지 포함한 현재 정책 | 별도의 (보통 greedy/optimal) 정책 |
| 데이터 재사용·외부 데이터 | 어려움 | 가능 (replay, 시연 등) |
| 안정성 | 상대적으로 안정적 | 불안정해지기 쉬움 |
| 성향 | 보수적·안전 | 모험적·최적 추구 |


### Cliff Walking Example

두 알고리즘의 학습 결과의 차이를 극명하게 보여주는 가장 좋은 예시가 바로 cliff walking problem이다.

이는 아래 그림과 같은 환경에서 S에서 출발해 G로 도착하는 것을 학습하는 문제이다.

- Action: up, down, left, right
- Reward = -1 per time-step, -100 in the cliff, $\gamma$ = 0
- $\epsilon$-greedy with $\epsilon$ = 0.1, $\alpha$ = 0.5
- Initialize $Q(S,A)=0$

![](/images/4b7aaf03-964f-4898-8492-0cb52c394c6a-image.png)

위 문제를 학습시켜보면, 중간 시점에 체크해보는 경우 일반적으로 SARSA는 safe path(local optimal)로 수렴하고, Q-learning은 optimal path로 수렴하게 된다. 

> 단, 무수히 많은 episode를 거치면서 $\epsilon$이 0에 수렴하면 두 알고리즘 모두 optimal path를 찾는다. (GLIE 조건 하)

SARSA는 next state에서의 action을 실제로 수행해보고 이를 현재 state의 value에 반영한다. 즉, optimal path로 가다가 한번 cliff로 떨어지는 경우, 이 때의 경험이 현재 state에 반영되어 cliff 쪽으로 가지 않으려는 성향을 띄게 된다.

반면, Q-learning의 경우 next state에서 cliff에 떨어지는 경험은, next state 에서의 action-state value ($Q(S_{t+1}, A_{t+1}$)에만 반영되며, 현재 state의 value에는 반영되지 않는다 (greedy action으로 선택이 되지 않기 때문). 이러한 이유로 Q-learning은 보다 모험적이나 optimal한 path에 가깝게 행동한다.