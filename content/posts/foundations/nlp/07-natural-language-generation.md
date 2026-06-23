---
title: 07. 자연어 생성(NLG)과 디코딩 전략
date: 2026-06-24
tags:
  - NLP
---

> 서울대학교 데이터사이언스대학원 이재윤 교수님의 '인공신경망을 통한 자연어처리' 강의를 정리한 글입니다. (일부 슬라이드는 CS224n, Holtzman et al. 2020에서 인용)

[[posts/foundations/nlp/06-pretrained-models-and-llm-limitations|앞 글]]까지는 주로 "이해(understanding)" 과제 — 문장 분류, sequence tagging — 와 그 모델(BERT 등)을 봤다. 이 글은 **텍스트를 직접 만들어내는** 자연어 생성(Natural Language Generation, NLG)을 다룬다. 번역·요약·챗봇·이미지 캡셔닝이 모두 여기 속한다.

핵심 질문은 두 가지다. **(1) 학습된 모델로 실제 문장을 어떻게 뽑아낼 것인가(decoding)**, 그리고 **(2) 만들어진 문장이 좋은지 어떻게 평가할 것인가(evaluation)**.

## NLG란 무엇인가

NLG는 모델이 **단어를 하나씩 순서대로 출력**해 문장을 완성하는 과제다. 대표적인 응용은 다음과 같다.

- **기계와의 대화**: 챗봇, 스마트 스피커(Alexa, Google Assistant)
- **기계 번역(machine translation)**: "오늘 수업이 너무 재미있네요" → "Today's class is so much fun."
- **요약(summarization)**: 문서·이메일·회의록을 짧게
- **창작**: 이야기·시 생성
- **이미지 캡셔닝(image captioning)**: 사진 → 설명 문장

이들은 모두 입력 $X$를 받아 텍스트 $Y$를 출력하는 **conditioned generation**(조건부 생성)으로 묶을 수 있다.

| 입력 $X$ | 출력 $Y$ | 과제 |
|---|---|---|
| 영어 문장 | 일본어 문장 | 번역 |
| 긴 문서 | 짧은 설명 | 요약 |
| 발화(utterance) | 응답(response) | 챗봇 |
| 이미지 | 텍스트 | 이미지 캡셔닝 |
| 음성 | 전사(transcript) | 음성 인식 |
| 구조화 데이터(표) | 자연어 서술 | table-to-text |

## 조건부 생성: autoregressive vs. non-autoregressive

[[posts/foundations/nlp/04-lstm-and-seq2seq|seq2seq 글]]에서 본 encoder-decoder 구조가 NLG의 기본 틀이다. encoder가 입력 $X$를 요약하고, decoder가 그것을 조건으로 $Y$를 만든다. 만드는 방식은 크게 둘로 나뉜다.

**Autoregressive(자기회귀)** 방식은 이미 만든 단어를 다시 입력으로 넣어 다음 단어를 예측한다. 우리가 아는 대부분의 생성 모델(seq2seq, GPT)이 이쪽이다.

$$
P(Y \mid X) = \prod_{i=1}^{|Y|} P(y_i \mid X, y_1, \dots, y_{i-1})
$$

**Non-autoregressive(비자기회귀)** 방식은 모든 위치를 **서로 독립적으로, 동시에** 예측한다. sequence labeling이나 비자기회귀 번역이 여기 속한다. 빠르지만 단어 간 일관성을 맞추기 어렵다.

$$
P(Y \mid X) = \prod_{i=1}^{|Y|} P(y_i \mid X)
$$

이 글은 일반적인 autoregressive 생성에 집중한다.

## 디코딩: 학습된 모델에서 문장 뽑기

학습이 끝난 모델은 매 시점 $t$에서 vocabulary의 모든 토큰에 대한 점수 벡터 $S$를 내고, softmax로 확률 분포를 만든다.

$$
P(y_t = w \mid y_{<t}) = \frac{\exp(S_w)}{\sum_{w' \in V} \exp(S_{w'})}
$$

이 분포에서 **실제 단어를 어떻게 고를 것인가**가 디코딩(decoding) 문제다. 학습이 아니라 추론 단계의 이야기다.

### 1) Greedy decoding

가장 단순하다. 매 시점 **확률이 가장 높은 단어 하나**(argmax)를 고른다.

$$
\hat{y}_t = \arg\max_{w \in V} P(y_t = w \mid y_{<t})
$$

빠르지만, 한 번 고르면 되돌릴 수 없다. 앞에서 잘못 고르면 뒤가 통째로 어색해진다.

### 2) Beam search

greedy의 근시안을 완화한다. 매 시점 **확률 상위 $k$개 후보(hypothesis)** 를 동시에 들고 가며, 끝에서 누적 확률이 가장 높은 경로를 역추적(backtrack)해 고른다. $k$를 beam size라 한다. 더 넓게 탐색하지만 여전히 근본적으로는 greedy 알고리즘이고, 전체 경우의 수를 다 보는 것은 아니다.

### 3) Sampling

확률 분포에서 **무작위로 추출**한다. argmax가 아니라 분포를 따르는 표본이다.

$$
\hat{y}_t \sim P(y_t = w \mid y_{<t})
$$

세 방법 모두 쓰이지만, 어느 것이 좋은지는 과제에 따라 다르다. 번역처럼 정답이 비교적 분명한 과제는 beam search가, 이야기 생성처럼 다양성이 중요한 과제는 sampling이 어울린다. 왜 그런지 보자.

## Greedy/beam search의 문제

가장 확률이 높은 문장이 항상 좋은 문장은 아니다. Holtzman et al.(2020)이 보인 두 문제가 유명하다.

**문제 1: 반복(repetition).** beam search($k=32$)로 뽑은 문장이 같은 구절("Universidad Nacional Autónoma de México…")을 끝없이 되풀이한다. 왜일까? **한 번 반복된 구절은 다음에 나올 확률이 더 높아지고, 그게 또 반복을 부르는 양의 피드백 루프(positive feedback loop)** 가 생기기 때문이다. 반복할수록 모델은 점점 더 확신을 갖는다.

**문제 2: 너무 확신함(too confident).** 사람이 쓴 실제 문장의 단어별 확률을 보면 0과 1 사이를 크게 출렁인다. 반면 beam search 출력은 거의 항상 1에 가깝다. **사람의 언어는 적당히 예측 불가능한데, 최대확률 디코딩은 지나치게 매끈하고 단조롭다.** 다양성이 사라진다.

이를 막는 휴리스틱(예: 같은 n-gram을 반복하지 않기)이나 더 정교한 방법(coverage loss, unlikelihood objective 등)도 있지만, 더 근본적인 해법은 **sampling**이다.

## Sampling을 개선하기: top-k와 top-p

순수(pure) sampling은 분포대로 뽑으니 다양하지만 문제가 있다. **vocabulary의 모든 토큰이 후보**가 된다. 대부분의 확률은 소수 단어에 몰려 있어도, 관련 없는 단어들이 꼬리(tail)에 길게 깔려 있고, 이들을 **합치면** 무시 못 할 확률이 된다. 그래서 가끔 엉뚱한 단어가 튀어나온다.

### Top-k sampling

해법은 단순하다. **확률 상위 $k$개 토큰 안에서만** 추출한다. 흔히 $k = 5, 10, 20$을 쓴다.

- $k$를 키우면 → 다양하고 모험적인(diverse/risky) 출력
- $k$를 줄이면 → 무난하고 안전한(generic/safe) 출력 (greedy에 가까워짐)

하지만 **고정된 $k$는 좋지 않다.** 분포가 평평할(flat) 때는 $k$개로 잘라내면 멀쩡한 후보들이 잘려 나가고(너무 빨리 끊음), 분포가 뾰족할(peaky) 때는 $k$개 안에 이미 말이 안 되는 단어까지 들어온다(너무 늦게 끊음).

### Top-p (nucleus) sampling

그래서 **누적 확률 질량(cumulative probability mass)** 기준으로 자른다. 확률 높은 순서로 더해서 **합이 $p$가 될 때까지의 토큰들**에서만 추출한다. 분포가 평평하면 자연스럽게 많은 토큰을, 뾰족하면 적은 토큰을 고르게 된다. **즉, 분포 모양에 따라 $k$가 동적으로 변하는 sampling**이다.

> 정리하면: greedy → beam search → top-k → top-p 순으로, "확실한 것만 고르기"와 "다양하게 뽑기" 사이의 균형을 점점 정교하게 맞춰가는 흐름이다. 이들은 모두 **학습된 모델은 그대로 두고 추론(사후 처리) 단계만 손보는** 방법이다.

### 또 다른 접근: kNN-LM

모델의 분포 자체를 못 믿겠다면? **kNN-LM**(Khandelwal et al., 2020)은 모델 확률에만 의존하지 않는다. 학습 코퍼스의 문맥(phrase)들을 embedding으로 미리 저장해두고, 디코딩 시점에 현재 문맥과 가장 비슷한 이웃($k$-nearest neighbor)을 찾아, 그들 뒤에 실제로 등장한 단어 분포 $P_{kNN}$로 모델 분포 $P_{LM}$을 보정한다.

$$
P(y) = \lambda P_{kNN}(y) + (1 - \lambda) P_{LM}(y)
$$

검색(retrieval)으로 통계를 끌어와 분포를 재조정한다는 점에서, 이후 retrieval-augmented 생성의 아이디어와 통한다.

## 디코딩이 아니라 "학습"이 문제일 수도

위 방법들은 모두 추론 단계의 처방이다. 그런데 반복·부자연스러움의 뿌리가 **학습 방식**에 있을 수도 있다.

### Exposure bias

생성 모델은 보통 **teacher forcing**으로 학습한다. 학습 중에는 decoder의 입력으로 **정답(gold) 단어**를 넣어준다.

$$
\mathcal{L}_{MLE} = -\log P(y_t^* \mid y_{<t}^*)
$$

그런데 실제 생성 시점에는 정답이 없으니 **자기가 방금 만든 단어**를 입력으로 쓴다.

$$
\mathcal{L}_{dec} = -\log P(\hat{y}_t \mid \hat{y}_{<t})
$$

학습 때 보던 입력(완벽한 정답)과 추론 때 보는 입력(불완전한 자기 출력)이 다르다. 이 불일치를 **exposure bias**라 한다. 한 번 실수하면 학습 때 본 적 없는 상태로 빠져 점점 어긋난다.

### 해법들

**Unlikelihood training.** 원치 않는 토큰 집합 $\mathcal{C}$의 확률을 **낮추는** 항을 손실에 더한다.

$$
\mathcal{L}_{UL}^t = -\sum_{y_{neg} \in \mathcal{C}} \log\big(1 - P(y_{neg} \mid y_{<t}^*)\big)
$$

이를 기존 teacher forcing 손실과 합친다($\mathcal{L}_{ULE}^t = \mathcal{L}_{MLE}^t + \alpha\,\mathcal{L}_{UL}^t$). $\mathcal{C}$를 "이미 나온 단어들"로 두면 반복을 억제하고 다양성을 높인다.

**Scheduled sampling.** 학습 중 확률 $p$로 정답 대신 **자기가 디코딩한 토큰**을 다음 입력으로 넣고, 학습이 진행될수록 $p$를 키운다. 추론 환경에 점진적으로 적응시킨다. 실전에서 효과가 있지만 학습 목표가 이상해질 수 있다.

**DAgger(Dataset Aggregation).** 학습 도중 현재 모델로 sequence를 생성해 그것을 학습 데이터에 추가한다. 모델이 실제로 마주칠 상태를 데이터에 포함시키는 셈이다.

### 강화학습으로 보기

scheduled sampling을 더 형식적으로 다루면 **강화학습(RL)** 이 된다. 텍스트 생성을 Markov decision process로 본다.

- **State**: 시점 $t$의 hidden representation
- **Action**: vocabulary의 단어
- **Policy**: decoder의 확률 분포
- **Reward**: 평가 지표(BLEU, ROUGE, CIDEr 등)

다만 **reward로 쓰는 지표는 과제 품질의 '대리(proxy)'일 뿐**이다. 지표가 충분히 좋지 않으면, BLEU 점수만 올라가고 실제 품질은 나아지지 않을 수 있다. 이는 reward 설계의 어려움이라는 점에서 [[posts/foundations/introduction-to-rl/01-introduction-to-reinforcement-learning|강화학습]]의 본질적 고민과 닿아 있다.

## NLG를 어떻게 평가하나

좋은 디코딩을 했다 쳐도, **생성 결과가 좋은지 측정**하는 것 자체가 어렵다. "정답이 하나가 아니기" 때문이다. 평가는 크게 세 갈래다.

### 1) Content overlap metrics (내용 겹침 지표)

생성문과 사람이 쓴 정답문의 **표면적 겹침**을 잰다. 빠르고 널리 쓰인다.

- **N-gram overlap**: BLEU(번역), ROUGE(요약), METEOR, CIDEr 등. 겹치는 n-gram 수로 점수를 낸다.
- **Semantic overlap**: PYRAMID, SPICE, SPIDEr 등. 의미 그래프 수준에서 비교.

문제는 **과제가 open-ended할수록 사람 판단과의 상관이 급격히 떨어진다**는 것이다. 번역 < 요약 < 대화 < 이야기 생성 순으로 나빠진다. 생성의 자유도가 높을수록 "정답과 단어가 겹치는가"는 무의미해진다. 실제로 BLEU와 사람 평가의 상관을 그려보면 대화 과제에서는 거의 무상관에 가깝다(Liu et al., 2016).

### 2) Model-based metrics (모델 기반 지표)

단어를 embedding 공간에 올려 **의미적 거리**로 비교한다.

- **Vector similarity**: embedding 평균, MEANT, YISI 등
- **Word Mover's Distance**: 한 문장의 단어들이 다른 문장의 단어들로 "옮겨가는 데" 드는 거리(Earth Mover's Distance의 응용)
- **BERTScore**(Zhang et al., 2020): BERT의 contextual embedding으로 생성문·정답문 단어를 cosine 유사도로 매칭
- **Sentence Mover's Similarity**: WMD를 문장 단위로 확장

사람 판단과 더 잘 맞지만, **왜 그 점수가 나왔는지 해석하기 어렵다.**

### 3) Human evaluation (사람 평가)

가장 비싸지만 어떤 의미에서 가장 정확하다. fluency(유창성), coherence/consistency(일관성), factuality(사실성), commonsense, style, grammaticality 등을 항목별로 평가한다. 다만 평가자 편향(bias) 같은 문제가 있다.

## 정리

- NLG는 입력 $X$를 받아 텍스트 $Y$를 출력하는 **conditioned generation**이며, 번역·요약·챗봇·캡셔닝이 모두 여기 속한다. 기본 틀은 seq2seq encoder-decoder다.
- **디코딩**은 학습된 분포에서 문장을 뽑는 추론 단계 문제다. greedy → beam search → top-k → top-p(nucleus) 순으로, 확실성과 다양성의 균형을 정교화한다.
- greedy/beam search는 **반복**과 **과도한 확신(다양성 부족)** 문제를 낳는다. sampling, 특히 분포 모양에 따라 후보 수가 변하는 **top-p**가 이를 완화한다.
- 부자연스러움의 뿌리가 학습 방식(**exposure bias**, teacher forcing)에 있을 수 있어 unlikelihood training·scheduled sampling·DAgger·RL 같은 처방이 나왔다.
- **평가**는 content overlap(BLEU/ROUGE, 빠르지만 open-ended 과제에 약함), model-based(BERTScore 등, 사람과 상관 높지만 비해석적), human evaluation(정확하지만 비쌈)의 세 갈래이며, "직접 생성 결과를 들여다보는 것"이 여전히 최선의 판단 중 하나다.
