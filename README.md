# 厨师布 · 立体典藏卡

当前目标：先完成一张精美、可拖动、可播放轻量动作的立体卡，再讨论游戏玩法。

## 当前可用内容
- 首页通过 Three.js GLTFLoader 加载仓库现有的 `assets/chef_bu.glb`，不再在浏览器里重搭一套角色。
- 五档展示、金色粒子、流动金光、中文名牌、拖动查看层次、回正、轻动态开关、金光演出；减少动态效果偏好默认关闭轻动态。
- 模块、模型加载失败或 WebGL 上下文丢失时显示 `assets/chef_bu_preview.png`。
- `blender/chef_bu_premium.py` 为新版模型生成来源（旧版脚本保留）；已有 GitHub Actions 可重新导出模型和预览图。
- 入口：`index.html`；交互和渲染：`viewer.js`。

## 运行
在仓库根目录启动静态 HTTP 服务，例如 `python3 -m http.server 8000`，再打开 http://localhost:8000。
不要用 file:// 直接打开。部署时保留 index.html、viewer.js 和 assets/ 的相对路径。

## 依赖与复用
当前本地打包复用 Three.js 0.180.0 的 GLTFLoader、RoomEnvironment 和 PMREMGenerator（MIT，https://github.com/mrdoob/three.js/blob/r180/LICENSE）。
引擎和附加模块保存在 `vendor/engine.js`，运行时无 CDN 依赖；来源、许可证与复现方式见 `vendor/README.md`。
此次没有加入 Kenney、Poly Haven 或其他尚未取得的资产。

## 验收边界
现已重做角色、弧形金框与厨房场景；仍是程序化建模，尚未达到参考图级别的美术精度。金光演出是展示效果，不代表已实现升级玩法。
已完成 JavaScript 语法检查和引用路径核对；已在云端浏览器成功加载模型及本地引擎；完整拖动测试与手机真机视觉、流畅度验收仍未完成。
实际完成情况、缺口和恢复入口见 [PROGRESS.md](PROGRESS.md)。

美术目标、学习来源与验收标准见 [ART_DIRECTION.md](ART_DIRECTION.md)。新版源场景为 `assets/chef_bu_premium.blend`。
