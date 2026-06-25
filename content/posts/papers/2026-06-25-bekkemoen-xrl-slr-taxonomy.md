---
title: "(2024) Explainable Reinforcement Learning (XRL): A Systematic Literature Review and Taxonomy"
date: 2026-06-25
tags:
  - XAI
private: true
---

개별 XRL 기법 논문이 아니라, **"설명 가능한 강화학습(XRL) 분야 전체의 지도"** 를 그리는 서베이다. [Bekkemoen, *Explainable reinforcement learning (XRL): a systematic literature review and taxonomy*](https://doi.org/10.1007/s10994-023-06479-7) (Machine Learning, 2024, 113:355–441)는 기존 XRL 리뷰 10편과 최근 5년 XRL 연구 **189편**을 체계적 문헌고찰(SLR)로 정리하고, 새로운 taxonomy로 분류한 뒤, **각 기법을 stakeholder의 질문과 연결**한다. 어떤 설명 기법을 고를지 막막할 때 출발점으로 삼기 좋은 글이다.

## 1. 왜 이 서베이가 유용한가

XRL은 SHAP, saliency, 결정 트리 distillation, reward decomposition, counterfactual 등 기법이 난립한다. 각 기법은 **서로 다른 질문에 답하고, 서로 다른 이해관계자를 위한 것**인데, 개별 논문만 읽으면 이 지형이 안 보인다. Bekkemoen의 기여는 189편을 한 장의 분류 체계에 올려 "내 상황엔 어떤 부류의 기법이 맞나"를 판단하게 해주는 데 있다.

## 2. Taxonomy: 설명을 언제·어떻게 만드는가

서베이의 중심 분류축은 **설명이 만들어지는 시점·방식**에 따라 XRL agent를 세 갈래로 나눈 것이다.

- **Interpretable Agents (본질적 해석 가능).** 추가 장치 없이 그 자체로 읽을 수 있는 단일 함수근사기(예: 결정 트리 정책, 선형 정책, 규칙 기반 정책)로 agent를 구성한다. 모델을 보면 곧 정책을 안다. 단점은 표현력·확장성이 black box보다 떨어질 수 있다는 것.
- **Intrinsic Explainability (내재적 설명).** 학습 *전·중*에 RL 시스템을 손봐서, 학습이 끝나면 설명을 함께 내놓도록 만든다. 예: attention을 정책망에 심어 어디를 보는지 노출, reward decomposition으로 보상을 의미 단위로 분해, 계층적 구조로 sub-goal을 드러냄. 정책은 여전히 신경망이지만 **설명을 위한 구조가 내장**돼 있다.
- **Post Hoc Explainability (사후 설명).** 이미 학습된 black box를 **그대로 두고** 바깥에서 설명을 추출한다. 예: surrogate 모델 적합(black box를 흉내 내는 해석 가능 모델), saliency map, SHAP, counterfactual. 정책 성능에 손대지 않는 게 장점, 설명이 근사라는 게 한계.

이 세 갈래는 흔히 말하는 **"intrinsic(투명) vs post-hoc"** 스펙트럼을 RL에 맞게 정밀화한 것이다. 앞서 본 두 논문을 이 틀에 얹으면 깔끔하다. [[posts/papers/2026-06-25-li-interpretable-drl-scheduling-decision-tree|Li et al.의 트리 distillation]]은 post-hoc surrogate(혹은 interpretable agent로 교체)이고, [[posts/papers/2026-06-25-immordino-xai-rl-semiconductor-scheduling|Immordino의 SHAP·counterfactual]]은 전형적인 post-hoc이다.

> 보조축으로, XRL 문헌은 흔히 **"무엇을 설명하는가"** 로도 나눈다 — 단일 행동의 근거가 되는 feature importance, 과거 경험·MDP 구성요소가 정책에 미친 영향(learning process & MDP), 그리고 정책 전반의 행동(policy-level). 이 "무엇을 설명하는가" 축과 위의 "언제·어떻게 설명하는가" 축은 직교하므로, 둘을 교차하면 한 기법의 좌표가 또렷해진다. (단, 이 세 갈래 feature/process/policy 구분은 XRL 서베이 전반에서 통용되는 틀이며, 정확한 명명은 서베이마다 조금씩 다르다.)

## 3. Stakeholder와 질문의 연결

Bekkemoen 서베이의 또 다른 핵심은 **"누구를 위한 설명인가"** 를 명시한 점이다. 같은 정책이라도:

- **RL 개발자·연구자**: "학습이 왜 이렇게 수렴했나, 보상이 의도대로 작동하나"(디버깅).
- **domain expert·운영자**: "이 결정이 우리 현업 규칙과 맞나, 믿어도 되나"(검증·신뢰).
- **end user·관리자·규제기관**: "왜 이런 결과가 나왔고 책임은 어디인가"(설명책임).

기법 선택은 이 질문에서 역산해야 한다는 것이 서베이의 메시지다. 개발자의 reward 디버깅엔 트리 분기 분석이, 운영자의 신뢰엔 SHAP+counterfactual이 맞는 식이다.

## 4. 트렌드와 미래 방향

서베이가 짚는 흐름: XRL 연구가 빠르게 늘지만 **평가가 표준화되지 않았고**, 설명의 충실도(fidelity)·유용성을 정량 비교하기 어렵다는 점. 또한 사람을 대상으로 한 설명 유효성 검증(human study)이 부족하다는 지적. 향후 방향으로는 평가 프로토콜 표준화, stakeholder별 맞춤 설명, 설명-의사결정 루프의 실증을 든다.

## 5. 실 적용·구현 관점에서의 의견 (FAB Machine–Lot 할당 설명 Agent)

이 서베이는 내 과제의 **설계 의사결정 체크리스트**로 쓰기 좋다.

- **먼저 "누구의 어떤 질문"인지 고정한다.** 내 Agent의 1차 사용자는 fab 운영 엔지니어이고 질문은 "이 Machine–Lot 할당을 믿어도 되나"이다. 그렇다면 우선순위는 *post-hoc 신뢰·검증* 계열(SHAP, counterfactual, surrogate 규칙)이지, 연구자용 학습 곡선 분석이 아니다. 이 우선순위를 먼저 박아야 기법 난립을 피한다.

- **세 갈래를 단계적 로드맵으로 본다.** v1은 운영 정책을 안 건드리는 **post-hoc**(빠르게 가치 증명). v2는 attention·reward decomposition 같은 **intrinsic** 구조를 정책망에 심어 설명 품질을 끌어올림. 최종적으로 감사 요구가 강한 결정 구간만 **interpretable agent**(트리 정책)로 부분 교체. 세 갈래를 경쟁이 아니라 **성숙 단계**로 배치하는 게 현실적이다.

- **"평가 부재" 경고를 진지하게 받는다.** 서베이가 반복 지적하듯 XRL은 설명을 만들기는 쉬워도 **그 설명이 실제로 옳고 유용한지 측정하기가 어렵다.** 내 Agent도 "설명을 출력한다"에서 멈추면 안 되고, (a) 충실도(설명이 정책을 얼마나 정확히 반영하나), (b) 현업 수용도(엔지니어가 그 설명으로 실제 신뢰/조치를 바꾸나)를 처음부터 KPI로 설계해야 한다. human-in-the-loop 평가를 빼면 좋은 데모로 끝난다.

요약: 이 글은 기법 자체보다 **"기법을 고르는 메타 프레임워크"** 다. Immordino·Li 같은 구체 방법론을 이 taxonomy(intrinsic/post-hoc × 무엇을/누구를) 위에 좌표로 찍어두면, 내 설명 Agent의 기능 backlog이 stakeholder 질문 단위로 정렬된다.

## 참고문헌

- Bekkemoen. *Explainable reinforcement learning (XRL): a systematic literature review and taxonomy.* Machine Learning, 2024, 113:355–441. [DOI: 10.1007/s10994-023-06479-7](https://doi.org/10.1007/s10994-023-06479-7)
- (보충 자료) XRL Resources: [github.com/stmrdus/XRL](https://github.com/stmrdus/XRL)
