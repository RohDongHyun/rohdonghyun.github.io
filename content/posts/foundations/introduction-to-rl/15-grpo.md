---
title: 15. GRPO (Group Relative Policy Optimization)
date: 2026-06-23
tags:
  - Reinforcement Learning
---
[[posts/foundations/introduction-to-rl/14-rlhf|RLHF]]에서 PPO가 짊어진 가장 무거운 짐은 policy와 맞먹는 크기의 **value network**(critic)였다. **GRPO** (Group Relative Policy Optimization)는 이 critic을 통째로 없앤다. 대신 같은 prompt에 대해 여러 답을 뽑아 **그 그룹의 평균을 baseline으로** 삼는다. DeepSeekMath에서 제안되어 DeepSeek-R1의 핵심 학습 알고리즘으로 쓰이며 널리 알려졌다.

> 참고: [DeepSeekMath (Shao et al., 2024)](https://arxiv.org/abs/2402.03300)

## 핵심 아이디어: critic 대신 group baseline

[[posts/foundations/introduction-to-rl/09-actor-critic-policy-gradient|Actor-Critic]] 글에서, advantage를 구할 때 **baseline**을 빼면 expectation은 그대로 둔 채 variance를 줄일 수 있다고 했다. PPO는 그 baseline 역할을 하는 $V(s)$를 학습된 critic으로 추정한다. 비싸지만 정확한 방식이다.

GRPO의 발상은 단순하다. **굳이 value network를 학습하지 말고, baseline을 Monte-Carlo로 직접 만들자.** 하나의 prompt $x$에 대해 현재 policy로 $G$개의 답 $\{y_1, \dots, y_G\}$을 샘플링하고, 각각을 reward model로 채점해 $\{r_1, \dots, r_G\}$를 얻는다. 그러면 이 그룹의 평균이 곧 baseline이 된다. 각 답의 advantage는 그룹 내에서 표준화한 값으로 정의한다.

$$
\hat{A}_i = \frac{r_i - \mathrm{mean}(r_1, \dots, r_G)}{\mathrm{std}(r_1, \dots, r_G)}
$$

이것이 **group relative** advantage다. 의미는 직관적이다. "이 답이 같은 질문에 대한 다른 답들의 평균보다 얼마나 더 나은가." 평균보다 좋은 답($\hat{A}_i > 0$)은 확률을 키우고, 못한 답은 줄인다. critic이 추정하던 baseline을, 같은 prompt의 형제 답들이 대신 만들어주는 셈이다.

> 09에서 본 baseline 아이디어가 여기서 그대로 부활한다. 다른 점은 baseline을 *학습된 함수*가 아니라 *그 자리에서 뽑은 sample들의 평균*으로 구한다는 것뿐이다. 덕분에 value network가 통째로 사라진다.

## GRPO Objective

나머지 골격은 [[posts/foundations/introduction-to-rl/10-proximal-policy-optimization|PPO]]와 같다. 같은 clipped ratio를 쓰되, advantage 자리에 위의 group-relative advantage $\hat{A}_i$를 넣고, 한 답 $y_i$를 이루는 모든 토큰에 그 값을 공유시킨다.

$$
J_{\text{GRPO}}(\theta) = \mathbb{E} \left[ \frac{1}{G} \sum_{i=1}^{G} \frac{1}{|y_i|} \sum_{t=1}^{|y_i|} \min\left( \rho_{i,t} \hat{A}_i, \; \text{clip}(\rho_{i,t}, 1-\epsilon, 1+\epsilon) \hat{A}_i \right) - \beta \, \mathrm{D_{KL}}\!\left( \pi_\theta \,\|\, \pi_{\text{ref}} \right) \right]
$$

여기서 $\rho_{i,t} = \dfrac{\pi_\theta(y_{i,t} \mid x, y_{i,<t})}{\pi_{\theta_{\text{old}}}(y_{i,t} \mid x, y_{i,<t})}$는 토큰 수준의 probability ratio다.

PPO와 비교했을 때 달라진 점은 두 가지다.

- **Advantage**: critic이 만든 GAE 대신 group baseline으로 표준화한 $\hat{A}_i$를 쓴다.
- **KL penalty**: RLHF처럼 reward 안에 KL을 섞는 대신, GRPO는 KL을 **objective에 직접** 더한다(보통 unbiased estimator 사용). reference policy에서 멀어지지 않게 잡는 끈의 역할은 동일하다.

## 왜, 어디에 좋은가

- **메모리·구현 절감**: value network가 없으니 학습 중 메모리에 올릴 모델이 하나 줄고, critic 학습에 따르는 불안정성도 사라진다. PPO의 가장 까다로운 부품을 떼어낸 것이다.
- **검증 가능한 보상과 궁합**: 수학·코딩처럼 답의 정오를 규칙으로 채점할 수 있는 문제에서는, 한 prompt에 여러 답을 뽑아 채점하는 것이 자연스럽고 저렴하다. DeepSeek-R1은 reward model 없이 **정답 여부 같은 rule-based reward**와 GRPO만으로 강력한 추론 능력을 끌어냈다.
- **같은 질문 내 비교**: baseline이 "같은 prompt의 다른 답들"이라, 문제 난이도에 따른 보상 크기 차이가 자연히 상쇄된다(어려운 문제든 쉬운 문제든 그룹 내 상대 비교만 남는다).

## 한계와 정리

대가도 있다. baseline을 sample로 만들기 때문에 prompt마다 $G$개(보통 8~64)의 답을 매번 생성해야 하고, 그만큼 inference 비용이 든다. 또 advantage의 품질이 group 크기와 reward 신호의 정확도에 의존한다. 따라서 여러 답을 싸게 채점할 수 있는(특히 검증 가능한) 도메인에서 가장 빛난다.

한 줄로 요약하면, **GRPO = PPO − critic + group-mean baseline**이다. 학습된 value network를 "prompt당 여러 sample"이라는 계산으로 맞바꾼 것으로, [[posts/foundations/introduction-to-rl/09-actor-critic-policy-gradient|baseline(09)]] · [[posts/foundations/introduction-to-rl/10-proximal-policy-optimization|clip(10)]] · [[posts/foundations/introduction-to-rl/14-rlhf|RLHF(14)]]의 부품을 그대로 재조립한 결과다. LLM, 특히 추론 모델 학습의 표준 도구로 빠르게 자리 잡았다.
