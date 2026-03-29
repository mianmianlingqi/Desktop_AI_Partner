/**
 * 通用格式化工具函数
 *
 * 提供时间戳格式化、文本截断等通用操作
 */

/**
 * 格式化时间戳为可读字符串
 * @param timestamp - Unix 毫秒时间戳或 Date 对象
 * @returns 格式化的时间字符串（如 "14:30" 或 "昨天 14:30"）
 */
export function formatTimestamp(timestamp: number | Date): string {
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  const now = new Date();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const timeStr = `${hours}:${minutes}`;

  // 同一天 → 只显示时间
  if (date.toDateString() === now.toDateString()) {
    return timeStr;
  }

  // 昨天
  const yesterday = new Date(now.getTime());
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return `昨天 ${timeStr}`;
  }

  // 更早 → 显示日期 + 时间
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${month}-${day} ${timeStr}`;
}

/**
 * 截断文本到指定长度，超出部分用省略号替代
 * @param text - 原始文本
 * @param maxLength - 最大长度（默认 100）
 * @returns 截断后的文本
 */
export function truncateText(text: string, maxLength: number = 100): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '…';
}

/**
 * 将 Base64 字符串转为可用于 img src 的 Data URL
 * @param base64 - 纯 Base64 字符串（不含前缀）
 * @param mimeType - MIME 类型（默认 image/png）
 * @returns 完整的 Data URL
 */
export function base64ToDataUrl(base64: string, mimeType: string = 'image/png'): string {
  return `data:${mimeType};base64,${base64}`;
}

/**
 * 将未知错误对象提取为可读文本
 * @param error - 任意来源的错误对象
 * @param fallback - 提取失败时的兜底文案
 */
export function extractErrorMessage(error: unknown, fallback: string = '未知错误'): string {
  if (error instanceof Error) {
    return error.message || fallback;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (typeof error === 'object' && error !== null) {
    // Tauri invoke 常见错误结构：{ message: string, error: string }
    const tauriError = error as Record<string, unknown>;
    const message = tauriError.message;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
    const nestedError = tauriError.error;
    if (typeof nestedError === 'string' && nestedError.trim()) {
      return nestedError;
    }
  }

  try {
    return JSON.stringify(error);
  } catch {
    return String(error || fallback);
  }
}
