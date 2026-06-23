---
title: 11. 구문 분석(Syntactic Parsing)
date: 2026-06-24
tags:
  - NLP
---

> 서울대학교 데이터사이언스대학원 이재윤 교수님의 '인공신경망을 통한 자연어처리' 강의를 정리한 글입니다.

지금까지 단어 표현, 언어 모델, attention, QA, 지식 베이스를 다뤘다. 이 글은 그보다 더 오래된, 그러나 여전히 중요한 주제 — **문장의 구조(syntax)를 분석하는 구문 분석(syntactic parsing)** 을 다룬다. 인류는 AI가 나오기 2천 년 전부터 문법을 연구해왔다.

## 왜 구문이 필요한가

통계나 의미만으로는 문장을 **완전히** 이해할 수 없다. 고전적 예시를 보자.

> "I saw a girl with a telescope."

이 문장은 두 가지로 해석된다.

- **내가** 망원경으로 소녀를 봤다 (with a telescope가 동사 saw를 수식)
- 내가 **망원경을 든** 소녀를 봤다 (with a telescope가 명사 girl을 수식)

같은 단어 나열인데 **구조(어디에 붙느냐)** 가 의미를 바꾼다. 이런 모호함을 풀려면 문장의 구조를 명시적으로 분석해야 한다. 구문 분석에는 두 가지 큰 갈래가 있다.

- **Constituency parsing(구구조 분석)**: 단어를 구(phrase) 단위로 묶어 올라가는 phrase structure grammar.
- **Dependency parsing(의존 분석)**: 단어와 단어 사이의 관계(누가 누구를 수식/지배하나)를 본다.

## 1. Constituency Parsing

언어는 **합성적(compositional)이고 재귀적(recursive)** 이다. 단어가 모여 구(phrase)가 되고, 구가 모여 더 큰 구가 된다.

- 단어에 품사(part-of-speech, POS) 부여: `the`(Det), `cat`(N), `cuddly`(Adj)...
- 단어가 구를 이룸: "the cuddly cat" = `NP → Det Adj N`(명사구), "by the door" = `PP → P NP`(전치사구)
- 구가 재귀적으로 더 큰 구를 이룸: "the cuddly cat by the door" = `NP → NP PP`

재귀성은 언어의 본질이다. "[the person standing next to [the man from [the company that purchased [the firm ...]]]]"처럼 명사구 안에 명사구가 끝없이 들어갈 수 있다.

### 파스 트리의 구성 요소

- **내부 노드(구)**: `S`(문장), `NP`(명사구), `VP`(동사구), `PP`(전치사구).
- **단어 바로 위 노드(preterminal)**: 품사 태그. `PN`(대명사), `D`(관사), `V`(동사), `N`(명사), `P`(전치사).

### Context-Free Grammar (CFG)

이 구조를 형식화한 것이 **문맥 자유 문법(CFG)** 이다. $G = (N, \Sigma, R, S)$로 정의된다.

- $N$: 비단말(non-terminal) 기호 집합 (`S`, `NP`, `VP`...)
- $\Sigma$: 단말(terminal) 기호 집합 (실제 단어)
- $R$: `X → Y₁Y₂...Yₙ` 형태의 규칙 집합 (예: `S → NP VP`, `NP → D N`)
- $S$: 시작 기호

규칙(grammar)과 단어-품사 매핑(lexicon, 예: `N → girl`)을 가지고, 단어열을 트리로 조립한다.

### PCFG: 확률을 입히기

한 문장이 **여러 트리**로 분석될 수 있다(앞의 telescope 예시). 어떤 트리가 옳은지 고르려면 **확률**이 필요하다. **확률적 CFG(PCFG)** 는 각 규칙 $\alpha \to \beta$에 확률 $q(\alpha \to \beta) \geq 0$을 부여한다. 같은 좌변 $X$를 갖는 규칙들의 확률 합은 1이다.

$$
\sum_{\alpha \to \beta : \alpha = X} q(\alpha \to \beta) = 1
$$

확률은 treebank(트리가 달린 코퍼스)에서 **세어서(maximum likelihood)** 추정한다. 예를 들어 `VP → Vt NP`를 99번, 비단말 `VP`를 1000번 봤다면 그 규칙 확률은 0.099다.

$$
q_{ML}(\alpha \to \beta) = \frac{\text{Count}(\alpha \to \beta)}{\text{Count}(\alpha)}
$$

트리 전체의 확률은 그 트리에 쓰인 모든 규칙 확률의 곱이다.

$$
P(t) = \prod_{i=1}^{l} q(\alpha_i \to \beta_i)
$$

여러 후보 트리 중 이 확률이 가장 높은 트리를 고르면 된다.

### 추론: 조합 폭발과 동적 계획법

가능한 모든 트리를 일일이 비교할 수는 없다. 트리 개수는 **Catalan 수**로 폭증한다. [[posts/foundations/nlp/03-language-model-and-rnn|언어 모델]]에서 그랬듯 **동적 계획법(dynamic programming)** 을 쓴다. 대표 알고리즘이 **CKY(CYK)** 로, 문법을 이진 규칙(`X → Y₁Y₂`, Chomsky Normal Form)으로 바꿔 부분 문제를 합쳐 올라간다.

대표 데이터셋은 **Penn Treebank**(WSJ 기사 5만 문장에 트리 annotate)다. 보통 4만 학습 / 1700 dev / 2400 test로 나눈다.

### 평가와 신경망의 등장

constituency parsing은 **constituent(구) 단위**로 precision/recall/F1을 잰다.

- **Recall** = (맞춘 구 수) / (정답 트리의 구 수)
- **Precision** = (맞춘 구 수) / (예측 트리의 구 수)
- **Labeled** P/R은 비단말 라벨(NP인지 VP인지)까지 맞아야 인정.

성능 역사가 흥미롭다. 표준 PCFG는 약 72~74 F1, lexicalized 변형이 88 F1이었는데, **신경망이 판도를 바꿨다.** 특히 **Grammar as a Foreign Language**(Vinyals et al., 2015)는 트리를 괄호 문자열 `(S (NP (PN My)...))`로 **선형화(linearize)** 해, [[posts/foundations/nlp/04-lstm-and-seq2seq|seq2seq]]로 "My dog ate a sausage → 괄호 트리"를 번역하듯 생성했다. 지금은 XLNet/BERT 기반 모델이 96 F1을 넘는다.

## 2. Dependency Parsing

의존 분석은 구가 아니라 **단어 간 관계**를 본다. 각 단어가 어떤 단어를 **수식하거나 그 단어의 논항(argument)인지**를 화살표로 잇는다. 화살표는 **head(지배소) → dependent(의존소)** 방향이고, 관계에는 **타입**이 붙는다.

- `nsubj`(주어), `dobj`(직접목적어), `nmod`(명사 수식), `det`(관사), `case`(전치사) 등 (Universal Dependencies 표준).
- 예: "I prefer the morning flight"에서 `prefer →(nsubj) I`, `prefer →(dobj) flight`, `flight →(det) the`.

의존 구조도 PP attachment 모호성을 드러낸다. "Scientists count whales from space"에서 "from space"가 `count`에 붙으면 *우주에서 센다*(맞음), `whales`에 붙으면 *우주에서 온 고래*(틀림)다.

### 의존 트리의 조건

의존 구조는 보통 다음을 만족하는 **트리**다.

- root는 하나뿐이다.
- root를 제외한 모든 단어는 **head가 정확히 하나**다.
- 사이클이 없다 (A→B, B→C, C→A 금지).
- 추가로 **projectivity(투사성)**: 단어를 순서대로 늘어놓고 호(arc)를 위에 그렸을 때 **교차하는 호가 없다.** 영어는 99.9%가 projective지만, 어순이 자유로운 체코어는 76.9%에 불과하다. (이 강의는 projective parsing에 집중.)

의존 구조는 **어순이 자유로운 언어**에 더 적합하고, **predicate-argument 구조**(누가 무엇을 했나)를 바로 드러내 응용에 유용하다.

### Transition-based Parsing (Arc-standard)

가장 직관적인 방법은 **transition 기반(shift-reduce) parsing**이다. 상태(configuration)는 **스택 $s$, 버퍼 $b$, 호 집합 $A$** 로 이뤄진다 $(c = (s, b, A))$.

- 초기: $s = [\text{ROOT}]$, $b = [w_1, ..., w_n]$, $A = \emptyset$
- 종료: 스택에 ROOT만 남고 버퍼가 비면 끝.

매 단계 세 가지 행동 중 하나를 고른다.

- **SHIFT**: 버퍼의 맨 앞 단어를 스택으로 옮긴다.
- **LEFT-ARC(r)**: 스택 top 두 단어 사이에 (위→아래) 호를 긋고 아래 단어를 제거.
- **RIGHT-ARC(r)**: 반대 방향 호를 긋고 제거.

길이 $n$ 문장은 항상 $2n$번의 transition(SHIFT $n$번 + ARC $n$번)으로 끝난다. 핵심은 **매 상태에서 어떤 행동을 할지 분류기로 결정**하는 것이다. 즉 parsing이 **$(2|R|+1)$-way 분류 문제**($R$은 의존 라벨)가 된다.

**Chen & Manning (2014)** 은 이 분류기를 신경망으로 만들었다. 스택·버퍼 맨 위 단어들의 embedding을 lookup·concat해 입력 $x$로 쓰고, 한 층의 신경망으로 다음 행동을 예측한다.

$$
h = \text{ReLU}(W x + b_1)
$$

$$
y = \text{softmax}(U h + b_2)
$$

이전의 수작업 feature(p-word, c-pos 등 희소한 조합)를 dense embedding으로 대체해 성능과 속도를 모두 끌어올렸다.

### Graph-based Parsing

또 다른 갈래는 **graph 기반**이다. 모든 단어 쌍에 점수를 매겨 **최대 가중 spanning tree**를 찾는다(트리 조건을 만족하도록). 사이클 제거는 **Chu-Liu-Edmonds**, projective 제약은 **Eisner의 $O(n^3)$ DP**(의존 버전 CKY)로 처리한다. **Dozat & Manning (2017)** 의 신경망 graph parser가 대표적으로, UAS 95.74를 기록했다.

### 평가: UAS / LAS

- **UAS(Unlabeled Attachment Score)**: head를 맞춘 단어 비율.
- **LAS(Labeled Attachment Score)**: head **와 라벨**을 모두 맞춘 비율.

### 구문 분석은 어디에 쓰나

분석한 구조를 신경망에 **주입**해 성능을 높인다. **Tree-LSTM**(Tai et al., 2015)은 constituency 트리를 따라 LSTM을 타고, **LISA**(Strubell et al., 2018)는 dependency를 attention에 주입한다. 최근에는 parse tree로 **이미지 생성의 구성성(compositionality)** 을 돕는다 — "a red car and a white sheep"에서 색을 올바른 사물에 묶어주는 식이다.

LLM이 완벽히 parsing할 수 있느냐고? 아직은 아니다. 다만 LLM의 지식을 작은 모델로 **distillation**하는 접근이 유망하다(Zhao et al., ACL 2024).

## 정리

- **구문 분석**은 문장 구조를 분석해 "I saw a girl with a telescope" 같은 **구조적 모호성**을 푼다. **constituency**(구 단위)와 **dependency**(단어 관계) 두 갈래가 있다.
- **Constituency**는 **CFG**로 구를 재귀적으로 조립하고, **PCFG**로 규칙에 확률을 입혀(treebank에서 count) 가장 그럴듯한 트리를 고른다. 추론은 **CKY** 동적 계획법.
- **Dependency**는 head→dependent 화살표로 단어 관계를 잇는다(트리·acyclic·projective 조건). **Transition-based**(shift-reduce, 분류 문제)와 **graph-based**(최대 spanning tree) 두 알고리즘이 있고, 평가는 **UAS/LAS**.
- 두 분석 모두 **신경망**(seq2seq linearization, Chen-Manning, Dozat-Manning)으로 90% 중반 정확도에 도달했고, Tree-LSTM·LISA·이미지 생성 등에 활용된다.
