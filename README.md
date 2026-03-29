# Desktop AI Partner

> **Tauri v2 桌面悬浮窗 AI 助手** — 毛玻璃半透明界面 · 系统级区域截图 · 多模态 AI 对话 · 语音交互 (计划中)

一款基于 Tauri v2 + Svelte 5 + Rust 构建的轻量桌面 AI 助手应用。以毛玻璃悬浮窗形态常驻桌面，通过全局快捷键唤起区域截图，截图后可附带文字追问，AI 以流式 Markdown 回复。支持 GPT-4o、Claude Vision 等多模态模型。

---

## ✨ 功能特性

| 特性 | 说明 |
|------|------|
| **毛玻璃悬浮窗** | 无边框、半透明、始终置顶、支持拖拽移动 |
| **系统级区域截图** | 全局快捷键触发，弹出全屏透明叠加层框选截图区域 |
| **截图预览 + 文字追问** | 截图后缩略图预览，可附加文字一并发送给 AI |
| **多模态 AI 对话** | 支持 GPT-4o / Claude Vision 等视觉模型，图文混合输入 |
| **SSE 流式回复** | 逐 token 推送，打字机效果实时展示 |
| **Markdown 渲染** | AI 回复以 Markdown 渲染，支持代码高亮（Shiki）、DOMPurify 消毒 |
| **日志与诊断** | 前端异常上报 + 本地日志轮转 + 诊断包导出 |
| **可配置 API** | 运行时可配置 API Key / Base URL / 模型名称，通过 tauri-plugin-store 持久化 |
| **语音能力 (规划中)** | 计划加入基于 Whisper 的语音录入及 Edge TTS 语音合成功能 |

---

## 🛠️ 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| **桌面框架** | Tauri v2 | 跨平台桌面应用，Rust 后端 + WebView 前端 |
| **前端框架** | Svelte 5 + SvelteKit | Runes 响应式系统，adapter-static SPA 模式 |
| **语言** | TypeScript + Rust | 前端 TS 类型安全，后端 Rust 高性能 |
| **构建工具** | Vite 6 | 极速 HMR 开发体验 |
| **截图** | xcap 0.8 | Rust 原生跨平台屏幕捕获 |
| **图片处理** | image 0.25 | PNG/JPEG 编解码与裁剪 |
| **AI 接口** | async-openai 0.27 | OpenAI 兼容 API 客户端（支持 SSE 流式） |
| **HTTP** | reqwest 0.12 | 异步 HTTP 请求（JSON + Stream） |
| **状态存储** | tauri-plugin-store | 运行时配置持久化（JSON 文件） |
| **剪贴板** | tauri-plugin-clipboard-manager | 系统剪贴板读写 |
| **快捷键** | tauri-plugin-global-shortcut | 系统级全局热键注册 |
| **Markdown** | svelte-exmarkdown + DOMPurify | 安全渲染 Markdown 内容 |
| **代码高亮** | Shiki 4 | 语法高亮引擎 |
| **图标** | Lucide Svelte | 轻量图标库 |
| **错误处理** | thiserror | Rust 自定义错误类型 |
| **可观测性** | tracing | 结构化日志与文件轮转 |
| **异步运行时** | Tokio | Rust 全功能异步运行时 |
| **包管理** | pnpm | 高效 Node.js 依赖管理 |

---

## 📂 项目结构

```
Desktop_AI_Assistant/
├── .github/                                    # GitHub 配置与 Copilot 协作规范
│   ├── copilot-instructions.md                 # Copilot 多 Agent 协作规范 + 项目文件结构
│   ├── Structural_Architect-instructions.md    # 架构师 Agent 指令文档
│   └── agents/                                 # Agent 定义文件
│       ├── CEO.agent.md                        # CEO 总调度 Agent
│       ├── Developer_Alpha.agent.md            # 开发工程师 Alpha
│       ├── Developer_Bravo.agent.md            # 开发工程师 Bravo
│       ├── Developer_Charlie.agent.md          # 开发工程师 Charlie
│       ├── Developer_Delta.agent.md            # 开发工程师 Delta
│       ├── Librarian.agent.md                  # 调研/依赖选型 Agent
│       ├── Modulizer.agent.md                  # 模块化资产提取 Agent
│       ├── QA_Engineer.agent.md                # 测试工程师 Agent
│       ├── Structural_Architect.agent.md       # 架构设计 Agent
│       └── Technical_Writer.agent.md           # 文档工程师 Agent
│
├── .vscode/                                    # VS Code 工作区配置
│   ├── settings.json                           # 编辑器设置
│   └── extensions.json                         # 推荐扩展列表
│
├── src/                                        # ===== Svelte 前端源码 =====
│   ├── app.html                                # HTML 模板（lang="zh-CN"）
│   ├── app.css                                 # 全局样式（CSS Reset + 暗色主题 + CSS 变量 + 毛玻璃）
│   │
│   ├── lib/                                    # $lib 别名根目录
│   │   ├── types/                              # TypeScript 类型定义
│   │   │   ├── index.ts                        # 类型统一 re-export 入口
│   │   │   ├── capture.types.ts                # 截图类型（CaptureRegion / CaptureResult）
│   │   │   ├── chat.types.ts                   # 对话类型（ChatRole / ChatMessage / ChatRequest / StreamEvent）
│   │   │   ├── config.types.ts                 # 配置类型（ApiConfig / AppSettings / AppConfig）
│   │   │   └── log.types.ts                    # 日志类型（LogReportRequest / DiagnosticsExportResult）
│   │   │
│   │   ├── constants/                          # 常量定义（零硬编码）
│   │   │   ├── index.ts                        # 常量统一 re-export
│   │   │   ├── commands.ts                     # Tauri invoke 命令名称常量
│   │   │   ├── events.ts                       # Tauri 事件名称（chat:delta）
│   │   │   └── defaults.ts                     # 前端默认值（镜像 Rust defaults.rs）
│   │   │
│   │   ├── design-tokens/                      # 设计令牌（样式单一源头）
│   │   │   ├── colors.ts                       # 颜色体系（glass / theme / text / message）
│   │   │   ├── spacing.ts                      # 间距 + 圆角比例尺
│   │   │   ├── typography.ts                   # 字体族 / 字号 / 行高 / 字重
│   │   │   └── glass.ts                        # 毛玻璃效果参数（light / standard / heavy 变体）
│   │   │
│   │   ├── utils/                              # 工具函数
│   │   │   ├── index.ts                        # 工具统一 re-export
│   │   │   ├── format.ts                       # 格式化（时间戳 / 截断 / Base64 转 DataURL）
│   │   │   └── clipboard.ts                    # 剪贴板操作（Tauri 插件封装）
│   │   │
│   │   ├── services/                           # 前端服务层（Tauri invoke 封装）
│   │   │   ├── index.ts                        # 服务统一 re-export
│   │   │   ├── capture.service.ts              # 截图服务（captureScreen / openOverlay / closeOverlay）
│   │   │   ├── chat.service.ts                 # 对话服务（sendMessage / abortChat / listenChatDelta）
│   │   │   ├── config.service.ts               # 配置服务（getConfig / setConfig）
│   │   │   └── log.service.ts                  # 日志服务（reportLog / exportDiagnostics）
│   │   │
│   │   ├── stores/                             # Svelte 5 Runes 状态管理
│   │   │   ├── index.ts                        # Store 统一 re-export
│   │   │   ├── chat.svelte.ts                  # 对话状态（消息列表 / 流式输出 / 错误处理）
│   │   │   ├── capture.svelte.ts               # 截图状态（图片数据 / 截图中标志）
│   │   │   ├── config.svelte.ts                # 配置状态（加载 / 保存 AppConfig）
│   │   │   ├── ui.svelte.ts                    # UI 状态（视图切换 / 面板 / 图片预览）
│   │   │   └── observability.svelte.ts         # 日志状态（错误缓存 / 诊断导出）
│   │   │
│   │   └── components/                         # UI 组件层
│   │       ├── shared/                         # 通用共享组件
│   │       │   ├── index.ts                    # 共享组件桶导出
│   │       │   ├── GlassPanel.svelte           # 毛玻璃面板（variant: light/standard/heavy）
│   │       │   ├── IconButton.svelte           # 图标按钮（ghost/default/primary/danger 变体）
│   │       │   ├── DragRegion.svelte           # 窗口拖拽区域（data-tauri-drag-region）
│   │       │   ├── Tooltip.svelte              # 悬停工具提示框
│   │       │   └── TextInput.svelte            # 自动增高文本框（Enter 发送 / Shift+Enter 换行）
│   │       │
│   │       ├── titlebar/                       # 标题栏组件
│   │       │   ├── index.ts                    # 桶导出
│   │       │   └── TitleBar.svelte             # 标题栏（拖拽区域 + 最小化 + 关闭按钮）
│   │       │
│   │       ├── chat/                           # 对话组件
│   │       │   ├── index.ts                    # 桶导出
│   │       │   ├── ChatContainer.svelte        # 对话容器（消息列表 + 流式气泡 + 自动滚动）
│   │       │   ├── MessageBubble.svelte        # 消息气泡（用户右蓝 / AI 左灰）
│   │       │   ├── InputArea.svelte            # 输入区域（发送/中止按钮 + 截图按钮 + 错误栏）
│   │       │   ├── MarkdownRenderer.svelte     # Markdown 渲染器（DOMPurify 消毒 + Shiki 高亮）
│   │       │   ├── ImagePreview.svelte         # 截图预览（缩略图 + 全屏查看 + 可移除）
│   │       │   └── StreamingIndicator.svelte   # AI 流式输出跳动指示器
│   │       │
│   │       ├── capture/                        # 截图组件
│   │       │   ├── index.ts                    # 桶导出
│   │       │   └── SelectionOverlay.svelte     # 全屏框选叠加层（鼠标拖拽选区 + ESC 取消）
│   │       │
│   │       └── settings/                       # 设置组件
│   │           ├── index.ts                    # 桶导出
│   │           ├── SettingsPanel.svelte        # 设置面板（Tab 切换容器）
│   │           ├── ApiConfigForm.svelte        # API 配置表单（Key / URL / Model）
│   │           ├── AppearanceForm.svelte       # 外观设置（主题 / 语言）
│   │           └── ShortcutForm.svelte         # 快捷键设置（组合键录制器）
│   │
│   └── routes/                                 # SvelteKit 路由
│       ├── +layout.ts                          # 全局 SSR 禁用（export const ssr = false）
│       ├── +layout.svelte                      # 根布局（仅 CSS 导入 + 配置加载，无 TitleBar）
│       ├── (app)/                              # 主应用路由组（包含 TitleBar）
│       │   ├── +layout.svelte                  # 应用布局（TitleBar + app-shell）
│       │   └── +page.svelte                    # 主页面（Chat / Settings 视图切换）
│       └── overlay/                            # 截图叠加层路由（独立透明窗口，无 TitleBar）
│           ├── +layout.ts                      # SSR 禁用
│           └── +page.svelte                    # SelectionOverlay 全屏页
│
├── src-tauri/                                  # ===== Rust 后端 =====
│   ├── Cargo.toml                              # Rust 依赖声明
│   ├── Cargo.lock                              # Rust 依赖锁文件
│   ├── tauri.conf.json                         # Tauri 应用配置（窗口 / 权限 / 标识）
│   ├── build.rs                                # Tauri 构建脚本
│   ├── capabilities/                           # Tauri v2 权限能力配置
│   │   └── default.json                        # 默认权限集（窗口 / 快捷键 / 剪贴板 / 存储）
│   ├── gen/                                    # Tauri 自动生成文件（schema 等）
│   ├── icons/                                  # 应用图标（多分辨率 PNG + ICO + ICNS）
│   └── src/
│       ├── main.rs                             # Rust 入口（调用 lib::run）
│       ├── lib.rs                              # 库入口（插件注册 + IPC 命令注册）
│       │
│       ├── commands/                           # Tauri IPC 命令层（前端 invoke 入口）
│       │   ├── mod.rs                          # 模块声明
│       │   ├── capture_commands.rs             # 截图命令（capture_screen / open_overlay / close_overlay）
│       │   ├── chat_commands.rs                # 对话命令（chat_send / chat_abort）
│       │   ├── config_commands.rs              # 配置命令（get_config / set_config）
│       │   └── log_commands.rs                 # 日志命令（log_report / export_diagnostics）
│       │
│       ├── services/                           # 业务服务层（核心逻辑）
│       │   ├── mod.rs                          # 模块声明
│       │   ├── capture_service.rs              # 截图业务（屏幕捕获 + 区域裁剪 + Base64 编码）
│       │   ├── chat_service.rs                 # 对话业务（构建请求 + SSE 流式推送 + 中断控制）
│       │   └── config_service.rs               # 配置业务（加载/保存至 tauri-plugin-store）
│       │
│       ├── adapters/                           # 适配器层（外部依赖隔离）
│       │   ├── mod.rs                          # 模块声明
│       │   ├── ai_adapter.rs                   # AI API 适配器（async-openai / OpenAI 兼容接口）
│       │   ├── screenshot_adapter.rs           # 截图适配器（xcap 屏幕捕获封装）
│       │   ├── store_adapter.rs                # 存储适配器（tauri-plugin-store 读写封装）
│       │   └── image_encoder.rs                # 图片编码适配器（PNG/JPEG → Base64）
│       │
│       ├── config/                             # 配置层
│       │   ├── mod.rs                          # 模块声明
│       │   └── defaults.rs                     # 默认值定义（API URL / 模型名 / 快捷键）
│       │
│       ├── types/                              # Rust 类型定义
│       │   ├── mod.rs                          # 模块声明 + re-export
│       │   ├── capture_types.rs                # 截图类型（CaptureRegion / CaptureResult）
│       │   ├── chat_types.rs                   # 对话类型（ChatRequest / StreamEvent / ChatRole）
│       │   ├── config_types.rs                 # 配置类型（ApiConfig / AppSettings / AppConfig）
│       │   └── log_types.rs                    # 日志类型（LogReportRequest / DiagnosticsExportResult）
│       │
│       ├── observability/                       # 可观测性模块
│       │   └── mod.rs                          # tracing 初始化 + 日志目录/脱敏工具
│       │
│       └── errors/                             # 错误处理
│           ├── mod.rs                          # 模块声明 + re-export
│           └── app_error.rs                    # 统一错误类型（AppError，thiserror 派生）
│
├── static/                                     # 静态资源
│   ├── favicon.png                             # 网站图标
│   ├── svelte.svg                              # Svelte Logo
│   ├── tauri.svg                               # Tauri Logo
│   └── vite.svg                                # Vite Logo
│
├── .env.example                                # 环境变量模板（VITE_APP_NAME / VITE_DEFAULT_SHORTCUT）
├── .npmrc                                      # pnpm 配置（shamefully-hoist=true）
├── .gitignore                                  # Git 忽略规则
├── package.json                                # 项目依赖与 pnpm 脚本
├── pnpm-lock.yaml                              # pnpm 锁文件
├── svelte.config.js                            # SvelteKit 配置（adapter-static + SPA fallback）
├── tsconfig.json                               # TypeScript 配置
├── vite.config.js                              # Vite 构建配置（Tauri 适配）
└── README.md                                   # 项目文档（本文件）
```

---

## 🏗️ 架构说明

### 三层架构：Command → Service → Adapter

后端采用严格的单向依赖三层架构，每层职责分明、可独立替换：

```
┌─────────────────────────────────────────────────┐
│                  Svelte 前端                      │
│  components/ → stores/ → services/ (invoke)      │
└──────────────────────┬──────────────────────────┘
                       │ Tauri IPC (invoke / event)
┌──────────────────────▼──────────────────────────┐
│              commands/  （命令层）                 │
│  接收前端 invoke，参数校验，委托 service 处理      │
├─────────────────────────────────────────────────┤
│              services/  （服务层）                 │
│  核心业务逻辑：截图流程、AI 对话流程、配置读写      │
├─────────────────────────────────────────────────┤
│              adapters/  （适配器层）               │
│  外部依赖隔离：xcap、async-openai、plugin-store   │
└─────────────────────────────────────────────────┘
         ↕                ↕              ↕
      types/          config/        errors/
```

**依赖方向**（严格单向，禁止反向 import）：

```
commands/ → services/ → adapters/ → types/ + config/
                                  ↑
                              errors/（被所有层使用）
```

### 前端分层

```
components/（UI 展示）
    → stores/（Svelte 5 Runes 状态管理）
        → services/（Tauri invoke 封装）
            → constants/ + types/（零硬编码常量 + 类型定义）
```

---

## 🚀 快速开始

### 前置依赖

- **Node.js** ≥ 18
- **pnpm** ≥ 8
- **Rust** ≥ 1.70（含 `cargo`）
- **Tauri v2 CLI**：`cargo install tauri-cli --version "^2"`
- 系统依赖：参照 [Tauri v2 前置条件](https://v2.tauri.app/start/prerequisites/)

### 安装

```bash
# 1. 克隆仓库
git clone <repo-url>
cd Desktop_AI_Assistant

# 2. 安装前端依赖
pnpm install

# 3. 复制环境变量模板（按需修改）
cp .env.example .env
```

### 开发运行

```bash
# 启动 Tauri 开发模式（同时启动 Vite dev server + Rust 后端）
pnpm tauri dev
```

### 构建生产版本

```bash
# 前端构建
pnpm build

# Tauri 打包（生成安装包）
pnpm tauri build
```

### 类型检查

```bash
pnpm check
```

---

## ⚙️ 配置说明

### 环境变量（`.env.example`）

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `VITE_APP_NAME` | 应用显示名称 | `Desktop AI Assistant` |
| `VITE_DEFAULT_SHORTCUT` | 默认全局快捷键 | `Alt+Space` |

### 运行时配置（tauri-plugin-store）

应用首次启动后，配置通过 `tauri-plugin-store` 持久化为本地 JSON 文件。用户可在设置面板中修改：

| 配置项 | 说明 |
|--------|------|
| **API Key** | AI 服务密钥（OpenAI / 兼容服务） |
| **Base URL** | API 端点地址（支持自定义代理） |
| **Model** | 模型名称（如 `gpt-4o`、`claude-sonnet-4-20250514`） |
| **快捷键** | 全局截图快捷键（组合键） |
| **主题/语言** | 外观偏好设置 |

---

## 📜 零硬编码原则

本项目遵循「零硬编码」四层配置体系，所有易变值外置，源代码不嵌入任何魔法字符串：

| 层级 | 存储位置 | 示例 |
|------|---------|------|
| **Layer 1: 启动** | 启动脚本 / 系统环境变量 | 代理地址、端口 |
| **Layer 2: 应用** | `.env`（gitignore） | `VITE_APP_NAME`、`VITE_DEFAULT_SHORTCUT` |
| **Layer 3: 设计** | `src/lib/design-tokens/` | 颜色、间距、字体、毛玻璃参数 |
| **Layer 4: 运行时** | `tauri-plugin-store` | API Key、模型名、用户偏好 |

---

## 📄 许可证

[MIT](LICENSE)
