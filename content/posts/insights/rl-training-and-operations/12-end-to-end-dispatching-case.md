---
title: 12. 통합 사례 — 하나의 스케줄 생성 과제를 끝까지 검토하기
date: 2026-10-08
tags:
  - AI Scheduling
  - Reinforcement Learning
---

이제 문제 정의서, 그래프 관측·행동 계약, 환경 검증, 학습 설정, 평가 보고서, 배포·운영 절차가 준비됐다. 마지막으로 **한 snapshot에서 조합을 순차 선택해 스케줄을 만드는 과제**에서 이 문서들이 어떻게 이어지는지 살펴보자. 목표는 어떤 증거로 무엇을 결정하는지 추적하는 것이다.

두 종류의 숫자를 구분한다. 먼저 두 설비·소수 lot의 결정적 예제는 아래 코드를 실행해 직접 검산한 값이다. 이후 RL 후보의 평가·운영 판단에 쓰는 표는 **설명을 위해 만든 가상 결과**다. 실제 RL 모델을 학습하거나 FAB를 운영한 결과는 아니다.

## 1. 과제의 범위와 판정 기준을 고정한다

[[posts/insights/rl-training-and-operations/01-problem-definition|01편]]과 같이 snapshot의 대상 lot을 고정하고, `(설비, lot)`을 선택해 해당 설비 작업열 끝에 추가한다. lot은 한 번만 배정하고 설비는 여러 번 선택할 수 있다. 모든 lot이 배정되면 생성 episode가 끝나며, 완성 스케줄의 대상 lot을 전부 완료할 때까지 평가한다.

조합 선택 중에는 생산 시간이 흐르지 않는다. 설비별 예상 가용시각과 부분 스케줄만 갱신한다. 운영에서 스케줄을 만드는 실제 응답시간은 별도로 측정한다. 기본 과제에는 의도적 대기, 이미 붙인 작업의 순서 수정, 중간 재계획 권한을 넣지 않는다.

가상 도입 계약은 다음과 같이 정했다고 하자.

- 주판정은 목표 기간의 운영 빈도 가중 평균이며, 사례별 baseline 대비 상대 변화율을 평균한다. 시나리오 동등 평균도 함께 보고한다.
- makespan 개선은 최소 3%, TCT 악화는 운영 평균과 각 필수 시나리오에서 모두 2% 이내여야 한다.
- 최소 이득은 신뢰구간 하한, 허용 손실은 상한으로 확인한다. 여러 KPI·시나리오의 동시 판정 규칙도 test 전에 정한다.
- 배정 누락·중복·금지 조합이 없고, 전체 생성 응답시간·최신 상태 검증·fallback 계약을 통과해야 한다.

2%와 3%는 설명용이다. 실제로는 02편처럼 makespan 단축의 업무 가치와 TCT 증가의 비용, validation의 절충 관계를 보고 정한다. test에서 좋은 결과가 나오는 쪽으로 한도나 평균을 바꾸지 않는다.

## 2. 두 lot 검산에 lot 하나만 추가한다

01·04편은 L1과 L2만 사용했다. 여기서는 L1과 같은 처리 특성을 가진 L3를 하나 추가한다. 여전히 모든 lot이 시각 0에 준비되어 있고, setup·고장·납기·추가 도착은 없다.

| lot | M1 처리시간 | M2 처리시간 |
| --- | ----------: | ----------: |
| L1  |       1시간 |       4시간 |
| L2  |       8시간 |      12시간 |
| L3  |       1시간 |       4시간 |

이제 다음 세 스케줄을 비교한다. 완료시각은 L1·L2·L3 순서로 표기한다.

| 스케줄         | 조합 선택의 한 경로   | 설비별 작업열           | 완료시각 | makespan |         TCT |
| -------------- | --------------------- | ----------------------- | -------- | -------: | ----------: |
| 짧은 작업 먼저 | M1-L1 → M1-L3 → M1-L2 | M1: L1,L3,L2 / M2: 비움 | 1,10,2   |   10시간 | 13 lot·시간 |
| 부하 분산      | M1-L2 → M2-L1 → M2-L3 | M1: L2 / M2: L1,L3      | 4,8,8    |    8시간 | 20 lot·시간 |
| 중간 절충      | M1-L1 → M1-L2 → M2-L3 | M1: L1,L2 / M2: L3      | 1,9,4    |    9시간 | 14 lot·시간 |

부하 분산은 짧은 작업 먼저보다 makespan을 20% 줄이지만 TCT는 약 53.8% 늘린다. 중간 절충은 makespan을 10% 줄이고 TCT를 약 7.7% 늘린다. 빠른 설비를 짧은 작업에 먼저 쓸지, 긴 작업을 일찍 시작해 전체 종료를 앞당길지에 따라 두 지표가 달라진다. 어느 스케줄이 업무상 좋은지는 허용 한도로 결정한다.

계산 검산용 비용을 $J=M+TCT$로 두자. 시간과 lot·시간을 각각 비용으로 바꾸는 계수의 수치를 1로 둔 예시이며, 도입 계약 자체는 아니다. terminal reward $-J$는 각각 -23, -28, -23이다. makespan이 가장 작은 스케줄의 reward가 가장 높은 것은 아니다. weighted sum의 계수를 정하는 일과 KPI 허용 한도를 지키는 일의 차이가 드러난다.

## 3. 조합 선택과 비용을 코드로 검산한다

아래 JavaScript는 선택마다 설비 작업열 끝에 lot을 붙인다. 하나를 붙였다고 설비를 후보에서 제거하지 않으며, 중복 lot이나 누락은 오류로 처리한다. 실제 공장 simulator나 학습기는 포함하지 않는다. `handcheck.mjs`에 복사해 `node handcheck.mjs`로 실행할 수 있다.

```javascript
import assert from "node:assert/strict"

const processing = {
  L1: { M1: 1, M2: 4 },
  L2: { M1: 8, M2: 12 },
  L3: { M1: 1, M2: 4 },
}

function buildAndEvaluate(targets, choices) {
  const remaining = new Set(targets)
  const available = { M1: 0, M2: 0 }
  const plan = { M1: [], M2: [] }
  const completion = {}
  const stepRewards = []
  let previousCost = 0

  for (const [machine, lot] of choices) {
    const duration = processing[lot]?.[machine]
    if (
      !remaining.has(lot) ||
      !Object.hasOwn(available, machine) ||
      !Number.isFinite(duration) ||
      duration <= 0
    ) {
      throw new Error(`Invalid pair: ${machine}, ${lot}`)
    }
    const start = available[machine]
    const end = start + duration
    plan[machine].push({ lot, start, end })
    available[machine] = end
    completion[lot] = end
    remaining.delete(lot)

    // All lots are released at time 0; these are planned times.
    const partialMakespan = Math.max(...Object.values(available))
    const partialTct = Object.values(completion).reduce((sum, x) => sum + x, 0)
    const cost = partialMakespan + partialTct
    stepRewards.push(-(cost - previousCost))
    previousCost = cost
  }
  if (remaining.size > 0) throw new Error("Incomplete plan")

  const makespan = Math.max(...Object.values(completion))
  const tct = Object.values(completion).reduce((sum, x) => sum + x, 0)
  const terminalReward = -(makespan + tct)
  assert.equal(
    stepRewards.reduce((sum, r) => sum + r, 0),
    terminalReward,
  )
  return { plan, completion, makespan, tct, stepRewards, terminalReward }
}

const twoLotA = buildAndEvaluate(
  ["L1", "L2"],
  [
    ["M1", "L1"],
    ["M1", "L2"],
  ],
)
const twoLotB = buildAndEvaluate(
  ["L1", "L2"],
  [
    ["M1", "L2"],
    ["M2", "L1"],
  ],
)
assert.deepEqual([twoLotA.makespan, twoLotA.tct], [9, 10])
assert.deepEqual([twoLotB.makespan, twoLotB.tct], [8, 12])

const choices = {
  shortFirst: [
    ["M1", "L1"],
    ["M1", "L3"],
    ["M1", "L2"],
  ],
  balanced: [
    ["M1", "L2"],
    ["M2", "L1"],
    ["M2", "L3"],
  ],
  compromise: [
    ["M1", "L1"],
    ["M1", "L2"],
    ["M2", "L3"],
  ],
}
const expected = { shortFirst: [10, 13], balanced: [8, 20], compromise: [9, 14] }
const results = Object.fromEntries(
  Object.entries(choices).map(([name, path]) => {
    const result = buildAndEvaluate(["L1", "L2", "L3"], path)
    assert.deepEqual([result.makespan, result.tct], expected[name])
    return [name, result]
  }),
)
console.log(JSON.stringify(results, null, 2))
```

증분 reward는 짧은 작업 먼저에서 `[-2,-3,-18]`, 부하 분산에서 `[-16,-4,-8]`, 중간 절충에서 `[-2,-17,-4]`다. 합은 terminal reward와 같으며 이 둘을 함께 부과하지 않는다. 생성은 각 3 step이고 snapshot 기준 시각은 끝까지 0이다.

이 검산은 두 설비에서 단일 공정 작업을 완료하는 예제다. 실제 FAB로 확장할 때는 자격 edge, 진행 중 작업, 처리시간 불확실성을 하나씩 추가하고 [[posts/insights/rl-training-and-operations/04-environment-validation|환경 검증]]을 반복한다. 작은 계산의 일치가 실제 시스템의 재현성을 입증하지는 않는다.

## 4. 그래프 계약과 학습 명세를 연결한다

설비 node에는 예상 가용시각, lot node에는 미배정 여부와 준비·투입 시각, edge에는 설비별 예상 처리시간과 예상 완료시각을 둔다. 선택한 lot의 모든 edge를 제거하고 선택 설비의 예상 가용시각을 갱신한다. 실제 완료시간이나 미래 고장 확정값은 입력에 넣지 않는다.

첫 학습 후보는 단계별 그래프와 mask를 저장하는 masked policy gradient 구현으로 정했다고 하자. terminal 비용을 쓸지 증분 비용을 쓸지, 할인 여부와 정규화, runtime을 고정한다. 현행 계획 방식과 조정한 규칙, 동일 시간 예산의 탐색도 같은 snapshot·권한에서 비교한다. 실제 실행 설정은 [[posts/insights/rl-training-and-operations/07-training-execution|07편]]의 manifest에 남긴다.

| 문서·파일      | 가상 ID                  | 대조할 항목                                        |
| -------------- | ------------------------ | -------------------------------------------------- |
| 문제 정의      | problem-v2               | 조합 append 권한, 고정 대상 lot, 종료 경계         |
| 관측·행동 계약 | graph-v4 / edges-v3      | node·edge 의미, ID 대응, 선택 뒤 갱신              |
| 환경 검증      | env-v5 / verification-v3 | 검산, 중복·누락, reward 합, 실행 시간              |
| 학습 실행      | run-snapshot-B           | training seed, graph buffer, checkpoint·normalizer |
| 모델 선택      | selection-v2             | TCT 한도와 validation 후보 선택 규칙               |
| 최종 시험      | test-pack-v2             | snapshot 묶음, 가중치 근거, 최소 이득·허용 손실    |
| 배포 후보      | bundle-B                 | 모델·그래프 생성·guard·fallback 조합               |

예를 들어 후보 A의 return은 높아졌는데 TCT가 악화됐다면 edge 매핑, 누락 lot, 평가 중단, reward 계수를 조사한다. 어려운 lot의 완료를 evaluator가 기다리지 않고 완료 lot만 합산했다면 먼저 환경을 고친다. 모든 lot을 올바르게 셌다면 업무 허용치와 학습 목적의 불일치를 검토한다. 원인을 나누지 않고 학습률과 reward와 그래프를 한꺼번에 바꾸지 않는다.

이 개발에는 train과 validation만 사용한다. 최종 test 실패를 보고 후보를 수정했다면 그 조건은 개발 자료가 되었으므로 다음 최종 시험은 독립적으로 남겨 둔다.

## 5. 가상 최종 평가에서 두 의사결정을 적용한다

validation으로 후보 B를 고른 뒤 최종 test를 열었다고 가정하자. 다음은 **측정 결과가 아닌 설명용 값**이다. 단순 예제를 확장해 일부 lot이 특정 설비에 몰리는 조건과 설비 한 대가 일시 정지하는 실행 조건을 추가했다. 각 행은 동일 snapshot·실행 변동의 baseline 대비 상대 변화율을 평균한 것이다.

| 시나리오                | 사전 운영 비중 | makespan 개선 $I_M$ | TCT 악화 $D_T$ |
| ----------------------- | -------------: | ------------------: | -------------: |
| 일반 구성               |            0.6 |                 +6% |            +1% |
| 특정 설비 선호 lot 편중 |            0.3 |                 +4% |          +3.5% |
| 설비 한 대의 일시 정지  |            0.1 |                 -2% |          +1.5% |

makespan 개선의 동등 평균은 $(6+4-2)/3\approx2.67\%$, 운영 빈도 가중 평균은 $0.6\times6+0.3\times4-0.1\times2=4.6\%$다. TCT 악화는 각각 2%와 1.8%다. 동등 평균을 주판정으로 정했다면 최소 makespan 개선 3%에 점추정부터 미달한다. 이번 계약은 운영 빈도 가중 평균이므로 그 값을 판정에 사용하고 동등 평균도 공개한다.

첫 번째 질문은 **makespan 이득이 TCT 허용 손실 안에서 충분한가**다. 운영 평균의 점추정은 makespan 4.6% 개선·TCT 1.8% 악화로 기준을 만족하지만, 필수 편중 시나리오의 TCT 3.5% 악화가 한도 2%를 넘는다. 평균의 큰 이득으로 이를 상쇄하지 않는다.

불확실성까지 포함해 운영 makespan 개선 구간이 `[3.4,5.8]%`, 운영 TCT 악화 구간이 `[1.2,1.95]%`, 편중 시나리오 TCT 악화의 상한이 `4.6%`라고 **추가로 가정**해도 결론은 같다. 평균은 통과하지만 필수 시나리오 한도는 통과하지 못한다. 이 구간은 위 세 행에서 계산한 것이 아니다. 선택한 모델과 baseline의 paired 원자료, snapshot·외부 경로의 의존성, 사전 동시 판정 규칙에 따른 분석이 필요하다.

두 번째 질문은 **운영 빈도 가중치가 도입 목적에 타당한가**다. 0.6/0.3/0.1은 대표 기간의 계획 요청 빈도로 미리 추정했다는 가정이다. 출처가 없거나 향후 구성 변화가 크다면 가중치 범위별 민감도를 추가하고 운영 기대 개선 4.6%를 확정하지 않는다. test 이후 편중 시나리오의 비중을 낮춰 통과시키는 방식은 허용하지 않는다.

## 6. 통합 검증과 실제 운영 판단을 연결한다

전체 현장 적용 판단은 **보류**다. 최소 이득은 운영 평균 기준에서 충족한다는 가정이지만, 편중 조건의 TCT 손실이 한도를 넘는다. 이 조건을 개발 자료로 편입해 원인을 조사하고, reward·학습 분포·적용 범위 중 바꿀 요소를 정한다. 제한 적용을 검토하려면 그 조건을 실시간으로 구분할 수 있는지와 나머지 범위의 별도 근거도 필요하다.

배포 통합 시험은 별도로 진행할 수 있다. shadow에서 원본 snapshot, 모든 edge 선택, 완성 스케줄, 전체 생성시간, 최신 상태 재검증과 예약 충돌을 확인한다. 실제로 실행하지 않은 스케줄의 makespan·TCT를 현장 성과로 주장하지 않는다. fallback이 실행되면 모델 제안과 실제 승인·실행한 스케줄을 모두 기록한다.

운영에서 새 snapshot으로 재계획하는 확장에서는 승인한 prefix와 재계획 시점을 고정해 전체 시스템을 비교한다. 고정 snapshot test를 통과해도 공유 자원·누적 WIP가 있는 장기 운영 성과는 별도 확인해야 한다. 아직 완료되지 않은 lot을 TCT 집계에서 빼거나 겹치는 snapshot의 TCT를 중복 합산하지 않는다. 운영 구성이 달라져 가중치를 바꿔야 하면 목표 분포를 새 version으로 정하고 기존 bundle과 후보를 같이 재평가한다.

## 7. 보고서는 보류의 근거와 재검토 조건을 남긴다

최종 보고서는 특정 weight가 아니라 적용 범위·guard·fallback을 포함한 bundle을 대상으로 한다. makespan·TCT와 불확실성, 동등 평균과 운영 평균, 가중치 근거, 필수 시나리오 한도, 전체 생성 응답시간을 연결해 승인·보류 이유를 적는다. 아직 확인하지 못한 원인, 다음에 바꿀 요소, 필요한 예산, 어떤 새 증거가 있어야 재검토할지도 남긴다.

작은 검산은 환경 오류를 찾고, 학습 실험은 좋은 스케줄을 만드는 policy를 찾는다. 최종 평가와 운영 검증은 그 policy를 사용할 조건을 정한다. 더 단순한 계획 방식을 유지하거나 적용을 보류하는 결정도 같은 KPI·절충·가중치 기준 위에서 설명할 수 있어야 한다.

## 함께 읽기

이 사례의 명세와 가상 결과는 직접 구성했다. 방법론과 세부 설명은 [[posts/insights/rl-training-and-operations/02-kpi-and-reward|KPI와 reward]], [[posts/insights/rl-training-and-operations/03-observation-and-action|관측과 행동]], [[posts/insights/rl-training-and-operations/06-experiment-methodology|실험 방법론]], [[posts/insights/rl-training-and-operations/10-policy-operations|배포 검증]]에 연결되어 있다.

이전: [[posts/insights/rl-training-and-operations/11-monitoring-and-retraining|11. 운영과 재학습]] · [[posts/insights/rl-training-and-operations/index|시리즈 목차]]
