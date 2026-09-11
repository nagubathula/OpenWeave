import { Play, Plus, Trash2 } from 'lucide-react'
import React, { useState } from 'react'

import { useI18n, useSceneComputed, useSelectionState } from '@openweave/react'
import type {
  PrototypeActionType,
  PrototypeReaction,
  PrototypeTransition,
  PrototypeTrigger,
  SceneNode
} from '@openweave/scene-graph'

import { useEditorStore } from '@/app/editor/active-store'
import NumberField from '@/components/inputs/NumberField'
import PrototypePlayer from '@/components/prototype/PrototypePlayer'
import SpringCurveEditor from '@/components/prototype/SpringCurveEditor'
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

const inputClass =
  'w-full bg-input/50 rounded px-2 py-1 border border-border text-surface text-xs outline-none focus:border-accent'

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

  const triggerOptions: { value: PrototypeTrigger; label: string }[] = [
    { value: 'ON_CLICK', label: panels.prototypeOnClick ?? 'On click' },
    { value: 'ON_HOVER', label: panels.prototypeOnHover ?? 'While hovering' },
    { value: 'WHILE_PRESSING', label: 'While pressing' },
    { value: 'ON_DRAG', label: 'On drag' },
    { value: 'MOUSE_ENTER', label: 'Mouse enter' },
    { value: 'MOUSE_LEAVE', label: 'Mouse leave' },
    { value: 'KEY_DOWN', label: 'Key / gamepad' },
    { value: 'AFTER_TIMEOUT', label: panels.prototypeAfterDelay ?? 'After delay' }
  ]
  const actionOptions: { value: PrototypeActionType; label: string }[] = [
    { value: 'NAVIGATE', label: panels.prototypeNavigateTo ?? 'Navigate to' },
    { value: 'BACK', label: panels.prototypeBack ?? 'Back' },
    { value: 'OPEN_OVERLAY', label: 'Open overlay' },
    { value: 'SWAP_OVERLAY', label: 'Swap overlay' },
    { value: 'CLOSE_OVERLAY', label: 'Close overlay' },
    { value: 'SCROLL_TO', label: 'Scroll to' },
    { value: 'OPEN_URL', label: panels.prototypeOpenUrl ?? 'Open link' },
    { value: 'SET_VARIABLE', label: 'Set variable' },
    { value: 'CONDITIONAL', label: 'Conditional' },
    ...(variantTargets.length > 0
      ? [{ value: 'CHANGE_TO' as const, label: panels.prototypeChangeTo ?? 'Change to' }]
      : [])
  ]
  const transitionOptions: { value: PrototypeTransition; label: string }[] = [
    { value: 'INSTANT', label: panels.prototypeTransitionInstant ?? 'Instant' },
    { value: 'DISSOLVE', label: panels.prototypeTransitionDissolve ?? 'Dissolve' },
    { value: 'SMART_ANIMATE', label: 'Smart animate' },
    {
      value: 'SLIDE_FROM_LEFT',
      label: panels.prototypeTransitionSlideLeft ?? 'Slide in from left'
    },
    {
      value: 'SLIDE_FROM_RIGHT',
      label: panels.prototypeTransitionSlideRight ?? 'Slide in from right'
    },
    { value: 'SLIDE_FROM_TOP', label: panels.prototypeTransitionSlideTop ?? 'Slide in from top' },
    {
      value: 'SLIDE_FROM_BOTTOM',
      label: panels.prototypeTransitionSlideBottom ?? 'Slide in from bottom'
    },
    { value: 'PUSH_LEFT', label: 'Push left' },
    { value: 'PUSH_RIGHT', label: 'Push right' },
    { value: 'PUSH_TOP', label: 'Push top' },
    { value: 'PUSH_BOTTOM', label: 'Push bottom' },
    { value: 'MOVE_IN_LEFT', label: 'Move in from left' },
    { value: 'MOVE_IN_RIGHT', label: 'Move in from right' },
    { value: 'MOVE_IN_TOP', label: 'Move in from top' },
    { value: 'MOVE_IN_BOTTOM', label: 'Move in from bottom' },
    { value: 'MOVE_OUT_LEFT', label: 'Move out to left' },
    { value: 'MOVE_OUT_RIGHT', label: 'Move out to right' },
    { value: 'MOVE_OUT_TOP', label: 'Move out to top' },
    { value: 'MOVE_OUT_BOTTOM', label: 'Move out to bottom' }
  ]

  function setReactions(reactions: PrototypeReaction[], label: string) {
    if (!node) return
    store.updateNodeWithUndo(node.id, { reactions }, label)
  }

  function addReaction() {
    if (!node) return
    const firstOther = destinationOptions.find((o) => o.value !== '')?.value ?? null
    setReactions(
      [...node.reactions, { ...NEW_REACTION, destinationId: firstOther || null }],
      'Add interaction'
    )
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
          className="flex items-center gap-1.5 rounded bg-accent px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-accent/90 disabled:opacity-40"
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
                className="rounded p-0.5 text-muted hover:bg-hover hover:text-surface"
                onClick={addReaction}
              >
                <Plus className="size-3.5" />
              </button>
            </Tip>
          }
        >
          <div className="space-y-3">
            {node.reactions.map((reaction, index) => (
              <div
                key={index}
                data-test-id="prototype-interaction"
                className="space-y-2 rounded border border-border p-2"
              >
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <AppSelect
                      label={panels.prototypeTrigger}
                      options={triggerOptions}
                      value={reaction.trigger}
                      onValueChange={(trigger) => updateReaction(index, { trigger })}
                    />
                  </div>
                  <Tip label={panels.prototypeRemoveInteraction}>
                    <button
                      type="button"
                      aria-label={panels.prototypeRemoveInteraction}
                      className="rounded p-1 text-muted hover:bg-hover hover:text-surface"
                      onClick={() => removeReaction(index)}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </Tip>
                </div>

                {reaction.trigger === 'AFTER_TIMEOUT' && (
                  <NumberField
                    label={panels.prototypeDelay}
                    value={reaction.timeout}
                    min={0}
                    step={100}
                    suffix="ms"
                    onChange={(timeout) => updateReaction(index, { timeout })}
                  />
                )}

                <AppSelect
                  label={panels.prototypeAction}
                  options={actionOptions}
                  value={reaction.action}
                  onValueChange={(action) => updateReaction(index, { action })}
                />

                {['NAVIGATE', 'OPEN_OVERLAY', 'SWAP_OVERLAY', 'SCROLL_TO'].includes(
                  reaction.action
                ) && (
                  <AppSelect
                    label={panels.prototypeDestination}
                    options={destinationOptions}
                    value={reaction.destinationId ?? ''}
                    onValueChange={(destinationId) =>
                      updateReaction(index, { destinationId: destinationId || null })
                    }
                  />
                )}

                {reaction.action === 'CHANGE_TO' && (
                  <AppSelect
                    label={panels.prototypeDestination}
                    options={[{ value: '', label: panels.prototypeNone }, ...variantTargets]}
                    value={reaction.destinationId ?? ''}
                    onValueChange={(destinationId) =>
                      updateReaction(index, { destinationId: destinationId || null })
                    }
                  />
                )}

                {reaction.action === 'OPEN_URL' && (
                  <input
                    type="text"
                    aria-label={panels.prototypeUrl}
                    placeholder="https://"
                    className={inputClass}
                    value={reaction.url}
                    onChange={(e) => updateReaction(index, { url: e.target.value })}
                  />
                )}

                {['NAVIGATE', 'CHANGE_TO', 'OPEN_OVERLAY', 'SWAP_OVERLAY'].includes(
                  reaction.action
                ) && (
                  <>
                    <AppSelect
                      label={panels.prototypeTransition}
                      options={transitionOptions}
                      value={reaction.transition}
                      onValueChange={(transition) => updateReaction(index, { transition })}
                    />
                    {reaction.transition !== 'INSTANT' && (
                      <>
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <AppSelect
                              label="Easing"
                              options={[
                                { value: 'SPRING', label: 'Spring (physics)' },
                                { value: 'EASE_OUT', label: 'Ease out' },
                                { value: 'EASE_IN_AND_OUT', label: 'Ease in & out' },
                                { value: 'EASE_IN', label: 'Ease in' },
                                { value: 'LINEAR', label: 'Linear' },
                                { value: 'CUSTOM_CUBIC', label: 'Custom' }
                              ]}
                              value={
                                reaction.easing ??
                                (reaction.transition === 'SMART_ANIMATE' ? 'SPRING' : 'EASE_OUT')
                              }
                              onValueChange={(easing) => updateReaction(index, { easing })}
                            />
                          </div>
                          <NumberField
                            label={panels.prototypeDuration}
                            value={reaction.transitionDuration}
                            min={0}
                            max={5000}
                            step={50}
                            suffix="ms"
                            onChange={(transitionDuration) =>
                              updateReaction(index, { transitionDuration })
                            }
                          />
                        </div>

                        {(reaction.easing === 'SPRING' ||
                          (!reaction.easing && reaction.transition === 'SMART_ANIMATE')) && (
                          <SpringCurveEditor
                            preset={reaction.springPreset ?? 'BOUNCY'}
                            config={reaction.springConfig}
                            onPresetChange={(springPreset) =>
                              updateReaction(index, { springPreset, easing: 'SPRING' })
                            }
                            onConfigChange={(springConfig) =>
                              updateReaction(index, { springConfig, easing: 'SPRING' })
                            }
                            onDurationSuggest={(transitionDuration) =>
                              updateReaction(index, { transitionDuration })
                            }
                          />
                        )}
                      </>
                    )}
                  </>
                )}

                {['OPEN_OVERLAY', 'SWAP_OVERLAY'].includes(reaction.action) && (
                  <div className="space-y-2 mt-2 pt-2 border-t border-border">
                    <AppSelect
                      label="Position"
                      options={[
                        { value: 'CENTER', label: 'Center' },
                        { value: 'TOP_LEFT', label: 'Top left' },
                        { value: 'TOP_CENTER', label: 'Top center' },
                        { value: 'TOP_RIGHT', label: 'Top right' },
                        { value: 'BOTTOM_LEFT', label: 'Bottom left' },
                        { value: 'BOTTOM_CENTER', label: 'Bottom center' },
                        { value: 'BOTTOM_RIGHT', label: 'Bottom right' },
                        { value: 'MANUAL', label: 'Manual' }
                      ]}
                      value={reaction.overlayPosition ?? 'CENTER'}
                      onValueChange={(overlayPosition) =>
                        updateReaction(index, { overlayPosition })
                      }
                    />
                    <label className="flex items-center gap-2 text-[11px] text-surface">
                      <input
                        type="checkbox"
                        className="rounded border-border bg-input/50"
                        checked={reaction.overlayCloseOnClickOutside ?? true}
                        onChange={(e) =>
                          updateReaction(index, { overlayCloseOnClickOutside: e.target.checked })
                        }
                      />
                      Close when clicking outside
                    </label>
                    <label className="flex items-center gap-2 text-[11px] text-surface">
                      <input
                        type="checkbox"
                        className="rounded border-border bg-input/50"
                        checked={reaction.overlayBackgroundScrim ?? false}
                        onChange={(e) =>
                          updateReaction(index, { overlayBackgroundScrim: e.target.checked })
                        }
                      />
                      Add background behind overlay
                    </label>
                  </div>
                )}
              </div>
            ))}
          </div>
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

      {presenting && <PrototypePlayer onClose={() => setPresenting(false)} />}
    </div>
  )
}
