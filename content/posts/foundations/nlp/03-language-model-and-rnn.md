---
title: 03. Language Model and RNN
date: 2026-06-24
tags:
  - NLP
---

> 서울대학교 데이터사이언스대학원 이재윤 교수님의 '인공신경망을 통한 자연어처리' 강의를 정리한 글입니다.

앞선 두 글에서 **단어 하나를 어떻게 벡터로 표현할지**를 다뤘다. 하지만 언어는 단어들이 **순서대로 이어진 sequence**다. 이 글은 sequence를 어떻게 모델링하는지를 다룬다. 구체적으로 ① 왜 sequence 표현이 필요한지, ② 어떤 NLP 과제들이 있는지, ③ **language model**이란 무엇이고 n-gram·neural network로 어떻게 구현하는지, 그리고 ④ 임의 길이 sequence를 다루는 **RNN**까지 이어간다.

## 왜 sequence 표현이 필요한가

[[posts/foundations/nlp/01-word-representation|첫 글]]에서 본 **bag-of-words(BoW)** 는 단어의 등장 여부·빈도만 세고 **순서를 버린다.** 이 때문에 의미가 정반대인 문장을 구분하지 못한다.

- "There's nothing I don't love about this movie." (이 영화에 대해 사랑하지 않는 게 없다 → **매우 긍정**)
- "I don't like this movie, there's nothing I love about this movie." (이 영화에서 사랑할 게 없다 → **매우 부정**)

두 문장은 거의 같은 단어 집합을 갖지만 감정은 반대다. `don't`, `nothing`, `love`의 **순서와 결합**이 의미를 만들기 때문이다. 또 다른 예로, 대명사 해소(coreference)에는 문장 전체의 이해가 필요하다.

- "The trophy would not fit in the brown suitcase because it was too **big**." → `it` = trophy
- "The trophy would not fit in the brown suitcase because it was too **small**." → `it` = suitcase

`big`/`small` 한 단어 차이로 `it`이 가리키는 대상이 바뀐다. 이런 문제를 풀려면 **sequence 자체를 표현하는 모델**이 필요하다.

## NLP 과제의 분류

NLP 과제는 출력 형태에 따라 크게 나눌 수 있다.

- **Binary classification**: 두 클래스 중 하나. (예: 감정 긍정/부정)
- **Multi-class classification**: 여러 클래스 중 하나. (예: very good / good / neutral / bad / very bad)
- **Structured prediction**: 출력이 **지수적으로 많은** 조합. 출력이 입력 길이에 따라 변하는 sequence 형태다. (예: 품사 태깅 `I/PRP hate/VBP this/DT movie/NN`, 번역)

과제 형태(task formulation)와 모델을 정리하면 대략 이렇다.

| 과제 형태 | 대표 모델/구조 |
|---|---|
| Sentence classification | Feedforward |
| Sequence tagging | RNN, CNN, self-attention |
| Sequence generation | sequence-to-sequence (encoder-decoder) |
| Retrieval | (위 구조들의 조합) |

### Sequence tagging과 span labeling

**Sequence tagging(= sequence labeling)** 은 입력 $X$의 **각 토큰마다 같은 길이의 출력 라벨** $Y$를 다는 과제다.

- **POS tagging(품사 태깅)**: `He/PRON saw/VERB two/NUM birds/NOUN`
- **Lemmatization(원형 복원)**: `saw → see`, `birds → bird`
- **Morphological tagging(형태 태깅)**: `saw → Tense=past, VerbForm=fin`

연속된 토큰 묶음(span)에 라벨을 다는 **span labeling**도 sequence tagging으로 변환할 수 있다. 대표적으로 **NER(Named Entity Recognition, 개체명 인식)** 이 있다.

> Jay-Yoon(PER) is teaching at Seoul National University(ORG).

이를 토큰별 라벨로 바꿀 때 **BIO 표기**를 쓴다. 개체의 **B**eginning, **I**nside, 그리고 개체가 아닌 **O**utside를 구분한다.

> Jay-Yoon/B-PER is/O teaching/O at/O Seoul/B-ORG National/I-ORG University/I-ORG

이렇게 하면 "어디서 개체가 시작하고 끝나는지"를 토큰 단위 분류 문제로 풀 수 있다.

## Language Model (LM)

그렇다면 단어 sequence를 어떻게 **확률적으로 모델링**할까? 핵심 도구가 **language model**이다. LM은 이전 단어들 $(x_1, \dots, x_{i-1})$이 주어졌을 때 **다음 단어 $x_i$를 예측**한다. 이를 모든 위치에 대해 곱하면 문장 전체의 확률이 된다.

$$
P(X) = \prod_{i=1}^{I} P(x_i \mid x_1, \dots, x_{i-1})
$$

즉 LM은 **"어떤 텍스트에 확률을 부여하는 시스템"** 으로 볼 수 있다. 검색창 자동완성, 기계번역, 음성인식 등 거의 모든 곳에 쓰인다.

## N-gram Language Model

신경망 이전 시대의 LM은 **n-gram**이었다. 핵심 아이디어는 **직전 $n-1$개 단어만 본다**는 Markov 가정이다.

$$
P(x_{i} \mid x_1, \dots, x_{i-1}) \approx P(x_{i} \mid x_{i-n+1}, \dots, x_{i-1})
$$

이 확률은 대규모 말뭉치에서 **빈도를 세어** 추정한다. 조건부 확률의 정의에 따라, n-gram 빈도를 (n−1)-gram 빈도로 나눈다.

$$
P(x_i \mid x_{i-n+1}, \dots, x_{i-1}) \approx \frac{\text{count}(x_{i-n+1}, \dots, x_i)}{\text{count}(x_{i-n+1}, \dots, x_{i-1})}
$$

예를 들어 4-gram LM에서 "students opened their"가 1000번, "students opened their books"가 400번 나왔다면 $P(\text{books} \mid \text{students opened their}) = 0.4$다.

### N-gram의 문제

n-gram LM은 빠르고 단순하지만 두 가지 고질적 문제가 있다.

- **Sparsity(희소성)**: 특정 n-gram이 말뭉치에 한 번도 안 나오면 확률이 0이 된다.
  - 분자가 0인 경우(해당 단어 조합이 없음) → 모든 단어에 작은 값 $\delta$를 더하는 **smoothing**.
  - 분모가 0인 경우("students opened their" 자체가 없음) → 더 짧은 context "opened their"로 물러나는 **backoff**.
  - $n$을 키울수록 희소성은 **더 심해진다.** 보통 $n \le 5$.
- **Storage(저장)**: 본 모든 n-gram의 빈도를 저장해야 한다. $n$이나 말뭉치가 커지면 모델 크기가 폭증한다.

## Neural Language Model: Fixed-Window

n-gram의 한계를 넘기 위해 신경망을 도입한다. 가장 단순한 형태가 **fixed-window neural LM**(Bengio et al. 2003)이다. n-gram처럼 고정된 윈도우($n-1$개 단어)만 보지만, 빈도 대신 **단어 embedding과 신경망**으로 다음 단어를 예측한다.

$$
\begin{aligned}
e &= [e^{(1)}; e^{(2)}; e^{(3)}; e^{(4)}] \quad \text{(window 단어들의 embedding 연결)} \\
h &= f(W e + b_1) \quad \text{(은닉층, } f \text{는 비선형 함수)} \\
\hat{y} &= \text{softmax}(U h + b_2) \in \mathbb{R}^{|V|}
\end{aligned}
$$

이 방식의 장점은 n-gram의 두 문제를 모두 없앤다는 것이다. embedding을 쓰므로 처음 보는 단어 조합도 일반화할 수 있어 **sparsity 문제가 없고**, 빈도표를 저장할 필요가 없어 **storage 문제도 없다.**

하지만 한계도 분명하다.

- **고정 윈도우가 너무 작을 수 있다.** 긴 의존 관계를 못 본다.
- 윈도우를 키우면 **모델 파라미터($W$)도 함께 커진다.**
- 같은 단어라도 윈도우 내 **위치 $i$, $j$가 다르면 완전히 다른 가중치로 처리**된다 (위치마다 별도의 $W$ 열).

결국 우리는 **모든 단어를 비슷하게 처리하면서도 임의 길이를 다룰 수 있는** 구조가 필요하다. 그것이 RNN이다.

## Recurrent Neural Network (RNN)

**RNN(Elman 1990)** 은 매 시점 $t$마다 **같은 변환을 반복 적용**하면서, 이전 시점의 hidden state $h^{(t-1)}$를 현재 입력 $e^{(t)}$와 함께 받는다.

$$
h^{(t)} = \sigma\left(W_h h^{(t-1)} + W_e e^{(t)} + b\right)
$$

feedforward와의 차이는 $W_h h^{(t-1)}$ 항 하나다. 이 **순환(recurrent) 연결** 덕분에 hidden state가 과거 정보를 "기억"하며 흘러간다. 핵심은 **모든 시점이 같은 파라미터 $W_h, W_e$를 공유**한다는 점이다.

### 학습: BPTT

RNN 학습은 시간축으로 펼친(unroll) 뒤 역전파하는 **BPTT(Backpropagation Through Time)** 로 한다. 각 시점의 예측에서 나온 loss를 모두 더해 total loss를 만들고, 거꾸로 gradient를 전파한다. 파라미터가 모든 시점에서 공유되므로, 각 시점에서 계산된 **gradient는 누적(accumulate)** 되어 한 번에 업데이트된다.

### RNN의 장단점

- **장점**
  - 임의 길이의 sequence를 처리할 수 있다.
  - Non-Markovian — 이론적으로 긴 의존 관계를 본다.
  - 더 긴 의존을 다루려고 **모델 크기를 키울 필요가 없다.**
  - 모든 시점의 토큰을 **동일한 방식으로** 처리한다.
- **단점**
  - 순차 처리라 **느릴 수 있다**(병렬화 어려움).
  - 이론상 장기 의존이 가능하지만, 실제로는 **vanishing gradient** 등으로 학습이 어렵다. (이 문제와 LSTM 해결책은 [[posts/foundations/nlp/04-lstm-and-seq2seq|다음 글]]에서 다룬다.)

### RNN의 확장

- **Bi-directional RNN**: 앞→뒤(forward)와 뒤→앞(backward) 두 RNN을 따로 돌려 hidden state를 연결(concatenate)한다. 각 토큰이 **좌우 양쪽 context**를 모두 반영하게 된다. 단, 문장 전체가 미리 주어져야 하므로 생성(LM)에는 못 쓰고 인코딩(분류·태깅)에 쓴다.
- **Multi-layer RNN**: RNN을 여러 층으로 쌓는다. 아래층의 hidden state가 위층의 입력이 되어 **더 복잡한 표현**을 학습한다. 깊게(예: 8층) 쌓으려면 skip-connection이 필요할 수 있다.

## 예측 방식의 분류

지금까지 본 모델들을 "$P(X)$를 어떻게 분해하는가"로 정리하면 이렇다.

| 분해 방식 | 식 | 예 |
|---|---|---|
| Left-to-right autoregressive | $\prod_i P(x_i \mid x_1, \dots, x_{i-1})$ | RNN LM |
| Left-to-right Markov (order $n-1$) | $\prod_i P(x_i \mid x_{i-n+1}, \dots, x_{i-1})$ | n-gram LM, fixed-window LM |
| Independent | $\prod_i P(x_i)$ | unigram |
| Bidirectional | $P(X) \ne \prod_i P(x_i \mid x_{\ne i})$ | masked LM (BERT) |

RNN LM은 **이전 모든 단어**를 조건으로 삼는 autoregressive 방식으로, n-gram의 고정 윈도우 근사보다 이상(ideal)에 가깝다.

## 정리

- 순서를 버리는 **BoW**로는 의미가 반대인 문장을 구분할 수 없어, **sequence 표현**이 필요하다.
- NLP 과제는 binary/multi-class/structured로 나뉘며, **sequence tagging**(POS, BIO 기반 NER 등)이 대표적이다.
- **Language model**은 다음 단어를 예측하며 텍스트에 확률을 부여한다. **n-gram**은 빈도 기반이라 **sparsity·storage** 문제가 있고, **fixed-window neural LM**은 이를 없애지만 윈도우가 고정이라는 한계가 있다.
- **RNN**은 파라미터를 공유하며 임의 길이를 처리하지만 vanishing gradient 문제가 있다. 이를 푸는 **LSTM/GRU**와 **seq2seq·attention**은 [[posts/foundations/nlp/04-lstm-and-seq2seq|다음 글]]에서 이어간다.
