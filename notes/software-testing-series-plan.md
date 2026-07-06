# 소프트웨어 테스팅 시리즈 작성 계획

> 이 파일은 발행물이 아니라 **세션 간 작업 인계용 메모**다. (`content/` 밖이라 사이트에 노출되지 않음)
> 목적: **소프트웨어 테스트의 이론과 실무 원칙을 기초부터** 정리한다. 동기는 "AI 코딩 에이전트 시대에 테스트가 곧 스펙이자 검증 수단"이라는 문제의식 — 하지만 본편은 도메인·도구 중립적인 테스트 기초에 집중하고, AI 에이전트 관점은 마지막 부에서 다룬다.
> 커리큘럼 설계 원칙: 왜 테스트인가 → 좋은 단위 테스트 → 방법론(TDD/PBT/커버리지) → 시스템 수준 → 어려운 대상 → AI 시대의 테스트.

- **카테고리**: `foundations` (테스트는 SE의 표준 기초 지식)
- **시리즈 폴더**: `content/posts/foundations/software-testing/` (신규 — `index.md` 필요)
- **시리즈 번호**: `01`부터 새로 시작
- **공통 태그**: `Software Engineering` (+ 글별로 `Testing` 등 추가 가능)
- **파일명**: `NN-slug.md`, 영문 kebab-case
- **예제 언어**: Python(pytest) 기본, 필요 시 TypeScript 병기
- **연결되는 기존 시리즈**:
  - `foundations/simulation-and-digital-twin/12-verification-and-validation` — V&V 개념(모델 검증)과 코드 테스트의 대비
  - `foundations/simulation-and-digital-twin/03-random-number-generation` — seed·재현성 (13편 비결정적 코드 테스트와 연결)
  - `foundations/mlops-infrastructure/*` — CI/컨테이너 (11편 CI 테스트, 10편 testcontainers와 연결)

## 글 목록 (체크박스 = 작성 완료 여부)

### 1부 — 테스트란 무엇인가
- [x] `01` **왜 테스트를 쓰는가**
  - 테스트의 세 가지 역할: 회귀 방지(regression), 설계 피드백, 실행 가능한 문서
  - "테스트는 비용"이라는 오해 vs 변경 비용을 낮추는 투자라는 관점
  - AI 코딩 에이전트 시대에 테스트의 지위 변화 — 사람이 코드를 덜 읽을수록 테스트가 유일한 안전망 (동기 부여, 상세는 `14`)
  - 시리즈 길잡이(허브) 역할
- [x] `02` **테스트의 분류: unit, integration, E2E**
  - 단위/통합/E2E의 경계 — "unit"의 정의부터 논쟁적이라는 사실
  - test pyramid vs testing trophy, 각 층의 비용·속도·신뢰도 트레이드오프
  - 정적 분석(type check, lint)과 테스트의 역할 분담
  - functional vs non-functional(성능·부하) 테스트 개관 — 이 시리즈는 functional 중심

### 2부 — 좋은 단위 테스트
- [x] `03` **단위 테스트의 구조와 규율**
  - AAA(Arrange-Act-Assert) / Given-When-Then, 테스트 이름 짓기
  - FIRST 원칙: Fast, Isolated, Repeatable, Self-validating, Timely
  - pytest 기초: fixture, parametrize, assert 재작성 — "프레임워크 기능 소개"가 아니라 원칙을 구현하는 도구로
- [x] `04` **무엇을 테스트할 것인가: 행동 vs 구현**
  - observable behavior vs implementation detail — 리팩토링에 깨지는 취약한(brittle) 테스트의 근본 원인
  - Khorikov의 좋은 테스트 4 기둥: 회귀 방지, 리팩토링 내성, 빠른 피드백, 유지보수성 (+ 넷을 동시에 만족 못 한다는 트레이드오프)
  - 테스트가 어렵다는 신호 = 설계가 나쁘다는 신호 → `06`으로 연결
- [x] `05` **Test Double: mock, stub, fake를 구분하기**
  - dummy / stub / spy / mock / fake 분류 (Meszaros), "다 mock이라 부르는" 혼란 정리
  - London(mockist) vs Detroit(classicist) 학파 — 무엇을 격리 대상으로 보나
  - mock 남용의 폐해: 구현 결합, 거짓 안심. managed vs unmanaged dependency 기준
  - pytest `monkeypatch`·`unittest.mock` 예제
- [x] `06` **테스트 가능한 설계 (Design for Testability)**
  - 의존성 주입(DI), 순수 함수와 부수효과의 분리(functional core, imperative shell)
  - humble object 패턴, seam 개념
  - "테스트를 위해 설계를 바꾸는 게 맞나"라는 질문 — testability는 좋은 설계의 부산물이라는 답

### 3부 — 방법론
- [x] `07` **TDD: 테스트가 먼저인 개발**
  - red-green-refactor 사이클, 작은 단계의 의미
  - TDD가 잘 맞는 문제 vs 안 맞는 문제 (탐색적 코드, UI, 알고리즘 도출 논쟁)
  - TDD ≠ 테스트 작성 — 설계 방법론이라는 본질. 효용에 대한 실증 연구도 짧게
- [x] `08` **Property-based Testing**
  - example-based의 한계 → 성질(property)로 테스트하기: invariant, roundtrip, oracle, metamorphic
  - Hypothesis 실습: strategy, shrinking(최소 반례 축소)
  - 스케줄링·최적화 코드와의 궁합 (제약 만족 여부를 property로) — 예제로 활용
- [x] `09` **커버리지와 Mutation Testing: 테스트를 테스트하기**
  - line/branch coverage의 의미와 함정 — 커버리지 100%가 보장하지 않는 것
  - 커버리지를 목표(target)로 삼을 때의 부작용 (Goodhart)
  - mutation testing: 코드를 일부러 망가뜨려 테스트가 잡아내나 확인 (mutmut/cosmic-ray)
  - AI가 생성한 테스트의 품질 측정 수단으로서의 재조명 → `14` 복선

### 4부 — 시스템 수준
- [x] `10` **Integration·E2E 테스트 실전**
  - 진짜 DB/외부 서비스와 테스트하기: 테스트 DB 전략, testcontainers
  - contract testing 개요 (consumer-driven, Pact) — 서비스 경계의 테스트
  - E2E 최소화 원칙과 flaky 테스트 문제 (원인 분류: 비동기 대기, 상태 누수, 인프라)
- [x] `11` **CI에서의 테스트: 자동화된 안전망**
  - "내 컴퓨터에선 됐는데" — CI가 강제하는 것: 깨끗한 환경, 모든 변경에 대한 실행
  - 테스트 스위트 속도 관리: 병렬화, 선택적 실행, 계층별 분리(빠른 피드백 루프)
  - flakiness 운영: quarantine, retry의 함정
  - GitHub Actions 예제 (이 블로그 저장소의 deploy.yml도 소재로 가능)

### 5부 — 어려운 대상들
- [x] `12` **레거시 코드에 테스트 붙이기**
  - Feathers의 정의: "레거시 코드 = 테스트 없는 코드"
  - characterization test(현재 동작을 스펙으로 고정), golden master/approval testing
  - seam 찾기와 최소 침습 리팩토링 — `06`의 개념을 역방향으로 적용
- [x] `13` **비결정적 코드 테스트: 시간, 난수, 동시성**
  - 시간 의존 코드: clock 주입, freezegun. 난수 의존 코드: seed 고정과 그 한계
  - 확률적 출력의 통계적 테스트 — 시뮬레이션/RL 코드 검증과 직결 (`simulation-and-digital-twin/12` 위키링크)
  - 동시성 버그와 테스트의 근본적 어려움 (재현성), 개요 수준

### 6부 — AI 시대의 테스트
- [x] `14` **코딩 에이전트와 테스트: 스펙이자 검증 루프**
  - 에이전트 워크플로에서 테스트의 이중 역할: (1) 사람이 의도를 전달하는 스펙, (2) 에이전트가 자기 결과를 검증하는 피드백 루프
  - 에이전트가 짠 테스트를 믿을 수 있나 — 자기 채점 문제, mutation testing(`09`)의 재조명
  - TDD와 에이전트의 궁합, "테스트를 통과시키기 위한 꼼수(reward hacking)" 문제
  - 테스트가 없는 코드베이스에서 에이전트를 쓸 때의 위험 → `12`와 연결
  - ※ 시의성 강한 내용이라 insights 성격도 있음 — 작성 시점에 카테고리 재판단 (본편과 분리해 insights로 낼 수도)
  - → 시리즈 완결성을 위해 foundations 시리즈 폴더에 유지하기로 결론. `14-coding-agents-and-testing.md` 작성 완료 (2026-07-06). **시리즈 전편(01~14) 완료.**

## 참고문헌 (작성 시 search-agent로 출처·연도 최종 확인)

- Khorikov, *Unit Testing Principles, Practices, and Patterns* (2·4·5편의 뼈대)
- Beck, *Test-Driven Development: By Example* (7편)
- Feathers, *Working Effectively with Legacy Code* (6·12편)
- Meszaros, *xUnit Test Patterns* (test double 분류)
- Freeman & Pryce, *Growing Object-Oriented Software, Guided by Tests* (London 학파)
- Winters, Manshreck & Wright, *Software Engineering at Google* 11–14장 (테스트 규모·flakiness·CI)
- Fowler 블로그: "Mocks Aren't Stubs", "The Practical Test Pyramid" (Ham Vocke)
- Hypothesis 공식 문서, MacIver의 PBT 글들 (8편)
- 14편은 최신 자료 필수 — search-agent(trend-scan)로 에이전트+테스트 관련 최근 논의 수집

## 메모 / 결정 대기
- **범위 원칙**: 본편(01–13)은 도구·도메인 중립 원칙 중심. 특정 프레임워크 심화(pytest plugin 생태계, Playwright 등)나 LLM 시스템 자체의 평가(eval)는 별도 글. **LLM eval은 이 시리즈가 아니다** — 14편은 "에이전트가 코드를 짤 때의 테스트"이지 "LLM 출력 평가"가 아님.
- **작성 순서 권장**: 번호순. `01` 허브 먼저. 2부(03–06)가 시리즈의 핵심이므로 공들일 것.
- **신규 시리즈 셋업 필요**: `software-testing/index.md` 생성 (다른 시리즈 `index.md` 형식 참고).
- **코드 분량**: 03·05·08·13은 코드 중심(pytest 예제, 텍스트 코드블록으로 충분). 02(pyramid/trophy)·09(mutation 개념)는 텍스트 다이어그램 유용.
- **예제 소재**: 추상적인 `Calculator` 예제 대신 사용자 도메인(스케줄링 제약, 큐 시뮬레이션, 배치 처리)을 예제로 쓰면 차별화됨 — 특히 08(PBT)·13(비결정성).
- KaTeX 규칙 준수 (수식은 거의 없을 시리즈지만 09 mutation score 정도). 톤·형식은 `mlops-infrastructure/00`, `simulation-and-digital-twin/01` 기준.
- 01–13은 표준 교재 기반이라 writer-agent로 바로 작성 가능. 14만 search-agent 선행 필수.
