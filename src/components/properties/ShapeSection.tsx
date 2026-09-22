/* eslint-disable openweave/no-hardcoded-tip-labels */
import {
  RotateCw,
  Star,
  Triangle,
  Combine,
  CopyMinus,
  SquaresIntersect,
  CopyX,
  ListCollapse,
  Percent
} from 'lucide-react'
import React from 'react'

import { useEditor, useSelectionState, useI18n, useEditorCommands } from '@openweave/react'
import type { ArcData } from '@openweave/scene-graph'

import NumberField from '@/components/inputs/NumberField'
import IconButton from '@/components/ui/IconButton'
import PanelGrid from '@/components/ui/panel/PanelGrid'
import PanelSection from '@/components/ui/panel/PanelSection'
import Tip from '@/components/ui/Tip'

export default function ShapeSection() {
  const editor = useEditor()
  const { selectedNode: node } = useSelectionState()
  const { commands } = useI18n()
  const { runCommand, getCommand } = useEditorCommands()
  const flattenCmd = getCommand('selection.flatten')

  if (!node) return null

  const isEllipse = node.type === 'ELLIPSE'
  const isPolygon = node.type === 'POLYGON'
  const isStar = node.type === 'STAR'
  const isBoolean = node.type === 'BOOLEAN_OPERATION'

  if (!isEllipse && !isPolygon && !isStar && !isBoolean) return null

  // Boolean operation group
  if (isBoolean) {
    const currentOp = node.booleanOperation ?? 'UNION'

    const operations = [
      {
        id: 'UNION' as const,
        label: commands.unionSelection,
        icon: <Combine className="size-3.5" />
      },
      {
        id: 'SUBTRACT' as const,
        label: commands.subtractSelection,
        icon: <CopyMinus className="size-3.5" />
      },
      {
        id: 'INTERSECT' as const,
        label: commands.intersectSelection,
        icon: <SquaresIntersect className="size-3.5" />
      },
      {
        id: 'EXCLUDE' as const,
        label: commands.excludeSelection,
        icon: <CopyX className="size-3.5" />
      }
    ]

    return (
      <PanelSection
        label={commands.booleanOperations}
        actions={
          flattenCmd.enabled ? (
            <Tip label={commands.flattenSelection}>
              <IconButton
                label={commands.flattenSelection}
                size="md"
                onClick={() => runCommand('selection.flatten')}
              >
                <ListCollapse className="size-3.5" />
              </IconButton>
            </Tip>
          ) : undefined
        }
      >
        <div
          role="group"
          aria-label={commands.booleanOperations}
          className="inline-flex items-center gap-0.5 rounded bg-panel-field p-0.5"
        >
          {operations.map((op) => (
            <Tip key={op.id} label={op.label}>
              <IconButton
                label={op.label}
                size="md"
                active={currentOp === op.id}
                onClick={() =>
                  editor.updateNodeWithUndo(
                    node.id,
                    { booleanOperation: op.id },
                    'Change boolean operation'
                  )
                }
              >
                {op.icon}
              </IconButton>
            </Tip>
          ))}
        </div>
      </PanelSection>
    )
  }

  // Polygon
  if (isPolygon) {
    const count = node.pointCount ?? 3

    return (
      <PanelSection label="Polygon">
        <PanelGrid columns={1}>
          <Tip label="Sides">
            <NumberField
              ariaLabel="Sides"
              icon={<Triangle className="size-3" />}
              value={count}
              min={3}
              max={60}
              step={1}
              onChange={(v) =>
                editor.updateNode(node.id, { pointCount: Math.max(3, Math.min(60, Math.round(v))) })
              }
              onCommit={(v) =>
                editor.updateNodeWithUndo(
                  node.id,
                  { pointCount: Math.max(3, Math.min(60, Math.round(v))) },
                  'Change polygon sides'
                )
              }
            />
          </Tip>
        </PanelGrid>
      </PanelSection>
    )
  }

  // Star
  if (isStar) {
    const count = node.pointCount ?? 5
    const ratio = Math.round((node.starInnerRadius ?? 0.382) * 100)

    return (
      <PanelSection label="Star">
        <PanelGrid columns={2}>
          <Tip label="Points">
            <NumberField
              ariaLabel="Points"
              icon={<Star className="size-3" />}
              value={count}
              min={3}
              max={60}
              step={1}
              onChange={(v) =>
                editor.updateNode(node.id, { pointCount: Math.max(3, Math.min(60, Math.round(v))) })
              }
              onCommit={(v) =>
                editor.updateNodeWithUndo(
                  node.id,
                  { pointCount: Math.max(3, Math.min(60, Math.round(v))) },
                  'Change star points'
                )
              }
            />
          </Tip>
          <Tip label="Ratio">
            <NumberField
              ariaLabel="Ratio"
              icon={<Percent className="size-3" />}
              suffix="%"
              value={ratio}
              min={0}
              max={100}
              step={1}
              onChange={(v) =>
                editor.updateNode(node.id, {
                  starInnerRadius: Math.max(0, Math.min(1, v / 100))
                })
              }
              onCommit={(v) =>
                editor.updateNodeWithUndo(
                  node.id,
                  { starInnerRadius: Math.max(0, Math.min(1, v / 100)) },
                  'Change star ratio'
                )
              }
            />
          </Tip>
        </PanelGrid>
      </PanelSection>
    )
  }

  // Ellipse / Arc
  if (isEllipse) {
    const arc = node.arcData
    const startDeg = arc ? Math.round(arc.startingAngle * (180 / Math.PI)) : 0
    const sweepDeg = arc ? Math.round((arc.endingAngle - arc.startingAngle) * (180 / Math.PI)) : 360
    const ratio = arc ? Math.round(arc.innerRadius * 100) : 0

    const updateArc = (
      newStart: number,
      newSweep: number,
      newRatio: number,
      undoLabel?: string
    ) => {
      const clampedSweep = Math.max(-360, Math.min(360, newSweep))
      const clampedRatio = Math.max(0, Math.min(99, newRatio)) / 100
      const startRad = (newStart * Math.PI) / 180
      const sweepRad = (clampedSweep * Math.PI) / 180

      const arcData: ArcData | null =
        Math.abs(clampedSweep) >= 360 && clampedRatio === 0
          ? null
          : {
              startingAngle: startRad,
              endingAngle: startRad + sweepRad,
              innerRadius: clampedRatio
            }

      if (undoLabel) {
        editor.updateNodeWithUndo(node.id, { arcData }, undoLabel)
      } else {
        editor.updateNode(node.id, { arcData })
      }
    }

    return (
      <PanelSection
        label="Arc"
        actions={
          arc ? (
            <Tip label="Reset to full circle">
              <IconButton
                label="Reset to full circle"
                size="md"
                onClick={() =>
                  editor.updateNodeWithUndo(node.id, { arcData: null }, 'Reset circle')
                }
              >
                <RotateCw className="size-3.5" />
              </IconButton>
            </Tip>
          ) : undefined
        }
      >
        <PanelGrid columns={3}>
          <Tip label="Starting angle">
            <NumberField
              ariaLabel="Starting angle"
              suffix="°"
              value={startDeg}
              onChange={(v) => updateArc(v, sweepDeg, ratio)}
              onCommit={(v) => updateArc(v, sweepDeg, ratio, 'Change starting angle')}
            />
          </Tip>
          <Tip label="Sweep angle">
            <NumberField
              ariaLabel="Sweep angle"
              suffix="°"
              min={-360}
              max={360}
              value={sweepDeg}
              onChange={(v) => updateArc(startDeg, v, ratio)}
              onCommit={(v) => updateArc(startDeg, v, ratio, 'Change sweep angle')}
            />
          </Tip>
          <Tip label="Ratio (hole)">
            <NumberField
              ariaLabel="Ratio"
              icon={<Percent className="size-3" />}
              suffix="%"
              min={0}
              max={99}
              value={ratio}
              onChange={(v) => updateArc(startDeg, sweepDeg, v)}
              onCommit={(v) => updateArc(startDeg, sweepDeg, v, 'Change arc ratio')}
            />
          </Tip>
        </PanelGrid>
      </PanelSection>
    )
  }

  return null
}
