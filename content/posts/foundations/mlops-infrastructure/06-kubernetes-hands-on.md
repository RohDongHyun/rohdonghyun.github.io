---
title: 06. 로컬에서 직접 띄워보기 — minikube와 kubectl
date: 2026-06-23
tags:
  - MLOps
  - Kubernetes
private: false
---

[[posts/foundations/mlops-infrastructure/05-kubernetes-core-objects|이전 글]]에서 Pod·Deployment·Service를 개념으로 익혔다. 이번에는 그 개념들을 *직접 손으로* 띄워본다. 클라우드에 큰 클러스터를 빌릴 필요는 없다. 내 PC 한 대에 **로컬 Kubernetes 클러스터**를 만들어 똑같이 실습할 수 있다. 개념이 실제 명령으로 어떻게 이어지는지 감을 잡는 것이 이 글의 목표다.

## 로컬 클러스터 도구: minikube / kind

Kubernetes를 배우려고 진짜 서버 여러 대를 마련할 수는 없다. 그래서 *내 PC 안에* 작은 클러스터를 흉내 내 주는 도구들이 있다.

- **minikube**: 로컬에 단일 노드 클러스터를 띄워 주는 가장 대중적인 학습용 도구. VM 또는 Docker 위에 클러스터를 만든다.
- **kind**(Kubernetes-in-Docker): 클러스터 자체를 Docker 컨테이너로 띄우는 방식. 가볍고 빠르다.
- (Docker Desktop을 쓴다면 설정에서 "Enable Kubernetes"를 켜는 것만으로도 단일 노드 클러스터를 얻을 수 있다.)

여기서는 minikube 기준으로 진행한다. 설치 후 클러스터를 시작한다.

```bash
minikube start          # 로컬 클러스터 생성·시작
kubectl get nodes       # 클러스터의 노드 확인
```

`kubectl get nodes`를 쳤을 때 노드 하나가 `Ready` 상태로 보이면, 내 PC 안에 (단일 노드짜리이긴 해도) 어엿한 Kubernetes 클러스터가 떠 있는 것이다. 이제 `kubectl`로 이 클러스터와 대화한다.

## kubectl 기본 사용법

`kubectl`은 control plane에 명령을 보내는 도구다. 가장 많이 쓰는 패턴은 단순하다: **`kubectl <동사> <오브젝트 종류> [이름]`**.

```bash
kubectl get pods                 # Pod 목록 조회
kubectl get deployments          # Deployment 목록 조회
kubectl get services             # Service 목록 조회
kubectl describe pod <이름>       # 특정 Pod의 상세 상태(이벤트 포함)
kubectl logs <Pod 이름>           # Pod 안 컨테이너의 로그
kubectl delete -f myapp.yaml     # YAML로 만든 오브젝트 삭제
```

오브젝트를 *만드는* 방법은 두 가지다.

- **명령형(imperative)**: `kubectl create`, `kubectl run`처럼 명령으로 즉석에서 생성. 빠른 실습엔 편하다.
- **선언형(declarative)**: 원하는 상태를 YAML에 적고 `kubectl apply -f`로 적용. 실무의 표준이며, 파일이 곧 "원하는 상태"의 기록이 된다.

[[posts/foundations/mlops-infrastructure/04-why-orchestration|시리즈 전체에서 강조한 선언형]] 방식이 권장되므로, 아래 실습도 YAML 기반으로 진행한다.

## 실습: Deployment와 Service 띄우기

[[posts/foundations/mlops-infrastructure/05-kubernetes-core-objects|이전 글]]에서 본 Deployment와 Service를 합쳐 하나의 파일 `myapp.yaml`로 만든다. (두 오브젝트는 `---`로 구분해 한 파일에 둘 수 있다.)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
        - name: myapp
          image: myregistry/myapp:1.0
          ports:
            - containerPort: 5000
---
apiVersion: v1
kind: Service
metadata:
  name: myapp-svc
spec:
  selector:
    app: myapp
  ports:
    - port: 80
      targetPort: 5000
```

적용하고 상태를 확인한다.

```bash
kubectl apply -f myapp.yaml      # Deployment + Service 생성
kubectl get pods                 # Pod 3개가 떠 있는지 확인
```

`replicas: 3`을 선언했으니 Pod 3개가 `Running` 상태로 보일 것이다.

## self-healing을 눈으로 확인하기

[[posts/foundations/mlops-infrastructure/04-why-orchestration|reconciliation 루프]]를 직접 체감하는 가장 좋은 실험은, **Pod를 일부러 죽여보는 것**이다.

```bash
kubectl get pods                 # 현재 Pod 3개 확인, 이름 하나 복사
kubectl delete pod <Pod 이름>     # 그중 하나를 강제로 삭제
kubectl get pods                 # 다시 조회
```

방금 1개를 지웠는데도 잠시 후 다시 조회하면 Pod는 *여전히 3개*다. Deployment가 "replicas=3"이라는 약속이 깨진 것을 감지하고 즉시 새 Pod를 띄웠기 때문이다. 사람이 아무 조치도 하지 않았는데 원하는 상태가 자동으로 회복된다 — 이것이 선언형 운영의 힘이다.

scaling도 마찬가지로 한 줄이면 된다.

```bash
kubectl scale deployment myapp --replicas=5    # 3개 → 5개로 확장
```

(또는 YAML에서 `replicas`를 5로 고쳐 다시 `apply` 해도 결과는 같다. 선언형에서는 *파일을 고쳐 다시 적용*하는 흐름이 더 권장된다.)

## 서비스에 접속해보기

minikube에서는 Service에 손쉽게 접속하는 명령을 제공한다.

```bash
minikube service myapp-svc       # Service로 향하는 접속 URL을 열어준다
```

이 요청은 Service를 거쳐 뒤의 Pod 3개 중 하나로 *부하 분산*되어 전달된다. Pod가 죽고 새로 떠도, 접속하는 주소(Service)는 그대로라는 점을 확인할 수 있다.

실습이 끝나면 정리한다.

```bash
kubectl delete -f myapp.yaml     # 만든 오브젝트 삭제
minikube stop                    # 클러스터 정지 (minikube delete로 완전 삭제)
```

## 요약

- **minikube**(또는 kind, Docker Desktop)로 내 PC에 단일 노드 Kubernetes 클러스터를 띄워 똑같이 실습할 수 있다.
- **`kubectl`** 은 `kubectl <동사> <오브젝트> [이름]` 패턴으로 클러스터와 대화한다. 오브젝트 생성은 *명령형*(`create`/`run`)과 *선언형*(`apply -f`)이 있고, 실무 표준은 선언형이다.
- Deployment의 Pod를 일부러 `delete` 해도 다시 채워지는 것을 통해 **self-healing**을, `kubectl scale`로 **scaling**을 눈으로 확인할 수 있다.
- 여기까지가 Kubernetes 입문이다. 다음 파트에서는 *"이 작업들을 언제, 어떤 순서로 돌릴지"* 를 다루는 워크플로 스케줄링(Airflow & DAG)으로 넘어간다.
