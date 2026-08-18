import { useStore } from '@nanostores/react'
import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog'
import React from 'react'

import { acpPermissionOptionTestId } from '@openweave/react'

import {
  currentPermission,
  rejectCurrentPermission,
  respondToPermission
} from '@/app/ai/acp/permission'
import { AppAlertDialogRoot } from '@/components/ui/dialog'

interface ToolCallInfo {
  title?: string
  rawInput?: unknown
}

/**
 * Modal shown while an ACP agent waits for a tool permission, ported from
 * src/components/chat/AcpPermissionDialog.vue. Dismissing (Escape/overlay)
 * rejects; each option resolves the pending request.
 */
export default function AcpPermissionDialog() {
  const permission = useStore(currentPermission)

  if (!permission) return null

  const toolCall = (permission.request.toolCall as ToolCallInfo) ?? {}
  const toolName = toolCall.title ?? 'Unknown tool'

  let toolInput: string | null = null
  if (toolCall.rawInput) {
    try {
      toolInput = JSON.stringify(toolCall.rawInput, null, 2)
    } catch {
      toolInput = '[Complex object]'
    }
  }

  const allowOptions = permission.request.options.filter((o) => o.kind.startsWith('allow'))
  const rejectOptions = permission.request.options.filter((o) => o.kind.startsWith('reject'))

  return (
    <AppAlertDialogRoot
      open
      ui={{ overlay: 'z-50', content: 'w-80 rounded-lg p-4 shadow-xl' }}
      data-test-id="acp-permission-dialog"
      
      onEscapeKeyDown={() => rejectCurrentPermission()}
    >
      <AlertDialogPrimitive.Title className="text-sm font-semibold text-surface">
        Permission Request
      </AlertDialogPrimitive.Title>

      <AlertDialogPrimitive.Description className="mt-2 text-xs text-muted">
        <span className="font-medium text-surface">{toolName}</span> is requesting permission.
      </AlertDialogPrimitive.Description>

      {toolInput && (
        <pre className="mt-2 max-h-32 overflow-auto rounded bg-input p-2 text-[10px] text-muted">
          {toolInput}
        </pre>
      )}

      <div className="mt-4 flex flex-col gap-2">
        {allowOptions.map((opt) => (
          <AlertDialogPrimitive.Action
            key={opt.optionId}
            data-test-id={acpPermissionOptionTestId(opt.kind)}
            className="w-full cursor-pointer rounded bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent/90"
            onClick={() => respondToPermission(opt.optionId)}
          >
            {opt.name}
          </AlertDialogPrimitive.Action>
        ))}

        {rejectOptions.map((opt) => (
          <AlertDialogPrimitive.Cancel
            key={opt.optionId}
            data-test-id={acpPermissionOptionTestId(opt.kind)}
            className="w-full cursor-pointer rounded border border-border bg-canvas px-3 py-1.5 text-xs text-muted hover:bg-hover hover:text-surface"
            onClick={() => respondToPermission(opt.optionId)}
          >
            {opt.name}
          </AlertDialogPrimitive.Cancel>
        ))}
      </div>
    </AppAlertDialogRoot>
  )
}
