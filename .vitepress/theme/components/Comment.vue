<template>
  <div id="gitalk-container"></div>
</template>

<script>
  export default {
    name: "blog-comments",
    mounted() {
      const commentConfig = {
        // 是否开启
        enable: true,
        // clientID
        clientID: "5291b85384e2d6e9306a",
        // clientSecret
        clientSecret: "ae7841b520456eb854421561a0efa7500a99567b",
        // 评论项目名
        repo: 'nirvana',
        owner: 'Jeamn',
        admin: ['Jeamn'],
        id: decodeURI(window.location.pathname),
        proxy: 'https://cors-anywhere.azm.workers.dev/https://github.com/login/oauth/access_token',
        language:'zh-CN',
        distractionFreeMode: true
      };
      const gitalk = new Gitalk(commentConfig);
      gitalk.render("gitalk-container");
    },
  };
</script>