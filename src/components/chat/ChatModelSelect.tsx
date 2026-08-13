import React, { useEffect, useReducer } from 'react'
import * as Select from '@radix-ui/react-select'
import { Bot, Check, ChevronDown } from 'lucide-react'
import { watch } from 'vue'

import { useAIChat } from '@/app/ai/chat/use'
import { AppBadge } from '@/components/ui/AppBadge'

/**
 * Model dropdown in the chat footer. Ported from ProviderModelSelect.vue —
 * binds the design-model writable computed from the store layer.
 */
export default function ChatModelSelect() {
  const { modelID, providerDef } = useAIChat()
  const [, forceRender] = useReducer((n: number): number => n + 1, 0)

  useEffect(() => {
    const stop = watch([modelID, providerDef], () => forceRender())
    return stop
  }, [modelID, providerDef])

  const models = providerDef.value.models
  const selected = models.find((model) => model.id === modelID.value)

  return (
    <Select.Root
      value={modelID.value}
      onValueChange={(value) => {
        modelID.value = value
      }}
    >
      <Select.Trigger
        data-test-id="chat-model-selector"
        className="ml-auto flex cursor-pointer items-center gap-1 rounded border-none bg-transparent px-1.5 py-0.5 text-[10px] text-muted hover:text-surface"
      >
        <Bot className="size-3" />
        <span className="truncate">{selected?.name ?? modelID.value}</span>
        <ChevronDown className="size-2.5" />
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          position="popper"
          side="top"
          sideOffset={4}
          className="z-50 max-h-60 overflow-y-auto rounded border border-border bg-panel p-1 shadow-lg"
        >
          <Select.Viewport>
            {models.map((model) => (
              <Select.Item
                key={model.id}
                value={model.id}
                className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-[11px] text-surface outline-none data-[highlighted]:bg-hover"
              >
                <Select.ItemText className="flex-1">{model.name}</Select.ItemText>
                {model.tag && <AppBadge>{model.tag}</AppBadge>}
                <Select.ItemIndicator>
                  <Check className="size-3" />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  )
}
