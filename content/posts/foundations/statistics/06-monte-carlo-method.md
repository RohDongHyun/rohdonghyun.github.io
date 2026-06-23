---
title: 06. Monte-Carlo Method
date: 2025-09-20
tags:
  - Statistics
---
## Monte Carlo Method
**몬테카를로 방법 (Monte Carlo Method)** 이란, 어떤 값 (또는 함수값)을 근사적(approximation)으로 계산하는데 있어 확률분포로부터 생성한 무작위 샘플(표본)들을 이용하는 방법이다.

이를 위해 **큰 수의 법칙 (Law of large number, LLN)** 를 이용한다.

* LLN: $X_1, \cdots, X_n \overset{i.i.d.}{\sim} f$에 대하여

$$
\bar{X}_n = \frac{1}{n} \sum_{i=1}^n X_i \overset{p}{\to} E(X_1)
$$

우리가 구하고자 하는 값을 $\theta$라고 할 때, $\theta$를 어떤 확률변수의 기대값으로 표현할 수 있다고 하자. 즉, $\theta = E(h(X)), X \sim f$.

만약 $X_1, \cdots, X_n$가 $f$로부터 생성한 무작위 샘플(표본)이라면, LLN에 의해 다음이 성립한다.

$$
\frac{1}{n}\sum_{i=1}^n h(X_i) \overset{p}{\to} E(h(X)) = \theta
$$

따라서, 몬테카를로 방법을 쓰기 위해서는 주어진 확률분포로부터 무작위 샘플을 생성하는 (난수생성) 알고리즘이 필요하다.

> 대부분의 알려진 확률분포들은 무작위 샘플을 생성하는 알고리즘들이 연구되어, R, Python 등에서 쉽게 사용할 수 있다.

> **💡 직관:** 몬테카를로의 정신은 "풀 수 없으면 흉내내라"다. 적분 $\int h(x)f(x)dx$를 손으로 못 풀어도, $f$에서 샘플을 잔뜩 뽑아 $h$값을 평균내면 큰 수의 법칙이 그 값을 적분으로 데려다준다. 어려운 해석학(적분)을 쉬운 산수(평균)로 바꾸는 거래이며, 차원이 높아질수록 이 거래가 더 유리해진다.

## Sampling Methods
### Inverse CDF
**Inverse CDF** 샘플링 방법은 Probability Integral Transform (PIT)를 이용한 방법이다. 

* PIT: 연속 확률 변수 X의 CDF를 $F_X$라고 할 때, $F_X(X)$는 $\text{Unif}(0,1)$을 따른다.

만약 $F_X(X) \sim U, U$는 $(0, 1)$에서의 균일분포 $(\text{Unif}(0,1))$이면 다음이 성립한다.

$$
X \sim F_X^{-1}(U) = \inf \{x : F(x) \ge U\}
$$

즉, $U_1, \cdots, U_k$를 $(\text{Unif}(0,1))$에서 생성하면, $X_1 = F^{-1}(U_1)$, $\cdots$, $X_k = F^{-1}(U_k)$는 $F(x)$ (또는 $f(x)$)를 따르는 랜덤 샘플이 된다.

> **💡 직관:** CDF는 "값 → 누적확률"로 올라가는 사다리다. 균일분포로 사다리의 높이를 무작위로 고르고($U$), 역함수 $F^{-1}$로 그 높이에 해당하는 값을 거꾸로 읽어내면 원하는 분포의 샘플이 된다. 확률이 몰린 구간일수록 사다리가 가팔라서, 같은 높이 간격에 더 많은 $U$가 떨어지고 따라서 샘플도 그 구간에 더 자주 생긴다.

만약 $F^{-1}(u)$를 구하기가 어려운 경우에는 다음과 같은 방법을 따른다.

1. $f(x)$의 support 내의 숫자열 $x_1, \cdots, x_m$을 적당히 찾아 $u_i = F(x_i)$를 구한다.
    * $f$의 support = $$\{x \mid f(x) > 0 \}$$

2. $U \sim \text{Unif}(0,1)$인 $U$를 생성하여 $u_i \leq U \leq u_j$를 만족하는 가장 가까운 $u_i, u_j$에 대하여 다음의 $X$를 구한다.

    $$
    X = \frac{u_j - U}{u_j - u_i} x_i + \frac{U - u_i}{u_j - u_i} x_j
    $$

    * 위의 $X$는 $(x_i, F(x_i)), (x_j, F(x_j))$를 linear interpolation 한 값이다.

#### Example of Inverse CDF
$f(x) = \frac{1}{2} x$, $0 < x < 2$ 인 확률밀도함수를 갖는 확률변수를 무작위 생성한다고 하자.

$F(x) = \int_{0}^{x} f(y) dy = \frac{1}{4} x^2$, $0 < x < 2$ 이므로 $F^{-1}(u) = \sqrt{4u} = 2 \sqrt{u}$, $0 < u < 1$ 이 된다.

따라서 $U_1, \cdots, U_k \sim \text{Unif}(0,1)$ 분포로부터 생성한 샘플이라면, $X_1 = 2 \sqrt{U_1}, \cdots, X_k = 2 \sqrt{U_k}$는 주어진 $f(x)$에서 생성된 샘플이 된다.

### Rejection Sampling
확률분포 $f$를 따르는 $X$를 생성하고자 한다: $X \sim f$.

**Rejection Sampling**은 다음과 같은 순서로 진행된다.

1. $f$보다 난수생성이 쉽고 다음을 만족하는 확률분포 $g$를 찾는다.

    $$
    \beta f(x) \leq g(x), 0 < \beta < 1
    $$

    * $g(x)/\beta = e(x)$를 $f(x)$의 upper envelop이라고 한다.

    ![](/images/c3fbbe0b-bd71-4016-b486-8849961d1564-image.png)

2. $g$로부터 $X$를 생성한다.

3. $\text{Unif}(0, 1)$으로부터 $U$를 생성한다.

4. 만약 $Ug(X) \leq \beta f(X)$ (또는 $U \leq f(X)/e(X)$)를 만족하면 $X$를 $f$로부터 생성된 난수로 받아들인다 (accept). 아니라면 (reject), 1번으로 돌아간다.

5. 위 과정을 원하는 크기의 샘플을 얻을때까지 반복한다.

> **💡 직관:** 거절 샘플링은 다트 던지기다. 목표 분포 $f$를 완전히 덮는 쉬운 봉투 $e(x)$ 아래에 점을 골고루 흩뿌린 뒤, $f$ 곡선 아래에 떨어진 점만 남기고 위로 삐져나온 점은 버린다. 살아남은 점들의 $x$좌표 분포가 곧 $f$가 된다. 봉투가 $f$에 딱 붙을수록 버리는 점이 적어 효율적이고, 헐겁게 덮으면 대부분을 버리게 돼 느려진다.

#### Example of Rejection Sampling
Inverse CDF방법에서의 예시와 같은 함수 $f(x) = \frac{1}{2}x, 0 < x < 2$인 확률밀도함수로 갖는 확률변수를 Rejection sampling을 이용해 생성해보자.

$g(x) = \frac{1}{2}, 0 < x < 2$는 $\text{Unif}(0,2)$의 확률밀도함수이면서 $f(x) \leq g(x)/\beta, \beta = 1/2$를 만족한다. 또한 $\text{Unif}(0, 2)$로부터 데이터를 생성하는것은 쉽다.

이때 envelop 함수는 $e(x) = 2g(x) = 1$가 된다.

이 경우, rejection sampling 알고리즘은 다음과 같다.

1. $X \sim \text{Unif}(0,2)$인 $X$ 생성하기

2. $U \sim \text{Unif}(0, 1)$인 $U$ 생성하기

3. $U \leq f(X)/e(X) = \frac{1}{2}X$를 만족하면 $X$를 $f(x)$로 부터 생성된 샘플로 받아들이고 아니면 버린다.

### Importance Sampling
$\theta = E(h(X))$인 $\theta$를 구하는 문제로 다시 돌아가보자. 여기서 $X \sim f$로 가정한다.

$f$보다 난수생성이 쉽고 support가 $f$의 support를 포함하는 확률분포 $g$가 있다고 하자.

$\theta$를 $g$를 이용하여 다음과 같이 표현할 수 있다.

$$
\begin{aligned}
\theta &= E_{f}(h(X)) = \int h(x) f(x) dx \\
&= \int h(x) \frac{f(x)}{g(x)} g(x) dx = E_{g} \left( h(X) \frac{f(X)}{g(X)} \right)
\end{aligned}
$$

$X_{1}, \ldots, X_{n}$이 $g$로부터 생성된 난수라고 하자. $w^\ast(x) = \frac{f(x)}{g(x)}$라고 하면, 다음은 $\theta$를 근사(approximate)하는 값이 된다.

$$
\hat{\theta} = \frac{1}{n} \sum_{i} h(X_{i}) w^\ast(X_{i}),
$$

이 때의 $g$를 **importance sampling** 함수라고 부른다.

> **💡 직관:** 원하는 분포 $f$에서 직접 못 뽑으니, 뽑기 쉬운 $g$에서 뽑되 가중치 $w^\ast = f/g$로 "비중을 보정"한다. $g$에서 너무 자주 나온 값은 깎고, 너무 드물게 나온 값은 키워 마치 $f$에서 뽑은 것처럼 만드는 것이다.
>
> 여기서 $g$의 support가 $f$의 support를 포함해야 한다는 조건의 의미가 핵심이다 — **내가 알고 싶은 세계($f$)에서 일어날 수 있는 상황은, 내가 데이터를 모으는 세계($g$)에서도 최소한 관측될 가능성은 있어야 한다.** 만약 $f>0$인데 $g=0$인 영역이 있으면, 그곳의 사건은 표본에 영원히 잡히지 않아($0$으로 나누는 셈) 추정이 편향된다.

#### Example of Importance Sampling
Inverse CDF 방법에서의 예시와 같은 함수 $f(x) = \frac{1}{2}x, 0 < x < 2$ 인 확률밀도함수를 갖는 확률변수를 $X$ 라고 하자.

이 때, $\theta = E(X^{2})$인 $\theta$를 추정하는 문제를 생각해보자.

$f(x) = \frac{1}{2}x, 0 < x < 2$이므로 $E(X^{2}) = \int_{0}^{2} (\frac{1}{2}) x^{3} dx = 2$로 쉽게 계산할 수 있지만, Importance sampling방법으로 근사적으로 $\theta$를 구해볼수도 있다.

$$
\theta = E_{f}(X^{2}) = \int x^{2} f(x) dx = \int x^{2} (\frac{f(x)}{g(x)}) g(x) dx = \int x^{2} \cdot x \cdot (\frac{1}{2}) dx
$$

$g(x) = \frac{1}{2}$로 보면, $\theta = E_{g}(X^{3})$이 된다.

따라서 $\text{Unif}(0, 2)$에서 데이터 $X_{1}, \cdots, X_{n}$을 생성하여 $\hat{\theta} = \frac{1}{n} \sum h(X_{i}) w^{*}(X_{i}) = \frac{1}{n} \sum X_{i}^{2} \cdot X_{i}$를 이용하여 구할 수 있다.