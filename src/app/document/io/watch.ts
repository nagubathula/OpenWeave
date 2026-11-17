import { isDesktop } from '@/app/desktop/env'
import { watchBrowserFile, watchDesktopFile } from '@/app/document/io/watch-targets'

type FileWatchOptions = {
  getFilePath: () => string | null
  getFileHandle: () => FileSystemFileHandle | null
  getLastWriteTime: () => number
  reloadFromDisk: () => void
}

export function createFileWatcher({
  getFilePath,
  getFileHandle,
  getLastWriteTime,
  reloadFromDisk
}: FileWatchOptions) {
  let unwatchFile: (() => void) | null = null

  function stopWatchingFile() {
    if (unwatchFile) {
      unwatchFile()
      unwatchFile = null
    }
  }

  async function startWatchingFile() {
    stopWatchingFile()
    const filePath = getFilePath()
    const fileHandle = getFileHandle()

    if (filePath && isDesktop()) {
      unwatchFile = await watchDesktopFile(filePath, getLastWriteTime, reloadFromDisk)
    } else if (fileHandle) {
      unwatchFile = await watchBrowserFile(
        fileHandle,
        getFileHandle,
        getLastWriteTime,
        reloadFromDisk,
        stopWatchingFile
      )
    }
  }

  return { startWatchingFile, stopWatchingFile }
}
