import { useSyncExternalStore } from 'react'

import { IS_BROWSER } from '@openweave/core/constants'

/** Matches vueuse's `useBreakpoints({ mobile: 768 }).smaller('mobile')`. */
const MOBILE_QUERY = '(max-width: 767.9px)'

function subscribe(callback: () => void) {
  const mediaQuery = window.matchMedia(MOBILE_QUERY)
  mediaQuery.addEventListener('change', callback)
  return () => mediaQuery.removeEventListener('change', callback)
}

function getIsMobileSnapshot() {
  return window.matchMedia(MOBILE_QUERY).matches
}

function getServerIsMobileSnapshot() {
  return false
}

/** Non-hook check for imperative call sites (render loops, factories). */
export function isMobileViewport(): boolean {
  return IS_BROWSER && window.matchMedia(MOBILE_QUERY).matches
}

/**
 * Returns coarse viewport kind flags used by responsive editor UI.
 * Re-renders the component when the viewport crosses the mobile breakpoint.
 */
export function useViewportKind() {
  const isMobile = useSyncExternalStore(subscribe, getIsMobileSnapshot, getServerIsMobileSnapshot)

  return {
    isMobile,
    isDesktop: !isMobile
  }
}
