---
title: "20. DES 엔진의 내부: Future Event List와 성능"
date: 2026-07-17
tags:
  - Simulation
---

18~19편이 "모델을 어떻게 *기술*하나"에 관한 이야기였다면, 이번 글부터는 "엔진이 그것을 어떻게 *빨리 실행*하나"를 본다. 속도가 왜 문제가 될까. [[posts/foundations/simulation-and-digital-twin/13-variance-reduction-and-doe|실험 설계]]는 시나리오 × replication으로 수백~수천 회의 실행을 요구하고, 뒤에 다룰 강화학습 연계(시리즈 후반 예정)는 수백만 에피소드를 요구한다. 게다가 모델 하나가 가볍지도 않다 — FAB 규모 모델이라면 하루치 시뮬레이션에 수백만 이벤트가 흔하다. 실행 한 번이 10초냐 10분이냐가 곧 "실험을 몇 개나 돌려 볼 수 있느냐"를 결정한다.

출발점은 [[posts/foundations/simulation-and-digital-twin/08-building-des-from-scratch|8번 글]]이다. 거기서 우리는 미래사건 리스트(Future Event List, FEL)를 **Python `heapq`(최소 힙)** 로 구현했다. 그때는 "가장 이른 사건을 빠르게 꺼내야 하니까"라고만 하고 넘어갔는데, 사실 그 한 줄의 선택 뒤에는 수십 년치 자료구조 연구가 있다. 이 글에서 그 선택지를 펼쳐 본다.

## FEL이 지원해야 하는 연산

DES 엔진의 루프는 이벤트 하나마다 FEL을 최소 두 번 건드린다. 총 $N$개의 이벤트를 처리하는 실행이라면 대략

$$
T_{\text{run}} \;\approx\; N \cdot \bigl( c_{\text{FEL}} + c_{\text{routine}} \bigr)
$$

이다. 여기서 $c_{\text{FEL}}$은 FEL 연산 한 쌍의 평균 비용, $c_{\text{routine}}$은 이벤트 루틴(상태 갱신·통계 수집) 한 번의 비용이다. 이 식이 말하는 것은 두 가지다. 첫째, $N$이 수백만이면 $c_{\text{FEL}}$의 작은 차이도 실행 시간 전체에 곱해져 들어간다 — FEL 자료구조 선택이 성능을 좌우하는 이유다. 둘째, 병목은 $c_{\text{FEL}}$과 $c_{\text{routine}}$ 중 큰 쪽이다 — FEL만 최적화한다고 끝이 아니라는 복선인데, 뒤에서 다시 본다.

FEL이 지원해야 하는 연산은 세 가지다.

- **insert**: 미래 이벤트를 타임스탬프와 함께 예약한다. (8번 글의 `schedule`)
- **extract-min**: 가장 이른 타임스탬프의 이벤트를 꺼낸다. (8번 글의 `heappop`)
- **delete/cancel** (선택): 예약된 이벤트를 취소한다. [[posts/foundations/simulation-and-digital-twin/18-event-graph|18편]]에서 event graph의 **cancelling edge**(취소 edge)로 표현했던 것 — 예컨대 "장비가 고장 나면 예약돼 있던 가공 완료 이벤트를 취소"—이 엔진 수준에서는 바로 이 연산이다.

즉 FEL은 본질적으로 **우선순위 큐**(priority queue)이고, 문제는 "어떤 우선순위 큐 구현이 시뮬레이션 워크로드에서 빠른가"이다.

## 자료구조 비교

### 정렬 연결 리스트 — 단순함의 힘

이벤트를 타임스탬프 순으로 정렬된 연결 리스트에 유지한다. extract-min은 맨 앞을 떼면 되므로 $O(1)$, insert는 자리를 찾아 훑어야 하므로 $O(n)$이다 ($n$은 FEL에 대기 중인 이벤트 수). 초기 시뮬레이션 언어들이 쓰던 방식인데, $n$이 수십 개 수준이면 상수 비용이 작아 **의외로 경쟁력이 있다.** 자료구조의 점근 복잡도만 보고 비웃으면 안 되는 첫 번째 사례다.

### Binary heap — 표준 선택

완전 이진 트리를 배열에 담아 "부모 ≤ 자식" 불변식을 유지한다. insert와 extract-min 모두 트리 높이만큼만 원소를 밀어 올리거나 내리면 되므로 $O(\log n)$이다. 최악의 경우에도 보장되는 균형 잡힌 성능 덕에 사실상의 표준이고, Python `heapq`가 이것이다. 8번 글의 우리 엔진이 그랬고, [[posts/foundations/simulation-and-digital-twin/09-modeling-des-with-simpy|SimPy]]의 `Environment` 역시 내부에서 같은 `heapq`(`heappush`/`heappop`)로 FEL을 관리한다 — 9번 글에서 "우리가 직접 짰던 FEL과 루프가 여기 숨어 있다"고 한 그 내부가 바로 이것이다.

$n = 10^6$이어도 $\log_2 n \approx 20$이니, 이벤트당 비교 수십 번이면 끝난다. 나쁘지 않다. 그런데 이것보다 더 잘할 수 있을까?

### Calendar queue — 시뮬레이션 전용 $O(1)$

**Calendar queue**는 이름 그대로 달력에 비유하면 이해가 쉽다. 책상 달력에 약속을 적을 때 우리는 전체 약속을 정렬하지 않는다 — 해당 **날짜 칸**에 던져 넣을 뿐이다. "오늘의 다음 약속"을 찾을 때도 오늘 칸(과 기껏해야 그다음 몇 칸)만 보면 된다. Calendar queue는 시뮬레이션 시간 축을 폭 $\delta$의 버킷(날짜 칸)들로 나누고, 이벤트를 타임스탬프에 해당하는 버킷에 넣는다.

- **insert**: 타임스탬프를 $\delta$로 나눠 버킷 번호를 계산하고 그 버킷에 넣는다 — 평균 $O(1)$.
- **extract-min**: 현재 시계가 가리키는 버킷부터 차례로 살피며 가장 이른 이벤트를 꺼낸다 — 버킷당 이벤트가 몇 개 수준으로 유지되면 평균 $O(1)$.

관건은 버킷당 이벤트 수를 적정하게 유지하는 것이다. 이벤트가 너무 몰리면(버킷이 뚱뚱하면) 버킷 안 탐색이 길어지고, 너무 성기면(빈 버킷이 많으면) 빈 칸을 건너뛰는 데 시간을 쓴다. 그래서 calendar queue는 원소 수와 이벤트 밀도에 맞춰 **버킷 수와 폭 $\delta$를 동적으로 재조정**한다(해시 테이블의 resize와 같은 발상). 그 결과 이벤트 타임스탬프 분포가 안정적이면 insert·extract-min 모두 **평균 $O(1)$** — heap의 $O(\log n)$을 이긴다.

이 자료구조의 재미있는 점은 범용 우선순위 큐가 아니라 **처음부터 시뮬레이션 이벤트 집합 문제를 위해 고안**되었다는 것이다. Randy Brown이 1988년 Communications of the ACM에 발표했고, 제목부터 "for the simulation event set problem"이다. 반대로 말하면 약점도 분포 의존성이다 — 타임스탬프 분포가 갑자기 바뀌거나 한곳에 몰리면(예: 특정 시각에 대량의 이벤트가 동시 예약) 재조정이 따라가지 못해 성능이 무너질 수 있다.

### Splay tree 등 자가 조정 트리

Sleator와 Tarjan이 1985년 제안한 자가 조정(self-adjusting) 이진 탐색 트리로, 접근한 node를 회전으로 뿌리 근처로 끌어올려 **자주 쓰는 원소일수록 빨라지게** 스스로 재구성한다. amortized $O(\log n)$ — 개별 연산은 느릴 수 있지만 연산열 전체의 평균은 $O(\log n)$이 보장된다는 뜻이다. 실제 시뮬레이션 워크로드에서 좋은 성능을 보여 한때 이벤트 리스트 구현으로 널리 쓰였다. 여기서는 이 정도만 언급한다.

### 무엇이 이기는가

| 자료구조 | insert | extract-min | 비고 |
|---|---|---|---|
| 정렬 연결 리스트 | $O(n)$ | $O(1)$ | $n$이 작으면 경쟁력 |
| binary heap | $O(\log n)$ | $O(\log n)$ | 표준. `heapq`, SimPy |
| calendar queue | 평균 $O(1)$ | 평균 $O(1)$ | 분포 안정 가정, 시뮬레이션 전용 설계 |
| splay tree | amortized $O(\log n)$ | amortized $O(\log n)$ | 자가 조정 |

정답은 하나가 아니다. 승자는 **FEL 크기 $n$, 타임스탬프 분포, cancel 빈도**에 달렸다. $n$이 작으면 리스트로 충분하고, 분포가 안정적인 대규모 모델이면 calendar queue가 빛나고, 아무 가정 없이 무난하려면 heap이다. cancel이 잦은 모델(고장·인터럽트가 많은 모델)이라면 "임의 원소 삭제"가 싼 구조인지도 따져야 한다 — `heapq`에는 삭제 연산이 없어 보통 "취소됨 표시를 해 두고 pop될 때 버리는" 우회를 쓴다.

참고로 이런 FEL 구현들을 비교하는 벤치마크의 표준 워크로드가 **hold model**이다: 크기 $n$의 FEL에 대해 "extract-min 1회 + insert 1회"를 반복해 크기를 $n$으로 유지하면서 연산당 평균 시간을 잰다. 실제 DES 실행에서 FEL이 겪는 접근 패턴(꺼낸 만큼 새로 예약)을 흉내 낸 것이다.

## FEL 밖의 병목 — 프로파일링이 먼저

여기까지 읽으면 "그럼 calendar queue로 바꾸면 내 시뮬레이션이 빨라지겠네"라고 생각하기 쉽다. 그런데 실제로 프로파일링해 보면 **FEL이 병목이 아닌 경우가 많다.** 앞의 식 $T_{\text{run}} \approx N(c_{\text{FEL}} + c_{\text{routine}})$에서 $c_{\text{routine}}$ 쪽이 큰 것이다.

- **이벤트 루틴 자체**: 상태 갱신, 통계 수집, 로깅. 이벤트마다 리스트에 기록을 append하고 dict를 갱신하는 비용이 heap 연산 몇십 번보다 클 수 있다.
- **인터프리터 오버헤드**: Python이라면 함수 호출·객체 생성 자체가 비싸다. $c_{\text{FEL}}$이 $O(\log n)$이든 $O(1)$이든, 앞에 붙는 상수가 인터프리터 때문에 수십 배로 뻥튀기된다.
- **프로세스 기반 엔진의 문맥 전환**: SimPy처럼 generator로 프로세스를 표현하는 엔진은 이벤트마다 generator를 깨우고 재우는 **문맥 전환 비용**이 추가된다. 9번 글에서 예찬한 "시나리오처럼 읽히는 코드"의 가독성은 공짜가 아니다.

대응 수단도 FEL 교체보다 이런 것들이 먼저다.

1. **통계 수집 최소화**: 필요한 지표만, 필요한 구간에서만 모은다. "일단 다 기록해 두자"가 흔한 성능 함정이다.
2. **이벤트 굵기(granularity) 조정**: 여러 개의 잘게 쪼개진 이벤트를 하나로 합칠 수 있으면 $N$ 자체가 줄어든다. 예컨대 컨베이어 위 제품의 이동을 1초 단위 이벤트로 쪼개는 대신 "도착 예정 시각" 이벤트 하나로 표현한다.
3. **실행 환경 교체**: PyPy 같은 JIT 인터프리터, 또는 컴파일 언어(C++ 등)로 구현된 엔진·상용 시뮬레이터로 옮긴다. 모델 코드는 그대로 두고 상수 배를 버는 방법이다.
4. **모델 단순화 — fidelity 낮추기**: 질문에 답하는 데 필요 이상으로 세밀한 모델이 사실 **최악의 성능 버그**다. 이벤트 수를 열 배 만드는 디테일이 결론을 바꾸지 않는다면, 그 디테일은 비용만 내는 것이다.

순서에 주목하자. 자료구조 최적화는 프로파일링으로 FEL이 병목임을 *확인한 뒤의* 일이다.

## 한 번의 실행 vs 여러 번의 실행

마지막으로 중요한 구분 하나. "시뮬레이션을 빠르게"에는 사실 두 개의 다른 문제가 섞여 있다.

**여러 번의 실행**은 쉬운 문제다. [[posts/foundations/simulation-and-digital-twin/11-output-analysis|통계적 신뢰]]를 위해 돌리는 다수의 replication은 서로 완전히 독립이므로 **embarrassingly parallel** — 작업 간 통신이 전혀 필요 없어 병렬화가 자명하다는 뜻의 관용구다 — 하다. 멀티프로세스로 그냥 뿌리면 코어 수만큼 거의 선형으로 빨라진다. 유일한 주의점은 replication마다 **난수 스트림을 분리**하는 것이다([[posts/foundations/simulation-and-digital-twin/03-random-number-generation|3편]]에서 다룬 seed 관리). 모든 프로세스가 같은 시드로 돌면 "100번 반복"이 아니라 "같은 실행 100번 복사"가 된다.

**한 번의 거대한 실행**이 진짜 어려운 문제다. 하나의 FAB 모델, 하나의 이벤트 루프 — 이벤트는 시간 순서라는 전역 제약으로 묶여 있어서, 코어 8개에 어떻게 나눠 줄지가 전혀 자명하지 않다. 미래의 이벤트를 미리 처리했다가 과거에서 날아온 이벤트와 모순이 나면 어떻게 할 것인가? 이 질문이 병렬·분산 DES라는 별도의 연구 분야를 만들었고, [[posts/foundations/simulation-and-digital-twin/21-parallel-and-distributed-des|다음 글]]의 주제다.

## 정리

- FEL은 **insert / extract-min / (선택) cancel**을 지원하는 우선순위 큐이고, 이벤트 수 $N$이 수백만이 되면 연산당 비용이 실행 시간에 그대로 곱해진다.
- **정렬 리스트**($O(n)$/$O(1)$), **binary heap**($O(\log n)$, `heapq`·SimPy의 선택), **calendar queue**(평균 $O(1)$, 시뮬레이션 전용 설계, Brown 1988), **splay tree**(amortized $O(\log n)$) — 승자는 $n$·타임스탬프 분포·cancel 빈도에 달렸고, 비교의 표준 워크로드는 **hold model**이다.
- 실제 병목은 FEL보다 **이벤트 루틴·통계 수집·인터프리터 오버헤드**인 경우가 많다. 통계 최소화, 이벤트 굵기 조정, 실행 환경 교체, fidelity 낮추기가 먼저고, 자료구조 교체는 프로파일링 뒤의 일이다.
- **여러 replication은 embarrassingly parallel**이라 난수 스트림 분리만 지키면 그냥 뿌리면 된다. 어려운 것은 "거대한 모델 한 번"의 병렬화 — 다음 글의 주제다.

## 참고문헌

- R. Brown, "Calendar queues: a fast O(1) priority queue implementation for the simulation event set problem", *Communications of the ACM* 31(10), 1988. [DOI](https://doi.org/10.1145/63039.63045)
- D. D. Sleator and R. E. Tarjan, "Self-adjusting binary search trees", *Journal of the ACM* 32(3), 1985. [DOI](https://doi.org/10.1145/3828.3835)
