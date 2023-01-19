---
date: 2023-01-11
title: 【JavaScript】bind 原理
tags: 
  - JavaScript
---



- bind 方法会创建一个新函数，当这个新函数被调用时，bind 的第一个参数将作为它运行时的 this，之后的一系列参数将作为新函数的参数传入。
- 两个特点：返回一个函数、可以传入参数

## 返回函数模拟实现

```jsx
// 第一版Function.prototype.bind = function (context) {
    let self = this
    return function () {
        return self.apply(context)
    }
}

```

## 传参模拟实现

由于函数可以在 bind 的时候传一部分参数，调用的时候再传剩下的参数，所以实现如下：

```jsx
Function.prototype.bind = function (context) {
    let self = this
    let args = [...arguments].slice(1)
    return function () {
        return self.apply(context, [...args, ...arguments])
    }
}
```

## 构造函数效果的模拟实现

一个绑定函数也能使用 new 操作符创建对象：这种行为就想把原函数当成构造器。提供的 this 值会被忽略，同时调用时的参数也会被提供给模拟函数。