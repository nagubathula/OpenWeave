import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import * as path from 'node:path'
import { Readable } from 'node:stream'

/**
 * Serves the Next.js static export (`dist/`) to the desktop window and to the
 * ngrok share tunnel. A static export references assets by absolute path
 * (`/_next/...`), which breaks under `file://`, so the window loads it from a
 * privileged `app://openweave` origin and invitees get it over local HTTP.
 */

export const APP_SCHEME = 'app'
export const APP_HOST = 'openweave'
export const APP_ORIGIN = `${APP_SCHEME}://${APP_HOST}`

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.wasm': 'application/wasm',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.kiwi': 'application/octet-stream'
}

export function mimeTypeFor(filePath: string): string {
  return MIME_TYPES[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream'
}

async function isFile(filePath: string): Promise<boolean> {
  try {
    return (await stat(filePath)).isFile()
  } catch {
    return false
  }
}

/**
 * Maps a URL pathname to a file inside `root`, applying static-export
 * fallbacks (`/share` → `share.html`, `/demo/` → `demo/index.html`).
 * Returns `null` for traversal attempts and missing files.
 */
export async function resolveAssetPath(root: string, pathname: string): Promise<string | null> {
  let decoded: string
  try {
    decoded = decodeURIComponent(pathname)
  } catch {
    return null
  }
  if (decoded.includes('\0')) return null
  const relative = path.posix.normalize(`/${decoded}`).replace(/^\/+/, '')
  const base = path.resolve(root)
  const target = path.resolve(base, relative)
  if (target !== base && !target.startsWith(base + path.sep)) return null

  const candidates =
    relative === '' || relative.endsWith('/')
      ? [path.join(target, 'index.html')]
      : [target, `${target}.html`, path.join(target, 'index.html')]
  for (const candidate of candidates) {
    if (await isFile(candidate)) return candidate
  }
  return null
}

async function respond(
  root: string,
  pathname: string
): Promise<{ status: number; file: string | null }> {
  const file = await resolveAssetPath(root, pathname)
  if (file) return { status: 200, file }
  return { status: 404, file: await resolveAssetPath(root, '/404.html') }
}

/** Handler for `protocol.handle(APP_SCHEME, ...)`. */
export function createAppProtocolHandler(root: string) {
  return async (request: Request): Promise<Response> => {
    const url = new URL(request.url)
    if (url.host !== APP_HOST) return new Response('Not found', { status: 404 })
    const { status, file } = await respond(root, url.pathname)
    if (!file) return new Response('Not found', { status: 404 })
    const stream = Readable.toWeb(createReadStream(file)) as ReadableStream<Uint8Array>
    return new Response(stream, { status, headers: { 'content-type': mimeTypeFor(file) } })
  }
}

/** Serves one HTTP request from the static export in `root`. */
export function serveAssetRequest(root: string, req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405).end()
    return
  }
  const pathname = new URL(req.url ?? '/', 'http://localhost').pathname
  respond(root, pathname)
    .then(({ status, file }) => {
      if (!file) return res.writeHead(404).end('Not found')
      res.writeHead(status, { 'content-type': mimeTypeFor(file) })
      if (req.method === 'HEAD') return res.end()
      return createReadStream(file)
        .on('error', () => res.destroy())
        .pipe(res)
    })
    .catch(() => res.writeHead(500).end())
}

/** Binds `server` to a random loopback port and returns that port. */
export async function listenOnLoopback(server: Server): Promise<number> {
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => resolve())
  })
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Share server has no TCP address')
  return address.port
}

/** Starts a loopback HTTP server over the static export on a random port. */
export async function startAssetServer(root: string): Promise<{ server: Server; port: number }> {
  const server = createServer((req, res) => serveAssetRequest(root, req, res))
  return { server, port: await listenOnLoopback(server) }
}
