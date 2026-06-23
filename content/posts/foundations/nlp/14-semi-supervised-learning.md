---
title: 14. 준지도 학습(Semi-supervised Learning)
date: 2026-06-24
tags:
  - NLP
---

> 서울대학교 데이터사이언스대학원 이재윤 교수님의 '인공신경망을 통한 자연어처리' 강의를 정리한 글입니다.

[[posts/foundations/nlp/13-structured-prediction|앞 글]]에서 구조적 예측의 학습법(hinge loss, REINFORCE)을 봤다. 이 글은 그 마무리로 **미분 불가능 문제의 또 다른 해법(Gumbel-softmax, RAML)** 을 짚은 뒤, 본론인 **준지도 학습(Semi-supervised Learning, SSL)** 으로 넘어간다. 라벨 없는 데이터를 어떻게 학습에 활용하는가가 주제다.

## 미분 불가능 문제, REINFORCE 너머

[[posts/foundations/nlp/13-structured-prediction|앞 글]]에서 본 **REINFORCE** 는 보상으로 가중한 손실로, **보상 함수가 파라미터에 대해 미분 불가능할 때** 쓰는 좋은 방법이었다.

$$
\ell_{\text{self}}(X) = -R(\hat{Y}, Y) \log P(\hat{Y} \mid X)
$$

미분 불가능을 다루는 또 다른 길이 있다.

### Gumbel-softmax: 이산 샘플링을 미분 가능하게

문제의 근원은 **이산적 선택(argmax)** 이다. 카테고리에서 하나를 뽑는 순간 gradient가 끊긴다. **Gumbel-max** 트릭은 카테고리 분포에서의 샘플링을, log 확률에 **Gumbel 노이즈 $G_i$** 를 더한 뒤 argmax를 취하는 것과 동등하게 바꾼다($G_i \sim -\log(-\log(\text{Uniform}(0,1)))$). 하지만 여전히 argmax라 미분이 안 된다.

**Gumbel-softmax**(Jang et al., 2017; Maddison et al., 2017)는 그 argmax를 **온도 $\lambda$ 를 가진 softmax** 로 부드럽게 푼다.

$$
\frac{\exp(x_k / \lambda)}{\sum_{i=1}^{n} \exp(x_i / \lambda)}
$$

온도 $\lambda$ 가 0에 가까우면 거의 one-hot(이산적)이 되고, 크면 균등 분포에 가까워진다. 이렇게 **이산 분포와 연속 분포 사이를 잇는다.** 실전에서는 **straight-through** 트릭과 결합해, **forward pass에서는 이산 샘플** 을 쓰되 **backward pass에서는 연속 근사** 로 gradient를 흘려보낸다(straight-through estimator, Bengio et al. 2013).

### RAML: 보상을 KL의 순서 바꾸기로

**RAML(Reward-Augmented Maximum Likelihood)** 은 RL과 MLE를 KL divergence 관점에서 잇는다. MLE는 정답에 **델타 분포** $\delta(y \mid y^*)$ 를 두고 모델 $p_\theta$ 와의 KL을 줄이는 것과 같다.

$$
\mathcal{L}_{\text{ML}}(\theta; D) = \sum_{(x, y^*) \in D} -\log p_\theta(y^* \mid x)
$$

RL(REINFORCE)도 KL 형태로 쓰면 **보상으로 정의된 분포** $q(y \mid y^*; \tau) = \frac{1}{Z(y^*, \tau)} \exp\{r(y, y^*)/\tau\}$ 와의 KL이 된다. 핵심 통찰은 **RAML이 이 KL의 순서를 뒤집은 것** 이라는 점이다.

$$
\sum_{(x, y^*) \in D} D_{\text{KL}}\big(q(y \mid y^*; \tau) \,\|\, p_\theta(y \mid x)\big) = \mathcal{L}_{\text{RAML}}(\theta; \tau, D) + \text{const}
$$

RL은 $D_{\text{KL}}(p_\theta \| q)$ 를, RAML은 $D_{\text{KL}}(q \| p_\theta)$ 를 최소화한다. 실용적 차이가 크다 — RAML은 **보상 분포 $q$ 에서 샘플을 뽑아 그냥 maximum likelihood** 로 학습하면 되므로, 모델 출력을 매번 샘플링해야 하는 REINFORCE보다 **안정적** 이다.

## 준지도 학습(SSL): 왜 라벨 없는 데이터인가

지도학습은 강력하지만 약점이 있다. **overfitting**, **일반화 부족**(특히 신경망에서 심함), 그리고 결정적으로 **annotation이 비싸다.** 새 도메인을 만날 때마다 수백만 개의 라벨을 새로 달 수는 없다.

핵심 가정은 **"비슷한 데이터는 비슷한 라벨을 가진다(smoothness)"** 는 것이다. 라벨이 없어도 데이터의 **분포·구조** 자체가 정보를 준다.

> 직관: 라벨 데이터만 보면 결정 경계가 애매하다. 하지만 라벨 없는 데이터를 잔뜩 뿌려 보면 **데이터가 뭉친 군집(cluster)의 빈 골짜기** 로 경계를 옮기는 게 자연스럽다(Transductive SVM의 발상).

**준지도 학습(SSL)** 은 **소량의 라벨 데이터 $\{X_i, Y_i\}_{i=1}^{n}$ 와 대량의 라벨 없는 데이터 $\{X_i\}_{i=1}^{m}$ ($m \gg n$)** 를 함께 써, **라벨 데이터만 쓸 때보다 더 나은 예측 규칙** 을 배우는 것이 목표다.

전통적으로 SSL은 세 갈래로 나뉜다.

- **생성 모델(generative)**: $P(X, Y)$ 또는 $P(Y \mid X)\,P(X)$ 를 모델링. $P(X)$ 를 안다고 가정.
- **graph 기반**: $P(Y \mid X)$ 가 그래프/구조에 대해 부드럽다고 가정. 즉 데이터 간 관계를 안다.
- **multi-view**: 서로 다른 관점(view)에서 만든 여러 모델을 활용. (이 강의가 더 집중하는 갈래)

## 신경망 시대의 SSL 기법들

### Self-training과 Data Augmentation

가장 단순한 것이 [[posts/foundations/nlp/13-structured-prediction|앞 글에서 본]] **self-training** 이다. 현재 모델로 라벨 없는 입력의 출력을 뽑아($\hat{Y} \sim P(Y \mid X)$ 또는 argmax), 그것을 정답인 척 학습한다.

$$
\ell_{\text{self}}(X) = -\log P(\hat{Y} \mid X)
$$

문제는 모델이 자기 실수를 강화할 수 있다는 것. 그래서 **noise(잡음) 주입** 이 중요하다. He et al.(2020)은 **dropout** 과 **입력 공간 noise 주입** 이 sequence generation의 self-training 성능을 크게 끌어올린다는 걸 보였다. **Data augmentation** 도 같은 맥락이다 — 이미지라면 회전·노이즈·색 변경으로 라벨을 유지한 채 데이터를 늘린다.

### Self-supervised Learning: 라벨 없이 표현을 배운다

이름이 헷갈리지만 **self-supervised learning(자기지도)** 도 약어가 SSL이다. 데이터를 단순히 늘리는 대신, **좋은 embedding(표현)을 배우는** 데 초점을 둔다 — **증강된(같은 의미의) 데이터는 가깝게, 무관한(다른 클래스) 데이터는 멀게.**

- **Contrastive loss(쌍별 손실)**: 두 입력이 같은 부류($y=1$)면 거리를 줄이고, 다른 부류면 margin $m$ 까지 밀어낸다.

$$
L(x_0, x_1, y) = y \, \|f(x_0) - f(x_1)\| + (1-y) \max\big(0,\, m - \|f(x_0) - f(x_1)\|\big)
$$

- **Triplet loss(거리 비교)**: 기준(anchor) $x_a$, 같은 부류(positive) $x_p$, 다른 부류(negative) $x_n$ 을 한꺼번에 본다. **anchor–positive 거리가 anchor–negative 거리보다 margin 이상 작도록** 한다(metric learning).

$$
L(x_a, x_p, x_n) = \max\big(0,\, m + \|f(x_a) - f(x_p)\| - \|f(x_a) - f(x_n)\|\big)
$$

참고로 [[posts/foundations/nlp/05-self-attention-and-bert|BERT의 MLM]]·LM 목적함수도 라벨 없는 텍스트로 표현을 배우는 자기지도의 일종이다(사전학습에 더 가깝지만).

### Cycle Consistency와 Back-translation

**Cycle consistency(순환 일관성)** 는 "한 도메인으로 변환했다 되돌리면 제자리로 와야 한다"는 제약이다. CycleGAN(Zhu et al., 2017)이 짝지어지지 않은(unpaired) 이미지 변환에 썼다 — $x \to G(x) \to F(G(x)) \approx x$.

$$
x \xrightarrow{\;G\;} \hat{Y} \xrightarrow{\;F\;} \hat{x} \approx x
$$

**텍스트, 특히 기계번역에서는 이것을 back-translation(역번역)** 이라 부른다. 단일 언어 코퍼스(라벨 없는 데이터)를 한 방향 모델로 번역해 가짜 병렬 데이터를 만들고, 되돌아오는 일관성을 학습 신호로 쓴다.

### Knowledge Distillation

**지식 증류(Knowledge Distillation, Hinton et al. 2015)** 는 **이산 출력(정답 라벨)** 대신 **분포 전체** 를 전달해 배우게 한다. teacher의 soft한 출력 분포를 student가 따라가는데, 이때 **온도 $T$** 로 분포를 부드럽게(smoothing) 만든다.

$$
q_i = \frac{\exp(z_i / T)}{\sum_j \exp(z_j / T)}
$$

보통 **작은 student 모델** 에게 큰 teacher의 지식을 옮기는 데 쓴다. SSL 관점에서 중요한 점은, **정답 라벨이 필요 없으므로 라벨 없는 데이터에도 적용** 할 수 있다는 것이다. teacher가 라벨 없는 데이터에 분포를 매겨 주면 student가 그걸로 배운다. (offline·online·self-distillation 변형이 있다.)

## Multi-view: Co-training

**Co-training**(Blum & Mitchell 1998)은 multi-view SSL의 대표다. 데이터를 **서로 다른 관점(view)** 으로 보는 여러 모델을 두고, **여러 모델이 동의한** 라벨 없는 데이터만 골라 학습에 쓴다. 한 모델이 자신 있게 맞춘 예제로 다른 모델을 가르치는 식이라, self-training의 자기 강화 위험을 줄인다. **Cross-view training** 도 비슷한 발상으로, 입력의 부분만 보는 보조 예측이 전체를 보는 주 예측을 따라가도록 해 라벨 없는 데이터를 활용한다.

## 정리

- [[posts/foundations/nlp/13-structured-prediction|REINFORCE]] 외에 미분 불가능을 다루는 길로 **Gumbel-softmax**(이산 샘플링을 온도 softmax로 부드럽게, straight-through와 결합)와 **RAML**(보상 분포 $q$ 와 모델 $p_\theta$ 의 **KL 순서를 뒤집어** RL을 안정적 MLE로 환원)가 있다.
- **준지도 학습(SSL)** 은 비싼 라벨 대신 **대량의 라벨 없는 데이터($m \gg n$)** 를 함께 써 더 나은 모델을 배운다. 근거는 **"비슷한 데이터는 비슷한 라벨"** 이라는 smoothness 가정. 전통적으로 생성·graph·multi-view로 나뉜다.
- 신경망 기법: **self-training**(noise 주입이 핵심)·**data augmentation**, **self-supervised**(contrastive·triplet loss로 표현 학습), **cycle consistency / back-translation**(되돌리기 일관성), **knowledge distillation**(분포를 전달, 라벨 없는 데이터에도 적용).
- **Co-training / cross-view**(multi-view)는 여러 관점 모델이 **동의한** 예제만 써서 self-training의 자기 강화 위험을 줄인다.
