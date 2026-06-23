---
title: 06. Pretrained 모델의 종류와 LLM의 한계
date: 2026-06-24
tags:
  - NLP
---

> 서울대학교 데이터사이언스대학원 이재윤 교수님의 '인공신경망을 통한 자연어처리' 강의를 정리한 글입니다.

[[posts/foundations/nlp/05-self-attention-and-bert|앞 글]]에서 transformer와 pretraining/fine-tuning 패러다임, 그리고 BERT를 다뤘다. 이 글은 두 가지를 정리한다. 먼저 **pretrained 모델을 구조로 분류**하고(encoder / encoder-decoder / decoder-only), 거대 모델을 싸게 학습·튜닝하는 **PEFT**를 짚는다. 이어 GPT-3에서 ChatGPT로 이어진 흐름을 따라가며 **LLM이 여전히 갖는 한계와 사회적 문제**를 살펴본다.

## Pretrained 모델의 세 가지 구조

[[posts/foundations/nlp/04-lstm-and-seq2seq|seq2seq 글]]에서 본 transformer는 **encoder**와 **decoder** 두 덩어리로 이뤄진다. encoder는 입력 문장 전체를 읽어 표현으로 압축하고, decoder는 그 표현을 받아 출력을 한 단어씩 생성한다. 오늘날의 대표 모델들은 이 구조 중 **어느 부분을 쓰느냐**로 깔끔하게 나뉜다.

- **Encoder-only**: encoder만 쓴다. 입력 전체를 양방향으로 읽어 **이해(understanding)** 하는 데 강하다. 분류·NER·질의응답 등에 적합. 예: **BERT**, RoBERTa, ELECTRA, ALBERT.
- **Encoder-Decoder (seq2seq)**: 둘 다 쓴다. "입력을 읽고 → 새 출력을 생성"하는 번역·요약 같은 과제에 자연스럽다. 예: 원조 **Transformer**(Vaswani et al.), **BART**, **T5**.
- **Decoder-only**: decoder만 쓴다. 앞 단어들로 다음 단어를 예측하는 단방향 생성에 특화. 예: **GPT** 계열(GPT-1 ~ GPT-4).

| 구조 | 방향성 | 잘하는 일 | 대표 모델 |
|---|---|---|---|
| Encoder-only | 양방향 | 이해(분류·NER·QA) | BERT, RoBERTa |
| Encoder-Decoder | 입력 양방향 + 출력 단방향 | 변환(번역·요약) | T5, BART |
| Decoder-only | 단방향(좌→우) | 생성 | GPT 계열 |

핵심은 **seq2seq라는 큰 틀은 똑같고, 안의 부품만 바뀌었다**는 점이다. 과거에 RNN(LSTM)이 하던 자리를 self-attention이 대체했을 뿐이다. 그래서 원칙적으로는 "RoBERTa encoder + LSTM decoder"처럼 자유롭게 섞는 것도 가능하다.

> 회사로 나눠 보면, Google은 T5·BERT·ALBERT·Pegasus, Meta는 BART·OPT·RoBERTa, OpenAI는 GPT 계열을 내놓았다.

### Self-attention은 "온도가 있는 softmax"

self-attention의 핵심 식 $\text{softmax}(QK^T/\sqrt{d_k})V$에서 $\sqrt{d_k}$로 나누는 부분을 직관적으로 보면, 이는 **temperature가 있는 softmax**와 같다.

$$
\text{softmax}(z_i) = \frac{e^{z_i}}{\sum_j e^{z_j}} \quad\Rightarrow\quad \text{softmax}_T(z_i) = \frac{e^{z_i / T}}{\sum_j e^{z_j / T}}
$$

신경망의 출력값(logit)은 종종 너무 커져서(overshoot), 그냥 softmax를 취하면 한 곳에만 확률이 쏠린다(엔트로피가 낮아짐). $T$로 나눠 값을 눌러주면 분포가 부드러워진다. attention에서 $\sqrt{d_k}$가 바로 이 $T$ 역할을 해서, 특정 단어에만 과하게 쏠리는 것을 막아준다.

## PEFT: 거대 모델을 싸게 튜닝하기

문제가 하나 있다. 모델이 수십억~수천억 파라미터로 커지면, fine-tuning할 때 **전체 파라미터를 다 갱신**하는 것은 너무 비싸다. 과제마다 거대 모델 한 벌을 통째로 복사해 저장해야 한다.

이를 풀려는 것이 **PEFT(Parameter-Efficient Fine-Tuning)** 다. 핵심 발상은 같다: **사전학습된 가중치는 거의 그대로 얼리고(freeze), 아주 작은 추가 파라미터만 학습**하자.

- **Adapter**: transformer 층 사이에 작은 모듈(down-project → 비선형 → up-project)을 끼워 넣고, 그 모듈만 학습한다.
- **LoRA (Low-Rank Adaptation)**: 가중치 변화량 $\Delta W$를 **저랭크(low-rank)** 두 행렬의 곱 $BA$로 근사한다. 원래 가중치 $W$는 얼린 채 $A, B$만 학습한다. $W$와 병렬로 계산되므로 추론 속도 손해도 적다.

$$
h = W x + \Delta W x = W x + B A x
$$

- **Prefix tuning** 등도 같은 이야기다.

효과는 극적이다. 학습하는 파라미터를 **전체의 1% 안팎**으로 줄여도, 전체를 fine-tune한 것과 비슷한 성능이 나온다.

## LM에서 "Large" LM으로, 그리고 ChatGPT

[[posts/foundations/nlp/03-language-model-and-rnn|language model]]은 결국 "다음에 올 단어/문장을 예측"하는 모델이다. 이 단순한 목표가 강력한 이유는 **self-supervised learning**이기 때문이다.

고양이/개 이미지 분류처럼 사람이 일일이 라벨을 다는 것을 supervised learning이라 한다. 반면 "수학은 정말 재미있는 ____" 의 빈칸을 맞히는 일은 **문장 자체가 정답을 품고 있어** 별도 라벨이 필요 없다. 그래서 *세상의 모든 문서*를 학습 데이터로 쓸 수 있다. 이 점이 LM을 거대하게 키울 수 있게 한 원동력이다.

transformer의 확장성에 힘입어 모델은 폭발적으로 커졌다: ELMo·GPT(~1억) → BERT·GPT-2(수억~15억) → GPT-3(1750억). GPT 계열은 GPT-1(12층, 512토큰) → GPT-2(48층, 1024토큰) → GPT-3(96층, 2048토큰)로 깊이와 context 길이가 함께 늘었다.

### GPT-3에서 ChatGPT까지: RLHF

흥미로운 점은 **ChatGPT의 구조가 GPT-3와 본질적으로 같다**는 것이다. GPT-3(2020)는 이 정도 화제가 되지 않았는데, ChatGPT(2022)는 폭발적이었다. 그 사이 2년간 무엇이 바뀌었나? 핵심은 **"사람과 대화하는 것"에 집중**한 두 가지다.

1. 방대한 **대화(conversation) 데이터**로 학습.
2. **RLHF(Reinforcement Learning with Human Feedback)**, 즉 사람의 피드백을 이용한 강화학습.

RLHF는 보통 세 단계로 진행된다.

1. **SFT**: 사람이 시범으로 작성한 모범 답변으로 모델을 supervised fine-tuning한다.
2. **Reward model 학습**: 한 prompt에 대해 모델이 여러 답을 내면, 사람이 **좋은 순서로 순위를 매긴다**. 이 선호 데이터로 "답이 얼마나 좋은지"를 점수화하는 reward model을 학습한다.
3. **PPO로 정책 최적화**: reward model이 주는 점수를 보상으로 삼아, **PPO(Proximal Policy Optimization)** 강화학습으로 LM(정책)을 업데이트한다.

이미 Stiennon et al.(NeurIPS 2020)의 요약 연구에서, human feedback으로 학습한 모델이 supervised learning이나 pretrain-only보다 사람 선호도가 훨씬 높음이 확인된 바 있다.

여기에 **사용자가 많아질수록 더 많은 대화 데이터가 쌓이는 선순환**까지 더해져 ChatGPT는 빠르게 강해졌다.

> 최근 트렌드는 "파라미터를 키우는 것이 전부가 아니다"로 옮겨가고 있다. 데이터·알고리즘·정렬(alignment)이 함께 중요하며, **더 적은 파라미터 + 더 많은 데이터**로 학습한 모델(예: LLaMA)이 좋은 성능을 내기도 한다.

### 검색엔진과 무엇이 다른가

기존 검색(Google)은 "키워드 검색 → 엔진이 관련 문서 반환 → **사람이 직접** 답을 추출"하는 흐름이다. ChatGPT는 신경망이 학습한 지식으로 **질문하면 곧장 답을 생성**하고, 이를 반복(대화)할 수 있다. 거기에 더해 되묻기(clarifying question), 위험한 요청 거절, 이전 답 참조(multi-turn), 그리고 **prompting**으로 그때그때 과제를 정의할 수 있는 점이 특징이다.

- **Few-shot prompting**: 예시 몇 개("sea otter ⇒ 해달")만 줘도 과제를 정의할 수 있다.
- **Chain-of-Thought prompting**: 정답만 요구하지 않고 **중간 추론 단계**를 함께 보여주면, 특히 산술·논리 문제에서 정답률이 크게 오른다.

## LLM의 한계

> "It's a mistake to be relying on ChatGPT for anything important right now." — Sam Altman, Dec 2022

화려해 보이지만, ChatGPT도 **이전 LLM들과 기술적으로 크게 다르지 않기에 비슷한 한계**를 그대로 갖는다.

### 1) 일관성(consistency) 부족

모델은 논리적으로 연결된 질문에 **모순된 답**을 내놓곤 한다.

- "수성이 지구보다 큰가?" → "아니오"라고 잘 답한다. 그러면 "수성이 지구보다 작은가?"의 일관된 답은 당연히 "예"여야 하지만, 모델이 이를 **보장하지 않는다**.
- 사건 순서(event1 → event2 → event3)에서 추이관계를 묻는 문제도 기존 모델이 **20~60%**나 제약을 위반한다.

실제로 "A는 B 이전에 들어왔나?"와 "A는 B 이후에 들어왔나?"라는 **서로 반대되는 질문에 둘 다 '아니오'**라고 답하는 모순이 ChatGPT에서 관찰됐다. GPT-4는 답이 더 일관돼졌지만 완전히 해결된 것은 아니다.

### 2) 환각(Hallucination)

**Hallucination**은 모델이 사실이 아닌(nonfactual) 정보를 그럴듯하게 지어내는 현상이다. 작은 모델일수록 "180cm인 남자의 키는?"에 "200cm"라고 답하는 식으로, 질문에 답이 들어 있어도 틀린다.

ChatGPT는 이런 단순 환각은 줄었지만, **매우 그럴듯한 환각(realistic hallucination)** 이 문제다. 예컨대 실존하지 않는 경력을 붙여 특정 교수를 소개하거나, "세종대왕의 맥북 프로 던짐 사건"처럼 존재하지 않는 사건을 진지하게 서술한다(이 사례는 밈이 되기도 했다). GPT-4가 환각을 약 19%p 줄였지만, 여전히 모든 범주에서 20% 이상 남아 있다.

### 3) 수학·산술 추론

LLM은 의외로 단순 산수에 약하다. `(1+2+5-7)/3`을 묻자 괄호 안은 `1`로 잘 계산해 놓고 "3으로 나누면 1"이라고 답하는 식이다(정답 1/3).

표-텍스트 수치 추론에서도, 계산 없이 표의 숫자를 그대로 가져오거나, **Chain-of-Thought로 수식은 올바르게 세워 놓고도** 마지막 산수를 틀린다. GPT-4는 수학·산술이 개선됐지만 여전히 약점으로 남는다.

> 이 밖에도 **오래된 지식(stale knowledge)**(지식이 파라미터에 "암기"돼 시점이 고정됨), 다단계 추론(multi-hop) 취약, 자원 소모, 특정 표현 남용 등 한계가 많다.

## 사회적 문제

기술적 한계와 별개로, 거대 모델은 새로운 사회 문제를 낳는다.

- **사람 vs. AI 구분**: AI가 쓴 글이 사람 글과 구분하기 어려워졌다. "AI 탐지기"가 있지만, 한 번 "더 독창적으로 다시 써줘"라고 시키면 탐지기가 사람 글로 오판한다. **탐지만으로는 부족하다.**
- **저작권**: GitHub Copilot이 학습 데이터의 코드를 라이선스 무시하고 거의 그대로 뱉어내, Microsoft·GitHub·OpenAI를 상대로 집단소송이 제기됐다.
- **유해 콘텐츠**: 공격·폭력 계획에 악용될 수 있는 답을 생성할 위험(GPT-4 리포트의 레드팀 사례).
- **자원·환경 비용**: GPT-3 한 번 학습에 약 **1,287 MWh**(일반 가정 120년치 전력), 탄소 **550톤**이 들었다. 추론도 무거워서, 쿼리 하나에 A100 GPU 여러 장이 필요하고 ChatGPT 한 달 운영 전력이 GPT-3를 십수 번 학습할 양에 달한다는 추정이 있다.

## 앞으로의 방향

강의에서 제시한 연구 방향은 다음과 같다.

- **사실(fact)과 언어 이해/생성을 분리**하기. 지식을 파라미터에 통째로 암기시키는 대신, 사실은 따로 관리하고 언어 능력만 모델이 담당하게.
- **논리적 일관성**을 보장하는 모델. 여러 출처의 정보를 종합·추론할 때 특히 중요하다.
- 닫힌(closed) black-box 시스템과 **어떻게 협업**할 것인가.
- **자원 효율적인 모델**(PEFT, 경량화 등).

## 정리

- pretrained 모델은 transformer의 어느 부분을 쓰느냐로 나뉜다: **encoder-only(BERT, 이해)**, **encoder-decoder(T5/BART, 변환)**, **decoder-only(GPT, 생성)**. 큰 틀(seq2seq)은 같고 RNN이 self-attention으로 바뀌었을 뿐이다.
- **PEFT(Adapter·LoRA 등)** 는 거대 모델의 가중치를 얼리고 1% 안팎의 추가 파라미터만 학습해 싸게 튜닝한다.
- ChatGPT는 GPT-3와 구조가 같고, **대화 데이터 + RLHF**로 "사람과의 대화"에 특화됐다.
- 그럼에도 **일관성 부족·환각·산술 약점** 등 LLM의 한계를 공유하며, **AI 판별·저작권·유해성·자원 소모**라는 사회적 문제를 함께 던진다.
