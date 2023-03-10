const getPages = require("./utils/pages");
const env = process.env.NODE_ENV === "development" ? "" : "/nirvana"

async function getConfig() {
  let config = {
    head: [
      [
        "meta",
        {
          name: "viewport",
          content:
            "width=device-width,initial-scale=1,minimum-scale=1.0,maximum-scale=1.0,user-scalable=no",
        },
      ],
      ["meta", { name: "keywords", content: "Jeamn" }],
      ["link", { rel: "icon", href: "/favicon.ico" }],
      // ๅผๅฅ Gitalk
      [
        "link",
        {
          rel: "stylesheet",
          href: "https://lib.baomitu.com/gitalk/1.7.0/gitalk.min.css",
        },
      ],
      ["script", { src: "https://lib.baomitu.com/gitalk/1.7.0/gitalk.min.js" }],
      ["script", { src: "https://lib.baomitu.com/axios/0.21.1/axios.js" }],
    ],
    title: "Nirvana",
    themeConfig: {
      displayAllHeaders: true,
      logo: "/favicon.ico",
      pages: await getPages(),
      author: "Jeamn",
      search: true,
      nav: [
        { text: "๐  ้ฆ้กต", link: "/index" },
        { text: "๐ ๅฝๆกฃ", link: "/more/docs" },
        { text: "๐ ๅ็ฑป", link: "/more/tags" },
        // { text: "๐ซ ๅๆ้พๆฅ", link: "/more/Friendship" },
      ],
    },
    dest: "public",
    base: env,
  };
  return config;
}
module.exports = getConfig();
