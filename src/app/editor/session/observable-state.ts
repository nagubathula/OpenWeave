/**
 * Replaces Vue's `shallowReactive` for the app editor state: a Proxy that
 * notifies subscribers after any top-level property write. The core editor and
 * all existing call sites keep mutating `state.foo = bar` unchanged; React
 * subscribes via `subscribe` (see `useEditorState`).
 */
export interface ObservableState<T extends object> {
  state: T
  /** Fires after a property actually changed value. Returns an unsubscribe fn. */
  subscribe(listener: (key: keyof T) => void): () => void
}

const subscribeRegistry = new WeakMap<
  object,
  (listener: (key: PropertyKey) => void) => () => void
>()

export function createObservableState<T extends object>(initial: T): ObservableState<T> {
  const listeners = new Set<(key: keyof T) => void>()

  const state = new Proxy(initial, {
    set(target, key, value) {
      const previous = Reflect.get(target, key)
      const ok = Reflect.set(target, key, value)
      if (ok && previous !== value) {
        for (const listener of listeners) listener(key as keyof T)
      }
      return ok
    }
  })

  const subscribe = (listener: (key: keyof T) => void) => {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }

  subscribeRegistry.set(state, subscribe as (listener: (key: PropertyKey) => void) => () => void)

  return { state, subscribe }
}

/**
 * Subscribe to an observable state by its object identity — for modules that
 * receive the state object but not its store (e.g. autosave).
 */
export function subscribeObservableState<T extends object>(
  state: T,
  listener: (key: keyof T) => void
): () => void {
  const subscribe = subscribeRegistry.get(state)
  if (!subscribe) throw new Error('[openweave] State object is not observable')
  return subscribe(listener as (key: PropertyKey) => void)
}
