import { spawn, type ChildProcess } from 'node:child_process'
import * as fs from 'node:fs'
import type { Server } from 'node:http'
import * as path from 'node:path'

import { startAssetServer } from './app-assets'

/**
 * ngrok share tunnel. Collaboration itself is P2P; ngrok only serves the app
 * to invitees. Dev builds tunnel the Next dev server; packaged builds start a
 * loopback asset server over `dist/` and tunnel that.
 */

const TUNNEL_START_TIMEOUT_MS = 15_000
const NGROK_API = 'http://127.0.0.1:4040/api/tunnels'

interface ActiveTunnel {
  url: string
  port: number
  child?: ChildProcess
  server?: Server
}

let active: ActiveTunnel | null = null

function ngrokExecutable(): string {
  if (process.platform !== 'win32') return 'ngrok'
  const local = process.env.LOCALAPPDATA
  const winApps = local ? path.join(local, 'Microsoft', 'WindowsApps', 'ngrok.exe') : null
  return winApps && fs.existsSync(winApps) ? winApps : 'ngrok.exe'
}

/** Returns the public URL of an ngrok tunnel already forwarding `port`. */
async function findNgrokTunnel(port: number): Promise<string | null> {
  try {
    const res = await fetch(NGROK_API, { signal: AbortSignal.timeout(1000) })
    if (!res.ok) return null
    const data = (await res.json()) as {
      tunnels?: Array<{ public_url?: string; config?: { addr?: string } }>
    }
    const matching = (data.tunnels ?? []).filter((t) => {
      const addr = t.config?.addr ?? ''
      return addr.endsWith(`:${port}`) || addr === String(port)
    })
    const tunnel = matching.find((t) => t.public_url?.startsWith('https://')) ?? matching[0]
    return tunnel?.public_url ?? null
  } catch {
    return null
  }
}

function launchNgrok(port: number): Promise<{ url: string; child: ChildProcess }> {
  return new Promise((resolve, reject) => {
    let settled = false
    let child: ChildProcess
    try {
      child = spawn(
        ngrokExecutable(),
        ['http', String(port), '--log', 'stdout', '--log-format', 'json'],
        {
          shell: process.platform === 'win32',
          stdio: ['ignore', 'pipe', 'pipe']
        }
      )
    } catch (error) {
      reject(error)
      return
    }

    const finish = (error: Error | null, url?: string) => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      clearInterval(poll)
      if (error || !url) {
        child.kill()
        reject(error ?? new Error('ngrok did not report a tunnel URL'))
      } else {
        resolve({ url, child })
      }
    }

    const timeout = setTimeout(
      () => finish(new Error('Timed out waiting for ngrok tunnel to start')),
      TUNNEL_START_TIMEOUT_MS
    )
    const poll = setInterval(() => {
      void findNgrokTunnel(port).then((url) => url && finish(null, url))
    }, 500)

    child.stdout?.on('data', (data: Buffer) => {
      for (const line of data.toString().split('\n')) {
        if (!line.trim()) continue
        try {
          const entry = JSON.parse(line) as { url?: unknown; lvl?: string; err?: unknown }
          if (typeof entry.url === 'string' && entry.url.startsWith('http')) finish(null, entry.url)
          if ((entry.lvl === 'eror' || entry.lvl === 'crit') && typeof entry.err === 'string') {
            if (entry.err.includes('already online')) {
              void findNgrokTunnel(port).then((url) => url && finish(null, url))
            } else {
              finish(new Error(entry.err))
            }
          }
        } catch {
          // ngrok mixes plain-text lines into its JSON log; skip them.
          continue
        }
      }
    })
    child.on('error', (error) => finish(error))
    child.on('exit', () => {
      finish(new Error('ngrok exited before the tunnel started'))
      if (active?.child === child) stopShareTunnel()
    })
  })
}

export interface TunnelTarget {
  /** Dev server port, or `null` to serve the packaged `dist/` directory. */
  devPort: number | null
  distRoot: string
}

export async function startShareTunnel(target: TunnelTarget): Promise<{ url: string }> {
  if (active) return { url: active.url }

  let server: Server | undefined
  let port: number
  if (target.devPort == null) {
    ;({ server, port } = await startAssetServer(target.distRoot))
  } else {
    port = target.devPort
  }

  try {
    const existing = await findNgrokTunnel(port)
    if (existing) {
      active = { url: existing, port, server }
      return { url: existing }
    }
    const { url, child } = await launchNgrok(port)
    active = { url, port, child, server }
    return { url }
  } catch (error) {
    server?.close()
    throw error
  }
}

export function stopShareTunnel() {
  active?.child?.kill()
  active?.server?.close()
  active = null
}

export async function shareTunnelStatus(): Promise<string | null> {
  if (!active) return null
  if (active.child) return active.url
  // Adopted tunnel owned by another ngrok process: confirm it is still up.
  const url = await findNgrokTunnel(active.port)
  if (!url) stopShareTunnel()
  return url
}
