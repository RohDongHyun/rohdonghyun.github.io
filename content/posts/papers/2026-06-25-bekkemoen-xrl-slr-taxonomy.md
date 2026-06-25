---
title: "(2024) Explainable Reinforcement Learning (XRL): A Systematic Literature Review and Taxonomy"
date: 2026-06-25
tags:
  - XAI
private: true
---

개별 XRL 기법 논문이 아니라, **"설명 가능한 강화학습(XRL) 분야 전체의 지도"** 를 그리는 서베이다. [Bekkemoen, *Explainable reinforcement learning (XRL): a systematic literature review and taxonomy*](https://doi.org/10.1007/s10994-023-06479-7) (Machine Learning, 2024, 113:355–441)는 기존 XRL 리뷰 10편과 2017–2022.7 사이 XRL 연구 **189편**을 체계적 문헌고찰(SLR)로 모아 새 taxonomy로 분류하고, **각 기법을 stakeholder의 질문과 연결**한다(저자 1인, NTNU). 어떤 설명 기법을 고를지 막막할 때 출발점으로 삼기 좋다. 범위는 단일 agent XRL로 한정(multi-agent RL 제외).

## 1. 왜 이 서베이가 유용한가

XRL은 saliency, 결정 트리 distillation, reward decomposition, counterfactual 등 기법이 난립한다. 각 기법은 **서로 다른 질문에 답하고, 서로 다른 이해관계자를 위한 것**인데, 개별 논문만 읽으면 이 지형이 안 보인다. Bekkemoen은 189편을 두 개의 축으로 분류해 "내 상황엔 어떤 부류의 기법이 맞나"를 판단하게 해준다. 또한 supervised learning XAI와 달리 RL은 **순차적 의사결정**(단기·장기 결과)을 설명해야 한다는 차이를 강조한다 — 즉시 응답만 설명하는 기존 XAI로는 부족하다는 문제의식이다.

## 2. Taxonomy: 두 개의 직교 축

이 서베이의 핵심 기여는 XRL 기법을 **두 축**으로 본 점이다.

### 2.1 축 1 — 설명이 어디서 오는가 (3 갈래)

- **Interpretable Agent (IA, 18편).** agent 자체를 단순 함수근사기로 만들어, **모델이 곧 설명**이 되게 한다. 표현 자체가 정책이므로 설명이 **본질적으로 충실(faithful)** 하고, inductive bias 덕에 일반화에도 유리하다. 기능형태별 하위분류: rule-based / mathematical expression / logic-based / tree-based / program-based. 한계는 저차원·해석 가능 feature 환경에서만 검증됐다는 것(픽셀 입력 등엔 곧장 안 통함).
- **Intrinsic Explainability (IE, 61편).** 학습 *전에* RL 시스템을 손봐 설명을 내장한다(예: attention bottleneck). 정책은 신경망이지만 설명 구조가 박혀 있다. 특징: **성능이 유지되거나 오히려 향상**되는 경우가 많다. 단, 특정 아키텍처·알고리즘에 묶이고, **사전 학습된 agent는 다시 학습/파인튜닝하지 않으면 설명할 수 없다.**
- **Post Hoc Explainability (PHE, 112편).** 학습된 black box를 **건드리지 않고** 바깥에서 설명을 추출한다. 성능에 영향이 없고, 종종 내부 접근 없이 입출력만으로 동작한다(일부는 gradient 필요). 가장 큰 부류다.

> IE와 PHE는 겹치지만, 저자는 ① 성능 영향 ② 아키텍처 의존 ③ 사전학습 agent 적용 가능 여부 ④ 접근 요구의 차이로 둘을 가른다. 이 셋은 supervised XAI의 "intrinsic(투명) vs post-hoc" 구분을 RL에 맞게 정밀화한 것이다.

### 2.2 축 2 — 설명을 어떻게 전달하는가 (3 갈래)

IE·PHE 안에서, 설명이 **(1) via generation**(설명을 새로 생성), **(2) via representation**(해석 가능한 표현으로 제시 — 예: distill한 트리), **(3) via inspection**(내부를 들여다봄)으로 나뉜다. 축 1과 직교하므로, 둘을 교차하면 한 기법의 좌표가 또렷해진다.

이 틀에 앞서 본 두 논문을 얹으면 깔끔하다. [[posts/papers/2026-06-25-li-interpretable-drl-scheduling-decision-tree|Li et al.의 트리 distillation]]은 PHE × **agent distillation(via representation)**, [[posts/papers/2026-06-25-immordino-xai-rl-semiconductor-scheduling|Immordino의 SHAP·counterfactual·surrogate tree]]는 PHE의 feature importance·distillation 조합이다.

부가로 scope도 분류한다: **global**(여러 상태에 걸친 전반 행동) vs **local**(소수 상태의 논리). local은 다시 "단기·장기 결과를 설명" vs "즉시 맥락만 설명"으로 나뉜다.

## 3. Stakeholder 질문 → 6가지 설명 유형

이 서베이의 또 다른 핵심은 기법을 **"어떤 질문에 답하는가"** 로 연결한 점이다. 여섯 유형:

- **How** — agent가 전반적으로 어떻게 동작하나 (global).
- **What** — agent가 무엇을 했나/할 것인가 (서술).
- **Why** — 왜 이 행동을 했나 (정당화).
- **Why not** — 왜 그 행동은 안 했나 (contrastive/대조 설명).
- **What if** — 이렇게 바뀌면 어떻게 행동하나 (counterfactual).
- **How to** — 원하는 행동을 끌어내려면 무엇을 바꿔야 하나 (counterfactual).

여기에 두 **RL 설명 특성**을 덧붙여 같은 "why"라도 결을 구분한다: (a) **단기·장기 결과**를 담는가, (b) **model 정보**(전이·보상 함수)를 활용하는가.

## 4. 어떤 질문엔 어떤 기법인가 (9.2 추천)

만능 기법은 없다. 질문 유형별 권고를 정리하면:

- **How** → important states & transitions(HIGHLIGHTS), state abstraction, agent distillation(**VIPER**), interpretable agent, visual analytics(단 RL 전문성 필요).
- **What** → intended-behavior 계열(실시간·human-robot), state abstraction(Markov chain으로 "무엇을 할지"), 자연어 기반(Hayes & Shah).
- **Why** → IE·PHE의 feature importance(RL용으로 설계된 Puri et al. 등), interpretable agent, agent distillation. **단, 장기적 결과까지 담는 why**는 feature importance로 안 되고 **reward decomposition**(Juozapaitis et al.)을 써야 한다.
- **Why not** → expected outcome(행동 결과 대조), reward decomposition, distill한 트리 경로 추적.
- **What if / How to** → generative 방법(Olson et al.), 인과 기반(Madumal et al.), tree 경로 탐색(VIPER 등).

이 표(논문 Table 2–4)는 stakeholder가 자기 질문에서 역산해 기법을 고르게 해주는 게 목적이다.

## 5. 트렌드와 미래 방향

트렌드(9.1): feature importance가 가장 흔하고, agent distillation(트리 등으로 설명)이 부상 중이며 reward decomposition·expected outcome·state abstraction·visual analytics가 뒤를 잇는다.

미래 방향 5가지: (1) **의도 명시** — 어떤 stakeholder의 어떤 질문을, 디버깅인지 통찰 추출인지 분명히 밝혀라. (2) **interpretable agent 연구 강화** — black box가 정말 필요한가? IA가 가장 충실하고 sample-efficient한데 XRL 맥락 연구는 부족하다. (3) **RL 고유 측면** — model 설명, 부분관측(history 의존) 정책 등 순차성 자체를 설명하라. (4) **설명 속성** — 특히 시간 임계 결정엔 빠르고 단순한 설명이 필요한데 연구가 적다. (5) **평가** — 대부분 functionally-grounded 평가뿐. human-grounded·application-grounded 평가와 **표준화된 user study**가 필요하다.

## 6. 실 적용·구현 관점에서의 의견 (FAB Machine–Lot 할당 설명 Agent)

이 서베이는 내 과제의 **설계 의사결정 체크리스트**로 쓰기 좋다.

- **먼저 "누구의 어떤 질문"을 6유형으로 고정한다.** 내 Agent의 1차 사용자는 fab 운영 엔지니어이고, 핵심 질문은 "이 Machine–Lot 할당을 믿어도 되나(why)"와 "X였다면 다른 장비로 갔나(what if / why not)"이다. 그렇다면 backlog 우선순위는 feature importance + counterfactual + (대조용) expected outcome 계열이지, 연구자용 visual analytics가 아니다. 질문 유형을 박아야 기법 난립을 피한다.

- **세 갈래(IA/IE/PHE)를 성숙 단계로 배치한다.** v1은 운영 정책을 안 건드리는 **PHE**(빠른 가치 증명). v2는 attention·reward decomposition 같은 **IE** 구조를 정책망에 심어 "장기 결과까지 담는 why"를 가능케 함 — 서베이가 짚듯 단기 feature importance로는 장기 결과 설명이 안 되기 때문이다. 감사 요구가 강한 결정 구간만 **IA**(트리 정책)로 부분 교체. 경쟁이 아니라 단계다.

- **"장기·model 정보" 축을 의식적으로 챙긴다.** 디스패칭의 신뢰는 "지금 이 lot이 왜 score가 높았나"(즉시)뿐 아니라 "이 선택이 납기·throughput에 **나중에** 어떤 결과를 낳나"(장기)에 달렸다. 서베이의 RL 설명 특성을 빌리면, 우리 Agent는 reward decomposition으로 보상을 항(makespan/tardiness/setup)별로 분해해 **장기 결과 기반 why**를 제공하는 데까지 가야 한다.

- **"평가 부재" 경고를 진지하게 받는다.** XRL은 설명을 만들기는 쉬워도 그게 옳고 유용한지 측정이 어렵다. 내 Agent도 "설명을 출력한다"에서 멈추면 안 되고, (a) 충실도(설명이 정책을 얼마나 반영), (b) 현업 수용도(엔지니어가 그 설명으로 신뢰/조치를 바꾸나)를 처음부터 KPI로, **표준화된 human study**로 검증해야 한다. 안 그러면 좋은 데모로 끝난다.

요약: 이 글은 기법 자체보다 **"기법을 고르는 메타 프레임워크"** 다. Immordino·Li 같은 구체 방법론을 이 taxonomy(IA/IE/PHE × generation/representation/inspection × 6질문 유형) 위에 좌표로 찍어두면, 내 설명 Agent의 기능 backlog이 stakeholder 질문 단위로 정렬된다.

## 참고문헌

- Bekkemoen. *Explainable reinforcement learning (XRL): a systematic literature review and taxonomy.* Machine Learning, 2024, 113:355–441. [DOI: 10.1007/s10994-023-06479-7](https://doi.org/10.1007/s10994-023-06479-7)
