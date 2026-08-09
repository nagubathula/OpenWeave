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
  event: K | (string & {}),
  handler: (e: any) => void,
  options?: AddEventListenerOptions
): () => void {
  if (!target) return () => {}
  // Resolve from .current (React ref) or .value (Vue-style ref adapter) or use directly
  let el: EventTarget | null = null
  if ('current' in (target as object) && (target as any).current instanceof EventTarget) {
    el = (target as any).current
  } else if ('value' in (target as object) && (target as any).value instanceof EventTarget) {
    el = (target as any).value
  } else if (target instanceof EventTarget) {
    el = target
  }
  if (!el) return () => {}
  el.addEventListener(event, handler, options)
  return () => el!.removeEventListener(event, handler, options)
}
