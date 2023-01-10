---
date: 2022-04-18
title: 【深入浅出 Vue.js】实例方法与全局API的实现原理
tags: 
  - Vue
---


```jsx
import { initMixin } from './init'
import { stateMixin } from './state'
import { renderMixin } from './render'
import { eventsMixin } from './events'
import { lifecycleMixin } from './lifecycle'
import { warn } from '../util/index'

function Vue (options) {
  if (process.env.NODE_ENV !== 'production' &&
    !(this instanceof Vue)
  ) {
    warn('Vue is a constructor and should be called with the `new` keyword')
  }
  this._init(options)
}

initMixin(Vue)
stateMixin(Vue)
eventsMixin(Vue)
lifecycleMixin(Vue)
renderMixin(Vue)

export default Vue
```

Vue 构造函数分别调用了五个函数，函数的作用就是向 Vue 的原型中挂载方法。

## 一、数据相关的实例方法

数据相关的实例方法有3个：vm.$watch、vm.$set、vm.$delete

```jsx
import { set, del } from '../observer/index'

export function statemixin(Vue) {
	Vue.prototype.$set = set
  Vue.prototype.$delete = del
	Vue.prototype.$watch = function (
    expOrFn: string | Function,
    cb: any,
    options?: Object
  ) {}
}
```

## 二、事件相关的实例方法

事件相关的实例方法有4个：vm.$on、vm.$off、vm.$once、vm.$emit，

### 1、vm.$on

用法：监听当前实例上的自定义事件，事件可以由 vm.$emit 触发，回调函数会接受所有传入事件所触发的函数的额外参数。

原理：当 event 参数为数组时，需要遍历数组，将其中每一项递归调用 vm.$on，使回调可以被注册到数组中每项事件名所指定的事件列表中。vm._events 是一个对象，用来存储事件。我们使用事件名（event）从 vm._events 中取出事件列表，如果列表不存在，则使用空数组初始化，再将回调函数添加到事件列表中。


> vm._events 是在执行 new Vue( ) 时，Vue 执行 this._init 方法进行一系列初始化操作，其中就会在 Vue.js 的实例上创建一个 _events 属性，用来存储事件。



```jsx
Vue.prototype.$on = function (event: string | Array<string>, fn: Function): Component {
    const vm: Component = this
    if (Array.isArray(event)) {
      for (let i = 0, l = event.length; i < l; i++) {
        vm.$on(event[i], fn)
      }
    } else {
      (vm._events[event] || (vm._events[event] = [])).push(fn)
      // optimize hook:event cost by using a boolean flag marked at registration
      // instead of a hash lookup
      if (hookRE.test(event)) {
        vm._hasHookEvent = true
      }
    }
    return vm
  }
```

### 2、vm.$off

用法：移除自定义事件监听器。

- 如果没有提供任何参数，则移除所有的事件监听器。
    
    只需要重置 vm._events 属性。如果事件名是数组，需要想数组遍历一遍，每一项都调用 vm.$off。
    
- 如果只提供了事件，则移除该事件所有的监听器。
    
    首先，判断如果这个事件没有被监听，也就是说在 vm._events 中找不到任何监听器，直接退出即可。否则，判断是否只有一个参数，如果是，只需要从 this._events 中将 event 重置。
    
- 如果同时提供了事件与回调，则只移除这个回调的监听器。
    
    只需要使用参数中提供的事件名从 vm._events 上取出事件列表，然后从列表中找到与参数中提供的回调函数相同的那个函数，并将它从列表中删除。
    

```jsx
Vue.prototype.$off = function (event?: string | Array<string>, fn?: Function): Component {
    const vm: Component = this
    // all
    if (!arguments.length) {
      vm._events = Object.create(null)
      return vm
    }
    // array of events
    if (Array.isArray(event)) {
      for (let i = 0, l = event.length; i < l; i++) {
        vm.$off(event[i], fn)
      }
      return vm
    }
    // specific event
    const cbs = vm._events[event]
    if (!cbs) {
      return vm
    }
    if (!fn) {
      vm._events[event] = null
      return vm
    }
    // specific handler
    let cb
    let i = cbs.length
    while (i--) {
      cb = cbs[i]
      if (cb === fn || cb.fn === fn) {
        cbs.splice(i, 1)
        break
      }
    }
    return vm
  }
```


> 代码中遍历是从后向前循环，这样在列表中移除当前监听器时，不会影响列表中未遍历到的监听器的位置。



### 3、vm.$once

用法：监听一个自定义事件，但只触发一次，在第一次触发之后移除监听器。

思路：在 vm.$once 中调用 vm.$on 来实现监听自定义事件的功能，当自定义事件触发后会执行拦截器，将监听器从事件列表中移除。

```jsx
Vue.prototype.$once = function (event: string, fn: Function): Component {
    const vm: Component = this
    function on () {
      vm.$off(event, on)
      fn.apply(vm, arguments)
    }
    on.fn = fn
    vm.$on(event, on)
    return vm
  }
```

将函数 on 注册到事件中，当自定义事件被触发的时候，会先执行 on 函数（这个函数中，会使用 vm.$off 将自定义事件移除），然后手动执行函数 fn，并将参数 arguments 传递给函数 fn。

***注意：***

on.fn = fn，在移除监听器时，需要将用户提供的监听器函数与列表中的监听器函数进行对比，相同部分会移除，但是我们是将自定义的拦截器 on 代替监听器注入到事件列表中的，所以这和用户提供的函数 fn 是不同的，此时用 vm.$off 移除监听器会失败。
所以我们将用户提供的原始监听器保存到拦截器的 fn 属性中。在 vm.$off 中，有这么一段代码：

```jsx
if(cb === fn || cb.fn === fn) {
	...
}
```

### 4、vm.$emit

用法：触发当前实例上的事件，附加的参数都会传给监听器回调。

思路：使用事件名从 vm._events 中取出对应的事件监听器回调函数列表，一次执行列表中的监听器回调并将参数传递给监听器回调。

```jsx
Vue.prototype.$emit = function (event: string): Component {
    const vm: Component = this
    let cbs = vm._events[event]
    if (cbs) {
      cbs = cbs.length > 1 ? toArray(cbs) : cbs
      const args = toArray(arguments, 1)
      const info = `event handler for "${event}"`
      for (let i = 0, l = cbs.length; i < l; i++) {
        try {
					cbs[i].apply(vm, args)
				} catch (e) {
					handleError(e,vm,`event handler for ${event}`)
				}
      }
    }
    return vm
  }
```

## 三、生命周期相关的实例方法

与生命周期相关的实例方法相关的方法有4个，vm.$mount、vm.$forceUpdate、vm.$nextTick、vm.$destroy，其中 vm.$forceUpdate 和 vm.$destroy是从lifecycleMixin 中挂载到 Vue 构造函数的 prototype 属性上的。

vm.$nextTick 方法是从 renderMixin 中挂载到 Vue 的构造函数的 prototype 属性上的。

vm.$mount 方法是在跨平台的代码中挂载到 Vue 的构造函数的 prototype 属性上的。

### 1、vm.$forceUpdate

作用：迫使 Vue.js 重新渲染，它仅仅影响实例本身以及插入插槽内容的子组件，而非所有组件。

做法：执行实例 watcher 的 update 方法。

```jsx
Vue.prototype.$forceUpdate = function () {
  const vm: Component = this
  if (vm._watcher) {
    vm._watcher.update()
  }
}
```

### 2、vm.$destroy

作用：完全销毁一个实例，会清理该实例与其他实例的连接，并解绑其全部指令及监听器，同时出发 beforeDestroy 和 destroyed 的钩子函数。


> 一般我们会用 v-for 和 v-if 等指令以数据驱动的方式控制组件的生命周期。



做法：在组件销毁之前触发 beforeDestroy 钩子函数，使用 _isBeingDestroyed 避免重复销毁。

接下来执行销毁的逻辑：

首先，清理当前组件与父组件之间的连接，只需要将当前组件实例从父组件实例的 $children 属性中删除即可。接着，销毁实例上的所有 watcher，也就是将实例上的所有依赖追踪断掉。

销毁实例上的所有 watcher 只需要调用 vm._watcher.teardown( )，vm._watcher 是在初始化实例的时候处理的，Vue.js2.0 开始，变化侦测的粒度为中等粒度，只会通知到组件级别，然后组件使用虚拟 DOM 进行重新渲染。


> 怎么通知到组件级别？
在 Vue.js 实例上有一个 _watcher 属性，它会监听这个组件中用到的所有状态，即这个组件内的所有状态的依赖列表都会收集到 vm._watcher 中。状态发生变化时，会通知到 vm._watcher，然后这个 watcher 再调用虚拟 DOM 进行重新渲染。



除了从状态的依赖列表中删除 Vue.js 实例上的 watcher 实例是不够的，我们还需要销毁用户使用 vm.$watch 所创建的 watcher 实例。

Vue.js 的做法是当执行 new Vue( ) 时，在初始化的流程中，在 this 上添加一个 _watchers 属性（[]），然后每当创建 watcher 实例时，都会将 watcher 实例添加到 vm._watchers 中。所以只需要遍历 vm._watchers 就可以并执行每一项 watcher 实例的 teardown 方法，就可以将 watcher 实例从它所监听的状态的依赖列表中移除。

```jsx
Vue.prototype.$destroy = function () {
  const vm: Component = this
  if (vm._isBeingDestroyed) {
    return
  }
  callHook(vm, 'beforeDestroy')
  vm._isBeingDestroyed = true
  // remove self from parent
  const parent = vm.$parent
  if (parent && !parent._isBeingDestroyed && !vm.$options.abstract) {
    remove(parent.$children, vm)
  }
  // teardown watchers
  if (vm._watcher) {
    vm._watcher.teardown()
  }
  let i = vm._watchers.length
  while (i--) {
    vm._watchers[i].teardown()
  }
  // remove reference from data ob
  // frozen object may not have observer.
  if (vm._data.__ob__) {
    vm._data.__ob__.vmCount--
  }
  // call the last hook...
  vm._isDestroyed = true
  // invoke destroy hooks on current rendered tree
  vm.__patch__(vm._vnode, null)
  // fire destroyed hook
  callHook(vm, 'destroyed')
  // turn off all instance listeners.
  vm.$off()
  // remove __vue__ reference
  if (vm.$el) {
    vm.$el.__vue__ = null
  }
  // release circular reference (#6759)
  if (vm.$vnode) {
    vm.$vnode.parent = null
  }
}
```

### 3、vm.$nextTick

nextTick 接收一个回调函数作为参数，它的作用是将回调延迟到下次 DOM 更新周期之后执行。


> vm.$nextTick 与 全局方法 Vue.$nextTick 一样， 不同的是回调的 this 自动绑定到调用它的实例上。如果没有提供回调且在支持 Promise 的环境中，则返回一个 Promise。



这个 api 的主要使用场景在于：当更新了状态后，需要对新 DOM 做一些操作，但是这个时候我们还获取不到更新后的 DOM，因为还没有重新渲染。所以我们要等到下次 DOM 更新之后执行我们要执行的逻辑。

**下次 DOM 更新周期是指？**

在 Vue.js 中，当状态发生变化时，watcher 会得到通知，然后触发虚拟 DOM 的渲染流程。而 watcher 触发渲染这个操作是异步的。Vue.js中有一个队列，每当需要渲染时，会将 watcher 推送到这个队列中，在下一次事件循环中再让 watcher 触发渲染的流程。

1. 为什么要使用异步更新队列？
    
    Vue.js 2.0 开始使用虚拟 DOM 进行渲染，变化侦测的通知只发送到组件，组件内用到的所有状态的变化都会通知到同一个 watcher，然后虚拟 DOM 会对整个组件进行 diff 并更改 DOM。
    
    也就是说，如果同一轮事件循环中如果组件内有两个数据发生了变化，那么组件的 watcher 会收到两份通知，从而进行两次渲染，这是不必要的。所以需要等所有状态都修改完毕后，一次性将整个组件 DOM 渲染到最新的即可。
    
2. 什么是事件循环？
    
    JavaScript 是一门单线程且非阻塞的脚本语言，意味着它的代码在执行的任何时候都只有一个主线程来处理所有任务。而非阻塞是指当代码需要处理异步任务时，主线程会挂起这个任务，当异步任务处理完毕后，主线程再根据一定规则去执行相应回调。
    
    事实上，异步任务有不同的线程处理完毕后，会被加入一个队列中，我们叫它事件队列。被放入事件队列中的事件不会立刻执行回调，而是等待当前执行栈中的所有任务执行完毕后，主线程会去查找事件队列中是否有需要执行的异步任务。
    
    异步任务分为宏任务和微任务， 不同类型的任务会被分配到不同的任务队列中。
    
    当执行栈所有任务都完成后，会先检查微任务队列中是否有事件存在，如果有，依次执行完微任务队列中事件对应的回调，直到空。然后去宏任务队列汇总取出一个事件，把对应的回调加入当前执行栈。一直循环，这个过程称为“事件循环”。
    
    微任务：
    
    - Promise.then
    - MutationObserver
    - Object.observe
    - process.nextTick
    
    宏任务：
    
    - setTimeout
    - setInterval
    - setImmediate
    - MessageChannel
    - requestAnimationFrame
    - I/O
    - UI事件及哦啊胡
3. 什么是执行栈
    
    当我们执行一个方法时，JavaScript 会生成一个与这个方法对应的执行环境，我们称为执行上下文。环境中有这个方法的私有作用域、上层作用域的指向、方法的参数、私有作用域中定义的变量以及 this 对象。这个环境会被添加到一个栈中，这个栈就是执行栈。
    

**所以“下次 DOM 更新周期”是指下次微任务执行时更新 DOM。**

vm.$nextTick 会默认将回调添加到微任务中，只有特殊情况下会降级成宏任务。


> 如果使用 vm.$nestTick 来获取更新后的 DOM，需要注意顺序问题。因为不论是更新 DOM 的回调还是使用 vm.$nextTick 注册的回调，都是向微任务队列中添加任务，所以哪个先添加就先执行哪个任务。



比如我们要在 vm.$nextTick 中获取更新后的 DOM，一定要在更改数据的后面使用 vm.$nextTick 注册回调，如下：

```jsx
new Vue({
	methods: {
		example() {
			this.message = 'changed' // 先修改，更新 DOM 的回调就先存入微任务
			this.$nextTick(() => {
				... // 再注册 nextTick 回调，这个晚于更新 DOM 的回调执行。
			})
		}
	}
})
```

如果我们想调换顺序，先注册回调，再修改数据，那么修改数据应该放在宏任务中。因为宏任务的执行要比微任务晚，所以即使是先注册，也是晚于更新 DOM 的回调执行。

```jsx
new Vue({
	methods: {
		example() {
			setTimeout(() => {
				this.message = 'changed' // 宏任务晚执行
			}, 0)
			this.$nextTick(() => {
				... // 微任务早执行
			})
		}
	}
})
```

vm.$nextTick 和 Vue.nextTick 是相同的，所以抽象成了 nextTick 方法供两个方法共用。

### 接下来看 nextTick 的实现原理

由于 vm.$nextTick 会将回调添加到任务队列中延迟执行，所以在回调执行前如果反复调用 vm.$nextTick，Vue.js 并不会反复添加，而只会向任务队列中添加一个任务。此外，Vue.js 内部有一个列表来存储 vm.$nextTick 参数中提供的回调。在一轮事件循环中，vm.$nextTick 只会向任务队列中添加一个任务，当任务触发时，一次执行列表中的所有回调并清空列表。

```jsx
const callbacks = []
let pending = false

function flushCallbacks () {
  pending = false
  const copies = callbacks.slice(0)
  callbacks.length = 0
  for (let i = 0; i < copies.length; i++) {
    copies[i]()
  }
}

let microTimerFunc
const p = Promise.resolve()
microTimerFunc = () => {
  p.then(flushCallbacks)
}

export function nextTick (cb?: Function, ctx?: Object) {
  callbacks.push(() => {
    if (cb) {
      cb.call(ctx)
    }
  })
  if (!pending) {
    pending = true
    microTimerFunc()
  }
}
```

上述代码中，我们通过  callbacks 存储用户注册的回调，声明变量 pending 来标记是否已经向任务队列中添加了一个任务，声明 flushCallbacks 即需要被注册的任务，当这个函数被触发，会将 callbacks 中的所有函数依次执行，然后清空 callbacks。

整体流程如下：

当 nextTick 被调用时，会将回调函数添加到 callbacks 中，如果此时是本轮事件循环第一次使用 nextTick，那么需要向任务队列中添加此任务，否则，只需要将回调函数 push 到 callbacks 中等待被执行即可。如果任务被执行，则需要清空 callbacks 中的所有回调。


> 在 Vue.js2.4 之前，nextTick 方法在任何地方都使用微任务。但微任务优先级太高，在某些场景下可能会出现问题，所以 Vue.js 提供了在特殊场合下可以强制使用宏任务的方法。



所以，在 Vue.js 中，会优先使用 microTimerFunc（原理是Promise.then） 来处理，如果浏览器不支持时，会降级成 macroTimerFunc，macroTimerFunc 中包含三个宏任务的先后使用顺序：

优先判断 setImmediate 是否可用，它存在兼容性问题，只能在 IE 中使用，再判断 MessageChannel 来判断，如果也不支持，最后会使用 setTimeout 来将回调添加到宏任务队列中。

**完整代码如下：**

```jsx
const callbacks = []
let pending = false

function flushCallbacks () {
  pending = false
  const copies = callbacks.slice(0)
  callbacks.length = 0
  for (let i = 0; i < copies.length; i++) {
    copies[i]()
  }
}

let timerFunc

if (typeof Promise !== 'undefined' && isNative(Promise)) {
  const p = Promise.resolve()
  timerFunc = () => {
    p.then(flushCallbacks)
    if (isIOS) setTimeout(noop)
  }
  isUsingMicroTask = true
} else if (!isIE && typeof MutationObserver !== 'undefined' && (
  isNative(MutationObserver) ||
  // PhantomJS and iOS 7.x
  MutationObserver.toString() === '[object MutationObserverConstructor]'
)) {
  // Use MutationObserver where native Promise is not available,
  // e.g. PhantomJS, iOS7, Android 4.4
  // (#6466 MutationObserver is unreliable in IE11)
  let counter = 1
  const observer = new MutationObserver(flushCallbacks)
  const textNode = document.createTextNode(String(counter))
  observer.observe(textNode, {
    characterData: true
  })
  timerFunc = () => {
    counter = (counter + 1) % 2
    textNode.data = String(counter)
  }
  isUsingMicroTask = true
} else if (typeof setImmediate !== 'undefined' && isNative(setImmediate)) {
  // Fallback to setImmediate.
  // Technically it leverages the (macro) task queue,
  // but it is still a better choice than setTimeout.
  timerFunc = () => {
    setImmediate(flushCallbacks)
  }
} else {
  // Fallback to setTimeout.
  timerFunc = () => {
    setTimeout(flushCallbacks, 0)
  }
}

export function nextTick (cb?: Function, ctx?: Object) {
  let _resolve
  callbacks.push(() => {
    if (cb) {
      try {
        cb.call(ctx)
      } catch (e) {
        handleError(e, ctx, 'nextTick')
      }
    } else if (_resolve) {
      _resolve(ctx)
    }
  })
  if (!pending) {
    pending = true
    timerFunc()
  }
  // $flow-disable-line
  if (!cb && typeof Promise !== 'undefined') {
    return new Promise(resolve => {
      _resolve = resolve
    })
  }
}
```

### 4、vm.$mount

这个方法并不常用，因为我们会在实例化 Vue.js 时设置 el 选项，会自动把 Vue.js 实例挂载到 DOM 元素上。它的本质依然是使用了 vm.$mount 去挂载到相关的 DOM 上。

参数：{Element | string} [elementOrSelector]

返回值：实例自身

用法：如果在实例化 Vue.js 实例时没有收到了选项，则该实例处于 “未挂载” 状态，没有关联的 DOM 元素。可以使用 vm.$mount 手动挂载一个实例。如果没有提供 elementOrSelector 参数，模板将被渲染为文档之外的元素，并且必须使用原生 DOM 的 API 把它插入文档中。


> 这个方法放回实例自身，因此可以链式调用其他实例方法。



在 Vue.js 的不同构建版本中，vm.$mount 的表现都不一样。差异主要体现在完整版(vue.js)和只包含运行时版本(vue.runtime.js)之间。

两者的差异在于是否有编译器，而是否有编译器的差异主要在于 vm.$mount 方法的表现形式。

上面是只包含运行时的构建版本中 vm.$mount 的表现形式，而在完整版中，vm.$mount 首先会检查 template 或 el 选项所提供的模板是否已经转换成渲染函数(render 函数)。如果没有，则立即进入编译过程，将木夹板编译成渲染函数，完成之后再进入挂载与渲染的流程中。


> 只包含运行时版本的 vm.$mount 没有编译步骤，会默认实例上已经存在渲染函数，如果不存在，会设置一个。



***下面介绍完整版 vm.$mount 实现原理：***

完整版的 vm.$mount 包含只包含运行时版本的 vm.$mount 方法，所以先介绍有差异的这部分。

### （一）完整版独有的逻辑：

通过函数劫持的方式，在原始功能上增加一些新的功能，就是说在完整版中需要在核心功能上增加编译功能。


> 核心功能是指 Vue.prorotype.$mount 的功能，是完整版和只包含运行时版本都有的功能。



```jsx
const mount = Vue.prototype.$mount
Vue.prorotype.$mount = function(el){
	el = el && query(el)
	return mount.call(this, el)
}
function query(el) {
	if(typeof el === 'string'){
		const selected = document.querySelector(el)
		if(!selected) {
			return document.createElement('div')	
		}
		return selected
	} else {
		return el
	}
}
```

首先判断 el 类型，

如果是字符串，使用 document.querySelector 获取 DOM 元素，如果获取不到，创建一个空 div。如果不是字符串，则认为它是元素类型，直接返回 el（如果没传递则返回 undefined）。

接下来是完整版 vm.$mount 最主要的功能：编译器

首先判断 Vue.js实例中是否存在渲染函数，存在的话，直接使用。只有不存在时，才会将模板编译成渲染函数。接下来，如果用户没有通过 template 选项设置模板，那么会从 el 选项中获取 HTML 字符串当做模板。

如果提供了 template 选项，进行下面判断：

1. 如果是字符串并且以 ‘#’ 开头，则它将被用作选择符，可以从选择符中直接获取模板
    
    ```jsx
    function **idToTemplate(id){
    	const el = quety(id)
    	return el && el.innerHTML
    }**
    ```
    
2. 如果是字符串但不是以 ‘#’ 开头，则直接作为模板使用。
3. 如果不是字符串，则判断是否是一个 DOM 元素，如果是则使用 DOM 元素的 innerHTML 作为模板。
4. 如果都不是，则无效。

```jsx
const mount = Vue.prototype.$mount
Vue.prorotype.$mount = function(el){
	el = el && query(el)
	const options = this.$options
	if(!options.render){
		// 将模板编译成渲染函数并赋值给 options.render
		let template = options.template
		if(template) {
			**if (typeof template === 'string') {
        if (template.charAt(0) === '#') {
          template = idToTemplate(template)
          /* istanbul ignore if */
          if (process.env.NODE_ENV !== 'production' && !template) {
            warn(
              `Template element not found or is empty: ${options.template}`,
              this
            )
          }
        }
      } else if (template.nodeType) {
        template = template.innerHTML
      } else {
        if (process.env.NODE_ENV !== 'production') {
          warn('invalid template option:' + template, this)
        }
        return this
      }**
		} else if(el) {
			template = getOuterHTML(el)
		}
	}
	return mount.call(this, el)
}

function getOuterHTML (el: Element): string {
  if (el.outerHTML) {
    return el.outerHTML
  } else {
    const container = document.createElement('div')
    container.appendChild(el.cloneNode(true))
    return container.innerHTML
  }
}
```

做完 template 的判断后，接下来需要将模板编译成渲染函数。

```jsx
const mount = Vue.prototype.$mount
Vue.prorotype.$mount = function(el){
	el = el && query(el)
	const options = this.$options
	if(!options.render){
		// 将模板编译成渲染函数并赋值给 options.render
		let template = options.template
		if(template) {
			**if (typeof template === 'string') {
        if (template.charAt(0) === '#') {
          template = idToTemplate(template)
          /* istanbul ignore if */
          if (process.env.NODE_ENV !== 'production' && !template) {
            warn(
              `Template element not found or is empty: ${options.template}`,
              this
            )
          }
        }
      } else if (template.nodeType) {
        template = template.innerHTML
      } else {
        if (process.env.NODE_ENV !== 'production') {
          warn('invalid template option:' + template, this)
        }
        return this
      }**
		} else if(el) {
			template = getOuterHTML(el)
		}
	}
	// 新增以下编译相关的逻辑
	**if (template) {
    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      mark('compile')
    }

    const { render, staticRenderFns } = compileToFunctions(template, {
      outputSourceRange: process.env.NODE_ENV !== 'production',
      shouldDecodeNewlines,
      shouldDecodeNewlinesForHref,
      delimiters: options.delimiters,
      comments: options.comments
    }, this)
    options.render = render
    options.staticRenderFns = staticRenderFns

    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      mark('compile end')
      measure(`vue ${this._name} compile`, 'compile', 'compile end')
    }
  }**
	return mount.call(this, el)
}
```

通过执行 **compileToFunctions 函数可以将模板编译成渲染函数并设置到 this.$options 上。**

```jsx
function **compileToFunctions(template, options, vm) {
	options = extend({}, options)
	
	// 检查缓存
	const key = options.delimiters ? String(options.delimiters) + template : template
	if(cache[key]) {
		return cache[key]
	}

	// 编译
	const compiled = compile(template, options)
	
	// 将代码字符串转换为函数
	const res = {}
	res.render = createFunction(compiled.render)

	return (cache[key] = res)
}**
```

### （二）只包含运行时版本的 vm.$mount 的实现原理

只包含运行时版本的 vm.$mount 包含了 vm.$mount 方法的核心功能。

```jsx
Vue.prototype.$mount = function(el){
	el = el && inBrowser ? query(el) : undefined
	return mountComponent(this, el)
}
```

$mount 方法将 ID 转换为 DOM 元素后，使用 mountComponent 函数将 Vue.js 实例挂载到 DOM 元素上（即将模板渲染到指定的 DOM 元素中）而且是持续性的（即状态发生变化，依然可以渲染到指定的 DOM 元素）。

这里需要开启 watcher，watcher 将持续观察模板中会用到的所有的数据（状态），当这些数据被修改时它将得到通知，从而进行渲染操作。

在挂载实例之前会触发 beforeMount 钩子函数，挂载后会触发 mounted 钩子函数。

## 四、全局 API 的实现原理

### 1、Vue.extend

参数：{Object} options

用法：使用 Vue 构造器创建一个子类，继承 Vue 身上的一些功能。其参数是一个包含“组件选项”的对象，data 选项必须是函数。


> 多次调用 Vue.extend 会返回同一个结果，为了性能，其增加了缓存策略。



```jsx
Vue.extend = function (extendOptions: Object): Function {
    extendOptions = extendOptions || {}
    const Super = this
    const SuperId = Super.cid
    const cachedCtors = extendOptions._Ctor || (extendOptions._Ctor = {})
    if (cachedCtors[SuperId]) {
      return cachedCtors[SuperId]
    }

    const name = extendOptions.name || Super.options.name
    if (process.env.NODE_ENV !== 'production' && name) {
      validateComponentName(name)
    }

    const Sub = function VueComponent (options) {
      this._init(options)
    }

    // cache constructor
    cachedCtors[SuperId] = Sub
    return Sub
  }
}
```

上面代码实现了子类，此时还不具备 Vue 的能力，接下来继承 Vue 的能力：

1. 继承父类的原型
    
    ```jsx
    Sub.prototype = Object.create(Super.prototype)
    Sub.prototype.constructor = Sub
    Sub.cid = cid++ // 表示每个类的唯一标识
    ```
    
2. 将父类的 options 选项继承到子类中
    
    ```jsx
    Sub.options = mergeOptions(
      Super.options,
      extendOptions
    )
    Sub['super'] = Super
    ```
    
3. 如果选项中存在 props 属性，则初始化它
    
    初始化 props 的作用是将 key 代理到 _props 中，例如我们访问 vm 上的 name 实际上是访问 Sub.prototype._props.name。
    
    ```jsx
    if (Sub.options.props) {
      initProps(Sub)
    }
    ```
    
4. 如果选项中存在 computed，则初始化它
    
    只需要将 computed 遍历一遍，并将里面的每一项都定义一遍即可。
    
5. 继续将父类中存在的属性依次复制到子类中。
    
    ```jsx
    // allow further extension/mixin/plugin usage
    Sub.extend = Super.extend
    Sub.mixin = Super.mixin
    Sub.use = Super.use
    
    // create asset registers, so extended classes
    // can have their private assets too.
    ASSET_TYPES.forEach(function (type) {
      Sub[type] = Super[type]
    })
    // enable recursive self-lookup
    if (name) {
      Sub.options.components[name] = Sub
    }
    
    // keep a reference to the super options at extension time.
    // later at instantiation we can check if Super's options have
    // been updated.
    Sub.superOptions = Super.options
    Sub.extendOptions = extendOptions
    Sub.sealedOptions = extend({}, Sub.options)
    ```
    

### 2、Vue.nextTick

用法：在下次 DOM 更新循环结束之后执行延迟回调，修改数据之后立即使用这个方法获取更新后的 DOM。

```jsx
Vue.nextTick([callback, context])
```

参数：

- {Function} [callback]
- {Object} [context]

**Vue.nextTick 的实现原理和 vm.$nextTick 一样，**

```jsx
import {nextTick} from '../util/index'
Vue.nextTick = nextTick
```

### 3、Vue.set

用法：设置对象的属性，如果对象是响应式的，确保属性被创建后也是响应式的，同时触发视图更新。这个方法用于避开 Vue 不能检测属性被添加的限制。

```jsx
Vue.set(target, key, value)
```


> 对象不能是 Vue.js 实例或者 Vue.js 实例的根数据对象。



参数：

- {Object | Array} target
- {string | number} key
- {any} value

**Vue.set 的实现原理和 vm.$set 一样，**

```jsx
import {set} from '../observer/index'
Vue.set = set
```

### 4、Vue.delete

用法：删除对象的属性，如果对象是响应式的，确保删除能触发更新视图。这个方法主要用于避开 Vue.js 不能检测到属性被删除的限制。

```jsx
Vue.delete(target, key)
```

参数：

- {Object | Array} target
- {string | number} key/index

### 5、Vue.directive

用法：注册或获取全局指令

```jsx
Vue.directive(id, [definition])
```

参数：

- {string} id
- {Function | Object} [definition]

有时候需要对普通 DOM 元素进行底层操作，就会用到自定义指令。

Vue.directive 注册指令和获取指令取决于是否传了 definition，如果没传，则使用 id 从 this.options['directive'] 中读出指令并将它返回。如果 definition 存在，说明是注册操作，继续判断 definition 参数的类型是否是函数：

如果是函数，则默认监听 bind 和 update 两个事件。如果不是函数，说明是用户自定义的指令对象。则直接将对象保存在 this.options['directive'] 上即可。

```jsx
Vue.options = Object.create(null)
Vue.options['directive '] = Object.create(null)

Vue.directive = function (id, definition) {
	if(!definition) {
		return this.options['definition'][id]
	} else {
		if(typeof definition === 'function') {
			definition = {bind: definition, update: definition}
		}
		this.options['definition'][id] = definition
		return definition
	}
}
```

### 6、Vue.filter

用法：注册或获取全局过滤器

```jsx
Vue.filter(id, [definition])
```

参数：

- {string} id
- {Function | Object} [definition]

主要用于一些常见的文本格式化，过滤器可以用在两个地方：双花括号差值和 v-bind 表达式。

```jsx
{{message | capitalize}}

<div v-bind:id="rawId | formatId"></div>
```

原理和 Vue.directive 类似：

```jsx
Vue.options['filters'] = Object.create(null)

Vue.filter = function (id, definition) {
	if(!definition) {
		return this.options['filters'][id]
	} else {
		this.options['filters'][id] = definition
		return definition
	}
}
```

### 7、Vue.component

用法：注册或获取全局组件。

```jsx
Vue.component(id, [ ])
```

参数：

- {string} id
- {Function | Object} [definition]

原理和 Vue.directive 类似：

```jsx
Vue.options['components '] = Object.create(null)

Vue.component = function (id, definition) {
	if(!definition) {
		return this.options['components'][id]
	} else {
		if(isPlainObject(definition)) {
			definition.name = definition.name || id
			definition = Vue.extend(definition)
		}
		this.options['components'][id] = definition
		return definition
	}
}
```

因为 Vue.component 是注册组件，组件其实是一个构造函数，所以 definition 参数也必须处理成构造器。

Vue.directive、Vue.filter、Vue.component 三个方法的实现比较类似，源码中是放在一起的：

```jsx
export const ASSET_TYPES = [
  'component',
  'directive',
  'filter'
]
ASSET_TYPES.forEach(type => {
  Vue[type] = function (
    id: string,
    definition: Function | Object
  ): Function | Object | void {
    if (!definition) {
      return this.options[type + 's'][id]
    } else {
      /* istanbul ignore if */
      if (process.env.NODE_ENV !== 'production' && type === 'component') {
        validateComponentName(id)
      }
      if (type === 'component' && isPlainObject(definition)) {
        definition.name = definition.name || id
        definition = this.options._base.extend(definition)
      }
      if (type === 'directive' && typeof definition === 'function') {
        definition = { bind: definition, update: definition }
      }
      this.options[type + 's'][id] = definition
      return definition
    }
  }
})
```

### 8、Vue.use

用法：安装 Vue.js 插件。如果插件是一个对象，必须提供 install 方法。如果插件是一个函数，它会被作为 install 方法。调用 install 方法时，会将 Vue 作为参数传入。

```jsx
Vue.use(plugin)
```


> install 方法被同一个插件多次调用时，插件也只会被安装一次。



参数：

- {object | Function} plugin
    
    
    > 参数可以是 install 方法，也可以是一个包含 install 方法的对象。
    
    
    

```jsx
Vue.use = function (plugin: Function | Object) {
  const installedPlugins = (this._installedPlugins || (this._installedPlugins = []))
  if (installedPlugins.indexOf(plugin) > -1) {
    return this
  }

  // additional parameters
  const args = toArray(arguments, 1)
  args.unshift(this)
  if (typeof plugin.install === 'function') {
    plugin.install.apply(plugin, args)
  } else if (typeof plugin === 'function') {
    plugin.apply(null, args)
  }
  installedPlugins.push(plugin)
  return this
}
```

1. 首先判断插件是否应被注册过，如果被注册过，直接终止方法执行。
2. 执行用户编写的插件，并将 args 作为参数传入。
3. 将插件添加到 installedPlugins 中。


> args 第一个参数需要设置成 Vue，其余参数是注册插件时传入的参数。



### 9、Vue.mixin

用法：全局注册一个混入，影响注册之后创建的每个 Vue.js 实例。因为该方法会更改 Vue.options 属性，会将用户传入的对象与 Vue.js 自身的 options 属性合并在一起。

```jsx
Vue.mixin(mixin)
```

```jsx
export function initMixin(Vue){
	Vue.mixin = function(mixin){
		this.options = mergeOptions(this.options, mixin)
		return this
	}
}
```

### 10、Vue.compile

用法：编译模板字符串并返回包含渲染函数的对象。

```jsx
var res = Vue.compile('<div><span>{{msg}}</span></div>')
new Vue({
	data: {
		msg: 'hello'
	},
	render: res.render
})
```


> 和 vm.$mount 类似，vm.compile 方法只有在完整版中。

