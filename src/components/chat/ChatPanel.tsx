import React, { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { ArrowUp, Bot, MessageCircle, Settings, Sparkles, Square, Trash2 } from 'lucide-react'
import { readUIMessageStream } from 'ai'
import type { ChatTransport, UIMessage } from 'ai'
import { watch } from 'vue'

import { useI18n } from '@openweave/react'

import { getActiveEditorStore } from '@/app/editor/active-store'
import { resolveLanguageModelID } from '@/app/ai/chat/model'
import { createToolLoopTransport } from '@/app/ai/chat/transports'
import { credentialsReady, isConfigured } from '@/app/ai/chat/storage'
import { createAIModelRuntime } from '@/app/ai/models'
import { useAIChat } from '@/app/ai/chat/use'
import { openSettingsDialog } from '@/app/settings/dialog'
import { toast } from '@/app/shell/ui'
import ChatModelSelect from '@/components/chat/ChatModelSelect'

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

function messageText(message: UIMessage): string {
  return message.parts
    .map((part) => (part.type === 'text' ? part.text : ''))
    .join('')
}

type ToolPartLike = {
  type: string
  state?: string
  output?: unknown
}

function isToolPart(part: { type: string }): part is ToolPartLike {
  return part.type.startsWith('tool-') || part.type === 'dynamic-tool'
}

/** `create_shape` -> `Create Shape`, matching the Vue ChatMessage display names. */
function toolDisplayName(part: ToolPartLike): string {
  const raw =
    part.type === 'dynamic-tool'
      ? ((part as { toolName?: string }).toolName ?? 'tool')
      : part.type.slice('tool-'.length)
  return raw
    .replace(/^mcp__[^_]+__/, '')
    .replace(/_/g, ' ')
    .replace(/\w/g, (c) => c.toUpperCase())
}

function toolState(part: ToolPartLike): 'pending' | 'done' | 'error' {
  const hasErrorOutput =
    part.state === 'output-available' &&
    typeof part.output === 'object' &&
    part.output !== null &&
    'error' in (part.output as object)
  if (part.state === 'output-error' || hasErrorOutput) return 'error'
  if (part.state === 'output-available') return 'done'
  return 'pending'
}

function toolParts(message: UIMessage): ToolPartLike[] {
  return message.parts.filter(isToolPart)
}

export default function ChatPanel() {
  const [messages, setMessages] = useState<UIMessage[]>([])
  const [status, setStatus] = useState<ChatStatus>('ready')
  const [input, setInput] = useState('')
  const [configured, setConfigured] = useState<boolean | null>(null)
  const { dialogs } = useI18n()
  const { getOverrideTransport, customModelID, modelID } = useAIChat()
  const [, forceRender] = useReducer((n: number): number => n + 1, 0)

  useEffect(() => {
    const stop = watch([customModelID, modelID], () => forceRender())
    return stop
  }, [customModelID, modelID])
  const [error, setError] = useState<string | null>(null)

  const transportRef = useRef<ChatTransport<UIMessage> | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatIdRef = useRef<string>(createId())

  useEffect(() => {
    let active = true
    void credentialsReady.then(() => {
      if (active) setConfigured(isConfigured.value)
      return undefined
    })
    // Saving a key in Settings must flip the panel to the chat UI without a
    // remount, so track the Vue computed after the initial credential load.
    const stop = watch(isConfigured, (value) => {
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
  }, [handleStop])

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
            {messages.map((message) => {
              const text = messageText(message)
              const tools = message.role === 'assistant' ? toolParts(message) : []
              return (
                <div
                  key={message.id}
                  data-test-id="chat-message"
                  data-role={message.role}
                  className={`flex gap-2 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted/20 text-[10px] font-bold text-muted">
                    {message.role === 'user' ? 'You' : 'AI'}
                  </div>
                  <div
                    className={`min-w-0 max-w-[85%] rounded-lg px-3 py-2 text-xs leading-5 ${
                      message.role === 'user'
                        ? 'bg-accent/10 text-surface'
                        : 'bg-input/40 text-surface'
                    }`}
                  >
                    {text ? <span className="whitespace-pre-wrap break-words">{text}</span> : null}
                    {tools.length > 0 ? (
                      <div className="mt-1 flex flex-col gap-1">
                        {tools.map((tool, i) => {
                          const state = toolState(tool)
                          return (
                            <div
                              key={`tool-${i}`}
                              className="flex items-center gap-2 rounded-lg border border-border bg-canvas px-2 py-1"
                            >
                              <span className="text-[11px] text-surface">{toolDisplayName(tool)}</span>
                              <span className="text-[10px] text-muted">
                                {state === 'pending' ? 'Running…' : state === 'done' ? 'Done' : 'Error'}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    ) : null}
                  </div>
                </div>
              )
            })}

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
        {customModelID.value.trim() ? (
          <div
            className="ml-auto flex items-center gap-1 px-1.5 py-0.5 text-[10px] text-muted"
            data-test-id="chat-custom-model-label"
          >
            <Bot className="size-3" />
            <span className="truncate">{customModelID.value}</span>
          </div>
        ) : (
          <ChatModelSelect />
        )}
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
          placeholder={dialogs.describeChange}
          className="min-h-8 min-w-0 flex-1 rounded border border-border bg-input/50 px-2 py-1.5 text-xs text-surface outline-none placeholder:text-muted focus:border-accent"
        />
        {isBusy ? (
          <button
            type="button"
            data-test-id="chat-stop"
            title="Stop"
            className="flex size-8 shrink-0 items-center justify-center rounded bg-hover text-surface hover:bg-hover/80"
            onClick={handleStop}
          >
            <Square className="size-3.5" />
          </button>
        ) : (
          <button
            type="submit"
            data-test-id="chat-send"
            title="Send"
            disabled={!input.trim()}
            className="flex size-8 shrink-0 items-center justify-center rounded bg-accent text-accent-foreground hover:bg-accent/90 disabled:opacity-40"
          >
            <ArrowUp className="size-3.5" />
          </button>
        )}
      </form>
    </div>
  )
}
