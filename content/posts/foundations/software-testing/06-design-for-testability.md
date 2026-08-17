---
title: 06. 테스트 가능한 설계 (Design for Testability)
date: 2026-07-06
tags:
  - Software Engineering
  - Testing
---

[[posts/foundations/software-testing/04-behavior-vs-implementation|4편]]에서 "테스트가 어렵다는 것은 설계가 나쁘다는 신호"라고 했고, [[posts/foundations/software-testing/05-test-doubles|5편]] 끝에서는 "double을 갈아 끼우려면 애초에 의존성이 주입 가능해야 한다"고 했다. 이번 글은 그 신호에 어떻게 **응답**하는가 — 즉 테스트하기 좋은 코드는 어떤 모양인가를 다룬다. 결론부터 말하면 필요한 것은 거창한 프레임워크가 아니라 세 가지 습관이다: 의존성을 밖에서 받기, 순수한 로직과 부수효과(side effect)를 가르기, 테스트 못 하는 경계는 최대한 얇게 만들기.

## 의존성 주입 — 안에서 만들지 말고 밖에서 받아라

테스트를 막는 가장 흔한 범인은 함수나 생성자 **안에서** 의존성을 직접 만들어 쓰는 코드다.

```python
from datetime import datetime, timedelta
from dataclasses import dataclass

@dataclass
class Lot:
    id: str
    due: datetime

def is_hot_lot(lot: Lot) -> bool:
    remaining = lot.due - datetime.now()          # 함수 안에 박힌 현재 시각
    return remaining < timedelta(hours=1)
```

`datetime.now()`가 함수 안에 박혀 있어서, 이 함수의 출력은 **언제 실행하느냐**에 따라 달라진다. "마감 55분 전 lot은 hot이다"를 검증하려면 실제로 마감 55분 전에 테스트를 돌리는 수밖에 없다 — [[posts/foundations/software-testing/03-anatomy-of-a-unit-test|3편]] FIRST의 Repeatable이 무너진다. 5편의 `monkeypatch`로 모듈에 import된 `datetime`을 통째로 바꿔치기할 수도 있지만, 그것은 잠긴 문을 창문으로 넘는 것이다. 문을 열어두는 쪽이 낫다.

**의존성 주입(dependency injection, DI)** 은 객체나 함수가 필요로 하는 것을 스스로 만들지 않고 호출자에게서 받는 설계다. 이름이 거창하지만 가장 가벼운 형태는 그냥 **인자 하나 추가**다.

```python
def is_hot_lot(lot: Lot, now: datetime | None = None) -> bool:
    now = now or datetime.now()                   # 프로덕션 호출부는 그대로
    return (lot.due - now) < timedelta(hours=1)

def test_lot_due_within_an_hour_is_hot():
    base = datetime(2026, 7, 6, 9, 0)
    lot = Lot("L1", due=base + timedelta(minutes=55))
    assert is_hot_lot(lot, now=base)              # 시간을 완전히 통제
```

기본값 인자 덕분에 기존 호출부는 한 줄도 안 바뀌고, 테스트만 `now`를 주입한다. 객체 수준에서는 생성자 인자가 같은 역할을 한다. 5편의 `Dispatcher`가 `MesClient`를 안에서 `MesClient(host="mes.fab1.internal")`로 생성했다면 stub을 끼울 방법이 없었을 것이다 — `__init__(self, mes, notifier)`로 받았기 때문에 double 교체가 가능했다. Java 진영의 DI 컨테이너(Spring 등) 같은 프레임워크는 이 원칙을 대규모로 자동화하는 도구일 뿐, 원칙 자체는 "생성자 인자로 받기"면 충분히 실현된다.

## Functional core, imperative shell — 결정과 실행을 가르기

DI만으로는 부족한 경우가 있다. 로직과 IO가 한 함수에 뒤엉켜 있으면, 주입을 해도 결국 double 여러 개를 조립해야 로직 한 줄을 검증할 수 있다.

```python
@dataclass
class WipLot:
    id: str
    due_date: int

@dataclass
class Equipment:
    id: str
    status: str        # "IDLE" | "RUN" | "DOWN"

def dispatch_step(mes, eq_ctrl):
    lots = mes.get_waiting_lots()                     # IO: MES 조회
    idle = [e for e in mes.get_equipments()           # IO: MES 조회
            if e.status == "IDLE"]
    ordered = sorted(lots, key=lambda l: l.due_date)  # 로직: EDD 정렬
    for eq, lot in zip(idle, ordered):                # 로직: 배정 계산
        eq_ctrl.start(eq.id, lot.id)                  # IO: 설비 명령
```

"EDD 순서로 idle 설비에 배정한다"는 순수한 계산인데, 이를 테스트하려면 `mes` stub과 `eq_ctrl` spy를 매번 세팅해야 한다. Gary Bernhardt가 2012년 강연 [Boundaries](https://www.destroyallsoftware.com/talks/boundaries)에서 제안한 **functional core, imperative shell** 은 이 엉킴을 구조적으로 푼다 — **결정(decision)은 순수 함수로, 실행(effect)은 바깥 껍데기로.** 여기서 순수 함수(pure function)란 같은 입력에 항상 같은 출력을 내고 외부 상태를 건드리지 않는 함수를 말한다.

```python
def plan_assignments(lots, equipments) -> list[tuple[str, str]]:
    """functional core — 데이터를 받아 배정 '계획'만 계산하는 순수 함수"""
    idle = [e for e in equipments if e.status == "IDLE"]
    ordered = sorted(lots, key=lambda l: l.due_date)
    return [(e.id, l.id) for e, l in zip(idle, ordered)]

def dispatch_step(mes, eq_ctrl):
    """imperative shell — 조회하고, core에 묻고, 실행한다. 판단하지 않는다."""
    plan = plan_assignments(mes.get_waiting_lots(), mes.get_equipments())
    for eq_id, lot_id in plan:
        eq_ctrl.start(eq_id, lot_id)
```

core의 테스트는 이제 double이 **하나도** 필요 없다. 일반 데이터를 넣고 반환값을 비교하면 끝이다.

```python
def test_edd_lot_gets_the_idle_equipment():
    lots = [WipLot("L1", due_date=3), WipLot("L2", due_date=1)]
    eqs = [Equipment("EQ1", "IDLE"), Equipment("EQ2", "DOWN")]
    assert plan_assignments(lots, eqs) == [("EQ1", "L2")]
```

규칙이 복잡해질수록 — 우선순위 가중치, 설비 제약, hot lot 선점 — 테스트는 core에만 쌓으면 되고, shell은 "조회 → 호출 → 실행"이라는 뻔한 배관이라 통합 테스트 몇 개로 충분하다. 부수효과가 껍데기 한 곳에 모이니 5편의 "무엇을 mock할 것인가" 고민도 shell 한 층으로 국한된다.

## Humble object — 테스트 못 하는 경계는 얇게

그래도 테스트 환경에 올릴 수 없는 코드는 남는다. GUI 이벤트 루프, `while True`로 도는 스케줄러 데몬, 실제 설비와 통신하는 드라이버. **humble object 패턴** (Meszaros가 *xUnit Test Patterns*, 2007에서 명명; [Fowler의 정리](https://martinfowler.com/bliki/HumbleObject.html) 참고)은 이런 경계를 없애려 하지 않고, 그 안의 로직을 전부 빼내 **경계 자체는 테스트할 것이 없을 만큼 겸손하게(humble)** 만든다.

```python
import time

def run_dispatcher_daemon(mes, eq_ctrl, poll_sec=5):
    """humble: 루프·sleep·호출뿐. 여기 버그가 있으면 눈으로도 보인다."""
    while True:
        dispatch_step(mes, eq_ctrl)
        time.sleep(poll_sec)
```

데몬 자체는 단위 테스트하지 않는다 — 대신 판단할 거리를 전부 `plan_assignments`로 밀어냈기 때문에 테스트 안 해도 불안하지 않다. Functional core/imperative shell과 같은 정신의 패턴이고, shell이 곧 humble object다.

<details>
  <summary><b>Humble Object 패턴 추가 설명</b></summary>

> ### 핵심 아이디어
> 
> UI, DB, 네트워크, 프레임워크, 스레드 같은 경계(boundary)에 붙은 코드는 테스트가 어렵습니다. 이때 코드를 두 조각으로 쪼갭니다.
> 
> - **Humble(겸손한) 객체**: 경계에 직접 닿는 부분. 로직을 거의 갖지 않고, 값을 그대로 전달하거나 그리기만 함. *너무 단순해서 테스트할 게 없는* 수준까지 비워냄
> - **Testable 객체**: 흥미로운 로직 전부. 경계에 대한 의존이 없어서 순수 단위 테스트 가능
> 
> "테스트하기 어려운 코드는 테스트할 필요가 없을 만큼 단순하게 만들고, 나머지 로직은 전부 밖으로 빼낸다"가 한 줄 요약입니다.
> 
> ### 예시
> 
> ```python
> # Humble: 화면에 뿌리기만 함. 로직 없음
> class OrderView:
>     def render(self, vm: OrderViewModel):
>         self.label.text = vm.total_text
>         self.badge.visible = vm.show_discount_badge
> 
> # Testable: 포맷·판단 로직 전부 여기에. UI 의존 0
> class OrderPresenter:
>     def present(self, order: Order) -> OrderViewModel:
>         return OrderViewModel(
>             total_text=f"{order.total:,}원",
>             show_discount_badge=order.discount_rate >= 0.1,
>         )
> ```
> 
> `OrderPresenter`는 UI 없이 단위 테스트가 되고, `OrderView`는 대입문 두 줄뿐이라 버그가 날 여지가 거의 없습니다.
> 
> ### 흔히 적용되는 곳
> 
> | 경계 | Humble | Testable |
> |---|---|---|
> | UI | View | Presenter / ViewModel (MVP, MVVM) |
> | DB | Gateway 구현체 | Interactor / Use case |
> | 프레임워크 | Controller, Main | Service 계층 |
> | 스레드·시간 | Scheduler 래퍼 | 동기 로직 |
> 
> ### 주의할 점
> 
> - Humble 쪽에 로직이 슬금슬금 다시 들어가기 쉬움 (if 문이 늘어나면 신호)
> - 클래스와 간접 계층이 늘어나서 단순한 코드까지 적용하면 과설계
> - Humble 부분은 단위 테스트에서 빠지므로, 통합·E2E 테스트로 최소한의 커버는 필요
</details>

## Seam — 고치지 않고 바꿀 수 있는 지점

Michael Feathers는 *Working Effectively with Legacy Code*(2004)에서 **seam** 을 "그 자리의 코드를 편집하지 않고도 프로그램의 동작을 바꿀 수 있는 지점"이라 정의했다. `is_hot_lot`의 `now` 인자, `Dispatcher` 생성자의 `mes` 인자가 전부 seam이다 — 함수 본문은 그대로 둔 채 테스트가 다른 시간, 다른 MES를 꽂아 넣을 수 있다. 이 글에서 다룬 기법들은 결국 **코드에 seam을 미리 심는 방법**이다. 이 개념이 진짜 위력을 발휘하는 곳은 테스트가 하나도 없는 레거시 코드에 최소한의 수정으로 테스트를 붙일 때인데, 그 역방향 적용은 12편에서 다룬다.

## "테스트를 위해 설계를 바꾸는 게 맞나?"

여기까지 읽으면 자연스러운 반문이 나온다. 테스트라는 부차적 목적 때문에 인자를 늘리고 함수를 쪼개는 것은 본말전도 아닌가? 두 가지로 답할 수 있다.

첫째, 위 기법들이 만든 성질을 보라 — 의존성이 시그니처에 드러나고(숨은 전역 상태·singleton 없음), 계산이 IO와 결합하지 않고, 모듈 교체 지점이 명확하다. 이는 테스트 책이 아니라 **어떤 설계 교과서를 펴도 나오는 좋은 설계의 정의** 그 자체다: 낮은 결합(loose coupling), 명시적 의존성, 관심사 분리. testability는 이 성질들의 **부산물**이고, 역으로 테스트가 어렵다는 것은 이 성질이 깨져 있다는 가장 값싸고 빠른 리트머스 시험지다. Freeman & Pryce(*GOOS*, 2009)가 "테스트에 귀를 기울여라(listen to the tests)"라고 한 것이 이 뜻이다 — double 세팅이 10줄이면 코드가 너무 많은 것을 알고 있다는 뜻이다.

둘째, 테스트는 그 코드의 **첫 번째 클라이언트(first client)** 다. 프로덕션에서 단 한 곳이 호출할 API라도, 테스트가 먼저 "두 번째 호출자" 역할을 하며 그 API를 다른 문맥에서 사용해 본다. 문맥이 둘이 되는 순간 숨은 가정 — 전역 상태, 특정 시각, 특정 DB — 이 드러난다. 재사용 가능한 코드란 결국 문맥을 덜 가정하는 코드이고, 테스트는 그것을 가장 먼저, 가장 싸게 요구하는 사용자다.

## 요약

- **의존성 주입**: 함수/생성자 안에서 시간·클라이언트를 만들지 말고 밖에서 받는다. 프레임워크 없이 **기본값 인자, 생성자 인자**면 충분하다.
- **Functional core, imperative shell**: 결정(순수 함수)과 실행(IO)을 가른다. core는 double 없이 데이터만으로 테스트하고, shell은 얇은 배관으로 남긴다.
- **Humble object**: 테스트 불가능한 경계(데몬, UI, 드라이버)에서 로직을 빼내 경계를 "테스트할 것이 없게" 만든다.
- **Seam**: 코드를 편집하지 않고 동작을 바꿀 수 있는 지점. 위 기법들은 seam을 심는 행위다 — 레거시에서 seam을 "찾는" 이야기는 12편에서.
- Testability는 목적이 아니라 좋은 설계(낮은 결합, 명시적 의존성)의 부산물이며, 테스트는 그 설계를 최초로 검증하는 첫 번째 클라이언트다.

## 참고문헌

- Michael Feathers, *Working Effectively with Legacy Code* (Prentice Hall, 2004) — seam 개념의 원전.
- Gary Bernhardt, [Boundaries](https://www.destroyallsoftware.com/talks/boundaries) (2012) — functional core, imperative shell.
- Gerard Meszaros, *xUnit Test Patterns: Refactoring Test Code* (Addison-Wesley, 2007) — Humble Object 패턴.
- Martin Fowler, [HumbleObject](https://martinfowler.com/bliki/HumbleObject.html) — 패턴 요약.
- Steve Freeman & Nat Pryce, *Growing Object-Oriented Software, Guided by Tests* (Addison-Wesley, 2009) — "listening to the tests".
- Vladimir Khorikov, *Unit Testing Principles, Practices, and Patterns* (Manning, 2020), Ch. 6–7 — 출력 기반 테스트와 functional architecture.
