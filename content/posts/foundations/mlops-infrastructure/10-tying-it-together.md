---
title: 10. 셋을 잇기 — Docker·Kubernetes·Airflow가 만나는 MLOps 파이프라인
date: 2026-06-23
tags:
  - MLOps
  - Docker
  - Kubernetes
  - Airflow
private: false
---

이 시리즈는 [[posts/foundations/mlops-infrastructure/00-mlops-infrastructure-overview|"내 PC에서만 되는" 문제]]에서 출발해 Docker(컨테이너), Kubernetes(오케스트레이션), Airflow(워크플로 스케줄링)를 차례로 쌓아 올렸다. 마지막 글에서는 이 셋이 *따로 노는 도구가 아니라 한 몸처럼 맞물려* 하나의 MLOps 파이프라인을 이루는 모습을 조망한다. 각각이 어디를 맡고 어디서 만나는지를 한 그림으로 정리하는 것이 목표다.

## 각자의 역할 다시 보기

세 도구는 서로 다른 층위의 문제를 푼다. 경쟁 관계가 아니라 **층층이 쌓이는 보완 관계**다.

| 도구 | 푸는 문제 | 단위 |
|---|---|---|
| **Docker** | 재현성·이식성 — 어디서나 똑같이 실행 | 컨테이너(이미지) |
| **Kubernetes** | 배포·확장·복구 — 여러 서버에 걸쳐 운영 | Pod |
| **Airflow** | 자동화·스케줄링 — 작업을 언제·어떤 순서로 | DAG / Task |

- **Docker**는 "*무엇을* 실행하는가"를 고정한다. 코드와 환경을 이미지로 묶어, 실행되는 내용이 어디서나 동일하게 만든다.
- **Kubernetes**는 "*어디서* 실행하는가"를 책임진다. 그 컨테이너들을 여러 서버에 배치하고, 죽으면 살리고, 부하에 따라 늘린다.
- **Airflow**는 "*언제·어떤 순서로* 실행하는가"를 지휘한다. 여러 작업을 DAG로 엮어 정해진 일정에 돌리고 실패를 관리한다.

## 셋이 만나는 지점

이 도구들이 실제로 맞물리는 연결 고리를 따라가 보자.

**1) Airflow의 Task가 곧 Docker 컨테이너가 된다.**
[[posts/foundations/mlops-infrastructure/08-airflow-architecture|Airflow의 Operator]] 중 `KubernetesPodOperator`를 쓰면, 하나의 Task가 *지정한 Docker 이미지로 만든 Kubernetes Pod*로 실행된다. 즉 "전처리 Task"는 전처리 이미지를 담은 Pod로, "학습 Task"는 GPU를 요구하는 학습 이미지를 담은 Pod로 각각 격리되어 돈다.

**2) Kubernetes가 그 Pod들을 떠받친다.**
Airflow가 "이 Task를 Pod로 띄워라"라고 요청하면, [[posts/foundations/mlops-infrastructure/04-why-orchestration|Kubernetes의 control plane]]이 한가한 워커 노드를 골라 Pod를 배치한다. Task가 끝나면 Pod는 사라지고 자원이 회수된다. 학습 Task만 GPU 노드에 보내는 식의 배치도 Kubernetes가 처리한다.

**3) Docker 이미지가 그 Pod의 내용물을 고정한다.**
각 Pod 안에서 도는 컨테이너는 [[posts/foundations/mlops-infrastructure/02-dockerfile-and-image-build|Dockerfile로 빌드해 레지스트리에 올린 이미지]]에서 나온다. 그래서 어느 노드에 배치되든 Task의 실행 환경은 동일하다 — 시리즈 첫 글의 재현성 문제가 파이프라인 끝까지 보장되는 것이다.

## 한 그림으로 보는 전체 파이프라인

```
┌─────────────────────────────────────────────────────────────┐
│  Airflow  ── DAG: 매일 새벽 2시, 아래 순서로 실행 ──            │
│                                                             │
│   extract ──▶ transform ──▶ train ──▶ evaluate ──▶ deploy    │
│     │            │           │          │           │       │
│     ▼            ▼           ▼          ▼           ▼       │
│  각 Task = KubernetesPodOperator (Pod 하나로 실행)            │
└───────────────────────────┬─────────────────────────────────┘
                            │ "이 이미지로 Pod를 띄워라"
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Kubernetes  ── 요청받은 Pod를 워커 노드에 배치·복구 ──         │
│                                                             │
│   [Node A: transform Pod]   [Node B(GPU): train Pod]   ...   │
└───────────────────────────┬─────────────────────────────────┘
                            │ 각 Pod의 컨테이너는…
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Docker  ── 레지스트리의 이미지로 환경을 고정 ──                │
│                                                             │
│   transform:1.0   train:1.0(+CUDA)   evaluate:1.0   ...      │
└─────────────────────────────────────────────────────────────┘
```

위에서 아래로 읽으면, **Airflow가 *언제·무엇을* 지휘하고 → Kubernetes가 *어디서* 실행할지 배치하고 → Docker가 *무엇을* 실행할지 고정한다**. 시리즈에서 아래층부터 쌓아 올린 것을, 실제 운영에서는 위층(Airflow)이 아래층(K8s, Docker)을 부려 쓰는 구조다.

## 이것이 MLOps의 뼈대

이 세 층의 조합은 머신러닝 시스템을 *지속적으로* 운영하기 위한 전형적인 뼈대다.

- 매일 새로운 데이터로 **자동 재학습**(Airflow가 스케줄링)
- 각 단계가 **격리·재현 가능한 환경**에서 실행(Docker)
- 무거운 학습은 **필요한 자원의 서버에 배치**되고 실패해도 복구(Kubernetes)

물론 실제 MLOps에는 이 위에 데이터 버전 관리, 모델 레지스트리, 실험 추적, 모니터링 같은 도구들이 더 얹힌다. 하지만 *"컨테이너로 고정하고, 오케스트레이터로 운영하고, 스케줄러로 자동화한다"* 는 이 뼈대는 어떤 스택을 쓰든 공통적으로 깔린다. 이 시리즈가 그 뼈대를 스스로 이해하는 출발점이 됐기를 바란다.

## 요약

- **Docker**(무엇을 실행) · **Kubernetes**(어디서 실행) · **Airflow**(언제·어떤 순서로 실행)는 서로 다른 층위를 맡아 한 몸으로 맞물린다.
- 연결 고리: Airflow의 **Task가 `KubernetesPodOperator`로 Pod가 되고**, **Kubernetes가 그 Pod를 노드에 배치·복구**하며, **Docker 이미지가 Pod의 실행 환경을 고정**한다.
- 전체 흐름은 *Airflow가 지휘 → Kubernetes가 배치 → Docker가 환경 고정* 순으로 읽힌다.
- 이 세 층의 조합이 **자동 재학습·환경 재현·자원 배치·장애 복구**를 갖춘 MLOps 파이프라인의 뼈대이며, 더 큰 스택도 이 위에 얹힌다.
