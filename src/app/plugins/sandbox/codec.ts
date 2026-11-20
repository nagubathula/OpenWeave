/**
 * Wire format for values crossing the plugin sandbox boundary (QuickJS ⇄ host).
 *
 * Plain data (primitives, arrays, plain objects, bytes) is copied, like
 * Figma's plugin API returns copies of fills and other properties. Everything
 * else (node proxies, the `figma` object, functions) crosses as a handle the
 * other side wraps in a proxy, so identity (`node === node`) holds and host
 * objects never leak into the sandbox.
 */

export type WireValue =
  | { t: 'u' }
  | { t: 'v'; v: string | number | boolean | null }
  | { t: 'n'; v: 'NaN' | 'Infinity' | '-Infinity' }
  | { t: 'mixed' }
  | { t: 'h'; id: number; f?: 1 }
  | { t: 'cb'; id: number }
  | { t: 'a'; items: WireValue[] }
  | { t: 'o'; entries: Array<[string, WireValue]> }
  | { t: 'u8'; d: number[] }
  | { t: 'p'; id: number }
  | { t: 'err'; message: string }

const MAX_DEPTH = 64

export interface CodecHooks {
  /** The host's `figma.mixed` symbol, mapped to the sandbox's own symbol. */
  mixed: symbol
  /** Registers a host promise; the sandbox gets a pending promise settled later. */
  trackPromise: (promise: PromiseLike<unknown>) => number
  /** Host function that calls the sandbox callback `id`. */
  callbackFor: (id: number) => (...args: unknown[]) => unknown
}

/** Host objects the sandbox holds handles to, by id. */
export class HandleTable {
  private readonly byId = new Map<number, object>()
  private readonly ids = new WeakMap<object, number>()
  private nextId = 1

  idFor(value: object): number {
    const existing = this.ids.get(value)
    if (existing !== undefined) return existing
    const id = this.nextId++
    this.byId.set(id, value)
    this.ids.set(value, id)
    return id
  }

  get(id: number): object | undefined {
    return this.byId.get(id)
  }

  clear(): void {
    this.byId.clear()
  }
}

function isPlainObject(value: object): boolean {
  const proto: unknown = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}

function isThenable(value: object): value is PromiseLike<unknown> {
  return typeof Reflect.get(value, 'then') === 'function' && !(value instanceof Uint8Array)
}

export function encodeValue(
  value: unknown,
  handles: HandleTable,
  hooks: CodecHooks,
  depth = 0
): WireValue {
  if (value === undefined) return { t: 'u' }
  if (value === null) return { t: 'v', v: null }
  switch (typeof value) {
    case 'string':
    case 'boolean':
      return { t: 'v', v: value }
    case 'number':
      if (Number.isNaN(value)) return { t: 'n', v: 'NaN' }
      if (!Number.isFinite(value)) return { t: 'n', v: value > 0 ? 'Infinity' : '-Infinity' }
      return { t: 'v', v: value }
    case 'bigint':
      return { t: 'v', v: value.toString() }
    case 'symbol':
      return value === hooks.mixed ? { t: 'mixed' } : { t: 'u' }
    case 'function':
      return { t: 'h', id: handles.idFor(value), f: 1 }
    default:
      break
  }
  if (depth > MAX_DEPTH) return { t: 'u' }
  if (value instanceof Uint8Array) return { t: 'u8', d: Array.from(value) }
  if (Array.isArray(value)) {
    return { t: 'a', items: value.map((item) => encodeValue(item, handles, hooks, depth + 1)) }
  }
  if (isThenable(value)) return { t: 'p', id: hooks.trackPromise(value) }
  if (isPlainObject(value)) {
    return {
      t: 'o',
      entries: Object.entries(value).map(([key, item]) => [
        key,
        encodeValue(item, handles, hooks, depth + 1)
      ])
    }
  }
  return { t: 'h', id: handles.idFor(value) }
}

export function decodeValue(wire: WireValue, handles: HandleTable, hooks: CodecHooks): unknown {
  switch (wire.t) {
    case 'u':
      return undefined
    case 'v':
      return wire.v
    case 'n':
      return Number(wire.v)
    case 'mixed':
      return hooks.mixed
    case 'h':
      return handles.get(wire.id)
    case 'cb':
      return hooks.callbackFor(wire.id)
    case 'a':
      return wire.items.map((item) => decodeValue(item, handles, hooks))
    case 'o':
      return Object.fromEntries(
        wire.entries.map(([key, item]) => [key, decodeValue(item, handles, hooks)])
      )
    case 'u8':
      return Uint8Array.from(wire.d)
    case 'p':
    case 'err':
      return undefined
  }
}
