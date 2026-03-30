import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);

function run(cmd, cmdArgs, options = {}) {
  return spawnSync(cmd, cmdArgs, {
    stdio: 'inherit',
    shell: false,
    ...options
  });
}

// Windows 下执行 build 前，自动关闭正在运行的程序，避免打包时无法覆盖 exe。
if (process.platform === 'win32' && args[0] === 'build') {
  const kill = run('taskkill.exe', ['/IM', 'desktop-ai-assistant.exe', '/F', '/T']);

  // 128/1 常见于进程不存在，此时不视为失败。
  if (kill.status !== 0 && kill.status !== 1 && kill.status !== 128) {
    process.exit(kill.status ?? 1);
  }
}

const pnpmCommand = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const result = run(pnpmCommand, ['exec', 'tauri', ...args], {
  shell: process.platform === 'win32'
});
process.exit(result.status ?? 1);
