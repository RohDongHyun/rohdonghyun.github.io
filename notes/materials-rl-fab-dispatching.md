# 자료: RL 기반 FAB 디스패칭 논문 roundup (38편용, search-agent 2026-07-18)

## 대표 논문 (서지 검증 상태 표시)

1. **Waschneck et al. 2018** (검증됨) — "Optimization of Global Production Scheduling with Deep Reinforcement Learning", Procedia CIRP 72:1264–1269. DOI 10.1016/j.procir.2018.03.212. Infineon 협력. 추상화 frontend fab, 워크센터별 cooperative DQN(한 에이전트 학습 중 나머지 고정), KPI 유연 목적. 자체 소규모 DES. **fab 디스패칭 DQN의 시조격.**
2. **Park, Huh, Kim, Park 2020** (검증됨) — "A Reinforcement Learning Approach to Robust Scheduling of Semiconductor Manufacturing Facilities", IEEE TASE 17(3):1420–1431. DOI 10.1109/TASE.2019.2956762. 재진입+sequence-dependent setup+대체 장비의 setup change 스케줄링. 장비별 에이전트가 **신경망 파라미터 공유** → 장비 수 변화에 강건. DQN 계열. ⚠️ 상태·보상 세부 미검증.
3. **Altenmüller et al. 2020** (검증됨) — "RL for an Intelligent and Autonomous Production Control of Complex Job-Shops under Time Constraints", Production Engineering 14:319–328. DOI 10.1007/s11740-020-00967-8. **큐타임(time constraint) 위반 최소화**가 1차 목표, 단일 DQN, 상태 210차원. fab 모티브 자체 DES.
4. **Tassel et al. 2023** (arXiv 검증됨) — "Semiconductor Fab Scheduling with Self-Supervised and Reinforcement Learning", arXiv:2302.07162. ⚠️ 학회 수록 여부 미검증. **SMT2020 전체 fab** 글로벌 디스패처 (HV/LM 1,071대/WIP 3,635 lots, LV/HM 1,265대/2,700 lots). 상태=lot별 13 feature(CR, 잔여 납기, tool family 등), attention 정책, tool family 예측 self-supervised 사전학습 + **NES**(Natural Evolution Strategies). CR 룰 대비 총비용 −16.68%/−13.3%.
5. **Stöckermann et al. WSC 2023** (검증됨) — "Dispatching in Real Frontend Fabs with Industrial Grade DES by DRL with Evolution Strategies", DOI 10.1109/WSC60868.2023.10408625. Infineon 실데이터 **디지털 트윈**에서 Flow Factor 최소화, ES 학습(policy-gradient 대비 확장성 우위 보고). 실배치 미확인. 저자판 PDF: http://simulation.su/uploads/files/default/2023-stockermann-immordino-altenmuller-seidel-gebser-tassel-chan-zhang.pdf
6. **Wang et al. IJPR 2025** (DOI 검증됨) — "Cooperative Multi-Agent RL for Multi-Area Integrated Scheduling in Wafer Fabs", IJPR 63(8):2871–2888. DOI 10.1080/00207543.2024.2411615. 여러 area 통합 스케줄링(동적 batching+디스패칭 동시 학습), cooperative MARL. ⚠️ 알고리즘 세부·시뮬레이터 미검증.
7. **Jang et al. 2024** (arXiv 검증됨) — "Scalable Multi-Agent RL for Factory-Wide Dynamic Scheduling", arXiv:2409.13571. EAAI 2025 게재 보고. **Intel 실데이터 — 단 backend(packaging & test) fab** (frontend 재진입 문맥과 구분 필수!). Leader-follower MARL + PPO: leader가 shift마다 목표 벡터 배포, follower가 제품 전환 결정. 보상 = 지연 lot 페널티. rule-based conversion 결합. tardiness −10.4%, 완료율 +31.4%.
8. **Stöckermann et al. 2025** (arXiv 검증됨) — "Scalability of RL Methods for Dispatching in Semiconductor Frontend Fabs: A Comparison of Open-Source Models with Real Industry Datasets", arXiv:2505.11135, IJAMT 게재(10.1007/s00170-025-16117-2). **공개 벤치마크의 두 자릿수 개선이 실데이터에선 tardiness ~4%/throughput ~1%로 축소** — sim-to-real 격차 정량화. ES가 확장성 우위.
9. **Yeganeh et al. 2026** (arXiv 검증됨) — "Event-Driven RL Enables Long-Horizon Control in Semiconductor Fabrication", arXiv:2606.10705. Politecnico di Milano + STMicroelectronics. 실데이터 디지털 트윈, 중앙집중 단일 에이전트, 상태 5,500+차원, 행동=수천 후보 lot softmax. **event-group TD 집계**를 offline(DQL/CQL/IQL)·online(DQL/SAC/PPO)에 결합. FIFO 대비 throughput +18.0~20.7%.
10. **리뷰 2025** (DOI 검증됨, ⚠️ 저자 미검증) — "RL Based Dispatching Solutions in Semiconductor Manufacturing: A Literature Review on Validation and Deployment", Production & Manufacturing Research 13(1). DOI 10.1080/21693277.2025.2582472. 결론: **공개 문헌에 실배치·검증 방법론 결여**; 장벽 = 확장성·계산 비용·실시간성·강건성; 제안 = ML 파이프라인 + 룰/스케줄링+RL 하이브리드.

## 연구 흐름

- (a) 단일 워크센터(2018~2020) → 전체 fab(Tassel 2023, SMT2020) → 실규모 디지털 트윈(Stöckermann 2023/2025). 대규모에서 policy-gradient 취약 → **ES 계열 부상**.
- (b) MARL: 워크센터별+순차 학습(Waschneck) → 파라미터 공유(Park) → area 협조(Wang) → leader-follower 계층(Jang). 공통 동기 = 행동 공간 폭발의 분해 + 전역 KPI 정합.
- (c) 실배치: 학술 문헌상 검증된 사례 사실상 없음(2025 리뷰). 최전선 = 실데이터 디지털 트윈 검증(Infineon, STMicro, Intel backend). minds.ai가 상용 배치 주장 whitepaper(Micron 협업 언급) — **벤더 주장으로만 인용** (https://minds.ai/whitepaper/supporting-fab-operations-using-multi-agent-reinforcement-learning/).
- (d) 공통 한계: sim-to-real 격차(2505.11135 정량), 장비/믹스 변화 일반화(파라미터 공유·ES·계층 분해가 부분 해법), ad-hoc 보상 설계와 long-horizon credit assignment(event-group TD가 공략), 실시간성·검증 절차 부재.

## 분류 표 (글에 넣을 것)

| 논문 (연도) | 문제 범위 | 알고리즘 | 시뮬레이터/데이터 | 실 fab 관련성 |
|---|---|---|---|---|
| Waschneck 2018 | 워크센터별 (추상 frontend) | cooperative DQN | 자체 소규모 DES | Infineon 협력, 실배치 X |
| Park 2020 | 툴그룹 setup change | 파라미터 공유 DQN | 자체 DES | X |
| Altenmüller 2020 | 큐타임 제약 제어 | 단일 DQN | 자체 DES | X |
| Tassel 2023 | 전체 fab | NES+SSL(attention) | SMT2020 | X |
| Stöckermann WSC 2023 | 전체 fab (실규모) | DRL+ES | Infineon 디지털 트윈 | 실데이터 O |
| Wang IJPR 2025 | multi-area 통합 | cooperative MARL | 자체 DES(⚠️) | X |
| Jang 2024 | 공장 전체 (**Intel backend**) | leader-follower MARL+PPO | 실데이터 캘리브레이션 sim | 실데이터 O |
| Stöckermann 2025 | 벤치마크 vs 실 fab | PG vs ES | Minifab/SMT2020/실데이터 | 실데이터 O |
| Yeganeh 2026 | 전체 fab 중앙 단일 | offline/online RL+event TD | STMicro 디지털 트윈 | 실데이터 O |

## 그림 후보

- [검증됨] https://ar5iv.labs.arxiv.org/html/2302.07162/assets/x1.png — Tassel 2023 attention 정책 아키텍처 (arXiv:2302.07162 Fig.1)
- [검증됨] https://arxiv.org/html/2409.13571v1/x1.png — Jang 2024 leader-follower 프레임워크 (arXiv:2409.13571 Fig.1a)

## Writer 주의

- Tassel 학회 수록 여부·Wang 세부·리뷰 저자 명단 미검증 — 단정 금지.
- Jang et al.은 backend(P&T)이므로 wafer fab 재진입 문맥과 구분해 서술.
- L2D 등 일반 job shop RL은 제외 (기존 papers 글에서 다룸).
