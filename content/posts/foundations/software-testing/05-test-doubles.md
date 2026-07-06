---
title: 05. Test Double — mock, stub, fake를 구분하기
date: 2026-07-06
tags:
  - Software Engineering
  - Testing
---

[[posts/foundations/software-testing/04-behavior-vs-implementation|4편]]에서 brittle test의 근본 원인이 구현 세부사항과의 결합이라고 했고, 그 주범 중 하나로 mock을 예고했다. 그런데 mock을 논하려면 먼저 용어부터 정리해야 한다. 현장에서는 테스트용 가짜 객체를 전부 "mock"이라 부르지만, 원래 mock은 다섯 종류의 가짜 중 **하나**의 이름이다. 이 구분이 현학적 취미가 아닌 이유는, **어떤 가짜를 쓰느냐가 곧 테스트가 무엇을 검증하는가를 결정**하기 때문이다 — 잘못 고르면 4편의 false positive(행동이 멀쩡한데 울리는 거짓 경보)를 스스로 심는 셈이 된다.

## Test double: 스턴트 더블이라는 비유

Gerard Meszaros는 *xUnit Test Patterns*(2007)에서 테스트를 위해 실제 의존성 대신 투입하는 모든 대역을 **test double** 이라 이름 붙였다. 영화의 스턴트 더블(stunt double)에서 온 비유다 — 위험하거나 비싼 장면에서 배우 대신 연기하지만, 관객(테스트 대상 코드)은 차이를 눈치채지 못해야 한다. 실제 DB, 외부 API, 느린 계산처럼 테스트에서 "위험하거나 비싼" 의존성을 대역으로 바꾸는 것이다.

Meszaros는 대역을 다섯 가지로 분류했다. 아래 예제의 공통 도메인을 먼저 정의한다.

```python
from dataclasses import dataclass

@dataclass
class Lot:
    id: str
    due_date: int

@dataclass
class Equipment:
    id: str
    status: str          # "IDLE" | "RUN" | "DOWN"

class Dispatcher:
    """MES에서 설비 상태를 조회(query)해 lot을 배정하고,
    배정 결과를 notifier로 통보(command)한다."""

    def __init__(self, mes, notifier):
        self._mes = mes
        self._notifier = notifier

    def dispatch(self, lots: list[Lot]) -> dict[str, str]:
        idle = [e for e in self._mes.get_equipments() if e.status == "IDLE"]
        ordered = sorted(lots, key=lambda l: l.due_date)   # EDD
        assign = {e.id: l.id for e, l in zip(idle, ordered)}
        for eq_id, lot_id in assign.items():
            self._notifier.send(f"{lot_id} -> {eq_id}")
        return assign
```

### 다섯 분류

**1. Dummy** — 자리만 채우고 실제로는 쓰이지 않는 값. 생성자 시그니처를 만족시키는 용도다.

```python
def test_dispatch_with_no_idle_equipment_assigns_nothing():
    mes = StubMes(equipments=[Equipment("EQ1", "DOWN")])  # StubMes는 바로 아래에서 정의
    d = Dispatcher(mes, notifier=object())     # dummy: 이 경로에선 호출 안 됨
    assert d.dispatch([Lot("L1", due_date=1)]) == {}
```

**2. Stub** — 질의(query)에 **미리 준비한 답**을 돌려준다. 테스트 대상에게 들어오는 입력 데이터를 통제하는 용도다.

```python
class StubMes:
    def __init__(self, equipments):
        self._equipments = equipments

    def get_equipments(self):
        return self._equipments                # 항상 준비된 답
```

**3. Spy** — 자신에게 온 호출을 **기록**해 두고, 테스트가 나중에 들여다보게 한다.

```python
class SpyNotifier:
    def __init__(self):
        self.sent = []

    def send(self, message):
        self.sent.append(message)

def test_dispatch_notifies_each_assignment():
    mes = StubMes([Equipment("EQ1", "IDLE")])
    spy = SpyNotifier()
    Dispatcher(mes, spy).dispatch([Lot("L1", 1)])
    assert spy.sent == ["L1 -> EQ1"]           # 기록을 사후 검사
```

**4. Mock** — spy처럼 호출을 추적하되, **기대(expectation)를 스스로 검증**하는 객체다. Meszaros의 원래 정의로는 "어떤 호출이 와야 하는지"를 미리 프로그래밍해 두고 어긋나면 실패시키는 쪽이 mock, 기록만 하고 검증은 테스트에 맡기는 쪽이 spy다. 실무에서 이 둘의 경계는 흐릿하고, 역할은 같다 — **나가는 호출을 검증**한다.

**5. Fake** — 실제로 **동작하는 경량 구현**. 답을 외워둔 stub과 달리 진짜 로직이 있지만, 프로덕션엔 부적합한 지름길(예: 디스크 대신 메모리)을 쓴다.

```python
class FakeLotRepository:
    """진짜 DB repository 대신 쓰는 in-memory 구현"""
    def __init__(self):
        self._rows = {}

    def save(self, lot):
        self._rows[lot.id] = lot

    def find(self, lot_id):
        return self._rows.get(lot_id)
```

## 핵심 이분법: 들어오는 데이터 vs 나가는 상호작용

다섯 분류를 다 외울 필요는 없다. Khorikov(*Unit Testing Principles*, 2020)는 이를 두 계열로 단순화한다.

- **Stub 계열** (dummy, stub, fake): 테스트 대상으로 **들어오는** 데이터를 대체한다. 질의(query)의 대역.
- **Mock 계열** (mock, spy): 테스트 대상에서 **나가는** 상호작용을 검증한다. 명령(command)의 대역.

이 구분은 CQS(command-query separation) 원칙과 정확히 포개진다. CQS는 Bertrand Meyer가 제안한 설계 원칙으로, 모든 메서드를 **query(값을 반환하고 부수효과 없음)** 아니면 **command(외부 상태를 바꾸고 값을 반환하지 않음)** 둘 중 하나로만 만들라는 것이다. 위 예제에서 `mes.get_equipments()`는 query이므로 stub으로 답을 준비했고, `notifier.send()`는 command이므로 spy로 호출을 검증했다.

여기서 Khorikov의 결정적 규칙이 나온다. **stub과의 상호작용은 절대 검증하지 말 것.** "`get_equipments()`가 정확히 한 번 호출됐는가"는 결과에 도달하는 경로, 즉 구현 세부사항이다 — 캐싱을 추가해 호출이 0번이 되어도 행동은 그대로다. 이를 검증하는 순간 4편의 brittle test가 된다. 반면 command는 그 호출 자체가 외부 세계에서 관찰 가능한 결과(작업자에게 통보가 감)이므로, 검증하는 것이 곧 행동 검증이다.

## "다 mock"인 현실 — 도구와 분류는 다른 층위다

혼란의 큰 원인은 Python 표준 라이브러리의 `unittest.mock.Mock`이라는 **이름**이다. `Mock` 객체는 어떤 속성 접근·호출도 받아주고, 반환값을 심을 수도(`return_value`) 호출을 사후 검증할 수도(`assert_called_with`) 있다. 즉 이 한 클래스로 dummy, stub, spy, mock 역할을 전부 수행할 수 있다 — **도구의 이름이 Mock일 뿐, 그 instance가 어느 분류인가는 테스트에서 어떻게 쓰느냐가 결정한다.**

```python
from unittest.mock import Mock

mes = Mock()
mes.get_equipments.return_value = [Equipment("EQ1", "IDLE")]   # → stub으로 사용

notifier = Mock()
Dispatcher(mes, notifier).dispatch([Lot("L1", 1)])
notifier.send.assert_called_once_with("L1 -> EQ1")             # → mock으로 사용
```

"mock을 쓰지 말라"는 조언과 "mock 라이브러리를 쓰지 말라"는 말이 다른 이유가 여기 있다. 문제는 도구가 아니라, stub이어야 할 자리(query)에 상호작용 검증을 걸어버리는 **용법**이다.

## London 학파 vs Detroit 학파

test double을 얼마나 적극적으로 쓸 것인가에 대해 두 전통이 있다. Martin Fowler의 ["Mocks Aren't Stubs"](https://martinfowler.com/articles/mocksArentStubs.html)(2004)가 이 대립을 정리한 고전이다.

- **London 학파 (mockist)** — Freeman & Pryce의 *Growing Object-Oriented Software, Guided by Tests*(2009)로 대표된다. **격리 단위 = 테스트 대상 클래스.** 협력 객체(collaborator)는 전부 double로 바꿔, 테스트 실패가 정확히 한 클래스를 지목하게 한다. 객체 간 **협력 관계(어떤 메시지를 주고받는가)** 자체를 설계 대상으로 보고, mock으로 그 대화를 먼저 그려나간다.
- **Detroit/Chicago 학파 (classicist)** — Kent Beck의 원조 TDD 전통. **격리 단위 = 테스트 케이스.** 테스트끼리 상태를 공유하지 않으면 충분하고, 협력 객체는 가능한 한 **실물**을 쓴다. Double은 실물을 쓸 수 없는 경우(외부 시스템, 공유 자원)의 최후 수단이다.

London 방식은 실패 지점을 정밀하게 짚어주지만, 테스트가 "이 클래스는 저 클래스의 이 메서드를 이렇게 호출한다"는 내부 대화 — 구현 세부사항 — 에 서명하게 되어 리팩토링 내성이 약해지기 쉽다. classicist 방식은 실패 시 원인 추적 범위가 넓어지는 대신, 여러 클래스가 함께 만드는 최종 행동을 검증하므로 리팩토링에 강하다. 이 시리즈는 4편에서 리팩토링 내성을 타협 불가 기둥으로 세웠으므로, 기본 입장은 classicist에 가깝다.

## Mock 남용의 폐해와 사용 기준

Mock을 남용하면 두 가지 병이 생긴다.

**첫째, 구현 결합.** 내부 협력자까지 mock으로 바꾸고 호출 순서·횟수를 검증하면, 클래스 구조를 재배치할 때마다 테스트가 깨진다 — 4편의 brittle test가 mock의 옷을 입고 돌아온 것이다.

**둘째, 거짓 안심(false confidence).** Mock은 내가 시킨 대로만 답한다. 실제 MES API가 timeout을 던지든, 필드 이름을 바꿨든, mock 위의 테스트는 계속 초록불이다 — false positive의 반대 방향, 즉 **버그가 있는데 통과하는** false negative(거짓 음성)다.

그렇다면 무엇을 mock으로 바꿔야 하나. Khorikov의 기준은 의존성의 두 종류를 가른다.

- **Unmanaged dependency** — 우리 애플리케이션이 소유하지 않아 **다른 시스템도 관찰하는** 의존성. 타 팀의 MES API, 메시지 버스, 메일 서버. 이들과의 통신은 외부에서 관찰 가능한 계약(contract)이므로 그 자체가 행동이다. → **mock으로 검증할 정당한 대상.** (실물을 테스트에 못 띄우기도 한다.)
- **Managed dependency** — 우리 애플리케이션만 접근하는 의존성. 대표적으로 자기 서비스 전용 DB. 외부는 그 안의 SQL이나 스키마를 모르므로 통신 방식은 구현 세부사항이다. → mock으로 바꾸지 말고 **실물(또는 fake)로** 테스트한다. DB에 무엇이 저장됐는가라는 최종 상태만 검증한다.

한 줄 요약: **시스템 경계를 넘어 나가는 통신만 mock하고, 내 소유물은 실제로 돌려라.**

## 도구: monkeypatch, patch, 그리고 autospec

의존성이 인자로 주입되지 않고 모듈 안에 박혀 있을 때는 런타임에 바꿔치기해야 한다. pytest의 `monkeypatch` fixture는 테스트가 끝나면 원상복구를 보장하는 안전한 바꿔치기 도구다.

```python
import time

def make_dispatch_log(lot_id: str) -> str:
    return f"{lot_id} dispatched at {time.time()}"

def test_dispatch_log_contains_timestamp(monkeypatch):
    monkeypatch.setattr(time, "time", lambda: 1_720_000_000.0)  # 시간을 stub
    assert make_dispatch_log("L1") == "L1 dispatched at 1720000000.0"
```

`unittest.mock.patch`는 같은 일을 하되 대체물로 `MagicMock`(대부분의 magic method까지 기본 지원하는 `Mock`의 확장)을 자동 생성해 준다. 그런데 기본 `Mock`은 **존재하지 않는 메서드 호출도 받아준다**는 함정이 있다 — 거짓 안심의 온상이다.

```python
from unittest.mock import Mock, create_autospec

class Notifier:
    def send(self, message: str) -> None: ...

loose = Mock()
loose.sned("L1 -> EQ1")                      # 오타인데 조용히 통과!

strict = create_autospec(Notifier)
strict.send("L1 -> EQ1")                     # OK
# strict.sned("...")                         # AttributeError — 즉시 발각
# strict.send("a", "b")                      # TypeError — 시그니처도 검사
```

`create_autospec`(또는 `patch(..., autospec=True)`)은 실제 클래스의 속성과 메서드 시그니처를 본떠 double을 만든다. 실물의 인터페이스가 바뀌면 double 위의 테스트도 깨지므로, "mock은 초록불인데 프로덕션은 고장"인 사고를 크게 줄인다. 다만 autospec도 만능은 아니다 — 클래스 정의를 본뜨는 것이라서 `__init__` 안에서 동적으로 생성되는 instance attribute는 알 수 없고(존재하지 않는 속성으로 잡아버린다), 시그니처가 맞는 호출의 **반환값이나 실제 동작**까지 실물과 같게 해 주는 것도 아니다. **double을 쓰되 실물과의 계약에서 벗어나지 못하게 묶는 것** — mock 사용의 최소한의 안전벨트다.

## 요약

- **Test double** = 테스트용 대역의 총칭(Meszaros). dummy(자리 채움) / stub(질의에 준비된 답) / spy(호출 기록) / mock(기대 검증) / fake(경량 실동작 구현).
- 실전 이분법(Khorikov): **stub 계열은 들어오는 데이터(query) 대체, mock 계열은 나가는 상호작용(command) 검증.** stub과의 상호작용을 검증하는 순간 brittle test가 된다.
- `unittest.mock.Mock`은 다섯 분류 어디로든 쓸 수 있는 **도구**다. 문제는 라이브러리가 아니라 용법이다.
- London(격리 단위 = 클래스, double 적극 사용) vs classicist(격리 단위 = 테스트, 실물 우선). 리팩토링 내성을 우선하면 classicist가 기본값이다.
- **Unmanaged dependency(외부가 관찰하는 계약)만 mock하고, managed dependency(내 DB)는 실물·fake로.** autospec으로 double을 실물 인터페이스에 묶어 거짓 안심을 줄인다.
- Double을 갈아 끼우려면 애초에 의존성이 주입 가능해야 한다 — 테스트 가능한 설계 이야기는 6편에서 다룬다.

## 참고문헌

- Gerard Meszaros, *xUnit Test Patterns: Refactoring Test Code* (Addison-Wesley, 2007) — test double 명명과 5분류의 원전.
- Martin Fowler, [Mocks Aren't Stubs](https://martinfowler.com/articles/mocksArentStubs.html) (2004, 2007 개정) — mockist vs classicist 대립 정리.
- Vladimir Khorikov, *Unit Testing Principles, Practices, and Patterns* (Manning, 2020), Ch. 5, 8 — stub/mock 이분법, managed vs unmanaged dependency.
- Steve Freeman & Nat Pryce, *Growing Object-Oriented Software, Guided by Tests* (Addison-Wesley, 2009) — London 학파의 대표 저작.
- Python 공식 문서, [unittest.mock](https://docs.python.org/3/library/unittest.mock.html) — `Mock`, `patch`, `create_autospec`.
- pytest 공식 문서, [How to monkeypatch/mock modules and environments](https://docs.pytest.org/en/stable/how-to/monkeypatch.html).
