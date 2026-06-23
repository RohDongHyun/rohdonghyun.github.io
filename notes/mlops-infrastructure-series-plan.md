# MLOps Infrastructure 시리즈 작성 계획

> 이 파일은 발행물이 아니라 **세션 간 작업 인계용 메모**다. (`content/` 밖이라 사이트에 노출되지 않음)
> 목적: Docker / Kubernetes / Airflow(DAG)를 "스스로 이해"하기 위한 foundations 시리즈.

- **카테고리**: `foundations` (표준 인프라 기초 지식. insights보다 적합 — 빠르게 바뀌는 트렌드가 아니라 표준 도구)
- **시리즈 폴더**: `content/posts/foundations/mlops-infrastructure/`
- **시리즈 번호**: `08` (index.md title = `08. MLOps Infrastructure`)
- **공통 태그**: `MLOps` + 글별 주제 태그(`Docker`/`Kubernetes`/`Airflow`)
- **파일명**: `NN-slug.md`, 영문 kebab-case
- **흐름**: 작은 단위 → 큰 단위 (컨테이너 → 오케스트레이션 → 워크플로 스케줄링)

## 글 목록 (체크박스 = 작성 완료 여부)

### 1부 — 왜 필요한가
- [x] `00` 시리즈 개요: "내 코드는 왜 내 PC에서만 돌아갈까" — 재현성·배포·스케줄링 문제 제기, Docker/K8s/Airflow가 각각 어디를 푸는지 지도

### 2부 — Docker (컨테이너)
- [x] `01` 컨테이너란 무엇인가: VM vs 컨테이너, 이미지 vs 컨테이너, 격리가 재현성을 주는 원리
- [x] `02` Dockerfile과 이미지 빌드: 레이어 개념, Python 앱 컨테이너화 예시
- [x] `03` 데이터 관리와 통신: volume(영속화), port/network, docker-compose

### 3부 — Kubernetes (오케스트레이션)
- [x] `04` 왜 오케스트레이션인가: 컨테이너 수백 개를 손으로 못 굴리는 이유 (스케일링·장애복구·롤아웃)
- [x] `05` K8s 핵심 오브젝트: Pod / Deployment / Service / Namespace, declarative("원하는 상태 선언") 개념
- [x] `06` 실습: minikube/kind로 로컬에서 Pod 띄우기, `kubectl` 기본

### 4부 — Airflow & DAG (워크플로 스케줄링)
- [x] `07` DAG란 무엇인가: 방향성 비순환 그래프로 작업 의존성 표현 (별도 글로 작성)
- [x] `08` Airflow 구조: Scheduler / Executor / Worker / Metadata DB, Task와 Operator
- [x] `09` 첫 DAG 작성: Python task 정의, 의존성 연결(`>>`), 재시도·스케줄
- [x] `10` 셋을 잇기: KubernetesPodOperator로 컨테이너 task를 K8s에 던지는 MLOps 파이프라인 전체 조망

## 메모
- 00~10 **전편 작성·push 완료** (2026-06-23). 시리즈 1차 완결.
- 이미지가 없으므로 텍스트 다이어그램/코드블록으로 설명. 필요 시 나중에 `/images/`에 추가.
- 톤·형식은 같은 foundations의 `time-series-analysis`, `introduction-to-rl` 시리즈를 기준으로 맞춤.
