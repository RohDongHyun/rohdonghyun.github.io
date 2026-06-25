---
title: (2025) Design Patterns of Deep Reinforcement Learning Models for Job Shop Scheduling Problems
date: 2026-06-25
tags:
  - AI Scheduling
private: true
---

다른 네 글이 "학습된 정책을 어떻게 설명하나(XAI/IRL)"였다면, [Wang, Li, Jiao, Ma, *Design patterns of deep reinforcement learning models for job shop scheduling problems*](https://doi.org/10.1007/s10845-024-02454-8) (Journal of Intelligent Manufacturing, 2025, 36(6):3741–3759)는 그 한 단계 앞, **"JSSP용 DRL 모델을 어떻게 짜는가"의 설계 어휘(design pattern)** 를 정리한 서베이다. 직접적인 설명가능성 논문은 아니지만, 내 과제 관점에서 중요한 이유가 있다 — **state·action·reward를 어떻게 표현하느냐가 그 정책이 얼마나 설명 가능한지를 처음부터 결정**하기 때문이다. 설명 Agent를 나중에 붙이려면, 설명하기 쉬운 표현을 *애초에* 골라야 한다.

## 1. 동기: 난립하는 DRL 스케줄러를 공통 언어로

DRL 기반 스케줄링은 메타휴리스틱과 **대등한 해 품질을 더 높은 효율과 강한 일반화**로 낸다는 것이 받아들여졌지만, 논문마다 state·action·reward·신경망 구조를 제각각 정의해 비교가 어렵다. 저자들은 소프트웨어 공학의 "design pattern" 개념을 빌려, DRL 스케줄링 모델을 **다섯 구성요소로 분해**하고 각 요소의 전형적 패턴과 그 조합을 정리한다.

다섯 구성요소: **agent, environment, state, action, reward.** 아래는 이 분해 틀과, 각 요소에서 문헌상 흔히 관찰되는 패턴들이다.

## 2. 구성요소별 design pattern

### 2.1 State (상태 표현)

정책이 무엇을 "보는가". 표현 선택이 일반화·설명가능성에 가장 큰 영향을 준다.

- **Disjunctive graph + GNN**: operation을 노드로, 선후행·기계공유를 arc로. 크기에 무관(size-agnostic)하게 일반화된다. ([[posts/papers/2026-06-22-l2d-jobshop-gnn-ppo|L2D]]가 대표.)
- **Feature matrix / 수치 벡터**: 기계별·job별 속성(잔여 처리시간, 대기, due 등)을 행렬·벡터로. 단순하지만 크기 고정에 묶이기 쉽다.
- **Image-like 표현**: 스케줄 상태를 이미지처럼 만들어 CNN에 입력.

### 2.2 Action (행동 정의)

정책이 무엇을 "고르는가".

- **Operation/lot 직접 선택**: 디스패치 가능한 operation(또는 lot) 중 하나를 직접 선택. (L2D식.)
- **Priority Dispatching Rule(PDR) 선택**: SPT·MWKR 같은 휴리스틱 *규칙*들 중 지금 쓸 규칙을 고름. 행동공간이 작고, **선택된 규칙 자체가 곧 사람이 읽을 수 있는 설명**이 된다.
- **기계 할당 / 직접 배치**: flexible JSSP에서 operation–기계 짝을 정함.

### 2.3 Reward (보상)

무엇을 최적화하는가.

- **Makespan 기반**: 완료시각·그 lower bound 감소분을 보상으로(L2D식 telescoping).
- **Utilization / idle-time 기반**: 기계 가동률, 유휴 최소화.
- **Tardiness / due-date 기반**: 납기 위반 최소화.
- **다목적 가중합**: 위 항들의 결합 (현실 fab에서 가장 흔함).

### 2.4 Agent (알고리즘)

- **Value-based**: DQN/DDQN 계열.
- **Policy-gradient / actor-critic**: PPO, A2C 등. (안정성 때문에 PPO가 사실상 표준화.)
- **인코더 결합**: GNN·attention 백본을 위 알고리즘과 합침.

### 2.5 Environment (환경)

- **이산사건 시뮬레이션(DES)** 위에서 동작.
- **static vs dynamic**: job 동적 도착·기계 고장 등 불확실성을 포함하는지.

## 3. 패턴 조합과 일반화된 절차

논문의 또 다른 기여는 이 요소들이 **아무렇게나 섞이지 않고 전형적 조합으로 묶인다**는 관찰이다. 예컨대 "disjunctive graph state + operation 직접 선택 action + makespan LB 보상 + GNN 인코더 + PPO"는 L2D로 대표되는 강력한 한 조합이다. 저자들은 이런 조합 위에서 **학습 아키텍처·절차(모델 구성 → 시뮬레이터 학습 → solver로 배포)** 와 평가지표까지 일반화해 제시한다. 즉 새 스케줄링 문제를 만났을 때 "어느 칸에서 무엇을 고를지"를 메뉴처럼 짚게 해주는 틀이다.

## 4. 실 적용·구현 관점에서의 의견 (FAB Machine–Lot 할당 설명 Agent)

이 논문은 설명 논문이 아니지만, 내 과제에 **"설명가능성은 모델 설계 단계에서 결정된다"는 관점**을 준다.

- **Action 표현이 설명 난이도를 좌우한다.** 가장 강조하고 싶은 점이다. *operation 직접 선택*으로 짜면 "왜 이 lot?"의 설명을 SHAP·counterfactual로 사후에 캐내야 한다. 반대로 *PDR 선택*으로 짜면 정책의 출력이 "지금은 SPT를 적용"처럼 **그 자체로 자기설명적**이다. fab 엔지니어에게 "EDD 규칙을 골랐다"는 "장비B를 골랐다(이유는 신경망 안에)"보다 비교 불가능하게 설득력 있다. 설명 Agent를 별도로 붙이는 비용을 줄이려면, **행동공간을 해석 가능한 규칙 수준으로 올리는 설계**를 진지하게 검토해야 한다. (성능 상한은 다소 내려갈 수 있어 hybrid가 현실적: 평소 규칙 선택, 경합 구간만 세밀 선택.)

- **State를 그래프로 두면 설명도 관계로 말할 수 있다.** [[posts/papers/2026-06-25-glanois-interpretable-rl-survey|Glanois 서베이]]에서 본 "interpretable inputs"와 같은 맥락이다. disjunctive/관계 그래프 state는 "이 lot–장비 edge의 특성이 결정을 밀었다"는 관계 기반 설명을 가능케 한다. feature 벡터보다 설명 친화적이다.

- **Reward를 다목적 가중합 한 덩어리로 두지 않는다.** [[posts/papers/2026-06-25-li-interpretable-drl-scheduling-decision-tree|Li et al.]]이 보였듯 보상 구조가 곧 정책 논리이고, 미스얼라인먼트의 근원이다. 보상을 항(makespan/tardiness/setup)별로 **분해 가능하게(decomposed reward)** 유지하면, 나중에 "이 결정은 setup 항이 8할을 끌었다"는 **reward-attribution 설명**을 그대로 뽑을 수 있다. 설계 단계의 작은 결정이 설명 단계에서 큰 차이를 만든다.

- **공통 어휘로 우리 모델을 문서화한다.** 이 5요소 분해는 팀 내 과제 산출물(모델 카드)을 표준화하는 데 바로 쓸 수 있다. "우리 디스패처 = {graph state, hybrid action, decomposed reward, GNN+PPO, dynamic DES}"처럼 한 줄로 기술하면, 어느 칸이 설명을 어렵게 만드는지 한눈에 보이고 개선 우선순위가 잡힌다.

요약: 이 서베이는 설명가능성을 직접 다루진 않지만, **"설명하기 쉬운 정책은 설명을 잘 붙여서가 아니라 잘 설계해서 나온다"**는 교훈을 준다. 내 Agent 과제의 진짜 첫 단추는 사후 XAI 기법 선택이 아니라, state/action/reward를 **설명 친화적 패턴**으로 고르는 모델 설계 그 자체다.

## 참고문헌

- Wang, Li, Jiao, Ma. *Design patterns of deep reinforcement learning models for job shop scheduling problems.* Journal of Intelligent Manufacturing, 2025, 36(6):3741–3759. [DOI: 10.1007/s10845-024-02454-8](https://doi.org/10.1007/s10845-024-02454-8)
