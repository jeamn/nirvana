import{q as l,g as i,L as p}from"./common-874b6af4.js";const S='{"title":"【浏览器】浏览器解析渲染页面","frontmatter":{"date":"2023-01-10T00:00:00.000Z","title":"【浏览器】浏览器解析渲染页面","tags":["浏览器"]},"relativePath":"docs/browser/rendering.md","lastUpdated":1674123877965.6802}';var e={};const r=[p("<ul><li><p>根据顶部定义的DTD类型进行对应的解析方式</p></li><li><p>渲染进程内部是多线程的，网页的解析将会被交给内部的GUI渲染线程处理</p></li><li><p>浏览器对加载到的资源（HTML、CSS、JavaScript等）进行语法解析，并构建相应的内部数据结构（DOM树、CSS树、render树等）</p><ul><li><p>处理 HTML 标记并构建 DOM 树</p><ul><li><p>首先渲染线程中的HTML解释器，将HTML网页和资源从字节流解释转换成字符流</p></li><li><p>再通过词法分析器将字符流解释成词语</p></li><li><p>之后经过语法分析器根据词语构建成节点</p></li><li><p>最后通过这些节点组建一个DOM树</p></li><li><p><code>注意点1</code>：如果解析 DOM 树过程中遇到的 DOM 节点是 JavaScript 代码，就会调用 JS 引擎对其进行解释执行。此时由于 JS 引擎和 GUI 渲染线程的互斥，GUI 渲染线程就会被挂起，渲染过程停止。</p></li><li><p><code>注意点2</code>：如果 JS 代码的运行对 DOM 进行了修改，那么 DOM 的构建需要重新开始。所以在 JS 加载执行完成之前，后续资源的加载可能是没有意义的。</p></li></ul></li><li><p>对于CSS，CSS 解释器会将 CSS 文件解释成内部表示结构，生成CSS规则树</p><ul><li><p><code>注意点1</code>：CSS 不会阻塞后续 DOM 结构的解析，不会阻塞其它资源(如图片)的加载，但是会阻塞 JS 文件的加载。</p></li><li><p><code>注意点2</code>：JS 代码在执行前，浏览器必须保证在 JS 之前的所有 CSS 样式都解析完成，否则前面的 CSS 样式可能会覆盖 JS 文件中定义的元素样式</p></li></ul></li><li><p>然后合并CSS规则树和DOM树，生成 render 渲染树</p></li><li><p>最后对 render 树进行布局和绘制，并将结果通过 IO 线程传递给 Browser 控制进程进行显示</p></li></ul></li><li><p>资源加载总结：</p><ul><li><p>将样式或 CSS 文件定义在 head 中，并且在处理此类请求的时候应该尽快能够响应（CDN）</p></li><li><p>将 JS 脚本文件放在 body 底部，让 DOM 结构能优先渲染出来，避免 DOM 被阻塞</p></li><li><p>比较耗时的 JS 脚本使用异步的方式 defer 进行加载</p></li><li><p>慎用 async ，因为它完全不考虑依赖关系，只要下载完就加载</p></li></ul></li></ul>",1)];e.render=function(p,S,e,d,t,o){return l(),i("div",null,r)};export{S as __pageData,e as default};
