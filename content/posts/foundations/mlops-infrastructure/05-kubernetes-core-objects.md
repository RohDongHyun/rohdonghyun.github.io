---
title: 05. Kubernetes 핵심 오브젝트 — Pod, Deployment, Service
date: 2026-06-23
tags:
  - MLOps
  - Kubernetes
private: false
---

[[posts/foundations/mlops-infrastructure/04-why-orchestration|이전 글]]에서 Kubernetes가 "원하는 상태(desired state)"를 선언하면 그 상태를 스스로 유지한다고 했다. 그렇다면 그 "원하는 상태"는 무엇으로 표현할까? Kubernetes는 모든 것을 **오브젝트(object)** 라는 단위로 다룬다. 이번 글에서는 가장 핵심적인 네 가지 오브젝트 — **Pod, Deployment, Service, Namespace** — 를 살펴본다.

## 모든 것은 YAML로 선언한다

Kubernetes에서 사용자는 *"이런 오브젝트가 존재하길 원한다"* 를 **YAML 파일**(manifest)로 적어 클러스터에 제출한다. docker-compose가 한 대의 컴퓨터를 대상으로 했던 선언형 방식을, 클러스터 전체로 확장한 것이다.

```bash
kubectl apply -f myapp.yaml     # YAML에 적힌 "원하는 상태"를 클러스터에 적용
```

`kubectl`(큐브컨트롤)은 사용자가 control plane과 대화하는 명령줄 도구다. 위 명령은 "이 파일에 적힌 상태가 되도록 맞춰라"라고 control plane에 요청하는 것이고, 이후의 실현은 Kubernetes가 알아서 한다. 이제 어떤 오브젝트들을 선언하는지 보자.

## Pod: 실행의 최소 단위

**Pod(파드)** 는 Kubernetes가 배포하고 관리하는 *가장 작은 단위*다. 핵심은, Kubernetes는 컨테이너를 직접 다루지 않고 **Pod로 한 겹 감싸서** 다룬다는 점이다.

- 하나의 Pod는 *컨테이너 한 개 이상*을 담는다. 대개는 컨테이너 1개지만, 긴밀히 협력하는 보조 컨테이너(예: 로그 수집기)를 함께 묶기도 한다.
- 한 Pod 안의 컨테이너들은 **같은 네트워크와 저장 공간을 공유**한다. 즉 Pod는 "한 몸처럼 움직여야 하는 컨테이너들의 묶음"이다.
- Pod는 **일시적(ephemeral)** 이다. 죽으면 그 Pod는 되살아나지 않고, 대신 *새로운 Pod*가 만들어진다(IP도 새로 받는다). 이 성질이 뒤의 Deployment·Service가 필요한 이유가 된다.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp
spec:
  containers:
    - name: myapp
      image: myregistry/myapp:1.0
      ports:
        - containerPort: 5000
```

이렇게 Pod를 직접 선언할 수도 있지만, 실무에서는 Pod를 *손수* 만들지 않는다. Pod는 죽으면 끝이라, 개수 유지나 복구가 안 되기 때문이다. 그래서 보통 **Deployment**를 통해 Pod를 관리한다.

## Deployment: Pod를 원하는 개수만큼 유지

**Deployment(디플로이먼트)** 는 *"이 Pod를 항상 N개 띄워 두라"* 를 선언하는 오브젝트다. [[posts/foundations/mlops-infrastructure/04-why-orchestration|이전 글]]의 reconciliation 루프가 실제로 작동하는 지점이 바로 여기다.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  replicas: 3                    # 원하는 Pod 개수 = 3
  selector:
    matchLabels:
      app: myapp
  template:                      # 어떤 Pod를 찍어낼지의 틀
    metadata:
      labels:
        app: myapp
    spec:
      containers:
        - name: myapp
          image: myregistry/myapp:1.0
          ports:
            - containerPort: 5000
```

`replicas: 3`이 핵심이다. Deployment는 이 약속을 지키기 위해,

- Pod가 죽어 2개가 되면 → **자동으로 1개를 새로 띄운다** (self-healing).
- `replicas`를 5로 바꿔 다시 `apply` 하면 → 2개를 더 띄운다 (scaling).
- 이미지를 `myapp:2.0`으로 바꿔 `apply` 하면 → Pod를 *조금씩 교체*해 무중단 배포한다 (rolling update). 문제가 생기면 이전 버전으로 **rollback**도 가능하다.

여기서 **label(라벨)** 과 **selector(셀렉터)** 개념이 등장한다. Deployment는 자신이 찍어낸 Pod에 `app: myapp`이라는 라벨을 붙이고, `selector`로 *"이 라벨을 가진 Pod들이 내 관리 대상"* 임을 식별한다. 라벨은 Kubernetes 전반에서 오브젝트들을 느슨하게 연결하는 핵심 장치다. 다음의 Service도 이 라벨로 Pod를 찾는다.

## Service: 변하는 Pod에 안정적인 주소를 부여

Pod는 죽고 새로 뜨기를 반복하며 그때마다 IP가 바뀐다. 그렇다면 다른 컴포넌트(또는 외부 사용자)는 이 Pod들에 *어떻게 안정적으로 접속*할까? 이 문제를 푸는 것이 **Service(서비스)** 다.

Service는 *같은 라벨을 가진 Pod들의 묶음* 앞에 놓이는 **고정된 진입점**이다. Pod가 몇 개든, IP가 어떻게 바뀌든, Service는 변하지 않는 하나의 주소를 제공하고 들어온 요청을 뒤의 Pod들에 **부하 분산(load balancing)** 한다.

```yaml
apiVersion: v1
kind: Service
metadata:
  name: myapp-svc
spec:
  selector:
    app: myapp                   # 이 라벨을 가진 Pod들에게 트래픽 전달
  ports:
    - port: 80                   # Service가 받는 포트
      targetPort: 5000           # Pod(컨테이너)의 포트
```

```
                        ┌──────────────┐
   요청 ──▶ Service ──▶  │ Pod (app=myapp) │
       (고정 주소)    │   ├──────────────┤
       부하 분산      ├──▶│ Pod (app=myapp) │
                     │   ├──────────────┤
                     └──▶│ Pod (app=myapp) │
                         └──────────────┘
```

Service 덕분에 *"누가 요청을 처리하는가"(개별 Pod, 계속 바뀜)* 와 *"어디로 요청을 보내는가"(Service, 고정)* 가 분리된다. 이것이 [[posts/foundations/mlops-infrastructure/04-why-orchestration|이전 글]]에서 말한 **service discovery**의 실체다. Service에는 클러스터 내부에서만 쓰는 것부터(`ClusterIP`) 외부에 노출하는 것까지(`NodePort`, `LoadBalancer`) 몇 가지 종류가 있는데, 입문 단계에서는 "Pod 앞의 고정 진입점"이라는 역할만 기억하면 충분하다.

## Namespace: 클러스터를 논리적으로 나누기

**Namespace(네임스페이스)** 는 하나의 클러스터를 여러 *논리적 구획*으로 나누는 장치다. 같은 클러스터 안에서 `dev`·`staging`·`prod` 환경을 분리하거나, 팀별로 자원을 나눠 쓸 때 사용한다.

- 같은 이름의 오브젝트라도 namespace가 다르면 서로 충돌하지 않는다.
- namespace 단위로 접근 권한(누가 무엇을 할 수 있는지)과 자원 할당량(CPU·메모리 상한)을 제어할 수 있다.

큰 조직이 하나의 클러스터를 여러 팀·환경이 안전하게 나눠 쓰도록 해 주는, 일종의 "칸막이"라고 생각하면 된다.

## 네 오브젝트가 맞물리는 그림

지금까지의 오브젝트는 따로 노는 것이 아니라 한 덩어리로 맞물린다.

- **Deployment** 가 "원하는 Pod 개수"를 약속하고 **Pod**들을 찍어내 유지한다.
- 각 **Pod** 는 실제 컨테이너를 실행하지만 일시적이고 IP가 바뀐다.
- **Service** 가 라벨로 그 Pod들을 묶어 고정 주소와 부하 분산을 제공한다.
- 이 모든 것이 특정 **Namespace** 안에 격리되어 존재한다.

사용자는 이 오브젝트들을 YAML로 *선언*만 하고, 실제 배치·복구·교체·라우팅은 Kubernetes가 알아서 한다.

## 요약

- Kubernetes에서는 모든 것을 **오브젝트**로 다루며, 사용자는 원하는 상태를 **YAML**로 선언하고 `kubectl apply`로 제출한다.
- **Pod**: 컨테이너를 감싼 실행 최소 단위. 일시적이라 죽으면 새 Pod로 대체된다.
- **Deployment**: "Pod를 N개 유지하라"를 선언. self-healing·scaling·rolling update·rollback이 여기서 일어난다.
- **Service**: 라벨로 Pod들을 묶어 *고정 주소*와 *부하 분산*을 제공 — 변하는 Pod 위의 안정적 진입점(service discovery).
- **Namespace**: 하나의 클러스터를 환경·팀별로 나누는 논리적 칸막이.
- 다음 글에서는 이 개념들을 [[posts/foundations/mlops-infrastructure/06-kubernetes-hands-on|로컬 클러스터에서 직접 띄워]] 본다.
