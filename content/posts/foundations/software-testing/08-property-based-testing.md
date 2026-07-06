---
title: 08. Property-based Testing — 예시 대신 성질을 검증하기
date: 2026-07-06
tags:
  - Software Engineering
  - Testing
---

[[posts/foundations/software-testing/07-test-driven-development|7편]]의 TDD 워크스루에서 우리는 예제를 하나씩 추가하며(triangulation) 구현을 일반화시켰다. 그런데 그 예제들은 전부 **내가 생각해낸** 것이다. slack 30분짜리 lot, 이미 늦은 lot — 내 머릿속에 떠오른 경우만 검증했을 뿐, 떠오르지 않은 경우는 테스트 스위트 어디에도 없다. 빈 큐, slack 동률, 극단적으로 큰 값, 그리고 곧 보게 될 NaN 같은 것들. **Property-based Testing(PBT)** 은 이 맹점을 정면으로 공격한다: 예시를 고르는 일을 사람이 아니라 도구에게 맡기고, 사람은 **모든 유효 입력에 대해 성립해야 하는 성질(property)** 만 선언한다.

## Example-based의 한계, Property의 사고방식

지금까지의 테스트는 전부 이런 모양이었다: "입력이 $x_1$이면 출력은 $y_1$이다." 유한 개의 $(x_i, y_i)$ 쌍을 확인하는 방식이라, 검증 범위가 정확히 **내가 예상한 사례의 집합**과 일치한다. 버그는 대개 예상 밖에서 나오므로, 이 방식의 사각지대는 구조적이다.

PBT는 질문을 바꾼다: "입력이 이것이면 출력이 저것"이 아니라 **"어떤 유효 입력 $x$가 들어와도 $P(f, x)$가 참이다"** 를 쓴다. 그러면 도구가 입력을 수백 개 무작위로 생성해 성질을 깨는 반례를 찾아 나선다. 이 아이디어의 원전은 Haskell의 **QuickCheck**(Claessen & Hughes, 2000, [DOI](https://doi.org/10.1145/351240.351266))이고, 이후 거의 모든 언어로 이식됐다. Python 생태계의 표준 구현은 **Hypothesis**(MacIver et al., 2019, [DOI](https://doi.org/10.21105/joss.01891))다.

핵심 난관은 물론 "출력값을 모르는데 무엇을 assert하나?"이다. 정답은 몰라도 **정답이 만족해야 하는 성질**은 아는 경우가 놀랄 만큼 많다. 자주 쓰이는 패턴이 네 가지 있다.

## 대표 property 패턴 네 가지

1. **Invariant(불변식)** — 출력이 항상 만족해야 하는 조건. 정렬 결과는 순서가 있고 입력의 순열이다. 디스패칭이라면: 모든 배정은 그 lot을 처리할 수 있는 설비에만 간다, 한 설비에 동시에 두 lot이 배정되지 않는다.
2. **Roundtrip(왕복)** — 변환 후 역변환하면 원본이다: `decode(encode(x)) == x`. 스케줄을 JSON으로 직렬화했다 복원하기, 시간대 변환 왕복 등. 두 함수가 서로를 검증해주므로 정답 없이 성립한다.
3. **Oracle(기준 구현)** — 느리지만 확실한 기준과 비교한다: 최적화된 구현의 출력 = 단순 무식한(brute-force) 구현의 출력. 작은 입력에서 전수 탐색과 heuristic을 비교하는 식으로, 성능 개선 리팩토링의 안전망으로 특히 유용하다.
4. **Metamorphic(변형 관계)** — 개별 출력의 정답은 몰라도 **입력을 바꿨을 때 출력이 어떻게 변해야 하는지**는 안다. 대기 큐에 lot 하나를 추가하면, 선택 결과는 기존 선택 그대로이거나 새 lot이어야 한다(기존 3순위가 갑자기 1순위가 되면 안 된다). 모든 lot의 납기를 똑같이 10분씩 늦춰도 선택 순서는 불변이어야 한다. 이 용어는 Chen 등이 1998년 제안했고 테스트 oracle이 없는 프로그램(수치 계산, ML 등) 검증의 표준 기법이 됐다(survey: [DOI](https://doi.org/10.1145/3143561)).

## Hypothesis 실습: 디스패칭 규칙에 성질 붙이기

7편의 규칙을 hot lot 우선으로 확장한 버전을 대상으로 하자 (7편에서는 `slack_minutes(lot, now)`로 매번 계산했지만, 여기서는 논점을 줄이기 위해 slack을 미리 계산된 필드로 둔다).

```python
# dispatch.py
from dataclasses import dataclass

@dataclass(frozen=True)
class Lot:
    id: int
    hot: bool        # 초긴급(hot) lot 여부
    slack: float     # 납기 여유(분) — 작을수록 급함

def pick_next(queue: list[Lot]) -> Lot:
    """hot lot 우선, 같은 등급 안에서는 slack이 작은 lot부터."""
    return min(queue, key=lambda lot: (not lot.hot, lot.slack))
```

Hypothesis에서 입력 생성기는 **strategy**라 부른다. `st.integers()`, `st.floats()` 같은 기본 strategy를 `st.builds()`로 조합하면 우리 dataclass 같은 임의 객체도 만들 수 있고, `st.lists()`로 그것의 리스트를 만든다. `@given` decorator가 붙은 테스트는 pytest가 그대로 실행하되, 기본 100개의 생성 입력으로 반복 검사된다.

```python
# test_dispatch_properties.py
from hypothesis import given, strategies as st
from dispatch import Lot, pick_next

lot_st = st.builds(
    Lot,
    id=st.integers(min_value=0),
    hot=st.booleans(),
    slack=st.floats(),          # 일단 아무 float나 — 잠시 뒤 사건이 벌어진다
)
queue_st = st.lists(lot_st, min_size=1)

@given(queue_st)
def test_pick_is_from_queue(queue):            # invariant: 배정은 큐 안에서만
    assert pick_next(queue) in queue

@given(queue_st)
def test_hot_lot_always_wins(queue):           # invariant: hot이 있으면 항상 먼저
    if any(lot.hot for lot in queue):
        assert pick_next(queue).hot

@given(queue_st)
def test_pick_beats_everyone(queue):           # oracle: 전수 비교로 최솟값 검증
    best = pick_next(queue)
    assert all((not best.hot, best.slack) <= (not l.hot, l.slack)
               for l in queue)

@given(queue_st, lot_st)
def test_new_lot_only_replaces_the_pick(queue, new):   # metamorphic
    assert pick_next(queue + [new]) in (pick_next(queue), new)
```

예시 하나 없이 성질 네 줄이다. 그리고 실행하면 — **실패한다**.

```
Falsifying example: test_pick_beats_everyone(
    queue=[Lot(id=0, hot=False, slack=nan),
           Lot(id=0, hot=False, slack=0.0)],
)
```

`st.floats()`는 기본적으로 NaN과 무한대도 생성한다. NaN은 어떤 값과의 대소 비교(`<`, `<=`)든 항상 False다. 그래서 `min`이 왼쪽부터 훑으며 "현재 후보보다 작은 원소가 나오면 교체"할 때 NaN을 이길 수 있는 원소가 없다 — slack이 0인 멀쩡한 lot이 있는데도 NaN lot이 그대로 반환되고, oracle 검증의 `best.slack <= l.slack` 역시 `nan <= 0.0`이 False라 무너진다. 우리가 예시를 골랐다면 평생 넣어보지 않았을 입력이다 — 하지만 상류 계산 어딘가에서 `0.0 / 0.0`이 새어 들어오면 프로덕션의 디스패처가 정확히 이렇게 조용히 오작동한다.

여기서 결정을 내려야 한다. NaN이 유효 입력이라면 `pick_next`가 그것을 처리해야 하고(코드 수정), 유효 입력이 아니라면 그 계약을 strategy에 명시한다:

```python
    slack=st.floats(allow_nan=False, allow_infinity=False),
```

이 한 줄이 곧 **입력 계약의 문서화**다. PBT의 숨은 효용이 여기 있다 — strategy를 쓰다 보면 "이 함수의 유효 입력이 정확히 무엇인가"를 어물쩍 넘어갈 수 없게 된다. `min_size=1`도 마찬가지다: 빈 큐를 계약에서 배제한 것인데, 만약 빈 큐도 유효하다면 "빈 큐면 None을 반환한다" 자체가 새 property가 된다.

### Shrinking — 최소 반례로의 자동 축소

위 출력에서 눈여겨볼 것은 반례가 **lot 두 개짜리 큐**(NaN lot 하나 + slack 0인 lot 하나)라는 점이다. Hypothesis가 처음 발견한 반례는 보통 lot 대여섯 개가 뒤엉킨 지저분한 리스트다. 도구는 거기서 멈추지 않고 실패를 유지하는 한도 내에서 입력을 계속 줄인다 — 원소를 빼고, 수를 0에 가깝게 만들고, 문자열을 비운다. 이 과정을 **shrinking**이라 하며, 사람이 최종적으로 받는 것은 "이 성질을 깨는 거의 최소의 입력"이다. 무작위 테스트가 실무 도구가 된 결정적 이유가 이것이다: 반례가 크면 디버깅거리지만, "NaN lot과 slack 0짜리 lot을 나란히 두면 깨진다"까지 줄어든 반례는 그 자체로 버그 리포트다. 발견된 반례는 로컬 example database(`.hypothesis/` 디렉토리)에 저장되어 다음 실행 때 가장 먼저 재시도되므로, 고치기 전까지 우연히 통과하는 일도 없다.

## 스케줄링·최적화 코드와의 궁합

PBT가 특히 빛나는 곳이 스케줄링·최적화 도메인이다. 이 동네의 근본 난제는 **정답을 모른다**는 것이다 — heuristic 스케줄러의 출력이 최적해인지 확인하려면 NP-hard 문제를 풀어야 한다. 즉 전통적 example-based의 "기대 출력"을 쓸 수가 없다. 그러나 성질은 얼마든지 쓸 수 있다:

- **Feasibility invariant**: 어떤 입력에서도 출력 스케줄은 제약을 위반하지 않는다 — 설비 capability, 시간 겹침 금지, precedence. 최적성은 못 보장해도 "말이 되는 답"임은 항상 보장해야 한다.
- **단조성(monotonicity)**: 설비를 하나 추가했는데 makespan이 나빠지면 안 된다. lot의 납기를 늦췄는데 그 lot의 우선순위가 올라가면 안 된다. (metamorphic 관계다.) 흥미롭게도 첫 번째 성질은 합리적으로 보이는 heuristic도 깰 수 있음이 알려져 있다 — list scheduling에서 설비를 늘리면 오히려 makespan이 늘어나는 **Graham의 anomaly**(1966, [DOI](https://doi.org/10.1002/j.1538-7305.1966.tb01709.x))가 대표적이다. 내 스케줄러가 이런 성질을 지키는지 아닌지를 드러내주는 것 자체가 PBT의 수확이다.
- **작은 입력에서의 oracle**: lot 5개 이하면 전수 탐색으로 최적해를 구해 heuristic과 gap을 비교할 수 있다.

시뮬레이션 모델 검증에서 "정답과 비교" 대신 보존 법칙·극한 거동을 확인하던 것과 같은 발상이다 — [[posts/foundations/simulation-and-digital-twin/12-verification-and-validation|시뮬레이션 시리즈 12편]]의 V&V와 맥이 닿는다.

## Example-based와의 관계: 대체가 아니라 보완

그렇다고 예시 테스트를 걷어낼 일은 아니다. 둘은 다른 것을 잡는다. property는 일반 법칙을 넓게 훑고, 예시는 **의사소통과 특정 사례 고정**에 강하다 — "이미 늦은 lot은 slack이 음수다" 같은 구체 예시는 문서로서의 가치가 있고, 과거에 실제로 터졌던 버그의 재현 입력은 property가 우연히 안 밟을 수 있으니 예시로 못 박는 게 안전하다. Hypothesis는 `@example(...)` decorator로 특정 입력을 무작위 생성에 **항상 추가**하는 기능을 제공해, 두 방식을 한 테스트 안에서 섞을 수 있다. 실무 배합은 대략: 핵심 로직에 property 몇 개 + 계약을 설명하는 예시 몇 개 + 회귀 방지용 과거 버그 입력들.

## 한계

- **설계 비용**: 좋은 property를 찾는 것은 좋은 예시를 찾는 것보다 어렵다. 함수의 본질적 계약을 추상화해야 하므로, 사실상 스펙을 쓰는 일이다. (뒤집으면 — 그 과정에서 스펙의 구멍이 드러나는 것이 PBT의 효용이기도 하다.)
- **실행 시간**: 테스트당 수백 회 실행이므로 스위트가 느려진다. 느린 코드에는 `settings`로 예제 수를 조절하거나 CI에서만 많이 돌리는 절충이 필요하다.
- **동어반복(tautology)의 함정**: 성질을 잘못 쓰면 항상 통과하는 무의미한 테스트가 된다. 극단적으로, 구현 로직을 테스트에 그대로 복붙해 비교하면 100% 통과하지만 아무것도 검증하지 않는다. 위의 oracle 테스트도 `pick_next`가 `min`의 얇은 wrapper라 비교 기준이 구현과 겹친다는 점에서 경계선에 있다 — 구현이 복잡해질수록(배치 규칙, setup 시간 반영 등) 단순 전수 비교 oracle의 가치가 커진다. 내 테스트가 실제로 무언가를 잡는지 확인하는 체계적 방법(mutation testing)은 9편에서 다룬다.

## 요약

- example-based 테스트는 **내가 떠올린 사례**만 검증한다. PBT는 "모든 유효 입력에 대한 성질"을 선언하고 입력 생성을 도구에 맡겨 이 맹점을 보완한다 (QuickCheck, 2000).
- 정답을 몰라도 쓸 수 있는 성질 패턴: **invariant**(출력 불변식), **roundtrip**(encode→decode = 원본), **oracle**(단순·확실한 기준 구현과 비교), **metamorphic**(입력 변화에 대한 출력 관계).
- Hypothesis는 `@given` + strategy(`st.integers`, `st.lists`, `st.builds`)로 입력을 생성하고, 실패 시 **shrinking**으로 최소 반례를 만들어준다. strategy 작성은 곧 입력 계약의 문서화다.
- 최적해를 모르는 스케줄링·최적화 코드에서 feasibility·단조성 같은 성질 검증은 oracle 없이 가능한 거의 유일한 자동 검증 수단이다.
- 예시 테스트의 대체가 아니라 보완이다. 비용은 property 설계의 어려움, 실행 시간, 그리고 잘못 쓴 성질이 주는 거짓 안심.

## 참고문헌

- Koen Claessen & John Hughes, "QuickCheck: A Lightweight Tool for Random Testing of Haskell Programs," *ICFP* (2000). [DOI](https://doi.org/10.1145/351240.351266) — PBT의 원전.
- David R. MacIver et al., "Hypothesis: A new approach to property-based testing," *Journal of Open Source Software* 4(43) (2019). [DOI](https://doi.org/10.21105/joss.01891)
- [Hypothesis 공식 문서](https://hypothesis.readthedocs.io/) — strategy·settings·example database의 정확한 사용법.
- T. Y. Chen et al., "Metamorphic Testing: A Review of Challenges and Opportunities," *ACM Computing Surveys* 51(1) (2018). [DOI](https://doi.org/10.1145/3143561) — metamorphic testing 개념(Chen et al., 1998)의 종합 정리.
- R. L. Graham, "Bounds for Certain Multiprocessing Anomalies," *Bell System Technical Journal* 45(9) (1966). [DOI](https://doi.org/10.1002/j.1538-7305.1966.tb01709.x) — 설비 추가가 makespan을 늘릴 수 있다는 scheduling anomaly의 원전.
- Scott Wlaschin, [Choosing properties for property-based testing](https://fsharpforfunandprofit.com/posts/property-based-testing-2/) — property 패턴 카탈로그로 널리 인용되는 글.
