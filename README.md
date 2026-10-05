# 吉他扒谱记谱

## Install and use offline

Tab Maker can be installed from a browser's install menu, or with Safari's Share → Add to Home Screen. Open the app online once and let it finish loading to prepare offline access to all bundled songs. It supports portrait and landscape orientation, subject to your device's rotation settings. Web fonts require a connection; offline mode uses system fonts.

For local preview, serve `public` at `http://localhost` (for example, `python -m http.server 8000 --directory public`). PWA installation and service workers require HTTPS on hosted sites; localhost is supported for development. Relative manifest and worker paths also support the GitHub Pages `/tab-maker/public/` location.

When releasing changes to the app or songs, bump the cache version in `public/sw.js`. The new version activates after all existing app windows close; reopen the app to use it. The worker only caches app files and bundled songs, and does not change saved editor data in local storage.

Browser checks: with Node.js and Playwright installed, run `node tests/pwa.cjs`. The test uses Microsoft Edge by default; set `PLAYWRIGHT_CHANNEL=chrome` to use Chrome. It checks the manifest and icon dimensions, offline reloads and every bundled song, chord diagrams, transposition, pitch display, and editor layouts in portrait and landscape at both root and subdirectory hosting paths.

## 记谱语法 / Notation Syntax
* [English syntax guide](docs/syntax.en.md)
* [中文记谱语法](docs/syntax.zh-CN.md)

## 示范谱
* [测试谱](https://scai.github.io/tab-maker/public/)
* [林俊杰 “幸存者”](https://scai.github.io/tab-maker/public/index.html?tab=drifter&key=A)
* [邰正宵 “回不去了”](https://scai.github.io/tab-maker/public/index.html?tab=samuel-back&key=D)
* [邰正宵 “如果你沒有愛上他”](https://scai.github.io/tab-maker/public/index.html?tab=samuel-if&key=D)
* [邰正宵 “搭錯心跳”](https://scai.github.io/tab-maker/public/index.html?tab=samuel-heartbeats&key=A)
* [邰正宵 “唯一的玫瑰”](https://scai.github.io/tab-maker/public/index.html?tab=samuel-only-rose&key=C)
* [邰正宵 “各自天涯”](https://scai.github.io/tab-maker/public/index.html?tab=samuel-separate-ways&key=G)
* [邰正宵 “不管”](https://scai.github.io/tab-maker/public/index.html?tab=samuel-no-matter-what&key=D)
* [邰正宵 “我只有你”](https://scai.github.io/tab-maker/public/index.html?tab=samuel-only-you&key=G)
* [邰正宵 “永遠不回頭”](https://scai.github.io/tab-maker/public/index.html?tab=samuel-never-turning-back&key=A)
* [邰正宵 “心要讓你聽見”](https://scai.github.io/tab-maker/public/index.html?tab=samuel-heard&key=G)
* [邰正宵 “爱归零”](https://scai.github.io/tab-maker/public/index.html?tab=samuel-zero&key=G)
* [邰正宵 “千年如一日”](https://scai.github.io/tab-maker/public/index.html?tab=samuel-millennium&key=C)
* [邰正宵 “寂寞玩具”](https://scai.github.io/tab-maker/public/index.html?tab=samuel-lonely-toy&key=C)
* [陶喆 “我喜欢”](https://scai.github.io/tab-maker/public/index.html?tab=davidtao-like)
