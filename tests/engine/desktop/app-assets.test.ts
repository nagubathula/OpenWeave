import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  createAppProtocolHandler,
  mimeTypeFor,
  resolveAssetPath,
  startAssetServer
} from '#desktop/app-assets'

let root = ''

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'openweave-assets-'))
  writeFileSync(join(root, 'index.html'), '<h1>home</h1>')
  writeFileSync(join(root, 'share.html'), '<h1>share</h1>')
  writeFileSync(join(root, '404.html'), '<h1>missing</h1>')
  writeFileSync(join(root, 'canvaskit.wasm'), new Uint8Array([0, 97, 115, 109]))
  mkdirSync(join(root, 'demo'))
  writeFileSync(join(root, 'demo', 'index.html'), '<h1>demo</h1>')
})

afterAll(() => {
  rmSync(root, { recursive: true, force: true })
})

describe('resolveAssetPath', () => {
  test('applies static-export fallbacks', async () => {
    expect(await resolveAssetPath(root, '/')).toBe(join(root, 'index.html'))
    expect(await resolveAssetPath(root, '/share')).toBe(join(root, 'share.html'))
    expect(await resolveAssetPath(root, '/demo/')).toBe(join(root, 'demo', 'index.html'))
    expect(await resolveAssetPath(root, '/canvaskit.wasm')).toBe(join(root, 'canvaskit.wasm'))
    expect(await resolveAssetPath(root, '/nope')).toBeNull()
  })

  test('refuses to escape the asset root', async () => {
    expect(await resolveAssetPath(root, '/../../etc/passwd')).toBeNull()
    expect(await resolveAssetPath(root, '/%2e%2e/%2e%2e/etc/passwd')).toBeNull()
    expect(await resolveAssetPath(root, '/%00')).toBeNull()
  })
})

describe('asset serving', () => {
  test('protocol handler serves files with MIME types and a 404 page', async () => {
    const handler = createAppProtocolHandler(root)
    const wasm = await handler(new Request('app://openweave/canvaskit.wasm'))
    expect(wasm.headers.get('content-type')).toBe('application/wasm')
    const missing = await handler(new Request('app://openweave/missing'))
    expect(missing.status).toBe(404)
    expect(await missing.text()).toContain('missing')
    expect((await handler(new Request('app://other/index.html'))).status).toBe(404)
  })

  test('loopback server serves the export for the share tunnel', async () => {
    const { server, port } = await startAssetServer(root)
    try {
      const res = await fetch(`http://127.0.0.1:${port}/share?room=abc`)
      expect(res.status).toBe(200)
      expect(await res.text()).toContain('share')
      expect((await fetch(`http://127.0.0.1:${port}/x`, { method: 'POST' })).status).toBe(405)
    } finally {
      server.close()
    }
  })

  test('maps common extensions', () => {
    expect(mimeTypeFor('a/b.JS')).toContain('javascript')
    expect(mimeTypeFor('font.woff2')).toBe('font/woff2')
    expect(mimeTypeFor('blob.unknown')).toBe('application/octet-stream')
  })
})
