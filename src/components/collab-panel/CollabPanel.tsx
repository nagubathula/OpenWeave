import { useStore } from '@nanostores/react'
import * as Popover from '@radix-ui/react-popover'
import { Check, Copy, Globe, Lock, Share2, Users } from 'lucide-react'
import { atom } from 'nanostores'
import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import { tv } from 'tailwind-variants'

import { colorToCSS } from '@openweave/core/color'
import { useI18n } from '@openweave/react'

import {
  getTunnelShareUrl,
  setCustomTunnelUrl,
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
import {
  AppDialogBody,
  AppDialogFooter,
  AppDialogHeader,
  AppDialogRoot
} from '@/components/ui/dialog'
import { usePopoverUI } from '@/components/ui/popover'
import Tip from '@/components/ui/Tip'
import { getShareUrl } from '@/constants'
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
  const collab = useCollabInjected()
  const { dialogs } = useI18n()

  // Collab session stores drive React renders via useStore subscriptions.
  const state = useStore(collab?.state ?? noCollabState)
  const peers = useStore(collab?.remotePeers ?? noCollabPeers)
  const followingPeer = useStore(collab?.followingPeer ?? noCollabFollowing)
  const tunnel = useStore(shareTunnelState)

  const [joinInput, setJoinInput] = useState('')
  const [nameDraft, setNameDraft] = useState(collab?.state.get().localName ?? '')
  const [passwordDraft, setPasswordDraft] = useState('')
  const [joinPassword, setJoinPassword] = useState('')
  const [isRoomPasswordProtected, setIsRoomPasswordProtected] = useState(false)
  const [pendingRoomId, setPendingRoomId] = useState<string | null>(null)
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [joinDialogOpen, setJoinDialogOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Pending room from the URL (?room=...): auto-open the join dialog.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const roomId = params.get('room')
    const hasPwd = params.has('pwd') || params.get('protected') === '1'
    setPendingRoomId(roomId)
    setIsRoomPasswordProtected(hasPwd)
    if (roomId && !collab?.state.get().connected) setJoinDialogOpen(true)
  }, [collab])

  useEffect(() => {
    if (state.localName && !nameDraft) {
      setNameDraft(state.localName)
    }
  }, [state.localName, nameDraft])

  useEffect(() => {
    return () => {
      if (copyTimer.current) clearTimeout(copyTimer.current)
    }
  }, [])

  // A tunnel started before a webview reload keeps running in the backend.
  useEffect(() => {
    void syncShareTunnelStatus()
  }, [])

  const isProtected = state.isProtected ?? Boolean(passwordDraft.trim())
  const shareUrl = state.roomId ? getShareUrl(state.roomId, isProtected) : ''
  const tunnelShareUrl =
    tunnel.status === 'active' && state.roomId
      ? getTunnelShareUrl(tunnel.url, state.roomId, isProtected)
      : ''
  const isJoining = Boolean(pendingRoomId) && !state.connected

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
    toast.info('Public ngrok link copied to clipboard!')
  }

  const shareViaNgrok = async () => {
    const roomId = state.roomId
    const url = await startShareTunnel()
    if (url && roomId) {
      copy(getTunnelShareUrl(url, roomId, isProtected))
      toast.info('Public ngrok link copied to clipboard!')
    }
  }

  const stopNgrok = () => {
    void stopShareTunnel()
  }

  const share = () => {
    if (!collab || !nameDraft.trim()) return
    collab.setLocalName(nameDraft.trim())
    const pwd = passwordDraft.trim() || undefined
    const roomId = collab.shareCurrentDoc(pwd)
    const localUrl = getShareUrl(roomId, Boolean(pwd))
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', localUrl)
    }
    const activeTunnel = tunnel.status === 'active' ? tunnel.url : null
    if (activeTunnel) {
      const publicUrl = getTunnelShareUrl(activeTunnel, roomId, Boolean(pwd))
      copy(publicUrl)
      toast.info('Public ngrok link copied to clipboard!')
    } else {
      copy(localUrl)
      toast.info(dialogs.linkCopiedToClipboard)
    }
  }

  // Shares the doc and tunnels it through ngrok in one step.
  const shareAndTunnel = async () => {
    if (!collab || !nameDraft.trim()) return
    collab.setLocalName(nameDraft.trim())
    const pwd = passwordDraft.trim() || undefined
    const roomId = collab.shareCurrentDoc(pwd)
    const localUrl = getShareUrl(roomId, Boolean(pwd))
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', localUrl)
    }
    const url = await startShareTunnel()
    if (url) {
      copy(getTunnelShareUrl(url, roomId, Boolean(pwd)))
      toast.info('Public ngrok link copied to clipboard!')
    } else {
      copy(localUrl)
      toast.info(dialogs.linkCopiedToClipboard)
    }
  }

  const joinRoom = () => {
    if (!collab) return
    const roomId = pendingRoomId || extractRoomId(joinInput)
    if (!roomId || !nameDraft.trim()) return
    collab.setLocalName(nameDraft.trim())
    const pwd = joinPassword.trim() || undefined
    collab.connect(roomId, pwd)
    const url = getShareUrl(roomId, Boolean(pwd || isRoomPasswordProtected))
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', url)
    }
    setPopoverOpen(false)
    setJoinDialogOpen(false)
  }

  const disconnect = () => {
    if (!collab) return
    collab.disconnect()
    void stopShareTunnel()
    setPasswordDraft('')
    setJoinPassword('')
    setIsRoomPasswordProtected(false)
    setPopoverOpen(false)
    setJoinDialogOpen(false)
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', '/')
    }
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
    passwordDraft,
    setPasswordDraft,
    joinPassword,
    setJoinPassword,
    isRoomPasswordProtected,
    setIsRoomPasswordProtected,
    popoverOpen,
    setPopoverOpen,
    joinDialogOpen,
    setJoinDialogOpen,
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
    setCustomTunnelUrl,
    share,
    shareAndTunnel,
    join: joinRoom,
    joinRoom,
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
  const [customInput, setCustomInput] = useState('')
  const [showCustomInput, setShowCustomInput] = useState(false)

  return (
    <div className="mb-3 rounded border border-dashed border-border p-2">
      <div className="mb-1.5 flex items-center justify-between text-[11px] font-medium text-surface">
        <span className="flex items-center gap-1">
          <Globe className="size-3 text-muted" />
          <span>Public Sharing (ngrok)</span>
        </span>
      </div>
      <button
        type="button"
        data-test-id="collab-ngrok-share"
        className="mb-1.5 flex h-7 w-full cursor-pointer items-center justify-center gap-1.5 rounded border border-border bg-transparent text-xs text-surface hover:bg-hover disabled:opacity-50"
        disabled={collab.tunnel.status === 'starting'}
        onClick={() => void collab.shareViaNgrok()}
      >
        <Globe className="size-3.5" />
        {collab.tunnel.status === 'starting'
          ? collab.dialogs.ngrokStarting
          : 'Detect or Start Tunnel'}
      </button>

      {collab.tunnel.status === 'error' && (
        <div className="mb-2 text-[10px] text-red-400" data-test-id="collab-ngrok-error">
          {collab.tunnel.error}
        </div>
      )}

      {showCustomInput ? (
        <div className="mt-1 flex items-center gap-1">
          <AppInput
            placeholder="https://xyz.ngrok-free.dev"
            value={customInput}
            className="min-w-0 flex-1 text-xs"
            onChange={(e) => setCustomInput(e.target.value)}
          />
          <button
            type="button"
            className="h-7 cursor-pointer rounded bg-accent px-2 text-xs text-white"
            onClick={() => {
              if (customInput.trim()) {
                collab.setCustomTunnelUrl(customInput)
                setShowCustomInput(false)
              }
            }}
          >
            Set
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="cursor-pointer border-none bg-transparent p-0 text-[10px] text-accent underline hover:opacity-80"
          onClick={() => {
            setShowCustomInput(true)
            setCustomInput('https://smoked-puritan-swarm.ngrok-free.dev')
          }}
        >
          Or enter public ngrok URL manually
        </button>
      )}
    </div>
  )
}

function ConnectedRoom() {
  const collab = usePanel()
  const [showLocal, setShowLocal] = useState(false)
  const isTunnelActive = collab.tunnel.status === 'active' && Boolean(collab.tunnelShareUrl)

  return (
    <>
      {isTunnelActive ? (
        <>
          <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-surface">
            <span className="flex items-center gap-1.5 font-semibold text-accent">
              <Globe className="size-3.5" />
              <span>Public Link (ngrok)</span>
            </span>
            {collab.state.isProtected && (
              <span className="flex items-center gap-1 rounded bg-accent/20 px-1.5 py-0.5 text-[10px] font-medium text-accent">
                <Lock className="size-2.5" />
                Protected
              </span>
            )}
          </div>
          <div className="mb-2 flex items-center gap-1.5">
            <AppInput
              value={collab.tunnelShareUrl}
              readOnly
              data-test-id="collab-ngrok-link"
              className="min-w-0 flex-1 text-xs"
              onFocus={(event) => event.currentTarget.select()}
            />
            <button
              type="button"
              data-test-id="collab-copy-link"
              className="flex h-7 cursor-pointer items-center gap-1 rounded border-none bg-accent px-2 text-xs font-medium text-white hover:bg-accent/90"
              onClick={collab.copyTunnelLink}
            >
              {collab.copied ? <Check className="size-3" /> : <Copy className="size-3" />}
              {collab.copied ? collab.dialogs.copied : collab.dialogs.copy}
            </button>
          </div>

          <div className="mb-3 flex items-center justify-between text-[11px] text-muted">
            <button
              type="button"
              className="cursor-pointer border-none bg-transparent p-0 text-[11px] text-muted underline hover:text-surface"
              onClick={() => setShowLocal(!showLocal)}
            >
              {showLocal ? 'Hide local URL' : 'Show local URL (127.0.0.1)'}
            </button>
            <button
              type="button"
              data-test-id="collab-ngrok-stop"
              className="cursor-pointer border-none bg-transparent p-0 text-[11px] text-red-400 hover:text-red-300"
              onClick={collab.stopNgrok}
            >
              Stop ngrok
            </button>
          </div>

          {showLocal && (
            <div className="mb-3 rounded border border-border bg-subtle p-2">
              <div className="mb-1 text-[11px] font-medium text-muted">Local Link</div>
              <div className="flex items-center gap-1.5">
                <AppInput
                  value={collab.shareUrl}
                  readOnly
                  data-test-id="collab-room-link"
                  className="min-w-0 flex-1 text-xs"
                  onFocus={(event) => event.currentTarget.select()}
                />
                <button
                  type="button"
                  data-test-id="collab-copy-local-link"
                  className="flex h-7 cursor-pointer items-center gap-1 rounded border border-border bg-transparent px-2 text-xs text-surface hover:bg-hover"
                  onClick={collab.copyLink}
                >
                  <Copy className="size-3" />
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-surface">
            <span>{collab.dialogs.roomLink} (Local)</span>
            {collab.state.isProtected && (
              <span className="flex items-center gap-1 rounded bg-accent/20 px-1.5 py-0.5 text-[10px] font-medium text-accent">
                <Lock className="size-2.5" />
                Protected
              </span>
            )}
          </div>
          <div className="mb-2 flex items-center gap-1.5">
            <AppInput
              value={collab.shareUrl}
              readOnly
              data-test-id="collab-room-link"
              className="min-w-0 flex-1 text-xs"
              onFocus={(event) => event.currentTarget.select()}
            />
            <button
              type="button"
              data-test-id="collab-copy-link"
              className="flex h-7 cursor-pointer items-center gap-1 rounded border-none bg-accent px-2 text-xs font-medium text-white hover:bg-accent/90"
              onClick={collab.copyLink}
            >
              {collab.copied ? <Check className="size-3" /> : <Copy className="size-3" />}
              {collab.copied ? collab.dialogs.copied : collab.dialogs.copy}
            </button>
          </div>

          <NgrokShareSection />
        </>
      )}

      <div className="mb-2.5 flex items-center justify-between text-xs text-muted">
        <span>Occupants</span>
        <span className="font-medium text-surface">
          {collab.peers.length === 0 ? 'Just you' : `${collab.peers.length + 1} connected`}
        </span>
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

function ShareOrJoinRoom() {
  const collab = usePanel()
  const isTunnelActive = collab.tunnel.status === 'active'

  return (
    <>
      <div className="mb-2.5">
        <label className="mb-1 block text-xs text-muted">{collab.dialogs.yourName}</label>
        <AppInput
          value={collab.nameDraft}
          data-test-id="collab-name-input"
          placeholder={collab.dialogs.enterYourName}
          onChange={(event) => collab.setNameDraft(event.target.value)}
          onEnter={() => void collab.share()}
        />
      </div>

      <div className="mb-3">
        <label className="mb-1 flex items-center gap-1 text-xs text-muted">
          <Lock className="size-3" />
          Password (optional)
        </label>
        <AppInput
          type="password"
          value={collab.passwordDraft}
          data-test-id="collab-password-input"
          placeholder="Leave blank for open access"
          onChange={(event) => collab.setPasswordDraft(event.target.value)}
          onEnter={() => void collab.share()}
        />
      </div>

      <button
        type="button"
        data-test-id="collab-share-file"
        className="mb-2 flex h-8 w-full cursor-pointer items-center justify-center gap-1.5 rounded border-none bg-accent text-xs font-medium text-white hover:bg-accent/90 disabled:opacity-50"
        disabled={!collab.nameDraft.trim() || collab.tunnel.status === 'starting'}
        onClick={() => void (isTunnelActive ? collab.share() : collab.shareAndTunnel())}
      >
        <Globe className="size-3.5" />
        {isTunnelActive ? 'Share with Public ngrok Link' : 'Share via ngrok tunnel'}
      </button>

      <button
        type="button"
        data-test-id="collab-share-local"
        className="mb-3 flex h-7 w-full cursor-pointer items-center justify-center gap-1.5 rounded border border-border bg-transparent text-xs text-muted hover:bg-hover hover:text-surface disabled:opacity-50"
        disabled={!collab.nameDraft.trim()}
        onClick={() => void collab.share()}
      >
        <Share2 className="size-3" />
        Share locally only
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
          className="min-w-0 flex-1 text-xs"
          onChange={(event) => {
            const val = event.target.value
            collab.setJoinInput(val)
            if (val.includes('pwd=') || val.includes('protected=')) {
              collab.setIsRoomPasswordProtected(true)
            }
          }}
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

      {collab.isRoomPasswordProtected && (
        <div className="mt-2">
          <AppInput
            type="password"
            value={collab.joinPassword}
            data-test-id="collab-manual-password-input"
            placeholder="Room password"
            className="w-full text-xs"
            onChange={(event) => collab.setJoinPassword(event.target.value)}
            onEnter={collab.join}
          />
        </div>
      )}
    </>
  )
}

// --- Share popover + panel root -------------------------------------------

function CollabSharePopover() {
  const collab = usePanel()
  const cls = usePopoverUI({ content: 'z-50 w-80 p-3' })
  const connection = collab.state.connected ? 'connected' : collab.isJoining ? 'joining' : 'idle'
  const styles = collaboration({ connection })

  if (collab.isJoining) {
    return (
      <button
        type="button"
        data-test-id="collab-share-button"
        data-connection={connection}
        className={styles.shareButton()}
        onClick={() => collab.setJoinDialogOpen(true)}
      >
        <Share2 className="size-3.5" />
        {collab.dialogs.joinRoom}
      </button>
    )
  }

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
          {collab.state.connected ? collab.dialogs.connected : collab.dialogs.share}
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
          {collab.state.connected ? <ConnectedRoom /> : <ShareOrJoinRoom />}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

function JoinRoomDialog() {
  const collab = usePanel()

  return (
    <AppDialogRoot
      open={collab.joinDialogOpen}
      onOpenChange={collab.setJoinDialogOpen}
      size="sm"
      ui={{ overlay: 'backdrop-blur-md bg-black/60' }}
    >
      <form
        className="flex min-h-0 flex-col"
        onSubmit={(event) => {
          event.preventDefault()
          if (collab.nameDraft.trim()) collab.joinRoom()
        }}
      >
        <AppDialogHeader
          heading={collab.dialogs.joinCollaboration}
          description={collab.dialogs.someoneSharedFileJoin}
          showClose={true}
          closeTestId="collab-modal-close"
        />
        <AppDialogBody className="space-y-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted">
              {collab.dialogs.yourName}
            </label>
            <AppInput
              value={collab.nameDraft}
              data-test-id="collab-name-input"
              placeholder={collab.dialogs.enterYourName}
              autoFocus
              onChange={(event) => collab.setNameDraft(event.target.value)}
            />
          </div>
          {(collab.isRoomPasswordProtected || collab.joinPassword) && (
            <div>
              <label className="mb-1.5 flex items-center gap-1 text-xs font-medium text-muted">
                <Lock className="size-3" />
                Room Password
              </label>
              <AppInput
                type="password"
                value={collab.joinPassword}
                data-test-id="collab-join-password-input"
                placeholder="Enter password to join"
                onChange={(event) => collab.setJoinPassword(event.target.value)}
              />
            </div>
          )}
        </AppDialogBody>
        <AppDialogFooter>
          <button
            type="button"
            className="flex h-8 cursor-pointer items-center justify-center rounded-lg border border-border bg-transparent px-3 text-xs font-medium text-muted transition-colors hover:bg-hover hover:text-surface"
            onClick={() => collab.setJoinDialogOpen(false)}
          >
            {collab.dialogs.cancel}
          </button>
          <button
            type="submit"
            data-test-id="collab-join-button"
            className="flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-lg border-none bg-accent px-4 text-xs font-medium text-white transition-opacity hover:bg-accent/90 disabled:opacity-50"
            disabled={!collab.nameDraft.trim()}
          >
            <Users className="size-3.5" />
            {collab.dialogs.joinRoom}
          </button>
        </AppDialogFooter>
      </form>
    </AppDialogRoot>
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
      <JoinRoomDialog />
    </CollabPanelContext.Provider>
  )
}
