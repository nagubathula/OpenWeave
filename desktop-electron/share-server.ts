import {
  createServer,
  request as httpRequest,
  type IncomingMessage,
  type Server,
  type ServerResponse
} from 'node:http'
import { connect } from 'node:net'
import type { Duplex } from 'node:stream'

import { COLLAB_RELAY_HEALTH_PATH } from '../src/app/collab/relay/protocol'
import { listenOnLoopback, serveAssetRequest } from './app-assets'
import type { CollabRelay } from './collab-relay'

/**
 * Loopback server behind the ngrok share tunnel. It serves the editor to
 * invitees (the static export when packaged, a proxy to the Next dev server in
 * dev) and hosts the collab relay on the same origin, so one tunnel carries
 * both the app and the collaboration traffic.
 */

export interface ShareServerOptions {
  distRoot: string
  /** Next dev server origin (e.g. `http://127.0.0.1:1420`), or `null` when packaged. */
  devOrigin: string | null
  relay: CollabRelay
  /** Interface the LAN listener binds; every interface unless overridden (tests). */
  lanHost?: string
}

export interface ShareServer {
  server: Server
  port: number
  /**
   * Also serves the app and relay on every network interface, for links that
   * work across the local network without internet. Returns the LAN port.
   */
  startLan: () => Promise<number>
  stopLan: () => void
  lanPort: () => number | null
  close: () => void
}

async function listenOnAllInterfaces(server: Server, host = '0.0.0.0'): Promise<number> {
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, host, () => resolve())
  })
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('LAN server has no TCP address')
  return address.port
}

function closeServer(server: Server) {
  server.close()
  server.closeAllConnections()
}

/** Pipes a WebSocket upgrade (e.g. Next's HMR socket) through to the dev server. */
function proxyUpgrade(dev: URL, req: IncomingMessage, socket: Duplex, head: Buffer) {
  const upstream = connect(Number(dev.port || 80), dev.hostname, () => {
    const headerLines: string[] = []
    for (let i = 0; i < req.rawHeaders.length; i += 2) {
      headerLines.push(`${req.rawHeaders[i]}: ${req.rawHeaders[i + 1]}`)
    }
    const requestLine = `${req.method ?? 'GET'} ${req.url ?? '/'} HTTP/${req.httpVersion}`
    upstream.write(`${[requestLine, ...headerLines].join('\r\n')}\r\n\r\n`)
    if (head.length > 0) upstream.write(head)
    socket.pipe(upstream).pipe(socket)
  })
  upstream.on('error', () => socket.destroy())
  socket.on('error', () => upstream.destroy())
}

export async function startShareServer(options: ShareServerOptions): Promise<ShareServer> {
  const dev = options.devOrigin ? new URL(options.devOrigin) : null

  const handleRequest = (req: IncomingMessage, res: ServerResponse) => {
    const pathname = new URL(req.url ?? '/', 'http://localhost').pathname
    if (pathname === COLLAB_RELAY_HEALTH_PATH) {
      res
        .writeHead(200, {
          'content-type': 'application/json; charset=utf-8',
          'cache-control': 'no-store'
        })
        .end(JSON.stringify({ relay: true }))
      return
    }
    if (!dev) {
      serveAssetRequest(options.distRoot, req, res)
      return
    }
    // Keep the public Host header: Next checks it against allowedDevOrigins.
    const upstream = httpRequest(
      {
        hostname: dev.hostname,
        port: dev.port || 80,
        method: req.method,
        path: req.url,
        headers: req.headers
      },
      (response) => {
        res.writeHead(response.statusCode ?? 502, response.headers)
        response.pipe(res)
      }
    )
    upstream.on('error', () => {
      if (!res.headersSent) res.writeHead(502)
      res.end()
    })
    req.pipe(upstream)
  }

  const handleUpgrade = (req: IncomingMessage, socket: Duplex, head: Buffer) => {
    if (options.relay.handleUpgrade(req, socket, head)) return
    if (dev) proxyUpgrade(dev, req, socket, head)
    else socket.destroy()
  }

  const createHandlerServer = () => createServer(handleRequest).on('upgrade', handleUpgrade)

  const server = createHandlerServer()
  const port = await listenOnLoopback(server)

  let lan: { server: Server; port: Promise<number> } | null = null
  const stopLan = () => {
    if (lan) closeServer(lan.server)
    lan = null
  }

  return {
    server,
    port,
    startLan() {
      if (!lan) {
        const lanServer = createHandlerServer()
        const current = {
          server: lanServer,
          port: listenOnAllInterfaces(lanServer, options.lanHost)
        }
        current.port.catch(() => {
          if (lan === current) lan = null
        })
        lan = current
      }
      return lan.port
    },
    stopLan,
    lanPort: () => {
      const address = lan?.server.address()
      return address && typeof address !== 'string' ? address.port : null
    },
    close() {
      stopLan()
      options.relay.close()
      closeServer(server)
    }
  }
}
