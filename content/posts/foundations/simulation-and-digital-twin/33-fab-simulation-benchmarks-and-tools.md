---
title: 33. FAB 시뮬레이션 벤치마크와 도구
date: 2026-07-18
tags:
  - Simulation
  - AI Scheduling
---

9부를 마무리하는 글이다. [[posts/foundations/simulation-and-digital-twin/28-manufacturing-simulation-and-fab|28편]]에서 fab이 왜 DES의 끝판왕인지 — re-entrant flow, batch 장비, sequence-dependent setup, downtime — 를 보았고, 이어지는 글들에서 그 요소들을 모델링하고, [[posts/foundations/simulation-and-digital-twin/31-des-for-dispatching-evaluation|31편]]에서 디스패칭 정책을 시뮬레이션으로 평가하는 실험 설계를, [[posts/foundations/simulation-and-digital-twin/32-simulation-based-scheduling|32편]]에서 시뮬레이션을 운영의 루프 안으로 가져오는 시뮬레이션 기반 스케줄링까지 다뤘다. 남은 질문은 실용적인 것이다. **그래서, 어디서 시작하나?** 연습하고 연구할 fab 모델은 어디서 구하고, 어떤 시뮬레이터 위에서 돌리는가. 이 글은 그 지형도 — 공개 벤치마크 세 가지(Mini-Fab, MIMAC, SMT2020)와 상용·오픈소스 도구들 — 를 정리한다.

## 왜 공개 벤치마크인가

실제 fab의 데이터 — 제품별 라우트, 스텝별 처리시간, 장비 대수와 가용성, 투입 계획 — 는 반도체 회사의 **극비**다. 라우트와 처리시간만 있어도 경쟁사가 공정 기술 수준과 capacity를 역산할 수 있기 때문이다. 그 결과 fab 스케줄링 연구는 오랫동안 고질적인 문제를 안고 있었다: 각 논문이 자기만 아는(그리고 공개할 수 없는) 모델 위에서 결과를 내니, **재현도 비교도 불가능**했다. "우리 방법이 FIFO보다 cycle time을 10% 줄였다"는 주장을 다른 연구자가 검증할 방법이 없는 것이다.

공개 벤치마크는 이 문제를 푼다. 누구나 내려받을 수 있는 동일한 fab 모델 위에서 각자의 방법을 돌리면, 결과가 재현 가능해지고 방법 간 비교가 공정해진다. 다만 아무 모델이나 벤치마크가 되는 것은 아니다. 좋은 fab 벤치마크의 조건은 두 가지가 긴장 관계에 있다.

- **fab다워야 한다**: 28편에서 본 특수성 — 재진입, batch 처리, setup, downtime — 이 빠지면 "fab 벤치마크"가 아니라 그냥 job shop이다. 이 요소들이 있어야 fab 고유의 어려움을 겨냥한 방법을 시험할 수 있다.
- **다룰 수 있어야 한다**: 데이터가 완결적으로 명세되어 있고, 규모가 목적에 맞아야 한다. 알고리즘 프로토타이핑에 장비 천 대짜리 모델은 과하고, capacity 연구에 장비 다섯 대짜리 모델은 부족하다.

아래 세 벤치마크는 이 스펙트럼 위에 놓인다 — 초소형 교육용(Mini-Fab), 실측 기반 중형(MIMAC), 현대 fab 규모(SMT2020).

## Intel Mini-Fab: 손바닥 위의 fab

**Intel Mini-Fab**은 Intel의 Karl Kempf가 1994년 Arizona State University(ASU)와 함께 만든 초소형 테스트베드다. 규모는 극단적으로 작다 — **장비 5대, workstation 3개, 공정 스텝 6개.** 그런데 이 최소 구성 안에 fab의 특수성이 압축되어 있다: diffusion은 **batch 장비**(여러 lot을 한꺼번에 처리)이고, setup과 PM(preventive maintenance, 계획 정비)이 들어 있으며, 무엇보다 라우트가 **재진입**한다. 6개 스텝이 3개 workstation을 각각 두 번씩 방문하는 구조다.

| 스텝 | workstation | 비고 |
|---|---|---|
| 1 | Diffusion (장비 A·B) | batch 처리 |
| 2 | Ion implantation (장비 C·D) | |
| 3 | Lithography (장비 E) | |
| 4 | Ion implantation | **재진입** — 스텝 2와 같은 station |
| 5 | Diffusion | 재진입 — 스텝 1과 같은 station |
| 6 | Lithography | 재진입 — 스텝 3과 같은 station |

같은 diffusion 장비 앞에 스텝 1을 기다리는 lot과 스텝 5를 기다리는 lot이 나란히 줄을 서는 상황 — 28편에서 말한 재진입 디스패칭 문제의 축소판 — 이 장비 5대만으로 재현된다. 여기에 복수 제품(문헌에 따라 2~3종으로 소개된다)이 혼류되어 제품 간 우선순위 문제까지 생긴다.

이 작음이 Mini-Fab의 존재 이유다. 상태 공간이 손으로 그릴 수 있을 만큼 작아서 알고리즘의 동작을 **눈으로 따라갈 수** 있고, 시뮬레이션 한 번이 순식간에 끝나 실험을 수백 번 돌릴 수 있다. 그래서 ADP(approximate dynamic programming)·MPC(model predictive control)·RL 같은 제어·학습 알고리즘의 **프로토타이핑 단계 표준 벤치마크**로 오래 쓰여 왔다. 새 디스패칭 아이디어가 있다면, SMT2020으로 가기 전에 Mini-Fab에서 먼저 굴려 보는 것이 정석이다.

## MIMAC: 실측 데이터 기반의 오랜 표준

**MIMAC**(Measurement and Improvement of Manufacturing Capacities)은 1990년대 중반 미국의 **SEMATECH**과 유럽의 **JESSI**가 공동으로 수행한 프로젝트로, 최종 보고서는 Fowler & Robinson (1995)이다. 이름 그대로 원래 목적은 벤치마크 제작이 아니라 **fab의 capacity 손실 요인 측정**이었다. 부속 실험에서 11개 후보 요인 중 **downtime, yield(수율), dispatch rule, setup** 네 가지가 일관되게 유의한 capacity 손실 요인으로 확인되었는데 — 디스패칭 규칙이 장비 고장과 같은 반열의 capacity 요인이라는 이 결과 자체가, 이 시리즈가 디스패칭에 집착하는 이유의 오래된 근거이기도 하다.

이 프로젝트의 부산물이자 진짜 유산이 **실제 fab 데이터에 기반한 시뮬레이션 데이터셋**이다. 제품별 라우트와 처리시간, rework 라우트, 장비·operator 가용성, 제품 투입 계획까지 fab 모델에 필요한 요소가 완결적으로 명세되어 있다. 규모는 모델에 따라 다른데, 큰 모델 기준으로 **장비 수백 대, 툴그룹 수십 개, 제품 십수~수십 종, 라우트당 스텝 수백 개** 수준이다(문헌마다 집계가 조금씩 달라 — 예컨대 최대 스텝 수가 280으로도 340으로도, 데이터셋 개수가 6으로도 7로도 — 인용되니, 정확한 수치는 내려받은 데이터셋 자체를 기준으로 삼는 것이 안전하다). 장난감이 아닌, 실측에 뿌리를 둔 fab 모델을 누구나 쓸 수 있게 된 것은 MIMAC이 처음이었고, 이후 20년 넘게 fab 시뮬레이션·스케줄링 연구의 **사실상 표준 벤치마크**로 쓰였다. 데이터셋은 지금도 FernUniversität Hagen의 [p2SchedGen 다운로드 페이지](https://p2schedgen.fernuni-hagen.de/index.php/downloads/simulation)에서 받을 수 있다.

## SMT2020: 현대 fab 규모의 현행 표준

MIMAC의 데이터는 1990년대 200mm 시대의 fab을 반영한다. 그 사이 fab은 300mm 웨이퍼로 넘어가며 훨씬 커졌고, AMHS(automated material handling system, 자동 반송 시스템)가 물류를 담당하는 고도 자동화 공장이 되었다. 이 간극을 메우려고 나온 것이 **SMT2020**(Semiconductor Manufacturing Testbed 2020) — Kopp, Hassoun, Kalir, Mönch가 IEEE Transactions on Semiconductor Manufacturing에 발표한 테스트베드다 ([DOI 10.1109/TSM.2020.3001933](https://doi.org/10.1109/TSM.2020.3001933)).

구성은 총 4개 시나리오다.

- **HV/LM**(high-volume/low-mix): 소품종 대량 생산 — 메모리 fab에 가까운 구도.
- **LV/HM**(low-volume/high-mix): 다품종 소량 생산 — foundry에 가까운 구도.
- 위 두 시나리오 각각에 **engineering lot**(공정 개발·실험용 lot으로, 양산 lot과 다른 우선순위로 섞여 흐른다) 혼류를 추가한 확장 2개.

규모는 현대 fab답게 **장비 1,000대 이상, 툴그룹 100여 개, 라우트당 스텝 수백 개**(한 비교 문헌 기준 최대 632 스텝) 수준이다 — MIMAC 대비 장비 수로 4배가 넘는다. 시나리오별로 장비 수가 다르므로 여기서도 정확한 수치는 데이터셋 원본이 기준이다. AMHS 관련 속성이 포함되어 반송까지 모델링 범위에 들어왔고, 데이터는 XLSX로 배포되어 파싱이 쉽다. 논문에 "open to public use"가 명시되어 있으며 역시 p2SchedGen에서 받을 수 있다. 후속으로 queue time constraint(선행 스텝 후 일정 시간 안에 후속 스텝을 처리해야 하는 제약)를 통합한 확장도 나왔다 (Kopp & Mönch, [WSC 2020](https://informs-sim.org/wsc20papers/194.pdf)).

현재 시점에서 SMT2020의 위치는 분명하다: **RL 기반 fab 디스패칭 연구의 표준 벤치마크.** 최근 이 분야 논문들이 방법을 겨루는 공통 무대가 대부분 SMT2020이다. fab 스케줄링에 학습 기법을 적용해 보려는 독자라면, 결국 이 데이터셋 위에 서게 된다.

## 벤치마크에서 이겼다 ≠ fab에서 이긴다

그렇다면 SMT2020에서 이기면 실제 fab에서도 이기는가? Infineon의 실데이터로 이 질문을 직접 검증한 Stöckermann et al. ([arXiv:2505.11135](https://arxiv.org/abs/2505.11135))의 보고는 냉정하다. **실제 fab은 SMT2020보다 제품 수가 10배 이상 많고** 전반적 복잡도가 훨씬 높으며, 공개 벤치마크에서 확인된 RL 디스패칭의 성능 개선 폭이 실데이터 규모에서는 **크게 줄어든다**는 것이다.

이는 벤치마크가 무용하다는 말이 아니라, 벤치마크의 역할을 정확히 이해하라는 말이다. 공개 벤치마크는 방법 간 **공정한 비교와 재현**을 위한 무대이지, 실배치 성능의 보증서가 아니다. 시뮬레이터 위에서 학습한 정책이 현실에서 통하는가 — 이른바 sim-to-real 문제 — 는 별도의 주제이고, 10부의 [[posts/foundations/simulation-and-digital-twin/37-sim-to-real-gap|37편]](예정)에서 정면으로 다룬다.

## 도구 지형도

벤치마크가 악보라면 시뮬레이터는 악기다. fab 시뮬레이션에 쓰이는 대표 도구들을 정리하면 다음과 같다.

| 도구 | 성격 | 특징 |
|---|---|---|
| Applied SmartFactory Simulation AutoSched | 상용, fab 전용 | capacity planning·디스패칭 룰 실험. 업계에서 오래 쓰인 fab 전용 시뮬레이터 |
| Siemens Tecnomatix Plant Simulation | 상용, 범용 제조 DES | 공장 일반 대상 DES + throughput 최적화 |
| FlexSim | 상용, 범용 3D DES | 3D 시각화 강점. 현재 Autodesk 소유 |
| AnyLogic | 상용, 멀티메소드 | DES·agent-based·system dynamics를 한 모델에 혼합 가능 |
| D-SIMLAB D-SIMCON | 상용, fab 전용 | fab 시뮬레이션·forecasting 특화 |
| PySCFabSim | **오픈소스**, fab 연구용 | SMT2020 직접 지원, ML 학습용 고속 설계 |

**AutoSched**(현재 명칭 Applied SmartFactory Simulation AutoSched, 구 AutoSched AP)는 반도체 업계에서 사실상 표준처럼 쓰여 온 fab 전용 상용 시뮬레이터다. 원래 AutoSimulations의 제품이었고 현재는 Applied Materials 소유다(중간 인수 연혁은 문헌마다 서술이 달라 생략한다). **Plant Simulation**·**FlexSim**·**AnyLogic**은 fab 전용이 아닌 범용 제조 시뮬레이터로, fab 모델을 직접 구축해야 하지만 그만큼 유연하다. **D-SIMCON**은 fab 전용 시뮬레이션·forecasting 도구로, 위에서 소개한 Infineon 연구(arXiv:2505.11135)에서 실데이터 시뮬레이션에 사용되었다.

오픈소스 쪽에서 주목할 것은 **PySCFabSim**이다 ([GitHub](https://github.com/prosysscience/PySCFabSim-release)). SMT2020 데이터셋을 직접 읽어 들이는 연구용 fab 시뮬레이터로, [[posts/foundations/simulation-and-digital-twin/09-modeling-des-with-simpy|09편]]에서 쓴 SimPy가 아니라 순수 Python event-based로 구현되었는데, 이는 **ML 학습용 고속 실행**(초당 수십만 job 처리 목표)을 위한 선택이다 — RL 학습은 시뮬레이션을 수백만 번의 의사결정 단위로 돌려야 하므로 엔진 속도가 곧 실험 가능성이다. FIFO·CR(critical ratio) 같은 규칙 비교와 RL 학습을 지원하며, 부속 RL 코드도 공개되어 있다 ([rl4semiconductorfabsched](https://github.com/ingambe/rl4semiconductorfabsched), [arXiv:2302.07162](https://arxiv.org/abs/2302.07162)). **fab RL 연구에 진입하려는 독자에게 실질적인 출발점**이다. 참고로 SimPy 기반의 fab 전체 규모 공개 구현은 — 이번 조사 범위에서는 — 뚜렷한 것이 발견되지 않았다. job shop용이나 cluster tool 단위의 인접 구현이 있을 뿐이라, 09편식 SimPy 모델링으로 fab 전체를 다루려면 직접 지어야 하는 것이 현재의 정직한 현황이다.

## 더 깊이 가려면

fab 생산 계획·스케줄링 전반의 표준 참고서는 Mönch, Fowler, Mason의 *Production Planning and Control for Semiconductor Wafer Fabrication Facilities* (Springer, 2013)다. 이 시리즈 9부가 시뮬레이션 관점에서 스케치한 내용의 학술적 원전에 해당한다. 논문 단위로는 Mönch 등의 Journal of Scheduling survey (2011)가 반도체 스케줄링의 문제·기법·과제를 조망하는 표준 서베이다. 서지는 아래 참고문헌에 있다.

## 정리

- 실제 fab 데이터는 극비라 연구의 재현·비교가 불가능했고, **공개 벤치마크**가 이를 푼다. 좋은 벤치마크는 fab 특수성(재진입·batch·setup·downtime)을 담으면서 완결적으로 명세되어야 한다.
- **Intel Mini-Fab**(Kempf, 1994): 장비 5대·workstation 3개·스텝 6개에 재진입·batch·setup·PM을 압축한 초소형 테스트베드. 알고리즘 프로토타이핑의 출발점.
- **MIMAC**(SEMATECH·JESSI, 1995): capacity 손실 요인 연구(downtime·yield·dispatch rule·setup이 유의)의 부산물로 나온 **실측 기반 데이터셋**. 장비 수백 대·라우트당 스텝 수백 개 규모로 오랫동안 표준이었다.
- **SMT2020**(Kopp et al., 2020): 장비 1,000대 이상의 300mm 현대 fab 규모, 4개 시나리오(HV/LM·LV/HM + engineering lot 혼류), AMHS 속성 포함. **현재 RL 디스패칭 연구의 표준 벤치마크.**
- 단, 실제 fab은 SMT2020보다 제품 수 10배 이상·복잡도가 훨씬 높고, 벤치마크에서의 개선 폭이 실데이터에서는 크게 줄어든다는 보고(arXiv:2505.11135)가 있다 — **벤치마크 승리가 fab 승리를 보증하지 않는다.**
- 도구는 fab 전용 상용(AutoSched, D-SIMCON), 범용 상용(Plant Simulation, FlexSim, AnyLogic), 그리고 오픈소스 **PySCFabSim**(SMT2020 직접 지원, ML 학습용 고속)으로 나뉜다.

이것으로 9부를 마친다. 벤치마크가 있고, 그것을 돌릴 시뮬레이터가 있다. 그렇다면 다음 단계는 자명하다 — 그 시뮬레이터 위에서 디스패칭 정책을 **학습**시키는 것이다. 10부는 [[posts/foundations/simulation-and-digital-twin/34-des-as-rl-environment|34편]]에서 DES를 RL 환경으로 바꾸는 것부터 시작한다.

## 참고문헌

- J. W. Fowler, J. Robinson, *Measurement and Improvement of Manufacturing Capacity (MIMAC) Final Report*, SEMATECH, 1995. ([Semantic Scholar](https://www.semanticscholar.org/paper/ee3dbf2fff85f4364b8ebbb62c30db0d68887a83))
- D. Kopp, M. Hassoun, A. Kalir, L. Mönch, "SMT2020—A Semiconductor Manufacturing Testbed", *IEEE Transactions on Semiconductor Manufacturing*, 33(4), pp. 522–531, 2020. [DOI 10.1109/TSM.2020.3001933](https://doi.org/10.1109/TSM.2020.3001933)
- D. Kopp, L. Mönch, "Extending the SMT2020 Testbed by Queue Time Constraints", *Proceedings of the 2020 Winter Simulation Conference*. ([PDF](https://informs-sim.org/wsc20papers/194.pdf))
- P. Stöckermann et al., "Scalability of Reinforcement Learning Methods for Dispatching in Semiconductor Frontend Fabs", 2025. [arXiv:2505.11135](https://arxiv.org/abs/2505.11135)
- L. Mönch, J. W. Fowler, S. J. Mason, *Production Planning and Control for Semiconductor Wafer Fabrication Facilities*, Springer Operations Research/Computer Science Interfaces Series vol. 52, 2013. [DOI 10.1007/978-1-4614-4472-5](https://doi.org/10.1007/978-1-4614-4472-5)
- L. Mönch, J. W. Fowler, S. Dauzère-Pérès, S. J. Mason, O. Rose, "A survey of problems, solution techniques, and future challenges in scheduling semiconductor manufacturing operations", *Journal of Scheduling*, 14, pp. 583–599, 2011. [DOI 10.1007/s10951-010-0222-9](https://doi.org/10.1007/s10951-010-0222-9)
- 벤치마크 데이터셋 배포처: [p2SchedGen, FernUniversität Hagen](https://p2schedgen.fernuni-hagen.de/index.php/downloads/simulation)
- Intel Mini-Fab 원자료: [ASU 소개 페이지](https://tsakalis.faculty.asu.edu/intel.htm), [INL 기술 문서(PDF)](https://inldigitallibrary.inl.gov/sites/sti/sti/Sort_64138.pdf)
- PySCFabSim: [GitHub prosysscience/PySCFabSim-release](https://github.com/prosysscience/PySCFabSim-release) / 부속 RL 코드 [ingambe/rl4semiconductorfabsched](https://github.com/ingambe/rl4semiconductorfabsched) ([arXiv:2302.07162](https://arxiv.org/abs/2302.07162))
