const noop = () => undefined

/**
 * Minimal drop-in replacement for VueUse's `useEventListener` that works with
 * plain React refs ({current: Element | null}) or raw Element references.
 * Called like:
 *   addListener(ref, 'click', handler)
 *   addListener(ref, 'click', handler, { passive: false })
 *   addListener(window, 'keydown', handler)
 *
 * Returns a cleanup function.
 */
export function addListener<K extends keyof HTMLElementEventMap>(
  target: { current?: HTMLElement | null; value?: HTMLElement | null } | EventTarget | null | undefined,
  event: K | (string & Record<string, unknown>),
  handler: (e: Event) => void,
  options?: AddEventListenerOptions
): () => void {
  if (!target) return noop
  // Resolve from .current (React ref) or .value (Vue-style ref adapter) or use directly
  let el: EventTarget | null = null
  const obj = target as { current?: unknown; value?: unknown }
  if (obj.current instanceof EventTarget) {
    el = obj.current
  } else if (obj.value instanceof EventTarget) {
    el = obj.value
  } else if (target instanceof EventTarget) {
    el = target
  }
  if (!el) return noop
  const targetElement = el
  targetElement.addEventListener(event, handler, options)
  return () => targetElement.removeEventListener(event, handler, options)
}
