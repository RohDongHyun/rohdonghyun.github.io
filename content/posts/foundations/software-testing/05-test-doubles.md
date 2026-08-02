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

**1. Dummy** — 자리만 채우고 실제로는 **쓰이지 않는** 값. 생성자나 함수의 시그니처를 만족시키는 용도다.

```python
def test_dispatch_with_no_idle_equipment_assigns_nothing():
    mes = StubMes(equipments=[Equipment("EQ1", "DOWN")])  # StubMes는 바로 아래에서 정의
    dummy_notifier = object()                  # dummy: 이 경로에선 send()가 불리지 않는다
    dispatcher = Dispatcher(mes, dummy_notifier)
    assert dispatcher.dispatch([Lot("L1", due_date=1)]) == {}
```

IDLE 설비가 하나도 없으므로 `assign`은 빈 dict가 되고, `notifier.send()`를 호출하는 for 루프는 0번 돈다. 즉 `notifier`는 이 테스트에서 **한 번도 만져지지 않는다.** 그런데 생성자가 인자를 요구하니 뭐라도 넣긴 해야 한다 — 그 "뭐라도"가 dummy다. `object()`든 `None`이든 `0`이든 상관없다. **정체가 중요하지 않다는 것이 곧 dummy의 정의**이기 때문이다.

여기서 `dispatcher`는 대역이 아니라 우리가 검증하려는 실제 프로덕션 객체, 즉 SUT(system under test) 임에 주의하자. Test double은 언제나 **SUT 자신이 아니라 SUT의 협력자(collaborator) 자리** 에만 들어간다.

Dummy가 stub과 헷갈린다면 두 질문으로 가른다.

| | 호출되는가 | 그 값이 결과를 좌우하는가 |
|---|---|---|
| **Dummy** | 아니오 | 아니오 — 아무 값이나 무방 |
| **Stub** | 예 | 예 — 준비한 답이 검증 결과를 결정 |

같은 `None`이라도 호출된 뒤 그 반환값이 로직을 좌우한다면 이미 dummy가 아니라 stub이다. 분류를 정하는 것은 객체의 생김새가 아니라 **테스트에서 맡은 역할** 이다.

Dummy는 객체가 아니어도 된다. `create_order(lot_id, operator, priority)`에서 priority 계산만 검증한다면 `operator=""` 같은 무의미한 값이 그대로 dummy다. 여기에 `operator="김철수"`처럼 그럴듯한 값을 넣으면 읽는 사람이 "operator가 결과에 영향을 주나?" 하고 헛고민을 하게 된다. Dummy의 진짜 값어치는 기능이 아니라 **"이건 이 테스트의 관심사가 아니다"라는 의도 표현** 에 있다.

무엇을 dummy로 쓸지도 공짜 선택은 아니다.

```python
Dispatcher(mes, notifier=object())   # 혹시 호출되면 AttributeError로 즉시 발각
Dispatcher(mes, notifier=Mock())     # 호출돼도 조용히 통과 — 버그를 놓친다
```

`object()`는 "안 쓰인다"는 내 가정이 틀렸을 때 테스트를 실패시켜 알려준다. 반면 `Mock()`은 IDLE 설비가 없는데도 통보가 나가는 버그가 생겨도 초록불이다. 이 관점에서 dummy는 소극적인 자리 채움이 아니라 **"이건 호출되면 안 된다"는 암묵적 assertion** 이기도 하다.

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

**4. Mock** — spy처럼 호출을 추적하되, **기대(expectation)를 스스로 검증**하는 객체다.

차이는 "누가 정답을 알고 있는가"다. Spy는 **아무 판단 없이 받아 적기만** 하고, 그게 맞는지는 테스트가 나중에 판정한다. Mock은 **정답을 미리 주입받아 자기 안에 품고** 있다가, 어긋나는 호출이 들어오는 순간 스스로 실패시킨다.

```python
class MockNotifier:
    def __init__(self, expected):
        self._expected = expected
        self._actual = []

    def send(self, message):
        if message not in self._expected:
            raise AssertionError(f"예상 밖의 통보: {message}")   # 그 자리에서 실패
        self._actual.append(message)

    def verify(self):
        assert self._actual == self._expected                    # 빠진 호출은 사후 확인

def test_dispatch_notifies_each_assignment_mock_style():
    mes = StubMes([Equipment("EQ1", "IDLE")])
    notifier = MockNotifier(expected=["L1 -> EQ1"])   # 기대를 먼저 심는다
    Dispatcher(mes, notifier).dispatch([Lot("L1", 1)])
    notifier.verify()                                 # 검증 주체는 double 자신
```

앞의 spy 예제와 나란히 놓고 보면 순서가 뒤집혀 있다.

| | 기대를 아는 주체 | 기대를 선언하는 시점 | 잘못된 호출이 발각되는 시점 |
|---|---|---|---|
| **Spy** | 테스트 | 실행 **후** (`assert spy.sent == ...`) | 테스트 마지막 assert |
| **Mock** | double 자신 | 실행 **전** (`MockNotifier(expected=...)`) | 어긋난 호출이 오는 즉시 |

Spy는 준비-실행-검증(arrange-act-assert)의 자연스러운 흐름을 유지하고 "실제로 무슨 일이 있었나"를 통째로 보여줘 읽기 쉽다. Mock은 실패 지점이 곧 문제의 발생 지점이라 stack trace가 범인을 바로 가리키고, 기대를 미리 적어야 하므로 "이 협력자와 어떤 대화를 나눌 것인가"를 설계 단계에서 강제로 생각하게 한다 — 뒤에 나올 London 학파가 이 성질을 노린다.

실무에서 이 경계는 흐릿하다. `unittest.mock.Mock`의 `assert_called_once_with`는 이름만 Mock일 뿐 실행 후에 테스트가 판정하는 **spy 방식**이다. 둘의 역할은 어차피 같다 — **나가는 호출을 검증**한다. 구분을 못 해서 손해 보는 일은 거의 없으니, 문헌을 읽을 때 헷갈리지 않을 정도만 알아두면 된다.

**5. Fake** — 실제로 **동작하는 경량 구현**. 프로덕션엔 부적합한 지름길(예: 디스크 대신 메모리)을 쓰지만, 안에 진짜 로직이 들어 있다.

Stub과의 차이는 한 문장으로 요약된다. **Stub은 답을 외우고, fake는 답을 계산한다.**

```python
class StubLotRepository:
    """무엇을 물어도 준비된 답 하나"""
    def save(self, lot):
        pass                                  # 아무 일도 하지 않는다

    def find(self, lot_id):
        return Lot("L1", due_date=1)          # 저장 여부와 무관하게 항상 이것

class FakeLotRepository:
    """진짜 DB repository 대신 쓰는 in-memory 구현"""
    def __init__(self):
        self._rows = {}

    def save(self, lot):
        self._rows[lot.id] = lot

    def find(self, lot_id):
        return self._rows.get(lot_id)         # 저장한 적 없으면 None
```

결정적 차이는 **내부 상태와 호출 간 일관성**이다. Fake는 "저장한 적 없는 lot을 찾으면 `None`", "덮어쓰면 나중 값" 같은 실물의 규칙을 지킨다. 그래서 저장 → 조회 → 삭제 → 조회처럼 **여러 단계로 이어지는 시나리오**를 테스트할 수 있다. Stub으로 같은 걸 하려면 호출 순서마다 다른 답을 심어야 하는데(`side_effect=[...]`), 그건 테스트가 구현의 호출 순서를 알고 있다는 뜻이라 곧장 brittle test가 된다.

| | Stub | Fake |
|---|---|---|
| 내부 상태 | 없음 | 있음 — 호출 사이에 유지 |
| 답을 만드는 방식 | 미리 외워둠 | 실제 로직으로 계산 |
| 적합한 상황 | 한 번의 질의 답만 통제 | 저장→조회처럼 이어지는 시나리오 |
| 비용 | 거의 없음 | 구현·유지보수 필요 |

대신 fake에는 값이 있다. **Fake도 코드이므로 자체 버그를 가질 수 있다.** In-memory fake는 통과하는데 실제 DB에서는 unique 제약에 걸리는 식이다. 그래서 실무에서는 실물과 fake에 **동일한 테스트 묶음을 돌려 두 구현이 같은 계약을 지키는지 확인**하며(contract test), 가능하면 직접 만들기보다 검증된 것을 쓴다 — in-memory SQLite, `fakeredis`, AWS의 `moto` 같은 것들이다.

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

## 격리 단위를 어디에 둘 것인가 — 오래된 논쟁과 그 결말

Double을 얼마나 적극적으로 쓸 것인가를 두고 한때 두 전통이 맞섰다. Martin Fowler의 ["Mocks Aren't Stubs"](https://martinfowler.com/articles/mocksArentStubs.html)(2004)가 그 대립을 정리한 고전이다.

- **London 학파 (mockist)** — Freeman & Pryce의 *Growing Object-Oriented Software, Guided by Tests*(2009)로 대표된다. **격리 단위 = 테스트 대상 클래스.** 협력 객체(collaborator)는 전부 double로 바꿔, 테스트 실패가 정확히 한 클래스를 지목하게 한다.
- **Detroit 학파 (classicist)** — Kent Beck의 원조 TDD 전통. **격리 단위 = 테스트 케이스.** 테스트끼리 상태만 공유하지 않으면 충분하고, 협력 객체는 가능한 한 **실물**을 쓴다. Double은 실물을 쓸 수 없을 때의 최후 수단이다.

트레이드오프는 분명하다. London은 실패 지점을 정밀하게 짚어주는 대신, 테스트가 "이 클래스는 저 클래스의 이 메서드를 이렇게 호출한다"는 내부 대화 — 구현 세부사항 — 에 서명하게 되어 리팩토링 내성이 약해진다. Classicist는 실패 시 원인 추적 범위가 넓어지는 대신, 여러 클래스가 함께 만드는 최종 행동을 검증하므로 리팩토링에 강하다.

다만 이 대립을 지금도 진행 중인 진영 싸움으로 읽으면 곤란하다. 애초에 이름조차 끝까지 표준화되지 않았다 — Detroit이라는 명칭은 TDD가 태어난 Chrysler C3 프로젝트의 소재지에서 왔고, 문헌에 따라 Chicago 학파나 classical school로도 불린다.

### 논쟁을 끝낸 것은 철학이 아니라 도구였다

2004년에 DB를 mock한 것은 신념이 아니라 제약이었다. 테스트 하나 돌리자고 DB를 띄울 방법이 없었으니까. 그 제약이 사라졌다.

- **Testcontainers** (2015~) — 진짜 PostgreSQL·Kafka를 컨테이너로 몇 초 만에 띄운다.
- 검증된 fake의 보급 — in-memory SQLite, `fakeredis`, `moto`. 직접 만들지 않아도 된다.
- CI 병렬화·캐싱 — 통합 테스트의 시간 페널티가 예전만큼 치명적이지 않다.

"실물을 못 쓰니 mock한다"는 논거의 큰 축이 이렇게 무너졌다. 그래서 오늘날 mock이 남는 자리는 **정말로 내 통제 밖에 있는 것**뿐이며, 이는 다음 절에서 볼 unmanaged dependency와 정확히 같은 답이다. Khorikov(2020)가 "어느 학파를 택할 것인가"라는 질문 자체를 **의존성의 종류로 판단하라**로 갈아치운 것이 현재의 결론이다.

### 논쟁은 사라진 게 아니라 한 층 위로 올라갔다

클래스 사이에서 벌이던 싸움은 **서비스 경계**로 옮겨갔다. 마이크로서비스에서 "협력자를 대역으로 바꾸고 주고받는 메시지를 검증한다"는 London의 발상은 **consumer-driven contract testing** (Pact 등)으로 되살아났다. 거기서는 협력자가 진짜로 남의 소유이고 실물을 띄울 수도 없으니, 그 논리가 정당한 자리다.

프론트엔드에서도 같은 일이 있었다. Testing Library의 "사용자가 쓰는 방식에 가깝게 테스트하라"는 원칙, shallow rendering과 자식 컴포넌트 mocking에 대한 거부감은 classicist 논리의 재발명이다. 용어만 갈아입었을 뿐 결론은 같다.

정리하면 두 진영이 남긴 것은 서로 성격이 다르다.

**London에서 살아남은 것은 mock이라는 도구가 아니라, 그 도구가 강요하던 설계 습관이다.** London 방식에서 mock은 검증 수단이기 이전에 **설계 수단**이었다. 아직 존재하지도 않는 협력자를 mock으로 먼저 세워두고 "나는 이 녀석에게 무엇을 물어볼 것인가"를 적어 내려가면, 인터페이스가 구현하는 쪽의 사정이 아니라 **호출하는 쪽의 필요**에 맞춰 만들어진다. 바깥의 사용자 시나리오에서 출발해 안쪽 구현을 채워 들어가는 outside-in TDD가 여기서 나왔고, 이 방식은 지금도 유효하다. 반면 이미 완성된 코드의 내부 협력자까지 전부 double로 바꿔 호출을 일일이 검증하는 **습관**은 brittle test를 낳아 도태됐다. mock을 설계용으로 쓰는 쪽은 남고, 검증용으로 남발하는 쪽은 사라진 것이다.

**Detroit은 논쟁에서 이겼다기보다, 아무도 이유를 대지 않는 기본값이 됐다.** 오늘날 협력 객체에 실물을 쓰는 데에는 아무 설명이 필요 없지만, double로 바꾸겠다면 "왜 실물을 쓸 수 없는가"를 대야 한다. 정당화의 책임이 어느 쪽에 있는가 — 그것이 뒤집힌 것이 이 논쟁의 결말이다. 이 시리즈도 4편에서 리팩토링 내성을 타협 불가 기둥으로 세웠으므로, 기본 입장은 classicist다.

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

`create_autospec`(또는 `patch(..., autospec=True)`)은 실제 클래스의 속성과 메서드 시그니처를 본떠 double을 만든다. 실물의 인터페이스가 바뀌면 double 위의 테스트도 깨지므로, "mock은 초록불인데 프로덕션은 고장"인 사고를 크게 줄인다. 다만 autospec도 만능은 아니다 — 클래스 정의를 본뜨는 것이라서 `__init__` 안에서 동적으로 생성되는 instance attribute는 알 수 없고(존재하지 않는 속성으로 잡아버린다), 시그니처가 맞는 호출의 **반환값이나 실제 동작**까지 실물과 같게 해 주지는 않는다. 즉 autospec이 묶어 주는 것은 **이름과 시그니처라는 구조적 계약까지이고, 무엇을 돌려주고 어떤 예외를 던지는가라는 행동적 계약은 여전히 내 책임**이다. 그럼에도 double이 실물에서 소리 없이 멀어지는 가장 흔한 경로를 거의 공짜로 막아 준다 — mock 사용의 최소한의 안전벨트다.

## 요약

- **Test double** = 테스트용 대역의 총칭(Meszaros). dummy(자리 채움) / stub(질의에 준비된 답) / spy(호출 기록) / mock(기대 검증) / fake(경량 실동작 구현). 대역은 언제나 SUT가 아니라 **SUT의 협력자 자리** 에 들어간다.
- 헷갈리는 세 쌍: **dummy는 아예 호출되지 않고 stub은 호출되어 답을 준다. Spy는 기록만 하고 판정은 테스트가, mock은 기대를 품고 자기가 판정한다. Stub은 답을 외우고 fake는 답을 계산한다** (그래서 fake만 여러 단계 시나리오를 견딘다).
- 실전 이분법(Khorikov): **stub 계열은 들어오는 데이터(query) 대체, mock 계열은 나가는 상호작용(command) 검증.** stub과의 상호작용을 검증하는 순간 brittle test가 된다.
- `unittest.mock.Mock`은 다섯 분류 어디로든 쓸 수 있는 **도구**다. 문제는 라이브러리가 아니라 용법이다.
- London(격리 단위 = 클래스) vs classicist(격리 단위 = 테스트)의 대립은 Testcontainers 같은 도구가 "실물을 못 쓴다"는 전제를 무너뜨리며 사실상 정리됐다. 오늘의 질문은 학파 선택이 아니라 **의존성이 managed인가 unmanaged인가** 다. London의 발상은 서비스 경계의 contract testing으로 옮겨가 살아 있다.
- **Unmanaged dependency(외부가 관찰하는 계약)만 mock하고, managed dependency(내 DB)는 실물·fake로.** autospec으로 double을 실물 인터페이스에 묶어 거짓 안심을 줄인다.
- Double을 갈아 끼우려면 애초에 의존성이 주입 가능해야 한다 — 테스트 가능한 설계 이야기는 6편에서 다룬다.

## 참고문헌

- Gerard Meszaros, *xUnit Test Patterns: Refactoring Test Code* (Addison-Wesley, 2007) — test double 명명과 5분류의 원전.
- Martin Fowler, [Mocks Aren't Stubs](https://martinfowler.com/articles/mocksArentStubs.html) (2004, 2007 개정) — mockist vs classicist 대립 정리.
- Vladimir Khorikov, *Unit Testing Principles, Practices, and Patterns* (Manning, 2020), Ch. 5, 8 — stub/mock 이분법, managed vs unmanaged dependency.
- Steve Freeman & Nat Pryce, *Growing Object-Oriented Software, Guided by Tests* (Addison-Wesley, 2009) — London 학파의 대표 저작.
- Ian Robinson, [Consumer-Driven Contracts: A Service Evolution Pattern](https://martinfowler.com/articles/consumerDrivenContracts.html) (2006) — 서비스 경계에서의 계약 검증.
- [Testcontainers](https://testcontainers.com/) — 테스트에서 실물 의존성을 컨테이너로 띄우는 도구.
- Testing Library, [Guiding Principles](https://testing-library.com/docs/guiding-principles) — "사용자가 쓰는 방식에 가깝게" 원칙.
- Python 공식 문서, [unittest.mock](https://docs.python.org/3/library/unittest.mock.html) — `Mock`, `patch`, `create_autospec`.
- pytest 공식 문서, [How to monkeypatch/mock modules and environments](https://docs.pytest.org/en/stable/how-to/monkeypatch.html).
