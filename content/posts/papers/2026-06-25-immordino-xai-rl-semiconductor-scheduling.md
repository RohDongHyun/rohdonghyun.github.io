---
title: (2026) Explainable AI for Reinforcement Learning Based Dynamic Scheduling Solutions in Semiconductor Manufacturing
date: 2026-06-25
tags:
  - AI Scheduling
  - XAI
private: true
---

반도체 FAB 디스패칭을 강화학습(RL)으로 풀면 성능은 좋아도, 현장 엔지니어 입장에서 정책 신경망은 **"왜 이 lot을 이 장비에 보냈는가"를 말해주지 않는 black box**다. 이 신뢰의 공백이 academia의 RL 디스패처가 실제 fab에 들어가지 못하는 가장 큰 장벽 중 하나다. 이 글에서 다루는 [Immordino et al., *Explainable AI for reinforcement learning based dynamic scheduling solutions in semiconductor manufacturing*](https://doi.org/10.1007/s10845-025-02631-3) (Journal of Intelligent Manufacturing, 2026)는 정확히 이 문제를 정조준한, **반도체 스케줄링 맥락에서 XAI를 정면으로 다룬 거의 유일한 최신 논문**이다. 내가 진행 중인 "Machine–Lot 할당 사유 설명 Agent" 과제와 주제가 사실상 동일하다.

## 1. 무엇을 설명하려 하는가

논문의 출발점은 명확하다. 복잡한 job shop(= 반도체 fab)의 동적 스케줄링은 NP-hard이고, RL agent가 좋은 정책을 학습할 수 있다. 그러나 그 정책을 표현하는 신경망은 domain expert에게 black box라서 **신뢰를 얻지 못하고, 따라서 배포되지 못한다.** 저자들의 목표는 사후적으로 이 정책을 해석·설명 가능하게 만들어 academia와 industry 사이의 간극을 메우는 것이다.

핵심은 **사전 학습된(pretrained) agent를 그대로 두고**, 그 위에 여러 통계·ML 기반 XAI 기법을 얹어 설명을 뽑는 **post-hoc·holistic 접근**이라는 점이다. RL 학습 방식 자체를 바꾸지 않으므로 이미 운영 중인 정책에도 적용할 수 있다.

대상 환경은 반도체 스케줄링의 오픈소스 벤치마크 시뮬레이션이다. 대표적으로 **SMT2020**(Semiconductor Manufacturing Testbed 2020)과 소규모 **Minifab** 모델이 쓰인다. 즉 실제 fab 데이터가 아니라 공개 testbed 위 디스패칭 agent를 설명 대상으로 삼는다.

## 2. 두 층위의 설명: 단일 결정 vs 전체 전략

논문의 구조적 핵심은 설명을 **두 층위**로 나눈 것이다. 이 구분은 내 과제에도 그대로 가져올 수 있는 설계 골격이다.

### 2.1 단일 state–action 설명 (local)

"지금 이 상태에서 왜 이 행동을 골랐나"를 설명한다. 주로 쓰는 도구:

- **SHAP (SHapley Additive exPlanations)**: 각 입력 feature가 그 결정에 기여한 정도를 Shapley value로 정량화한다. fab 상태(대기 lot 수, setup 상태, due date, queue time 등)의 어떤 feature가 이 장비 선택을 밀었는지/당겼는지 부호와 크기로 본다.
- **Counterfactual explanation**: "이 feature 값이 달랐다면 결정이 바뀌었을까"를 따진다. SHAP이 높다고 지목한 feature를 실제로 흔들어 봤을 때 행동이 바뀌는지 확인해, SHAP의 주장을 **교차 검증**한다.

이렇게 서로 다른 기법으로 같은 결론을 확인하는 **cross-validation**이 이 논문의 방법론적 미덕이다. XAI 기법은 각자 가정이 다르고 단독으로는 틀릴 수 있어서, 합의가 나는 부분만 신뢰하는 태도다.

### 2.2 전체 전략 설명 (global)

개별 결정이 아니라 **정책이 전반적으로 어떤 규칙을 학습했는가**를 본다.

- **Decision tree surrogate**: 학습된 정책의 입출력을 모방하는 해석 가능한 결정 트리를 적합시켜, 정책이 따르는 대략적 규칙 구조를 사람이 읽을 수 있는 형태로 근사한다.
- **전역 feature importance**: SHAP을 다수 결정에 걸쳐 집계해, 정책이 평균적으로 어떤 feature에 의존하는지 본다.

### 2.3 인상적인 결과: 설명이 입력 설계로 되먹임

가장 실무적으로 흥미로운 발견은, **lithography 공정에서는 batching 관련 feature가 결정에 거의 기여하지 않는다**는 것을 SHAP이 0에 가까운 기여도로 드러냈다는 점이다. litho는 본래 batch 공정이 아니므로 당연한 결과지만, 중요한 건 **XAI가 "이 입력은 불필요하다"를 데이터로 증명**했다는 것이다. 그 feature를 입력에서 제거하면 학습 파라미터가 줄고 수렴이 빨라진다. 즉 XAI가 단순히 신뢰를 주는 데 그치지 않고 **feature engineering·모델 경량화로 되먹임**된다.

> 참고로 같은 연구 흐름의 선행 작업으로 [*Demystifying Reinforcement Learning in Production Scheduling via Explainable AI*](https://arxiv.org/abs/2408.09841) (2024)가 있다. 생산 스케줄링 RL에 XAI를 적용한 동일 계열의 논의라 함께 읽으면 맥락이 잡힌다.

## 3. 한계

- 설명 대상이 실제 fab가 아니라 **SMT2020·Minifab 벤치마크**다. 실 fab의 노이즈·결측·비정상 상황에서 같은 설명이 안정적일지는 별개 문제다.
- SHAP·surrogate tree·counterfactual 모두 **근사**다. 정책의 진짜 내부 논리가 아니라 그 그림자를 본다는 한계는 post-hoc 기법의 본질적 제약이다.
- 최종 해석에는 여전히 **domain expert가 loop 안에** 있어야 한다. XAI는 가설을 제시하고, 그 타당성 판단은 사람이 한다.

## 4. 실 적용·구현 관점에서의 의견 (FAB Machine–Lot 할당 설명 Agent)

이 논문은 내 과제의 **레퍼런스 아키텍처로 거의 그대로 채택할 만하다.** 구체적으로:

- **"두 층위 분리"를 그대로 가져간다.** 현장에서 엔지니어가 묻는 질문은 두 종류다. (a) "방금 이 lot 왜 저 장비로?"(local), (b) "이 디스패처는 대체로 무슨 원칙으로 움직이나?"(global). 설명 Agent의 UI/응답도 이 두 모드로 나누는 게 자연스럽다. local은 SHAP+counterfactual, global은 surrogate tree + 집계 importance.

- **SHAP 단독을 신뢰하지 않는다.** 디스패칭 상태 feature는 서로 강하게 상관(예: queue length ↔ WIP ↔ 예상 대기시간)되어 있어 SHAP의 기여 배분이 왜곡되기 쉽다. 논문처럼 counterfactual로 교차 검증하는 단계를 반드시 넣어야 한다. 상관이 심하면 SHAP 대신 그룹 단위 기여나 permutation 기반을 병행하는 것도 고려.

- **counterfactual은 "feasible action 공간 안에서" 만들어야 한다.** fab에서는 setup 제약·qual·예약 등으로 실제로 불가능한 대안 행동이 많다. "X였다면 다른 장비로 갔을 것"이라는 반사실이 물리적으로 불가능한 시나리오면 설명이 오히려 신뢰를 깬다. counterfactual 생성기에 제약을 넣는 것이 핵심 엔지니어링 포인트다.

- **"설명 → 입력 설계 되먹임" 루프를 KPI로 건다.** litho-batching 사례처럼, 우리 fab에서도 SHAP이 "기여 0"으로 일관되게 지목하는 feature는 입력에서 빼서 정책을 경량화한다. XAI를 신뢰 도구이자 **모델 디버깅·압축 도구**로 동시에 쓰는 것이 ROI가 가장 크다.

- **벤치마크와 실 fab의 간극은 처음부터 인정하고 설계한다.** SMT2020에서 검증한 설명 파이프라인을 실 라인에 옮길 때, 분포 shift로 SHAP 분포가 달라지는지 모니터링하는 단계가 필요하다. 설명의 안정성 자체를 하나의 지표로 추적하는 것이 좋다.

요약하면, 이 논문은 "RL 디스패처 위에 SHAP·counterfactual·surrogate tree를 holistic하게 얹어 local/global 설명을 동시에 만든다"는 검증된 청사진을 제공한다. 내 Machine–Lot 할당 설명 Agent의 v1은 이 구조를 따르되, **counterfactual의 feasibility 제약**과 **설명-입력 되먹임 루프**를 우리 도메인 특화로 강화하는 방향이 맞다고 본다.

## 참고문헌

- Immordino, Stöckermann, Hayen, et al. *Explainable AI for reinforcement learning based dynamic scheduling solutions in semiconductor manufacturing.* Journal of Intelligent Manufacturing, 2026. [DOI: 10.1007/s10845-025-02631-3](https://doi.org/10.1007/s10845-025-02631-3)
- (관련) *Demystifying Reinforcement Learning in Production Scheduling via Explainable AI.* 2024. [arXiv:2408.09841](https://arxiv.org/abs/2408.09841)
- (벤치마크) Kopp et al. *SMT2020 — A Semiconductor Manufacturing Testbed.* IEEE TSM, 2020.
