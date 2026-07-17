# Model-based RL 심화 시리즈 작성 계획

> 이 파일은 발행물이 아니라 **세션 간 작업 인계용 메모**다. (`content/` 밖이라 사이트에 노출되지 않음)
> 목적: 기존 개요 글 한 편(`17. Model-based RL`)을 여러 심화 글로 확장해, model-based RL을 "스스로 설명할 수 있는" 수준으로 정리.

- **카테고리**: `foundations` (표준 RL 기초 지식)
- **시리즈 폴더**: `content/posts/foundations/introduction-to-rl/`
- **시리즈 번호**: 기존 `01`~`17`을 이어 **`18` 이후**로 심화편 추가
- **공통 태그**: `Reinforcement Learning` (시리즈 다른 글과 동일)
- **파일명**: `NN-slug.md`, 영문 kebab-case
- **기존 자산**:
  - `17-model-based-rl.md` — 개요(overview). model-free vs model-based / Dyna / MCTS·AlphaZero를 **얕게** 다룸. 심화편들의 허브 역할.
  - 선행 글: `04-solving-mdp`(DP·planning), `06-model-free-control`, `07-deep-q-learning`

## 글 목록 (체크박스 = 작성 완료 여부)

각 항목은 17 개요의 한 줄을 글 한 편으로 펼치거나, 17이 다루지 않은 빈칸을 메운다.

### 1부 — 모델 자체를 다루기
- [ ] `18` **환경 모델 학습하기 (Learning the Dynamics Model)**
  - 모델의 종류: forward / inverse / backward, deterministic vs stochastic, expectation model vs sample model, one-step vs multi-step
  - 모델을 supervised learning으로 학습하는 법, 무엇을 입출력으로 두나
  - **compounding error**: one-step 오차가 rollout을 따라 누적되는 문제 (model-based의 근본 약점)
  - 불확실성 다루기: ensemble, probabilistic model (→ 17의 "model bias" 긴장을 정량적으로 펼침)
  - 확장 대상: 17의 §"Model-free vs Model-based" 각주(model bias)

### 2부 — Background planning 심화
- [ ] `19` **Dyna 심화와 변형 (Dyna-Q+, Prioritized Sweeping)**
  - Dyna-Q 전체 루프 복습 후, Dyna-Q+ (변하는 환경 대비 exploration bonus)
  - **prioritized sweeping**: 가치 변화가 큰 state부터 우선 갱신해 planning 효율↑
  - 부정확한 모델로 계획할 때 생기는 문제와 대응
  - 확장 대상: 17의 §"Dyna"

### 3부 — Decision-time planning 심화
- [ ] `20` **Monte-Carlo Tree Search 깊이 보기**
  - MCTS 4단계: selection / expansion / simulation(rollout) / backup
  - UCT 유도와 직관, rollout policy, tree policy vs default policy
  - 확장 대상: 17의 §"MCTS와 AlphaZero" 앞부분
- [ ] `21` **AlphaGo → AlphaZero → MuZero**
  - 세 모델의 진화: 인간 기보 → self-play only → **모델까지 학습(MuZero)**
  - MuZero의 representation / dynamics / prediction function — 규칙을 모르고도 latent 모델로 계획
  - "알려진 모델 + 학습된 policy/value" → "학습된 latent 모델 + planning"으로의 도약
  - 확장 대상: 17의 §"MCTS와 AlphaZero" 뒷부분 (MuZero는 17에 없음 — 신규)

### 4부 — 연속 제어와 world model (17에 없는 신규 영역)
- [ ] `22` **연속 제어를 위한 Model-based RL (PILCO · PETS · MBPO)**
  - PILCO: Gaussian Process 모델 + 정책 경사 (sample 효율의 상징)
  - PETS: probabilistic ensemble + MPC/CEM 기반 decision-time planning
  - MBPO: 짧은 model rollout을 실제 데이터에 가지치기로 섞기 — "언제 모델을 믿을까"
- [ ] `23` **World Models와 latent imagination (Dreamer)**
  - Ha & Schmidhuber, *World Models*: VAE+RNN으로 환경을 압축해 "꿈속에서" 정책 학습
  - Dreamer v1→v3: latent space에서 상상으로 행동을 학습, 점점 범용·안정화
  - 확장 대상: 신규. 22의 MPC식 planning과 대비되는 "학습된 latent 모델 + actor-critic"

### 5부 (선택) — 언제·왜 쓰나
- [ ] `24` **(선택) Model-based는 언제 유리한가**
  - sample efficiency vs asymptotic performance trade-off
  - model error 분석, model-based ↔ model-free 스펙트럼, 하이브리드(MBPO류)의 위치
  - ※ 분량이 애매하면 18 또는 23에 흡수 가능

## 참고문헌 (작성 시 search-agent로 arXiv ID·연도 최종 확인)

- Dyna / prioritized sweeping: Sutton & Barto, *RL: An Introduction* 2nd ed., Ch. 8
- MCTS·UCT: Kocsis & Szepesvári (2006)
- AlphaGo (Nature 2016), AlphaZero (arXiv:1712.01815), MuZero (arXiv:1911.08265)
- PILCO: Deisenroth & Rasmussen (ICML 2011)
- PETS: Chua et al. (arXiv:1805.12114)
- MBPO: Janner et al. (arXiv:1906.08253)
- World Models: Ha & Schmidhuber (arXiv:1803.10122)
- Dreamer: v1 (arXiv:1912.01603), v2 (arXiv:2010.02193), v3 (arXiv:2301.04104)

## 메모 / 결정 대기
- **작성 순서 권장**: 18 → 19 → 20 → 21 → 22 → 23 (모델 다루기 → background → decision-time → 연속제어/world model). 17이 이미 길잡이라 어느 글부터 써도 독립적으로 성립.
- **17 개요 글 처리**: 심화편이 쌓이면 17 끝에 "더 깊이" 위키링크 묶음을 추가해 허브로 만들 것. (지금은 두기)
- 톤·형식은 같은 시리즈 `07-deep-q-learning`, `17-model-based-rl` 기준. KaTeX 규칙(블록 `$$` 단독 줄) 준수.
- 이미지 없음 가정 — 텍스트 다이어그램/코드블록으로 설명. MCTS·MuZero는 도식이 있으면 이해가 크게 쉬워지므로 필요 시 `/images/`에 추가 고려.
- 18, 22, 23은 논문 기반이므로 워크플로상 **search-agent(paper-deep-dive/roundup) → writer-agent → review-agent** 경로 권장.
