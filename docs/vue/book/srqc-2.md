---
date: 2022-03-28
title: 【深入浅出 Vue.js】Array 的变化侦测
tags: 
  - Vue
---

## 一、如何追踪变化

想要追踪数组的变化，我们可以用一个拦截器覆盖 Array.prototype，那么每当使用 Array 原型上的方法操作数组时，其实执行的都是拦截器中的提供的方法。

## 二、拦截器

Array 原型中可以改变数组自身内容的方法有 7 个，分别是 push、pop、shift、unshift、splice、sort 和 reverse。

```jsx
const arrayProto = Array.prototype
export const arrayMethods = Object.create(arrayProto)

;['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse']
.forEach(method => {
	const original = arrayProto[method]
	Object.defineProperty(arrayMethods, method, {
		value: function mutator(...args) {
			return original.apply(this, args)
		},
		enumerable: false,
		writable: true,
		configurable: true
	})
})
```

先创建变量 arrayMethods 继承自 Array.prototype，具备其所有功能，后面要使用 arrayMethods 去覆盖 Array.prototype。

接下来在 arrayMethods 上使用 Object.defineProperty 方法将那些可以改变数组自身的方法进行封装。

当执行数组方法时，实际上执行的是 mutator 函数。

## 三、使用拦截器覆盖 Array 原型

我们不能直接去覆盖全局的 Array，因为这样会污染到她。我们希望拦截操作只是针对那些被侦测了的数据，也就是拦截器只覆盖那些响应式数组的原型。
将一个数据转换为响应式的，需要通过 Observer，所以我们可以在里面使用拦截器覆盖那些即将被转换成响应式 Array 类型数据的原型就可以了。

```jsx
export class Observer {
  constructor(value) {
    this.value = value

    if(Array.isArray(value)){
			value.__proto__ = arrayMethods // 新增
    } else {
      this.walk(value)}
  }

  walk(obj) {
    const keys = Object.keys(obj) 
    for(let i = 0; i< keys.length; i++){
      defineReactive(obj, keys[i], obj[keys[i]])
    }
  }
}

```

```jsx
value.__**proto__** = arrayMethods
```

这句代码的作用是将拦截器（加工后具备拦截功能的 arrayMethods）赋值给 value.__proto__，通过 __proto__ 实现覆盖 value 原型的功能。

## 四、将拦截器方法挂载到数组的属性上

当浏览器不能使用 __proto__ 时，Vue 的做法是直接将 arrayMethods 上的方法设置到被侦测的数组上，也就是将已经加工了拦截操作的原型方法直接添加到 value 的属性中。

## 五、如何收集依赖

在对象中，是在 getter 中收集依赖，依赖被存储在 Dep 里。Array 和 Object 一样，也是在 defineReactive 中收集依赖。Object 在 setter 中触发依赖，而 Array 在拦截器中触发依赖。

## 六、依赖列表存在哪儿

Vue.js 把 Array 的依赖存放在 Observer 中：

```jsx
export class Observer {
  constructor(value) {
    this.value = value
    this.dep = new Dep() // 新增 dep

    if(Array.isArray(value)){
      const augment = hasProto ? protoAugment : copyAugment
      augment(value, arrayMethods, arrayKeys) 
    } else {
      this.walk(value)
    }
  }
}
```


💡 为什么数组的依赖放 Observer 中？
是因为在 getter 中可以访问到 Observer 实例，在 Array 拦截器中也可以访问到 Observer 实例。


## 七、收集依赖

把 Dep 实例保存在 Observer 的属性上之后，可以在 getter 中通过下面的方式来访问并收集依赖：

```jsx
function defineReactive(data, key, val) {
	let childOb = observe(val) // 修改
	let dep = new Dep()
	Obejct.defineProperty(data, key, {
		enumerable: true,
		configurable: true,
		get: function() {
			dep.depend()
			// 新增
			if(childOb){
				childOb.dep.depend() // 收集依赖
			}
			return val
		},
		set: function(newVal) {
			if(val === newVal) return
			dep.notify()
			val = newVal
		}
	})
}
```

```jsx
/**
	* 尝试为 value 创建一个 Observe 实例
	* 如果创建成功，直接返回新创建的 Observe 实例
	* 如果 value 已经存在一个 Observe 实例，则直接返回它
	*/
export function observe(value, asRootData) {
	if(!isObject(value)) return
	let ob
	if(hasOwn(value, '__ob__') && value.__ob__ instanceof Observe) {
		ob = value.__ob__
	} else {
		ob = new Observe(value)
	}
	return ob
}
```

通过 observe 我们得到了数组的 Observe 实例（childOb），最后通过 childOb 的 dep 执行 depend 方法来收集依赖。从而实现了数组在 getter 中将依赖收集到 Observe 实例的 dep 中。

## 八、在拦截器中获取 Observer 实例

Array 是对原型的一种封装，所以可以再拦截器中访问到 this（当前正在操作的数组）。

而依赖列表 dep 保存在 Observer 中，所以需要在 this 上读到 Observer 的实例：

```jsx
// 工具函数
function def(obj, key, val, enumerable) {
	Object.defineProperty(obj, key, {
		value: val,
		enumerable: !!enumberable,
		writable: true,
		configurable: true
	})
}
export class Observer {
  constructor(value) {
    this.value = value
    this.dep = new Dep()
		def(value, '__ob__', this) // 新增

    if(Array.isArray(value)){
      const augment = hasProto ? protoAugment : copyAugment
      augment(value, arrayMethods, arrayKeys) 
    } else {
      this.walk(value)
    }
  }
}
```

上面代码中，def 函数表示在 value 上新增了一个不可枚举的属性 '__ob__'，这个属性的值就是当前 Observer 的实例。

这样我们就可以通过数组数据的 '__ob__' 属性拿到 Observer 实例，然后拿到该实例的 '__ob__' 上的 dep 依赖列表。

💡 __ob__ 的作用也可以用来标记当前 value 是否已经被 Observer 转换成了响应式数据。也就是说，所有被侦测了变化的数据身上都会有一个 __ob__ 属性来表示它们是响应式的。


💡 value 被标记了 __ob__ ，所以可以直接通过 value.__ob__ 来访问 observer 实例，如果是Array 拦截器，也可以直接通过 this.__ob__ 来访问 Observer 实例。


## 九、向数组的依赖发送通知

当侦测到数组发生变化时，会向依赖发送通知。我们只需要在 Observer 实例中拿到 dep 属性，然后直接发送通知：

```jsx
;['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse']
.forEach(method => {
	const original = arrayProto[method]
	def(arrayMethods, method, function mutator(...args) {
			const ob = this.__ob__
			ob.dep.notify() // 向依赖发送消息
			return original.apply(this, args)
		},)
	})
})
```

## 十、侦测数组中元素的变化

我们需要在 Observer 中新增一些处理，让它可以将 Array 也转换成响应式的：

```jsx
export class Observer {
  constructor(value) {
    this.value = value
    this.dep = new Dep()
		def(value, '__ob__', this)

    if(Array.isArray(value)){
      this.observeArray(value)
    } else {
      this.walk(value)
    }
  }
}
// 侦测 Array 中的每一项
observeArray(items) {
	for(let i = 0, l = items.length; i < l; i++) {
		observe(items[i])
	}
}
```

observe 函数就是将数组中的每个元素都执行一遍 new Observe。

## 十一、侦测新增元素的变化

数组中有些方法如 push、unshift、splice 是新增元素的，我们需要将新增的元素也转换成响应式的来侦测变化。

只要获取新增的元素，然后用 Observer 来侦测它们。

第一步，获取新增的元素：

```jsx
;['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse']
.forEach(method => {
	const original = arrayProto[method]
	def(arrayMethods, method, function mutator(...args) {
			const ob = this.__ob__
			// 新增
			let inserted
			switch(method) {
				case 'push':
				case 'unshift':
					inserted = args
					break
				case 'splice':
					inserted = args.slice(2)
					break
			}
			ob.dep.notify()
			return original.apply(this, args)
		},)
	})
})
```

第二步，使用 Observer 侦测新元素

我们知道 Observer 会将自身的实例附加到 value 的 __ob__ 属性上。所有被侦测了变化的数据都有一个 __ob__ 属性，数组元素也不例外。

因此我们可以在拦截器中通过 this 访问到 __ob__，然后调用其上的 observeArray 方法就可以了。

```jsx
;['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse']
.forEach(method => {
	const original = arrayProto[method]
	def(arrayMethods, method, function mutator(...args) {
			const ob = this.__ob__
			let inserted
			switch(method) {
				case 'push':
				case 'unshift':
					inserted = args
					break
				case 'splice':
					inserted = args.slice(2)
					beeak
			}
			if(inserted) ob.observeArray(inserted) // 新增
			ob.dep.notify()
			return original.apply(this, args)
		},)
	})
})
```
```

## 十二、关于 Array 的问题

对 Array 的变化侦测是通过拦截原型的方式实现的，所有有些像 this.list[0] = 2，这种变化是不会被侦测到的。还有 this.list.length = 0

## 十三、总结

- Array 是通过方法来改变内容的，所以我们创建拦截器去覆盖数组原型的方式来追踪变化。
- 为了不污染全局的 Array.prototype，我们在 Observe 中值针对那些需要侦测变化的数组使用 __proto__ 来覆盖原型方法，但 __proto__ 不是标准属性，针对那些不支持这个属性的浏览器，会直接循环拦截器，把拦截器中的方法直接设置到数组身上来拦截 Array.prototype 上的原生方法。
- Array 收集依赖的方式和 Object 一样，都是在 getter 中收集，但是由于依赖的位置不同，数组要在拦截器中向依赖发消息，所以依赖不能像 Object 一样保存在 defineReactive 中，而是把依赖保存在了 Observe 实例上。
- 在 Observe 中，我们对每个侦测了变化的数据都标记 __ob__，并把 this （Observe 实例）保存在 __ob__ 上，有两个作用，一方面是标记数据是否被侦测了变化，另一方面是为了便于通过数据取到 __ob__，从而拿到 Observe 实例上保存的依赖。当拦截到数组发生变化时，向依赖发送通知。
- 除了侦测数组自身的变化，数组中元素发生变化也要被侦测到。我们在 Observe 中判断如果当前被侦测的数据是数组，则调用 observeArray 方法将数组上的每一个元素都转换成响应式的并侦测变化。
- 除了侦测已有数据，当调用push、unshift、splice等方法向数组新增元素时，这些元素也要被侦测到。我们使用当前操作数组的方法来进行判断，如果是这几个方法，则从参数中将新增数据提取出来，然后使用 observeArray 方法对新增数据进行变化侦测。