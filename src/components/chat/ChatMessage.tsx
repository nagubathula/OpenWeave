import type { UIMessage } from 'ai'
import React from 'react'
import ReactMarkdown from 'react-markdown'

import ChatToolCall, { isToolPart } from '@/components/chat/ChatToolCall'
import type { ToolPartLike } from '@/components/chat/ChatToolCall'

/**
 * Minimal styling for assistant markdown inside the small chat bubble —
 * react-markdown ships no CSS of its own (unlike the old vue-stream-markdown).
 */
const MARKDOWN_CLASS =
  'chat-markdown min-w-0 break-words ' +
  '[&_a]:text-accent [&_a]:underline ' +
  '[&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-2 [&_blockquote]:text-muted ' +
  '[&_code]:rounded [&_code]:bg-canvas [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[11px] ' +
  '[&_:is(h1,h2,h3,h4,h5,h6)]:my-1 [&_:is(h1,h2,h3,h4,h5,h6)]:text-xs [&_:is(h1,h2,h3,h4,h5,h6)]:font-semibold ' +
  '[&_li]:my-0.5 [&_ol]:my-1 [&_ol]:list-decimal [&_ol]:pl-4 ' +
  '[&_p]:my-1 ' +
  '[&_pre]:my-1 [&_pre]:overflow-x-auto [&_pre]:rounded [&_pre]:bg-canvas [&_pre]:p-2 [&_pre_code]:bg-transparent [&_pre_code]:p-0 ' +
  '[&_strong]:font-semibold ' +
  '[&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-4'

function messageText(message: UIMessage): string {
  return message.parts.map((part) => (part.type === 'text' ? part.text : '')).join('')
}

function toolParts(message: UIMessage): ToolPartLike[] {
  return message.parts.filter(isToolPart)
}

/**
 * Single chat bubble, ported from ChatMessage.vue: assistant text renders as
 * markdown, tool calls render as expandable ChatToolCall rows, user text
 * stays plain (matching the Vue version, which never ran user text through
 * the markdown renderer).
 */
export default function ChatMessage({ message }: { message: UIMessage }) {
  const text = messageText(message)
  const tools = message.role === 'assistant' ? toolParts(message) : []

  return (
    <div
      data-test-id="chat-message"
      data-role={message.role}
      className={`flex gap-2 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
    >
      <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted/20 text-[10px] font-bold text-muted">
        {message.role === 'user' ? 'You' : 'AI'}
      </div>
      <div
        className={`min-w-0 max-w-[85%] rounded-lg px-3 py-2 text-xs leading-5 ${
          message.role === 'user' ? 'bg-accent/10 text-surface' : 'bg-input/40 text-surface'
        }`}
      >
        {text ? (
          message.role === 'assistant' ? (
            <div className={MARKDOWN_CLASS}>
              <ReactMarkdown>{text}</ReactMarkdown>
            </div>
          ) : (
            <span className="whitespace-pre-wrap break-words">{text}</span>
          )
        ) : null}
        {tools.length > 0 ? (
          <div className="mt-1 flex flex-col gap-1">
            {tools.map((tool, i) => (
              <ChatToolCall key={tool.toolCallId ?? `tool-${i}`} part={tool} />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}
