<script lang="ts">
  import { onMount } from 'svelte';

  type RuntimeLogLevel = 'info' | 'warn' | 'error';

  type RuntimeLogEntry = {
    level: RuntimeLogLevel;
    stage: string;
    message: string;
    timestamp: number;
  };

  type Cubism5AvatarHandle = {
    start: () => void;
    stop: () => void;
    resize: () => void;
    setAutoBlink: (enabled: boolean) => void;
    destroy: () => Promise<void>;
  };

  type Cubism5RuntimeModule = {
    createCubism5Avatar: (options: {
      canvas: HTMLCanvasElement;
      modelJsonPath: string;
      coreScriptPath?: string;
      coreBridgeScriptPath?: string;
      shaderDirectory?: string;
      autoBlink?: boolean;
      modelScale?: number;
      logger?: (entry: RuntimeLogEntry) => void;
    }) => Promise<Cubism5AvatarHandle>;
  };

  type Live2DCubismCoreLike = {
    Version?: {
      csmGetLatestMocVersion?: () => number;
    };
  };

  type RuntimeWindow = Window & typeof globalThis & {
    Live2DCubismCore?: Live2DCubismCoreLike;
  };

  const MODEL_PATH = encodeURI('/live2d/Mari-vts/玛丽立绘.model3.json');
  const CORE_SCRIPT_PATH = '/live2d/cubism5/core/live2dcubismcore.min.js';
  const CORE_BRIDGE_SCRIPT_PATH = '/live2d/cubism5/core/live2dcubismcore.bridge.js';
  const SHADER_DIRECTORY = '/live2d/cubism5/shaders/WebGL/';
  const RUNTIME_MODULE_PATH = '/live2d/cubism5/runtime/index.js';
  const MAX_STAGE_LOGS = 40;

  let mountEl: HTMLDivElement;
  let canvasEl: HTMLCanvasElement;
  let statusMessage = '模型加载中...';
  let stageLogs: Array<{ id: number; level: RuntimeLogLevel; text: string }> = [];
  let nextLogId = 1;

  function appendStageLog(
    level: RuntimeLogLevel,
    stage: string,
    message: string,
    timestamp = Date.now()
  ): void {
    const time = new Date(timestamp).toLocaleTimeString('zh-CN', {
      hour12: false
    });
    const text = `${time} [${stage}] ${message}`;

    stageLogs = [
      ...stageLogs.slice(-(MAX_STAGE_LOGS - 1)),
      {
        id: nextLogId,
        level,
        text
      }
    ];
    nextLogId += 1;

    if (level === 'error') {
      console.error(`[Live2D][${stage}] ${message}`);
    } else if (level === 'warn') {
      console.warn(`[Live2D][${stage}] ${message}`);
    } else {
      console.info(`[Live2D][${stage}] ${message}`);
    }
  }

  function getRuntimeWindow(): RuntimeWindow {
    return window as RuntimeWindow;
  }

  function getCoreSupportedMocVersion(): number | null {
    const version = getRuntimeWindow().Live2DCubismCore?.Version?.csmGetLatestMocVersion?.();
    return typeof version === 'number' ? version : null;
  }

  async function detectModelMocVersion(modelUrl: string): Promise<number | null> {
    try {
      const modelResponse = await fetch(modelUrl, { cache: 'no-store' });
      if (!modelResponse.ok) return null;

      const modelJson = (await modelResponse.json()) as {
        FileReferences?: {
          Moc?: string;
        };
      };

      const mocRef = modelJson.FileReferences?.Moc;
      if (!mocRef) return null;

      const mocUrl = new URL(mocRef, new URL(modelUrl, window.location.origin));
      const mocResponse = await fetch(mocUrl.toString(), { cache: 'no-store' });
      if (!mocResponse.ok) return null;

      const buffer = await mocResponse.arrayBuffer();
      if (buffer.byteLength < 8) return null;

      const header = String.fromCharCode(...new Uint8Array(buffer.slice(0, 4)));
      if (header !== 'MOC3') return null;

      return new DataView(buffer).getUint32(4, true);
    } catch {
      return null;
    }
  }

  function toFriendlyErrorMessage(
    error: unknown,
    modelMocVersion: number | null,
    coreMocVersion: number | null
  ): string {
    if (
      modelMocVersion !== null &&
      coreMocVersion !== null &&
      modelMocVersion > coreMocVersion
    ) {
      return `加载失败：模型 MOC3 版本为 v${modelMocVersion}，当前 Core 仅支持到 v${coreMocVersion}。`;
    }

    if (error instanceof Error) {
      if (error.message.includes('Core') || error.message.includes('live2dcubismcore')) {
        return `加载失败：Cubism Core 初始化异常（${error.message}）。`;
      }

      if (error.message.includes('WebGL')) {
        return '加载失败：当前环境不支持 WebGL，无法渲染 Live2D 模型。';
      }

      return error.message;
    }

    return 'Live2D 模型加载失败';
  }

  onMount(() => {
    let disposed = false;
    let modelMocVersion: number | null = null;
    let coreMocVersion: number | null = null;
    let avatar: Cubism5AvatarHandle | null = null;
    let resizeObserver: ResizeObserver | null = null;

    const resize = () => avatar?.resize();

    (async () => {
      try {
        appendStageLog('info', 'ui', '开始加载 Live2D 组件');
        appendStageLog('info', 'ui', `模型路径: ${MODEL_PATH}`);

        appendStageLog('info', 'compat', '检测模型 MOC 版本');
        modelMocVersion = await detectModelMocVersion(MODEL_PATH);
        if (modelMocVersion !== null) {
          appendStageLog('info', 'compat', `检测到模型 MOC 版本: v${modelMocVersion}`);
        } else {
          appendStageLog('warn', 'compat', '无法检测模型 MOC 版本，将继续尝试加载');
        }

        appendStageLog('info', 'runtime', '动态导入 Cubism5 运行时模块');

        const runtime = (await import(
          /* @vite-ignore */ RUNTIME_MODULE_PATH
        )) as Cubism5RuntimeModule;

        appendStageLog('info', 'runtime', '运行时模块导入成功');

        if (disposed) {
          appendStageLog('warn', 'ui', '组件已销毁，终止加载流程');
          return;
        }

        appendStageLog('info', 'runtime', '开始创建 Cubism5 Avatar');
        avatar = await runtime.createCubism5Avatar({
          canvas: canvasEl,
          modelJsonPath: MODEL_PATH,
          coreScriptPath: CORE_SCRIPT_PATH,
          coreBridgeScriptPath: CORE_BRIDGE_SCRIPT_PATH,
          shaderDirectory: SHADER_DIRECTORY,
          autoBlink: true,
          modelScale: 1,
          logger: (entry) => {
            appendStageLog(entry.level, entry.stage, entry.message, entry.timestamp);
          }
        });

        appendStageLog('info', 'runtime', 'Avatar 创建完成');

        if (disposed) {
          appendStageLog('warn', 'ui', '组件已销毁，释放刚创建的 Avatar');
          await avatar.destroy();
          avatar = null;
          return;
        }

        coreMocVersion = getCoreSupportedMocVersion();
        avatar.start();
        avatar.resize();
        appendStageLog('info', 'loop', '渲染循环已启动并完成首次 resize');

        resizeObserver = new ResizeObserver(() => resize());
        resizeObserver.observe(mountEl);
        window.addEventListener('resize', resize);
        appendStageLog('info', 'ui', 'Live2D 挂载完成');

        statusMessage = '';
      } catch (error) {
        coreMocVersion = getCoreSupportedMocVersion();
        statusMessage = toFriendlyErrorMessage(
          error,
          modelMocVersion,
          coreMocVersion
        );
        appendStageLog('error', 'ui', statusMessage);
        if (error instanceof Error && error.message !== statusMessage) {
          appendStageLog('error', 'ui', `原始错误: ${error.message}`);
        }
      }
    })();

    return () => {
      disposed = true;
      appendStageLog('info', 'ui', '组件卸载，开始清理资源');
      resizeObserver?.disconnect();
      window.removeEventListener('resize', resize);
      void avatar?.destroy();
      avatar = null;
    };
  });
</script>

<div class="live2d-avatar" aria-label="Live2D Avatar">
  <div class="canvas-host" bind:this={mountEl}>
    <canvas class="avatar-canvas" bind:this={canvasEl} aria-hidden="true"></canvas>
  </div>
  {#if statusMessage}
    <div class="status" class:error={statusMessage.includes('失败') || statusMessage.includes('未检测到')}>
      {statusMessage}
    </div>
  {/if}

  {#if statusMessage || stageLogs.some((item) => item.level === 'error')}
    <div class="log-panel" class:with-status={Boolean(statusMessage)} role="log" aria-live="polite">
      <div class="log-title">加载阶段日志（最近 8 条）</div>
      <div class="log-lines">
        {#each stageLogs.slice(-8) as item (item.id)}
          <div class="log-line" class:warn={item.level === 'warn'} class:error={item.level === 'error'}>
            {item.text}
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  .live2d-avatar {
    width: min(30vw, 280px);
    height: min(45vh, 360px);
    position: relative;
    border-radius: 12px;
    overflow: hidden;
    background: radial-gradient(circle at 50% 20%, rgba(129, 140, 248, 0.2), rgba(8, 12, 24, 0.02));
  }

  .canvas-host {
    width: 100%;
    height: 100%;
  }

  .avatar-canvas {
    width: 100%;
    height: 100%;
    display: block;
  }

  .status {
    position: absolute;
    left: 8px;
    right: 8px;
    bottom: 8px;
    padding: 6px 8px;
    border-radius: 8px;
    color: rgba(255, 255, 255, 0.88);
    font-size: 11px;
    line-height: 1.4;
    background: rgba(0, 0, 0, 0.45);
    backdrop-filter: blur(8px);
  }

  .status.error {
    background: rgba(127, 29, 29, 0.55);
  }

  .log-panel {
    position: absolute;
    left: 8px;
    right: 8px;
    bottom: 8px;
    border-radius: 8px;
    padding: 6px 8px;
    background: rgba(0, 0, 0, 0.52);
    color: rgba(232, 238, 255, 0.9);
    backdrop-filter: blur(8px);
    max-height: 128px;
    overflow: hidden;
  }

  .log-panel.with-status {
    bottom: 48px;
  }

  .log-title {
    font-size: 10px;
    line-height: 1.3;
    color: rgba(165, 180, 252, 0.9);
    margin-bottom: 4px;
  }

  .log-lines {
    display: flex;
    flex-direction: column;
    gap: 2px;
    max-height: 92px;
    overflow: auto;
  }

  .log-line {
    font-size: 10px;
    line-height: 1.35;
    font-family: 'Consolas', 'SFMono-Regular', 'Courier New', monospace;
    color: rgba(226, 232, 240, 0.92);
    word-break: break-all;
  }

  .log-line.warn {
    color: rgba(250, 204, 21, 0.95);
  }

  .log-line.error {
    color: rgba(254, 202, 202, 0.95);
  }

  @media (max-width: 900px) {
    .live2d-avatar {
      width: min(38vw, 220px);
      height: min(36vh, 280px);
    }
  }
</style>
