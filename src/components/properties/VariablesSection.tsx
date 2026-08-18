import { Settings2 } from 'lucide-react'
import React, { useState } from 'react'

import { useI18n } from '@openweave/react'

import { getActiveEditorStore } from '@/app/editor/active-store'
import IconButton from '@/components/ui/IconButton'
import PanelSection from '@/components/ui/panel/PanelSection'
import VariablesDialog from '@/components/variables/VariablesDialog'

export default function VariablesSection() {
  const { panels } = useI18n()
  const editor = getActiveEditorStore()
  const [dialogOpen, setDialogOpen] = useState(false)

  // Note: Since this component isn't automatically reactive to the number of variables
  // via a hook (as useEditorStore doesn't return state), we'd typically need to subscribe
  // to editor events, but getting it directly for initial render is fine.
  // We can use the useVariablesEditor which has `collections` if needed,
  // or just read from editor store directly.
  const collectionCount = editor.getCollectionCount()
  const variableCount = editor.getVariableCount()
  const hasVariables = variableCount > 0

  return (
    <>
      <PanelSection label={panels.variables}>
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between group">
            {hasVariables ? (
              <span className="text-[11px] text-muted">
                {variableCount} / {collectionCount}
              </span>
            ) : (
              <span className="text-[11px] text-muted">{panels.noLocalVariables}</span>
            )}

            <IconButton label={panels.openVariables} onClick={() => setDialogOpen(true)}>
              <Settings2 className="size-3.5" />
            </IconButton>
          </div>
        </div>
      </PanelSection>

      {dialogOpen && <VariablesDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />}
    </>
  )
}
