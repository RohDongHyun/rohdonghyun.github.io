---
title: 13. 구조적 예측(Structured Prediction)
date: 2026-06-24
tags:
  - NLP
---

> 서울대학교 데이터사이언스대학원 이재윤 교수님의 '인공신경망을 통한 자연어처리' 강의를 정리한 글입니다. (Structured Learning 일부 슬라이드는 Graham Neubig의 CMU Advanced NLP 강의에서 인용)

지금까지 다룬 [[posts/foundations/nlp/11-syntactic-parsing|구문 분석]]·[[posts/foundations/nlp/12-semantic-role-labeling|의미역 결정]]·NER에는 공통점이 있다. 출력이 **하나의 라벨이 아니라 서로 얽힌 여러 라벨의 묶음(구조)** 이라는 점이다. 이 글은 그 공통 틀인 **구조적 예측(Structured Prediction)** 을 다룬다. "무엇이 구조인가 → 어떻게 추론(inference)하나 → 어떻게 학습(learning)하나"의 순서로 본다.

## 구조적 예측이란

보통의 분류는 입력 하나에 라벨 하나($x \to y$)를 낸다. 구조적 예측은 **입력 하나에 여러 라벨을 한꺼번에** 낸다 ($x \to y_1 y_2 \cdots y_L$). 그리고 그 라벨들은 **서로 독립이 아니다.** 몇 가지 예를 보자.

- **NER**: "Jay-Yoon is teaching at Seoul National University" → `B-PER O O O B-ORG I-ORG I-ORG`. [[posts/foundations/nlp/12-semantic-role-labeling|앞 글]]에서 본 **BIO 태깅**이다. `I-ORG`는 앞에 `B-ORG`가 있어야만 말이 되므로 라벨끼리 의존한다.
- **Multi-label classification**: 책 한 권에 장르 여러 개(Science Fiction, Thriller...)를 동시에 붙인다. 장르들은 taxonomy(분류 체계)로 서로 묶여 있다.
- **Image segmentation**: 픽셀 하나하나에 라벨을 붙이되, 이웃 픽셀끼리 비슷해야 한다.
- **Image captioning**: 이미지 속 객체 탐지와 문장 생성을 **함께** 한다.

핵심은 **출력 요소 사이의 구조(의존 관계)를 모델이 고려해야 한다**는 것이다. 라벨을 따로따로 예측하면 "`I-ORG`가 `B-PER` 바로 뒤에 오는" 말이 안 되는 조합이 나올 수 있다.

## 1. 고전적 추론: CRF와 Viterbi

### CRF: 라벨 사이에 엣지를 잇다

손글씨 단어 "QUEST"를 글자 단위로 인식한다고 하자. 두 번째 글자가 흐릿해 모델이 `p(U)=0.4`, `p(V)=0.5`로 헷갈린다. 글자만 따로 보면 `QVEST`로 잘못 읽지만, **"앞 글자가 Q면 다음은 U일 확률이 높다"** 는 글자 간 관계를 쓰면 `QUEST`로 바로잡을 수 있다.

이것이 **Conditional Random Field(CRF)** 의 아이디어다. 입력 $\mathbf{x}$가 각 출력 $y_t$로 가는 화살표만 두는 게 아니라, **이웃한 출력 $y_{t-1} \to y_t$ 사이에도 엣지**를 둔다. **linear-chain CRF** 는 다음 형태의 분포다.

$$
p(\mathbf{y} \mid \mathbf{x}) = \frac{1}{Z(\mathbf{x})} \prod_{t=1}^{T} \exp\left\{ \sum_{k=1}^{K} \theta_k f_k(y_t, y_{t-1}, \mathbf{x}_t) \right\}
$$

여기서 feature 함수 $f_k(y_t, y_{t-1}, \mathbf{x}_t)$ 가 **현재 라벨 $y_t$, 직전 라벨 $y_{t-1}$, 입력**을 함께 본다는 점이 중요하다. 즉 **1차(first-order) 의존성** 을 모델링한다. $Z(\mathbf{x})$ 는 확률이 되도록 모든 가능한 $\mathbf{y}$에 대해 합한 정규화 항이다.

$$
Z(\mathbf{x}) = \sum_{\mathbf{y}} \prod_{t=1}^{T} \exp\left\{ \sum_{k=1}^{K} \theta_k f_k(y_t, y_{t-1}, \mathbf{x}_t) \right\}
$$

파라미터 수를 보자. 라벨 종류가 $L$개라면(글자 인식은 $L=26$), 입력→라벨 엣지만 있으면 $O(L)$개로 충분하다. 하지만 라벨→라벨 엣지를 두면 **모든 라벨 쌍**에 가중치가 필요해 $O(L^2)$ 개가 된다. 이 라벨 쌍 가중치 행렬을 **transition matrix(전이 행렬)** 라고 부른다. 구조를 잡는 대가로 파라미터와 계산이 늘어나는 셈이다.

### Viterbi: 최고 점수 경로를 동적 계획법으로

학습된 CRF로 **가장 점수가 높은 라벨 열**을 어떻게 찾을까? 모든 조합($L^T$개)을 다 시도할 수는 없다. **Viterbi 알고리즘** 이 [[posts/foundations/nlp/11-syntactic-parsing|CKY]]처럼 **동적 계획법(dynamic programming)** 으로 이를 푼다. 전제는 다음과 같다.

- 인접한 토큰끼리만 의존한다 (1차/Markov 가정).
- 상태(라벨) 개수가 일정하다.
- emission(각 위치의 라벨 점수)이 경로 전체가 아니라 그 위치에만 의존한다.

알고리즘은 간단하다. ① 각 상태에 도달하는 **최고 점수 경로**만 표시하고, ② 진행하면서 이어지지 않는 경로는 **버린다(pruning)**, ③ 마지막 단계에서 **최고 점수 경로**를 고른다. 비용은 $L$에 대해 **적어도 제곱($O(L^2)$)** 으로 증가한다.

### Viterbi의 한계와 A*

Viterbi는 **최고 경로 하나만** 준다. "2등 경로"는 못 준다. 또 **1차보다 높은 의존성**(예: 세 라벨 전을 봐야 하는 경우)이나 상태 수가 변하는 상황은 다루지 못한다. 이럴 때는 원래 **경로 탐색 알고리즘**인 **A\*** 를 쓴다. A\*는 1차 전이가 아니라 **경로 전체에 정의된 비용 함수**를 쓰고, 상태 수가 가변적이어도 동작한다.

## 2. 구조를 살리는 학습(Structured Learning)

추론을 봤으니, 이제 **무엇을 최소화하도록 학습할지**를 본다. 기본 출발점은 **최대 우도(MLE)** 다. 정답 $Y$의 음의 로그 확률(= cross-entropy)을 최소화한다.

$$
\ell(Y \mid X) = -\log P(Y \mid X) = -\sum_t \log P(y_t \mid X, y_{<t})
$$

그런데 구조적 예측에서 MLE에는 세 가지 약점이 있다.

- **문제 1 — 모든 실수가 같지 않다.** "Please send this package to **Pittsburgh**"를 "...to **Tokyo**"로 틀리면 치명적이지만, "this"를 "a"로 틀리는 건 사소하다. MLE는 이 둘을 똑같이 취급한다.
- **문제 2 — gold standard가 나쁠 수 있다.** 코퍼스에는 우리가 따라 하길 원치 않는 출력(악성 댓글, 허위정보, 구식 번역)이 섞여 있다.
- **문제 3 — exposure bias(노출 편향).** MLE는 학습 때 항상 **정답 문맥**만 보고 다음을 예측한다. 그래서 추론 때 자기가 만든 **실수에 노출된 적이 없어** 한 번 틀리면 회복하지 못한다.

### Hinge Loss와 Cost-augmented Hinge

분류 경계가 데이터를 정확히 가르더라도(perceptron loss = 0) **여유(margin)** 가 좁으면 불안하다. **Hinge loss** 는 정답이 오답보다 **margin $m$ 이상** 더 높은 점수를 받도록 강제한다. $\hat{y}$를 모델 예측, $y$를 정답, $S(\cdot)$를 점수라 하면

$$
\ell_{\text{hinge}}(x, y; \theta) = \max\big(0,\; m + S(\hat{y} \mid x; \theta) - S(y \mid x; \theta)\big)
$$

문제 1을 풀려면 margin을 **실수의 심각도**에 맞추면 된다. `VB→VBP` 같은 사소한 오류엔 작은 margin을, `VB→NN` 같은 치명적 오류엔 큰 margin을 준다. 이것이 **cost-augmented hinge** 다 — margin 자리에 비용 함수 $\text{cost}(\hat{y}, y)$ 를 넣는다.

$$
\ell_{\text{ca-hinge}}(x, y; \theta) = \max\big(0,\; \text{cost}(\hat{y}, y) + S(\hat{y} \mid x; \theta) - S(y \mid x; \theta)\big)
$$

### 비용을 시퀀스로 확장: Structured Hinge

출력이 시퀀스면 비용도 시퀀스 단위로 정의한다.

- **zero-one loss**: 문장이 하나라도 다르면 1, 같으면 0.
- **Hamming loss**: 위치별로 다른 요소 수를 센다. $\text{cost}_{\text{hamming}}(\hat{Y}, Y) = \sum_{j=1}^{|Y|} \delta(\hat{y}_j \neq y_j)$.
- 그 밖에 edit distance, $1-\text{BLEU}$ 등.

**Structured hinge loss(= structured SVM, max-margin loss)** 는 **margin을 가장 크게 위반하는** 오답을 찾아 벌점을 준다.

$$
\hat{Y} = \arg\max_{\tilde{Y} \neq Y} \big[\text{cost}(\tilde{Y}, Y) + S(\tilde{Y} \mid X; \theta)\big]
$$

문제는 이 $\arg\max$를 **거대한 출력 공간 전체에서** 찾는 게 어렵다는 것이다. 비용을 쉽게 계산할 수 있는 경우엔 비용을 탐색(Viterbi 등)에 끼워 넣어 해결한다.

## 3. 출력의 "좋음"을 어떻게 재나

cost·reward를 쓰려면 출력이 얼마나 좋은지 **측정**할 수 있어야 한다. 측정법은 크게 네 갈래다.

- **객관 평가(objective assessment)**: 정답이 딱 정해진 경우(수학 문제, 객관식). GSM8K 같은 데이터셋.
- **사람 평가(human evaluation)**: 직접 점수 매기기(direct assessment, 예: fluency·adequacy·factuality·coherence), 선호 순위(preference ranking, ELO/TrueSkill), 오류 주석(error annotation, MQM). 정밀하지만 느리고 비싸다.
- **기계가 사람 선호를 예측(자동 평가, reward model)**:
  - **embedding 기반**: BERTScore — 참조문과 후보문 토큰 embedding의 코사인 유사도를 idf로 가중합. 비지도.
  - **regression 기반**: COMET — source·reference·hypothesis를 넣어 사람 점수를 회귀로 맞춤. 지도학습.
  - **QA 기반**: GEMBA — LLM에게 "이 번역 0~100점?"이라 직접 묻기. AutoMQM은 오류까지 짚게 한다.
- **downstream 활용(extrinsic)**: 출력 자체가 아니라 그 **유용성**으로 평가. 예: 요약을 QA 정확도로 평가.

이렇게 만든 자동 지표가 사람과 잘 맞는지는 **meta-evaluation**(Pearson·Kendall 상관)으로 검증한다.

## 4. Error와 Risk: 평가지표로 직접 학습하기

평가 지표가 있으면 그것으로 **바로** 학습하고 싶다. 출력의 "나쁨"을 error로 정의하자.

$$
\hat{Y} = \arg\max_{\tilde{Y}} P(\tilde{Y} \mid X), \qquad \text{error}(Y, \hat{Y}) = 1 - \text{eval}(Y, \hat{Y})
$$

문제는 $\arg\max$가 **미분 불가능**하다는 것이다. 이산적 0/1 결정이라 gradient가 거의 모든 곳에서 0이어서 gradient 기반 학습이 안 된다.

해법은 **risk(위험)**, 즉 **error의 기댓값**을 쓰는 것이다. 확률을 목적 함수에 넣어 미분 가능하게 만든다.

$$
\text{risk}(X, Y, \theta) = \sum_{\tilde{Y}} P(\tilde{Y} \mid X; \theta)\, \text{error}(Y, \tilde{Y})
$$

이 합은 모든 가능한 출력에 대한 것이라 **계산 불가능(intractable)** 하다. 그래서 출력 공간 전체 대신 **작은 표본(5~50개)** 만 뽑아 그 위에서 risk를 근사한다(표본 집합 $S$, $Z$로 정규화). 샘플링하면 중복 제거를 꼭 해야 한다.

$$
\text{risk}(X, Y, \theta) = \sum_{\tilde{Y} \in S} \frac{P(\tilde{Y} \mid X; \theta)}{Z}\, \text{error}(Y, \tilde{Y})
$$

Minimum Risk Training은 Shen et al.(2015)이 신경망 기계번역(NMT)에 적용했다.

## 5. 강화학습으로 본 구조적 예측

위의 "샘플을 뽑고, 그 좋음/나쁨(reward)으로 학습한다"는 발상은 곧 **강화학습(RL)** 이다. 환경 $X$, 행동 $A$, 지연된 보상 $R$ 의 틀이다. NLP에서 RL이 필요한 이유는 세 가지다.

- **전형적 RL 상황**: 대화처럼 끝에 가서야 보상이 나오는 경우.
- **잠재 변수**: chain-of-thought처럼 중간 결정을 한 뒤 그 결과로 보상을 받는 경우.
- **시퀀스 단위 평가지표**: BLEU처럼 **문장을 다 생성해야** 점수가 나오는 경우.

### MLE, Self-Training, REINFORCE

정답이 주어지는 지도학습 MLE는 RL 용어로 **모방학습(imitation learning)** — 교사를 흉내 내는 것이다.

$$
\ell_{\text{super}}(Y, X) = -\log P(Y \mid X)
$$

정답이 없으면 모델이 스스로 뽑은 출력 $\hat{Y}$ 를 정답인 척 학습하는 **self-training** 도 가능하다($\ell_{\text{self}}(X) = -\log P(\hat{Y} \mid X)$). 다만 위험해서, 여러 모델이 동의한 문장만 쓰는 co-training(Blum & Mitchell 1998) 같은 보완책을 쓴다.

핵심은 **Policy Gradient / REINFORCE** 다. MLE 손실에 **보상으로 가중치**를 곱한다.

$$
\ell_{\text{REINFORCE}}(X, \hat{Y}) = -R(Y, \hat{Y}) \log P(\hat{Y} \mid X)
$$

보상이 큰 출력은 더 강하게 강화된다. (보상이 항상 1이면 정확히 MLE가 된다.) 이때 **어떤 행동이 보상을 만들었는지** 가리는 **credit assignment(보상 할당)** 가 문제다. 보상이 매 단계 즉시 나오면 쉽지만, roll-out 끝에 한 번만 나오면 어렵다 — 그래서 보통 미래 보상을 **할인(decay)** 해 시간 지연을 반영한다.

### RL 안정화: Baseline, PPO, DPO

샘플링 기반이라 RL은 **불안정**하다. 특히 출력 공간이 클 때(어휘 전체) 심하다. 여러 안정화 기법이 있다.

- **MLE 사전학습 후 RL 전환**(Ranzato et al. 2016).
- **Baseline 빼기**: 문장마다 **기대 보상 $B$** 를 두고, 실제 보상과의 차이로 가중한다. "기대보다 잘했나/못했나"를 학습하는 것이다. baseline으로는 현재 상태에서 보상을 예측하는 선형 모델(이 경우 **actor-critic**)이나 batch 평균 보상을 쓴다.

$$
\ell_{\text{baseline}}(X) = -\big(R(\hat{Y}, Y) - B(\hat{Y})\big) \log P(\hat{Y} \mid X)
$$

- **기존 모델에서 너무 멀어지지 않게 규제**: **KL 정규화** 와 **PPO(Proximal Policy Optimization)**. PPO는 새 정책과 옛 정책의 확률 비 $\text{rat}(\hat{Y}, X) = \frac{P(\hat{Y} \mid X; \theta)}{P(\hat{Y} \mid X; \theta_{\text{old}})}$ 를 **clip** 해 한 번에 크게 점프하지 못하게 막는다.

$$
\ell_{\text{PPO}} = \min\Big(\text{rat}(\hat{Y}, X)\, R(\hat{Y}),\; \text{clip}\big(\text{rat}(\hat{Y}, X),\, 1+\epsilon,\, 1-\epsilon\big)\, R(\hat{Y})\Big)
$$

- **배치 키우기 / experience replay**: 분산이 크니 여러 roll-out을 모아 업데이트하거나, 과거 roll-out을 재사용한다.

### DPO: 보상 모델 없이 선호로 직접 학습

보상 모델을 따로 두는 RLHF(PPO)는 복잡하고 불안정하다. **DPO(Direct Preference Optimization)**(Rafailov et al. 2023)는 **사람의 쌍별 선호(이게 저것보다 낫다)** 로 정책을 **직접** 학습해 더 안정적이다. 더 나은 출력 $Y_w$ 의 확률은 올리고 더 나쁜 출력 $Y_l$ 의 확률은 내린다.

$$
\ell_{\text{DPO}} = \log \sigma\left( \beta \frac{P(Y_w \mid X; \theta)}{P(Y_w \mid X; \theta_{\text{old}})} - \beta \frac{P(Y_l \mid X; \theta)}{P(Y_l \mid X; \theta_{\text{old}})} \right)
$$

원리는 **선호 모델(Bradley-Terry)** 과 **확률로 표현한 보상**을 결합한 것이다. RLHF의 목적함수(보상 최대화 − KL 규제)에서 출발해 최적 정책을 정리하면, 보상 $r(x,y)$ 가 정책 확률비 $\beta \log \frac{\pi(y \mid x)}{\pi_{\text{ref}}(y \mid x)}$ 로 다시 쓰인다. 이를 선호 모델에 넣으면 **별도 보상 모델 없이** 위 손실이 나온다. 실험적으로 DPO는 PPO와 비슷하거나 더 나은 성능을 내면서 sampling temperature 변화에 더 강건했다(IMDb 감정 생성, TL;DR 요약).

## 정리

- **구조적 예측**은 입력 하나에 **서로 의존하는 여러 라벨**을 함께 내는 문제다. NER([[posts/foundations/nlp/12-semantic-role-labeling|BIO 태깅]]), multi-label 분류, segmentation, captioning이 모두 여기 속한다.
- **추론**: 라벨 간 1차 의존성을 모델링하는 **CRF**(transition matrix, $O(L^2)$ 파라미터)와, 최고 점수 경로를 동적 계획법으로 찾는 **Viterbi**. 고차 의존성·가변 상태엔 **A\***.
- **학습**: MLE의 약점(실수 경중·나쁜 gold·exposure bias)을 보완하려고 **hinge → cost-augmented hinge → structured hinge(structured SVM)** 로 margin에 비용을 넣는다.
- 출력의 좋음은 **객관·사람·자동(BERTScore/COMET/GEMBA)·downstream** 으로 측정하고, **risk(=error 기댓값)** 를 표본으로 근사해 평가지표로 직접 학습한다.
- 이는 곧 **강화학습**이다. **REINFORCE**(보상으로 가중한 MLE)에서 출발해 **baseline·PPO·KL 규제**로 안정화하고, 보상 모델 없이 선호로 직접 학습하는 **DPO** 로 이어진다. 지도 MLE는 RL 관점에서 **모방학습**이다.
