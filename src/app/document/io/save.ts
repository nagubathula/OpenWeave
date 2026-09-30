import type { EditorState } from '@openweave/core/editor'

import { downloadBlob } from '@/app/document/io/browser'
import { documentNameFromFigPath } from '@/app/document/io/names'
import {
  chooseBrowserFigSaveHandle,
  chooseTauriFigSavePath,
  defaultTauriFigSavePath,
  figBaseName
} from '@/app/document/io/save-targets'
import type { DocumentSourceAccess } from '@/app/document/io/types'
import { createDocumentWriter } from '@/app/document/io/write'
import { addRecentFile, removeRecentFile } from '@/app/home/recent-files'
import { toast } from '@/app/shell/ui'
import { isTauri } from '@/app/tauri/env'

type SaveDocumentState = EditorState & { documentName: string }

type SaveActionsOptions = Omit<DocumentSourceAccess, 'getSavedVersion'> & {
  state: SaveDocumentState
  buildFigFile: () => Uint8Array | Promise<Uint8Array>
  stopWatchingFile?: () => void
  startWatchingFile: () => void
}

export function createSaveActions({
  state,
  buildFigFile,
  getFilePath,
  setFilePath,
  getFileHandle,
  setFileHandle,
  getDownloadName,
  setDownloadName,
  getStorageBinding,
  setStorageBinding,
  setSourceIdentity,
  setSavedVersion,
  setLastWriteTime,
  stopWatchingFile,
  startWatchingFile
}: SaveActionsOptions) {
  const writeFile = createDocumentWriter({
    state,
    getFilePath,
    getFileHandle,
    getStorageBinding,
    setSavedVersion,
    setLastWriteTime
  })

  async function saveFigFile() {
    let filePath = getFilePath()
    const fileHandle = getFileHandle()
    const storageBinding = getStorageBinding()
    const downloadName = getDownloadName()

    if (isTauri() && filePath && !storageBinding) {
      const currentName = documentNameFromFigPath(filePath)
      const targetName = state.documentName.trim()
      if (targetName && currentName !== targetName) {
        try {
          const electron = (window as any).electron || (window as any).electronAPI
          const dir = electron?.path?.dirname
            ? electron.path.dirname(filePath)
            : filePath.slice(0, Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\')))
          const safeName = targetName.replace(/[\\/]/g, '-') || 'Untitled'
          const join = electron?.path?.join
            ? electron.path.join
            : async (a: string, b: string) => `${a}/${b}`
          let newPath = await join(dir, `${safeName}.fig`)
          if (newPath !== filePath) {
            const exists = electron?.fs?.exists ? electron.fs.exists : async () => false
            if (await exists(newPath)) {
              for (let counter = 2; await exists(newPath); counter++) {
                newPath = await join(dir, `${safeName} ${counter}.fig`)
              }
            }
            stopWatchingFile?.()
            if (await exists(filePath)) {
              if (electron?.fs?.rename) {
                await electron.fs.rename(filePath, newPath)
              }
            }
            const oldPath = filePath
            setFilePath(newPath)
            filePath = newPath
            state.documentName = documentNameFromFigPath(newPath)
            setSourceIdentity({ handle: null, path: newPath })
            removeRecentFile(oldPath)
            addRecentFile({
              id: newPath,
              name: state.documentName,
              path: newPath,
              format: 'fig',
              updatedAt: new Date().toISOString()
            })
            startWatchingFile()
          }
        } catch (e) {
          console.warn('Failed to rename file on disk:', e)
          toast.error(
            `Failed to rename file on disk: ${e instanceof Error ? e.message : String(e)}`
          )
        }
      }
    }

    if (storageBinding || filePath || fileHandle) {
      const wrote = await writeFile(await buildFigFile())
      if (wrote && !storageBinding) {
        setSourceIdentity({ handle: fileHandle, path: filePath })
        if (filePath) {
          addRecentFile({
            id: filePath,
            name: state.documentName,
            path: filePath,
            format: 'fig',
            updatedAt: new Date().toISOString()
          })
        }
      }
    } else if (isTauri()) {
      // First save of a new document goes straight to Documents/openweave
      // without a picker; only Save As asks where.
      const data = await buildFigFile()
      const path = await defaultTauriFigSavePath(state.documentName)
      await persistTauriSave(path, data)
    } else if (downloadName) {
      downloadBlob(new Uint8Array(await buildFigFile()), downloadName, 'application/octet-stream')
    } else {
      await saveFigFileAs()
    }
  }

  async function persistTauriSave(path: string, data: Uint8Array): Promise<boolean> {
    setStorageBinding(null)
    setFilePath(path)
    setFileHandle(null)
    state.documentName = documentNameFromFigPath(path)
    const success = await writeFile(data)
    if (success) {
      setSourceIdentity({ handle: null, path })
      addRecentFile({
        id: path,
        name: state.documentName,
        path,
        format: 'fig',
        updatedAt: new Date().toISOString()
      })
    }
    startWatchingFile()
    return success
  }

  async function saveFigFileAs() {
    if (isTauri()) {
      const path = await chooseTauriFigSavePath(state.documentName)
      if (!path) return
      const data = await buildFigFile()
      await persistTauriSave(path, data)
      return
    }

    const suggestedName = state.documentName
      ? `${figBaseName(state.documentName)}.fig`
      : 'Untitled.fig'

    if (window.showSaveFilePicker) {
      let handle: FileSystemFileHandle | null = null
      try {
        handle = await chooseBrowserFigSaveHandle(suggestedName)
        // User deliberately cancelled the file picker
        if (!handle) return
      } catch (error) {
        // If user activation was lost or showSaveFilePicker is not allowed in this context,
        // catch NotAllowedError / SecurityError and fall back to prompt & downloadBlob below.
        const errName = (error as Error)?.name
        if (errName !== 'NotAllowedError' && errName !== 'SecurityError') {
          throw error
        }
      }

      if (handle) {
        setStorageBinding(null)
        setFileHandle(handle)
        setFilePath(null)
        state.documentName = documentNameFromFigPath(handle.name)
        const data = await buildFigFile()
        if (await writeFile(data)) setSourceIdentity({ handle, path: null })
        startWatchingFile()
        return
      }
    }

    const data = await buildFigFile()
    const filename = prompt('Save as:', getDownloadName() ?? suggestedName)
    if (!filename) return
    setStorageBinding(null)
    setDownloadName(filename)
    state.documentName = documentNameFromFigPath(filename)
    downloadBlob(new Uint8Array(data), filename, 'application/octet-stream')
  }

  return { saveFigFile, saveFigFileAs, writeFile }
}
