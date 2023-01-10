---
date: 2022-04-13
title: 【深入浅出 Vue.js】模板编译
tags: 
  - Vue
---

## 一、概念

模板编译的主要目标就是生成渲染函数，渲染函数每次执行的时候，会使用当前最新的状态生成一份新的 vnode，然后使用这个 vnode 进行渲染。

## 二、将模板编译成渲染函数

分两个步骤，先将模板解析成 AST（抽象语法树），然后再使用 AST 生成渲染函数。

由于静态节点不需要总是重新渲染，所以在生成 AST 之后、生成渲染函数之前这个阶段，需要遍历一遍 AST，给所有静态节点做一个标记。这样在虚拟 DOM 中更新节点时，就不会重新渲染它。

所以模板编译大致分为：

- 将模板解析为 AST（解析器）
    
    在解析器内部分成了很多小解析器，其中包括过滤器解析器、文本解析器和 HTML 解析器，然后通过一条主线将这些解析器组装在一起。
    
    > 过滤器解析器主要解析过滤器；文本解析器主要解析带变量的文本；HTML 解析器主要用来解析模板，每当解析到 HTML 标签的开始位置、结束位置、文本或者注释时，都会触发钩子函数，然后将相关信息通过参数传递出来。
    
- 遍历 AST 标记静态节点（优化器）
    
    每次重新渲染时，不需要再为静态节点创建虚拟节点，而是直接克隆已存在的虚拟节点。
    
- 使用 AST 生成渲染函数（代码生成器）
    
    渲染函数的作用是创建 vnode，之所以可以创建 vnode，是因为代码字符串中会有很多函数调用，这些函数是虚拟 DOM 提供的创建 vnode 的方法。
    
    > 比如 _c 可以创建元素类型的 vnode，_v 可以创建文本类型的 vnode。
    