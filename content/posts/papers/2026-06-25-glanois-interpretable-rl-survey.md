---
title: (2024) A Survey on Interpretable Reinforcement Learning
date: 2026-06-25
tags:
  - XAI
private: true
---

[[posts/papers/2026-06-25-bekkemoen-xrl-slr-taxonomy|Bekkemoen 서베이]]가 "설명(explainability)"을 *언제·누구를 위해* 만드는지로 XRL을 정리했다면, [Glanois et al., *A Survey on Interpretable Reinforcement Learning*](https://arxiv.org/abs/2112.13112) (Machine Learning, 2024, 113:5847–5890)은 **"해석 가능성(interpretability)"** 쪽에 초점을 둔다. 둘은 비슷해 보여도 강조점이 다르다. 이 서베이의 가장 큰 가치는 RL 파이프라인을 **구성요소별로 쪼개, 각 부분을 어떻게 해석 가능하게 만들 수 있는지**를 망라했다는 점이다.

## 1. Interpretability vs Explainability

저자들은 둘을 명확히 구분한다.

- **Interpretability(해석 가능성)** = *모델 자체의 속성*. 모델이 본질적으로 읽을 수 있게 만들어져 있다(intrinsic).
- **Explainability(설명 가능성)** = *사후 연산*. black box를 두고 proxy(대리 설명기)를 개입시켜 설명을 만든다(post-hoc).

이 서베이는 전자, 즉 **처음부터 투명하게 설계하는** 쪽을 다룬다. high-stake 도메인(자율주행·의료, 그리고 나는 여기에 반도체 fab을 더한다)에서는 배포 *전에* 정책을 검사·검증할 수 있어야 하므로 intrinsic interpretability가 중요하다는 문제의식이다.

## 2. Taxonomy: RL 파이프라인을 구성요소로 쪼갠다

핵심 골격은 RL을 네 부분으로 나눠 각각의 해석 가능성을 따지는 것이다.

### 2.1 Interpretable Inputs (입력의 해석 가능성)

raw 픽셀·고차원 벡터 대신, **구조화·상징화된 상태 표현**을 쓴다.

- Relational MDP / Relational RL: 일차 논리(first-order logic)로 객체와 관계를 표현.
- 상징 표현 학습: 비지도 클러스터링·template matching으로 symbol grounding, **Deep Symbolic RL(DSRL)**.
- 관계 표현: 객체 간 상호작용을 **GNN**으로.
- 계층적: 상위는 상징적 지식, 하위는 신경망 컨트롤러.

### 2.2 Interpretable Transition Models (전이/dynamics 모델)

환경이 어떻게 변하는지를 읽을 수 있는 모델로.

- 확률적: 결정 트리, graphical model, Gaussian process, relational action schema.
- 결정적: **Object-Oriented MDP**, deictic 표현, physics engine.
- 신경망 기반이되 구조적: GNN dynamics, object-level 예측(OLRL), entity-centric perception-prediction(OP3).

### 2.3 Interpretable Preference/Reward Models (선호/보상 모델)

보상이 무엇을 원하는지를 명시적으로.

- 논리 기반: **Linear Temporal Logic(LTL)** 명세, **reward machine**(유한상태기계).
- 관계적: relational 도메인에서의 inverse RL.
- 학습된 모델: adversarial inverse RL로 얻은 결정 트리 보상, Boolean task algebra.

저자들은 이 영역이 transition 모델 해석보다 **상대적으로 덜 연구됐다**고 지적한다. "보상이 무엇을 원하는지의 해석 가능성은 환경 dynamics 해석만큼, 혹은 그 이상으로 중요하다"는 문장이 인상적이다.

### 2.4 Interpretable Policy (정책의 해석 가능성)

가장 분량이 많은 부분. 네 갈래로 정리된다.

- **Direct (해석 가능한 정책 공간에서 직접 탐색)**: 경사하강으로 학습하는 결정 트리, multi-armed bandit·유전 알고리즘으로 찾는 수식(formula), fuzzy controller, 논리 규칙(**Neural Logic RL(NLRL)**, differentiable ILP), 프로그램(연속-이산 완화).
- **Indirect (black box를 distill)**: **VIPER**(Q-함수 안내 + DAgger로 결정 트리 추출), **Mixture of Expert Trees(MOET)**, **PIRL/NDPS**(프로그램 탐색으로 해석 가능 정책), RNN에서 유한상태기계 추출.
- **Architectural inductive bias**: 관계 제약을 위한 GNN, 논리 추론을 위한 **Neural Logic Machines(NLM)**, attention(공간 패치·self-attention 병목).
- **Regularization**: 신경망에 smoothness 규제, model-based/model-free 하이브리드의 alignment 규제.

> 앞서 본 [[posts/papers/2026-06-25-li-interpretable-drl-scheduling-decision-tree|Li et al.의 IRL]]은 정확히 여기서 "Indirect → VIPER 계열(DAgger 기반 트리 distillation)"에 해당한다. 이 서베이의 taxonomy가 개별 방법의 위치를 잡아주는 좌표계 역할을 한다.

## 3. 핵심 난제

저자들이 꼽는 열린 문제들:

- **확장성 vs 해석 가능성의 상충.** "(PO)MDP에 좋은 정책을 찾는 것"과 "그 정책을 해석 가능하게 유지하는 것"이 규모가 커질수록 모순된다. direct 방식은 toy 문제를 넘으면 잘 안 큰다.
- **symbol grounding의 자율성.** 고차원·노이즈 환경에서 agent가 *스스로* 유의미한 추상(symbol)을 뽑는 건 여전히 어렵다.
- **검증·안전.** 학습된 해석 가능 정책을 형식적으로 verify하거나 탐험 중 안전을 보장하는 연구가 부족.
- **선호 모델 해석의 미성숙**(위 2.3).
- **수작업 지식 의존.** 계층·상징 방식 다수가 사람이 만든 상징 지식에 기대 일반화가 제한된다.
- **attention–해석 가능성의 간극.** attention이 곧 설명이라는 통념은 시나리오에 따라 논쟁적이다.

## 4. 실 적용·구현 관점에서의 의견 (FAB Machine–Lot 할당 설명 Agent)

이 서베이는 내 과제를 **"설명을 덧붙이기"가 아니라 "처음부터 해석 가능하게 설계하기"의 메뉴판**으로 다시 보게 한다.

- **입력(2.1)에서 이미 승부가 난다.** fab state를 raw 벡터로 욱여넣는 대신, lot·장비·step을 노드로 한 **관계 그래프(GNN)** 로 구조화하면 "이 결정은 이 lot–장비 관계 때문"이라는 설명이 모델 구조에서 자연스럽게 나온다. [[posts/papers/2026-06-22-l2d-jobshop-gnn-ppo|L2D의 disjunctive graph]]가 좋은 출발점이고, 해석 가능성 관점에서도 그 선택이 유리하다.

- **보상의 해석 가능성(2.3)을 과소평가하지 않는다.** fab 디스패칭에서 미스얼라인먼트의 99%는 보상 가중치에서 온다. LTL·reward machine으로 "납기 위반은 절대 회피, 그 다음 setup 최소화" 같은 **우선순위를 명시적 명세로** 표현하면, 정책이 그 명세를 어떻게 따르는지 설명하기가 훨씬 쉽다. 다목적 가중합을 블랙박스로 두는 관행보다 이쪽이 설명 친화적이다.

- **"확장성 vs 해석 가능성" 상충을 정면으로 받는다.** fab은 toy가 아니다. 따라서 direct 방식(전부 트리·논리로 학습)으로 SOTA 성능을 기대하긴 어렵다. 현실적 절충은 **고성능 신경망 정책 + indirect distillation(VIPER 계열)** 이며, 이는 [[posts/papers/2026-06-25-li-interpretable-drl-scheduling-decision-tree|Li et al.]]이 HPC에서 실제로 보여준 경로다. 즉 이 서베이는 "왜 우리가 순수 해석 가능 정책이 아니라 distillation을 택해야 하는가"에 대한 이론적 근거를 준다.

- **attention을 설명이라 부르지 않는다.** 정책망에 attention을 넣어 "이 lot에 주목했다"를 보여주고 싶은 유혹이 크지만, 서베이의 경고대로 attention 가중치가 인과적 설명이라는 보장은 없다. attention은 보조 단서로만 쓰고, 신뢰할 설명은 counterfactual·surrogate로 교차 검증해야 한다.

요약: Bekkemoen가 "설명 기법 고르는 법"이라면, Glanois는 **"애초에 해석 가능하게 짓는 법"** 의 카탈로그다. 내 Agent의 장기 로드맵(intrinsic 단계)에서 입력·보상·정책 각 층위에 무엇을 심을지 결정할 때 직접 펴놓고 볼 표다.

## 참고문헌

- Glanois, Weng, Zimmer, Li, Yang, Hao, Liu. *A Survey on Interpretable Reinforcement Learning.* Machine Learning, 2024, 113(8):5847–5890. [arXiv:2112.13112](https://arxiv.org/abs/2112.13112)
