import { createLucideIcon } from 'lucide-react'
import React from 'react'
import { tv } from 'tailwind-variants'

import { useI18n, useLayoutControlsContext } from '@openweave/react'

import Tip from '@/components/ui/Tip'
import segmentedControlTheme from '@/theme/segmented-control'

const segmentedControl = tv(segmentedControlTheme)

const WrapIcon = createLucideIcon('WrapIcon', [
  ['rect', { x: '2', y: '2', width: '3.8', height: '3.8', rx: '1', key: 'r1' }],
  ['rect', { x: '2', y: '8.2', width: '3.8', height: '3.8', rx: '1', key: 'r2' }],
  ['rect', { x: '8.2', y: '8.2', width: '3.8', height: '3.8', rx: '1', key: 'r3' }]
])

const VerticalFlowIcon = createLucideIcon('VerticalFlowIcon', [
  ['rect', { x: '2', y: '2', width: '3.8', height: '3.8', rx: '1', key: 'r1' }],
  ['rect', { x: '2', y: '8.2', width: '3.8', height: '3.8', rx: '1', key: 'r2' }],
  ['path', { d: 'M10 3.5v7M8 8.5l2 2 2-2', key: 'p1' }]
])

const HorizontalFlowIcon = createLucideIcon('HorizontalFlowIcon', [
  ['rect', { x: '2', y: '2', width: '3.8', height: '3.8', rx: '1', key: 'r1' }],
  ['rect', { x: '8.2', y: '2', width: '3.8', height: '3.8', rx: '1', key: 'r2' }],
  ['path', { d: 'M3.5 10h7M8.5 8l2 2-2 2', key: 'p1' }]
])

const GridFlowIcon = createLucideIcon('GridFlowIcon', [
  ['rect', { x: '2', y: '2', width: '3.8', height: '3.8', rx: '1', key: 'r1' }],
  ['rect', { x: '8.2', y: '2', width: '3.8', height: '3.8', rx: '1', key: 'r2' }],
  ['rect', { x: '2', y: '8.2', width: '3.8', height: '3.8', rx: '1', key: 'r3' }],
  ['rect', { x: '8.2', y: '8.2', width: '3.8', height: '3.8', rx: '1', key: 'r4' }]
])

/**
 * Flow selector matching Figma UI3: Wrap, Vertical, Horizontal, Grid.
 * Full-width segmented control with exact icons and accessible labels.
 */
export default function AutoLayoutControls() {
  const ctx = useLayoutControlsContext()
  const { panels } = useI18n()
  const { node, editor } = ctx
  const styles = segmentedControl({ size: 'sm' })

  const isWrapActive = node.layoutWrap === 'WRAP'
  const isVerticalActive = node.layoutMode === 'VERTICAL' && !isWrapActive
  const isHorizontalActive = node.layoutMode === 'HORIZONTAL' && !isWrapActive
  const isGridActive = node.layoutMode === 'GRID'

  function setWrap() {
    const targetMode =
      node.layoutMode === 'GRID' || node.layoutMode === 'NONE' ? 'HORIZONTAL' : node.layoutMode
    editor.updateNodeWithUndo(
      node.id,
      { layoutMode: targetMode, layoutWrap: 'WRAP' },
      'Set wrap layout'
    )
  }

  function setVertical() {
    editor.updateNodeWithUndo(
      node.id,
      { layoutMode: 'VERTICAL', layoutWrap: 'NO_WRAP' },
      'Set vertical layout'
    )
  }

  function setHorizontal() {
    editor.updateNodeWithUndo(
      node.id,
      { layoutMode: 'HORIZONTAL', layoutWrap: 'NO_WRAP' },
      'Set horizontal layout'
    )
  }

  function setGrid() {
    editor.updateNodeWithUndo(
      node.id,
      { layoutMode: 'GRID', layoutWrap: 'NO_WRAP' },
      'Set grid layout'
    )
  }

  return (
    <div>
      <label className="mb-1 block text-[11px] text-muted">{panels.flow}</label>
      <div role="group" aria-label={panels.flow} className={`${styles.root()} w-full`}>
        <Tip label={panels.layoutWrap}>
          <button
            type="button"
            aria-label={panels.layoutWrap}
            data-state={isWrapActive ? 'on' : 'off'}
            className={styles.item()}
            onClick={setWrap}
          >
            <WrapIcon />
          </button>
        </Tip>

        <Tip label={panels.layoutVertical}>
          <button
            type="button"
            aria-label={panels.layoutVertical}
            data-state={isVerticalActive ? 'on' : 'off'}
            className={styles.item()}
            onClick={setVertical}
          >
            <VerticalFlowIcon />
          </button>
        </Tip>

        <Tip label={panels.layoutHorizontal}>
          <button
            type="button"
            aria-label={panels.layoutHorizontal}
            data-state={isHorizontalActive ? 'on' : 'off'}
            className={styles.item()}
            onClick={setHorizontal}
          >
            <HorizontalFlowIcon />
          </button>
        </Tip>

        <Tip label={panels.layoutGrid}>
          <button
            type="button"
            aria-label={panels.layoutGrid}
            data-state={isGridActive ? 'on' : 'off'}
            className={styles.item()}
            onClick={setGrid}
          >
            <GridFlowIcon />
          </button>
        </Tip>
      </div>
    </div>
  )
}
