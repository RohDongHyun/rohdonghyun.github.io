---
title: 08. 질의응답(QA)과 Reading Comprehension
date: 2026-06-24
tags:
  - NLP
---

> 서울대학교 데이터사이언스대학원 이재윤 교수님의 '인공신경망을 통한 자연어처리' 강의를 정리한 글입니다. (일부 슬라이드는 CS224n, mccormickml.com에서 인용)

[[posts/foundations/nlp/07-natural-language-generation|앞 글]]에서 텍스트 "생성"을 다뤘다. 이 글은 NLP에서 가장 직관적이고 응용이 많은 과제인 **질의응답(Question Answering, QA)** — 사람이 자연어로 던진 질문에 기계가 자동으로 답하는 것 — 을 다룬다. 특히 **글(텍스트)을 근거로 답을 찾는** text-based QA에 집중한다.

## QA란 무엇인가

QA는 1960년대(Simmons et al., 1964)까지 거슬러 올라가는 오래된 과제다. 기본 그림은 단순하다.

$$
\text{질문(Question)} \;\rightarrow\; [\text{문맥(Context)} + \text{모델}] \;\rightarrow\; \text{답(Answer)}
$$

지식의 형태에 따라 두 갈래로 나뉜다.

- **Text-based QA**: 지식과 질문이 모두 **자연어(비정형 텍스트, unstructured text)** 로 되어 있다. 위키피디아 문서, 웹 페이지 등에서 답을 찾는다.
- **Knowledge-base QA(KBQA)**: 지식이 **구조화된 지식 그래프(knowledge base)** 에 정리되어 있고, 이를 탐색해 답을 찾는다. (다음 글들에서 다룬다.)

이미 우리는 매일 QA를 쓴다. 구글에 "한국에서 가장 높은 산은?"이라 검색하면 답(백두산, 2,744m)과 근거 문단이 함께 뜬다. 스마트 스피커 사용자의 83%가 "질문하기"를 쓴다는 통계도 있다.

### QA의 분류축

QA 시스템은 세 가지 축으로 분류한다.

- **정보 출처(information source)**: 한 문단, 전체 웹, knowledge base, 표, 이미지 등
- **질문 유형(question type)**: factoid(사실형) vs non-factoid, open-domain vs closed-domain, 단순 vs 복합(compositional)
- **답 유형(answer type)**: 한 문단, 짧은 텍스트 조각(span selection), 객관식(multiple choice), yes/no 등

> **Fun fact**: 2011년 IBM Watson이 퀴즈쇼 Jeopardy(장학퀴즈 비슷)에서 인간 챔피언을 이겼다. 신경망이 보편화되기 *이전*이라, 질문 분석 → 후보 답 생성 → 후보 채점 → 신뢰도 병합·랭킹의 복잡한 파이프라인으로 만들어졌다.

## Reading Comprehension: QA의 핵심

QA를 딥러닝으로 푸는 기본 구조는 **문서(document)와 질문(question)을 함께 encoding**한 뒤, ⓐ 답을 생성하거나 ⓑ 문서 안의 span(구간)·문장을 고르거나 ⓒ 객관식 보기를 고르는 것이다.

이 중 **Reading Comprehension(RC, 독해)** 이 가장 대표적이다. 긴 지문 $P$(passage/context)와 질문 $Q$가 주어지면 답 $A$를 내놓는다.

$$
(P, Q) \;\rightarrow\; A
$$

예를 들어 테슬라의 일대기 지문과 "테슬라는 학교에서 어떤 언어를 공부했나?"라는 질문이 주어지면, 지문 속 "studied **German**"에서 답 "German"을 골라낸다. 답이 지문 안의 연속된 구간이므로 이를 **span selection**(구간 선택) 문제라 한다.

### 왜 RC가 중요한가

응용이 많은 것도 있지만, RC는 **기계가 언어를 얼마나 이해했는지 측정하는 척도**라는 점에서 중요하다. 사람도 독해 시험으로 이해도를 평가하지 않는가. Wendy Lehnert(1977)의 말이 자주 인용된다.

> "질문은 텍스트 이해의 어떤 측면이든 물을 수 있으므로, 질문에 답하는 능력은 이해를 보여주는 가장 강력한 증거다."

게다가 정보 추출, semantic role labeling 같은 **다른 많은 NLP 과제도 RC 문제로 환원**할 수 있다. 예: "Barack Obama, educated_at, ?"라는 관계 추출을 "오바마는 어디서 졸업했나?"라는 질문으로 바꿔 푼다.

## 모델링: attention이 핵심

RC 모델의 관건은 **문서와 질문 사이의 attention**이다. 질문의 어떤 단어가 문서의 어떤 부분과 관련되는지를 정렬해야 답을 찾을 수 있다.

### BiDAF: LSTM 기반 양방향 attention

**BiDAF(Bi-Directional Attention Flow)** 는 BERT 이전 시대의 대표 RC 모델로, SQuAD 1.1에서 span selection을 푼다. 핵심은 두 방향의 attention이다.

- **Context-to-Query**: 각 문서 단어에 대해 가장 관련 깊은 질문 단어를 찾는다. ("Who leads the United States?"라는 질문에서 문서의 "Obama", "president"가 질문 단어와 강하게 연결)
- **Query-to-Context**: 질문에 비추어 문서에서 가장 중요한 부분을 찾는다.

학습 목표는 답 span의 **시작(start)과 끝(end) 위치**를 동시에 맞히는 것이다.

$$
\mathcal{L} = -\log p_{\text{start}}(s^*) - \log p_{\text{end}}(e^*)
$$

ablation을 보면 attention이 얼마나 중요한지 드러난다. SQuAD 1.1에서 BiDAF는 77.3 F1을 얻는데, context-to-query attention을 빼면 67.7로 급락한다(query-to-context를 빼면 73.7). 둘 다 [[posts/foundations/nlp/05-self-attention-and-bert|attention]]이 성능을 좌우함을 보여준다.

### BERT 기반 RC

[[posts/foundations/nlp/05-self-attention-and-bert|BERT]]를 쓰면 훨씬 간단해진다. `[CLS] 질문 [SEP] 지문` 형태로 **이어 붙여(concat)** 입력하고, 출력에서 답 span의 start/end만 예측한다. 손실은 BiDAF와 똑같지만, **BiDAF 같은 별도 attention 구조 없이** BERT 자체의 self-attention이 그 역할을 한다.

$$
\mathcal{L} = -\log p_{\text{start}}(s^*) - \log p_{\text{end}}(e^*)
$$

위치 $i$가 시작/끝일 확률은 학습되는 벡터 $\mathbf{w}_{\text{start}}, \mathbf{w}_{\text{end}}$와 BERT의 hidden state $\mathbf{h}_i$로 계산한다.

$$
p_{\text{start}}(i) = \text{softmax}_i(\mathbf{w}_{\text{start}}^\top \mathbf{h}_i), \quad p_{\text{end}}(i) = \text{softmax}_i(\mathbf{w}_{\text{end}}^\top \mathbf{h}_i)
$$

BERT의 모든 파라미터(예: 110M)와 출력층 $\mathbf{w}_{\text{start}}, \mathbf{w}_{\text{end}}$를 **함께** fine-tune한다. 결과는 놀랍다.

| 모델 | F1 | EM |
|---|---|---|
| Human performance | 91.2 | 82.3 |
| BiDAF | 77.3 | 67.7 |
| BERT-base | 88.5 | 80.8 |
| BERT-large | 90.9 | 84.1 |
| XLNet / RoBERTa / ALBERT | ~94.5+ | ~89 |

(EM = Exact Match, 정확히 일치. F1은 부분 일치도 인정.) BERT-large가 EM에서 사람을 넘어섰고, 후속 모델들은 한참 더 앞선다.

> attention 관점에서 보면 BiDAF는 문서↔질문(P↔Q) attention만 갖지만, BERT는 P↔P, P↔Q, Q↔Q **모든 쌍**에 attention을 건다. 실제로 BiDAF에 문서 내부(P↔P) self-attention을 추가하면 성능이 오른다(Clark & Gardner, 2018). **SpanBERT**처럼 span 단위로 pretraining을 개선하면 더 좋아진다.

## RC는 풀린 문제인가? — 한계

벤치마크에서 사람을 넘었지만, 모델은 여전히 약하다.

- **데이터셋 자체의 한계**: SQuAD는 항상 답이 지문에 존재한다고 가정한다(현실은 답이 없을 수도 있다).
- **적대적 취약성(adversarial)**: Jia & Liang(2017)은 지문에 무관하지만 헷갈리는 문장 하나를 추가하면("Quarterback Jeff Dean had jersey number 37...") 모델이 엉뚱한 답(Jeff Dean)으로 바뀜을 보였다. BiDAF의 정확도가 75.5 → 34.3으로 폭락한다.
- **일반화 실패(generalization)**: 한 데이터셋(SQuAD)에서 fine-tune한 모델을 다른 데이터셋(TriviaQA 등)에 적용하면 성능이 크게 떨어진다.
- **행동 테스트(CheckList)**: 비교급/최상급 같은 단순 언어 현상에서도 높은 실패율을 보인다. 즉, 표면 패턴을 배웠을 뿐 진짜 추론은 약하다.

## Open-domain QA: 출처를 통째로

지금까지는 **지문이 주어진** closed-domain QA(=RC)였다. **Open-domain QA**는 지문이 없다. 질문만 주고 **세계 전체(예: 위키피디아 전부)** 에서 답을 찾아야 한다. 그래서 **검색(retrieval) 단계가 추가**된다.

### Retriever–Reader 구조 (DrQA)

고전적 방법인 **DrQA**는 두 단계다.

1. **Retriever(검색기)**: 질문과 관련된 문서를 위키피디아에서 찾는다. 전통적으로는 **TF-IDF** 같은 sparse 정보검색 모델(고정 모듈).
2. **Reader(독해기)**: 검색된 문서에서 RC 모델로 답 span을 찾는다. SQuAD 등으로 학습.

여기서 학습 데이터는 **distant supervision**으로 만든다. (Q, A) 쌍만 있을 때, 답 A를 포함하면서 질문을 논하는 듯한 웹 문단을 자동으로 모아 (P, Q, A)로 쓴다. 사람이 "이 문단이 정말 답의 근거인지" 검증하지는 않는다.

### Dense retrieval (DPR)

TF-IDF는 단어가 겹쳐야 검색되는 sparse 방식이라 한계가 있다. **DPR(Dense Passage Retrieval)** 은 질문과 문단을 각각 BERT로 **dense 벡터(CLS embedding)** 로 만들고, 내적 유사도로 검색한다.

$$
\text{sim}(q, p) = \mathbf{h}_q^\top \mathbf{h}_p
$$

질문용 $\text{BERT}_Q$와 문단용 $\text{BERT}_P$를 따로 두는 **bi-encoder**다. 모든 문단을 미리 벡터로 인덱싱해두고, 질문이 오면 **MIPS(Maximum Inner Product Search)** 로 top-$k$를 빠르게 찾는다. 단 1,000개의 Q/A 쌍으로 학습해도 BM25(고전 검색)를 이긴다.

### Retrieval + 생성: RAG, FiD

검색한 문단을 **생성 모델**에 넣어 답을 만드는 흐름으로 발전한다.

- **REALM**: retrieval + annotation
- **RAG / FiD(Fusion-in-Decoder)**: retrieval + generation. FiD는 DPR로 찾은 여러 문단을 T5 decoder에 한꺼번에 넣어 답을 생성하며, NaturalQuestions·TriviaQA에서 강력한 성능을 낸다.

이는 [[posts/foundations/nlp/06-pretrained-models-and-llm-limitations|LLM]]의 약점(stale knowledge, hallucination)을 외부 검색으로 보완하는 RAG 패러다임의 출발점이다.

### Reader 건너뛰기: DensePhrases

더 과감하게, reader 없이 **답 자체를 dense 벡터로 미리 인덱싱**할 수도 있다. 위키피디아의 모든 후보 답 구절(약 600억 phrase)을 벡터로 만들어두고, 질문 벡터와의 **nearest-neighbor search**로 곧장 답을 찾는다. 정답률은 다소 낮을 수 있지만 **매우 빠르다**. 다만 phrase가 너무 많아 인덱스 갱신 비용이 passage retrieval보다 클 수 있다.

## QA 데이터셋과 답 형식

QA는 답의 형태에 따라 여러 갈래로 나뉘고, 데이터셋도 그에 맞춰 만들어졌다.

- **Span selection**: 답이 지문 속 구간. **SQuAD**(위키 100k 질문), **TriviaQA**(distant supervision, 95k 질문).
- **Multiple-choice**: 객관식. **MCTest**(간단한 이야기), **RACE**(영어 독해 시험 10만 문항).
- **Cloze(빈칸 채우기)**: 기사 요약문에서 가려진 개체를 맞힘. **CNN/Daily Mail**.
- **Generative QA**: span에 매이지 않고 decoder로 **답을 생성**. **NarrativeQA**(이야기 기반). 평가가 어려워 BLEU/ROUGE 같은 NLG metric이나 retrieval metric(MRR)을 쓴다.
- **기타**: **Natural Questions**(실제 구글 검색 질문, 답이 substring/yes/no/없음일 수 있고 사람이 검증), **HotpotQA**(두 위키 문서를 거쳐야 풀리는 multi-hop 질문. 예: "'Armada'의 저자가 쓴 소설 중 스필버그가 영화화할 것은?" → Ready Player One).

## 정리

- **QA**는 자연어 질문에 자동으로 답하는 과제로, 텍스트 기반(text-based)과 지식그래프 기반(KBQA)으로 나뉜다. 출처·질문 유형·답 유형으로 세분된다.
- **Reading Comprehension(RC)** 은 지문 $P$와 질문 $Q$로 답 $A$를 찾는($(P,Q)\to A$) 핵심 과제이며, 보통 답 **span의 start/end**를 예측한다. 기계의 언어 이해를 재는 척도이고 많은 NLP 과제가 RC로 환원된다.
- 모델의 관건은 **문서↔질문 attention**이다. **BiDAF**는 양방향 attention(C2Q, Q2C)을 LSTM 위에 얹었고, **BERT**는 `[CLS]Q[SEP]P` concat 후 self-attention으로 더 간단·강력하게 푼다(사람 성능 추월).
- 벤치마크는 풀린 듯 보여도 모델은 **적대적 입력·일반화·단순 추론**에 약하다.
- **Open-domain QA**는 지문 없이 세계 전체에서 답을 찾으므로 **retriever–reader** 구조를 쓴다. TF-IDF → **DPR(dense bi-encoder + MIPS)** 로, 나아가 **RAG/FiD** 같은 retrieval+generation으로 발전했다.
