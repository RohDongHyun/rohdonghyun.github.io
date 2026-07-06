---
title: 12. 레거시 코드에 테스트 붙이기
date: 2026-07-06
tags:
  - Software Engineering
  - Testing
---

지금까지의 시리즈는 암묵적으로 "테스트를 쓸 수 있는 코드"를 전제했다 — 새로 짜는 함수, 주입 가능한 의존성, 갖춰진 CI. 그러나 실무에서 마주치는 코드의 대부분은 그 반대다: 이미 몇 년째 프로덕션에서 돌아가고 있고, 아무도 전체를 이해하지 못하며, 테스트는 없다. 5부는 이런 "어려운 대상"을 다룬다. 이번 편의 질문은 하나다 — **테스트가 없는 채로 이미 돌아가는 코드에, 어떻게 안전하게 테스트를 붙이는가?**

## 레거시 코드 = 테스트 없는 코드

Michael Feathers는 『Working Effectively with Legacy Code』(2004)에서 레거시 코드를 이렇게 정의했다: **레거시 코드란 테스트가 없는 코드다.** 오래된 코드, 남이 짠 코드, 낡은 프레임워크 위의 코드가 아니라 — *테스트가 없는* 코드.

기준이 나이가 아니라 테스트 유무인 이유는, 코드를 다룰 때 우리를 실제로 괴롭히는 것이 코드의 나이가 아니라 **변경의 안전성** 이기 때문이다. [[posts/foundations/software-testing/01-why-we-test|1편]]에서 테스트의 첫 번째 역할을 회귀 방지(regression — 잘 되던 것이 변경 후 깨지는 것을 잡는 안전망)라고 했다. 테스트가 없으면 이 안전망이 없다는 뜻이고, 그러면 모든 수정은 "바꾸고 기도하기(edit and pray)"가 된다. 지난달에 짠 코드라도 테스트가 없으면 고치기 무섭고, 10년 된 코드라도 촘촘한 테스트가 있으면 오늘 리팩토링해도 된다. 두렵게 만드는 것은 세월이 아니라 테스트의 부재다.

## 레거시 코드 딜레마

그래서 테스트를 붙이려고 하면 곧바로 순환에 갇힌다. [[posts/foundations/software-testing/06-design-for-testability|6편]]에서 봤듯 테스트 가능한 코드는 의존성이 주입되고 부수효과가 분리된 코드인데, 레거시 코드는 정확히 그 반대라서 — DB 호출이 로직 한가운데 박혀 있고, 전역 상태를 읽고 쓰며, 함수 하나가 500줄이다 — 테스트를 놓으려면 먼저 코드 구조를 바꿔야 한다. 그런데 구조를 바꾸는 것 자체가 변경이고, 변경을 안전하게 하려면 테스트가 필요하다. Feathers가 **legacy code dilemma** 라 부른 상황이다:

> 코드를 안전하게 바꾸려면 테스트가 있어야 한다. 그런데 테스트를 놓으려면, 먼저 코드를 바꿔야 하는 경우가 많다.

Feathers의 답은 이 순환을 한 번에 끊는 묘수가 아니라, 위험을 최소화하며 조금씩 도는 **legacy code change algorithm** 이다.

1. **변경 지점을 식별한다** — 어디를 고쳐야 하는가.
2. **테스트 지점을 찾는다** — 그 변경의 효과를 어디서 관찰할 수 있는가 (변경 지점과 같지 않을 수 있다 — 500줄 함수 내부를 고치더라도 관찰은 함수의 반환값에서 할 수 있다).
3. **의존성을 끊는다** — test harness(테스트가 코드를 불러 실행할 수 있는 환경)에 코드를 올리는 것을 막는 의존성만, 최소한의 기계적 변경으로 끊는다.
4. **테스트를 작성한다** — 이제부터의 작업을 보호할 안전망.
5. **변경하고 리팩토링한다** — 안전망 위에서.

핵심은 순서다. 리팩토링(동작을 바꾸지 않는 구조 개선)은 5단계, 즉 **테스트가 생긴 뒤의 일** 이다. 3단계에서 허용되는 변경은 "테스트를 가능하게 하는 최소한"뿐이고, 그마저 컴파일러나 IDE가 보증하는 기계적 변환 위주로 한다.

## Characterization test: 현재 동작을 스펙으로

4단계에서 쓰는 테스트는 지금까지 시리즈에서 다룬 테스트와 목적이 다르다. 보통 테스트는 "코드가 **올바르게** 동작하는가"를 검증하지만, 레거시 코드에서는 무엇이 올바른지 아무도 모른다 — 스펙 문서는 없거나 낡았고, 원작자는 퇴사했다. 그래서 Feathers는 **characterization test** 를 제안한다: 올바른 동작이 아니라 **현재 동작** 을 기록해 스펙으로 고정하는 테스트다.

절차가 독특하다. 기대값을 머리로 계산해서 쓰는 게 아니라, **실행해서 나온 값을 받아 적는다.** dispatching 함수로 보자. 7년간 수정 43회, 테스트 0개인 500줄 함수의 축약판이라 상상하면 된다.

```python
# legacy_dispatch.py — 실물은 이 10배 길이의 if/elif 더미라고 상상하자
def pick_next_lot(lots: list[dict], machine: dict) -> str | None:
    best, best_score = None, -1
    for lot in lots:
        score = 0
        if lot["priority"] == "hot":
            score += 100
        if lot["recipe"] == machine.get("last_recipe"):
            score += 30
        if lot["qtime_remaining"] < 60:       # 60분 '미만'만 가산 — 의도? 버그?
            score += 50
        if score > best_score:                # 동점이면 리스트 앞쪽 lot 유지
            best, best_score = lot, score
    return best["id"] if best else None
```

이 함수에 characterization test를 붙이는 과정은 이렇다. 대표적인 입력을 몇 개 만들어 넣고, 일단 **아무 값이나 assert** 해서 실패시킨다.

```python
def test_hot_lot_vs_recipe_match():
    lots = [
        {"id": "L1", "priority": "normal", "recipe": "R7", "qtime_remaining": 999},
        {"id": "L2", "priority": "hot",    "recipe": "R3", "qtime_remaining": 999},
    ]
    machine = {"last_recipe": "R7"}
    assert pick_next_lot(lots, machine) == "???"   # 일부러 실패시켜 실제 값을 본다
```

실행하면 pytest가 `assert 'L2' == '???'`라고 알려준다. 그 값을 받아 적는다 — `== "L2"`. 이제 이 테스트는 "hot 가산(100)이 recipe 매칭 가산(30)을 이긴다"는 현재 동작을 고정한다. 같은 방식으로 동점 처리("동점이면 앞쪽 lot"), 경계값(`qtime_remaining == 60`은 가산 없음) 등 변경 지점 주변의 동작을 몇 개 더 고정한다.

여기서 규율이 하나 있다. `qtime_remaining < 60`은 경계값 60을 빼먹은 off-by-one 버그처럼 보인다. 그래도 **일단 현재 동작대로 기록한다.** 이 코드는 7년간 프로덕션에서 돌았고, 그 사이 다른 시스템 — 리포트, downstream 스케줄러, 운영자의 감 — 이 이 동작에 의존하게 됐을 수 있다. "관측 가능한 모든 동작에는 결국 누군가 의존하게 된다"는 [Hyrum's Law](https://www.hyrumslaw.com/) 그대로다. 버그 수정은 별도의 *의도된 변경* 으로, 이해관계자 확인을 거쳐 따로 한다. characterization test의 임무는 옳고 그름의 판정이 아니라, **의도하지 않은 변경이 일어나면 알려주는 것** 이다.

## Golden master: 출력이 크고 복잡할 때

입력 몇 개에 반환값 하나면 위 방식으로 충분하지만, 레거시 시스템의 출력은 종종 훨씬 크다 — 하루치 스케줄 전체, 수백 줄짜리 리포트, 복잡한 JSON. 항목 하나하나 assert를 쓰는 대신, **출력 전체를 파일로 저장해 두고 diff로 비교** 하는 기법이 **golden master**(또는 approval testing, snapshot testing)다.

```python
from pathlib import Path

GOLDEN = Path(__file__).parent / "golden" / "schedule-2026-07-01.txt"

def test_daily_schedule_matches_golden_master():
    schedule = build_daily_schedule(load_fixture("lots-2026-07-01.json"))
    actual = render_schedule_report(schedule)     # 사람이 읽을 수 있는 텍스트로
    if not GOLDEN.exists():                       # 최초 실행: 현재 출력을 기준으로 승격
        GOLDEN.write_text(actual, encoding="utf-8")
    assert actual == GOLDEN.read_text(encoding="utf-8")
```

최초 실행에서 현재 출력이 기준(golden master)으로 저장되고, 이후 실행은 출력이 기준과 한 글자라도 다르면 실패한다. 리팩토링 중에 이 테스트가 초록이면 "출력에 관측 가능한 변화가 없다"는 강한 보증이다. 수작업 대신 [ApprovalTests](https://approvaltests.com/)나 pytest용 [syrupy](https://github.com/syrupy-project/syrupy) 같은 라이브러리를 쓰면 diff 표시와 기준 갱신 절차를 대신해 준다. 두 가지 실무 주의점:

- **출력을 결정적으로 만들어야 한다.** 타임스탬프, dict 순회 순서, 부동소수점 자리수가 매번 달라지면 golden master는 항상 빨갛다. 비교 전에 가변 부분을 정규화하거나 빼놓는다(비결정성 자체를 다루는 법은 다음 편의 주제다).
- **무지성 승인(blind approval)의 함정.** diff가 떴을 때 내용을 읽지 않고 "기준 갱신" 버튼만 누르는 습관이 들면, 이 테스트는 무엇도 지키지 않는 의식(ritual)이 된다. snapshot 테스트가 흔히 조롱받는 이유가 이것이다. diff가 뜨면 그것은 곧 코드 리뷰다 — 변화가 의도된 것인지 한 줄씩 판정해야 한다.

그리고 characterization test든 golden master든, "이 안전망이 실제로 회귀를 잡아주는가"는 별개의 질문이다. [[posts/foundations/software-testing/09-coverage-and-mutation-testing|9편]]의 mutation testing — 코드를 일부러 망가뜨려 테스트가 빨간불을 켜는지 확인 — 이 정확히 이 검증에 쓰인다. 연습용으로는 Emily Bache가 70여 개 언어로 정리한 [Gilded Rose kata](https://github.com/emilybache/GildedRose-Refactoring-Kata)(원작 Terry Hughes)가 표준 교재다: 스파게티 함수에 golden master를 씌우고 리팩토링하는 전 과정을 안전하게 체험할 수 있다.

## Seam 찾기와 의존성 끊기 — 6편을 역방향으로

지금까지는 함수가 순수해서 그냥 호출할 수 있다고 가정했지만, 진짜 레거시 함수는 한가운데서 DB를 부르고 설비 인터페이스에 명령을 쏜다. test harness에 올리려면 3단계, **의존성 끊기** 가 필요하다. [[posts/foundations/software-testing/06-design-for-testability|6편]]에서 **seam** 을 "코드를 고치지 않고 프로그램의 동작을 바꿔 끼울 수 있는 지점"이라 정의했다. 새 코드를 짤 때는 seam을 *설계해 넣지만*, 레거시에서는 없는 seam을 *최소 침습으로 만들어야* 한다. 대표 기법 둘만 보자.

**Extract & override** — 문제의 의존성을 메서드로 추출한 뒤, 테스트에서는 그 메서드를 override한 서브클래스를 쓴다.

```python
class DailyScheduler:
    def build(self, date):
        lots = self._fetch_lots(date)   # 원래 build() 안에 인라인돼 있던 SQL을
        ...                              # 메서드 추출(extract method)로 분리했을 뿐

    def _fetch_lots(self, date):
        return run_query("SELECT ... FROM wip_lots WHERE ...")   # 경계는 그대로

# tests/test_scheduler.py
class SchedulerForTest(DailyScheduler):
    def _fetch_lots(self, date):        # DB 대신 고정 데이터 — 여기가 새로 만든 seam
        return FIXTURE_LOTS

def test_build_puts_hot_lots_first():
    schedule = SchedulerForTest().build("2026-07-01")
    assert schedule[0].priority == "hot"
```

프로덕션 코드에 가한 변경은 "메서드 추출" 하나뿐이다 — IDE가 자동으로 해 주는, 테스트 없이도 안전하다고 볼 수 있는 기계적 리팩토링이다. 그 대가로 서브클래스가 [[posts/foundations/software-testing/05-test-doubles|5편]]의 stub 역할을 하는 seam이 생겼다. 임시 구조물이라는 점은 기억하자 — 테스트가 충분히 쌓이면 6편의 정석대로 의존성 주입으로 승격시키는 것이 목적지다.

**Sprout method** — 레거시 함수에 새 기능을 *끼워 넣어야* 할 때, 그 코드를 500줄 안에 심지 않고 **밖에 새 함수로 심는다(sprout)**.

```python
def boost_photo_layer_lots(lots: list[dict]) -> list[dict]:
    """신규 요구사항: photo 공정 lot 우선. 태어날 때부터 테스트와 함께인 새 코드."""
    return sorted(lots, key=lambda l: l.get("layer") != "PHOTO")

def pick_next_lot(lots, machine):
    lots = boost_photo_layer_lots(lots)   # 레거시 본문 수정은 이 한 줄뿐
    ...                                    # 이하 500줄은 손대지 않음
```

새 로직 `boost_photo_layer_lots`는 순수 함수라 처음부터 [[posts/foundations/software-testing/07-test-driven-development|TDD]]로 개발할 수 있고, 레거시 함수에 가한 변경은 호출 한 줄이라 위험이 최소다. 클래스 단위로 같은 일을 하면 sprout class다. 이 방식의 함의는 장기 전략이기도 하다 — 레거시를 한 번에 갈아엎는 게 아니라, **새 코드는 전부 테스트와 함께 밖에 심고, 레거시 본체는 점점 얇은 껍데기로 만들어 가는 것** 이다.

## 요약

- **레거시 코드 = 테스트 없는 코드**(Feathers, 2004). 변경을 두렵게 만드는 것은 코드의 나이가 아니라 회귀 안전망의 부재다.
- **legacy code dilemma**: 안전한 변경엔 테스트가, 테스트엔 코드 변경이 필요하다. Feathers의 알고리즘 — 변경 지점 식별 → 테스트 지점 찾기 → 의존성 끊기(최소 침습) → 테스트 → 변경 — 으로 순환을 조금씩 돈다.
- **Characterization test** 는 올바른 동작이 아니라 **현재 동작** 을 고정한다. 기대값은 계산하지 않고 실행 결과를 받아 적는다. 버그처럼 보여도 일단 기록 — 누군가 그 동작에 의존하고 있을 수 있다(Hyrum's Law).
- 출력이 크면 **golden master**: 출력 전체를 저장해 diff로 비교. 전제는 결정적 출력, 최대의 적은 무지성 승인. 안전망의 실효성은 9편 mutation testing으로 잴 수 있다.
- 의존성 끊기는 **extract & override**(메서드 추출로 seam 생성), 새 기능은 **sprout method/class**(새 코드는 밖에 테스트와 함께 심기) — 6편의 seam 개념을 "없는 seam을 만들어내는" 역방향으로 쓴다.

마지막으로 복선 하나. 테스트 없는 코드베이스는 사람에게만 위험한 것이 아니다 — 코딩 에이전트에게 그런 코드베이스를 맡기는 것은, 회귀를 알려줄 신호가 하나도 없는 곳에서 대량의 변경을 승인하는 일이며, 이 시리즈 마지막 편에서 정면으로 다룬다.

## 참고문헌

- Michael Feathers, *Working Effectively with Legacy Code* (Prentice Hall, 2004) — 레거시 코드의 정의, change algorithm, characterization test, sprout/extract & override 등 이 글의 뼈대.
- [Hyrum's Law](https://www.hyrumslaw.com/) — "충분한 사용자가 있으면 관측 가능한 모든 동작에 누군가 의존한다"; Titus Winters, Tom Manshreck & Hyrum Wright, *Software Engineering at Google* (O'Reilly, 2020) 1장에도 소개.
- [ApprovalTests](https://approvaltests.com/) — Llewellyn Falco의 approval testing 라이브러리 (다언어 지원); [syrupy](https://github.com/syrupy-project/syrupy) — pytest용 snapshot 플러그인.
- Emily Bache, [Gilded Rose Refactoring Kata](https://github.com/emilybache/GildedRose-Refactoring-Kata) — golden master + 레거시 리팩토링 연습의 표준 교재 (kata 원작은 Terry Hughes).
