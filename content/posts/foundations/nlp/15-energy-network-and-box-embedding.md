---
title: 15. 라벨 의존성 자동 학습 — SEAL과 Box Embedding
date: 2026-06-24
tags:
  - NLP
---

> 서울대학교 데이터사이언스대학원 이재윤 교수님의 '인공신경망을 통한 자연어처리' 강의를 정리한 글입니다. 이 글은 교수님 연구실(SKI-ML)의 연구를 소개한 강의로, SEAL(NeurIPS 2022)과 Box Embedding(ICLR 2022) 논문에 기반합니다.

[[posts/foundations/nlp/13-structured-prediction|구조적 예측]]에서 출력 라벨들이 **서로 의존한다**는 것을 봤다. 그때는 CRF의 transition matrix처럼 의존성을 **사람이 1차로 정해줬다.** 그런데 현실 데이터에는 **수천 개의 라벨과 의존성**이 얽혀 있다. 이 글은 그 의존성을 **데이터에서 자동으로 학습**하는 두 방법 — **에너지 네트워크(SEAL)** 와 **Box Embedding** — 을 다룬다. 이 강의 시리즈의 마지막 글이다.

## 문제: 라벨 의존성을 일일이 정의할 수 없다

[[posts/foundations/nlp/13-structured-prediction|앞에서]] 본 구조적 예측의 출력에는 다양한 제약(constraint)·지식(knowledge)이 깔려 있다.

- **라벨 분류 체계(taxonomy)**: "Science Fiction"이면 반드시 "Fiction"이다(상하위 관계).
- **언어학적 제약**: [[posts/foundations/nlp/11-syntactic-parsing|parse tree]]가 문법 규칙을 만족해야 한다.
- **논리적 제약**: 대칭성(P가 Q의 부모면 Q는 P의 자식), 추이성(P→Q, Q→R이면 P→R).

이런 지식을 모델에 **주입(injection)** 하면 좋다. 하지만 책 장르 분류(BGC)나 단백질 기능 분류(FunCat)처럼 **수천 개 변수와 의존성**이 있으면, 그것을 사람이 일일이 annotate하기는 **비싸고 전문 지식이 필요**하다. 그래서 질문은 이것이다 — **의존성을 데이터에서 자동으로 잡아낼 수 없을까?**

## 에너지 네트워크 vs Feedforward

보통의 신경망은 **feedforward** 다. 입력 $x$를 표현 $h_x$로 바꾸고, 거기서 각 라벨 $y_1, \dots, y_L$ 을 **따로따로** 예측한다($P(y \mid x)$). $x$의 표현이 출력 의존성을 알아서 처리하길 기대하지만, **라벨끼리의 의존성을 직접 잡기는 어렵다.** 대신 추론이 가볍고 빠르다.

**에너지 기반 모델(energy-based model)** 은 다르게 접근한다. 입력 $x$와 **출력 전체 $\mathbf{y}$를 함께 입력**받아, 그 조합이 얼마나 잘 어울리는지 **호환성 점수(compatibility score)** $E_\Theta(x, \mathbf{y})$ 하나로 매긴다.

- **장점**: 출력 변수들 사이의 의존성을 **직접** 포착한다 → 더 정확하다.
- **단점**: 추론할 때 $E$가 최소가 되는 $\mathbf{y}$를 **거대한 조합 공간에서 찾아야** 한다. 보통 **gradient 기반 추론(GBI)** 으로 $y$를 경사하강해 찾는데, **느리고 불안정**하며 초기값·step size 같은 hyperparameter에 민감하다.

> 비유: feedforward는 빠른 직관, energy network는 정확하지만 느린 숙고. 둘의 장점만 합칠 수 없을까?

## SEAL: 에너지 네트워크를 "손실 함수"로 쓴다

**SEAL(Structured Energy network As a Loss)** 의 아이디어는 단순하고 강력하다 — 에너지 네트워크를 **추론에 쓰지 말고, 학습할 때 손실 함수로만 쓰자.**

- **Task-net $\Phi$**: 빠른 feedforward. **추론 시 실제로 쓰는 네트워크.**
- **Loss-net $\Theta$**: 구조적 에너지 네트워크. **학습 가능한 손실 함수** 역할만 한다.

학습 시 task-net의 손실은 두 항의 가중합이다 — ① 에너지를 낮추기(= 호환성 점수 높이기, loss-net이 가르치는 구조 반영) + ② 정답과의 cross-entropy(supervised). 추론 때는 무거운 GBI 없이 **task-net만 한 번 통과**시키면 된다. 그래서 **feedforward만큼 빠르면서 에너지 네트워크의 정확도**를 얻는다.

### 두 가지 버전

- **SEAL-static**: 에너지 네트워크를 **먼저 따로 학습**한 뒤 **얼려서(frozen)** loss-net으로 쓴다.
- **SEAL-dynamic**: loss-net과 task-net을 **번갈아 업데이트(alternate updates)** 해, loss-net이 task-net에 **동적으로 적응**한다. **학생(task-net)에 맞춰 가르치는 적응형 교사**에 비유된다. 실험에서 **SEAL-dynamic이 가장 좋다**(Energy network < SEAL-static < SEAL-dynamic).

### Loss-net을 학습하는 세 가지 에너지 손실

loss-net 자체는 **정답 $(x, y)$ 쌍을 negative 샘플과 대조(contrast)** 하도록 학습된다. 세 가지 손실을 실험했다.

- **Margin(SSVM)** — [[posts/foundations/nlp/13-structured-prediction|structured hinge loss]]와 같은 발상. 정답 $\mathbf{y}$가 임의의 오답 $\tilde{\mathbf{y}}$보다 margin $\Delta(\tilde{\mathbf{y}}, \mathbf{y})$ 이상 낮은 에너지를 갖도록 한다(SPEN, Belanger & McCallum 2016).

$$
\mathcal{L}_{E}^{\text{margin}} = \sum_{x, y} \max_{\tilde{\mathbf{y}}}\big[\Delta(\tilde{\mathbf{y}}, \mathbf{y}) - E_\Theta(x, \tilde{\mathbf{y}}) + E_\Theta(x, \mathbf{y})\big]_{+}
$$

- **Regression** — 에너지가 곧 관심 지표(F1 등) $s(\tilde{\mathbf{y}}, \mathbf{y})$ 를 직접 출력하도록 회귀로 맞춘다(DVN, Gygli et al. 2017).
- **NCE ranking** — Noise Contrastive Estimation. 정답 $\mathbf{y}^{(0)}$ 가 noise 분포에서 뽑은 $K$개 후보보다 높은 점수를 받도록 한다($s(x, \mathbf{y}; \Theta) = -E_\Theta(x, \mathbf{y}) - \log P_N(\mathbf{y})$).

### 결과: 빠르고, 정확하고, 제약을 지킨다

SEAL은 feature 기반 MLC, 텍스트 MLC, [[posts/foundations/nlp/12-semantic-role-labeling|의미역 결정(SRL)]], 이진 이미지 segmentation에서 cross-entropy보다 일관되게 높은 성능을 냈고, 추론은 GBI 대비 **평균 3.63배 빠르다.**

흥미로운 점은 [[posts/foundations/nlp/12-semantic-role-labeling|SRL]]에서다. **Unique Core Role(UCR) 위반율**(한 서술어에 같은 core argument가 중복되면 안 된다는 제약)을 보면, SEAL-dynamic은 별도 제약을 명시하거나 [[posts/foundations/nlp/13-structured-prediction|CRF]] 층을 쓰지 않고도 BERT-CRF보다 위반이 적고 F1은 더 높았다(CoNLL-12 test F1 86.90, UCR 0.91%). 즉 **에너지 네트워크가 라벨 의존성을 데이터에서 알아서 배운다.** 실제로 두 라벨에 연관이 있으면 에너지의 gradient가 그 연관을 포착하지만, 일반 binary cross-entropy(BCE)는 라벨 간 연관을 전혀 잡지 못한다.

## Box Embedding: 비대칭·계층 관계를 담는 표현

에너지 네트워크가 의존성을 **손실로** 잡았다면, **Box Embedding**(Patel, Dangati, Lee et al., ICLR 2022)은 의존성을 **표현(representation)** 자체로 잡는다.

문제의식: 보통의 **vector embedding은 계층(부모-자식) 관계를 담기 어렵다.** "Fiction은 Classic Fiction의 부모"라는 비대칭 관계를, 점(vector) 사이 거리로는 표현하기 까다롭다.

해법: 라벨을 **점이 아니라 상자(box, 축에 정렬된 직사각형)** 로 표현한다. 그러면 **포함(containment) 관계**로 계층을 자연스럽게 표현할 수 있다 — **부모 라벨의 상자가 자식 라벨의 상자를 포함**한다. 문서 $x$가 어떤 상자 안에 들어 있으면 그 라벨을 갖는 것이다.

핵심 장점은 **$x$와 무관하게 일관된 라벨 배치**가 존재한다는 것이다. vector는 입력마다 라벨 위치가 흔들리지만, box는 "fiction 상자가 classic fiction 상자를 포함"한다는 구조가 고정된다. 상자 사이 **조건부 확률** $P(b_i \mid b_j)$ 를 겹침 부피로 정의해 학습한다. 13개 MLC 데이터셋에서 box가 vector·hyperbolic보다 정확도(MAP)가 높고 taxonomy 위반율도 낮았으며, **분류 체계를 직접 주입한 모델(c-HMCNN)에 견줄 만했다.**

box는 **대칭성·추이성** 같은 논리 제약도 구조적으로 보장한다. 사건-사건 관계 추출(event-event relation extraction, Hwang & Lee, ACL 2022)에서 "event1 after event2, event2 after event3 ⟹ event1 after event3" 같은 추이성을, 상자 포함 관계로 자동 만족시킨다. vector 모델이 20~60% 위반하던 제약을 box는 **3% 이하**로 줄였다.

## 응용: LLM의 비일관성 다루기

이 연구의 동기는 결국 **ML 모델, 특히 LLM이 논리적으로 일관되지 않다**는 문제다. [[posts/foundations/nlp/08-question-answering|앞서 QA]]에서 본 것과 같은 맥락이다.

- **Q-A 쌍 비일관**: "CO2 증가가 북극곰을 늘리나?"에 No, "줄이나?"에도 No라고 답한다(둘 다 No일 수 없다).
- **정보 추출 비일관**: 추출한 사건들의 시간 관계가 추이성을 어긴다.
- **외부 지식 비일관(hallucination)**: "세종대왕의 맥북 던짐 사건"을 실제 기록인 양 지어낸다.

이는 **실서비스에서 배포를 막고**(integrity 훼손), **사회적으로 해로운 정보**를 그럴듯하게 퍼뜨릴 수 있다. 해법으로, **에너지 네트워크를 LLM 출력의 "control module"** 로 붙이는 접근을 제시한다. LLM 가중치를 못 건드리거나(접근 불가·너무 큼) 할 때, 출력 $Y$의 비일관성을 **에너지로 측정**하고 에너지 표면을 따라 **locate & edit**(문제 부분을 찾아 고치기)를 반복해 toxicity·incoherence·hallucination을 완화한다.

## 정리

- 현실 데이터의 출력에는 **수천 개의 라벨 의존성**(taxonomy·논리·언어 제약)이 있지만, 일일이 annotate하기는 비싸다 → **데이터에서 자동으로 학습**해야 한다.
- **에너지 기반 모델**은 입력·출력 전체의 호환성을 한 점수로 매겨 라벨 의존성을 **직접** 잡지만, 추론(GBI)이 느리고 불안정하다.
- **SEAL**은 에너지 네트워크를 **추론이 아니라 학습용 손실 함수(loss-net)** 로만 쓰고, 추론은 빠른 **task-net**으로 한다 → feedforward만큼 빠르면서 더 정확. **SEAL-dynamic**(번갈아 업데이트, 적응형 교사)이 최고. [[posts/foundations/nlp/13-structured-prediction|structured hinge]]·regression·NCE 손실로 loss-net을 학습한다.
- **Box Embedding**은 라벨을 **상자**로 표현해 **포함 관계로 계층·비대칭·추이성**을 구조적으로 담는다. vector가 20~60% 어기던 논리 제약을 3% 이하로 줄인다.
- 두 방법 모두 **지식을 모델에 주입**해 [[posts/foundations/nlp/08-question-answering|LLM의 비일관성·hallucination]]을 다루는 데로 이어진다 — 에너지 네트워크를 LLM의 control module로 붙여 출력을 검증·수정하는 식이다.
