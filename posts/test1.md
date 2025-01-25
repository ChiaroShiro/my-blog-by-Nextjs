---
title: 'test1'
date: '2025-01-25'
---

让我们试试markdown样式能不能正常work

**加粗**

*斜体*

~~删除线~~

- 1
- 2
- 3

1. 1
2. 2
3. 3

若 $p|ab$，证明：$p|a$或者$p|b$

唯一分解定理：

$$a=p_1^{k_1}+p_2^{k_2}\cdots k_r^{k_r}$$

$$b=q_1^{k_1}+q_2^{k_2}\cdots q_u^{k_u}$$

易证： $p|a$ 或 $p|b$

---

公理：无法证明

哥德尔不完备定理

定理：能被推出来

---

整数分解**定理**：

任意大于$1$的整数 $N$，有

$$N=p_1^{k_1}+p_2^{k_2}\cdots p_r^{K_r}$$

$p_i^{k_i}$ 为质数且

$$p_1<p_2<p_3<\cdots<p_r$$

$$k_1,k_2,k_3,\cdots ,k_r>=1$$

分解形式唯一

证明：反证法

假设 $N$ 是**最小**的不能被分解的数

则可得

$$N=p\times \dfrac{N}{p}$$

如果 $N$ 是质数$gg$

得 $\dfrac{N}{p}$不能被分解

所以 $\dfrac{N}{p}$更小 ， 与 $N$ 矛盾

唯一性：

$$N=p_1^{k_1}\times\cdots \times p_?^{k_?}$$

$$N=q_q^{k_1}\times\cdots\times q_!^{k_!}$$

有

$$p_1|(q_1\times\cdots\times q_!^{k_!})$$

设

$$p_1|q_1$$

又因为 $q_1$ 为质数

所以 

$$q_1==p_1$$

$$p_1^{r_1}\ ,\ q_1^{t_1}$$

设 $r_1>t_1$

同时除以 $q_1^{t_1}$

得

$$N=p_1^{r_1-t_1}\times\cdots\times p_?^{r_?}$$

$$N=q_1^0\times\cdots\times q_!^{t_!}$$

得

$$N>\dfrac{N}{q_1}$$

所以矛盾

---

$$Miller\ \ rabin$$

$$1.\ a^d \equiv 1(mod\ n)$$

$$2.\ a^{d * 2^i}\equiv-1(mod \ n)\equiv n-1(mod\ n)$$

---

$$a^{d*2^i}=(a^{d*2^{i-1}})^2$$

![](https://i.loli.net/2019/04/05/5ca6b1047a775.png)

---

# 裴蜀定理

$$ax+by=c$$

有整数解（充分必要条件）

$$\gcd(a,b)|c$$

充分条件：

$$d=\gcd(a,b)$$

$$d|a\ \&\&\ d|b\Rightarrow d|(ax+by)\Rightarrow d|c$$

必要条件：

$$d=\gcd(a,b)$$

$$s=\min(ax+by)\ \&\&\ s>0$$

$$\dfrac{a}{s}=q\cdots\cdots r$$

$$r=a-qs$$

$$=a-q(ax+by)$$

$$=(1-qx)a-(qy)b$$

$$\because 0<=r<s$$

当 $r$ 为 $0<r<s$ 时

$s$  不满足 $s=\min(ax+by)$

所以

$$r==0$$

得

$$s|a\ \&\&\ s|b\Rightarrow s|\gcd(a,b)$$

$$1.$$

$$\because d=\gcd(a,b)\ \&\&\ s=\min(ax+by),s>0$$

$$s|d$$

$$2.$$

$$s=ax+by=x\times(nd)+y\times(md)$$

$$\Downarrow$$

$$d|s$$

---

$$\because d|s \ \&\&\ s|d$$

所以

$$d==s$$

---

$$\Uparrow $$

$\ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \  \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ $裴蜀定理证毕

---

$Ex$欧几里得

$$d=\gcd(a,b)=\gcd(b,a\%b)$$

$$xa+yb=d$$

$$x`b+y`(a-\dfrac{a}{b}\times b)=d$$

$$y`a+(x`-y`\dfrac{a}{b})b=d$$

$$\downarrow$$

$$x=y`\ ,\ y=x`-y`\dfrac{a}{b}$$

[$$ \color{red}\huge\text{例题} $$](https://www.luogu.org/problemnew/show/P1082)

----

---

---

# 下午

欧拉定理

$$a^{\phi (m)} \equiv 1(\bmod m)$$
求逆元
$$a^{\phi(m)-1}\equiv \dfrac{1}{a}(\bmod\ m)$$
$$m=p_1^{r_1}\times p_2^{r_2}\times......\times p_k^{r_k}$$
$$\phi(m)=m\times (1- \dfrac{1}{p_1})\times (1-\dfrac{1}{p_2})\times ......\times (1-\dfrac{1}{p_k})$$

---

$$a^{p-2}\equiv a^{-1}(\mod\ p)$$

$a$的逆元就是 $a^{p-2}$

$p$ 是质数

---

欧拉定理

$p$不是质数

$$a^{\phi(m)-1}\equiv a^{-1}(\mod m)$$

$\phi(m):1\cdots m$ 中质数个数

$$m=p_1^{k_1}\times p_2^{k_2}\times\cdots\times p_r^{k_r}$$

$$\Downarrow$$

$$\phi(m)=m\times (1-\dfrac{1}{p_1})\times(1-\dfrac{1}{p_2})\times\cdots\times(1-\dfrac{1}{p_r})$$

---

证明：

$$a^{\phi(m)}\equiv1(\mod m)$$

---

$$k=\phi(m)$$

$k$个与$m$互质的数

$$x_1,x_2,x_3\cdots x_k$$

同时$\times a$

$$1.$$

$$\ ax_i\ \ne ax_j(\bmod\ m)$$

$$2.$$

$$\ \gcd(ax_i,m)=1$$

$$3.$$

$$\ [x_1,x_2,x_3\cdots x_k]$$

$$\ [ax_1\%m,ax_2\%m,ax_3\%m\cdots ax_k\%m]$$

$$\Downarrow$$

$$[x_1,x_2,x_3\cdots x_k]=[ax_1\%m,ax_2\%m,ax_3\%m\cdots ax_k\%m]$$

$$\Downarrow$$

$$x_1\times x_2\times x_3\times \cdots \times x_k=a^k\times x_2\times x_3\times \cdots \times x_k$$

$$a^k=1$$

$$a^k\equiv1(\bmod\ m)$$

---

证明：

若 $n$ 为素数，取$a<n$，设$n-1=d\times2^r$，则要么$a^d\equiv1(\bmod\ n)$，要么$\exists 0<=i<r$，使得$a^{d\times2^i}\equiv-1(\bmod \ n)$

$$a^{n-1}\equiv1(\bmod\ n)$$

$$n-1=d\times 2^r$$

$$a^{d\times2^r}\equiv1(\bmod \ n)$$

$$\therefore a^{d\times2^r}-1\equiv0(\bmod\ n)$$

$$(a^{d\times2^{r-1}}-1)(a^{d\times2^{r-1}}+1)\equiv0(\bmod\ n)$$

$$a^{d\times2^r}-1\equiv(a^d-1)(a^d=1)(a^{d\times2}+1)(d^{d\times2}+1)\cdots (a^{d\times2^{r-1}}+1)$$

$$\equiv0(\bmod \ n)$$

---

线性求逆元

![](https://i.loli.net/2019/04/05/5ca6f3a83ee6e.png)

---

# $BSGS$

求

$$a^x\equiv b(\bmod\ m)$$

的最小正整数解

枚举 $x$

最坏$\mathcal O(m)$

大约枚举$\phi(m)$个数

分块优化

 $\sqrt m\begin{Bmatrix}a^1&&a^2&&\cdots &&a^{\left\lfloor\sqrt m \right\rfloor}\\a^{\left\lfloor\sqrt m\right\rfloor+1}&&a^{\left\lfloor\sqrt m\right\rfloor+2}&& \cdots && a^{2\times\left\lfloor\sqrt m\right\rfloor}\\\vdots &&\vdots&&\ddots&&\vdots\\\cdots&&\cdots&&\cdots&&a^m\end{Bmatrix}$ 
 
 $$r\times a^{\sqrt m}=b$$
 
 $$r=b\times a^{-\sqrt m}$$
 
 用排序$+$二分查找
 
 ![](https://i.loli.net/2019/04/05/5ca6fd6d127be.png)
 
 ![](https://i.loli.net/2019/04/05/5ca6fd6d1cf2a.png)
 
 ---
 
 # 积性函数

$$f(x)=y$$

$x$为正整数，$y$为整数

称为数论函数

---

积性函数：$\gcd(a,b)=1$时，$f(ab)=f(a)f(b)$

完全积性函数：$f(ab)=f(a)f(b)$

![](https://i.loli.net/2019/04/05/5ca6fec75ef6e.png)

欧拉函数证明：

$$\gcd(a,b)=1,\phi(ab)=\phi(a)\times\phi(b)$$

---

$$a=p_1^{r_1}\times p_2^{r_2}\times p_3^{r_3}\times\cdots\times p_k^{r_k}$$

$$\Downarrow$$

$$\phi(a)=a\times(1-\dfrac{1}{p_1})\times(1-\dfrac{1}{p_2})\cdots$$

---

$$b=q_1^{t_1}\times q_2^{t_2}\times q_3^{t_3}\times\cdots\times q_w^{t_w}$$

$$\Downarrow$$

$$\phi(b)=b\times(1-\dfrac{1}{q_1})\times(1-\dfrac{1}{q_2})\cdots$$

---

$$ab=p_1^{r_1}\times p_2^{r_2}\times p_3^{r_3}\times\cdots\times p_k^{r_k}\times q_1^{t_1}\times q_2^{t_2}\times q_3^{t_3}\times\cdots\times q_w^{t_w}$$

$$\Downarrow$$

$$\phi(ab)=a\times b\times(1-\dfrac{1}{p_1})\times(1-\dfrac{1}{p_2})\times\cdots\times(1-\dfrac{1}{q_1})\times(1-\dfrac{1}{q_2})\cdots$$

---

莫比乌斯函数：$\mu(x)$

先对$x$进行质因数分解（唯一分解定理）

$$x=p_1^{r_1}\times p_2^{r_2}\times \cdots\times p_k^{r_k}$$

$$r=\max(r_1,r_2,\cdots,r_k)$$

 $$\mu(x)=\begin{cases}1&x=1\\0&r>1\\(-1)^k&r=1\end{cases}$$ 
 
 易证：$\mu(x)$为积性函数
 
 ---
 
 分解质因数

$Code$

![](https://i.loli.net/2019/04/05/5ca7066462e1c.png)

---

积性函数 $\mu(x)$

$Code$

![](https://i.loli.net/2019/04/05/5ca7073604866.png)

---

开始飙车

# 莫比乌斯反演的性质

---

请计算

$$\sum_{d|n}\mu(d)$$

---

$$\sum_{d|n}\mu(d)=\begin{cases}0&n\ne1\\1&n=1\end{cases}$$

具体证明见 $Day\ 3$

---

# 莫比乌斯反演

$$F(n)=\sum_{d|n}f(d)\Leftrightarrow f(n)=\sum_{d|n}F(d)\mu(\dfrac{n}{d})$$

例子：

$$F(6)=f(1)+f(2)+f(3)+f(6)$$

$$f(6)=F(1)\times\mu(6)+F(2)\times\mu(3)+F(3)\times\mu(2)+F(6)\times\mu(1)$$

证明上式

$$F(n)=\sum_{d|n}f(d)$$

$$F(\dfrac{n}{d})=\sum_{d`|\frac{n}{d}}f(d`)$$

$$\mu(d)F(\dfrac{n}{d})=\mu(d)\sum_{d`|\frac{n}{d}}f(d`)$$

$$\sum_{d|n}\mu(d)F(\dfrac{n}{d})=\sum_{d|n}\mu(d)\sum_{d`|\frac{n}{d}}f(d`)$$

$$=\sum_{d|n}\sum_{d`|\frac{n}{d}}\mu(d)f(d`)$$

$$=\sum_{d`|n}\sum_{d|\frac{n}{d`}}\mu(d)f(d`)$$

$$\sum_{d|n}\mu(d)F(\dfrac{n}{d})=\sum_{d|n}\mu(d)\sum_{d`|\frac{n}{d}}f(d`)$$

$$=\sum_{d`|n}\sum_{d|\frac{n}{d`}}\mu(d)f(d`)$$

$$=\sum_{d`|n}f(d`)\sum_{d|\frac{n}{d`}}\mu(d)$$

$$=f(n)$$