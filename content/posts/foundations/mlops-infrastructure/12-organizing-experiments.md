---
title: 12. 실험을 관리 가능하게 만들기
date: 2026-08-22
tags:
  - MLOps
  - MLflow
---

[[posts/foundations/mlops-infrastructure/11-mlflow-experiment-tracking|11편]]에서 MLflow를 붙였다. 이제 돌리는 족족 기록이 남는다. 그런데 반년쯤 지나면 새로운 종류의 고통이 온다. experiment가 40개, run이 3000개 쌓여 있는데 UI를 열어도 아무것도 찾을 수 없다. 이름을 지정하지 않아 자동 생성된 run 이름들 사이에서 "지난 분기에 제일 좋았던 그 설정"을 눈으로 뒤진다.

**기록하는 것과 찾을 수 있게 기록하는 것은 다른 일이다.** 이번 편은 API 소개가 아니라, 그 차이를 만드는 판단 기준에 관한 글이다. 기준 버전은 앞 편과 같이 **MLflow 3.15** 다.

먼저 솔직히 밝혀 둘 것이 있다. MLflow 공식 문서에는 "실험 조직화 베스트 프랙티스" 전용 페이지가 없다. 아래 규칙 대부분은 문서가 명시한 **제약과 정의에서 따라 나오는 실무 규칙** 이지, 공식 권장 사항이라는 뜻은 아니다. 근거가 문서인 부분과 내 원칙인 부분을 구분해 적었다.

## run의 단위를 무엇으로 잡을 것인가

가장 먼저 정해야 할 것은 "무엇을 run 하나로 볼 것인가"다. 내가 쓰는 기준은 하나다.

> **1 run = 재현 가능한 학습 1회.**

이 정의는 두 방향으로 작동한다. 첫째, 재현 가능하지 않으면 run으로 만들지 않는다. 둘째, 재현 가능한 학습이라면 반드시 run으로 남긴다.

그래서 데이터를 내려받기만 하는 스크립트, 노트북에서 그래프 몇 개 그려 보는 EDA, 전처리 파라미터를 눈으로 확인하는 작업은 run으로 만들지 않는다. 이런 것들이 run으로 섞여 들어오면 experiment의 run 목록이 "비교 대상"의 목록이 아니게 되고, 그 순간 UI의 정렬·비교 기능이 무의미해진다. run 목록은 **서로 비교할 만한 것들만 들어 있는 목록** 이어야 쓸모가 있다.

하이퍼파라미터 스윕은 예외처럼 보이지만 아니다. 스윕의 각 trial은 그 자체로 재현 가능한 학습이므로 각각이 run이고, 스윕 전체를 묶는 parent run을 하나 더 둔다. MLflow는 이 구조를 `nested=True`로 지원한다.

```python
with mlflow.start_run(run_name="hyperparameter_sweep") as parent_run:
    for lr in [0.001, 0.01, 0.1]:
        with mlflow.start_run(nested=True, run_name=f"lr_{lr}") as child_run:
            mlflow.log_params({"learning_rate": lr})
            # ... 학습 및 metric 로깅
```

Optuna를 쓰는 공식 튜토리얼도 같은 모양이다. 바깥에서 study를 감싸는 run을 열고, `objective` 안에서 trial마다 `nested=True` run을 연 뒤 `trial.set_user_attr("run_id", child_run.info.run_id)`로 trial과 run을 이어 둔다. 나중에 "best trial이 어느 run이었나"를 되짚기 위해서다.

sklearn의 autolog는 `GridSearchCV` 같은 서치에 대해 이 parent/child 구조를 **자동으로** 만들어 준다. 다만 여기에 상한이 있다는 것을 알아 둬야 한다. `mlflow.sklearn.autolog(max_tuning_runs=5)`가 기본값이고, 이 값이 child run으로 남길 조합의 개수 상한이다. 그리드가 200개 조합이어도 child run은 기본 5개만 생긴다. 전수를 남기고 싶다면 이 값을 올려야 하고, 올리면 run 수가 폭증한다 — 뒤에 나올 안티패턴과 정면으로 충돌하는 trade-off다.

## experiment를 무엇으로 나눌 것인가

문서에서 experiment는 "특정 작업 단위로 run과 model을 묶는 것"으로 설명된다. 여기서 중요한 것은 **비교가 experiment 안에서 일어난다** 는 사실이다. MLflow UI의 run 비교, 정렬, 지표 차트는 기본적으로 하나의 experiment를 열었을 때 동작한다.

이 사실 하나에서 규칙이 곧장 나온다.

> **비교하고 싶은 run들은 같은 experiment 안에 있어야 한다.**

그래서 experiment를 사람 이름(`donghyun-experiments`)이나 날짜(`2026-08-exp`)로 나누면 안 된다. 나와 동료가 같은 문제를 각자 풀면 두 결과는 반드시 비교돼야 하는데, 사람으로 갈라 놓으면 그 비교가 UI에서 불가능해진다. 날짜도 마찬가지다. 정작 알고 싶은 것은 "이번 달 모델이 3월 모델보다 나은가"인데, 달로 나누면 그 비교가 끊긴다.

experiment는 **"어떤 문제를 푸는가"** 로 나누는 것이 맞다. `fab2-dispatching-cycletime`처럼 예측 대상과 대상 범위가 이름에 드러나면 좋다. 사람·날짜·브랜치 같은 축은 experiment가 아니라 **태그** 로 남긴다. 태그는 experiment 안에서 필터링에 쓰이므로 비교를 깨지 않는다.

## 태그 설계 — 되찾을 축을 미리 정한다

태그를 붙이는 목적은 장식이 아니라 검색이다. 기준은 이렇다. **나중에 "이 조건에 해당하는 run만 보여 줘"라고 말하게 될 축을 태그로 남긴다.**

MLflow는 일부 태그를 자동으로 채워 준다. `mlflow.` 접두어는 MLflow 예약이므로 사용자가 이 이름으로 태그를 만들면 안 된다. 자주 쓰이는 것들은 다음과 같다.

| 시스템 태그 | 내용 |
|---|---|
| `mlflow.runName` | run 이름 |
| `mlflow.source.name` | 실행한 스크립트 경로 또는 노트북 |
| `mlflow.source.type` | LOCAL / PROJECT / NOTEBOOK / JOB |
| `mlflow.source.git.commit` | 실행 시점의 git 커밋 해시 |
| `mlflow.user` | 실행 사용자 |
| `mlflow.parentRunId` | nested run의 부모 run ID |
| `mlflow.note.content` | UI 상단에 표시되는 노트 |
| `mlflow.autologging` | autolog로 생성됐는지 여부 |

`mlflow.source.git.commit`은 특히 중요하다. 이것이 있어야 "이 run의 코드"를 정확히 되찾을 수 있다. `mlflow.note.content`는 UI에서 그 run이 무엇을 시도한 것인지 한 문장 남기는 자리로, 반년 뒤의 나에게 보내는 메모라고 생각하면 된다.

사용자 태그는 여기에 없는 축을 채운다. 내가 늘 남기는 것은 데이터 스냅샷 식별자, 실행 주체(사람/CI), 실험의 목적 분류, 그리고 시뮬레이션 환경 버전이다.

```python
mlflow.set_tags({
    "data_snapshot": "fab2-2026-07",
    "owner": "donghyun",
    "purpose": "feature-ablation",
    "trigger": "airflow",
})
```

## `search_runs()` — 문법과 함정

태그를 잘 남겼다면 이제 코드로 찾을 수 있다. `mlflow.search_runs()`는 filter string을 받아 조건에 맞는 run을 pandas DataFrame으로 돌려준다.

접두어는 다섯 가지다. `metrics.`, `params.`, `tags.`, `attributes.`(run 메타데이터 — status, user_id, timestamp, run_id), `datasets.`(name, digest, context).

```python
import mlflow

bad_runs = mlflow.search_runs(
    filter_string="metrics.loss > 0.8", search_all_experiments=True
)
```

여기서 실제로 사람을 걸어 넘어뜨리는 제약이 두 개 있다. 문서에 명시된 것들이다.

**첫째, `OR`가 없다.** 논리 연산자는 `AND`뿐이다. "accuracy가 0.9 이상이거나 f1이 0.85 이상"을 한 번의 쿼리로 표현할 방법이 없다. 두 번 조회해서 파이썬 쪽에서 합쳐야 한다. 이 제약은 태그 설계에 영향을 준다 — OR로 표현하고 싶어질 조건이 있다면, 애초에 그것을 하나의 태그 값으로 만들어 두는 편이 낫다.

**둘째, metric이 아닌 숫자는 문자열로 따옴표를 쳐야 한다.** `params.batch_size = 2`는 동작하지 않고 `params.batch_size = "2"`라고 써야 한다. param과 tag는 내부적으로 전부 문자열로 저장되기 때문이다. 문자열 필드에 쓸 수 있는 연산자도 `=`, `!=`, `LIKE`(대소문자 구분), `ILIKE`(구분 안 함)뿐이라 `params.batch_size > 16` 같은 크기 비교는 아예 되지 않는다. **수치 비교를 하고 싶은 값은 param이 아니라 metric으로도 함께 찍어 두는 것** 이 실무적 우회다.

그 밖에 `IS NULL`/`IS NOT NULL`은 params와 tags에만 쓸 수 있고 metrics·attributes에는 쓸 수 없으며, 특수문자가 든 필드명은 백틱이나 큰따옴표로 감싼다.

top-1을 뽑는 전형적인 패턴은 이렇다.

```python
from mlflow.entities import ViewType

highest_accuracy_run = mlflow.search_runs(
    experiment_names=["search-run-guide"],
    run_view_type=ViewType.ACTIVE_ONLY,
    max_results=1,
    order_by=["metrics.accuracy DESC"],
)[0]
```

이 한 조각이 실제로는 CI에서 "이번 주 최고 모델을 골라 registry에 올려라" 같은 자동화의 심장이 된다.

## `search_logged_models()` — 모델을 직접 찾기

11편에서 모델이 1급 엔티티가 됐다고 했으니, 모델을 직접 검색하는 API도 생겼다. `mlflow.search_logged_models()`다.

```python
mlflow.search_logged_models(
    experiment_ids=["1"],
    filter_string="params.model_type = 'RandomForest' AND metrics.accuracy > 0.9",
    order_by=[
        {"field_name": "metrics.accuracy", "ascending": False},
        {"field_name": "creation_time", "ascending": True},
    ],
    max_results=5,
)
```

**문법이 `search_runs`와 다르다는 점을 반드시 기억해야 한다.** 습관대로 쓰면 조용히 다른 결과가 나오거나 에러가 난다.

- 접두어는 `metrics.`, `params.`, 그리고 **접두어 없음 = 모델 속성** (`name`, `creation_time`).
- **`tags.` 필터링을 지원하지 않는다.** run에서 태그로 찾던 습관이 여기서는 통하지 않는다.
- 문자열 속성 연산자는 `=`, `!=`, `IN`, `NOT IN`뿐. **`LIKE`가 없다.**
- `OR`는 여기서도 없다.
- `order_by`가 문자열 리스트가 아니라 **dict 리스트** 다.
- 문서는 **experiment 10개를 넘겨 검색하지 말라** 고 명시한다.

마지막 제약은 조직화 규칙에 직접 영향을 준다. experiment를 잘게 쪼갤수록 모델 검색이 어려워진다는 뜻이므로, "문제 단위로 experiment를 나눈다"는 앞의 규칙을 지킬 또 하나의 이유가 된다.

## 안티패턴

여기까지가 "이렇게 하라"였다면, 이 절은 실제로 사람들이 겪는 실패 모드다.

**재현 불가능한 run.** 코드 커밋 해시가 없거나 데이터 스냅샷 식별자가 없는 run은, 숫자는 있지만 그 숫자를 다시 만들 방법이 없다. 지표 하나짜리 화석이다. `mlflow.source.git.commit`이 남으려면 git 저장소 안에서 실행돼야 하고, 커밋되지 않은 변경이 있으면 `mlflow.source.git.dirty`가 그 사실을 알려 준다. **커밋하지 않은 코드로 돌린 run은 비교 대상이 아니라고 보는 편이 안전하다.**

**아티팩트 남발.** epoch마다 체크포인트를 통째로 artifact store에 올리면, 100 epoch × 50 run만으로 스토리지가 수 TB가 된다. 진짜 문제는 비용이 아니라 UI가 느려지고 아무도 정리하지 않아 결국 전체를 지우게 된다는 것이다. 원칙: **best 체크포인트와 마지막 체크포인트만 남기고, 중간 과정은 metric의 `step` 축으로 남긴다.** 곡선을 보는 데는 숫자면 충분하다.

**이름 없는 run 수백 개.** `run_name`을 주지 않으면 MLflow가 임의의 이름을 붙여 준다. 목록에서 의미를 읽을 수 없게 되므로, `run_name`은 항상 지정하고 그 안에 사람이 읽을 수 있는 구분자(모델 종류, 주요 변경점)를 넣는다.

**실패한 run 삭제.** 실패했거나 성능이 나쁜 run을 지우고 싶은 충동이 든다. 하지만 "이 방향은 이미 해 봤는데 안 됐다"는 정보는 성공한 run만큼 값지다. 6개월 뒤 새로 온 팀원이 똑같은 실험을 반복하는 것을 막아 주는 것이 바로 그 실패 run이다. 지우지 말고, 태그로 표시해 필터에서 빼라.

**metric 이름 불일치.** 팀원 A는 `acc`, B는 `accuracy`, C는 `val_acc`로 찍으면 세 사람의 run은 영원히 같은 차트에 그려지지 않는다. `search_runs`에도 걸리지 않는다. 사소해 보이지만 조직화 실패의 가장 흔한 원인이다. **지표 이름 목록을 코드에 상수로 박아 공유하는 것** 이 가장 값싼 해법이다.

## RL·장시간 학습 실험의 특수성

여기서부터는 공식 문서 근거가 아니라, 강화학습이나 대형 모델 학습처럼 **한 번의 학습이 수 시간~수일 걸리는 실험** 에 대해 내가 세운 원칙이다. MLflow 문서가 이 상황을 따로 다루지는 않는다.

**로깅 주기를 정해야 한다.** RL은 episode 단위로 지표가 나오므로 아무 생각 없이 찍으면 한 run에 metric이 수십만 개 쌓인다. backend store가 무거워지고 UI 차트가 렌더링되지 않는다. episode 100개마다 평균을 찍는 식으로 **집계 후 로깅** 을 기본으로 하고, 원본이 필요하면 별도 파일로 artifact에 한 번 올린다.

**seed만 다른 반복 실행을 어떻게 묶을 것인가.** RL 결과는 seed 편차가 크므로 보통 같은 설정을 5~10개 seed로 돌린다. 이 run들은 개별적으로는 의미가 없고 **묶어서 평균·분산으로 봐야** 한다. 스윕과 같은 방식으로 parent run 아래 nested run으로 묶고, 동시에 공통 태그(`config_id` 같은 것)를 전부에 붙여 두면 parent를 거치지 않고도 태그 하나로 그룹을 되찾을 수 있다.

**환경 버전을 param으로 남긴다.** 스케줄링 RL의 시뮬레이터처럼 학습 환경 자체가 코드인 경우, 시뮬레이터가 한 줄 바뀌면 이전 run과의 비교는 무의미해진다. 그런데 이 변경은 하이퍼파라미터에도, 데이터 스냅샷에도 드러나지 않는다. 그러므로 **시뮬레이터/환경의 버전이나 커밋 해시를 명시적으로 param에 남겨야 한다.** 이것을 빠뜨리면 "왜 갑자기 보상이 20% 올랐지?"라는 질문에 영원히 답할 수 없다.

## 요약

- **1 run = 재현 가능한 학습 1회.** EDA나 데이터 로딩은 run으로 만들지 않는다. 스윕은 parent/child(nested run)로 묶고, sklearn autolog는 이 구조를 자동 생성하되 `max_tuning_runs=5` 상한이 있다.
- **experiment는 "어떤 문제를 푸는가"로 나눈다.** 비교는 experiment 안에서 일어나므로, 사람·날짜로 나누면 비교가 끊긴다. 그런 축은 태그로.
- **태그는 나중에 검색할 축을 미리 정하는 일.** `mlflow.` 접두어는 예약이며, `mlflow.source.git.commit`·`mlflow.note.content` 같은 시스템 태그를 먼저 활용한다.
- **`search_runs()`의 두 함정: `OR`가 없다, metric이 아닌 숫자는 따옴표를 쳐야 한다.** MLflow 3의 `search_logged_models()`는 문법이 또 달라서 `tags.` 필터·`LIKE`가 없고 experiment 10개 초과 검색을 금지한다.
- **안티패턴**: 커밋·데이터 스냅샷 없는 run, 체크포인트 남발, 이름 없는 run, 실패 run 삭제, 제각각인 metric 이름.
- **장시간·RL 실험** 은 로깅 주기 결정, seed 반복의 그룹화, 환경 버전의 param 기록이 추가로 필요하다 (문서 근거가 아닌 원칙).
- 다음 편 [[posts/foundations/mlops-infrastructure/13-models-and-registry|모델을 자산으로 만들기]]에서는, 잘 정리한 실험에서 나온 모델을 어떻게 남에게 넘길 수 있는 형태로 포장하는지를 다룬다.

## 참고문헌

- [Search Runs](https://mlflow.org/docs/latest/ml/search/search-runs/) — filter string 문법과 제약.
- [Search Models](https://mlflow.org/docs/latest/ml/search/search-models/) — `search_logged_models()`의 다른 문법.
- [Hyperparameter Tuning](https://mlflow.org/docs/latest/ml/getting-started/hyperparameter-tuning/) — Optuna parent/child 패턴.
- [Automatic Logging](https://mlflow.org/docs/latest/ml/tracking/autolog/) — `max_tuning_runs` 등 autolog 동작.
