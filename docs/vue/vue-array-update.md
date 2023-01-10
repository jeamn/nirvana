---
date: 2019-03-26
title: 从 vue 双向数据绑定到数组更新机制
tags: 
  - Vue
---

## 一、vue如何监控数据的变化？
我们先定义一个数据源：
```js
let obj = {
    name: 'jeamn',
    age: 20
}
```

我们知道，选项 data 里面返回的是一个对象，对象里面存放着各种数据类型的属性，接下来我们实现一个方法来监听 data 里面数据的变化：
```js
function observer(obj){
    if(typeof obj == 'object'){
        for(let key in obj){
            defineReactive(obj, key, obj[key])
        }
    }
}
```

<!-- more -->

当被监听的是一个对象的时候，我们遍历这个对象里面的所有属性，利用对象的 defineProperty 属性来对数据进行劫持，接下来我们实现这个方法：
```js
function defineReactive(obj, key, value){
    Object.defineProperty(obj, key, {
        get(){
            return value
        },
        set(val){
            console.log('数据更新');
            value = val
        }
    })
}
```

利用 set 方法，当数据改变的时候，我们可以做一些操作，比如我们在这里打印“数据更新”，并将新的值替换老的值，然后我们监听 obj 对象，并改变 name 属性：
```js
observer(obj)
obj.name = 'mike'
console.log(obj.name);
```

可以看到控制台打印了一次“数据更新”，data 中的数据也相应地发生了改变。这其实就是 vue 双向数据绑定的雏形。

如果 data 中的属性是对象呢？接下来我们改一下数据源：
```js
let obj = {
    name: 'jeamn',
    age: {
        newAge: 20,
        oldAge: 19
    }
}
```
这个时候我们去改变数据，是不会触发视图更新的，我们可以看到控制台是没有打印“数据更新”的
```js
observer(obj)
obj.age.newAge = 30
```
所以，让我们完善一下 defineReactive 方法，当我们在解析 data 中属性的 value 的时候，如果这个 value 是一个对象，那么我们是需要继续对它进行监听的，所以，我们可以在 defineReactive 执行的时候，解析这个对象，
```js
function defineReactive(obj, key, value){
    observer(value)   // 如果 value 是一个对象，只需要再监听一次，递归
    Object.defineProperty(obj, key, {
        get(){
            return value
        },
        set(val){
            console.log('数据更新');
            value = val
        }
    })
}
```

这个时候我们就可以看到控制台打印了 “数据更新”。

同理，当我们赋值的时候，传的是一个对象，比如，我们将一个对象赋值给 obj 的 age，然后我们再去修改这个对象的属性：
```js
obj.age = {
    nowAge: 40
}
obj.age.nowAge = 50
```

我们可以看到，只会触发一次 “数据更新”，那么这次“数据更新”，其实就是我们定义 obj.age 的时候触发的，那么我们怎么再修改新传入的对象里面的属性的时候，也触发视图更新呢？很简单，只需要在对象中取数据的时候，即 set 方法调用时，去监听一下这个改变后的新值：
```js
set(val){
    observer(val)
    console.log('数据更新');
    value = val
}
```
那么这个时候就可以看到打印两次“数据更新”了。

这里还要注意的一个点是：

> 如果对象中不存在某个属性，则改变这个属性的值，并不会刷新视图，因为 observer 遍历的是已有属性

这只是 vue 中对对象数据类型的数据进行监听的基本方法，我们知道 Object.defineProperty 只适用于对象，那么 vue 中怎么监听数组的数据变化呢？

## 二、数组更新机制
Object.defineProperty 不支持数组，所以 vue 重写了数组的方法，如果调用的数组方法在这个范畴，那么还是会触发视图的更新。那么我们就列举几个数组的方法并重写它们：
```js
['push', 'slice', 'shift', 'unshift'].forEach(method => {
    let oldPush = Array.prototype[method]
    Array.prototype[method] = function(value){
        console.log('数组数据更新');
        oldPush.call(this, value)
    }
})
```
然后调用数组的方法：
```js
obj.age = [1,2,3,4]; // 打印“数据更新”
obj.age.push(5)      // 打印“数组数据更新”
obj.age.slice(2)     // 打印“数组数据更新”
obj.age.length --    // 通过长度更改数组，不会触发视图更新
obj.age[1] = 8       // 直接通过索引修改数组的值，会打印“数据更新”
```

> 当通过数组索引去修改属性的时候，不会触发数组的更新机制，但会触发对象的更新机制，因为整个数组对象是可以被监听的。所以视图是不会更新的。


