---
title: 강화학습을 운영 가능한 의사결정 시스템으로 만드는 과정
---

학습한 policy가 기존 운영 방식보다 낫다는 것을 어떻게 확인하고, 실제 시스템에 적용한 뒤 유지할 것인가? 이 시리즈는 반도체 FAB의 스케줄링·dispatching을 공통 예로 삼아 문제 정의, 학습 환경 설계, 실험과 평가, 배포 및 지속 운용을 연결한다. 각 편은 실제 과제에서 내려야 할 결정과 다음 단계에 전달할 산출물을 중심으로 구성한다.

특정 기업의 내부 시스템이나 실험 결과를 소개하는 글은 아니다. 공개 논문과 공식 문서가 뒷받침하는 원칙을 구분해 인용하고, 이를 현장에 적용하는 구체적 절차는 작성자의 설계 제안으로 제시한다. 수치 예제와 실험 계획은 설명을 위해 구성했다. 12편은 직접 실행해 검산한 작은 계산 예제와 가상의 RL 평가 결과를 구분한다.

## 1부. 풀 문제와 학습 환경을 정의한다

- [[posts/insights/rl-training-and-operations/01-problem-definition|01. 문제 정의 — 강화학습에 어떤 결정을 맡길 것인가]]
- [[posts/insights/rl-training-and-operations/02-kpi-and-reward|02. KPI와 reward — 학습 목표를 업무 성과에 연결하기]]
- [[posts/insights/rl-training-and-operations/03-observation-and-action|03. 관측과 행동 설계 — 모델에 무엇을 보여주고 맡길 것인가]]
- [[posts/insights/rl-training-and-operations/04-environment-validation|04. 학습 환경 검증 — simulator를 믿기 전에 확인할 것]]

## 2부. 학습 결과를 믿을 수 있는 근거를 만든다

- [[posts/insights/rl-training-and-operations/05-evaluation-scenarios|05. 평가 시나리오 — 무엇을 바꿔서 무엇을 확인할 것인가]]
- [[posts/insights/rl-training-and-operations/06-experiment-methodology|06. 실험 방법론 — 재현 가능한 개선 근거 만들기]]
- [[posts/insights/rl-training-and-operations/07-training-execution|07. 학습 실행 — 첫 baseline부터 계산 예산 관리까지]]
- [[posts/insights/rl-training-and-operations/08-training-diagnostics|08. 학습 진단 — reward 곡선 뒤의 실패 원인 찾기]]
- [[posts/insights/rl-training-and-operations/09-generalization-and-robustness|09. 일반화와 견고성 — 운영 조건이 달라질 때 대응하기]]

## 3부. 배포하고 유지한다

- [[posts/insights/rl-training-and-operations/10-policy-operations|10. 배포 검증 — 로그 평가에서 제한된 현장 적용까지]]
- [[posts/insights/rl-training-and-operations/11-monitoring-and-retraining|11. 운영과 재학습 — 감시·중단·복귀 기준 정하기]]
- [[posts/insights/rl-training-and-operations/12-end-to-end-dispatching-case|12. 통합 사례 — 하나의 dispatching 과제를 끝까지 검토하기]]

알고리즘 자체가 처음이라면 [[posts/foundations/introduction-to-rl/index|강화학습 기초]]를 먼저 읽어도 좋다. 이 시리즈의 질문은 주어진 알고리즘을 어떻게 학습시키고, 비교하고, 실제 의사결정에 연결할 것인가다.
