---
title: 08. 학습 진단 — reward 곡선 뒤의 실패 원인 찾기
date: 2026-10-08
tags:
  - AI Scheduling
  - Reinforcement Learning
---

학습 reward가 평평하면 학습률을 올리고, 흔들리면 낮추는 식으로 시작하기 쉽다. 하지만 모델이 선택한 lot과 실제 처리한 lot이 다르거나, reward 계산에서 시간 단위가 뒤섞였어도 비슷한 곡선이 나올 수 있다. 학습 설정을 바꾸기 전에 **지금 보고 있는 증상이 어느 경로에서 만들어졌는지** 나누어야 한다.

이번 편은 제품 P/Q의 설비군 B에서 lot 하나를 선택하는 공통 과제의 진단 절차를 제안한다. 아래 실패 사례와 숫자는 설명용 가정이며 실제 학습에서 관찰한 결과가 아니다. 실험의 변동성과 선택 과정을 함께 다뤄야 한다는 원칙은 RL 실험 방법론에서도 강조된다. 여기서 제시하는 FAB 진단표는 그 논문에 실린 표준 절차가 아니라 작성자의 적용안이다. [Patterson et al., 2024](https://arxiv.org/abs/2304.01315)

## 1. 학습 로그와 고정 평가를 먼저 구분한다

학습 중 reward에는 탐색 행동, 변화하는 초기 상태, normalization, episode 길이의 영향이 섞인다. 서로 다른 시점의 평균 reward를 비교하는 동안 실제로는 다른 난도의 문제를 풀고 있을 수도 있다. 반면 고정 validation은 같은 정의의 KPI로 checkpoint들을 비교하기 위한 경로다. 두 기록을 같은 선으로 취급하지 않는다.

최소한 매 checkpoint에서 학습 구간의 raw reward 항별 합, 정규화된 reward, episode의 물리 길이, 고정 validation KPI를 함께 남긴다. raw는 normalization 이전 값을 뜻한다. KPI는 학습 reward 집계 코드를 그대로 재사용하기보다 별도 사건 로그에서 검산할 수 있어야 한다. 두 구현이 같은 버그를 공유하면 일치한다는 사실만으로 정확성을 확인할 수 없다.

| 관측한 증상 | 우선 나눌 원인 후보 | 첫 판별 실험 | 결과에 따른 조치 |
|---|---|---|---|
| reward가 오르지 않음 | 행동 효과 없음, 매핑 오류, 약한 신호, 갱신 실패 | 작은 결정 사례에서 후보별 다음 상태·reward와 확률 변화를 확인 | 환경·연결 수정 또는 학습 설정 조사 |
| reward는 오르나 KPI는 그대로 | 목적 불일치, episode 경계 이용, cohort 오류 | 같은 trajectory에서 reward 항과 독립 KPI를 나란히 계산 | reward 계약 또는 평가 집계 수정 후 재학습 |
| seed마다 결과가 갈림 | 학습 변동, 환경 난도, 드문 경험, 수치 실패 | 여러 모델을 같은 외부 경로에서 교차 평가 | 변동 원인을 분리하고 추가 실험 범위 결정 |
| 후반에 성능이 붕괴 | 큰 갱신, 분포 변화, normalization, 저장·복원 오류 | 붕괴 직전 checkpoint를 고정 평가하고 변경 이력 대조 | 원인별 수정 후 동일 시작점에서 비교 |

이 표의 각 행은 출발점이다. 원인 후보가 여러 개라면 가장 빨리 배제할 수 있는 것부터 확인한다. 

## 2. reward가 오르지 않으면 행동 경로부터 추적한다

가상의 로그에서 observation 후보 slot 0은 P lot, slot 1은 Q lot이라고 하자. 모델은 slot 1을 선택했는데 실행 계층이 후보를 다시 정렬해 P lot을 처리한다면 학습기는 Q를 선택한 결과로 P의 성과를 받는다. mask와 reward 식이 각각 맞더라도 전체 연결은 틀린다.

따라서 decision ID를 기준으로 후보 lot ID 목록, mask, policy 확률, 선택 slot, 선택 lot ID, 실제 예약 lot ID, 다음 사건 시각을 한 줄로 연결한다. 테스트에서 임의의 후보 순서를 넣고 의도한 lot이 처리되는지 확인한다. 이는 후보 순서에 대한 network 불변성 검사가 아니라 slot과 lot의 매핑 검사다.

그 다음에는 손으로 결과를 아는 작은 환경을 사용한다. 유효 후보가 두 개이고 Q를 먼저 처리할 때만 특정 납기 손실을 피할 수 있는 사례를 만든다. 두 행동을 강제로 각각 실행해 reward와 KPI 차이를 확인하고, 같은 사례를 반복 학습해 유리한 행동의 확률이 바뀌는지 본다. 후보가 늘 하나뿐이면 학습할 선택 차이 자체가 없다.

환경과 연결이 정상인데도 확률이 바뀌지 않으면 optimizer가 실제 policy parameter를 갱신하는지, gradient가 유한한지, advantage가 거의 모두 0인지 확인한다. gradient norm은 손실에 대한 parameter 변화 방향의 크기를 요약한다. reward 크기와 network 구조가 달라지므로 값 하나로 이상을 확정하지 않는다.

## 3. 탐색은 유효 후보 수와 함께 읽는다

entropy는 행동 확률이 얼마나 퍼져 있는지 나타낸다. 유효 후보가 하나면 어떤 policy든 선택 entropy는 0이다. 따라서 전체 호출의 평균 entropy가 낮다는 이유만으로 탐색이 부족하다고 결론 내릴 수 없다.

$$
H_t=-\sum_{a\in A_t^{\mathrm{valid}}}p_t(a)\log p_t(a),
\qquad
0\le H_t\le\log |A_t^{\mathrm{valid}}|
$$

이 식의 로그는 자연로그이고, 확률이 0인 항은 0으로 처리한다. 후보가 네 개이며 균등 확률이면 $H_t=\log4\approx1.386$이다. 하나면 상한부터 0이다. 후보가 둘 이상일 때만 $H_t/\log|A_t^{\mathrm{valid}}|$를 계산하면 가능한 최대 entropy 대비 분산 정도를 볼 수 있다. 후보가 하나인 호출은 별도 비율로 보고, 이 나눗셈에 넣지 않는다.

예를 들어 학습 후반에 유효 후보가 하나인 호출이 많아져 평균 entropy가 감소했을 수 있다. 혼잡 개선과 후보 생성 오류를 구분하려면 후보 수별 entropy와 제품·납기 여유별 선택 비중을 나누어 본다.

## 4. reward만 좋아지면 목적과 시간 경계를 검사한다

P를 계속 선택하면 setup penalty가 줄어 학습 reward는 좋아지지만, Q의 납기 준수율과 미완료 lot age가 악화되는 상황을 가정하자. 이때 entropy나 학습률만 조정해도 문제의 목적이 바뀌지는 않는다. reward가 어느 행동에 이득을 주는지부터 확인해야 한다.

첫 비교는 동일한 evaluation trajectory에서 수행한다. 원래 reward, setup 항을 제외한 계산값, 납기 손실, 생산량, 종료 시 미완료 WIP를 나란히 놓는다. 특정 항이 개선을 지배하는지 찾을 수 있지만, 항을 빼서 사후 재계산한 값은 **그 reward로 다시 학습한 policy의 성과가 아니다**. 수정의 효과는 별도 재학습으로 확인한다.

또한 episode 종료 직전 어려운 Q가 남아 있는데 완료 lot만 평가하면 손실이 사라져 보일 수 있다. 평가 기간에 납기가 도래한 cohort와 미완료 lot 처리를 02편의 계약으로 되돌려 확인한다. 초기 WIP를 매번 제거하는 reset도 실제 운영에서 가능한 회복처럼 해석하지 않는다. 달력 시간으로 길게 연결한 평가에서 대기열이 계속 증가하는지 살펴본다.

한편 제한된 제어 권한으로 바꿀 수 없는 손실도 있다. 상류 공급이 끊겼거나 B의 처리 용량 자체가 부족하다면 모든 학습 설정에서 KPI 개선이 작을 수 있다. 규칙 변경이나 작은 탐색도 개선하지 못하는 조건인지 확인한다.

## 5. seed 변동은 두 축으로 분리한다

training seed는 초기 parameter와 탐색·갱신 순서에 영향을 주고, 평가 환경 seed는 도착·고장 등 외부 경로에 영향을 준다. seed 1의 모델을 쉬운 환경에서, seed 2의 모델을 어려운 환경에서 평가하면 두 변동을 구분하기 어렵다. 06편의 공통 외부 경로를 활용해 모델과 환경을 교차 평가한다.

| 비교 결과 | 가능한 해석 | 추가 확인 |
|---|---|---|
| 모든 모델이 같은 경로에서 실패 | 특정 외부 조건이 공통 취약점일 가능성 | 고장·mix·초기 WIP를 나누어 재현 |
| 특정 모델만 여러 경로에서 실패 | 학습 과정 또는 모델 선택의 문제 가능성 | 학습 분포·갱신 로그·checkpoint 이력 비교 |
| 대부분 유사하나 드문 경로에서 차이 | 희귀 상태 경험과 정책 선택 차이 가능성 | 그 경로를 고정해 decision 로그 분석 |
| 실패 run에서만 NaN 발생 | 수치·환경값 오류 가능성 | 최초 비유한 관측·손실·gradient 시점 추적 |

NaN은 정상적인 수치로 표현되지 않는 계산 결과다. 실패 seed를 삭제하고 남은 평균만 보고하면 학습 방법의 신뢰성을 과장한다. 

## 6. 후반 붕괴는 갱신 신호와 변경 이력을 함께 본다

PPO 로그의 approximate KL은 갱신 전후 policy 차이를 표본으로 추정한 값이고, clip fraction은 확률 비율이 clipping 범위를 벗어난 표본 비율을 나타내는 진단값이다. 구현별 계산 정의를 확인해야 한다. 값이 급증했다면 큰 갱신을 의심할 수 있지만, 특정 수치 하나를 모든 과제의 중단 기준으로 삼지는 않는다.

critic의 explained variance는 예측 대상 변동을 value 예측이 얼마나 설명하는지 보는 지표다. 흔히 $1-\operatorname{Var}(y-\hat y)/\operatorname{Var}(y)$로 계산한다. 대상 $y$의 분산이 거의 0이면 해석이 불안정하고, 높은 값도 좋은 policy를 보증하지 않는다. 현재 policy의 낮은 return을 잘 예측하는 critic일 수도 있다. 로그 정의는 사용하는 구현을 기준으로 확인한다. [SB3 PPO 공식 문서](https://stable-baselines3.readthedocs.io/en/master/modules/ppo.html)

붕괴 시점에는 network만 보지 말고 학습률 schedule, reward coefficient, 초기 상태 분포, simulator 버전, normalizer, checkpoint 복원 이력을 대조한다. 저장한 policy를 이전 normalizer와 잘못 조합해도 성능이 갑자기 떨어질 수 있다. 고정 관측에 대한 저장 전후 출력 비교는 이런 문제를 빠르게 좁힌다.

## 7. 수정 하나마다 판별 가능한 실험을 만든다

가상의 후반 붕괴에 대해 “학습률이 커서 갱신이 불안정하다”는 가설을 세웠다고 하자. 붕괴 직전의 동일 checkpoint와 normalization 상태에서 원래 설정과 낮춘 학습률을 비교한다. 같은 추가 transition 예산을 부여하고 고정 validation을 주기적으로 측정한다. 난수 상태의 복원 범위와 결정성의 한계도 남긴다.

이 실험에서는 reward와 network 크기, 학습 환경 분포를 함께 바꾸지 않는다. 한 번의 좋은 곡선은 단서이므로, 효과가 보이면 다른 시작점이나 training seed에서도 재현되는지 확인한다. test 집합은 이런 원인 탐색에 반복 사용하지 않는다.

수정으로 setup 편중을 줄였지만 생산량이 감소하거나, 붕괴를 막았지만 학습이 느려질 수 있다. 원래 KPI와 제약, 계산 비용을 함께 비교한다.

## 8. 진단 보고서는 원인을 확정한 범위까지 쓴다

| 보고 항목 | 기록할 내용 |
|---|---|
| 증상과 범위 | 최초 발생 checkpoint, seed, 시나리오, reward·KPI 변화 |
| 재현 자료 | 실행 manifest, 사건 로그, 후보·mask·행동 매핑, normalization |
| 가설 | 의심하는 경로와 그 가설이 예측하는 관측 결과 |
| 판별 실험 | 고정한 조건, 하나씩 바꾼 요소, 예산, 평가 집합 |
| 결과와 한계 | 관찰값, 반복 변동, 배제한 원인, 아직 구분 못 한 원인 |
| 후속 조치 | 환경 수정·재학습·적용 범위 축소·추가 실험과 담당 |

좋은 진단 보고서는 “학습률을 낮추니 좋아졌다”에서 끝나지 않는다. 어떤 조건에서 재현됐고 다른 설명이 얼마나 남아 있는지를 적는다. 원인 확정이 어려워도 실패 영역을 구체화하면 다음 행동을 정할 수 있다. 다음 편에서는 그렇게 찾은 실패 영역을 학습 분포와 관측 설계로 줄일지, 모델의 적용 범위를 제한할지 다룬다.

## 참고문헌

- Patterson et al. (2024), *Empirical Design in Reinforcement Learning*. [arXiv](https://arxiv.org/abs/2304.01315)
- Stable-Baselines3, *PPO*. [공식 문서](https://stable-baselines3.readthedocs.io/en/master/modules/ppo.html)

이전: [[posts/insights/rl-training-and-operations/07-training-execution|07. 학습 실행]] · [[posts/insights/rl-training-and-operations/index|시리즈 목차]] · 다음: [[posts/insights/rl-training-and-operations/09-generalization-and-robustness|09. 일반화와 견고성]]
