---
title: 02. Dockerfile과 이미지 빌드 — 환경을 코드로 고정하기
date: 2026-06-23
tags:
  - MLOps
  - Docker
private: false
---

[[posts/foundations/mlops-infrastructure/01-what-is-a-container|이전 글]]에서 컨테이너가 환경을 **이미지에 고정**해 재현성을 보장한다고 했다. 그렇다면 그 이미지는 어떻게 만들까? 답은 **Dockerfile**이다. 이번 글에서는 Dockerfile로 이미지를 빌드하는 과정을, 간단한 Python 앱을 컨테이너로 만드는 예시로 따라간다.

## Dockerfile은 "환경을 만드는 레시피"

**Dockerfile**은 이미지를 어떻게 만들지 한 줄씩 적은 *텍스트 레시피*다. "어떤 베이스에서 출발해, 무엇을 복사하고, 무엇을 설치하고, 어떻게 실행할지"를 위에서 아래로 순서대로 기술한다.

간단한 Python 웹 앱을 예로 들자. 프로젝트 폴더에 다음 세 파일이 있다고 하자.

```
myapp/
├── app.py
├── requirements.txt
└── Dockerfile
```

`requirements.txt`는 필요한 패키지 목록이다.

```
flask==3.0.0
```

`app.py`는 아주 단순한 웹 서버다.

```python
from flask import Flask

app = Flask(__name__)

@app.route("/")
def hello():
    return "Hello from a container!"

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
```

이제 이 앱을 컨테이너로 만드는 `Dockerfile`을 작성한다.

```dockerfile
# 1) 베이스 이미지: Python 3.12가 미리 깔린 가벼운 리눅스
FROM python:3.12-slim

# 2) 컨테이너 안의 작업 디렉터리 설정
WORKDIR /app

# 3) 의존성 목록을 먼저 복사하고 설치
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 4) 나머지 소스 코드 복사
COPY . .

# 5) 이 컨테이너가 외부에 노출할 포트(문서화 목적)
EXPOSE 5000

# 6) 컨테이너가 시작될 때 실행할 명령
CMD ["python", "app.py"]
```

각 줄을 **instruction**(명령어)이라 부른다. 자주 쓰는 것만 짚으면,

- `FROM` — 출발점이 되는 **베이스 이미지**. 보통 OS나 언어 런타임이 깔린 공개 이미지를 가져온다. (`python:3.12-slim`은 Docker Hub에 공개된 공식 이미지)
- `WORKDIR` — 이후 명령이 실행될 컨테이너 내부의 작업 디렉터리.
- `COPY` — 호스트(내 PC)의 파일을 이미지 안으로 복사.
- `RUN` — 이미지를 *빌드하는 시점*에 실행할 명령 (주로 패키지 설치).
- `EXPOSE` — 컨테이너가 사용할 포트를 명시 (실제 연결은 [[posts/foundations/mlops-infrastructure/03-docker-volume-network-compose|다음 글]]에서).
- `CMD` — 컨테이너가 *실행될 때* 기본으로 돌릴 명령. `RUN`(빌드 시점)과 달리 `CMD`는 실행 시점이라는 점이 핵심 차이다.

## 빌드하고 실행하기

Dockerfile이 준비되면 두 단계로 컨테이너를 띄운다.

**1) 이미지 빌드** — `docker build`로 Dockerfile을 읽어 이미지를 만든다. `-t`는 이미지에 이름(tag)을 붙이는 옵션이고, 마지막 `.`은 "현재 디렉터리를 빌드 맥락으로 삼으라"는 뜻이다.

```bash
docker build -t myapp:1.0 .
```

**2) 컨테이너 실행** — 만든 이미지로 컨테이너를 띄운다.

```bash
docker run -p 8080:5000 myapp:1.0
```

`-p 8080:5000`은 *호스트의 8080 포트*를 *컨테이너의 5000 포트*에 연결한다는 의미다. 이제 브라우저에서 `http://localhost:8080`에 접속하면 `Hello from a container!`가 보인다. (포트 연결은 다음 글에서 자세히 다룬다.)

중요한 점은, 이 `myapp:1.0` 이미지를 다른 사람에게 넘기거나 서버에 올리면 **누구의 환경에서든 똑같이** 동작한다는 것이다. Flask 버전도, Python 버전도, OS 라이브러리도 모두 이미지 안에 고정돼 있기 때문이다.

## 레이어(layer)와 빌드 캐시

Dockerfile을 이해할 때 가장 중요한 개념이 **레이어(layer)** 다. 이미지는 하나의 통짜 덩어리가 아니라, **Dockerfile의 명령어 하나하나가 쌓아 올린 층(layer)의 더미**다.

`FROM` 위에 `COPY requirements.txt`가 한 층, 그 위에 `RUN pip install`이 한 층, 그 위에 `COPY . .`이 한 층... 이런 식으로 명령마다 새 레이어가 얹힌다. 각 레이어는 *이전 레이어와의 차이(변경분)* 만 담는다.

이 구조가 주는 핵심 이점이 **빌드 캐시(build cache)** 다. Docker는 이미지를 다시 빌드할 때, *바뀌지 않은 레이어는 다시 만들지 않고 캐시를 재사용*한다. 어떤 레이어가 바뀌면 그 레이어와 *그 위의 모든 레이어*만 다시 만든다.

바로 이 때문에, 위 Dockerfile에서 의존성 설치를 소스 코드 복사보다 **먼저** 두었다.

```dockerfile
COPY requirements.txt .          # (A) 의존성 목록만 먼저 복사
RUN pip install -r requirements.txt   # (B) 무거운 설치 — 가능한 한 캐시하고 싶다
COPY . .                          # (C) 자주 바뀌는 소스 코드는 나중에
```

`app.py`를 한 줄 고쳐도 `requirements.txt`가 그대로라면, (A)·(B) 레이어는 캐시가 재사용되어 **무거운 `pip install`을 건너뛰고** (C)만 다시 만든다. 만약 순서를 뒤집어 소스를 먼저 복사했다면, 코드를 한 줄 고칠 때마다 매번 전체 패키지를 새로 설치하게 된다. *자주 바뀌는 것을 Dockerfile 아래쪽에 두는 것*이 빌드를 빠르게 하는 기본 원칙이다.

## 이미지 공유: 레지스트리

빌드한 이미지는 **레지스트리(registry)** 를 통해 공유한다. 레지스트리는 이미지를 저장·배포하는 저장소로, 코드의 GitHub에 해당한다. 가장 대표적인 공개 레지스트리가 **Docker Hub**다.

```bash
docker push myregistry/myapp:1.0    # 레지스트리에 올리기
docker pull myregistry/myapp:1.0    # 다른 곳에서 내려받기
```

`FROM python:3.12-slim`처럼 베이스 이미지를 가져오는 것도 사실은 Docker Hub에서 이미지를 `pull` 하는 것이다. 이렇게 레지스트리를 통해, 한 번 만든 이미지를 여러 서버가 똑같이 내려받아 실행할 수 있다 — 이것이 뒤에서 다룰 Kubernetes 배포의 전제가 된다.

## 요약

- **Dockerfile**은 이미지를 만드는 레시피로, `FROM`·`COPY`·`RUN`·`CMD` 같은 명령어를 위에서 아래로 기술한다.
- `RUN`은 *빌드 시점*, `CMD`는 *실행 시점*에 동작한다는 차이가 핵심이다.
- `docker build`로 이미지를 만들고 `docker run`으로 컨테이너를 띄운다.
- 이미지는 명령어마다 쌓인 **레이어**로 이뤄지며, 바뀌지 않은 레이어는 **빌드 캐시**로 재사용된다. *자주 바뀌는 것(소스 코드)을 아래쪽에* 두면 빌드가 빨라진다.
- 빌드한 이미지는 **레지스트리**(예: Docker Hub)를 통해 공유하며, 이는 대규모 배포의 토대가 된다.
