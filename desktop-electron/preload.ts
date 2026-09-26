import { contextBridge, ipcRenderer } from 'electron'

// Callback store for Tauri IPC compatibility
const callbacks = new Map<number, (payload: any) => void>()
const eventListeners = new Map<string, number[]>()
let callbackIdCounter = 1

function transformCallback(callback: (payload: any) => void, once = false): number {
  const id = callbackIdCounter++
  callbacks.set(id, (payload: any) => {
    if (once) callbacks.delete(id)
    callback(payload)
  })
  return id
}

function unregisterCallback(id: number): void {
  callbacks.delete(id)
}

function unregisterListener(event: string, eventId: number): void {
  const handlers = eventListeners.get(event)
  if (handlers) {
    const idx = handlers.indexOf(eventId)
    if (idx !== -1) handlers.splice(idx, 1)
  }
  unregisterCallback(eventId)
}

// Listen for push events from Electron main process
ipcRenderer.on('__tauri_event__', (_event, { eventName, payload }) => {
  const handlers = eventListeners.get(eventName) || []
  for (const handlerId of handlers) {
    const cb = callbacks.get(handlerId)
    if (cb) {
      try {
        cb({ event: eventName, payload, id: handlerId })
      } catch (err) {
        console.error(`Error invoking callback for ${eventName}:`, err)
      }
    }
  }
})

// Listen for menu events from Electron main process
ipcRenderer.on('menu-event', (_event, menuId: string) => {
  // Also dispatch as a custom DOM event for renderer listeners
  window.dispatchEvent(new CustomEvent('openweave-menu-event', { detail: menuId }))
})

// Clean electron API
const electronAPI = {
  isElectron: true,
  platform: process.platform,
  fs: {
    readFile: (filePath: string): Promise<Uint8Array> =>
      ipcRenderer.invoke('fs:readFile', filePath),
    writeFile: (filePath: string, data: Uint8Array): Promise<boolean> =>
      ipcRenderer.invoke('fs:writeFile', filePath, data),
    exists: (filePath: string): Promise<boolean> =>
      ipcRenderer.invoke('fs:exists', filePath)
  },
  dialog: {
    showOpenDialog: (options: any): Promise<string[] | null> =>
      ipcRenderer.invoke('dialog:showOpenDialog', options),
    showSaveDialog: (options: any): Promise<string | null> =>
      ipcRenderer.invoke('dialog:showSaveDialog', options)
  },
  clipboard: {
    readText: (): Promise<string> =>
      ipcRenderer.invoke('clipboard:readText'),
    writeText: (text: string): Promise<void> =>
      ipcRenderer.invoke('clipboard:writeText', text),
    readHtml: (): Promise<string | null> =>
      ipcRenderer.invoke('clipboard:readHtml'),
    writeHtml: (html: string, altText?: string): Promise<void> =>
      ipcRenderer.invoke('clipboard:writeHtml', html, altText)
  },
  fonts: {
    listFamilies: (): Promise<Array<{ family: string; styles: string[] }>> =>
      ipcRenderer.invoke('fonts:listFamilies'),
    loadFont: (family: string, style?: string): Promise<number[] | null> =>
      ipcRenderer.invoke('fonts:loadFont', family, style)
  },
  shell: {
    openExternal: (url: string): Promise<void> =>
      ipcRenderer.invoke('shell:openExternal', url)
  },
  getPendingOpenFiles: (): Promise<string[]> =>
    ipcRenderer.invoke('app:getPendingOpenFiles')
}

// Tauri IPC Compatibility bridge
const tauriInternals = {
  transformCallback,
  unregisterCallback,
  invoke: async (cmd: string, args: any = {}): Promise<any> => {
    switch (cmd) {
      case 'list_system_fonts':
        return ipcRenderer.invoke('fonts:listFamilies')

      case 'load_system_font':
        return ipcRenderer.invoke('fonts:loadFont', args.family, args.style)

      case 'read_clipboard_html_limited':
        return ipcRenderer.invoke('clipboard:readHtml')

      case 'take_pending_open': {
        const files: Array<{ path: string } | string> = await ipcRenderer.invoke('app:getPendingOpenFiles')
        return (files || []).map((f) => (typeof f === 'string' ? { path: f } : f))
      }

      case 'plugin:dialog|open': {
        const result = await ipcRenderer.invoke('dialog:showOpenDialog', args)
        if (!result) return null
        return args.multiple ? result : result[0] ?? null
      }

      case 'plugin:dialog|save':
        return ipcRenderer.invoke('dialog:showSaveDialog', args)

      case 'plugin:fs|read_file':
      case 'plugin:fs|readFile': {
        const buffer = await ipcRenderer.invoke('fs:readFile', args.path)
        return buffer ? new Uint8Array(buffer) : null
      }

      case 'plugin:fs|write_file':
      case 'plugin:fs|writeFile':
        return ipcRenderer.invoke('fs:writeFile', args.path, args.data)

      case 'plugin:fs|exists':
        return ipcRenderer.invoke('fs:exists', args.path)

      case 'plugin:clipboard-manager|read_text':
      case 'plugin:clipboard-manager|readText':
        return ipcRenderer.invoke('clipboard:readText')

      case 'plugin:clipboard-manager|write_text':
      case 'plugin:clipboard-manager|writeText':
        return ipcRenderer.invoke('clipboard:writeText', args.text)

      case 'plugin:clipboard-manager|write_html':
      case 'plugin:clipboard-manager|writeHtml':
        return ipcRenderer.invoke('clipboard:writeHtml', args.html, args.altText)

      case 'plugin:opener|open_url':
      case 'plugin:opener|openUrl':
        return ipcRenderer.invoke('shell:openExternal', args.url)

      case 'plugin:opener|open_path':
      case 'plugin:opener|openPath':
        return ipcRenderer.invoke('shell:openPath', args.path)

      case 'plugin:event|listen': {
        const eventName = args.event as string
        const handlerId = args.handler as number
        if (!eventListeners.has(eventName)) {
          eventListeners.set(eventName, [])
        }
        eventListeners.get(eventName)?.push(handlerId)
        return handlerId
      }

      case 'plugin:event|unlisten': {
        const handlers = eventListeners.get(args.event)
        if (handlers) {
          const idx = handlers.indexOf(args.eventId)
          if (idx !== -1) handlers.splice(idx, 1)
        }
        unregisterCallback(args.eventId)
        return undefined
      }

      case 'credential_status':
      case 'credential_store_availability':
        return { available: false }

      default:
        console.warn(`[Electron Tauri Shim] Unhandled invoke cmd: ${cmd}`, args)
        return null
    }
  }
}

const tauriEventPluginInternals = {
  unregisterListener
}

try {
  contextBridge.exposeInMainWorld('electronAPI', electronAPI)
  contextBridge.exposeInMainWorld('__TAURI_INTERNALS__', tauriInternals)
  contextBridge.exposeInMainWorld('__TAURI_EVENT_PLUGIN_INTERNALS__', tauriEventPluginInternals)
} catch {
  // If contextIsolation is off or in test context
  ;(window as any).electronAPI = electronAPI
  ;(window as any).__TAURI_INTERNALS__ = tauriInternals
  ;(window as any).__TAURI_EVENT_PLUGIN_INTERNALS__ = tauriEventPluginInternals
}
