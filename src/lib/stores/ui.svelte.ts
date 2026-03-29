/**
 * UI 状态管理 —— Svelte 5 Runes
 *
 * 管理 UI 视图切换、面板显示等纯展示状态
 * 不持久化 —— 每次启动重置
 */

/** 可用视图枚举 */
export type ActiveView = 'chat' | 'settings';

/** UI 状态接口 */
interface UIState {
  /** 当前活动视图 */
  activeView: ActiveView;
  /** 侧边面板是否展开（预留：未来扩展用） */
  isPanelOpen: boolean;
  /** 是否显示截图缩略图预览 */
  showImagePreview: boolean;
}

/** UI 状态 —— 全局响应式状态 */
export const uiState: UIState = $state({
  activeView: 'chat',
  isPanelOpen: false,
  showImagePreview: false,
});

/**
 * 切换到指定视图
 * @param view - 目标视图
 */
export function setActiveView(view: ActiveView): void {
  uiState.activeView = view;
}

/**
 * 切换面板展开/折叠
 */
export function togglePanel(): void {
  uiState.isPanelOpen = !uiState.isPanelOpen;
}

/**
 * 设置截图预览显示状态
 */
export function setShowImagePreview(show: boolean): void {
  uiState.showImagePreview = show;
}
