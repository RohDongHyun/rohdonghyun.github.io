---
title: 09. Coverage와 Mutation Testing — 테스트를 테스트하기
date: 2026-07-06
tags:
  - Software Engineering
  - Testing
---

[[posts/foundations/software-testing/01-why-we-test|1편]]부터 지금까지 좋은 테스트를 **쓰는** 법을 다뤘다 — 구조([[posts/foundations/software-testing/03-anatomy-of-a-unit-test|3편]]), 대상([[posts/foundations/software-testing/04-behavior-vs-implementation|4편]]), 격리([[posts/foundations/software-testing/05-test-doubles|5편]]), 방법론([[posts/foundations/software-testing/07-test-driven-development|7편]], [[posts/foundations/software-testing/08-property-based-testing|8편]]). 그런데 아직 답하지 않은 질문이 있다. **지금 있는 테스트 스위트가 충분한가?** 테스트가 코드를 지킨다면, 테스트는 누가 지키나. 이번 편은 이 질문에 대한 두 가지 접근 — coverage와 mutation testing — 을 다룬다. 결론을 미리 말하면: coverage는 "무엇이 실행됐나"를 재고, mutation testing은 "무엇이 검증됐나"를 잰다. 둘은 전혀 다른 질문이다.

## Coverage: 테스트가 코드의 어디를 실행했나

**Coverage**는 테스트 스위트를 실행하는 동안 프로덕션 코드의 어느 부분이 실행됐는지의 비율이다. "어느 부분"을 무엇으로 세느냐에 따라 여러 기준이 있는데, 실무에서 만나는 것은 주로 둘이다.

- **Line(statement) coverage** — 실행된 코드 줄의 비율.
- **Branch coverage** — 모든 분기(`if`, `while` 등)에서 참/거짓 **양쪽 방향**이 실행된 비율.

둘의 차이가 드러나는 예를 보자. 설비의 레시피 교체 setup 시간을 계산하는 함수다.

```python
BASE_SETUP = 30.0   # 레시피 교체 시 기본 setup 시간(분)

def setup_time(from_recipe: str, to_recipe: str) -> float:
    time = BASE_SETUP
    if from_recipe == to_recipe:
        time = 0.0
    return time
```

```python
def test_same_recipe_needs_no_setup():
    assert setup_time("A", "A") == 0.0
```

이 테스트 하나로 **line coverage는 100%다**. 네 줄 모두 실행되기 때문이다(`time = BASE_SETUP`도 `if` 앞에서 실행된다). 그러나 `if`가 **거짓**인 경로 — 레시피가 다른 경우 — 는 한 번도 지나가지 않았다. branch coverage로 재면 50%다. 이 사각지대는 실제 위험이다: 누군가 `BASE_SETUP`을 실수로 `0.0`으로 바꾸거나 첫 줄을 `time = 0.0`으로 고쳐도 이 테스트는 통과한다. `else`가 명시적으로 없는 **암묵적 else 경로**를 line coverage는 보지 못하고 branch coverage는 본다. 그래서 coverage를 잰다면 최소한 branch 기준으로 재는 것이 맞다 — Python이라면 [coverage.py](https://coverage.readthedocs.io/)의 `--branch` 옵션(pytest에서는 pytest-cov의 `--cov-branch`)이다.

## Coverage 100%가 보장하지 않는 것

branch까지 100%를 채우면 안심해도 될까. 다음 테스트를 보자.

```python
def test_setup_time_smoke():
    setup_time("A", "A")   # 레시피 같은 경로
    setup_time("A", "B")   # 레시피 다른 경로
```

branch coverage **100%다. 그리고 assert가 하나도 없다.** 이 테스트가 잡을 수 있는 버그는 예외가 던져지는 것뿐이고, `setup_time`이 무슨 값을 반환하든 — `-42.0`을 반환해도 — 통과한다. 극단적 예시 같지만, "coverage를 올리라"는 지시 아래서 실제로 양산되는 테스트가 정확히 이런 모양이다. 여기서 coverage의 본질적 한계가 드러난다:

> Coverage는 코드가 **실행되었는지**를 셀 뿐, 그 실행 결과가 **검증되었는지**는 세지 않는다. 실행 ≠ 검증.

즉 높은 coverage는 좋은 테스트의 **충분조건이 아니라, 좋은 테스트를 쓰면 따라오는 부산물**이다. 실행되지 않은 코드는 확실히 검증되지 않았지만(이 방향은 참이다), 실행된 코드가 검증됐다는 보장은 없다(이 방향은 거짓이다). Brian Marick이 1999년에 이미 [How to Misuse Code Coverage](https://www.exampler.com/testing-com/writings/coverage.pdf)에서 정리한 오래된 교훈이다.

### Goodhart의 함정과 올바른 사용 방향

이 비대칭을 무시하고 coverage를 **목표(target)** 로 삼으면 — "이번 분기까지 80% 달성" — 예측 가능한 부작용이 따라온다. 경제학자 Goodhart의 이름이 붙은 법칙, Marilyn Strathern의 표현으로 "측정이 목표가 되는 순간, 좋은 측정이기를 멈춘다"(*European Review*, 1997)가 그대로 작동한다. 숫자를 올리는 가장 싼 방법은 좋은 테스트를 쓰는 것이 아니라 위의 smoke 테스트처럼 assert 없이 코드를 훑기만 하는 테스트를 쓰는 것이기 때문이다. 결과는 숫자는 높은데 안전망은 없는, 최악의 조합이다 — coverage가 주는 **거짓 안심**은 coverage가 없는 것보다 나쁠 수 있다.

그래서 coverage의 올바른 사용법은 방향을 뒤집는 것이다. "높으면 좋다"가 아니라 **"낮은 곳을 찾는 지도"** 로 쓴다. coverage 리포트에서 실행되지 않은 줄·분기는 확실하게 테스트가 없는 곳이므로, "여기는 검증 안 됐는데 괜찮은가?"라는 질문을 던지는 출발점으로는 대단히 유용하다. 요컨대 coverage가 낮다는 신호는 믿되, 높다는 신호는 믿지 않는 것이다.

## Mutation Testing: 테스트가 버그를 잡는지 직접 실험하기

그러면 "실행됐는가"가 아니라 "검증됐는가"를 재려면 어떻게 해야 하나. **Mutation testing**의 답은 놀랄 만큼 직접적이다: **코드에 일부러 작은 결함을 심고, 테스트 스위트가 그것을 잡아내는지 실험한다.** 테스트의 존재 이유가 버그 검출이라면, 인공 버그를 검출하는 능력으로 테스트를 평가하자는 것이다. 아이디어 자체는 오래됐다 — DeMillo, Lipton, Sayward가 1978년에 제안했고([DOI](https://doi.org/10.1109/C-M.1978.218136)), 도구가 실용화된 것은 비교적 최근이다.

용어와 절차는 이렇다.

1. 프로덕션 코드에 **mutation operator**(정해진 규칙의 작은 문법 변형)를 적용해 변형본 **mutant**를 만든다. 대표적인 operator: 관계 연산자 교체(`<=` → `<`, `==` → `!=`), 산술 연산자 교체(`+` → `-`), 상수 변경(`0` → `1`, `30.0` → `31.0`), 조건 반전(`if cond:` → `if not cond:`), 문장 삭제.
2. mutant마다 테스트 스위트를 돌린다. 테스트가 하나라도 실패하면 그 mutant는 **killed**(죽었다), 전부 통과하면 **survived**(살아남았다).
3. 결과를 **mutation score** $= \frac{\text{killed mutants}}{\text{total mutants}}$ 로 집계한다. 살아남은 mutant 하나하나가 "이런 버그가 나도 테스트가 못 잡는다"는 구체적 증거다.

assert 없는 smoke 테스트가 여기서 어떻게 심판받는지 보라. `setup_time`의 `BASE_SETUP`을 `0.0`으로 바꾼 mutant, `==`를 `!=`로 뒤집은 mutant — smoke 테스트는 어느 것도 죽이지 못한다. branch coverage 100%짜리 스위트의 mutation score가 0%에 가깝게 나오는 것이다(assert가 없으니 예외를 일으키는 mutant만 잡힌다). coverage가 세지 못한 "검증의 부재"를 mutation testing은 정확히 센다.

### 워크스루: 경계 연산자 mutant를 손으로 심어보기

디스패칭에서 흔한 긴급 판정 함수로 사고 실험을 해보자.

```python
URGENT_THRESHOLD = 60.0   # 납기까지 남은 시간(분)이 이 값 이하면 긴급

def is_urgent(lot, now) -> bool:
    return lot.due - now <= URGENT_THRESHOLD
```

```python
def test_urgent_lot():
    assert is_urgent(Lot(due=100.0), now=70.0)        # 30분 남음 → 긴급

def test_non_urgent_lot():
    assert not is_urgent(Lot(due=100.0), now=10.0)    # 90분 남음 → 여유
```

두 테스트로 line·branch coverage 모두 100%다. 이제 mutant를 심자: `<=`를 `>`가 아니라 살짝만 비틀어 `<`로 바꾼다.

```python
    return lot.due - now < URGENT_THRESHOLD    # mutant: <= → <
```

테스트를 돌리면 — **둘 다 통과한다.** $30 < 60$은 여전히 참이고 $90 < 60$은 여전히 거짓이라, 원본과 mutant의 동작이 갈리는 입력은 **정확히 경계값, 남은 시간이 60.0분인 lot**뿐인데 그 입력이 스위트에 없기 때문이다. 살아남은 이 mutant는 곧바로 부족한 테스트를 알려준다:

```python
def test_exactly_at_threshold_is_urgent():
    assert is_urgent(Lot(due=100.0), now=40.0)        # 딱 60분 남음 → 긴급 (경계 포함)
```

이 테스트를 추가하면 mutant는 죽는다($60 < 60$은 거짓이므로 mutant에서 실패). 흥미롭게도 상수를 바꾼 mutant(`60.0` → `61.0`)는 이 경계 테스트조차 뚫는다 — 죽이려면 경계 **바로 바깥**(남은 시간 61분은 긴급이 아니다)의 테스트까지 필요하다. mutation testing이 경계값 분석을 하도록 등을 떠미는 셈이고, off-by-one 계열 버그가 실무에서 가장 흔한 부류임을 생각하면 정확히 맞는 방향의 압력이다.

이 과정을 사람이 손으로 할 필요는 없다. Python에서는 [mutmut](https://mutmut.readthedocs.io/)이 표준적인 도구다 — `mutmut run` 한 번으로 소스 전체에 mutant를 생성·실행하고, 살아남은 mutant 목록과 해당 코드 위치를 보여준다(cosmic-ray라는 대안도 있다). 사용법 상세는 공식 문서로 미룬다.

## Mutation Testing이 만능이 아닌 이유

**Equivalent mutant 문제.** 문법적으로는 다르지만 **동작이 원본과 완전히 같은** mutant가 있다. 교과서적 예:

```python
i = 0
while i < n:      # mutant: i < n → i != n
    process(queue[i])
    i += 1
```

`i`가 0에서 1씩만 증가해 `n`(queue 길이이므로 0 이상)을 건너뛸 수 없으므로, `i < n`과 `i != n`은 이 코드에서 동작이 같다. 이런 mutant는 **어떤 테스트로도 죽일 수 없는데**, 도구는 이를 "살아남은 mutant"로 보고하므로 사람이 일일이 판별해서 제외해야 한다. 문제는 이 판별이 일반적으로 자동화 불가능하다는 것이다 — 두 프로그램의 동치성 판정으로 환원되는, 결정 불가능(undecidable)한 문제다. 그래서 엄밀한 score는 분모에서 equivalent mutant를 빼야 하지만($\frac{\text{killed}}{\text{total} - \text{equivalent}}$), 실무에서는 근사치로 만족하고 살아남은 mutant를 "검토할 목록"으로 쓴다.

**실행 비용.** mutant 하나마다 테스트 스위트를 (일부라도) 다시 돌려야 한다. 중간 규모 코드베이스에서 mutant는 수천 개 단위로 생성되므로, 전체 실행은 시간 단위가 될 수 있다. 도구들은 coverage 정보로 그 mutant를 실행하는 테스트만 골라 돌리고, 변경된 파일에만 증분 적용하는 식으로 완화하지만, 매 커밋마다 돌리는 것은 비현실적이다 — 야간 CI나 핵심 모듈 한정 적용이 일반적인 절충이다. mutation testing의 이론·역사·비용 완화 기법의 전모는 Jia & Harman의 survey([DOI](https://doi.org/10.1109/TSE.2010.62))가 표준 참고문헌이다.

## PBT의 tautology 함정, 그리고 다음 이야기

[[posts/foundations/software-testing/08-property-based-testing|8편]] 말미에서 "잘못 쓴 property는 항상 통과하는 동어반복(tautology)이 된다"고 경고하며, 그것을 체계적으로 확인하는 방법을 이번 편으로 미뤄뒀다. 이제 답할 수 있다: **property에 mutation testing을 돌려보면 된다.** 8편 `pick_next`의 key를 `(not lot.hot, lot.slack)`에서 `(lot.hot, lot.slack)`으로 비트는 mutant를 심었을 때 `test_hot_lot_always_wins`가 실패한다면 그 property는 실제로 무언가를 지키고 있는 것이고, 어떤 mutant를 심어도 property들이 전부 통과한다면 그 성질들은 장식이다. mutation testing은 example-based든 property-based든 가리지 않고 "이 테스트가 버그를 잡는 능력"이라는 같은 잣대로 평가하는, 테스트의 테스트다.

이 잣대는 곧 다시 등장한다. AI 코딩 에이전트가 코드와 테스트를 **둘 다** 생성하는 시대에는 "그 테스트를 믿을 수 있는가"가 자기 채점 문제가 되는데, 사람이 읽어보는 것 외에 기계적으로 신뢰도를 잴 수단으로 mutation score가 재조명되고 있다. 시리즈 마지막 6부에서 다룬다.

## 요약

- **Line coverage**는 실행된 줄, **branch coverage**는 분기의 양방향 실행을 잰다. 암묵적 else 경로 때문에 line 100%로도 미검증 경로가 남는다 — 잰다면 branch 기준으로.
- Coverage는 **실행**을 셀 뿐 **검증**을 세지 않는다. assert 없는 테스트도 coverage를 올린다. 낮은 coverage는 믿을 수 있는 나쁜 신호, 높은 coverage는 믿을 수 없는 좋은 신호다.
- Coverage를 목표로 삼으면 Goodhart의 법칙대로 숫자 채우기용 테스트가 양산된다. 올바른 용도는 **테스트 안 된 곳을 찾는 지도**(역방향 사용)다.
- **Mutation testing**은 코드에 인공 결함(mutant)을 심어 테스트가 죽이는지 실험한다. mutation score $= \frac{\text{killed}}{\text{total mutants}}$. 살아남은 mutant는 곧 테스트의 구멍 목록이며, 특히 경계값 테스트의 부재를 정확히 짚어낸다.
- 한계는 **equivalent mutant**(동작이 같아 죽일 수 없는 mutant — 판별은 결정 불가능)와 **실행 비용**. 매 커밋이 아니라 야간 CI·핵심 모듈에 절충 적용한다.
- property가 동어반복인지도 mutation으로 검사할 수 있다 — 테스트 형식과 무관하게 "버그를 잡는 능력"을 재는 공통 잣대.

## 참고문헌

- R. A. DeMillo, R. J. Lipton, F. G. Sayward, "Hints on Test Data Selection: Help for the Practicing Programmer," *IEEE Computer* 11(4) (1978). [DOI](https://doi.org/10.1109/C-M.1978.218136) — mutation testing의 원전.
- Y. Jia & M. Harman, "An Analysis and Survey of the Development of Mutation Testing," *IEEE Transactions on Software Engineering* 37(5) (2011). [DOI](https://doi.org/10.1109/TSE.2010.62) — 이론·도구·비용 완화 기법의 표준 survey.
- Brian Marick, [How to Misuse Code Coverage](https://www.exampler.com/testing-com/writings/coverage.pdf) (1999) — coverage 오용에 대한 고전.
- Marilyn Strathern, "'Improving ratings': audit in the British University system," *European Review* 5(3) (1997) — "측정이 목표가 되면 좋은 측정이기를 멈춘다"는 Goodhart 법칙의 통용 표현의 출처.
- [coverage.py 공식 문서](https://coverage.readthedocs.io/) — branch coverage 측정 방법.
- [mutmut 공식 문서](https://mutmut.readthedocs.io/) — Python mutation testing 도구 사용법.
