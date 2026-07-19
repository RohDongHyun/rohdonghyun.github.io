---
title: "38. 사례 연구: RL 기반 FAB 디스패칭 연구 흐름"
date: 2026-07-19
tags:
  - Simulation
  - AI Scheduling
---

[[posts/foundations/simulation-and-digital-twin/34-des-as-rl-environment|34편]]에서 DES를 RL 환경으로 감싸는 법을, [[posts/foundations/simulation-and-digital-twin/35-semi-mdp-formulation|35편]]에서 불규칙한 결정 시점의 Semi-MDP 정식화를, [[posts/foundations/simulation-and-digital-twin/37-sim-to-real-gap|37편]]에서 sim-to-real 격차를 다뤘다. 이 글은 그 개념들이 **실제 연구에서 어떻게 나타나는지**를 본다. fab 디스패칭에 RL을 쓰려는 시도는 2018년 전후로 본격화되었는데, 대표 연구들을 시간순으로 나열하는 대신 네 가지 흐름 — 국소에서 전역으로, 멀티에이전트의 진화, 이벤트 관점의 귀환, 현실 점검 — 으로 묶어 34~37편의 렌즈로 읽는다. 개별 논문의 정밀 리뷰가 아니라 **문헌 지도**가 목적이다. (fab이 아닌 일반 job shop을 겨냥한 RL 스케줄링 — GNN 기반 L2D 등 — 은 [[posts/papers/2026-06-22-l2d-jobshop-gnn-ppo|별도 논문 요약]]에서 다뤘으므로 여기서는 제외한다.)

## 흐름 (a) — 국소에서 전역으로

첫 번째 흐름은 문제 범위의 확장이다. 워크센터 하나에서 시작해 전체 fab으로, 다시 실규모 디지털 트윈으로.

**Waschneck et al. (2018)** 이 fab 디스패칭 DQN의 시조격이다. DQN(Deep Q-Network)은 상태-행동 가치함수 $Q(s,a)$를 신경망으로 근사하는 value-based 심층 RL 알고리즘으로, 2015년 Atari 게임에서 유명해진 이래 이런 초기 적용 연구들의 기본 선택지였다. Infineon과의 협력으로 수행된 이 연구는 추상화된 frontend fab의 자체 소규모 DES 위에서 **워크센터마다 DQN 에이전트를 하나씩** 두고, 한 에이전트가 학습하는 동안 나머지는 고정하는 cooperative 방식으로 순차 학습시켰다. KPI를 유연하게 목적으로 삼을 수 있음을 보인, 규모는 작지만 "fab 디스패칭을 RL로"라는 틀 자체를 연 논문이다.

**Park et al. (2020)** 은 재진입, sequence-dependent setup(직전에 무엇을 처리했느냐에 따라 전환 시간이 달라지는 setup), 대체 장비가 얽힌 **setup change 스케줄링**을 DQN 계열로 다뤘다. 설계상 눈에 띄는 선택은 장비별 에이전트가 **신경망 parameter를 공유**한다는 것 — 모든 에이전트가 같은 가중치의 정책을 쓰므로, 학습 후 장비 수가 달라져도 정책을 그대로 재사용할 수 있어 장비 수 변화에 강건하다. "fab은 구성이 계속 바뀐다"는 현실을 정면으로 의식한 첫 설계 중 하나다.

**Altenmüller et al. (2020)** 은 fab 고유 제약을 보상에 직접 코딩했다. 1차 목표가 처리량이나 납기가 아니라 **큐타임(time constraint, 선행 공정 후 일정 시간 안에 후속 공정을 처리해야 하는 제약) 위반의 최소화**다. fab 모티브의 자체 DES 위에서 상태 210차원의 단일 DQN을 학습시켰는데, "우리 공장의 진짜 아픈 제약을 보상 함수에 넣는다"는, 이후 연구들이 반복하게 되는 패턴의 이른 사례다.

여기까지가 국소 단위(워크센터·툴그룹·특정 제약)라면, **Tassel et al. (2023)** 은 규모를 한 번에 끌어올렸다. [[posts/foundations/simulation-and-digital-twin/33-fab-simulation-benchmarks-and-tools|33편]]에서 소개한 **SMT2020 전체 fab** — HV/LM 시나리오 장비 1,071대에 WIP 3,635 lots, LV/HM 시나리오 장비 1,265대에 2,700 lots — 을 **글로벌 디스패처 하나**로 다룬다(arXiv preprint이며, 학회·저널 수록 여부는 확인하지 못했다). 상태는 lot별 13개 feature(CR 값, 잔여 납기, tool family 등)이고, 정책은 **attention** — 입력 집합의 원소들이 서로 가중치를 주고받으며 정보를 모으는 메커니즘으로, 2017년 Transformer 이후 가변 크기 입력을 다루는 표준 도구 — 으로 가변 개수의 후보 lot에 점수를 매긴다. 학습은 두 단계다: 먼저 "이 lot의 다음 tool family는 무엇인가"를 맞히는 self-supervised 사전학습(정답 레이블을 사람이 달지 않고 데이터 자체에서 만들어 내는 학습)으로 표현을 데운 뒤, **NES**(Natural Evolution Strategies)로 정책을 최적화한다. 결과는 CR 룰 대비 총비용 **−16.68% / −13.3%**(두 시나리오) — 공개 벤치마크에서 두 자릿수 % 개선이다.

![Tassel et al. (2023)의 attention 기반 정책 아키텍처](https://ar5iv.labs.arxiv.org/html/2302.07162/assets/x1.png)
*Tassel et al. (2023)의 정책 아키텍처 — lot별 feature를 입력으로 attention 기반 정책이 디스패칭 결정을 내는 구조. 출처: [arXiv:2302.07162](https://arxiv.org/abs/2302.07162) Fig. 1*

**Stöckermann et al. (WSC 2023)** 은 공개 벤치마크가 아니라 **Infineon 실데이터 기반 디지털 트윈** 위에서 Flow Factor(실제 cycle time이 이론적 최소 대비 몇 배인가) 최소화를 학습했다. 산업용 DES 위에서 DRL을 **ES**(evolution strategies)로 학습시켰는데, ES란 경사를 역전파로 계산하는 대신 정책 parameter에 무작위 섭동을 가해 성능이 좋아지는 방향을 추정하는 black-box 최적화 계열이다 — 보상이 episode 끝에서야 나오는 긴 지평 문제에서 gradient 추정이 필요 없다는 것이 장점이다. 이 논문은 policy-gradient 대비 ES의 확장성 우위를 보고한다(실배치 여부는 확인되지 않았다).

이 흐름에서 읽을 관찰 하나: **규모가 커질수록 policy-gradient가 흔들리고, ES 계열이 확장성의 대안으로 부상한다.** Tassel(NES), Stöckermann(ES) 모두 전체 fab 규모에서 ES 계열을 택했다. fab의 결정 지평은 수십만 스텝에 달하고 보상은 lot 완료 시점에야 실현되므로(34편의 credit assignment 문제 — 받은 보상을 과거 어느 행동의 덕/탓으로 배분할 것인가), 스텝 단위 gradient 추정에 기대는 방법보다 episode 단위 성과로 정책 전체를 평가하는 black-box 접근이 실무적으로 버텼다는 것이 이들 연구의 공통 보고다.

## 흐름 (b) — 멀티에이전트의 진화

두 번째 흐름은 "누가 결정하는가"의 진화다. [[posts/foundations/simulation-and-digital-twin/35-semi-mdp-formulation|35편]] 말미에서 본 대로, fab을 툴그룹별 에이전트로 분해하면 **비동기 SMDP들의 묶음**이 되고, 행동 공간은 쪼개지지만 nonstationarity(다른 에이전트도 학습 중이라 환경의 통계적 성질이 계속 변하는 것)와 credit assignment의 증폭이라는 대가를 치른다. 연구들은 이 대가를 다루는 조율 구조를 점점 정교하게 만들어 왔다.

- **순차 학습** (Waschneck 2018): 한 에이전트만 학습하고 나머지는 고정 — nonstationarity를 시간 축으로 회피하는 가장 소박한 방식.
- **parameter 공유** (Park 2020): 모든 에이전트가 같은 신경망을 쓴다 — 에이전트 수가 늘어도 학습 대상은 하나이고, 구성 변화에 강건해진다.
- **area 간 협조 MARL** (Wang et al., IJPR 2025): 워크센터 하나가 아니라 **여러 area의 통합 스케줄링** — batch 형성과 디스패칭을 동시에 학습하는 cooperative MARL(multi-agent RL)이다. batch 장비, 재진입 같은 fab 제약이 area 경계를 넘어 얽히는 상황을 에이전트 간 협조로 푼다. (알고리즘·시뮬레이터의 세부는 검증하지 못해 여기서는 문제 설정 수준만 적는다.)
- **leader-follower 계층** (Jang et al., 2024): **leader 에이전트가 shift마다 전역 목표 벡터를 만들어 장비군별 follower들에 배포**하고, follower는 그 목표 아래에서 제품 전환 결정을 내린다. 학습은 PPO(policy-gradient 계열의 표준 알고리즘으로, 갱신 폭을 clipping으로 제한해 안정화한 것) 기반이고, 보상은 지연 lot에 대한 페널티다. 학습 정책이 이상 행동을 하지 않도록 rule-based 전환 로직을 안전장치로 결합했다. 보고 성능은 tardiness −10.4%, 완료율 +31.4%. **단, 이 연구의 무대는 Intel 실데이터이되 backend(packaging & test) fab이다** — 웨이퍼가 같은 장비군을 수십 번 재방문하는 frontend 재진입 문맥과는 공정 구조가 다르므로, frontend 연구들과 같은 줄에 놓고 수치를 비교하면 안 된다.

![Jang et al. (2024)의 leader-follower 프레임워크](https://arxiv.org/html/2409.13571v1/x1.png)
*Jang et al. (2024)의 leader-follower 구조 — leader가 전역 목표를 배포하고 follower들이 그 아래에서 개별 결정을 내린다. 출처: [arXiv:2409.13571](https://arxiv.org/abs/2409.13571) Fig. 1(a)*

네 단계를 관통하는 공통 동기는 두 가지다. 첫째, **행동 공간 폭발의 분해** — 모든 결정을 한 에이전트가 결합 행동으로 고르는 공간은 조합적으로 커지므로 쪼갤 수밖에 없다. 둘째, **전역 KPI와의 정합** — 쪼개진 에이전트들이 각자 국소 최적만 좇으면 fab 전체 성과가 무너지므로, 순차 고정이든 parameter 공유든 leader의 목표 배포든 어떤 형태의 조율 장치가 반드시 붙는다. 35편에서 정식화 수준으로만 그려 둔 비동기 SMDP와 credit assignment 논의가, 이 흐름에서 구체적 아키텍처로 실물이 된다.

## 흐름 (c) — 이벤트 관점의 귀환

세 번째 흐름은 최신 연구 하나가 대표한다. **Yeganeh et al. (2026)** 은 Politecnico di Milano와 STMicroelectronics의 협력으로, STMicro **실데이터 기반 디지털 트윈** 위에서 중앙집중 단일 에이전트를 학습시켰다. 규모부터 이전과 다르다 — 상태는 5,500차원이 넘고, 행동은 수천 개 후보 lot 위의 softmax(후보별 점수를 확률 분포로 바꾸는 표준 층)다.

핵심 설계는 **event-group TD 집계**다. TD(temporal difference) 학습이란 "현재 가치 추정과 한 스텝 뒤 가치 추정의 차이(TD error)"로 가치함수를 갱신하는 RL의 기본 방법인데, 이 연구는 그 갱신 단위를 개별 스텝이 아니라 **이벤트 그룹**으로 묶어 집계한다. 34~35편에서 강조한 관점 — DES 환경에서는 결정도 보상도 고정 시간 간격이 아니라 **이벤트 단위**로 실현되므로, 학습 신호도 그 구조에 맞춰야 한다 — 이 최신 연구의 핵심 설계로 되돌아온 것이다. 이 집계를 offline RL(환경과 상호작용하지 않고 이미 쌓인 로그 데이터만으로 학습하는 방식 — DQL/CQL/IQL)과 online RL(DQL/SAC/PPO) 양쪽에 결합했고, FIFO 대비 throughput **+18.0~20.7%** 를 보고한다. 시리즈의 언어로 말하면, 흐름 (a)가 "환경을 어떻게 감싸는가"(34편)의 답을 키워 온 것이라면, 이 연구는 "학습 신호를 어떻게 이벤트 구조에 정렬하는가"(35편)까지 설계에 넣은 사례다.

## 흐름 (d) — 현실 점검

네 번째 흐름은 성과가 아니라 **의심**의 흐름이다.

**Stöckermann et al. (2025)** 은 같은 RL 방법들을 공개 벤치마크(Mini-Fab, SMT2020)와 실 산업 데이터셋 양쪽에서 돌려 비교했다. 결과는 [[posts/foundations/simulation-and-digital-twin/37-sim-to-real-gap|37편]]의 주제를 정량화한다 — **공개 벤치마크에서의 두 자릿수 % 개선이 실데이터 규모에서는 tardiness 약 4%, throughput 약 1% 수준으로 축소된다.** 벤치마크보다 제품 수와 복잡도가 훨씬 높은 실 fab에서는 룰 대비 이길 여지 자체가 좁아지는 것이다. 이 연구 역시 규모가 커질수록 ES가 확장성에서 우위라고 보고한다.

**2025년의 문헌 리뷰** (Production & Manufacturing Research)는 더 근본적인 지적을 한다: 공개 문헌을 통틀어 **실배치 사례와 검증 방법론이 사실상 결여**되어 있다는 것이다. 장벽으로 확장성·계산 비용·실시간성·강건성을 꼽고, 처방으로 ML 파이프라인 정비와 함께 **룰·스케줄링 기법과 RL을 결합한 하이브리드 아키텍처**를 제안한다 — 순수 end-to-end RL이 아니라, Jang et al.의 rule-based 안전장치 같은 결합이 실배치로 가는 현실적 경로라는 진단이다.

산업계 쪽에는 상용 배치 주장이 있다. minds.ai는 Micron과의 협업을 언급하며 multi-agent RL로 fab 운영을 지원한다는 [whitepaper](https://minds.ai/whitepaper/supporting-fab-operations-using-multi-agent-reinforcement-learning/)를 냈다. 다만 이는 동료심사를 거친 문헌이 아니므로, 여기서는 **벤더 주장**으로만 기록해 둔다. 종합하면 현재 학술적으로 확인 가능한 최전선은 "실데이터 디지털 트윈 위에서의 검증"(Infineon, STMicro, Intel backend)까지이고, 실 fab 운영 루프에 들어간 RL 디스패처의 공개 검증 사례는 아직 없다.

## 한눈에 보기

| 논문 (연도) | 문제 범위 | 알고리즘 | 시뮬레이터/데이터 | 실 fab 관련성 |
|---|---|---|---|---|
| Waschneck 2018 | 워크센터별 (추상 frontend) | cooperative DQN | 자체 소규모 DES | Infineon 협력, 실배치 X |
| Park 2020 | 툴그룹 setup change | parameter 공유 DQN | 자체 DES | X |
| Altenmüller 2020 | 큐타임 제약 제어 | 단일 DQN | 자체 DES | X |
| Tassel 2023 | 전체 fab | NES + self-supervised (attention) | SMT2020 | X |
| Stöckermann WSC 2023 | 전체 fab (실규모) | DRL + ES | Infineon 디지털 트윈 | 실데이터 O |
| Wang IJPR 2025 | multi-area 통합 | cooperative MARL | 자체 DES (세부 미확인) | X |
| Jang 2024 | 공장 전체 (**Intel backend**) | leader-follower MARL + PPO | 실데이터 캘리브레이션 시뮬레이터 | 실데이터 O |
| Stöckermann 2025 | 벤치마크 vs 실 fab | policy-gradient vs ES | Mini-Fab/SMT2020/실데이터 | 실데이터 O |
| Yeganeh 2026 | 전체 fab 중앙 단일 | offline/online RL + event-group TD | STMicro 디지털 트윈 | 실데이터 O |

## 정리

네 흐름에서 공통 교훈 세 가지를 추리면:

- **시뮬레이터가 곧 병목이자 자산이다.** 초기 연구는 자체 소규모 DES에 갇혔고, SMT2020이 공통 무대를 제공하며 규모가 뛰었고, 최전선은 실데이터 디지털 트윈이다 — 어떤 환경 위에서 학습했는가가 연구의 신뢰 수준을 결정한다.
- **분해와 계층화가 확장의 길이다.** 순차 학습 → parameter 공유 → 협조 MARL → leader-follower 계층으로, 행동 공간 폭발과 전역 KPI 정합 사이의 균형점을 찾는 구조가 진화해 왔다. 학습 알고리즘 쪽에서는 긴 지평에서 ES 계열이 policy-gradient의 확장성 대안으로 부상했다.
- **실배치의 마지막 관문은 검증이다.** 벤치마크의 두 자릿수 개선은 실데이터에서 한 자릿수로 줄고, 공개 문헌에 실배치·검증 방법론은 아직 결여되어 있다 — 37편의 sim-to-real 문제가 이 분야 전체의 현재 위치를 규정한다.

다음이자 시리즈의 마지막 글 [[posts/foundations/simulation-and-digital-twin/39-digital-twin-and-rl|39편]]에서는 이 글에서 반복 등장한 개념 — **digital twin과 RL의 결합** — 을 정면으로 다루며 시리즈를 닫는다.

## 참고문헌

- B. Waschneck et al., "Optimization of Global Production Scheduling with Deep Reinforcement Learning", *Procedia CIRP* 72, pp. 1264–1269, 2018. [DOI 10.1016/j.procir.2018.03.212](https://doi.org/10.1016/j.procir.2018.03.212)
- I.-B. Park, J. Huh, J. Kim, J. Park, "A Reinforcement Learning Approach to Robust Scheduling of Semiconductor Manufacturing Facilities", *IEEE Transactions on Automation Science and Engineering* 17(3), pp. 1420–1431, 2020. [DOI 10.1109/TASE.2019.2956762](https://doi.org/10.1109/TASE.2019.2956762)
- T. Altenmüller et al., "Reinforcement learning for an intelligent and autonomous production control of complex job-shops under time constraints", *Production Engineering* 14, pp. 319–328, 2020. [DOI 10.1007/s11740-020-00967-8](https://doi.org/10.1007/s11740-020-00967-8)
- P. Tassel et al., "Semiconductor Fab Scheduling with Self-Supervised and Reinforcement Learning", 2023. [arXiv:2302.07162](https://arxiv.org/abs/2302.07162)
- P. Stöckermann et al., "Dispatching in Real Frontend Fabs with Industrial Grade Discrete-Event Simulations by Deep Reinforcement Learning with Evolution Strategies", *Proceedings of the 2023 Winter Simulation Conference*. [DOI 10.1109/WSC60868.2023.10408625](https://doi.org/10.1109/WSC60868.2023.10408625) ([저자판 PDF](http://simulation.su/uploads/files/default/2023-stockermann-immordino-altenmuller-seidel-gebser-tassel-chan-zhang.pdf))
- Wang et al., "Cooperative multi-agent reinforcement learning for multi-area integrated scheduling in wafer fabs", *International Journal of Production Research* 63(8), pp. 2871–2888, 2025. [DOI 10.1080/00207543.2024.2411615](https://doi.org/10.1080/00207543.2024.2411615)
- J. Jang et al., "Scalable Multi-Agent Reinforcement Learning for Factory-Wide Dynamic Scheduling", 2024 (EAAI 2025 게재 보고). [arXiv:2409.13571](https://arxiv.org/abs/2409.13571)
- P. Stöckermann et al., "Scalability of Reinforcement Learning Methods for Dispatching in Semiconductor Frontend Fabs: A Comparison of Open-Source Models with Real Industry Datasets", *International Journal of Advanced Manufacturing Technology*, 2025. [arXiv:2505.11135](https://arxiv.org/abs/2505.11135) / [DOI 10.1007/s00170-025-16117-2](https://doi.org/10.1007/s00170-025-16117-2)
- Y. Yeganeh et al., "Event-Driven Reinforcement Learning Enables Long-Horizon Control in Semiconductor Fabrication", 2026. [arXiv:2606.10705](https://arxiv.org/abs/2606.10705)
- "Reinforcement Learning Based Dispatching Solutions in Semiconductor Manufacturing: A Literature Review on Validation and Deployment", *Production & Manufacturing Research* 13(1), 2025. [DOI 10.1080/21693277.2025.2582472](https://doi.org/10.1080/21693277.2025.2582472)
- minds.ai, "Supporting Fab Operations Using Multi-Agent Reinforcement Learning" (vendor whitepaper — 동료심사 아님). [링크](https://minds.ai/whitepaper/supporting-fab-operations-using-multi-agent-reinforcement-learning/)
