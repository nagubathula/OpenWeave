import * as Collapsible from '@radix-ui/react-collapsible'
import { Check, ChevronDown, LoaderCircle, TriangleAlert } from 'lucide-react'
import React from 'react'

export type ToolPartLike = {
  type: string
  toolCallId?: string
  state?: string
  output?: unknown
  errorText?: unknown
}

export function isToolPart(part: { type: string }): part is ToolPartLike {
  return part.type.startsWith('tool-') || part.type === 'dynamic-tool'
}

/** `create_shape` -> `Create Shape`, matching the Vue ChatMessage display names. */
export function toolDisplayName(part: ToolPartLike): string {
  const raw =
    part.type === 'dynamic-tool'
      ? ((part as { toolName?: string }).toolName ?? 'tool')
      : part.type.slice('tool-'.length)
  return raw
    .replace(/^mcp__[^_]+__/, '')
    .replace(/_/g, ' ')
    .replace(/\w/g, (c) => c.toUpperCase())
}

function hasErrorOutput(part: ToolPartLike): boolean {
  return (
    part.state === 'output-available' &&
    typeof part.output === 'object' &&
    part.output !== null &&
    'error' in (part.output as object)
  )
}

export function toolState(part: ToolPartLike): 'pending' | 'done' | 'error' {
  if (part.state === 'output-error' || hasErrorOutput(part)) return 'error'
  if (part.state === 'output-available') return 'done'
  return 'pending'
}

/** Mirrors the `<pre>` content from ChatMessage.vue's CollapsibleContent. */
function toolDetail(part: ToolPartLike): string {
  if (part.state === 'output-error')
    return typeof part.errorText === 'string'
      ? part.errorText
      : JSON.stringify(part.errorText ?? 'Unknown error')
  if (hasErrorOutput(part))
    return typeof (part.output as { error: unknown }).error === 'string'
      ? ((part.output as { error: unknown }).error as string)
      : JSON.stringify((part.output as { error: unknown }).error)
  if (part.output !== undefined) {
    try {
      return JSON.stringify(part.output, null, 2)
    } catch {
      return '[Complex object]'
    }
  }
  return 'No output'
}

const STATE_ICON_CLASS: Record<'pending' | 'done' | 'error', string> = {
  pending: 'bg-accent/20 text-accent',
  done: 'bg-success/20 text-success',
  error: 'bg-error/20 text-error'
}

const STATE_LABEL: Record<'pending' | 'done' | 'error', string> = {
  pending: 'Running…',
  done: 'Done',
  error: 'Error'
}

/**
 * Expandable tool-call row, ported from ChatMessage.vue's CollapsibleRoot —
 * the name/status stays visible; expanding reveals `output`/`errorText`
 * (previously hidden, including tool errors).
 */
export default function ChatToolCall({ part }: { part: ToolPartLike }) {
  const state = toolState(part)
  const canExpand = state !== 'pending'

  return (
    <Collapsible.Root className="rounded-lg border border-border bg-canvas p-2">
      <Collapsible.Trigger
        disabled={!canExpand}
        className="group flex w-full items-center gap-2 rounded px-1 py-0.5 text-left hover:bg-hover disabled:cursor-default disabled:hover:bg-transparent"
      >
        <span
          className={`flex size-4 shrink-0 items-center justify-center rounded-full ${STATE_ICON_CLASS[state]}`}
        >
          {state === 'pending' ? (
            <LoaderCircle className="size-3 animate-spin" />
          ) : state === 'done' ? (
            <Check className="size-3" />
          ) : (
            <TriangleAlert className="size-3" />
          )}
        </span>
        <span className="text-[11px] text-surface">{toolDisplayName(part)}</span>
        <span className="text-[10px] text-muted">{STATE_LABEL[state]}</span>
        {canExpand ? (
          <ChevronDown className="ml-auto size-3 shrink-0 text-muted transition-transform group-data-[state=open]:rotate-180" />
        ) : null}
      </Collapsible.Trigger>
      {canExpand ? (
        <Collapsible.Content className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
          <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap break-words rounded bg-input p-2 text-[10px] text-muted">
            {toolDetail(part)}
          </pre>
        </Collapsible.Content>
      ) : null}
    </Collapsible.Root>
  )
}
