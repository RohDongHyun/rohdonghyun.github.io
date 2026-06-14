---
title: (2024) Reinforcement Learning for Unrelated Parallel Machine Scheduling with Release Dates, Setup Times, and Machine Eligibility
date: 2026-06-14
tags:
  - AI Scheduling
private: true
---
이 글은 WSC 2024(Winter Simulation Conference)에 발표된 Cho, Kim, Mönch의 논문 ["Reinforcement Learning for Unrelated Parallel Machine Scheduling with Release Dates, Setup Times, and Machine Eligibility"](https://doi.org/10.1109/WSC63780.2024.10838725)를 정리한 것이다. 반도체·철강 제조 현장에서 흔히 마주치는 **Unrelated Parallel Machine Scheduling(UPMSP)** 문제를 그래프 신경망(GNN)과 강화학습(RL)으로 푼다.

단순 요약을 넘어, 이 문제가 왜 어려운지 → 저자들이 문제를 어떻게 그래프로 바꿨는지 → 신경망이 어떻게 의사결정을 내리는지 순서로 따라가며 설명한다.

## 1. 어떤 문제를 푸는가

### Unrelated Parallel Machine Scheduling(UPMSP)

제조 현장에서 하나의 공정은 보통 여러 대의 기계가 나눠 처리한다. 핵심 결정은 두 가지다. **(1) 어떤 작업(job)을 어떤 기계(machine)에 배정할 것인가**, 그리고 **(2) 각 기계에서 작업을 어떤 순서로 처리할 것인가**.

"병렬기계(parallel machine)"는 같은 공정을 처리할 수 있는 기계가 여러 대 있다는 뜻이고, "비관련(unrelated)"은 **같은 작업이라도 어느 기계에서 처리하느냐에 따라 처리시간이 달라진다**는 뜻이다. 기계의 세대나 모델이 다르면 자연스럽게 발생하는 상황이다. 예컨대 반도체 제조의 이온 주입(ion implantation) 공정이 대표적인 UPMSP 사례다.

이 논문이 특별히 어렵게 만드는 지점은, 실제 공장에서 빠질 수 없는 **세 가지 제약을 동시에** 고려한다는 데 있다.

- **Release date (투입 가능 시각, $r_j$)**: 작업 $j$는 $r_j$ 이전에는 시작할 수 없다. 자재가 아직 도착하지 않았거나 선행 공정이 끝나지 않은 상황.
- **Machine eligibility (기계 적격성, $M_j$)**: 작업이 아무 기계에서나 처리될 수 있는 게 아니라, **특정 기계에서만** 가능하다. 레시피 호환성, 장비 인증 등의 이유.
- **Sequence- and machine-dependent setup time (순서·기계 의존 셋업시간, $s_{ijk}$)**: 기계 $k$에서 작업 $i$ 다음에 작업 $j$를 처리할 때 드는 셋업시간. **이전에 무엇을 했느냐(순서)** 와 **어느 기계냐** 에 모두 의존한다. 빈 기계에서 작업 $j$를 처음 올릴 때의 셋업은 $s_{0jk}$로 표기한다.

### 목적함수: 총 가중 지연(TWT)

각 작업 $j$에는 마감기한(due date) $d_j$와 중요도(weight) $w_j$가 있다. 작업의 완료시각을 $C_j$라 하면, 지연(tardiness)은

$$
T_j = \max(C_j - d_j,\ 0)
$$

로 정의된다. 마감보다 늦게 끝난 만큼만 벌점을 주고, 일찍 끝난 것에는 보상도 벌점도 없다. 최종 목적은 **총 가중 지연(Total Weighted Tardiness, TWT)** 을 최소화하는 것이다.

$$
TWT = \sum_{j=1}^{n} w_j T_j
$$

중요한 작업($w_j$가 큰 작업)이 늦으면 더 큰 벌점을 받으므로, 단순히 "늦은 작업 수"가 아니라 "얼마나 중요한 작업이 얼마나 늦었는지"를 최소화한다.

세 필드 표기법(three-field notation)으로 쓰면 이 문제는 다음과 같다.

$$
Rm \mid r_j, M_j, s_{ijk} \mid TWT
$$

$Rm$은 $m$대의 Unrelated Parallel Machines를 뜻한다. 이 문제는 **강하게 NP-난해(strongly NP-hard)** 다. 단일 기계 문제 $1 \mid\mid TWT$ 조차 이미 strongly NP-hard인데, 그것이 이 문제의 특수한 경우(special case)이기 때문이다. 따라서 큰 규모에서는 최적해를 직접 구하기를 포기하고, **합리적인 시간 안에 좋은 해를 주는 휴리스틱**을 찾아야 한다. 저자들이 강화학습을 들고 온 이유가 여기 있다.

## 2. 핵심 아이디어 — 문제를 그래프로 바꾸기

### 왜 그래프인가

저자들의 접근은 **구성적(constructive)** 이다. 즉, 한 번에 전체 스케줄을 내놓는 게 아니라 신경망이 매 스텝마다 "다음에 어떤 작업을 어떤 기계에 올릴지"를 하나씩 선택해 스케줄을 점진적으로 쌓아간다. 이는 강화학습의 순차적 의사결정 구조와 자연스럽게 맞물린다.

문제는 이 상태(state)를 신경망에 어떻게 입력하느냐다. 작업 수·기계 수가 instance마다 다르기 때문에, 고정 크기 벡터로는 표현하기 어렵다. 그래서 그래프로 표현하고 GNN으로 처리한다. 그래프는 node 수가 달라져도 같은 신경망이 처리할 수 있어, **한 번 학습하면 작업 수·기계 수에 상관없이 재사용**할 수 있다. 이것이 이 논문의 가장 큰 실용적 장점이다.

### Line Graph라는 트릭

가장 흔한 방법은 **이분 그래프(bipartite graph)** 다. 기계 node와 작업 node를 두고, 작업을 처리할 수 있는 기계와 edge로 잇는 방식이다(Figure 1a). 하지만 이 방식에는 약점이 있다. 셋업시간 $s_{ijk}$는 "기계 $k$에서 작업 $i$ 다음에 $j$"라는, **두 작업의 쌍과 기계가 함께 얽힌 정보**다. 이분 그래프의 edge 하나로는 이 관계를 깔끔하게 담기 어렵다.

저자들의 해법은 **선 그래프(line graph) $L(G)$** 다. 원래 그래프 $G$의 **edge를 node로 바꾸는** 변환이다.

- 원 그래프 $G$의 각 edge(= 특정 machine-job 쌍) → $L(G)$의 node가 된다.
- $L(G)$의 두 node는, 그에 대응하는 $G$의 두 edge가 **공통 node(같은 작업 또는 같은 기계)를 공유할 때만** 연결된다.

이렇게 하면 "기계-작업 쌍"이 1급 시민(node)이 되고, 그 쌍들 사이의 관계(같은 기계에서의 순서 전환 = 셋업)를 edge로 자연스럽게 표현할 수 있다(Figure 1b).

> 여기서 **"1급 시민(node)"** 이란, 중요한 의사결정 단위를 그래프에서 별도의 node로 직접 다룬다는 뜻이다.

*Figure 1*.

![image.png](/images/image.png)



### 상태(State)의 구체적 구성

상태는 시점 $t$의 그래프 $G_t(V_t, E_t)$로 정의된다. 각 시점 $t$는 구성 과정에서의 한 의사결정 지점이다. node는 두 종류로 나뉜다.

- **기계-작업 쌍 node $V_t^a$**: 기계 $k$와 작업 $j$의 쌍 $v_{jk}^a$. 현재 시뮬레이션 시각 $\text{sim}_t$ 기준으로 **이미 완료된 작업은 제외**한다. 각 node의 feature vector는 $[w_j, r_j, d_j, m_{jk}]$이며,
  - $w_j$: 작업 가중치
  - $r_j$: release date인데 $\max(r_j - \text{sim}_t, 0)$으로 조정 — "지금부터 얼마나 더 기다려야 투입 가능한가"
  - $d_j$: due date를 $d_j - \text{sim}_t$로 조정 — "지금부터 마감까지 남은 시간"
  - $m_{jk}$: 작업 $j$가 기계 $k$에 배정 가능한지 여부(적격성)
- **기계 node $V_t^b$**: 각 기계 $k$를 나타내는 node $v_k^b$. feature는 현재 처리 중인 작업의 **남은 처리시간** 등 기계의 현재 상태.

edge를 이해하기 전에 먼저 **node와 edge가 각각 무엇을 의미하는지** 분명히 하자. line graph로 바꾼 덕분에 각 쌍 node $v_{jk}^a$는 단순한 데이터 묶음이 아니라 **"작업 $j$를 기계 $k$에 올린다"는 하나의 후보 결정**을 뜻한다. 그렇다면 edge는 이 후보 결정들이 **서로 어떻게 얽혀 있는지(제약·비용 관계)** 를 나타내는 선이다. 이 점이 중요한 이유는, GNN이 바로 이 edge를 따라 이웃 node끼리 정보를 주고받기 때문이다. 즉 **어떤 관계를 edge로 깔아주느냐가 곧 "각 후보 결정이 무엇을 보고 판단하는가"를 정한다.** 저자들은 이 문제에서 의사결정에 꼭 필요한 관계를 네 종류로 정리했다.

- **$E_t^a$ (같은 작업끼리)**: 양방향. 한 작업은 결국 기계 **한 대에만** 올라간다. 그래서 같은 작업 $j$를 서로 다른 기계에 올리는 후보들 $(j, k_1), (j, k_2), \dots$ 은 **서로 경쟁하는 선택지**다. 이들을 edge로 묶어두면, GNN이 "이 작업은 기계 1에 올리는 게 나은가 2에 올리는 게 나은가"를 비교해 가며 후보들의 표현을 다듬을 수 있다. (Figure 2a)
- **$E_t^b$ (같은 기계끼리)**: 방향성 edge. 같은 기계 $k$를 쓰는 두 후보 $(j, k), (j', k)$ 는 **그 기계 위에서 처리 순서를 다투는 관계**다. 그 기계에서 $j$ 다음에 $j'$를 처리하면 셋업시간 $s_{jj'k}$가 드는데, 이 비용을 edge feature로 실어 "이 둘을 연달아 놓으면 전환 비용이 이만큼"이라는 정보를 전달한다. (Figure 2b)
- **$E_t^c$ (같은 기계, 역방향)**: $E_t^b$의 역방향. 셋업시간은 **비대칭**이라 $j \to j'$ 비용 $s_{jj'k}$와 $j' \to j$ 비용 $s_{j'jk}$가 다르다. 그래서 방향을 뒤집은 edge를 따로 두고 $s_{j'jk}$를 feature로 실어, 양쪽 순서의 셋업 정보를 모두 신경망에 흘려준다. (Figure 2b)
- **$E_t^d$ (기계 node ↔ 쌍 node)**: 양방향. 기계가 **직전에 끝낸(마지막) 작업이 무엇이냐**에 따라 다음에 어떤 작업을 올릴 때의 셋업이 정해진다. 기계 node $v_k^b$는 "내 마지막 작업은 이것"이라는 현재 상태를 들고 있고, 이 edge는 그 기계에 연결된 각 후보 쌍 node $v_{jk}^a$에게 **"지금 너(작업 $j$)를 이 기계에 올리면 셋업이 이만큼 든다"** 는 정보를 알려주는 통로다. (Figure 2c)

핵심은, 셋업시간이라는 핵심 비용이 **node가 아니라 edge feature** 로 자연스럽게 들어간다는 점이다. "두 작업의 쌍 + 기계"에 얽힌 셋업을, 그 쌍들을 잇는 선(edge) 위에 그대로 올려놓을 수 있는 것 — 이것이 line graph 표현을 택한 이유다.

*Figure 2*.

![image.png](/images/image-1.png)



### 행동(Action)과 상태 전이

행동은 두 종류다.

1. **작업 배정**: 아직 배정되지 않은 쌍 node $(j, k)$를 선택하면 작업 $j$가 기계 $k$에 배정된다. 시작 시각은 $t = \min(\text{sim}_t, r_j)$로 잡되, $\text{sim}_t$는 기계 $k$를 포함해 적어도 한 대가 가용해지는 가장 이른 시각이다. 즉 **기계가 비고 release date도 지난 가장 이른 순간**에 시작하도록 보장한다.
2. **대기(wait)**: 기계 node를 선택하면 실행되는 행동. 지금 당장 배정하지 않고, **현재 처리 중인 기계 중 하나가 작업을 끝내 가용해지는 최소 시점까지 $\text{sim}_t$를 미룬다.** 지금 올리는 것보다 조금 기다렸다가 더 나은 작업을 올리는 게 유리할 때를 위한 선택지다.

### 보상(Reward)

보상은 **에피소드가 끝났을 때 한 번만** 주어진다(sparse reward). 스케줄이 모두 완성되면 그 스케줄의 TWT에 음수를 붙여 보상으로 쓴다.

$$
R = -TWT
$$

TWT를 최소화하는 것이 목표이므로, 음의 TWT를 최대화하도록 학습하면 된다. 중간 단계마다 보상을 쪼개 주지 않고 마지막에 통째로 주는 방식이라 **신용 할당(credit assignment)** 이 까다롭지만, 그만큼 목적함수를 직접적으로 반영한다.

> **신용 할당(credit assignment)** 이란, 최종 성과의 공(또는 책임)을 **그 결과를 만든 여러 중간 결정에 어떻게 나눠 줄 것인가**의 문제다. 이 문제에서는 한 스케줄을 완성하기까지 "어떤 작업을 어느 기계에" 같은 결정을 수십 번 내리는데, 보상은 맨 끝에 TWT 하나로만 돌아온다. 그러면 좋은(혹은 나쁜) TWT가 나왔을 때 **그 수십 개 결정 중 어느 것이 잘했고 어느 것이 발목을 잡았는지**를 직접 알 길이 없다. 잘한 결정과 못한 결정이 한 점수에 뭉뚱그려지는 셈이다. 이것이 sparse reward에서 학습이 어려워지는 핵심 이유이고, 뒤에 나오는 baseline 기법이 바로 이 어려움을 완화하기 위한 장치다.

## 3. 신경망 구조와 학습

정책 신경망(policy network)은 **인코더(encoder)** 와 **행동 확률 계산 모듈** 두 부분으로 나뉜다.

### 인코더 — 4종 edge를 따로 처리하는 GNN

인코더는 그래프로 표현된 상태를 압축한다. 먼저 각 node의 raw feature $x_i$를 동일한 크기의 은닉 벡터로 변환한다.

$$
h_i(0) = \text{ReLU}(W_0 \cdot x_i)
$$

그다음 **GATv2(Graph Attention Network v2)** 를 적용한다.

> **GAT(Graph Attention Network)** 는 GNN에 어텐션(attention)을 결합한 기법이다. 일반 GNN은 한 node의 표현을 갱신할 때 이웃들의 정보를 **단순 평균**하지만, GAT는 트랜스포머처럼 **이웃마다 중요도(어텐션 가중치)를 학습해 가중평균**한다. 예컨대 어떤 후보 결정의 표현을 다듬을 때, 셋업이 적게 드는 이웃에는 큰 가중치를, 무관한 이웃에는 작은 가중치를 주는 식이다. GAT는 2017년, 그 한계를 보완한 GATv2는 2021년에 제안된 것으로, **최신 기법이라기보다 이미 GNN의 표준 도구로 자리잡은** 방법이다. 그래서 이 논문도 별도 설명 없이 가져다 쓴다.

핵심은 앞서 정의한 네 종류의 edge $E^a, E^b, E^c, E^d$ 각각에 대해 **별도의 서브그래프로 나눠 독립적으로 처리**한 뒤 결과를 합친다는 점이다. 관계 종류마다 의미가 다르므로 따로 학습하는 것이 자연스럽다.

각 edge 유형 $k$(여기서 $k=1,\dots,4$)에 대한 어텐션 계산은 다음과 같다.

$$
e_{ij}^k = a^k(l) \cdot \text{LeakyReLU}\left(W_1^k(l) \cdot [h_i(l), h_j(l), f_{ij}]\right)
$$

$$
\alpha_{ij}^k = \frac{\exp(e_{ij}^k)}{\sum_{j' \in N_i^k} \exp(e_{ij'}^k)}
$$

$$
h_i^k(l) = W_3^k(l) \cdot \text{LeakyReLU}\left(\sum_{j \in N_i^k} \alpha_{ij}^k \cdot W_2^k(l) h_j(l)\right)
$$

여기서 $f_{ij}$가 바로 **셋업시간**으로, $E^b, E^c, E^d$ edge에서 이웃 node의 정보를 가중합할 때 셋업 비용이 어텐션 계산에 직접 반영된다. $N_i^k$는 edge 유형 $k$로 node $i$에 연결된 이웃 집합이고, $a^k, W_1^k, W_2^k, W_3^k$는 모두 학습 대상 파라미터다. LeakyReLU의 음수 기울기는 0.2를 쓴다.

네 유형에서 나온 표현을 이어붙여(concatenate) 다음 층의 node 표현을 만든다.

$$
h_i(l+1) = \text{ReLU}\left(h_i(l) + W_4 \cdot [h_i^1(l), h_i^2(l), h_i^3(l), h_i^4(l)]\right)
$$

$h_i(l)$을 더해주는 잔차 연결(residual)이 들어가 있어 층을 깊게 쌓아도 정보가 잘 흐른다. 이 과정을 $L$번 반복해 최종 표현 $h_i(L)$을 얻는다.

### 행동 확률 계산 — 마스킹으로 제약 강제

인코딩된 벡터를 행동 확률로 바꾼다. 이때 **마스킹(masking)** 으로 제약을 강제한다. 기계 적격성을 위반하거나 이미 완료된 작업처럼 **불가능한 행동에는 $\text{mask}_i = 0$**, 가능한 행동에는 $\text{mask}_i = 1$을 준다.

$$
y_i = W_6 \cdot \text{ReLU}(W_5 \cdot h_i(L)) + \log(\text{mask}_i)
$$

$$
p_i = \text{Softmax}_i(y) = \frac{\exp(y_i)}{\sum_{j} \exp(y_j)}
$$

마스크에 로그를 씌워 더하는 것이 핵심 트릭이다. $\log(0) = -\infty$이므로 불가능한 행동은 softmax를 거치면 확률이 정확히 0이 된다. **machine eligibility 같은 제약을 신경망이 "배워서 피하길" 기대하는 게 아니라, 구조적으로 절대 선택할 수 없게 막는다.**

### 무엇을, 어떻게 학습하는가

지금까지의 신경망을 한 문장으로 묶으면, 학습 대상은 **상태(그래프) → 행동 확률분포** 로 가는 함수, 곧 **정책(policy) $p_\theta$** 다. 인코더(GNN)는 이 함수의 앞부분일 뿐이고, 그 뒤 점수 계산층(식 8–9)까지 합쳐 **하나의 신경망이 통째로** 학습된다. 학습 parameter $\theta$는 앞서 식들에 등장한 모든 가중치 — 초기 변환 $W_0$, edge 유형별·층별 어텐션 파라미터 $a^k, W_1^k, W_2^k, W_3^k$, 결합 변환 $W_4$, 점수 계산층 $W_5, W_6$ — 전부다. 마스킹은 제약을 끄는 상수일 뿐 학습 대상이 아니다.

여기서 짚을 점은, 이 가중치들이 **모든 node에 똑같이 공유**된다는 것이다. node가 몇 개든 같은 $W$를 반복 적용하므로, 학습된 정책을 작업 수·기계 수가 다른 문제에 그대로 쓸 수 있다. 앞서 말한 크기 불변성의 기계적 근거가 바로 이것이다.

### 학습 — REINFORCE와 rollout baseline

주의할 점은 이것이 **지도학습이 아니라는** 것이다. "이 상태의 정답 행동은 X"라는 label이 없으므로 `예측 vs 정답` 형태의 loss를 쓸 수 없다. 대신 몬테카를로 정책 경사법인 **REINFORCE**(Williams 1992)를 쓴다. 흐름은 이렇다.

1. 현재 정책 $p_\theta$로 스케줄 하나를 **끝까지** 만든다(= trajectory $\tau$, 수십 번의 행동 선택). 이때 각 선택의 확률 $p_\theta(a_t)$를 기록해 둔다.
2. 완성된 스케줄의 TWT로 보상 $R(\tau) = -TWT$를 계산한다.
3. 같은 problem instance를 $K$번 풀어(sampling rollout) 그 평균 보상을 baseline $b$로 삼는다.

그러면 최소화할 loss는 사실상 다음 형태가 된다.

$$
L(\theta) = -\big(R(\tau) - b\big)\sum_{t} \log p_\theta(a_t)
$$

직관은 단순하다. $\sum_t \log p_\theta(a_t)$는 "내가 실제로 택한 행동들의 로그확률 합"이고, 거기에 $(R - b)$를 곱한다.

- 그 trajectory가 평균보다 좋았으면($R > b$) → 거기서 택한 행동들의 확률을 **올리는** 쪽으로 경사가 흐른다.
- 평균보다 나빴으면($R < b$) → 그 행동들의 확률을 **내린다.**

즉 "잘 나온 스케줄에서 했던 선택은 더 자주, 못 나온 선택은 덜 하라"가 전부다. baseline $b$를 빼는 이유는, 안 빼면 모든 보상이 음수($-TWT$)라 신호가 들쭉날쭉해 학습이 불안정해지기 때문이다. **절대 점수가 아니라 "평균 대비 얼마나 나았나"로 방향을 잡는다.** 논문의 경사 식도 이와 같다.

$$
\nabla_\theta J_j(\theta) \leftarrow \frac{1}{K} \sum_{k=1}^{K} (R(\tau_j^k) - b_j) \nabla_\theta \log p_\theta(\tau_j^k)
$$

이 식은 앞서 설명한 **credit assignment의 한계**도 그대로 드러낸다. $(R - b)$라는 **하나의 스칼라**가 trajectory 안의 모든 행동에 똑같이 곱해진다 — REINFORCE는 어느 결정이 진짜 기여했는지 가리지 못하고 전체에 같은 공을 나눠 준다. baseline은 그 거친 신호의 분산이라도 줄여 주는 장치다.

파라미터는 $B$개의 instance마다 한 번씩 갱신한다. 이 rollout baseline 방식은 Kool et al.(2018), Kwon et al.(2020) 등 조합최적화에 RL을 쓴 연구들이 즐겨 쓰는 정석적 기법이다.

## 4. 실험과 결과

### 실험 설정

instance는 Jaklinović et al.(2021)의 생성 방식을 따랐다.

- 처리시간 $p_{jk} \sim DU(1, 100)$ (이산 균등분포), 가중치 $w_j \sim U(0,1)$, 셋업시간 $s_{ijk} \sim DU(0, 10)$
- release date: 평균 처리시간 $\hat{p}$의 절반 범위에서, $r_j \sim DU(0, \lfloor \hat{p}/2 \rfloor)$
- due date: 긴밀도(tightness) $T$와 범위(range) $R$ 파라미터로 조절. 두 값을 0.2~1.0까지 0.2 간격으로 바꿔가며 다양한 난이도를 만든다.
- machine eligibility: 각 기계에 작업의 50%만 적격하도록 설정

모델은 GATv2 기준 attention heads 8개, hidden vector dimension 256, 3 layers. learning rate $10^{-4}$, Adam optimizer. instance마다 16개 스케줄을 sampling해 평균을 baseline으로 쓰고, 10개 instance마다 update. **12 or 25 jobs × 3 machines** instance로 1,000 iteration(총 10,000개 instance) 학습했다. 하드웨어는 i7-9700 CPU와 RTX 3070 Ti GPU.

비교 대상은 다음과 같다.

- **EDD (Earliest Due Date)**: 마감이 가까운 작업부터 처리하는 대표적 디스패칭 규칙(적격성은 반영).
- **ATCSR_Rm** (Lin and Hsieh 2014): release time과 setup time까지 반영한 ATC 계열 고급 규칙. WSPT·slack·setup·ready 항을 곱한 지수 지수(index)로 우선순위를 매긴다. 다만 look-ahead 파라미터 $k_1, k_2, k_3$에 민감해, 저자들은 **instance마다 3,146가지 조합을 모두 시도**해 가장 좋은 TWT를 골랐다.
- **MILP (CPLEX)**: 작은 문제는 MILP으로 **최적해**를 구해 기준점으로 삼음. 12개 작업 instance는 모두 최적해를 찾았다.

### 작은 규모 (12 작업 × 3 기계)

TWT 평균(낮을수록 좋음)은 다음과 같다.


| 방법 | 평균 TWT |
| ----------- | ---------- |
| MIP (최적) | 144.20 |
| EDD | 341.34 |
| ATCSR_Rm | 201.32 |
| **RL (제안)** | **195.22** |


RL이 EDD를 크게 앞서고, 잘 튜닝된 ATCSR_Rm도 평균적으로 약간 앞선다. 다만 개별 세팅별로 보면 ATCSR가 이기는 경우도 적지 않아, 작은 규모에서의 우위는 근소하다. **여기서 짚어야 할 진짜 의미는 효율성이다.** ATCSR_Rm은 instance마다 3,146개 파라미터 조합을 전수 탐색해 얻은 "best" 성능인 반면, RL은 학습된 신경망의 **단 한 번의 추론(forward pass)** 으로 그보다 나은 평균 품질을 낸다.

### 큰 규모 (50 작업 × 6 기계)


| 방법 | 평균 TWT |
| ----------- | ---------- |
| EDD | 2032.93 |
| ATCSR_Rm | 863.61 |
| **RL (제안)** | **570.94** |


여기서 차이가 분명해진다. RL이 ATCSR_Rm을 **약 34% 더 낮은 TWT**로 압도한다. 특히 주목할 점은, 이 RL 모델이 **25 jobs × 3 machines로 학습된 그대로, 재학습 없이** 50개 작업 × 6대 기계 문제에 투입되었다는 것이다. 그래프 표현 덕분에 학습 때 본 적 없는 더 큰 규모에서도 잘 작동한다는, 곧 **크기 불변성(size invariance)과 일반화 능력**이 실제로 확인된 셈이다. 이는 매번 파라미터를 다시 튜닝해야 하는 휴리스틱이 갖지 못하는 강점이다.

## 5. 정리와 의의

이 논문의 기여를 요약하면 다음과 같다.

- 실제 제조 현장의 세 가지 핵심 제약(release date, machine eligibility, 순서·기계 의존 setup time)을 **동시에** 고려하는 UPMSP를 강화학습으로 풀었다.
- 셋업시간을 자연스럽게 담기 위해 **line graph 기반의 새로운 그래프 표현**을 제안하고, 네 종류 edge를 분리 처리하는 GATv2 인코더를 설계했다.
- 그래프 표현 덕분에 **한 번 학습한 모델을 작업 수·기계 수와 무관하게 재사용**할 수 있고, 작은 규모로 학습해도 큰 규모에서 잘 일반화된다.
- 잘 튜닝된 ATC 계열 휴리스틱을 단일 추론만으로 따라잡거나(작은 규모) 크게 앞선다(큰 규모).

반도체 fab의 디스패칭 로직 관점에서 보면, 이 접근의 매력은 명확하다. 현장은 작업·장비 구성이 수시로 바뀌는데, **매번 규칙을 다시 튜닝하지 않고 학습된 정책 하나로 다양한 규모를 커버**할 수 있다면 운영 부담이 크게 준다.

저자들이 밝힌 후속 과제는 두 갈래다. 하나는 기계 고장·주문 변경 같은 **동적·확률적(dynamic & stochastic) 환경**으로의 확장이고, 다른 하나는 release time·eligibility 변화 등 시나리오 차이에 빠르게 적응하는 **메타러닝(meta-learning)** 기반 학습이다. 결정론적 스케줄을 rolling horizon으로 반복 적용하는 기존 방식 대비, RL의 강점이 더 두드러질 영역이다.

---

**출처**: Sang-Hyun Cho, Hyun-Jung Kim, Lars Mönch. "Reinforcement Learning for Unrelated Parallel Machine Scheduling with Release Dates, Setup Times, and Machine Eligibility." *Proceedings of the 2024 Winter Simulation Conference (WSC)*, pp. 1773–1784. DOI: [10.1109/WSC63780.2024.10838725](https://doi.org/10.1109/WSC63780.2024.10838725)