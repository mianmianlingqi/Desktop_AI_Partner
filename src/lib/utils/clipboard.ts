/**
 * 剪贴板工具函数
 *
 * 通过 Tauri 插件操作系统剪贴板
 */

import { writeText, readText } from '@tauri-apps/plugin-clipboard-manager';

/**
 * 复制文本到系统剪贴板
 * @param text - 要复制的文本内容
 * @throws 复制失败时抛出异常
 */
export async function copyToClipboard(text: string): Promise<void> {
  try {
    await writeText(text);
  } catch (err) {
    throw new Error(
      `剪贴板写入失败，步骤[writeText]，` +
      `原因[${err instanceof Error ? err.message : String(err)}]。` +
      `Hint: 请检查剪贴板权限或重试`
    );
  }
}

/**
 * 从系统剪贴板读取文本
 * @returns 剪贴板中的文本内容
 * @throws 读取失败时抛出异常
 */
export async function readFromClipboard(): Promise<string> {
  try {
    const text = await readText();
    return text ?? '';
  } catch (err) {
    throw new Error(
      `剪贴板读取失败，步骤[readText]，` +
      `原因[${err instanceof Error ? err.message : String(err)}]。` +
      `Hint: 请检查剪贴板权限或当前内容是否为文本`
    );
  }
}
