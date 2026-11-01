# 本地三维引擎

`engine.js` 是 Three.js 0.180.0（MIT）的 ESM bundle，包含 GLTFLoader 和 RoomEnvironment，许可证见 THREE-LICENSE.txt。浏览器运行时不访问 CDN。

复现：在临时构建目录安装 `three@0.180.0` 和 `esbuild`，新建入口：

```js
export * from 'three';
export { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
export { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
```

运行 `esbuild entry.js --bundle --format=esm --minify --outfile=engine.js`，将输出和 Three.js LICENSE 一起复制到此目录。
