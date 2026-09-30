import { contextBridge, ipcRenderer } from 'electron'
import * as path from 'node:path'

async function resolvePathWithBase(rawPath: string, baseDir?: number): Promise<string> {
  if (!rawPath) return rawPath
  if (baseDir != null && !path.isAbsolute(rawPath)) {
    const base = await ipcRenderer.invoke('path:resolveDirectory', baseDir)
    return path.join(base, rawPath)
  }
  return rawPath
}

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

// Listen for file association open events
ipcRenderer.on('open-associated-files', () => {
  window.dispatchEvent(new CustomEvent('openweave-open-associated-files'))
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
      ipcRenderer.invoke('fs:exists', filePath),
    rename: (oldPath: string, newPath: string): Promise<boolean> =>
      ipcRenderer.invoke('fs:rename', oldPath, newPath),
    mkdir: (dirPath: string, options?: { recursive?: boolean }): Promise<boolean> =>
      ipcRenderer.invoke('fs:mkdir', dirPath, options),
    remove: (targetPath: string, options?: { recursive?: boolean }): Promise<boolean> =>
      ipcRenderer.invoke('fs:remove', targetPath, options),
    trashItem: (targetPath: string): Promise<boolean> =>
      ipcRenderer.invoke('shell:trashItem', targetPath),
    stat: (targetPath: string): Promise<any> =>
      ipcRenderer.invoke('fs:stat', targetPath),
    readDir: (targetPath: string): Promise<any[]> =>
      ipcRenderer.invoke('fs:readDir', targetPath)
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
      ipcRenderer.invoke('shell:openExternal', url),
    trashItem: (filePath: string): Promise<boolean> =>
      ipcRenderer.invoke('shell:trashItem', filePath)
  },
  path: {
    join: (...paths: string[]): Promise<string> =>
      ipcRenderer.invoke('path:join', paths),
    dirname: (p: string): string => path.dirname(p),
    basename: (p: string, ext?: string): string => path.basename(p, ext),
    extname: (p: string): string => path.extname(p)
  },
  app: {
    getPath: (name: string): Promise<string> =>
      ipcRenderer.invoke('app:getPath', name),
    takePendingOpenFiles: (): Promise<Array<{ path: string }>> =>
      ipcRenderer.invoke('app:takePendingOpenFiles')
  },
  process: {
    spawn: async (options: {
      command: string
      args?: string[]
      env?: Record<string, string>
      cwd?: string
      onStdout?: (data: Uint8Array) => void
      onStderr?: (data: string) => void
      onClose?: (code: number | null) => void
    }) => {
      const res = await ipcRenderer.invoke('process:spawn', {
        command: options.command,
        args: options.args,
        env: options.env,
        cwd: options.cwd
      })
      if (res.error) throw new Error(res.error)
      const procId: number = res.procId

      const stdoutHandler = (_: any, data: number[]) => options.onStdout?.(new Uint8Array(data))
      const stderrHandler = (_: any, text: string) => options.onStderr?.(text)
      const closeHandler = (_: any, code: number | null) => {
        ipcRenderer.removeListener(`process:stdout:${procId}`, stdoutHandler)
        ipcRenderer.removeListener(`process:stderr:${procId}`, stderrHandler)
        ipcRenderer.removeListener(`process:close:${procId}`, closeHandler)
        options.onClose?.(code)
      }

      ipcRenderer.on(`process:stdout:${procId}`, stdoutHandler)
      ipcRenderer.on(`process:stderr:${procId}`, stderrHandler)
      ipcRenderer.on(`process:close:${procId}`, closeHandler)

      return {
        pid: res.pid,
        write: (data: number[] | Uint8Array) =>
          ipcRenderer.invoke('process:write', procId, Array.from(data)),
        kill: () => ipcRenderer.invoke('process:kill', procId)
      }
    }
  },
  tunnel: {
    start: (): Promise<{ url: string }> => ipcRenderer.invoke('collab:startShareTunnel'),
    stop: (): Promise<void> => ipcRenderer.invoke('collab:stopShareTunnel'),
    status: (): Promise<string | null> => ipcRenderer.invoke('collab:shareTunnelStatus')
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
      case 'start_share_tunnel':
        return ipcRenderer.invoke('collab:startShareTunnel')

      case 'stop_share_tunnel':
        return ipcRenderer.invoke('collab:stopShareTunnel')

      case 'share_tunnel_status':
        return ipcRenderer.invoke('collab:shareTunnelStatus')

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
        const filePath = await resolvePathWithBase(args.path, args.options?.baseDir)
        const buffer = await ipcRenderer.invoke('fs:readFile', filePath)
        return buffer ? new Uint8Array(buffer) : null
      }

      case 'plugin:fs|read_text_file':
      case 'plugin:fs|readTextFile': {
        const filePath = await resolvePathWithBase(args.path, args.options?.baseDir)
        const buffer = await ipcRenderer.invoke('fs:readFile', filePath)
        return buffer ? new TextDecoder().decode(new Uint8Array(buffer)) : null
      }

      case 'plugin:fs|write_file':
      case 'plugin:fs|writeFile': {
        const filePath = await resolvePathWithBase(args.path, args.options?.baseDir)
        return ipcRenderer.invoke('fs:writeFile', filePath, args.data)
      }

      case 'plugin:fs|exists': {
        const filePath = await resolvePathWithBase(args.path, args.options?.baseDir)
        return ipcRenderer.invoke('fs:exists', filePath)
      }

      case 'plugin:fs|rename': {
        const oldP = await resolvePathWithBase(
          args.oldPath ?? args.from ?? args.path,
          args.options?.oldPathBaseDir ?? args.options?.baseDir
        )
        const newP = await resolvePathWithBase(
          args.newPath ?? args.to,
          args.options?.newPathBaseDir ?? args.options?.baseDir
        )
        return ipcRenderer.invoke('fs:rename', oldP, newP)
      }

      case 'plugin:fs|mkdir': {
        const filePath = await resolvePathWithBase(args.path, args.options?.baseDir)
        return ipcRenderer.invoke('fs:mkdir', filePath, args.options)
      }

      case 'plugin:fs|remove': {
        const filePath = await resolvePathWithBase(args.path, args.options?.baseDir)
        return ipcRenderer.invoke('fs:remove', filePath, args.options)
      }

      case 'plugin:fs|stat': {
        const filePath = await resolvePathWithBase(args.path, args.options?.baseDir)
        return ipcRenderer.invoke('fs:stat', filePath)
      }

      case 'plugin:fs|read_dir':
      case 'plugin:fs|readDir': {
        const filePath = await resolvePathWithBase(args.path, args.options?.baseDir)
        return ipcRenderer.invoke('fs:readDir', filePath)
      }

      case 'plugin:fs|watch':
        return 1

      case 'plugin:resources|close':
        return undefined

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

      case 'plugin:path|join': {
        const validPaths = (args.paths || []).filter((p: unknown) => typeof p === 'string')
        return path.join(...validPaths)
      }

      case 'plugin:path|dirname':
        return path.dirname(args.path || '')

      case 'plugin:path|basename':
        return path.basename(args.path || '', args.ext)

      case 'plugin:path|extname':
        return path.extname(args.path || '').replace(/^\./, '')

      case 'plugin:path|resolve': {
        const validPaths = (args.paths || []).filter((p: unknown) => typeof p === 'string')
        return path.resolve(...validPaths)
      }

      case 'plugin:path|normalize':
        return path.normalize(args.path || '')

      case 'plugin:path|is_absolute':
        return path.isAbsolute(args.path || '')

      case 'plugin:path|resolve_directory': {
        const base = await ipcRenderer.invoke('path:resolveDirectory', args.directory)
        return args.path ? path.join(base, args.path) : base
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
  contextBridge.exposeInMainWorld('electron', electronAPI)
  contextBridge.exposeInMainWorld('electronAPI', electronAPI)
  contextBridge.exposeInMainWorld('__TAURI_INTERNALS__', tauriInternals)
  contextBridge.exposeInMainWorld('__TAURI_EVENT_PLUGIN_INTERNALS__', tauriEventPluginInternals)
} catch {
  // If contextIsolation is off or in test context
  ;(window as any).electron = electronAPI
  ;(window as any).electronAPI = electronAPI
  ;(window as any).__TAURI_INTERNALS__ = tauriInternals
  ;(window as any).__TAURI_EVENT_PLUGIN_INTERNALS__ = tauriEventPluginInternals
}
