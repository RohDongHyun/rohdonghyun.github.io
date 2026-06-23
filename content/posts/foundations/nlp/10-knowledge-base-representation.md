---
title: 10. Knowledge Base 표현과 관계 추출
date: 2026-06-24
tags:
  - NLP
---

> 서울대학교 데이터사이언스대학원 이재윤 교수님의 '인공신경망을 통한 자연어처리' 강의를 정리한 글입니다. (일부 슬라이드는 Graham Neubig의 CMU Advanced NLP 강의에서 인용)

[[posts/foundations/nlp/09-knowledge-base-and-entity-linking|앞 글]]에서 텍스트의 단어를 지식그래프(KG)의 개체에 연결하는 **Entity Linking**을 다뤘다. 이 글은 한 발 더 나아가, **지식 자체를 어떻게 표현·학습하고, 텍스트에서 새 지식을 어떻게 추출하며, 거대 LM이 이미 지식 베이스 역할을 할 수 있는지**를 다룬다.

## Knowledge Base의 종류

Knowledge Base(KB)는 세상의 사실을 구조화해 담은 데이터베이스다. 대표적인 것들을 보자.

- **WordNet** (Miller, 1995): 단어를 품사·의미 관계로 엮은 거대 사전. 명사는 **is-a 관계**(hatch-back은 car의 일종), **part-of 관계**(wheel은 car의 부품)로, 동사는 구체성 순서(communicate → talk → whisper)로, 형용사는 **반의어**(wet/dry)로 연결된다.
- **DBPedia** (Auer et al., 2007): 위키피디아의 **구조화된 데이터(infobox 등)** 를 추출해 만든 KB. "Carnegie Mellon University"가 `dbo:University`, `schema:CollegeOrUniversity` 같은 타입을 갖는 식이다.
- **WikiData** (Bollacker et al., 2008): 사람이 직접 **큐레이션(curated)** 한 개체 데이터베이스. 서로 링크되어 있고, 극도로 대규모이며 다국어를 지원한다.

이들의 공통 구조는 **(개체, 관계, 개체) 삼중항(triple)** 이다. 예: `(Steve Jobs, cofounder_of, Apple)`. 개체는 노드, 관계는 엣지인 그래프로 볼 수 있다.

## KB의 표현(representation) 학습

KB의 개체와 관계를 **벡터(embedding)** 로 표현하면 신경망에서 쓰기 좋다. 어떻게 학습할까?

### 관계 추출용 점수 함수: Neural Tensor Network

두 개체 $e_1, e_2$가 관계 $R$을 맺는지 점수화하는 가장 기본적인 방법은 MLP다.

$$
u_R^T f(W_{R,1} e_1 + W_{R,2} e_2)
$$

**Neural Tensor Network(NTN)** (Socher et al., 2013)는 여기에 **bi-linear(쌍선형) 호환성 항**을 더한다. 두 개체 벡터를 직접 곱해 상호작용을 잡는다.

$$
g(e_1, R, e_2) = u_R^T f\!\left( e_1^T W_R^{[1:k]} e_2 + V_R \begin{bmatrix} e_1 \\ e_2 \end{bmatrix} + b_R \right)
$$

$W_R^{[1:k]}$는 관계 $R$마다 두는 $k$장의 행렬(텐서)로, $e_1$과 $e_2$의 곱을 $k$개의 다른 방식으로 본다. 단순 MLP보다 개체 쌍의 상호작용을 풍부하게 표현한다.

### KG embedding: TransE

[[posts/foundations/nlp/02-word-representation-continued|word2vec]]에서 `king - man + woman ≈ queen`처럼 임베딩의 **덧셈이 의미 관계**를 담았던 것을 떠올리자. **TransE** (Bordes et al., 2013)는 이 직관을 KG에 그대로 옮긴다: triple $(h, \ell, t)$(head, relation, tail)을 **덧셈 변환**으로 본다.

$$
h + \ell \approx t
$$

즉 head 벡터에 관계 벡터를 더하면 tail 벡터에 가까워야 한다(`Steve_Jobs + cofounder_of ≈ Apple`). 학습은 **margin 기반 loss**로, 참인 triple의 거리는 줄이고 거짓 triple($h', \ell, t'$, 무작위로 head/tail을 바꾼 것)의 거리는 키운다.

$$
\sum_{(h,\ell,t) \in S} \; \sum_{(h',\ell,t') \in S'_{(h,\ell,t)}} \big[ \gamma + d(h + \ell, t) - d(h' + \ell, t') \big]_+
$$

$d(\cdot)$는 거리(예: L2), $\gamma$는 margin, $[x]_+ = \max(0, x)$다. 참 triple이 거짓보다 적어도 $\gamma$만큼 더 가깝지 않으면 벌점을 준다. 이렇게 학습된 개체·관계 벡터로 **link prediction**(빠진 관계 맞히기)을 할 수 있다.

## KB는 불완전하다 → 텍스트에서 추출하자

아무리 거대한 KB도 **본질적으로 불완전(incomplete)** 하다. 예를 들어 FreeBase에서 사람 개체의 **71%가 "생년월일"이 비어 있었다**(West et al., 2014). 그렇다면 빠진 지식을 어디서 채울까? → **텍스트**다. KB는 구조화(structured)되어 있지만, 세상의 지식 대부분은 비구조화(unstructured) 텍스트에 있다.

### Distant Supervision

문제는 텍스트에 "이 문장은 `cofounder_of` 관계다"라는 라벨이 없다는 것이다. **Distant Supervision** (Mintz et al., 2009)은 영리한 우회로다.

> 이미 아는 triple $(e_1, R, e_2)$가 있으면, $e_1$과 $e_2$를 **둘 다 포함하는 모든 문장**을 찾아 그 문장들이 관계 $R$을 표현한다고 **가정**하고 라벨로 쓴다.

예를 들어 `(Steven Spielberg, directed, Saving Private Ryan)`을 알면, 두 개체가 함께 나오는 "[Steven Spielberg]'s film [Saving Private Ryan]..." 같은 문장을 자동으로 모아 학습 데이터로 삼는다. 사람 라벨 없이 **대규모 (노이즈가 있는) 학습 코퍼스**를 만든다.

당연히 노이즈가 섞인다. 두 개체가 함께 나와도 그 관계를 말하는 게 아닐 수 있다. **Luo et al. (2017)** 은 이 노이즈를 **transition matrix(전이 행렬)** 로 모델링해, 예측 분포에 노이즈를 곱해 "관측된 노이즈 분포"를 맞추는 식으로 보정한다.

### 관계 분류·표현을 위한 신경망

문장에서 관계를 분류하는 모델은 발전해왔다. 초기엔 **CNN**(Zeng et al., 2014)으로 단어의 lexical feature와 문장 전체의 feature를 뽑았고, 지금은 **BERT·RoBERTa**가 같은 일을 다른 구조로 한다. 핵심 질문은 *"한 쌍의 개체 사이 관계를 어떻게 벡터로 표현하나"* 인데, [[posts/foundations/nlp/05-self-attention-and-bert|BERT]]에서 `[CLS]` 토큰을 쓰거나, 개체 위치에 특수 마커(`[E1]...[/E1]`)를 넣어 그 자리 출력을 쓰는 등 여러 변형이 연구됐다(Matching the Blanks, Soares et al., 2019).

## KB를 신경망에 활용하기

### Retrofitting: 임베딩 사후 보정

이미 학습된 word embedding을 KB 지식에 맞게 **사후(post-hoc)** 로 조정하는 방법이 **Retrofitting** (Faruqui et al., 2015)이다. 어떤 pre-trained embedding에도 적용 가능하다는 장점이 있다. 목표는 두 가지를 동시에 만족하는 새 벡터 $q_i$를 찾는 것이다 — **원래 벡터 $\hat{q}_i$를 보존**하면서 **KB에서 연결된 단어들끼리는 가깝게** 만든다.

$$
\Psi(Q) = \sum_{i=1}^{n} \left[ \alpha_i \lVert q_i - \hat{q}_i \rVert^2 + \sum_{(i,j) \in E} \beta_{ij} \lVert q_i - q_j \rVert^2 \right]
$$

첫 항은 원본 보존, 둘째 항은 KB의 엣지 $E$로 연결된 단어쌍을 끌어당긴다. 이렇게 KB의 다양한 정보(예: 반의어를 멀리 밀어내기, Mrkšić et al. 2016)를 임베딩에 주입한다.

### 텍스트 코퍼스를 KB처럼 추론하기

**Dhingra et al. (2020, DrKIT)** 은 KB 없이 **텍스트 코퍼스 자체를 KB처럼** 멀티홉 추론에 쓴다. 개체 임베딩과 텍스트 임베딩을 섞어, "개체 → 그 개체가 언급된 mention들"과 "mention → 개체"를 희소 행렬 곱과 top-$k$ nearest neighbor search로 오간다. 예: "Grateful Dead와 Bob Dylan의 앨범은 언제 나왔나?" 같은 질문을 개체에서 출발해 관련 mention으로 점프하며 답한다.

## Schema-free 추출: Open IE

지금까지는 **미리 정해진 관계 스키마**(`cofounder_of` 등)를 가정했다. **Open Information Extraction(Open IE)** (Banko et al., 2007)은 스키마 없이, **텍스트 자체를 관계로** 본다.

예: "United has a hub in Chicago, which is the headquarters of United Continental Holdings"에서

- `{United; has a hub in; Chicago}`
- `{Chicago; is the headquarters of; United Continental Holdings}`

이렇게 **어떤 관계든** 뽑을 수 있지만, "has a hub in"과 "is the headquarters of"를 추상적 관계로 **정규화(abstract)하지는 못한다**는 한계가 있다. 구현은 parser 규칙 기반(TextRunner, ReVerb)에서, QA-SRL 같은 데이터로 학습한 **신경망 BIO tagger**(Stanovsky et al., 2018)로 발전했다.

## LM이 곧 KB인가?

마지막 질문. 거대 텍스트로 pre-train된 LM은 **이미 사실 지식을 담고 있지 않을까?**

### LAMA: 프롬프트로 LM에 질의

**Petroni et al. (2019)** 의 통찰: KB는 `(Dante, born-in, X)` 같은 **구조화된 질의(SQL 등)** 로 묻지만, LM은 **자연어 프롬프트**로 물을 수 있다.

> "Dante was born in **[MASK]**." → LM이 "Florence"를 채우면, LM이 그 사실을 안다고 볼 수 있다.

즉 LM의 빈칸 채우기를 KB 질의처럼 쓴다. 다만 한계가 분명하다. **X-FACTR** (Jiang et al., 2020)은 LM의 사실 지식이 여전히 제한적이며, 특히 **저자원 언어에서 정확도가 크게 떨어짐**을 보였다. 물론 GPT-4 같은 최신 모델은 factuality가 (이전 ChatGPT 대비 약 19%) 크게 올랐다.

### Closed-book vs. Retrieval

**Closed-book T5** (Roberts et al., 2020)는 **추가 문맥 없이** 질문만 보고 답을 생성한다("When was Franklin D. Roosevelt born?" → "1882"). 파라미터 안에 든 지식만 쓰는 셈이다.

하지만 **외부 지식을 검색(retrieve)해 함께 주는** 모델이 더 낫다. NaturalQuestions에서:

| 모델 | 방식 | 점수(EM) |
|---|---|---|
| Closed-book T5 | 파라미터 지식만(parametric) | 34.5 |
| REALM (Guu et al., 2020) | 검색 + 읽기(nonparametric) | 40.4 |
| RAG (Lewis et al., 2020) | 검색 + 생성(nonparametric) | 44.5 |

검색을 결합한 **nonparametric 모델**이 큰 폭으로 앞선다. 이는 [[posts/foundations/nlp/08-question-answering|앞서 본 open-domain QA]]의 retriever–reader 흐름과 정확히 같은 결론이다 — 지식은 파라미터에 다 욱여넣기보다, **필요할 때 외부에서 끌어오는** 편이 낫다.

## 정리

- **KB**는 (개체, 관계, 개체) **triple**의 집합이다(WordNet·DBPedia·WikiData). 개체·관계를 벡터로 학습하면 신경망에서 쓸 수 있다.
- **TransE**는 `h + ℓ ≈ t`라는 덧셈 변환으로 KG를 임베딩하고 **margin 기반 loss**로 학습한다. **NTN**은 bi-linear 항으로 개체 쌍 상호작용을 점수화한다.
- KB는 불완전하므로 **텍스트에서 관계를 추출**한다. **Distant Supervision**은 알려진 triple로 문장을 자동 라벨링해 대규모(노이즈 있는) 데이터를 만든다.
- **Retrofitting**은 KB 지식을 임베딩에 사후 주입하고, **Open IE**는 스키마 없이 텍스트를 관계로 본다.
- 거대 **LM은 부분적으로 KB 역할**을 하지만(LAMA), 사실 지식이 제한적이라 **검색을 결합한 nonparametric 모델(REALM·RAG)** 이 더 정확하다 — [[posts/foundations/nlp/08-question-answering|open-domain QA]]와 같은 결론.
