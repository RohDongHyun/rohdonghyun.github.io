---
title: 03. 단위 테스트의 구조와 규율
date: 2026-07-06
tags:
  - Software Engineering
  - Testing
---

[[posts/foundations/software-testing/02-unit-integration-e2e|2편]]에서 테스트의 층위를 나눴다. 이번 글부터는 그 바닥층 — 가장 많이 쓰고, 가장 자주 읽게 되는 **단위 테스트** — 의 내부로 들어간다. 단위 테스트는 짧은 코드지만 아무렇게나 쓰면 금방 "깨져도 아무도 안 읽는 코드 더미"가 된다. 이 글은 좋은 단위 테스트가 공유하는 형식(AAA 구조, 이름 규칙)과 규율(FIRST 원칙)을 정리하고, pytest가 그 원칙들을 어떻게 도구로 뒷받침하는지 본다.

## AAA: 모든 테스트는 3막극이다

좋은 단위 테스트는 거의 예외 없이 같은 3단 구조를 가진다. Bill Wake가 2001년 **Arrange-Act-Assert(AAA)** 라는 이름으로 정리한 패턴이다.

1. **Arrange** — 검증에 필요한 상황을 만든다 (객체 생성, 입력 준비).
2. **Act** — 검증하고 싶은 동작을 **딱 하나** 실행한다.
3. **Assert** — 결과가 기대와 같은지 확인한다.

디스패칭 규칙 하나를 검증하는 예시다.

```python
from datetime import date

def test_hot_lot_ranks_before_earlier_due_date():
    # Arrange: hot lot과, 납기는 더 빠르지만 일반인 lot
    hot = Lot(id="H1", due_date=date(2026, 7, 12), is_hot=True)
    normal = Lot(id="N1", due_date=date(2026, 7, 8), is_hot=False)
    dispatcher = Dispatcher(rule="hot_first_then_edd")

    # Act: 순위 계산
    ranked = dispatcher.rank([normal, hot])

    # Assert: hot이 앞선다
    assert [lot.id for lot in ranked] == ["H1", "N1"]
```

같은 구조를 BDD(행동 주도 개발) 진영에서는 **Given-When-Then** 이라 부른다(Dan North, 2006). "주어진 상황에서(Given) 이 일이 일어나면(When) 이렇게 되어야 한다(Then)" — 이름만 다를 뿐 AAA와 동일한 3막극이다. 요점은 테스트 하나가 **하나의 완결된 문장**처럼 읽혀야 한다는 것이다.

구조가 무너진 테스트 두 가지를 보자. 첫째, **Act가 여러 번 섞인 테스트**다.

```python
def test_dispatcher():                      # 나쁜 예
    d = Dispatcher(rule="edd")
    d.add(Lot("L1", due=3)); d.add(Lot("L2", due=1))
    assert d.next().id == "L2"
    d.add(Lot("L3", due=0))                 # 두 번째 Act
    assert d.next().id == "L3"
    d.clear()                               # 세 번째 Act
    assert d.size() == 0
```

이 테스트가 중간에 빨간불이 되면 어느 행동이 깨진 건지 이름으로도 본문으로도 알 수 없고, 첫 assert가 실패하는 순간 뒤의 검증은 실행조차 안 된다. Act가 여러 개라는 것은 사실 여러 행동을 한 파일에 욱여넣은 **작은 시나리오**이지 단위 테스트가 아니다. 셋으로 쪼개는 것이 답이다.

둘째, **assert가 없는 테스트**다.

```python
def test_schedule_builds():                 # 나쁜 예
    build_schedule(lots, machines)          # 예외만 안 나면 초록불
```

예외가 안 나는 것도 정보이긴 하지만(이런 최소한의 "실행이나 되는지" 확인을 smoke test라 부른다), 이 테스트는 `build_schedule`이 빈 스케줄을 돌려줘도, 모든 lot을 한 machine에 몰아넣어도 통과한다. 초록불이 "동작이 맞다"를 뜻하지 않는 테스트는 안전망이 아니라 착시다.

## 이름: 깨졌을 때 이름만 보고 알 수 있는가

테스트 이름의 품질 기준은 하나다. **CI에서 이 테스트가 빨간불일 때, 코드를 열지 않고 이름만 보고 "무엇이 잘못됐는지" 알 수 있는가.**

```python
def test_sort(): ...            # FAILED test_sort — 그래서 뭐가 깨진 건데?

def test_lots_with_same_due_date_keep_fifo_order(): ...
# FAILED ... — 아, 같은 납기끼리 FIFO가 안 지켜지는구나
```

`test_sort`는 함수 이름을 반복할 뿐 아무 정보가 없다. 좋은 이름은 **시나리오와 기대 결과를 서술**한다 — 사실상 명세(스펙)의 한 줄이다. 관례는 여러 가지가 있는데, Roy Osherove의 `대상_상황_기대결과` 형식(`rank_sameDueDate_keepsFifoOrder`)이 오래 쓰였고, Khorikov는 형식을 강제하지 말고 **비개발자에게 읽어줘도 통하는 평문**으로 쓰라고 권한다. 어느 쪽이든 "이름이 길어진다"는 걱정은 접어도 된다. 테스트 함수는 호출할 일이 없으므로 이름이 길어서 생기는 비용이 없고, 문서로서의 가치만 남는다.

## FIRST: 단위 테스트의 규율

구조와 이름이 형식이라면, **FIRST** 는 규율이다. Robert C. Martin의 *Clean Code*(2008)로 널리 퍼진 다섯 원칙을 위반 사례와 함께 보자.

- **Fast (빠르게)** — 위반: 테스트마다 진짜 DB에 붙거나 `time.sleep(5)`가 들어 있어 전체 suite가 30분 걸린다. 결과: 아무도 로컬에서 안 돌리고, 안 돌리는 테스트는 없는 테스트다. 단위 테스트 수백 개는 초 단위로 끝나야 한다.
- **Isolated / Independent (독립적으로)** — 위반: `test_b`가 `test_a`가 넣어 둔 데이터를 전제한다. 실행 순서가 바뀌거나 하나만 골라 돌리면 실패하고, 병렬 실행이 불가능해진다. 각 테스트는 자기 Arrange만으로 완결되어야 한다.
- **Repeatable (반복 가능하게)** — 위반: "납기가 오늘로부터 2일 이내면 긴급"을 `date.today()`로 검증한다. 오늘은 통과, 자정이 지나면 실패 — 코드는 그대로인데 결과가 바뀐다. 시간·난수·네트워크 같은 비결정 요소는 테스트가 통제해야 한다(13편의 주제).
- **Self-validating (스스로 판정하게)** — 위반: 결과를 `print`로 찍고 사람이 눈으로 확인한다. 판정은 assert가 내려야 하며, 결과는 pass/fail 둘 중 하나여야 한다. 위의 "assert 없는 테스트"도 이 위반이다.
- **Timely (제때)** — 위반: 코드를 다 짜고 몇 주 뒤에 테스트를 몰아 쓴다. 그때는 이미 설계가 굳어 테스트 붙이기 어려운 코드가 되어 있다. 극단적으로 제때 쓰는 방법이 테스트를 먼저 쓰는 TDD인데, 7편에서 다룬다.

## pytest: 원칙을 구현하는 도구

Python의 표준적 테스트 프레임워크인 pytest의 기능들은 "편의 기능"이 아니라 위 원칙들을 그대로 구현한 장치로 읽는 게 정확하다.

**fixture — Arrange의 재사용과 격리를 동시에.** 여러 테스트가 같은 준비물(dispatcher, 표준 lot 세트)을 쓸 때, fixture는 중복을 없애면서도 **테스트마다 새 객체를 만들어** Independent를 지킨다.

```python
import pytest

@pytest.fixture
def dispatcher():
    return Dispatcher(rule="edd")   # 테스트마다 새로 생성 → 상태 공유 없음

def test_earliest_due_date_first(dispatcher):
    dispatcher.add(Lot("L1", due=3))
    dispatcher.add(Lot("L2", due=1))
    assert dispatcher.next().id == "L2"

def test_empty_queue_returns_none(dispatcher):   # 위 테스트의 lot이 남아있지 않다
    assert dispatcher.next() is None
```

전역 변수로 dispatcher를 공유했다면 두 번째 테스트는 첫 번째의 잔여 상태에 오염됐을 것이다. fixture의 기본 scope가 함수 단위인 이유가 바로 격리다.

**parametrize — 같은 행동, 여러 사례.** "행동 하나당 테스트 하나" 원칙을 지키면서 사례만 늘리고 싶을 때, 복사-붙여넣기 대신 데이터로 분리한다.

```python
@pytest.mark.parametrize("lots, expected_ids", [
    ([Lot("N1", due=1), Lot("H1", due=5, is_hot=True)], ["H1", "N1"]),  # 납기 늦어도 hot이 먼저
    ([Lot("N1", due=3), Lot("N2", due=1)], ["N2", "N1"]),               # 둘 다 일반이면 EDD
    ([Lot("N1", due=2), Lot("N2", due=2)], ["N1", "N2"]),               # 납기 동률이면 입력 순서 유지
])
def test_rank_follows_hot_first_then_edd(lots, expected_ids):
    dispatcher = Dispatcher(rule="hot_first_then_edd")

    ranked = dispatcher.rank(lots)

    assert [lot.id for lot in ranked] == expected_ids
```

세 사례가 각각 독립된 테스트로 실행·보고되므로, 어느 사례가 깨졌는지도 바로 드러난다.

**plain assert — Self-validating을 값싸게.** pytest는 테스트 모듈을 import할 때 assert 문을 다시 써서(assert rewriting), 실패 시 하위 표현식의 값까지 풀어 보여준다.

```
E   assert ['N1', 'H1'] == ['H1', 'N1']
E     At index 0 diff: 'N1' != 'H1'
```

`assertEqual`, `assertIn` 같은 전용 메서드 목록을 외울 필요 없이 Python의 `assert` 하나로 충분한 이유다. 판정 비용이 낮을수록 assert 없는 테스트를 쓸 핑계도 사라진다.

## 테스트 하나에 assert는 몇 개?

"테스트당 assert 1개" 규칙을 문자 그대로 읽으면 과하다. 합리적인 해석은 **논리적 assert 1개**, 즉 **행동 하나의 결과를 검증하라**는 것이다. 한 행동의 결과가 여러 측면을 가지면 assert가 여러 줄이어도 좋다.

```python
def test_assign_places_lot_on_idle_machine(scheduler):
    # scheduler fixture: M1은 작업 중, M2는 유휴 상태
    t0 = datetime(2026, 7, 6, 9, 0)

    assignment = scheduler.assign(Lot("L1"), at=t0)

    assert assignment.machine_id == "M2"      # 같은 행동(assign)의
    assert assignment.start_time == t0        # 여러 측면 — OK
```

반대로 assert 두 줄이 **서로 다른 행동**(할당 로직과 알림 발송)을 검증하고 있다면, 줄 수와 무관하게 테스트를 쪼개야 한다. 기준은 assert의 개수가 아니라 Act의 개수다.

## 요약

- 단위 테스트는 **Arrange-Act-Assert** 3막극이다. Act가 여러 개면 시나리오지 단위 테스트가 아니고, Assert가 없으면 착시다.
- 이름의 기준: **깨졌을 때 이름만 보고 무엇이 잘못됐는지 알 수 있는가.** 좋은 이름은 명세의 한 줄이다.
- **FIRST** — Fast, Isolated, Repeatable, Self-validating, Timely. 각 위반은 "안 돌리는 테스트", "순서 타는 테스트", "자정에 깨지는 테스트", "사람이 채점하는 테스트", "붙일 수 없게 굳은 코드"로 나타난다.
- pytest의 **fixture**(Arrange 재사용+격리), **parametrize**(한 행동의 여러 사례), **assert rewriting**(plain assert로 충분)은 이 원칙들의 도구적 구현이다.
- assert 개수 규칙은 **논리적 assert 1개** — 기준은 assert 줄 수가 아니라 Act의 개수다.
- 형식은 갖췄는데 리팩토링만 하면 깨지는 테스트가 있다. *무엇을* 검증할 것인가 — 행동인가 구현인가 — 는 4편에서 다룬다.

## 참고문헌

- Bill Wake, [3A – Arrange, Act, Assert](https://xp123.com/3a-arrange-act-assert/) (xp123.com) — AAA 패턴의 출처.
- Dan North, [Introducing BDD](https://dannorth.net/introducing-bdd/) (2006) — Given-When-Then.
- Robert C. Martin, *Clean Code* (Prentice Hall, 2008), Ch. 9 — FIRST 원칙.
- Roy Osherove, *The Art of Unit Testing* (Manning) — 테스트 이름 관례.
- Vladimir Khorikov, *Unit Testing Principles, Practices, and Patterns* (Manning, 2020), Ch. 3 — AAA·이름·assert 개수에 대한 현대적 정리.
- pytest 공식 문서: [fixtures](https://docs.pytest.org/en/stable/how-to/fixtures.html), [parametrize](https://docs.pytest.org/en/stable/how-to/parametrize.html), [assert rewriting](https://docs.pytest.org/en/stable/how-to/assert.html).
