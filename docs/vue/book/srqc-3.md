---
date: 2022-03-30
title: 【深入浅出 Vue.js】变化侦测相关API实现原理
tags: 
  - Vue
---

## 一、vm.$watch

### 1、用法

```jsx
// { string | Function } expOrFn
// { Function | Object } callback
// { object } [options]
	// { boolean } deep
	// { boolean } immediate
// 返回值 { Function } unwatch
vm.$watch( expOrFn, callback, [options] )
```

回调函数调用时，会从参数得到新数据和旧数据。

> vm.$watch 返回一个取消观察函数，用来停止触发回调


deep：可是设置是否侦测对象内部值的变化。

immediate：设置立即触发回调

### 2、内部原理

本质是对 Watcher 的一种封装，但 vm.$watch 中的参数 deep 和 immediate 是 Watcher 中没有的：

```jsx
Vue.prototype.$watch = function(expOrFn, cb, options) {
	const vm = this
	options = optinos || []
	const watcher = new Watcher(vm, expOrFn, cb, options)
	if(options.immediate) {
		cb.call(vm, watcher.value)
	}
	return function unwatch() {
		watcher.teardown()
	}
}
```

```jsx
export class Watcher {
	constructor(vm, expOrFn, cb) {
		this.vm = vm
		if(typeof expOrFn === 'function') {
			this.getter = expOrFn
		} else {
			this.getter = parsePath(expOrFn)
		}
		this.cb = cb
		this.value = this.get()
	}
}
```

> 当 expOrFn 是函数时，Watcher 会同时观察 expOrFn 函数中读取的所有 Vue.js 实例上的响应式数据。


> 取消数据观察的本质：
把 watcher 实例从当前正在观察的状态的依赖列表中删除。


Watcher 中的 teardown 方法实现：

首先需要在 Watcher 中记录自己都订阅了谁，也就是 watcher 实例被收集进了哪些 Dep 里。然后当 Watcher 不想继续订阅时，循环自己记录的订阅列表来通知它们（Dep）将自己从它们的依赖列表中移除掉。

添加 addDep 方法，记录自己都订阅过哪些 Dep：

```jsx
export class Watcher {
	constructor(vm, expOrFn, cb) {
		this.vm = vm
		if(typeof expOrFn === 'function') {
			this.getter = expOrFn
		} else {
			this.getter = parsePath(expOrFn)
		}
		this.cb = cb
		this.value = this.get()
	}
	
	addDep(dep) {
		const id = dep.id
		if(!this.depIds.has(id)) {
			this.depIds.add(id) // 记录已经订阅这个 Dep
			this.deps.push(dep) // 记录自己订阅过哪些 Dep
			dep.addSub(this) // 将自己订阅到 Dep 中
		}
	}
}
```

上述代码中，我们使用 depIds 来判断如果当前 Watcher 已经订阅了该 Dep，则不会重复订阅。

则，Dep 中收集依赖的逻辑也需要改变：

```jsx
let uid = 0 // 新增
export default class Dep {
	constructor() {
		this.id = uid++ // 新增
		this.subs = []
	}
	
	depend() {
		if(window.target) {
			// this.addSub(window.target) 废弃
			window.target.addDep(this) // 新增
		}
	}
}
```

此时，Dep 会记录数据发生变化时，需要通知哪些 Watcher，而 Watcher 也记录着自己被哪些 Dep 通知。多对多的关系。

有了记录之后，就可以新增 teardown 方法，来通知这些订阅的 Dep，让它们把自己从它们的依赖列表中移除：

```jsx
teardown() {
	let i = this.deps.length
	while(i--) {
		this.deps[i].removeSub(this)
	}
}

removeSub(sub) {
	const index = this.subs.indexOf(sub)
	if(index > -1) {
		return this.subs.splice(index, 1)
	}
}
```

## 二、vm.$set

### 1、用法

```jsx
// { Object | Array } target
// { Object | number } key
// { any } value
// 返回值 { Function } unwatch
vm.$set( target, key, value )
```

在 object 上设置一个属性，如果 object 是响应式的， 那么属性创建后也是响应式的，并且触发视图更新，这个方法主要用来避开 Vue.js 不能侦测属性被添加的限制。

### 2、实现

vm.$set 的具体实现其实是在 observer 中抛出的 set 方法：

- 处理 Array 的情况
    
    ```jsx
    export function set(target, key, val) {
    	if(Array.isArray(target) && isValidArrayIndex(key)) {
    		target.length = Math.max(target.length, key)
    		target.splice(key, 1, val)
    		return val
    	}
    }
    ```
    
    上面代码中，如果 target 是数组并且 key 是有效的索引，就先设置 length 属性。接下来通过 splice 方法把 val 设置到 target 中指定的位置，这时候数组拦截器会侦测到 target 发生了变化，会帮我们把这个新增的 val 转换成响应式的。
    
- key 已经存在于 target 中
    
    ```jsx
    export function set(target, key, val) {
    	if(Array.isArray(target) && isValidArrayIndex(key)) {
    		target.length = Math.max(target.length, key)
    		target.splice(key, 1, val)
    		return val
    	}
    	// 新增
    	if(key in target && !(key in Object.prototype)) {
    		target[key] = val
    		return val
    	}
    }
    ```
    
    由于 key 已经存在 target 中，说明这个 key 已经被侦测了变化。所以只需要改数据就好了
    
- 处理新增的属性
    
    ```jsx
    export function set(target, key, val) {
    	if(Array.isArray(target) && isValidArrayIndex(key)) {
    		target.length = Math.max(target.length, key)
    		target.splice(key, 1, val)
    		return val
    	}
    
    	if(key in target && !(key in Object.prototype)) {
    		target[key] = val
    		return val
    	}
    
    	// 新增
    	const ob = target.__ob__
    	if(target._isVue || (ob && ob.vmCount)) {
    		process.env.NODE_ENV !=== 'production' && warn (
    			'Avoid adding reactive properties to a Vue instance or its root $data at runtime - declare it upfront in the data option.'
    		)
    		retrun val
    	}
    	if(!ob) {
    		target[key] = val
    		return val
    	}
    	defineReactive(ob.value, key, val)
    	ob.dep.notify()
    	return val
    }
    ```
    
    上面代码中，先获取 target 的 __ob__ 属性。先处理 target 不能是 Vue 实例 或者根数据（this.$data）。接下来判断是不是响应式数据，如果不是直接设置值就好了。如果是，说明用户在响应式数据上新增了一个属性，这种情况下我们需要追踪这个新增属性的变化，即用 defineReactive 将新增属性转换成 getter/setter 的形式即可。
    

## 三、vm.$delete

因为 Vue 采用的是 Object.defineProperty 来侦测对象，所以使用 delete 关键字删除的无法被检测到，因此采用 vm.$delete 来删除数据中的某个属性。

### 1、用法

```jsx
// { Object | Array } target
// { string | number } key/index
vm.$delete( target, key )
```

删除对象的属性，如果对象是响应式的，我们需要能够视图更新，这个方法用于避开 Vue 不能检测到属性被删除的限制。

### 2、实现原理