import type { ChatTransport, UIMessage } from 'ai'

import { fontManager, type FontManager } from '@openweave/core/text'

import { ensureGraphFonts, loadFont } from '@/app/editor/fonts'
import type { EditorStore } from '@/app/editor/session/create'

export interface OpenWeaveTestHooks {
  writeCount?: () => number
  mockHandle?: FileSystemFileHandle
  savedOpen?: Window['open']
}

export interface OpenWeaveWindowAPI {
  getStore?: () => EditorStore
  getFontManager?: () => FontManager
  ensureGraphFonts?: typeof ensureGraphFonts
  loadFont?: typeof loadFont
  setChatTransport?: (factory: () => ChatTransport<UIMessage>) => void
  openFile?: (path: string) => Promise<void>
  test?: OpenWeaveTestHooks
}

declare global {
  interface Window {
    openWeave?: OpenWeaveWindowAPI
  }
}

let activeStore: EditorStore | null = null

function windowApi(): OpenWeaveWindowAPI {
  window.openWeave ??= {}
  window.openWeave.getStore ??= () => {
    if (!activeStore) throw new Error('OpenWeave store not initialized')
    return activeStore
  }
  window.openWeave.getFontManager ??= () => fontManager
  window.openWeave.ensureGraphFonts ??= ensureGraphFonts
  window.openWeave.loadFont ??= loadFont
  return window.openWeave
}

export function setOpenWeaveStore(store: EditorStore) {
  activeStore = store
  windowApi()
}

export function exposeChatTransportOverride(
  setChatTransport: (factory: () => ChatTransport<UIMessage>) => void
) {
  windowApi().setChatTransport = setChatTransport
}

export function setOpenWeaveOpenFileHandler(openFile: (path: string) => Promise<void>) {
  windowApi().openFile = openFile
}
