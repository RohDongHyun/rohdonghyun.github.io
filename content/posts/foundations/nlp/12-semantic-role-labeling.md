---
title: 12. 의미역 결정(Semantic Role Labeling)
date: 2026-06-24
tags:
  - NLP
---

> 서울대학교 데이터사이언스대학원 이재윤 교수님의 '인공신경망을 통한 자연어처리' 강의를 정리한 글입니다.

[[posts/foundations/nlp/11-syntactic-parsing|앞 글]]에서 문장의 **구조(syntax)** 를 분석했다. 이 글은 한 발 더 나아가 **의미(semantics)** 로 간다. **누가 누구에게 무엇을 했는가**를 밝히는 **의미역 결정(Semantic Role Labeling, SRL)** 을 다룬다.

## SRL이란: Who did What to Whom

SRL은 **shallow semantic parsing(얕은 의미 분석)** 이라고도 불린다. 문장에서 **누가(Who), 무엇을(What), 누구에게(Whom), 어디서(Where), 왜(Why), 어떻게(How)** 를 뽑아낸다.

> "The police officer detained the suspect at the scene of the crime."
> - The police officer = **Agent**(행위자)
> - detained = **Predicate**(서술어)
> - the suspect = **Theme**(대상)
> - at the scene of the crime = **Location**(장소)

핵심은 **동사(서술어)를 중심으로 그 논항(argument)들이 어떤 역할을 하는지** 라벨링하는 것이다. 의미역(semantic role)이라는 개념은 놀랍게도 기원전 400년 이전 Panini가 처음 제안했고, 현대적으로는 1960~70년대 Fillmore가 발전시켰다.

## 의미역은 문법 구조(S, V, O)가 아니다

SRL이 단순한 주어-동사-목적어(subject-verb-object)와 **다르다**는 것이 핵심이다. 같은 동사 "break"를 보자.

- "John broke the window with the hammer." → John=**Agent**, window=**Theme**, hammer=**Instrument**
- "The hammer broke the window." → hammer=**Instrument**, window=**Theme**
- "The window broke." → window=**Theme**

문법적 **주어(subject)** 와 의미적 **행위자(Agent)** 는 다른 개념이다. "The ball was hit by the batter"에서 문법적 주어는 ball이지만 행위자는 batter다. "The door opened"에는 행위자가 아예 명시되지 않는다.

또 같은 의미라도 **표현 방식은 천차만별**이다. "Kristina hit Scott with a baseball yesterday"는 능동·수동·어순 변경 등 7가지 이상으로 쓸 수 있지만, **의미역 구조(누가 때렸고/맞았고/도구가 뭔지)는 동일**하다. SRL은 이 표면 변이를 넘어 **불변의 의미**를 잡는다.

## SRL은 어디에 쓰나

- **QA(질의응답)**: "When was Napoleon defeated?" → `[PATIENT Napoleon] [PRED defeat] [ARGM-TMP *ANS*]` 패턴을 찾으면 된다. [[posts/foundations/nlp/08-question-answering|앞서 본 QA]]와 직결된다.
- **기계 번역**: 영어(SVO)와 페르시아어(SOV)는 어순이 다르지만 의미역(Agent/Theme/Predicate)은 같아, 이를 매개로 번역할 수 있다.
- **문서 요약**: 서술어와 핵심 역할만 뽑으면 내용이 요약된다.
- **정보 추출**: [[posts/foundations/nlp/10-knowledge-base-representation|관계 추출]]의 규칙을 만드는 데 쓴다.

## 의미역을 정의하는 어려움: PropBank와 FrameNet

문제는 **의미역을 형식적으로 정의하기가 매우 어렵다**는 것이다. 역할 분류가 자의적이고, 너무 일반적인 역할은 모든 경우를 포괄하는 규칙을 찾기 힘들다. 두 가지 해법이 나왔다.

### PropBank: 동사별 번호 매기기

**PropBank**는 의미역에 **이름 대신 번호(Arg0, Arg1, Arg2...)** 를 붙인다. 각 동사마다 **frame file**로 번호의 의미를 정의한다.

- 예) `hit.01`: Arg0=hitter(때린 사람), Arg1=thing hit(맞은 것), Arg2=instrument(도구).
- 예) `agree`: Arg0=agreer, Arg1=proposition, Arg2=other entity.
- 일반적으로 **Arg0는 proto-agent**(행위자에 가까움), **Arg1은 proto-patient**(영향받는 대상에 가까움)다.
- 동사·시간·장소 등 부가 정보는 **ArgM**(예: ArgM-TMP=시간, ArgM-LOC=장소)으로 표시한다.

PropBank는 [[posts/foundations/nlp/11-syntactic-parsing|Penn Treebank]] WSJ 위에 구축됐고, frame file 3,324개와 약 113,000개의 proposition을 담는다. **FrameNet**은 다른 해법으로, 특정 의미 도메인(frame)별로 역할을 정의한다. 표준 벤치마크는 **CoNLL-2012(OntoNotes 5.0)** 다.

## 모델: 두 단계에서 신경망 한 방으로

### 신경망 이전: 파이프라인 + 수작업 feature

전통적 접근(Approach 1)은 [[posts/foundations/nlp/11-syntactic-parsing|구문 분석 트리]]를 먼저 만들고, 각 서술어마다 트리의 각 노드에 대해 feature를 뽑아 분류한 뒤, 전역 정보로 2차 보정을 했다. 이때 쓰인 feature가 어마어마했다 — 서술어, **constituent에서 서술어까지의 경로(path)**, 위치(before/after), phrase type, **태/voice(능동/수동)**, head word, 명명 개체, 부모·형제 노드... 수십 가지의 언어학적 feature를 손으로 설계해야 했다.

### 신경망: 모든 것을 한 번에

신경망은 이 모든 파이프라인을 **하나로** 합쳤다. SRL을 **span labeling 문제**로 보는 것이다.

1. **Span 식별**: 의미역을 갖는 단어 묶음(span)을 찾는다.
2. **Span 라벨링**: 그 span에 역할(Agent, Patient...)을 붙인다.

많은 신경망 모델이 이 둘을 **함께(jointly)** 푼다. 대표 모델(He et al., 2017)은 **[[posts/foundations/nlp/05-self-attention-and-bert|ELMo]] embedding + 여러 층의 highway BiLSTM tagger**로 각 단어에 `B-ARG0`, `I-ARG0`, `B-V` 같은 **BIO 태그**를 매긴 뒤, **Viterbi 디코딩으로 hard constraint를 만족하는** 라벨 열을 고른다. 더 이상 수작업 feature가 필요 없다 — 신경망이 문장을 잘 표현하면 알아서 풀린다. **ELMo가 성능을 크게 끌어올렸다.**

### 제약 만족은 정답의 필요조건일 뿐

주의할 점: 예측이 [[posts/foundations/nlp/11-syntactic-parsing|parse tree]]나 BIO 규칙과 **일관(consistent)** 되더라도 그것이 **정답이라는 보장은 없다.** 예를 들어 "with a hammer"를 통째로 Instrument로 잡는 것은 구조적으로 타당해도, 다른 잘못된 분할 역시 구조 제약은 만족할 수 있다. 즉 제약 만족은 정답의 **필요조건이지 충분조건이 아니다.**

## 정리

- **SRL(의미역 결정)** 은 문장에서 **누가 누구에게 무엇을 했는가**(Agent·Theme·Instrument·Location 등)를 서술어 중심으로 라벨링하는 **shallow semantic parsing**이다.
- 의미역은 문법적 **(주어, 동사, 목적어)와 다르다.** "The hammer broke the window"의 hammer는 주어지만 Instrument다. 같은 의미를 다양한 표면 형태로 써도 의미역 구조는 불변이다.
- 의미역을 형식적으로 정의하기 어려워, **PropBank**(동사별 Arg0/Arg1 번호)와 **FrameNet**(도메인별 역할)이 나왔다. Arg0≈agent, Arg1≈patient.
- 과거에는 [[posts/foundations/nlp/11-syntactic-parsing|parse tree]]+수십 개 수작업 feature의 파이프라인이었으나, 지금은 **BiLSTM(+ELMo) span labeling**으로 한 번에 푼다. SRL은 [[posts/foundations/nlp/08-question-answering|QA]]·번역·요약·정보 추출의 중간 표현으로 쓰여 **해석 가능성**을 더한다.
