---
date: 2019-02-02
title: 如何实现一个require方法
tags:
  - Node
---

### 一、node中requrie的用法
我们知道，node的模块化实现用的是CommonJS规范，即，引入模块使用的是：

```js
let name = require('./name.js)
```

导出模块使用的是：

```js
module.exports = {...}
```
如果我们导入的文件没有写后缀名，那么node默认会先寻找路径下.js结尾的文件，如果找不到，会继续找.json结尾的文件，如果找不到，会找node结尾的文件....

那么我们来看一下怎么实现require方法，简单的实现，不考虑复杂因素，所以我们会默认给出导入模块的后缀名，.js或者.json，来对应处理引入的模块内容并将其导出。
<!-- more -->

### 二、实现require需要实现什么
接下来我们先考虑实现一个require的大致思路：

- 1） 拿到我们传入require方法的这个路径，在这里我们要拿绝对路径
- 2） 创建一个模块，并将我们拿到的模块内容存起来
- 3） 根据后缀名称来决定如何导出模块的内容

#### 第一步：拿路径

```js
const path = require('path')
const fs = require('fs')

function req(moduleId){
    // 拿到绝对路径
    const absPath = path.resolve(__dirname, moduleId)
}
```
#### 第二步：存内容

```js
const path = require('path')
const fs = require('fs')

//存储内容我们需要定义一个模块，模块只包含这个模块的路径id，以及模块的内容
function Module(id){
    this.id = id
    this.exports = {}   //默认导出一个空对象
}

function req(moduleId){
    // 拿到绝对路径
    let absPath = path.resolve(__dirname, moduleId)
    // 创建一个模块来存储内容
    let module = new Module(absPath)
}
```

#### 第三步：导出去
> json文件：直接导出模块的内容
> 
> js文件：用闭包来处理导出的js模块，node的require是这样实现的，这样能解决命名空间的问题

```js
const path = require('path')
const fs = require('fs')
const vm = require('vm') // node用一个虚拟的沙箱来实现代码的执行，而不是通过eval，因为eval不安全，eval可以读到全局的变量

//存储内容我们需要定义一个模块，模块只包含这个模块的路径id，以及模块的内容
function Module(id){
    this.id = id
    this.exports = {}   //默认导出一个空对象
}

//自定义一个对象来实现对应后缀文件的执行方式
let obj = {
    '.js'(module){
        let content = fs.readFileSync(module.id, 'utf8')
        //每个模块都是一个闭包，这个闭包默认有五个参数：
        let moduleWrap = ['(function(exports, module, require, __dirname, __filename){','})']
        //将读出来的内容拼接成代码块并在沙箱中执行
        let script = moduleWrap[0] + content + moduleWrap[1]
        vm.runInThisContext(script).call(module.exports, module.exports, module, req)
    },
    '.json'(module){
        //如果是json结尾，直接将内容导出
        module.exports = JSON.parse(fs.readFileSync(module.id, 'utf8'))
    }
}

function req(moduleId){
    // 拿到绝对路径
    let absPath = path.resolve(__dirname, moduleId)
    // 创建一个模块来存储内容
    let module = new Module(absPath)
    // 获取后缀名
    let ext = path.extname(absPath)
    // 根据后缀名称进行加载
    obj[ext](module)
    //最后将modele的exports返回
    return module.exports
}

//并试验一下
let name = req('./user.json')
console.log(name);

let name2 = req('./name.js')
console.log(name2);
```
简单而又粗暴的实现。。。
##### 参考文章
[Node.js Require源码粗读](https://juejin.im/post/5ab4d3d151882521d6578298)
[阮一峰 require() 源码解读](http://www.ruanyifeng.com/blog/2015/05/require.html)




