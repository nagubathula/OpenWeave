import { describe, expect, test } from 'bun:test'

import { proxyHttpRequest } from '#desktop/http-proxy'

type Call = { url: string; method: string; body: unknown; headers: Headers }

function fakeFetch(responses: Array<() => Response>) {
  const calls: Call[] = []
  const impl = (async (input: URL | RequestInfo, init?: RequestInit) => {
    calls.push({
      url: String(input),
      method: init?.method ?? 'GET',
      body: init?.body,
      headers: new Headers(init?.headers)
    })
    const next = responses.shift()
    if (!next) throw new Error('unexpected request')
    return next()
  }) as typeof fetch
  return { impl, calls }
}

describe('proxyHttpRequest', () => {
  test('forwards method, headers, and body and returns the response', async () => {
    const { impl, calls } = fakeFetch([
      () => new Response('{"ok":true}', { status: 201, headers: { 'x-id': '7' } })
    ])
    const response = await proxyHttpRequest(
      {
        url: 'https://api.example.com/v1',
        method: 'post',
        headers: [
          { name: 'authorization', value: 'Bearer t' },
          { name: 'host', value: 'evil.example' }
        ],
        body: new TextEncoder().encode('{}')
      },
      impl
    )
    expect(calls[0]?.method).toBe('POST')
    expect(calls[0]?.headers.get('authorization')).toBe('Bearer t')
    expect(calls[0]?.headers.has('host')).toBe(false)
    expect(response.status).toBe(201)
    expect(response.headers).toContainEqual({ name: 'x-id', value: '7' })
    expect(new TextDecoder().decode(response.body)).toBe('{"ok":true}')
  })

  test('rejects non-http schemes', async () => {
    const { impl } = fakeFetch([])
    await expect(proxyHttpRequest({ url: 'file:///etc/passwd' }, impl)).rejects.toThrow(
      'only support http and https'
    )
  })

  test('follows redirects, switching 303 to GET, and reports the final URL', async () => {
    const { impl, calls } = fakeFetch([
      () => new Response(null, { status: 303, headers: { location: '/done' } }),
      () => new Response('ok')
    ])
    const response = await proxyHttpRequest(
      { url: 'https://api.example.com/start', method: 'POST', body: new Uint8Array([1]) },
      impl
    )
    expect(calls.map((c) => `${c.method} ${c.url}`)).toEqual([
      'POST https://api.example.com/start',
      'GET https://api.example.com/done'
    ])
    expect(calls[1]?.body).toBeUndefined()
    expect(response.url).toBe('https://api.example.com/done')
  })

  test('refuses redirects to non-http schemes and stops after the redirect limit', async () => {
    const toFile = fakeFetch([
      () => new Response(null, { status: 302, headers: { location: 'file:///x' } })
    ])
    await expect(proxyHttpRequest({ url: 'https://a.example' }, toFile.impl)).rejects.toThrow()

    const loop = fakeFetch(
      Array.from(
        { length: 6 },
        () => () => new Response(null, { status: 302, headers: { location: '/again' } })
      )
    )
    await expect(proxyHttpRequest({ url: 'https://a.example' }, loop.impl)).rejects.toThrow(
      'redirect limit'
    )
  })

  test('returns redirects untouched when followRedirects is false', async () => {
    const { impl } = fakeFetch([
      () => new Response(null, { status: 302, headers: { location: '/x' } })
    ])
    const response = await proxyHttpRequest(
      { url: 'https://a.example', followRedirects: false },
      impl
    )
    expect(response.status).toBe(302)
  })

  test('enforces the response size limit', async () => {
    const { impl } = fakeFetch([() => new Response(new Uint8Array(32))])
    await expect(
      proxyHttpRequest({ url: 'https://a.example', maxResponseBytes: 16 }, impl)
    ).rejects.toThrow('exceeds 16 bytes')
  })
})
