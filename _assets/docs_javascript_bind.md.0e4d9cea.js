import{q as n,g as s,L as a}from"./common-874b6af4.js";const t='{"title":"【JavaScript】bind 原理","frontmatter":{"date":"2023-01-11T00:00:00.000Z","title":"【JavaScript】bind 原理","tags":["JavaScript"]},"headers":[{"level":2,"title":"返回函数模拟实现","slug":"返回函数模拟实现"},{"level":2,"title":"传参模拟实现","slug":"传参模拟实现"},{"level":2,"title":"构造函数效果的模拟实现","slug":"构造函数效果的模拟实现"}],"relativePath":"docs/javascript/bind.md","lastUpdated":1674123919314.417}';var p={};const o=[a('<ul><li>bind 方法会创建一个新函数，当这个新函数被调用时，bind 的第一个参数将作为它运行时的 this，之后的一系列参数将作为新函数的参数传入。</li><li>两个特点：返回一个函数、可以传入参数</li></ul><h2 id="返回函数模拟实现"><a class="header-anchor" href="#返回函数模拟实现" aria-hidden="true">#</a> 返回函数模拟实现</h2><div class="language-jsx"><pre><code><span class="token comment">// 第一版Function.prototype.bind = function (context) {</span>\n    <span class="token keyword">let</span> self <span class="token operator">=</span> <span class="token keyword">this</span>\n    <span class="token keyword">return</span> <span class="token keyword">function</span> <span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>\n        <span class="token keyword">return</span> <span class="token function">self</span><span class="token punctuation">.</span><span class="token function">apply</span><span class="token punctuation">(</span>context<span class="token punctuation">)</span>\n    <span class="token punctuation">}</span>\n<span class="token punctuation">}</span>\n\n</code></pre></div><h2 id="传参模拟实现"><a class="header-anchor" href="#传参模拟实现" aria-hidden="true">#</a> 传参模拟实现</h2><p>由于函数可以在 bind 的时候传一部分参数，调用的时候再传剩下的参数，所以实现如下：</p><div class="language-jsx"><pre><code><span class="token class-name">Function</span><span class="token punctuation">.</span>prototype<span class="token punctuation">.</span><span class="token function-variable function">bind</span> <span class="token operator">=</span> <span class="token keyword">function</span> <span class="token punctuation">(</span><span class="token parameter">context</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>\n    <span class="token keyword">let</span> self <span class="token operator">=</span> <span class="token keyword">this</span>\n    <span class="token keyword">let</span> args <span class="token operator">=</span> <span class="token punctuation">[</span><span class="token operator">...</span>arguments<span class="token punctuation">]</span><span class="token punctuation">.</span><span class="token function">slice</span><span class="token punctuation">(</span><span class="token number">1</span><span class="token punctuation">)</span>\n    <span class="token keyword">return</span> <span class="token keyword">function</span> <span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">{</span>\n        <span class="token keyword">return</span> <span class="token function">self</span><span class="token punctuation">.</span><span class="token function">apply</span><span class="token punctuation">(</span>context<span class="token punctuation">,</span> <span class="token punctuation">[</span><span class="token operator">...</span>args<span class="token punctuation">,</span> <span class="token operator">...</span>arguments<span class="token punctuation">]</span><span class="token punctuation">)</span>\n    <span class="token punctuation">}</span>\n<span class="token punctuation">}</span>\n</code></pre></div><h2 id="构造函数效果的模拟实现"><a class="header-anchor" href="#构造函数效果的模拟实现" aria-hidden="true">#</a> 构造函数效果的模拟实现</h2><p>一个绑定函数也能使用 new 操作符创建对象：这种行为就想把原函数当成构造器。提供的 this 值会被忽略，同时调用时的参数也会被提供给模拟函数。</p>',8)];p.render=function(a,t,p,e,c,l){return n(),s("div",null,o)};export{t as __pageData,p as default};
