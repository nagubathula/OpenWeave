import { useStore } from '@nanostores/react'
import * as Popover from '@radix-ui/react-popover'
import { Check, Copy, Globe, Share2, Users } from 'lucide-react'
import { atom } from 'nanostores'
import { useRouter } from 'next/navigation'
import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import { tv } from 'tailwind-variants'

import { colorToCSS } from '@openweave/core/color'
import { useI18n } from '@openweave/react'

import {
  getTunnelShareUrl,
  shareTunnelState,
  startShareTunnel,
  stopShareTunnel,
  syncShareTunnelStatus
} from '@/app/collab/tunnel'
import {
  DEFAULT_COLLAB_STATE,
  useCollabInjected,
  type CollabState,
  type RemotePeer
} from '@/app/collab/use'
import { initials, toast } from '@/app/shell/ui'
import { AppInput } from '@/components/ui/AppInput'
import { usePopoverUI } from '@/components/ui/popover'
import Tip from '@/components/ui/Tip'
import { getShareUrl, IS_TAURI } from '@/constants'
import collaborationTheme from '@/theme/collaboration'

/**
 * Collaboration (multiplayer) panel. Ported from the Vue CollabPanel family
 * (CollabPanel/CollabAvatarStack/CollabSharePopover/ConnectedRoom/
 * JoinRoomPrompt/ShareOrJoinRoom + context.ts — recover with
 * `git show fe87645^:src/components/collab-panel/<file>` if needed).
 *
 * The collab session itself is created by the shell (EditorLayout) and
 * provided via CollabProvider; this panel renders the avatar stack and the
 * share/join popover. Room ids travel as `/share?room=<id>` (query form —
 * static-export compatible), so pending rooms are read from the query string.
 */

// --- Panel context ---------------------------------------------------------

// Stable fallback stores so the `useStore` hooks stay unconditional while no
// collab session is provided (collab == null). Never written to.
const noCollabState = atom<CollabState>(DEFAULT_COLLAB_STATE)
const noCollabPeers = atom<RemotePeer[]>([])
const noCollabFollowing = atom<number | null>(null)

function extractRoomId(input: string): string {
  const trimmed = input.trim()
  const queryMatch = /[?&]room=([^&\s]+)/.exec(trimmed)
  if (queryMatch) return queryMatch[1]
  // Legacy path-style links: .../share/<roomId>
  return trimmed.replace(/.*\/share\//, '')
}

function useCollabPanelState() {
  const router = useRouter()
  const collab = useCollabInjected()
  const { dialogs } = useI18n()

  // Collab session stores drive React renders via useStore subscriptions.
  const state = useStore(collab?.state ?? noCollabState)
  const peers = useStore(collab?.remotePeers ?? noCollabPeers)
  const followingPeer = useStore(collab?.followingPeer ?? noCollabFollowing)
  const tunnel = useStore(shareTunnelState)

  const [joinInput, setJoinInput] = useState('')
  const [nameDraft, setNameDraft] = useState(collab?.state.get().localName ?? '')
  const [pendingRoomId, setPendingRoomId] = useState<string | null>(null)
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Pending room from the URL (?room=...): auto-open the join popover.
  useEffect(() => {
    const roomId = new URLSearchParams(window.location.search).get('room')
    setPendingRoomId(roomId)
    if (roomId && !collab?.state.get().connected) setPopoverOpen(true)
  }, [collab])

  useEffect(() => {
    return () => {
      if (copyTimer.current) clearTimeout(copyTimer.current)
    }
  }, [])

  // A tunnel started before a webview reload keeps running in the backend.
  useEffect(() => {
    if (IS_TAURI) void syncShareTunnelStatus()
  }, [])

  const shareUrl = state.roomId ? getShareUrl(state.roomId) : ''
  const tunnelShareUrl =
    tunnel.status === 'active' && state.roomId ? getTunnelShareUrl(tunnel.url, state.roomId) : ''
  const isJoining = !!pendingRoomId && !state.connected

  const copy = (text: string) => {
    void navigator.clipboard.writeText(text)
    setCopied(true)
    if (copyTimer.current) clearTimeout(copyTimer.current)
    copyTimer.current = setTimeout(() => setCopied(false), 2000)
  }

  const copyLink = () => {
    if (!shareUrl) return
    copy(shareUrl)
    toast.info(dialogs.linkCopiedToClipboard)
  }

  const copyTunnelLink = () => {
    if (!tunnelShareUrl) return
    copy(tunnelShareUrl)
    toast.info(dialogs.linkCopiedToClipboard)
  }

  const shareViaNgrok = async () => {
    const roomId = state.roomId
    const url = await startShareTunnel()
    if (url && roomId) {
      copy(getTunnelShareUrl(url, roomId))
      toast.info(dialogs.linkCopiedToClipboard)
    }
  }

  const stopNgrok = () => {
    void stopShareTunnel()
  }

  const share = () => {
    if (!collab || !nameDraft.trim()) return
    collab.setLocalName(nameDraft.trim())
    const roomId = collab.shareCurrentDoc()
    router.push(`/share?room=${roomId}`)
    copy(getShareUrl(roomId))
    toast.info(dialogs.linkCopiedToClipboard)
    setPopoverOpen(false)
  }

  const join = () => {
    if (!collab) return
    const roomId = pendingRoomId || extractRoomId(joinInput)
    if (!roomId || !nameDraft.trim()) return
    collab.setLocalName(nameDraft.trim())
    collab.connect(roomId)
    router.push(`/share?room=${roomId}`)
    setPopoverOpen(false)
  }

  const disconnect = () => {
    if (!collab) return
    collab.disconnect()
    void stopShareTunnel()
    setPopoverOpen(false)
    router.push('/')
  }

  const toggleFollowPeer = (clientId: number) => {
    collab?.followPeer(followingPeer === clientId ? null : clientId)
  }

  return {
    dialogs,
    copied,
    joinInput,
    setJoinInput,
    nameDraft,
    setNameDraft,
    popoverOpen,
    setPopoverOpen,
    state,
    peers,
    followingPeer,
    shareUrl,
    tunnel,
    tunnelShareUrl,
    isJoining,
    copyLink,
    copyTunnelLink,
    shareViaNgrok,
    stopNgrok,
    share,
    join,
    disconnect,
    toggleFollowPeer
  }
}

type CollabPanelContextValue = ReturnType<typeof useCollabPanelState>

const CollabPanelContext = createContext<CollabPanelContextValue | null>(null)

function usePanel(): CollabPanelContextValue {
  const ctx = useContext(CollabPanelContext)
  if (!ctx) throw new Error('Collab panel controls must be used within CollabPanel')
  return ctx
}

// --- Avatar stack ----------------------------------------------------------

const collaboration = tv(collaborationTheme)

function CollabAvatarStack() {
  const collab = usePanel()
  const avatar = collaboration({ size: 'sm', bordered: true })

  return (
    <div className="flex -space-x-1.5">
      <Tip label={`${collab.state.localName || collab.dialogs.you} (${collab.dialogs.youSuffix})`}>
        <div
          data-test-id="collab-local-avatar"
          className={avatar.avatar()}
          style={{ background: colorToCSS(collab.state.localColor) }}
        >
          {initials(collab.state.localName || collab.dialogs.you)}
        </div>
      </Tip>

      {collab.peers.map((peer) => {
        const following = collab.followingPeer === peer.clientId
        const peerCls = collaboration({ size: 'sm', bordered: true, following })
        return (
          <Tip
            key={peer.clientId}
            label={
              following
                ? collab.dialogs.followingPeerStop({ name: peer.name })
                : collab.dialogs.clickToFollowPeer({ name: peer.name })
            }
          >
            <div
              data-test-id="collab-peer-avatar"
              data-following={following || undefined}
              className={`${peerCls.avatar()} ${peerCls.peerAvatar()}`}
              style={{ background: colorToCSS(peer.color) }}
              onClick={() => collab.toggleFollowPeer(peer.clientId)}
            >
              {initials(peer.name)}
            </div>
          </Tip>
        )
      })}
    </div>
  )
}

// --- Popover bodies --------------------------------------------------------

function NgrokShareSection() {
  const collab = usePanel()
  if (!IS_TAURI) return null

  if (collab.tunnel.status === 'active' && collab.tunnelShareUrl) {
    return (
      <>
        <div className="mb-1 text-xs font-medium text-surface">
          {collab.dialogs.ngrokPublicLink}
        </div>
        <div className="mb-1 flex items-center gap-1.5">
          <AppInput
            value={collab.tunnelShareUrl}
            readOnly
            data-test-id="collab-ngrok-link"
            className="min-w-0 flex-1"
            onFocus={(event) => event.currentTarget.select()}
          />
          <button
            type="button"
            data-test-id="collab-ngrok-copy-link"
            className="flex h-7 cursor-pointer items-center gap-1 rounded border-none bg-accent px-2 text-xs text-white hover:bg-accent/90"
            onClick={collab.copyTunnelLink}
          >
            <Copy className="size-3" />
            {collab.dialogs.copy}
          </button>
        </div>
        <button
          type="button"
          data-test-id="collab-ngrok-stop"
          className="mb-3 cursor-pointer border-none bg-transparent p-0 text-[11px] text-muted hover:text-surface"
          onClick={collab.stopNgrok}
        >
          {collab.dialogs.ngrokStopTunnel}
        </button>
      </>
    )
  }

  return (
    <>
      <button
        type="button"
        data-test-id="collab-ngrok-share"
        className="mb-1 flex h-7 w-full cursor-pointer items-center justify-center gap-1.5 rounded border border-border bg-transparent text-xs text-surface hover:bg-hover disabled:opacity-50"
        disabled={collab.tunnel.status === 'starting'}
        onClick={() => void collab.shareViaNgrok()}
      >
        <Globe className="size-3.5" />
        {collab.tunnel.status === 'starting'
          ? collab.dialogs.ngrokStarting
          : collab.dialogs.shareViaNgrok}
      </button>
      {collab.tunnel.status === 'error' ? (
        <div className="mb-3 text-[11px] text-muted" data-test-id="collab-ngrok-error">
          <div className="text-red-500">
            {collab.dialogs.ngrokFailed({ error: collab.tunnel.error })}
          </div>
          {collab.dialogs.ngrokSetupHint}
        </div>
      ) : (
        <div className="mb-3 text-[11px] text-muted">{collab.dialogs.ngrokHint}</div>
      )}
    </>
  )
}

function ConnectedRoom() {
  const collab = usePanel()
  return (
    <>
      <div className="mb-3 text-xs font-medium text-surface">{collab.dialogs.roomLink}</div>
      <div className="mb-3 flex items-center gap-1.5">
        <AppInput
          value={collab.shareUrl}
          readOnly
          data-test-id="collab-room-link"
          className="min-w-0 flex-1"
          onFocus={(event) => event.currentTarget.select()}
        />
        <button
          type="button"
          data-test-id="collab-copy-link"
          className="flex h-7 cursor-pointer items-center gap-1 rounded border-none bg-accent px-2 text-xs text-white hover:bg-accent/90"
          onClick={collab.copyLink}
        >
          {collab.copied ? <Check className="size-3" /> : <Copy className="size-3" />}
          {collab.copied ? collab.dialogs.copied : collab.dialogs.copy}
        </button>
      </div>

      <NgrokShareSection />

      <div className="mb-2 text-xs font-medium text-surface">
        {collab.peers.length === 0
          ? collab.dialogs.roomOccupantSingular
          : collab.dialogs.roomOccupantsPlural({ count: String(collab.peers.length + 1) })}
      </div>

      <button
        type="button"
        data-test-id="collab-disconnect"
        className="flex h-7 w-full cursor-pointer items-center justify-center rounded border border-border bg-transparent text-xs text-muted hover:bg-hover hover:text-surface"
        onClick={collab.disconnect}
      >
        {collab.dialogs.disconnect}
      </button>
    </>
  )
}

function JoinRoomPrompt() {
  const collab = usePanel()
  return (
    <>
      <div className="mb-1 text-xs font-medium text-surface">
        {collab.dialogs.joinCollaboration}
      </div>
      <div className="mb-3 text-[11px] text-muted">{collab.dialogs.someoneSharedFileJoin}</div>

      <div className="mb-3">
        <label className="mb-1 block text-xs text-muted">{collab.dialogs.yourName}</label>
        <AppInput
          value={collab.nameDraft}
          data-test-id="collab-name-input"
          placeholder={collab.dialogs.enterYourName}
          autoFocus
          onChange={(event) => collab.setNameDraft(event.target.value)}
          onEnter={collab.join}
        />
      </div>

      <button
        type="button"
        data-test-id="collab-join-button"
        className="flex h-8 w-full cursor-pointer items-center justify-center gap-1.5 rounded border-none bg-accent text-xs font-medium text-white hover:bg-accent/90 disabled:opacity-50"
        disabled={!collab.nameDraft.trim()}
        onClick={collab.join}
      >
        <Users className="size-3.5" />
        {collab.dialogs.joinRoom}
      </button>
    </>
  )
}

function ShareOrJoinRoom() {
  const collab = usePanel()
  return (
    <>
      <div className="mb-3">
        <label className="mb-1 block text-xs text-muted">{collab.dialogs.yourName}</label>
        <AppInput
          value={collab.nameDraft}
          data-test-id="collab-name-input"
          placeholder={collab.dialogs.enterYourName}
          onChange={(event) => collab.setNameDraft(event.target.value)}
          onEnter={collab.share}
        />
      </div>

      <button
        type="button"
        data-test-id="collab-share-file"
        className="mb-3 flex h-8 w-full cursor-pointer items-center justify-center gap-1.5 rounded border-none bg-accent text-xs font-medium text-white hover:bg-accent/90 disabled:opacity-50"
        disabled={!collab.nameDraft.trim()}
        onClick={collab.share}
      >
        <Share2 className="size-3.5" />
        {collab.dialogs.shareThisFile}
      </button>

      <div className="mb-2 flex items-center gap-2">
        <div className="h-px flex-1 bg-border" />
        <span className="text-[11px] text-muted">{collab.dialogs.orJoinRoom}</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <div className="flex items-center gap-1.5">
        <AppInput
          value={collab.joinInput}
          data-test-id="collab-join-input"
          placeholder={collab.dialogs.pasteRoomLinkOrId}
          className="min-w-0 flex-1"
          onChange={(event) => collab.setJoinInput(event.target.value)}
          onEnter={collab.join}
        />
        <button
          type="button"
          data-test-id="collab-join-room-button"
          className="flex h-7 cursor-pointer items-center rounded border-none bg-accent px-3 text-xs text-white hover:bg-accent/90 disabled:opacity-50"
          disabled={!collab.joinInput.trim() || !collab.nameDraft.trim()}
          onClick={collab.join}
        >
          {collab.dialogs.join}
        </button>
      </div>
    </>
  )
}

// --- Share popover + panel root -------------------------------------------

function CollabSharePopover() {
  const collab = usePanel()
  const cls = usePopoverUI({ content: 'z-50 w-72 p-3' })
  const connection = collab.state.connected ? 'connected' : collab.isJoining ? 'joining' : 'idle'
  const styles = collaboration({ connection })

  return (
    <Popover.Root open={collab.popoverOpen} onOpenChange={collab.setPopoverOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          data-test-id="collab-share-button"
          data-connection={connection}
          className={styles.shareButton()}
        >
          <Share2 className="size-3.5" />
          {collab.state.connected
            ? collab.dialogs.connected
            : collab.isJoining
              ? collab.dialogs.joinRoom
              : collab.dialogs.share}
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          data-test-id="collab-popover"
          className={cls.content}
          sideOffset={8}
          side="bottom"
          align="end"
        >
          {collab.state.connected ? (
            <ConnectedRoom />
          ) : collab.isJoining ? (
            <JoinRoomPrompt />
          ) : (
            <ShareOrJoinRoom />
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

export default function CollabPanel() {
  const value = useCollabPanelState()
  return (
    <CollabPanelContext.Provider value={value}>
      <div className="flex w-full items-center justify-end gap-2">
        <CollabAvatarStack />
        <div className="flex-1" />
        <CollabSharePopover />
      </div>
    </CollabPanelContext.Provider>
  )
}
