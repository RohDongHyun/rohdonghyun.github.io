---
title: 02. Word Representation (continued)
date: 2026-06-24
tags:
  - NLP
---

> 서울대학교 데이터사이언스대학원 이재윤 교수님의 '인공신경망을 통한 자연어처리' 강의를 정리한 글입니다. [[posts/foundations/nlp/01-word-representation]]에서 이어집니다.

이전 글에서 Word2Vec의 **skip-gram**까지 살펴봤다. 이번 글에서는 skip-gram의 계산 부담을 줄이는 **negative sampling**, 자주 등장하는 단어를 덜 보는 **subsampling**, 단어 임베딩이 담아내는 흥미로운 성질, 그리고 그 한계를 보완하는 **subword(FastText)** 와 최신 연구들을 다룬다.

## Recap: skip-gram의 계산 부담

skip-gram은 가운데 단어 $c$로 주변 단어 $o$를 예측하도록 단어 벡터를 학습한다. 학습 목적은 음의 로그 확률을 최소화하는 것이다.

$$
J(\theta) = -\frac{1}{T} \sum_{t=1}^T \sum_{-m \leq j \leq m, \, j \neq 0} \log P(w_{t+j} \mid w_t; \theta)
$$

여기서 확률 $P(o \vert c)$는 softmax로 계산된다.

$$
P(o \mid c) = \frac{\exp(u_o^T v_c)}{\sum_{i=1}^V \exp(u_i^T v_c)}
$$

문제는 이전 글에서도 지적했듯 **분모가 어휘 전체 $\vert V \vert$에 대한 합**이라는 점이다. 단어 하나의 확률을 구할 때마다 수십만 개 단어와 내적을 해야 하므로 매 학습 단계가 지나치게 무겁다.

여기서 핵심 질문이 나온다. **정말로 어휘 안 모든 단어에 대한 점수가 필요할까?**

## Negative Sampling

### 발상의 전환: multi-class에서 binary로

지금까지 우리는 $P(w_{t+j} \vert w_t)$를 "$V$개 중 하나를 고르는 **multi-class 문제**"로 풀고 있었다. 그래서 전체 어휘에 대한 정규화가 필요했다.

그런데 이걸 **binary 문제**로 바꿔 생각하면 어떨까? 즉 "이 단어가 가운데 단어의 진짜 주변 단어인가, 아닌가?"라는 예/아니오 문제로 보는 것이다. 이렇게 하면 softmax 대신 **sigmoid** $\sigma(x) = \frac{1}{1+e^{-x}}$를 써서 확률을 표현할 수 있다.

$$
P(o \mid c) = \sigma(u_o^T v_c) = \frac{1}{1 + \exp(-u_o^T v_c)}
$$

이제 전체 어휘에 대한 합이 사라진다.

### 진짜 단어 vs. k개의 가짜 단어

binary로 바꿨다면 학습 신호를 만들기 위해 '아니오' 예시도 필요하다. 그래서 진짜 주변 단어(positive) 하나에 대해, 무작위로 뽑은 $k$개의 **negative(가짜) 단어**를 비교한다. 최대화할 목적 함수는 다음과 같다.

$$
J_t(\theta) = \log \sigma(u_o^T v_c) + \sum_{i=1}^k \mathbb{E}_{j \sim P(w)} \left[ \log \sigma(-u_j^T v_c) \right]
$$

직관적으로 읽으면 이렇다.

- 첫 번째 항: 진짜 주변 단어 $o$가 등장할 확률을 **높인다**.
- 두 번째 항: 무작위로 뽑은 단어들이 주변에 등장할 확률을 **낮춘다** ($-u_j^T v_c$에 sigmoid를 씌운 것이므로, $u_j^T v_c$를 작게 만드는 방향).

전체 말뭉치에 대해서는 이를 평균낸다.

$$
J(\theta) = \frac{1}{T} \sum_{t=1}^T J_t(\theta)
$$

> 이 방법을 흔히 **negative sampling**이라 부른다. 더 엄밀하게는 **noise contrastive estimation (NCE)** 이라는 이론적 틀이 있으며, 이를 통해 진짜 분포를 학습할 수 있음이 이론적으로 보장된다 (Gutmann and Hyvärinen 2012; Ma & Collins 2018).

### 하이퍼파라미터: k와 샘플링 분포

negative sampling에는 두 가지 하이퍼파라미터가 있다.

1. **negative sample 개수 $k$**: 데이터가 작을 때는 5~20, 데이터가 클 때는 2~5 정도가 유용하다.
2. **샘플링 분포**: 단어 빈도 분포(unigram) $U(w)$를 $3/4$ 제곱한 분포가 가장 잘 작동한다.

$$
P(w) = \frac{U(w)^{3/4}}{Z}
$$

여기서 $Z$는 전체 합을 1로 만드는 정규화 상수다. $3/4$ 제곱을 하면 **자주 안 나오는 드문 단어가 상대적으로 더 자주 뽑히게** 되어, 흔한 단어에만 학습이 쏠리는 것을 완화한다.

## Subsampling: 너무 흔한 단어 덜 보기

`in`, `the`, `a` 같은 단어는 수억 번씩 등장하지만 정보량이 적다. skip-gram 입장에서는 'France – Paris' 같은 짝에서 많이 배우지, 'France – the' 같은 짝에서는 거의 배울 게 없다.

그래서 너무 흔한 단어는 학습에서 **덜 뽑도록(subsampling)** 한다. 각 단어 $w_i$를 다음 확률로 버린다.

$$
P(w_i) = 1 - \sqrt{\frac{t}{f(w_i)}}
$$

여기서 $f(w_i)$는 단어의 빈도, $t$는 기준 임계값이다. 빈도 $f(w_i)$가 클수록 버려질 확률이 커진다. Mikolov et al. (2013)에 따르면 이 기법만으로도 학습이 2~10배 빨라진다.

## 단어 임베딩이 담는 관계

이렇게 학습된 단어 벡터는 단순한 유사도를 넘어 **단어 사이의 관계**까지 담는다. 가장 유명한 예시가 다음이다.

$$
\text{king} - \text{man} + \text{woman} \approx \text{queen}
$$

왜 이런 일이 가능할까? `woman - man`이라는 벡터는 이 두 단어가 등장하는 **문맥의 차이**를 담는다. 예컨대 `man` 근처엔 `he`가, `woman` 근처엔 `she`가 더 자주 나온다. 이 "성별 차이" 벡터는 `king`과 `queen`의 차이와도 비슷하기 때문에, 위와 같은 벡터 연산이 성립한다.

이런 관계는 country–capital(France–Paris, Japan–Tokyo), 비교급(slow–slower–slowest) 등 다양한 형태로 나타난다. 흥미롭게도 이는 Word2Vec만의 성질이 아니라 더 오래된 단어 임베딩들에서도 관찰되는 일반적인 현상이다.

> **주의: 임베딩은 편향(bias)도 학습한다.** 예를 들어 `computer programmer - man + woman ≈ homemaker` 같은 결과가 나오기도 한다. 임베딩은 말뭉치에 담긴 성별·인종 고정관념을 그대로 반영할 수 있으므로 주의가 필요하다 (Garg et al., PNAS 2018).

## 단어 임베딩의 한계

기본 단어 임베딩은 여러 한계가 있다.

- **표면적 차이에 민감**: `dog`와 `dogs`, `friend`와 `friends`가 완전히 별개의 벡터가 된다.
- **문맥을 반영하지 못함**: `financial bank`(은행)와 `bank of a river`(강둑)의 `bank`가 같은 벡터를 갖는다.
- **지식 주입이 안 됨**: 언어 간 대응(`cat` vs 독일어 `Katze`)이 자동으로 정렬되지 않는다.
- **해석이 어렵고**, 앞서 말한 **편향을 담을 수 있다.**

특히 학습 데이터에 없던 단어(**OOV, Out-of-Vocabulary**)와 드문 단어 문제가 심각하다. 프랑스어·스페인어의 동사는 40가지가 넘는 활용형을 갖고, 핀란드어 명사는 15가지 격을 갖는 등, 형태가 풍부한 언어(morphologically rich language)에서는 더욱 그렇다.

> 문맥을 반영하는 임베딩(contextualized embedding)은 이후 LSTM·self-attention과 ELMo·BERT 같은 pre-trained 모델에서 다룬다.

## Subword Units (FastText)

표면적 차이·OOV 문제의 핵심 원인은 기본 skip-gram이 **단어의 내부 구조를 무시**한다는 데 있다. `doggy`를 한 번도 못 봤다면 `dog`와의 연관성을 전혀 알 수 없다.

해결책은 단어를 **글자 단위 n-gram의 묶음(bag of character n-grams)** 으로 보는 것이다 (FastText, Bojanowski et al. 2017). 예를 들어 단어 `where`를 3-gram으로 쪼개면 다음과 같다.

$$
\text{<wh, whe, her, ere, re>}
$$

여기서 `<`와 `>`는 단어의 시작·끝을 나타내는 특수 토큰이다. 덕분에 단어 `<her>`와 단순 3-gram `her`를 구분할 수 있다.

그리고 단어를 그 단어를 이루는 n-gram 벡터들의 합으로 표현한다. 가운데 단어 $c$와의 유사도는 다음과 같이 재정의된다.

$$
s(w, c) = \sum_{g \in \mathcal{G}_w} z_g^T v_c
$$

- $w$: 주어진 단어
- $\mathcal{G}_w$: 단어 $w$에 등장하는 n-gram들의 집합
- $z_g$: 각 n-gram의 벡터
- $v_c$: 가운데 단어 $c$의 벡터

이렇게 하면 **OOV 단어도 그 단어를 이루는 n-gram 벡터들의 합으로 표현**할 수 있어, 처음 보는 단어 문제가 크게 완화된다. 학습 자체는 skip-gram과 동일하게 진행한다. 실무적으로 짧은 n-gram(n=3)은 문법적(syntactic) 정보를, 긴 n-gram(n=6)은 의미적(semantic) 정보를 잘 잡으며, 보통 $n \geq 3$에서 좋은 결과가 나온다.

FastText는 특히 **드문 단어**와 형태가 풍부한 언어에서 사람의 유사도 판단과의 상관관계를 크게 높여준다. 또한 학습 데이터가 적을 때도 더 안정적(robust)이다.

## 단어 표현을 위한 최근 연구들

단어를 공간 속 **한 점(point)** 으로 보는 것을 넘어, 다른 방식으로 표현하려는 시도들도 있다.

- **Gaussian embedding** (Vilnis and McCallum 2015): 단어를 한 점이 아니라 평균과 분산을 갖는 **연속 분포(가우시안)** 로 표현한다. 분포의 넓이로 단어의 포함 관계나 불확실성을 표현할 수 있다.
- **Box embedding** (Vilnis et al. 2018; Li et al. 2019): 단어를 공간 속 **상자(box) 영역**으로 표현한다. 상자의 포함 관계로 `cat ⊂ mammal` 같은 계층(hierarchy) 관계를 자연스럽게 나타낼 수 있다. WordNet 분류 실험에서 기존 방법들보다 높은 정확도를 보였다.
- **Multimodal(Gaussian mixture) word distribution** (Athiwaratkun and Wilson 2019): 한 단어가 여러 뜻을 가질 때(예: `rock`이 '돌'도 되고 '록 음악'도 됨), 가우시안 혼합(여러 봉우리)으로 표현해 **각 봉우리가 서로 다른 의미**에 대응하도록 한다.

이런 시도들은 모두 "단어를 한 점으로 보는 것"의 한계 — 계층 관계, 다의어, 불확실성을 담기 어렵다는 점 — 를 극복하려는 흐름이다.

## (보충) TF-IDF

이전 글에서 언급한 count 기반 방법 중 **TF-IDF**를 조금 더 풀어 보자. 단어-문서 행렬에서 각 칸은 그 단어가 그 문서에 몇 번 등장했는지를 담는다.

- **TF (Term Frequency)**: 한 문서 안에서 단어가 등장한 빈도. 그 문서에서 자주 나오는 단어일수록 그 문서를 잘 대표한다.
- **IDF (Inverse Document Frequency)**: 단어가 등장한 문서 수의 역수에 기반한 값.

$$
\text{idf}(t) = \log\left(\frac{N}{1 + \text{df}(t)}\right)
$$

여기서 $N$은 전체 문서 수, $\text{df}(t)$는 단어 $t$가 등장한 문서 수다. `the`, `are`처럼 거의 모든 문서에 나오는 단어는 $\text{df}$가 커서 IDF가 작아지고, 따라서 **흔한 단어의 영향력이 자동으로 낮아진다.** TF와 IDF를 곱한 값(TF-IDF)이 단어의 최종 가중치가 되어, "이 문서에서 자주 나오면서 다른 문서에는 잘 안 나오는" 변별력 있는 단어를 강조한다.

## 정리

- skip-gram softmax의 전체 어휘 정규화 부담은, 문제를 **binary로 바꾼 negative sampling**으로 해결한다. 진짜 단어 1개와 $k$개의 가짜 단어를 비교하며, 가짜는 $U(w)^{3/4}$ 분포로 뽑는다.
- **subsampling**으로 너무 흔한 단어를 덜 학습해 속도와 품질을 모두 높인다.
- 단어 임베딩은 `king - man + woman ≈ queen` 같은 **관계**를 담지만, 동시에 **편향**도 담는다.
- 기본 임베딩의 OOV·표면적 차이 문제는 **subword(FastText)** 로, 다의어·계층 문제는 **Gaussian/box/multimodal 임베딩** 같은 후속 연구로 보완된다.
