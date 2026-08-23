---
title: 13. 모델을 자산으로 만들기 — Model과 Registry
date: 2026-08-22
tags:
  - MLOps
  - MLflow
---

[[posts/foundations/mlops-infrastructure/12-organizing-experiments|12편]]까지 왔다면 실험은 정리됐고, 그중 제일 좋은 모델도 골라 냈다. 이제 그 모델을 서빙 담당자에게 넘길 차례다. `best_model.pkl`을 슬랙으로 보낸다. 그리고 곧 질문이 돌아온다.

> "이거 입력을 어떤 형태로 넣어야 하죠? 컬럼 순서는요? scikit-learn 몇 버전이 필요해요? 전처리는 제가 다시 짜야 하나요?"

pickle 파일에는 이 중 어떤 답도 들어 있지 않다. 모델 객체의 바이트열만 있을 뿐이다. **MLflow Model은 모델과 함께 그 계약(contract)을 포장하는 포맷** 이고, **Model Registry는 그렇게 포장한 모델에 이름과 버전을 붙여 조직의 자산으로 관리하는 장치** 다. 이번 편의 기준도 **MLflow 3.15** 다.

## MLflow Model — 디렉터리와 flavor

MLflow Model은 파일 하나가 아니라 **디렉터리** 다. 문서 정의를 그대로 옮기면 이렇다.

> "Each MLflow Model is a directory containing arbitrary files, together with an `MLmodel` file in the root of the directory that can define multiple *flavors* that the model can be viewed in."

전형적인 모습은 이렇다.

```
model/
├── MLmodel              ← 이 모델이 무엇인지 설명하는 메타데이터
├── model.pkl            ← 실제 모델 바이트
├── conda.yaml           ← 의존성 (conda)
├── python_env.yaml      ← 의존성 (virtualenv)
├── requirements.txt     ← 의존성 (pip)
└── input_example.json   ← 입력 예시 (선택)
```

핵심은 `MLmodel` 파일이다. 여기에 `flavors`, `time_created`, `run_id`, `signature`, `input_example`, `mlflow_version` 등이 담긴다. 위에서 서빙 담당자가 던졌던 질문 — 입력 형태(`signature`), 필요한 라이브러리 버전(`requirements.txt`) — 이 전부 이 디렉터리 안에 답으로 들어 있다.

**flavor** 는 MLflow의 가장 영리한 설계다. 문서 표현으로는 "배포 도구가 모델을 이해하기 위해 사용하는 규약(convention)"으로, 도구가 ML 라이브러리마다 따로 통합 코드를 짜지 않고도 어떤 모델이든 다룰 수 있게 하는 것이 목적이다.

무슨 뜻인지 풀어 보자. 서빙 도구를 하나 만든다면 원래는 sklearn·PyTorch·XGBoost 로딩 코드를 전부 따로 짜야 한다. 라이브러리가 $M$개, 배포 도구가 $N$개면 $M \times N$개의 통합이 필요하다. MLflow는 여기에 **`python_function`(줄여서 pyfunc)이라는 공통 flavor** 를 끼워 넣는다. 어떤 라이브러리로 학습했든 pyfunc으로 저장되면 로딩과 호출 방법이 똑같다.

```python
model = mlflow.pyfunc.load_model(model_uri)
model.predict(data)                 # DataFrame / ndarray / list / dict / str
model.predict_stream(data)          # MLflow 2.12.2+, generator 반환
```

이제 통합은 $M + N$개로 줄어든다. `mlflow models serve`가 프레임워크를 가리지 않고 동작하는 이유가 바로 이것이다. 참고로 **MLflow 3에서 `fastai`, `mleap`, `diviner`, `gluon` flavor는 제거됐다.**

## signature와 input example — 계약을 명문화하기

`signature`는 문서 표현으로 "a contract that specifies exactly what data your model expects and what it will return" — 모델이 어떤 데이터를 받고 무엇을 돌려주는지를 정확히 규정하는 계약이다.

계약이 있으면 **검증** 이 가능해진다. MLflow는 `mlflow.pyfunc.load_model`로 로드할 때, 배포 도구를 쓸 때, REST 서빙을 할 때 signature를 강제(enforce)한다. 규칙은 상식적이다. 필수 필드가 빠지면 실패, optional 필드가 빠지면 통과, 정의에 없는 여분 필드는 무시, 안전한 타입 변환(예: int → double)은 자동으로 처리된다.

명시적으로 만들려면 `infer_signature`를 쓴다.

```python
from mlflow.models import infer_signature

signature = infer_signature(X_test, model.predict(X_test))
mlflow.sklearn.log_model(model, name="my_model", signature=signature)
```

그런데 실용적으로 훨씬 중요한 것은 이쪽이다.

```python
mlflow.sklearn.log_model(model, name="iris_model", input_example=X.iloc[[0]])
```

**`input_example` 하나만 넘겨도 MLflow가 세 가지를 한꺼번에 해 준다.** (1) 그 예제에서 signature를 자동 추론하고, (2) 그 예제로 실제 `predict`를 돌려 모델이 정말 동작하는지 검증하며, (3) signature와 예제를 둘 다 모델에 저장한다.

(2)의 가치가 특히 크다. 저장은 됐지만 로드하면 터지는 모델은 생각보다 흔한데, 이 검증이 그 사고를 로깅 시점에 잡아낸다. 예제를 실제로 실행해 보는 과정에서 의존성도 더 정확히 포착된다. 그래서 실무 규칙은 하나다. **`log_model`을 호출할 때 `input_example`은 항상 넣는다.**

## 커스텀 pyfunc — 전처리까지 함께 포장하기

앞의 서빙 담당자 질문 중 마지막 것이 남았다. "전처리는 제가 다시 짜야 하나요?" 학습 쪽에서 로그 변환·결측 대체·스케일링을 했다면, 서빙 쪽도 똑같이 해야 한다. 이 코드를 양쪽에 복제하는 순간 **training-serving skew** — 학습 때와 추론 때 데이터 처리가 미묘하게 달라져 성능이 조용히 떨어지는 현상 — 의 씨앗이 심긴다.

해법은 전처리와 후처리까지 모델 안에 넣는 것이다. `mlflow.pyfunc.PythonModel`을 상속하면 된다. 주요 메서드는 셋이다.

- `predict(self, context, model_input, params=None)` — 추론 진입점
- `load_context(self, context)` — 모델 로드 시 1회 호출. 무거운 자원을 여기서 올린다
- `context.artifacts` — `<이름, 로컬 절대경로>` dict. 함께 포장한 파일들이 여기로 내려온다

한 가지 편의 변경: **MLflow 2.20.0부터 `context`를 쓰지 않으면 `predict` 시그니처에서 생략할 수 있다.** 즉 `def predict(self, model_input, params=None)`도 유효하다.

아래는 문서의 개별 API 설명을 바탕으로 **내가 조립한 예제** 다. 공식 문서에 이 형태의 완결된 예제가 있는 것은 아니니 참고용으로만 보자.

```python
import mlflow, joblib, pandas as pd

class ScaledClassifier(mlflow.pyfunc.PythonModel):
    def load_context(self, context):
        self.scaler = joblib.load(context.artifacts["scaler"])
        self.model = joblib.load(context.artifacts["clf"])

    def predict(self, context, model_input: pd.DataFrame, params=None):
        X = self.scaler.transform(model_input)
        return self.model.predict(X)

mlflow.pyfunc.log_model(
    name="scaled_classifier",
    python_model=ScaledClassifier(),
    artifacts={"scaler": "artifacts/scaler.pkl", "clf": "artifacts/clf.pkl"},
    input_example=X_train.iloc[[0]],
)
```

이렇게 포장하면 서빙 측은 원본 컬럼을 그대로 넣고 결과만 받는다. 전처리 코드는 한 곳에만 존재한다.

배포 전 마지막 확인에는 `mlflow.models.predict(model_uri, input_data, env_manager=...)`(MLflow 2.10.0+)가 유용하다. 모델에 기록된 의존성으로 **새 가상환경을 만들어 격리 실행** 하므로, "내 개발 환경에 우연히 깔려 있던 패키지" 덕에 돌아가던 모델을 걸러낸다.

## 곁가지 하나 — 직렬화 포맷이 skops로 바뀌었다

**MLflow 3.15.0부터 `mlflow.sklearn.log_model()`의 `serialization_format` 기본값이 `cloudpickle`에서 `skops`로 바뀌었다** (lightgbm도 동일). 이유는 보안이다. pickle 계열 포맷은 역직렬화 과정에서 임의 코드 실행이 가능해, 신뢰할 수 없는 모델 파일을 로드하는 것이 곧 취약점이 된다. skops는 이 문제를 피하도록 설계된 포맷이다.

주의할 것 둘. 커스텀 타입이 섞여 있으면 `skops_trusted_types`를 지정해야 할 수 있고, **`mlflow.sklearn.autolog()`의 기본값은 여전히 `cloudpickle`** 이다. 즉 같은 모델이라도 수동 로깅과 자동 로깅의 산출물 포맷이 다를 수 있다.

## Model Registry — 이름, 버전, alias, 태그

모델을 잘 포장했다면, 다음은 그것을 조직이 참조할 수 있는 이름으로 등록하는 일이다. 개념은 네 가지다.

- **Registered Model** — 고유한 이름을 가진 모델. 그 안에 여러 version과 alias, tag를 담는다.
- **Model Version** — 처음 등록하면 version 1, 같은 이름으로 등록할 때마다 번호가 자동 증가한다. 버전 번호는 특정 모델을 가리키는 고정 좌표이고, 설명·태그·alias는 나중에 얼마든지 바꿔 붙일 수 있다.
- **Alias** — 특정 버전을 가리키는 **변경 가능한 이름표.** 예를 들어 `champion` alias를 version 1에 걸어 두면 `models:/MyModel@champion`으로 참조할 수 있고, 나중에 이 alias를 다른 버전으로 재할당할 수 있다.
- **Tag** — registered model이나 version에 붙이는 key-value 라벨. 기능이나 상태로 분류하는 용도.

등록은 로깅과 동시에 하거나 사후에 할 수 있다.

```python
# 로깅과 동시에 등록
mlflow.sklearn.log_model(model, name="iris_model",
                         input_example=X.iloc[[0]],
                         registered_model_name="iris-classifier")

# 사후 등록
result = mlflow.register_model(
    "runs:/d16076a3ec534311817565e6527539c0/sklearn-model",
    "sk-learn-random-forest-reg",
)
```

alias와 태그는 `MlflowClient`로 조작한다.

```python
from mlflow import MlflowClient
client = MlflowClient()

client.set_registered_model_alias("iris-classifier", "champion", 3)
client.set_model_version_tag("iris-classifier", "3", "validation_status", "approved")
mv = client.get_model_version_by_alias("iris-classifier", "champion")
```

로딩은 버전 번호로도, alias로도 된다.

```python
mlflow.pyfunc.load_model("models:/iris-classifier/3")
mlflow.pyfunc.load_model("models:/iris-classifier@champion")
```

## stage에 대해 정확히

옛 MLflow 자료를 보면 `Staging`, `Production`, `Archived` 같은 **stage** 가 반드시 나온다. 여기서 틀린 정보를 옮기는 글이 많으니 현재 상태를 정확히 적어 둔다.

- Model Stages는 **MLflow 2.9.0부터 deprecated** 다.
- 현행 3.x 문서는 "Model Stages are deprecated and will be removed in **a future major release**"라고 쓴다. 즉 **아직 제거되지 않았고 제거 시점도 정해지지 않았다.**
- `transition_model_version_stage(name, version, stage, archive_existing_versions=False)`도 소스에 **여전히 정의되어 있다.**
- 개요 페이지에는 stage 전환을 설명하는 옛 문장이 남아 있어 문서 내에서도 서술이 일관되지 않다.

그러니 **"MLflow 3에서 stage가 제거됐다"고 말하면 사실과 다르다.** 정확한 표현은 "deprecated이지만 아직 동작한다"이고, 결론은 **신규 코드에서는 쓰지 말고 alias + tag로 대체하라** 는 것이다.

왜 stage가 물러났는가. 세 가지 제약 때문이다.

1. **이름이 `None`/`Staging`/`Production`/`Archived` 4개로 고정** 돼 있었다. 조직의 실제 워크플로가 그 4단계에 딱 맞을 이유가 없다.
2. **한 버전은 하나의 stage에만** 속했다. `champion`이면서 동시에 `eu-region-default`일 수 없다.
3. **상태 기계처럼 전환** 하는 모델이었다. 그래서 "트래픽의 10%는 v4, 90%는 v3" 같은 A/B 테스트나 점진 롤아웃을 표현할 방법이 없었다.

alias는 이 셋을 그대로 푼다. 이름을 자유롭게 정할 수 있고(`champion`, `challenger`, `shadow`), 한 버전에 여러 alias를 걸 수 있으며, 전환이 아니라 **재할당** 이라 무중단 교체가 된다. 상태 정보는 stage 대신 tag로 표현한다 — 예컨대 `validation_status`를 `pending` → `passed`로 옮기는 식이다.

URI 마이그레이션은 이렇게 대응한다.

```
models:/regression_model/Production   →   models:/regression_model@champion
```

## 승격 워크플로를 어떻게 설계할 것인가

여기서부터는 문서가 규정하지 않는 설계 판단의 영역이다. registry가 주는 것은 도구뿐이고, "무엇을 통과해야 `champion`이 되는가"는 팀이 정해야 한다. 내가 쓰는 골격은 이렇다.

1. **학습이 끝나면 무조건 새 version을 등록한다.** 등록은 승인이 아니라 기록이다. 버전 번호는 어차피 자동 증가하므로 아까워할 이유가 없다.
2. **검증 파이프라인이 게이트를 본다.** 홀드아웃 지표가 임계값을 넘는가, 현재 `champion` 대비 개선이 있는가, 추론 지연시간이 SLA 안인가. 통과하면 `validation_status=passed` 태그를 단다.
3. **`challenger` alias로 먼저 건다.** 섀도 트래픽이나 소규모 A/B로 실제 데이터에서 확인한다.
4. **승격은 alias 재할당 한 번.** `set_registered_model_alias("iris-classifier", "champion", 4)`.
5. **롤백도 alias 재할당 한 번.** 이전 버전 번호로 `champion`을 되돌리면 끝이다. 모델을 다시 배포하거나 이미지를 다시 빌드할 필요가 없다.

이 워크플로가 성립하려면 지켜야 할 규칙이 하나 있다. **배포 측 코드에는 버전 번호가 아니라 alias를 박아 둔다.** 서빙 설정에 `models:/iris-classifier@champion`이 고정되어 있으면, 모델 교체는 registry에서 alias만 옮기는 일이 되고 배포 측은 아무것도 바뀌지 않는다. 반대로 서빙 설정에 `models:/iris-classifier/3`을 박아 두면 모델을 바꿀 때마다 배포 설정을 고쳐 다시 나가야 한다. **alias는 이 결합을 끊는 간접 계층(indirection)** 이고, 그것이 alias의 존재 이유다.

## 서빙 — 그리고 Docker·Kubernetes와 만나는 지점

마지막으로 이 모델을 실제로 띄우는 두 가지 방법을 짧게 본다.

**`mlflow models serve`** 는 현재 머신에서 즉시 REST 서버를 띄운다.

```bash
mlflow models serve -m "models:/iris-classifier@champion" -p 5001

curl http://127.0.0.1:5001/invocations -H 'Content-Type: application/json' \
  -d '{"dataframe_split": {"columns": ["a", "b"], "data": [[1, 2]]}}'
```

추론은 `/invocations`(POST), 헬스체크는 `/ping`·`/health`, 버전 확인은 `/version`이다. 기본 포트는 5000, 기본 `--env-manager`는 `virtualenv`라 모델의 의존성으로 환경을 새로 만들어 준다. 편하지만 **개발·테스트용** 이다.

**`mlflow models build-docker`** 는 모델과 의존성, 추론 서버를 통째로 담은 **컨테이너 이미지** 를 만든다.

```bash
mlflow models build-docker --model-uri "models:/iris-classifier@champion" --name "iris-serving"
docker run -p 5001:8080 "iris-serving"
```

컨테이너 안의 서버는 **8080 포트** 에서 뜬다. `--model-uri` 없이 이미지를 만들어 두고, 실행할 때 모델 디렉터리를 `/opt/ml/model`에 마운트하는 방식도 지원한다 — 모델마다 이미지를 새로 빌드하지 않아도 된다.

여기가 **이 시리즈의 앞부분과 정확히 만나는 지점** 이다. `build-docker`가 뱉는 것은 [[posts/foundations/mlops-infrastructure/02-dockerfile-and-image-build|Dockerfile로 빌드한 이미지]]와 완전히 같은 종류의 물건이다. 그러니 그 뒤는 이미 배운 대로다 — 레지스트리에 올리고, [[posts/foundations/mlops-infrastructure/04-why-orchestration|Kubernetes]]에 Deployment로 선언하고, Service로 앞에 붙인다. MLflow의 몫은 "학습 결과물을 오케스트레이터가 다룰 수 있는 표준 단위로 바꿔 주는 것"까지이고, 그 다음 층은 [[posts/foundations/mlops-infrastructure/10-tying-it-together|10편에서 그린 파이프라인]] 그대로다.

다만 여기까지는 전부 내 노트북의 `mlflow server` 하나를 전제로 한 이야기였다. Registry를 팀이 함께 쓰려면 서버를 어디에 어떻게 세울지부터 정해야 한다. [[posts/foundations/mlops-infrastructure/14-mlflow-server-and-pipelines|다음 편]]에서 다룬다.

## 요약

- **MLflow Model은 디렉터리 + `MLmodel` 파일** 이고, `flavor`는 배포 도구가 라이브러리를 몰라도 되게 하는 규약이다. 공통 flavor인 **pyfunc** 덕분에 통합 비용이 $M \times N$에서 $M + N$으로 줄어든다.
- **signature는 입출력 계약** 이며 로드·배포·서빙 시점에 강제된다. **`input_example`만 넣어도 signature 추론 + 동작 검증 + 의존성 포착이 함께 된다** — `log_model`에 항상 넣는 것이 실무 규칙.
- **커스텀 pyfunc(`PythonModel`)** 으로 전처리·후처리를 모델에 포함시키면 서빙 측이 전처리 코드를 복제하지 않아도 된다. MLflow 2.20.0부터 `predict`의 `context` 인자는 생략 가능.
- **MLflow 3.15.0부터 sklearn 직렬화 기본값이 skops** (보안). 단 `autolog()`는 여전히 cloudpickle.
- **Registry는 registered model / version(자동 증가) / alias(변경 가능한 이름표) / tag** 로 구성된다. **stage는 2.9.0부터 deprecated이지만 아직 제거되지 않았다** — 신규 코드는 alias + tag를 쓴다.
- **배포 측에는 버전 번호가 아니라 alias를 박아 둔다.** 승격도 롤백도 alias 재할당 한 번으로 끝난다.
- `mlflow models serve`는 개발용 즉석 REST, `mlflow models build-docker`는 **Docker 이미지** 를 만들어 Kubernetes로 넘어가는 다리다.

## 참고문헌

- [MLflow Models](https://mlflow.org/docs/latest/ml/model/) — 디렉터리 구조, flavor, pyfunc.
- [Model Signatures and Input Examples](https://mlflow.org/docs/latest/ml/model/signatures/) — 계약과 enforcement.
- [Python Model](https://mlflow.org/docs/latest/ml/model/python_model/) — 커스텀 `PythonModel` API.
- [Model Registry](https://mlflow.org/docs/latest/ml/model-registry/) 및 [Registry Workflow](https://mlflow.org/docs/latest/ml/model-registry/workflow/) — alias, tag, stage deprecation.
- [Deploy Model Locally](https://mlflow.org/docs/latest/ml/deployment/deploy-model-locally/) — `models serve`와 `build-docker`.
- [MLflow CLI Reference](https://mlflow.org/docs/latest/api_reference/cli.html) — 두 명령의 옵션과 기본값.
