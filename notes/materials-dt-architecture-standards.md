# 자료: Digital Twin 아키텍처와 표준 (25~26편용, search-agent 수집 2026-07-17)

## 1. ISO 23247 — Digital twin framework for manufacturing

정의: 제조 digital twin = "fit for purpose digital representation of an observable manufacturing element **with synchronization** between the element and its digital representation" — 동기화가 정의의 일부. (ISO 23247-1:2021, https://cdn.standards.iteh.ai/samples/75066/ec0a1c59176e488887873acda6b7ecd9/ISO-23247-1-2021.pdf)

2021년 발행 4개 파트 (NIST Shao: https://tsapps.nist.gov/publication/get_pdf.cfm?pub_id=957622 / ISO: https://www.iso.org/standard/78743.html):
- Part 1 (2021) Overview and general principles — 일반 원칙·요구사항·용어
- Part 2 (2021) Reference architecture — 도메인/엔티티 기반 참조 아키텍처
- Part 3 (2021) Digital representation of manufacturing elements — OME 기본 정보 속성
- Part 4 (2021) Information exchange — 엔티티 간 정보 교환 요구사항

확장 (2025~2026):
- Part 5: Digital thread for digital twin — ISO 23247-5:2026으로 2026-06-24 발행 예정으로 등재 (https://www.iso.org/standard/87425.html). ⚠️ 최종 발행 여부 작성 시 재확인.
- Part 6: Digital twin composition — 복수 DT 간 구성·통신·협업, FDIS 단계 (https://www.iso.org/standard/87426.html)
- ISO/TR 23247-100:2025 — **반도체 잉곳 성장 공정 관리 use case** TR (https://www.iso.org/standard/90387.html). 사용자 fab 도메인과 직결, 한 단락 가치.

Part 2 reference architecture (ISO/IEC 30141 IoT 참조 아키텍처 기반, 4개 도메인/엔티티):
1. Observable Manufacturing Elements (OME) — 인력, 장비, 자재, 공정, 시설, 환경, 제품
2. Data Collection and Device Control Entity — 데이터 수집 + 장치 제어 sub-entity, 물리-디지털 접점. ⚠️ 명칭이 자료마다 "Device Communication Entity"와 혼용 — "data collection & device control 기능을 담당하는 장치 통신 엔티티"로 완곡 표현 권장.
3. Digital Twin Entity (core) — 디지털 표현 생성·유지: 운영·관리(동기화 포함), 애플리케이션·서비스(시뮬레이션·분석·예지보전), 리소스 접근·교환
4. User Entity — 인간 사용자·MES/ERP 등 상위 애플리케이션

## 2. RAMI 4.0와 Asset Administration Shell (AAS)

RAMI 4.0 (2015, Plattform Industrie 4.0/ZVEI) 3차원 모델 (ZVEI Status Report: https://www.zvei.org/fileadmin/user_upload/Presse_und_Medien/Publikationen/2016/januar/GMA_Status_Report__Reference_Archtitecture_Model_Industrie_4.0__RAMI_4.0_/GMA-Status-Report-RAMI-40-July-2015.pdf / EU Futurium 소개: https://ec.europa.eu/futurium/en/system/files/ged/a2-schweichhart-reference_architectural_model_industrie_4.0_rami_4.0.pdf):
- Hierarchy Levels 축: Product → Field Device → Control Device → Station → Work Centers → Enterprise → Connected World (IEC 62264/61512 확장)
- Life Cycle & Value Stream 축: IEC 62890, Type(설계·개발)/Instance(개별 자산) 구분
- Layers 축 6층: Asset — Integration — Communication — Information — Functional — Business

AAS: 자산의 일관된 디지털 표현 공통 메타모델. asset(물리)+administration shell(디지털)=Industry 4.0 component. Industry 4.0 진영의 표준화된 DT 구현체. 내부는 submodel 집합(자산의 한 측면씩: 명판, 기술 데이터, 문서, 탄소발자국 등). 메타모델 스펙 IDTA-01001 Part 1 Metamodel V3.0 (https://industrialdigitaltwin.org/wp-content/uploads/2025/03/IDTA-01001-3-0-2_SpecificationAssetAdministrationShell_Part1_Metamodel.pdf). 국제표준 IEC 63278-1.

IDTA submodel template 현황 (https://industrialdigitaltwin.org/en/content-hub/submodels / https://github.com/admin-shell-io/submodel-templates):
- published 대표: Digital Nameplate (IDTA 02006 v3.0.1), Handover Documentation (02004), Generic Frame for Technical Data (02003), Carbon Footprint (02023), Digital Battery Passport (02035), Digital Product Passport Part 1 (02099), Hierarchical Structures (02011-1), Production Calendar (02067)
- 개발 중: AI-Agent (02103), Digital Worker Profile (02091) 등 30여 개
- 규모: 2024-02 기준 18개 발행/총 84개 계획 (arXiv:2406.14470). ⚠️ 정확한 현재 개수는 단정하지 말 것.

## 3. Tao et al. 5-dimension 모델

서지 (검증됨): F. Tao, H. Zhang, A. Liu, A. Y. C. Nee, "Digital Twin in Industry: State-of-the-Art," IEEE Trans. Industrial Informatics 15(4), pp. 2405–2415, 2019. DOI: 10.1109/TII.2018.2873186 (인용 ~3,196회).
⚠️ "최초 제안은 2018 CIRP Annals 논문"이라는 서술은 미검증 — TII 2019만 인용하고 "Tao 등이 2018~2019년에 걸쳐 정립"으로 쓸 것.

$\mathcal{M}_{DT} = (PE, VE, Ss, DD, CN)$
1. PE (Physical Entity) — 실제 물리 대상
2. VE (Virtual Entity/Model) — 기하·물리 속성·거동·규칙을 포함한 디지털 모델
3. Ss (Services) — PE 대상 모니터링·예측·최적화 / VE 대상 모델 구축·보정·검증 서비스
4. DD (DT Data) — PE/VE/Ss 데이터 + 도메인 지식 + 융합 데이터
5. CN (Connections) — 6종 연결: CN_PV, CN_PD, CN_PS, CN_VD, CN_VS, CN_SD

## 4. 물리-가상 동기화

- ISO 23247은 동기화를 DT 정의에 포함, DTE 운영·관리 기능에 동기화 포함.
- Online calibration 대표 논문: X. Hu, M. Yan, "Data Assimilation for Online Calibration of Simulation Digital Twin — A Case Study with Multiple Model Parameters," Proc. WSC 2024 (PDF: https://informs-sim.org/wsc24papers/inv175.pdf / IEEE: https://ieeexplore.ieee.org/document/10838855/). particle filter 기반 data assimilation으로 시뮬레이션 DT 파라미터를 실시간 추정. ⚠️ IEEE DOI는 Xplore에서 확인 필요.
- 동기화 주기 차등: 인지·제어 ms 수준, 계획·정책 학습은 느린 주기 (arXiv:2602.19390 — ⚠️ 원문 위치 재확인).
- 트레이드오프 프레임(일반론으로 서술): 동기화 주기↑ → 추적 정확도↑, 계산·통신 비용↑; 모델 fidelity↑ → 1회 보정 비용↑ → 실시간성↓. 단일 정식 출처 없음.

## 5. 시뮬레이션 모델 자동 생성

- 대표 논문 1 (검증됨): G. Lugaresi, A. Matta, "Automated manufacturing system discovery and digital twin generation," Journal of Manufacturing Systems 59, pp. 51–66, 2021. DOI: 10.1016/j.jmsy.2021.01.005 (오픈액세스: https://hal.science/hal-03880463/). 이벤트 로그 → material flow 그래프 발견 → DES 모델 생성.
- 대표 논문 2: Lugaresi & Matta, "Automated Digital Twins Generation for Manufacturing Systems: a Case Study," IFAC-PapersOnLine 54(1), pp. 749–754, 2021. DOI 10.1016/j.ifacol.2021.08.087 ⚠️ DOI 끝자리 재확인 권장.
- Process mining 연계: "Process Mining as Catalyst of Digital Twins for Production Systems: Challenges and Research Opportunities," Proc. WSC 2024 (https://dl.acm.org/doi/10.5555/3712729.3712985).
- 파이프라인 요약: MES 이벤트 로그 → process discovery(Petri net/그래프) → DES 모델 변환 + 파라미터 적합 → 검증·튜닝. 실시간 로그 재생성으로 model obsolescence 완화.
- 최신: LLM 기반 DES 자동 생성 (ScienceDirect JMS 2026: https://www.sciencedirect.com/science/article/pii/S0278612526000427).

## 그림 후보

- [검증됨] https://ar5iv.labs.arxiv.org/html/2209.12661/assets/x5.png — AAS 구조 (드릴링 머신 예시, Oakes et al., arXiv:2209.12661 Fig.5). 이미지 URL 정상 응답 확인됨.
- RAMI 4.0 큐브·ISO 23247 도식·Tao 5D 도식은 안정적 hotlink 확보 실패 — 텍스트 표/자체 도식 권장.
