import type { DesktopHttpRequest, DesktopHttpResponse } from '../src/app/desktop/types'

/**
 * Main-process HTTP client for requests the renderer cannot make directly
 * (provider APIs and storage endpoints without CORS headers). It replaces the
 * former Tauri `proxy_http_request` command and keeps its limits:
 * http(s) only, at most 5 redirects, optional timeout, bounded response size.
 */

export const DEFAULT_MAX_RESPONSE_BYTES = 64 * 1024 * 1024
const MAX_REDIRECTS = 5
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308])
/** Hop-by-hop or runtime-managed headers that must not be forwarded. */
const BLOCKED_REQUEST_HEADERS = new Set([
  'host',
  'connection',
  'content-length',
  'transfer-encoding'
])

type Fetch = typeof fetch

function assertHttpUrl(raw: string): URL {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new Error('Desktop HTTP request URL is invalid')
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Desktop HTTP requests only support http and https URLs')
  }
  return url
}

async function readBounded(response: Response, maxBytes: number): Promise<Uint8Array> {
  const declared = Number(response.headers.get('content-length'))
  if (Number.isFinite(declared) && declared > maxBytes) {
    await response.body?.cancel()
    throw new Error(`Desktop HTTP response exceeds ${maxBytes} bytes`)
  }
  if (!response.body) return new Uint8Array()
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > maxBytes) {
      await reader.cancel()
      throw new Error(`Desktop HTTP response exceeds ${maxBytes} bytes`)
    }
    chunks.push(value)
  }
  const body = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    body.set(chunk, offset)
    offset += chunk.byteLength
  }
  return body
}

/** 303, and 301/302 after POST, are re-sent as body-less GETs (fetch semantics). */
function redirectDropsBody(status: number, method: string): boolean {
  return status === 303 || ((status === 301 || status === 302) && method === 'POST')
}

function forwardedHeaders(request: DesktopHttpRequest): Headers {
  const headers = new Headers()
  for (const { name, value } of request.headers ?? []) {
    if (!BLOCKED_REQUEST_HEADERS.has(name.toLowerCase())) headers.append(name, value)
  }
  return headers
}

export async function proxyHttpRequest(
  request: DesktopHttpRequest,
  fetchImpl: Fetch = fetch
): Promise<DesktopHttpResponse> {
  let url = assertHttpUrl(request.url)
  let method = (request.method ?? 'GET').toUpperCase()
  let body: Uint8Array | undefined = request.body?.byteLength ? request.body : undefined
  const headers = forwardedHeaders(request)
  const followRedirects = request.followRedirects ?? true
  const maxBytes = request.maxResponseBytes ?? DEFAULT_MAX_RESPONSE_BYTES
  const signal = request.timeoutMs ? AbortSignal.timeout(request.timeoutMs) : undefined

  for (let redirects = 0; ; redirects++) {
    const response = await fetchImpl(url, {
      method,
      headers,
      body: body as BodyInit | undefined,
      redirect: 'manual',
      signal
    })

    const location = response.headers.get('location')
    if (followRedirects && REDIRECT_STATUSES.has(response.status) && location) {
      await response.body?.cancel()
      if (redirects >= MAX_REDIRECTS) {
        throw new Error('Desktop HTTP request exceeded redirect limit')
      }
      url = assertHttpUrl(new URL(location, url).toString())
      if (redirectDropsBody(response.status, method)) {
        method = 'GET'
        body = undefined
        headers.delete('content-type')
      }
      continue
    }

    return {
      status: response.status,
      headers: [...response.headers.entries()].map(([name, value]) => ({ name, value })),
      body: await readBounded(response, maxBytes),
      url: url.toString()
    }
  }
}
