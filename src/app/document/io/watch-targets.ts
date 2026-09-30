const RECENT_WRITE_MS = 1000
const BROWSER_POLL_MS = 2000
const TAURI_WATCH_DELAY_MS = 500

export async function watchTauriFile(
  filePath: string,
  getLastWriteTime: () => number,
  reloadFromDisk: () => void
) {
  const electron =
    typeof window !== 'undefined' ? (window as any).electron || (window as any).electronAPI : null
  let lastMtime = 0
  if (electron?.fs?.stat) {
    try {
      const stats = await electron.fs.stat(filePath)
      lastMtime = stats?.mtimeMs || stats?.mtime || 0
    } catch {
      // ignore
    }
    const interval = setInterval(async () => {
      try {
        const stats = await electron.fs.stat(filePath)
        const mtime = stats?.mtimeMs || stats?.mtime || 0
        if (mtime > lastMtime) {
          lastMtime = mtime
          if (Date.now() - getLastWriteTime() < RECENT_WRITE_MS) return
          reloadFromDisk()
        }
      } catch {
        // ignore
      }
    }, TAURI_WATCH_DELAY_MS)
    return () => clearInterval(interval)
  }
  return () => {}
}

export async function watchBrowserFile(
  fileHandle: FileSystemFileHandle,
  getActiveFileHandle: () => FileSystemFileHandle | null,
  getLastWriteTime: () => number,
  reloadFromDisk: () => void,
  stopWatchingFile: () => void
) {
  let lastModified = (await fileHandle.getFile()).lastModified
  const interval = setInterval(() => {
    void checkBrowserFileModified(fileHandle)
  }, BROWSER_POLL_MS)
  const pause = () => clearInterval(interval)

  async function checkBrowserFileModified(handle: FileSystemFileHandle) {
    if (getActiveFileHandle() !== handle) {
      stopWatchingFile()
      return
    }
    try {
      const file = await handle.getFile()
      if (file.lastModified > lastModified) {
        lastModified = file.lastModified
        if (Date.now() - getLastWriteTime() < RECENT_WRITE_MS) return
        reloadFromDisk()
      }
    } catch {
      stopWatchingFile()
    }
  }

  return pause
}
