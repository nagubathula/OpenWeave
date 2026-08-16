import React from 'react'
import { useI18n, useLayoutControlsContext } from '@openweave/react'
import type { GridTrackSizing } from '@openweave/scene-graph'
import { MoveHorizontal, MoveVertical, Plus, X } from 'lucide-react'

import { AppSelect } from '@/components/ui/AppSelect'
import IconButton from '@/components/ui/IconButton'
import NumberField from '@/components/inputs/NumberField'
import type { GridTrackProp } from '@/components/properties/LayoutSection/types'

const TRACK_PROPS: GridTrackProp[] = ['gridTemplateColumns', 'gridTemplateRows']

function defaultTrackValue(sizing: GridTrackSizing): number {
  if (sizing === 'FR') return 1
  if (sizing === 'FIXED') return 100
  return 0
}

/** Grid-mode controls: column/row track editor plus column/row gap. */
export default function GridControls() {
  const ctx = useLayoutControlsContext()
  const { panels } = useI18n()
  const { node } = ctx

  return (
    <>
      {TRACK_PROPS.map((trackProp) => (
        <div className="mt-2" key={trackProp}>
          <div className="mb-1 flex items-center justify-between">
            <label className="text-[11px] text-muted">
              {trackProp === 'gridTemplateColumns' ? panels.columns : panels.rows}
            </label>
            <IconButton onClick={() => ctx.addTrack(trackProp)}>
              <Plus className="size-3.5" />
            </IconButton>
          </div>
          <div className="flex flex-col gap-1">
            {node[trackProp].map((track, i) => (
              <div className="flex items-center gap-1" key={i}>
                {track.sizing !== 'AUTO' ? (
                  <NumberField
                    className="flex-1"
                    icon={`${trackProp === 'gridTemplateColumns' ? 'C' : 'R'}${i + 1}`}
                    value={track.value}
                    min={track.sizing === 'FR' ? 1 : 0}
                    suffix={track.sizing === 'FR' ? 'fr' : 'px'}
                    onChange={(v) => ctx.updateGridTrack(trackProp, i, { value: v })}
                  />
                ) : (
                  <span className="flex-1 px-1 text-xs text-muted">{ctx.trackLabel(track)}</span>
                )}
                <AppSelect
                  value={track.sizing}
                  options={ctx.trackSizingOptions}
                  onValueChange={(sizing) =>
                    ctx.updateGridTrack(trackProp, i, {
                      sizing: sizing as GridTrackSizing,
                      value: defaultTrackValue(sizing as GridTrackSizing)
                    })
                  }
                />
                {node[trackProp].length > 1 && (
                  <IconButton onClick={() => ctx.removeTrack(trackProp, i)}>
                    <X className="size-3.5" />
                  </IconButton>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="mt-2 grid grid-cols-2 gap-1.5">
        <NumberField
          icon={<MoveHorizontal className="size-3" />}
          value={Math.round(node.gridColumnGap)}
          min={0}
          onChange={(v) => ctx.updateProp('gridColumnGap', v)}
          onCommit={(v, p) => ctx.commitProp('gridColumnGap', v, p)}
        />
        <NumberField
          icon={<MoveVertical className="size-3" />}
          value={Math.round(node.gridRowGap)}
          min={0}
          onChange={(v) => ctx.updateProp('gridRowGap', v)}
          onCommit={(v, p) => ctx.commitProp('gridRowGap', v, p)}
        />
      </div>
    </>
  )
}
