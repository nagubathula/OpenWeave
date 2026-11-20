import * as path from 'node:path'
import { pathToFileURL } from 'node:url'

import type { Config, Listener } from '@ngrok/ngrok'

import type { DesktopShareTunnelErrorCode, DesktopShareTunnelStart } from '@/app/desktop/types'

/**
 * ngrok share tunnel, run in-process with the bundled `@ngrok/ngrok` SDK. It
 * forwards the loopback share server (see `share-server.ts`), which serves the
 * editor to invitees and hosts the collab relay, so ngrok is the only network
 * service sharing depends on and no separate ngrok install is needed.
 */

export interface NgrokSdk {
  forward: (config: Config) => Promise<Listener>
  kill: () => Promise<void>
}

export interface ShareTunnelOptions {
  loadSdk: () => Promise<NgrokSdk>
  resolveAuthtoken: () => Promise<string | null>
}

export interface ShareTunnel {
  start: (port: number) => Promise<DesktopShareTunnelStart>
  stop: () => Promise<void>
  status: () => string | null
}

/**
 * Loads the SDK from `<root>/node_modules`: the project root in dev, and the
 * unpacked `resources/` folder when packaged, since native addons cannot load
 * from inside `app.asar`.
 */
export async function loadNgrokSdk(moduleRoot: string): Promise<NgrokSdk> {
  const entry = path.join(moduleRoot, 'node_modules', '@ngrok', 'ngrok', 'index.js')
  // The SDK is CommonJS, so its exports arrive as the namespace's default.
  const sdk: { default: NgrokSdk } = await import(pathToFileURL(entry).href)
  return sdk.default
}

const FAILURE_MESSAGES: Record<DesktopShareTunnelErrorCode, string> = {
  'missing-authtoken': 'Add your ngrok authtoken in Settings › Sharing to share over the internet.',
  'invalid-authtoken': 'ngrok rejected the authtoken. Check it in Settings › Sharing.',
  'session-limit':
    'Your ngrok plan allows one tunnel session at a time. Stop other ngrok agents and try again.',
  failed: 'The ngrok tunnel could not be started.'
}

const AUTHTOKEN_ERRORS = new Set([
  'ERR_NGROK_105',
  'ERR_NGROK_106',
  'ERR_NGROK_107',
  'ERR_NGROK_4018'
])
const SESSION_LIMIT_ERRORS = new Set(['ERR_NGROK_108'])

function ngrokErrorCode(error: unknown): string | null {
  if (typeof error !== 'object' || error === null || !('errorCode' in error)) return null
  return typeof error.errorCode === 'string' ? error.errorCode : null
}

function failure(code: DesktopShareTunnelErrorCode, detail?: string): DesktopShareTunnelStart {
  const message = detail ? `${FAILURE_MESSAGES[code]} ${detail}` : FAILURE_MESSAGES[code]
  return { ok: false, code, message }
}

function failureFor(error: unknown): DesktopShareTunnelStart {
  const errorCode = ngrokErrorCode(error)
  if (errorCode && AUTHTOKEN_ERRORS.has(errorCode)) return failure('invalid-authtoken')
  if (errorCode && SESSION_LIMIT_ERRORS.has(errorCode)) return failure('session-limit')
  // ngrok's first line names the cause ("failed to connect session: …").
  const detail = error instanceof Error ? error.message.split('\n')[0] : undefined
  return failure('failed', detail)
}

export function createShareTunnel(options: ShareTunnelOptions): ShareTunnel {
  let sdk: NgrokSdk | null = null
  let active: { port: number; url: string; listener: Listener } | null = null
  let pending: { port: number; result: Promise<DesktopShareTunnelStart> } | null = null

  const stop = async () => {
    const current = active
    active = null
    if (!current) return
    try {
      await current.listener.close()
      // Also ends the agent session; free plans allow only one at a time.
      await sdk?.kill()
    } catch (error) {
      console.warn('Failed to close the ngrok tunnel', error)
    }
  }

  const open = async (port: number): Promise<DesktopShareTunnelStart> => {
    await stop()
    const authtoken = await options.resolveAuthtoken()
    if (!authtoken) return failure('missing-authtoken')

    let listener: Listener
    try {
      sdk ??= await options.loadSdk()
      listener = await sdk.forward({ addr: `127.0.0.1:${port}`, authtoken })
    } catch (error) {
      return failureFor(error)
    }
    const url = listener.url()
    if (!url) {
      await listener.close().catch(() => undefined)
      return failure('failed')
    }
    active = { port, url, listener }
    return { ok: true, url }
  }

  return {
    start(port) {
      if (active?.port === port) return Promise.resolve({ ok: true, url: active.url })
      if (pending?.port === port) return pending.result
      const result = open(port).finally(() => {
        if (pending?.result === result) pending = null
      })
      pending = { port, result }
      return result
    },
    stop,
    status: () => active?.url ?? null
  }
}
