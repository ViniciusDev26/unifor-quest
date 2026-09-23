import { spawn } from 'node:child_process'

/**
 * Kills a process and everything it spawned.
 *
 * On Windows, killing the parent leaves the children running — a compiler that spawned a
 * linker keeps going, and the work directory stays locked (ADR 0009). `taskkill /T` is the
 * way out. On Linux and macOS the child is started in its own process group, so killing
 * the negative pid takes the group down with it.
 */
export function killTree(pid: number): void {
  if (process.platform === 'win32') {
    spawn('taskkill', ['/pid', String(pid), '/T', '/F'], { stdio: 'ignore' }).unref()
    return
  }

  try {
    process.kill(-pid, 'SIGKILL')
  } catch {
    // The group is already gone; nothing left to kill.
    try {
      process.kill(pid, 'SIGKILL')
    } catch {
      // Ditto.
    }
  }
}
