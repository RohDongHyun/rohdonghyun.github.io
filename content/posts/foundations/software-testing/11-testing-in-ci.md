---
title: 11. CI에서의 테스트 — 자동화된 안전망
date: 2026-07-06
tags:
  - Software Engineering
  - Testing
---

"내 컴퓨터에선 됐는데(works on my machine)"는 배포 사고의 단골 변명이지만, 테스트에도 똑같은 병이 있다. 내 로컬에서는 전체 스위트가 초록불인데 동료 머신에서는 빨갛다 — 내가 설치해 둔 패키지, 남아 있는 테스트 데이터, 환경 변수 하나가 결과를 갈랐기 때문이다. **CI(continuous integration)** 는 이 변명을 구조적으로 없앤다: *깨끗한 환경에서, 모든 변경에 대해, 사람 손 없이* 테스트를 실행한다. 이번 편은 4부의 마지막으로, [[posts/foundations/software-testing/10-integration-and-e2e-testing|10편]]에서 미뤄둔 질문 — 느린 스위트와 flaky 테스트를 CI에서 어떻게 운영하나 — 까지 다룬다.

## CI는 서버가 아니라 습관이다

CI라는 말은 오늘날 "GitHub Actions 같은 빌드 서버"와 동의어처럼 쓰이지만, 원래 의미는 도구가 아니라 **작업 방식** 이다. Martin Fowler의 정의를 따르면 CI는 팀원 각자가 **최소 하루에 한 번은 공유 mainline에 자기 변경을 통합하고, 통합할 때마다 자동 빌드와 테스트로 검증하는** 실천이다([Continuous Integration](https://martinfowler.com/articles/continuousIntegration.html), 2000년 초판, 2024년 전면 개정). 핵심은 두 가지다.

- **자주 통합한다** — 2주짜리 브랜치를 마지막에 합치면 충돌과 회귀가 한꺼번에 터진다. 매일 합치면 어긋남이 하루치 이하로 유지되어 원인 추적이 쉽다.
- **매 통합을 검증한다** — 통합이 안전했는지는 사람이 아니라 자동화된 빌드+테스트가 판정한다.

그래서 "우리 팀은 CI 서버 있어요"와 "우리 팀은 CI 해요"는 다른 말이다. Jenkins가 돌아가고 있어도 각자 장기 브랜치에서 몇 주씩 작업한다면 CI가 아니고, 반대로 서버 없이도 매일 mainline에 합치고 스크립트로 전체 스위트를 돌린다면 그게 CI다. 이 시리즈의 관점에서 CI 서버가 테스트에 더해주는 것은 정확히 세 가지다: **깨끗한 환경**(내 로컬의 우연한 상태가 아닌, 매번 새로 만든 환경 — [[posts/foundations/software-testing/03-anatomy-of-a-unit-test|3편]] FIRST의 Repeatable을 기계로 강제), **전수 실행**(모든 push에 대해, "이 정도 수정은 안 돌려도 되겠지"라는 판단을 제거), **비인간 실행**(잊거나 건너뛸 수 없음).

## 빨간 빌드의 의미 — 신호를 죽이지 마라

CI에서 테스트 스위트는 **mainline이 지금 건강한가에 대한 단일 신호** 가 된다. 초록불이면 누구든 그 시점 코드를 믿고 위에 쌓아도 되고, 빨간불이면 누군가의 변경이 무언가를 부쉈다는 뜻이다. 그래서 Fowler의 CI 실천 목록에는 "**빌드가 깨지면 고치는 것이 팀의 최우선 작업**"이 명시되어 있다 — 새 기능보다 먼저다.

이 규율이 무너지는 경로는 늘 같다. 누군가 깨진 테스트를 "그거 원래 가끔 깨져요"라며 방치하면, 다음 사람은 빨간 빌드 위에 자기 변경을 올리고, 이제 빨간불이 *내 탓인지 원래 그런 건지* 아무도 모른다. 신호가 소음이 되는 순간 스위트 전체가 형해화된다. 『The Pragmatic Programmer』(Hunt & Thomas, 1999)가 소프트웨어에 들여온 **깨진 유리창(broken windows)** 비유 그대로다 — 깨진 창 하나를 방치한 건물은 곧 나머지 창도 깨진다. 실패하는 테스트에 허용되는 선택지는 둘뿐이다: 즉시 고치거나, 원인을 티켓으로 만들고 스위트에서 **명시적으로** 빼거나. "빨간 채로 둔다"는 선택지에 없다.

## 속도 관리: 느린 스위트는 죽은 스위트다

CI의 가치는 피드백 속도에 비례한다. 스위트가 40분 걸리면 개발자는 push 전에 로컬에서 돌리지 않게 되고, CI 결과가 오기 전에 다음 작업으로 넘어가며, 빨간불이 떠도 "이따 볼게요"가 된다. 느린 스위트는 안 도는 스위트가 되고, 안 도는 스위트는 없는 스위트다. 대응은 세 갈래다.

**1) 계층별 분리 — 빠른 피드백 루프와 깊은 검증의 분리.** 『Continuous Delivery』(Humble & Farley, 2010)의 deployment pipeline 개념이 이것이다: 모든 커밋에는 수 분 안에 끝나는 **commit stage**(단위 테스트 중심)만 돌리고, 통합·E2E 같은 느린 검증은 그 뒤 단계(머지 시, 또는 야간)로 미룬다. pytest에서는 marker(테스트에 붙이는 라벨)로 계층을 표현한다.

```toml
# pyproject.toml — marker 등록. 미등록 marker는 경고만 뜨고 지나가므로,
# --strict-markers 옵션과 함께 쓰면 marker 오타가 경고가 아닌 에러가 된다
[tool.pytest.ini_options]
markers = ["slow: 실제 DB·컨테이너를 쓰는 통합·E2E 테스트"]
```

```python
import pytest

def test_due_date_priority_ordering():          # marker 없음 = 빠른 단위 테스트
    ...

@pytest.mark.slow                                # 10편의 testcontainers 테스트
def test_waiting_lots_query_on_real_postgres(engine):
    ...
```

이제 `pytest -m "not slow"`는 커밋마다, `pytest -m slow`는 머지·야간에 돌린다. 단, 느린 층을 뒤로 미룬다는 것은 **통합 버그의 발견도 그만큼 늦어진다** 는 뜻이므로, 미룬 층이 실패했을 때 즉시 알림이 오고 최우선으로 고쳐지는 규율이 전제다.

**2) 병렬화.** [pytest-xdist](https://pytest-xdist.readthedocs.io/)의 `pytest -n auto`는 CPU 코어 수만큼 worker 프로세스를 띄워 테스트를 나눠 돌린다. 공짜처럼 보이지만 전제가 있다 — 테스트들이 서로 **격리** 되어 있어야 한다(FIRST의 Isolated). 전역 상태나 공유 파일에 의존하는 테스트는 병렬로 돌리는 순간 순서 의존성이 드러나 깨진다. 역설적으로 이건 장점이기도 하다: 병렬화는 숨어 있던 상태 누수를 강제로 노출시키는 검사기다.

**3) 선택적 실행과 그 위험.** 변경된 파일에 영향받는 테스트만 골라 돌리는 기법(test impact analysis)이다. 대규모 monorepo에서는 필수지만(Google은 Bazel의 의존성 그래프로 이를 수행한다 — 『Software Engineering at Google』 23장), 의존성 추적이 코드 밖 요인 — 설정 파일, 데이터 파일, 동적 import — 을 놓치면 **"영향 없음"으로 오판된 회귀가 조용히 통과** 한다. 그래서 선택적 실행은 커밋 단계의 최적화로만 쓰고, 머지 후 mainline에서는 반드시 전체 스위트를 돌리는 이중 구조가 안전하다.

## Flakiness 운영: quarantine과 retry의 함정

10편에서 flaky 테스트(코드 변경 없이 통과/실패가 오락가락하는 테스트)의 원인 네 갈래 — 비동기 대기, 상태 누수, 동시성, 인프라 — 를 봤다. CI 운영 관점의 질문은 이것이다: **원인을 고치기 전까지, 이 테스트를 어디에 둘 것인가?**

**Quarantine(격리)** 이 표준 답이다. flaky로 판정된 테스트를 메인 스위트에서 빼서 별도 트랙으로 옮기고(빌드 신호에 영향을 주지 않게), 티켓을 만들어 기한 안에 고친다. Fowler는 [Eradicating Non-Determinism in Tests](https://martinfowler.com/articles/nonDeterminism.html)(2011)에서 이 방식을 권하면서 단서를 단다 — quarantine은 응급실이지 요양원이 아니므로, **격리 구역에 개수 상한이나 체류 기한을 둬야 한다** (예: 최대 8개 — 넘으면 하던 일을 멈추고 격리 구역부터 비운다 — 또는 최대 1주일). 격리된 테스트는 그동안 회귀를 잡아주지 못하므로, 격리가 무기한이 되는 순간 "테스트를 조용히 버리는 절차"로 변질되기 때문이다. Google도 flaky 판정·격리를 자동화해 운영한다는 것을 공개한 바 있다(전체 실행의 약 1.5%가 flaky 결과 — [Micco, 2016](https://testing.googleblog.com/2016/05/flaky-tests-at-google-and-how-we.html)).

**자동 재시도(retry)** — 실패하면 같은 테스트를 한두 번 더 돌려 통과하면 초록 처리 — 는 가장 유혹적이고 가장 위험한 대응이다. 문제는 retry가 *테스트의 결함* 과 *코드의 간헐적 결함* 을 구분하지 못한다는 것이다. 10편의 원인 분류에서 3번, **동시성** 을 떠올려 보자: 프로덕션에서도 가끔 터질 race condition(실행 순서에 따라 결과가 달라지는 경쟁 상태)은 CI에서 정확히 flaky 테스트처럼 보인다. 이때 retry는 진짜 버그의 유일한 조기 신호를 초록불로 덧칠한다. retry를 쓰더라도 최소한의 규율은: 재시도로 통과한 실행을 **flaky 발생으로 기록·집계** 하고(조용히 넘기지 않고), 집계가 임계치를 넘으면 quarantine으로 보내는 것이다. 근본은 문화의 문제다 — flaky 테스트를 "CI가 원래 그래"가 아니라 **버그와 동급으로 취급** 하는 팀만이 신호를 유지한다.

## GitHub Actions로 만들어 보기

위 원칙을 GitHub Actions로 옮기면 이렇다. push마다 빠른 job이 돌고, 그것이 통과해야 느린 job이 이어진다.

```yaml
# .github/workflows/tests.yml
name: tests
on:
  push:
  pull_request:

jobs:
  fast:                              # commit stage — 수 분 내 피드백
    runs-on: ubuntu-latest           # 매번 새로 만들어지는 깨끗한 VM
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - run: pip install -r requirements.txt
      - run: pytest -m "not slow" -n auto     # 단위 테스트만, 병렬

  slow:                              # 통합·E2E — 빠른 잡 통과 후에만
    needs: fast
    runs-on: ubuntu-latest           # Docker 내장 → testcontainers 그대로 동작
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - run: pip install -r requirements.txt
      - run: pytest -m slow
```

`runs-on: ubuntu-latest` 한 줄이 이 글 서두의 약속 — **깨끗한 환경** — 을 구현한다. 매 실행마다 새 가상 머신이 만들어지므로 "내 컴퓨터에만 있는 무언가"가 끼어들 자리가 없다. 환경 재현성을 더 강하게 통제하고 싶다면 테스트를 컨테이너 안에서 돌리면 된다 — 컨테이너가 왜 재현성의 단위인지는 [[posts/foundations/mlops-infrastructure/01-what-is-a-container|mlops 시리즈 1편]]에서 다뤘다.

작은 실물 사례로, 이 블로그 저장소의 [`deploy.yml`](https://github.com/RohDongHyun/rohdonghyun.github.io/blob/main/.github/workflows/deploy.yml)도 같은 구조다. main에 push할 때마다 깨끗한 Ubuntu VM에서 `npm ci`로 의존성을 새로 설치하고 Quartz 빌드를 돌리는데, 빌드 스크립트가 "모든 글은 유효한 카테고리 폴더에 있고 태그가 1개 이상"이라는 규칙을 검사해 위반 시 빌드를 실패시킨다. 테스트 프레임워크는 한 줄도 없지만 — *모든 변경에 대해, 깨끗한 환경에서, 기계가 규칙 위반을 잡아 빨간불을 켠다* 는 CI의 원형이 그대로 들어 있다.

## 요약

- CI는 빌드 서버가 아니라 **자주 통합하고 매 통합을 자동 검증하는 습관** 이다(Fowler). CI 서버가 테스트에 더해주는 것: 깨끗한 환경, 전수 실행, 비인간 실행.
- 테스트 스위트는 mainline 건강의 **단일 신호** 다. 깨진 빌드를 방치하면 신호가 소음이 된다(broken windows) — 빨간불의 선택지는 "즉시 고침" 또는 "명시적 격리"뿐.
- 느린 스위트는 안 도는 스위트다. **계층 분리**(pytest marker로 commit stage / 야간 분리), **병렬화**(pytest-xdist — 격리가 전제이자 검사기), **선택적 실행**(커밋 단계 최적화로만, mainline에서는 전체 스위트).
- flaky는 **quarantine** 으로 격리하되 크기 상한과 기한을 두고, **자동 retry** 는 race condition 같은 진짜 간헐 버그를 덧칠할 수 있음을 안다. flaky를 버그로 취급하는 문화가 근본이다.
- GitHub Actions에서 `fast → slow` 2단 job 구조로 빠른 피드백과 깊은 검증을 모두 잡는다.

## 참고문헌

- Martin Fowler, [Continuous Integration](https://martinfowler.com/articles/continuousIntegration.html) (martinfowler.com, 2000 초판 / 2024 전면 개정) — CI의 정의와 실천 목록.
- Jez Humble & David Farley, *Continuous Delivery* (Addison-Wesley, 2010) — deployment pipeline과 commit stage.
- Martin Fowler, [Eradicating Non-Determinism in Tests](https://martinfowler.com/articles/nonDeterminism.html) (2011) — quarantine 운영 원칙.
- John Micco, [Flaky Tests at Google and How We Mitigate Them](https://testing.googleblog.com/2016/05/flaky-tests-at-google-and-how-we.html) (Google Testing Blog, 2016).
- Titus Winters, Tom Manshreck & Hyrum Wright, *Software Engineering at Google* (O'Reilly, 2020), Ch. 23 — 대규모 CI와 선택적 실행.
- Andrew Hunt & David Thomas, *The Pragmatic Programmer* (Addison-Wesley, 1999) — broken windows.
- [pytest-xdist 공식 문서](https://pytest-xdist.readthedocs.io/), [GitHub Actions 공식 문서](https://docs.github.com/en/actions).
