import type {
  QuickJSContext,
  QuickJSHandle,
  QuickJSRuntime,
  QuickJSWASMModule
} from 'quickjs-emscripten-core'

import { SANDBOX_BOOTSTRAP } from './bootstrap'
import { decodeValue, encodeValue, HandleTable, type CodecHooks, type WireValue } from './codec'

/**
 * Runs plugin code in a QuickJS (WebAssembly) interpreter, the same isolation
 * model Figma uses. Plugin code only sees what the host passes in as `figma`;
 * it cannot reach the page, the network, storage, or the desktop bridge.
 */

const MEMORY_LIMIT_BYTES = 512 * 1024 * 1024
const STACK_LIMIT_BYTES = 1024 * 1024
/** Longest one synchronous run of plugin code may take before it is stopped. */
const DEFAULT_ENTRY_TIMEOUT_MS = 30_000

let quickJS: Promise<QuickJSWASMModule> | null = null

/** Loads the QuickJS module once; the single-file build embeds its WASM. */
function loadQuickJS(): Promise<QuickJSWASMModule> {
  quickJS ??= Promise.all([
    import('quickjs-emscripten-core'),
    import('@jitl/quickjs-singlefile-browser-release-sync')
  ]).then(([core, variant]) => core.newQuickJSWASMModuleFromVariant(variant.default))
  return quickJS
}

export type SandboxLogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug'

export interface PluginSandboxOptions {
  /** The object exposed to plugin code as `figma`. */
  figma: object
  /** `figma.mixed` on the host, mapped to the sandbox's own symbol. */
  mixed: symbol
  /** Extra string globals, e.g. `__html__`. */
  globals?: Record<string, string>
  onLog?: (level: SandboxLogLevel, message: string) => void
  /** Runs before host code calls into the sandbox (outermost call only). */
  onEntryStart?: () => void
  /** Runs after the sandbox returns and its promise jobs drain. */
  onEntryEnd?: () => void
  /** Plugin code threw, rejected, or ran too long. */
  onError?: (error: Error) => void
  entryTimeoutMs?: number
}

function errorFromDump(dumped: unknown): Error {
  if (dumped && typeof dumped === 'object') {
    const message = Reflect.get(dumped, 'message')
    const stack = Reflect.get(dumped, 'stack')
    const error = new Error(typeof message === 'string' ? message : 'Plugin error')
    if (typeof stack === 'string') error.stack = stack
    return error
  }
  return new Error(String(dumped))
}

export class PluginSandbox {
  private readonly handles = new HandleTable()
  private readonly hostCallbacks = new Map<number, (...args: unknown[]) => unknown>()
  private readonly promises = new Map<number, PromiseLike<unknown>>()
  private readonly timers = new Map<number, ReturnType<typeof setTimeout>>()
  private nextPromiseId = 1
  private nextTimerId = 1
  private depth = 0
  private disposed = false
  private entry: QuickJSHandle | null = null
  private readonly hooks: CodecHooks

  private constructor(
    private readonly runtime: QuickJSRuntime,
    private readonly vm: QuickJSContext,
    private readonly options: PluginSandboxOptions
  ) {
    this.hooks = {
      mixed: options.mixed,
      trackPromise: (promise) => this.trackPromise(promise),
      callbackFor: (id) => this.callbackFor(id)
    }
  }

  static async create(options: PluginSandboxOptions): Promise<PluginSandbox> {
    const module = await loadQuickJS()
    const runtime = module.newRuntime()
    runtime.setMemoryLimit(MEMORY_LIMIT_BYTES)
    runtime.setMaxStackSize(STACK_LIMIT_BYTES)
    const sandbox = new PluginSandbox(runtime, runtime.newContext(), options)
    sandbox.install()
    return sandbox
  }

  get isDisposed(): boolean {
    return this.disposed
  }

  /** Runs the plugin's main code. Errors go to `onError`. */
  run(code: string, filename = 'code.js'): void {
    this.enter(() => {
      const result = this.vm.evalCode(code, filename)
      if (result.error) {
        const error = errorFromDump(this.vm.dump(result.error))
        result.error.dispose()
        throw error
      }
      result.value.dispose()
    })
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    for (const timer of this.timers.values()) clearTimeout(timer)
    this.timers.clear()
    this.promises.clear()
    this.hostCallbacks.clear()
    this.handles.clear()
    // Disposing while plugin code is on the stack (e.g. figma.closePlugin())
    // would free memory still in use; defer until the call unwinds.
    if (this.depth > 0) return
    this.freeVm()
  }

  private freeVm() {
    this.entry?.dispose()
    this.entry = null
    this.vm.dispose()
    this.runtime.dispose()
  }

  private encode(value: unknown): string {
    return JSON.stringify(encodeValue(value, this.handles, this.hooks))
  }

  private decode(json: string): unknown {
    const wire: WireValue = JSON.parse(json)
    return decodeValue(wire, this.handles, this.hooks)
  }

  private errorWire(error: unknown): string {
    const message = error instanceof Error ? error.message : String(error)
    return JSON.stringify({ t: 'err', message } satisfies WireValue)
  }

  private hostObject(id: number): object {
    const target = this.handles.get(id)
    if (!target) throw new Error('This object is no longer available to the plugin')
    return target
  }

  private install() {
    const { vm } = this
    const define = (name: string, fn: (...args: QuickJSHandle[]) => QuickJSHandle | undefined) => {
      const handle = vm.newFunction(name, fn)
      vm.setProp(vm.global, name, handle)
      handle.dispose()
    }

    define('__host_get', (idHandle, keyHandle) => {
      try {
        const target = this.hostObject(vm.getNumber(idHandle))
        return vm.newString(this.encode(Reflect.get(target, vm.getString(keyHandle))))
      } catch (error) {
        return vm.newString(this.errorWire(error))
      }
    })
    define('__host_set', (idHandle, keyHandle, valueHandle) => {
      try {
        const target = this.hostObject(vm.getNumber(idHandle))
        Reflect.set(target, vm.getString(keyHandle), this.decode(vm.getString(valueHandle)))
        return vm.newString(this.encode(undefined))
      } catch (error) {
        return vm.newString(this.errorWire(error))
      }
    })
    define('__host_call', (idHandle, thisHandle, argsHandle) => {
      try {
        const fn = this.hostObject(vm.getNumber(idHandle))
        if (typeof fn !== 'function') throw new TypeError('Not a function')
        const self = this.decode(vm.getString(thisHandle))
        const args = this.decode(vm.getString(argsHandle))
        const result: unknown = Reflect.apply(fn, self, Array.isArray(args) ? args : [])
        return vm.newString(this.encode(result))
      } catch (error) {
        return vm.newString(this.errorWire(error))
      }
    })
    define('__host_keys', (idHandle) => {
      const target = this.handles.get(vm.getNumber(idHandle))
      const keys = target ? Reflect.ownKeys(target).filter((key) => typeof key === 'string') : []
      return vm.newString(JSON.stringify(keys))
    })
    define('__host_has', (idHandle, keyHandle) => {
      const target = this.handles.get(vm.getNumber(idHandle))
      return target && vm.getString(keyHandle) in target ? vm.true : vm.false
    })
    define('__host_log', (levelHandle, messageHandle) => {
      const level = vm.getString(levelHandle)
      const message = vm.getString(messageHandle)
      const known: SandboxLogLevel[] = ['log', 'info', 'warn', 'error', 'debug']
      const resolved = known.find((candidate) => candidate === level) ?? 'log'
      this.options.onLog?.(resolved, message)
      return undefined
    })
    define('__host_timer', (callbackHandle, msHandle, repeatHandle) => {
      const callback = this.decode(vm.getString(callbackHandle))
      if (typeof callback !== 'function') return vm.newNumber(0)
      const id = this.nextTimerId++
      const repeat = vm.dump(repeatHandle) === true
      const delay = Math.max(0, vm.getNumber(msHandle))
      const schedule = () => {
        this.timers.set(
          id,
          setTimeout(() => {
            if (this.disposed) return
            if (repeat) schedule()
            else this.timers.delete(id)
            callback()
          }, delay)
        )
      }
      schedule()
      return vm.newNumber(id)
    })
    define('__host_clear_timer', (idHandle) => {
      const id = vm.getNumber(idHandle)
      const timer = this.timers.get(id)
      if (timer !== undefined) clearTimeout(timer)
      this.timers.delete(id)
      return undefined
    })

    const globals = { ...this.options.globals, __figma_wire: this.encode(this.options.figma) }
    for (const [name, value] of Object.entries(globals)) {
      const handle = vm.newString(value)
      vm.setProp(vm.global, name, handle)
      handle.dispose()
    }

    const result = vm.evalCode(SANDBOX_BOOTSTRAP, 'openweave-bootstrap.js')
    if (result.error) {
      const error = errorFromDump(vm.dump(result.error))
      result.error.dispose()
      throw error
    }
    this.entry = result.value
  }

  /** Wraps every call into the sandbox: deadline, promise jobs, and hooks. */
  private enter<T>(fn: () => T): T | undefined {
    if (this.disposed) return undefined
    const outermost = this.depth === 0
    if (outermost) {
      const deadline = Date.now() + (this.options.entryTimeoutMs ?? DEFAULT_ENTRY_TIMEOUT_MS)
      this.runtime.setInterruptHandler(() => Date.now() > deadline)
      this.options.onEntryStart?.()
    }
    this.depth++
    try {
      const result = fn()
      if (outermost) this.drainJobs()
      return result
    } catch (error) {
      // A nested call (a plugin callback the host runs mid-call, such as a
      // findAll predicate) rethrows into the plugin code that made the call.
      if (!outermost) throw error
      this.options.onError?.(error instanceof Error ? error : new Error(String(error)))
      return undefined
    } finally {
      this.depth--
      if (outermost) {
        // Still runs after figma.closePlugin(): edits made just before
        // closing need their layout, render, and undo entry.
        this.options.onEntryEnd?.()
        if (this.disposed) this.freeVm()
      }
    }
  }

  private drainJobs() {
    for (;;) {
      const result = this.runtime.executePendingJobs()
      if (result.error) {
        const error = errorFromDump(this.vm.dump(result.error))
        result.error.dispose()
        throw error
      }
      if (result.value === 0 || this.disposed) return
    }
  }

  private callEntry(name: 'invoke' | 'settle', args: Array<number | string | boolean>): string {
    const { vm } = this
    if (!this.entry) return this.encode(undefined)
    const fn = vm.getProp(this.entry, name)
    const argHandles = args.map((arg) =>
      typeof arg === 'number'
        ? vm.newNumber(arg)
        : typeof arg === 'boolean'
          ? arg
            ? vm.true
            : vm.false
          : vm.newString(arg)
    )
    try {
      const result = vm.callFunction(fn, this.entry, ...argHandles)
      if (result.error) {
        const error = errorFromDump(vm.dump(result.error))
        result.error.dispose()
        throw error
      }
      const value = vm.typeof(result.value) === 'string' ? vm.getString(result.value) : ''
      result.value.dispose()
      return value || this.encode(undefined)
    } finally {
      fn.dispose()
      for (const handle of argHandles) {
        if (handle !== vm.true && handle !== vm.false) handle.dispose()
      }
    }
  }

  /** A host function that runs sandbox callback `id` (stable per id). */
  private callbackFor(id: number): (...args: unknown[]) => unknown {
    const existing = this.hostCallbacks.get(id)
    if (existing) return existing
    const callback = (...args: unknown[]) =>
      this.enter(() => this.decode(this.callEntry('invoke', [id, this.encode(args)])))
    this.hostCallbacks.set(id, callback)
    return callback
  }

  private trackPromise(promise: PromiseLike<unknown>): number {
    const id = this.nextPromiseId++
    this.promises.set(id, promise)
    const settle = (ok: boolean, value: unknown) => {
      if (!this.promises.delete(id)) return
      const wire = ok ? this.encode(value) : this.encode(this.errorShape(value))
      this.enter(() => this.callEntry('settle', [id, ok, wire]))
    }
    // settle() never throws (enter() reports plugin errors), so the catch
    // only sees the host promise's own rejection.
    Promise.resolve(promise)
      .then((value) => settle(true, value))
      .catch((error: unknown) => settle(false, error))
    return id
  }

  private errorShape(error: unknown): { message: string } {
    return { message: error instanceof Error ? error.message : String(error) }
  }
}
