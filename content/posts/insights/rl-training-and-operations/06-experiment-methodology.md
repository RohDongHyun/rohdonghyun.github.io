---
title: 06. 실험 방법론 — 재현 가능한 개선 근거 만들기
date: 2026-10-08
tags:
  - AI Scheduling
  - Reinforcement Learning
---

RL 실험에서 가장 좋은 learning curve를 고르는 일과 운영 개선의 근거를 만드는 일은 다르다. 학습 난수에 따라 모델이 달라지고, 같은 모델도 외부 사건에 따라 성과가 달라진다. reward와 hyperparameter를 반복해서 바꿨다면 선택 과정 자체도 결과의 일부다.

Patterson 등의 *Empirical Design in Reinforcement Learning*은 무엇을 비교하는지, 어떻게 반복하고 선택하는지까지 포함해 실험을 설계할 필요를 다룬다. 이 글에서는 그 관점을 제조 스케줄링의 실행 계획으로 구체화한다. 아래 seed 수와 기간은 보편적 권고값이 아니라 가상의 시작 계획이다. [Patterson et al., 2024](https://arxiv.org/abs/2304.01315)

## 첫 번째 질문은 모델인가, 학습 방법인가

“이번에 학습한 모델이 기존 규칙보다 좋은가”와 “이 학습 방법이 반복해서 좋은 모델을 만드는가”는 다르다. 첫 질문은 특정 checkpoint의 조건부 성능이고, 둘째 질문은 학습 과정의 변동성까지 포함한 성능이다. checkpoint는 학습 도중 저장한 parameter 상태다.

결과를 $Y_{i,j,s}$라고 쓰면 $i$는 training seed, $j$는 평가 환경의 독립 반복, $s$는 시나리오다. training seed는 parameter 초기화, 행동 탐색, minibatch 순서 등에 영향을 준다. 환경 seed는 주문, 고장, 처리시간 등의 불확실성을 만든다. 모델 하나를 환경 seed 100개에서 실행해도 학습을 100번 반복한 것은 아니다.

알고리즘 비교에는 여러 training seed의 결과가 필요하다. 최종 배포 bundle 검증에는 선택된 모델의 운영 조건별 성능도 따로 필요하다. 전자의 평균이 좋다는 사실만으로 선택한 특정 모델의 stress 성능을 대신할 수 없다.

## train·validation·test는 선택 권한이 다르다

train은 parameter 갱신에, validation은 reward coefficient·hyperparameter·checkpoint 선택에, test는 고정된 최종 후보의 판단에 사용한다. HPO는 hyperparameter optimization의 약자로, 학습률이나 network 크기 같은 학습 설정을 탐색하는 과정이다.

| 분리 대상 | 누수 사례 | 가능한 분리 방법 |
|---|---|---|
| 초기 상태 | 같은 snapshot에서 작은 잡음만 바꿔 train과 test 생성 | 시간 구간·snapshot 묶음 단위 분리 |
| 외부 사건 | test 고장 경로에 맞춰 reward 수정 | test 사건 파일을 선택 단계에서 접근하지 않음 |
| 시나리오 | 모든 OOD mix로 HPO한 뒤 OOD 일반화 주장 | 개발용 변화와 최종 변화 조건 구분 |
| 전처리 | test를 포함한 데이터로 normalizer 계산 | 허용된 train 자료로 fit하고 고정 |
| checkpoint | test KPI가 가장 높은 학습 시점을 선택 | validation 선택 규칙을 사전에 고정 |

validation을 여러 번 보는 것은 역할상 가능하지만, 많이 탐색할수록 그 집합에 맞춰질 수 있다. 최종 test는 이를 확인하는 독립 자료다. test를 보고 수정한 뒤 같은 점수를 다시 최종 성능으로 제시하면 개발과 평가의 경계가 흐려진다.

예를 들어 “validation 제약을 통과한 checkpoint 중 운영 비중 KPI가 가장 좋은 것을 선택하고, 동률이면 더 이른 checkpoint를 선택한다”는 규칙을 먼저 정할 수 있다. 평균 reward 최고점인지 마지막 checkpoint인지에 따라 결과가 달라지므로 선택 규칙도 재현 manifest에 포함한다. Stable-Baselines3 문서도 별도 평가 환경, 여러 실행, wrapper가 만드는 평가 차이에 주의를 권한다. wrapper는 환경의 observation·reward·종료 조건 등을 바꾸는 외부 계층이다. [Stable-Baselines3 공식 RL Tips and Tricks](https://stable-baselines3.readthedocs.io/en/master/guide/rl_tips.html)

## 같은 seed보다 같은 외부 조건이 중요하다

공통 난수를 사용하는 CRN, 즉 common random numbers는 비교하는 policy에 비슷한 외부 변동을 주어 차이를 더 선명하게 보는 방법이다. 동일한 주문 유입 경로에서 두 policy를 비교하면 쉬운 날과 어려운 날의 차이가 비교 결과에 덜 섞일 수 있다. 난수 stream을 용도별로 분리하는 방법은 시뮬레이션 도구에서도 지원하는 일반적인 접근이다. [DSOL 공식 문서: Random numbers](https://simulation.tudelft.nl/dsol/manual/3-basics/random-numbers/)

하지만 같은 정수 seed를 전달했다고 사건이 같아지는 것은 아니다. policy의 행동이 난수 호출 횟수와 순서를 바꾸면 이후 주문과 고장 난수의 대응이 달라진다. 주문, 설비 고장, 처리시간, 학습 탐색에 별도 stream을 두고, 가능한 외생 사건은 사전 생성하거나 사건 ID에 연결한다.

단, 가동 누적시간에 따라 고장이 발생하는 모델에서는 두 policy에 같은 달력 고장 시각을 강제로 주면 시스템의 물리적 관계가 달라진다. 이 경우에는 같은 기저 난수로 고장 임계값을 생성하고, 각 policy가 만든 사용량에 따라 발생 시각이 달라지게 해야 한다. 무엇을 공유하고 무엇이 행동에 따라 변하는지 정의하는 것이 coupling, 즉 두 확률 실험의 연결 방식이다.

## 차이를 계산한 뒤 독립성을 따진다

값이 클수록 좋은 KPI를 기준으로, 학습 모델 $i$와 기준 규칙을 같은 시나리오·외부 경로에서 실행한 차이를 다음처럼 계산하자.

$$
\Delta_{i,j,s}=Y^{\mathrm{RL}}_{i,j,s}-Y^{\mathrm{base}}_{j,s},
\qquad
\widehat\Delta=\frac{1}{n}\sum_{i=1}^{n}\sum_s w_s
\frac{1}{m_s}\sum_{j=1}^{m_s}\Delta_{i,j,s}
$$

이 식은 먼저 같은 조건의 차이를 만들고, 환경 반복과 시나리오 비중, training seed를 차례로 평균한다. $n$은 독립 training seed 수다. 작을수록 좋은 KPI라면 차이의 방향을 바꾸거나 음수가 개선이라고 명시한다. $w_s$는 운영 비중이고 $m_s$는 시나리오별 반복 수이므로, 반복 수가 많다는 이유로 그 시나리오의 업무 중요도가 커지지 않는다.

오차 범위를 붙일 때는 $n\times\sum_s m_s$개의 결과를 모두 독립 표본이라고 가정하면 안 된다. 같은 모델을 여러 번 쓴 결과는 모델을 공유하고, 여러 모델에 같은 외부 경로를 썼다면 경로도 공유한다. 학습과 환경의 변동성을 함께 말하려면 모델과 경로가 교차하는 구조를 반영한 다중 군집 bootstrap이나 적절한 통계 모형을 사용해야 한다. bootstrap은 관측 단위를 재표집해 추정값의 변동을 살피는 방법으로, 이 경우 두 공유 축과 RL·기준 규칙의 짝을 보존해야 한다. 모델마다 독립된 경로 집합을 사용한 중첩 설계와 동일하게 취급하지 않는다. 선택한 한 모델의 불확실성만 말한다면 모델을 고정하고 독립 환경 반복을 재표집할 수 있다. 어느 경우든 lot 수를 그대로 독립 표본 수로 쓰는 것은 공유 설비로 인한 의존성을 무시할 수 있다.

구간 추정의 중요성은 RL benchmark 연구에서도 강조된다. Agarwal 등의 연구는 interval estimate, performance profile, IQM 등을 제시한다. IQM은 정렬한 성과의 가운데 절반을 평균하는 요약값이다. 다만 전체 성능을 안정적으로 요약하는 값이 극단적 장애에서의 안전성을 증명하지는 않는다. [Agarwal et al., *Deep Reinforcement Learning at the Edge of the Statistical Precipice*](https://arxiv.org/abs/2108.13264)

## 공정한 비교는 예산과 실패를 포함한다

비교 대상인 baseline은 성과 판단의 기준이 되는 방법이다. 현재 운영 규칙, 튜닝한 규칙, 학습 policy를 비교할 때 RL만 크게 탐색하고 기준 규칙은 불리한 기본값에 두면 개선의 원인을 해석하기 어렵다. HPO trial 수, simulator interaction 수, 학습 시간, 하드웨어, 실패 trial 처리법을 함께 공개한다.

episode 길이나 시뮬레이터 속도가 다르면 interaction 수와 wall-clock 시간이 서로 다른 비용을 보여준다. 하나로 숨기지 말고 둘 다 보고하며, 우선 제한할 자원을 사전에 정한다. 실행에 실패한 seed를 제외해 좋은 seed만 남기는 것도 결과를 왜곡한다. 수치 불안정, 제약 위반, timeout을 각각 기록하고 실패율을 결과에 포함한다.

ablation은 구성 요소 하나를 제거하거나 바꿔 개선 원인을 보는 실험이다. 예를 들어 시간 적분 reward를 decision당 reward로 바꾸거나, shaping 항을 제거하거나, 특정 feature를 제외할 수 있다. 이때 비교 조건을 바꾼 뒤 별도로 재학습해야 학습 설계의 효과를 볼 수 있다. 배포 guard를 끄는 실험은 안전한 시뮬레이션에서만 수행하고, 운영 적용 설정과 혼동하지 않는다.

## 실행 가능한 계획과 결과 양식

다음은 팀에서 논의를 시작하기 위한 **가상 계획**이다. 필요한 반복 수는 pilot 실험의 분산, 검출하려는 최소 개선 폭, 계산 예산을 보고 조정한다.

| 단계 | 사전 고정 내용 | 산출물 |
|---|---|---|
| 0. 작은 환경 검산 | 손으로 확인 가능한 2설비·소수 lot | reward·KPI·mask 검산 기록 |
| 1. pilot | 후보 2개, training seed 3개, 짧은 반복 | 분산·실행시간·실패 원인 |
| 2. 개발 | 동일 HPO 예산, train·validation 고정 | 설정별 결과와 선택 근거 |
| 3. 최종 학습 | 고정 설정으로 training seed 10개 | 전체 checkpoint와 학습 로그 |
| 4. 최종 평가 | 시나리오별 독립 외부 경로 20개, 고정 달력 기간 | paired KPI와 불확실성, 실패율 |
| 5. 배포 후보 검증 | 사전 규칙으로 고른 bundle, guard 포함 | replay·closed-loop·shadow 결과 |

단계 4의 결과를 보고 seed 하나를 골라 그 성능만 발표하면 단계 4가 선택 자료가 된다. 특정 모델을 배포하려면 validation 기반의 후보 선택 규칙을 적용하고, 선택된 모델에 대해서도 독립적인 최종 검증을 남긴다.

최종 보고서에는 최소한 아래 표의 열을 두면 좋다. 대괄호 항목은 실험 후 채울 자리이며, 실제 측정값을 의미하지 않는다.

| 시나리오 | KPI와 단위 | 기준 규칙 | RL 평균 | paired 차이와 구간 | 제약·실패 | 판정 |
|---|---|---|---|---|---|---|
| 정상 mix | cohort OTD, % | [측정값] | [측정값] | [차이 %p, 구간] | [건수/노출량] | [사전 기준 적용] |
| 병목 고장 | recovery, 시간 | [측정값] | [측정값] | [차이, 구간] | [미회복 비율] | [사전 기준 적용] |
| 수요 급증 | 시간 평균 WIP, lot | [측정값] | [측정값] | [차이, 구간] | [fallback 비율] | [사전 기준 적용] |

reproducibility manifest에는 코드 commit, simulator·데이터 version, 시나리오 ID, seed와 stream 배정, 환경 종료 규칙, reward 식과 계수, KPI 정의, 전처리 통계, HPO 예산, checkpoint 선택 규칙, 배포 bundle hash, 실행 명령과 의존성을 남긴다. 모든 사건 로그를 영구 저장하기 어렵다면 원본 데이터 위치와 재생성 규칙, 보관 범위라도 고정한다.

좋은 실험은 가장 큰 개선 숫자를 찾는 과정이 아니라, **어떤 변화가 어떤 조건에서 반복 가능한 개선을 만들었는지 설명하는 과정**이다. 평가 계약, KPI 정의, 배포 bundle, 재현 기록이 연결되어야 다음 사람이 같은 결과를 확인하고 운영 변경의 범위를 판단할 수 있다.

## 참고문헌

- Patterson, Neumann, White, White (2024), *Empirical Design in Reinforcement Learning*. [arXiv — 최초 preprint 2023](https://arxiv.org/abs/2304.01315)
- Agarwal et al. (2021), *Deep Reinforcement Learning at the Edge of the Statistical Precipice*. [arXiv](https://arxiv.org/abs/2108.13264)
- Stable-Baselines3, *Reinforcement Learning Tips and Tricks*. [공식 문서](https://stable-baselines3.readthedocs.io/en/master/guide/rl_tips.html)
- DSOL, *Random numbers*. [공식 문서](https://simulation.tudelft.nl/dsol/manual/3-basics/random-numbers/)

이전: [[posts/insights/rl-training-and-operations/05-evaluation-scenarios|05. 평가 시나리오]] · [[posts/insights/rl-training-and-operations/index|시리즈 목차]] · 다음: [[posts/insights/rl-training-and-operations/07-training-execution|07. 학습 실행]]
