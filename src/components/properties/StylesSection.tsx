import { Palette } from 'lucide-react'
import React, { useState } from 'react'

import { getActiveEditorStore } from '@/app/editor/active-store'
import StylesDialog from '@/components/styles/StylesDialog'
import IconButton from '@/components/ui/IconButton'
import PanelSection from '@/components/ui/panel/PanelSection'

export default function StylesSection() {
  const editor = getActiveEditorStore()
  const [dialogOpen, setDialogOpen] = useState(false)

  const allStyles = editor.getSharedStyles()
  const styleCount = allStyles.length

  return (
    <>
      <PanelSection label="Local Styles">
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between group">
            <span className="text-[11px] text-muted">
              {styleCount === 0
                ? 'No local styles'
                : `${styleCount} style${styleCount === 1 ? '' : 's'}`}
            </span>

            <IconButton label="Manage styles" onClick={() => setDialogOpen(true)}>
              <Palette className="size-3.5" />
            </IconButton>
          </div>
        </div>
      </PanelSection>

      {dialogOpen && <StylesDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />}
    </>
  )
}
