---
title: 01. Word Representation
date: 2026-06-24
tags:
  - NLP
---

> 서울대학교 데이터사이언스대학원 이재윤 교수님의 '인공신경망을 통한 자연어처리' 강의를 정리한 글입니다.

## NLP와 단어 표현

**자연어 처리(Natural Language Processing, NLP)**는 컴퓨터가 사람의 언어를 이해·처리하거나 직접 언어를 생성하도록 하는 분야이다. 스마트 스피커처럼 사람과 기계 사이의 소통 도구, 자동 번역처럼 사람과 사람 사이의 소통 도구, 그리고 문서 요약·감성 분석 등 다양한 곳에 쓰인다.

이 분야의 가장 밑바탕이 되는 질문은 **"단어를 어떻게 표현할 것인가(word representation)"** 이다. 컴퓨터는 'movie', 'film' 같은 글자 덩어리(symbol) 자체로는 의미를 알 수 없기 때문에, 단어를 컴퓨터가 다룰 수 있는 **숫자(벡터)** 로 바꿔주어야 한다. 이렇게 언어의 의미를 다루는 학문을 **semantics**, 그 의미를 자동으로 구성·추론하는 방법을 연구하는 분야를 **computational semantics**라고 한다.

## 단순한 방법의 한계

왜 단어의 '의미'까지 학습해야 하는지, 가장 단순한 NLP 예시인 **문장 분류(sentence classification)** 로 살펴보자. 영화 리뷰를 보고 `[very good, good, neutral, bad, very bad]` 중 하나로 분류하는 문제다.

![](/images/50be2831-8e76-4cf5-a087-ab821051b6d5-image.png)

가장 단순한 방법은 **Bag of Words(BoW)** 이다. 단어의 순서는 무시하고 어떤 단어들이 등장했는지(빈도)만 본 뒤, 단어마다 점수를 매겨 합치는 방식이다. 예를 들어 다음과 같이 단어별 의미를 외워둘 수 있다.

- `[I, this, movie]` → neutral
- `[hate]` → very bad
- `[love]` → very good

이렇게 하면 "I hate this movie"는 very bad, "I love this movie"는 very good으로 잘 분류된다. 하지만 이 방식은 다음 같은 상황에서 무너진다.

- 학습 데이터: "This is a good movie" → 😀 / "This is a great movie" → 😀 / "This is a terrible film" → ☹️
- 테스트: "This is a wonderful film" → ??

여기엔 두 가지 문제가 있다.

1. 모델은 `film`을 학습할 때 'terrible film'에서만 봤으므로 `film`을 부정적으로 외울 수 있다. 하지만 `film`은 사실 중립적인 단어이고 `movie`와 거의 같은 뜻이다. 모델은 **`film`과 `movie`가 비슷하다는 사실을 모른다.**
2. `wonderful`은 학습 데이터에 한 번도 안 나온 **처음 보는 단어**다. 모델은 이 단어를 어떻게 처리해야 할지 모른다.

즉, 단어를 그냥 외우는 게 아니라 **단어의 의미(word semantics)** 를 어느 정도 학습해야 한다.

## 단어 의미를 표현하는 두 관점

단어의 의미를 표현하는 데는 크게 두 가지 큰 관점이 있다.

1. **Lexical semantics (어휘 의미론)**: 단어들의 의미가 서로 어떻게 연결되는지를 본다. 사전, 시소러스(thesaurus), 온톨로지처럼 **사람이 직접 만든 자원**에 의존한다.
2. **Distributional semantics (분포 의미론)**: 단어가 실제 텍스트 안에서 다른 단어들과 어떻게 어울려 쓰이는지를 본다. **말뭉치(corpus)로부터 자동으로** 만들어진다.

### Lexical semantics와 WordNet

대표적인 lexical 자원이 **WordNet**이다. WordNet은 각 단어에 대해 뜻풀이(definition)뿐 아니라, 다른 단어들과의 관계를 함께 정리해 둔다.

- **synset**: 같은 의미를 공유하는 동의어 묶음
- **hypernym (상위어)**: 더 일반적인 개념 (예: purple의 상위어는 color)
- **hyponym (하위어)**: 더 구체적인 개념 (예: color의 하위어는 purple, red, blue …)

![](/images/0f7e15f3-56c8-431c-a6ec-239e708ec572-image.png)

이렇게 사람이 정리한 지식은 유용하지만 몇 가지 본질적인 한계가 있다.

- **뉘앙스를 놓친다.** 예컨대 `mark`는 `scratch`(긁힌 자국), `home run`, `target`, `stain`(얼룩) 등과 동의어로 묶이지만, 이들이 모두 같은 의미라고 볼 수는 없다.
- **새로운 단어·새로운 뜻을 따라가지 못한다.** '댕댕이', '꾸안꾸' 같은 신조어를 일일이 최신 상태로 유지하는 것은 불가능하다.
- **사람의 노동이 필요하고, 그래서 주관적이다.**

이런 한계 때문에 "그렇다면 단어를 도대체 어떻게 표현해야 하는가?"라는 질문으로 돌아가게 된다.

## 단어를 벡터로 표현하기

computational semantics를 하려면 결국 단어라는 symbol을 **숫자들의 나열, 즉 벡터**로 바꿔야 한다. 단어 벡터의 핵심 아이디어는 다음과 같다.

> **벡터 공간에서 가까이 있는 단어일수록 의미가 비슷하다.**

예를 들어 `newspaper`, `magazine`, `biking`을 벡터로 나타내면, 의미가 비슷한 `newspaper`와 `magazine`은 비슷한 방향을 가리키고 `biking`은 다른 방향을 가리킨다.

![](/images/f4c93f32-c39b-4c11-bb82-932cba668983-image.png)

두 단어의 유사도는 벡터의 **내적(dot product)** 이나 **코사인 유사도(cosine similarity, 길이로 정규화한 내적)** 로 측정한다. 위 예시에서 cosine(newspaper, magazine) = 0.99로 매우 높고, cosine(newspaper, biking) = 0.39로 낮게 나온다.

### One-hot vector의 한계

가장 단순한 벡터 표현은 **one-hot vector**이다. 어휘 사전의 단어마다 차원 하나씩을 배정하고, 해당 단어 자리만 1, 나머지는 0으로 둔다.

![](/images/fd197c18-1006-44e8-840f-4c016d953d94-image.png)

하지만 이 방식은 두 가지 큰 문제가 있다.

- **차원이 너무 크다.** 벡터 길이가 어휘 전체 크기($\vert V \vert$)와 같아 매우 비효율적이다.
- **유사도가 없다.** 모든 단어가 서로 **직교(orthogonal)** 한다. 의미가 비슷한 `movie`와 `film`의 내적조차 0이 되어, "비슷하다"는 개념 자체가 표현되지 않는다.

one-hot의 유사도 문제를 WordNet 동의어로 메우는 방법도 생각할 수 있지만, 앞서 본 lexical semantics의 한계(불완전성, 확장성, 여전히 큰 차원)를 그대로 물려받기 때문에 좋은 해법이 아니다. 다만 "**단어를 다른 단어들로 표현한다**"는 발상 자체는 매우 흥미롭다. WordNet 없이 이걸 어떻게 할 수 있을까?

## Distributional Semantics

그 답이 **분포 의미론(distributional semantics)** 이고, 핵심은 **분포 가설(distributional hypothesis)** 이다.

> "If A and B have almost identical environments, we say that they are synonyms" — Harris, 1954
> "You shall know a word by the company it keeps" — Firth, 1957

즉, **비슷한 의미의 단어는 비슷한 문맥(context)에서 쓰인다**는 것이다. 동의어 사전을 사람이 만들 필요 없이, 어떤 단어 $w$(예: *banking*)가 등장하는 수많은 문맥을 모아서 $w$의 표현을 자동으로 만들어낸다.

![](/images/2847a30b-7adb-40db-b087-1a54aa94869d-image.png)

예를 들어 'banking' 주변에 'crises', 'regulation', 'system' 같은 단어들이 자주 등장한다면, 바로 이 **문맥 단어들이 'banking'을 대표**하게 된다. 이 방식은 사람의 노동이 전혀 필요 없다는 게 큰 장점이다.

### Count 기반: TF-IDF와 PMI

분포 가설을 가장 직접적으로 구현하는 방법은 **빈도를 세는 것(counting)** 이다.

- **TF-IDF (word-to-document)**: 단어가 어떤 문서에 얼마나 자주 등장하는지를, 흔한 단어의 영향력을 낮춰가며 수치화한다.
- **PMI (Pointwise Mutual Information, word-to-word)**: 두 단어가 함께 등장하는 정도가 우연보다 얼마나 큰지를 측정한다.

이렇게 만든 단어 벡터는 분포 가설을 잘 담아내지만, 여전히 문제가 있다.

- 벡터가 **너무 길다** (길이 = $\vert V \vert$).
- **희소(sparse)** 하다. 대부분의 값이 0이다.

낮은 차원의 조밀한(dense) 벡터가 다루기 쉽고, 실제로 여러 과제에서 성능도 더 좋다 ([Baroni et al. 2014](https://aclanthology.org/P14-1023/)). 그래서 긴 벡터를 짧게 줄이는 두 가지 방향이 등장한다.

1. **행렬 분해(SVD) / 차원 축소(PCA)**
2. **Word2Vec** (예측 기반 신경망 모델)

### (참고) PCA와 SVD

**PCA(주성분 분석)** 는 고차원 데이터를 더 적은 차원으로 근사하는 기법이다. 데이터의 **분산이 가장 큰 방향(주축)** 을 찾아 그 축으로 데이터를 다시 표현하면, 적은 수의 축만으로도 데이터의 핵심을 담을 수 있다.

![](/images/4107a473-d4ed-4305-bfdd-3a3fb36f3be8-image.png)

**SVD(특이값 분해)** 는 단어-문맥 행렬 $X$ ($w \times c$)를 세 행렬의 곱으로 분해한다.

$$
X = W S C
$$

여기서 $W$의 열은 잠재 공간(latent space)의 축이고, 대각 행렬 $S$의 **특이값(singular value)** 은 각 축이 데이터를 얼마나 잘 설명하는지(중요도)를 나타낸다. 특이값이 큰 순서대로 상위 $k$개의 축만 남기는 것을 **Truncated SVD**라고 하며, 이렇게 하면 단어를 $k$차원의 짧은 벡터로 표현할 수 있다.

> PCA·SVD는 차원 축소·행렬 계산 관점에서 더 깊게 다룰 수 있는 주제다. 여기서는 "긴 단어 벡터를 짧게 줄이는 한 가지 방법"이라는 정도로 이해하면 충분하다.

## Word2Vec

**Word2Vec** (Mikolov et al., 2013)은 count 기반 방법과 달리 문맥을 **세지(count) 않는다.** 대신, 단어 벡터가 **주변 단어를 예측(predict)하기에 충분한 정보**를 담도록 학습시킨다. 두 가지 구조가 있다.

- **Skip-gram**: 가운데 단어(center word)로 **주변 단어들**을 예측한다.
- **CBOW (Continuous Bag of Words)**: 주변 단어들로 **가운데 단어**를 예측한다.

![](/images/440f7ac0-8225-4e8b-9a6a-e1fb044cd752-image.png)

> CBOW는 BERT의 **masked language model**과 발상이 비슷하다. 둘 다 정답을 사람이 달아줄 필요 없이 문장 자체에서 학습 신호를 얻는 **self-supervised** 방식이고, 분포 가설에 기반한다. 다만 BERT는 더 긴 의존 관계를 다룰 수 있는 훨씬 크고 복잡한 구조라는 점이 다르다.

### Skip-gram 자세히 보기

Skip-gram의 동작을 정리하면 다음과 같다.

1. 큰 말뭉치(긴 단어 나열)가 주어진다.
2. 어휘 사전의 모든 단어를 벡터로 표현한다.
3. 텍스트의 각 위치 $t$마다 가운데 단어 $c$와 주변(문맥) 단어 $o$가 있다.
4. $c$와 $o$의 벡터 **유사도**를 이용해 $c$가 주어졌을 때 $o$가 나올 확률 $P(o \vert c)$를 계산한다.
5. 이 확률이 커지도록 단어 벡터를 계속 조정한다.

![](/images/4e913747-3e7c-42b0-bffd-812f52047f60-image.png)

윈도우 크기 $m$ 안의 모든 문맥 단어에 대해 위 확률을 곱한 것이 목적 함수(likelihood)다.

$$
L = \frac{1}{T} \prod_{t=1}^T \prod_{-m \leq j \leq m, \, j \neq 0} P(w_{t+j} \mid w_t; \theta)
$$

여기서 $T$는 말뭉치의 전체 토큰 수, $\theta$는 학습 대상인 단어 벡터들이다. 곱을 다루기 어려우니 음의 로그를 취해 **최소화 문제**로 바꾼다.

$$
J(\theta) = -\frac{1}{T} \sum_{t=1}^T \sum_{-m \leq j \leq m, \, j \neq 0} \log P(w_{t+j} \mid w_t; \theta)
$$

그렇다면 $P(o \vert c)$는 어떻게 계산할까? 가운데 단어 벡터 $v_c$와 문맥 단어 벡터 $u_o$의 **내적(유사도)** 에 **softmax**를 씌운다.

$$
P(o \mid c) = \frac{\exp(u_o^T v_c)}{\sum_{i=1}^V \exp(u_i^T v_c)}
$$

softmax는 임의의 실수 값들을 확률 분포로 바꾸는 함수다. 가장 큰 값을 강조하면서('max') 작은 값에도 약간의 확률을 남기기 때문에('soft') 이런 이름이 붙었다.

### Normalization 문제

위 식에는 치명적인 문제가 하나 있다. 분모가 **어휘 전체 $\vert V \vert$에 대한 합**이라는 점이다. 어휘가 수십만 개라면, 단어 하나의 확률을 구할 때마다 수십만 번의 내적과 합을 계산해야 하므로 현실적으로 불가능하다.

이를 해결하는 두 가지 실용적인 방법이 있다.

1. **Hierarchical softmax**: 단어들을 트리 구조로 배치해 분할 정복(divide-and-conquer) 방식으로 계산량을 줄인다.
2. **Negative sampling**: 정답 단어와 무작위로 뽑은 소수의 '오답(negative)' 단어들만 비교한다.

이 두 방법은 다음 글에서 자세히 다룬다.

## 정리

- 단어를 단순히 외우는 것만으로는 의미·유사도·신조어를 처리할 수 없어, **단어 의미 학습**이 필요하다.
- 의미를 표현하는 두 관점: 사람이 만든 자원에 의존하는 **lexical semantics**(WordNet)와, 말뭉치에서 자동으로 얻는 **distributional semantics**.
- 단어를 벡터로 표현하는 흐름: **one-hot**(비효율·유사도 없음) → **TF-IDF/PMI**(길고 희소) → **SVD/PCA**(차원 축소) → **Word2Vec**(예측 기반).
- **Word2Vec의 skip-gram**은 가운데 단어로 주변 단어를 예측하도록 학습하며, softmax의 전체 어휘 정규화 문제는 hierarchical softmax·negative sampling으로 해결한다.
