import React, { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowUp, Bot, MessageCircle, Play, Settings, Sparkles, Square, Trash2 } from 'lucide-react'
import { readUIMessageStream } from 'ai'
import type { ChatTransport, UIMessage } from 'ai'
import { useStore } from '@nanostores/react'

import { useI18n } from '@openweave/react'

import { ACP_AGENTS } from '@openweave/core/constants'

import { getActiveEditorStore } from '@/app/editor/active-store'
import { resolveLanguageModelID } from '@/app/ai/chat/model'
import { createToolLoopTransport } from '@/app/ai/chat/transports'
import { credentialsReady, isConfigured } from '@/app/ai/chat/storage'
import { aiModelSettings, createAIModelRuntime, designModelProfiles } from '@/app/ai/models'
import { useAIChat } from '@/app/ai/chat/use'
import { clearToolLogEntries, didHitStepLimit } from '@/app/ai/tools'
import { openSettingsDialog } from '@/app/settings/dialog'
import { toast } from '@/app/shell/ui'
import ChatMessage from '@/components/chat/ChatMessage'
import ChatModelSelect from '@/components/chat/ChatModelSelect'
import ChatProfileSelect from '@/components/chat/ChatProfileSelect'
import Tip from '@/components/ui/Tip'

type ChatStatus = 'ready' | 'submitted' | 'streaming'

function createId(): string {
  if ((window as any)?.crypto) {
    if ('randomUUID' in (window as any).crypto) return (window as any).crypto.randomUUID()
    const array = new Uint32Array(1)
    ;(window as any).crypto.getRandomValues(array)
    return `msg-${Date.now()}-${array[0].toString(36)}`
  }
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

async function createDesignTransport(): Promise<ChatTransport<UIMessage>> {
  const runtime = await createAIModelRuntime('design')
  if (runtime?.kind !== 'direct') {
    throw new Error('The Design model is not configured for direct API access')
  }
  const store = getActiveEditorStore()
  return createToolLoopTransport({
    store,
    providerID: runtime.role.connection.providerID,
    model: runtime.model,
    effectiveModelID: resolveLanguageModelID({
      providerID: runtime.role.connection.providerID,
      modelID: runtime.role.profile.modelID,
      customModelID: runtime.role.profile.customModelID
    }),
    maxOutputTokens: runtime.role.profile.maxOutputTokens
  })
}

/** `acp:claude-code` -> `Claude Code`, matching ModelsPanel's providerName helper. */
function acpAgentName(providerID: string): string {
  const agentID = providerID.slice('acp:'.length)
  return ACP_AGENTS.find((agent) => agent.id === agentID)?.name ?? agentID
}

export default function ChatPanel() {
  const [messages, setMessages] = useState<UIMessage[]>([])
  const [status, setStatus] = useState<ChatStatus>('ready')
  const [input, setInput] = useState('')
  const [configured, setConfigured] = useState<boolean | null>(null)
  const { dialogs } = useI18n()
  const {
    getOverrideTransport,
    customModelID: customModelIDStore,
    providerID: providerIDStore,
    providerDef: providerDefStore,
    resetChat
  } = useAIChat()
  const customModelID = useStore(customModelIDStore)
  const providerID = useStore(providerIDStore)
  const providerDef = useStore(providerDefStore)
  // Subscribed only so `designModelProfiles()` below stays live when profiles
  // are added/removed elsewhere (e.g. Settings) while the panel is mounted.
  useStore(aiModelSettings)
  const [error, setError] = useState<string | null>(null)

  const transportRef = useRef<ChatTransport<UIMessage> | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatIdRef = useRef<string>(createId())

  useEffect(() => {
    let active = true
    void credentialsReady.then(() => {
      if (active) setConfigured(isConfigured.get())
      return undefined
    })
    // Saving a key in Settings must flip the panel to the chat UI without a
    // remount, so track the store after the initial credential load. `.listen`
    // does not fire immediately, so the pre-credentialsReady value never shows.
    const stop = isConfigured.listen((value) => {
      if (active) setConfigured(value)
    })
    return () => {
      active = false
      stop()
    }
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages])

  const handleStop = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setStatus('ready')
  }, [])

  const handleClear = useCallback(() => {
    handleStop()
    setMessages([])
    setError(null)
    transportRef.current = null
    chatIdRef.current = createId()
    resetChat()
    // Also clears the step counter, so a stale Continue button can't survive a Clear.
    clearToolLogEntries()
    // ACP's debug transport is code-split (see transports.ts); load it lazily
    // instead of pulling the ACP SDK into the main chat bundle for everyone.
    void import('@/app/ai/acp/transport').then(({ clearAcpDebugLog }) => clearAcpDebugLog())
  }, [handleStop, resetChat])

  const handleSubmit = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || status !== 'ready') return

      const userMessage: UIMessage = {
        id: createId(),
        role: 'user',
        parts: [{ type: 'text', text: trimmed }]
      }
      const history = [...messages, userMessage]
      setMessages(history)
      setInput('')
      setError(null)
      setStatus('submitted')

      try {
        if (!transportRef.current) {
          // Tests (and future alternate frontends) can override the transport
          // through window.openWeave.setChatTransport; honor it before building
          // the real design transport.
          const override = getOverrideTransport()
          transportRef.current = override ? override() : await createDesignTransport()
        }
        setConfigured(true)
        const controller = new AbortController()
        abortRef.current = controller
        const stream = await transportRef.current.sendMessages({
          trigger: 'submit-message',
          chatId: chatIdRef.current,
          messageId: undefined,
          messages: history,
          abortSignal: controller.signal
        })
        setStatus('streaming')
        for await (const assistantMessage of readUIMessageStream({ stream })) {
          setMessages([...history, assistantMessage])
        }
      } catch (e) {
        if (!(e instanceof DOMException && e.name === 'AbortError')) {
          const message = e instanceof Error ? e.message : String(e)
          setError(message)
          toast.error(message)
          transportRef.current = null
        }
      } finally {
        abortRef.current = null
        setStatus('ready')
      }
    },
    [messages, status]
  )

  const isBusy = status === 'streaming' || status === 'submitted'
  const isThinking = isBusy && (messages.length === 0 || messages[messages.length - 1].role === 'user')
  const showContinue =
    status === 'ready' &&
    messages.length > 0 &&
    messages[messages.length - 1].role === 'assistant' &&
    didHitStepLimit()

  const isACPProvider = providerID.startsWith('acp:')
  const isCustomProvider = providerID === 'openai-compatible' || providerID === 'anthropic-compatible'
  const usesCustomModel = Boolean(providerDef.supportsCustomModel) && Boolean(customModelID.trim())
  // Switching between saved profiles only makes sense once more than one can drive the design agent.
  const canSwitchProfile = designModelProfiles().length > 1

  let composerControl: React.ReactNode
  if (isACPProvider) {
    composerControl = (
      <div
        className="ml-auto flex items-center gap-1 px-1.5 py-0.5 text-[10px] text-muted"
        data-test-id="chat-acp-agent-label"
      >
        <Bot className="size-3" />
        <span className="truncate">{acpAgentName(providerID)}</span>
      </div>
    )
  } else if (canSwitchProfile && (isCustomProvider || usesCustomModel)) {
    composerControl = <ChatProfileSelect />
  } else if (isCustomProvider || usesCustomModel) {
    composerControl = (
      <div
        className="ml-auto flex items-center gap-1 px-1.5 py-0.5 text-[10px] text-muted"
        data-test-id="chat-custom-model-label"
      >
        <Bot className="size-3" />
        <span className="truncate">{usesCustomModel ? customModelID.trim() : 'No model'}</span>
      </div>
    )
  } else {
    composerControl = <ChatModelSelect />
  }

  if (configured === false) {
    return (
      <div
        data-test-id="provider-setup"
        className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 p-6 text-center"
      >
        <Sparkles className="size-5 text-muted" />
        <p className="max-w-xs text-xs text-muted">{dialogs.connectAIProvider}</p>
        <button
          type="button"
          data-test-id="provider-setup-open-settings"
          className="w-full max-w-48 rounded bg-accent py-1.5 text-xs font-medium text-white hover:bg-accent/90"
          onClick={() => openSettingsDialog('ai')}
        >
          {dialogs.openProviderSettings}
        </button>
      </div>
    )
  }

  return (
    <div
      data-test-id="chat-panel"
      className="flex min-w-0 flex-1 select-text flex-col overflow-hidden"
    >
      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {messages.length === 0 ? (
          <div
            data-test-id="chat-empty-state"
            className="flex h-full flex-col items-center justify-center gap-2 text-center text-muted"
          >
            <MessageCircle className="size-5" />
            <span className="text-xs">{dialogs.describeCreateOrChange}</span>
          </div>
        ) : (
          <div data-test-id="chat-messages" className="flex flex-col gap-3">
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}

            {isThinking ? (
              <div data-test-id="chat-typing-indicator" className="flex gap-2">
                <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted/20 text-[10px] font-bold text-muted">
                  AI
                </div>
                <div className="flex items-center gap-1 py-2">
                  <span className="size-1.5 animate-bounce rounded-full bg-muted" style={{ animationDelay: '0ms' }} />
                  <span className="size-1.5 animate-bounce rounded-full bg-muted" style={{ animationDelay: '150ms' }} />
                  <span className="size-1.5 animate-bounce rounded-full bg-muted" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            ) : null}

            {showContinue ? (
              <div className="flex justify-center py-2">
                <button
                  type="button"
                  data-test-id="chat-continue"
                  className="flex items-center gap-1.5 rounded-full bg-accent/10 px-4 py-1.5 text-xs font-medium text-accent transition-colors hover:bg-accent/20"
                  onClick={() => void handleSubmit('Continue where you left off')}
                >
                  <Play className="size-3" />
                  Continue
                </button>
              </div>
            ) : null}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {error ? (
        <div className="shrink-0 border-t border-border bg-[var(--color-warning-bg,transparent)] px-3 py-1.5 text-[11px] text-[var(--color-warning-text)]">
          {error}
        </div>
      ) : null}

      <div className="flex shrink-0 items-center gap-1 border-t border-border px-3 py-1">
        {messages.length > 0 && (
          <button
            type="button"
            data-test-id="chat-clear"
            className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-muted hover:bg-hover hover:text-surface"
            onClick={handleClear}
          >
            <Trash2 className="size-3" />
            Clear
          </button>
        )}
        {composerControl}
        <button
          type="button"
          data-test-id="provider-settings-trigger"
          aria-label={dialogs.providerSettings}
          className="rounded p-0.5 text-muted hover:bg-hover hover:text-surface"
          onClick={() => openSettingsDialog('ai')}
        >
          <Settings className="size-3" />
        </button>
      </div>

      <form
        className="flex shrink-0 items-end gap-2 border-t border-border p-2"
        onSubmit={(e) => {
          e.preventDefault()
          void handleSubmit(input)
        }}
      >
        <input
          data-test-id="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onPaste={(e) => e.stopPropagation()}
          onCopy={(e) => e.stopPropagation()}
          onCut={(e) => e.stopPropagation()}
          placeholder={dialogs.describeChange}
          className="min-h-8 min-w-0 flex-1 rounded border border-border bg-input/50 px-2 py-1.5 text-xs text-surface outline-none placeholder:text-muted focus:border-accent"
        />
        {isBusy ? (
          <Tip label="Stop">
            <button
              type="button"
              data-test-id="chat-stop"
              className="flex size-8 shrink-0 items-center justify-center rounded bg-hover text-surface hover:bg-hover/80"
              onClick={handleStop}
            >
              <Square className="size-3.5" />
            </button>
          </Tip>
        ) : (
          <Tip label="Send">
            <button
              type="submit"
              data-test-id="chat-send"
              disabled={!input.trim()}
              className="flex size-8 shrink-0 items-center justify-center rounded bg-accent text-accent-foreground hover:bg-accent/90 disabled:opacity-40"
            >
              <ArrowUp className="size-3.5" />
            </button>
          </Tip>
        )}
      </form>
    </div>
  )
}
