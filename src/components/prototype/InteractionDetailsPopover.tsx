import * as Popover from '@radix-ui/react-popover'
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Clock,
  ExternalLink,
  Layers,
  MousePointer,
  Sparkles,
  Trash2,
  X,
  Zap
} from 'lucide-react'
import React from 'react'

import type {
  OverlayPosition,
  PrototypeActionType,
  PrototypeEasing,
  PrototypeReaction,
  PrototypeTransition,
  PrototypeTrigger,
  SpringConfig,
  SpringPreset
} from '@openweave/scene-graph'

import NumberField from '@/components/inputs/NumberField'
import BezierCurveEditor from '@/components/motion/BezierCurveEditor'
import SpringCurveEditor from '@/components/prototype/SpringCurveEditor'
import { AppSelect } from '@/components/ui/AppSelect'
import Tip from '@/components/ui/Tip'

interface InteractionDetailsPopoverProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  reaction: PrototypeReaction
  destinationOptions: { value: string; label: string }[]
  variantTargets: { value: string; label: string }[]
  onUpdate: (patch: Partial<PrototypeReaction>) => void
  onRemove: () => void
  children: React.ReactNode
}

const TRIGGER_OPTIONS: { value: PrototypeTrigger; label: string }[] = [
  { value: 'ON_CLICK', label: 'On click' },
  { value: 'ON_HOVER', label: 'While hovering' },
  { value: 'WHILE_PRESSING', label: 'While pressing' },
  { value: 'ON_DRAG', label: 'On drag' },
  { value: 'MOUSE_ENTER', label: 'Mouse enter' },
  { value: 'MOUSE_LEAVE', label: 'Mouse leave' },
  { value: 'KEY_DOWN', label: 'Key / gamepad' },
  { value: 'AFTER_TIMEOUT', label: 'After delay' }
]

const ACTION_OPTIONS: { value: PrototypeActionType; label: string }[] = [
  { value: 'NAVIGATE', label: 'Navigate to' },
  { value: 'CHANGE_TO', label: 'Change to' },
  { value: 'OPEN_OVERLAY', label: 'Open overlay' },
  { value: 'SWAP_OVERLAY', label: 'Swap overlay' },
  { value: 'CLOSE_OVERLAY', label: 'Close overlay' },
  { value: 'SCROLL_TO', label: 'Scroll to' },
  { value: 'OPEN_URL', label: 'Open link' },
  { value: 'BACK', label: 'Back' },
  { value: 'SET_VARIABLE', label: 'Set variable' },
  { value: 'CONDITIONAL', label: 'Conditional' }
]

type TransitionCategory =
  | 'instant'
  | 'dissolve'
  | 'smart_animate'
  | 'slide'
  | 'push'
  | 'move_in'
  | 'move_out'
type Direction = 'left' | 'right' | 'top' | 'bottom'

function categorizeTransition(t: PrototypeTransition): {
  category: TransitionCategory
  direction?: Direction
} {
  if (t === 'INSTANT') return { category: 'instant' }
  if (t === 'DISSOLVE') return { category: 'dissolve' }
  if (t === 'SMART_ANIMATE') return { category: 'smart_animate' }
  if (t.startsWith('SLIDE_FROM_')) {
    const dir = t.replace('SLIDE_FROM_', '').toLowerCase() as Direction
    return { category: 'slide', direction: dir }
  }
  if (t.startsWith('PUSH_')) {
    const dir = t.replace('PUSH_', '').toLowerCase() as Direction
    return { category: 'push', direction: dir }
  }
  if (t.startsWith('MOVE_IN_')) {
    const dir = t.replace('MOVE_IN_', '').toLowerCase() as Direction
    return { category: 'move_in', direction: dir }
  }
  if (t.startsWith('MOVE_OUT_')) {
    const dir = t.replace('MOVE_OUT_', '').toLowerCase() as Direction
    return { category: 'move_out', direction: dir }
  }
  return { category: 'instant' }
}

function resolveTransition(
  category: TransitionCategory,
  direction: Direction = 'right'
): PrototypeTransition {
  if (category === 'instant') return 'INSTANT'
  if (category === 'dissolve') return 'DISSOLVE'
  if (category === 'smart_animate') return 'SMART_ANIMATE'
  const dirUpper = direction.toUpperCase()
  if (category === 'slide') return `SLIDE_FROM_${dirUpper}` as PrototypeTransition
  if (category === 'push') return `PUSH_${dirUpper}` as PrototypeTransition
  if (category === 'move_in') return `MOVE_IN_${dirUpper}` as PrototypeTransition
  if (category === 'move_out') return `MOVE_OUT_${dirUpper}` as PrototypeTransition
  return 'INSTANT'
}

const DURATION_PRESETS = [150, 300, 500, 800]

export default function InteractionDetailsPopover({
  open,
  onOpenChange,
  reaction,
  destinationOptions,
  variantTargets,
  onUpdate,
  onRemove,
  children
}: InteractionDetailsPopoverProps) {
  const { category: transitionCategory, direction: transitionDirection = 'right' } =
    categorizeTransition(reaction.transition)

  const isNavigationAction = ['NAVIGATE', 'CHANGE_TO', 'OPEN_OVERLAY', 'SWAP_OVERLAY'].includes(
    reaction.action
  )

  const hasDirection = ['slide', 'push', 'move_in', 'move_out'].includes(transitionCategory)
  const isNonInstant = reaction.transition !== 'INSTANT' && isNavigationAction

  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      <Popover.Trigger asChild>{children}</Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          data-test-id="interaction-details-popover"
          side="left"
          sideOffset={10}
          align="start"
          collisionPadding={12}
          avoidCollisions
          className="z-[100] w-[320px] max-h-[85vh] overflow-y-auto rounded-xl border border-border/80 bg-panel/95 p-3 text-xs shadow-2xl backdrop-blur-md focus:outline-none select-none scrollbar-thin"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/50 pb-2 mb-3">
            <div className="flex items-center gap-1.5 font-semibold text-surface">
              <Zap className="size-3.5 text-accent" />
              <span>Interaction details</span>
            </div>
            <div className="flex items-center gap-1">
              {/* oxlint-disable-next-line openweave/no-hardcoded-tip-labels */}
              <Tip label="Delete interaction">
                <button
                  type="button"
                  data-test-id="delete-interaction-button"
                  aria-label="Delete interaction"
                  className="flex size-6 cursor-pointer items-center justify-center rounded text-muted transition-colors hover:bg-hover hover:text-destructive"
                  onClick={() => {
                    onRemove()
                    onOpenChange(false)
                  }}
                >
                  <Trash2 className="size-3.5" />
                </button>
              </Tip>
              {/* oxlint-disable-next-line openweave/no-hardcoded-tip-labels */}
              <Tip label="Close details">
                <button
                  type="button"
                  aria-label="Close details"
                  className="flex size-6 cursor-pointer items-center justify-center rounded text-muted transition-colors hover:bg-hover hover:text-surface"
                  onClick={() => onOpenChange(false)}
                >
                  <X className="size-3.5" />
                </button>
              </Tip>
            </div>
          </div>

          <div className="space-y-3.5">
            {/* Trigger Section */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-medium text-muted">
                <span className="flex items-center gap-1">
                  <MousePointer className="size-3" />
                  Trigger
                </span>
              </div>
              <AppSelect
                label="Trigger"
                options={TRIGGER_OPTIONS}
                value={reaction.trigger}
                onValueChange={(trigger) => onUpdate({ trigger: trigger as PrototypeTrigger })}
              />

              {reaction.trigger === 'AFTER_TIMEOUT' && (
                <div className="pt-1">
                  <NumberField
                    label="Delay"
                    value={reaction.timeout}
                    min={0}
                    step={100}
                    suffix="ms"
                    onChange={(timeout) => onUpdate({ timeout })}
                  />
                </div>
              )}
            </div>

            {/* Action & Destination Section */}
            <div className="space-y-1.5 border-t border-border/40 pt-3">
              <div className="flex items-center justify-between text-[11px] font-medium text-muted">
                <span className="flex items-center gap-1">
                  <Layers className="size-3" />
                  Action
                </span>
              </div>
              <AppSelect
                label="Action"
                options={ACTION_OPTIONS}
                value={reaction.action}
                onValueChange={(action) => onUpdate({ action: action as PrototypeActionType })}
              />

              {/* Destination selector for navigate/overlay/scroll */}
              {['NAVIGATE', 'OPEN_OVERLAY', 'SWAP_OVERLAY', 'SCROLL_TO'].includes(
                reaction.action
              ) && (
                <div className="pt-1">
                  <AppSelect
                    label="Destination"
                    options={destinationOptions}
                    value={reaction.destinationId ?? ''}
                    onValueChange={(destinationId) =>
                      onUpdate({ destinationId: destinationId || null })
                    }
                  />
                </div>
              )}

              {/* Destination selector for change_to (interactive components) */}
              {reaction.action === 'CHANGE_TO' && (
                <div className="pt-1">
                  <AppSelect
                    label="Variant"
                    options={[{ value: '', label: 'None' }, ...variantTargets]}
                    value={reaction.destinationId ?? ''}
                    onValueChange={(destinationId) =>
                      onUpdate({ destinationId: destinationId || null })
                    }
                  />
                </div>
              )}

              {/* External URL */}
              {reaction.action === 'OPEN_URL' && (
                <div className="pt-1 relative">
                  <input
                    type="text"
                    aria-label="Destination URL"
                    placeholder="https://example.com"
                    className="w-full rounded bg-input/50 px-2.5 py-1.5 text-xs text-surface border border-border outline-none focus:border-accent font-mono"
                    value={reaction.url}
                    onChange={(e) => onUpdate({ url: e.target.value })}
                  />
                  <ExternalLink className="size-3 absolute right-2.5 top-2.5 text-muted pointer-events-none" />
                </div>
              )}
            </div>

            {/* Animation & Smart Animate Section */}
            {isNavigationAction && (
              <div className="space-y-2 border-t border-border/40 pt-3">
                <div className="flex items-center justify-between text-[11px] font-medium text-muted">
                  <span className="flex items-center gap-1">
                    <Sparkles className="size-3 text-accent" />
                    Animation
                  </span>
                  {reaction.transition === 'SMART_ANIMATE' && (
                    <span className="rounded bg-accent/20 px-1.5 py-0.5 text-[9px] font-semibold text-accent uppercase tracking-wide">
                      Smart
                    </span>
                  )}
                </div>

                {/* Transition category picker */}
                <AppSelect
                  label="Transition"
                  options={[
                    { value: 'instant', label: 'Instant' },
                    { value: 'dissolve', label: 'Dissolve' },
                    { value: 'smart_animate', label: '✨ Smart animate' },
                    { value: 'slide', label: 'Slide in' },
                    { value: 'push', label: 'Push' },
                    { value: 'move_in', label: 'Move in' },
                    { value: 'move_out', label: 'Move out' }
                  ]}
                  value={transitionCategory}
                  onValueChange={(cat) => {
                    const nextTrans = resolveTransition(
                      cat as TransitionCategory,
                      transitionDirection
                    )
                    // Auto-default Smart Animate to Spring physics like Figma
                    const nextEasing =
                      cat === 'smart_animate' ? 'SPRING' : (reaction.easing ?? 'EASE_OUT')
                    onUpdate({ transition: nextTrans, easing: nextEasing })
                  }}
                />

                {/* Direction Buttons for Slide/Push/Move */}
                {hasDirection && (
                  <div className="space-y-1 pt-1">
                    <span className="text-[10px] text-muted">Direction</span>
                    <div className="grid grid-cols-4 gap-1">
                      {(
                        [
                          { dir: 'left', icon: ArrowLeft, label: 'From Left' },
                          { dir: 'right', icon: ArrowRight, label: 'From Right' },
                          { dir: 'top', icon: ArrowUp, label: 'From Top' },
                          { dir: 'bottom', icon: ArrowDown, label: 'From Bottom' }
                        ] as const
                      ).map(({ dir, icon: Icon, label }) => (
                        /* oxlint-disable-next-line openweave/no-hardcoded-tip-labels */
                        <Tip key={dir} label={label}>
                          <button
                            type="button"
                            className={`flex h-7 items-center justify-center rounded border transition-colors cursor-pointer ${
                              transitionDirection === dir
                                ? 'border-accent bg-accent text-white'
                                : 'border-border/50 bg-background/40 text-muted hover:border-border hover:text-surface'
                            }`}
                            onClick={() => {
                              const nextTrans = resolveTransition(transitionCategory, dir)
                              onUpdate({ transition: nextTrans })
                            }}
                          >
                            <Icon className="size-3.5" />
                          </button>
                        </Tip>
                      ))}
                    </div>
                  </div>
                )}

                {/* Smart Animate Notice */}
                {reaction.transition === 'SMART_ANIMATE' && (
                  <div className="rounded border border-accent/20 bg-accent/5 p-2 text-[10px] leading-relaxed text-muted space-y-1">
                    <div className="flex items-center gap-1 font-medium text-accent">
                      <Sparkles className="size-3" />
                      <span>Figma Smart Animate</span>
                    </div>
                    <p>
                      Matching layers with identical names across frames will smoothly morph
                      position, size, rotation, and style.
                    </p>
                  </div>
                )}

                {/* Duration & Easing Settings */}
                {isNonInstant && (
                  <div className="space-y-2 pt-1">
                    {/* Duration with quick presets */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-muted flex items-center gap-1">
                          <Clock className="size-2.5" />
                          Duration
                        </span>
                        <div className="flex gap-1">
                          {DURATION_PRESETS.map((d) => (
                            <button
                              key={d}
                              type="button"
                              className={`rounded px-1.5 py-0.5 text-[9px] font-mono transition-colors cursor-pointer ${
                                reaction.transitionDuration === d
                                  ? 'bg-accent text-white font-medium'
                                  : 'bg-panel/80 text-muted hover:bg-hover hover:text-surface'
                              }`}
                              onClick={() => onUpdate({ transitionDuration: d })}
                            >
                              {d}ms
                            </button>
                          ))}
                        </div>
                      </div>
                      <NumberField
                        label="Duration"
                        value={reaction.transitionDuration}
                        min={0}
                        max={5000}
                        step={50}
                        suffix="ms"
                        onChange={(transitionDuration) => onUpdate({ transitionDuration })}
                      />
                    </div>

                    {/* Easing Curve */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] text-muted">Easing curve</span>
                      <AppSelect
                        label="Easing"
                        options={[
                          { value: 'SPRING', label: 'Spring (physics)' },
                          { value: 'EASE_OUT', label: 'Ease out' },
                          { value: 'EASE_IN_AND_OUT', label: 'Ease in & out' },
                          { value: 'EASE_IN', label: 'Ease in' },
                          { value: 'LINEAR', label: 'Linear' },
                          { value: 'CUSTOM_CUBIC', label: 'Custom Bézier' }
                        ]}
                        value={
                          reaction.easing ??
                          (reaction.transition === 'SMART_ANIMATE' ? 'SPRING' : 'EASE_OUT')
                        }
                        onValueChange={(easing) => onUpdate({ easing: easing as PrototypeEasing })}
                      />
                    </div>

                    {/* Embedded Spring Physics Editor */}
                    {(reaction.easing === 'SPRING' ||
                      (!reaction.easing && reaction.transition === 'SMART_ANIMATE')) && (
                      <div className="rounded border border-border/50 bg-background/30 p-2 space-y-2">
                        <SpringCurveEditor
                          preset={reaction.springPreset ?? 'BOUNCY'}
                          config={reaction.springConfig}
                          onPresetChange={(springPreset: SpringPreset) =>
                            onUpdate({ springPreset, easing: 'SPRING' })
                          }
                          onConfigChange={(springConfig: SpringConfig) =>
                            onUpdate({ springConfig, easing: 'SPRING' })
                          }
                          onDurationSuggest={(transitionDuration: number) =>
                            onUpdate({ transitionDuration })
                          }
                        />
                      </div>
                    )}

                    {/* Embedded Bézier Curve Editor for custom curves */}
                    {reaction.easing === 'CUSTOM_CUBIC' && (
                      <div className="rounded border border-border/50 bg-background/30 p-2 space-y-2">
                        <BezierCurveEditor
                          points={
                            reaction.easingFunction && reaction.easingFunction.length === 4
                              ? {
                                  x1: reaction.easingFunction[0],
                                  y1: reaction.easingFunction[1],
                                  x2: reaction.easingFunction[2],
                                  y2: reaction.easingFunction[3]
                                }
                              : undefined
                          }
                          onChange={(pts) =>
                            onUpdate({ easingFunction: [pts.x1, pts.y1, pts.x2, pts.y2] })
                          }
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Overlay Settings */}
            {['OPEN_OVERLAY', 'SWAP_OVERLAY'].includes(reaction.action) && (
              <div className="space-y-2 border-t border-border/40 pt-3">
                <span className="text-[11px] font-medium text-muted">Overlay Settings</span>
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
                  onValueChange={(pos) => onUpdate({ overlayPosition: pos as OverlayPosition })}
                />
                <label className="flex items-center gap-2 text-[11px] text-surface cursor-pointer">
                  <input
                    type="checkbox"
                    className="rounded border-border bg-input/50"
                    checked={reaction.overlayCloseOnClickOutside ?? true}
                    onChange={(e) => onUpdate({ overlayCloseOnClickOutside: e.target.checked })}
                  />
                  <span>Close when clicking outside</span>
                </label>
                <label className="flex items-center gap-2 text-[11px] text-surface cursor-pointer">
                  <input
                    type="checkbox"
                    className="rounded border-border bg-input/50"
                    checked={reaction.overlayBackgroundScrim ?? false}
                    onChange={(e) => onUpdate({ overlayBackgroundScrim: e.target.checked })}
                  />
                  <span>Add background behind overlay</span>
                </label>
              </div>
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
