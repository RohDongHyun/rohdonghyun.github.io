---
title: 18. Graph Neural Network
date: 2026-06-22
tags:
  - Introduction to DL
---
* 참고
  * [A Gentle Introduction to Graph Neural Networks (Distill, 2021)](https://distill.pub/2021/gnn-intro/) — 그림이 풍부한 인터랙티브 입문 자료
  * [Stanford CS224W: Machine Learning with Graphs](https://web.stanford.edu/class/cs224w/) — 강의 슬라이드·영상
  * [Hamilton, "Graph Representation Learning" (book, 2020)](https://www.cs.mcgill.ca/~wlh/grl_book/)

이미지·텍스트·시계열 같은 데이터는 격자(grid)나 순열(sequence)이라는 정형 구조 위에 놓여 있어 CNN·RNN으로 다룰 수 있었다. 그러나 현실의 많은 데이터는 **그래프(graph)** 형태, 즉 임의의 개체(node)들이 임의의 관계(edge)로 연결된 비정형 구조를 갖는다. 소셜 네트워크, 분자 구조, 도로망, 그리고 **반도체 FAB의 job–machine 관계나 job shop의 작업 순서 제약**이 모두 그래프다.

**Graph Neural Network (GNN)** 는 이런 그래프 위에서 직접 동작하여 각 node·edge·graph 전체의 표현(embedding)을 학습하는 신경망이다. 이 글은 GNN 기반의 강화학습 스케줄링을 다루기 전 사전 정리로, GNN의 동작 원리와 대표 모델들을 기초부터 상세히 정리한다.

## 왜 그래프인가: CNN/RNN으로는 부족한 이유

CNN과 RNN이 성공한 핵심은 데이터에 내재된 **구조에 대한 가정(inductive bias)** 을 모델에 새겨 넣은 것이다. CNN은 "가까운 픽셀끼리 관련 있다(locality)"는 격자 구조를, RNN은 "앞의 token이 뒤에 영향을 준다"는 순서 구조를 활용한다 (참고: [[posts/foundations/introduction-to-dl/06-convolutional-neural-network]], [[posts/foundations/introduction-to-dl/07-recurrent-neural-network]]).

그래프 데이터는 이런 가정이 통하지 않는다.

- **node 개수가 가변적**이다. 그래프마다 node 수가 다르고, 같은 그래프에서도 시간에 따라 변할 수 있다.
- **node에 정해진 순서가 없다.** 이미지의 픽셀이나 문장의 단어와 달리, node에 1번·2번을 매기는 방식은 임의적이다.
- **이웃의 수가 제각각**이다. 어떤 node는 이웃이 2개, 어떤 node는 100개다.

따라서 GNN이 만족해야 할 핵심 성질은 **permutation invariance / equivariance** 다. node에 번호를 어떻게 매기든(즉 node를 어떻게 재배열하든) 결과가 본질적으로 같아야 한다.

- **Permutation invariance**: 그래프 전체에 대한 출력(예: 분자의 독성 여부)은 node 순서를 바꿔도 변하지 않아야 한다.
- **Permutation equivariance**: node별 출력(예: 각 node의 라벨)은 node를 재배열하면 그 출력도 똑같이 재배열되어야 한다.

> 스케줄링 관점에서 이는 결정적이다. job이 10개든 200개든, job에 매긴 인덱스가 무엇이든 같은 dispatching 규칙이 동작해야 하기 때문이다. 입력 크기와 순서에 무관하게 동작하는 GNN의 성질이 가변 규모 스케줄링 문제에 잘 맞는다.

## 그래프의 표기

그래프를 $G = (V, E)$ 로 쓴다. $V$ 는 node의 집합, $E$ 는 edge의 집합이다. $|V| = n$ 이라 하자.

- **Adjacency matrix** $A \in \mathbb{R}^{n \times n}$: node $i$ 와 $j$ 가 연결되어 있으면 $A_{ij} = 1$, 아니면 $0$. 무방향(undirected) 그래프면 $A$ 는 대칭이다. weighted 그래프면 $A_{ij}$ 가 edge의 가중치다.
- **Degree matrix** $D$: 대각 행렬로 $D_{ii} = \sum_j A_{ij}$ (node $i$ 의 이웃 수).
- **Node feature matrix** $X \in \mathbb{R}^{n \times d}$: 각 node가 $d$ 차원의 초기 feature를 가진다. node $v$ 의 feature를 $x_v$ 로 쓴다.
- **Neighborhood** $N(v)$: node $v$ 와 직접 연결된 이웃 node들의 집합.

edge에도 feature $e_{uv}$ 가 붙을 수 있다 (예: 두 작업 간 셋업 시간).

> 그림 참고: 그래프와 인접 행렬의 대응 관계는 [Distill GNN intro의 "Graphs and where to find them"](https://distill.pub/2021/gnn-intro/) 절에 직관적으로 시각화되어 있다.

## 핵심 아이디어: Message Passing

거의 모든 GNN은 **message passing** (또는 neighborhood aggregation) 이라는 하나의 틀로 설명된다. 핵심 직관은 이렇다.

> 각 node의 표현을, **자기 자신 + 이웃들의 표현**을 모아서 갱신한다. 이를 여러 layer 반복하면, 점점 더 먼 이웃의 정보까지 한 node에 모인다.

이는 CNN의 convolution과 유사하다. CNN이 한 픽셀을 그 주변 픽셀들로 갱신한다면, GNN은 한 node를 그 이웃 node들로 갱신한다. 차이는 이웃의 수와 배치가 그래프마다 불규칙하다는 점이고, 그래서 단순한 가중합이 아니라 **순서에 무관한 집계 함수(permutation-invariant aggregation)** 가 필요하다.

$k$ 번째 layer에서 node $v$ 의 표현 $h_v^{(k)}$ 는 다음과 같이 두 단계로 계산된다.

$$
m_v^{(k)} = \text{AGGREGATE}^{(k)}\left(\left\{ h_u^{(k-1)} : u \in N(v) \right\}\right)
$$

$$
h_v^{(k)} = \text{UPDATE}^{(k)}\left( h_v^{(k-1)},\ m_v^{(k)} \right)
$$

- **AGGREGATE**: 이웃들의 표현을 하나의 메시지 $m_v^{(k)}$ 로 모은다. 이웃 집합을 입력받으므로 **순서에 무관해야 한다**. 보통 sum, mean, max 같은 함수를 쓴다.
- **UPDATE**: 자기 자신의 이전 표현과 모인 메시지를 합쳐 새 표현을 만든다. 보통 학습 가능한 가중치 + 비선형 활성화로 구현한다.

초기값은 $h_v^{(0)} = x_v$ (node의 원래 feature) 이다. layer를 $K$ 번 쌓으면 각 node는 자신으로부터 **$K$-hop 거리 안의 모든 node** 정보를 담은 embedding을 갖게 된다.

> $K$-hop이라는 표현이 핵심이다. layer 1개는 직접 이웃(1-hop), layer 2개는 이웃의 이웃(2-hop)까지 본다. CNN에서 layer를 쌓을수록 receptive field가 커지는 것과 같은 원리다.

이 message passing framework를 일반화·정식화한 것이 Gilmer et al.의 **MPNN (Message Passing Neural Network)** 이다 ([arXiv:1704.01212](https://arxiv.org/abs/1704.01212)). 아래에서 볼 GCN·GraphSAGE·GAT는 모두 AGGREGATE와 UPDATE를 어떻게 구체화하느냐의 차이로 볼 수 있다.

## 대표 모델 1: GCN (Graph Convolutional Network)

Kipf & Welling이 제안한 **GCN** 은 가장 널리 쓰이는 기본형이다 ([arXiv:1609.02907](https://arxiv.org/abs/1609.02907)). layer 갱신을 행렬 형태로 깔끔하게 쓴 것이 특징이다.

$$
H^{(k)} = \sigma\left( \tilde{D}^{-\frac{1}{2}} \tilde{A} \tilde{D}^{-\frac{1}{2}} H^{(k-1)} W^{(k)} \right)
$$

- $\tilde{A} = A + I$ : 인접 행렬에 self-loop를 더한 것. 갱신 시 **자기 자신의 정보도 포함**시키기 위함이다.
- $\tilde{D}$ : $\tilde{A}$ 의 degree matrix.
- $W^{(k)}$ : layer $k$ 의 학습 가능한 가중치.
- $\sigma$ : 비선형 활성화 (보통 ReLU).

$\tilde{D}^{-\frac{1}{2}} \tilde{A} \tilde{D}^{-\frac{1}{2}}$ 는 인접 행렬을 **대칭 정규화(symmetric normalization)** 한 것인데, 이는 degree가 큰 node가 message passing 과정에서 과도하게 큰 값을 갖는 것을 막아준다.

한 node 관점에서 풀어 쓰면 이해가 쉽다.

$$
h_v^{(k)} = \sigma\left( \sum_{u \in N(v) \cup \{v\}} \frac{1}{\sqrt{\tilde{d}_v \tilde{d}_u}}\, W^{(k)} h_u^{(k-1)} \right)
$$

즉 **이웃(과 자신)의 표현을 선형 변환한 뒤, degree로 정규화한 가중치로 합산**하고 활성화를 적용한다. 여기서 AGGREGATE는 "degree로 정규화된 합", UPDATE는 "선형 변환 + 활성화"에 해당한다.

> GCN의 한계: 모든 이웃을 degree 기반의 고정된 가중치로 더하므로, "어떤 이웃이 더 중요한가"를 학습하지 못한다. 또한 학습 시 전체 그래프의 인접 행렬이 필요해 대규모 그래프나 새로 추가된 node(inductive setting)에 약하다.

> 그림 참고: GCN의 layer-wise propagation 도식은 [원 논문 1페이지 Figure 1](https://arxiv.org/abs/1609.02907) 에 있다.

## 대표 모델 2: GraphSAGE

Hamilton et al.의 **GraphSAGE** (SAmple and aggreGatE) 는 GCN의 두 한계 — 전체 그래프 필요·확장성 — 를 겨냥한다 ([arXiv:1706.02216](https://arxiv.org/abs/1706.02216)).

핵심 아이디어 두 가지:

1. **Sampling**: 이웃 전부가 아니라 고정된 수의 이웃만 무작위로 샘플링해 집계한다. 이웃이 수천 개인 node에서도 계산량을 일정하게 유지한다.
2. **Inductive learning**: 특정 node 인덱스가 아니라 **집계 함수 자체**를 학습하므로, 학습에 없던 새 node나 새 그래프에도 일반화된다.

layer 갱신은 다음과 같다.

$$
h_{N(v)}^{(k)} = \text{AGGREGATE}_k\left(\left\{ h_u^{(k-1)} : u \in N(v) \right\}\right)
$$

$$
h_v^{(k)} = \sigma\left( W^{(k)} \cdot \left[ h_v^{(k-1)} \,\|\, h_{N(v)}^{(k)} \right] \right)
$$

여기서 $\|$ 는 concatenation이다. **자기 자신의 표현과 집계된 이웃 표현을 이어 붙여** 변환하는 점이 GCN(합산)과 다르다. AGGREGATE로는 mean, max-pooling, LSTM 등을 쓸 수 있다 (단 LSTM은 순서 의존이므로 입력 이웃을 무작위 순서로 섞어 사용).

> 새로운 job·machine이 수시로 들어오는 스케줄링 환경에서는, 학습 때 보지 못한 node에도 동작하는 inductive 성질이 특히 중요하다.

## 대표 모델 3: GAT (Graph Attention Network)

Veličković et al.의 **GAT** 는 GCN의 고정 가중치 대신 **attention**을 도입해 "이웃마다 중요도를 다르게" 학습한다 ([arXiv:1710.10903](https://arxiv.org/abs/1710.10903)). Transformer의 self-attention을 그래프로 옮긴 것으로 볼 수 있다 (참고: [[posts/foundations/introduction-to-dl/11-transformer-and-self-attention]]).

먼저 node $v$ 와 이웃 $u$ 사이의 **attention score**를 계산한다.

$$
e_{vu} = \text{LeakyReLU}\left( a^\top \left[ W h_v^{(k-1)} \,\|\, W h_u^{(k-1)} \right] \right)
$$

이를 $v$ 의 모든 이웃에 대해 softmax로 정규화하여 attention 계수를 얻는다.

$$
\alpha_{vu} = \frac{\exp(e_{vu})}{\sum_{w \in N(v)} \exp(e_{vw})}
$$

마지막으로 이 계수로 이웃 표현을 가중합한다.

$$
h_v^{(k)} = \sigma\left( \sum_{u \in N(v)} \alpha_{vu}\, W h_u^{(k-1)} \right)
$$

GCN이 degree로 정해진 고정 가중치 $\frac{1}{\sqrt{\tilde{d}_v \tilde{d}_u}}$ 를 썼다면, GAT는 이를 **데이터로부터 학습되는 $\alpha_{vu}$** 로 대체한 셈이다. Transformer처럼 **multi-head attention**을 적용해 여러 종류의 관계를 동시에 포착할 수도 있다.

> 그림 참고: GAT의 attention 계산 도식은 [원 논문 Figure 1](https://arxiv.org/abs/1710.10903) 에 있다. 어떤 이웃에 더 큰 가중치를 주는지가 학습되는 구조다.

## Task 종류와 Readout

GNN의 출력은 풀려는 문제에 따라 세 수준으로 나뉜다.

- **Node-level**: 각 node의 embedding $h_v^{(K)}$ 를 그대로 사용. 예) 각 node 분류, 스케줄링에서 각 job의 우선순위 점수.
- **Edge-level**: 두 node embedding을 결합해 예측. 예) link 예측, 두 작업 사이에 어떤 순서를 둘지.
- **Graph-level**: 모든 node embedding을 하나로 합쳐 그래프 전체에 대한 값을 예측. 예) 분자 전체의 독성, 현재 스케줄 상태 전체의 가치(value).

graph-level 출력에는 모든 node 표현을 하나의 벡터로 합치는 **readout** (또는 graph pooling) 이 필요하다. 이 역시 node 순서에 무관해야 하므로 순열 불변 함수를 쓴다.

$$
h_G = \text{READOUT}\left(\left\{ h_v^{(K)} : v \in V \right\}\right)
$$

가장 단순하게는 sum / mean / max pooling을 쓴다. 어떤 readout을 쓰느냐가 모델의 표현력에 영향을 준다. Xu et al.의 **GIN (Graph Isomorphism Network)** 은 sum 집계가 mean·max보다 표현력이 강함을 이론적으로 보이고, message passing 방식 GNN이 서로 다른 두 그래프를 구분할 수 있는 능력의 상한이 **Weisfeiler-Lehman (WL) test** 와 같음을 정리했다 ([arXiv:1810.00826](https://arxiv.org/abs/1810.00826)). WL test란 각 node를 "자기 색 + 이웃 색들의 모음"으로 반복 갱신해 두 그래프가 같은(동형, isomorphic) 구조인지를 판정하는 고전 알고리즘으로, message passing이 하는 일과 본질적으로 같다.

## 알아두어야 할 한계: Over-smoothing과 Over-squashing

GNN의 layer를 무작정 깊게 쌓으면 오히려 성능이 나빠진다. 두 가지 대표적 현상이 있다.

- **Over-smoothing**: layer를 거듭할수록 모든 node의 표현이 서로 비슷해져 구분이 불가능해지는 현상. message passing이 반복되면 정보가 그래프 전체로 평균화되기 때문이다. 그래서 GCN류는 보통 2~3 layer만 쌓는다 ([Li et al., 2018, arXiv:1801.07606](https://arxiv.org/abs/1801.07606)).
- **Over-squashing**: 멀리 떨어진 node 정보를 한 node로 전달할 때, 좁은 경로(bottleneck)를 거치며 지수적으로 많은 정보가 고정 크기 벡터에 압축되어 손실되는 현상 ([Alon & Yahav, 2021, arXiv:2006.05205](https://arxiv.org/abs/2006.05205)).

이를 완화하기 위해 residual/skip connection, normalization, 그래프 구조 재배선(rewiring) 등이 연구된다. skip connection이 깊은 망에서 효과적이라는 점은 CNN(ResNet)에서와 같은 맥락이다.

## 스케줄링으로의 연결

마지막으로 이 글의 목적인 강화학습 스케줄링과의 연결을 짚는다. job shop scheduling 같은 문제는 자연스럽게 그래프로 표현된다.

- 각 **operation(작업)** 을 node로 두고, 같은 job 내 작업 순서를 방향 edge(conjunctive), 같은 machine을 두고 경쟁하는 작업들을 무방향 edge(disjunctive)로 잇는 **disjunctive graph** 가 고전적 표현이다.
- node feature로는 처리 시간, 남은 작업 수, 현재 상태 등을 넣는다.

이 그래프에 GNN을 적용하면, **가변 개수의 job·machine을 순서·크기에 무관하게** 처리하면서 각 작업의 embedding을 얻을 수 있다. 강화학습에서는 이 embedding을 정책(policy)에 넣어 "다음에 어떤 작업을 어떤 machine에 올릴지"를 결정한다. node-level 출력은 각 작업의 우선순위(action logit)로, graph-level readout은 현재 상태의 가치(value)로 쓰인다 (참고: [[posts/foundations/introduction-to-rl/09-actor-critic-policy-gradient]]).

> 대표적으로 Zhang et al., "Learning to Dispatch for Job Shop Scheduling via Deep Reinforcement Learning" (NeurIPS 2020, [arXiv:2010.12367](https://arxiv.org/abs/2010.12367)) 은 disjunctive graph + GNN + PPO(Proximal Policy Optimization, 대표적 policy gradient 알고리즘)로 크기 일반화가 되는 dispatching 정책을 학습한다. GNN을 쓰는 결정적 이유가 바로 **문제 크기에 무관한 정책 학습**이다.

전통적 dispatching rule(예: SPT, FIFO)이 사람이 설계한 고정 규칙이라면, GNN 기반 RL은 그래프 구조로부터 규칙 자체를 데이터로 학습한다는 점에서 차별화된다. 이후 글에서는 이 disjunctive graph 표현과 GNN 정책을 결합한 강화학습 스케줄링을 구체적으로 다룬다.
