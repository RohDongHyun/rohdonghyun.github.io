---
title: (2025) Design Patterns of Deep Reinforcement Learning Models for Job Shop Scheduling Problems
date: 2026-06-25
tags:
  - AI Scheduling
private: true
---

다른 네 글이 "학습된 정책을 어떻게 설명하나(XAI/IRL)"였다면, [Wang, Li, Jiao, Ma, *Design patterns of deep reinforcement learning models for job shop scheduling problems*](https://doi.org/10.1007/s10845-024-02454-8) (Journal of Intelligent Manufacturing, 2025, 36:3741–3759)는 그 한 단계 앞, **"JSSP용 DRL 모델을 어떻게 짜는가"의 설계 어휘(design pattern)** 를 정리한 서베이다(South China Univ. of Tech.). 직접적인 설명가능성 논문은 아니지만, 내 과제 관점에서 중요한 이유가 있다 — **state·action·reward를 어떻게 표현하느냐가 그 정책이 얼마나 설명 가능한지를 처음부터 결정**하기 때문이다. 실제로 이 논문 스스로 "rule·attribute 기반 표현은 의미가 명확해 DRL 결정 과정의 해석가능성을 높인다"고 명시한다.

## 1. 동기: 난립하는 DRL 스케줄러를 공통 언어로

DRL 기반 스케줄링은 메타휴리스틱과 **대등한 해 품질을 더 높은 효율과 강한 일반화**로 낸다는 것이 받아들여졌지만, 논문마다 state·action·reward·신경망 구조를 제각각 정의해 비교가 어렵다. 저자들은 소프트웨어 공학의 "design pattern" 개념을 빌려, DRL 스케줄링 모델을 **다섯 구성요소(Agent, Environment, State, Action, Reward)** 로 분해하고 각 요소의 전형적 패턴과 그 조합을 2013–2023 문헌(약 44편)에서 통계적으로 정리한다.

## 2. 구성요소별 design pattern

### 2.1 Agent (3 패턴)

DRL 알고리즘 분류와 직결된다. **value-based**(Q/V 함수 + ε-greedy 정책; DQN. 가장 많이 쓰임), **policy-based**(DNN이 정책 함수를 직접 근사, $R(\tau)$ 최대화), **actor-critic**(정책망+가치망 두 DNN을 번갈아 갱신; 둘의 절충).

### 2.2 Environment (2 패턴)

환경은 시점마다 진화하는 임시 스케줄(TSS)로 표현된다. **partial solution-based**(매 step에 operation 하나씩 추가, $|O|$ step이면 완성되는 **episodic** task. 대다수 연구가 채택) vs **whole solution-based**(완전·실행가능한 TSS를 초기화한 뒤 매 step 수정하는 **continuous** task; rescheduling에 적합). 부분해 방식은 중간 TSS가 미완이라 정확한 성능지표를 못 구해 보상 설계가 더 어렵고, 전체해 방식은 GA·SA 같은 고전 기법과 결합이 쉽다.

### 2.3 State (3 패턴)

정책이 무엇을 "보는가". 일반화·설명가능성에 가장 큰 영향.

- **Matrix-based**: job·machine 속성을 행렬(이미지의 RGB 채널처럼)에 담아 CNN으로 처리. 직관적이지만 **행렬 크기가 문제 규모에 묶여 일반화가 약하다.**
- **Statistic-based**: gross(총량)·relative(비율)·average(평균) 통계 지표로 상태를 표현, 보통 MLP. **가장 흔한** 패턴이고 복잡한 문제도 표현 가능하나, **지표 선택의 신뢰할 만한 방법이 없어** 경험·직관에 의존하고 일반화를 약화시킨다.
- **Graph-based**: disjunctive graph(혹은 변형) + GNN/attention으로 노드·그래프 feature 추출. 지표 선택 문제를 피하고 일반화에 유리하다. 단 disjunctive graph는 FJSP 등엔 표현력이 부족하고 GNN은 학습 비용이 크다. ([[posts/papers/2026-06-22-l2d-jobshop-gnn-ppo|L2D]]가 대표.)

### 2.4 Action (4 패턴)

정책이 무엇을 "고르는가". **이 선택이 설명 난이도를 좌우한다.**

- **Rule-based**: 정책이 SPT·G&P 등 휴리스틱 *규칙*들의 확률을 출력 → 이긴 규칙이 operation을 고름. 행동공간이 문제 규모와 무관(일반화 유리)하고, **규칙에 명확한 의미가 있어 그 자체로 설명적**이다.
- **Operation-based**: 각 operation의 확률을 직접 출력. 행동공간 크기 = operation 수라 규모에 묶여 일반화가 약하다(RNN으로 완화). feasible op만 출력하는 partial-operation 변형은 행동수 ≤ job 수.
- **Attribute-based**: operation을 describe하는 attribute 예측값을 출력 → 값이 가장 가까운 op 선택. attribute 수가 op·job·machine 수와 무관(규모 독립).
- **Graph-based**: operation 속성을 그래프로 구조화, GNN으로 추출해 op별 확률 출력. 규모 독립이고 attribute 선택 부담을 덜어준다.

논문은 명시한다 — **rule·attribute는 의미가 definite해 해석가능성에 기여**하지만, 보통 경험적으로 선택되어 "최적화력과 적응력을 두루 갖춘 규칙·attribute 집합 설계"가 여전히 난제라고.

### 2.5 Reward (3 패턴)

여기서 분류축이 "무엇을 최적화하나(makespan/tardiness…)"가 아니라 **"보상 신호를 어떻게 구성하나"** 임에 주의.

- **Temporary value-based**: 부분해용. TSS가 미완이라 실제 목표값을 못 구하므로, **추정 목표값**(예: makespan lower-bound)으로 매 step **dense** 보상을 만든다. 누적이 $C^{LB}_{max}(s_1)-C_{max}$로 telescoping되어 makespan 최소화와 정합.
- **Final value-based**: 전체해용. 완전한 TSS라 실제 목표값을 써 $r_t = C_{max}(s_t)-C_{max}(s_{t+1})$ 형태.
- **Discrete value-based**: 목표 변화의 방향·크기를 +1/−1/0 같은 **이산값**으로 코딩. 거칠지만(coarse) 부분·전체해 양쪽에 적용 가능.

temporary·final은 목표와 tightly coupled라 "누적 보상이 곧 목표 최적화인가"로 보상 설계의 타당성을 점검할 수 있는 반면, discrete는 loosely coupled다.

## 3. 패턴 조합과 통계

216개 조합이 가능하지만 문헌엔 28개만 등장한다. 상위 3개: **FPC1** = policy + partial + statistic + operation + temporary, **FPC2** = value + partial + statistic + rule + temporary, **FPC3** = policy + partial + **graph + graph** + temporary. 공통적으로 partial 환경 + temporary 보상이 짝을 이룬다. 그리고 FPC1→FPC3로 갈수록 **state·action이 단순 패턴에서 graph-based로 진화**하며(graph 패턴 논문들이 더 최신), 저자들은 graph 표현의 우수성·일반화를 미래 방향으로 짚는다.

평가지표는 4가지: 최적화 목표, 효율(추론이 학습보다 훨씬 빠름), 수렴·안정성, 일반화. 미해결 과제로 FJSP, **다목적 최적화**(보상이 1차원 scalar라 본질적으로 한계 — 큰 돌파가 필요), 다중 agent, 적응형(digital twin·무인 운용), DRL 일반화 이론, 클라우드 제조 자원 스케줄링을 든다.

## 4. 실 적용·구현 관점에서의 의견 (FAB Machine–Lot 할당 설명 Agent)

이 논문은 설명 논문이 아니지만, 내 과제에 **"설명가능성은 모델 설계 단계에서 결정된다"는 관점**을 준다.

- **Action 표현이 설명 난이도를 좌우한다.** 가장 강조하고 싶은 점이고, 논문이 직접 뒷받침한다. *operation 직접 선택*으로 짜면 "왜 이 lot?"을 SHAP·counterfactual로 사후에 캐내야 한다. 반대로 *rule-based*로 짜면 출력이 "지금은 SPT를 적용"처럼 **그 자체로 자기설명적**이다. fab 엔지니어에게 "EDD 규칙을 골랐다"는 "장비B를 골랐다(이유는 신경망 안에)"보다 비교 불가능하게 설득력 있다. 다만 graph-based가 일반화·성능 트렌드인 점과 상충하므로, **평소 rule/attribute 선택 + 경합 구간만 세밀 선택**의 hybrid가 현실적이다.

- **State를 그래프로 두면 설명도 관계로 말할 수 있다.** [[posts/papers/2026-06-25-glanois-interpretable-rl-survey|Glanois 서베이]]의 "interpretable inputs"와 같은 맥락이고, 이 논문도 graph state가 지표 선택의 자의성을 없애 일반화에 유리하다고 본다. "이 lot–장비 edge의 특성이 결정을 밀었다"는 관계 기반 설명이 statistic 벡터보다 친화적이다. 단 disjunctive graph가 FAB 같은 복잡 환경(reentrant·batch·qual)엔 표현력이 부족할 수 있어, 도메인용 그래프 정의 자체가 과제가 된다.

- **Reward 구성 방식을 설명 친화적으로 고른다.** 이 논문의 reward 분류(temporary/final/discrete)는 "신호 구성" 축이지만, 내 과제엔 거기에 **항별 분해(decomposed reward)** 를 더해야 한다. [[posts/papers/2026-06-25-li-interpretable-drl-scheduling-decision-tree|Li et al.]]이 보였듯 보상 구조가 곧 정책 논리이고 미스얼라인먼트의 근원이다. temporary value-based로 dense하게 주되 makespan/tardiness/setup 항을 분리해 두면 "이 결정은 setup 항이 8할을 끌었다"는 **reward-attribution 설명**을 그대로 뽑을 수 있다.

- **공통 어휘로 우리 모델을 문서화한다.** 이 5요소 분해는 팀 내 모델 카드를 표준화하는 데 바로 쓸 수 있다. "우리 디스패처 = {graph state, hybrid action, decomposed-temporary reward, GNN+actor-critic, partial-solution dynamic env}"처럼 한 줄로 기술하면, 어느 칸이 설명을 어렵게 만드는지 한눈에 보이고 개선 우선순위가 잡힌다.

요약: 이 서베이는 설명가능성을 직접 다루진 않지만, **"설명하기 쉬운 정책은 설명을 잘 붙여서가 아니라 잘 설계해서 나온다"**는 교훈을 준다. 내 Agent 과제의 진짜 첫 단추는 사후 XAI 기법 선택이 아니라, state/action/reward를 **설명 친화적 패턴**으로 고르는 모델 설계 그 자체다.

## 참고문헌

- Wang, Li, Jiao, Ma. *Design patterns of deep reinforcement learning models for job shop scheduling problems.* Journal of Intelligent Manufacturing, 2025, 36(6):3741–3759. [DOI: 10.1007/s10845-024-02454-8](https://doi.org/10.1007/s10845-024-02454-8)
