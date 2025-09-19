---
title: 'C++不定参数笔记'
date: '2025-09-18'
tags: ['C++', '笔记', '模板']
pinned: false
---

## 前言

写这篇笔记的起因，或者说唐突学习多参数的起因是做项目时让AI写的一个 ``debug_printf`` 函数，可以用类似 ``printf`` 的方法来自定义输出一些调试语句到 log 文件里

一开始并没在意这个函数的具体实现，毕竟只是让 AI 写一个调试用途的函数，只是注意到里面用了很多很神秘的东西，但是直到最近需要进一步定制调试语句输出方法的时候，才打算具体学一下里面用到的知识点

所以这篇笔记就以实现一个自己的 ``printf`` 作为一个目标，从 C 到 C++20 依次简要学一下不定参数函数

----

## C 语言的蛮荒宏时代

C 语言时代的不定参数是通过一个叫 ``va_list`` 的类型实现的，定义在 ``<stdarg.h>`` 中

C 语言中没有模板等等神秘技巧，因此 ``va_list`` 类型的实现自然而然地选择了最原始也最克苏鲁的宏定义，具体的代码我们就不再深究了，但是具体方法就是通过获取函数栈帧上的 bit 值来操作的

主要的函数大概就是三个：

- va_start	初始化 va_list 变量，使其指向不定参数前的最后一个固定参数。

- va_arg	规定类型并获取当前指向的参数，并让 va_list 指向下一个参数。

- va_end	清理 va_list 变量，释放相关资源。

具体而言直接通过一个代码即可读懂：

```cpp
int print(int a, ...) {
    va_list args;
    va_start(args, a);
    for (int i = 0; i < a; i++) {
        std::cout << va_arg(args, int) << " ";
    }
    va_end(args);
    return 0;
}

int main () {
    print(5, 1, 2, 3, 4, 5);
    return 0;
}
/*
输出:
1 2 3 4 5 
*/
```

这里对于含有不定参数的函数 ``print``，先定义一个 ``va_list`` 类型是变量，然后用 ``va_start`` 指向不定参数前的最后一个固定参数，然后后面每次用 ``va_arg`` 取一个值即可，最后用 ``va_end`` 来释放资源

注意这里我们已经约定好了所有的 ``a`` 个参数都是 ``int`` 类型，所以 ``va_arg`` 里直接写 ``int`` 即可

这里有两个很容易注意到的点：

1. 如果我们不定参数前没有固定参数怎么办，我能否直接直到 ... 中具体传了多少个参数

2. 必须要提前约定好不定参数中每个位置的参数类型么

对于第一个疑问的答案是，``va_list`` 没法处理没有固定参数只有不定参数的情况，也没法直接获取 ... 中具体传的参数量

其实这背后的原理应该是不难理解的，毕竟在 C 语言这个蛮荒时代是没有什么编译器工具的，``va_xxx`` 系列类型和函数都是通过直接读取栈帧上存储的数据来操作的，栈帧上不会有参数个数这个信息的，而如果不提供最后一个固定参数，程序也自然不知道这个函数参数的栈帧数据从何处开始

不过虽然没法获取参数包的长度，但是很显然可以通过一些比较简单的 ``trick`` 实现不给参数包长度就能处理不定参数的方法，那就是在不定参数的最后一个位置插入一个“不合法值”，比如约定 -1 是参数包的结尾，那就一个循环写死不停分析这个参数包，直到找到一个 -1 时代表参数包结束，跳出循环。

对于第二个疑问的答案是，``va_list`` 确实需要约定好每个位置的参数类型，原因和上一个问题的答案差不多，栈帧上不会携带类型信息，自然也没法智能的分析参数的类型了。这也是为什么 ``printf`` 必须要在前面的格式化字符串中用 ``%d`` 之类的东西写明每一个位置的类型。

其实不难发现 C 时代的不定参数是比较难用也比较简陋的，具体原因大概也是因为 C 还是比较原始的，没有引入模板、编译期这些比较神秘但是也确实好用的东西，通过分析栈帧信息显然是困难重重也效率不高的。

---

## C++11 革命下的可变参数模板

C++11 带来了无数现代 C++ 的新语法，可变参数模板就是其中难以忽视的一个

具体而言可变参数的写法是这样的：

```cpp
template <typename T, typename... Args> 
void print(const T& a, const Args&... args)
```

而在使用参数包 ``args`` 时可以通过在含 ``args`` 的表达式的后面跟上 ...，形如 ``exp(args)...`` 这样，表示对参数包中的每一个参数都做一次表达式的展开

对于 C++11 的可变参数模板有一种很常见也很好用的食用方法，那就是递归写法，具体而言是这样的

```cpp
template <typename T>
void print(const T& x) {
    std::cout << x << ' ';
}
template <typename T, typename... Args>
void print(const T&x, const Args&... args) {
    print(x);
    print(args...);
}
int main() {
    print("Hello", 10, 3.14, "world");
}
/*
输出：Hello 10 3.14 world
*/
```

这种递归的方法好理解也好写，但是对于一些可能需要所有不定参数相互作用的时候可能就比较难用了，而 C++11 针对不递归的情况也提供了使用方法，那就是 ``std::initializer_list``

其用法就是 ``std::initializer_list<TYPE>{.......}``，在花括号里携带若干个 TYPE 类型的参数可以构造一个不定数量的初始化列表

具体而言看这样的一个代码：

```cpp
template<typename T>
void process(const T& arg) {
    std::cout << arg << ' ';
}

template<typename... Args>
void print(const Args&... args) {
    std::initializer_list<int>{ (process(args), 0)... };
}

int main() {
    print("hello", 42, 3.14);
}
/*
输出：hello 42 3.14
*/
```

刚才提到在表达式后面接 ... 可以展开这个表达式，所以初始化列表那一句经过编译器之后应该变成：

```cpp
std::initializer_list<int>{ 
    (process("hello"), 0), 
    (process(42), 0), 
    (process(3.14), 0)
};
```

因为逗号表达式的原因所有这句话的直接产物就是构造了有三个0的``int``类型初始化列表，但是实际作用显然是展开了三个 ``process`` 函数

那如果不用初始化列表直接写成这样行不行呢：

```cpp
process(args)...;
```

既然我没这么写自然就是不行，原因比较神秘，具体是因为 C++ 只支持在期望用逗号分隔的地方用 ... 展开，比如以下集中场景：

```cpp
func(args...); // 展开为 func(arg1, arg2, arg3)
func(process(args)...); // 展开为 func(process(arg1), process(arg2), ...)
int a[] = { args... }; // 展开为 { arg1, arg2, arg3 }
std::tuple<Args...> a; // 展开为 std::tuple<T1, T2, T3>
class T : public Base<Args>... {  // 展开为 class MyClass : public Base<T1>, public Base<T2>, ... 
    ... 
};
```

仔细看看这里面的场景大概就能理解何为“期望用逗号分隔的地方”了吧

上面在举例里提到了可变参数模板的另一个有意思的用途，就是多类型继承

具体可以这么使用：

```cpp
struct TypeA { void process() const { std::cout << "TypeA\n"; } };
struct TypeB { void process() const { std::cout << "TypeB\n"; } };

template<typename T>
struct Base {
    void handle(const T& e) {
        e.process();
    }
};

template<typename... Args>
class Master : public Base<Args>... {
public:
    template<typename T>
    void dispatch(const T& e) {
        this->Base<T>::handle(e);
    }
};

int main() {
    Master<TypeA, TypeB> handler;
    TypeA a;
    TypeB b;
    handler.dispatch(a);
    handler.dispatch(b);
}
/*
输出：
TypeA
TypeB
*/
```

由于多继承的时候不同参数表的同名函数没法根据参数表匹配，所以必须呀在调用 ``handle`` 的时候加上基类型，当然也可以通过 using 的方法提升两个 ``handle`` 的定义域

具体而言这样写：

```cpp
template<typename... Args>
class Master : public Base<Args>... {
public:
    using Base<Args>::handle...;
    
    template<typename T>
    void dispatch(const T& e) {
        this->handle(e);
    }
};
```

这里会展开成

```cpp
class Master : public Base<TypeA>, public Base<TypeB> {
public:
    using Base<TypeA>::handle, Base<TypeB>::handle;
    
    template<typename T>
    void dispatch(const T& e) {
        this->handle(e);
    }
};
```

对于前文中提到的 C 里 ``va_list`` 中的那些局限，可变参数模板基本都有很好的解决，通过模板类型匹配和编译器等操作可以完成很多只通过栈帧分析得不到的信息，而且显然在编译器内计算比运行时计算要快，优化空间也要大。

另外对于前文中 ``va_list`` 不知道的获取参数包的长度，可变参数模板也有一个特别的支持：

```cpp
std::cout << sizeof...(args);
```

但是 C++11 中的这些语法还是有很多的限制，比如要求全部是 ``int`` 的可变参数模板里所有参数的和，可以通过初始化列表或者递归两种写法，递归写法就省略了，下面是初始化列表的写法：

```cpp
template<typename... Args>
int sum(Args... args) {
    int total = 0;
    for (auto value : std::initializer_list<int>{args...}) {
        total += value;
    }
    return total;
}

int main() {
    std::cout << sum(1, 2, 3, 4, 5);
}
/*
输出：15
*/
```

但是很显然的可以注意到，如果参数表中的参数不都是 ``int``，比如有很多 ``double`` 或者什么其他支持加法运算符的类型，简单的范围循环就没法用了，此时用 C++11 的语法大概只能选择用递归写法，或者用前文中 ``process`` 那个函数的写法一样，通过表达式副作用达成自己的目的。

虽然已经比 C 完善了很多，但是这种写法还是颇有些缺乏优雅，或许是因为 C++11 仅支持通过展开参数包或者递归的方式来处理多参数，总体而言功能还是比较受局限的，因此这里就引入了 C++17 进一步支持的语法糖

## 大厦进一步完善的 C++17 折叠表达式

在 C++17 中进一步提出了一个针对可变参数模板的语法糖，也就是折叠表达式，具体用法有这些

```cpp
(args + ...)      =>  (args[0] + (args[1] + (... + (args[n - 1] + args[n]))))
(args + ... + p)  =>  (args[0] + (args[1] + (... + (args[n - 1] + (args[n] + p)))))
(... + args)      =>  ((((args[0] + args[1]) + ...) + args[n - 1]) + args[n])
(p + ... + args)  =>  (((((p + args[0]) + args[1]) + ...) + args[n - 1]) + args[n])
```

这里的所有运算都以加法为例，但是显然可以可以换成任意一种其他运算符，只要保证参数包里的类型能进行这种运算。

因此对于类型不同的参数包求和，也就十分轻松了，代码如下：

```cpp
template<typename... Args>
int sum(Args... args) {
    return (args + ...);
}

int main() {
    std::cout << sum(1, 2ll, 3.56, 'p');
}
```

args也可以被运算表达式包裹，那后面展开的列表里的所有 ``args[x]`` 也都会被包裹一层表达式，逗号当然也是可以这么使用的，因此之前写的那种 ``print`` 函数就有一种更简单的写法了：

```cpp
template<typename... Args>
void print(Args... args) {
    ((std::cout << args << ' '), ...);
}

int main() {
    print(1, "Chiaro", 5.6789, 'p');
}
/*
输出： 1 Chiaro 5.6789 p
*/
```

## 后记

