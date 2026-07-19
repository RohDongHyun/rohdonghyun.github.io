---
title: 31. 디스패칭 룰 평가 플랫폼으로서의 DES
date: 2026-07-18
tags:
  - Simulation
  - AI Scheduling
---

[[posts/foundations/simulation-and-digital-twin/29-fab-equipment-modeling|29편]](장비)과 [[posts/foundations/simulation-and-digital-twin/30-fab-flow-and-logistics-modeling|30편]](흐름·물류)으로 fab DES 모델이 갖춰졌다. 이제 그 모델을 지은 본래의 목적으로 간다 — **디스패칭 룰의 평가**. [[posts/foundations/simulation-and-digital-twin/28-manufacturing-simulation-and-fab|28편]]에서 봤듯, "이 규칙과 저 규칙 중 어느 쪽이 나은가"는 큐잉 근사의 해상도로는 답할 수 없어 DES가 표준 도구가 되는 질문이다. 그리고 이 글은 입문 편 4부에서 쌓은 통계적 분석 도구 — [[posts/foundations/simulation-and-digital-twin/11-output-analysis|output analysis]], [[posts/foundations/simulation-and-digital-twin/13-variance-reduction-and-doe|분산 감소]], [[posts/foundations/simulation-and-digital-twin/14-simulation-optimization|시뮬레이션 최적화]] — 가 fab 문제에서 실전 투입되는 자리이기도 하다. 룰 자체보다 **룰을 어떻게 공정하게 평가하는가**에 이 글의 무게가 있다.

## 문제: 장비가 비었다, 누구를 태울 것인가

디스패칭 문제의 원형은 단순하다. **장비가 비었을 때(또는 batch를 짤 때), 버퍼에 대기 중인 lot 중 무엇을 먼저 처리할 것인가.** 결정은 지금 이 순간, 그 장비 앞의 대기열만 보고 실시간으로 내려진다.

단순해 보이는 이 선택이 자명하지 않은 이유가 28편의 **re-entrant flow**다. 같은 노광 툴그룹 버퍼에 1층 작업을 기다리는 lot과 20층 작업을 기다리는 lot이 나란히 서 있다 — 공정 진도, 납기 여유, 남은 처리 시간이 제각각인 lot들이 한 줄에 섞여 있고, 어느 쪽을 먼저 태우느냐가 분 단위로 누적되어 주·월 단위의 cycle time과 납기 성과를 만든다.

## 대표 디스패칭 룰

현장과 문헌에서 가장 널리 쓰이는 룰들을 간결히 짚는다. 이 글은 룰 백과사전이 아니므로, 각 룰이 *무엇을 우선하는가*만 보면 충분하다.

- **FIFO**(First In, First Out): 먼저 온 lot 먼저. 아무것도 최적화하지 않지만 공정하고 예측 가능해서, 모든 비교 실험의 **기준선(baseline)** 역할을 한다.
- **SPT**(Shortest Processing Time): 처리 시간이 짧은 lot 먼저. 짧은 작업을 빨리 쳐내 대기열을 빠르게 비우므로 **평균 flow time(시스템 체류 시간)에 강하다.** 대신 처리 시간이 긴 lot이 계속 뒤로 밀리는 굶김(starvation)이 생긴다.
- **EDD**(Earliest Due Date): 납기가 빠른 lot 먼저. 납기 지연을 직접 겨냥한다.
- **CR**(Critical Ratio): 납기 여유와 남은 일의 양을 비율로 결합한다.

$$
CR = \frac{\text{납기까지 남은 시간}}{\text{잔여 처리 시간}}
$$

이 식이 말하는 것: 분자는 "쓸 수 있는 시간", 분모는 "써야 하는 시간"이다. $CR > 1$이면 아직 여유가 있고, $CR = 1$이면 지금부터 한 순간도 기다리지 않아야 겨우 맞추며, $CR < 1$이면 **이미 늦은 lot**이다. CR이 작은 lot부터 태우면 "남은 일 대비 시간이 가장 빠듯한" lot이 우선된다. 예를 들어 납기까지 48시간 남았고 잔여 처리 시간이 60시간인 lot은 $CR = 0.8$ — 대기 없이 달려도 12시간 늦는다 — 이므로 $CR = 1.5$인 lot보다 먼저 처리된다. EDD가 납기만 보는 것과 달리 잔여 작업량까지 반영하기 때문에, 진도가 제각각인 lot이 섞이는 re-entrant 환경에 잘 맞아 **fab에서 널리 쓰이는 실전 룰**이다.

- **ATC**(Apparent Tardiness Cost): 납기 절박도와 처리 시간을 지수 가중으로 결합해 lot마다 index(우선순위 점수)를 계산하고, 점수가 가장 높은 lot을 고르는 **index 룰**이다. SPT의 효율과 EDD·CR의 납기 감각을 하나의 점수로 합친 계열로 이해하면 된다(전체 수식은 생략한다).

여기에 두 개의 축이 더 있다. [[posts/foundations/simulation-and-digital-twin/29-fab-equipment-modeling|29편]]의 **batch 장비**에는 "누구를 먼저"에 앞서 "최소 배치 크기를 채워서 지금 돌릴까, 더 모일 때까지 기다릴까"를 정하는 batch 형성 룰이 별도로 필요하고, sequence-dependent setup(직전에 처리한 작업 종류에 따라 다음 작업 전 준비 시간이 달라지는 것)이 있는 장비에는 "같은 레시피의 lot을 이어 처리해 setup을 아끼는" setup 고려 룰이 있다. 순서 선택·batch 형성·setup 회피는 서로 다른 결정이라, 실전의 디스패칭 로직은 이 축들의 조합이 된다.

**룰의 매력과 한계.** 룰이 지금도 현장의 기본값인 이유는 분명하다 — **단순하고, 왜 그 lot이 뽑혔는지 설명 가능하고, 밀리초 안에 실시간으로 계산된다.** 한계도 그 단순함에서 나온다. 룰은 지금 이 장비 앞의 대기열만 보는 **국소적·근시안적(myopic)** 결정이라, "이 lot을 지금 보내면 세 스텝 뒤 병목이 몰린다" 같은 하류 효과를 보지 못한다. 이 한계가 뒤에서 강화학습으로 가는 동기가 된다.

## 평가 실험 설계: "A가 B보다 좋다"를 주장하려면

이 글의 핵심이다. 룰 두 개를 시뮬레이션에 넣고 각각 한 번씩 돌려 "A의 평균 cycle time이 짧으니 A가 낫다"고 말하는 것은, [[posts/foundations/simulation-and-digital-twin/11-output-analysis|11편]]의 첫 원칙 — 한 번 돌린 숫자를 보고하지 마라 — 을 정면으로 어기는 일이다. 제대로 된 비교는 세 개의 축 위에 설계된다.

### 시나리오 축: 어떤 조건에서의 승자인가

룰의 우열은 조건에 따라 뒤집힌다. 최소한 다음을 훑어야 한다.

- **제품 믹스**: 어떤 제품이 얼마 비율로 흐르는가. 믹스가 바뀌면 툴그룹별 부하 분포가 바뀌고 병목이 이동한다.
- **로딩 수준**: 병목 가동률을 얼마로 미는가. 낮은 로딩에서는 어느 룰이든 큰 차이가 없다가, 포화에 가까워질수록 룰 간 격차가 벌어진다.
- **다운타임 강도**: 장비 고장이 잦고 길수록 변동성이 커지고, 변동성 흡수 능력이 룰마다 다르다.

한 시나리오의 승자가 다른 시나리오에서 지는 일은 흔하다. "로딩 85%·현재 믹스에서 A가 낫다"와 "A가 낫다"는 전혀 다른 주장이다.

### 지표 축: 무엇으로 좋음을 재는가

평균 cycle time 하나만 보는 것도 함정이다. 봐야 할 지표는 여럿이고, 룰은 지표 간 트레이드오프 위에 서 있다.

- **cycle time의 평균과 분산**: 평균이 짧아도 분산이 크면 납기 약속을 못 한다 — 분산은 곧 **예측 가능성**이다.
- **tardiness / 납기 준수율**: 납기를 넘긴 정도와 제때 나간 lot의 비율.
- **throughput**: 단위 시간당 완성량.
- **x-factor**: cycle time을 순수 처리 시간으로 나눈 비율. 값이 3이면 "가공에 필요한 시간의 3배를 fab 안에서 보냈다"는 뜻으로, 규모가 다른 제품·기간을 같은 잣대로 비교하게 해 주는 fab 표준 지표다.

트레이드오프의 전형이 SPT다 — 평균 flow time은 최상급이지만 긴 작업을 굶겨 cycle time 분산과 최악 지연을 키운다. 반대로 FIFO는 평균은 평범해도 분산이 작다. 어느 쪽이 "좋은가"는 그 fab이 평균을 파는지(원가), 예측 가능성을 파는지(납기)에 달린, 지표 가중의 문제다.

### 통계 축: 차이가 잡음이 아님을 보이기

fab 시뮬레이션은 확률 시뮬레이션이므로, 여기서 입문 4부가 총동원된다. 각 기법의 원리는 해당 편에 맡기고 이 문제에의 적용만 적는다.

- **warm-up 제거와 replication**: 빈 fab에서 시작한 초기 과도구간을 잘라내고, 독립 반복으로 지표마다 신뢰구간을 만든다 — [[posts/foundations/simulation-and-digital-twin/11-output-analysis|11편]] 그대로다. fab은 cycle time이 주~월 단위라 warm-up도 수 개월치 시뮬레이션이 필요할 만큼 길다는 점만 다르다.
- **공통 난수(CRN)**: 룰 A와 B를 비교할 때 **같은 도착 스트림, 같은 고장 스트림**을 양쪽에 공유시킨다. 그러면 두 실행의 차이에서 "운 나쁘게 고장이 몰린 탓"이 상쇄되고 룰 차이만 남아, 차이 추정의 분산이 [[posts/foundations/simulation-and-digital-twin/13-variance-reduction-and-doe|13편]]에서 본 양의 공분산 항($2\,\mathrm{Cov}$)만큼 줄어든다. **룰 비교야말로 CRN의 교과서적 사용처다** — 우리가 묻는 것이 개별 값이 아니라 *차이*이고, 같은 조건에서 규칙만 바꾸는 것이 애초에 공정한 비교이기 때문이다.
- **ranking & selection**: 후보 룰이 여러 개일 때 "정해진 신뢰수준으로 진짜 최선을 고르는" 절차는 [[posts/foundations/simulation-and-digital-twin/14-simulation-optimization|14편]]에서 본 ranking & selection의 몫이다. 후보가 유한한 디스패칭 룰 선택은 그 기법의 전형적 적용 대상이다.

### Operating curve 비교: 점이 아니라 곡선으로

마지막으로, 시나리오 축과 지표 축을 한 장에 합치는 방법이 [[posts/foundations/simulation-and-digital-twin/28-manufacturing-simulation-and-fab|28편]]에서 예고한 **operating curve 비교**다. 한 로딩 수준에서의 점 비교는 반쪽짜리다 — 로딩 수준을 낮은 값부터 포화 근처까지 훑으며 각 수준에서 (위의 통계 절차대로) cycle time을 추정해, **룰별로 cycle time–throughput 곡선을 통째로 그려 비교한다.**

좋은 룰은 곡선을 오른쪽 아래로 눌러 준다 — 같은 로딩에서 더 짧은 cycle time, 같은 cycle time 목표에서 더 높은 로딩(= throughput). 이 비교가 강력한 이유는 "로딩 80%에서는 비슷하지만 90%에서는 A가 확연히 낫다"처럼 **룰의 가치가 어느 운전 영역에서 발현되는지**까지 보여 주기 때문이다. 변동성을 잘 다루는 룰일수록 곡선의 무릎(급상승 시작점)이 오른쪽으로 밀린다.

## 룰에서 정책으로

실무의 디스패칭은 단일 룰이 아니다. 툴그룹마다, 공정 스텝마다 다른 룰을 쓰고, 흔히 여러 기준(납기 절박도, setup 회피, hot lot 우대, 병목 보호 등)을 **가중치로 결합한 점수식**으로 lot을 뽑는다. 그러면 곧바로 다음 질문이 생긴다 — 그 가중치를 얼마로 둘 것인가. 가중치 벡터를 결정변수로, 시뮬레이션 지표를 목적함수로 놓으면 이것은 정확히 [[posts/foundations/simulation-and-digital-twin/14-simulation-optimization|14편]] 시뮬레이션 최적화의 문제다.

한 걸음 더 나아가, "고정된 점수식"조차 버리고 **시스템 상태를 보고 그때그때 행동(어느 lot을 태울지)을 고르는 문제**로 일반화하면 — 룰의 근시안이라는 한계를 학습으로 넘어서려는 순간 — 강화학습의 문이 열린다. 시뮬레이터가 environment가 되고 디스패칭 결정이 action이 되는 이 구도는 10부의 [[posts/foundations/simulation-and-digital-twin/34-des-as-rl-environment|34편]]에서 본격적으로 다룬다.

## 정리

- 디스패칭 문제는 **빈 장비 앞 대기열에서 누구를 먼저 태울 것인가**이며, re-entrant flow 때문에 진도·납기·잔여 작업이 제각각인 lot이 한 줄에 섞여 선택이 자명하지 않다.
- 대표 룰: **FIFO**(기준선), **SPT**(평균 flow time에 강하나 긴 작업 굶김), **EDD**(납기 순), **CR**($=$ 납기 여유 $/$ 잔여 처리 시간, $CR<1$이면 이미 지각 — fab의 실전 룰), **ATC**(절박도·처리 시간의 지수 가중 index 룰). batch 형성과 setup 회피는 별도 축이다. 룰은 단순·설명 가능·실시간이지만 국소적·근시안적이다.
- "A가 B보다 좋다"는 주장은 세 축의 실험 설계 위에서만 성립한다: **시나리오 축**(믹스·로딩·다운타임 — 승자는 조건에 따라 뒤집힌다), **지표 축**(평균 cycle time만이 아니라 분산·tardiness·throughput·x-factor의 트레이드오프), **통계 축**(warm-up·replication은 [[posts/foundations/simulation-and-digital-twin/11-output-analysis|11편]], CRN은 [[posts/foundations/simulation-and-digital-twin/13-variance-reduction-and-doe|13편]], 최선 선택은 [[posts/foundations/simulation-and-digital-twin/14-simulation-optimization|14편]]의 ranking & selection).
- 점 비교 대신 **operating curve 비교** — 로딩을 훑으며 룰별 cycle time–throughput 곡선을 그려, 룰의 가치가 발현되는 운전 영역까지 본다.
- 실무는 룰의 **가중 조합**이고 가중치 튜닝은 시뮬레이션 최적화, 상태 의존적 행동 선택으로 일반화하면 강화학습([[posts/foundations/simulation-and-digital-twin/34-des-as-rl-environment|34편]])이다.

다음 글에서는 평가를 넘어, 시뮬레이션으로 **스케줄 자체를 만드는** 이야기 — [[posts/foundations/simulation-and-digital-twin/32-simulation-based-scheduling|32편]] — 로 간다.
