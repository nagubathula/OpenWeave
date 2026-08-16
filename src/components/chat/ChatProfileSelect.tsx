import React from 'react'
import * as Select from '@radix-ui/react-select'
import { Bot, Check, ChevronDown } from 'lucide-react'
import { useStore } from '@nanostores/react'

import { useI18n } from '@openweave/react'

import { aiModelSettings, designModelProfiles, setModelRoleAssignment } from '@/app/ai/models'
import type { AIModelProfileId } from '@/app/ai/models'
import { AppBadge } from '@/components/ui/AppBadge'

/**
 * Switches which saved model profile drives the design agent, ported from
 * ChatProfileSelect.vue. Shown in the composer instead of ChatModelSelect
 * when the active design profile has no fixed model list to pick from
 * (custom provider/model) but more than one profile could drive the agent.
 */
export default function ChatProfileSelect() {
  const { dialogs } = useI18n()
  useStore(aiModelSettings)
  const profiles = designModelProfiles()
  const selectedId = aiModelSettings.get().assignments.design
  const selected = profiles.find((profile) => profile.id === selectedId)

  return (
    <Select.Root
      value={selectedId}
      onValueChange={(value) => setModelRoleAssignment('design', value as AIModelProfileId)}
    >
      <Select.Trigger
        data-test-id="chat-profile-selector"
        aria-label={dialogs.selectDesignModel}
        className="ml-auto flex min-w-0 max-w-full cursor-pointer items-center gap-1 rounded border-none bg-transparent px-1.5 py-0.5 text-[10px] text-muted hover:text-surface"
      >
        <Bot className="size-3 shrink-0" />
        <span className="min-w-0 flex-1 truncate">{selected?.name ?? selectedId}</span>
        <ChevronDown className="size-2.5 shrink-0" />
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          position="popper"
          side="top"
          sideOffset={4}
          className="z-50 max-h-60 overflow-y-auto rounded border border-border bg-panel p-1 shadow-lg"
        >
          <Select.Viewport>
            {profiles.map((profile) => (
              <Select.Item
                key={profile.id}
                value={profile.id}
                className="flex min-w-0 cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-[11px] text-surface outline-none data-[highlighted]:bg-hover"
              >
                <Select.ItemText className="min-w-0 flex-1 truncate">
                  {profile.name}
                </Select.ItemText>
                {profile.capabilities.includes('vision') && (
                  <AppBadge>{dialogs.modelCapabilityVisionShort}</AppBadge>
                )}
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
