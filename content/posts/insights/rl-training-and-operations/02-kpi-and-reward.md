---
title: 02. KPI와 reward — 학습 목표를 업무 성과에 연결하기
date: 2026-10-08
tags:
  - AI Scheduling
  - Reinforcement Learning
---

강화학습에서 reward는 학습기가 최적화하는 신호이고, KPI는 운영자가 성과를 판단하는 지표다. 둘을 같은 이름으로 부른다고 같은 목적이 되지는 않는다. “cycle time을 줄인다”면서 완료된 lot에만 reward를 주면, 빨리 끝낼 수 있는 lot를 먼저 처리하고 오래 걸리는 lot를 남기는 policy가 유리해질 수 있다.

필요한 작업은 KPI를 reward 식으로 한 번 옮기는 데서 끝나지 않는다. KPI의 측정 대상을 정의하고, reward가 유도하는 행동을 점검하며, 별도의 평가 코드로 실제 성과를 확인해야 한다. 아래 절차와 예시는 제조 스케줄링을 위한 설계 제안이다.

## KPI에는 분모와 시간 경계가 있다

KPI를 정의할 때는 단위, 측정 기간, 대상 집합, 분모, 미완료 작업 처리법을 함께 적는다. 예를 들어 고정 평가 구간 $[0,H]$에서 납기가 도래하는 lot 집합을 $\mathcal D_H$라고 하자. 완료 시각을 $C_j$, 납기를 $d_j$라고 하면 납기 준수율을 다음처럼 정의할 수 있다.

$$
\mathrm{OTD}_H=
\frac{\sum_{j\in\mathcal D_H}\mathbf 1\{C_j\le d_j\}}
{|\mathcal D_H|}
$$

이 식의 분모는 완료된 lot가 아니라 해당 기간에 납기가 도래한 lot다. 종료 시점에도 미완료라면 준수 건수에 들어가지 않는다. 대상이 없는 경우는 100% 대신 미정의로 표시한다. 반대로 출하된 lot만을 분모로 정한 OTD도 계산할 수 있지만, 다른 KPI라는 사실을 이름과 설명에 밝혀야 한다.

cycle time은 투입 시각 $R_j$부터 완료 시각 $C_j$까지의 길이 $C_j-R_j$다. 종료 시점에 남은 lot에는 완료 시각이 없으므로, 완료 lot 평균만 보여주면 선택 편향이 생긴다. 가능한 대응은 고정된 투입 cohort를 끝까지 추적하거나, 미완료 비율과 현재 age를 함께 보고하거나, 적절한 검열 자료 분석을 별도로 설계하는 것이다. cohort는 같은 기준으로 묶어 추적하는 대상 집합을 뜻한다. 어떤 방법을 택하든 미완료 lot를 조용히 삭제해서는 안 된다.

시간 평균 WIP는 관측 시점마다 찍은 단순 평균보다 시간 적분으로 정의하는 편이 명확하다.

$$
\overline{WIP}_H=\frac{1}{H}\int_0^H N(t)\,dt
$$

여기서 $N(t)$는 시각 $t$의 공정 내 lot 수다. 사건이 많이 발생한 혼잡 시간대에 관측 표본이 몰려도, 이 정의는 각 상태가 유지된 실제 시간만큼 가중한다. 처리량, WIP, 납기를 함께 봐야 하는 이유는 한 지표가 다른 지표의 손실을 숨길 수 있기 때문이다.

## 불규칙한 decision에는 시간에 맞는 reward가 필요하다

정책이 결정하는 시각을 $t_k$, 다음 결정까지의 시간을 $\Delta t_k$라고 하자. WIP와 납기 초과 lot 수를 줄이려는 reward의 한 예는 다음과 같다.

$$
r_k=-\int_{t_k}^{t_{k+1}}[\alpha N(t)+\beta L(t)]\,dt-\eta S_k
$$

이 식에서 $L(t)$는 납기가 지났지만 아직 완료되지 않은 lot 수이고, $S_k$는 해당 구간의 setup 횟수다. $\alpha$, $\beta$, $\eta$는 단위를 맞추고 중요도를 표현하는 계수다. 오래 혼잡하게 머무르면 더 큰 손실을 주며, setup은 실제 발생 횟수로 반영한다. 이것은 가능한 설계의 하나일 뿐, 어느 FAB에서나 맞는 정답은 아니다.

$L(t)$의 적분은 관측 구간 안에서 누적된 납기 초과 시간을 센다. 지연된 lot의 비율을 보는 OTD와는 목적이 다르므로, 이 reward를 썼다고 OTD 개선까지 보장되지는 않는다. $N(t)$의 적분도 각 lot가 관측 구간 안에서 머문 시간을 합한 값으로, 종료 시점의 미완료 lot를 포함하며 완료 lot의 평균 cycle time과 같지 않다.

상태 값이 구간 내 일정할 때는 적분을 값과 $\Delta t_k$의 곱으로 계산할 수 있다. 중간 사건으로 값이 바뀐다면 그 사건을 기준으로 구간을 나눠 누적해야 한다. 반대로 decision 때마다 단순히 $-N(t_k)$를 주면 policy가 유발한 decision 빈도까지 목적함수에 섞일 수 있다. 이러한 환경의 구성은 [[posts/foundations/simulation-and-digital-twin/34-des-as-rl-environment|DES를 RL 환경으로 구성하기]]와 이어진다.

discount도 마찬가지다. 할인된 return은 미래 reward를 얼마나 작게 보는지 정하는 누적값이다. 물리 시간에 따라 일정하게 할인하려면 다음처럼 둘 수 있다.

$$
G=\sum_k\left(\prod_{i<k}\gamma_i\right)r_k,
\qquad \gamma_i=e^{-\rho\Delta t_i}
$$

이 식은 decision 시각까지 경과한 물리 시간이 같으면 같은 할인율을 적용한다. $\rho$는 시간당 할인 강도다. 여기서는 구간 reward를 구간 시작 시각에 묶어 계산하므로, 구간 내부의 매 순간까지 할인하는 연속시간 목적과는 차이가 있다. 구간이 길다면 내부 할인도 적분에 반영할지 정해야 한다. 또한 사용 라이브러리가 전이별 discount와 이에 맞는 value target을 지원하는지 확인해야 한다. 구현은 고정 $\gamma$인데 설명만 시간 할인이라고 써서는 안 된다. 고정 기간의 총성과가 목적이라면 할인 없이 유한 구간 목적을 쓰는 선택도 가능하다.

## 무엇을 학습하며 무엇이 평가되는가

학습 대상이 $\pi_\theta(a\mid s)$인 actor-critic을 예로 들면, $\theta$는 상태 $s$에서 행동 $a$를 선택하는 신경망의 parameter다. critic $V_\phi(s)$는 앞으로 받을 return을 예측하며 별도 parameter $\phi$를 가진다. 시뮬레이터에서 policy를 실행해 trajectory, 즉 상태·행동·reward의 시간 순서 기록을 모으고, critic의 예측 오차와 policy의 성과 개선 신호로 parameter를 갱신한다.

$$
L_V(\phi)=\mathbb E[(V_\phi(s_k)-\widehat G_k)^2],
\qquad
L_\pi(\theta)=-\mathbb E[\log\pi_\theta(a_k\mid s_k)\widehat A_k]
$$

첫 식은 critic을 관측한 return 추정치 $\widehat G_k$에 맞춘다. 둘째 식은 기본적인 policy gradient 형태로, 기대보다 좋았던 행동에 양의 advantage $\widehat A_k$를 주어 선택 가능성을 높인다. 여기서는 갱신 대상 policy로 수집한 on-policy 표본을 사용하고, 갱신 시 return target과 advantage를 고정값으로 취급하는 형태를 가정한다. 실제 PPO 등은 이 목적을 수정하고 추가 항을 사용하므로 위 식을 모든 알고리즘의 정확한 loss라고 보아서는 안 된다. 원리는 [[posts/foundations/introduction-to-rl/09-actor-critic-policy-gradient|Actor-Critic]]과 [[posts/foundations/introduction-to-rl/10-proximal-policy-optimization|PPO]]에서 이어서 볼 수 있다.

핵심은 이 갱신이 업무 KPI를 직접 이해하지 않는다는 것이다. reward가 납기 위반을 제대로 반영하지 않으면 좋은 optimizer도 잘못 정의한 목적을 더 잘 달성할 뿐이다. KPI 계산기는 가능하면 reward 누적 코드와 별도로 검증해 같은 구현 오류가 두 결과에 함께 숨어들지 않게 한다.

## 제약, 보조 신호, 목적의 우선순위를 구분한다

금지 route, 자격 없는 설비 투입처럼 허용할 수 없는 행동은 단순한 음의 reward에만 맡기기 어렵다. 모델은 다른 이익이 충분하면 벌점을 감수할 수 있다. 기대 성과를 높이면서 비용 한도를 지키는 문제는 다음처럼 표현할 수 있다.

$$
\max_\pi J_R(\pi)
\quad\text{subject to}\quad J_{C_m}(\pi)\le b_m
$$

이 식은 reward 목적 $J_R$와 비용 제약 $J_{C_m}$을 구분한다. 하지만 기대 누적 비용의 제약을 만족한다는 것과 모든 행동에서 위반이 없다는 것은 다르다. Constrained Policy Optimization도 이런 기대 비용 제약의 맥락에서 읽어야 한다. 물리적으로 금지된 행동은 action mask와 실행 직전 검증처럼 별도의 통제 장치가 필요하다. [Achiam et al., *Constrained Policy Optimization*](https://arxiv.org/abs/1705.10528)

보조 reward를 추가하는 reward shaping은 학습 신호를 더 자주 주기 위한 선택이다. 예를 들어 병목 앞 대기량 감소에 점수를 줄 수 있지만, 다른 공정으로 혼잡을 넘기는 행동을 보상할 수도 있다. 임의의 보조항이 원래 목적의 최적 policy를 보존한다고 가정해서는 안 된다. 보조항이 없는 실험과 비교하고 실제 KPI 개선이 유지되는지 확인한다.

목적을 weighted sum으로 합치면 trade-off를 허용하는 것이고, 납기 기준을 먼저 만족한 뒤 생산량을 최대화하면 우선순위를 부여하는 것이다. 어떤 운영 판단을 원하는지 먼저 정해야 coefficient 조정이 끝없는 감각 작업이 되지 않는다.

## reward 상승을 어떻게 해석할 것인가

다음 표는 현상을 설명하기 위해 만든 **가상 결과**다. 모든 수치는 동일 평가 기간과 동일 reward 정의에서 비교했다고 가정한다.

| policy | return ↑ | 완료량 ↑ | 완료 lot 평균 cycle time ↓ | 납기 cohort OTD ↑ | 미완료 lot age p95 ↓ |
|---|---:|---:|---:|---:|---:|
| 기존 규칙 | -1,200 | 1,000 | 30시간 | 95% | 80시간 |
| RL 후보 | -950 | 1,050 | 27시간 | 89% | 110시간 |

RL 후보의 return과 완료 lot 지표는 좋아졌지만 납기와 미완료 lot의 상위 age는 악화됐다. p95는 95번째 백분위수를 뜻한다. 이 표만으로 원인을 단정할 수는 없다. 제품별 잔여량, 긴 route의 age, reward 항별 기여, 평가 종료 직전 행동을 확인해야 한다. reward를 바꾸었다면 이전 return과 숫자를 직접 비교하는 것도 무의미할 수 있다.

실무에서는 다음 순서로 설계를 닫는 편이 좋다.

1. 업무 판단 기준을 문장으로 쓰고 KPI의 집합·분모·기간을 고정한다.
2. 절대 금지 조건과 허용 가능한 trade-off를 분리한다.
3. reward 각 항이 KPI에 어떤 경로로 영향을 주는지 적고 단위를 맞춘다.
4. 손으로 계산 가능한 작은 환경에서 reward와 KPI를 독립 검산한다.
5. coefficient와 shaping을 validation에서 비교하고, 선택된 설정을 고정한다.
6. held-out 평가에서 전체·제품별 KPI와 제약을 확인한 뒤 배포 후보를 결정한다.

## 참고문헌

- Achiam, Held, Tamar, Abbeel (2017), *Constrained Policy Optimization*. [arXiv](https://arxiv.org/abs/1705.10528)

이전: [[posts/insights/rl-training-and-operations/01-problem-definition|01. 문제 정의]] · [[posts/insights/rl-training-and-operations/index|시리즈 목차]] · 다음: [[posts/insights/rl-training-and-operations/03-observation-and-action|03. 관측과 행동 설계]]
