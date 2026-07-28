---
title: 02. 테스트의 분류 — unit, integration, E2E
date: 2026-07-06
tags:
  - Software Engineering
  - Testing
---

[[posts/foundations/software-testing/01-why-we-test|1편]]에서 테스트가 왜 필요한지를 다뤘다. 그런데 막상 테스트를 쓰려고 하면 바로 다음 질문에 부딪힌다. *어떤 종류의 테스트를, 어디에, 얼마나 써야 하나?* 함수 하나를 검증하는 테스트와, 브라우저를 띄워 실제 서비스 전체를 클릭해 보는 테스트는 이름만 같은 "테스트"일 뿐 비용도 속도도 잡아내는 버그도 전혀 다르다. 이 글은 그 층위 — **unit / integration / E2E** — 를 정리하고, 각 층에 얼마나 투자할지를 둘러싼 test pyramid 논쟁을 다룬다.

## 세 개의 층위

교과서적 정의부터 놓고 시작하자.

- **unit test** — 작은 코드 조각(함수, 클래스)을 **격리된 환경에서** 검증한다. DB도 네트워크도 없이 메모리 안에서만 돌므로 밀리초 단위로 빠르다.
- **integration test** — 여러 구성요소가 **연결된 상태**를 검증한다. "내 코드가 진짜 DB와 대화할 때도 맞게 동작하나", "모듈 A의 출력이 모듈 B의 입력 규약과 맞나" 같은 질문에 답한다.
- **E2E test** (end-to-end) — 사용자의 관점에서 **시스템 전체를 관통**하는 시나리오를 검증한다. 배포된 것과 최대한 비슷한 환경에서 "lot을 등록하면 스케줄 화면에 나타난다"를 실제로 수행해 본다.

디스패칭 시스템을 예로 들면 이렇게 나뉜다.

```python
# unit: 우선순위 계산 로직만, 메모리 안에서
def test_urgent_lot_gets_higher_priority():
    urgent = Lot(due_date=1, is_hot=True)
    normal = Lot(due_date=1, is_hot=False)
    assert priority(urgent) > priority(normal)

# integration: 저장소(DB)와 연결된 상태에서
def test_dispatcher_reads_waiting_lots_from_db(test_db):
    test_db.insert(Lot(id="L1", state="WAITING"))
    dispatcher = Dispatcher(repo=LotRepository(test_db))
    assert "L1" in [l.id for l in dispatcher.candidates()]

# E2E: API 서버 전체를 띄우고 사용자 시나리오로
def test_registered_lot_appears_in_schedule(live_server):
    client.post("/lots", json={"id": "L1", "due_date": "2026-07-10"})
    schedule = client.get("/schedule").json()
    assert "L1" in schedule["assignments"]
```

아래로 갈수록 **실제 환경에 가깝고(fidelity가 높고), 느리고, 비싸고, 실패 원인을 좁히기 어렵다.** E2E가 빨간불이면 "어딘가 고장났다"는 것만 알 뿐, 원인이 로직인지 DB 스키마인지 네트워크인지는 다시 파헤쳐야 한다. unit test는 정확히 어느 함수가 틀렸는지 짚어 주지만, "각 부품은 멀쩡한데 조립하면 안 돌아가는" 버그는 놓친다.

## 그런데 "unit"이 뭔데? — 정의부터 논쟁적이다

여기까지는 깔끔해 보이지만, 사실 **"unit"의 정의부터 합의가 없다.** 두 가지 쟁점이 있다.

**첫째, unit은 클래스 하나인가, 행동(behavior) 하나인가.** "클래스마다 테스트 클래스 하나"라는 관행이 널리 퍼져 있지만, Khorikov 등은 unit을 코드 구조가 아니라 **하나의 관찰 가능한 행동 단위**로 보라고 주장한다. "납기가 빠른 lot이 먼저 온다"는 행동이 클래스 세 개에 걸쳐 구현되어 있어도 테스트는 하나면 된다는 것이다. 클래스 단위로 테스트를 쪼개면 내부 구조를 바꿀 때마다(리팩토링) 테스트가 우수수 깨지는 문제가 생기는데, 이건 4편에서 본격적으로 다룬다.

**둘째, "격리"의 대상이 무엇인가.** 테스트 대상이 다른 클래스를 사용할 때, 그 협력 클래스를 진짜로 쓰는 테스트를 **sociable unit test**, 전부 가짜(test double)로 바꿔 대상 하나만 남기는 테스트를 **solitary unit test** 라고 부른다(Jay Fields의 용어, Martin Fowler가 널리 알렸다). solitary 진영은 "unit test가 격리해야 할 것은 *테스트 대상 코드끼리*"라고 보고, sociable 진영은 "격리해야 할 것은 *테스트끼리*(서로 상태를 공유하지 않고 병렬 실행 가능하면 충분)"라고 본다. 이 대립은 5편의 London 학파 vs Detroit 학파 논쟁으로 이어진다.

그러니 누군가 "unit test를 짜라"고 말할 때, 그 말이 정확히 무엇을 뜻하는지는 팀마다 다를 수 있다는 사실만 우선 기억해 두자.

## Test pyramid vs testing trophy — 어디에 얼마나 투자할까

층위를 나눴으니 다음 질문은 배분이다. Mike Cohn이 *Succeeding with Agile*(2009)에서 제안한 **test pyramid** 는 오랫동안 표준 답안이었다.

```
[test pyramid — Mike Cohn]

         / \
        /E2E\          적게: 느리고, 비싸고, 잘 깨진다
       /-----\
      /       \
     / integra-\      중간
    /   tion    \
   /-------------\
  /               \
 /       unit      \   많이: 빠르고, 싸고, 원인을 정확히 짚는다
 -------------------
```

(Cohn의 원래 그림은 세 층을 UI / service / unit test라고 불렀다. 오늘날은 보통 위처럼 E2E / integration / unit으로 옮겨 읽는다.)

논리는 단순하다. 위층일수록 느리고 유지비가 비싸며 **flaky** — 코드는 그대로인데 타이밍·네트워크 문제로 실패가 오락가락하는 상태 — 해지기 쉬우니, 검증의 대부분은 아래층에서 해결하고 위층은 "전체가 이어져 있는지" 확인하는 소수의 시나리오만 남기라는 것이다. 상세한 해설은 Ham Vocke의 [The Practical Test Pyramid](https://martinfowler.com/articles/practical-test-pyramid.html)가 잘 정리했다.

이에 대한 대표적 반론이 Kent C. Dodds의 [**testing trophy**](https://kentcdodds.com/blog/the-testing-trophy-and-testing-classifications)다.

```
[testing trophy — Kent C. Dodds]

        ___
       (E2E)           적게
      /-------\
     |         |
     | integra-|       가장 많이 ← 트로피의 몸통
     |  tion   |
      \-------/
       (unit)          적당히
      =========
      [ static ]       받침: type check, lint (공짜에 가까운 1차 방어선)
```

trophy의 주장은 두 가지다. 첫째, 피라미드가 제안된 2009년 이후 **integration test의 비용이 크게 떨어졌다** — testcontainers처럼 진짜 DB를 코드 몇 줄로 띄우는 도구, 빨라진 하드웨어 덕분에 "느려서 못 쓴다"는 전제가 예전만큼 강하지 않다. 둘째, 테스트의 목적은 개수가 아니라 **confidence**(이 테스트가 통과하면 실제로도 동작하리라는 확신)인데, 격리를 심하게 한 unit test는 빠른 대신 확신을 적게 주고, 그 확신 대비 비용의 sweet spot이 integration 층이라는 것이다. Dodds의 유명한 문장이 이 관점을 압축한다: *"The more your tests resemble the way your software is used, the more confidence they can give you."* (테스트가 실제 사용 방식을 닮을수록 더 큰 확신을 준다.)

둘 중 누가 옳은가? **도메인에 따라 다르다** 가 정직한 답이다. 스케줄링 엔진처럼 복잡한 로직이 순수 계산에 몰려 있는 시스템이라면 그 로직을 unit test로 촘촘히 덮는 피라미드형이 자연스럽다. 반대로 로직은 얇고 가치의 대부분이 "DB·외부 API·UI를 잇는 배선"에 있는 전형적인 웹 서비스라면 trophy형 배분이 확신을 더 준다. 두 진영 모두 동의하는 것은 하나다 — **E2E는 최소한으로.** flaky한 E2E가 수백 개 쌓인 test suite는 아무도 결과를 믿지 않는 안전망, 즉 안전망이 아니다(10편에서 상세히).

## Google의 우회로: small / medium / large

"unit이 뭐냐"는 용어 논쟁에 지친 사람에게는 Google의 실용적 분류가 있다. *Software Engineering at Google*(2020)은 테스트를 무엇을 검증하느냐가 아니라 **어떤 자원을 쓰도록 허용되느냐**로 나눈다.

| 분류 | 허용 범위 | 대략의 대응 |
|---|---|---|
| **small** | 단일 프로세스. 네트워크·디스크 I/O, sleep 금지 | unit test |
| **medium** | 단일 머신. localhost 네트워크 허용 (로컬 DB 등) | integration test |
| **large** | 여러 머신, 원격 호출 허용 | E2E test |

이 분류의 영리한 점은 **정의가 기계적으로 검증 가능하다**는 것이다. "이게 진짜 unit test냐"는 논쟁 대신, test runner가 "small인데 네트워크를 열었네요"라고 자동으로 잡아낼 수 있다. 그리고 자원 제약이 곧 속도·결정성(같은 입력이면 항상 같은 결과)의 보증이 된다 — sleep과 I/O가 없는 테스트는 느려질 수도, flaky해질 수도 없다.

## 정적 분석: 테스트 이전의 0층

trophy가 받침으로 그린 **static** 층 — type check(mypy, TypeScript 등)와 lint(ruff, ESLint 등) — 은 엄밀히는 테스트가 아니지만 같은 예산에서 경쟁하는 방어선이므로 역할 분담을 알아둘 필요가 있다. 원칙은 이것이다. **타입이 잡을 수 있는 버그를 테스트로 잡지 마라.**

```python
def priority(lot: Lot, now: datetime) -> float: ...

priority("L1", now)          # 타입이 잡는다: Lot 자리에 str — 실행 전에 발견
priority(lot)                # 타입이 잡는다: 인자 누락
sorted(lots, key=lambda l: (l.due_date, l.waiting_time))
                             # 타입은 통과, 테스트만 잡는다:
                             # 대기시간이 "긴" lot을 앞세우려면 부호가 -여야 한다
```

타입은 "형태가 맞나"(잘못된 인자, `None` 미처리, 오타난 필드명)를 실행조차 하기 전에, 코드 전체에 대해 빠짐없이 검사한다. 반면 부호가 뒤집힌 정렬 키, 잘못된 부등호, 빠뜨린 비즈니스 규칙 같은 **로직의 의미**는 타입 시스템이 알 길이 없다 — `float`를 반환하라는 약속은 지켰으니까. 즉 정적 분석은 값싸고 넓은 1차 필터, 테스트는 그 필터를 통과한 코드의 *의미*를 검증하는 2차 방어선이다. 타입이 잘 갖춰진 코드베이스일수록 테스트는 형태 검사에 낭비되지 않고 로직 검증에 집중할 수 있다.

## Functional vs non-functional — 이 시리즈의 범위

지금까지의 분류는 모두 **functional test**, 즉 "기능이 명세대로 동작하는가"에 대한 것이었다. 이와 별개의 축으로 **non-functional test** 가 있다 — 기능이 아니라 품질 속성을 검증한다. 성능 테스트("디스패칭 결정이 100ms 안에 나오는가"), 부하 테스트("동시 요청 1만 건에서 버티는가"), 보안 테스트 등이 여기 속한다. non-functional 테스트는 측정 방법론과 도구가 완전히 달라서(부하 생성, 프로파일링, 백분위 지연시간 분석 등) 별도의 주제로 다뤄야 한다. **이 시리즈는 functional test에 집중한다.**

## 요약

- 테스트는 **unit(격리·빠름) / integration(연결 검증) / E2E(전체 시나리오)** 층위로 나뉘며, 아래로 갈수록 빠르고 원인을 정확히 짚는 대신 실제 환경과의 거리(fidelity)가 멀어진다.
- "unit"의 정의부터 논쟁적이다 — 클래스 단위냐 **행동 단위**냐, 협력 객체를 진짜로 쓰느냐(sociable) 가짜로 바꾸느냐(solitary). 이 대립은 4·5편으로 이어진다.
- **test pyramid**(unit 다수)와 **testing trophy**(integration 중심)는 "confidence 대비 비용"의 sweet spot을 어디로 보느냐의 차이다. 로직이 두꺼운 시스템은 피라미드형, 배선이 두꺼운 시스템은 trophy형이 자연스럽고, **E2E 최소화**에는 양쪽 다 동의한다.
- Google의 **small/medium/large** 분류는 용어 논쟁을 우회해 허용 자원(프로세스/머신/네트워크)으로 기계적으로 정의한다 — 자원 제약이 곧 속도와 결정성의 보증.
- **정적 분석**(type check, lint)은 형태의 오류를 공짜에 가깝게 걸러 주는 0층이다. 타입이 잡을 수 있는 것을 테스트로 잡지 말고, 테스트는 로직의 의미 검증에 집중시켜라.
- 다음 글(03)에서는 층위의 바닥이자 시리즈의 핵심인 단위 테스트의 내부 — AAA 구조, FIRST 원칙, pytest — 로 들어간다.

## 참고문헌

- Mike Cohn, *Succeeding with Agile: Software Development Using Scrum* (2009) — test pyramid의 출처.
- Ham Vocke, [The Practical Test Pyramid](https://martinfowler.com/articles/practical-test-pyramid.html) (martinfowler.com, 2018).
- Kent C. Dodds, [The Testing Trophy and Testing Classifications](https://kentcdodds.com/blog/the-testing-trophy-and-testing-classifications) (2021).
- Martin Fowler, [UnitTest](https://martinfowler.com/bliki/UnitTest.html) — sociable vs solitary 정리.
- Winters, Manshreck & Wright, *Software Engineering at Google* (O'Reilly, 2020), Ch. 11 — small/medium/large 분류. [무료 공개판](https://abseil.io/resources/swe-book)
- Vladimir Khorikov, *Unit Testing Principles, Practices, and Patterns* (Manning, 2020) — unit = 행동 단위 관점.
