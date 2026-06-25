---
title: (2023) Interpretable Modeling of Deep Reinforcement Learning Driven Scheduling
date: 2026-06-25
tags:
  - AI Scheduling
  - XAI
private: true
---

DRL로 학습한 스케줄러는 잘 동작해도 신경망이 black box라 운영자가 못 믿는다 — 앞선 [[posts/papers/2026-06-25-immordino-xai-rl-semiconductor-scheduling|Immordino 논문]]과 문제의식이 같다. 다만 접근이 정반대다. Immordino가 black box를 **그대로 두고 위에 설명을 얹는(post-hoc)** 쪽이라면, 이 글에서 다루는 [Li, Lan, Papka, *Interpretable Modeling of Deep Reinforcement Learning Driven Scheduling*](https://arxiv.org/abs/2403.16293) (MASCOTS 2023)은 black box를 **해석 가능한 결정 트리로 통째로 갈아끼우는(intrinsic surrogate)** 쪽이다. 도메인은 반도체가 아니라 HPC(슈퍼컴퓨터) 클러스터 job 스케줄링이지만, "정책을 트리로 distill한다"는 방법론은 fab 디스패칭에 그대로 이식 가능하다.

## 1. 출발점: DRAS, DQN 기반 클러스터 스케줄러

HPC 클러스터 스케줄링은 슈퍼컴퓨터에서 대기 중인 job들의 실행 순서를 정하는 문제다. 전통적으로 FCFS(first-come-first-served) + EASY backfilling 같은 휴리스틱을 쓴다. 저자들은 자신들의 선행 DRL 스케줄러 **DRAS**(Deep Reinforcement learning for cluster Scheduling)를 기준 black box로 삼는다. 구성은:

- **State**: job 3개 feature — job size(요청 노드 수), job length(예상 runtime, walltime), system utilization.
- **Action**: 대기 큐의 20-job window 안에서 다음에 실행할 job 하나 선택. window를 두는 이유는 **starvation(기아) 방지** — 오래 기다린 job이 영원히 밀리지 않게 한다.
- **Reward**: 평균 slowdown 최소화. 형태는
$$
\sum_{j \in J} -\frac{1}{t_j}
$$
여기서 $t_j$는 job $j$의 runtime. (짧은 job일수록 $-1/t_j$의 절댓값이 커서, 짧은 job을 빨리 처리하는 게 보상에 유리하다.)
- **알고리즘**: DQN(Deep Q-Network). 학습 시 $\epsilon$-greedy로 탐험($\epsilon$이 1.0에서 0.995 비율로 감쇠), 추론 시 Q-value가 가장 큰 job 선택.

## 2. IRL 프레임워크: imitation learning으로 트리 추출

핵심 아이디어는 **학습된 DNN을 교사(teacher)로, 결정 트리를 학생(student)으로 두는 imitation learning**이다. 트리는 각 state에 대해 DNN이 내놓는 Q-value를 회귀(regress)하도록 학습한다. 그런데 단순 모방에는 두 가지 함정이 있고, 이 논문의 기여는 그 둘을 푸는 데 있다.

### 2.1 분포 shift 문제와 DAgger

트리를 한 번 학습시켜 배포하면, 트리 정책은 **DNN이 한 번도 안 가본 state로 흘러간다**(distribution shift). 그러면 그 state에 대한 교사 라벨이 없어 오차가 누적된다. 해결책은 **DAgger(Dataset Aggregation)** 의 반복:

1. 현재 데이터로 트리를 학습한다.
2. 그 트리 정책으로 워크로드를 다시 굴린다(replay).
3. 트리가 방문한 새 state들에 대해 **DNN 교사에게 Q-value 라벨을 다시 받는다.**
4. 데이터셋에 합쳐(aggregate) 1로 돌아간다. (최대 5회 반복.)

이렇게 하면 트리가 실제로 가게 되는 state 분포 위에서 교사를 흉내 내므로, 배포 시 fidelity(충실도)가 유지된다.

### 2.2 트리가 너무 커지는 문제와 critical state pruning

또 하나의 문제: 트리가 과도하게 커져 해석 가능성이 사라진다. 저자들의 통찰이 좋다. **시스템이 한가할 때(대기 큐에 job이 거의 없을 때)는 어느 job을 골라도 성능 차이가 거의 없다.** 그렇다면 그런 비중요 state까지 트리가 정밀하게 흉내 낼 필요가 없다.

그래서 **critical state**(대기 큐에 3개 초과 job이 있는 상태, 임계값은 워크로드별 튜닝)에서 수집한 샘플로만 트리를 학습한다. 결과적으로 성능 손실 없이 트리 크기가 크게 준다:

- SP2 워크로드: 트리 크기 **34% 감소**
- DataStar 워크로드: 트리 크기 **48% 감소**

트리 깊이는 8, 10, 12를 실험했고, 깊을수록 DNN fidelity는 오르지만 결정 지연(latency)이 는다.

## 3. 트리를 읽으면 보상 설계가 보인다

이 논문에서 가장 통찰적인 부분이다. 추출된 트리의 **분기 기준(어떤 feature로 쪼개는가)** 을 읽으면 정책의 논리가 드러난다.

- **좋은 보상** $\sum_j -1/t_j$ 로 학습한 정책의 트리는 **job length로 분기**해 짧은 job을 선호한다 — 평균 slowdown 최소화라는 목적과 이론적으로 정합한다.
- **나쁜 보상** $\sum_j -(w_j + t_j)/t_j$ ($w_j$는 과거 대기시간)로 학습하면, 트리가 **wait time으로 분기**해 사실상 FCFS를 흉내 낸다 — 명시한 목적(slowdown 최소화)과 어긋난다. 실제로 이 잘못된 보상에서 성능이 평균 **66% 악화**됐다.

즉 트리는 **"보상 설계가 의도와 맞는지"를 사람이 눈으로 검증하는 도구**가 된다. black box DNN으로는 불가능한, reward debugging의 강력한 수단이다.

## 4. 실험 결과

- **데이터**: SP2(SDSC, 128 노드, 1998–2000), DataStar(SDSC, 1664 노드, 2004–2005). 각 10,000 job 학습 / 2,500 job 테스트.
- **성능**(트리 깊이 10–12):
  - vs FCFS: 대기시간·slowdown을 SP2에서 약 70%, DataStar에서 약 36% 감소.
  - vs DQN(black box): 성능 손실이 SP2 <3%, DataStar <5%. 즉 **해석 가능성을 얻으면서 성능은 거의 그대로**.
  - critical-state pruning을 안 쓴 일반 DAgger 대비 손실 <1~2% — pruning이 공짜 점심이었다.
- **추론 속도**: IRL(트리) 약 0.0003초/job, DQN 약 0.02초/job → 트리가 **약 67배 빠름**. 해석 가능성뿐 아니라 추론 비용까지 줄인다.

## 5. 실 적용·구현 관점에서의 의견 (FAB Machine–Lot 할당 설명 Agent)

이 논문의 방법론은 내 과제에 **두 가지 모드로 쓸 수 있다.**

- **모드 A — 설명 전용 surrogate.** 운영 정책은 성능 좋은 DNN을 그대로 쓰고, 같은 state 분포에서 distill한 트리를 **"설명용 그림자 모델"** 로만 운영한다. 엔지니어가 "왜 이 lot을 이 장비에?"라고 물으면, 트리의 해당 경로(예: `setup_match=Yes → due_slack<2h → queue_len>5 → 장비B`)를 사람이 읽을 수 있는 규칙으로 보여준다. Immordino식 SHAP이 feature 기여도라면, 이건 **결정 규칙 자체**를 보여주는 상보적 설명이다.

- **모드 B — 설명 가능한 운영 정책으로 교체.** 트리 성능이 DNN의 5% 이내라면, 아예 트리를 운영에 올리는 선택지도 있다. fab 현장은 **결정 규칙의 감사가능성(auditability)** 과 **결정론적 재현성**을 매우 중시하므로, 약간의 성능을 내주고 완전 투명성을 얻는 트레이드오프가 합리적인 경우가 많다. 67배 빠른 추론은 실시간 디스패칭에서 분명한 덤이다.

설계 시 그대로 차용할 포인트:

- **critical state 개념의 fab 버전.** HPC의 "큐가 한가하면 아무 job이나 OK"는 fab에서 "병목 장비가 idle이고 후보 lot이 하나뿐이면 설명할 게 없다"에 대응한다. 설명·distill 대상을 **bottleneck contention이 실제로 일어나는 결정**으로 한정하면 트리가 작고 읽기 쉬워진다. 어떤 결정이 "critical"인지의 정의 자체가 도메인 지식이 들어가는 핵심 설계다.
- **DAgger는 필수.** off-policy 로그만으로 트리를 적합하면, 실제 정책이 만드는 state 분포를 못 따라가 설명이 어긋난다. 운영 정책을 시뮬레이터에서 굴려 트리가 가는 state에 라벨을 다시 받는 루프를 반드시 넣어야 한다.
- **트리를 reward 감사 도구로 적극 활용.** fab의 보상은 보통 makespan·tardiness·utilization·setup 비용의 다목적 가중합이라 **가중치가 의도대로 작동하는지** 알기 어렵다. distill한 트리의 분기 feature를 보면 "지금 정책이 실제로는 due date보다 setup 회피에 끌린다" 같은 미스얼라인먼트를 눈으로 잡을 수 있다. 이게 이 논문이 주는 가장 실전적인 가치다.

한 가지 유의점: HPC의 state는 3차원으로 매우 단순하다. fab의 state는 setup·qual·batch·우선순위·due·WIP 등 수십 차원이라 트리 깊이/크기가 훨씬 커질 수 있다. critical-state pruning과 feature 선별([[posts/papers/2026-06-25-immordino-xai-rl-semiconductor-scheduling|Immordino식 SHAP 기여 0 feature 제거]])을 **전처리로 결합**해야 트리가 해석 가능한 크기로 유지된다.

## 참고문헌

- Li, Lan, Papka. *Interpretable Modeling of Deep Reinforcement Learning Driven Scheduling.* MASCOTS 2023. [arXiv:2403.16293](https://arxiv.org/abs/2403.16293)
