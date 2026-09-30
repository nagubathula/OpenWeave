import { app, BrowserWindow, dialog, ipcMain, Menu, shell, clipboard } from 'electron'
import { spawn, type ChildProcess } from 'node:child_process'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let mainWindow: BrowserWindow | null = null
const pendingOpenFiles: string[] = []

// Parse file arguments from process.argv
function collectFileArgs(args: string[]): string[] {
  return args
    .filter((arg) => !arg.startsWith('-') && !arg.includes('electron') && !arg.endsWith('.js') && !arg.endsWith('.ts'))
    .filter((arg) => {
      const ext = path.extname(arg).toLowerCase()
      return ['.fig', '.pen', '.html', '.xhtml'].includes(ext) && fs.existsSync(arg)
    })
    .map((arg) => path.resolve(arg))
}

pendingOpenFiles.push(...collectFileArgs(process.argv.slice(1)))

// Second instance lock
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', (_event, commandLine) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
      const files = collectFileArgs(commandLine)
      if (files.length > 0) {
        pendingOpenFiles.push(...files)
        mainWindow.webContents.send('open-associated-files')
        mainWindow.webContents.send('__tauri_event__', {
          eventName: 'open-associated-files',
          payload: null
        })
      }
    }
  })
}

function buildAppMenu(): Menu {
  const isMac = process.platform === 'darwin'
  const sendMenu = (id: string) => {
    mainWindow?.webContents.send('menu-event', id)
    mainWindow?.webContents.send('__tauri_event__', {
      eventName: 'menu-event',
      payload: id
    })
  }

  const template: any[] = [
    ...(isMac ? [{ role: 'appMenu' }] : []),
    {
      label: '&File',
      submenu: [
        { label: 'New', accelerator: 'CmdOrCtrl+N', click: () => sendMenu('new') },
        { label: 'Open...', accelerator: 'CmdOrCtrl+O', click: () => sendMenu('open') },
        { type: 'separator' },
        { label: 'Save', accelerator: 'CmdOrCtrl+S', click: () => sendMenu('save') },
        { label: 'Save As...', accelerator: 'CmdOrCtrl+Shift+S', click: () => sendMenu('save-as') },
        { type: 'separator' },
        { label: 'Export PNG...', accelerator: 'CmdOrCtrl+Shift+E', click: () => sendMenu('export-png') },
        { label: 'Export SVG...', click: () => sendMenu('export-svg') },
        { label: 'Export FIG...', click: () => sendMenu('export-fig') },
        { type: 'separator' },
        { label: 'Settings...', accelerator: 'CmdOrCtrl+,', click: () => sendMenu('settings') },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' }
      ]
    },
    {
      label: '&Edit',
      submenu: [
        { label: 'Undo', accelerator: 'CmdOrCtrl+Z', click: () => sendMenu('undo') },
        { label: 'Redo', accelerator: 'CmdOrCtrl+Shift+Z', click: () => sendMenu('redo') },
        { type: 'separator' },
        { label: 'Cut', accelerator: 'CmdOrCtrl+X', click: () => sendMenu('cut') },
        { label: 'Copy', accelerator: 'CmdOrCtrl+C', click: () => sendMenu('copy') },
        { label: 'Paste', accelerator: 'CmdOrCtrl+V', click: () => sendMenu('paste') },
        { label: 'Select All', accelerator: 'CmdOrCtrl+A', click: () => sendMenu('select-all') },
        { type: 'separator' },
        { label: 'Delete', accelerator: 'Delete', click: () => sendMenu('delete') }
      ]
    },
    {
      label: '&View',
      submenu: [
        { label: 'Zoom In', accelerator: 'CmdOrCtrl+=', click: () => sendMenu('zoom-in') },
        { label: 'Zoom Out', accelerator: 'CmdOrCtrl+-', click: () => sendMenu('zoom-out') },
        { label: 'Zoom to 100%', accelerator: 'Shift+0', click: () => sendMenu('zoom-100') },
        { label: 'Zoom to Fit', accelerator: 'Shift+1', click: () => sendMenu('zoom-fit') },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: '&Help',
      submenu: [
        {
          label: 'Documentation',
          click: () => shell.openExternal('https://openweave.dev')
        },
        {
          label: 'GitHub Repository',
          click: () => shell.openExternal('https://github.com/openweave/openweave')
        }
      ]
    }
  ]

  return Menu.buildFromTemplate(template)
}

// System fonts scanner cache
interface CachedFontFamily {
  family: string
  styles: string[]
}
let cachedFontFamilies: CachedFontFamily[] | null = null

function getSystemFontDirs(): string[] {
  if (process.platform === 'win32') {
    const dirs = ['C:\\Windows\\Fonts']
    const localAppData = process.env.LOCALAPPDATA
    if (localAppData) {
      dirs.push(path.join(localAppData, 'Microsoft', 'Windows', 'Fonts'))
    }
    return dirs
  } else if (process.platform === 'darwin') {
    const home = process.env.HOME || ''
    return ['/System/Library/Fonts', '/Library/Fonts', path.join(home, 'Library/Fonts')]
  } else {
    const home = process.env.HOME || ''
    return ['/usr/share/fonts', '/usr/local/share/fonts', path.join(home, '.fonts')]
  }
}

async function enumerateSystemFonts(): Promise<CachedFontFamily[]> {
  if (cachedFontFamilies) return cachedFontFamilies

  const fontMap = new Map<string, Set<string>>()
  const fontDirs = getSystemFontDirs()

  for (const dir of fontDirs) {
    if (!fs.existsSync(dir)) continue
    try {
      const files = await fs.promises.readdir(dir)
      for (const file of files) {
        const ext = path.extname(file).toLowerCase()
        if (!['.ttf', '.otf', '.ttc'].includes(ext)) continue
        // Basic font name parsing from filename
        const baseName = path.basename(file, ext)
        const parts = baseName.split(/[-_ ]/)
        const family = parts[0] || baseName
        const style = parts.slice(1).join(' ') || 'Regular'
        if (!fontMap.has(family)) fontMap.set(family, new Set())
        fontMap.get(family)?.add(style)
      }
    } catch {
      // Ignore directory access errors
    }
  }

  cachedFontFamilies = Array.from(fontMap.entries()).map(([family, styles]) => ({
    family,
    styles: Array.from(styles)
  }))
  return cachedFontFamilies
}

async function loadSystemFontBytes(family: string, style = 'Regular'): Promise<number[] | null> {
  const fontDirs = getSystemFontDirs()
  const searchTerms = [
    `${family}-${style}`,
    `${family}_${style}`,
    `${family}${style}`,
    family
  ].map((s) => s.toLowerCase().replace(/[^a-z0-9]/g, ''))

  for (const dir of fontDirs) {
    if (!fs.existsSync(dir)) continue
    try {
      const files = await fs.promises.readdir(dir)
      for (const file of files) {
        const ext = path.extname(file).toLowerCase()
        if (!['.ttf', '.otf'].includes(ext)) continue
        const cleanFile = path.basename(file, ext).toLowerCase().replace(/[^a-z0-9]/g, '')
        if (searchTerms.some((term) => cleanFile === term || cleanFile.startsWith(term))) {
          const buffer = await fs.promises.readFile(path.join(dir, file))
          return Array.from(new Uint8Array(buffer))
        }
      }
    } catch {
      // Ignore
    }
  }
  return null
}

function registerIpcHandlers() {
  ipcMain.handle('app:getPendingOpenFiles', () => {
    return pendingOpenFiles.splice(0, pendingOpenFiles.length).map((p) => ({ path: p }))
  })

  // File System
  ipcMain.handle('fs:readFile', async (_event, filePath: string) => {
    return fs.promises.readFile(filePath)
  })

  ipcMain.handle('fs:writeFile', async (_event, filePath: string, data: Uint8Array | number[]) => {
    const buf = Buffer.isBuffer(data) ? data : Buffer.from(data)
    await fs.promises.writeFile(filePath, buf)
    return true
  })

  ipcMain.handle('fs:exists', async (_event, filePath: string) => {
    return fs.existsSync(filePath)
  })

  ipcMain.handle('fs:rename', async (_event, oldPath: string, newPath: string) => {
    await fs.promises.rename(oldPath, newPath)
    return true
  })

  ipcMain.handle('fs:mkdir', async (_event, dirPath: string, options?: { recursive?: boolean }) => {
    await fs.promises.mkdir(dirPath, { recursive: options?.recursive ?? true })
    return true
  })

  ipcMain.handle('fs:remove', async (_event, targetPath: string, options?: { recursive?: boolean }) => {
    await fs.promises.rm(targetPath, { recursive: options?.recursive ?? false, force: true })
    return true
  })

  ipcMain.handle('fs:stat', async (_event, targetPath: string) => {
    const stats = await fs.promises.stat(targetPath)
    return {
      isFile: stats.isFile(),
      isDirectory: stats.isDirectory(),
      isSymlink: stats.isSymbolicLink(),
      size: stats.size,
      mtime: stats.mtime ? stats.mtime.getTime() : null,
      atime: stats.atime ? stats.atime.getTime() : null,
      birthtime: stats.birthtime ? stats.birthtime.getTime() : null,
      readonly: false
    }
  })

  ipcMain.handle('fs:readDir', async (_event, targetPath: string) => {
    const entries = await fs.promises.readdir(targetPath, { withFileTypes: true })
    return entries.map((e) => ({
      name: e.name,
      isFile: e.isFile(),
      isDirectory: e.isDirectory(),
      isSymlink: e.isSymbolicLink()
    }))
  })

  // System Directory Resolution
  ipcMain.handle('path:resolveDirectory', (_event, directory: number) => {
    switch (directory) {
      case 6: // Document
        return app.getPath('documents')
      case 7: // Download
        return app.getPath('downloads')
      case 8: // Picture
        return app.getPath('pictures')
      case 10: // Video
        return app.getPath('videos')
      case 12: // Temp
        return app.getPath('temp')
      case 13: // AppConfig
      case 14: // AppData
      case 15: // AppLocalData
        return path.join(app.getPath('appData'), 'openweave')
      case 16: // AppCache
        return app.getPath('cache')
      case 17: // AppLog
        return app.getPath('logs')
      case 18: // Desktop
        return app.getPath('desktop')
      case 21: // Home
      default:
        return app.getPath('home')
    }
  })

  ipcMain.handle('path:join', (_event, paths: string[]) => {
    const validPaths = (paths || []).filter((p: unknown) => typeof p === 'string')
    return path.join(...validPaths)
  })

  ipcMain.handle('app:getPath', (_event, name: any) => {
    return app.getPath(name)
  })

  ipcMain.handle('app:takePendingOpenFiles', () => {
    const files = [...pendingOpenFiles]
    pendingOpenFiles.length = 0
    return files.map((filePath) => ({ path: filePath }))
  })

  // Child process management
  const runningProcesses = new Map<number, ChildProcess>()
  let nextProcessId = 1

  ipcMain.handle(
    'process:spawn',
    (_event, options: { command: string; args?: string[]; env?: Record<string, string>; cwd?: string }) => {
      const procId = nextProcessId++
      try {
        const child = spawn(options.command, options.args || [], {
          cwd: options.cwd || undefined,
          env: { ...process.env, ...options.env },
          shell: process.platform === 'win32'
        })
        runningProcesses.set(procId, child)

        child.stdout?.on('data', (data: Buffer) => {
          mainWindow?.webContents.send(`process:stdout:${procId}`, Array.from(data))
        })
        child.stderr?.on('data', (data: Buffer) => {
          mainWindow?.webContents.send(`process:stderr:${procId}`, data.toString('utf-8'))
        })
        child.on('close', (code) => {
          runningProcesses.delete(procId)
          mainWindow?.webContents.send(`process:close:${procId}`, code)
        })
        child.on('error', (err) => {
          mainWindow?.webContents.send(`process:stderr:${procId}`, err.message)
        })
        return { procId, pid: child.pid }
      } catch (err: any) {
        return { error: err.message }
      }
    }
  )

  ipcMain.handle('process:write', (_event, procId: number, data: number[]) => {
    const child = runningProcesses.get(procId)
    if (child && child.stdin && !child.stdin.destroyed) {
      child.stdin.write(Buffer.from(data))
    }
  })

  ipcMain.handle('process:kill', (_event, procId: number) => {
    const child = runningProcesses.get(procId)
    if (child) {
      child.kill()
      runningProcesses.delete(procId)
    }
  })

  // Dialogs
  ipcMain.handle('dialog:showOpenDialog', async (_event, options: any) => {
    if (!mainWindow) return null
    const filters = options?.filters?.map((f: any) => ({
      name: f.name || 'Files',
      extensions: f.extensions || ['*']
    })) || [{ name: 'Design Files', extensions: ['fig', 'pen', 'html', 'htm'] }]

    const result = await dialog.showOpenDialog(mainWindow, {
      title: options?.title || 'Open File',
      filters,
      properties: options?.multiple ? ['openFile', 'multiSelections'] : ['openFile']
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths
  })

  ipcMain.handle('dialog:showSaveDialog', async (_event, options: any) => {
    if (!mainWindow) return null
    const filters = options?.filters?.map((f: any) => ({
      name: f.name || 'Files',
      extensions: f.extensions || ['*']
    })) || [{ name: 'Figma File', extensions: ['fig'] }]

    const result = await dialog.showSaveDialog(mainWindow, {
      title: options?.title || 'Save File',
      defaultPath: options?.defaultPath,
      filters
    })
    return result.canceled ? null : result.filePath
  })

  // Clipboard
  ipcMain.handle('clipboard:readText', () => clipboard.readText())
  ipcMain.handle('clipboard:writeText', (_event, text: string) => clipboard.writeText(text))
  ipcMain.handle('clipboard:readHtml', () => clipboard.readHTML() || null)
  ipcMain.handle('clipboard:writeHtml', (_event, html: string, altText?: string) => {
    clipboard.write({ html, text: altText || '' })
  })

  // Fonts
  ipcMain.handle('fonts:listFamilies', () => enumerateSystemFonts())
  ipcMain.handle('fonts:loadFont', (_event, family: string, style?: string) =>
    loadSystemFontBytes(family, style)
  )

  // Shell
  ipcMain.handle('shell:openExternal', (_event, url: string) => shell.openExternal(url))
  ipcMain.handle('shell:openPath', (_event, filePath: string) => shell.openPath(filePath))
  ipcMain.handle('shell:trashItem', async (_event, filePath: string) => {
    try {
      await shell.trashItem(filePath)
      return true
    } catch (err) {
      console.warn('[Electron] shell.trashItem failed, falling back to fs.unlink:', err)
      await fs.promises.unlink(filePath).catch(() => {})
      return false
    }
  })

  // Collab Ngrok Tunnel
  ipcMain.handle('collab:startShareTunnel', async () => {
    if (activeTunnel?.url) return { url: activeTunnel.url }
    const existing = await queryLocalNgrokTunnel()
    if (existing) {
      activeTunnel = { url: existing }
      return { url: existing }
    }

    const port = process.env.PORT || '1420'
    let exePath = process.platform === 'win32' ? 'ngrok.exe' : 'ngrok'
    if (process.platform === 'win32' && process.env.LOCALAPPDATA) {
      const winApps = path.join(process.env.LOCALAPPDATA, 'Microsoft', 'WindowsApps', 'ngrok.exe')
      if (fs.existsSync(winApps)) {
        exePath = winApps
      }
    }

    return new Promise<{ url: string }>((resolve, reject) => {
      let resolved = false
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true
          reject(new Error('Timed out waiting for ngrok tunnel to start'))
        }
      }, 15000)

      let child: ChildProcess
      try {
        child = spawn(
          exePath,
          ['http', port, '--log', 'stdout', '--log-format', 'json'],
          {
            shell: process.platform === 'win32',
            stdio: ['ignore', 'pipe', 'pipe']
          }
        )
      } catch (err) {
        clearTimeout(timeout)
        return reject(err)
      }

      const checkUrl = (url: string) => {
        if (!resolved) {
          resolved = true
          clearTimeout(timeout)
          activeTunnel = { url, child }
          resolve({ url })
        }
      }

      const pollTimer = setInterval(async () => {
        if (resolved) {
          clearInterval(pollTimer)
          return
        }
        const u = await queryLocalNgrokTunnel()
        if (u) {
          clearInterval(pollTimer)
          checkUrl(u)
        }
      }, 500)

      child.stdout?.on('data', (data: Buffer) => {
        const text = data.toString()
        const lines = text.split('\n')
        for (const line of lines) {
          if (!line.trim()) continue
          try {
            const entry = JSON.parse(line)
            if (entry.url && typeof entry.url === 'string') {
              checkUrl(entry.url)
            }
            if (entry.lvl === 'eror' || entry.lvl === 'crit') {
              if (entry.err && typeof entry.err === 'string' && entry.err.includes('already online')) {
                void queryLocalNgrokTunnel().then((existingUrl) => {
                  if (existingUrl) checkUrl(existingUrl)
                })
              }
            }
          } catch {}
        }
      })

      child.on('error', (err) => {
        clearInterval(pollTimer)
        clearTimeout(timeout)
        if (!resolved) {
          resolved = true
          reject(err)
        }
      })

      child.on('exit', () => {
        if (activeTunnel?.child === child) {
          activeTunnel = null
        }
      })
    })
  })

  ipcMain.handle('collab:stopShareTunnel', () => {
    if (activeTunnel?.child) {
      activeTunnel.child.kill()
    }
    activeTunnel = null
  })

  ipcMain.handle('collab:shareTunnelStatus', async () => {
    if (activeTunnel?.url) return activeTunnel.url
    const u = await queryLocalNgrokTunnel()
    if (u) {
      activeTunnel = { url: u }
      return u
    }
    return null
  })
}

let activeTunnel: { url: string; child?: ChildProcess } | null = null

async function queryLocalNgrokTunnel(): Promise<string | null> {
  try {
    const res = await fetch('http://127.0.0.1:4040/api/tunnels', {
      signal: AbortSignal.timeout(1000)
    })
    if (!res.ok) return null
    const data = (await res.json()) as { tunnels?: Array<{ public_url?: string }> }
    const tunnel = data.tunnels?.find((t) => t.public_url?.startsWith('https://')) ?? data.tunnels?.[0]
    return tunnel?.public_url ?? null
  } catch {
    return null
  }
}

async function createWindow() {
  const isDev = process.env.NODE_ENV !== 'production' && !app.isPackaged

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'OpenWeave',
    icon: path.join(__dirname, '..', 'public', 'favicon.ico'),
    backgroundColor: '#1e1e1e',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  Menu.setApplicationMenu(buildAppMenu())

  const devUrl = process.env.DEV_URL || 'http://127.0.0.1:1420'

  if (isDev) {
    await mainWindow.loadURL(devUrl)
  } else {
    const indexPath = path.join(__dirname, '..', 'dist', 'index.html')
    if (fs.existsSync(indexPath)) {
      await mainWindow.loadFile(indexPath)
    } else {
      await mainWindow.loadURL(devUrl)
    }
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // Send pending files once page is ready
  mainWindow.webContents.on('did-finish-load', () => {
    if (pendingOpenFiles.length > 0) {
      mainWindow?.webContents.send('open-associated-files')
      mainWindow?.webContents.send('__tauri_event__', {
        eventName: 'open-associated-files',
        payload: null
      })
    }
  })
}

app.whenReady().then(async () => {
  registerIpcHandlers()
  await createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
