---
date: 2017-08-18
title: 【JavaScript】ES6笔记之Iterator遍历器
tags:
  - ES6
---

### 1.初识 Iterator
**概念：** 遍历器是一种统一的的接口机制，来处理所有不同的数据结构（数组，对象，Map，Set），只要数据结构有部署Iterator接口，就可以完成遍历操作。

**作用：** 提供统一访问接口，使得数据结构成员按某种次序排列，供新的遍历命令for...of使用。
<!--more-->

**过程：** 创建一个指针对象，指向当前数据结构的起始位置。第一次调用指针对象的next方法，可以将指针指向数据结构的第一个成员，以此类推，直到指向结束。每一次调用next，都返回包含value和done的对象，value表示当前成员的值，done表示是否结束。

对于遍历器对象来说，done：false和value：undefined属性可以省略。

### 2.默认Iterator接口
当使用for...of循环遍历某种数据结构时，该循环会自动去寻找Iterator接口。

只要部署了Iterator接口，或者，一个数据结构只要有Symbol.iterator属性，就称该数据结构是可遍历的。
默认的Iterator接口部署在数据结构的Symbol.iterator属性，其本身是一个函数，就是当前数据结构默认的遍历器生成函数，执行之后会返回一个遍历器。

```js
const obj = {
	[Symbol.iterator]:function(){
		return {
			next: function(){
				return {
					value: 1;
					done: true;
				};
			}
		};
	}
};
```

> 解析：对象obj中有Symbol.iterator属性，所以它是可遍历的。执行这个属性，会返回一个遍历器对象。改对象的根本特征就是由next方法，每次调用next方法，都会返回一个代表当前成员的信息对象，具有两个属性。

凡是部署了Symbol.iterator属性的数据结构，就称为部署了遍历器接口，调用该接口，就会返回一个遍历器对象。

ES6的数组结构原生部署了Symbol.iterator属性，数组的遍历器接口部署在该属性上面，调用这个属性，就得到遍历器对象。而对象没有，因为不确定先遍历哪个对象。

原生具有Iterator接口的数据结构有以下：Array、Map、Set、String、TypedArray、函数的arguments对象、NodeList对象。

对于原生部署Iterator接口的数据结构，不用自己写遍历生成函数，for...of循环会自动遍历，其他数据结构的Iterator接口要在自己的Symbol.iterator属性上面部署，才会被for...of循环遍历。原因是：遍历器的本质是一种线性处理，部署遍历器接口，就等于部署一种线性变换。

给类似数组的对象部署Iterator接口，可以Stmbol.iterator方法直接引用数组的Itorator接口。

Symbol.iterator方法对应的一定要是遍历器生成函数，不然解析引擎会报错。

有遍历器接口后，数据结构就可以用for...of和 while 循环遍历。
### 3.调用Iterator接口的场合
Iterator接口即Synbol.iterator方法，默认调用的场合有以下几种：

（1）解构赋值：对数组和Set结构进行解构赋值时，会默认调用更该方法。

（2）扩展运算符  ...

（3）yield*

（4）Promise.race( )、Promise.all( )

### 4.字符串的Iterator接口
字符串是类数组数据结构，也具有原生的Iterator接口。

### 5.iterator和Generator函数
两者结合是Symbol.iterator方法的最简单实现。

### 6.遍历器对象的return( )和throw( )
遍历器必须部署的方法是next（），return（）和throw（）是可选部署。

return（）使用：如果for...of循环提前退出（break或者continue语句），就会调用return方法。或者一个对象在遍历完成前，需要清理或释放资源。

return方法必须返回一个对象。throw方法主要配合generator函数使用。

### 7.for...of循环
循环内部调用的是Symbol.iterator方法。

for...in循环获取键名，for...of循环获取键值。

for...of可以借助数组实例的entries方法和keys方法来获取数组的索引。

Set和Map遍历顺序是按照成员添加进数据结构的顺序，Set返回一个值，Map返回一个数组。

计算生成的数据结构：
ES6的数组，Set，Map都部署了三个方法,都返回一个遍历器

对象：
**entries( ):** 用来遍历【键名，键值】组成的数组。Map结构的Iterator接口默认就是调用该方法。
**keys( ):** 遍历所有键名。
**values( ):**遍历所有键值。

类数组对象：
并不是所有类数组对象都有Iterator接口，解决办法就是使用Array.from方法将其转化为数组。

对象：
普通对象不能直接使用for...of，必须部署iterator接口。

解决方法：使用Object.keys方法将对象的键名生成一个数组，然后遍历这个数组。

或者使用Generator函数将对象重新包装一下。

- 与其他遍历法比较：

*数组为例：*

原始方法是for（比较麻烦）----->   foreach方法（无法中途跳出foreach）----->for in（数组的键名是数字，但是for...in循环是以字符串‘1’，‘2’。for...in不仅遍历数字键名，还有其他键，以及原型链上的键。某些情况遍历的时候无顺序。所以只适合遍历对象）。

-------------
参考书籍 [阮一峰的ES6标准入门](http://es6.ruanyifeng.com/)







