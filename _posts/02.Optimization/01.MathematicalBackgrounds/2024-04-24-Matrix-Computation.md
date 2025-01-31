---
title: Matrix Computation
author: rdh
date: 2024-04-24T01:34:06.838Z
categories: [02. Optimization, 01. Mathematical Backgrounds]
tags: [linear algebra]
math: true
# media_subpath: /assets/img/
---
## Matrix Algebra
> Matrix -- The mother of all data structures. The nonmathematical uses of the word `matrix` reflect its Latin origins in `mater`, or mother.... The word has two meanings -- a representation of a linear mapping and the basis for all our existence.

### Linear Systems
Linear algebra explores the properties of the system of linear equations in the form of $Ax=b$.

In the row picture, $Ax=b$ represents the intersection of $n$ planes, while in the column picture, it can be viewed as a combination of the column vectors of $A$. Generally, the problem is primarily viewed from the column picture perspective.

### Vector Products

Consider two vectors, $x$ and $y$.

$$
x=\begin{bmatrix} x_1 \\ x_2 \\ x_3 \end{bmatrix} \quad y=\begin{bmatrix} y_1 \\ y_2 \\ y_3 \end{bmatrix}
$$

> Generally, a vector means a column vector.
{: .prompt-info }

* **Inner product** (dot product) : _scalar_

$$
\mathbf{x}^T\mathbf{y} = \begin{bmatrix} x_1 & x_2 & x_3 \end{bmatrix}\begin{bmatrix}y_1 \\ y_2 \\ y_3\end{bmatrix} = x_1y_1+x_2y_2+x_3y_3 = \sum_{i=1}^3 x_iy_i = \mathbf{y}^T\mathbf{x}
$$

* **Outer product** : _matrix_

$$
\mathbf{x}\mathbf{y}^T = \begin{bmatrix} x_1 \\ x_2 \\ x_3 \end{bmatrix}\begin{bmatrix}y_1 & y_2 & y_3\end{bmatrix} = \begin{bmatrix}x_1y_1 & x_1y_2 & x_1y_3 \\ x_2y_1 & x_2y_2 & x_2y_3 \\ x_3y_1 & x_3y_2 & x_3y_3\end{bmatrix}
$$

* **Element-wise product** : _vector_

$$
\mathbf{x} \odot \mathbf{y} = \begin{bmatrix} x_1 \\ x_2 \\ x_3 \end{bmatrix} \odot \begin{bmatrix}y_1 \\ y_2 \\ y_3\end{bmatrix} = \begin{bmatrix}x_1y_1 \\ x_2y_2 \\ x_3y_3\end{bmatrix}
$$

### Matrix Multiplication
Let $A \in \mathbb{R}^{m\times p}$ and $B \in \mathbb{R}^{p\times n}$. Then $C=AB$ is given by:

$$
c_{ij} = \sum_{k=1}^p a_{ik}b_{kj} = A(i,:)B(:,j).
$$

It is calculated as an outer product of vectors consisting of the row vectors of $A$ and the column vectors of $B$, when the product between elements is the inner product.

It can also be expressed as follows:

$$
C = AB = \sum_{k=1}^p A(:,k)B(k,:).
$$

In other words, it is calculated as an inner product of vectors consisting of the column vectors of $A$ and the row vectors of $B$, when the product between elements is the outer product.

> In the era of AI, making matrix multiplication efficient and fast determines the learning speed, so it might be a good idea to dive deep into this part.
{: .prompt-tip }

## Determinant and Positive Definite

### Determinant of a Matrix
The **determinant** of $A$ represents the volume of the parallelepiped $P$ in the $n$-dimensional space formed by row vectors of $A$.

If you were to express a matrix as a single value, the most commonly used value would likely be its determinant. (If the determinant value is negative, it means the orientation of the space has been flipped.)


There are many formulas related to the determinant, but as long as you remember the following, there shouldn't be any issues if you're not dealing with higher-dimensional mathematics.다.

* A matrix $A$ has an inverse matrix $A^{-1}$ if and only if $det(A)\ne 0$.
* If $A$ is triangular, then $det(A)=a_{11}a_{22}...a_{nn}$. In Particular, $det(I_n)=1$.
* $det(AB) = det(A)det(B)$
* $tr(AB)=tr(BA)$

> Occasionally, people implement code that explicitly calculate the inverse matrix directly within a program or algorithm, but this is highly likely to cause the program crash. It's definitely best to avoid doing so.
{: .prompt-warning }

### Symmetric Positive Definite (SPD) Matrix
**Symmetric positive definite (SPD)** is a property that is crucial in the optimization topics that will covered later.

The definition of SPD is as follows:

* Symmetric: $A=A^T$
* Positive Definite (or positive semi-definite): if $x^TAx>0$ (or $x^TAx\ge 0$) for all nonzero $x \in \mathbb{R}^n$, denoted by $A \succ 0$ (or $A \succeq 0$).

If $C\in\mathbb{R}^{n\times n}$ has full rank and $A=C^TC$, then $A$ is SPD.

$$
x^TAx = x^TC^TCx = \|Cx\|^2>0.
$$

For reference, the covariance matrix is SPD.

$$
C=\frac{1}{N-1}\mathbf{X}^T\mathbf{X}=\frac{1}{N-1}\sum_{j=1}^N\mathbf{x}_j\mathbf{x}_j^T,
$$

where $$\mathbf{x}_i = \begin{bmatrix} x_{i1} & ... & x_{ip} \end{bmatrix}^T$$.

### The Cholesky Factorization
The cholesky factorization is an important property of SPD matrix, where every SPD matrix can be uniquely decomposed into an upper-triangular matrix with positive diagonal entries.

**Theorem: Cholesky factorization**

> Every SPD matrix $A=(a_{ij})\in\mathbb{R}^{n\times n}$ has a uniqe Cholesky factorization
> 
> $$
A=R^TR, \qquad r_{ii} > 0
> $$
> 
> where $R=(r_{ij})$ is an $n\times n$ upper-triangular matrix with positive diagonal entries.

The above $R$ can also be expressed as $A^{\frac{1}{2}}$.

### Tests for Positive Definiteness
There are several methods to determine if a matrix is positive definite, including the following:

* All the eigenvalues of $A$ satisfy $\lambda_i>0$.

* All the upper left submatrices $A_k$ have positive determinants.

* $2\times 2$-matrix $$\left[ \begin{array}{cc} a & b \\ b & c\\ \end{array} \right]$$ is positive definite when $a>0$ and $ac-b^2>0$.

## Linear Algebra
### Linear Dependency and Basis
* For vectors $v_1, v_2, ..., v_k$, if the condition $c_1v_1 + ... + c_kv_k=0$ is only satisfied when $c_1=...=c_k=0$, the vectors are said to be **linearly independent**. (If not, they are **linearly dependent**.)
    * If $v_i$ are linearly dependent, one of the vectors $v_k$ can be expressed as a linear combination of the others $(v_1,\dots,v_{k-1},v_{k+1},\dots,v_n)$.
* For a vector space $V$, if every vector $v$ in $V$ can be expressed as a linear combination of the vectors $v_i$, then we say that the $v_i$ **span** the space $V$.
* If the following conditions are satisfied, the set $\lbrace v_i\rbrace$ is called a **basis** of $V$.
  1. $v_i$'s are linearly independent.
  2. $\lbrace v_i\rbrace$ spans the space $V$.

* The number of vectors that form the basis of $V$ is called the **dimension** of $V$.

### Norms
* Let $S$ be a vector space with elements $x$.  
  Then, a real-valued function $\|x\|$ satisfying the following conditions is called the ***norm***:
  1. $\Vert x \Vert \ge 0$ for any $x\in S$.
  2. $\Vert x \Vert=0$ if and only if $x=0$.
  3. $\Vert\alpha x \Vert = \vert \alpha \vert \Vert x \Vert$, where $\alpha$ is an arbitrary scalar.
  4. $\Vert x+y \Vert \le \Vert x\Vert+\Vert y\Vert$ `(triangular inequality)`
  
> When creating a new norm, it's essential to check that it satisfies the triangular inequality.
{: .prompt-warning }

#### Vector Norms
* Vector $p$-norm: $\Vert x \Vert_p = \left( \sum_{i=1}^n \vert x_i \vert^p \right)^{1/p}$

* Manhattan: $\Vert x\Vert_1=\sum_{1\le i \le n} \vert x_i\vert$$

* Euclidean: $$\Vert x \Vert_2=\sqrt{x^Tx}$$

* Chebyshev: $$\Vert x\Vert_\infty=\max_{1\le i \le n} \vert x_i\vert$$

#### Matrix Norms
* Matrix $p$-norm

    $$
    \Vert A\Vert_p = \sup_{x\ne 0}\frac{\Vert Ax\Vert_p}{\Vert x\Vert_p}
    $$

* Frobenius norm

    $$
    \Vert A\Vert_F=\left( \sum_{i=1}^m\sum_{j=1}^n\vert a_{ij}\vert^2 \right)^{1/2} = \sqrt{tr(A^TA)}
    $$

## Matrix Operation on Vectors
### Linear Transformations
If we know the linear transformations ($Ax_i$) for the basis vectors of a specific space, we can determine the linear transformation for the entire space.

* Linearity: If $x=c_1x_1+...+c_nx_n$, then $Ax = c_1(Ax_1)+...+c_n(Ax_n)$.

Commonly used linear transformations include scaling, rotation, identity, projection and reflection.

### Projection Using Inner Products
> WANT: project $x$ to $a$.

![](/assets/img/matrix-computation-01.png){: width="50%"}

* $p=(x^Ta)a=(a^Tx)a=a(a^Tx)=(aaT)x=P_ax$

* $P_a=aa^T$ if $\|a\| = a^Ta = 1$

* $P_a=\frac{aa^T}{a^Ta}$ in general
  * $P_a$: **projection matrix**

## Least Squares
### Least Squares Solution
**Theorem: Least Squares Solution**
> The least squares solution to : 
> $$
\min \|Ax-b\| \qquad A\in \mathbb{R}^{m\times n}, \; m>n$$
> 
> satisfies the following ***normal equation*** : $$A^TA\bar{x} = A^Tb$$

The least square problem is the same as the projection of $b$ onto $Ax$, as seen in the figure below.

> This is a fundamental technique in many dimension reduction methods that will follow.
{: .prompt-tip}

![](/assets/img/matrix-computation-02.png){: width="100%"}

* If $A^TA$ is invertible, then $\bar{x} = (A^TA)^{-1}A^Tb$

* If $p$ is the projection of b onto the column space of $A$, then $p=A\bar{x} = Pb = A(A^TA)^{-1}A^Tb$,  
_where_ $P$ is an orthogonal projection matrix given by $A(A^TA)^{-1}A^T$

* $P\in \mathbb{R}^{n\times n}$ is said to be a **projection** if $P^2=P$.

* $P\in \mathbb{R}^{n\times n}$ is an **orthogonal projection** if $P^2=P$ and $P=P^T$.

### Orthogonal Matrix
* If the column and row vectors of matrix $Q$ are orthogonal unit vectors (orthonormal vectors), _i.e._ $Q^TQ=QQ^T=I$, then $Q$ is called an **orthogonal** matrix.

Orthogonal matrices have the following useful properties:
* $Q^T=Q^{-1}$

* $\Vert Qx\Vert = \Vert x\Vert$

* $(Qx)^T(Qy)=x^Ty$

> Transformations using orthogonal matrices preserve lengths and inner products.
{: .prompt-info}

**Theorem: Orthogonal Matrix**
> If the columns of $Q_r=[q_1,...,q_r]\in \mathbb{R}^{n\times r}$ are an orthonormal basis for a subspace $S$, then the least squares problem $\min\|Q_rx-b\|$ becomes easy
> 
> $$
Q_r^TQ_r\bar{x} = Q_r^Tb \Rightarrow \bar{x}=Q_r^Tb.
> $$

> The projection of $b$ and the unique orthogonal projection matrix onto the column space $S=span\lbrace q_1,...,q_r\rbrace$ is
> 
> $$
p=P_sb=Q_r\bar{x}=Q_rQ_r^Tb, \quad P_s=Q_rQ_r^T=\sum_{i=1}^r q_iq_i^T.
> $$

If the columns of $Q=[q_1,...,q_n]\in R^{n\times n}$ are an orthonormal basis, then $b$ can be written as follows:

$$
b=x_1q_1+...+x_nq_n=Qx, \quad x=Q^Tb
$$  

$$
\Rightarrow b=QQ^Tb=(q_1^Tb)q_1+...(q_n^Tb)q_n.
$$

![](/assets/img/matrix-computation-03.png){: width="100%"}

> This is a technique for expressing a vector in a different basis, which is also fundamental to dimension reduction and feature transformation methods.
{: .prompt-tip}