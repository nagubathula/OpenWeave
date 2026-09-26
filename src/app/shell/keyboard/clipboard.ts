import { extractImageFilesFromClipboard } from '@openweave/react'

import type { EditorStore } from '@/app/editor/active-store'
import {
  copySelectionToTauriClipboard,
  pasteFromBrowserClipboard,
  pasteFromTauriClipboard
} from '@/app/editor/clipboard/system'
import { isEditing } from '@/app/shell/keyboard/focus'
import { isTauri } from '@/app/tauri/env'

function cursorPosition(store: EditorStore) {
  const { cursorCanvasX: ccx, cursorCanvasY: ccy } = store.state
  return ccx != null && ccy != null ? { x: ccx, y: ccy } : undefined
}

export function bindEditorClipboard(store: EditorStore) {
  const onCopy = (e: ClipboardEvent) => {
    if (isEditing(e)) return
    e.preventDefault()
    if (isTauri()) {
      void copySelectionToTauriClipboard(store).catch(() => {})
      return
    }
    if (e.clipboardData) void store.writeCopyData(e.clipboardData)
  }

  const onCut = (e: ClipboardEvent) => {
    if (isEditing(e)) return
    e.preventDefault()
    if (isTauri()) {
      void copySelectionToTauriClipboard(store)
        .then((copied) => {
          if (copied) store.deleteSelected()
          return undefined
        })
        .catch(() => {})
      return
    }
    if (e.clipboardData) void store.writeCopyData(e.clipboardData)
    store.deleteSelected()
  }

  const onPaste = (e: ClipboardEvent) => {
    if (isEditing(e)) return
    e.preventDefault()

    const cursorPos = cursorPosition(store)

    const imageFiles = extractImageFilesFromClipboard(e)
    if (imageFiles.length) {
      const cx = cursorPos?.x ?? (-store.state.panX + window.innerWidth / 2) / store.state.zoom
      const cy = cursorPos?.y ?? (-store.state.panY + window.innerHeight / 2) / store.state.zoom
      void store.placeImageFiles(imageFiles, cx, cy).catch((err) => {
        console.warn('Failed to place clipboard images', err)
      })
      return
    }

    // In Tauri, DO NOT call getData('text/html') — WebView2 allocates the entire
    // clipboard as a V8 string before returning, which OOMs the renderer for large
    // Figma presentations. The Rust command reads CF_HTML via arboard and enforces
    // a size limit *before* any bytes cross the Rust→JS IPC boundary.
    if (isTauri()) {
      void pasteFromTauriClipboard(store, cursorPos).catch((err) => {
        console.warn('Failed to paste from Tauri clipboard', err)
      })
      return
    }

    // getData('text/html') reads CF_HTML — correct for browser/web-app context.
    const html = e.clipboardData?.getData('text/html') ?? ''
    if (html) {
      void store.pasteFromHTML(html, cursorPos).catch((err) => {
        console.warn('Failed to paste HTML from clipboard event', err)
      })
      return
    }

    void pasteFromBrowserClipboard(store, cursorPos).catch((err) => {
      console.warn('Failed to paste from browser clipboard', err)
    })
  }

  window.addEventListener('copy', onCopy)
  window.addEventListener('cut', onCut)
  window.addEventListener('paste', onPaste)

  return () => {
    window.removeEventListener('copy', onCopy)
    window.removeEventListener('cut', onCut)
    window.removeEventListener('paste', onPaste)
  }
}
