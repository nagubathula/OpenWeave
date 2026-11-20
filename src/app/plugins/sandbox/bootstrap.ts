/**
 * Runs first inside the QuickJS sandbox. It takes the private `__host_*`
 * functions off the global object, wraps host handles in proxies, and exposes
 * `figma`, `console`, and timers to plugin code. Plugin code has no other way
 * to reach the host: no `window`, `fetch`, DOM, or desktop bridge exists here.
 */
export const SANDBOX_BOOTSTRAP = String.raw`
(() => {
  const g = globalThis
  const hostGet = g.__host_get
  const hostSet = g.__host_set
  const hostCall = g.__host_call
  const hostKeys = g.__host_keys
  const hostHas = g.__host_has
  const hostLog = g.__host_log
  const hostTimer = g.__host_timer
  const hostClearTimer = g.__host_clear_timer
  const figmaWire = g.__figma_wire
  for (const key of ['__host_get', '__host_set', '__host_call', '__host_keys', '__host_has',
    '__host_log', '__host_timer', '__host_clear_timer', '__figma_wire']) {
    delete g[key]
  }

  const HANDLE = Symbol('handle')
  const mixed = Symbol('figma.mixed')
  const proxies = new Map()
  const callbacks = new Map()
  const callbackIds = new WeakMap()
  const pending = new Map()
  let nextCallbackId = 1

  function isPlainObject(value) {
    const proto = Object.getPrototypeOf(value)
    return proto === Object.prototype || proto === null
  }

  function encode(value, depth = 0) {
    if (value === undefined) return { t: 'u' }
    if (value === null) return { t: 'v', v: null }
    const type = typeof value
    if (type === 'string' || type === 'boolean') return { t: 'v', v: value }
    if (type === 'number') {
      if (Number.isNaN(value)) return { t: 'n', v: 'NaN' }
      if (!Number.isFinite(value)) return { t: 'n', v: value > 0 ? 'Infinity' : '-Infinity' }
      return { t: 'v', v: value }
    }
    if (type === 'bigint') return { t: 'v', v: String(value) }
    if (type === 'symbol') return value === mixed ? { t: 'mixed' } : { t: 'u' }
    if (depth > 64) return { t: 'u' }
    if (type === 'function') {
      const handle = value[HANDLE]
      if (handle !== undefined) return { t: 'h', id: handle, f: 1 }
      let id = callbackIds.get(value)
      if (id === undefined) {
        id = nextCallbackId++
        callbackIds.set(value, id)
        callbacks.set(id, value)
      }
      return { t: 'cb', id }
    }
    const handle = value[HANDLE]
    if (handle !== undefined) return { t: 'h', id: handle }
    if (value instanceof Uint8Array) return { t: 'u8', d: Array.from(value) }
    if (value instanceof ArrayBuffer) return { t: 'u8', d: Array.from(new Uint8Array(value)) }
    if (Array.isArray(value)) return { t: 'a', items: value.map((item) => encode(item, depth + 1)) }
    if (value instanceof Error) {
      return { t: 'o', entries: [['name', encode(value.name)], ['message', encode(value.message)]] }
    }
    if (!isPlainObject(value) && typeof value.toJSON === 'function') return encode(value.toJSON(), depth + 1)
    return { t: 'o', entries: Object.keys(value).map((key) => [key, encode(value[key], depth + 1)]) }
  }

  function decode(wire) {
    switch (wire.t) {
      case 'u': return undefined
      case 'v': return wire.v
      case 'n': return Number(wire.v)
      case 'mixed': return mixed
      case 'h': return proxyFor(wire.id, wire.f === 1)
      case 'cb': return callbacks.get(wire.id)
      case 'a': return wire.items.map(decode)
      case 'o': {
        const result = {}
        for (const [key, item] of wire.entries) result[key] = decode(item)
        return result
      }
      case 'u8': return Uint8Array.from(wire.d)
      case 'p': return new Promise((resolve, reject) => pending.set(wire.id, { resolve, reject }))
      case 'err': throw new Error(wire.message)
    }
    return undefined
  }

  const fromHost = (json) => decode(JSON.parse(json))
  const toHost = (value) => JSON.stringify(encode(value))

  function proxyFor(id, callable) {
    const cached = proxies.get(id)
    if (cached) return cached
    // Arrow functions have no non-configurable 'prototype', which keeps the
    // proxy's ownKeys trap free to report the host object's keys.
    const target = callable ? () => undefined : {}
    const handler = {
      get(_, key) {
        if (key === HANDLE) return id
        if (typeof key === 'symbol') return undefined
        return fromHost(hostGet(id, key))
      },
      set(_, key, value) {
        if (typeof key === 'symbol') return false
        fromHost(hostSet(id, key, toHost(value)))
        return true
      },
      deleteProperty(_, key) {
        if (typeof key !== 'symbol') fromHost(hostSet(id, key, toHost(undefined)))
        return true
      },
      has(_, key) {
        return typeof key === 'string' && hostHas(id, key)
      },
      ownKeys() {
        return JSON.parse(hostKeys(id))
      },
      getOwnPropertyDescriptor(_, key) {
        if (typeof key === 'symbol' || !hostHas(id, key)) return undefined
        return { configurable: true, enumerable: true, writable: true, value: handler.get(_, key) }
      },
      apply(_, thisArg, args) {
        return fromHost(hostCall(id, toHost(thisArg), toHost(args)))
      }
    }
    const proxy = new Proxy(target, handler)
    proxies.set(id, proxy)
    return proxy
  }

  function format(arg) {
    if (typeof arg === 'string') return arg
    if (arg instanceof Error) return arg.stack || String(arg)
    try { return JSON.stringify(arg) } catch { return String(arg) }
  }
  const log = (level) => (...args) => hostLog(level, args.map(format).join(' '))
  g.console = { log: log('log'), info: log('info'), warn: log('warn'), error: log('error'), debug: log('debug') }

  const startTimer = (repeat) => (fn, ms, ...args) => {
    if (typeof fn !== 'function') return 0
    const run = args.length ? () => fn(...args) : fn
    return hostTimer(toHost(run), Number(ms) || 0, repeat)
  }
  g.setTimeout = startTimer(false)
  g.setInterval = startTimer(true)
  g.clearTimeout = (id) => hostClearTimer(Number(id) || 0)
  g.clearInterval = g.clearTimeout

  g.figma = fromHost(figmaWire)

  // Entry points the host calls (not reachable as globals by plugin code).
  return {
    invoke(id, argsJson) {
      const fn = callbacks.get(id)
      if (!fn) return toHost(undefined)
      return toHost(fn(...fromHost(argsJson)))
    },
    settle(id, ok, json) {
      const entry = pending.get(id)
      if (!entry) return
      pending.delete(id)
      try {
        const value = fromHost(json)
        if (ok) entry.resolve(value)
        else entry.reject(value instanceof Error ? value : new Error(String(value && value.message || value)))
      } catch (error) {
        entry.reject(error)
      }
    }
  }
})()
`
