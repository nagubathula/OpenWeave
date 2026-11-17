import * as path from 'node:path'

import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'

import type { DesktopBridge, DesktopSpawnOptions } from '../src/app/desktop/types'

/**
 * Exposes the typed `window.electron` bridge (`DesktopBridge`). Every call is
 * a narrow `ipcRenderer.invoke` to a handler in `main.ts`; the renderer never
 * gets `ipcRenderer` itself.
 */

function subscribe(channel: string, listener: (...args: never[]) => void): () => void {
  const wrapped = (_event: IpcRendererEvent, ...args: unknown[]) =>
    (listener as (...a: unknown[]) => void)(...args)
  ipcRenderer.on(channel, wrapped)
  return () => {
    ipcRenderer.removeListener(channel, wrapped)
  }
}

async function spawnProcess(options: DesktopSpawnOptions) {
  const { onStdout, onStderr, onClose, ...request } = options
  const { id, pid } = (await ipcRenderer.invoke('process:spawn', request)) as {
    id: number
    pid?: number
  }
  const unsubscribers = [
    subscribe(`process:stdout:${id}`, (data: Uint8Array) => onStdout?.(data)),
    subscribe(`process:stderr:${id}`, (text: string) => onStderr?.(text))
  ]
  const unsubscribeClose = subscribe(`process:close:${id}`, (code: number | null) => {
    for (const unsubscribe of unsubscribers) unsubscribe()
    unsubscribeClose()
    onClose?.(code)
  })
  return {
    pid,
    write: async (data: number[] | Uint8Array) => {
      await ipcRenderer.invoke('process:write', id, Uint8Array.from(data))
    },
    kill: async () => {
      await ipcRenderer.invoke('process:kill', id)
    }
  }
}

const bridge: DesktopBridge = {
  isElectron: true,
  platform: process.platform,
  fs: {
    readFile: async (filePath) => new Uint8Array(await ipcRenderer.invoke('fs:readFile', filePath)),
    writeFile: (filePath, data) => ipcRenderer.invoke('fs:writeFile', filePath, data),
    exists: (filePath) => ipcRenderer.invoke('fs:exists', filePath),
    rename: (oldPath, newPath) => ipcRenderer.invoke('fs:rename', oldPath, newPath),
    mkdir: (dirPath, options) => ipcRenderer.invoke('fs:mkdir', dirPath, options),
    remove: (targetPath, options) => ipcRenderer.invoke('fs:remove', targetPath, options),
    stat: (targetPath) => ipcRenderer.invoke('fs:stat', targetPath),
    readDir: (targetPath) => ipcRenderer.invoke('fs:readDir', targetPath)
  },
  dialog: {
    showOpenDialog: (options) => ipcRenderer.invoke('dialog:showOpenDialog', options),
    showSaveDialog: (options) => ipcRenderer.invoke('dialog:showSaveDialog', options)
  },
  clipboard: {
    readText: () => ipcRenderer.invoke('clipboard:readText'),
    writeText: (text) => ipcRenderer.invoke('clipboard:writeText', text),
    readHtml: () => ipcRenderer.invoke('clipboard:readHtml'),
    writeHtml: (html, altText) => ipcRenderer.invoke('clipboard:writeHtml', html, altText)
  },
  fonts: {
    listFamilies: () => ipcRenderer.invoke('fonts:listFamilies'),
    loadFont: (family, style) => ipcRenderer.invoke('fonts:loadFont', family, style)
  },
  shell: {
    openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),
    openPath: (filePath) => ipcRenderer.invoke('shell:openPath', filePath),
    trashItem: (filePath) => ipcRenderer.invoke('shell:trashItem', filePath)
  },
  path: {
    join: (...paths) => ipcRenderer.invoke('path:join', paths),
    dirname: (p) => path.dirname(p),
    basename: (p, ext) => path.basename(p, ext),
    extname: (p) => path.extname(p)
  },
  app: {
    getPath: (name) => ipcRenderer.invoke('app:getPath', name),
    takePendingOpenFiles: () => ipcRenderer.invoke('app:takePendingOpenFiles'),
    onOpenFiles: (listener) => subscribe('app:open-files', listener)
  },
  menu: {
    onCommand: (listener) => subscribe('menu:command', listener)
  },
  process: {
    spawn: spawnProcess
  },
  tunnel: {
    start: () => ipcRenderer.invoke('collab:startShareTunnel'),
    stop: () => ipcRenderer.invoke('collab:stopShareTunnel'),
    status: () => ipcRenderer.invoke('collab:shareTunnelStatus')
  },
  credentials: {
    availability: () => ipcRenderer.invoke('credentials:availability'),
    status: (reference) => ipcRenderer.invoke('credentials:status', reference),
    read: (reference) => ipcRenderer.invoke('credentials:read', reference),
    write: (reference, value) => ipcRenderer.invoke('credentials:write', reference, value),
    remove: (reference) => ipcRenderer.invoke('credentials:remove', reference)
  },
  http: {
    request: (request) => ipcRenderer.invoke('http:request', request)
  },
  updater: {
    check: () => ipcRenderer.invoke('updater:check'),
    download: () => ipcRenderer.invoke('updater:download'),
    installAndRestart: () => ipcRenderer.invoke('updater:install')
  },
  devtools: {
    toggle: () => ipcRenderer.invoke('devtools:toggle')
  }
}

contextBridge.exposeInMainWorld('electron', bridge)
