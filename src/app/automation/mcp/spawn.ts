import { AUTOMATION_HTTP_PORT } from '@openweave/core/constants'
import { randomHex } from '@openweave/core/random'
import type { DiscoveryInfo } from '@openweave/mcp/discovery'

import { decodeTauriStderr } from '@/app/shell/ui'
import { resolvePlatformCommand } from '@/app/tauri/command'
import { isDesktop, isTauri } from '@/app/tauri/env'

interface AutomationHealth {
  status: 'ok' | 'no_app'
  version?: string
  installCommand?: string
  authRequired?: boolean
  discoveryPath?: string
}

export interface AutomationServerHandle {
  disconnect: () => void
  authToken: string | null
}

const DEV_AUTOMATION_AUTH_TOKEN =
  import.meta.env.DEV && typeof __OPENWEAVE_LOCAL_AUTOMATION_TOKEN__ === 'string'
    ? __OPENWEAVE_LOCAL_AUTOMATION_TOKEN__
    : null
const APP_VERSION =
  typeof __OPENWEAVE_APP_VERSION__ === 'string' ? __OPENWEAVE_APP_VERSION__ : '0.0.0-test'
const noop = () => undefined

let runtimeAutomationAuthToken: string | null = DEV_AUTOMATION_AUTH_TOKEN

/**
 * Reads the auth token from the MCP discovery file via Tauri's FS plugin.
 * The discovery file path is computed locally (not from the /health endpoint)
 * to prevent an unauthenticated /health response from directing file reads
 * to an attacker-controlled path.
 */
async function readDiscoveryToken(discoveryPath: string): Promise<string | null> {
  try {
    const electron = typeof window !== 'undefined' ? (window as any).electron : null
    if (electron?.fs?.readFile) {
      const bytes = await electron.fs.readFile(discoveryPath)
      const raw = new TextDecoder().decode(bytes)
      const info = JSON.parse(raw) as DiscoveryInfo
      return info.authToken ?? null
    }
    return null
  } catch {
    return null
  }
}

/** Check whether the discovery file exists on disk. */
async function discoveryFileExists(discoveryPath: string): Promise<boolean> {
  try {
    const electron = typeof window !== 'undefined' ? (window as any).electron : null
    if (electron?.fs?.exists) {
      return await electron.fs.exists(discoveryPath)
    }
    return false
  } catch {
    return false
  }
}

/**
 * Computes the expected MCP discovery file path using the same platform
 * logic as the server's getDiscoveryPath(), via desktop Electron APIs.
 */
async function computeExpectedDiscoveryPath(): Promise<string> {
  const electron = typeof window !== 'undefined' ? (window as any).electron : null
  const home = (await electron?.app?.getPath?.('home')) ?? ''
  if (!home) throw new Error('home path returned empty')

  const isMac = navigator.platform.includes('Mac')
  const isWindows = navigator.platform.includes('Win')
  const join = electron?.path?.join
    ? electron.path.join
    : async (...parts: string[]) => parts.join('/')

  if (isMac) {
    return join(home, 'Library', 'Application Support', 'OpenWeave', 'mcp.json')
  }
  if (isWindows) {
    return join(home, 'AppData', 'Local', 'OpenWeave', 'mcp.json')
  }
  return join(home, '.openweave', 'mcp.json')
}

/**
 * Resolves the discovery path to use for reading the auth token.
 *
 * Prefers the locally-computed path from `computeExpectedDiscoveryPath()` for
 * security. When the server-reported `healthDiscoveryPath` (from the
 * unauthenticated `/health` endpoint) differs, logs a warning and falls back
 * to the server-reported path as a compatibility measure.
 *
 * Security tradeoff: the `/health` endpoint is unauthenticated, so a
 * compromised server could redirect us to a malicious path. This is mitigated
 * by the fact that the server is on localhost and was spawned by us. The
 * fallback exists because local computation can be wrong (e.g., XDG_RUNTIME_DIR
 * mismatches on Linux where the server uses `$XDG_RUNTIME_DIR/openweave` but
 * the local computation falls back to `~/.openweave`).
 */
async function resolveDiscoveryPath(healthDiscoveryPath?: string): Promise<string> {
  const expected = await computeExpectedDiscoveryPath()
  if (healthDiscoveryPath && healthDiscoveryPath !== expected) {
    const localExists = await discoveryFileExists(expected)
    if (!localExists) {
      // Validate the server-reported path before accepting it. The /health
      // endpoint is unauthenticated, so we only accept paths within the
      // user's home directory ending in mcp.json.
      const electron = typeof window !== 'undefined' ? (window as any).electron : null
      const home = (await electron?.app?.getPath?.('home')) ?? ''
      const sep = home.includes('\\') ? '\\' : '/'
      const hasTraversal = healthDiscoveryPath.split(/[\\/]/).some((segment) => segment === '..')
      const isSafe =
        healthDiscoveryPath.endsWith('mcp.json') &&
        !hasTraversal &&
        healthDiscoveryPath.startsWith(home + sep)
      if (isSafe) {
        console.warn(
          `[MCP] Server discovery path "${healthDiscoveryPath}" differs from expected "${expected}" ` +
            'and local path does not exist. Using server-reported path (server is on localhost).'
        )
        return healthDiscoveryPath
      }
    }
  }
  return expected
}

async function readHealth(): Promise<AutomationHealth | null> {
  try {
    const res = await fetch(`http://127.0.0.1:${AUTOMATION_HTTP_PORT}/health`, {
      signal: AbortSignal.timeout(1000)
    })
    if (!res.ok) return null
    return (await res.json()) as AutomationHealth
  } catch (e) {
    console.error('[MCP] health check failed:', e instanceof Error ? e.message : e)
    return null
  }
}

/**
 * Returns the major.minor portion of a semver string (e.g. "0.5.1" → "0.5").
 * Returns null if the string is not parseable as semver.
 */
function parseMajorMinor(version: string): string | null {
  const match = version.match(/^(\d+)\.(\d+)/)
  return match ? `${match[1]}.${match[2]}` : null
}

function assertCompatibleMcpVersion(health: AutomationHealth): void {
  const runningMajorMinor = health.version ? parseMajorMinor(health.version) : null
  const oursMajorMinor = parseMajorMinor(APP_VERSION)
  if (!runningMajorMinor || !oursMajorMinor) return // unparseable — don't block
  if (runningMajorMinor === oursMajorMinor) return
  const runningVersion = health.version ? `v${health.version}` : 'an older version'
  const updateHint = health.installCommand
    ? `Run: ${health.installCommand}, then restart OpenWeave.`
    : `Update the global @openweave/mcp package to v${APP_VERSION} with your package manager, then restart OpenWeave.`
  throw new Error(
    `OpenWeave desktop v${APP_VERSION} requires @openweave/mcp v${oursMajorMinor}.x ` +
      `(major.minor compatibility), but the running MCP server is ${runningVersion}. ${updateHint}`
  )
}

async function pollHealth(retries: number, delayMs: number): Promise<AutomationHealth | null> {
  for (let i = 0; i < retries; i++) {
    await new Promise((resolve) => {
      setTimeout(resolve, delayMs)
    })
    const health = await readHealth()
    if (health) return health
  }
  return null
}

export async function getAutomationAuthToken(): Promise<string | null> {
  if (runtimeAutomationAuthToken) return runtimeAutomationAuthToken
  const health = await readHealth()
  if (!health) {
    throw new Error(
      'MCP server is not reachable. Ensure the desktop app is running and the MCP server has started.'
    )
  }
  assertCompatibleMcpVersion(health)
  const discoveryPath = await resolveDiscoveryPath(health.discoveryPath)
  const token = await readDiscoveryToken(discoveryPath)
  if (health.authRequired && !token) {
    throw new Error(
      'MCP server requires authentication but the discovery token could not be read. ' +
        'Ensure the discovery file is accessible and contains an auth token.'
    )
  }
  // When token is null and auth is not required, verify the discovery file
  // actually exists. A missing file means the server hasn't finished starting
  // (discovery file is written after listeners are up). Without this check,
  // we'd return null (meaning "auth disabled") when the server isn't ready
  // yet, causing ACP sessions to proceed without auth.
  if (!token && !health.authRequired) {
    const fileExists = await discoveryFileExists(discoveryPath)
    if (!fileExists) {
      throw new Error(
        `MCP server not yet ready — discovery file not found at ${discoveryPath}. ` +
          'Wait for the server to finish starting and try again.'
      )
    }
  }
  runtimeAutomationAuthToken = token
  return runtimeAutomationAuthToken
}

export async function spawnMCPIfNeeded(): Promise<AutomationServerHandle | null> {
  if (import.meta.env.DEV || (!isDesktop() && !isTauri())) {
    return DEV_AUTOMATION_AUTH_TOKEN
      ? { disconnect: noop, authToken: DEV_AUTOMATION_AUTH_TOKEN }
      : null
  }

  const existing = await readHealth()
  if (existing) {
    assertCompatibleMcpVersion(existing)
    const discoveryPath = await resolveDiscoveryPath(existing.discoveryPath)
    const token = await readDiscoveryToken(discoveryPath)
    if (existing.authRequired && !token) {
      throw new Error(
        'MCP server requires authentication but the discovery token could not be read. ' +
          'Ensure the discovery file is accessible and contains an auth token.'
      )
    }
    runtimeAutomationAuthToken = token
    return {
      disconnect: noop,
      authToken: runtimeAutomationAuthToken
    }
  }

  const authToken = randomHex(32)
  // Cache only after MCP startup is confirmed healthy.

  const electron = typeof window !== 'undefined' ? (window as any).electron : null
  const mcpRoot = await resolveTauriHomeDir()
  const resolved = resolvePlatformCommand('openweave-mcp-http')
  let spawnedToken: string | null = null

  if (!electron?.process?.spawn) {
    throw new Error('Process spawning is only supported in desktop environment.')
  }

  const child = await electron.process.spawn({
    command: resolved.command,
    args: resolved.args,
    env: {
      PORT: String(AUTOMATION_HTTP_PORT),
      OPENWEAVE_MCP_AUTH_TOKEN: authToken,
      OPENWEAVE_MCP_CORS_ORIGIN: window.location.origin,
      OPENWEAVE_MCP_TCP: '1',
      OPENWEAVE_MCP_ROOT: mcpRoot
    },
    onStderr: (raw: string) => {
      console.error('[MCP]', decodeTauriStderr(raw))
    },
    onClose: (code: number | null) => {
      console.error(`[MCP] Server exited (code ${code ?? 'null'})`)
      if (spawnedToken && runtimeAutomationAuthToken === spawnedToken) {
        runtimeAutomationAuthToken = null
      }
    }
  })

  const health = await pollHealth(5, 1000)

  if (health) {
    try {
      assertCompatibleMcpVersion(health)
      const discoveryPath = await resolveDiscoveryPath(health.discoveryPath)
      const discovered = await readDiscoveryToken(discoveryPath)
      const token = discovered ?? authToken
      spawnedToken = token
      runtimeAutomationAuthToken = token
      return {
        disconnect: () => {
          void child.kill().catch((e: unknown) => {
            console.error('[MCP] Failed to kill server:', e)
          })
          if (runtimeAutomationAuthToken === token) {
            runtimeAutomationAuthToken = null
          }
        },
        authToken: token
      }
    } catch (err) {
      await child.kill().catch(() => undefined)
      runtimeAutomationAuthToken = null
      throw err
    }
  }

  try {
    await child.kill().catch(() => undefined)
  } finally {
    runtimeAutomationAuthToken = null
  }
  throw new Error(
    `Failed to start MCP server. Install @openweave/mcp@${APP_VERSION} globally with your package manager, then restart OpenWeave.`
  )
}

/**
 * Returns the user's home directory. Used as the default OPENWEAVE_MCP_ROOT
 * so file-scoped tools operate on paths inside ~, which is writable and
 * matches user expectations.
 */
async function resolveTauriHomeDir(): Promise<string> {
  try {
    const electron = typeof window !== 'undefined' ? (window as any).electron : null
    const dir = await electron?.app?.getPath?.('home')
    if (!dir) {
      throw new Error('home directory returned an empty string')
    }
    return dir
  } catch (e) {
    throw new Error(
      'Failed to resolve home directory for MCP root. ' +
        'The MCP server requires a home directory to scope file operations. ' +
        (e instanceof Error ? e.message : String(e))
    )
  }
}
