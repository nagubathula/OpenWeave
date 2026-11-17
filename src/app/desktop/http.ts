import { getDesktopBridge } from '@/app/desktop/env'
import type { DesktopHttpHeader } from '@/app/desktop/types'

function headersToProxyHeaders(headers: Headers): DesktopHttpHeader[] {
  return [...headers.entries()].map(([name, value]) => ({ name, value }))
}

function abortReason(signal: AbortSignal): Error {
  return signal.reason instanceof Error
    ? signal.reason
    : new DOMException('The operation was aborted', 'AbortError')
}

export function withAbortSignal<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) {
    void promise.catch(() => undefined)
    return Promise.reject(abortReason(signal))
  }

  return new Promise<T>((resolve, reject) => {
    const cleanup = () => signal.removeEventListener('abort', onAbort)
    const onAbort = () => {
      cleanup()
      reject(abortReason(signal))
    }
    signal.addEventListener('abort', onAbort, { once: true })
    void (async () => {
      try {
        const value = await promise
        cleanup()
        resolve(value)
      } catch (error) {
        cleanup()
        reject(
          error instanceof Error
            ? error
            : new Error('Desktop HTTP request failed', { cause: error })
        )
      }
    })()
  })
}

/**
 * `fetch` routed through the Electron main process, which is not subject to
 * renderer CORS. Falls back to the renderer `fetch` in a plain browser.
 */
export async function desktopFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
  maxResponseBytes?: number,
  timeoutMs?: number
): Promise<Response> {
  const request = new Request(input, init)
  request.signal.throwIfAborted()
  const bridge = getDesktopBridge()
  if (!bridge) return fetch(request)
  const body = request.body == null ? undefined : new Uint8Array(await request.arrayBuffer())
  request.signal.throwIfAborted()
  const response = await withAbortSignal(
    bridge.http.request({
      url: request.url,
      method: request.method,
      headers: headersToProxyHeaders(request.headers),
      body,
      maxResponseBytes,
      followRedirects: request.redirect === 'follow',
      timeoutMs
    }),
    request.signal
  )
  const proxiedResponse = new Response(
    response.status === 204 || response.status === 304 ? null : new Uint8Array(response.body),
    {
      status: response.status,
      headers: response.headers.map(({ name, value }): [string, string] => [name, value])
    }
  )
  Object.defineProperty(proxiedResponse, 'url', { value: response.url })
  return proxiedResponse
}
