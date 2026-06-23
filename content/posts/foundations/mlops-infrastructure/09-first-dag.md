---
title: 09. 첫 DAG 작성하기 — 코드로 워크플로 만들기
date: 2026-06-23
tags:
  - MLOps
  - Airflow
private: false
---

[[posts/foundations/mlops-infrastructure/08-airflow-architecture|이전 글]]에서 Airflow의 구조와 DAG·Task·Operator 개념을 봤다. 이제 이를 *실제 Python 코드*로 옮겨, 동작하는 첫 DAG를 만들어 본다. Airflow의 "workflow as code" 철학이 코드에서 어떻게 드러나는지에 초점을 둔다.

## DAG 파일은 Python 스크립트다

Airflow에서 DAG는 `dags/` 폴더에 둔 *평범한 Python 파일*로 정의한다. Scheduler가 이 폴더를 주기적으로 읽어 DAG를 파악한다. 가장 단순한 예부터 보자. 세 개의 Task를 순서대로 잇는 DAG다.

```python
from airflow import DAG
from airflow.operators.python import PythonOperator
from datetime import datetime

# 1) Task가 실제로 할 일 (그냥 Python 함수)
def extract():
    print("데이터를 수집한다")

def transform():
    print("데이터를 전처리한다")

def load():
    print("결과를 적재한다")

# 2) DAG 정의
with DAG(
    dag_id="my_first_dag",
    start_date=datetime(2026, 6, 1),
    schedule="@daily",          # 매일 1회 실행
    catchup=False,              # 과거치 소급 실행 안 함
) as dag:

    # 3) Task 정의 (PythonOperator로 위 함수를 감싼다)
    t1 = PythonOperator(task_id="extract", python_callable=extract)
    t2 = PythonOperator(task_id="transform", python_callable=transform)
    t3 = PythonOperator(task_id="load", python_callable=load)

    # 4) 의존성(순서) 정의
    t1 >> t2 >> t3
```

이 짧은 코드에 [[posts/foundations/mlops-infrastructure/08-airflow-architecture|이전 글]]의 개념이 그대로 담겨 있다. `with DAG(...)`가 워크플로 전체를, `PythonOperator(...)`가 각 Task를, 함수 `extract`/`transform`/`load`가 그 Task가 *할 일*을 정의한다.

## 의존성은 `>>` 로 잇는다

Airflow에서 가장 특징적인 문법이 **`>>` 연산자**로 Task의 순서를 적는 것이다. 화살표 모양 그대로 의존성을 표현한다.

```python
t1 >> t2 >> t3        # t1 → t2 → t3 (직렬)
```

이 한 줄이 [[posts/foundations/mlops-infrastructure/07-what-is-a-dag|DAG의 엣지]]를 정의한다. `t1 >> t2`는 "t1이 성공해야 t2를 시작한다"는 뜻이다. 병렬과 합류도 자연스럽게 적을 수 있다.

```python
t1 >> [t2, t3]        # t1 다음에 t2와 t3를 병렬 실행
[t2, t3] >> t4        # t2, t3가 모두 끝나면 t4 실행
```

```
        ┌──▶ t2 ──┐
t1 ─────┤         ├──▶ t4
        └──▶ t3 ──┘
```

리스트로 묶으면 그 Task들이 *서로 의존하지 않아 동시에* 돌 수 있고, 뒤의 Task는 *앞의 것들이 모두 끝나야* 시작한다. 그래프 그림이 코드에 거의 그대로 옮겨진다.

## 스케줄과 재시도

DAG 정의에서 *언제* 돌릴지는 `schedule` 인자로 정한다.

- `"@daily"`, `"@hourly"`, `"@weekly"` 같은 약칭
- 또는 cron 표현식: `"0 2 * * *"` (매일 새벽 2시)

`start_date`는 이 DAG가 *언제부터 유효한지*의 기준점이고, `catchup=False`는 "과거에 놓친 실행분을 소급해서 한꺼번에 돌리지 말라"는 흔한 설정이다. (`True`로 두면 start_date부터 현재까지의 모든 주기를 채우려 실행한다 — 의도치 않은 대량 실행을 막으려 보통 `False`로 시작한다.)

작업이 실패했을 때의 동작은 `default_args`로 지정한다. [[posts/foundations/mlops-infrastructure/08-airflow-architecture|Airflow가 제공하는 자동 재시도]]가 여기서 설정된다.

```python
from datetime import timedelta

default_args = {
    "retries": 3,                          # 실패 시 최대 3번 재시도
    "retry_delay": timedelta(minutes=5),   # 재시도 간격 5분
}

with DAG(
    dag_id="my_first_dag",
    start_date=datetime(2026, 6, 1),
    schedule="@daily",
    catchup=False,
    default_args=default_args,
) as dag:
    ...
```

이렇게 두면, 일시적인 네트워크 오류 등으로 Task가 실패해도 Airflow가 5분 간격으로 3번까지 자동 재시도한다. 그래도 실패하면 그 Task는 *실패*로 기록되고, 그에 의존하는 뒤 Task들은 실행되지 않는다(UI에서 빨간색으로 보인다).

## 실행과 모니터링

이 파일을 Airflow의 `dags/` 폴더에 두면, Scheduler가 자동으로 인식해 `my_first_dag`라는 DAG가 웹 UI에 나타난다. UI에서는,

- DAG를 켜고(toggle on) 스케줄에 따라 자동 실행하거나, **수동으로 즉시 실행**(Trigger)할 수 있다.
- **Graph 뷰**로 Task 간 의존 관계와 각 Task의 상태(성공=초록, 실패=빨강, 실행 중=연두)를 본다.
- 각 Task를 클릭해 **로그**를 확인하고, 실패한 Task만 골라 **재실행(clear/rerun)** 할 수 있다.

[[posts/foundations/mlops-infrastructure/07-what-is-a-dag|DAG의 부분 재실행]] 이점이 여기서 실제로 쓰인다 — 전체를 처음부터 돌릴 필요 없이, 실패 지점과 그 이후만 다시 돌리면 된다.

## 요약

- Airflow의 DAG는 `dags/` 폴더에 둔 **Python 파일**로 정의한다 — workflow as code.
- `with DAG(...)`로 워크플로를, `PythonOperator` 등으로 **Task**를, 함수로 *할 일*을 정의한다.
- 의존성(순서)은 **`>>`** 로 잇는다. 리스트(`[t2, t3]`)를 쓰면 병렬·합류를 그래프 그림 그대로 표현한다.
- `schedule`(@daily·cron)로 실행 주기를, `default_args`의 `retries`·`retry_delay`로 **자동 재시도**를 설정한다. `catchup=False`로 과거 소급 실행을 막는다.
- 웹 UI에서 그래프·상태·로그를 보고, 실패한 Task만 골라 재실행할 수 있다.
- 다음 글에서는 이 Airflow가 [[posts/foundations/mlops-infrastructure/10-tying-it-together|Docker·Kubernetes와 한데 묶이는]] 전체 MLOps 파이프라인을 조망한다.
