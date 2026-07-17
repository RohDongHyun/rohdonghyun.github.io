---
title: LLM Wiki는 RAG와 무엇이 다른가
date: 2026-07-17
tags:
  - AI Agent
  - RAG
---

## 들어가며 — "이거 그냥 RAG 아닌가?"

최근 "LLM Wiki"라는 개념을 살펴보다 보면 자연스럽게 이런 의문이 든다. *"LLM이 외부 문서를 참고해서 답변한다는 건데, 그럼 RAG랑 뭐가 다른 거지?"* 둘 다 "LLM 밖에 있는 지식을 LLM이 활용하게 만든다"는 목표는 같아 보이기 때문이다.

결론부터 말하면, 둘의 차이는 **검색 기술의 차이가 아니라 지식 관리 패턴의 차이** 다. RAG는 질문이 들어올 때마다 원본 조각을 즉석에서 조립하는 방식이고, LLM Wiki는 자료가 들어오는 시점에 미리 정리·종합해 두고 그 결과물을 계속 키워가는 방식이다. 이 글에서는 RAG를 짧게 복습한 뒤, LLM Wiki가 무엇인지, 그리고 두 접근이 정확히 어디서 갈라지는지 정리한다.

## RAG 복습 — 질의 시점에 조각을 조립하는 pipeline

RAG(Retrieval-Augmented Generation)는 [Lewis et al. (NeurIPS 2020)](https://arxiv.org/abs/2005.11401)이 제안한 구조로, LLM의 **parametric memory**(모델 weight에 학습으로 새겨진 지식)에 **non-parametric memory**(외부 문서 index — 원 논문에서는 Wikipedia의 dense vector index)를 결합한다. 질의가 들어오면 neural retriever(원 논문은 DPR(Dense Passage Retrieval) 계열 — 질의와 문서를 같은 embedding 공간에 놓고 가까운 문서를 찾는 dense retriever)가 관련 passage를 찾아 generator(원 논문은 seq2seq 생성 모델인 BART)에 넘겨 답을 생성한다.

![RAG 개요: retriever(query encoder + document index)와 generator(seq2seq)를 결합해 end-to-end로 학습하는 구조](https://ar5iv.labs.arxiv.org/html/2005.11401/assets/x1.png)

*RAG 원 논문의 Figure 1. query encoder와 document index로 구성된 retriever가 문서를 찾고, seq2seq generator가 이를 받아 출력을 생성하는 전체 구조를 보여준다. 출처: [Lewis et al. 2020, arXiv:2005.11401](https://arxiv.org/abs/2005.11401)*

원 논문의 RAG-Sequence 모델은 출력 확률을 다음과 같이 정의한다.

$$
p_{\text{RAG-Sequence}}(y \mid x) \approx \sum_{z \in \text{top-}k\, p_\eta(\cdot \mid x)} p_\eta(z \mid x)\, \prod_{i=1}^{N} p_\theta(y_i \mid x, z, y_{1:i-1})
$$

여기서 $x$는 질의, $z$는 검색된 문서, $p_\eta(z \mid x)$는 retriever가 문서 $z$를 뽑을 확률, $p_\theta$는 문서를 조건으로 답변 token을 하나씩 생성하는 generator다. 이 식이 말하는 것은 명확하다 — **답변은 "top-$k$개 문서 각각을 조건으로 생성한 답변"을 retriever 확률로 가중 평균한 것** 이다. 즉 어떤 문서를 신뢰할지($p_\eta$)와 그 문서로 무엇을 말할지($p_\theta$)를 곱해서 합치는 구조이며, 지식은 전적으로 **질의 시점의 검색 결과**에 의존한다.

실무에서 쓰이는 현대적 RAG pipeline은 보통 이렇게 요약된다.

1. **Chunking** — 문서를 일정 크기(예: 500 token)의 조각으로 기계적으로 자른다.
2. **Embedding** — 각 chunk를 embedding 모델로 vector로 변환한다.
3. **Vector DB 저장** — vector를 index에 넣는다.
4. **유사도 검색** — 질의가 오면 질의 vector와 가까운 top-$k$ chunk를 찾는다.
5. **Generation** — 찾은 chunk를 prompt에 넣어 LLM이 답을 생성한다.

핵심 특징은 **stateless** 라는 점이다. 질문에 답하고 나면 아무것도 남지 않는다. 같은 질문이 100번 들어오면 100번 같은 검색과 종합을 반복한다.

## LLM Wiki란 — 수집 시점에 종합을 끝내는 패턴

LLM Wiki는 2026년 4월 Andrej Karpathy가 [gist 문서](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)로 공개한 아이디어에서 나온 패턴이다. Karpathy는 RAG 방식의 문제를 이렇게 짚는다.

> "the LLM is rediscovering knowledge from scratch on every question. There's no accumulation."
> (LLM이 질문마다 지식을 처음부터 다시 발견하고 있다. 누적이 없다.)

그래서 제안하는 것이 "the LLM incrementally builds and maintains a **persistent wiki** — a structured, interlinked collection of markdown files", 즉 LLM이 점진적으로 쌓아 올리고 유지하는, 서로 링크된 markdown 파일 모음이다. 특정 앱이나 framework가 아니라 **패턴**이라는 점이 중요하다 — markdown 파일과 파일시스템만으로 시작할 수 있고, Claude Code나 OpenAI Codex 같은 agent 도구, [nvk/llm-wiki](https://github.com/nvk/llm-wiki) 같은 구현체와 자연스럽게 연결된다.

### 3계층 구조

gist 자체는 "의도적으로 추상적"이라 특정 디렉토리 구조를 규정하지 않는다. 다만 세 계층을 파일로 옮기면 대략 이런 모습이 된다 (이해를 돕기 위한 구성 예시).

```
llm-wiki/
├── raw/          (1) Raw Sources — 불변 원본. LLM은 읽기만 한다
├── wiki/         (2) The Wiki    — LLM이 작성·유지하는 markdown 페이지
│   ├── index.md        전체 페이지 목록 + 각 1줄 요약
│   └── log.md          시간순 작업 기록 (append-only)
└── CLAUDE.md     (3) The Schema  — 위키의 구조·컨벤션·워크플로 정의
```

- **Raw Sources**: 논문 PDF, 회의록, 코드 등 원본. 절대 수정하지 않는다. 위키가 잘못 정리했더라도 원본으로 돌아가 다시 만들 수 있게 하는 안전장치다.
- **The Wiki**: LLM이 원본을 읽고 **합성(synthesize)** 한 페이지들. 단순 복사가 아니라 개념·entity 단위로 설명하고, 맥락을 붙이고, 서로 cross-reference를 건다.
- **The Schema**: "페이지는 어떤 단위로 나누는가, 어떤 컨벤션으로 쓰는가"를 LLM에게 알려주는 문서. gist는 Claude Code의 `CLAUDE.md`, Codex의 `AGENTS.md` 같은 설정 문서를 예로 들며, 사람과 LLM이 함께 다듬어 간다(co-evolve)고 설명한다. 사람의 역할은 "소스를 큐레이션하고, 분석 방향을 정하고, 좋은 질문을 던지는 것"이고 나머지는 전부 LLM의 일이다.

### 3가지 동작

- **Ingest**: 새 소스가 추가되면 LLM이 관련 위키 페이지와 index를 갱신한다 — 소스 하나가 페이지 10~15개를 건드리기도 한다. 종합 작업이 **이 시점에** 일어난다.
- **Query**: 질문이 오면 index와 링크를 따라 페이지를 찾아 답한다. 좋은 답변은 새 페이지로 저장된다 — 질문조차 지식 축적의 재료가 된다.
- **Lint**: 주기적으로 위키의 건강 상태를 점검한다. Karpathy의 표현으로는 "contradictions between pages, stale claims that newer sources have superseded, orphan pages with no inbound links" — 페이지 간 모순, 새 소스가 대체한 낡은 주장, 들어오는 링크가 없는 고아 페이지를 찾는다.

### 왜 LLM에게 위키를 맡기는가

사람이 위키를 포기하는 이유에 대한 Karpathy의 진단이 이 패턴의 핵심 논리다.

> "The tedious part of maintaining a knowledge base is not the reading or the thinking — it's the bookkeeping."
> (지식 베이스 유지에서 지겨운 부분은 읽기나 생각하기가 아니라 장부 정리다.)

cross-reference 갱신, index 정리, 모순 체크 같은 **bookkeeping**(장부 정리성 잡무)은 사람에게는 지루해서 결국 방치되는 일이지만, LLM은 지루해하지도, cross-reference 갱신을 잊지도 않는다. 그 결과 질문이 들어왔을 때는 "The cross-references are already there. The contradictions have already been flagged." — 링크는 이미 걸려 있고 모순은 이미 표시되어 있는 상태에서 답하게 된다.

## 핵심 차이 — 언제, 무엇을, 누가

| 측면 | RAG | LLM Wiki |
|---|---|---|
| 계산 시점 | 질의 시점 (query-time synthesis) | 수집 시점 (ingest-time compilation) |
| 지식 단위 | 기계적으로 자른 chunk | LLM이 큐레이션·합성한 위키 페이지 (개념/entity 단위) |
| 생성·유지 주체 | 자동 indexing pipeline | LLM이 편집·요약, 사람은 schema·소스 큐레이션 |
| 조회 방식 | embedding 유사도 검색 | index + 링크 그래프 탐색 |
| 갱신 방식 | re-indexing | 페이지 편집 + lint |
| 상태 | stateless — "no accumulation" | persistent — 쓸수록 좋아지는 누적 자산 |
| 인프라 | vector DB, embedding 모델 | plain markdown + 파일시스템 |

표를 관통하는 한 문장은 이것이다. **RAG와 LLM Wiki는 경쟁하는 검색 기술이 아니라, "지식을 언제 종합하고 어디에 남기느냐"에 대한 서로 다른 관리 패턴이다.** compiler에 비유하면 RAG는 실행할 때마다 소스를 해석하는 interpreter, LLM Wiki는 미리 컴파일해 두는 compiler에 가깝다.

구체적인 예로, 연구실에서 논문 50편을 관리한다고 하자.

- **RAG 방식**: 50편을 chunk로 잘라 vector DB에 넣는다. "attention의 계산 복잡도를 개선한 방법들은?"이라고 물으면, 그 순간 유사도 검색으로 chunk 몇 개를 뽑아 즉석에서 답을 조립한다. 답하고 나면 아무것도 남지 않고, 다음에 비슷한 질문이 와도 처음부터 다시 한다. chunk가 문맥 중간에서 잘렸다면 "이 논문이 저 논문의 한계를 지적했다"는 논문 간 관계는 검색에 잘 걸리지 않는다.
- **LLM Wiki 방식**: 논문이 추가될 때마다 LLM이 `efficient-attention.md` 같은 주제 페이지를 갱신하고, 관련 논문 페이지들에 cross-reference를 걸어 둔다. 같은 질문이 오면 이미 종합이 끝난 페이지를 읽고 답한다. "논문 A의 주장은 논문 B가 반박했다"는 관계는 ingest와 lint 단계에서 이미 페이지에 명시되어 있다.

## 언제 무엇을 쓰나

DEV Community의 [실무 비교 글](https://dev.to/vishalmysore/rag-vs-agent-memory-vs-llm-wiki-a-practical-comparison-1oo6)과 Karpathy gist를 종합하면 선택 기준은 이렇다.

- **RAG가 맞는 경우**: 일회성 질의, 대규모이거나 자주 통째로 바뀌는 corpus. 매번 위키를 정성 들여 갱신할 이유가 없고, 최신 원본에서 바로 검색하는 편이 낫다.
- **LLM Wiki가 맞는 경우**: 같은 배경지식을 반복해서 쓰고 자료가 계속 누적되는 장기 프로젝트 — 연구 노트, 팀 위키, 코드베이스 문서 등. 종합 비용을 한 번 내면 이후 모든 질의가 그 자산을 공유한다.

물론 LLM Wiki에도 약점이 있다. **오류 증폭**(ingest 시점의 잘못된 해석이 위키에 새겨져 이후 모든 답변에 영구 반영됨), **지속 유지 비용**(schema drift — 시간이 지나며 페이지들이 정해둔 구조·컨벤션에서 어긋나는 현상 — 과 모순 해소에 드는 노력), 그리고 질의 시점에 독자·질문에 맞춰 재구성하는 **맞춤성의 부재**다. RAG는 반대로 이 세 가지에서 자유롭다.

두 접근은 상호 배타적이지 않다. 위키 페이지 자체를 RAG의 검색 대상으로 삼는 하이브리드 — 잘 정리된 페이지를 embedding해 두고 유사도 검색으로 찾는 방식 — 도 이야기되는데, 다만 이는 아직 표준 practice라기보다 커뮤니티 논의 수준이라는 점은 감안해야 한다.

## 맥락 — 이 아이디어는 어디서 왔고 어디로 가는가

"LLM이 스스로 외부 기억을 편집·유지한다"는 아이디어 자체는 학술적으로 계보가 있다.

- **MemGPT** ([Packer et al. 2023, arXiv:2310.08560](https://arxiv.org/abs/2310.08560)): LLM이 함수 호출로 자기 메모리를 스스로 편집하는 self-editing memory 구조.
- **Generative Agents** ([Park et al. 2023, arXiv:2304.03442](https://arxiv.org/abs/2304.03442)): 경험을 memory stream에 쌓고 reflection으로 상위 지식으로 합성하는 agent 시뮬레이션.
- **A-MEM** ([Xu et al. 2025, arXiv:2502.12110](https://arxiv.org/abs/2502.12110)): Zettelkasten 원칙(노트를 원자 단위로 쪼개고 링크로 연결하는 지식 관리법)에 기반해 메모리를 동적으로 indexing·링크하는 네트워크. LLM Wiki와 가장 유사한 학술 버전이다.
- 이 흐름 전반은 서베이 [Hu et al. 2025, "Memory in the Age of AI Agents" (arXiv:2512.13564)](https://arxiv.org/abs/2512.13564)에 정리되어 있다.

산업 쪽에서는 표준화 움직임도 시작됐다. Google Cloud는 2026년 6월 [Open Knowledge Format (OKF) v0.1](https://cloud.google.com/blog/products/data-analytics/how-the-open-knowledge-format-can-improve-data-sharing/)을 발표하며 Karpathy의 패턴을 명시적으로 인용했다. YAML frontmatter를 가진 plain markdown 디렉토리 + index + log + 링크 그래프라는 구성으로, SDK나 런타임 없이 이식·상호운용이 가능하도록 [공개 스펙](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md)으로 정의했다. "vector DB 없이 markdown 파일만으로"라는 LLM Wiki의 인프라적 가벼움이 표준화에도 유리하게 작용하는 셈이다.

개인적으로는 이 패턴이 지금 이 블로그 같은 지식 저장소 운영과도 맞닿아 있다고 본다 — agent가 글을 쓰고, index를 유지하고, 글 사이에 링크를 거는 구조는 사실상 LLM Wiki의 Ingest·Lint를 수동 트리거로 돌리는 것과 같다.

## 참고 자료

- 출발점이 된 글: [LLM위키 완벽 가이드 (wikidocs)](https://wikidocs.net/353379)
- Karpathy의 원 gist: [LLM Wiki idea](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)
- Lewis et al., "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks", NeurIPS 2020 — [arXiv:2005.11401](https://arxiv.org/abs/2005.11401)
- [RAG vs Agent Memory vs LLM Wiki: A Practical Comparison (DEV Community)](https://dev.to/vishalmysore/rag-vs-agent-memory-vs-llm-wiki-a-practical-comparison-1oo6)
- [Google Cloud — Open Knowledge Format 발표](https://cloud.google.com/blog/products/data-analytics/how-the-open-knowledge-format-can-improve-data-sharing/) / [OKF SPEC](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md)
- 구현체: [nvk/llm-wiki](https://github.com/nvk/llm-wiki)
- Packer et al., "MemGPT" — [arXiv:2310.08560](https://arxiv.org/abs/2310.08560)
- Park et al., "Generative Agents" — [arXiv:2304.03442](https://arxiv.org/abs/2304.03442)
- Xu et al., "A-MEM: Agentic Memory for LLM Agents" — [arXiv:2502.12110](https://arxiv.org/abs/2502.12110)
- Hu et al., "Memory in the Age of AI Agents" — [arXiv:2512.13564](https://arxiv.org/abs/2512.13564)
