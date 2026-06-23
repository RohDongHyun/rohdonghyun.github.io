---
title: 05. Self-Attention and Pretrained LM (BERT)
date: 2026-06-24
tags:
  - NLP
---

> 서울대학교 데이터사이언스대학원 이재윤 교수님의 '인공신경망을 통한 자연어처리' 강의를 정리한 글입니다. (Manzil Zaheer, Jacob Devlin의 슬라이드 일부 포함)

[[posts/foundations/nlp/04-lstm-and-seq2seq|앞 글]]에서 RNN/LSTM 기반 seq2seq와 attention을 다뤘다. 이 글은 RNN을 **완전히 버리고 attention만 남긴** transformer, 그리고 그 위에서 꽃핀 **pretraining/fine-tuning 패러다임**과 **BERT**를 다룬다.

> transformer와 self-attention의 세부 메커니즘(QKV, multi-head, position embedding, masking, encoder-decoder 구조)은 [[posts/foundations/introduction-to-dl/11-transformer-and-self-attention]]에서 그림과 함께 자세히 설명한다. 여기서는 NLP 맥락에서 핵심만 복습하고, **contextual representation·BERT**에 무게를 둔다.

## 왜 RNN을 버리는가

RNN은 2015~2017년 NLP의 사실상 표준이었지만 세 가지 한계가 있었다.

- **장거리 의존(long-range dependency)** 학습이 어렵다 (vanishing gradient).
- **본질적으로 순차적(inherently sequential)** 이다. $h^{(t)}$를 구하려면 $h^{(t-1)}$가 필요해, 시점을 건너뛸 수 없다.
- 그래서 **병렬 처리에 강한 현대 하드웨어(GPU)와 맞지 않는다.** 학습이 느리다.

대안으로 CNN을 생각할 수 있다. 층 단위 병렬화가 쉽고 "대부분의 의존은 국소적"이라는 직관에 맞지만, 장거리 의존을 잡으려면 층을 많이 쌓아야 하고 이웃 단어가 달라도 같은 가중치를 쓴다는 단점이 있다.

Vaswani et al.(2017) "Attention is all you need"는 발상을 뒤집었다. **RNN을 완전히 제거하고, attention만 남기자.** 이것이 transformer다.

## Self-Attention 복습

Transformer의 핵심은 **self-attention**이다. 예를 들어 "The animal didn't cross the street because **it** was too tired"에서 `it`이 `animal`을 가리킨다는 정보를, `it`의 표현 안에 녹여 넣고 싶다. self-attention은 각 단어가 **문장 내 다른 모든 단어와 상호작용**해 중요한 곳에 가중치를 준다.

각 토큰의 embedding에서 **query($Q$), key($K$), value($V$)** 를 만들고, query와 key의 유사도로 attention을 계산한다.

$$
A(Q, K, V) = \text{softmax}\!\left(\frac{Q K^T}{\sqrt{d_k}}\right) V
$$

$\sqrt{d_k}$로 나누는 것은 내적값이 너무 커져 softmax가 한쪽으로 쏠리는 것을 막는 scaling이다. 핵심 보강 장치들은 다음과 같다 (자세한 그림은 [[posts/foundations/introduction-to-dl/11-transformer-and-self-attention|DL 시리즈]]).

- **Multi-head attention**: CNN의 multi-channel처럼, 여러 head를 병렬로 두어 서로 다른 관계를 학습한다. self-attention 자체는 단순한 가중 평균이라 표현력이 제한적인데, 여러 head로 이를 보완한다.
- **Position embedding**: self-attention은 입력 순서에 무관(permutation invariant)하다. 하지만 언어에서 순서는 결정적이다("only"의 위치만 바꿔도 의미가 달라진다). 그래서 위치 정보를 담은 벡터를 token embedding에 **더해준다**(learned 또는 sinusoidal).
- **Masking**: 생성(decoder)에서는 미래 단어를 보면 안 된다. 효율을 위해 전체 sequence를 한 번에 계산하되, 미래 위치의 attention score를 $-\infty$로 만들어 가린다.

self-attention의 계산량은 $O(n^2 \cdot d)$로 sequence 길이 $n$에 **제곱으로** 늘어난다(RNN은 $O(n \cdot d^2)$). 길이가 길어지면 비싸지만, 병렬화가 쉬워 실전에서는 훨씬 빠르다.

## Transformer가 가져온 것: 거대 모델

Transformer의 진짜 위력은 **확장성(scalability)** 이다. 병렬 처리가 쉬워 **막대한 데이터로 거대한 모델**을 학습할 수 있게 됐다. ELMo(94M) → BERT(110M) → GPT-2(1.5B) → GPT-3(175B)로 파라미터가 폭증한 것이 이를 보여준다.

그런데 거대 모델을 학습하려면 그만큼 많은 **labeled 데이터**가 필요하다. 이 문제를 푸는 것이 다음의 pretraining/fine-tuning 패러다임이다.

## Pretraining / Fine-tuning 패러다임

아이디어는 **학습을 두 단계로 나누는 것**이다.

1. **Pre-training**: 라벨이 필요 없는 방대한 텍스트로 모델 대부분의 파라미터를 미리 학습한다($\Theta$).
2. **Fine-tuning**: 우리가 풀려는 downstream 과제의 **소량 labeled 데이터**로 모델을 특화시킨다($\Theta'$).

대부분의 지식은 pre-training에서 얻고, 과제 특화는 적은 데이터로 빠르게 끝낸다. LSTM(Dai et al. '15), **ELMo**(Peters et al. '18), **OpenAI GPT**(Radford et al. '18), **BERT**(Devlin et al. '18)가 이 흐름을 열었다.

### ELMo: 양방향 LSTM 쌓기

**ELMo**는 양방향 LSTM을 여러 층 쌓아 만든 language model이다. forward LM과 backward LM을 각각 학습하고, 각 층의 hidden state를 조합해 단어의 표현으로 쓴다. 학습 목표는 양방향 log likelihood의 합이다.

$$
\mathcal{L} = -\sum_{i=1}^{n} \Big( \log p(x_i \mid x_1, \dots, x_{i-1}) + \log p(x_i \mid x_{i+1}, \dots, x_n) \Big)
$$

ELMo는 forward와 backward를 **따로** 학습해 이은 것이라, 진정한 양방향(동시에 좌우를 보는) 표현은 아니다. 이를 한 번에 해결한 것이 BERT다.

## BERT: Masked Language Model

Devlin et al.은 더 일반적인 LM을 제안했다. 앞 단어만 보는 게 아니라 **앞뒤 단어를 모두 조건으로** 다음 단어를 예측한다.

$$
\mathcal{L} = -\sum_{i=1}^{n} \log p(x_i \mid x_1, \dots, x_{i-1}, x_{i+1}, \dots, x_n)
$$

이걸 효율적으로 구현한 것이 **MLM(Masked Language Model)** 이다. 입력 문장의 일부 단어를 가린(mask) 뒤, 가린 자리를 맞히도록 학습한다. 이는 word2vec의 **CBOW**와 비슷한 **self-supervised learning**이다.

> Obama was **[MASK]** in 1961 in Honolulu, Hawaii, **[MASK]** **[MASK]** after the territory was admitted to the **[MASK]** ... → born / two / years / Union 등을 예측.

MLM 덕분에 BERT는 **양방향 transformer**를 쓸 수 있다. (GPT는 다음 단어 예측이라 좌→우 단방향이다.)

### Masking 디테일

전체 단어의 **15%** 를 예측 대상으로 고르되, 항상 `[MASK]`로 바꾸지는 않는다. fine-tuning 시점엔 `[MASK]` 토큰이 없어 학습-추론 불일치가 생기기 때문이다. 그래서:

- 80%는 `[MASK]`로 치환: `went to the store → went to the [MASK]`
- 10%는 임의 단어로 치환: `went to the store → went to the running`
- 10%는 그대로 둠: `went to the store → went to the store`

### 추가 목표: NSP

BERT는 문장 간 관계를 배우려고 **NSP(Next Sentence Prediction)** 도 함께 썼다. 문장 B가 문장 A의 실제 다음 문장인지, 아니면 무작위 문장인지를 맞힌다. 다만 후속 연구 **RoBERTa**는 NSP가 별 이득이 없다고 밝혔다.

## BERT Fine-tuning

BERT의 큰 장점은 downstream 과제에 붙이기가 **매우 쉽다**는 점이다.

- **입력이 하나의 packed sequence**다. 예를 들어 SQuAD(질의응답)에서 질문과 본문을 따로 처리할 필요 없이 `[CLS] 질문 [SEP] 본문` 형태로 **이어 붙이면(concat)** 된다.
- **추가되는 파라미터는 과제별 출력층 하나뿐**이다. SQuAD라면 답의 시작/끝을 가리키는 start/end 벡터(2×1024) 정도만 새로 둔다. 이미 학습된 3억 개 파라미터에 비하면 미미하다. 그리고 전체를 fine-tune한다.

이 단순한 틀로 문장 분류(MNLI), 개체명 인식(NER), 질의응답(SQuAD) 등 다양한 과제를 처리한다.

## 실험 결과가 말해주는 것

- **GLUE 벤치마크**: BERT-large가 기존 SOTA(OpenAI GPT, ELMo 등)를 큰 폭으로 앞섰다(평균 81.9 vs GPT 75.2).
- **방향성**: MLM(양방향)은 좌→우 단방향보다 수렴은 약간 느리지만 절대 성능이 훨씬 좋다. 특히 단어 단위 과제(SQuAD)에서 단방향은 크게 뒤진다.
- **모델 크기**: 클수록 좋다. 110M → 340M으로 키우면 라벨이 3,600개뿐인 작은 과제(MRPC)에서도 향상되며, **개선이 아직 한계에 도달(asymptote)하지 않았다.** 이것이 이후 초거대 모델 경쟁의 신호탄이 됐다.

## 남은 과제 (당시 관점)

- **계산 복잡도**: self-attention의 길이 제곱 의존을 어떻게 줄일까? 더 긴 context를 어떻게 다룰까?
- 왜 거대 모델이 **라벨이 적은 과제에서도** 잘 작동하는가?
- pre-training과 downstream 과제의 관계, 어떤 텍스트(Wikipedia? News?)로 pretrain할지.
- BERT가 실제로 어떤 언어 현상을 포착(혹은 못)하는가.

## 정리

- RNN의 순차성·장거리 의존 한계를 극복하려 **RNN을 버리고 attention만 남긴** 것이 transformer다.
- self-attention은 $\text{softmax}(QK^T/\sqrt{d_k})V$로 계산하며, multi-head·position embedding·masking으로 보강한다 ([[posts/foundations/introduction-to-dl/11-transformer-and-self-attention|상세]]).
- transformer의 확장성은 **pretraining/fine-tuning** 패러다임을 가능케 했다: 방대한 비라벨 데이터로 pretrain, 소량 라벨로 fine-tune.
- **BERT**는 **MLM**(15%, 80/10/10 규칙)으로 양방향 transformer를 학습하고, 과제별 출력층 하나만 붙여 다양한 downstream을 푼다. 모델이 클수록 성능이 계속 오른다.
