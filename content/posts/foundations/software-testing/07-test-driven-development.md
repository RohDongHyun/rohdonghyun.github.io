---
title: 07. TDD — 테스트가 먼저인 개발
date: 2026-07-06
tags:
  - Software Engineering
  - Testing
---

[[posts/foundations/software-testing/06-design-for-testability|6편]]은 "테스트는 코드의 첫 번째 클라이언트"라는 문장으로 끝났다. 그 문장을 끝까지 밀어붙이면 자연스러운 질문이 나온다 — 첫 번째 클라이언트라면, 아예 **코드보다 먼저** 써버리면 어떨까? 그것이 **TDD(Test-Driven Development)** 다. Kent Beck이 *Test-Driven Development: By Example*(2002)에서 정리한 이 방법론은 이름 때문에 "테스트를 많이 작성하는 기법"으로 오해받지만, 본질은 테스트를 **개발을 끌고 가는(driven) 조향 장치**로 쓰는 설계 방법론이다. 이번 글에서는 사이클을 실제로 돌려보고, 어디에 잘 맞고 어디에 안 맞는지까지 정직하게 따져본다.

## Red — Green — Refactor

TDD는 세 단계를 짧게 반복한다.

1. **Red** — 아직 존재하지 않는 동작에 대해 **실패하는 테스트**를 먼저 쓴다. 컴파일/import 에러도 red다. 이 단계의 의미는 테스트 작성이 아니라 **목표 정의**다: "다음 몇 분 동안 나는 정확히 이것을 만든다"를 실행 가능한 형태로 못 박는 것.
2. **Green** — 그 테스트를 통과시키는 **가장 단순한** 코드를 쓴다. 우아함은 죄악이고 속도가 미덕이다. Beck은 green에 도달하는 전략을 셋으로 정리했다: 상수를 반환해버리는 **fake it**(일단 속이기), 답이 뻔하면 바로 쓰는 **obvious implementation**, 예제를 하나 더 추가해 일반화를 강제하는 **triangulation**(삼각측량).
3. **Refactor** — green 상태에서 중복을 제거하고 구조를 개선한다. 방금 만든 테스트들이 안전망이 되므로, "고치다 망가뜨렸는지"를 몇 초 안에 알 수 있다. 테스트 코드 자체의 중복도 이 단계에서 정리한다.

핵심은 각 단계가 아니라 **사이클이 작다**는 것이다. 한 바퀴가 몇 분이면, 코드는 거의 항상 "방금 전까지 전부 통과하던" 상태다. 무언가 깨지면 용의자는 마지막 몇 줄뿐이라 디버깅 범위가 극도로 좁아진다. 큰 걸음으로 걷다 넘어지면 어디서 발을 헛디뎠는지 모르지만, 반 발짝씩 걸으면 넘어진 자리가 곧 원인이다.

## 미니 워크스루: slack 기반 디스패칭 규칙을 TDD로

"납기까지 남은 시간에서 남은 처리시간을 뺀 여유(slack)가 가장 작은 lot부터 처리한다"는 규칙(least slack first)을 세 사이클로 만들어 보자.

**사이클 1 — red.** 코드가 한 줄도 없는 상태에서 테스트부터 쓴다.

```python
# test_dispatch.py
from datetime import datetime, timedelta
from dispatch import Lot, slack_minutes   # 모듈이 없으니 import부터 실패 = red

def test_slack_is_time_to_due_minus_remaining_processing():
    now = datetime(2026, 7, 6, 9, 0)
    lot = Lot("L1", due=now + timedelta(minutes=90), remaining_min=60)
    assert slack_minutes(lot, now) == 30   # 90분 여유 - 60분 처리 = 30
```

이 테스트를 쓰는 동안 이미 설계 결정이 여럿 내려졌다. 함수 이름, 단위(분), 시간을 인자로 받는다는 것([[posts/foundations/software-testing/06-design-for-testability|6편]]의 의존성 주입이 자동으로 따라온다 — 테스트가 먼저면 `datetime.now()`를 안에 박을 수가 없다). **green**은 뻔뻔하게 간다.

```python
# dispatch.py
from dataclasses import dataclass
from datetime import datetime

@dataclass
class Lot:
    id: str
    due: datetime
    remaining_min: int

def slack_minutes(lot: Lot, now: datetime) -> float:
    return 30                              # fake it — 지금은 이걸로 충분하다
```

상수 반환이 우습게 보이지만, 이 시점에 테스트 인프라(import 경로, 데이터 구조, 시그니처)가 전부 동작함을 확인한 것이다.

**사이클 2 — triangulation.** 예제를 하나 더 추가해 거짓말을 못 하게 만든다.

```python
def test_late_lot_has_negative_slack():
    now = datetime(2026, 7, 6, 9, 0)
    lot = Lot("L2", due=now + timedelta(minutes=20), remaining_min=60)
    assert slack_minutes(lot, now) == -40  # 이미 늦은 lot — 상수 30으로는 통과 불가
```

red. 이제 진짜 구현으로 green을 만든다.

```python
def slack_minutes(lot: Lot, now: datetime) -> float:
    time_to_due = (lot.due - now).total_seconds() / 60
    return time_to_due - lot.remaining_min
```

**사이클 3 — 다음 행동.** slack이 계산되니 선택 규칙으로 나아간다. red — `pick_next`는 아직 존재하지 않으므로 import에 추가하는 순간 실패한다:

```python
from dispatch import Lot, slack_minutes, pick_next   # pick_next가 없으니 다시 red

def test_pick_next_prefers_smaller_slack():
    now = datetime(2026, 7, 6, 9, 0)
    urgent  = Lot("L1", due=now + timedelta(minutes=70),  remaining_min=60)  # slack 10
    relaxed = Lot("L2", due=now + timedelta(minutes=240), remaining_min=60)  # slack 180
    assert pick_next([relaxed, urgent], now).id == "L1"
```

green은 답이 뻔하므로 obvious implementation으로 바로 쓴다.

```python
def pick_next(lots: list[Lot], now: datetime) -> Lot:
    return min(lots, key=lambda l: slack_minutes(l, now))
```

**refactor.** 프로덕션 코드엔 아직 중복이 없지만 테스트 세 개가 `now = datetime(2026, 7, 6, 9, 0)`을 반복한다 — pytest fixture로 추출한다. 사이클 종료. 빈 리스트, slack 동점 처리 같은 다음 요구는 각각 다음 red가 된다.

## TDD ≠ 테스트를 많이 쓰는 것

위 워크스루에서 테스트 개수는 부산물이다. 실제로 일어난 일은 이것이다: **코드를 쓰기 전에 매번 그 코드의 사용자가 되어봤다.** `slack_minutes(lot, now)`라는 시그니처는 구현하다 나온 것이 아니라 호출부(테스트)를 먼저 쓰면서 "이렇게 부르고 싶다"로 결정됐다. 6편의 first client 논지가 그대로다 — 다만 TDD는 그 클라이언트를 시간적으로도 맨 앞에 세운다. 그래서 test-first 코드는 주입 가능한 의존성, 데이터 입출력 중심의 순수한 core 같은 성질을 **강제로** 갖게 된다. 테스트 못 할 코드를 쓰는 것 자체가 불가능한 순서이기 때문이다.

또 하나의 본질은 **범위 통제**다. red 테스트는 "지금 만드는 것"의 명세이자 완료 조건이어서, 통과하는 순간 멈추고 다음 목표를 정한다. 요구에 없는 일반화를 미리 해두는 과잉 설계가 끼어들 틈이 줄어든다.

## 잘 맞는 문제, 안 맞는 문제

**잘 맞는 곳.** 입출력 명세가 분명한 로직 — 디스패칭 규칙, 요금 계산, 파서, 프로토콜 처리. 그리고 **버그 수정**: 고치기 전에 버그를 재현하는 실패 테스트부터 쓰는 것은 TDD를 안 하는 팀도 채택해야 할 최소 규율이다. 재현 테스트가 red→green이 되는 순간 수정이 증명되고, 같은 버그의 재발은 영구히 차단된다.

**안 맞는 곳.** 첫째, **탐색적 프로토타이핑** — 무엇을 만들지 자체를 코드를 던져보며 찾는 단계에서는 명세가 없으므로 red를 쓸 수가 없다. 스파이크(spike)로 탐색한 뒤 버리고, 알게 된 것을 TDD로 다시 만드는 절충이 일반적이다. 둘째, **UI의 시각적 요소** — "보기 좋다"는 assert로 표현되지 않는다. 셋째, **명세를 찾아가는 연구 코드** — 모델 성능이 얼마가 나와야 "맞는" 것인지 사전에 모른다면 테스트가 명세 역할을 할 수 없다.

알고리즘 도출의 한계를 보여주는 유명한 사례가 **Sudoku 논쟁**이다. 2006년 Ron Jeffries(XP 창시자 중 한 명)가 스도쿠 solver를 TDD로 만드는 연재를 시작했으나 여러 편에 걸쳐 자료구조 주변을 맴돌다 완성하지 못하고 중단했고, 비슷한 시기 Peter Norvig은 [constraint propagation과 탐색에 기반한 간결한 solver](https://norvig.com/sudoku.html)를 에세이 한 편으로 제시했다. 교훈은 "TDD는 틀렸다"가 아니라 **TDD는 알고리즘적 통찰을 대신 도출해주지 않는다**는 것이다. 테스트는 이미 아는 해법을 안전하게 구현하도록 이끌 뿐, 제약 전파라는 아이디어 자체는 도메인 지식에서 와야 한다.

## 효용은 입증됐나 — 정직한 요약

가장 자주 인용되는 실증은 Nagappan, Maximilien, Bhat, Williams(2008)의 Microsoft·IBM 4개 팀 사례 연구다([DOI](https://doi.org/10.1007/s10664-008-9062-z)). TDD 도입 팀은 비슷한 비교 프로젝트 대비 출시 전 결함 밀도가 40–90% 낮았지만, 초기 개발 시간은 15–35% 늘었다(시간 증가는 팀들의 자체 평가 수치다) — 품질과 초기 속도의 trade-off를 보여준다. 그러나 이후 연구들을 모으면 그림은 흐려진다. Rafique & Mišić(2013)이 27개 연구를 모은 메타 분석([DOI](https://doi.org/10.1109/TSE.2012.28))은 외부 품질에서 작은 개선, 생산성에서는 뚜렷한 효과 없음을 보고했고, 효과의 크기가 실험 설계(산업 현장인지 학술 실험인지, 비교 대상이 test-last인지, 두 그룹의 테스트 노력 차이)에 크게 좌우된다는 것도 함께 보였다. 정직한 요약은 이렇다: **결과는 혼재하며, "TDD가 항상 우월하다"는 실증적으로 과장이다.** 다만 여러 연구에서 효과의 상당 부분이 test-first라는 순서 자체보다 **작은 단계와 촘촘한 테스트**에서 온다는 해석이 반복된다는 점은 실무적으로 유용한 힌트다.

## 실용적 절충: 하한선은 "커밋 전에 테스트가 있다"

그래서 항상 TDD여야 하는가? 아니다. 순서는 상황에 따라 고르면 된다 — 명세가 또렷한 로직과 버그 수정은 test-first가 잘 들고, 탐색이 필요하면 스파이크 후 테스트를 붙이는 test-last도 정당하다. 양보하면 안 되는 하한선은 순서가 아니라 **결과 상태**다: 커밋(또는 PR)에는 그 변경을 검증하는 테스트가 함께 있어야 한다. test-last를 택했다면 한 가지 규율만 추가하자 — 다 짠 뒤 테스트를 쓰고, **구현을 잠시 망가뜨려 테스트가 실제로 red가 되는지 확인**한 후 되돌린다. red를 한 번도 본 적 없는 테스트는 아무것도 검증하지 않고 있을 수 있기 때문이다(이 "테스트를 테스트하기"를 체계화한 것이 mutation testing인데, 9편에서 다룬다).

## 요약

- TDD는 **red(실패 테스트로 목표 정의) → green(가장 단순한 통과 — fake it / obvious implementation / triangulation) → refactor(테스트를 안전망 삼은 구조 개선)** 의 짧은 사이클이다.
- 본질은 테스트 개수가 아니라 **설계 방법론**: 테스트가 API의 첫 사용자가 되어 인터페이스·의존성 구조를 먼저 결정하고, red가 작업 범위를 통제한다.
- 명세가 분명한 로직과 버그 수정(재현 테스트 먼저)에 강하고, 탐색적 프로토타이핑·UI 시각 요소·명세를 찾아가는 연구 코드에는 부담이다. Sudoku 논쟁이 보여주듯 알고리즘적 통찰은 TDD가 대신 만들어주지 않는다.
- 실증 결과는 혼재한다 — 결함 감소 대 초기 시간 증가(Nagappan et al. 2008), 메타 분석의 엇갈린 결론. 과신도 폄하도 근거가 약하다.
- 절충의 하한선: 순서는 유연하게, 그러나 **커밋 전에 테스트가 있다**. test-last라면 테스트가 red가 되는 순간을 한 번은 확인할 것.

## 참고문헌

- Kent Beck, *Test-Driven Development: By Example* (Addison-Wesley, 2002) — red-green-refactor와 green 전략(fake it, triangulation)의 원전.
- Nagappan, Maximilien, Bhat & Williams, "Realizing quality improvement through test driven development: results and experiences of four industrial teams," *Empirical Software Engineering* 13 (2008). [DOI](https://doi.org/10.1007/s10664-008-9062-z)
- Rafique & Mišić, "The Effects of Test-Driven Development on External Quality and Productivity: A Meta-Analysis," *IEEE Transactions on Software Engineering* 39(6) (2013). [DOI](https://doi.org/10.1109/TSE.2012.28)
- Peter Norvig, [Solving Every Sudoku Puzzle](https://norvig.com/sudoku.html) — Sudoku 논쟁에서 대비 축이 된 에세이.
- Martin Fowler, [Is TDD Dead?](https://martinfowler.com/articles/is-tdd-dead/) (2014) — Beck·Fowler·DHH의 논쟁 시리즈. TDD의 적용 범위에 대한 균형 잡힌 토론.
