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
    { value: 'ON_CLICK', label: panels.prototypeOnClick },
    { value: 'ON_HOVER', label: panels.prototypeOnHover },
    { value: 'AFTER_TIMEOUT', label: panels.prototypeAfterDelay }
  ]
  const actionOptions: { value: PrototypeActionType; label: string }[] = [
    { value: 'NAVIGATE', label: panels.prototypeNavigateTo },
    { value: 'BACK', label: panels.prototypeBack },
    { value: 'OPEN_URL', label: panels.prototypeOpenUrl },
    ...(variantTargets.length > 0
      ? [{ value: 'CHANGE_TO' as const, label: panels.prototypeChangeTo }]
      : [])
  ]
  const transitionOptions: { value: PrototypeTransition; label: string }[] = [
    { value: 'INSTANT', label: panels.prototypeTransitionInstant },
    { value: 'DISSOLVE', label: panels.prototypeTransitionDissolve },
    { value: 'SLIDE_FROM_LEFT', label: panels.prototypeTransitionSlideLeft },
    { value: 'SLIDE_FROM_RIGHT', label: panels.prototypeTransitionSlideRight },
    { value: 'SLIDE_FROM_TOP', label: panels.prototypeTransitionSlideTop },
    { value: 'SLIDE_FROM_BOTTOM', label: panels.prototypeTransitionSlideBottom }
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

                {reaction.action === 'NAVIGATE' && (
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

                {reaction.action !== 'OPEN_URL' && (
                  <>
                    <AppSelect
                      label={panels.prototypeTransition}
                      options={transitionOptions}
                      value={reaction.transition}
                      onValueChange={(transition) => updateReaction(index, { transition })}
                    />
                    {reaction.transition !== 'INSTANT' && (
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
                    )}
                  </>
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
