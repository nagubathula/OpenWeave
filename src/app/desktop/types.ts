/**
 * Contract between the Electron preload script (`desktop-electron/preload.ts`)
 * and the renderer. The preload exposes exactly this object as
 * `window.electron`; renderer code reaches it through `getDesktopBridge()`.
 *
 * Keep this file free of imports and runtime logic beyond plain constants:
 * the Electron main and preload bundles import it across the app boundary.
 */

export type DesktopPlatform = 'darwin' | 'win32' | 'linux' | (string & {})

export interface DesktopFileStat {
  isFile: boolean
  isDirectory: boolean
  isSymlink: boolean
  size: number
  mtime: number | null
  atime: number | null
  birthtime: number | null
  readonly: boolean
}

export interface DesktopDirEntry {
  name: string
  isFile: boolean
  isDirectory: boolean
  isSymlink: boolean
}

export interface DesktopFileFilter {
  name: string
  extensions: string[]
}

export interface DesktopOpenDialogOptions {
  title?: string
  filters?: DesktopFileFilter[]
  multiple?: boolean
}

export interface DesktopSaveDialogOptions {
  title?: string
  defaultPath?: string
  filters?: DesktopFileFilter[]
}

export interface DesktopSpawnOptions {
  command: string
  args?: string[]
  env?: Record<string, string>
  cwd?: string
  onStdout?: (data: Uint8Array) => void
  onStderr?: (data: string) => void
  onClose?: (code: number | null) => void
}

export interface DesktopChildProcess {
  pid: number | undefined
  write: (data: number[] | Uint8Array) => Promise<void>
  kill: () => Promise<void>
}

/** Mirrors `CredentialRef` in `src/app/settings/credentials/types.ts`. */
export interface DesktopCredentialRef {
  integrationId: string
  profileId: string
  field: string
}

export type DesktopCredentialErrorCode =
  | 'invalid-reference'
  | 'invalid-value'
  | 'locked'
  | 'unavailable'
  | 'failed'

export type DesktopResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: { code: DesktopCredentialErrorCode; message: string } }

/**
 * Origin for share links that skip the internet: the share server on this
 * computer's LAN address (`lan`), or loopback when there is no network
 * (`loopback`, reachable only from this computer).
 */
export interface DesktopLocalShare {
  origin: string
  scope: 'lan' | 'loopback'
}

export type DesktopShareTunnelErrorCode =
  | 'missing-authtoken'
  | 'invalid-authtoken'
  | 'session-limit'
  | 'failed'

export type DesktopShareTunnelStart =
  | { ok: true; url: string }
  | { ok: false; code: DesktopShareTunnelErrorCode; message: string }

export type DesktopCredentialAvailability = 'available' | 'locked' | 'unavailable'
export type DesktopCredentialStatus = 'configured' | 'missing' | 'locked' | 'unavailable'

export interface DesktopHttpHeader {
  name: string
  value: string
}

export interface DesktopHttpRequest {
  url: string
  method?: string
  headers?: DesktopHttpHeader[]
  body?: Uint8Array
  maxResponseBytes?: number
  followRedirects?: boolean
  timeoutMs?: number
}

export interface DesktopHttpResponse {
  status: number
  headers: DesktopHttpHeader[]
  body: Uint8Array
  url: string
}

/**
 * Serializable native menu model: `tools/desktop-menu` writes it to
 * `desktop-electron/generated/menu.json` from the shared app menu schema.
 */
export type NativeMenuEntry =
  | { type: 'separator' }
  | {
      id: string
      label: string
      accelerator?: string
      checkbox?: boolean
      sub?: NativeMenuEntry[]
    }

export interface NativeMenuGroup {
  label: string
  items: NativeMenuEntry[]
}

/** Sentinel returned instead of clipboard HTML that exceeds the read limit. */
export const DESKTOP_CLIPBOARD_TOO_LARGE = '__OW_CLIPBOARD_TOO_LARGE__'

export type DesktopUpdateCheck =
  | { status: 'unsupported' }
  | { status: 'up-to-date' }
  | { status: 'available'; version: string; notes: string | null }
  | { status: 'error'; message: string }

export interface DesktopUpdateDownload {
  version: string
  bytes: number
}

export interface DesktopCollabRelayEndpoint {
  /** `ws://127.0.0.1:<port>/collab` on the loopback share server. */
  url: string
  hostToken: string
}

export interface DesktopBridge {
  isElectron: true
  platform: DesktopPlatform
  fs: {
    readFile: (filePath: string) => Promise<Uint8Array<ArrayBuffer>>
    writeFile: (filePath: string, data: Uint8Array) => Promise<boolean>
    exists: (filePath: string) => Promise<boolean>
    rename: (oldPath: string, newPath: string) => Promise<boolean>
    mkdir: (dirPath: string, options?: { recursive?: boolean }) => Promise<boolean>
    remove: (targetPath: string, options?: { recursive?: boolean }) => Promise<boolean>
    stat: (targetPath: string) => Promise<DesktopFileStat>
    readDir: (targetPath: string) => Promise<DesktopDirEntry[]>
  }
  dialog: {
    showOpenDialog: (options?: DesktopOpenDialogOptions) => Promise<string[] | null>
    showSaveDialog: (options?: DesktopSaveDialogOptions) => Promise<string | null>
  }
  clipboard: {
    readText: () => Promise<string>
    writeText: (text: string) => Promise<void>
    /** HTML, `null` when absent, or `DESKTOP_CLIPBOARD_TOO_LARGE`. */
    readHtml: () => Promise<string | null>
    writeHtml: (html: string, altText?: string) => Promise<void>
  }
  fonts: {
    listFamilies: () => Promise<Array<{ family: string; styles: string[] }>>
    loadFont: (family: string, style?: string) => Promise<Uint8Array<ArrayBuffer> | null>
  }
  shell: {
    openExternal: (url: string) => Promise<void>
    openPath: (filePath: string) => Promise<string>
    trashItem: (filePath: string) => Promise<boolean>
  }
  path: {
    join: (...paths: string[]) => Promise<string>
    dirname: (p: string) => string
    basename: (p: string, ext?: string) => string
    extname: (p: string) => string
  }
  app: {
    getPath: (
      name: 'home' | 'appData' | 'userData' | 'documents' | 'downloads' | 'temp'
    ) => Promise<string>
    takePendingOpenFiles: () => Promise<Array<{ path: string }>>
    onOpenFiles: (listener: () => void) => () => void
  }
  menu: {
    onCommand: (listener: (id: string) => void) => () => void
  }
  process: {
    spawn: (options: DesktopSpawnOptions) => Promise<DesktopChildProcess>
  }
  collab: {
    /** Loopback collab relay the host window connects to, plus its room-opening token. */
    relayEndpoint: () => Promise<DesktopCollabRelayEndpoint>
    /** Serves the app and relay on the local network; idempotent. */
    startLocalShare: () => Promise<DesktopLocalShare>
    stopLocalShare: () => Promise<void>
    localShareStatus: () => Promise<DesktopLocalShare | null>
  }
  tunnel: {
    start: () => Promise<DesktopShareTunnelStart>
    stop: () => Promise<void>
    status: () => Promise<string | null>
  }
  credentials: {
    availability: () => Promise<DesktopResult<DesktopCredentialAvailability>>
    status: (reference: DesktopCredentialRef) => Promise<DesktopResult<DesktopCredentialStatus>>
    read: (reference: DesktopCredentialRef) => Promise<DesktopResult<string | null>>
    write: (reference: DesktopCredentialRef, value: string) => Promise<DesktopResult<null>>
    remove: (reference: DesktopCredentialRef) => Promise<DesktopResult<null>>
  }
  http: {
    request: (request: DesktopHttpRequest) => Promise<DesktopHttpResponse>
  }
  updater: {
    check: () => Promise<DesktopUpdateCheck>
    download: () => Promise<DesktopUpdateDownload>
    installAndRestart: () => Promise<void>
  }
  devtools: {
    toggle: () => Promise<void>
  }
}
