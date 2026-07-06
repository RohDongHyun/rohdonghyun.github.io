---
title: 10. Integration·E2E 테스트 실전
date: 2026-07-06
tags:
  - Software Engineering
  - Testing
---

[[posts/foundations/software-testing/05-test-doubles|5편]]의 결론은 이랬다: **managed dependency — 내 서비스만 쓰는 DB — 는 mock으로 바꾸지 말고 실물로 테스트하라.** 그런데 "실물로 테스트하라"는 말은 곧바로 실무적 질문을 낳는다. 그 실물 DB를 어디서 구해서, 어떻게 띄우고, 테스트끼리 데이터가 섞이지 않게 하려면 어떻게 해야 하나? 이번 편은 [[posts/foundations/software-testing/02-unit-integration-e2e|2편]]에서 층위만 그려뒀던 integration·E2E 층의 실전 — 테스트 DB 전략, 데이터 격리, contract testing, 그리고 이 층의 고질병인 flaky 테스트 — 을 다룬다.

## 단위 테스트가 원리적으로 못 덮는 것

5편에서 `FakeLotRepository`(dict 기반 in-memory 구현)를 소개했다. fake는 훌륭한 도구지만, fake 위의 테스트가 **아무리 촘촘해도 검증할 수 없는 것** 이 있다.

- **쿼리의 정합성** — repository의 `find_waiting_lots()`가 SQL로 구현되어 있다면, 그 SQL이 문법에 맞는지, JOIN 조건이 옳은지, index를 태우는지는 실제 DB만 안다. fake는 "repository가 이런 답을 준다면 그 다음 로직이 맞다"를 검증할 뿐, "repository가 정말 그런 답을 주는가"는 검증하지 않는다.
- **제약조건과 트랜잭션** — unique 제약 위반 시의 동작, 두 테이블을 함께 갱신하다 중간에 실패했을 때의 롤백, 동시 접근 시의 잠금. 전부 DB 엔진의 행동이라 dict로는 흉내조차 못 낸다.
- **서비스 간 계약** — 우리 dispatcher가 타 팀 MES API의 응답 필드를 옳게 가정하고 있는가. 내 코드 안에서는 아무리 검증해도 상대가 필드명을 바꾸면 끝이다 (뒤의 contract testing에서 다룬다).

즉 integration test는 unit test의 열화판이 아니라, **unit test가 구조적으로 답할 수 없는 질문에 답하는 층** 이다.

## 테스트 DB 전략: 스펙트럼과 트레이드오프

"실물 DB로 테스트"의 구현 방법은 하나가 아니다. 실물과의 거리 순으로 스펙트럼이 있다.

**1) In-memory SQLite로 대체.** ORM을 쓴다면 연결 문자열만 `sqlite:///:memory:`로 바꿔 프로세스 안에서 DB를 돌릴 수 있다. 압도적으로 빠르고 설치가 필요 없지만, **방언(dialect) 차이라는 함정** 이 있다. 프로덕션이 PostgreSQL이라면: SQLite는 컬럼 타입을 강제하지 않아 `INTEGER` 컬럼에 문자열을 넣어도 통과하고(프로덕션에서는 에러), 디스패칭 구현에서 흔한 `SELECT ... FOR UPDATE SKIP LOCKED`(여러 worker가 같은 lot을 집지 않게 행 단위로 잠그고 건너뛰는 구문)는 아예 지원하지 않으며, 동시성 모델 자체가 다르다. 결국 "SQLite에서 통과한 테스트"는 프로덕션 DB에서의 동작에 대한 확신을 부분적으로만 준다 — 검증하려던 것이 바로 DB와의 상호작용인데 DB를 다른 제품으로 바꿔버린 셈이기 때문이다.

**2) 로컬/공유 개발 DB.** 프로덕션과 같은 제품의 DB를 개발 머신이나 팀 서버에 상시로 띄워두고 테스트가 접속한다. fidelity(실제 환경과의 유사도)는 확보되지만, 사전 설치·버전 관리가 필요하고, **공유 DB라면 남이 남긴 데이터가 내 테스트를 깨뜨리는** 고전적 문제가 생긴다. [[posts/foundations/software-testing/03-anatomy-of-a-unit-test|3편]] FIRST의 Repeatable — 어디서 누가 돌려도 같은 결과 — 이 무너지는 지점이다.

**3) Testcontainers.** 테스트 코드가 Docker로 프로덕션과 동일한 DB 컨테이너를 **직접 띄웠다가 끝나면 버린다**. 컨테이너가 무엇인지는 [[posts/foundations/mlops-infrastructure/01-what-is-a-container|mlops 시리즈 1편]]에서 다뤘다 — 여기서는 "초 단위로 뜨는 일회용 실제 DB"로 쓰인다. [testcontainers-python](https://testcontainers-python.readthedocs.io/)으로 pytest fixture를 만들면 이렇다.

```python
import pytest
import sqlalchemy
from testcontainers.postgres import PostgresContainer

@pytest.fixture(scope="session")          # 컨테이너 기동은 비싸므로 세션당 1회
def engine():
    with PostgresContainer("postgres:16") as pg:   # 프로덕션과 같은 버전 지정
        engine = sqlalchemy.create_engine(pg.get_connection_url())
        yield engine                       # 세션 끝나면 컨테이너 자동 제거

def test_waiting_lots_query_orders_by_due_date(engine):
    with engine.begin() as conn:
        conn.execute(sqlalchemy.text(
            "CREATE TABLE lots (id TEXT PRIMARY KEY, state TEXT, due_date DATE)"))
        conn.execute(sqlalchemy.text(
            "INSERT INTO lots VALUES ('L2','WAITING','2026-07-12'),"
            "                        ('L1','WAITING','2026-07-10')"))
        rows = conn.execute(sqlalchemy.text(
            "SELECT id FROM lots WHERE state='WAITING' ORDER BY due_date")).all()
    assert [r.id for r in rows] == ["L1", "L2"]    # 진짜 Postgres가 준 답
```

대가는 속도(컨테이너 기동 수 초 + 테스트당 수십 ms)와 Docker라는 전제 조건이다. 2편의 testing trophy가 "integration test의 비용이 크게 떨어졌다"고 주장한 근거가 정확히 이 도구다 — fidelity를 포기하지 않으면서 Repeatable을 되찾는 현재의 표준 절충이다.

## 테스트 간 데이터 격리

DB를 마련해도 문제가 남는다. 테스트 A가 넣은 lot이 테스트 B의 쿼리 결과에 섞이면, B는 실행 순서에 따라 통과·실패가 갈리는 **상태 누수** 테스트가 된다. 격리 패턴은 세 가지가 대표적이다.

- **트랜잭션 롤백** — 각 테스트를 트랜잭션 안에서 실행하고 끝나면 commit 대신 rollback한다. 데이터가 흔적 없이 사라지므로 빠르고 깔끔하다.

```python
@pytest.fixture
def db(engine):
    conn = engine.connect()
    tx = conn.begin()
    yield conn            # 테스트는 이 connection만 사용
    tx.rollback()         # 테스트가 뭘 넣었든 없던 일로
    conn.close()
```

  단, 테스트 대상 코드가 **스스로 commit하는 경우**(트랜잭션 경계 자체가 검증 대상인 경우) 이 패턴은 쓸 수 없다 — savepoint 중첩 같은 우회가 있지만 복잡해지고, 그런 테스트는 다음 패턴으로 넘기는 편이 낫다.
- **테스트별 초기화** — 테스트(또는 모듈)마다 스키마를 새로 만들거나 truncate로 비운다. commit이 자유로운 대신 느리다.
- **공유 fixture를 read-only로** — 기동 비용 때문에 세션 scope로 공유하는 fixture(위의 `engine`)에는 **상태를 남기지 않는다** 는 규율을 지킨다. 세션 fixture에 "편의상" 공통 데이터를 넣기 시작하면, 그 데이터에 의존하는 테스트와 그것을 수정하는 테스트가 뒤엉켜 순서 의존성이 생긴다 — 아래 flaky의 주요 원인 중 하나다.

## Contract testing: 상대가 다른 팀일 때

통합 대상이 내 DB가 아니라 **다른 팀의 서비스** 라면 얘기가 달라진다. 상대 서비스를 테스트마다 띄울 수도 없고(unmanaged dependency — 5편에서 mock의 정당한 대상이라 했다), 그렇다고 mock만 쓰면 "상대가 정말 그렇게 응답하는가"는 영영 검증되지 않는다. 양쪽을 다 띄우는 E2E는 가능하지만 비싸고 느리다.

**Contract testing** 은 그 중간을 노린다. consumer(우리 dispatcher)가 "나는 `GET /equipments`에 `status` 필드가 있는 응답을 기대한다"는 **계약(contract)** 을 테스트 코드로 명시하면, 그 계약 파일이 provider(MES 팀)에게 전달되고, provider는 **자기 CI에서 자기 실물 서비스가 그 계약을 만족하는지** 재생(replay)해 검증한다. consumer의 기대가 계약을 만든다는 점에서 **consumer-driven contract** 라 부른다(Ian Robinson이 2006년 정리한 패턴). 이 방식이면 두 서비스를 동시에 띄우지 않고도 "우리 가정과 상대 구현이 어긋나는 순간"을 상대 팀의 CI가 잡아준다 — provider가 필드를 지우는 커밋을 올리면 consumer가 배포되기 전에 provider 쪽 빌드가 깨진다. 대표 도구가 [Pact](https://docs.pact.io/)인데, 도구 상세보다 "E2E 없이 서비스 경계를 검증하는 층이 존재한다"는 사실이 이 글의 요점이다.

## E2E는 최소한으로 — 그리고 flaky라는 병

2편에서 pyramid와 trophy가 유일하게 합의한 지점이 **E2E 최소화** 였다. Google Testing Blog의 [Just Say No to More End-to-End Tests](https://testing.googleblog.com/2015/04/just-say-no-to-more-end-to-end-tests.html)(Mike Wacker, 2015)가 이 원칙의 대표 논거다: E2E는 느리고, 실패해도 원인을 짚어주지 않으며, 결정적으로 **믿을 수 없게 실패** 한다. 같은 글에서 Google은 출발점으로 unit 70% / integration 20% / E2E 10%의 배분을 제안한다. E2E는 "lot 등록 → 스케줄 반영 → 작업 지시"처럼 **끊기면 사업이 멈추는 critical path 시나리오 소수** 에만 배정하고, 세부 규칙 검증은 아래층에 맡긴다.

"믿을 수 없게 실패한다"의 정식 명칭이 **flaky test** — 코드 변경 없이 같은 테스트가 통과했다 실패했다 하는 테스트 — 다. Google은 전체 테스트 실행의 약 1.5%가 flaky한 결과를 보고하고, 테스트의 약 16%가 어느 정도의 flakiness를 보인다고 밝힌 바 있다([Flaky Tests at Google and How We Mitigate Them](https://testing.googleblog.com/2016/05/flaky-tests-at-google-and-how-we.html), John Micco, 2016). 원인은 대체로 네 갈래다.

1. **비동기 대기·타이밍** — "요청 보내고 2초 sleep 후 확인" 류. 서버가 2.1초 걸리는 날 실패한다. Luo et al.의 실증 연구(FSE 2014, [DOI](https://doi.org/10.1145/2635868.2635920))에서 flaky 원인의 약 45%로 **가장 흔한 부류** 였다.
2. **테스트 간 상태 누수·순서 의존** — 위 격리 절에서 본 문제. 혼자 돌리면 통과, 전체 스위트에서는 실패.
3. **동시성** — race condition(실행 순서에 따라 결과가 달라지는 경쟁 상태)이 테스트 코드나 대상 코드에 숨어 있는 경우.
4. **인프라 불안정** — 네트워크 순단(일시적 끊김), 컨테이너 기동 지연, 디스크 고갈. 테스트 층이 높을수록 노출 면적이 넓어진다 — E2E가 유독 flaky한 구조적 이유다.

대응도 원인별이다. 타이밍 문제는 고정 sleep을 **명시적 대기 조건**(원하는 상태가 될 때까지 짧은 간격으로 확인하되 상한을 두는 polling)으로 바꾸고, 상태 누수는 격리 패턴으로 막고, 인프라 노출은 해당 검증을 가능한 한 아래층으로 내려서 줄인다. 가장 위험한 대응은 "실패하면 자동으로 한 번 더 돌리기"다 — 당장은 초록불이 돌아오지만, flaky의 근본 원인은 물론 **진짜 간헐적 버그**(프로덕션에서도 가끔 터질 race condition)까지 함께 덮어버린다. 재시도와 quarantine(flaky로 판정된 테스트를 스위트에서 격리해 별도 관리하는 것)을 CI에서 어떻게 운영할지는 다음 편의 주제다.

## 요약

- Integration test는 unit test가 원리적으로 못 덮는 것 — **쿼리 정합성, 제약조건·트랜잭션, 서비스 간 계약** — 을 검증하는 층이다. fake repository가 아무리 좋아도 이 질문에는 답하지 못한다.
- 테스트 DB 스펙트럼: **in-memory SQLite**(빠르지만 방언 차이로 확신이 샌다) → **로컬/공유 DB**(fidelity는 있으나 Repeatable이 깨지기 쉽다) → **testcontainers**(일회용 실물 DB, 현재의 표준 절충).
- 데이터 격리는 **트랜잭션 롤백**(빠름, 단 자체 commit하는 코드에는 부적합), **테스트별 초기화**, **공유 fixture read-only 규율** 로 지킨다.
- 상대가 다른 팀의 서비스면 **consumer-driven contract testing** — consumer의 기대를 계약 파일로 만들어 provider의 CI가 검증한다. E2E 없이 서비스 경계를 지키는 층.
- **E2E는 critical path 소수만**(Google의 출발점: 70/20/10). E2E가 많아질수록 flaky — 코드 불변인데 결과가 오락가락 — 에 노출된다. 원인은 비동기 대기(최다), 상태 누수, 동시성, 인프라. 무지성 재시도는 진짜 버그까지 덮는다.

## 참고문헌

- Vladimir Khorikov, *Unit Testing Principles, Practices, and Patterns* (Manning, 2020), Ch. 8–10 — managed dependency는 실물로, integration test 설계.
- Mike Wacker, [Just Say No to More End-to-End Tests](https://testing.googleblog.com/2015/04/just-say-no-to-more-end-to-end-tests.html) (Google Testing Blog, 2015) — E2E 최소화와 70/20/10.
- John Micco, [Flaky Tests at Google and How We Mitigate Them](https://testing.googleblog.com/2016/05/flaky-tests-at-google-and-how-we.html) (Google Testing Blog, 2016) — flakiness 규모 수치.
- Q. Luo, F. Hariri, L. Eloussi, D. Marinov, "An Empirical Analysis of Flaky Tests," *FSE 2014*. [DOI](https://doi.org/10.1145/2635868.2635920) — flaky 원인 분류(async wait 최다).
- Ian Robinson, [Consumer-Driven Contracts: A Service Evolution Pattern](https://martinfowler.com/articles/consumerDrivenContracts.html) (martinfowler.com, 2006) — contract testing의 원전.
- [testcontainers-python 공식 문서](https://testcontainers-python.readthedocs.io/), [Pact 공식 문서](https://docs.pact.io/).
