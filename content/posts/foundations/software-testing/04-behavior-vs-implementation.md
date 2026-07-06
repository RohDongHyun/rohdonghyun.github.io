---
title: 04. 무엇을 테스트할 것인가 — 행동 vs 구현
date: 2026-07-06
tags:
  - Software Engineering
  - Testing
---

[[posts/foundations/software-testing/03-anatomy-of-a-unit-test|3편]]에서 단위 테스트의 형식(AAA)과 규율(FIRST)을 갖췄다. 그런데 형식이 완벽한 테스트가 이상하게 자주 깨지는 경우가 있다. 버그가 없는데도, 코드 구조만 정리했는데도 CI가 빨간불이 된다. 이런 테스트의 문제는 형식이 아니라 **검증 대상 선택**에 있다 — 행동(behavior)이 아니라 구현(implementation)을 붙잡고 있는 것이다. 이번 글은 이 구분을 코드로 확인하고, Vladimir Khorikov가 *Unit Testing Principles, Practices, and Patterns*(2020)에서 정리한 "좋은 단위 테스트의 4 기둥"으로 논의를 일반화한다.

## Observable behavior vs implementation detail

Khorikov의 정의를 빌리면, **observable behavior(관찰 가능한 행동)** 는 클라이언트(호출자)가 자신의 목표를 달성하기 위해 사용하는 것 — 공개 API가 제공하는 연산과 상태다. **implementation detail(구현 세부사항)** 은 그 목표 달성에 클라이언트가 알 필요 없는 내부 — private 메서드, 내부 자료구조, 중간 계산 과정, 메서드 호출 순서다.

디스패처를 예로 들자. 클라이언트가 `Dispatcher`에게 원하는 것은 "lot을 넣으면(`add`), 규칙에 맞는 순서로 꺼내진다(`next`)"이다. 이것이 행동이다. 그 순서를 내부에서 **어떻게** 유지하는가 — 매번 리스트를 정렬하는지, heap을 쓰는지, `_queue`라는 이름의 필드가 있는지 — 는 전부 구현 세부사항이다.

```python
class Dispatcher:
    """EDD(Earliest Due Date) 규칙 디스패처 — v1: add할 때마다 정렬"""

    def __init__(self):
        self._queue = []                          # 내부 표현 (구현 세부사항)

    def add(self, lot):
        self._queue.append(lot)
        self._queue.sort(key=lambda l: l.due_date)

    def next(self):
        return self._queue.pop(0) if self._queue else None
```

같은 기능에 대해 두 가지 테스트를 쓸 수 있다.

```python
def test_add_keeps_internal_queue_sorted():       # (A) 구현을 검증
    d = Dispatcher()
    d.add(Lot(id="L1", due_date=3))
    d.add(Lot(id="L2", due_date=1))

    # private 필드가 "정렬된 리스트"라는 사실에 의존
    assert [l.id for l in d._queue] == ["L2", "L1"]


def test_next_returns_earliest_due_date_first():  # (B) 행동을 검증
    d = Dispatcher()
    d.add(Lot(id="L1", due_date=3))
    d.add(Lot(id="L2", due_date=1))

    assert d.next().id == "L2"                    # 입력 → 관찰 가능한 출력
```

지금은 둘 다 초록불이다. 차이는 코드가 **변할 때** 드러난다.

## 리팩토링: 행동은 그대로, 구조만 바꾼다

리팩토링(refactoring)의 정의가 바로 "**observable behavior를 바꾸지 않으면서** 내부 구조를 개선하는 것"(Fowler)이다. v1은 `add`마다 전체 정렬을 하므로 lot이 수만 개면 느리다. 우선순위 큐로 바꾸자.

```python
import heapq

class Dispatcher:
    """v2: heap 기반 — 행동은 v1과 동일, 자료구조만 변경"""

    def __init__(self):
        self._heap = []
        self._seq = 0                             # 납기 동률 시 FIFO 보장용

    def add(self, lot):
        heapq.heappush(self._heap, (lot.due_date, self._seq, lot))
        self._seq += 1

    def next(self):
        return heapq.heappop(self._heap)[2] if self._heap else None
```

클라이언트 입장에서 v1과 v2는 구분 불가능하다 — 같은 입력에 같은 순서로 lot이 나온다. 그러나 테스트 결과는 갈린다.

- **(B) 행동 테스트: 통과.** `add` → `next`의 관계는 그대로이므로.
- **(A) 구현 테스트: 실패.** `_queue` 필드 자체가 사라졌다. 설령 필드 이름을 유지했더라도 원소가 `(due_date, seq, lot)` 튜플로 바뀌었고, heap의 내부 배열은 애초에 정렬 상태를 보장하지 않으므로 깨진다.

(A)의 실패가 바로 **false positive(거짓 양성)** 다 — 실제로는 아무 행동도 망가지지 않았는데 테스트가 "고장났다"고 경보를 울리는 것. [[posts/foundations/software-testing/01-why-we-test|1편]]에서 테스트의 첫째 역할을 회귀(regression, 잘 되던 기능이 변경 후 깨지는 것) 방지라고 했는데, false positive는 그 반대 방향의 오류다: 회귀가 **없는데** 실패한다. 이런 경보가 반복되면 개발자는 테스트 실패를 "또 저거네" 하고 무시하거나, 리팩토링 자체를 회피하게 된다. 늑대가 왔다고 세 번 외친 테스트 suite는 진짜 늑대가 왔을 때 아무도 안 믿는다.

즉 **brittle test(취약한 테스트) — 행동이 그대로인데 구조 변경만으로 깨지는 테스트 — 의 근본 원인은 단 하나, 구현 세부사항과의 결합**이다. private 상태를 들여다보는 (A) 유형뿐 아니라, mock으로 "내부에서 `_score()`가 lot마다 한 번씩, 이 순서로 호출됐는가"를 검증하는 테스트도 같은 병이다(mock의 올바른 용법은 5편에서 다룬다). 어느 쪽이든 테스트가 "무엇을 하는가"가 아니라 "어떻게 하는가"에 서명한 셈이고, '어떻게'는 리팩토링마다 바뀌는 것이 정상이다.

## 좋은 단위 테스트의 4 기둥 (Khorikov)

이 관찰을 Khorikov는 네 가지 속성으로 일반화한다. 좋은 단위 테스트는:

1. **Protection against regressions (회귀 방지)** — 실제 버그를 잡아낼 확률. 테스트가 실행하는 코드의 양과 복잡도가 클수록 높다.
2. **Resistance to refactoring (리팩토링 내성)** — false positive를 내지 **않는** 정도. 구현이 아니라 행동에 결합할수록 높다.
3. **Fast feedback (빠른 피드백)** — 실행 속도. 빠를수록 자주 돌리고, 버그를 만든 직후에 잡는다.
4. **Maintainability (유지보수성)** — 테스트 자체를 읽고 고치기 쉬운 정도.

핵심 주장은 **넷을 동시에 최대화할 수 없다**는 것이다. Khorikov는 테스트의 가치를 네 속성의 **곱**으로 보라고 한다 — 어느 하나라도 0이면 전체가 0이다. 그리고 트레이드오프의 구조가 비대칭적이다.

- **(1)과 (3)은 서로 당긴다.** 회귀 방지를 극대화한 테스트는 E2E다 — 시스템 전체를 실행하니 잡는 범위가 넓지만 느리다. 반대로 사소한 한 줄짜리 코드의 테스트는 번개처럼 빠르지만 잡을 버그도 없다. 이 축에서는 슬라이더를 어디 둘지 **선택**해야 한다([[posts/foundations/software-testing/02-unit-integration-e2e|2편]]의 피라미드 층위 선택이 사실 이 선택이다).
- **(2)는 타협 대상이 아니다.** Khorikov에 따르면 리팩토링 내성은 연속적인 다이얼이 아니라 사실상 이진적이다 — 테스트는 구현에 결합돼 있거나, 아니거나. 그리고 내성이 없는 테스트는 false positive로 suite 전체의 신뢰를 갉아먹으므로, **(2)를 최대로 고정해 두고** (1)↔(3) 사이에서 조절하라는 것이 그의 처방이다.
- **(4)는 독립된 축**으로, 항상 최대화한다(3편의 구조·이름 규율이 여기 기여한다).

행동 vs 구현이라는 이 글의 주제는 결국 "기둥 (2)를 어떻게 확보하는가"에 대한 답이다: **입력과 관찰 가능한 결과(반환값, 최종 상태, 외부로 나가는 통신)만 검증하고, 거기 도달하는 경로는 검증하지 말 것.**

## "테스트하기 어렵다"는 설계의 신호다

이쯤에서 자연스러운 반론이 나온다. "그 private 로직이 진짜 복잡해서 직접 테스트하고 싶은데?" 예컨대 `Dispatcher._score()`가 납기·hot 여부·대기시간을 조합하는 30줄짜리 가중치 계산이라면, `add`/`next`를 통해 간접적으로만 검증하기엔 답답하다.

이때 private 메서드를 강제로 노출하거나 name mangling을 우회해서 테스트하는 것은 답이 아니다. **private 메서드를 테스트하고 싶다는 충동은, 그 메서드가 한 클래스에 숨기엔 큰 별도의 책임이라는 신호**다. 점수 계산이 그 자체로 테스트할 가치가 있다면, 그것은 `ScoringPolicy` 같은 독립된 클래스(또는 순수 함수)가 될 자격이 있다는 뜻이고, 분리하고 나면 그것의 public API를 행동으로 테스트하면 된다. "테스트하기 어렵다"가 테스트 기법의 문제가 아니라 **설계 피드백**이라는 이 관점 — 테스트 가능성(testability)은 좋은 설계의 부산물이다 — 은 6편(테스트 가능한 설계)에서 본격적으로 다룬다.

## 요약

- **행동** = 클라이언트가 관찰할 수 있는 것(입력 → 출력/최종 상태). **구현** = 거기 도달하는 내부 경로(private 상태, 자료구조, 호출 순서). 테스트는 전자에만 결합해야 한다.
- 리팩토링(행동 불변, 구조 개선)에 깨지는 테스트가 brittle test이고, 그 실패는 **false positive** — 회귀가 없는데 울리는 거짓 경보다. 반복되면 suite의 신뢰가 무너진다.
- Khorikov의 4 기둥: **회귀 방지 · 리팩토링 내성 · 빠른 피드백 · 유지보수성.** 가치는 넷의 곱이며, 회귀 방지↔빠른 피드백은 선택의 축이지만 **리팩토링 내성은 타협 불가** — 항상 최대로 둔다.
- 정렬을 `list.sort`에서 `heapq`로 바꿔도 행동 테스트는 통과해야 한다. 통과 못 하는 테스트는 안전망이 아니라 리팩토링의 족쇄다.
- private 메서드를 테스트하고 싶다면 그것은 클래스 분리 신호다. "테스트가 어렵다 = 설계가 말을 건다"는 6편의 주제이고, 그 전에 5편에서 구현 결합의 또 다른 주범인 mock부터 정리한다.

## 참고문헌

- Vladimir Khorikov, *Unit Testing Principles, Practices, and Patterns* (Manning, 2020), Ch. 4–5 — 4 기둥, observable behavior vs implementation detail, false positive.
- Martin Fowler, *Refactoring: Improving the Design of Existing Code*, 2nd ed. (Addison-Wesley, 2018) — 리팩토링의 정의.
- Kent Beck, *Test-Driven Development: By Example* (Addison-Wesley, 2002) — "테스트는 행동에 대해 이야기해야 한다"는 전통의 원류.
- Google Testing Blog, [Testing on the Toilet: Test Behavior, Not Implementation](https://testing.googleblog.com/2013/08/testing-on-toilet-test-behavior-not.html) (2013) — 같은 원칙의 짧은 실무 정리.
