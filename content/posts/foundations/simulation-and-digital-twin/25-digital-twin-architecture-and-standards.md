---
title: 25. Digital Twin 아키텍처와 표준
date: 2026-07-18
tags:
  - Simulation
  - Digital Twin
---

[[posts/foundations/simulation-and-digital-twin/17-digital-twin|17편]]에서 digital twin이 무엇인지 — model/simulation/twin의 구분, digital model → shadow → twin의 성숙도 단계, 기본 구성요소 — 를 정리했다. 그런데 개념을 알아도 실제로 "우리 공장에 디지털 트윈을 만들자"고 하면, 회사마다 전혀 다른 물건이 나온다. 어떤 팀은 3D 시각화 대시보드를, 어떤 팀은 시뮬레이션 모델을, 어떤 팀은 센서 데이터 레이크를 만들어 놓고 모두 "디지털 트윈"이라 부른다. 원인은 **공통 언어의 부재**다. 무엇을 갖춰야 트윈이라 부를 수 있는지, 구성요소를 어떻게 나누고 데이터를 어떤 형식으로 주고받는지에 대한 합의 — 즉 **참조 아키텍처(reference architecture)** 와 **표준**이 없으면, 같은 단어로 서로 다른 것을 짓게 된다.

이 글은 그 공통 언어의 세 축을 본다. 제조 도메인 특화 국제표준인 **ISO 23247**, Industry 4.0 진영의 **RAMI 4.0**와 그 구현체 **AAS(Asset Administration Shell)**, 그리고 학술 문헌에서 가장 널리 인용되는 개념 틀인 **Tao의 5-dimension 모델**이다.

## ISO 23247 — 제조 digital twin의 국제표준

ISO 23247은 "Digital twin framework for manufacturing"이라는 이름의 국제표준 시리즈로, 제조 digital twin을 다음과 같이 정의한다.

> 관측 가능한 제조 요소(observable manufacturing element)의 목적에 맞는(fit for purpose) 디지털 표현으로서, **그 요소와 디지털 표현 사이의 동기화(synchronization)를 갖춘 것**.

주목할 점은 **동기화가 정의의 일부**라는 것이다. 아무리 정교한 시뮬레이션 모델이라도 실물과 동기화되지 않으면 이 정의상 digital twin이 아니다. 이는 [[posts/foundations/simulation-and-digital-twin/17-digital-twin|17편]]의 성숙도 논의 — "digital twin이라 불리는 많은 것이 실은 model이나 shadow 단계"라는 지적 — 를 국제표준이 정의 수준에서 못 박은 것으로 읽을 수 있다.

2021년에 발행된 시리즈는 4개 파트로 구성된다.

| 파트 | 제목 | 내용 |
|---|---|---|
| Part 1 (2021) | Overview and general principles | 일반 원칙·요구사항·용어 |
| Part 2 (2021) | Reference architecture | 도메인/entity 기반 참조 아키텍처 |
| Part 3 (2021) | Digital representation of manufacturing elements | 제조 요소(OME)의 기본 정보 속성 |
| Part 4 (2021) | Information exchange | entity 간 정보 교환 요구사항 |

### 참조 아키텍처의 4개 entity

Part 2의 참조 아키텍처는 IoT 참조 아키텍처인 ISO/IEC 30141을 기반으로, 시스템을 4개의 도메인/entity로 나눈다.

1. **Observable Manufacturing Elements (OME)** — 트윈의 대상이 되는 실물: 인력, 장비, 자재, 공정, 시설, 환경, 제품. "트윈을 만든다"고 할 때 무엇의 트윈인지를 먼저 이 목록에서 특정하게 만든다.
2. **장치 통신 entity** — data collection(수집)과 device control(제어) 기능을 담당하는, 물리와 디지털의 접점. 센서 데이터를 올려 보내는 sub-entity와 제어 명령을 내려 보내는 sub-entity로 나뉜다. 17편의 성숙도 관점에서 보면, 수집만 있으면 shadow, 제어까지 있어야 twin이 되는 — 바로 그 양방향 통로를 담당하는 층이다.
3. **Digital Twin Entity** — 아키텍처의 core. 디지털 표현을 생성·유지하는 곳으로, 운영·관리 기능(동기화 포함), 애플리케이션·서비스 기능(시뮬레이션, 분석, 예지보전), 리소스 접근·교환 기능을 갖는다. 이 시리즈에서 다뤄 온 시뮬레이션 모델은 이 entity 안의 서비스로 들어간다.
4. **User Entity** — 트윈을 사용하는 쪽: 인간 사용자뿐 아니라 MES/ERP 같은 상위 애플리케이션도 여기에 해당한다.

이 구분의 실용적 가치는 **역할 경계를 강제한다**는 데 있다. 예컨대 "동기화는 누구 책임인가"라는 질문에 이 아키텍처는 명확히 답한다 — Digital Twin Entity의 운영·관리 기능이다. 데이터 수집 계층이 아니라 트윈 계층이 동기화의 주체라는 것이다.

### 최근 확장: digital thread, composition, 그리고 반도체 use case

2021년 4개 파트 이후 시리즈는 계속 확장되고 있다.

- **Part 5 — Digital thread for digital twin**: 제품·공정의 생애주기 전반에 걸친 데이터 연결(digital thread)을 다룬다. ISO 23247-5:2026으로 2026년 6월 발행되었다.
- **Part 6 — Digital twin composition**: 복수의 digital twin을 구성·통신·협업시키는 방법. 장비 트윈 여러 개를 라인 트윈으로 합성하는 식의 문제다. 현재 FDIS(최종 국제표준안) 단계다.
- **ISO/TR 23247-100:2025** — **반도체 잉곳(ingot) 성장 공정 관리 use case**를 다룬 기술 보고서(TR)다.

마지막 항목은 반도체 제조 독자에게 의미 있는 신호다. 국제표준화 기구가 digital twin 프레임워크의 첫 도메인 use case 문서 중 하나로 반도체 공정을 택했다는 것은, 반도체 제조가 이 표준의 주요 적용처로 논의되고 있으며 표준 기반 트윈 구축의 참고 사례가 공식 문서로 존재한다는 뜻이다. fab 도메인에서 트윈을 설계할 때 "표준을 따르면 어떤 모습이 되는가"를 가늠할 출발점이 된다.

## RAMI 4.0와 AAS — Industry 4.0 진영의 답

### RAMI 4.0: 3차원 좌표계

**RAMI 4.0**(Reference Architectural Model Industrie 4.0)은 2015년 독일 Plattform Industrie 4.0/ZVEI가 발표한 참조 아키텍처로, Industry 4.0 세계의 모든 요소를 3차원 좌표계 위에 배치한다. 흔히 "RAMI 큐브"로 불리는 이 모델의 세 축은 다음과 같다.

- **Hierarchy Levels 축**: Product → Field Device → Control Device → Station → Work Centers → Enterprise → Connected World. 기존 제조 자동화 계층 표준(IEC 62264/61512)을 확장한 것으로, 제품 자체와 기업 바깥의 연결 세계까지 계층에 포함시킨 점이 특징이다.
- **Life Cycle & Value Stream 축**: IEC 62890 기반으로, **Type**(설계·개발 단계의 기종)과 **Instance**(제조되어 현장에 존재하는 개별 자산)를 구분한다. "펌프 모델 X-100의 설계 데이터"와 "3번 라인에 설치된 시리얼 번호 1234 펌프의 가동 데이터"는 이 축에서 다른 위치에 놓인다 — digital twin이 특정 실물의 쌍둥이라는 점에서, 이 type-instance 구분은 트윈 논의와 직결된다.
- **Layers 축 (6층)**: Asset — Integration — Communication — Information — Functional — Business. 물리 자산에서 출발해 디지털 세계로의 통합, 통신, 정보 모델, 기능, 비즈니스 가치까지 수직으로 쌓아 올린 관점의 분해다.

ISO 23247이 "제조 트윈 시스템의 구성요소"를 나눈다면, RAMI 4.0은 그보다 넓게 "Industry 4.0의 모든 자산과 기능을 어디에 위치시킬 것인가"의 좌표계를 준다.

### AAS: 자산의 표준화된 디지털 표현

RAMI 4.0이 좌표계라면, **AAS(Asset Administration Shell)** 는 그 위에서 실제로 데이터를 담아 주고받는 그릇이다. AAS는 자산의 일관된 디지털 표현을 위한 공통 메타모델로, 물리 **asset**과 그것을 감싸는 디지털 **administration shell**이 합쳐져 하나의 Industry 4.0 component가 된다. Industry 4.0 진영에서 말하는 **표준화된 digital twin 구현체**가 바로 이것이다. 메타모델 스펙은 IDTA-01001(Part 1 Metamodel V3.0)로 공개되어 있고, IEC 63278-1로 국제표준화되었다.

AAS 내부는 **submodel**의 집합으로 구성된다. submodel 하나가 자산의 한 측면 — 명판 정보, 기술 데이터, 문서, 탄소발자국 등 — 을 표준화된 구조로 담는다.

![AAS 구조 예시](https://ar5iv.labs.arxiv.org/html/2209.12661/assets/x5.png)

*드릴링 머신을 예로 든 AAS 구조. 출처: [Oakes et al., arXiv:2209.12661](https://arxiv.org/abs/2209.12661), Fig. 5*

submodel의 힘은 **template 생태계**에서 나온다. IDTA(Industrial Digital Twin Association)가 표준 submodel template을 발행하는데, 대표적으로 **Digital Nameplate**(디지털 명판, IDTA 02006), **Handover Documentation**(인계 문서), **Generic Frame for Technical Data**(기술 데이터), **Carbon Footprint**(탄소발자국), **Digital Battery Passport**, **Hierarchical Structures**, **Production Calendar** 등이 발행되어 있다. 2024년 초 기준 18개가 발행되고 총 84개가 계획된 것으로 보고되었으며([arXiv:2406.14470](https://arxiv.org/abs/2406.14470)), 이후 AI-Agent, Digital Worker Profile 같은 template이 개발 중일 만큼 목록은 계속 늘고 있다. 요점은 이것이다 — 서로 다른 제조사의 장비라도 같은 Digital Nameplate template을 채워 오면, 내 시스템은 파싱 코드를 새로 짜지 않고 그 장비의 명판 정보를 읽을 수 있다. **자산 데이터 교환의 상호운용성**이 AAS가 푸는 문제다.

## Tao의 5-dimension 모델 — 학술 진영의 개념 틀

학술 문헌에서 digital twin의 구성을 말할 때 가장 널리 인용되는 틀은 Tao 등이 2018~2019년에 걸쳐 정립한 **5-dimension 모델**이다(F. Tao, H. Zhang, A. Liu, A. Y. C. Nee, "Digital Twin in Industry: State-of-the-Art," *IEEE Trans. Industrial Informatics*, 2019, [DOI: 10.1109/TII.2018.2873186](https://doi.org/10.1109/TII.2018.2873186)).

$$
\mathcal{M}_{DT} = (PE,\ VE,\ Ss,\ DD,\ CN)
$$

이 식은 digital twin을 다섯 요소의 튜플로 본다는 선언이다. 각 차원은 다음과 같다.

- **$PE$ (Physical Entity)**: 실제 물리 대상.
- **$VE$ (Virtual Entity)**: 기하·물리 속성·거동·규칙까지 담은 디지털 모델. 이 시리즈의 시뮬레이션 모델이 여기에 해당한다.
- **$Ss$ (Services)**: 트윈이 제공하는 서비스들 — $PE$를 향한 모니터링·예측·최적화 서비스와, $VE$를 향한 모델 구축·보정·검증 서비스를 모두 포함한다. 트윈을 "모델"이 아니라 "서비스를 제공하는 시스템"으로 보게 만드는 차원이다.
- **$DD$ (DT Data)**: $PE$/$VE$/$Ss$ 각각에서 나오는 데이터에 도메인 지식과 융합 데이터까지 합친, 트윈의 데이터 저장소.
- **$CN$ (Connections)**: 위 네 요소를 잇는 연결. 네 요소의 쌍별 연결로 $CN_{PV}$, $CN_{PD}$, $CN_{PS}$, $CN_{VD}$, $CN_{VS}$, $CN_{SD}$의 **6종**이 정의된다.

이 모델이 말하는 것은 두 가지다. 첫째, 흔히 트윈을 "물리 + 가상"의 2요소로 생각하지만, 그 사이에서 **데이터($DD$)와 서비스($Ss$)가 독립된 1급 구성요소**라는 것 — 데이터 관리와 서비스 설계를 모델링과 동급의 과제로 격상시킨다. 둘째, 연결($CN$)이 물리-가상 한 쌍이 아니라 **여섯 쌍**이라는 것 — 예컨대 물리에서 데이터로($CN_{PD}$), 데이터에서 서비스로($CN_{SD}$) 가는 파이프라인 각각이 별도로 설계·구현되어야 할 대상임을 드러낸다. ISO 23247처럼 시스템 구축용 참조 아키텍처는 아니지만, "우리 트윈에 빠진 조각이 무엇인가"를 점검하는 렌즈로 유용하다.

## 세 축은 경쟁하지 않는다

세 축을 나란히 놓으면 역할이 다르다는 것이 보인다.

| 축 | 성격 | 답하는 질문 |
|---|---|---|
| ISO 23247 | 제조 도메인 국제표준 | 제조 digital twin 시스템이 **무엇을 갖춰야 하는가** (entity 구분, 요구사항, 동기화) |
| RAMI 4.0 / AAS | Industry 4.0 참조 모델 + 구현체 | 자산 데이터를 **어떻게 표현하고 주고받는가** (좌표계, 메타모델, submodel template) |
| Tao 5D | 학술 개념 모델 | 트윈의 구성요소를 **어떤 개념으로 분해해 볼 것인가** |

실무에서 이들은 상호 배타적 선택지가 아니라 **겹쳐 쓰는 층**이다. 예를 들어 장비 데이터 표현·교환은 AAS submodel로 표준화하고, 트윈 시스템 전체의 구조와 책임 분담은 ISO 23247의 entity 구분을 따르며, 설계 리뷰에서 빠진 조각을 점검할 때는 Tao의 다섯 차원을 체크리스트로 쓰는 식이다. "어느 표준을 따를 것인가"보다 "각 표준이 맡는 층이 어디인가"가 올바른 질문이다.

## 정리

- Digital twin이 회사마다 다른 물건이 되는 이유는 **공통 언어(참조 아키텍처·표준)의 부재**다.
- **ISO 23247**은 제조 digital twin의 국제표준으로, **동기화를 정의 자체에 포함**하고 시스템을 OME·장치 통신·Digital Twin·User의 4개 entity로 나눈다. digital thread(Part 5, 2026 발행)·트윈 합성(Part 6, FDIS)으로 확장 중이며, **반도체 잉곳 성장 use case**(TR 23247-100)가 공식 문서로 나왔다.
- **RAMI 4.0**은 Industry 4.0 자산을 3축(hierarchy, type-instance life cycle, 6 layers) 좌표계에 배치하고, **AAS**는 submodel template 생태계를 통해 자산 데이터 교환의 상호운용성을 제공하는 표준화된 트윈 구현체다.
- **Tao의 5-dimension 모델** $\mathcal{M}_{DT} = (PE, VE, Ss, DD, CN)$은 데이터와 서비스를 1급 구성요소로, 연결을 6종의 쌍별 연결로 분해하는 개념 렌즈다.
- 세 축은 각각 "무엇을 갖춰야 하나 / 어떻게 주고받나 / 어떤 개념으로 보나"에 답하며, 실무에서는 겹쳐 쓴다.

그러나 아키텍처와 표준을 갖췄다고 트윈이 완성되는 것은 아니다. ISO 23247이 정의에 박아 넣었듯, 트윈을 트윈으로 만드는 것은 **동기화** — 실물의 변화를 모델에 계속 반영하고, 모델 자체를 데이터로부터 만들어 내는 일이다. 다음 [[posts/foundations/simulation-and-digital-twin/26-digital-twin-synchronization-and-model-generation|26편]]에서 물리-가상 동기화와 시뮬레이션 모델 자동 생성을 다룬다.

## 참고문헌

- ISO 23247-1:2021, *Automation systems and integration — Digital twin framework for manufacturing — Part 1: Overview and general principles*. [ISO](https://www.iso.org/standard/78743.html)
- ISO 23247-5:2026 (digital thread): [ISO](https://www.iso.org/standard/87425.html) / ISO/FDIS 23247-6 (composition): [ISO](https://www.iso.org/standard/87426.html) / ISO/TR 23247-100:2025 (반도체 잉곳 성장 use case): [ISO](https://www.iso.org/standard/90387.html)
- ZVEI/VDI GMA Status Report, *Reference Architecture Model Industrie 4.0 (RAMI 4.0)*, 2015. [PDF](https://www.zvei.org/fileadmin/user_upload/Presse_und_Medien/Publikationen/2016/januar/GMA_Status_Report__Reference_Archtitecture_Model_Industrie_4.0__RAMI_4.0_/GMA-Status-Report-RAMI-40-July-2015.pdf)
- IDTA, *Specification of the Asset Administration Shell — Part 1: Metamodel* (IDTA-01001, V3.0). [PDF](https://industrialdigitaltwin.org/wp-content/uploads/2025/03/IDTA-01001-3-0-2_SpecificationAssetAdministrationShell_Part1_Metamodel.pdf) / submodel template 목록: [IDTA](https://industrialdigitaltwin.org/en/content-hub/submodels), [GitHub](https://github.com/admin-shell-io/submodel-templates)
- F. Tao, H. Zhang, A. Liu, A. Y. C. Nee, "Digital Twin in Industry: State-of-the-Art," *IEEE Transactions on Industrial Informatics*, 15(4), pp. 2405–2415, 2019. [DOI: 10.1109/TII.2018.2873186](https://doi.org/10.1109/TII.2018.2873186)
- Oakes et al. (AAS 구조 그림 출처), [arXiv:2209.12661](https://arxiv.org/abs/2209.12661)
