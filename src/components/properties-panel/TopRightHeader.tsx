/* eslint-disable openweave/no-hardcoded-tip-labels */
import { Play } from 'lucide-react'
import React, { useState } from 'react'

import CollabPanel from '@/components/collab-panel/CollabPanel'
import DevModeToggle from '@/components/dev-mode/DevModeToggle'
import ZoomDropdown from '@/components/editor/ZoomDropdown'
import PrototypePlayer from '@/components/prototype/PrototypePlayer'
import Tip from '@/components/ui/Tip'

export default function TopRightHeader() {
  const [presenting, setPresenting] = useState(false)

  const handlePresent = () => {
    setPresenting(true)
  }

  return (
    <div
      data-test-id="top-right-header"
      className="flex shrink-0 items-center justify-between gap-1.5 border-b border-border/80 bg-panel px-2.5 py-1.5 select-none"
    >
      {/* Left side: Dev mode toggle & Collab avatars */}
      <div className="flex items-center gap-1.5 min-w-0">
        <DevModeToggle />
      </div>

      {/* Right side: Collab Share, Present Play, Zoom */}
      <div className="flex items-center gap-1.5 shrink-0">
        <CollabPanel />

        {/* Prototype Present Button */}
        <Tip label="Present / Play prototype">
          <button
            type="button"
            data-test-id="top-present-btn"
            aria-label="Present Prototype"
            className="flex size-7 cursor-pointer items-center justify-center rounded-md text-muted transition-colors hover:bg-hover hover:text-surface"
            onClick={handlePresent}
          >
            <Play className="size-3.5 fill-current" />
          </button>
        </Tip>

        {/* Zoom Dropdown */}
        <div className="ml-0.5">
          <ZoomDropdown />
        </div>
      </div>

      {presenting && <PrototypePlayer onClose={() => setPresenting(false)} />}
    </div>
  )
}
