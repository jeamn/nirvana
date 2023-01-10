---
date: 2017-08-16
title: ES6笔记之Promise用法
tags:
  - ES6
---
### 1. Promise含义
Promise是一个对象，从它可以获取异步操作的消息。

简单说，是一个容器，存放着某个未来才会结束的事件（异步操作）的结果。

Promise提供统一API，所以异步操作都可以用同样方法进行处理。
<!--more-->
Promise对象特点：

-  一个Promise对象代表一个异步操作
- 有三种状态：Pending、Fulfilled、Rejected
- 状态由异步操作的结果决定，决定了不再变
- 状态改变：Pending----->Fulfilled、Pending----->Rejected，保持着该结果称为Resolved
- 如果改变已经发生，再对Promise对象添加回调函数，也会立即得到这个结果。（ps：Event，错过事件再监听则得不到结果）

Promise缺点：

- 无法取消，一旦新建就会立即执行。
- Promise内部抛出的错误，不会反应到外部，除非设置回调函数。
- Pending状态无法定位哪一个阶段(刚开始还是要完成)。

### 2.基本用法

（1）构造函数

```js
var promise = new Promise(function(resolve,reject){
    ...
    if (异步操作成功)
        resolve(value);
    else{
        reject(error);
    }
});
```

> resolve 函数作用：将Promise对象的状态Pending----->Resolved，在异步操作成功时调用，并将结果作为参数传递。

> reject 函数作用：Pending----->Rejected，异步操作失败时调用，将错误作为参数传递。

（2）用then指定回调函数

```js
promise.then(function(value){
        //success
    },function(error){
        //failure
});
```
> then接受两个回调函数作为参数，第一个是状态变为Resolved时调用，第二个是状态变为Rejected时调用，第二个可选。

（3）执行顺序
promise新建后立即执行，then方法指定的回调函数在当前脚本所有同步任务执行完才会执行。

（4）参数
如果resolve函数和reject函数带参数，则会传递给回调函数。

reject函数的参数通常是Error对象的实例，表示抛出的错误。

resolve函数的参数可能是另一个Promise实例。如：p2的resolve方法将p1作为参数，这时p1的状态会传递给p2，如果p1的状态是Pending，则p2的回调函数就等待p1的状态改变，否则p2的回调函数立即执行。

### 3.Promise.prototype.then( )
then方法是Promise的实例方法，定义在原型对象上。

作用：为Promise实例添加状态改变时的回调函数。

> 第一个参数是Resolved状态的回调函数，第二个（可选）是Rejected状态的回调参数。

> 如果then方法返回的是一个新的Promise实例，可以链式写，直接在后面加 .then( )。第一个函数回调完成返回结果作为参数传给第二个函数。

> 如果前一个回调函数返回的是一个Promise对象，则后一个会等待该Promise状态发生变化才会被调用。

### 4.Promise.prototype.catch( )
是.then（null，rejection）的别名，用于指定发生错误时的回调函数。

```js
getJSON('/posts.json').then(function(posts){
    ...	
}).catch(function(error){
    //处理getJSON和前一个回调函数运行时发生的错误
    console.log('发生错误！',  error);
});
```

> 解析：getJSON方法返回一个Promise对象，如果对象状态变为Resolved，则调用then，如果异步操作抛出错误，状态就变为Rejected，就调用catch方法的回调函数，处理这个错误。

##### reject方法的作用，等同于抛出错误

```js
var promise = new Promise(function(resolve,reject){
    reject(new Error('test'));
});
promise.catch(function(err){
    console.log(err);
})
```

##### 如果Promise状态已经变成Resolved，再抛出错误无效。
Promise对象的错误会‘冒泡’，直到被最后一个catch语句捕获。

尽量将.then的第二个参数用catch方法而不用reject函数，对比如下：

```js
promise.then(function(data){
    //source
},function(err){
    //error
})
    //这种不好，用下面的表示方式：
promise.then(function(data){
    //source
}).catch(function(err){
    //error
})
```

如果没使用catch方法指定错误处理的回调函数，则Promise对象抛出的错误不会传递到外层。

后面的catch方法可以捕获前面的catch方法抛出的错误。

### 5.Promise.all( )
将多个promise实例包装成一个新的promise实例。

每个成员都必须是promise，如果不是，则调用promise.resolve方法，将参数转为promise实例。

```js
var p = Promise.all([p1,p2,p3]);  
```

> 解析：p的状态由p1、p2、p3决定。全部成员的状态都变成fulfilled，p的状态才变成fulfilled。只要一个成员的状态为rejected，p的状态就变为rejected，此时第一个被reject的实例的返回值，会传递给p的回调函数。
 
> 两个实例的两个异步操作，只有等它们的状态结果都返回了，才会触发all里面的then的回调函数。

> 如果作为参数的promise实例，自己定义了catch方法，那么它一旦被rejected，则不会触发all的catch方法。

> 如果p2没有自己的catch方法，则会调用all的catch方法。

### 6.Promise.race( )
将多个Promise实例包装成一个新的Promise实例，这里我们设为p。

只要有一个实例改变状态，p的状态就跟着改变，率先改变的Promise实例的返回值传递给p的回调函数。

实例中如果不是promise实例，用Promise.resolve方法将参数转为Promise实例再处理。

### 7.Promise.resolve( )
将对象转化为Promise对象。等价于 

```js
new Promise(resolve => resolve('foo'))
```

参数分四种情况：

（1）参数是Promise实例，不用修改。

（2）参数是thenable对象（指具有then方法的对象），Promise.resolve方法将其转为Promsie对象，并立即执行thenable对象的then方法。

（3）参数不是具有then方法的对象，或不是对象，则Promise.resolve方法返回一个新的Promise对象，状态为Resolved。Resolved方法的参数会同时传递给回调函数。

（4）不带任何参数，直接返回一个Resolved状态的Promise对象，所以，直接调用Promise.resolve方法可以得到一个Promise对象。但是，得到的对象，是在本轮“事件循环”的结束时，而不是下一轮“事件循环”的开始。

### 8.Promise.reject( )
Promise.reject( reason)方法返回一个新的Promise实例，状态为rejected。

Promise.reject( reason)方法的参数，原封不动地作为reject的理由。

```js
const thenable = {
  then(resolve, reject) {
    reject('出错了');
  }
};
Promise.reject(thenable)
.catch(e => {
  console.log(e === thenable)
})
// true
```

### 9.两个有用的附加方法
（1）done( )
Promise对象的回调链最后一个方法抛出的错误可能无法捕捉到，所以done( )处于回调链的结尾。
（2）finally( )
不管Promise对象最后状态如何，都会执行的操作，接收一个必须执行的普通的回调函数作为参数。

### 10.Promise.try( )
用一个统一的api来处理未知的同步或异步函数，让同步函数同步执行，异步函数异步执行。

所以如果想用then方法管理流程，最好都用Promise.try包装一下。

#### 搜集整理了一些Promise的例子
- 三种状态的Promise

```js
var p1 = new Promise(function(resolve,reject){
	setTimeout(function(){
		resolve(1);
	},500);
});
var p2 = new Promise(function(resolve,reject){
	setTimeout(function(){
		reject(2);
	},500);
});
console.log(p1);
console.log(p2);

setTimeout(function(){
  console.log(p1);
}, 2000);
setTimeout(function(){
  console.log(p2);
}, 2000);
p1.then(function(value){
	console.log(value);
});
p2.catch(function(err){
	console.log(err);
});
```

-  立即执行（异步代码异步执行）
  
```js
var p = new Promise(function(resolve, reject){
  setTimeout(function(){
  	console.log("异步代码");
  },2000);
  console.log("create a promise");
  resolve("success");
});

console.log("after new Promise");

p.then(function(value){
  console.log(value);
});
```
> .then()是Promise实例状态发生改变时的回调函数。
 
> 在创建new Promise对象时，作为参数传入的函数是会被立即执行的，只是可以是异步代码。

下面看一个异步获取资源的实例：

```js
function loadImg(src){
  const promise = new Promise(function(resolve, reject){
    let img = document.createElement('img')
    img.onload = function(){
      resolve(img)
    }
    img.onerror = function(){
      reject()
    }
    img.src = src
  })
  return promise
}
let src = 'http://a0.att.hudong.com/30/88/01100000000000144726882521407_s.jpg'
let result = loadImg(src)
result.then(function(img){
  console.log(img.width)
},function(){
  console.log('failed')
})
result.then(function(img){
  console.log(img.height)
})
```

总体使用方法如下：

> new Promise 实例，传入带resolve和reject两个参数的函数，并且return
> 
> 成功时执行resolve()，失败时执行reject()
> 
> .then( )监听结果

-------------
参考书籍 [阮一峰的ES6标准入门](http://es6.ruanyifeng.com/)






