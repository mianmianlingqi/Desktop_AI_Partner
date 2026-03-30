# Cubism 5 SDK 接入方案（Desktop AI Partner）

## 1. 背景与结论

- 当前项目 Live2D 渲染链路：`pixi-live2d-display/cubism4` + `live2dcubismcore@1.0.2`。
- 现有模型 `static/live2d/Mari-vts/玛丽立绘.moc3` 为 **MOC3 v5**，运行时只支持到 v4，导致加载失败。
- 结论：要支持该模型，必须从“Cubism 4 兼容渲染链”升级到“Cubism 5 官方 SDK 链”。

## 2. 目标

- 支持 Cubism 5（MOC3 v5）模型在主窗口稳定渲染。
- 保持现有 UI 结构不变，仅替换 Live2D 渲染实现。
- 维持离线可运行（不依赖 CDN）。
- 后续可无缝接入口型联动（TTS 播放驱动 `ParamMouthOpenY`）。

## 3. 约束

- 官方 Cubism 5 SDK 需要遵守 Live2D 许可协议，不能假设存在完整官方 npm 包可直接安装。
- 现有项目是 SvelteKit + Tauri v2，前端构建为静态产物，资源应放在 `static/` 下随包分发。
- 当前 `pixi-live2d-display` 方案不能直接覆盖 Cubism 5 需求，需要新建渲染适配层。

## 4. 总体设计

### 4.1 架构分层

1. `Core Loader`：负责加载 Cubism 5 Core（本地资源）。
2. `Framework Adapter`：封装官方 Framework 初始化、模型创建、动作与表情控制。
3. `Render Loop`：基于独立 canvas 的帧循环（与现有页面解耦）。
4. `UI Wrapper`：Svelte 组件层，处理容器尺寸、挂载、销毁、错误提示。
5. `Lip Sync Bridge`：后续接入音频能量数据，驱动模型参数。

### 4.2 文件落点（建议）

1. `src/lib/live2d/cubism5/core-loader.ts`
2. `src/lib/live2d/cubism5/cubism5-runtime.ts`
3. `src/lib/live2d/cubism5/model-controller.ts`
4. `src/lib/live2d/cubism5/types.ts`
5. `src/lib/components/live2d/Cubism5Avatar.svelte`
6. `src/lib/components/live2d/index.ts`（导出新组件）
7. `src/routes/(app)/+page.svelte`（切换挂载组件）
8. `static/live2d/cubism5/`（Core 与 Framework 运行时资源）

## 5. 分阶段实施

## 阶段 A：SDK 资产接入（先打通最小链路）

1. 从官方渠道下载 Cubism 5 SDK for Web，按许可放入仓库指定目录：
   - `static/live2d/cubism5/core/`
   - `src/lib/live2d/vendor/cubism5/`（若需要源码/桥接）
2. 增加资源完整性检查：启动时打印 Core 版本、可支持 MOC 版本。
3. 保留旧组件，不立刻删除，先双轨运行。

**阶段产出**

- 可在浏览器控制台确认 Cubism 5 Core 已加载。
- 不依赖网络即可访问 Core 资源。

## 阶段 B：最小可渲染 MVP

1. 实现 `Cubism5Avatar.svelte`：
   - 初始化 canvas
   - 加载 `.model3.json`
   - 创建模型并渲染
2. 接入容器自适应：窗口变化时更新视口与投影。
3. 错误分级：
   - 资源 404
   - Core 未加载
   - MOC 版本不匹配
   - 模型解析异常

**阶段产出**

- `Mari-vts` 模型可见、可稳定显示。
- 不再出现“Unknown error”黑盒提示。

## 阶段 C：动作/表情与交互能力

1. 解析 `Expressions`、`Motions` 清单并提供接口。
2. 建立基础状态机：`idle -> speaking -> idle`。
3. 增加可观测日志：动作开始、动作结束、表达切换失败原因。

**阶段产出**

- 说话/待机动作可切换。
- 表情触发可控且可追踪。

## 阶段 D：口型联动（与你现有音频链路对接）

1. 在 `audio.service.ts` 播放链路增加可订阅音量回调（RMS）。
2. 将音量映射到 `ParamMouthOpenY`（并可选 `ParamMouthForm`）。
3. 增加平滑滤波，避免嘴型抖动。

**阶段产出**

- TTS 播放期间模型口型同步变化。
- 播放结束后参数平滑回落。

## 阶段 E：切换与回滚策略

1. 增加配置开关：`live2d_engine = cubism4 | cubism5`。
2. 默认优先 `cubism5`，失败时回退 `cubism4`（仅用于旧模型）。
3. 保留统一组件接口，避免业务层改动。

**阶段产出**

- 兼容不同模型版本。
- 遇到异常可快速回滚。

## 6. 关键风险与应对

1. **许可风险**：官方 SDK 资源使用与分发需合规。
   - 应对：在仓库增加 `docs/live2d-license-notes.md`，明确来源与用途。
2. **渲染稳定性风险**：WebView 环境和 SDK 的生命周期管理复杂。
   - 应对：统一在组件 `onMount/onDestroy` 完成资源释放；添加 GPU 上下文丢失处理。
3. **性能风险**：高分辨率贴图 + 动作叠加会引发卡顿。
   - 应对：限制最大渲染尺寸，按窗口比例缩放，必要时降低帧率上限。

## 7. 验收标准

1. 启动后 3 秒内可见模型。
2. 无网络环境下模型仍可加载。
3. 日志可明确显示 Core 版本与模型 MOC 版本。
4. 连续运行 10 分钟无明显内存持续上涨。
5. TTS 播放时嘴型联动可见（阶段 D 验收）。

## 8. 建议的实施顺序（本项目）

1. 先完成阶段 A + B（让 v5 模型稳定可见）。
2. 再做阶段 E（引擎开关，降低上线风险）。
3. 最后做阶段 C + D（动作与口型，增强体验）。

## 9. 预计工作量

1. 阶段 A + B：1.5 ~ 2.5 天
2. 阶段 E：0.5 天
3. 阶段 C + D：1 ~ 2 天

合计：约 3 ~ 5 个工作日（含联调与回归）。
