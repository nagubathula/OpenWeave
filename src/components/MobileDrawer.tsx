import React, { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import * as Tabs from '@radix-ui/react-tabs'
import { Code, Layers, Sliders, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'
import type { PanInfo } from 'framer-motion'
import { watch } from 'vue'

import ChatPanel from '@/components/chat/ChatPanel'
import CodePanel from '@/components/properties/CodePanel'
import DesignPanel from '@/components/properties/DesignPanel'
import LayerTree from '@/components/layer-tree/LayerTree'
import PagesPanel from '@/components/PagesPanel'
import {
  DRAWER_SPRING_DAMPING,
  DRAWER_SPRING_STIFFNESS,
  HALF_FRAC,
  HUD_TOP,
  SWIPE_THRESHOLD,
  SWIPE_VELOCITY_THRESHOLD
} from '@/constants'
import { useEditorStore } from '@/app/editor/active-store'

type Snap = 'closed' | 'half' | 'full'
type DrawerTab = 'layers' | 'design' | 'code' | 'ai'

/**
 * Mobile bottom drawer hosting the layers/design/code/AI panels. Ported from
 * src/components/MobileDrawer.vue (`git show fe87645^:...` for the original):
 * a framer-motion sheet with drag-to-snap (closed → half → full), snap state
 * shared through `store.state.mobileDrawerSnap`.
 */
export default function MobileDrawer() {
  const store = useEditorStore()
  const [, force] = useReducer((n: number): number => n + 1, 0)

  const headerRef = useRef<HTMLElement | null>(null)
  const [headerH, setHeaderH] = useState(56)
  const [windowH, setWindowH] = useState(() =>
    typeof window === 'undefined' ? 800 : window.innerHeight
  )

  // Bridge the Vue-reactive snap/tab state into React renders.
  useEffect(() => {
    const stop = watch(
      () => [
        store.state.mobileDrawerSnap,
        store.state.activeRibbonTab,
        store.state.panelMode
      ],
      () => force()
    )
    return stop
  }, [store])

  useEffect(() => {
    const onResize = () => setWindowH(window.innerHeight)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    const node = headerRef.current
    if (!node) return
    const observer = new ResizeObserver(() => {
      setHeaderH(node.getBoundingClientRect().height || 56)
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const snap = store.state.mobileDrawerSnap
  const setSnap = (value: Snap) => {
    store.state.mobileDrawerSnap = value
  }

  const snapHeight = useCallback(
    (s: Snap): number => {
      switch (s) {
        case 'full':
          return windowH - HUD_TOP
        case 'half':
          return Math.round(windowH * HALF_FRAC)
        default:
          return headerH
      }
    },
    [windowH, headerH]
  )

  const [targetHeight, setTargetHeight] = useState(() => snapHeight('closed'))

  // Re-align the sheet whenever the snap point or viewport metrics change.
  useEffect(() => {
    setTargetHeight(snapHeight(snap))
  }, [snap, snapHeight])

  const getDrawerTab = (): DrawerTab => {
    if (store.state.activeRibbonTab === 'code') return 'code'
    if (store.state.activeRibbonTab === 'ai') return 'ai'
    return store.state.panelMode === 'design' ? 'design' : 'layers'
  }

  const setDrawerTab = (tab: DrawerTab) => {
    if (tab === 'code' || tab === 'ai') {
      store.state.activeRibbonTab = tab
      return
    }
    store.state.activeRibbonTab = 'panels'
    store.state.panelMode = tab
  }

  const isOpen = snap !== 'closed'

  const toggleTab = (tab: DrawerTab) => {
    if (getDrawerTab() === tab && isOpen) {
      setSnap('closed')
      setTargetHeight(snapHeight('closed'))
      return
    }
    setDrawerTab(tab)
    if (!isOpen) {
      setSnap('half')
      setTargetHeight(snapHeight('half'))
    }
  }

  const onPan = (_e: PointerEvent, info: PanInfo) => {
    const maxHeight = snapHeight('full')
    const raw = snapHeight(snap) - info.offset.y
    setTargetHeight(Math.max(headerH, Math.min(maxHeight, raw)))
  }

  const onPanEnd = (_e: PointerEvent, info: PanInfo) => {
    const isSwipeUp =
      info.offset.y < -SWIPE_THRESHOLD || info.velocity.y < -SWIPE_VELOCITY_THRESHOLD
    const isSwipeDown =
      info.offset.y > SWIPE_THRESHOLD || info.velocity.y > SWIPE_VELOCITY_THRESHOLD

    let next: Snap = snap
    if (isSwipeUp) next = snap === 'closed' ? 'half' : 'full'
    else if (isSwipeDown) next = snap === 'full' ? 'half' : 'closed'

    setSnap(next)
    setTargetHeight(snapHeight(next))
  }

  const tabTriggerClass =
    'flex h-full cursor-pointer items-center justify-center gap-1.5 px-4 text-xs transition-colors outline-none select-none data-[state=active]:text-accent'

  return (
    <motion.div
      data-test-id="mobile-drawer"
      className="fixed inset-x-0 bottom-0 z-30 flex touch-none flex-col rounded-t-3xl bg-panel pb-[env(safe-area-inset-bottom)] shadow-[0_-2px_10px_rgba(0,0,0,0.3)]"
      animate={{ height: `${targetHeight}px` }}
      transition={{
        type: 'spring',
        stiffness: DRAWER_SPRING_STIFFNESS,
        damping: DRAWER_SPRING_DAMPING
      }}
      onPan={onPan}
      onPanEnd={onPanEnd}
    >
      <Tabs.Root value={getDrawerTab()} className="flex min-h-0 flex-1 flex-col">
        <nav ref={headerRef} aria-label="Mobile panel navigation" className="flex shrink-0 flex-col">
          <div className="flex w-full justify-center pt-2">
            <div className="h-1 w-8 rounded-full bg-muted/40" />
          </div>
          <Tabs.List className="flex w-full items-center px-2 py-2">
            <Tabs.Trigger
              data-test-id="mobile-ribbon-layers"
              value="layers"
              className={tabTriggerClass}
              onClick={() => toggleTab('layers')}
            >
              <Layers className="size-4" />
            </Tabs.Trigger>

            <Tabs.Trigger
              data-test-id="mobile-ribbon-design"
              value="design"
              className={tabTriggerClass}
              onClick={() => toggleTab('design')}
            >
              <Sliders className="size-4" />
            </Tabs.Trigger>

            <div className="flex-1" />

            <Tabs.Trigger
              data-test-id="mobile-ribbon-code"
              value="code"
              className={tabTriggerClass}
              onClick={() => toggleTab('code')}
            >
              <Code className="size-4" />
            </Tabs.Trigger>

            <Tabs.Trigger
              data-test-id="mobile-ribbon-ai"
              value="ai"
              className={tabTriggerClass}
              onClick={() => toggleTab('ai')}
            >
              <Sparkles className="size-4" />
            </Tabs.Trigger>
          </Tabs.List>
        </nav>

        <div data-test-id="mobile-drawer-content" className="min-h-0 flex-1 overflow-y-auto">
          <Tabs.Content value="layers" className="mt-0 h-full">
            <div data-test-id="mobile-drawer-layers" className="flex h-full flex-col">
              <PagesPanel />
              <div className="border-t border-border" />
              <header className="shrink-0 px-3 py-2 text-[11px] tracking-wider text-muted uppercase">
                Layers
              </header>
              <LayerTree />
            </div>
          </Tabs.Content>

          <Tabs.Content value="design" className="mt-0 h-full">
            <div data-test-id="mobile-drawer-design" className="flex h-full flex-col">
              <DesignPanel />
            </div>
          </Tabs.Content>

          <Tabs.Content value="code" className="mt-0 h-full">
            <div data-test-id="mobile-drawer-code" className="flex h-full flex-col">
              <CodePanel />
            </div>
          </Tabs.Content>

          <Tabs.Content value="ai" className="mt-0 h-full">
            <div data-test-id="mobile-drawer-ai" className="flex h-full flex-col">
              <ChatPanel />
            </div>
          </Tabs.Content>
        </div>
      </Tabs.Root>
    </motion.div>
  )
}
