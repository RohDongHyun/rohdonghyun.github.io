---
title: 07. 학습 실행 — 첫 baseline부터 계산 예산 관리까지
date: 2026-10-08
tags:
  - AI Scheduling
  - Reinforcement Learning
---

환경 검증과 실험 계획이 끝났다면 이제 학습을 실행할 차례다. 여기서 가장 먼저 얻어야 할 결과는 큰 공장에서의 최고 점수가 아니다. 작은 문제에서 의도한 선택을 배우는지, 어느 단계에 시간이 드는지, 중단된 실행을 어디까지 복구할 수 있는지 확인해야 한다.

이 글은 제품 P/Q를 처리하는 설비군 B에서 유효 lot 하나를 고르는 공통 사례를 사용한다. 투입·route·설비 자격과 다른 설비군의 규칙은 고정한다. 아래 설정과 수치는 **실행 절차를 설명하기 위한 가정**이며 실제 RL 학습 결과나 권장 기본값이 아니다. 라이브러리 동작은 공식 문서로 확인했지만 설치·실행 시험을 수행한 예제는 아니다.

## 1. 첫 알고리즘은 문제의 인터페이스에서 고른다

알고리즘 이름보다 먼저 확인할 것은 행동의 형태와 경험을 얻는 경로다. 이번 문제는 가변 후보 가운데 하나를 고르는 이산 행동이고, 검증한 simulator에서 새 경험을 만들 수 있다. 자격과 hold로 선택 불가능한 후보를 제외하는 action mask도 필요하다. 이 조건에서는 mask를 지원하는 PPO 구현을 첫 학습 후보로 검토할 수 있다.

PPO는 현재 policy로 경험을 수집한 뒤 그 경험을 여러 번 사용해 policy를 갱신하는 방법이다. 2017년에 제안된 널리 쓰이는 방법이며, 최신이라는 이유로 선택하는 것은 아니다. 학습 및 평가 도구와 문제의 행동 표현이 잘 맞는지가 우선이다. [Schulman et al., 2017](https://arxiv.org/abs/1707.06347)

| 후보 | 이번 과제에서 검토할 이유 | 먼저 확인할 비용과 한계 |
|---|---|---|
| MaskablePPO | 이산 후보 선택과 mask를 함께 다루는 첫 기준점 | 반복적인 simulator 경험 수집 비용, 관측 이력이 필요한지 |
| 이산 행동용 off-policy 방법 | 과거 경험을 재사용해 수집 비용을 줄일 가능성 | replay의 후보 ID·다음 상태 mask·종료 처리가 일관되는지 |
| 모방학습으로 초기화 | 현행 규칙이나 좋은 탐색 결과를 학습 출발점으로 활용 | 나쁜 선택도 함께 복제하는지, 초기화 효과를 별도로 비교했는지 |
| 연속 제어용 방법 | 향후 우선순위 점수 조정으로 권한을 바꿀 때 검토 | lot 선택 문제에 그대로 붙일 수 없으며 행동 의미가 바뀜 |

off-policy는 경험을 만든 policy와 학습 대상 policy가 달라도 경험을 활용하는 방식이고, replay는 그런 경험을 저장해 재사용하는 구조다. 이 표는 우열 순위가 아니다. simulator가 매우 느리거나 운영 로그만 있다면 첫 선택부터 달라진다. 특히 일반적인 연속 행동 SAC 설정을 lot 번호에 그대로 적용하는 식의 연결은 피해야 한다.

SB3-Contrib의 MaskablePPO에서는 mask의 `True`가 유효 행동이며, 평가에도 mask를 지원하는 도구가 필요하다. 직접 추론할 때도 mask 전달을 확인한다. 문서 확인 시점에는 recurrent policy를 지원하지 않으므로, 이력이 필요한 설계라면 별도 구현이나 다른 방법을 검토해야 한다. [MaskablePPO 공식 문서](https://sb3-contrib.readthedocs.io/en/master/modules/ppo_mask.html)

## 2. 무엇을 학습하는지 실행 단위로 이해한다

학습 대상은 observation을 받아 후보별 확률을 출력하는 policy network의 parameter다. 보통 미래 return을 추정하는 value network도 함께 학습한다. return은 이후 reward를 할인해 누적한 값이고, advantage는 특정 행동의 결과가 그 상태의 평균적 기대보다 얼마나 좋았는지를 나타내는 추정량이다. optimizer는 policy 목적함수, value 예측 오차, 탐색을 유도하는 entropy 항 등을 반영해 parameter를 갱신한다. network를 공유한다면 한쪽 손실의 변화가 다른 출력에도 영향을 줄 수 있다.

PPO의 대표적인 policy 목적함수는 다음과 같다.

$$
L^{\mathrm{clip}}(\theta)=\mathbb{E}_t\!\left[
\min\!\left(r_t(\theta)\widehat A_t,
\operatorname{clip}(r_t(\theta),1-\epsilon,1+\epsilon)\widehat A_t\right)
\right],\qquad
r_t(\theta)=\frac{\pi_\theta(a_t\mid o_t,m_t)}{\pi_{\mathrm{old}}(a_t\mid o_t,m_t)}
$$

이 식을 최대화한다. 여기서 $r_t(\theta)$는 reward가 아니라 새 policy와 수집 당시 policy의 행동 확률비이며, $\epsilon$은 clipping 구간의 폭을 정하는 값이다. $o_t$는 관측, $m_t$는 당시 mask이며 분자와 분모에서 같은 행동 의미와 유효 집합을 사용한다. 갱신할 때 과거 확률과 $\widehat A_t$는 고정해 취급한다. $\widehat A_t$가 양수이면 해당 행동 확률을 높일 유인이 있지만, 확률 비율이 일정 범위를 넘으면 추가 이득을 제한한다. clipping은 목적함수의 장치이지 모든 상태에서 policy 변화량을 강제로 제한하는 보증이 아니다. 이 식 외에도 value loss와 entropy의 계수, advantage 계산 방식이 실제 갱신에 영향을 준다. [PPO 원논문](https://arxiv.org/abs/1707.06347)

예를 들어 $\widehat A_t=2$, $\epsilon=0.2$, $r_t=1.3$이면 두 항은 2.6과 2.4이고 작은 값 2.4를 사용한다. 좋은 행동의 확률을 더 높여도 이 표본의 목적함수 이득이 그대로 늘어나지는 않는다. 이것만으로 다른 표본이나 공유 network를 통한 변화까지 막히지는 않는다.

## 3. 작은 환경에서 성공 조건을 분리한다

첫 실행에서는 제품 종류와 후보 수를 줄이고 고장 난수를 잠시 고정한다. 다만 setup을 항상 무시해도 되는 문제로 바꾸면 실제 과제의 핵심 갈등까지 사라진다. P를 이어 처리하는 이득과 급한 Q를 먼저 보내는 이득이 모두 나타나는 소수 사례를 남긴다.

진행 순서는 다음처럼 둘 수 있다. 아래 통과 기준은 팀에서 구체적인 수치와 관찰 기간으로 바꾸어야 한다.

| 단계 | 실행 범위 | 통과 근거 |
|---|---|---|
| 연결 시험 | 짧은 episode, 규칙·무작위 유효 행동 | 관측·mask·실행 lot ID 일치, reward 유한값, 종료 정상 |
| 학습 가능성 시험 | 손으로 우열을 확인한 소수 반복 사례 | 여러 초기화에서 유리한 선택 확률이 증가하는지 |
| 작은 확률 환경 | 도착·처리시간 변동 추가 | 학습 seed별 결과와 validation의 규칙 대비 차이 |
| 규모 확대 | WIP·설비·제품 조합을 단계적으로 증가 | 성능 손실 원인과 sample·시간 비용을 함께 확인 |

episode는 reset 이후 종료까지의 한 실행 구간이다. 작은 사례의 성공은 일반화 성능이 아니다. 규모를 늘릴 때 관측·선택 난도·reward 지연 중 무엇이 바뀌었는지 기록한다. 환경·network·reward를 한꺼번에 바꾸지 않는다.

## 4. rollout과 optimizer 작업량을 따로 센다

rollout은 parameter를 갱신하기 전에 policy로 수집한 경험 묶음이다. SB3 PPO에서 수집량은 병렬 환경 수 `n_envs`와 환경별 `n_steps`의 곱이다. `batch_size`는 그 묶음을 나눠 optimizer에 넣는 minibatch 크기다. [SB3 PPO 공식 문서](https://stable-baselines3.readthedocs.io/en/master/modules/ppo.html)

가상의 설정을 `n_envs=8`, `n_steps=256`, `batch_size=256`, `n_epochs=4`로 두자. 한 rollout은 $8\times256=2{,}048$개 transition이다. transition은 관측·행동·reward·다음 관측 등 한 번의 상태 전이에 해당한다. 한 epoch에서 8개 minibatch를 처리하고, rollout당 optimizer step은 조기 종료 없이 모두 수행하면 $8\times4=32$회다. 총 1,024,000개 transition이면 500 rollout과 16,000 optimizer step이 된다.

`n_envs`를 16으로 늘리고 다른 값을 유지하면 rollout도 두 배가 된다. 같은 시간에 더 많이 모으는 변화와 policy 갱신 사이 수집량이 커지는 변화가 함께 생긴다. 병렬화 효과만 비교하려면 무엇을 고정했는지 밝혀야 한다. 총 transition, rollout 크기, epoch 수를 동시에 같은 의미로 유지할 수 있는지 먼저 계산한다.

또한 DES에서는 decision 한 번이 나타내는 물리 시간이 일정하지 않다. transition 수와 함께 시뮬레이션한 달력 시간, episode 수, 실제 소요시간을 기록한다. 후보가 하나뿐인 호출 비율도 함께 남기면 수집량이 늘었는데 선택 경험은 거의 늘지 않은 경우를 볼 수 있다.

## 5. 속도와 정규화가 평가를 바꾸지 않게 한다

시간을 simulator step, observation·mask 생성, policy 추론, parameter 갱신, 평가·저장으로 나누어 측정한다. simulator가 느린데 GPU만 늘리거나, 작은 network에 과도한 프로세스를 붙이면 기대한 속도를 얻기 어렵다. 병렬 환경 수를 늘리기 전에 환경당 메모리와 CPU 경합도 측정한다. subprocess mask 인터페이스는 선택한 구현의 제약을 확인한다.

normalization은 feature나 reward의 크기를 조정하는 처리다. 학습 중 추정한 평균·분산을 쓰면 이 통계 역시 모델의 일부가 된다. 평가 환경은 학습 통계를 불러온 뒤 갱신을 중지하고, 보고할 KPI는 원래 업무 단위로 계산한다. 평가 데이터로 통계를 계속 바꾸면 고정 모델을 평가한다는 계약이 달라진다.

SB3 `VecNormalize` 통계는 별도 저장 대상이다. 평가 예제의 `training=False`, `norm_reward=False`가 각각 통계 갱신과 reward 표시 방식에 어떤 영향을 주는지 확인한다. 또한 SB3 `VecEnv`의 자동 reset 이후 observation은 새 episode의 값일 수 있고, 직전 마지막 값은 `terminal_observation`으로 구분한다. 다른 환경 API와 혼용하면 종료 시 value 계산에 잘못된 상태가 들어갈 수 있다. [SB3 VecEnv 공식 문서](https://stable-baselines3.readthedocs.io/en/master/guide/vec_envs.html)

## 6. checkpoint는 복구 약속과 함께 저장한다

학습 중단 후 모델을 읽어 새 episode에서 계속 학습하는 것과 중단 직전 trajectory를 그대로 이어가는 것은 다르다. 전자는 실용적인 재시작이고, 후자는 훨씬 많은 상태를 요구하는 완전 복원이다. 모델 저장 파일 하나가 simulator와 모든 난수 상태까지 보존한다고 가정하면 안 된다. [SB3 저장 형식 공식 문서](https://stable-baselines3.readthedocs.io/en/master/guide/save_format.html)

| 복구 수준 | 필요한 저장 항목 | 확인 방법 |
|---|---|---|
| 추론 재현 | weight, schema, normalizer, mask·후보 정렬 버전 | 고정 관측의 후보별 출력·선택 비교 |
| 학습 재시작 | 위 항목, optimizer, 학습률 schedule, 누적 counter, 설정 | 새 episode 시작을 기록하고 갱신이 이어지는지 확인 |
| trajectory 연속 복원 | 위 항목, simulator 사건 queue·WIP, 환경별 RNG, 학습 RNG, 수집 buffer와 wrapper 상태 | 짧은 중단 전후 실행의 상태·행동·갱신 비교 |

RNG는 난수 생성기다. 완전한 상태를 저장해도 장치나 병렬 연산의 비결정성 때문에 bit 단위 일치가 보장되는 것은 아니다. 이번 과제에서는 우선 rollout 경계에서 저장하고 새 episode로 재시작하는 규약을 둘 수 있다. 이때 버린 미완료 episode와 추가 수집량을 기록하고, 정상 실행과 재시작 실행을 구분한다.

## 7. 다음 사람이 실행할 수 있는 묶음을 남긴다

최종 산출물은 설정 파일, manifest, 실행 로그, 복구 절차다. manifest에는 코드 commit과 의존성 lockfile, simulator·데이터 hash, observation/action schema, reward 버전, seed별 stream 배정, rollout·batch·epoch, 총 수집 예산, 평가 일정, checkpoint 선택 기준을 넣는다. 읽은 문서의 최신 버전을 설치 권장값으로 복사하지 말고, 실제 검증한 패키지 버전을 고정한다.

재실행자는 먼저 고정 환경에서 작은 검증 사례를 통과시키고, manifest의 데이터와 schema hash를 대조한 뒤 짧은 학습·저장·재시작 시험을 수행한다. 그 후에 본 실행을 시작한다. 의도한 복구 수준이 재시작이라면 기존 episode를 이어간다고 표시하지 않는다. 실험 ID를 유지하되 재시작 구간과 원인을 별도 기록한다.

이 실행 기록은 다음 편에서 성능 저하의 원인을 좁히는 근거가 된다.

## 참고문헌

- Schulman et al. (2017), *Proximal Policy Optimization Algorithms*. [arXiv](https://arxiv.org/abs/1707.06347)
- SB3-Contrib, *MaskablePPO*. [공식 문서](https://sb3-contrib.readthedocs.io/en/master/modules/ppo_mask.html)
- Stable-Baselines3, *PPO*, *Vectorized Environments*, *On saving and loading*. 본문에 각 공식 문서를 연결했다.

이전: [[posts/insights/rl-training-and-operations/06-experiment-methodology|06. 실험 방법론]] · [[posts/insights/rl-training-and-operations/index|시리즈 목차]] · 다음: [[posts/insights/rl-training-and-operations/08-training-diagnostics|08. 학습 진단]]
