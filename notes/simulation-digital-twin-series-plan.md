# 시뮬레이션 & 디지털 트윈 시리즈 작성 계획

> 이 파일은 발행물이 아니라 **세션 간 작업 인계용 메모**다. (`content/` 밖이라 사이트에 노출되지 않음)
> 목적: **시뮬레이션의 기본 이론을 기초부터 탄탄하게** 정리한다. 특정 도메인(반도체/WLP)에 대한 적용 과정과 그로부터 얻는 insight는 **이 시리즈가 아니라 별도의 글**에서 다룬다. 따라서 여기서는 도메인 중립적인 시뮬레이션 이론·방법론 자체에 집중한다.
> 커리큘럼 설계 원칙: 개념·분류 → 무작위성의 기초 → DES 이론 → 시뮬레이션 실험·통계 분석 → 그 외 패러다임 → 디지털 트윈 개념.

- **카테고리**: `foundations` (시뮬레이션은 산업공학/OR의 표준 기초 지식)
- **시리즈 폴더**: `content/posts/foundations/simulation-and-digital-twin/` (신규 — `index.md` 필요)
- **시리즈 번호**: `01`부터 새로 시작
- **공통 태그**: `Simulation`
- **파일명**: `NN-slug.md`, 영문 kebab-case
- **연결되는 기존 시리즈**:
  - `foundations/statistics/06-monte-carlo-method`, `07-markov-chain-monte-carlo` — 난수·Monte Carlo 기반
  - `foundations/statistics/03-parameter-estimation-and-hypothesis-test` — input modeling(분포 적합)·output analysis(신뢰구간)
  - `foundations/time-series-analysis/*` — 비정상 입력 모델링과 연결

## 글 목록 (체크박스 = 작성 완료 여부)

### 1부 — 시뮬레이션이란 무엇인가
- [x] `01` **시뮬레이션 개요: 왜, 언제 쓰나**
  - analytical(수식) 해법 vs simulation: 언제 시뮬레이션이 유일한/더 나은 답인가
  - 시뮬레이션의 장단점(유연성 ↔ 비용·검증 부담)
  - 시뮬레이션 연구의 전체 절차(문제정의 → 모델링 → 데이터 → 검증 → 실험 → 분석)
  - 시리즈 길잡이(허브) 역할 — 이후 글들이 이 한 장을 펼침
- [x] `02` **시뮬레이션 모델의 분류와 패러다임**
  - 축으로 보는 분류: continuous vs discrete, static vs dynamic, deterministic vs stochastic
  - 주요 패러다임 개관과 비교: **discrete-event(DES)**, continuous(미분방정식·system dynamics), Monte Carlo(static), agent-based
  - 같은 문제도 패러다임 선택에 따라 모델이 달라진다 — 이후 부(部)들의 지도

### 2부 — 무작위성의 기초
- [x] `03` **난수 생성 (Random Number Generation)**
  - pseudo-random의 의미, LCG → Mersenne Twister/PCG, 주기·균일성·독립성
  - 난수열 품질 검정(균일성·독립성 test) 개요, seed와 재현성
- [x] `04` **확률분포 샘플링 (Random Variate Generation)**
  - uniform → 임의 분포로 변환: **inverse transform**, **acceptance-rejection**, convolution/composition
  - 대표 분포(exponential, normal, empirical) 생성법과 선택 기준
- [x] `05` **Monte Carlo 시뮬레이션 (정적 시뮬레이션)**
  - 무작위 표본으로 적분·기대값·확률 추정, 추정량의 분산과 수렴
  - DES(동적)와의 차이: "시간이 없는" 시뮬레이션
  - `statistics/06-monte-carlo-method`와 중복 최소화 — 시뮬레이션 관점으로 재조명

### 3부 — Discrete-Event Simulation(DES) 이론
- [x] `06` **DES의 구성요소와 사고방식**
  - entity / event / activity / resource / queue / state, **simulation clock**, future event list
  - 세 가지 world view: event-scheduling vs process-interaction vs activity-scanning
  - "시간이 사건 단위로 점프한다"는 DES의 핵심 직관, 자료구조(event list) 관점
- [x] `07` **큐잉 이론 최소한**
  - Kendall 표기(M/M/1 등), 도착·서비스 과정, utilization(ρ), **Little's law(L = λW)**
  - 대기행렬이 ρ→1에서 왜 비선형으로 폭발하나, 안정 조건
  - 해석적 결과를 DES 결과 검증의 기준선으로 쓰기 → `08`로 연결
- [x] `08` **DES를 바닥부터 구현해보기 (Python)**
  - event list 기반 단일 서버 큐(M/M/1) 직접 구현, 이벤트 루프 코드
  - `07`의 이론값과 시뮬레이션 추정치 비교로 "내 시뮬레이터가 맞나" 확인
- [x] `09` **SimPy로 DES 모델링**
  - process-based 모델링(generator/`yield`), Resource·Store·Container
  - `08`의 직접 구현과 동일 모델을 SimPy로 재작성 — 추상화가 무엇을 덜어주나
  - 멀티 서버·우선순위 큐 등 확장

### 4부 — 시뮬레이션 실험과 통계 분석 (이론의 핵심)
- [x] `10` **Input modeling: 데이터로 분포 만들기**
  - 실측 데이터 → 분포 적합(MLE), goodness-of-fit(Q-Q, KS/chi-square test)
  - 데이터가 부족/없을 때, empirical distribution, 비정상(non-stationary) 도착
- [x] `11` **Output analysis: 결과는 통계량이다**
  - terminating vs steady-state 시뮬레이션, **warm-up period**(initial bias) 제거
  - replication, batch means, 신뢰구간, 표본 수 결정 — "한 번 돌린 숫자"를 믿지 않기
- [x] `12` **Verification & Validation (V&V)**
  - verification(코드가 모델대로인가) vs validation(모델이 현실대로인가)
  - face validity, 실데이터 대조, 민감도 분석, 흔한 함정
- [x] `13` **분산 감소와 실험 설계 (Variance Reduction & DOE)**
  - common random numbers, antithetic variates, control variates
  - 시뮬레이션 기반 실험 설계(DOE): 요인·수준, 무엇을 몇 번 돌릴지
- [x] `14` **(선택) 시뮬레이션 최적화 개관**
  - ranking & selection, metamodeling(response surface), simulation-optimization 개념
  - "시뮬레이션을 목적함수로 두고 최적화한다"는 관점 — 응용 시리즈로 가는 다리
  - ※ 분량 애매하면 `13`에 흡수 가능

### 5부 — 그 외 시뮬레이션 패러다임 (선택)
- [x] `15` **연속 시뮬레이션과 System Dynamics**
  - 미분방정식 기반 모델, 수치 적분(Euler/RK), stock-and-flow, feedback loop
  - DES와 언제 갈리나, 혼합(hybrid) 시뮬레이션 소개
- [x] `16` **Agent-based 시뮬레이션**
  - 개별 agent의 규칙에서 창발(emergence)하는 거동, DES/SD와의 관점 차이
  - 모델링·검증의 난점

### 6부 — 디지털 트윈 (개념)
- [x] `17` **디지털 트윈이란 (시뮬레이션과의 차이)**
  - 정의와 오해: model ≠ simulation ≠ digital twin
  - 성숙도 분류: digital model → digital shadow → digital twin (데이터 연동 정도)
  - 구성요소(물리자산 ↔ 가상모델 ↔ 실시간 데이터)와 시뮬레이션이 그 안에서 하는 역할
  - ※ 구체적 아키텍처·도메인 적용은 별도 응용 글로 분리

## 참고문헌 (작성 시 search-agent로 출처·연도 최종 확인)

- Banks, Carson, Nelson & Nicol, *Discrete-Event System Simulation* (DES 표준 교재)
- Law, *Simulation Modeling and Analysis* (난수·input/output analysis·V&V·variance reduction 표준)
- L'Ecuyer, 난수 생성 관련 서베이 (RNG 품질)
- SimPy 공식 문서 (process-based DES)
- Sterman, *Business Dynamics* (system dynamics)
- 디지털 트윈: Grieves & Vickers (개념), Kritzinger et al. (2018, digital model/shadow/twin 분류)

## 메모 / 결정 대기
- **범위 원칙(중요)**: 이 시리즈는 **도메인 중립 이론**만. 반도체/WLP/RL 스케줄링 적용과 insight는 별도 글(들)에서 작성한다. 여기서 만든 글들을 그 응용 글이 위키링크로 참조하는 구조.
- **작성 순서 권장**: 번호순(01→17). `01`은 허브라 먼저, 이후는 독립적으로도 성립.
- **신규 시리즈 셋업 필요**: `simulation-and-digital-twin/index.md` 생성(explorer 폴더명 결정). 다른 시리즈 `index.md` 형식 참고.
- **statistics 시리즈와 중복 관리**: `05`(Monte Carlo)는 `statistics/06`과 겹친다. 시뮬레이션 관점(추정량·분산·동적 vs 정적)으로 차별화하고, 겹치는 기초는 위키링크로 넘긴다.
- **코드 분량**: 08·09는 코드 중심(텍스트 코드블록으로 충분, 이미지 불필요). DES world view·큐잉 거동·디지털 트윈 성숙도는 텍스트 다이어그램이 있으면 이해가 쉬움.
- KaTeX 규칙(블록 `$$`는 여는/닫는 줄 단독) 준수. 톤·형식은 `introduction-to-rl/17-model-based-rl`, `mlops-infrastructure/00` 기준.
- 대부분 표준 교재 기반이라 search-agent 없이 writer-agent로 바로 써도 무방. RNG 최신 동향·디지털 트윈 분류(`03`,`17`)만 출처 확인 권장.
