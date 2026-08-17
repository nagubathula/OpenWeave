import React, { createContext, useContext } from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import * as Popover from '@radix-ui/react-popover'
import {
  FilePlus,
  FolderOpen,
  ImageDown,
  Menu as MenuIcon,
  Redo2,
  Save,
  Share2,
  Undo2,
  ZoomIn
} from 'lucide-react'
import { tv } from 'tailwind-variants'
import { atom } from 'nanostores'
import { useStore } from '@nanostores/react'
import { useRouter } from 'next/navigation'

import { useEditorCommands, useI18n } from '@openweave/react'
import { colorToCSS } from '@openweave/core/color'

import { DEFAULT_COLLAB_STATE, useCollabInjected } from '@/app/collab/use'
import { useEditorState } from '@/app/editor/session/use-editor-state'
import { useEditorStore } from '@/app/editor/active-store'
import { toolIcons } from '@/app/editor/icons'
import { openFileDialog } from '@/app/shell/menu/use'

// Never-written fallbacks keep the store hooks unconditional when no collab
// session is provided.
const fallbackCollabState = atom(DEFAULT_COLLAB_STATE)
const fallbackCollabPeers = atom<never[]>([])
const fallbackFollowingPeer = atom<number | null>(null)
import { initials, toast } from '@/app/shell/ui'
import { getShareUrl } from '@/constants'
import Tip from '@/components/ui/Tip'
import type { ToolbarActionItem } from '@/components/toolbar/types'
import collaborationTheme from '@/theme/collaboration'

/**
 * Mobile heads-up display: floating chrome over the canvas on small viewports.
 * Ported from the Vue MobileHud family (MobileHud/MobileUndoRedo/
 * MobileActiveToolBadge/MobileActionToast/MobileShareButton/MobileFileMenu/
 * MobilePresencePopover + context.ts — `git show fe87645^:...` for originals).
 */

// --- HUD context -----------------------------------------------------------

function useMobileHudState() {
  const router = useRouter()
  const collab = useCollabInjected()
  const store = useEditorStore()
  const { dialogs, commands, menu } = useI18n()
  const { getCommand } = useEditorCommands()
  useEditorState((s) => s.activeTool, 'SELECT')
  useEditorState((s) => s.actionToast, null)

  const collabState = useStore(collab?.state ?? fallbackCollabState)
  const collabPeers = useStore(collab?.remotePeers ?? fallbackCollabPeers)
  const followingPeer = useStore(collab?.followingPeer ?? fallbackFollowingPeer)

  const menuItems: ToolbarActionItem[] = [
    {
      icon: FilePlus,
      label: menu.new,
      action: () => void import('@/app/tabs').then((m) => m.createTab())
    },
    { icon: FolderOpen, label: menu.open, action: () => void openFileDialog() },
    { icon: Save, label: menu.save, action: () => void store.saveFigFile() },
    { icon: ImageDown, label: menu.exportSelection, action: () => void store.exportSelection(1, 'png') },
    { icon: ZoomIn, label: commands.zoomToFit, action: () => getCommand('view.zoomFit').run() }
  ]

  const share = () => {
    if (!collab) return
    const roomId = collab.shareCurrentDoc()
    router.push(`/share?room=${roomId}`)
    void navigator.clipboard.writeText(getShareUrl(roomId))
    toast.info(dialogs.linkCopiedToClipboard)
  }

  const disconnect = () => {
    if (!collab) return
    collab.disconnect()
    router.push('/')
  }

  const toggleFollowPeer = (clientId: number) => {
    collab?.followPeer(followingPeer === clientId ? null : clientId)
  }

  return {
    store,
    dialogs,
    commands,
    collabState,
    collabPeers,
    followingPeer,
    onlineCount: collabPeers.length + 1,
    activeToolIcon: toolIcons[store.state.activeTool],
    activeTool: store.state.activeTool,
    actionToast: store.state.actionToast,
    menuItems,
    undo: () => getCommand('edit.undo').run(),
    redo: () => getCommand('edit.redo').run(),
    share,
    disconnect,
    toggleFollowPeer
  }
}

type MobileHudContextValue = ReturnType<typeof useMobileHudState>

const MobileHudContext = createContext<MobileHudContextValue | null>(null)

function useHud(): MobileHudContextValue {
  const ctx = useContext(MobileHudContext)
  if (!ctx) throw new Error('Mobile HUD controls must be used within MobileHud')
  return ctx
}

// --- HUD pieces ------------------------------------------------------------

const hudButtonClass =
  'flex size-8 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-panel/70 shadow-md backdrop-blur-xl select-none active:bg-hover'

function MobileUndoRedo() {
  const hud = useHud()
  return (
    <div className="flex gap-1.5">
      <Tip label={hud.commands.undo}>
        <button type="button" className={hudButtonClass} onClick={hud.undo}>
          <Undo2 className="size-3.5 text-surface" />
        </button>
      </Tip>
      <Tip label={hud.commands.redo}>
        <button type="button" className={hudButtonClass} onClick={hud.redo}>
          <Redo2 className="size-3.5 text-surface" />
        </button>
      </Tip>
    </div>
  )
}

function MobileActiveToolBadge() {
  const hud = useHud()
  const Icon = hud.activeToolIcon
  return (
    <div className="flex size-8 items-center justify-center rounded-full border border-accent/20 bg-panel/70 shadow-md backdrop-blur-xl transition-colors duration-200">
      <Icon key={hud.activeTool} className="size-3.5 text-accent" />
    </div>
  )
}

function MobileActionToast() {
  const hud = useHud()
  if (!hud.actionToast) return null
  return (
    <div
      key={hud.actionToast}
      className="animate-in fade-in flex h-8 items-center rounded-full border border-accent/20 bg-panel/70 px-3 shadow-md backdrop-blur-xl duration-150"
    >
      <span className="text-xs whitespace-nowrap text-accent">{hud.actionToast}</span>
    </div>
  )
}

function MobileShareButton() {
  const hud = useHud()
  return (
    <button
      type="button"
      className="flex h-8 cursor-pointer items-center gap-1.5 rounded-full border border-white/10 bg-panel/70 px-3 shadow-md backdrop-blur-xl select-none active:bg-hover"
      onClick={hud.share}
    >
      <Share2 className="size-3.5 text-surface" />
      <span className="text-xs text-surface">{hud.dialogs.share}</span>
    </button>
  )
}

function MobileFileMenu() {
  const hud = useHud()
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button type="button" className={hudButtonClass}>
          <MenuIcon className="size-3.5 text-surface" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          sideOffset={8}
          side="bottom"
          align="end"
          className="z-50 w-48 rounded-xl border border-border bg-panel p-1.5 shadow-xl"
        >
          {hud.menuItems.map((item) => {
            const Icon = item.icon
            return (
              <DropdownMenu.Item
                key={item.label}
                className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg border-none bg-transparent px-2.5 py-2 text-xs text-surface outline-none select-none data-[highlighted]:bg-hover active:bg-hover"
                onSelect={() => item.action()}
              >
                <Icon className="size-4 text-muted" />
                <span>{item.label}</span>
              </DropdownMenu.Item>
            )
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

const collaboration = tv(collaborationTheme)

function MobilePresencePopover() {
  const hud = useHud()
  const styles = collaboration({ size: 'md' })

  if (!hud.collabState.connected) return null

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button type="button" className={styles.presenceTrigger()}>
          <span className={styles.presenceDot()} />
          <span className="text-xs text-surface">
            {hud.dialogs.onlineCount({ count: String(hud.onlineCount) })}
          </span>
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          sideOffset={8}
          side="bottom"
          align="center"
          className={styles.presenceContent()}
        >
          <div className="mb-2 text-[11px] tracking-wider text-muted uppercase">{hud.dialogs.inThisRoom}</div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <div
                className={styles.avatar()}
                style={{ background: colorToCSS(hud.collabState.localColor) }}
              >
                {initials(hud.collabState.localName || hud.dialogs.you)}
              </div>
              <span className="min-w-0 flex-1 truncate text-xs text-surface">
                {hud.collabState.localName || hud.dialogs.you}
              </span>
              <span className="text-[10px] text-muted">{hud.dialogs.youSuffix}</span>
            </div>

            {hud.collabPeers.map((peer) => {
              const following = hud.followingPeer === peer.clientId
              const peerCls = collaboration({ size: 'md', following })
              return (
                <div
                  key={peer.clientId}
                  data-following={following || undefined}
                  className={styles.peerRow()}
                  onClick={() => hud.toggleFollowPeer(peer.clientId)}
                >
                  <div
                    className={`${peerCls.avatar()} ${styles.peerAvatar()}`}
                    style={{ background: colorToCSS(peer.color) }}
                  >
                    {initials(peer.name)}
                  </div>
                  <span className="min-w-0 flex-1 truncate text-xs text-surface">{peer.name}</span>
                  {following && <span className="text-[10px] text-accent">{hud.dialogs.followingBadge}</span>}
                </div>
              )
            })}
          </div>

          <button type="button" className={styles.disconnect()} onClick={hud.disconnect}>
            {hud.dialogs.disconnect}
          </button>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

// --- Root ------------------------------------------------------------------

export default function MobileHud() {
  const value = useMobileHudState()
  return (
    <MobileHudContext.Provider value={value}>
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start px-3 pt-3"
        onTouchStart={(event) => event.stopPropagation()}
      >
        <div className="pointer-events-auto flex flex-col items-start gap-1.5">
          <MobileUndoRedo />
          <MobileActiveToolBadge />
        </div>

        <div className="pointer-events-auto relative mx-auto flex flex-col items-center gap-1.5">
          <MobilePresencePopover />
          <MobileActionToast />
        </div>

        <div className="pointer-events-auto flex items-center gap-1.5">
          <MobileShareButton />
          <MobileFileMenu />
        </div>
      </div>
    </MobileHudContext.Provider>
  )
}
