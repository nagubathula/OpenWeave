import type { EditorState } from '@openweave/core/editor'

import { downloadBlob } from '@/app/document/io/browser'
import { documentNameFromFigPath } from '@/app/document/io/names'
import {
  chooseBrowserFigSaveHandle,
  chooseTauriFigSavePath,
  defaultTauriFigSavePath
} from '@/app/document/io/save-targets'
import type { DocumentSourceAccess } from '@/app/document/io/types'
import { createDocumentWriter } from '@/app/document/io/write'
import { addRecentFile } from '@/app/home/recent-files'
import { IS_TAURI } from '@/constants'

type SaveDocumentState = EditorState & { documentName: string }

type SaveActionsOptions = Omit<DocumentSourceAccess, 'getSavedVersion'> & {
  state: SaveDocumentState
  buildFigFile: () => Uint8Array | Promise<Uint8Array>
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
    const filePath = getFilePath()
    const fileHandle = getFileHandle()
    const storageBinding = getStorageBinding()
    const downloadName = getDownloadName()
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
    } else if (IS_TAURI) {
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
    const data = await buildFigFile()

    if (IS_TAURI) {
      const path = await chooseTauriFigSavePath(state.documentName)
      if (!path) return
      await persistTauriSave(path, data)
      return
    }

    if (window.showSaveFilePicker) {
      const handle = await chooseBrowserFigSaveHandle()
      if (!handle) return
      setStorageBinding(null)
      setFileHandle(handle)
      setFilePath(null)
      state.documentName = documentNameFromFigPath(handle.name)
      if (await writeFile(data)) setSourceIdentity({ handle, path: null })
      startWatchingFile()
      return
    }

    const filename = prompt('Save as:', getDownloadName() ?? 'Untitled.fig')
    if (!filename) return
    setStorageBinding(null)
    setDownloadName(filename)
    state.documentName = documentNameFromFigPath(filename)
    downloadBlob(new Uint8Array(data), filename, 'application/octet-stream')
  }

  return { saveFigFile, saveFigFileAs, writeFile }
}
