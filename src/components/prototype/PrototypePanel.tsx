import {
  ArrowRight,
  Clock,
  Hand,
  MousePointer,
  Play,
  Plus,
  RotateCw,
  Smartphone,
  Sparkles,
  Trash2,
  Zap
} from 'lucide-react'
import React, { useState } from 'react'

import { DEVICE_PRESET_OPTIONS, DEVICE_SPECS } from '@openweave/core/editor'
import type { DevicePresetId } from '@openweave/core/editor'
import { useI18n, useSceneComputed, useSelectionState } from '@openweave/react'
import type {
  DeviceRotation,
  PrototypeDevice,
  PrototypeReaction,
  PrototypeTrigger,
  SceneNode
} from '@openweave/scene-graph'

import { useEditorStore } from '@/app/editor/active-store'
import InteractionDetailsPopover from '@/components/prototype/InteractionDetailsPopover'
import PrototypePlayer from '@/components/prototype/PrototypePlayer'
import { AppSelect } from '@/components/ui/AppSelect'
import PanelSection from '@/components/ui/panel/PanelSection'
import Tip from '@/components/ui/Tip'

const NEW_REACTION: Omit<PrototypeReaction, 'destinationId'> = {
  trigger: 'ON_CLICK',
  timeout: 800,
  action: 'NAVIGATE',
  url: '',
  transition: 'INSTANT',
  transitionDuration: 300
}

function getTriggerIcon(trigger: PrototypeTrigger) {
  switch (trigger) {
    case 'ON_CLICK':
      return MousePointer
    case 'ON_HOVER':
    case 'WHILE_PRESSING':
      return Hand
    case 'AFTER_TIMEOUT':
      return Clock
    default:
      return Zap
  }
}

function getTriggerName(trigger: PrototypeTrigger, timeout: number): string {
  switch (trigger) {
    case 'ON_CLICK':
      return 'Click'
    case 'ON_HOVER':
      return 'Hover'
    case 'WHILE_PRESSING':
      return 'Press'
    case 'ON_DRAG':
      return 'Drag'
    case 'AFTER_TIMEOUT':
      return `Delay ${timeout}ms`
    case 'KEY_DOWN':
      return 'Key'
    case 'MOUSE_ENTER':
      return 'Mouse enter'
    case 'MOUSE_LEAVE':
      return 'Mouse leave'
    default:
      return 'Trigger'
  }
}

function getDestinationName(
  reaction: PrototypeReaction,
  store: ReturnType<typeof useEditorStore>,
  variantTargets: { value: string; label: string }[]
): string {
  if (reaction.action === 'BACK') return 'Back'
  if (reaction.action === 'OPEN_URL') {
    return reaction.url ? reaction.url.replace(/^https?:\/\//, '') : 'Link'
  }
  if (reaction.action === 'CLOSE_OVERLAY') return 'Close overlay'
  if (reaction.action === 'CHANGE_TO') {
    const found = variantTargets.find((v) => v.value === reaction.destinationId)
    return found ? found.label : 'Variant'
  }
  if (reaction.destinationId) {
    const target = store.graph.getNode(reaction.destinationId)
    if (target?.name) return target.name
  }
  return 'None'
}

function getTransitionBadge(reaction: PrototypeReaction): { label: string; isSmart: boolean } {
  const { transition, transitionDuration } = reaction
  if (transition === 'INSTANT') return { label: 'Instant', isSmart: false }
  if (transition === 'DISSOLVE')
    return { label: `Dissolve • ${transitionDuration}ms`, isSmart: false }
  if (transition === 'SMART_ANIMATE') {
    return { label: `Smart animate • ${transitionDuration}ms`, isSmart: true }
  }
  if (transition.startsWith('SLIDE_FROM_')) {
    return { label: `Slide • ${transitionDuration}ms`, isSmart: false }
  }
  if (transition.startsWith('PUSH_')) {
    return { label: `Push • ${transitionDuration}ms`, isSmart: false }
  }
  if (transition.startsWith('MOVE_IN_')) {
    return { label: `Move in • ${transitionDuration}ms`, isSmart: false }
  }
  if (transition.startsWith('MOVE_OUT_')) {
    return { label: `Move out • ${transitionDuration}ms`, isSmart: false }
  }
  return { label: `${transitionDuration}ms`, isSmart: false }
}

/** Top-level ancestor of a node on the current page (the node itself if top-level). */
function topLevelAncestor(store: ReturnType<typeof useEditorStore>, node: SceneNode): SceneNode {
  let current = node
  while (current.parentId && current.parentId !== store.state.currentPageId) {
    const parent = store.graph.getNode(current.parentId)
    if (!parent) break
    current = parent
  }
  return current
}

export default function PrototypePanel() {
  const store = useEditorStore()
  const { panels } = useI18n()
  const { selectedNode: node } = useSelectionState()
  const [presenting, setPresenting] = useState(false)
  const [activeReactionIndex, setActiveReactionIndex] = useState<number | null>(null)

  const topLevelNodes = useSceneComputed(() =>
    store.graph.getChildren(store.state.currentPageId).filter((n) => n.visible)
  )
  const flowStartId = useSceneComputed(
    () => store.graph.getNode(store.state.currentPageId)?.prototypeStartNodeId ?? null
  )

  const ownTopLevelId = node ? topLevelAncestor(store, node).id : null
  const destinationOptions = [
    { value: '', label: panels.prototypeNone },
    ...topLevelNodes
      .filter((n) => n.id !== ownTopLevelId)
      .map((n) => ({ value: n.id, label: n.name }))
  ]

  // Interactive components: sibling variants the selected instance can
  // "Change to" (only offered for instances whose component sits in a set).
  const variantTargets = useSceneComputed<{ value: string; label: string }[]>(() => {
    void store.state.sceneVersion
    if (node?.type !== 'INSTANCE' || !node.componentId) return []
    const component = store.graph.getNode(node.componentId)
    const set = component?.parentId ? store.graph.getNode(component.parentId) : null
    if (set?.type !== 'COMPONENT_SET') return []
    return set.childIds
      .map((id) => store.graph.getNode(id))
      .filter((c): c is SceneNode => c?.type === 'COMPONENT' && c.id !== node.componentId)
      .map((c) => ({ value: c.id, label: c.name }))
  })

  function setReactions(reactions: PrototypeReaction[], label: string) {
    if (!node) return
    store.updateNodeWithUndo(node.id, { reactions }, label)
  }

  function addReaction() {
    if (!node) return
    const firstOther = destinationOptions.find((o) => o.value !== '')?.value ?? null
    const newReaction = { ...NEW_REACTION, destinationId: firstOther || null }
    const newReactions = [...node.reactions, newReaction]
    setReactions(newReactions, 'Add interaction')
    setActiveReactionIndex(newReactions.length - 1)
  }

  function updateReaction(index: number, patch: Partial<PrototypeReaction>) {
    if (!node) return
    const reactions = node.reactions.map((reaction, i) =>
      i === index ? { ...reaction, ...patch } : reaction
    )
    setReactions(reactions, 'Edit interaction')
  }

  function removeReaction(index: number) {
    if (!node) return
    setReactions(
      node.reactions.filter((_, i) => i !== index),
      'Remove interaction'
    )
  }

  function setFlowStart(id: string | null) {
    store.updateNodeWithUndo(
      store.state.currentPageId,
      { prototypeStartNodeId: id },
      'Set flow starting point'
    )
  }

  const currentPage = useSceneComputed(() => store.graph.getNode(store.state.currentPageId))
  const currentDevice: PrototypeDevice | null = currentPage?.prototypeDevice ?? null

  const activePreset =
    currentDevice?.type === 'NONE' ? 'none' : (currentDevice?.presetIdentifier ?? 'none')

  const activeRotation: DeviceRotation = currentDevice?.rotation ?? 'NONE'
  const activeColor: 'DARK' | 'LIGHT' | 'TITANIUM' = currentDevice?.color ?? 'DARK'

  function setDevicePreset(presetId: string) {
    const pageId = store.state.currentPageId
    if (presetId === 'none') {
      store.updateNodeWithUndo(
        pageId,
        { prototypeDevice: { type: 'NONE' } },
        'Set prototype device'
      )
      return
    }
    const spec = DEVICE_SPECS[presetId as DevicePresetId]
    if (!spec) return
    store.updateNodeWithUndo(
      pageId,
      {
        prototypeDevice: {
          type: 'PRESET',
          presetIdentifier: presetId,
          rotation: activeRotation,
          color: activeColor,
          size: { x: spec.width, y: spec.height }
        }
      },
      'Set prototype device'
    )
  }

  function setDeviceRotation(rotation: DeviceRotation) {
    const pageId = store.state.currentPageId
    store.updateNodeWithUndo(
      pageId,
      {
        prototypeDevice: {
          type: currentDevice?.type ?? 'PRESET',
          presetIdentifier: currentDevice?.presetIdentifier ?? 'iphone-16-pro',
          rotation,
          color: activeColor,
          size: currentDevice?.size
        }
      },
      'Set device orientation'
    )
  }

  function setDeviceColor(color: 'DARK' | 'LIGHT' | 'TITANIUM') {
    const pageId = store.state.currentPageId
    store.updateNodeWithUndo(
      pageId,
      {
        prototypeDevice: {
          type: currentDevice?.type ?? 'PRESET',
          presetIdentifier: currentDevice?.presetIdentifier ?? 'iphone-16-pro',
          rotation: activeRotation,
          color,
          size: currentDevice?.size
        }
      },
      'Set device material'
    )
  }

  const isTopLevel = !!node && node.parentId === store.state.currentPageId

  return (
    <div
      data-test-id="prototype-panel"
      className="scrollbar-thin flex-1 overflow-x-hidden overflow-y-auto pb-4 space-y-0"
    >
      <div className="flex items-center justify-between border-b border-border p-3">
        <span role="heading" aria-level={3} className="text-xs font-semibold text-surface">
          {panels.prototype}
        </span>
        <button
          type="button"
          data-test-id="prototype-present"
          className="flex items-center gap-1.5 rounded bg-accent px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-accent/90 disabled:opacity-40 cursor-pointer"
          disabled={topLevelNodes.length === 0}
          onClick={() => setPresenting(true)}
        >
          <Play className="size-3" />
          {panels.prototypePresent}
        </button>
      </div>

      {!node && (
        <div data-test-id="prototype-empty" className="p-3 text-[11px] text-muted">
          {topLevelNodes.length === 0 ? panels.prototypeNoFrames : panels.prototypeEmptyHint}
        </div>
      )}

      {node && (
        <PanelSection
          label={panels.prototypeInteractions}
          empty={node.reactions.length === 0}
          actions={
            <Tip label={panels.prototypeAddInteraction}>
              <button
                type="button"
                data-test-id="prototype-add-interaction"
                aria-label={panels.prototypeAddInteraction}
                className="rounded p-0.5 text-muted hover:bg-hover hover:text-surface cursor-pointer"
                onClick={addReaction}
              >
                <Plus className="size-3.5" />
              </button>
            </Tip>
          }
        >
          {node.reactions.length === 0 ? (
            <button
              type="button"
              data-test-id="prototype-add-interaction-empty"
              className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-border/80 p-3 text-xs text-muted hover:border-accent hover:text-accent hover:bg-accent/5 transition-colors cursor-pointer"
              onClick={addReaction}
            >
              <Plus className="size-3.5" />
              <span>Add interaction</span>
            </button>
          ) : (
            <div className="space-y-1.5">
              {node.reactions.map((reaction, index) => {
                const TriggerIcon = getTriggerIcon(reaction.trigger)
                const triggerName = getTriggerName(reaction.trigger, reaction.timeout)
                const destName = getDestinationName(reaction, store, variantTargets)
                const { label: transitionLabel, isSmart } = getTransitionBadge(reaction)

                return (
                  <div key={index} data-test-id="prototype-interaction">
                    <InteractionDetailsPopover
                      open={activeReactionIndex === index}
                      onOpenChange={(isOpen) => setActiveReactionIndex(isOpen ? index : null)}
                      reaction={reaction}
                      destinationOptions={destinationOptions}
                      variantTargets={variantTargets}
                      onUpdate={(patch) => updateReaction(index, patch)}
                      onRemove={() => removeReaction(index)}
                    >
                      <button
                        type="button"
                        className={`group w-full flex flex-col gap-1 rounded-lg border p-2 text-left transition-all cursor-pointer ${
                          activeReactionIndex === index
                            ? 'border-accent bg-accent/10 shadow-xs'
                            : 'border-border/60 bg-background/40 hover:border-accent/80 hover:bg-accent/5'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-xs font-medium text-surface truncate">
                            <TriggerIcon className="size-3 text-accent shrink-0" />
                            <span>{triggerName}</span>
                            <ArrowRight className="size-2.5 text-muted shrink-0" />
                            <span className="truncate text-surface/90">{destName}</span>
                          </div>
                          {/* oxlint-disable-next-line openweave/no-hardcoded-tip-labels */}
                          <Tip label="Delete interaction">
                            <button
                              type="button"
                              aria-label="Delete interaction"
                              className="opacity-0 group-hover:opacity-100 flex size-5 items-center justify-center rounded text-muted hover:text-destructive hover:bg-hover transition-opacity"
                              onClick={(e) => {
                                e.stopPropagation()
                                removeReaction(index)
                              }}
                            >
                              <Trash2 className="size-3" />
                            </button>
                          </Tip>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-mono ${
                              isSmart
                                ? 'bg-accent/20 text-accent font-medium'
                                : 'bg-panel/80 text-muted'
                            }`}
                          >
                            {isSmart && <Sparkles className="size-2.5 text-accent" />}
                            {transitionLabel}
                          </span>
                        </div>
                      </button>
                    </InteractionDetailsPopover>
                  </div>
                )
              })}
            </div>
          )}
        </PanelSection>
      )}

      {node && isTopLevel && (
        <PanelSection label={panels.prototypeFlowStart}>
          {flowStartId === node.id ? (
            <button
              type="button"
              data-test-id="prototype-clear-flow-start"
              className="w-full rounded px-2 py-1 text-left text-[11px] text-muted hover:bg-hover"
              onClick={() => setFlowStart(null)}
            >
              {panels.prototypeClearFlowStart}
            </button>
          ) : (
            <button
              type="button"
              data-test-id="prototype-set-flow-start"
              className="w-full rounded bg-accent/10 px-2 py-1 text-left text-[11px] text-accent hover:bg-accent/20"
              onClick={() => setFlowStart(node.id)}
            >
              {panels.prototypeSetFlowStart}
            </button>
          )}
        </PanelSection>
      )}

      <PanelSection label="Device">
        <div className="space-y-3 p-1">
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-muted">Model</label>
            <AppSelect
              label="Device preset"
              options={DEVICE_PRESET_OPTIONS}
              value={activePreset}
              onValueChange={setDevicePreset}
            />
          </div>

          {activePreset !== 'none' && (
            <>
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-muted">Orientation</label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    data-test-id="prototype-orientation-portrait"
                    className={`flex items-center justify-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                      activeRotation === 'NONE'
                        ? 'border-accent bg-accent/15 text-accent'
                        : 'border-border/60 text-muted hover:border-border hover:text-surface'
                    }`}
                    onClick={() => setDeviceRotation('NONE')}
                  >
                    <Smartphone className="size-3.5" />
                    <span>Portrait</span>
                  </button>
                  <button
                    type="button"
                    data-test-id="prototype-orientation-landscape"
                    className={`flex items-center justify-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                      activeRotation === 'CCW_90'
                        ? 'border-accent bg-accent/15 text-accent'
                        : 'border-border/60 text-muted hover:border-border hover:text-surface'
                    }`}
                    onClick={() => setDeviceRotation('CCW_90')}
                  >
                    <RotateCw className="size-3.5" />
                    <span>Landscape</span>
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-muted">Finish</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    data-test-id="prototype-color-dark"
                    aria-label="Space Black"
                    className={`flex size-7 items-center justify-center rounded-full border transition-all cursor-pointer ${
                      activeColor === 'DARK'
                        ? 'border-accent ring-2 ring-accent/30 scale-105'
                        : 'border-border/60 hover:border-surface/60'
                    }`}
                    onClick={() => setDeviceColor('DARK')}
                  >
                    <span className="size-4 rounded-full bg-[#18181b] shadow-xs" />
                  </button>
                  <button
                    type="button"
                    data-test-id="prototype-color-light"
                    aria-label="Silver"
                    className={`flex size-7 items-center justify-center rounded-full border transition-all cursor-pointer ${
                      activeColor === 'LIGHT'
                        ? 'border-accent ring-2 ring-accent/30 scale-105'
                        : 'border-border/60 hover:border-surface/60'
                    }`}
                    onClick={() => setDeviceColor('LIGHT')}
                  >
                    <span className="size-4 rounded-full bg-[#e4e4e7] border border-black/10 shadow-xs" />
                  </button>
                  <button
                    type="button"
                    data-test-id="prototype-color-titanium"
                    aria-label="Natural Titanium"
                    className={`flex size-7 items-center justify-center rounded-full border transition-all cursor-pointer ${
                      activeColor === 'TITANIUM'
                        ? 'border-accent ring-2 ring-accent/30 scale-105'
                        : 'border-border/60 hover:border-surface/60'
                    }`}
                    onClick={() => setDeviceColor('TITANIUM')}
                  >
                    <span className="size-4 rounded-full bg-[#78716c] shadow-xs" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </PanelSection>

      {presenting && <PrototypePlayer onClose={() => setPresenting(false)} />}
    </div>
  )
}
