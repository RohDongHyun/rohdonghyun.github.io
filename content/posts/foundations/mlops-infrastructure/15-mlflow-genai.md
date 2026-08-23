---
title: 15. MLflow 3와 GenAI — tracing·evaluation·prompt registry
date: 2026-08-22
tags:
  - MLOps
  - MLflow
  - AI Agent
---

지금까지의 MLflow는 "학습 run 하나에 param과 metric을 남기는" 도구였다. 학습이라는 뚜렷한 이벤트가 있고, 그 이벤트에 learning rate 같은 입력과 val_accuracy 같은 출력이 붙는다는 전제 위에 서 있다.

LLM 앱과 에이전트에서는 이 전제가 셋 다 깨진다. **학습이라는 이벤트가 없다** — API를 부를 뿐이다. **실행 한 번이 단일 호출이 아니다** — 프롬프트 조립, 문서 검색, LLM 호출, 툴 실행, 다시 LLM 호출이 얽힌 트리가 만들어지고, 느리거나 이상한 답이 나왔을 때 그 안 어디가 문제였는지를 봐야 한다. **정답이 하나로 정해지지 않는다** — "요약이 잘 됐는가"에 accuracy를 찍을 수 없다. MLflow 3이 여기에 붙인 것이 **tracing**(실행을 통째로 기록), **evaluation**(정답 없는 출력을 채점), **prompt registry**(프롬프트를 버전 있는 자산으로)다. 이 글은 **MLflow 3.15 기준**이다.

## 먼저 짚을 것 — OSS에서 되는 것과 안 되는 것

MLflow의 GenAI 문서는 오픈소스 자체 호스팅과 Databricks 관리형을 같은 페이지에서 설명한다. 블로그를 따라 하다 막히는 지점이 대개 여기라, 경계를 먼저 그어 둔다.

| 기능 | 자체 호스팅 OSS |
|---|---|
| Tracing (autolog / `@mlflow.trace`) | 된다. trace 데이터는 내 인프라에 저장된다 |
| `mlflow.genai.evaluate()` | 된다 |
| 내장 LLM judge 대부분 | 된다 |
| `Safety`, `RetrievalRelevance` judge | **안 된다** — 현재 Databricks 관리형 전용 |
| Evaluation Dataset | 되지만 **SQL 백엔드 필수** (PostgreSQL/MySQL/SQLite/MSSQL) |
| Prompt Registry | 된다 |
| Multi-turn judge | 되지만 실험적이며 session ID가 있는 trace를 요구 |

Evaluation Dataset의 SQL 백엔드 요구는 [[posts/foundations/mlops-infrastructure/14-mlflow-server-and-pipelines|14편]]에서 본 파일 스토어 이야기와 같은 줄기다 — `mlruns` 파일 스토어로는 안 된다.

## Tracing — 실행을 통째로 남긴다

**Trace** 는 요청 하나가 애플리케이션을 통과하는 전체 실행 흐름의 기록이다. 두 부분으로 되어 있다.

- **TraceInfo** — 메타데이터. 실행 시간, request/response 프리뷰, 상태, 태그.
- **TraceData** — **span** 들의 컨테이너. 각 단계의 입출력 데이터, 단계별 latency, LLM에 들어간/나온 메시지, 벡터 스토어에서 검색된 문서, 툴 호출 파라미터가 여기 있다.

**Span** 은 "LLM 호출, 툴 실행, 검색 같은 개별 단계에 관한 정보를 담는 컨테이너"이며, 하나의 trace 안에서 **계층적 트리** 를 이룬다. 에이전트가 검색 → LLM → 툴 → LLM 순으로 돌았다면 그 구조가 그대로 트리로 남는다. span에는 `AGENT`, `CHAIN`, `LLM`, `RETRIEVER`, `TOOL`, `EMBEDDING`, `RERANKER` 등의 타입이 붙어 UI에서 구분된다.

가장 쉬운 켜는 법은 자동 계측 한 줄이다.

```python
import anthropic
import mlflow

mlflow.anthropic.autolog()
mlflow.set_tracking_uri("http://localhost:5000")
mlflow.set_experiment("Anthropic")

client = anthropic.Anthropic()
message = client.messages.create(
    model="claude-sonnet-4-5-20250929",
    max_tokens=512,
    messages=[{"role": "user", "content": "Hello, Claude"}],
)
```

이 세 줄(`autolog` + tracking URI + experiment) 뒤로는 애플리케이션 코드를 건드리지 않아도 프롬프트, 응답, latency, 모델명, temperature, 토큰 사용량, function calling 응답, 예외까지 캡처된다. 통합은 40개가 넘고 카테고리도 다양하다 — 에이전트 프레임워크(LangChain, LangGraph, CrewAI, LlamaIndex 등), 모델 provider(OpenAI, Anthropic, Bedrock, Ollama 등), 코딩 에이전트(Claude Code 등), 노코드 도구(Langflow, n8n 등).

라이브러리 호출이 아니라 **내가 쓴 함수** 도 남기고 싶다면 데코레이터나 컨텍스트 매니저를 쓴다.

```python
import mlflow
from mlflow.entities import SpanType

@mlflow.trace(span_type=SpanType.LLM)          # 함수명·입력·출력·실행시간을 자동 기록
def invoke(prompt: str):
    span = mlflow.get_current_active_span()
    span.set_attributes({"model": "gpt-4o-mini"})
    ...

with mlflow.start_span(name="my_span") as span:  # 함수 시그니처를 못 바꿀 때
    span.set_inputs({"x": 1, "y": 2})
    result = x + y
    span.set_outputs(result)
```

기록된 trace는 MLflow UI의 **Traces 탭** 에서 본다. 개별 trace의 request/response 상세, 중첩 span 트리, 단계별 latency, 토큰 사용량, 그리고 LLM API의 **예상 비용**까지 표시되고, 검색·필터링과 trace에 피드백 남기기도 지원한다. "이 답변이 8초 걸린 게 검색 때문인지 LLM 때문인지"가 눈으로 구분되는 것이 tracing의 실질적 가치다. MLflow Tracing은 **OpenTelemetry 호환**이라 기존 관측 스택과도 어긋나지 않는다.

### 프로덕션에서

tracing은 프로덕션 사용을 전제로 설계됐고, 그에 맞는 손잡이가 몇 개 있다. 서비스 컨테이너에는 MLflow 전체 대신 의존성이 최소화된 경량 **`mlflow-tracing`** 패키지를 넣는다. 로깅이 응답 지연에 얹히는 것이 부담이면 `mlflow.config.enable_async_logging()`으로 비동기 전송을 켠다 — 문서는 일반적인 워크로드에서 오버헤드가 "about 80%" 줄어든다고 적고 있다. 급하게 꺼야 할 때는 코드 수정 없이 `MLFLOW_TRACING_ENABLED=false`면 되고, 프롬프트에 개인정보가 섞이는 서비스라면 export 직전에 도는 custom post-processing hook으로 마스킹한다. 저장 위치는 14편에서 본 backend store DB로, trace 메타데이터는 `trace_info` 테이블에, span은 내용이 JSON으로 직렬화되어 `spans` 테이블에 들어간다.

## Evaluation — accuracy가 없을 때 무엇을 재는가

평가의 진입점은 함수 하나다.

```python
mlflow.genai.evaluate(data, scorers, predict_fn=None, model_id=None) -> EvaluationResult
```

쓰는 방식은 세 가지다. ① 이미 쌓인 trace를 대상으로 채점하거나, ② inputs/outputs를 직접 넘기거나, ③ `predict_fn`을 주고 입력만 넘겨 MLflow가 앱을 실행하게 한다.

```python
import mlflow
from mlflow.genai.scorers import Correctness, Guidelines

dataset = [
    {
        "inputs": {"question": "Can MLflow manage prompts?"},
        "expectations": {"expected_response": "Yes!"},
    },
]

def predict_fn(question: str) -> str:
    return response  # 실제 앱 호출

results = mlflow.genai.evaluate(
    data=dataset,
    predict_fn=predict_fn,
    scorers=[
        Correctness(),
        Guidelines(name="is_english", guidelines="The answer must be in English"),
    ],
)
```

**Scorer** 는 "애플리케이션이 평가 기준에 비추어 얼마나 잘했는지 판정하는" 것이다. 결과는 pass/fail일 수도, 숫자일 수도, 범주값일 수도 있다. 중요한 설계 포인트는 **LLM judge와 코드 기반 scorer가 같은 타입** 이라는 것이다 — "응답 길이가 500자 이하인가" 같은 결정론적 검사와 "답변이 질문에 적절한가" 같은 LLM 판정을 한 리스트에 섞어 넘길 수 있다.

내장 judge 중 대표적인 것만 보면, 응답 품질에는 `Correctness`(기대 답변과 맞는가), `RelevanceToQuery`(질문에 답하고 있는가), `Guidelines`(자연어로 쓴 기준 충족 여부)가 있고, RAG에는 `RetrievalGroundedness`(검색된 문서에 근거하는가 = 환각 탐지)가, 에이전트에는 `ToolCallCorrectness`가 있다. RAG·툴 관련 judge는 trace를 입력으로 요구한다 — 앞 절의 tracing이 evaluation의 전제라는 뜻이다.

실무에서 가장 자주 쓰게 되는 건 의외로 `Guidelines`다. "답변은 반드시 한국어여야 한다", "사내 규정 문서를 인용할 때는 조항 번호를 포함해야 한다" 같은 팀 고유의 기준은 내장 metric으로 존재할 수 없는데, 자연어 한 줄로 채점 기준을 만들 수 있으니 도메인 요구사항이 그대로 테스트가 된다.

OSS에서 반드시 챙겨야 할 것이 하나 있다. **judge를 어떤 LLM으로 돌릴지 정하는 일** 이다. 모델을 지정하지 않으면 MLflow는 tracking URI가 Databricks가 아닐 때 OpenAI 모델(3.15 기준 `openai:/gpt-4.1-mini`)을 기본 judge로 쓴다. 즉 아무 설정 없이 `evaluate()`를 돌리면 OpenAI API 키를 요구하게 되므로, 사내에서 쓰려면 scorer마다 모델을 지정하거나 환경변수로 기본값을 바꿔 둬야 한다.

```python
Correctness(model="openai:/gpt-5-mini")   # 형식: <provider>:/<model-name>
```

```bash
export MLFLOW_GENAI_JUDGE_DEFAULT_MODEL="openai:/gpt-5-mini"
```

provider로는 OpenAI 외에 Anthropic·Bedrock·Mistral 등이 네이티브로 지원되고, 나머지는 LiteLLM을 거쳐 붙는다. 사내망처럼 외부 API를 못 쓰는 환경이라면 여기서부터 막히니, 평가를 설계하기 전에 "judge를 무엇으로 돌릴 수 있는가"를 먼저 확인하는 편이 좋다.

## Prompt Registry — 프롬프트를 버전으로 다루기

프롬프트를 코드에 문자열로 박아 두면, 누가 언제 왜 바꿨는지가 git diff 한 줄로만 남는다. 더 곤란한 건 되돌릴 때다 — 프롬프트 한 문장을 원상복구하려고 배포를 다시 해야 한다. Prompt Registry는 프롬프트를 코드에서 떼어내 **버전이 붙은 자산**으로 관리한다.

```python
initial_template = """\
Summarize content you are provided with in {{ num_sentences }} sentences.
Sentences: {{ sentences }}"""

prompt = mlflow.genai.register_prompt(
    name="summarization-prompt",
    template=initial_template,
    commit_message="Initial commit",
    tags={"author": "author@example.com", "task": "summarization"},
)
```

템플릿 변수는 **이중 중괄호** `{{ variable }}`를 쓴다(LangChain처럼 단일 중괄호를 쓰는 프레임워크에는 `prompt.to_single_brace_format()`으로 변환). 등록된 **버전은 불변(immutable)** 이다 — 고치려면 새 버전을 만들어야 하고, 그 덕에 "3번 버전으로 돌린다"가 항상 같은 결과를 준다.

로드는 URI로 한다.

```python
prompt = mlflow.genai.load_prompt("prompts:/summarization-prompt/2")           # 버전 고정
prompt = mlflow.genai.load_prompt("prompts:/summarization-prompt@production")  # alias
formatted = prompt.format(num_sentences=1, sentences="...")
```

```python
mlflow.genai.set_prompt_alias("summarization-prompt", alias="production", version=2)
```

여기서 [[posts/foundations/mlops-infrastructure/13-models-and-registry|13편의 모델 alias]]와 같은 발상이 반복된다. 애플리케이션 코드는 `@production`만 바라보고, 배포는 alias가 가리키는 버전을 바꾸는 일이 되며, 롤백은 alias를 되돌리는 일이 된다 — 코드 배포 없이. `@latest`는 자동으로 유지되는 예약 alias다. 등록된 프롬프트는 `mlflow server`의 UI **Prompts 탭** 에서 볼 수 있다.

## 기존 실험 추적과 같은 집이다

마지막으로 오해를 하나 풀자. GenAI 기능은 별도 시스템이 아니다. **같은 tracking server, 같은 experiment 개념**을 쓴다. trace의 저장 위치 자체가 experiment이고(`mlflow.set_experiment()`로 정한 곳에 쌓인다), evaluation dataset도 experiment에 연결되며, backend store가 저장하는 엔티티 목록에 run·model과 나란히 trace가 들어 있다.

권장 구조는 **LLM 앱 또는 에이전트 하나당 experiment 하나** 다. 학습 run을 실험 단위로 묶었던 것처럼, 에이전트 하나의 모든 실행 기록과 평가 결과를 한 experiment에 모으는 방식이다.

## 시리즈를 닫으며

이 시리즈는 [[posts/foundations/mlops-infrastructure/00-mlops-infrastructure-overview|"내 PC에서만 되는" 문제]]에서 출발했다. Docker로 *무엇을* 실행할지 고정하고, Kubernetes로 *어디서* 실행할지 배치하고, Airflow로 *언제·어떤 순서로* 실행할지 지휘하는 [[posts/foundations/mlops-infrastructure/10-tying-it-together|세 층의 뼈대]]를 세운 뒤, MLflow로 그 위에 *무엇이 실행됐고 결과가 어땠는지*를 기록하는 층을 얹었다. 앞의 셋이 파이프라인을 **돌아가게** 만드는 도구라면, MLflow는 그 파이프라인을 **설명 가능하게** 만드는 도구다 — 이 모델이 어떤 데이터와 코드에서 나왔는지, 지난 버전보다 나아졌는지, 지금 프로덕션에서 무슨 일이 벌어지고 있는지에 답한다. 학습 모델이든 LLM 에이전트든, 운영에서 결국 물어보게 되는 것은 이 질문들이다.

## 요약

- LLM 앱은 학습 이벤트가 없고, 실행이 단계들의 트리이며, 정답이 하나가 아니다. MLflow 3은 여기에 **tracing·evaluation·prompt registry** 로 대응한다.
- 자체 호스팅 OSS에서 tracing·`genai.evaluate()`·prompt registry는 그대로 되지만, **`Safety`·`RetrievalRelevance` judge는 Databricks 전용**이고 **Evaluation Dataset은 SQL 백엔드 필수**다.
- **Trace = TraceInfo(메타) + TraceData(span 트리)**. `mlflow.<provider>.autolog()` 한 줄로 자동 계측되고, 내 코드는 `@mlflow.trace`·`mlflow.start_span`으로 남긴다. UI에서 latency·토큰·예상 비용까지 보이며 OpenTelemetry 호환이다. 프로덕션에서는 `mlflow-tracing` 패키지, `enable_async_logging()`, `MLFLOW_TRACING_ENABLED=false`.
- `mlflow.genai.evaluate(data, scorers, predict_fn)`으로 채점한다. LLM judge와 코드 기반 검사가 같은 **scorer** 타입이고, `Guidelines`로 자연어 기준을 그대로 테스트로 만들 수 있다. **OSS 기본 judge 모델은 OpenAI 모델**이므로, 쓸 LLM을 명시적으로 정해 두는 편이 안전하다.
- Prompt Registry는 프롬프트를 **불변 버전 + alias** 로 관리해 코드 배포 없이 교체·롤백하게 한다 — 13편 모델 alias와 같은 발상. 이 모든 것이 기존과 **같은 tracking server·같은 experiment** 위에서 돌아간다.

## 참고문헌

- [Tracing 개념](https://mlflow.org/docs/latest/genai/concepts/trace/) · [Span](https://mlflow.org/docs/latest/genai/tracing/concepts/span/) · [수동 계측](https://mlflow.org/docs/latest/genai/tracing/app-instrumentation/manual-tracing/).
- [Tracing FAQ](https://mlflow.org/docs/latest/genai/tracing/faq/) — 프로덕션 운영, 비동기 로깅, 저장 구조.
- [Scorers와 LLM judge](https://mlflow.org/docs/latest/genai/eval-monitor/scorers/) — 내장 judge 목록과 judge 모델 지정.
- [Prompt Registry](https://mlflow.org/docs/latest/genai/prompt-registry/).

---

**이전 글**: [[posts/foundations/mlops-infrastructure/14-mlflow-server-and-pipelines|14. 팀에서 굴리기 — 서버 구성과 파이프라인 통합]]
