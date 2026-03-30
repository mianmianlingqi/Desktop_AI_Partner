# Cubism 5 开源方案对照笔记

更新时间: 2026-03-30

## 目标

为 Svelte + Vite + Tauri 的桌面项目落地 Cubism 5 官方链路，规避 Live2DCubismCore is not defined 等常见问题。

## 参考仓库

1. Live2D/CubismWebSamples
- https://github.com/Live2D/CubismWebSamples
- 关键点: 在 HTML 里先加载 Core 脚本，再加载模块入口。

2. Live2D/CubismWebFramework
- https://github.com/Live2D/CubismWebFramework
- 关键点: Framework 代码大量直接访问全局标识符 Live2DCubismCore。

3. guansss/pixi-live2d-display
- https://github.com/guansss/pixi-live2d-display
- 关键点: 明确要求先准备 Cubism Core，不建议依赖不稳定的直链 CDN。

4. itxve/tauri-live2d
- https://github.com/itxve/tauri-live2d
- 关键点: 桌面壳里优先本地资源路径，弱化在线依赖。

5. ai-zen/live2d-copilot-tauri
- https://github.com/ai-zen/live2d-copilot-tauri
- 关键点: Tauri + Vite 路线可行，但需对资源路径和运行时诊断做增强。

6. narze/live2d-electron
- https://github.com/narze/live2d-electron
- 关键点: 桌面环境常用本地静态资源 + 运行时库组合方式。

## 可复用模式

1. 官方优先的加载顺序
- 先 Core 脚本，后模块入口。
- 避免在业务逻辑中晚注入 Core 后再期待 Framework 自动可见。

2. 本地静态资源优先
- Core、Shader、模型文件全部放本地静态目录。
- 不把可运行性建立在外网和第三方 CDN 上。

3. 明确错误分层
- 资源不可达、Core 不可用、版本不兼容、WebGL 不可用分别给出不同文案。

4. 桌面壳适配
- 优先使用绝对静态路径和固定目录结构。
- 保留运行时日志，便于用户截图就能定位问题。

## 本项目已落地改动

1. 按官方顺序在 app 壳层预加载 Core
- 文件: src/app.html
- 改动: 在 head 中先加载 live2dcubismcore.min.js，再加载 bridge 脚本。

2. 增加 Core bridge 脚本
- 文件: static/live2d/cubism5/core/live2dcubismcore.bridge.js
- 作用: 为 Framework 需要的全局标识符建立稳定绑定。

3. Runtime 增强
- 文件: scripts/cubism5-runtime-entry.ts
- 改动:
  - 新增 coreBridgeScriptPath 参数
  - Core 加载后强制加载 bridge 脚本
  - 优化 Framework 启动错误提示

4. 组件接线
- 文件: src/lib/components/live2d/Live2DAvatar.svelte
- 改动: 将 bridge 脚本路径传入 runtime。

## 不推荐做法

1. 只依赖在线 Core 直链。
2. 只检查 globalThis.Live2DCubismCore 存在，而不处理 Framework 对全局标识符的要求。
3. 把模型加载失败全部归因为网络问题。
