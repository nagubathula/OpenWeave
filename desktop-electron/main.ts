import { spawn, type ChildProcess } from 'node:child_process'
import * as fs from 'node:fs'
import * as path from 'node:path'

import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
  protocol,
  safeStorage,
  shell,
  type IpcMainInvokeEvent,
  type OpenDialogOptions
} from 'electron'

import type {
  DesktopCredentialRef,
  DesktopHttpRequest,
  DesktopOpenDialogOptions,
  DesktopSaveDialogOptions,
  DesktopSpawnOptions
} from '../src/app/desktop/types'
import { APP_ORIGIN, APP_SCHEME, createAppProtocolHandler } from './app-assets'
import {
  readClipboardHtml,
  readClipboardText,
  writeClipboardHtml,
  writeClipboardText
} from './clipboard'
import { DesktopCredentialStore, type CredentialCipher } from './credentials'
import { listSystemFontFamilies, loadSystemFont } from './fonts'
import { proxyHttpRequest } from './http-proxy'
import { buildAppMenu } from './menu'
import { shareTunnelStatus, startShareTunnel, stopShareTunnel } from './tunnel'
import { checkForUpdate, downloadUpdate, installUpdateAndRestart } from './updater'

const DOCUMENT_EXTENSIONS = new Set(['.fig', '.pen', '.html', '.htm', '.xhtml'])
const DEV_URL = process.env.DEV_URL ?? null
/**
 * App root at runtime: the folder holding package.json for `electron .`, or the
 * asar root when packaged. Never use `__dirname` here — Bun inlines it as the
 * build machine's source path.
 */
const APP_ROOT = app.getAppPath()
const DIST_ROOT = path.join(APP_ROOT, 'dist')
const PRELOAD_PATH = path.join(APP_ROOT, 'desktop-electron', 'dist', 'preload.cjs')
const ICON_PATH = path.join(APP_ROOT, 'desktop-electron', 'resources', 'icon.png')
/** Native window controls over the 40px tab strip; colors match its dark surface. */
const TITLE_BAR_OVERLAY = { color: '#2c2c2c', symbolColor: '#e5e5e5', height: 40 }

let mainWindow: BrowserWindow | null = null
const pendingOpenFiles: string[] = []

protocol.registerSchemesAsPrivileged([
  {
    scheme: APP_SCHEME,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
      allowServiceWorkers: true
    }
  }
])

function collectFileArgs(args: string[]): string[] {
  return args
    .filter(
      (arg) => !arg.startsWith('-') && DOCUMENT_EXTENSIONS.has(path.extname(arg).toLowerCase())
    )
    .map((arg) => path.resolve(arg))
    .filter((arg) => fs.existsSync(arg))
}

function queueOpenFiles(files: string[]) {
  if (files.length === 0) return
  pendingOpenFiles.push(...files)
  mainWindow?.webContents.send('app:open-files')
}

pendingOpenFiles.push(...collectFileArgs(process.argv.slice(1)))

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', (_event, commandLine) => {
    if (!mainWindow) return
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
    queueOpenFiles(collectFileArgs(commandLine))
  })
}

// macOS delivers Finder "Open With" and dock drops through this event.
app.on('open-file', (event, filePath) => {
  event.preventDefault()
  queueOpenFiles(collectFileArgs([filePath]))
})

/**
 * `scheme://host[:port]` for any URL. `URL.origin` is the string "null" for
 * custom schemes such as `app:`, so it cannot be used to compare origins.
 */
function originOf(url: string): string | null {
  try {
    const parsed = new URL(url)
    return `${parsed.protocol}//${parsed.host}`
  } catch {
    return null
  }
}

/** The renderer origin this build trusts with privileged IPC. */
function trustedOrigin(): string {
  return originOf(DEV_URL ?? APP_ORIGIN) ?? APP_ORIGIN
}

function assertTrustedSender(event: IpcMainInvokeEvent) {
  const frame = event.senderFrame
  if (!frame || event.sender !== mainWindow?.webContents || frame.parent) {
    throw new Error('Untrusted IPC sender')
  }
  if (originOf(frame.url) !== trustedOrigin()) throw new Error('Untrusted IPC origin')
}

function handle<Args extends unknown[], Result>(
  channel: string,
  listener: (...args: Args) => Result | Promise<Result>
) {
  ipcMain.handle(channel, (event, ...args) => {
    assertTrustedSender(event)
    return listener(...(args as Args))
  })
}

function createCredentialStore() {
  const cipher: CredentialCipher = {
    isAvailable: () =>
      safeStorage.isEncryptionAvailable() &&
      !(process.platform === 'linux' && safeStorage.getSelectedStorageBackend() === 'basic_text'),
    isLocked: () => false,
    encrypt: (plainText) => safeStorage.encryptString(plainText),
    decrypt: (cipherText) => safeStorage.decryptString(cipherText)
  }
  const file = path.join(app.getPath('userData'), 'credentials.v1.json')
  return new DesktopCredentialStore(cipher, {
    read: async () => {
      try {
        return await fs.promises.readFile(file, 'utf8')
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null
        throw error
      }
    },
    write: async (contents) => {
      const temp = `${file}.${process.pid}.tmp`
      await fs.promises.writeFile(temp, contents, { mode: 0o600 })
      await fs.promises.rename(temp, file)
    }
  })
}

function normalizeFilters(
  filters: DesktopOpenDialogOptions['filters'],
  fallback: OpenDialogOptions['filters']
) {
  return (
    filters?.map((f) => ({
      name: f.name || 'Files',
      extensions: f.extensions?.length ? f.extensions : ['*']
    })) ?? fallback
  )
}

function registerProcessHandlers() {
  const running = new Map<number, ChildProcess>()
  let nextId = 1

  handle(
    'process:spawn',
    (options: Omit<DesktopSpawnOptions, 'onStdout' | 'onStderr' | 'onClose'>) => {
      const id = nextId++
      // `shell` on Windows lets npm `.cmd` shims (claude-agent-acp, openweave-mcp-http) resolve.
      const child = spawn(options.command, options.args ?? [], {
        cwd: options.cwd || undefined,
        env: { ...process.env, ...options.env },
        shell: process.platform === 'win32',
        windowsHide: true
      })
      running.set(id, child)
      const send = (channel: string, payload: unknown) => {
        if (mainWindow && !mainWindow.isDestroyed())
          mainWindow.webContents.send(`${channel}:${id}`, payload)
      }
      child.stdout?.on('data', (data: Buffer) => send('process:stdout', new Uint8Array(data)))
      child.stderr?.on('data', (data: Buffer) => send('process:stderr', data.toString('utf8')))
      child.on('error', (error) => send('process:stderr', error.message))
      child.on('close', (code) => {
        running.delete(id)
        send('process:close', code)
      })
      return { id, pid: child.pid }
    }
  )

  handle('process:write', (id: number, data: Uint8Array) => {
    const child = running.get(id)
    if (child?.stdin && !child.stdin.destroyed) child.stdin.write(Buffer.from(data))
  })

  handle('process:kill', (id: number) => {
    running.get(id)?.kill()
    running.delete(id)
  })

  app.on('before-quit', () => {
    for (const child of running.values()) child.kill()
    running.clear()
    stopShareTunnel()
  })
}

function registerIpcHandlers() {
  const credentials = createCredentialStore()

  handle('app:takePendingOpenFiles', () => pendingOpenFiles.splice(0).map((p) => ({ path: p })))
  handle(
    'app:getPath',
    (name: 'home' | 'appData' | 'userData' | 'documents' | 'downloads' | 'temp') =>
      app.getPath(name)
  )

  handle('fs:readFile', (filePath: string) => fs.promises.readFile(filePath))
  handle('fs:writeFile', async (filePath: string, data: Uint8Array) => {
    await fs.promises.writeFile(filePath, data)
    return true
  })
  handle('fs:exists', (filePath: string) => fs.existsSync(filePath))
  handle('fs:rename', async (oldPath: string, newPath: string) => {
    await fs.promises.rename(oldPath, newPath)
    return true
  })
  handle('fs:mkdir', async (dirPath: string, options?: { recursive?: boolean }) => {
    await fs.promises.mkdir(dirPath, { recursive: options?.recursive ?? true })
    return true
  })
  handle('fs:remove', async (targetPath: string, options?: { recursive?: boolean }) => {
    await fs.promises.rm(targetPath, { recursive: options?.recursive ?? false, force: true })
    return true
  })
  handle('fs:stat', async (targetPath: string) => {
    const stats = await fs.promises.lstat(targetPath)
    return {
      isFile: stats.isFile(),
      isDirectory: stats.isDirectory(),
      isSymlink: stats.isSymbolicLink(),
      size: stats.size,
      mtime: stats.mtimeMs,
      atime: stats.atimeMs,
      birthtime: stats.birthtimeMs,
      readonly: (stats.mode & 0o200) === 0
    }
  })
  handle('fs:readDir', async (targetPath: string) =>
    (await fs.promises.readdir(targetPath, { withFileTypes: true })).map((entry) => ({
      name: entry.name,
      isFile: entry.isFile(),
      isDirectory: entry.isDirectory(),
      isSymlink: entry.isSymbolicLink()
    }))
  )
  handle('path:join', (paths: unknown[]) =>
    path.join(...paths.filter((p): p is string => typeof p === 'string'))
  )

  handle('dialog:showOpenDialog', async (options?: DesktopOpenDialogOptions) => {
    if (!mainWindow) return null
    const result = await dialog.showOpenDialog(mainWindow, {
      title: options?.title || 'Open File',
      filters: normalizeFilters(options?.filters, [
        { name: 'Design Files', extensions: ['fig', 'pen', 'html', 'htm'] }
      ]),
      properties: options?.multiple ? ['openFile', 'multiSelections'] : ['openFile']
    })
    return result.canceled || result.filePaths.length === 0 ? null : result.filePaths
  })
  handle('dialog:showSaveDialog', async (options?: DesktopSaveDialogOptions) => {
    if (!mainWindow) return null
    const result = await dialog.showSaveDialog(mainWindow, {
      title: options?.title || 'Save File',
      defaultPath: options?.defaultPath,
      filters: normalizeFilters(options?.filters, [{ name: 'Figma File', extensions: ['fig'] }])
    })
    return result.canceled ? null : (result.filePath ?? null)
  })

  handle('clipboard:readText', readClipboardText)
  handle('clipboard:writeText', (text: string) => writeClipboardText(text))
  handle('clipboard:readHtml', readClipboardHtml)
  handle('clipboard:writeHtml', (html: string, altText?: string) =>
    writeClipboardHtml(html, altText)
  )

  handle('fonts:listFamilies', listSystemFontFamilies)
  handle('fonts:loadFont', (family: string, style?: string) => loadSystemFont(family, style))

  handle('shell:openExternal', (url: string) => {
    const protocolName = new URL(url).protocol
    if (!['http:', 'https:', 'mailto:'].includes(protocolName)) {
      throw new Error(`Refusing to open ${protocolName} URL`)
    }
    return shell.openExternal(url)
  })
  handle('shell:openPath', (filePath: string) => shell.openPath(filePath))
  handle('shell:trashItem', async (filePath: string) => {
    try {
      await shell.trashItem(filePath)
      return true
    } catch {
      return false
    }
  })

  handle('collab:startShareTunnel', () =>
    startShareTunnel({
      devPort: DEV_URL ? Number(new URL(DEV_URL).port || 80) : null,
      distRoot: DIST_ROOT
    })
  )
  handle('collab:stopShareTunnel', stopShareTunnel)
  handle('collab:shareTunnelStatus', shareTunnelStatus)

  handle('credentials:availability', () => credentials.availability())
  handle('credentials:status', (reference: DesktopCredentialRef) => credentials.status(reference))
  handle('credentials:read', (reference: DesktopCredentialRef) => credentials.read(reference))
  handle('credentials:write', (reference: DesktopCredentialRef, value: string) =>
    credentials.write(reference, value)
  )
  handle('credentials:remove', (reference: DesktopCredentialRef) => credentials.remove(reference))

  handle('http:request', (request: DesktopHttpRequest) => proxyHttpRequest(request))

  handle('updater:check', checkForUpdate)
  handle('updater:download', downloadUpdate)
  handle('updater:install', installUpdateAndRestart)

  handle('devtools:toggle', () => mainWindow?.webContents.toggleDevTools())

  registerProcessHandlers()
}

function isAppUrl(url: string): boolean {
  return originOf(url) === trustedOrigin()
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'OpenWeave',
    icon: ICON_PATH,
    backgroundColor: '#1e1e1e',
    // Figma-style chrome: the renderer's tab strip is the title bar
    // (`src/components/tab-bar/TabBar.tsx`). macOS keeps its traffic lights;
    // Windows/Linux keep native min/max/close drawn over the strip.
    titleBarStyle: 'hidden',
    ...(process.platform === 'darwin'
      ? { trafficLightPosition: { x: 14, y: 13 } }
      : { titleBarOverlay: TITLE_BAR_OVERLAY }),
    webPreferences: {
      preload: PRELOAD_PATH,
      contextIsolation: true,
      nodeIntegration: false,
      // The preload uses `node:path`; renderer code still has no Node access.
      sandbox: false
    }
  })

  // Keep the window on the app origin; hand other links to the system browser.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) void shell.openExternal(url)
    return { action: 'deny' }
  })
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (isAppUrl(url)) return
    event.preventDefault()
    if (/^https?:/.test(url)) void shell.openExternal(url)
  })
  mainWindow.webContents.on('did-finish-load', () => {
    if (pendingOpenFiles.length > 0) mainWindow?.webContents.send('app:open-files')
  })
  mainWindow.on('closed', () => {
    mainWindow = null
  })

  await mainWindow.loadURL(DEV_URL ?? `${APP_ORIGIN}/`)
}

async function start() {
  if (!DEV_URL) {
    if (!fs.existsSync(path.join(DIST_ROOT, 'index.html'))) {
      dialog.showErrorBox(
        'OpenWeave',
        `The app bundle is missing (${DIST_ROOT}). Run \`bun run build\` first.`
      )
      app.quit()
      return
    }
    protocol.handle(APP_SCHEME, createAppProtocolHandler(DIST_ROOT))
  }
  registerIpcHandlers()
  Menu.setApplicationMenu(buildAppMenu(() => mainWindow))
  await createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) void createWindow()
  })
}

app
  .whenReady()
  .then(start)
  .catch((error: unknown) => {
    dialog.showErrorBox('OpenWeave failed to start', String(error))
    app.quit()
  })

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
