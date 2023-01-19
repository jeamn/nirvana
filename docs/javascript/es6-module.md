---
date: 2017-08-19
title: 【JavaScript】ES6笔记之模块化
tags:
  - ES6
---

### 一、Babel编译器安装
为了积极拥抱ES6的语法，首先来安装个babel。创建个文件夹，终端走你：

```sh
// 先初始化一个仓库
npm init

// 安装各种依赖
npm install --save-dev babel-core babel-preset-es2015 babel-preset-latest

// 创建一个 .babelrc 文件
touch .babelrc

// 全局安装 babel 的命令行工具
npm i -g babel-cli

// 创建一个 ./src/index.js 测试文件
mkdir src
cd src
touch index.js
```
<!-- more -->

在 .babelrc 中编写如下代码：

```js
{
  "presets": ["es2015","latest"],
  "plugins":[]
}
```

在 index.js 文件中编写测试代码：

```js
[1,2,3,4].map(i => console.log(i))
```

终端走你：

```
babel index.js
```

### 二、webpack实现模块化
先安装一波依赖，

```
npm install webpack babel-loader —save-dev
```

根目录下创建webpack.config.js文件，配置如下：

```js
module.exports = {
  entry: './src/index.js', //模块打包的入口文件
  output: {
    path: __dirname, //模块打包后输出文件位置
    filename: './build/bundle.js' //模块打包后输出文件名
  },
  module: {
    rules: [{
      test: /\.js?$/, //规则匹配
      exclude: /(node_modules)/, //打包的内容不包含modules中的js文件
      loader: 'babel-loader'
    }]
  }
}
```

ES6的模块化语法主要包括：**import** 和 **export**
在src目录下，分别创建 util1.js、util2.js

```js
export default {
  name: 'jeman'
}
```

```js
export function fn1(){
  console.log('fn1')
}
export function fn2(){
  console.log('fn2')
}
```

在 index.js 文件中，引入这两个模块：

```js
import util1 from './util1.js'
import {fn1, fn2} from './util2.js'

fn1()
fn2()
console.log(util1)
```

当模块中有 default ，可直接引入该模块，否则应大括号包含所有需要引入的函数。

### 三、rollup实现模块化

```sh
npm init //初始化
npm i --save-dev rollup-plugin-node-resolve rollup-plugin-babel babel-plugin-external-helpers babel-preset-latest //安装相关依赖
```

配置 .babelrc 文件，

```js
{
  "presets": [
    ["latest", {
      "es20215": {
        "modules": false
      }
    }]
  ],
  "plugins": ["external-helpers"]
}
```

配置 rollup.config.js 文件：

```js
import babel from 'rollup-plugin-babel'
import resolve from 'rollup-plugin-node-resolve'

export default{
  entry: 'src/index.js',
  format: 'umd',
  plugin: [
    resolve(),
    babel({
      exclude: 'node/modules/**'
    })
  ],
  dist: 'build/bundle.js'
}   
```

### 四、模块化标准见仁见智
webpack 和 rollup 两者都能实现模块化，rollup功能单一，只负责模块的打包，编译出来的文件体积比较小，webpack功能强大，但是编译出来的代码冗余比例大。
从无模块化到AMD成为标准，到前端打包工具盛行，使得nodejs模块化可以被使用，node使用的是commonjs标准，直到ES6模块化出现，有一统前端模块化标准的趋势。目前nodejs是积极支持ES6模块化标准的，而浏览器尚未统一。让我们拭目以待。。。







