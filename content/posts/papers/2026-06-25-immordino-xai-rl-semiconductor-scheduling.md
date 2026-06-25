---
title: (2026) Explainable AI for Reinforcement Learning Based Dynamic Scheduling Solutions in Semiconductor Manufacturing
date: 2026-06-25
tags:
  - AI Scheduling
  - XAI
private: true
---

반도체 FAB 디스패칭을 강화학습(RL)으로 풀면 성능은 좋아도, 현장 엔지니어에게 정책 신경망은 **"왜 이 lot을 이 장비에 보냈는가"를 말해주지 않는 black box**다. 이 신뢰의 공백이 academia의 RL 디스패처가 실제 fab에 배포되지 못하는 핵심 장벽이다. [Immordino, Stöckermann, Hayen et al., *Explainable AI for reinforcement learning based dynamic scheduling solutions in semiconductor manufacturing*](https://doi.org/10.1007/s10845-025-02631-3) (Journal of Intelligent Manufacturing, 2026, 37:1999–2015)는 정확히 이 문제를 정조준한, **반도체 lot 디스패칭 맥락에서 산업 규모로 XRL을 다룬 최초의 연구**(저자들 주장)다. Infineon + Padua/Klagenfurt/TU Munich 협업이고, 내가 진행 중인 "Machine–Lot 할당 사유 설명 Agent" 과제와 주제가 사실상 동일하다.

## 1. 무엇을 설명하려 하는가

대상은 반도체 frontend의 Semiconductor Factory Scheduling Problem(SFSP)이다. JSSP에 dedication(특정 공정은 일부 병렬 장비에서만), reentrant flow(같은 장비를 여러 번 재방문), batching(파라미터가 맞는 lot 묶음 처리), 확률적 처리·이송시간 등이 더해진 변종으로, JSSP가 이미 NP-complete이므로 그보다 어렵다. 저자들은 **사전 학습된(pretrained) agent를 그대로 두고** 그 위에 통계·ML 기반 XAI 기법들을 얹어 설명을 뽑는다 — 학습 방식을 바꾸지 않는 **post-hoc·holistic 접근**이라 이미 운영 중인 정책에도 적용 가능하다.

중요한 전제: 이 agent는 DQN/PPO가 아니라 **CMA-ES(Covariance Matrix Adaptation Evolution Strategies)** 로 학습됐다. 신경망 가중치를 진화전략으로 직접 최적화하고, 보상은 에피소드 끝에 한 번 주어진다($R = r_T$). 그 결과 **dense reward나 Q-function·value estimator가 없어서, reward-decomposition이나 Q-value 기반 XAI 기법을 아예 쓸 수 없다.** 이 제약이 뒤의 방법 선택을 규정한다.

대상 환경은 두 오픈소스 벤치마크다. **MiniFab**(Intel·ASU 공동 개발, 5 machines·6 steps·3 products — 단순해서 관계 파악이 쉽다)과 **SMT2020**(Semiconductor Manufacturing Testbed 2020, 500+ operations·1000+ tools·품질검사 등 확률적 속성). 실제 fab 데이터가 아니라 공개 testbed라서 feature와 데이터를 깊이 파고들 수 있다.

## 2. 정책과 신경망 구조

장비가 idle이 되면 agent를 호출하고, agent는 그 장비 앞 대기 큐의 lot 전체를 입력받아 각 lot에 score를 매긴다. 최고 score lot이 디스패치되고, batch 장비면 setup이 맞는 다음 lot들이 함께 묶인다. 큐 길이가 가변이므로 NN은 **self-attention + feed-forward** 구조다 — attention이 size-agnostic이라 lot 개수에 무관하게 동작한다. 마지막 feed-forward 직전에 attention 출력과 원본 lot feature를 **skip-connection으로 합산**하는데, 이 구조가 뒤에서 분석의 핵심 단서가 된다.

각 lot의 입력 feature(9종): fab due date까지 시간, step due date까지 시간, 현재 step 대기시간, 예상 처리시간, 예상 잔여 cycle time, lot 내 wafer 수, batch 장비 여부(boolean), full batch까지 가용 wafer 비율, 지금 디스패치 시 setup time. 정책의 최적화 목표는 **tardiness 최소화 + throughput 최대화**다.

## 3. 네 방법의 holistic 조합

이 논문의 골격은 단일 기법이 아니라 **서로 약점이 다른 네 방법을 조합해 교차검증**하는 데 있다. 각 기법은 가정이 달라 단독으로는 틀릴 수 있으므로, 합의가 나는 결론만 신뢰한다.

### 3.1 Queue-wise SHAP (feature importance)

각 feature가 lot score에 기여한 정도를 Shapley value로 본다. 다만 표준 SHAP을 그대로 못 쓴다 — attention 때문에 출력이 입력 큐 크기에 의존하므로, **큐 단위로(queue-wise)** Shapley value를 계산하고, feature를 빼는 대신 **같은 큐 안의 다른 lot 값으로만 랜덤 치환**해 비현실적 조합을 막는다. permutation explainer에 antithetic sampling(정·역순 permutation)으로 분산을 줄인다.

### 3.2 Network Analysis (NN 내부)

attention 기반 구조에 특화된 분석. 두 가지를 본다. (a) **lot-on-lot attention** 행렬 — 큐 내 어떤 lot이 다른 lot의 feature에 영향을 주는가. (b) **embedded feature contributions** — skip-connection+attention 합산 직후 각 입력 feature가 최종 score에 직접 기여하는 정도. 어떤 feature의 기여가 작으면, 그 feature는 score에 **직접**이 아니라 **attention을 통해 간접적으로** 작용한다는 뜻이다. 이 분석은 NN 내부를 이해해야 해 data scientist용이고, 구조가 바뀌면 통째로 다시 짜야 한다.

### 3.3 Counterfactual / Sensitivity Analysis

최고 score lot의 feature를 **그 큐에 실제로 존재하는 값들로 한 칸씩** 위·아래로 옮기며, 결정이 다른 lot으로 바뀌는지 본다. (a) 결정을 뒤집은 큐의 비율, (b) 뒤집기까지 필요한 step 수·방향을 기록한다. feature 중요도이자 **결정 robustness** 척도다. 큐 안 값만 쓰므로 물리적으로 불가능한 반사실을 만들지 않는다.

### 3.4 Decision Tree (strategy) + 휴리스틱 비교

학습 정책을 모방하는 결정 트리를 적합한다. 단, score를 회귀하는 게 아니라 lot을 **'dispatched'/'not dispatched'로 분류**하는 이진 문제로 재정의한다(가독성). agent가 큐 전체를 보고 결정하므로, 원본 feature마다 **큐 상대 정보 3종**(이 큐에서 max/min인지 binary 2개 + percentile)과 큐 길이를 추가 입력으로 넣어 큐-상대 맥락을 잡는다. scikit-learn `DecisionTreeClassifier`, depth 3–7, gini/entropy grid search로 F1 최적화. 추가로 agent 전략이 **SRPT·Setup·EDD·FIFO·CR** 같은 표준 휴리스틱과 얼마나 겹치는지 Venn diagram으로 비교한다.

대상 청중도 방법마다 다르다(Table 1): Network analysis = data scientist 전용, Decision tree = domain expert(친숙한 휴리스틱에 연결), SHAP·Counterfactual = 양쪽 경계.

## 4. 핵심 결과

- **time to step due date가 가장 중요한 discriminator**다. SHAP 최상위이자 counterfactual 결정-변경율도 최고로, 둘이 일치한다. tardiness 감소라는 목표와 정합한다. 반면 **waiting time은 낮게** 랭크 — 정책이 FIFO와 거리가 멀다는 증거다.

- **lithography에서 batching feature는 기여 ≈ 0.** litho는 본래 batch 공정이 아니므로 당연하지만, 중요한 건 **XAI가 "이 입력은 불필요"를 데이터로 증명**했다는 점이다. 그 feature를 빼면 학습 파라미터가 줄고 수렴이 빨라진다. 설명이 **feature engineering·모델 경량화로 되먹임**된다.

- **가장 통찰적인 교차검증 — remaining cycle time의 역설.** 이 feature는 SHAP은 높은데 counterfactual 결정-변경율은 낮다(MiniFab에서 14.51%뿐). 모순처럼 보이는데, network analysis가 풀어준다: remaining cycle time은 skip-connection으로 embedded feature 6에 전달되지만 그 feature는 score에 직접 기여하지 않고, **attention을 통해 큐의 모든 lot score를 같은 방향으로 동시에 밀어올린다.** 그래서 SHAP에는 큰 값으로 잡히지만 실제 **discriminator는 아니다**(모두를 같이 올리면 순위는 안 바뀜). 한 방법이면 속았을 결론을 세 방법의 합의로 바로잡은, 이 논문의 백미다.

- setup time은 높게 가중되고, Venn에서 Setup 휴리스틱과 거의 100% 겹친다(setup 동률 lot이 많아 tie-break 영향). 최대 겹침: MiniFab은 SRPT·Setup·EDD, SMT2020은 Setup·EDD·CR(CR이 SMT2020 최고 휴리스틱).

- 결정 트리 정확도: MiniFab litho 0.94, SMT2020 litho 0.97이지만 balanced accuracy는 ~0.80, F1은 더 낮다(클래스 불균형). feature 값 다양성이 큰 SMT2020에선 **트리가 작은 깊이로는 비전형 통찰을 못 뽑아** 일반 휴리스틱 도출이 어렵다 — 복잡한 instance에서 트리의 한계.

- 계산비용: SMT2020 SHAP은 시간 단위가 걸려 64 CPU 코어로 병렬화했다.

## 5. 한계

- 대상이 실제 fab가 아니라 **MiniFab·SMT2020 벤치마크**다. 실 라인의 노이즈·분포 shift에서 같은 설명이 안정적일지는 별개 문제.
- SHAP·counterfactual·surrogate tree 모두 **근사**다. 정책의 진짜 내부 논리가 아니라 그림자를 본다(post-hoc의 본질적 제약). 조합으로 완화할 뿐 완전히 풀진 못한다.
- network analysis는 self-attention 구조에 강하게 의존하고, 더 복잡한 제약(MIP/CP 결합 등)이 들어가면 방법을 다시 설계해야 한다.
- 결론적으로 해석에는 여전히 **domain expert가 loop 안에** 있어야 한다. 저자들은 future work로 post-hoc이 아닌 **inherently explainable 접근**을 예고한다.

## 6. 실 적용·구현 관점에서의 의견 (FAB Machine–Lot 할당 설명 Agent)

이 논문은 내 과제의 **레퍼런스 아키텍처로 거의 그대로 채택할 만하다.**

- **"여러 방법의 교차검증"을 핵심 원칙으로 가져간다.** 가장 배울 점은 단일 기법을 믿지 않는 태도다. 디스패칭 상태 feature는 강하게 상관(queue length ↔ WIP ↔ 예상 대기)되어 SHAP 기여 배분이 왜곡되기 쉽다. remaining cycle time 역설이 보여주듯, **SHAP이 높다고 곧 결정 driver는 아니다.** counterfactual(실제 결정이 바뀌나)과 network 분석(직접 기여냐 attention 경유냐)으로 반드시 교차검증하는 단계를 넣어야 한다.

- **counterfactual은 "feasible action 공간 안에서" 생성한다.** 논문이 큐 내 실제 값만 쓰는 것과 같은 이유다. fab은 setup·qual·예약 제약으로 불가능한 대안이 많아, 물리적으로 불가능한 반사실은 오히려 신뢰를 깬다. 큐/제약 내 샘플링이 핵심 엔지니어링 포인트.

- **"설명 → 입력 설계 되먹임" 루프를 KPI로 건다.** litho-batching 사례처럼, 우리 fab에서도 SHAP이 일관되게 기여 0으로 지목하는 feature는 입력에서 빼서 정책을 경량화한다. XAI를 신뢰 도구이자 **모델 디버깅·압축 도구**로 동시에 쓰는 게 ROI가 가장 크다.

- **설명을 "최적화 목표와의 정합성 검증"으로 쓴다.** 논문 결론처럼, setup·batch·tardiness가 중요 feature로 잡히는 건 엔지니어에게 "놀랍지 않은" 결과이며, 바로 그 점이 **reward hacking이 없음을 방증**한다. 반대로 직관에 어긋나는 가중이 잡히면 그게 경고 신호다. 즉 설명 Agent의 1차 가치는 "신뢰 부여"이자 "보상/제약 미스얼라인먼트 조기 경보"다.

- **단, CMA-ES 의존성에 주의.** 이 논문이 reward-decomposition·Q-value 기반 기법을 못 쓴 건 ES 학습이라서다. 우리가 PPO/actor-critic을 쓰면 [[posts/papers/2026-06-25-li-interpretable-drl-scheduling-decision-tree|Li et al.의 트리 distillation]]이나 reward decomposition 같은 **추가 카드가 열린다.** 학습 알고리즘 선택이 설명 옵션을 좌우한다는 걸 설계 초기에 고려해야 한다.

요약: 이 논문은 "RL 디스패처 위에 queue-wise SHAP·counterfactual·network analysis·surrogate tree를 holistic하게 얹어 단일 결정과 전체 전략을 동시에, 서로 교차검증하며 설명한다"는 검증된 청사진이다. 내 v1은 이 구조를 따르되 **feasibility 제약**과 **설명-입력 되먹임 루프**를 도메인 특화로 강화하는 방향이 맞다.

## 참고문헌

- Immordino, Stöckermann, Hayen, Altenmüller, Susto, Gebser, Schekotihin, Seidel. *Explainable AI for reinforcement learning based dynamic scheduling solutions in semiconductor manufacturing.* Journal of Intelligent Manufacturing, 2026, 37:1999–2015. [DOI: 10.1007/s10845-025-02631-3](https://doi.org/10.1007/s10845-025-02631-3)
- (벤치마크) Kopp, Hassoun, Kalir et al. *SMT2020 — A Semiconductor Manufacturing Testbed.* IEEE Transactions on Semiconductor Manufacturing, 2020, 33(4):522–531. [DOI: 10.1109/TSM.2020.3001933](https://doi.org/10.1109/TSM.2020.3001933)
