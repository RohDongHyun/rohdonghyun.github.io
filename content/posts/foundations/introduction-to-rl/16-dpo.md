---
title: 16. DPO (Direct Preference Optimization)
date: 2026-06-23
tags:
  - Introduction to RL
---
[[posts/foundations/introduction-to-rl/14-rlhf|RLHF]]는 강력하지만 절차가 무겁다. reward model을 따로 학습하고, 그 위에서 [[posts/foundations/introduction-to-rl/10-proximal-policy-optimization|PPO]]로 RL을 돌려야 하며, 그 과정은 불안정하고 메모리도 많이 먹는다. **DPO** (Direct Preference Optimization)는 놀라운 주장을 한다. **reward model도, RL loop도 없이**, 선호 데이터만으로 policy를 직접 최적화할 수 있다는 것이다.

> 참고: [Direct Preference Optimization (Rafailov et al., 2023)](https://arxiv.org/abs/2305.18290)

## 출발점은 RLHF와 같다

DPO는 RLHF와 *다른 목적*을 푸는 것이 아니다. 똑같은 KL-regularized 보상 최대화에서 출발한다.

$$
\max_{\pi} \; \mathbb{E}_{x \sim \mathcal{D},\, y \sim \pi} \left[ r(x, y) \right] - \beta \, \mathrm{D_{KL}}\!\left( \pi(y \mid x) \,\|\, \pi_{\text{ref}}(y \mid x) \right)
$$

핵심은, 이 문제의 **최적해가 닫힌 형태로 알려져 있다**는 점이다.

$$
\pi_r(y \mid x) = \frac{1}{Z(x)} \, \pi_{\text{ref}}(y \mid x) \exp\!\left( \frac{1}{\beta} r(x, y) \right)
$$

즉 최적 policy는 reference policy를 보상에 비례해 지수적으로 재가중한 것이다. 여기서 $Z(x) = \sum_y \pi_{\text{ref}}(y \mid x)\exp(r(x,y)/\beta)$는 정규화 상수(partition function)인데, 가능한 모든 $y$에 대한 합이라 실제로 계산하기 불가능하다. 바로 이 $Z(x)$ 때문에 RLHF는 닫힌 해를 직접 쓰지 못하고 PPO로 우회했던 것이다.

## 발상의 전환: 보상을 policy로 표현하기

DPO의 한 수는 위 식을 보상에 대해 거꾸로 푸는 것이다.

$$
r(x, y) = \beta \log \frac{\pi_r(y \mid x)}{\pi_{\text{ref}}(y \mid x)} + \beta \log Z(x)
$$

이 식이 말하는 바가 논문 제목 그대로다 — **"당신의 LM은 사실 reward model이다."** 보상은 다름 아닌 "policy가 reference보다 그 응답을 얼마나 더 선호하는가"의 log-ratio로 표현된다. 굳이 별도의 reward model을 둘 필요가 없다.

이제 [[posts/foundations/introduction-to-rl/14-rlhf|RLHF]]에서 reward model을 학습할 때 썼던 **Bradley-Terry** 선호 손실에 위 보상 표현을 그대로 대입한다. Bradley-Terry는 두 응답의 **보상 차이**에만 의존하는데, 같은 prompt $x$에 대해 $\beta \log Z(x)$ 항은 $y_w$와 $y_l$ 양쪽에 똑같이 들어가므로 **상쇄되어 사라진다.** 계산 불가능했던 $Z(x)$가 증발하는 것이다.

## DPO Loss

그 결과 남는 것은 RL도 reward model도 없는, 단순한 분류 형태의 손실이다.

$$
\mathcal{L}_{\text{DPO}}(\theta) = -\mathbb{E}_{(x, y_w, y_l)} \left[ \log \sigma\!\left( \beta \log \frac{\pi_\theta(y_w \mid x)}{\pi_{\text{ref}}(y_w \mid x)} - \beta \log \frac{\pi_\theta(y_l \mid x)}{\pi_{\text{ref}}(y_l \mid x)} \right) \right]
$$

직관은 명료하다. 괄호 안은 선호된 응답 $y_w$의 **암묵적 보상** $\hat{r}_\theta(x,y) = \beta \log \frac{\pi_\theta(y \mid x)}{\pi_{\text{ref}}(y \mid x)}$가 거부된 응답 $y_l$의 그것보다 얼마나 큰지를 나타낸다. 손실은 이 차이를 키우는 방향으로, 즉 **$y_w$의 확률은 (reference 대비) 올리고 $y_l$의 확률은 내리도록** policy를 민다.

- $\beta$는 reference에서 벗어나는 정도를 조절한다. RLHF의 KL penalty 계수와 같은 역할이 손실 안에 녹아 있다.
- $\sigma$ 안의 항을 잘못 맞히고 있을수록(암묵적 reward model이 순위를 거꾸로 매길수록) gradient가 커져 그 쌍을 강하게 교정한다.

## RLHF·GRPO와의 비교

세 방법 모두 같은 선호 정렬 문제를 풀지만 경로가 다르다.

| | RLHF (PPO) | GRPO | DPO |
|---|---|---|---|
| reward model | 명시적 학습 | 명시적(또는 rule) | **없음** (policy에 암묵) |
| RL loop·rollout | 필요 | 필요 | **없음** (offline) |
| critic | 필요 | 불필요 | 불필요 |
| 안정성·구현 | 복잡·민감 | 중간 | 단순·안정 |
| 데이터 | on-policy 샘플 | on-policy 그룹 | 고정 선호 dataset |

## 한계와 정리

DPO는 고정된 선호 dataset을 쓰는 **offline** 방법이다. 학습 중 새 응답을 탐색하지 않으므로, dataset 분포를 벗어난 영역에서는 취약할 수 있고 선호에 과적합되기도 한다. 반면 reward model + 온라인 RL(PPO/GRPO)은 on-policy 샘플로 새로운 응답을 탐색하며 더 잘 일반화하는 경우가 있어, 두 진영의 우열은 과제에 따라 갈린다.

한 줄로 요약하면, DPO는 **KL-regularized RLHF의 닫힌 해를 Bradley-Terry 손실에 대입해, RL을 한 번의 분류 학습으로 바꾼 것**이다. [[posts/foundations/introduction-to-rl/14-rlhf|RLHF(14)]]의 목적함수와 Bradley-Terry 손실을 그대로 재료로 쓰되, 복잡한 RL 기계를 통째로 걷어낸 우아한 결과다.
