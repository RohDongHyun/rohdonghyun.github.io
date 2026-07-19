# 글 작성 백로그 (Writing Backlog)

관심 축 세 가지 — **① RL 기반 스케줄링**, **② AI Agent**, **③ Simulation / Digital Twin** — 를 기준으로,
기존 글과 겹치지 않으면서 자연스럽게 이어지는 주제 후보를 정리한 목록이다.

> 사용 메모
> - 각 항목의 `[카테고리]`는 저장 폴더(`foundations` / `insights` / `papers`)를 뜻한다.
> - 우선순위: ⭐⭐⭐ 핵심 갭(빨리 채울 가치 큼) / ⭐⭐ 시리즈 연결 / ⭐ 여력 될 때.
> - papers 항목의 논문명은 작성 시점에 **arXiv/DOI를 반드시 재확인**한다 (할루시네이션 방지).
> - 이미 다룬 것: RL 기초(MDP·Bellman·model-free·DQN·REINFORCE·actor-critic·PPO),
>   AI Agent 구조 개요, LLM Agent 지형도, GNN+RL UPMSP 논문 1편.

---

## 확정 시리즈 확장: 09. Simulation & Digital Twin 통합 목차 (입문 + 심화)

> **2026-07-17 확정.** 기존 "09. Simulation & Digital Twin" 시리즈(입문 편 01~17)에 **심화 편(7부~, 18번부터)을 같은 폴더에 이어 붙인다.**
> 사용자 관심 축: ① DES·ABS·Digital Twin 심화(DT는 최신 트렌드 위주) ② FAB/스케줄링 DES ③ 시뮬레이션×RL.
>
> - 위치: 전부 `content/posts/foundations/simulation-and-digital-twin/` **한 폴더** (insights 분리 없음, 사용자 결정).
> - 기존 01~17은 URL 보존을 위해 파일명·번호 유지. 신규 글은 18번부터 순번 부여.
> - 편당 워크플로: (필요 시) search-agent → writer-agent → review-agent → `npm run build`로 katex-error/잔존 `$$` grep 검증.
> - 태그: `Simulation` 기본. DT 글(25~27, 39)은 `Digital Twin`, FAB·RL 글(28~39)은 `AI Scheduling` 추가.
> - 완료 시 체크박스 갱신. 17편 말미·index.md는 "입문 편/심화 편" 구조로 이미 수정됨 (2026-07-17).

### 입문 편 (완료, 2026-06-30)

- [x] 1부 (01~02) 시뮬레이션이란 / 모델 분류
- [x] 2부 (03~05) 난수·분포 샘플링·Monte Carlo
- [x] 3부 (06~09) DES 개념·큐잉·직접 구현·SimPy
- [x] 4부 (10~14) input modeling·output analysis·V&V·VRT/DOE·시뮬레이션 최적화
- [x] 5부 (15~16) 연속 시뮬레이션/System Dynamics·agent-based 개요
- [x] 6부 (17) Digital Twin 개념 (model/shadow/twin, Kritzinger 분류)

### 7부 — DES 심화 (18~21)

- [x] **18** DES 형식론 (1): Event Graph — `18-event-graph.md` (2026-07-18 작성·검토·빌드 검증 완료)
- [x] **19** DES 형식론 (2): DEVS — `19-devs-formalism.md` (2026-07-18 작성·검토·빌드 검증 완료)
- [x] **20** DES 엔진의 내부: Future Event List와 성능 — `20-inside-a-des-engine.md` (2026-07-18 작성·검토·빌드 검증 완료)
- [x] **21** 병렬·분산 DES — `21-parallel-and-distributed-des.md` (2026-07-18 작성·검토·빌드 검증 완료)

### 8부 — ABS·Digital Twin 심화 (22~27)

- [x] **22** ABS 설계 방법론: ODD 프로토콜 — `22-odd-protocol.md` (2026-07-18 작성·검토 완료)
- [x] **23** ABS 보정과 검증 — `23-abs-calibration-and-validation.md` (2026-07-18 작성·검토 완료)
- [x] **24** 하이브리드 시뮬레이션: DES × ABS × SD — `24-hybrid-simulation.md` (2026-07-18 작성·검토 완료)
- [x] **25** Digital Twin 아키텍처와 표준 — `25-digital-twin-architecture-and-standards.md` (2026-07-18 작성·검토 완료, 자료: `notes/materials-dt-architecture-standards.md`)
- [x] **26** Digital Twin 동기화와 모델 자동 생성 — `26-digital-twin-synchronization-and-model-generation.md` (2026-07-18 작성·검토 완료)
- [x] **27** Digital Twin 최신 트렌드 — `27-digital-twin-trends.md` (2026-07-18 작성·검토 완료, 자료: `notes/materials-dt-trends.md`)

### 9부 — FAB·스케줄링을 위한 DES (28~33)

- [x] **28** 제조 시스템 시뮬레이션과 FAB의 특수성 — `28-manufacturing-simulation-and-fab.md` (2026-07-18 작성·검토 완료)
- [x] **29** FAB DES 모델의 구성요소 (1): 장비 — `29-fab-equipment-modeling.md` (2026-07-18 작성·검토 완료)
- [x] **30** FAB DES 모델의 구성요소 (2): 흐름과 물류 — `30-fab-flow-and-logistics-modeling.md` (2026-07-18 작성·검토 완료)
- [x] **31** 디스패칭 룰 평가 플랫폼으로서의 DES — `31-des-for-dispatching-evaluation.md` (2026-07-18 작성·검토 완료)
- [x] **32** 시뮬레이션 기반 스케줄링과 온라인 시뮬레이션 — `32-simulation-based-scheduling.md` (2026-07-18 작성·검토 완료)
- [x] **33** FAB 시뮬레이션 벤치마크와 도구 — `33-fab-simulation-benchmarks-and-tools.md` (2026-07-18 작성·검토 완료, 자료: `notes/materials-fab-benchmarks.md`)

### 10부 — 시뮬레이션 × 강화학습 (34~39)

- [x] **34** DES를 RL 환경으로 만들기 — `34-des-as-rl-environment.md` (2026-07-18 작성·검토 완료)
- [x] **35** 불규칙한 결정 시점: Semi-MDP 정식화 — `35-semi-mdp-formulation.md` (2026-07-19 작성·검토 완료)
- [x] **36** 학습 친화적 시뮬레이터 설계 — `36-simulator-design-for-learning.md` (2026-07-19 작성·검토 완료)
- [x] **37** Sim-to-Real Gap — `37-sim-to-real-gap.md` (2026-07-19 작성·검토 완료)
- [x] **38** 사례 연구: RL 기반 FAB 디스패칭 연구 흐름 — `38-rl-fab-dispatching-research.md` (2026-07-19 작성·검토 완료, 자료: `notes/materials-rl-fab-dispatching.md`)
- [x] **39** 사례 연구: Digital Twin과 RL의 결합 (+ 시리즈 마무리) — `39-digital-twin-and-rl.md` (2026-07-19 작성·검토 완료)

> **시리즈 전편(01~39) 완료 (2026-07-19).** 심화 편 18~39 전부 작성·review·`npm run build` 검증 통과(katex-error·잔존 `$$` 없음). 커밋 대기.
> 38편에서 파생 가능한 papers 글 후보: Tassel 2023(SMT2020 전체 fab), Jang 2024(leader-follower MARL, Intel backend), Yeganeh 2026(event-driven RL) — 자료는 `notes/materials-rl-fab-dispatching.md`.

---

## ① RL 기반 스케줄링 / 디스패칭

기존에 RL **기초**와 스케줄링 **논문 1편**은 있으나, 둘을 잇는 *이론·방법론 다리*가 비어 있다.

### A. 스케줄링 이론 토대 (먼저 깔아두면 papers 글이 가벼워짐)
- ⭐⭐⭐ **[foundations] 스케줄링 문제 기초와 3-field notation** — `α | β | γ` 표기, 단일/병렬/job-shop/flow-shop 분류, makespan·TWT·flow time 등 목적함수, NP-hardness 직관. *(UPMSP 글에서 표기만 빌려 썼으므로 독립 기초 글로 분리)*
- ⭐⭐⭐ **[foundations] 디스패칭 규칙(Dispatching Rules) 총정리** — SPT·EDD·WSPT·ATC·ATCS·COVERT 등. 반도체 FAB 현장에서 왜 여전히 규칙 기반이 쓰이는지, RL이 대체/보완하려는 지점. *(태그: AI Scheduling)*
- ⭐⭐ **[foundations] Job-shop / Flow-shop Scheduling 개요** — 디스조인트 그래프(disjunctive graph) 표현, 왜 학습 기반 접근의 단골 벤치마크가 되었는지.

### B. 조합최적화를 위한 신경망 (UPMSP 논문의 배경 지식)
- ⭐⭐⭐ **[foundations] 신경망으로 조합최적화 풀기 개요(Neural Combinatorial Optimization)** — Pointer Network → Attention model(Kool et al.) → POMO 계보, constructive vs improvement, autoregressive 디코딩. *(UPMSP 글이 전제로 깔고 있는 배경)*
- ⭐⭐ **[foundations] GNN 기초** — message passing, GCN/GAT/GATv2. UPMSP 글에서 GATv2를 "표준 도구"로 넘겼는데, 그 표준을 따로 정리.
- ⭐⭐ **[foundations] REINFORCE와 rollout baseline 심화** — UPMSP가 쓴 학습법. variance·credit assignment 문제와 baseline의 역할을 독립 글로. *(기존 policy gradient 글의 후속)*

### C. RL 방법론 확장 (스케줄링에 직접 쓰이는 갈래)
- ⭐⭐ **[foundations] 모방학습(Imitation Learning) / Behavior Cloning 개요** — 기존 디스패칭 규칙·MILP 해를 교사로 삼는 warm-start. 사용자 관심사("모방학습 기반 디스패칭")에 직결.
- ⭐⭐ **[foundations] Offline RL 개요** — 실제 FAB 로그로 학습하기. BCQ·CQL·IQL 큰 그림. 온라인 탐험이 불가능한 제조 현장에 왜 맞는지.
- ⭐ **[foundations] Multi-Agent RL 개요** — 장비/스테이션을 다중 에이전트로 보는 분산 디스패칭. CTDE, QMIX 큰 그림.
- ⭐ **[foundations] Action masking과 제약 강제** — UPMSP의 `log(mask)` 트릭을 일반화: invalid action 처리, constrained RL과의 차이.

### D. papers (RL × 스케줄링 논문 요약 — *링크 작성 시 확인 필수*)
- ⭐⭐⭐ **[papers] Learning to Dispatch for Job Shop Scheduling via DRL (Zhang et al., L2D)** — JSSP에 GNN+PPO를 쓴 대표 기준선. UPMSP 글과 짝이 되는 글.
- ⭐⭐ **[papers] Attention, Learn to Solve Routing Problems! (Kool et al.)** — neural CO의 출발점. 위 foundations B와 연결.
- ⭐⭐ **[papers] POMO (Kwon et al.)** — UPMSP가 baseline 기법으로 인용한 계열의 원전.
- ⭐⭐ **[papers] 반도체 FAB 디스패칭에 RL 적용한 최신 논문 1~2편** — 키워드 `semiconductor fab dispatching reinforcement learning`로 roundup 후 선정. *(search-agent: paper-roundup)*
- ⭐ **[papers] Dynamic / Stochastic 스케줄링 RL** — UPMSP 저자가 후속 과제로 언급한 동적·확률적 환경(장비 고장·주문 변경) 다룬 논문.

---

## ② AI Agent

`agent-architecture-overview` 글이 **시리즈 출발점**임을 명시하고 후속을 예고했다. 그 예고된 글들을 채우는 게 1순위.

### A. 예고된 후속 (본문에서 "후속 글에서 다룰 예정"이라 적은 것들)
- ⭐⭐⭐ **[insights] 워크플로 패턴 5종 심화** — prompt chaining / routing / parallelization / orchestrator-workers / evaluator-optimizer 각각을 코드 수준 예시와 함께. *(개요 글의 직접 후속)*
- ⭐⭐⭐ **[insights] ReAct & Reflexion 심화** — Thought-Action-Observation 루프, self-reflection 메모리. 개요에서 원형으로만 소개한 두 논문을 깊게.
- ⭐⭐ **[insights] Supervisor / Hierarchical 멀티 에이전트 심화** — handoff, 단일 실패 지점·토큰 폭증 트레이드오프, Anthropic multi-agent research system 사례 해부.
- ⭐⭐ **[insights] 멀티 에이전트 프레임워크 실전 비교** — LangGraph / OpenAI Agents SDK / CrewAI / AutoGen. 개요 표를 공식 문서로 검증해 확장. *(개요 글에서 "공식 문서 재확인 필요"라 단서 달았던 부분)*

### B. Agent 핵심 기술 (지형도의 빈칸)
- ⭐⭐⭐ **[insights] MCP(Model Context Protocol) 제대로 이해하기** — 도구 표준화. 개요에서 이름만 언급. Agent SDK 관심사에 직결.
- ⭐⭐ **[insights] Tool Use / Function Calling 설계** — ACI(agent-computer interface), 도구 문서화·테스트, 에러 핸들링.
- ⭐⭐ **[insights] Agent 메모리 아키텍처** — short/long-term, episodic, RAG와 메모리의 경계.
- ⭐⭐ **[insights] Agent 평가(Evaluation)와 관측가능성** — 왜 어려운가, trajectory 평가, LLM-as-judge, 체크리스트 기반 평가(LangAGI 글과 연결).
- ⭐ **[insights] Context Engineering** — 컨텍스트 관리, 압축, sub-agent로 컨텍스트 분리.

### C. papers / trend
- ⭐⭐ **[papers] ReAct 원문 정밀 요약** — 개요에서 성과 수치만 인용했으니 단독 논문 글로.
- ⭐ **[insights] AI Agent 최신 trend scan** — 분기별 1회. `AI Agent` 키워드 trend-scan. *(search-agent: trend-scan)*

---

## ③ Simulation / Digital Twin  ← **현재 거의 빈 영역, 차별화 포인트**

블로그에 시뮬레이션 글이 전무하다. 사용자의 박사 전공('이산사건시스템에서의 시간 제어')과 직결되고,
RL·Agent 둘 다와 엮이는 허브라 **여기서 가장 큰 차별화**가 나온다.

### A. 토대
- ⭐⭐⭐ **[foundations] 이산사건 시뮬레이션(DES) 기초** — event/clock/FEL, 큐잉 모델, next-event time advance. 박사 전공을 일반 독자용으로 푸는 간판 글.
- ⭐⭐⭐ **[foundations] Digital Twin 개념 정리** — 정의, 물리시스템↔모델 동기화, 시뮬레이션과의 차이, 제조에서의 성숙도 단계. 용어 난립을 정리하는 레퍼런스 글.
- ⭐⭐ **[foundations] 시뮬레이션 최적화(Simulation Optimization)** — 시뮬레이터를 목적함수로 두고 최적화. ranking & selection, OCBA, 메타휴리스틱.
- ⭐⭐ **[foundations] 반도체 FAB 시뮬레이션 모델링** — wafer flow, 장비/배치/리워크, MES와의 연결. 현업 맥락.

### B. 도구 / 실전
- ⭐⭐ **[insights] SimPy로 만드는 DES** — Python 프로세스 기반 시뮬레이션 튜토리얼. 코드 예시 중심.
- ⭐ **[insights] 상용 시뮬레이터 지형도** — AnyLogic / Simio / Plant Simulation / Arena 개념 비교 (현업 선택 가이드).

### C. 교차 영역 (세 관심사를 잇는 글 — 가장 가치 높음)
- ⭐⭐⭐ **[insights] 시뮬레이션을 RL 환경으로 쓰기** — DES → Gymnasium env 래핑, step/reset/reward 설계, sim-to-real gap. **①+③ 교차의 핵심 글.**
- ⭐⭐ **[insights] Digital Twin 위에서 도는 AI Agent** — 트윈을 world model/시뮬레이터로 삼아 Agent가 what-if를 돌려보는 구조. **②+③ 교차.** (LLM Agent 글의 world model 논의와 연결)
- ⭐⭐ **[papers] 시뮬레이션 기반 RL 스케줄링 논문** — `simulation-based reinforcement learning scheduling` roundup. **①+③.**
- ⭐ **[foundations] Sim-to-Real Transfer 개요** — domain randomization 등. 제조 적용 시 현실 갭 다루기.

---

## 추천 작성 순서 (초안)

1. **[foundations] 디스패칭 규칙 총정리** — RL 스케줄링 글들의 공통 전제, 바로 써먹음. ①
2. **[foundations] 이산사건 시뮬레이션 기초** — 빈 영역 + 전공 간판. ③
3. **[insights] 워크플로 패턴 5종 심화** — 이미 독자에게 예고한 빚. ②
4. **[foundations] Neural Combinatorial Optimization 개요** — UPMSP 글의 배경 보강. ①
5. **[insights] 시뮬레이션을 RL 환경으로 쓰기** — 세 축을 잇는 첫 교차 글. ①+③
6. **[papers] L2D (Job Shop + GNN + PPO)** — UPMSP와 짝. ①

> 이후는 각 축에서 ⭐⭐⭐ → ⭐⭐ 순으로 소화. papers는 search-agent roundup으로 후보 추린 뒤 선별.
