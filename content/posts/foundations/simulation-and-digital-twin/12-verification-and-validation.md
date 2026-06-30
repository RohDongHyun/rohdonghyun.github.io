---
title: 12. Verification & Validation (V&V)
date: 2026-06-30
tags:
  - Simulation
---

[[posts/foundations/simulation-and-digital-twin/01-introduction-to-simulation|1부]]에서 시뮬레이션 연구 절차를 보며, 초보자가 가장 자주 혼동하는 두 단계를 예고했다. **verification**(검증)과 **validation**(타당성 확인)이다. 한 문장으로 구분하면 이렇다.

- **Verification**: 모델을 *맞게* 만들었는가 — building the model **right**. (코드가 의도한 모델대로 동작하는가?)
- **Validation**: *맞는* 모델을 만들었는가 — building the **right** model. (그 모델이 애초에 현실을 제대로 본떴는가?)

코드가 버그 하나 없이 완벽해도, 가정이 현실과 다르면 결과는 정교하게 틀린다. 이 글은 시뮬레이션을 *신뢰할 수 있게* 만드는 마지막 관문, V&V를 다룬다.

## Verification: 코드가 모델대로 도는가

verification은 개념 모델([[posts/foundations/simulation-and-digital-twin/01-introduction-to-simulation|1부]]의 "모델 개념화" 산출물)을 코드로 옮기는 과정에서 실수가 없었는지 확인하는, 본질적으로 **소프트웨어 디버깅에 가까운** 작업이다. 대표적 기법은 다음과 같다.

- **단순 케이스의 손계산 비교**: 해석적 답을 아는 단순한 설정으로 돌려, 이론값과 맞는지 본다. [[posts/foundations/simulation-and-digital-twin/08-building-des-from-scratch|8번 글]]에서 M/M/1 시뮬레이션이 큐잉 공식의 $L=4.0$, $W=5.0$을 재현한 것이 바로 verification의 실제 사례다.
- **추적(trace)**: 몇몇 entity가 시스템을 지나는 과정을 사건 단위로 출력해, 규칙대로 움직이는지 한 줄씩 따라간다.
- **극단값 테스트**: 도착률을 0으로, 혹은 서버를 무한히 빠르게 두는 등 결과를 예측할 수 있는 극단 조건을 넣어 본다.
- **애니메이션·시각화**: 큐가 음수가 되거나 entity가 사라지는 등 *눈에 보이는* 이상을 잡는다.
- **코드 리뷰**: 사람이 직접 로직을 읽고 검토한다.

verification은 [[posts/foundations/simulation-and-digital-twin/07-queueing-theory-essentials|큐잉 이론]] 같은 *기준선이 있을 때* 특히 강력하다. 그래서 이 시리즈가 단순한 M/M/1부터 쌓아 온 것이다.

## Validation: 모델이 현실과 맞는가

validation은 더 어렵고 더 중요하다. "내 모델이 현실 시스템을 충분히 잘 대표하는가"를 묻기 때문이다. 완벽한 검증은 불가능하다(모델은 정의상 단순화다). 목표는 "의사결정에 쓸 만큼 충분히 신뢰할 수 있다"는 근거를 쌓는 것이다.

- **표면 타당성(face validity)**: 시스템을 잘 아는 현장 전문가에게 모델의 가정·거동·결과가 그럴듯한지 검토받는다. 가장 먼저, 그리고 끝까지 하는 점검이다.
- **실데이터와의 비교**: 모델 출력의 분포를 실제 시스템에서 측정한 성능과 통계적으로 비교한다([[posts/foundations/simulation-and-digital-twin/11-output-analysis|신뢰구간]]·가설검정 활용). 평균뿐 아니라 분포·피크도 본다.
- **과거 데이터 재현(historical validation)**: 모델 구축에 쓰지 않은 과거 기간의 실제 결과를, 모델이 재현하는지 확인한다(머신러닝의 hold-out 검증과 같은 발상).
- **민감도 분석(sensitivity analysis)**: 입력 가정(분포·모수)을 흔들어, 결과가 어떻게 변하는지 본다. 결과를 크게 좌우하는 입력은 더 정밀하게 측정해야 하고([[posts/foundations/simulation-and-digital-twin/10-input-modeling|input modeling]]과 직결), 거의 영향이 없는 입력은 안심해도 된다.
- **Turing 테스트**: 전문가에게 모델 출력과 실제 데이터를 섞어 보여주고 구분할 수 있는지 본다. 구분하지 못하면 좋은 신호다.

## 둘의 순서와 관계

일반적으로 **verification이 먼저**다. 코드가 모델대로 돌지 않는데 현실과 비교하는 것은 의미가 없기 때문이다. 코드를 신뢰할 수 있게 된 뒤에 validation으로 넘어간다. 다만 둘은 한 번에 끝나는 체크박스가 아니라, 모델을 고칠 때마다 반복하는 **연속적 과정**이다.

> 가장 위험한 함정은 **검증되지 않은 모델로 내린 자신감 있는 결정**이다. 보기 좋은 애니메이션과 정교한 숫자는 사람을 쉽게 설득하지만, V&V를 건너뛴 모델은 [[posts/foundations/simulation-and-digital-twin/01-introduction-to-simulation|1부]]에서 경고한 "그럴듯하지만 틀린 답"을 정당화하는 도구가 된다.

## 정리

- **Verification = 모델을 맞게 만들기**(코드가 모델대로?), **Validation = 맞는 모델 만들기**(모델이 현실대로?).
- Verification은 디버깅에 가깝다: **단순 케이스 이론값 비교**(8번 글의 M/M/1!), trace, 극단값, 시각화, 코드 리뷰.
- Validation은 더 어렵다: **face validity, 실데이터 비교, 과거 데이터 재현, 민감도 분석, Turing 테스트.**
- **verification 먼저, 그다음 validation**이며, 모델 수정마다 반복한다. 검증 없는 자신감이 가장 위험하다.

다음 글에서는 검증된 시뮬레이터로 실험을 *효율적으로* 하는 [[posts/foundations/simulation-and-digital-twin/13-variance-reduction-and-doe|분산 감소와 실험 설계]]를 다룬다.
