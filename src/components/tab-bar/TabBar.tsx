import { useStore } from '@nanostores/react'
import { File as FileIcon, Home, Plus, Users, X } from 'lucide-react'
import React from 'react'
import { tv } from 'tailwind-variants'

import { sharedTabIds } from '@/app/collab/tabs'
import { getDesktopBridge } from '@/app/desktop/env'
import { closeHome, isHomeOpen, openHome } from '@/app/home/store'
import { allTabs, closeTab, createTab, openNewDesignTab, switchTab } from '@/app/tabs'
import { CloseTabConfirmDialog } from '@/components/tab-bar/CloseTabConfirmDialog'
import tabBarTheme from '@/theme/tab-bar'

const tabBar = tv(tabBarTheme)

function newDesign() {
  // From Home, reuse the blank startup document; from a document, open another.
  if (isHomeOpen.get()) {
    openNewDesignTab()
    return
  }
  createTab()
}

/**
 * Multi-document tab strip with Figma-style Home navigation. In the desktop
 * app it is always visible and acts as the window title bar.
 */
export default function TabBar() {
  const openTabs = useStore(allTabs)
  const homeActive = useStore(isHomeOpen)
  const sharedTabs = useStore(sharedTabIds)
  const desktop = getDesktopBridge()
  const chrome = desktop ? 'desktop' : 'browser'
  const platform = desktop?.platform === 'darwin' ? 'darwin' : 'other'

  if (!desktop && openTabs.length <= 1) return <CloseTabConfirmDialog />

  const ui = tabBar({ chrome, platform, homeActive })

  const onMiddleClick = (e: React.MouseEvent, tabId: string) => {
    if (e.button === 1) {
      e.preventDefault()
      closeTab(tabId)
    }
  }

  const onClose = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation()
    closeTab(tabId)
  }

  return (
    <>
      <div role="tablist" data-test-id="tabbar" data-chrome={chrome} className={ui.root()}>
        <div className={ui.list()}>
          <button
            type="button"
            role="tab"
            aria-selected={homeActive}
            aria-label="Home"
            data-test-id="tabbar-home"
            onClick={() => openHome()}
            className={ui.home()}
          >
            <Home className={ui.homeIcon()} />
            <span className={ui.homeLabel()}>Home</span>
          </button>

          {openTabs.map((tab) => {
            const active = !homeActive && tab.isActive
            const tabUI = tabBar({ chrome, platform, active })
            const shared = sharedTabs.has(tab.id)
            // A file in a collaboration room shows the people icon.
            const TabIcon = shared ? Users : FileIcon
            return (
              <div
                key={tab.id}
                role="tab"
                aria-selected={active}
                data-test-id="tabbar-tab"
                data-active={active || undefined}
                data-shared={shared || undefined}
                onClick={() => {
                  closeHome()
                  switchTab(tab.id)
                }}
                onMouseDown={(e) => onMiddleClick(e, tab.id)}
                className={tabUI.trigger()}
              >
                <TabIcon className={tabUI.icon()} />
                <span className={tabUI.label()}>{tab.name}</span>
                {shared && <span className="sr-only">(shared)</span>}
                <button
                  type="button"
                  data-test-id="tabbar-close"
                  data-active={active || undefined}
                  aria-label={`Close ${tab.name}`}
                  tabIndex={-1}
                  onClick={(e) => onClose(e, tab.id)}
                  className={tabUI.close()}
                >
                  <X className={tabUI.closeIcon()} />
                </button>
              </div>
            )
          })}
        </div>
        <button
          type="button"
          data-test-id="tabbar-new"
          aria-label="New design file"
          onClick={newDesign}
          className={ui.newAction()}
        >
          <Plus className={ui.newIcon()} />
        </button>
        <div aria-hidden className={ui.dragSpace()} />
      </div>
      <CloseTabConfirmDialog />
    </>
  )
}
