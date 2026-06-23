---
title: 04. LSTM and Sequence-to-Sequence
date: 2026-06-24
tags:
  - NLP
---

> 서울대학교 데이터사이언스대학원 이재윤 교수님의 '인공신경망을 통한 자연어처리' 강의를 정리한 글입니다.

[[posts/foundations/nlp/03-language-model-and-rnn|앞 글]]에서 **language model**과 그 대표 구현인 **RNN**을 소개했다. 이 글은 RNN을 간단히 복습한 뒤, RNN의 고질적 한계인 **vanishing gradient**를 구조적으로 극복한 **LSTM/GRU**, 그리고 입력 sequence를 출력 sequence로 변환하는 **sequence-to-sequence(seq2seq)** 와 **attention**까지 이어간다.

> RNN·LSTM·attention의 일반적인 딥러닝 관점 설명은 [[posts/foundations/introduction-to-dl/07-recurrent-neural-network]], [[posts/foundations/introduction-to-dl/08-lstm-and-gru]], [[posts/foundations/introduction-to-dl/10-sequence-to-sequence-and-attention]]에서도 다룬다. 여기서는 NLP 맥락에 맞춰 정리한다.

## RNN 복습

[[posts/foundations/nlp/03-language-model-and-rnn|앞 글]]에서 보았듯, 언어 모델(Language Model, LM)의 목표는 문장 $X = (x_1, \dots, x_{|X|})$의 확률 $P(X)$를 계산하는 것이다. 가장 일반적인 방식은 **왼쪽에서 오른쪽으로(autoregressive)** 한 단어씩 예측하는 것이다.

$$
P(X) = \prod_{i=1}^{|X|} P(x_i \mid x_1, \dots, x_{i-1})
$$

n-gram LM은 직전 $n-1$개 단어만 보는 근사(Markov chain)이지만, **RNN(Recurrent Neural Network)** 은 이론적으로 이전 모든 단어를 볼 수 있다. RNN은 매 시점 $t$마다 이전 hidden state $h^{(t-1)}$와 현재 입력 $x^{(t)}$를 받아 새 hidden state를 만든다.

$$
h^{(t)} = \sigma\left(W_h h^{(t-1)} + W_e x^{(t)} + b\right)
$$

핵심은 **같은 파라미터($W_h, W_e$)를 모든 시점에서 공유**한다는 점이다. 덕분에 임의 길이의 문장을 처리할 수 있고, 더 긴 의존 관계를 다루려고 모델 크기를 키울 필요도 없다. 학습은 시간축으로 펼친(unroll) 뒤 역전파하는 **BPTT(Backpropagation Through Time)** 로 하며, 공유된 파라미터의 gradient는 모든 시점에서 누적된다.

> **LM 평가 지표 — Perplexity.** 언어 모델이 얼마나 좋은지는 보통 perplexity로 잰다. 이는 모델이 테스트 말뭉치에 부여하는 확률의 역수(per-word)로, $\text{ppl} = 2^{H} = e^{-\text{WLL}}$ ($H$: per-word cross entropy, WLL: per-word log likelihood)로 정의된다. **낮을수록 좋다.** RNN/LSTM은 n-gram 모델 대비 perplexity를 크게 낮췄다.

## Vanishing/Exploding Gradient 문제

RNN은 이론적으로 긴 의존 관계를 모델링할 수 있지만, 실제로는 **gradient가 시간축을 거슬러 가며 사라지거나(vanishing) 폭발(exploding)** 하는 문제가 있다.

먼 시점의 loss $J^{(4)}$를 초기 hidden state $h^{(1)}$에 대해 미분하면, 중간 단계들의 미분이 연쇄적으로(chain rule) 곱해진다.

$$
\frac{\partial J^{(4)}}{\partial h^{(1)}} = \frac{\partial h^{(2)}}{\partial h^{(1)}} \times \frac{\partial h^{(3)}}{\partial h^{(2)}} \times \frac{\partial h^{(4)}}{\partial h^{(3)}} \times \frac{\partial J^{(4)}}{\partial h^{(4)}}
$$

각 항의 크기가 1보다 작으면 여러 번 곱해져 **0에 가까워지고**(vanishing), 1보다 크면 **폭발한다**. vanishing이 일어나면 멀리 떨어진 단어의 gradient 신호가 가까운 단어의 신호에 묻혀버려, **모델이 장기 의존 관계를 학습하지 못한다.**

> 이는 RNN만의 문제가 아니다. 깊은 feed-forward·CNN 등 **계산 사슬이 긴 모든 신경망**에서 나타날 수 있다.

### 해결책 1: Gradient Clipping (exploding 대응)

exploding gradient는 비교적 간단히 해결된다. gradient의 norm이 임계값(threshold)을 넘으면 방향은 유지한 채 크기만 줄여서 업데이트한다.

$$
\text{if } \|\hat{g}\| \geq \text{threshold}: \quad \hat{g} \leftarrow \frac{\text{threshold}}{\|\hat{g}\|} \hat{g}
$$

### 해결책 2: LSTM (vanishing 대응)

vanishing gradient를 구조적으로 완화하기 위해 제안된 것이 **LSTM(Long Short-Term Memory)** 이다. LSTM은 hidden state $h$ 외에 정보를 길게 나르는 **cell state $c$** 를 따로 두고, 세 개의 **gate(0~1 사이 값, sigmoid)** 로 정보 흐름을 조절한다.

매 시점 $t$에서:

$$
\begin{aligned}
f^{(t)} &= \sigma\left(W_f h^{(t-1)} + U_f x^{(t)} + b_f\right) \quad \text{(forget gate)} \\
i^{(t)} &= \sigma\left(W_i h^{(t-1)} + U_i x^{(t)} + b_i\right) \quad \text{(input gate)} \\
o^{(t)} &= \sigma\left(W_o h^{(t-1)} + U_o x^{(t)} + b_o\right) \quad \text{(output gate)} \\
\tilde{c}^{(t)} &= \tanh\left(W_c h^{(t-1)} + U_c x^{(t)} + b_c\right) \quad \text{(new cell content)} \\
c^{(t)} &= f^{(t)} \circ c^{(t-1)} + i^{(t)} \circ \tilde{c}^{(t)} \\
h^{(t)} &= o^{(t)} \circ \tanh\left(c^{(t)}\right)
\end{aligned}
$$

각 gate의 역할을 직관적으로 풀면 이렇다.

- **forget gate $f$**: 이전 cell state에서 무엇을 **버릴지** 결정.
- **input gate $i$**: 새 내용 중 무엇을 cell에 **쓸지** 결정.
- **output gate $o$**: cell state 중 무엇을 hidden state로 **내보낼지** 결정.

핵심은 cell state 갱신식 $c^{(t)} = f^{(t)} \circ c^{(t-1)} + i^{(t)} \circ \tilde{c}^{(t)}$의 **덧셈 구조**다. 이전 cell state $c^{(t-1)}$가 곱셈이 아니라 덧셈으로 전달되므로, gradient가 여러 시점을 거쳐도 잘 사라지지 않는다. (이는 ResNet의 skip-connection과 같은 원리다.)

### 해결책 2-1: GRU (LSTM의 간소화 버전)

**GRU(Gated Recurrent Unit)** 는 Cho et al. (2014)이 제안한 LSTM의 더 단순한 대안이다. cell state $c$를 없애고 hidden state $h$만 쓰며, gate도 둘(update, reset)로 줄였다.

$$
\begin{aligned}
u^{(t)} &= \sigma\left(W_u h^{(t-1)} + U_u x^{(t)} + b_u\right) \quad \text{(update gate)} \\
r^{(t)} &= \sigma\left(W_r h^{(t-1)} + U_r x^{(t)} + b_r\right) \quad \text{(reset gate)} \\
\tilde{h}^{(t)} &= \tanh\left(W_h (r^{(t)} \circ h^{(t-1)}) + U_h x^{(t)} + b_h\right) \\
h^{(t)} &= (1 - u^{(t)}) \circ h^{(t-1)} + u^{(t)} \circ \tilde{h}^{(t)}
\end{aligned}
$$

LSTM과 마찬가지로 update gate를 0에 가깝게 두면 이전 정보를 그대로 유지할 수 있어 장기 의존 관계 학습에 유리하다.

> **LSTM 실전 팁.** ① LSTM은 여전히 강력한 기본(baseline) 모델로, 대형 pre-trained 모델이 없는 새 도메인(예: 화학 반응)에서 특히 유용하다. ② gradient는 clip하자. ③ 깊은 모델은 보통 더 강력하지만 skip-connection(ResNet 구조)이 필요할 수 있다. ④ 가능하면 양방향(Bi-directional) 모델을 쓰자. 다만 RNN 계열은 본질적으로 **순차 처리**를 해야 해서 병렬화가 어렵다 — 이 한계를 transformer가 극복한다. 2013~2017년엔 LSTM이 주류였으나 지금은 transformer가 지배적이다.

## Minibatch와 Bucketing

NLP에서 minibatch 구성은 까다롭다. 문장마다 길이가 달라서, 짧은 문장 뒤에 `</s>` 같은 **padding** 토큰을 채워 길이를 맞춘다. 그리고 loss 계산 시 padding 위치는 **mask(0)** 로 무시한다.

길이 차이가 크면 padding이 너무 많아져 비효율적이다. 이를 줄이려고 **bucketing(sorting)** 을 쓴다 — 비슷한 길이의 문장끼리 같은 batch에 모으는 것이다.

## Conditioned Generation과 Seq2Seq

지금까지의 LM은 아무 조건 없이 문장을 생성했다. 그런데 많은 NLP 과제는 **어떤 입력 $X$가 주어졌을 때 그에 맞는 출력 $Y$를 생성**한다. 이를 **conditioned language model**이라 한다.

$$
P(Y \mid X) = \prod_{j=1}^{J} P(y_j \mid X, y_1, \dots, y_{j-1})
$$

기존 LM에 입력 $X$라는 **추가 context**가 붙은 형태다. 이 틀로 표현되는 과제는 매우 다양하다.

| 입력 $X$ | 출력 $Y$ | 과제 |
|---|---|---|
| 영어 문장 | 일본어 문장 | 번역 (MT/NMT) |
| 긴 문서 | 짧은 요약 | 요약 |
| 발화 | 응답 | 대화 응답 생성 |
| 이미지 | 텍스트 | 이미지 캡셔닝 |
| 음성 | 전사 텍스트 | 음성 인식 |

이런 입력-출력이 모두 sequence인 과제를 다루는 구조가 **sequence-to-sequence(seq2seq)**, 즉 **encoder-decoder** 모델이다.

- **Encoder**: 입력 문장(예: 프랑스어 "il a m'entarté")을 읽어 하나의 벡터(encoding)로 압축한다.
- **Decoder**: 그 벡터를 받아 출력 문장(예: 영어 "he hit me with a pie")을 한 단어씩 생성한다.

seq2seq는 encoder와 decoder가 하나의 시스템으로 묶여 **end-to-end로 한 번에 학습**된다(backpropagation이 전체를 관통). 이 end-to-end neural 방식(NMT)은 기존 통계 기반 기계번역(phrase/syntax-based SMT)을 빠르게 추월했다.

## Bottleneck 문제와 Attention

기본 seq2seq에는 치명적 약점이 있다. encoder가 **입력 문장 전체의 의미를 단 하나의 고정된 벡터에 욱여넣어야** 한다는 점이다. 문장이 길어질수록 이 벡터가 모든 정보를 담기 어렵다 — 이것이 **bottleneck 문제**다.

> "You can't cram the meaning of a whole sentence into a single vector!" — Ray Mooney

해결책이 **attention**이다. 핵심 아이디어는, decoder가 매 시점마다 **encoder의 모든 hidden state에 직접 연결**해서 그 시점에 필요한 부분에 집중(focus)하는 것이다.

### Attention 계산

encoder hidden state $h_1, \dots, h_N$과, 현재 decoder hidden state $s_t$가 있다고 하자.

1. **attention score**: decoder state $s_t$와 각 encoder state $h_i$의 유사도(내적).

$$
e^t = [s_t^T h_1, \dots, s_t^T h_N] \in \mathbb{R}^N
$$

2. **attention distribution**: score에 softmax를 씌워 확률 분포로.

$$
\alpha^t = \text{softmax}(e^t) \in \mathbb{R}^N
$$

3. **attention output**: 이 분포로 encoder hidden state들의 **가중 합**.

$$
a_t = \sum_{i=1}^N \alpha_i^t h_i \in \mathbb{R}^h
$$

4. 마지막으로 attention output $a_t$를 decoder hidden state $s_t$와 concatenate($[a_t; s_t]$)해서 다음 단어를 예측한다.

즉 decoder는 매 단어를 생성할 때마다 "지금은 입력의 어느 부분을 봐야 하는가"를 동적으로 정한다. 번역에서 출력 단어와 입력 단어가 대응되는 부분에 attention이 집중되는 것을 시각화로 확인할 수 있다.

> **Attention score를 구하는 변형들.** 위에서 쓴 단순 내적은 $e_i = s^T h_i$ (basic dot-product, $d_1 = d_2$ 가정). 이 외에 가중치 행렬을 끼운 **multiplicative attention** $e_i = s^T W h_i$, 그리고 작은 신경망을 쓰는 **additive attention** $e_i = v^T \tanh(W_1 h_i + W_2 s)$ 등이 있다.

attention은 ① bottleneck 문제를 풀고, ② encoder 토큰까지의 경로를 짧게 만들어 vanishing gradient도 완화하며, ③ 어느 정도 해석 가능성(interpretability)을 제공한다. 무엇보다 이후 **self-attention과 transformer**의 직접적인 토대가 되었다 ([[posts/foundations/introduction-to-dl/11-transformer-and-self-attention]]).

## Seq2Seq의 Decoding

학습된 seq2seq로 실제 출력을 만들려면(**decoding/inference**), 확률이 가장 높은 출력 $y$를 찾아야 한다.

$$
P(y \mid x) = \prod_{t=1}^{T} P(y_t \mid y_1, \dots, y_{t-1}, x)
$$

모든 가능한 sequence를 다 따져보는 것은 $O(V^T)$ ($V$: 어휘 크기, $T$: 길이)로 불가능하다. 그래서 근사 방법을 쓴다.

### Greedy Decoding

매 시점 가장 확률 높은 단어 하나(argmax)를 골라 다음 입력으로 넣는다. 단순하지만 **한 번 고른 결정을 되돌릴 수 없다.** 앞에서 잘못 고르면 그 뒤가 모두 어긋난다.

### Beam Search Decoding

greedy의 단점을 보완하려고, 매 시점 단어 하나가 아니라 **확률이 높은 상위 $k$개의 경로(beam)** 를 함께 유지한다. 이 $k$를 **beam size**라 한다. 마지막에 누적 확률이 가장 높은 경로를 되짚어(backtrack) 최종 출력을 얻는다. beam search는 최적해를 보장하지는 않는 근사 알고리즘이지만 실무에서 잘 작동한다.

## 남은 과제

seq2seq + attention이 큰 진전을 이뤘지만 여전히 어려운 문제들이 있다.

- OOV(처음 보는 단어), 학습-테스트 도메인 불일치
- 긴 텍스트에서 context 유지, 저자원(low-resource) 언어
- 대명사 해소(coreference) 오류, 형태 일치(morphological agreement) 오류

## 정리

- **RNN**은 파라미터를 공유하며 임의 길이 sequence를 처리하지만, **vanishing/exploding gradient**로 장기 의존 학습이 어렵다.
- exploding은 **gradient clipping**으로, vanishing은 cell state의 덧셈 구조를 가진 **LSTM**(과 간소화판 **GRU**)으로 완화한다.
- 입력→출력 변환 과제는 **seq2seq(encoder-decoder)** 로 풀며, 하나의 벡터에 모든 의미를 담는 **bottleneck 문제**는 **attention**으로 해결한다.
- 출력 생성은 **greedy** 또는 **beam search** decoding으로 근사하며, attention은 이후 transformer의 토대가 된다.
