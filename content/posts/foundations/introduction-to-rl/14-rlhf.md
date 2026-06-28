---
title: 14. RLHF (Reinforcement Learning from Human Feedback)
date: 2026-06-23
tags:
  - Reinforcement Learning
---
[[posts/foundations/introduction-to-rl/10-proximal-policy-optimization|PPO]]까지 익혔다면, 이제 LLM이 어떻게 RL로 **정렬**(alignment)되는지 볼 수 있다. ChatGPT·InstructGPT를 사람의 의도에 맞게 다듬은 핵심 기법이 바로 **RLHF** (Reinforcement Learning from Human Feedback)다. 한마디로, PPO를 환경이 주는 보상이 아니라 **사람의 선호를 학습한 reward model**에 대해 돌리는 것이다.

> 참고: [InstructGPT (Ouyang et al., 2022)](https://arxiv.org/abs/2203.02155) / [Deep RL from Human Preferences (Christiano et al., 2017)](https://arxiv.org/abs/1706.03741)

## 왜 supervised가 아니라 RL인가

"좋은 답변"을 만드는 데에는 정답이 하나로 정해지지 않는다. 같은 질문에도 훌륭한 답은 여러 갈래이고, 무엇이 더 나은지는 사람이 **비교**해야 안다. 즉 우리에게 있는 것은 "이 답이 정답"이라는 라벨이 아니라 "A가 B보다 낫다"는 **선호(preference) 데이터**다.

- Supervised fine-tuning은 사람이 쓴 시연(demonstration)을 그대로 모방할 뿐, "얼마나 더 좋은가"라는 정도를 반영하지 못한다.
- RL은 **스칼라 선호 점수를 최대화**하는 문제로 바꿔, 시연을 넘어서는 답까지 탐색하며 개선할 수 있다.

여기서 "선호 점수"를 누가 주느냐가 문제인데, 매 학습 step마다 사람에게 물을 수는 없다. 그래서 사람의 선호를 **함수로 압축한 reward model**을 먼저 학습한 뒤, 그 함수를 환경 보상처럼 써서 RL을 돌린다.

## RLHF 3단계 파이프라인

### 1단계: Supervised Fine-Tuning (SFT)

사전학습된 LM을 사람이 작성한 양질의 demonstration으로 fine-tuning해 출발점 policy $\pi^{\text{SFT}}$를 만든다. 이후 모든 단계는 이 모델을 기준점으로 삼는다.

### 2단계: Reward Model 학습

하나의 prompt $x$에 대해 여러 응답을 샘플링하고, 사람이 그 응답들의 우열을 매긴다. 이 비교 데이터로 응답에 점수를 매기는 **reward model** $r_\phi(x, y)$를 학습한다. 선호 확률은 **Bradley-Terry 모델**로 두며, 손실은 다음과 같다.

$$
\mathcal{L}(\phi) = -\mathbb{E}_{(x, y_w, y_l)} \left[ \log \sigma\left( r_\phi(x, y_w) - r_\phi(x, y_l) \right) \right]
$$

여기서 $y_w$는 사람이 선호한(win) 응답, $y_l$은 그렇지 못한(lose) 응답이다. 이 손실은 "선호된 응답의 점수가 그렇지 않은 응답보다 높아지도록" reward model을 민다. 학습이 끝나면 $r_\phi$는 사람의 취향을 흉내 내는 점수 함수가 된다.

> Reward model은 보통 SFT 모델에 스칼라 출력 head를 붙여 초기화한다. 즉 "언어를 이해하는 모델" 위에 "사람 선호를 읽는 눈"을 얹는 셈이다.

### 3단계: PPO로 policy 최적화

이제 LM policy $\pi_\theta$를 reward model에 대해 [[posts/foundations/introduction-to-rl/10-proximal-policy-optimization|PPO]]로 최적화한다. 다만 reward만 좇게 두면 모델이 reward model의 허점을 파고드는 이상한 답(**reward hacking**)으로 폭주하므로, 기준점 $\pi^{\text{SFT}}$에서 너무 멀어지지 않도록 **KL penalty**를 건다.

$$
\max_\theta \; \mathbb{E}_{x \sim \mathcal{D},\, y \sim \pi_\theta} \left[ r_\phi(x, y) - \beta \, \mathrm{D_{KL}}\!\left( \pi_\theta(y \mid x) \,\|\, \pi^{\text{SFT}}(y \mid x) \right) \right]
$$

KL 항의 역할은 [[posts/foundations/introduction-to-rl/10-proximal-policy-optimization|TRPO·PPO]]의 trust region과 같은 정신이다. policy가 reference에서 급격히 벗어나는 것을 막아, 언어 능력을 잃거나 reward model을 속이는 방향으로 무너지지 않게 잡아준다. $\beta$는 그 끈의 팽팽함을 정한다.

> InstructGPT는 여기에 사전학습 데이터의 gradient를 섞는 항(PPO-ptx)을 더해, 일반 NLP 성능이 퇴보(alignment tax)하는 것을 완화했다.

## RL 관점에서 다시 보기

RLHF는 새로운 알고리즘이 아니라, 우리가 배운 부품들의 조립이다.

- **policy**: LLM 자체. state는 "prompt + 지금까지 생성한 토큰", action은 "다음 토큰". 즉 토큰 단위 MDP다.
- **reward**: 응답이 끝났을 때 reward model이 주는 점수(sparse) + 매 토큰의 KL penalty.
- **optimizer**: [[posts/foundations/introduction-to-rl/10-proximal-policy-optimization|PPO]]. actor는 LM, critic은 기대 보상을 추정하는 value head이며, advantage는 [[posts/foundations/introduction-to-rl/11-generalized-advantage-estimation|GAE]]로 계산한다.

즉 RLHF는 "환경 보상 대신 학습된 reward model을 쓰고, reference policy에 KL 끈을 묶은 PPO"라고 요약할 수 있다.

## RLHF-PPO의 비용, 그리고 다음 이야기

이 방식은 강력하지만 무겁다. 학습 중 메모리에 **네 개의 모델**(policy, reference, reward, value)을 동시에 올려야 하고, 특히 policy와 비슷한 크기의 **value network**(critic)를 따로 학습시키는 비용이 크다. 게다가 PPO 자체가 hyperparameter에 민감하고 불안정하다.

이 중 "critic을 없앨 수는 없을까?"라는 물음에서 출발한 것이 다음 글에서 볼 [[posts/foundations/introduction-to-rl/15-grpo|GRPO]]다.
