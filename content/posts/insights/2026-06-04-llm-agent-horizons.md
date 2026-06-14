---
title: LLM 기반 Agent의 확장 — 연세대 LangAGI Lab 기술 세미나 정리
date: 2026-06-04
tags:
  - AI Agent
private: true
---

LLM 기반 Agent 연구는 지난 몇 년 사이 "단일 모델로 답하기"에서 "여러 모델·도구·사람이 협업하는 시스템"으로 빠르게 옮겨가고 있다. 이 글은 연세대 LangAGI Lab의 Jinyoung Yeo 교수가 발표한 *Expanding the Horizons of LLM-based Agents* 세미나 슬라이드를 정리한 노트다. Web Agent, GUI Agent, Multi-Agent, Human–AI Collaboration, Self-Evolving Agent까지 연구의 큰 줄기를 한 번에 훑는 자료여서, 반도체 FAB처럼 실제 도메인에 Agent를 붙이려는 사람에게도 지형도를 잡기 좋다.

## Agent란 무엇인가

발표는 Russell & Norvig 식의 고전적 정의로 출발한다.

> Anything that can be viewed as perceiving its environment through perception and action upon that environment through actuators.

요지는 두 가지다. 첫째, Agent는 **환경에 대한 인지와 행동의 루프**로 정의된다. 둘째, 최근의 변화는 이 루프가 **단일 모델에서 시스템으로** 확장되고 있다는 점이다. 시스템 안에는 Human–AI 인터랙션, AI–AI 인터랙션, 그리고 자동화·자율화가 함께 들어간다.

발표는 이 흐름을 GPT-1(2018)에서 ChatGPT(2022), GPT-4(2023), o1(2024), MCP(2024), Operator(2025), 그리고 그 이후로 이어지는 모델·도구의 연표로 시각화한다. AI Agent 관련 논문은 월 단위 발표량이 가파르게 늘고 있다고 소개한다(출처: [ResearchTrend.AI](https://researchtrend.ai/papers)).

## Primary Extension: Generalist Web Agent

발표가 가장 길게 다루는 부분은 **일반화된 Web Agent**다. 문제 정의는 다음과 같다.

> "Given any website, follow language instructions and carry out the corresponding tasks."

예시는 항공권 예약처럼 일상 작업이지만, 웹 환경 자체가 다음 네 가지 이유로 어렵다.

1. **Open-world**: 실제 웹은 통제된 시뮬레이터가 아니다.
2. **Grounding**: 화면의 어떤 요소가 클릭 가능한지(affordance) 찾아야 한다.
3. **POMDP**: 부분 관측만 가능하다(스크롤 밖, DOM 일부는 모름).
4. **Long-horizon planning**: 수십 스텝을 거쳐야 보상이 주어진다.

특히 마지막 항목 때문에 정책 학습은 **희소 보상(sparse reward)** 문제를 그대로 떠안는다. 발표는 이 문제에 대한 세 가지 접근을 비교한다.

### Approach 1 — Test-time scaling: Tree Search Agents

추론 시점에 행동 후보들을 트리로 탐색해 더 좋은 행동을 고른다. 대표 논문은 *Tree Search for Language Model Agents* (TMLR'25, [arXiv:2407.01476](https://arxiv.org/abs/2407.01476)). 발표자는 이 접근이 인기를 끌었지만 두 가지 한계가 있다고 정리한다.

- 계산 비용이 비싸다. → Approach 2로 이어짐.
- "LLM이 이미 웹 환경을 이해한다"는 전제가 사실은 약하다. → Approach 3으로 이어짐.

### Approach 2 — Better learning: Web-Shepherd (Process Reward Modeling)

긴 작업의 마지막에 성공/실패 한 번만 주는 **outcome reward** 대신, **스텝마다 부분적인 진척을 점수로 주는 process reward**를 학습한다. 예컨대 "행동이 실패했지만 진척은 있었다 → 0.2"처럼 부분 점수를 매겨, 강화학습 신호를 훨씬 빽빽하게 만든다.

발표에서 강조한 핵심 결과는 두 가지다.

- **3B 규모 모델**로도 스텝 단위 보상 평가가 정확하다는 점.
- **체크리스트 기반**(task를 잘게 쪼갠 항목별 충족 여부 점검)으로 process reward를 예측해 Web Agent를 가이드한다는 점.

NeurIPS'25 spotlight 결과로 소개된다. 관련 논문은 Chae et al., *Web-Shepherd: Advancing PRMs for Reinforcing Web Agents*, [arXiv:2505.15277](https://arxiv.org/abs/2505.15277) (2025) — 발표자(Jinyoung Yeo)가 교신저자다. 저자들이 공개한 [WebPRM Collection](https://github.com/kyle8581/Web-Shepherd)은 40K step-level preference pair와 체크리스트를 포함하며, WebArena-lite에서 GPT-4o-mini를 verifier로 쓸 때보다 10배 낮은 비용으로 10.9pt 더 높은 성능을 보고한다.

### Approach 3 — Context engineering: World Model Training

세 번째 접근은 Yann LeCun이 제안한 **internal world model** 아이디어를 LLM Agent에 가져온다. 인간이 행동의 결과를 머릿속에서 예상하고 위험한 행동을 피하듯, Agent도 **다음 관측을 예측하는 모델**을 따로 학습한다.

수식 표기는 다음과 같다. 시점 $t$의 관측 $o_t$, 행동 $a_t$, 그리고 다음 관측 $o_{t+1}$에 대해 world model은 다음을 학습한다.

$$
\mathcal{L}_{\text{world}} = \mathbb{E}\left[\,\ell\big(\hat{o}_{t+1},\, o_{t+1}\big)\,\right]
$$

여기서 $\hat{o}_{t+1}$은 $(\text{instruction},\, o_t,\, a_t)$로부터 예측한 다음 관측이다.

문제는 웹 관측이 너무 길고, 학습 신호의 정보 이득이 작다는 점이다. 발표는 두 가지 처방을 든다.

- $o_t \to o_{t+1}$ 전체를 예측하는 대신, **추상화된 관측 $\tilde{o}_{t+1}$** 을 예측한다.
- **헝가리안 알고리즘(Hungarian algorithm)** 으로 두 관측 사이의 요소를 일대일로 매칭하고(이분 그래프 최소비용 매칭 알고리즘), 그 결과로 **추가/삭제/변경**된 요소만 식별한다.

추론 시점에서는 정책에서 여러 행동 후보를 뽑고, world model로 각 후보의 결과 상태를 시뮬레이션한 다음, 가치 점수가 가장 높은 행동을 선택한다. 즉, **world model이 일종의 시뮬레이터 역할**을 한다. 관련 논문은 Chae et al., *Web Agents with World Models: Learning and Leveraging Environment Dynamics in Web Navigation*, ICLR 2025, [arXiv:2410.13232](https://arxiv.org/abs/2410.13232).

## Multi-SW: Web Agent를 넘어 GUI Agent로

HTML 텍스트를 다루는 Web Agent와 달리, 다양한 소프트웨어를 모두 다루려면 **순수 시각 기반(mouse + keyboard) 상호작용**이 필요하다. 발표는 GUI Agent의 과제를 두 컴포넌트로 분해한다.

- **Grounding** — 화면의 어디를 클릭/입력해야 하는지 정확히 찾는 능력.
- **Planning** — 무엇을 어떤 순서로 할지 계획하는 능력.

특히 발표자가 강조한 도전 과제는 **전문 응용 프로그램(professional applications)에서의 action grounding** 이다. 일상 앱(브라우저, 메모장 등)과 달리 CAD, EDA, IDE처럼 도메인 특화 UI에서는 grounding 난이도가 급격히 올라간다.

관련 자료로 다음 두 보고서가 인용된다.

- Zhang et al., *Phi-Ground Tech Report: Advancing Perception in GUI Grounding*, [arXiv:2507.23779](https://arxiv.org/abs/2507.23779) (2025).
- Chen et al., *OS-MAP: How Far Can Computer-Using Agents Go in Breadth and Depth?*, [arXiv:2507.19132](https://arxiv.org/abs/2507.19132) (2025).

이 너머로는 **Embodied Agent** — 장면 생성, 메모리 시스템, 안전성 — 가 진행 중인 연구로 짧게 언급된다.

## Secondary Extension: Multi-Agent와 Human–AI Collaboration

확장의 또 다른 축은 **여러 주체와의 협업**이다. 발표는 두 갈래로 나눈다.

- **Agent–Agent Collaboration** (Automation): hierarchical / cooperative / competitive 형태가 있다. 특히 *multi-vendor multi-agent system* 에서는 "정보 동기화(information sync)" 와 "프라이버시 보존" 사이의 균형이 핵심 질문이다.
- **Human–AI Collaboration** (Augmentation): 사람과 AI가 **반복적 상호작용**으로 같은 목표를 달성하는 형태.

Human–AI 협업 파트에서 발표자가 던지는 질문은 직설적이다.

> "Can the current LLMs be good collaborative partners with human experts?"

예시는 JAMA *Clinical Challenge* 의 안과 사례(several months of binocular diplopia ...)다. LLM은 사람의 주장에 대해 **수용(Acceptance)** 또는 **반박(Argument)** 으로 답해야 하는데, 협업이 실패한 사례에서는 두 응답 모두의 적절성 점수가 낮았다고 정리한다. 평균적으로는 사람의 주장을 따라가는 **동조 편향(sycophancy)** 이 관찰되었다.

발표에서 강조한 통찰은 다음과 같다.

> "의료 지식 ≠ 협업 숙련도."

즉, 단독 의사결정에서 정확한 모델이라도 협업 숙련도가 떨어지면 임상에서 오류가 늘어날 수 있다. **모델 단독 성능과 협업 환경에서의 성능을 별개 축으로 보는 관점**이 인상적이다.

## Research Roadmap: 5단계와 Self-Evolving Agents

발표는 [OpenAI가 2024년 7월 내부적으로 공유한 5단계 AI 로드맵](https://briansolis.com/2024/08/ainsights-openai-defines-five-stages-to-track-progress-toward-human-level-intelligence/) 분류를 빌려 다음과 같이 정리한다.

| Stage | 키워드        | 시기(발표자 가정)      |
|------:|---------------|------------------------|
| 1     | Chatbots      | ~2023                  |
| 2     | Reasoners     | 2024                   |
| 3     | Self-Evolving Agents | 2025*           |
| 4     | Agents (Innovators)  | 2026*           |
| 5     | Organizations | 2027~                  |

핵심은 Stage 3 — **Self-Evolving Agents**다. 아이디어는 단순하다.

1. **문제를 만드는 모델**(Challenger)이 새로운 task와 정답을 생성한다.
2. **문제를 푸는 모델**(AI Partner)이 해결을 시도한다.
3. 적절한 보상 신호로 양쪽을 함께 학습시킨다.

수학·코딩·과학처럼 정답 검증이 비교적 쉬운 영역에서 먼저 성과가 나오고 있다고 소개한다. 인용 논문은 다음과 같다.

- Zhou et al., *Self-Challenging Language Model Agents*, [arXiv:2506.01716](https://arxiv.org/abs/2506.01716) (2025).
- Liu et al., *SPICE: Self-Play in Corpus Environments Improves Reasoning*, [arXiv:2510.24684](https://arxiv.org/abs/2510.24684) (2025).
- Xia et al., *Agent0: Unleashing Self-Evolving Agents from Zero Data via Tool-Integrated Reasoning*, [arXiv:2511.16043](https://arxiv.org/abs/2511.16043) (2025).
- Huang et al., *R-Zero: Self-Evolving Reasoning LLM from Zero Data*, 5th Workshop on Mathematical Reasoning and AI at NeurIPS 2025, [arXiv:2508.05004](https://arxiv.org/abs/2508.05004).

LangAGI Lab이 제안하는 확장은 **Self-Evolving Paradigm을 Human–AI 협업으로 가져오는 것**이다. Challenger는 "협업 시나리오"에서 task와 정답을 만들고, AI Partner는 사람 협력자와 함께 푼다. Evaluator는 체크리스트와 추론-행동(reasoning-action) 기반의 긴 사고 사슬(long chain-of-thought) 수집으로 reward를 산출한다.

## 정리

세미나의 큰 줄기를 한 줄로 요약하면 이렇다.

- **Primary Extension** = Agent의 능력을 더 어려운 환경(웹 → GUI → 물리 세계)으로 넓힌다.
- **Secondary Extension** = Agent가 다른 Agent·사람과 협업하는 시스템으로 넓힌다.
- **공통 동력** = 보상을 더 빽빽하게(process reward), 모델이 환경을 머릿속에 가지게(world model), 데이터를 스스로 만들게(self-evolving).

반도체 FAB처럼 도메인 특화 환경에 Agent를 붙이려는 사람 입장에서 즉시 챙길 만한 포인트는 세 가지다.

1. **희소 보상 문제는 일반적인 병목**이다. process reward / 체크리스트 기반 평가가 RL의 실전 처방으로 자리잡고 있다.
2. **World model**은 시뮬레이터가 부족한 도메인에서 정책 평가를 대신할 후보가 될 수 있다.
3. **Multi-vendor 환경에서의 정보 sync ↔ privacy trade-off** 는 사내 시스템 설계에서도 동일하게 등장하는 문제다.

## 참고문헌

- Tree Search for Language Model Agents (TMLR'25): [arXiv:2407.01476](https://arxiv.org/abs/2407.01476)
- Web-Shepherd: Advancing PRMs for Reinforcing Web Agents (NeurIPS'25 spotlight): [arXiv:2505.15277](https://arxiv.org/abs/2505.15277)
- Web Agents with World Models (ICLR'25): [arXiv:2410.13232](https://arxiv.org/abs/2410.13232)
- Phi-Ground Tech Report (2025): [arXiv:2507.23779](https://arxiv.org/abs/2507.23779)
- OS-MAP (2025): [arXiv:2507.19132](https://arxiv.org/abs/2507.19132)
- Self-Challenging Language Model Agents (2025): [arXiv:2506.01716](https://arxiv.org/abs/2506.01716)
- SPICE (2025): [arXiv:2510.24684](https://arxiv.org/abs/2510.24684)
- Agent0 (2025): [arXiv:2511.16043](https://arxiv.org/abs/2511.16043)
- R-Zero (2025): [arXiv:2508.05004](https://arxiv.org/abs/2508.05004)
- 발표자 페이지: [Jinyoung Yeo](https://jinyeo.weebly.com), [LangAGI Lab](https://langlab.yonsei.ac.kr)
