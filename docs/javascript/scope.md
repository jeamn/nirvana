---
date: 2023-01-11
title: 【JavaScript】作用域
tags: 
  - JavaScript
---

作用域就是代码的执行环境，它定义了变量或函数有权访问的其他数据，决定了它们各自的行为。

在每个执行环境中都有一个与之关联的变量对象，环境中定义的所有变量和函数都保存在这个对象中。

当代码在一个执行环境中执行时，会创建该变量对象的一个作用域链，它保证了对执行环境有访问权限的所有变量和函数的有序访问。