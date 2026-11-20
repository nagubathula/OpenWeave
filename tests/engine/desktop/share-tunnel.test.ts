import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { createShareTunnel, type NgrokSdk } from '#desktop/tunnel'
import {
  ngrokConfigPaths,
  parseConfigAuthtoken,
  resolveNgrokAuthtoken
} from '#desktop/tunnel/authtoken'
import type { Config, Listener } from '@ngrok/ngrok'

function ngrokError(errorCode: string, message = `failed to connect session: ${errorCode}`) {
  return Object.assign(new Error(`${message}\nmore detail`), { errorCode })
}

function fakeSdk(behavior: { url?: string | null; error?: Error } = {}) {
  const calls: Config[] = []
  let closed = 0
  let killed = 0
  const sdk: NgrokSdk = {
    async forward(config) {
      calls.push(config)
      if (behavior.error) throw behavior.error
      const listener: Pick<Listener, 'url' | 'close'> = {
        url: () => (behavior.url === undefined ? 'https://demo.ngrok-free.dev' : behavior.url),
        close: async () => {
          closed++
        }
      }
      return listener as Listener
    },
    async kill() {
      killed++
    }
  }
  return {
    sdk,
    calls,
    closed: () => closed,
    killed: () => killed
  }
}

describe('createShareTunnel', () => {
  test('forwards the share server port with the resolved authtoken', async () => {
    const fake = fakeSdk()
    const tunnel = createShareTunnel({
      loadSdk: async () => fake.sdk,
      resolveAuthtoken: async () => 'token-123'
    })

    expect(await tunnel.start(4321)).toEqual({ ok: true, url: 'https://demo.ngrok-free.dev' })
    expect(fake.calls).toEqual([{ addr: '127.0.0.1:4321', authtoken: 'token-123' }])
    expect(tunnel.status()).toBe('https://demo.ngrok-free.dev')
  })

  test('reuses the running tunnel and shares one start between concurrent callers', async () => {
    const fake = fakeSdk()
    const tunnel = createShareTunnel({
      loadSdk: async () => fake.sdk,
      resolveAuthtoken: async () => 'token-123'
    })

    const [first, second] = await Promise.all([tunnel.start(4321), tunnel.start(4321)])
    expect(first).toEqual(second)
    await tunnel.start(4321)
    expect(fake.calls).toHaveLength(1)
  })

  test('closes the listener and session on stop', async () => {
    const fake = fakeSdk()
    const tunnel = createShareTunnel({
      loadSdk: async () => fake.sdk,
      resolveAuthtoken: async () => 'token-123'
    })
    await tunnel.start(4321)
    await tunnel.stop()

    expect(tunnel.status()).toBeNull()
    expect(fake.closed()).toBe(1)
    expect(fake.killed()).toBe(1)
  })

  test('reports a missing authtoken without loading the SDK', async () => {
    let loaded = false
    const tunnel = createShareTunnel({
      loadSdk: async () => {
        loaded = true
        return fakeSdk().sdk
      },
      resolveAuthtoken: async () => null
    })

    expect(await tunnel.start(4321)).toMatchObject({ ok: false, code: 'missing-authtoken' })
    expect(loaded).toBe(false)
  })

  test('maps ngrok error codes to tunnel errors', async () => {
    const cases = [
      ['ERR_NGROK_105', 'invalid-authtoken'],
      ['ERR_NGROK_4018', 'invalid-authtoken'],
      ['ERR_NGROK_108', 'session-limit'],
      ['ERR_NGROK_999', 'failed']
    ] as const
    for (const [errorCode, code] of cases) {
      const tunnel = createShareTunnel({
        loadSdk: async () => fakeSdk({ error: ngrokError(errorCode) }).sdk,
        resolveAuthtoken: async () => 'token-123'
      })
      expect(await tunnel.start(4321)).toMatchObject({ ok: false, code })
      expect(tunnel.status()).toBeNull()
    }
  })

  test('keeps only the first line of an unknown ngrok error', async () => {
    const tunnel = createShareTunnel({
      loadSdk: async () =>
        fakeSdk({ error: ngrokError('ERR_NGROK_999', 'failed to connect: boom') }).sdk,
      resolveAuthtoken: async () => 'token-123'
    })
    const result = await tunnel.start(4321)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.message).toContain('failed to connect: boom')
      expect(result.message).not.toContain('more detail')
    }
  })

  test('reports a failure when the SDK cannot load', async () => {
    const tunnel = createShareTunnel({
      loadSdk: async () => {
        throw new Error('Cannot find module @ngrok/ngrok-win32-arm64-msvc')
      },
      resolveAuthtoken: async () => 'token-123'
    })
    expect(await tunnel.start(4321)).toMatchObject({ ok: false, code: 'failed' })
  })

  test('closes a listener that reports no URL', async () => {
    const fake = fakeSdk({ url: null })
    const tunnel = createShareTunnel({
      loadSdk: async () => fake.sdk,
      resolveAuthtoken: async () => 'token-123'
    })
    expect(await tunnel.start(4321)).toMatchObject({ ok: false, code: 'failed' })
    expect(fake.closed()).toBe(1)
  })
})

describe('ngrok authtoken lookup', () => {
  const dirs: string[] = []

  afterEach(() => {
    for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
  })

  function configFile(contents: string): string {
    const dir = mkdtempSync(join(tmpdir(), 'openweave-ngrok-config-'))
    dirs.push(dir)
    const file = join(dir, 'ngrok.yml')
    writeFileSync(file, contents)
    return file
  }

  test('parses v2 and v3 agent configs', () => {
    expect(parseConfigAuthtoken('version: "2"\nauthtoken: abc_DEF-123\n')).toBe('abc_DEF-123')
    expect(parseConfigAuthtoken('version: "3"\nagent:\n  authtoken: "tok_3"  # comment\n')).toBe(
      'tok_3'
    )
    expect(parseConfigAuthtoken('version: "3"\nagent:\n  api_key: nope\n')).toBeNull()
  })

  test('prefers the saved token, then NGROK_AUTHTOKEN, then the agent config', async () => {
    const file = configFile('authtoken: from-config\n')
    const env = { NGROK_AUTHTOKEN: 'from-env' }
    expect(
      await resolveNgrokAuthtoken({ saved: async () => 'saved', env, configPaths: [file] })
    ).toBe('saved')
    expect(await resolveNgrokAuthtoken({ saved: async () => null, env, configPaths: [file] })).toBe(
      'from-env'
    )
    expect(
      await resolveNgrokAuthtoken({ saved: async () => '  ', env: {}, configPaths: [file] })
    ).toBe('from-config')
  })

  test('skips missing config files and returns null when nothing is set', async () => {
    const missing = join(tmpdir(), 'openweave-no-such-dir', 'ngrok.yml')
    const file = configFile('authtoken: second\n')
    expect(
      await resolveNgrokAuthtoken({
        saved: async () => null,
        env: {},
        configPaths: [missing, file]
      })
    ).toBe('second')
    expect(
      await resolveNgrokAuthtoken({ saved: async () => null, env: {}, configPaths: [missing] })
    ).toBeNull()
  })

  test('lists Windows, Microsoft Store and legacy config locations', () => {
    const paths = ngrokConfigPaths(
      'win32',
      { LOCALAPPDATA: 'C:\\Users\\me\\AppData\\Local' },
      'C:\\Users\\me',
      () => ['Microsoft.Other_1', 'ngrok.ngrok_1g87z0zv29zzc']
    )
    expect(paths).toEqual([
      'C:\\Users\\me\\AppData\\Local\\ngrok\\ngrok.yml',
      'C:\\Users\\me\\AppData\\Local\\Packages\\ngrok.ngrok_1g87z0zv29zzc\\LocalCache\\Local\\ngrok\\ngrok.yml',
      'C:\\Users\\me\\.ngrok2\\ngrok.yml'
    ])
  })

  test('lists macOS and Linux config locations', () => {
    expect(ngrokConfigPaths('darwin', {}, '/Users/me')[0]).toBe(
      '/Users/me/Library/Application Support/ngrok/ngrok.yml'
    )
    expect(ngrokConfigPaths('linux', { XDG_CONFIG_HOME: '/xdg' }, '/home/me')).toEqual([
      '/xdg/ngrok/ngrok.yml',
      '/home/me/.ngrok2/ngrok.yml'
    ])
  })
})
