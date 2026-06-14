---
title: AI Agent 구조 설계 개요 — 워크플로부터 멀티 에이전트까지
date: 2026-06-07
tags:
  - AI Agent
---

이 글은 "업무 자동화 시스템을 AI Agent로 어떻게 짤 것인가"를 다루는 시리즈의 출발점이다. 여기서 깊게 파고들기보다는, **어떤 구조들이 있고 언제 무엇을 골라야 하는지**를 한눈에 잡는 전체 지도(map)를 그리는 것이 목표다. 각 패턴과 구조는 추후 개별 글에서 더 깊게 다룰 예정이다.

## 왜 "구조 설계"가 첫 결정인가

AI Agent 기반 자동화 시스템을 만들 때 가장 먼저 정해야 할 것은 모델도, 프롬프트도 아니다. **"얼마나 복잡한 구조가 필요한가"** 이다. Anthropic의 [Building Effective Agents](https://www.anthropic.com/research/building-effective-agents)는 이 질문에 대한 출발 원칙을 분명히 한다.

> 가능한 가장 단순한 해법을 찾고, 필요할 때만 복잡도를 올려라.

많은 경우 단일 LLM 호출에 retrieval(검색)과 in-context 예시 몇 개를 더하는 것만으로 충분하다. 구조를 복잡하게 만들수록 유연성은 늘지만 비용·지연시간·신뢰성 관리 난이도도 함께 올라간다. 그래서 "단순함 우선"이 모든 설계의 기준선이 된다.

## 기본 빌딩블록: Augmented LLM

어떤 구조를 고르든 최소 단위는 같다. 바로 **Augmented LLM**, 즉 다음 세 가지로 보강된 LLM이다.

- **Retrieval (검색)**: 외부 지식·문서를 가져와 답변에 활용.
- **Tools (도구)**: API 호출, 코드 실행 등 LLM이 바깥 세계에 작용할 수 있는 수단.
- **Memory (기억)**: 이전 단계의 맥락을 유지.

Anthropic은 이 도구·인터페이스를 "쉽고 잘 문서화된 인터페이스"로 제공하라고 권한다. 도구 연결을 표준화하는 대표적 예로 Model Context Protocol(MCP)이 언급된다. 앞으로 나올 모든 패턴은 결국 이 Augmented LLM을 어떻게 엮느냐의 문제다.

## 워크플로 vs 에이전트

구조를 나누는 가장 본질적인 기준은 **제어 흐름(control flow)이 어디에 있느냐**이다.

- **워크플로(Workflow)**: "LLM과 도구가 미리 정해진 코드 경로(predefined code paths)를 통해 조율되는 시스템". 실행 순서가 사람이 짠 코드에 고정되어 있다.
- **에이전트(Agent)**: "LLM이 자신의 프로세스와 도구 사용을 동적으로 지휘하며, 작업을 어떻게 완수할지에 대한 제어권을 유지하는 시스템". 실행 경로를 LLM이 스스로 결정한다.

쉽게 말해, **경로가 코드에 박혀 있으면 워크플로, LLM이 경로를 정하면 에이전트**다. 워크플로는 예측 가능하고 일관적이며, 에이전트는 유연하지만 통제가 어렵다.

## 워크플로 패턴 5종

워크플로라고 해서 단순한 한 줄짜리 호출만 있는 건 아니다. Anthropic은 다음 다섯 가지 대표 패턴을 제시한다(출처 모두 [Building Effective Agents](https://www.anthropic.com/research/building-effective-agents)).

| 패턴 | 핵심 아이디어 | 적합한 상황 / 예시 |
|---|---|---|
| **Prompt chaining** (순차 분해) | 작업을 고정된 하위 단계로 쪼개 각 LLM 호출이 이전 출력을 입력으로 받음. 중간에 코드 게이트로 검증 가능 | 작업을 깔끔하게 고정된 하위작업으로 분해할 수 있을 때. 지연시간↑를 정확도와 맞바꿈. 예: 마케팅 카피 생성 후 번역, 개요 작성 후 본문 집필 |
| **Routing** (분류 후 분기) | 입력을 분류해 전문화된 후속 작업으로 보냄 | 서로 잘 구분되는 카테고리가 있을 때. 예: 고객 문의(환불/기술지원) 분기, 쉬운 질문은 작은 모델(Haiku), 어려운 질문은 큰 모델(Sonnet)로 라우팅 |
| **Parallelization** (병렬화) | 여러 LLM을 동시에 돌리고 코드로 결과 취합. Sectioning(독립 하위작업 분할), Voting(같은 작업 여러 번) | 속도↑ 또는 여러 관점으로 신뢰도↑가 필요할 때. 예: Sectioning—가드레일(검열+응답 생성) 병렬; Voting—코드 취약점 다중 검토 |
| **Orchestrator-workers** | 중앙 LLM(오케스트레이터)이 작업을 동적으로 분해해 worker LLM에 위임하고 결과 종합 | 필요한 하위작업을 미리 예측할 수 없는 복잡 작업. 예: 여러 파일에 걸친 코드 변경, 다수 소스에서 정보 수집 |
| **Evaluator-optimizer** | 한 LLM이 응답 생성, 다른 LLM이 평가·피드백 주는 반복 루프 | 명확한 평가 기준이 있고 반복 개선이 가치를 줄 때. 예: 미묘한 비평이 필요한 문학 번역, 다단계 검색 |

직관적으로 보면, 앞의 셋(chaining/routing/parallelization)은 흐름이 단순·고정적이고, 뒤의 둘(orchestrator-workers/evaluator-optimizer)은 LLM이 분해나 평가에 관여하면서 에이전트에 한 발 더 가까워진다. 다만 orchestrator-workers도 결국 "코드가 짠 틀 안에서" 동작한다는 점에서 워크플로로 분류된다.

## 자율 에이전트: 루프 구조

에이전트의 핵심은 미리 정해진 경로가 아니라 **루프**다. 전형적인 흐름은 이렇다.

1. 작업 수신 → 행동 계획
2. 도구 실행
3. 환경 피드백으로 진행도 평가
4. 다음 단계 결정 → (1~4 반복)

여기서 중요한 것이 **환경 피드백**이다. 도구나 코드 실행 결과 같은 "ground truth"(실제 사실)를 환경에서 받아와 진행 상황을 판단한다. 무한 반복을 막기 위해 **정지 조건**으로 완료 기준과 최대 반복 횟수(maximum number of iterations)를 둔다. 필요하면 중간 체크포인트에서 멈춰 사람의 피드백을 받을 수도 있다.

이 루프 구조의 원형이 된 두 연구가 있다.

**ReAct** ([Yao et al., 2022, arXiv:2210.03629](https://arxiv.org/abs/2210.03629))는 추론 흔적(Thought)과 행동(Action, 도구 호출)을 번갈아 수행한다. **Thought → Action → Observation** 루프가 곧 자율 에이전트 루프의 원형이다. 외부 정보로 사실을 검증하면서 환각과 오류 전파를 줄인다. 논문은 두 대화형 의사결정 벤치마크에서 모방학습·강화학습 기반 방법 대비 절대 성공률을 ALFWorld에서 +34%p, WebShop에서 +10%p 끌어올렸다고 보고한다(HotpotQA·Fever 같은 질의응답 과제에서도 성과를 제시한다).

**Reflexion** ([Shinn et al., 2023, arXiv:2303.11366](https://arxiv.org/abs/2303.11366))은 모델 가중치를 갱신하지 않고도, 작업 피드백을 **언어로 자기성찰(self-reflection)** 해 에피소드 메모리에 저장하고 다음 시도에 활용한다. Actor / Evaluator / Self-Reflection 세 요소로 구성된다. 논문은 이 기법으로 HumanEval 코딩 벤치마크에서 91% pass@1을 기록해, 직전 SOTA였던 GPT-4의 80%를 넘어섰다고 보고한다. 이 "생성 후 평가하고 다시 시도"하는 구조는 앞서 본 evaluator-optimizer 패턴과 자연스럽게 연결된다.

### 직관적 예시

- **워크플로(prompt chaining)**: "영어 블로그 글 작성 → 한국어 번역" 자동화. 1단계에서 초안을 쓰고, 코드가 분량을 체크하는 게이트를 통과한 뒤, 2단계에서 번역한다. 경로가 코드에 고정되어 있다.
- **자율 에이전트(ReAct)**: "이번 주 팀 회의 빈 시간을 찾아 회의실 예약". 생각("캘린더 조회") → 행동(API 호출) → 관찰 → 생각("3시가 비네, 예약") 순으로 반복한다. 단계 수가 미리 정해져 있지 않고, 환경 응답에 따라 경로가 바뀐다.

## 단일 vs 멀티 에이전트

에이전트를 여러 개 두고 협력시키는 것이 **멀티 에이전트**다. 대표 구조는 **orchestrator-worker**(supervisor) 패턴이다.

Anthropic의 [멀티 에이전트 리서치 시스템](https://www.anthropic.com/engineering/built-multi-agent-research-system)을 보면, Lead agent가 쿼리를 분석해 전략을 세우고, 3~5개의 subagent를 병렬로 생성한다. 각 subagent는 **독립된 컨텍스트 창**에서 병렬로 검색을 수행하고, Lead가 결과를 종합한 뒤 추가 조사 여부를 결정한다. 별도의 CitationAgent가 인용을 검증한다.

LangGraph에서도 중앙 **supervisor**가 worker를 조율하며, 제어를 넘길 때는 **handoff**를 쓴다. 시스템이 커지면 supervisor를 계층화(hierarchical)한다([LangGraph Multi-Agent](https://langchain-ai.github.io/langgraphjs/agents/multi-agent/), [LangGraph Supervisor](https://changelog.langchain.com/announcements/langgraph-supervisor-a-library-for-hierarchical-multi-agent-systems)).

### 장점

- **성능**: Anthropic 보고에 따르면 리드 Opus 4 + Sonnet 4 subagents 구성이 단일 Opus 4 대비 내부 평가에서 +90.2%였다.
- **폭넓은 병렬 탐색(breadth-first)**: 여러 방향을 동시에 탐색.
- **컨텍스트 분리**: 단일 컨텍스트 창을 초과하는 정보를 나눠서 처리.

### 단점·비용

- **토큰 폭증**: Anthropic은 "에이전트는 채팅 대비 약 4배, 멀티 에이전트는 약 15배 토큰을 쓴다"고 언급한다.
- **조율·평가·신뢰성 난제**: 여러 에이전트를 일관되게 굴리고 평가하기 어렵다.
- 모든 에이전트가 같은 컨텍스트를 공유해야 하거나 의존성이 많은 작업(대부분의 코딩 작업)에는 오히려 단일 에이전트가 낫다.

supervisor 구조에는 리드가 단일 실패 지점이자 병목이 될 수 있다는 점, 리드의 계획이 틀리면 하위작업이 통째로 낭비된다는 점, worker가 많아질수록 컨텍스트가 누적돼 한계를 넘기 쉽다는 점 같은 리스크도 흔히 거론된다(보조 출처 기반: [Swarm vs. Supervisor](https://www.augmentcode.com/guides/swarm-vs-supervisor)).

### 멀티 에이전트 예시

"경쟁사 5곳 동향을 조사해 보고서 작성". 리드가 회사별 subagent 5개를 병렬로 띄워 각자 조사하게 하고 결과를 종합한다. 빠르고 폭넓지만 토큰을 약 15배 더 쓴다.

### 프레임워크 비교

아래는 대표적인 멀티 에이전트 프레임워크가 **대표적으로 어떤 방식으로** 조율하는지 개념만 정리한 것이다. 보조 자료에 기반하므로(공식 문서 직접 미확인 항목 포함) 실제 도입 전에는 각 공식 문서를 재확인하길 권한다.

| 프레임워크 | 핵심 추상화 / 조율 방식 |
|---|---|
| **LangGraph** | 에이전트를 노드로 하는 방향 그래프 + 공유 상태(state). 체크포인팅·time-travel 디버깅. supervisor/hierarchical 지원 |
| **OpenAI Agents SDK** | 핵심 추상화는 handoff: 에이전트가 컨텍스트를 들고 제어를 명시적으로 이양하는 방식으로 알려져 있다 |
| **CrewAI** | 역할 기반(role-based) crew + process 타입. 빠른 프로토타이핑에 적합하다고 소개된다 |
| **AutoGen / AG2** | 대화형 GroupChat 기반 조율 방식으로 알려져 있다 |

위 표는 비교 블로그 등 보조 자료를 정리한 것이라 세부 사항은 프레임워크 버전에 따라 달라질 수 있다. 특히 OpenAI Agents SDK가 Swarm의 후신이라는 식의 계보 관계는 공식 문서로 직접 확인하지 않았으니, 실제 채택 전에는 각 공식 문서를 확인하는 편이 안전하다.

## 구조 선택 기준과 복잡도 사다리

정리하면 선택 기준은 다음과 같다.

- **시작은 가장 단순하게.** 많은 경우 단일 LLM 호출 + retrieval + in-context 예시면 충분하다.
- **워크플로**는 잘 정의된 작업에 예측 가능성·일관성이 필요할 때.
- **에이전트**는 유연성과 모델 주도 의사결정이 대규모로 필요할 때.
- 핵심 트레이드오프: "에이전트형 시스템은 더 나은 성능을 위해 지연시간과 비용을 맞바꾼다."
- **멀티 에이전트 정당화**: 무거운 병렬화나 단일 컨텍스트 초과 정보가 필요하고, 작업 가치가 약 15배의 토큰 비용을 정당화할 때.

이를 한 줄로 세우면 **복잡도 사다리**가 된다.

> 단일 Augmented LLM → 워크플로 패턴 → 단일 자율 에이전트(ReAct 루프) → 멀티 에이전트(supervisor)

위로 갈수록 유연성↑, 비용↑, 지연↑, 신뢰성 관리 난이도↑다. **꼭 필요한 만큼만 사다리를 오르는 것**이 핵심이다.

마지막으로 Anthropic이 강조하는 구현 3원칙도 기억할 만하다.

1. **설계의 단순함**
2. **계획 단계를 드러내는 투명성**
3. **도구 문서화·테스트로 에이전트-컴퓨터 인터페이스(ACI) 정교화**

## 마무리

여기까지가 AI Agent 구조 설계의 전체 지도다. 핵심만 다시 짚으면 — Augmented LLM이 기본 빌딩블록이고, 제어 흐름이 코드에 있으면 워크플로(5종 패턴), LLM에 있으면 에이전트(ReAct 루프), 더 큰 병렬·정보 처리가 필요하면 멀티 에이전트(supervisor)이며, **항상 가장 단순한 구조에서 시작해 필요할 때만 사다리를 오른다**는 것이다.

이 글은 시리즈의 출발점이자 지도일 뿐이다. 각 워크플로 패턴, ReAct/Reflexion 루프, supervisor 멀티 에이전트, 프레임워크별 구현은 후속 글에서 하나씩 깊게 다룰 예정이다.

## 참고문헌

- Anthropic, "Building Effective Agents" (2024): https://www.anthropic.com/research/building-effective-agents
- Anthropic Engineering, "How we built our multi-agent research system" (2025): https://www.anthropic.com/engineering/built-multi-agent-research-system
- Yao et al., "ReAct" (2022), arXiv:2210.03629: https://arxiv.org/abs/2210.03629
- Shinn et al., "Reflexion" (2023), arXiv:2303.11366: https://arxiv.org/abs/2303.11366
- LangGraph Multi-Agent: https://langchain-ai.github.io/langgraphjs/agents/multi-agent/
- LangGraph Supervisor: https://changelog.langchain.com/announcements/langgraph-supervisor-a-library-for-hierarchical-multi-agent-systems
- Augment Code, "Swarm vs. Supervisor" (보조): https://www.augmentcode.com/guides/swarm-vs-supervisor
