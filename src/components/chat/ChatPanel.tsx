import React, { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowUp, MessageCircle, Sparkles, Square, Trash2 } from 'lucide-react'
import { readUIMessageStream } from 'ai'
import type { ChatTransport, UIMessage } from 'ai'

import { getActiveEditorStore } from '@/app/editor/active-store'
import { resolveLanguageModelID } from '@/app/ai/chat/model'
import { createToolLoopTransport } from '@/app/ai/chat/transports'
import { credentialsReady, isConfigured } from '@/app/ai/chat/storage'
import { createAIModelRuntime, designModelID, designProviderDefinition } from '@/app/ai/models'

type ChatStatus = 'ready' | 'submitted' | 'streaming'

function createId(): string {
  if (typeof window !== 'undefined' && (window as any).crypto) {
    if ('randomUUID' in (window as any).crypto) return (window as any).crypto.randomUUID()
    const array = new Uint32Array(1)
    ;(window as any).crypto.getRandomValues(array)
    return `msg-${Date.now()}-${array[0].toString(36)}`
  }
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

async function createDesignTransport(): Promise<ChatTransport<UIMessage>> {
  const runtime = await createAIModelRuntime('design')
  if (!runtime || runtime.kind !== 'direct') {
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

function toolLabels(message: UIMessage): string[] {
  return message.parts
    .filter((part) => part.type === 'step-start' || part.type.startsWith('tool-'))
    .map((part) => (part.type.startsWith('tool-') ? part.type.slice('tool-'.length) : 'step'))
}

export default function ChatPanel() {
  const [messages, setMessages] = useState<UIMessage[]>([])
  const [status, setStatus] = useState<ChatStatus>('ready')
  const [input, setInput] = useState('')
  const [configured, setConfigured] = useState<boolean | null>(null)
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
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages])

  const providerName = designProviderDefinition.value.name
  const modelName = designModelID.value

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
          transportRef.current = await createDesignTransport()
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
        data-test-id="chat-provider-setup"
        className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 p-6 text-center"
      >
        <Sparkles className="size-6 text-muted" />
        <div className="text-sm font-semibold text-surface">No AI provider configured</div>
        <p className="max-w-xs text-xs text-muted">
          Add an API key and pick a model for the Design agent in Settings to start chatting.
        </p>
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
            <span className="text-xs">Describe what to create or change</span>
          </div>
        ) : (
          <div data-test-id="chat-messages" className="flex flex-col gap-3">
            {messages.map((message) => {
              const text = messageText(message)
              const tools = message.role === 'assistant' ? toolLabels(message) : []
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
                      <div className="mt-1 flex flex-wrap gap-1">
                        {tools.map((tool, i) => (
                          <span
                            key={`${tool}-${i}`}
                            className="rounded bg-component/15 px-1 py-px text-[9px] font-medium uppercase text-component"
                          >
                            {tool}
                          </span>
                        ))}
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

      {messages.length > 0 ? (
        <div className="flex shrink-0 items-center gap-1 border-t border-border px-3 py-1">
          <button
            type="button"
            data-test-id="chat-clear"
            className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-muted hover:bg-hover hover:text-surface"
            onClick={handleClear}
          >
            <Trash2 className="size-3" />
            Clear
          </button>
          <span className="ml-auto truncate text-[10px] text-muted" title={`${providerName} · ${modelName}`}>
            {providerName}
            {modelName ? ` · ${modelName}` : ''}
          </span>
        </div>
      ) : null}

      <form
        className="flex shrink-0 items-end gap-2 border-t border-border p-2"
        onSubmit={(e) => {
          e.preventDefault()
          void handleSubmit(input)
        }}
      >
        <textarea
          data-test-id="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              void handleSubmit(input)
            }
          }}
          rows={1}
          placeholder="Message the design agent…"
          className="scrollbar-thin max-h-32 min-h-8 min-w-0 flex-1 resize-none rounded border border-border bg-input/50 px-2 py-1.5 text-xs text-surface outline-none placeholder:text-muted focus:border-accent"
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
