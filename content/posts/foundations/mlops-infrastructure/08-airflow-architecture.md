---
title: 08. Airflow의 구조 — 무엇이 DAG를 돌리는가
date: 2026-06-23
tags:
  - MLOps
  - Airflow
private: false
---

[[posts/foundations/mlops-infrastructure/07-what-is-a-dag|이전 글]]에서 작업의 의존성을 DAG로 표현하는 법을 봤다. 이제 그 DAG를 *실제로 정해진 일정에 맞춰 실행하고, 실패를 감지·재시도하며, 진행 상황을 보여주는* 도구가 필요하다. 그 대표가 **Apache Airflow**다. 이번 글에서는 Airflow가 무엇이고, 내부적으로 어떤 구성 요소들이 맞물려 DAG를 돌리는지를 살펴본다.

## Airflow는 워크플로 스케줄러

**Airflow**는 워크플로(작업 흐름)를 **코드로 정의하고, 일정에 따라 실행하며, 모니터링**하는 도구다. 원래 Airbnb에서 만들어 현재는 Apache 재단의 오픈소스 프로젝트다. 핵심 철학은 **"workflow as code"** — 워크플로를 GUI로 그리는 것이 아니라 *Python 코드로* 정의한다는 점이다. 덕분에 워크플로도 일반 코드처럼 버전 관리하고, 리뷰하고, 재사용할 수 있다.

Airflow가 해 주는 일을 정리하면,

- **스케줄링**: "매일 새벽 2시", "매시간"처럼 정해진 주기로 DAG를 실행한다.
- **의존성 관리**: DAG에 적힌 순서대로, 선행 작업이 끝난 작업만 실행한다.
- **재시도·실패 처리**: 작업이 실패하면 정해진 횟수만큼 자동 재시도하고, 그래도 실패하면 알린다.
- **모니터링**: 웹 UI로 각 작업의 성공/실패/진행 상태를 한눈에 보여준다.

## 핵심 용어: DAG, Task, Operator

Airflow를 이해하려면 세 용어를 구분해야 한다.

- **DAG**: 하나의 워크플로 전체. [[posts/foundations/mlops-infrastructure/07-what-is-a-dag|앞 글]]의 그 DAG이며, Airflow에서는 Python 파일 하나가 보통 하나의 DAG를 정의한다. "이 파이프라인을 언제, 어떤 순서로 돌릴지"를 담는다.
- **Task(태스크)**: DAG를 이루는 *개별 작업 단위*. DAG 그래프의 노드 하나에 해당한다. (예: `extract`, `transform`)
- **Operator(오퍼레이터)**: Task가 *무슨 일을 하는지*를 정의하는 틀(template). Task는 Operator를 하나 골라 만든 인스턴스라고 보면 된다.

Operator는 자주 쓰는 작업 유형별로 미리 마련돼 있다.

- `PythonOperator` — 임의의 Python 함수를 실행.
- `BashOperator` — 셸 명령을 실행.
- `KubernetesPodOperator` — 작업을 Kubernetes Pod(컨테이너)로 실행. ([[posts/foundations/mlops-infrastructure/06-kubernetes-hands-on|앞서 본 Kubernetes]]와 만나는 지점)
- 그 외 클라우드·DB·API 연동용 Operator가 풍부하다.

즉 **DAG(전체 워크플로) ⊃ Task(작업 노드) → Operator(그 작업이 하는 일)** 의 관계다.

## Airflow의 구성 요소

Airflow는 한 덩어리 프로그램이 아니라, 여러 컴포넌트가 협력하는 시스템이다. 핵심 넷을 보자.

```
        ┌──────────────────────────────────────────────┐
        │                Web Server (UI)               │  ← 사람이 보는 대시보드
        └───────────────────────┬──────────────────────┘
                                │ 상태 조회/조작
        ┌───────────────────────┴──────────────────────┐
        │              Metadata Database               │  ← 모든 상태의 단일 출처
        └───────────────────────┬──────────────────────┘
              읽기/쓰기 ↑         │ ↓ 읽기/쓰기
        ┌──────────────┴──┐   ┌──┴───────────────────┐
        │    Scheduler    │──▶│   Executor / Workers  │
        │ (언제·무엇을 실행)│   │  (실제 Task 실행)      │
        └─────────────────┘   └──────────────────────┘
```

- **Scheduler(스케줄러)** — Airflow의 *심장*. DAG들을 읽어, 지금 실행할 때가 된 DAG가 있는지, 그 안에서 선행 의존성이 충족돼 *실행 가능해진* Task가 무엇인지 끊임없이 판단한다. 실행할 Task를 정해 Executor에 넘긴다.
- **Executor(이그제큐터) / Worker(워커)** — Scheduler가 "이 Task를 실행하라"고 정한 것을 *실제로 실행*하는 부분. Executor는 실행 방식을 결정하는 전략이고, Worker는 실제 작업을 수행하는 프로세스다. (아래에서 부연)
- **Metadata Database(메타데이터 DB)** — DAG·Task의 *모든 상태를 저장*하는 데이터베이스. 어떤 Task가 성공/실패했는지, 언제 실행됐는지가 모두 여기 기록된다. 모든 컴포넌트가 이 DB를 **단일 진실 공급원(single source of truth)** 으로 공유한다.
- **Web Server (UI)** — 사람이 보는 *웹 대시보드*. DAG의 그래프, 각 Task의 상태(성공=초록, 실패=빨강), 로그, 실행 이력을 보여주고, 수동 실행·재시도 같은 조작도 제공한다. (UI는 메타데이터 DB의 내용을 보여줄 뿐, 실행 자체는 Scheduler/Executor가 한다.)

이 넷이 메타데이터 DB를 중심으로 맞물린다. Scheduler가 "무엇을 실행할지" 정해 DB에 기록하고 Executor에 넘기면, Worker가 실행한 뒤 결과를 다시 DB에 쓰고, Web Server는 그 DB를 읽어 사람에게 보여준다.

### Executor의 종류 (실행을 어떻게 분산하나)

**Executor**는 Task를 *어디서 어떻게* 실행할지 정하는 전략이다. 규모에 따라 고른다.

- `LocalExecutor` — 한 대의 머신에서 여러 Task를 병렬 실행. 소규모·학습용.
- `CeleryExecutor` — 여러 Worker 머신에 Task를 분산. 대규모 운영에서 전통적으로 많이 쓴다.
- `KubernetesExecutor` — 각 Task를 *별도의 Kubernetes Pod*로 띄워 실행. Task마다 격리된 환경에서 돌고, 끝나면 Pod가 사라진다. [[posts/foundations/mlops-infrastructure/00-mlops-infrastructure-overview|시리즈 개요]]에서 말한 Docker·K8s·Airflow가 한데 모이는 전형적인 형태다.

입문 단계에서는 "Executor를 바꾸면 *코드는 그대로 둔 채* 실행 규모와 방식만 달라진다"는 점만 기억하면 충분하다.

## 요약

- **Airflow**는 워크플로를 *Python 코드로 정의*하고(workflow as code), 일정에 따라 실행·재시도·모니터링하는 워크플로 스케줄러다.
- **DAG**(워크플로 전체) ⊃ **Task**(작업 노드) → **Operator**(그 작업이 하는 일). `PythonOperator`·`KubernetesPodOperator` 등 Operator로 Task가 할 일을 정한다.
- 구성 요소: **Scheduler**(언제·무엇을 실행할지 결정) · **Executor/Worker**(실제 실행) · **Metadata DB**(모든 상태의 단일 출처) · **Web Server**(모니터링 UI).
- **Executor**(Local/Celery/Kubernetes)를 바꾸면 코드 변경 없이 실행 규모·방식을 조절할 수 있다.
- 다음 글에서는 이 개념들을 코드로 옮겨 [[posts/foundations/mlops-infrastructure/09-first-dag|첫 DAG를 직접 작성]]한다.
