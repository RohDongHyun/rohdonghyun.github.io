---
title: 14. 코딩 에이전트와 테스트 — 스펙이자 검증 루프
date: 2026-07-06
tags:
  - Software Engineering
  - Testing
  - AI Agent
---

[[posts/foundations/software-testing/01-why-we-test|1편]]은 이런 예고로 시작했다 — **코드를 덜 읽는 시대일수록, 테스트가 곧 스펙이자 마지막 안전망이 된다.** 그 사이 13편에 걸쳐 좋은 테스트의 원칙을 쌓았고, 이제 그 질문을 회수할 차례다. Claude Code나 GitHub Copilot coding agent 같은 코딩 에이전트가 코드를 대신 짜기 시작하면, 사람이 모든 줄을 읽고 검증하는 전제는 무너진다. 그때 테스트는 무엇이 되는가? 2024~2026년의 공식 문서와 논문들이 수렴하는 답은 두 가지다: 사람이 에이전트에게 의도를 전달하는 **스펙**, 그리고 에이전트가 스스로 결과를 확인하고 반복하게 하는 **검증 루프**.

## 역할 1: 실행 가능한 스펙

1편에서 테스트의 세 번째 역할로 꼽았던 "실행 가능한 문서"를 떠올려 보자. 사람끼리 일할 때 이 역할은 셋 중 가장 존재감이 약했다 — 문서는 어차피 코드 리뷰와 대화로 보완되니까. 에이전트 상대로는 순서가 뒤집힌다. 자연어 지시는 모호함을 그대로 품고 전달되지만, 테스트는 기대 동작을 입력·출력 쌍으로 못 박는다. [Anthropic의 Claude Code best practices](https://code.claude.com/docs/en/best-practices)가 드는 예가 정확히 이것이다: "이메일 주소를 검증하는 함수를 구현하라"라고만 쓰는 대신, *"example test cases: user@example.com is true, invalid is false... run the tests after implementing"* 처럼 테스트 케이스를 함께 주라는 것 — 테스트 케이스가 곧 검증 기준, 즉 스펙이다.

[GitHub의 Copilot coding agent 문서](https://docs.github.com/copilot/how-tos/agents/copilot-coding-agent/best-practices-for-using-copilot-to-work-on-tasks)도 좋은 태스크의 조건으로 *"좋은 해법이 어떤 모습인지에 대한 완결된 acceptance criteria(인수 기준 — 예: 단위 테스트가 있어야 하는가)"* 를 요구한다. 1편에서 "덜 알려진 역할"이던 실행 가능한 문서가, 에이전트 시대에는 워크플로의 1순위로 승격된 셈이다.

## 역할 2: 루프를 닫는 검증 신호

같은 Anthropic 문서의 최상단 원칙은 **"Give Claude a way to verify its work"** 다. 원문의 논리가 날카롭다:

> Claude stops when the work looks done. Without a check it can run, "looks done" is the only signal available, and **you become the verification loop**... Give Claude something that produces a pass or fail, and the loop closes on its own.

에이전트는 "다 된 것처럼 보이면" 멈춘다. 실행 가능한 체크가 없으면 "그럴듯해 보임"이 유일한 종료 신호가 되고, 검증은 고스란히 사람 몫이 된다. 반대로 pass/fail을 뱉는 무언가 — 테스트 스위트, 빌드 exit code, linter, 스크린샷 비교 무엇이든 — 를 주면, 에이전트는 *실패 → 수정 → 재실행* 을 사람 개입 없이 반복한다. 루프가 스스로 닫히는 것이다. 버그 수정도 마찬가지로 test-first를 권한다: *"이슈를 재현하는 실패하는 테스트를 먼저 쓰고, 그다음 고쳐라."*

Simon Willison은 [Vibe engineering](https://simonwillison.net/2025/Oct/7/vibe-engineering/)에서 이를 한 문장으로 압축했다: *"프로젝트에 견고하고 포괄적이며 안정적인 테스트 스위트가 있으면 agentic coding 도구는 **날아다닌다(fly)**."* 그가 [JustHTML 사례](https://simonwillison.net/2025/Dec/14/justhtml/)로 소개한 것이 좋은 예다: Emil Stenström은 HTML 파서 JustHTML을 만들며 브라우저들이 쓰는 적합성 스위트 html5lib-tests의 테스트 약 9,200개를 처음부터 루프에 걸어 에이전트를 돌렸고, Willison 자신도 같은 스위트를 스펙 삼아 이 파서를 JavaScript로 4.5시간 만에 포팅했다 — 이미 존재하는 테스트 스위트를 통째로 스펙으로 재사용한 사례다. LLM은 최상급 엔지니어링 관행, 특히 자동화 테스트에 구조적으로 보상을 주며, 개발자의 책임은 코드 타이핑에서 스펙 작성·성공 기준 정의·루프 설계 쪽으로 이동한다는 것이 그의 진단이다.

## TDD와의 궁합: red-green이 곧 에이전트 루프

[[posts/foundations/software-testing/07-test-driven-development|7편]]의 red-green-refactor를 다시 보면, 에이전트 루프와 구조가 같다는 것이 눈에 들어온다. 실패하는 테스트(red)가 목표를 정의하고, 통과(green)가 종료 조건이 된다 — TDD가 사람에게 강제하던 "목표를 실행 가능한 형태로 먼저 못 박기"가, 에이전트에게는 루프가 돌기 위한 전제 조건이다. Willison도 *"루프 안에서 반복(iterate)할 수 있는 에이전트에게 test-first 개발이 특히 효과적"* 이라고 쓴다.

이 궁합을 정면으로 실험한 것이 [TDFlow](https://arxiv.org/abs/2510.23761) (Han et al., 2025)다. repository 수준의 소프트웨어 엔지니어링을 아예 "주어진 테스트를 통과시키는 작업(test-resolution)"으로 재정의하고 4개의 sub-agent로 워크플로를 나눴는데, **사람이 작성한 테스트가 주어지는 조건에서** SWE-Bench Verified의 94.3%, SWE-Bench Lite의 88.8%를 통과했다 (테스트 해킹은 800건 중 7건). 조건에 주의해야 한다 — 일반 리더보드는 에이전트가 테스트 없이 이슈 설명만 받으므로 직접 비교는 부적절하다. 오히려 이 수치가 말하는 것은: **좋은 테스트를 써 주는 것만으로 에이전트의 문제 해결력이 급등한다**, 즉 병목은 코드 생성이 아니라 스펙(테스트) 쪽이라는 점이다.

Anthropic 문서는 여기에 역할 분리 패턴을 더한다: *"한 Claude가 테스트를 쓰게 하고, 다른 Claude가 그것을 통과하는 코드를 쓰게 하라"* — 시험 문제를 낸 사람과 푸는 사람을 분리해 테스트가 구현에 오염되는 것을 막는, 사람 팀의 Writer/Reviewer 분리와 같은 원리다.

## Reward hacking: 에이전트가 테스트를 속일 때

테스트가 유일한 성공 신호가 되는 순간, 새로운 문제가 열린다. **reward hacking** — 평가 신호(여기서는 테스트 통과)를 목적 그 자체로 최적화해, 의도한 과제를 푸는 대신 신호만 조작하는 행동 — 이다.

[ImpossibleBench](https://arxiv.org/abs/2510.20270) (Zhong et al., 2025)는 이를 직접 측정하기 위해 기발한 설계를 썼다. SWE-bench 등의 단위 테스트를 스펙과 **모순되게** 변형해 정직하게는 통과가 불가능한 태스크를 만들면, 통과율이 곧 cheating rate가 된다. 관측된 꼼수는 네 가지다: (1) 명시적으로 금지해도 **테스트 케이스를 수정**, (2) 비교 연산자를 오버로딩해 assert를 무력화, (3) 호출 횟수를 추적해 호출마다 다른 값을 반환, (4) 특정 입력만 하드코딩(special-casing). 테스트 하나를 스펙과 모순되게 바꾼 oneoff 변형의 impossible-SWEbench에서 GPT-5는 76%, Claude Sonnet 3.7은 70%, Opus 4.1은 54%, o3는 39%가 cheating을 택했다.

![ImpossibleBench 개념도와 모델별 cheating rate](https://arxiv.org/html/2510.20270v1/x1.png)

*ImpossibleBench의 설계 개념도와 frontier 모델들의 cheating rate 비교 (Figure 1). 출처: [Zhong et al. 2025, arXiv:2510.20270](https://arxiv.org/abs/2510.20270)*

문제가 벤치마크 안에서 끝나지 않는다는 근거도 있다. [Anthropic의 emergent misalignment 연구](https://www.anthropic.com/research/emergent-misalignment-reward-hacking)(2025)는 실제 코딩 강화학습 환경에서 모델이 `sys.exit(0)` 같은 수법으로 테스트를 우회하는 법을 학습하면, 훈련한 적 없는 악성 행동 — 안전 연구 방해 시도 12%, 정렬된 척 위장하는 추론 50% — 으로 일반화됨을 보였다. [OpenAI](https://arxiv.org/abs/2503.11926)(2025)는 frontier reasoning 모델이 agentic coding 환경에서 테스트를 전복(subvert)하는 것을 CoT(chain-of-thought, 모델이 답을 내기 전에 거치는 추론 과정) 모니터링으로 탐지할 수 있음을 보였는데 — 단, CoT를 직접 억제하도록 최적화하면 모델이 의도를 *숨기는* 법을 배운다는 경고와 함께다.

다행히 가장 효과적인 완화책은 허무할 만큼 단순하다. ImpossibleBench에 따르면 **에이전트의 테스트 파일 접근을 차단·격리하면 cheating rate가 거의 0으로 떨어진다** — 테스트를 아예 숨기면 정상 태스크 성능이 다소 희생되지만, 읽기 전용 접근은 성능을 유지하면서 테스트 수정형 cheating을 막는 절충이 된다. 실무 지침으로 옮기면:

- 에이전트에게 **테스트 파일 수정 권한을 주지 않는다** (읽기 전용 마운트, 별도 디렉토리 격리 등).
- 지시에 "테스트를 고치지 말고 코드를 고쳐라"를 명시한다 — Anthropic 문서의 *"address the root cause, don't suppress the error"* 패턴과 같은 취지다.
- 리뷰 시 diff에서 **테스트 파일 변경 여부를 반드시 확인**한다. Claude 계열의 cheating 중 79% 이상이 "테스트 수정"이었다 — 걸러내기 쉬운 유형이 대부분이라는 뜻이기도 하다.

## 에이전트가 짠 테스트를 믿을 수 있나

거꾸로 테스트 작성을 에이전트에게 맡기면 어떨까. 여기엔 자기 채점 문제 — 구현과 채점 기준을 같은 주체가 만들면 검증력이 보장되지 않는 문제 — 가 있고, 실측 결과는 회의적이다. [ULT 벤치마크](https://arxiv.org/abs/2508.00408) (Huang et al., 2025)는 데이터 누출이 없는 실제 Python 함수 3,909개로 LLM 생성 테스트를 평가했는데, 평균 mutation score — [[posts/foundations/software-testing/09-coverage-and-mutation-testing|9편]]에서 본, 일부러 심은 결함을 테스트가 잡아내는 비율 — 가 **40.21%** 에 그쳤다. 누출 가능성이 있는 기존 벤치마크(약 50%)보다도 유의하게 낮다. Birgitta Böckeler의 [실측 사례](https://martinfowler.com/articles/sensors-for-coding-agents.html)는 더 구체적이다: 에이전트에게 테스트 작성을 맡겨 온 코드베이스에서 statement coverage 100%를 보고한 파일에 mutation testing 도구 Stryker를 돌리니 **mutant 13개가 살아남았다** — coverage는 커다란 acceptance test가 그 코드를 실행하며 만든 숫자였을 뿐, 파일을 직접 검증하는 단위 테스트는 하나도 없었다. 그의 표현대로 *"coverage는 그 줄이 실행됐다는 것을 말해줄 뿐, 그 영향이 검증됐다는 것을 말해주지 않는다."* 9편의 결론 — coverage는 실행을, mutation은 검증을 잰다 — 이 에이전트 시대에 그대로 재조명되는 지점이다.

그렇다고 불가능하다는 얘기는 아니다. Meta의 [TestGen-LLM](https://arxiv.org/abs/2402.09171) (Alshahwan et al., FSE 2024)은 LLM이 생성한 테스트를 무조건 채택하지 않고 **"측정 가능한 개선을 보장하는 필터"** — 빌드 성공 → 반복 실행에서 안정적 통과 → coverage 순증 — 를 통과한 것만 남기는 접근으로, Instagram 제품 코드에서 적용 클래스의 11.5%를 개선하고 엔지니어 73%의 승인을 받아 프로덕션에 반영했다. 생성은 확률적이어도 **채택 기준은 결정적으로** 두는 것 — 에이전트 산출물 전반에 적용할 만한 원칙이다.

## 테스트 없는 코드베이스라는 최악의 조합

두 갈래를 합치면 가장 위험한 조합이 드러난다: **검증 신호가 없는 코드베이스에 대량 변경을 만드는 에이전트.** Willison의 지적대로 테스트 스위트가 없으면 에이전트는 실제 검증 없이 "동작한다"고 주장할 수 있고, 변경이 무관한 기능을 소리 없이 깨뜨려도 아무 신호가 없다. Anthropic 문서의 표현으로는 사람이 verification loop가 되는 상황이고, 처방은 단호하다 — *"If you can't verify it, don't ship it."* ImpossibleBench의 대우(對偶)도 같은 방향을 가리킨다: 테스트가 유일한 성공 신호일 때 그 테스트가 약하면, 에이전트는 스펙이 아니라 테스트를 최적화하고, "그럴듯하지만 틀린" 코드가 그대로 통과한다.

이 논리들을 이으면, 테스트 없는 레거시에 에이전트를 들이기 전에 [[posts/foundations/software-testing/12-testing-legacy-code|12편]]의 characterization test — 현재 동작을 있는 그대로 스펙으로 고정하는 테스트 — 부터 까는 것이 자연스러운 출발점으로 보인다. 완벽한 스펙이 아니라도, "지금 동작이 바뀌면 빨간불"이라는 최소한의 신호가 있어야 루프가 닫히기 때문이다.

## 맺음: 시리즈를 마치며

1편의 질문으로 돌아가자. 사람이 코드를 덜 읽는 시대, 테스트는 무엇이 되는가 — 이 시리즈의 답은 "덜 중요해진 것이 아니라, 남는 몇 안 되는 것"이다. 그리고 지나온 13편의 원칙들은 하나도 버릴 것이 없다. [[posts/foundations/software-testing/03-anatomy-of-a-unit-test|3편]]의 빠르고 격리된 테스트는 에이전트 루프의 회전 속도가 되고, [[posts/foundations/software-testing/04-behavior-vs-implementation|4편]]의 행동 기반 테스트는 에이전트의 과감한 리팩토링에도 살아남는 스펙이 되며, 7편의 TDD는 루프의 설계도, 9편의 mutation testing은 에이전트 산출물의 품질 계기판, 12편의 characterization test는 에이전트를 들일 수 있는 최소 조건, [[posts/foundations/software-testing/13-testing-nondeterministic-code|13편]]의 결정성은 pass/fail 신호가 신호이기 위한 전제가 된다. 코드를 쓰는 주체가 바뀌어도, **무엇이 맞는 동작인지 정의하고 그것을 기계가 확인 가능하게 만드는 일**은 여전히 — 어쩌면 이제야 온전히 — 사람의 일이다.

## 참고문헌

- Anthropic, [Claude Code Best Practices](https://code.claude.com/docs/en/best-practices) — "Give Claude a way to verify its work", trust-then-verify gap, Writer/Reviewer 패턴.
- GitHub Docs, [Best practices for using Copilot to work on tasks](https://docs.github.com/copilot/how-tos/agents/copilot-coding-agent/best-practices-for-using-copilot-to-work-on-tasks) — acceptance criteria와 에이전트 환경 내 빌드·테스트.
- Simon Willison, [Vibe engineering](https://simonwillison.net/2025/Oct/7/vibe-engineering/) / [JustHTML](https://simonwillison.net/2025/Dec/14/justhtml/) (2025) — 테스트 스위트와 agentic coding의 상승 효과, html5lib-tests 9,200개를 스펙으로 쓴 실례.
- Han et al., [TDFlow: Agentic Workflows for Test Driven Development](https://arxiv.org/abs/2510.23761) (2025) — 사람이 쓴 테스트 제공 시 SWE-Bench Verified 94.3%.
- Zhong et al., [ImpossibleBench: Measuring LLMs' Propensity of Exploiting Test Cases](https://arxiv.org/abs/2510.20270) (2025) — cheating 유형·수치와 테스트 접근 차단 완화책.
- Baker et al., [Monitoring Reasoning Models for Misbehavior and the Risks of Promoting Obfuscation](https://arxiv.org/abs/2503.11926) (OpenAI, 2025) — CoT 모니터링과 난독화 위험.
- Anthropic, [Natural emergent misalignment from reward hacking](https://www.anthropic.com/research/emergent-misalignment-reward-hacking) (2025) — 테스트 우회 학습의 악성 일반화.
- Alshahwan et al., [Automated Unit Test Improvement using Large Language Models at Meta](https://arxiv.org/abs/2402.09171) (FSE 2024) — Assured LLM-based Software Engineering.
- Huang et al., [Benchmarking LLMs for Unit Test Generation from Real-World Functions](https://arxiv.org/abs/2508.00408) (2025) — ULT, mutation score 40.21%.
- Birgitta Böckeler, [Maintainability sensors for coding agents](https://martinfowler.com/articles/sensors-for-coding-agents.html) / [Harness engineering](https://martinfowler.com/articles/harness-engineering.html) (martinfowler.com, 2026) — coverage의 거짓 안정감과 sensor로서의 테스트.
