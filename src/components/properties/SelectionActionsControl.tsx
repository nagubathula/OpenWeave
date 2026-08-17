import React from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Shapes, ChevronDown, Combine, CopyMinus, SquaresIntersect, CopyX, ListCollapse } from 'lucide-react'
import {
  useEditorCommands,
  editorCommandMetadata,
  formatShortcut
} from '@openweave/react'

import IconButton from '@/components/ui/IconButton'
import Tip from '@/components/ui/Tip'

interface Props {
  showBooleanOperations?: boolean
}

const operations = [
  { id: 'selection.booleanUnion' as const, icon: <Combine className="size-3.5 shrink-0 text-muted" /> },
  { id: 'selection.booleanSubtract' as const, icon: <CopyMinus className="size-3.5 shrink-0 text-muted" /> },
  { id: 'selection.booleanIntersect' as const, icon: <SquaresIntersect className="size-3.5 shrink-0 text-muted" /> },
  { id: 'selection.booleanExclude' as const, icon: <CopyX className="size-3.5 shrink-0 text-muted" /> },
  { id: 'selection.flatten' as const, icon: <ListCollapse className="size-3.5 shrink-0 text-muted" /> }
]

export default function SelectionActionsControl({ showBooleanOperations = false }: Props) {
  const { getCommand, runCommand } = useEditorCommands()
  const maskCommand = getCommand('selection.toggleMask')

  return (
    <div className="ml-auto flex items-center gap-1">
      <IconButton
        label={maskCommand.label}
        disabled={!maskCommand.enabled}
        onClick={() => runCommand('selection.toggleMask')}
      >
        <Shapes className="size-3.5" />
      </IconButton>
      
      {showBooleanOperations && (
        <DropdownMenu.Root>
          <Tip label="Boolean groups">
            <DropdownMenu.Trigger asChild>
              <button
                type="button"
                className="flex h-7 items-center gap-1 rounded-md px-1.5 text-muted hover:bg-hover hover:text-surface data-[state=open]:bg-active data-[state=open]:text-surface outline-none"
              >
                <Combine className="size-4" />
                <ChevronDown className="size-3" />
              </button>
            </DropdownMenu.Trigger>
          </Tip>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={4}
              className="min-w-44 rounded-md border border-border bg-panel p-1 shadow-md animate-in fade-in zoom-in-95 z-50 text-xs"
            >
              {operations.map((operation) => {
                const cmd = getCommand(operation.id)
                const meta = editorCommandMetadata(operation.id)
                return (
                  <DropdownMenu.Item
                    key={operation.id}
                    disabled={!cmd.enabled}
                    onSelect={() => runCommand(operation.id)}
                    className="flex justify-between items-center gap-2 rounded-sm px-2 py-1.5 outline-none focus:bg-active data-[disabled]:opacity-50 cursor-pointer text-surface"
                  >
                    <div className="flex items-center gap-2">
                      {operation.icon}
                      <span>{cmd.label}</span>
                    </div>
                    {meta?.shortcut && (
                      <span className="text-[11px] text-muted">
                        {formatShortcut(meta.shortcut)}
                      </span>
                    )}
                  </DropdownMenu.Item>
                )
              })}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      )}
    </div>
  )
}
