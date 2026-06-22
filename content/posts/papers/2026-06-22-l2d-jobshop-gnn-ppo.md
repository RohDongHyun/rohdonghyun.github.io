---
title: GNN과 PPO로 Job Shop 디스패칭 규칙을 학습하기 (L2D)
date: 2026-06-22
tags:
  - AI Scheduling
private: true
---

Job Shop Scheduling(JSSP)을 풀 때 현장에서 가장 흔히 쓰는 방법은 **Priority Dispatching Rule(PDR)**, 즉 "지금 처리할 수 있는 operation 중 어느 것을 먼저 할까"를 정하는 우선순위 규칙이다. SPT(처리시간 짧은 것 먼저), MWKR(남은 작업량 많은 job 먼저) 같은 규칙이 대표적이다. 문제는 이런 규칙을 **사람이 직관과 경험으로 손수 설계**해야 하고, 어떤 규칙이 좋은지는 문제 instance마다 다르다는 점이다.

이 글에서 다루는 [Learning to Dispatch for Job Shop Scheduling via Deep Reinforcement Learning](https://arxiv.org/abs/2010.12367) (Zhang et al., NeurIPS 2020, 이하 **L2D**)는 이 PDR을 사람이 설계하는 대신 **GNN + 강화학습으로 end-to-end 학습**한다. 핵심 매력은 학습된 정책이 **instance 크기에 무관(size-agnostic)** 하다는 점이다. 작은 6×6 문제로 학습한 정책을 100×20처럼 훨씬 큰 문제에 그대로 적용해도 잘 동작한다.

이 글은 독자가 JSSP는 이미 안다고 보고 JSSP 설명은 최소화한다. 대신 **PPO를 가장 자세히** 풀어 쓰고, GNN(GIN) 부분은 중간 분량으로 다룬다.

## 1. 문제 표현: disjunctive graph (간략히)

JSSP는 **disjunctive graph** $G = (O, C \cup D)$로 표현한다.

- $O$: 모든 operation 노드 (+ 가상의 시작/종료 dummy 노드).
- $C$ (conjunction): 같은 job 안에서 operation의 처리 순서를 나타내는 **방향 있는** arc. 선행제약이다 (job의 1번 공정을 끝내야 2번 공정 가능).
- $D$ (disjunction): 같은 machine을 쓰는 operation 쌍을 잇는 **방향 없는** arc. 같은 기계는 한 번에 하나만 처리하므로 둘 사이에 순서를 정해야 한다.

여기서 핵심 직관 하나: **스케줄링을 푼다는 것은 곧 disjunctive arc($D$)들의 방향을 모두 정하는 것**과 같다. 방향이 정해지지 않은 disjunction은 "아직 안 정해진 기계 위 순서"이고, 모든 disjunction의 방향이 정해지면 완전한 schedule이 된다.

> 그림 참고: disjunctive graph 도식은 [원 논문 Figure 1](https://arxiv.org/abs/2010.12367)을 참조하면 conjunction(실선 화살표)과 disjunction(점선)이 한눈에 들어온다.

## 2. MDP 설계: 디스패칭을 순차적 의사결정으로

L2D는 schedule을 한 번에 통째로 만드는 대신, **operation을 하나씩 디스패치하는 과정**을 Markov Decision Process(MDP)로 본다. MDP는 상태(state)에서 행동(action)을 골라 다음 상태로 가고 보상(reward)을 받는 순차적 의사결정 틀이다.

- **State $s_t$**: 현재까지 일부 disjunction 방향이 정해진 그래프 $G(t)$. 각 노드는 두 개의 raw feature를 가진다.
  - $I(O, s_t)$: 그 operation이 이미 스케줄됐는지 나타내는 binary indicator (0 또는 1).
  - $C_{LB}(O, s_t)$: 그 operation 완료시각의 **lower bound**(하한). 선행 operation들의 하한에 자기 처리시간을 더해 재귀적으로 계산한다.
- **Action $a_t$**: 지금 디스패치 가능한(eligible) operation 하나를 고르는 것. 각 job에서 다음에 처리할 operation 하나씩만 후보가 되므로, action 후보 수는 최대 job 수 $|J|$다.
- **Transition**: 고른 operation을 해당 machine의 **가장 이른 실행 가능한 빈 구간(earliest feasible time)**에 배치하고, 관련 disjunction arc의 방향을 갱신한다.
- **Reward**:
  $$
  R(a_t, s_t) = H(s_t) - H(s_{t+1}), \quad H(s_t) = \max_{O} C_{LB}(O, s_t)
  $$
  여기서 $H(s_t)$는 현재 그래프에서 makespan(전체 완료시각)의 lower bound다. 즉 "지금까지 정해진 정보로 봤을 때 makespan은 최소 이만큼"이라는 추정치다.

이 reward 설계가 영리하다. 디스패치를 한 번 할 때마다 makespan 하한 $H$는 그대로거나 늘어난다. 보상은 **"이번 결정으로 makespan 하한이 얼마나 덜 늘었는가"**를 준다. 할인율 $\gamma = 1$로 두면 누적 보상이 망원경처럼 접혀(telescoping)

$$
\sum_t R(a_t, s_t) = H(s_0) - H(s_{\text{end}}) = H(s_0) - C_{\max}
$$

가 된다. $H(s_0)$는 처음부터 정해진 상수이므로, **누적 보상을 최대화하는 것이 곧 최종 makespan $C_{\max}$를 최소화하는 것과 정확히 일치**한다. RL이 풀려는 목적(누적 보상 최대)과 스케줄링의 목적(makespan 최소)이 어긋나지 않게 reward를 설계한 것이다.

## 3. 상태를 벡터로: GIN 기반 GNN (중간 분량)

상태 $s_t$는 그래프다. 정책망이 입력으로 쓰려면 그래프를 고정 차원의 벡터(embedding)로 바꿔야 한다. L2D는 **Graph Isomorphism Network(GIN)** 를 directed graph에 맞게 쓴다.

> GIN은 Xu et al.이 2019년 ICLR에서 제안한 GNN 구조로, "두 그래프가 구조적으로 다르면 다른 임베딩을 내야 한다"는 분별력(Weisfeiler-Lehman 테스트 수준의 표현력)을 이론적으로 보장하도록 설계된, 현재 GNN의 표준 baseline 중 하나다.

각 노드의 임베딩은 레이어 $k$마다 이웃 정보를 모아 갱신된다.

$$
h_v^{(k)} = \text{MLP}_{\theta_k}\!\left( (1 + \epsilon^{(k)}) \cdot h_v^{(k-1)} + \sum_{u \in N(v)} h_u^{(k-1)} \right)
$$

- $N(v)$는 $v$의 이웃 노드 집합. 이웃 임베딩을 **합(sum)**으로 모은다. 합은 평균/최대와 달리 "이웃이 몇 개인지"까지 보존해 분별력이 높다.
- $\epsilon^{(k)}$는 자기 자신($h_v$)을 이웃 정보 대비 얼마나 강조할지 조절하는 학습 가능한 스칼라.
- $\text{MLP}_{\theta_k}$로 비선형 변환한다. 즉 "이웃과 자신의 현재 상태를 섞어 다음 상태를 만든다"는 뜻이고, 이를 $K$번 반복하면 각 노드가 $K$-hop 이웃까지의 구조를 본다.

입력 raw feature는 앞서 정의한 2차원 벡터다.

$$
h_O^{(0)}(s_t) = \big( I(O, s_t),\ C_{LB}(O, s_t) \big)
$$

그래프 전체 임베딩은 모든 노드 임베딩의 **평균 풀링(mean pooling)**으로 만든다.

$$
h_G = \frac{1}{|V|} \sum_{v \in V} h_v^{(K)}
$$

설정은 $K = 2$ iteration, MLP는 hidden layer 2개에 차원 64. disjunction은 방향이 정해진 것만 그래프에 넣는 "adding-arc" 방식으로 sparsity를 유지한다.

여기서 size-agnostic 일반화의 근거가 나온다. 위 수식 어디에도 **노드 개수나 그래프 크기가 고정값으로 박혀 있지 않다.** 노드 임베딩은 이웃 합으로, 그래프 임베딩은 평균으로 계산되므로, 노드가 36개든 2000개든 같은 parameter로 같은 차원의 임베딩을 낸다. 그래서 작은 instance로 학습한 정책망을 큰 instance에 그대로 쓸 수 있다.

## 4. PPO: 정책을 어떻게 학습하는가 (가장 자세히)

이제 핵심이다. 위에서 만든 임베딩으로 **어떤 정책을 어떻게 학습하는가**. L2D는 actor-critic 구조의 **PPO(Proximal Policy Optimization)**를 쓴다. PPO가 왜 이런 모양인지 이해하려면 policy gradient부터 차근차근 쌓아야 한다.

### 4.1 출발점: Policy Gradient

강화학습의 목표는 정책 $\pi_\theta$ (상태에서 행동의 확률분포, parameter $\theta$)를 조정해 기대 누적 보상을 최대로 만드는 것이다.

$$
J(\theta) = \mathbb{E}\!\left[ \sum_t \gamma^t r_t \right]
$$

이 목적함수를 직접 경사상승(gradient ascent)하는 방법이 policy gradient다. 가장 기본형인 **REINFORCE**의 gradient는

$$
\nabla J(\theta) = \mathbb{E}\!\left[ \sum_t \nabla \log \pi_\theta(a_t \mid s_t) \cdot G_t \right]
$$

직관은 단순하다. 한 episode를 끝까지 굴려(rollout) 실제 받은 누적 보상 $G_t$(Monte Carlo return, 시점 $t$ 이후 받은 보상의 합)가 크면, 그때 골랐던 행동의 확률 $\log \pi_\theta(a_t \mid s_t)$를 끌어올린다. 좋은 결과를 낸 행동을 더 자주 하게 만드는 것이다.

문제는 $G_t$의 **분산(variance)이 매우 크다**는 것이다. 한 episode의 운(랜덤성)에 따라 $G_t$가 크게 출렁이므로 gradient 추정이 불안정하고 학습이 잘 수렴하지 않는다.

### 4.2 분산을 줄이기: Actor-Critic과 Advantage

분산을 줄이는 표준 기법은 **baseline**을 빼는 것이다. baseline이란 행동의 좋고 나쁨을 판단할 기준선으로, 보통 상태 가치함수 $V(s)$(그 상태에서 앞으로 기대되는 누적 보상)를 쓴다. $G_t$에서 $V(s_t)$를 빼면 **advantage**

$$
A_t = G_t - V(s_t)
$$

를 얻는다. advantage는 "이 행동이 그 상태의 평균적 기대치보다 얼마나 더 좋았나"를 뜻한다. $A_t > 0$이면 평균보다 좋은 행동이니 확률을 올리고, $A_t < 0$이면 내린다. 기준선을 빼도 gradient의 기댓값(방향)은 그대로지만 분산은 크게 줄어든다.

이 구조가 **actor-critic**이다. **actor**는 정책 $\pi_\theta$(행동을 고름), **critic**은 가치함수 $V$(행동을 평가)를 담당한다. L2D에서는 GIN 백본을 공유하고, actor는 각 eligible operation에 score를 매겨 softmax로 확률분포를 만들며, critic $v_\phi$는 그래프 임베딩 $h_G(s_t)$를 입력받는 MLP로 가치 스칼라를 추정한다.

### 4.3 On-policy의 함정과 신뢰영역(TRPO)

policy gradient는 **on-policy**다. 즉 "지금의 정책 $\pi_\theta$로 모은 데이터"로만 그 정책을 업데이트할 수 있다. 엄밀히는 한 번 모은 데이터로 **한 스텝만** 업데이트해야 이론이 보장된다.

하지만 매번 데이터를 새로 모으는 건 비효율적이다. 한 번 모은 데이터로 여러 번 크게 업데이트하고 싶다. 그런데 그렇게 하면 정책이 한 번에 너무 멀리 움직여, 데이터를 모았던 정책과 완전히 달라지고 **성능이 갑자기 붕괴**할 수 있다.

**TRPO(Trust Region Policy Optimization)**는 이 문제를 "이전 정책에서 너무 멀어지지 마라"는 제약으로 푼다. 두 정책 분포 사이의 차이를 **KL divergence**로 재서, 그 차이가 일정 신뢰영역(trust region) 안에 있도록 제약을 걸고 그 안에서만 최대로 개선한다. 효과는 좋지만 2차(second-order) 최적화가 필요해 구현이 복잡하고 무겁다.

### 4.4 PPO: 신뢰영역을 1차 최적화로 단순화

**PPO**는 TRPO의 신뢰영역 아이디어를 훨씬 단순한 1차(first-order) 최적화로 근사한다. 핵심은 **확률비(probability ratio)**

$$
r_t(\theta) = \frac{\pi_\theta(a_t \mid s_t)}{\pi_{\theta_{\text{old}}}(a_t \mid s_t)}
$$

다. 새 정책이 그 행동을 이전보다 몇 배 더(혹은 덜) 고르게 됐는지를 나타낸다. $r_t = 1$이면 안 변한 것이다. PPO의 clipped objective는 다음과 같다.

$$
L^{\text{CLIP}}(\theta) = \mathbb{E}_t\!\left[ \min\big( r_t(\theta) \cdot \hat{A}_t,\ \text{clip}(r_t(\theta),\ 1 - \epsilon,\ 1 + \epsilon) \cdot \hat{A}_t \big) \right]
$$

해석하면 이렇다. $r_t(\theta)$가 $[1 - \epsilon,\ 1 + \epsilon]$ 범위를 벗어나면 clip으로 잘라버려, **그 방향으로 더 가도 objective가 늘지 않게** 만든다. 즉 정책이 한 번에 너무 멀리 가는 것을 자동으로 억제한다 (신뢰영역의 1차 근사).

$\min(\cdot)$이 들어간 이유가 핵심이다.

- advantage가 양수($\hat{A}_t > 0$, 좋은 행동)일 때: 확률을 올리고 싶지만 $r_t$가 $1 + \epsilon$을 넘으면 잘려, 그 이상으로 확률을 키워봐야 이득이 없다. 상한에서 멈춘다.
- advantage가 음수($\hat{A}_t < 0$, 나쁜 행동)일 때: 확률을 내리고 싶지만 $r_t$가 $1 - \epsilon$ 아래로 가도 더 이상 이득이 없다. 하한에서 멈춘다.

$\min$ 덕분에 어느 쪽이든 **보수적으로(클립된 쪽으로)** 동작한다. 결과적으로 "한 번에 조금씩, 안전하게" 업데이트한다.

### 4.5 Entropy bonus와 전체 loss

정책이 너무 일찍 한 행동만 고르는 **deterministic(결정적)** 상태로 굳으면 탐험(exploration)이 멈춰 더 나은 해를 못 찾는다. 이를 막으려고 정책 분포의 **entropy**(불확실성의 크기)를 보상에 더해, 분포가 너무 뾰족해지지 않게 탐험을 유도한다.

전체 loss는 세 항의 결합이다.

$$
L(\theta, \phi) = L^{\text{CLIP}}(\theta) - c_1 \cdot L^{\text{VF}}(\phi) + c_2 \cdot S[\pi_\theta]
$$

- $L^{\text{CLIP}}$: 위의 policy loss (actor 학습).
- $L^{\text{VF}}$: critic이 실제 return을 맞추도록 하는 value loss (MSE).
- $S[\pi_\theta]$: entropy bonus.

L2D의 실제 설정은 계수 (policy, value, entropy) = (2, 1, 0.01), learning rate $2 \times 10^{-5}$, clip $\epsilon = 0.2$, $\gamma = 1$, 10,000 iteration, iteration마다 독립 trajectory $N = 4$개 수집, 업데이트 epoch $K = 1$이다.

**정리하면**: 학습 대상은 actor(정책 $\pi_\theta$)와 critic(가치 $v_\phi$)이고, 둘은 GIN 임베딩을 공유한다. 목적함수는 위의 결합 loss이며, 학습 parameter는 GIN의 $\theta_k, \epsilon^{(k)}$, actor MLP, critic MLP의 가중치 전체다. 학습 방식은 정책으로 직접 스케줄을 굴려(rollout) 모은 trajectory로 PPO 업데이트를 반복하는 on-policy RL이다.

### 4.6 왜 하필 PPO인가

디스패칭 학습에 PPO가 맞는 이유는 세 가지다. (1) clipping으로 학습이 **안정적**이라 reward shaping이 까다로운 스케줄링에서도 잘 수렴한다. (2) TRPO와 달리 1차 최적화라 **구현이 단순**하다. (3) action이 "eligible operation 중 하나 고르기"인 **이산 행동공간(discrete action space)**에 softmax 정책 + PPO가 자연스럽게 들어맞는다.

## 5. 실험 결과 (간단히)

학습 instance는 Taillard 방식으로 생성한 6×6, 10×10, 15×15, 20×20, 30×20 (job×machine). 일반화 실험은 20×20·30×20에서 학습한 정책을 한 번도 못 본 50×20, 100×20에 적용했다. 비교 대상은 전통 PDR인 SPT, MWKR, FDD-MWKR, MOPNR다.

주요 makespan 수치 (작을수록 좋음):

| instance | L2D(제안) | 최고 전통 PDR | OR-Tools 대비 gap |
|---|---|---|---|
| 20×20 | 2007.76 | 2263.68 (MOPNR) | 약 29.0% |
| 30×20 | 2508.27 | 2809.62 | 약 29.2% |
| 100×20 (일반화) | 6088.68 | 6385.32 | 약 9.4% |

흥미로운 점은 **instance가 커질수록 최적(OR-Tools) 대비 격차가 오히려 작아진다**는 것이다 (29% → 9.4%). 큰 문제일수록 정확한 최적해를 구하기 어렵다는 점을 감안하면, 학습된 정책의 실무적 가치가 큰 instance에서 더 부각된다.

속도는 20×20 추론에 약 0.9초로, 전통 PDR(<0.02초)보다는 느리지만 해 품질이 더 우수하다.

## 6. 한계와 의의

- **의의**: 사람이 손수 설계하던 PDR을 데이터로 자동 학습했고, GNN의 size-agnostic 성질 덕에 작은 instance로 학습한 정책을 실무 규모의 대형 instance에 곧장 적용할 수 있다.
- **한계**: 여전히 최적(OR-Tools) 대비 gap이 존재하고, makespan이라는 단일 목적에 집중하며, 추론이 전통 PDR보다 느리다.

## 참고문헌

- Zhang, Song, Cao, Zhang, Tan, Xu. *Learning to Dispatch for Job Shop Scheduling via Deep Reinforcement Learning.* NeurIPS 2020. [arXiv:2010.12367](https://arxiv.org/abs/2010.12367)
