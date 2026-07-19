---
title: 21. 병렬·분산 DES
date: 2026-07-17
tags:
  - Simulation
---

[[posts/foundations/simulation-and-digital-twin/20-inside-a-des-engine|앞 글]]이 "단일 스레드 엔진을 어떻게 빠르게 만드는가"였다면, 이 글은 그다음 질문이다. **하나의 거대한 모델을 여러 프로세서에 나눠 돌릴 수는 없는가?** 반도체 FAB 전체 모델처럼 한 번의 실행에 이벤트가 수억 개인 경우, 아무리 엔진을 다듬어도 코어 하나로는 몇 시간씩 걸린다. 이 문제를 다루는 분야가 **병렬·분산 이산사건 시뮬레이션**(Parallel and Distributed Discrete-Event Simulation, PDES)이다. 심화 편(7부)의 마지막 글이다.

## 문제 설정: 모델을 쪼개면 인과가 위험해진다

출발은 자연스럽다. 모델을 여러 개의 **LP**(logical process, 논리 프로세스)로 분할한다. 예를 들어 FAB 모델이라면 베이(bay) 하나당 LP 하나. 각 LP는 [[posts/foundations/simulation-and-digital-twin/06-discrete-event-simulation-concepts|6편]]에서 본 엔진의 축소판으로, **자기만의 FEL과 로컬 시뮬레이션 시계**를 가지고 자기 담당 구역의 이벤트를 처리한다. LP 사이의 상호작용 — 이 베이에서 처리를 마친 lot이 저 베이로 넘어가는 것 — 은 **타임스탬프가 붙은 메시지**(이벤트)로 오간다.

그런데 여기서 순차 실행에는 없던 문제가 생긴다. 결과가 순차 실행과 동일하려면 각 LP는 다음 제약을 지켜야 한다.

> **Local causality constraint**: 각 LP는 자신에게 온 이벤트를 **타임스탬프의 비내림차순**으로 처리해야 한다. 모든 LP가 이를 지키면, 병렬 실행의 결과는 순차 실행과 동일함이 보장된다.

이유는 직관적이다. 시각 10의 이벤트를 먼저 처리해 버렸는데 나중에 시각 7짜리 메시지가 도착하면, 시각 7의 이벤트가 바꿨어야 할 상태를 이미 지나쳐 버린 것이다 — 과거가 미래에 영향을 주는 **인과 오류**(causality error)다.

문제의 핵심은 이것이다. **LP는 "앞으로 더 이른 타임스탬프의 메시지가 도착하지 않을지"를 스스로 알 수 없다.** 내 FEL의 최소 시각이 10이라도, 다른 LP가 곧 시각 7짜리 메시지를 보낼지 모른다. 이 불확실성을 어떻게 다루느냐에 따라 PDES의 두 학파가 갈린다. 안전할 때까지 기다리는 **conservative** 방식과, 일단 처리하고 틀리면 되돌리는 **optimistic** 방식이다.

## Conservative 동기화: 안전이 보장된 것만 처리한다

Chandy–Misra–Bryant(CMB) 계열의 conservative 방식은 원칙이 단순하다. **인과 오류가 절대 일어날 수 없다고 보장된 이벤트만 처리한다.** 보장은 링크 단위로 만든다. 링크가 메시지를 보낸 순서대로 전달하고(FIFO) 각 LP가 타임스탬프 순으로 메시지를 보낸다고 가정하면, 링크 $i$로 마지막에 받은 메시지의 시각 $T_i$는 "이 링크로는 앞으로 $T_i$ 이전 메시지는 안 온다"는 보장이 된다. 그러면 LP가 안전하게 처리할 수 있는 시각의 상한은

$$
T_{\text{safe}} = \min_i T_i
$$

즉 **모든 입력 링크가 보장한 시각의 최솟값**까지는 마음 놓고 이벤트를 처리해도 된다. 이 식이 말하는 것은 conservative 방식의 약점이기도 하다 — 링크 하나라도 조용하면(메시지가 안 오면) $T_i$가 갱신되지 않아 LP 전체가 멈추고, 서로가 서로를 기다리는 **deadlock**(교착)에 빠질 수 있다.

CMB의 해법이 **null message**다. 실제 이벤트가 없어도 "나는 적어도 시각 $t$까지는 너에게 아무것도 안 보낸다"는 내용 없는 보장 메시지를 보내, 상대의 $T_i$를 전진시켜 deadlock을 푼다.

그런데 null message가 의미 있으려면, LP가 미래의 일을 약속할 수 있어야 한다. 여기서 conservative 방식 성능의 열쇠인 **lookahead**가 나온다. lookahead $L$은 "내 로컬 시계가 $t$일 때, 나는 시각 $t + L$ 이전에는 다른 LP에 어떤 영향도 줄 수 없다"고 약속할 수 있는 값이다. 이 약속은 모델의 **물리적 근거**에서 나온다. 예컨대 어떤 베이의 최소 공정 시간이 30분이라면, 지금 도착한 lot조차 최소 30분 뒤에야 다음 베이로 넘어간다 — lookahead 30분. 반송 시간의 하한도 같은 역할을 한다. lookahead가 있으면 null message에 자기 로컬 시계 $t$ 대신 $t + L$을 담아 보낼 수 있다. 링크 $i$의 송신 LP가 알려 온 로컬 시계를 $T_i$, 그 LP의 lookahead를 $L_i$라 하면 보장은

$$
T_{\text{safe}} = \min_i \,(T_i + L_i)
$$

로 커진다. 이 식이 말하는 것: **lookahead가 클수록 각 LP가 남을 기다리지 않고 혼자 전진할 수 있는 구간이 길어져 병렬성이 산다.** 반대로 $L \to 0$이면 모든 LP가 한 발짝마다 서로를 확인해야 하므로 사실상 순차 실행에 통신 비용만 얹은 꼴이 된다. Conservative PDES의 성패는 사실상 "모델에서 얼마나 큰 lookahead를 발굴하느냐"에 달려 있다.

## Optimistic 동기화: 일단 달리고, 틀리면 되돌린다

Jefferson의 **Time Warp**(1985)는 정반대 철학이다. **기다리지 말고 낙관적으로 처리하라. 인과 오류가 실제로 나면 그때 되돌리면 된다.** 각 LP는 자기 FEL에 있는 이벤트를 보장 없이 계속 처리해 나간다. 그러다 자기 로컬 시계보다 과거의 타임스탬프를 단 메시지 — **straggler**(뒤늦게 도착한 과거 메시지) — 가 도착하면, 그 시각 이전의 상태로 **rollback**(되감기)한다.

되돌리려면 세 가지 장치가 필요하다.

- **State saving**: 주기적으로 LP 상태의 스냅샷을 저장해 둔다. rollback은 straggler 시각 이전의 가장 가까운 스냅샷으로 복원하는 것이다.
- **Anti-message**: rollback으로 무효가 된 구간에서 이미 다른 LP에 보내 버린 메시지가 있을 수 있다. 그 메시지를 "취소"하는 짝 메시지(anti-message)를 보낸다. 받은 쪽이 그 메시지를 이미 처리했다면 그쪽도 rollback해야 하므로, **취소가 연쇄적으로 번질 수 있다.**
- **GVT**(Global Virtual Time): 저장한 스냅샷과 보낸 메시지 기록을 무한정 쌓을 수는 없다. GVT는 **전체 시스템이 절대 그 이전으로는 되돌아가지 않는 시각의 하한** — 모든 LP의 로컬 시계와, 아직 전송 중인 모든 메시지의 타임스탬프를 통틀어 잡은 최솟값 — 이다. GVT 이전의 스냅샷·메시지 기록은 안전하게 폐기할 수 있고, 이 정리 작업을 **fossil collection**이라 부른다. 최종 결과 수집(통계 확정)도 GVT 이전 구간에 대해서만 한다.

Optimistic 방식의 매력은 분명하다. **lookahead가 필요 없다.** 병렬성을 모델러가 수작업으로 발굴하는 것이 아니라, 실행이 스스로 발견한다 — 실제로 인과가 얽히지 않는 구간이라면 보장 없이도 그냥 병렬로 지나간다. 대가도 분명하다. 상태 저장·복원의 메모리와 시간 비용이 상시로 들고, 최악의 경우 rollback이 rollback을 부르는 **thrashing**(되감기 폭주)으로 진짜 계산보다 되감기에 시간을 더 쓸 수 있다.

## 현실적인 평가: PDES는 만능 가속기가 아니다

PDES는 1980년대부터 수십 년 연구된 분야지만, "DES를 코어 수만큼 빠르게"라는 약속은 일반적으로는 실현되지 않았다. 이유는 기술이 아니라 구조에 있다.

- **모델 분할과 lookahead 발굴이 모델마다 수작업이다.** 어떤 분할이 통신을 줄이고 부하를 균형 있게 나누는지, 어디에 물리적 lookahead가 숨어 있는지는 자동으로 나오지 않는다.
- **통신 비용이 이득을 잠식하기 쉽다.** 이벤트 하나의 처리가 마이크로초 단위인데 LP 간 메시지 교환·동기화가 그보다 무거우면, 나누는 순간 손해다.

그래서 실무의 우선순위는 이렇다. **(1)** 먼저 [[posts/foundations/simulation-and-digital-twin/20-inside-a-des-engine|20편]]의 replication 병렬 — 독립 반복 실행을 코어별로 하나씩 — 로 충분한지 확인한다. 통계적 정밀도가 목적이라면 대부분 이걸로 끝난다. **(2)** 안 되면 모델을 단순화해 단일 실행 자체를 가볍게 할 수 없는지 본다. **(3)** "단일 실행 한 번이 병목이고, 더 줄일 수 없다"가 확인됐을 때만 PDES를 꺼낸다. 이 분야의 표준 참고서는 Fujimoto의 *Parallel and Distributed Simulation Systems* (Wiley, 2000)다.

## 곁가지: GPU로 DES를 돌릴 수 있나

딥러닝 시대라 "GPU로 시뮬레이션 가속"이 자연스러워 보이지만, DES는 GPU와 궁합이 나쁘다. GPU는 수천 개의 스레드가 **같은 연산을 서로 다른 데이터에** 일제히 수행할 때(SIMD) 빛나는데, DES는 이벤트 종류마다 분기하는 불규칙한 제어 흐름과 FEL·큐 같은 포인터 기반 자료구조가 본체라 이 패턴에 들어맞지 않는다.

GPU가 잘 먹히는 경우는 따로 있다.

- **동일 모델의 수천 replication을 배치로** 돌리는 경우 — 실행 하나하나는 느려도 수천 개가 같은 코드 경로를 밟으므로 SIMD에 맞는다.
- **시간 스텝 기반** 시뮬레이션 — [[posts/foundations/simulation-and-digital-twin/16-agent-based-simulation|ABM]]이나 물리 시뮬레이션처럼 매 스텝 모든 개체가 같은 갱신 규칙을 적용하는 경우.

이 구분은 뒤(10부 예정)에서 다룰 **RL 학습용 벡터화 환경** — 강화학습이 요구하는 수천 개의 병렬 환경을 GPU 배치로 돌리는 설계 — 논의의 복선이다.

## 정리

- 모델을 **LP**로 분할하면 각 LP가 자기 FEL·로컬 시계로 병렬 실행하되, **local causality constraint**(각 LP는 이벤트를 타임스탬프 순으로 처리)를 지켜야 순차 실행과 같은 결과가 보장된다.
- **Conservative(CMB)**: 안전이 보장된 시각 $\min_i (T_i + L_i)$까지만 처리. deadlock은 **null message**로 풀고, 성능은 모델의 물리적 근거에서 나오는 **lookahead**가 좌우한다.
- **Optimistic(Time Warp)**: 일단 처리하고 straggler가 오면 **rollback**. state saving·**anti-message**·**GVT**(fossil collection)가 뒷받침한다. lookahead가 필요 없는 대신 상태 저장 비용과 thrashing 위험을 진다.
- PDES는 만능이 아니다. **replication 병렬 → 모델 단순화 → 그래도 단일 실행이 병목일 때만 PDES** 순으로 접근한다.
- GPU는 이벤트 구동 DES와는 궁합이 나쁘고, **replication 배치**와 **시간 스텝 기반**(ABM·물리) 시뮬레이션에서 힘을 낸다.

여기까지가 심화 편(7부)이다. 다음 8부에서는 agent-based 시뮬레이션을 *제대로* 만드는 방법론 — 설계·보정·검증 — 을 [[posts/foundations/simulation-and-digital-twin/22-odd-protocol|ODD 프로토콜]]부터 본다.

## 참고문헌

- K. M. Chandy, J. Misra, "Distributed simulation: A case study in design and verification of distributed programs", *IEEE Transactions on Software Engineering* SE-5(5), pp. 440–452, 1979. [DOI](https://doi.org/10.1109/TSE.1979.230182)
- D. R. Jefferson, "Virtual time", *ACM Transactions on Programming Languages and Systems* 7(3), pp. 404–425, 1985. [DOI](https://doi.org/10.1145/3916.3988)
- R. M. Fujimoto, *Parallel and Distributed Simulation Systems*, Wiley, 2000.
