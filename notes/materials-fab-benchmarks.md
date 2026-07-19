# 자료: FAB 시뮬레이션 벤치마크와 도구 (33편용, search-agent 2026-07-18)

## 1. MIMAC

- 유래 (검증됨): MIMAC = Measurement and Improvement of Manufacturing Capacities. JESSI/MST(유럽) + SEMATECH(미국) 공동 프로젝트, fab capacity 손실 요인 측정 목적. 최종 보고서 Fowler & Robinson (1995). (https://www.semanticscholar.org/paper/ee3dbf2fff85f4364b8ebbb62c30db0d68887a83)
- 부속 실험: 11개 요인 중 downtime, yield, dispatch rule, setup 4개가 일관된 유의 요인.
- 내용: 실제 fab 데이터 기반 — product routing·process time, rework routing, equipment/operator availability, product starts.
- 규모 (⚠️ 출처 간 차이): arXiv:2505.11135 Table 2 기준 최대 260 machines / 85 tool groups / 21 products / 라우트당 최대 280 steps. 다른 문헌은 최대 340 steps. 데이터셋 개수 6 vs 7 혼재. **단정 금지, 범위로 서술.**
- 배포처 (검증됨): FernUni Hagen p2SchedGen 다운로드 페이지 — "MIMAC Datasets", "MIMAC I Engineering Model" ZIP (https://p2schedgen.fernuni-hagen.de/index.php/downloads/simulation)

## 2. SMT2020

- 서지 (Crossref 검증됨): D. Kopp, M. Hassoun, A. Kalir, L. Mönch, "SMT2020—A Semiconductor Manufacturing Testbed", IEEE Trans. Semiconductor Manufacturing 33(4), pp. 522–531, 2020. DOI 10.1109/TSM.2020.3001933
- 구성 (초록 검증됨): 총 4개 모델 — HV/LM + LV/HM 기본 2개 + engineering lot 혼류 확장 2개.
- 규모: arXiv:2505.11135 Table 2 기준 1,043 machines / 105 tool groups / 10 products / 최대 632 steps. 다른 자료는 시나리오별 1,071~1,265 machines. ⚠️ 시나리오별 차이 — 단정 금지.
- MIMAC 대비: 300mm 현대 fab 규모(장비 4배+), engineering lot 혼류, AMHS 속성 포함, XLSX 배포. 후속: queue time constraint 통합 (Kopp & Mönch WSC 2020, https://informs-sim.org/wsc20papers/194.pdf).
- 공개: p2SchedGen에서 ZIP 배포, 논문에 "open to public use" 명시.

## 3. Intel Mini-Fab

- 유래 (검증됨): Karl Kempf(Intel, 1994)가 ASU와 만든 초소형 테스트베드. 5 machines / 3 workstations / 6 processing steps — diffusion(배치), ion implantation, lithography. 재진입·배치·setup·PM을 압축. 제품 수 2~3종 혼재(⚠️ 단정 금지). (INL PDF: https://inldigitallibrary.inl.gov/sites/sti/sti/Sort_64138.pdf / ASU: https://tsakalis.faculty.asu.edu/intel.htm)
- ADP/MPC/RL 제어 알고리즘의 표준 소형 벤치마크.
- p2SchedGen 기타 배포 모델: Kayton et al. (1997), Backend Model, Supply chain TestBed.

## 4. 상용 시뮬레이터

- **Applied SmartFactory Simulation AutoSched** (구 AutoSched AP) — Applied Materials 소유 (제품 페이지 확인: https://appliedsmartfactory.com/semiconductor/productivity-solutions/simulation-autosched/). capacity planning·디스패칭 룰 실험. 원래 AutoSimulations 제품. ⚠️ 인수 연혁 연도 미검증.
- **Siemens Tecnomatix Plant Simulation** — 범용 제조 DES + throughput 최적화 (공식 페이지 확인).
- **FlexSim** — 3D DES, 현재 Autodesk 소유 (사이트 저작권 표기 확인).
- **AnyLogic** — 멀티메소드(DES·ABM·SD). ⚠️ 사이트 403으로 이번 조사에서 본문 미확인.
- **D-SIMLAB D-SIMCON** — 반도체 fab 전용 시뮬레이션·forecasting (공식 사이트 확인). Infineon 연구(arXiv:2505.11135)에서 실데이터 시뮬레이션에 사용.

## 5. 오픈소스

- **PySCFabSim** (검증됨): SMT2020 직접 지원 연구용 fab 시뮬레이터. SimPy 아닌 순수 Python event-based, ML 학습용 고속(초당 ~50만 job 목표). FIFO/CR 비교·RL 학습 지원. GitHub: https://github.com/prosysscience/PySCFabSim-release ⚠️ 라이선스 미확인.
- 관련 RL 코드: https://github.com/ingambe/rl4semiconductorfabsched (arXiv:2302.07162 부속).
- SimPy 기반 fab 전체 공개 구현은 뚜렷한 것 미발견 (인접: SimRLFab — job shop용, cluster tool 단위 시뮬레이터 등).

## 6. 표준 참고서·서베이 (서지 검증됨)

- Mönch, Fowler, Mason, *Production Planning and Control for Semiconductor Wafer Fabrication Facilities*, Springer ORCS vol. 52, 2013. DOI 10.1007/978-1-4614-4472-5
- Mönch, Fowler, Dauzère-Pérès, Mason, Rose, "A survey of problems, solution techniques, and future challenges in scheduling semiconductor manufacturing operations", *Journal of Scheduling* 14, 583–599, 2011. DOI 10.1007/s10951-010-0222-9 (오픈액세스: https://hal.science/emse-00613040)
- Stöckermann et al., "Scalability of RL Methods for Dispatching in Semiconductor Frontend Fabs..." (arXiv:2505.11135, 2025) — Minifab/SMT2020/실데이터 규모 비교표. 실제 fab은 SMT2020보다 제품 수 10배+, 복잡도 훨씬 높음 — "벤치마크 vs 현실 격차" 논거.

## 그림

- 검증된 hotlink 그림 없음. Mini-Fab(5장비/3스테이션/6스텝)은 표/텍스트로 직접 그리는 것 권장.

## Writer 주의

MIMAC 스텝 수(280/340)·개수(6/7), SMT2020 장비 수(1,043/1,071~1,265), Mini-Fab 제품 수(2/3), AutoSched 인수 연혁 — 전부 단정 금지, 범위·완곡 서술.
