# 厨师布 · 黄金小厨房

首页已改为精绘分层 **2.5D** 卡面，优先还原用户参考图的美术质量。角色、厨房背景、卡框与前景使用独立透明资产合成，支持视差和有限角度倾斜；它不是可以转到背面的完整 3D 模型。

## 展示与交互

- 三张独立图层：补全的厨房、透明厨师布（含锅铲/锅/食材）、透明卡框及前景食材。
- 拖动、鼠标移动、键盘方向键产生不同幅度的分层位移与整体倾斜。双击、Home 或回正按钮可复位。
- 手机倾斜由用户点击开启；iOS 权限在该操作中请求。未授权或不支持时仍可拖动，回正可重新校准。需 HTTPS 或 localhost。
- 五档：基础、视差、动态、蒸汽星光、镀闪光泽；升级演出与减少动态偏好均有处理。
- 图层加载失败显示参考图静态回退，并明确提示；运行时不加载 CDN、Three.js 或 GLB。

## 运行

在仓库根目录运行 `python3 -m http.server 8000`，打开 http://localhost:8000 。无需构建和运行时依赖。

入口 `index.html`，样式 `card.css`，交互 `viewer.js`；部署时保留 `assets/layers/` 和相对路径。

## 验证

```sh
npm ci
npx playwright install chromium
npm test
```

测试自行启动静态服务器，以禁用 WebGL 的 Chromium 验证图层视差、鼠标拖动、键盘/回正、五档、模拟传感器授权/拒绝与事件、升级、减少动态、手机布局和失败回退，并输出实际页面截图。真机传感器与 Safari 手感仍需设备验收。CI 保留检查截图，不会自动提交或修改 main。

最新截图：[桌面](assets/review/layered-desktop.png)、[倾斜](assets/review/layered-tilted.png)、[手机](assets/review/layered-mobile.png)。

## 美术资产与历史

`assets/layers/ASSETS.md` 记录新图层来源与合成定位。以用户上传参考图为依据，通过图像工具提取/补绘；它们不是旧 GLB 的渲染图。

旧版模型、Blender 脚本和源场景保留；旧页面为 `legacy-3d.html`，脚本为 `viewer-3d.js`，本地引擎仍在 `vendor/`。旧 Blender 工作流仅供手动生成存档，不自动覆盖首页或 main。

恢复信息见 [PROGRESS.md](PROGRESS.md)，美术目标见 [ART_DIRECTION.md](ART_DIRECTION.md)。

[实际页面拖动与升级演示](assets/review/layered-demo.mp4)。
