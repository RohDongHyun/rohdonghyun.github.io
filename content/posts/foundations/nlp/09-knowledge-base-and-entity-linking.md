---
title: 09. Knowledge Base와 Entity Linking
date: 2026-06-24
tags:
  - NLP
---

> 서울대학교 데이터사이언스대학원 이재윤 교수님의 '인공신경망을 통한 자연어처리' 강의를 정리한 글입니다. (일부 슬라이드는 Chris Tanner의 Harvard 강의에서 인용)

[[posts/foundations/nlp/08-question-answering|앞 글]]에서 text-based QA를 다루며, 답을 **지식그래프(Knowledge Base)** 에서 찾는 KBQA를 잠깐 언급했다. 이 글은 그 KB를 활용하기 위한 핵심 전처리 과제인 **Entity Linking(개체 연결)** 을 다룬다. 텍스트 속 단어를 실세계 개체(entity)에 연결하는 일이다.

## 왜 Entity Linking인가: Information Extraction

세상의 텍스트(논문, 뉴스 등)는 폭증한다. PubMed에 색인된 논문만도 매년 100만 건을 넘는다. 사람이 다 읽을 수 없으니 **자동 정보 추출(information extraction)** 이 필요하다.

예를 들어 다음 생의학 문장을 보자.

> "Highly pathogenic Alzheimer's disease presenilin 1 **P117R** mutations causes a specific increase in **p53** and p21 protein levels..."

여기서 추출하고 싶은 것은 두 가지다.

- **개체(entity)**: disease(Alzheimer's), gene(presenilin 1), gene variant(P117R)... 각 단어가 무엇을 가리키는지.
- **관계(relation)**: "P117R mutations" → "causes increase" → "p53". 개체 사이의 관계.

이때 "P117R"처럼 고유한 코드명은 찾기 쉽지만, **단어를 특정 개체에 정확히 연결(linking)** 하는 일은 까다롭다. 그 어려움이 entity linking의 핵심이다.

## Entity Linking이란

**Entity Linking(EL)** 은 텍스트의 한 조각(named mention)을 **지식그래프(Knowledge Graph, KG)의 실제 개체에 연결**하는 과제다. KG의 대표 예가 위키피디아다. EL은 **Named Entity Disambiguation(개체명 중의성 해소)** 라고도 불린다.

> 정의: 어떤 named mention이 (지식그래프 안의) 어떤 실세계 개체를 가리키는지 판별한다.

KG는 개체(노드)와 그들 사이의 관계(엣지)로 이뤄진다. 예: `Steve Jobs —cofounder_of→ Apple —manufacturer_of→ iPhone`, `Apple —located_in→ San Jose`. EL은 텍스트의 "Apple"이라는 단어를 이 그래프의 **Apple(회사)** 노드에 정확히 연결하는 것이다.

### 핵심 난제: Disambiguation(중의성)

같은 표기가 전혀 다른 개체를 가리킬 수 있다. 다음 문장을 보자.

> "**Michael Jordan**, born in 1956, spoke with the **Associated Press** today after he announced a new $10M college scholarship fund."

"Michael Jordan"은 누구인가? 농구선수 마이클 조던(1963년생)이 아니다. **1956년생**이라는 단서로 보면, UC Berkeley의 머신러닝 석학 **Michael I. Jordan**이다. 같은 이름이지만 문맥(born in 1956)이 다른 개체를 가리킨다.

심지어 앞의 생의학 예시의 "p53"조차 위키피디아에서 종양 억제 단백질, 음악 그룹, 전투기, 잠수함 등 여러 의미로 갈린다. **문맥을 봐야만** 올바른 개체로 연결할 수 있다.

## 두 단계 과정

EL은 보통 두 단계로 나뉜다.

1. **Mention detection(언급 탐지)**: 텍스트에서 개체를 가리키는 span을 찾는다.
2. **Linking(= Disambiguation)**: 찾은 mention을 KG의 올바른 개체에 연결한다.

### 1단계: Mention detection

개체를 가리키는 span(mention)에는 세 종류가 있고, 각각 다른 도구로 찾는다.

- **대명사(pronoun)**: POS tagger(품사 태거)
- **고유명사(named entity)**: [[posts/foundations/nlp/08-question-answering|NER]] 시스템 (Person, Location, Organization 등 분류)
- **명사구(noun phrase)**: parser, 특히 constituency parser

> **NER 복습**: NER은 텍스트에서 이름을 **찾고(find) 분류(classify)** 하는 과제다. "Andrew Wilkie"(Person), "Labor"(Organization), "2010"(Date)처럼. 평가는 토큰 단위가 아니라 **개체(entity) 단위**로 한다.

문제는 위 셋을 모두 mention으로 잡으면 **과잉 생성(over-generate)** 된다는 것이다. "It is sunny"의 It, "Every student", "100 miles" 등은 개체로 연결할 대상이 아니다. 그래서 보통 **모든 후보를 일단 candidate mention으로 유지**하고 다음 단계에서 거른다.

### Annotation의 현실적 규칙

데이터셋을 만들 때 부딪히는 까다로운 경우들이 있다.

- **Q. 문서에 "Michael Jordan" 대신 "Michael"만 있다면?** → 충분한 문맥이 있어 과제가 의미 있는 mention만 annotate한다.
- **Q. 같은 이름이 한 문서에 10번 나오면?** → 첫 등장만 annotate한다.
- **Q. KG에 없는 비유명 인물(예: Chris Tanner)이면?** → **KG에 존재하는 mention만** annotate할 수 있다. (없으면 NIL로 처리)

대표 데이터셋으로 **TAC KBP 2010**, **AIDA/CoNLL**(가장 큰 공개 EL 데이터셋, 18,448개 linked mention)이 있다.

### 평가 지표

- **Disambiguation만 평가**: Micro-Precision(전체 코퍼스에서 올바르게 연결된 비율), Macro-Precision(문서별 평균).
- **End-to-End 평가**: Gerbil Micro/Macro-F1 (strong matching). **InKB**는 유효한 KG 개체가 있는 mention만 평가 대상으로 삼는다는 뜻.

## 2단계: Linking(Disambiguation)

mention을 올바른 개체에 연결하는 핵심 단계다.

### 전통적 방법: 유사도 feature + 학습

고전적 접근은 세 단계다.

1. query mention과 후보 entity 사이의 여러 **유사도 feature** 를 모은다.
2. 학습 데이터로 feature 가중치를 **학습(learning to rank)** 한다.
3. mention과 각 entity에 유사도를 적용해 **가장 비슷한 entity를 선택**한다.

예를 들어 "James Craig"를 연결할 때 쓰는 feature들: 제목이 정확히 일치하는가(exact title match), disambiguation 페이지에 일치하는가, 이 이름으로 들어오는 inlink 수, 근사 일치, **TF-IDF 유사도 점수** 등. 문맥을 더 풍부하게 쓰면("James Craig" + 이름 변형 + 이웃 단어 + 문장 전체) 더 정확해진다.

### 현대적 방법: 신경망

**End-to-End Neural Entity Linking** (Kolitsas et al., EMNLP 2018)은 mention detection(MD)과 entity disambiguation(ED)을 **함께(jointly)** 푼다. 따로 풀면 한 단계의 오류가 다음 단계로 전파되지만, 함께 풀면 **한 단계의 실수를 다른 단계가 바로잡을 수 있다.**

예를 들어 "B. Obama's wife"에서 MD가 "wife"를 따로 떼어내면 정보가 빈약한 개체가 되고, "Obama Castle"(일본의 성)에서 "Obama"만 떼면 엉뚱한 개체로 연결된다. 올바른 문맥 이해로 이런 실수를 피할 수 있다.

이 모델은 bidirectional LSTM으로 문맥 인식 word embedding을 만들고, mention 표현과 후보 entity embedding의 유사도를 점수화한 뒤, global voting score로 reranking한다.

### 최신: Dense Entity Retrieval (BLINK)

**Scalable Zero-shot Entity Linking with Dense Entity Retrieval** (Wu et al., EMNLP 2020, 일명 BLINK)은 [[posts/foundations/nlp/08-question-answering|DPR]]과 똑같은 **retrieve–rerank** 구조를 쓴다.

- **Bi-encoder(retrieve)**: 입력 문맥(mention 포함)과 모든 entity 설명을 **같은 dense 공간**에 인코딩하고, nearest neighbor search(MIPS)로 top-$k$ 후보를 빠르게 찾는다.
- **Cross-encoder(rerank)**: 입력 텍스트와 각 후보 entity 설명을 **함께** 넣어 정밀하게 점수를 매긴다.

예: "My kids really enjoyed a ride in the **Jaguar**!"에서 Jaguar는 자동차 브랜드가 아니라 놀이기구(roller coaster)다. cross-encoder가 "roller coaster" 설명에 0.8, "luxury vehicle" 설명에 0.2를 줘 올바른 개체를 고른다. **bi-encoder는 빠르지만 거칠고, cross-encoder는 느리지만 정밀하다**는 전형적 trade-off를, 후보를 좁힌 뒤 정밀 채점하는 2단계로 절충한다. zero-shot(학습 때 본 적 없는 entity)에도 작동한다.

## KB representation은 어디에 쓰나

이렇게 텍스트를 KB에 연결하면, KB 표현을 **downstream 과제의 중간 표현(intermediate representation)** 으로 쓸 수 있다. 이는 **해석 가능성(interpretability)** 을 더한다 — 모델이 왜 그런 답을 냈는지 KB 경로로 설명할 수 있다. 또는 downstream 과제의 결과를 **검증(verify)** 하는 데도 쓸 수 있다.

## 정리

- **Entity Linking(EL)** 은 텍스트의 mention을 지식그래프(KG)의 실세계 개체에 연결하는 과제로, **Named Entity Disambiguation**이라고도 한다. 자동 정보 추출의 핵심이다.
- 핵심 난제는 **중의성(disambiguation)** 이다. "Michael Jordan"(농구선수 vs ML 석학), "p53"(단백질 vs 음악그룹)처럼 같은 표기가 여러 개체를 가리키므로 **문맥**을 봐야 한다.
- EL은 **① Mention detection**(POS tagger·NER·parser로 span 찾기, 과잉 생성을 candidate로 관리)과 **② Linking/Disambiguation**(올바른 개체 선택)의 두 단계다.
- Linking은 전통적 **유사도 feature + learning to rank**(TF-IDF 등)에서, MD와 ED를 함께 푸는 **신경망 end-to-end**(EMNLP 2018), 그리고 **dense retrieve–rerank**(BLINK, bi-encoder + cross-encoder)로 발전했다 — [[posts/foundations/nlp/08-question-answering|DPR]]과 같은 구조다.
