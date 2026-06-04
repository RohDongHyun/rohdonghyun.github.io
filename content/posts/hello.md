---
title: KaTeX 렌더링 확인
date: 2026-06-04
tags:
  - note
---

블로그 부트스트랩이 끝났는지 확인하는 첫 글이다.

## 인라인 수식

벨만 기대식: $V^{\pi}(s) = \mathbb{E}_{\pi}\!\left[\sum_{t=0}^{\infty} \gamma^t r_t \mid s_0 = s\right]$.

## 블록 수식

소프트맥스 정책 그라디언트:

$$
\nabla_\theta J(\theta) \;=\; \mathbb{E}_{\tau \sim \pi_\theta}\!\left[ \sum_{t=0}^{T} \nabla_\theta \log \pi_\theta(a_t \mid s_t) \, A^{\pi_\theta}(s_t, a_t) \right]
$$

행렬 표기:

$$
A = \begin{bmatrix} a_{11} & a_{12} \\ a_{21} & a_{22} \end{bmatrix}, \quad
\det(A) = a_{11}a_{22} - a_{12}a_{21}
$$

수식이 깔끔히 렌더되면 KaTeX 파이프라인은 정상이다.
