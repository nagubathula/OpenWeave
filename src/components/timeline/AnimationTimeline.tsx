import { useStore } from '@nanostores/react'
import React, { useRef, useState } from 'react'
import { useEventListener } from 'usehooks-ts'

import { useAIChat } from '@/app/ai/chat/use'
import { nodeTracksStore, seek, timelineStore, togglePlay } from '@/app/motion/store'
import Controls from '@/components/timeline/Controls'
import EmptyState from '@/components/timeline/EmptyState'
import Playhead from '@/components/timeline/Playhead'
import Ruler from '@/components/timeline/Ruler'
import TrackList from '@/components/timeline/TrackList'

export default function AnimationTimeline() {
  const { activeTab } = useAIChat()
  const { currentTimeMs, durationMs, zoom } = useStore(timelineStore)
  const tracks = useStore(nodeTracksStore)
  const [scrollLeft, setScrollLeft] = useState(0)
  const [emptyDismissed, setEmptyDismissed] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const hasTracks = Object.keys(tracks).length > 0
  const showEmpty = !hasTracks && !emptyDismissed

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.code === 'Space') {
      const target = e.target as HTMLElement | null
      const isInput =
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      if (!isInput) {
        e.preventDefault()
        togglePlay()
      }
    }
  }

  useEventListener('keydown', onKeyDown)

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollLeft(e.currentTarget.scrollLeft)
  }

  const handleClose = () => {
    activeTab.set('design')
  }

  return (
    <div
      data-test-id="animation-timeline"
      className="relative flex h-60 w-full flex-col border-t border-border/60 bg-panel shadow-inner select-none transition-all duration-200"
    >
      {/* Upper scrollable tracks & ruler area */}
      <div
        ref={scrollContainerRef}
        className="relative flex-1 min-h-0 overflow-x-auto overflow-y-auto"
        onScroll={handleScroll}
      >
        <div className="relative min-w-full min-h-full">
          {/* Top ruler */}
          <Ruler durationMs={durationMs} zoom={zoom} scrollLeft={scrollLeft} onSeek={seek} />

          {/* Layer and property tracks */}
          <TrackList durationMs={durationMs} zoom={zoom} onSeek={seek} />

          {/* Scrubber Playhead */}
          <Playhead
            currentTimeMs={currentTimeMs}
            durationMs={durationMs}
            zoom={zoom}
            trackHeight={200}
            onSeek={seek}
          />

          {/* Empty state when no animation tracks exist */}
          {showEmpty && <EmptyState onDismiss={() => setEmptyDismissed(true)} />}
        </div>
      </div>

      {/* Bottom control bar */}
      <Controls onClose={handleClose} />
    </div>
  )
}
