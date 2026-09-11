import { guidToString } from '@openweave/kiwi/fig/guid'
import type {
  PrototypeActionType,
  PrototypeReaction,
  PrototypeTransition,
  PrototypeTrigger
} from '@openweave/scene-graph'
import type { GUID } from '@openweave/scene-graph/primitives'

/**
 * Maps the simplified OpenWeave prototype reaction model to and from Figma's
 * Kiwi PrototypeInteraction messages. Import is lossy on purpose: triggers and
 * actions outside the supported subset are skipped (the raw-field fallback
 * still round-trips them for untouched imported nodes).
 */

interface KiwiPrototypeEvent {
  interactionType?: string
  interactionMaintained?: boolean
  transitionTimeout?: number
}

interface KiwiPrototypeAction {
  transitionNodeID?: GUID
  transitionType?: string
  transitionDuration?: number
  easingType?: string
  connectionType?: string
  connectionURL?: string
  navigationType?: string
  transitionShouldSmartAnimate?: boolean
  transitionPreserveScroll?: boolean
  openUrlInNewTab?: boolean
}

interface KiwiPrototypeInteraction {
  id?: GUID
  event?: KiwiPrototypeEvent
  actions?: KiwiPrototypeAction[]
  isDeleted?: boolean
  stateManagementVersion?: number
}

const TRIGGER_TO_KIWI: Record<PrototypeTrigger, string> = {
  ON_CLICK: 'ON_CLICK',
  ON_HOVER: 'ON_HOVER',
  AFTER_TIMEOUT: 'AFTER_TIMEOUT',
  ON_DRAG: 'ON_DRAG',
  WHILE_PRESSING: 'ON_PRESS',
  MOUSE_ENTER: 'MOUSE_ENTER',
  MOUSE_LEAVE: 'MOUSE_LEAVE',
  KEY_DOWN: 'ON_KEY_DOWN'
}

const KIWI_TO_TRIGGER: Record<string, PrototypeTrigger> = {
  ON_CLICK: 'ON_CLICK',
  MOUSE_UP: 'ON_CLICK',
  MOUSE_DOWN: 'ON_CLICK',
  ON_HOVER: 'ON_HOVER',
  MOUSE_IN: 'ON_HOVER',
  ON_PRESS: 'WHILE_PRESSING',
  ON_DRAG: 'ON_DRAG',
  MOUSE_ENTER: 'MOUSE_ENTER',
  MOUSE_LEAVE: 'MOUSE_LEAVE',
  ON_KEY_DOWN: 'KEY_DOWN',
  AFTER_TIMEOUT: 'AFTER_TIMEOUT'
}

const TRANSITION_TO_KIWI: Record<PrototypeTransition, string> = {
  INSTANT: 'INSTANT_TRANSITION',
  DISSOLVE: 'DISSOLVE',
  SLIDE_FROM_LEFT: 'SLIDE_FROM_LEFT',
  SLIDE_FROM_RIGHT: 'SLIDE_FROM_RIGHT',
  SLIDE_FROM_TOP: 'SLIDE_FROM_TOP',
  SLIDE_FROM_BOTTOM: 'SLIDE_FROM_BOTTOM',
  PUSH_LEFT: 'PUSH_FROM_RIGHT',
  PUSH_RIGHT: 'PUSH_FROM_LEFT',
  PUSH_TOP: 'PUSH_FROM_BOTTOM',
  PUSH_BOTTOM: 'PUSH_FROM_TOP',
  MOVE_IN_LEFT: 'SLIDE_FROM_LEFT',
  MOVE_IN_RIGHT: 'SLIDE_FROM_RIGHT',
  MOVE_IN_TOP: 'SLIDE_FROM_TOP',
  MOVE_IN_BOTTOM: 'SLIDE_FROM_BOTTOM',
  MOVE_OUT_LEFT: 'MOVE_OUT_LEFT',
  MOVE_OUT_RIGHT: 'MOVE_OUT_RIGHT',
  MOVE_OUT_TOP: 'MOVE_OUT_TOP',
  MOVE_OUT_BOTTOM: 'MOVE_OUT_BOTTOM',
  SMART_ANIMATE: 'SMART_ANIMATE'
}

function kiwiToTransition(value: string | undefined): PrototypeTransition {
  if (!value || value === 'INSTANT_TRANSITION') return 'INSTANT'
  if (value === 'DISSOLVE' || value === 'FADE') return 'DISSOLVE'
  if (value === 'SMART_ANIMATE') return 'SMART_ANIMATE'
  if (value.startsWith('PUSH_FROM_')) {
    const dir = value.replace('PUSH_FROM_', '')
    if (dir === 'RIGHT') return 'PUSH_LEFT'
    if (dir === 'LEFT') return 'PUSH_RIGHT'
    if (dir === 'BOTTOM') return 'PUSH_TOP'
    if (dir === 'TOP') return 'PUSH_BOTTOM'
  }
  const slide = /^(?:SLIDE|MOVE)_FROM_(LEFT|RIGHT|TOP|BOTTOM)$/.exec(value)
  if (slide) return `SLIDE_FROM_${slide[1]}` as PrototypeTransition
  return 'INSTANT'
}

export function reactionsToKiwiInteractions(
  reactions: PrototypeReaction[],
  resolveGuid: (nodeId: string) => GUID | undefined,
  nextGuid: () => GUID
): KiwiPrototypeInteraction[] {
  const interactions: KiwiPrototypeInteraction[] = []
  for (const reaction of reactions) {
    const isSmartAnimate = reaction.transition === 'SMART_ANIMATE'
    const action: KiwiPrototypeAction = {
      transitionType: TRANSITION_TO_KIWI[reaction.transition] ?? 'INSTANT_TRANSITION',
      transitionDuration: reaction.transitionDuration / 1000,
      easingType: reaction.easing === 'SPRING' ? 'GENTLE' : 'OUT_CUBIC',
      transitionShouldSmartAnimate: isSmartAnimate,
      transitionPreserveScroll: false
    }
    if (reaction.action === 'NAVIGATE') {
      if (!reaction.destinationId) continue
      const destGuid = resolveGuid(reaction.destinationId)
      if (!destGuid) continue
      action.connectionType = 'INTERNAL_NODE'
      action.navigationType = 'NAVIGATE'
      action.transitionNodeID = destGuid
    } else if (reaction.action === 'BACK') {
      action.connectionType = 'BACK'
      action.navigationType = 'NAVIGATE'
    } else if (reaction.action === 'OPEN_URL') {
      if (!reaction.url) continue
      action.connectionType = 'URL'
      action.connectionURL = reaction.url
      action.openUrlInNewTab = true
    } else if (reaction.action === 'OPEN_OVERLAY' || reaction.action === 'SWAP_OVERLAY') {
      if (!reaction.destinationId) continue
      const destGuid = resolveGuid(reaction.destinationId)
      if (!destGuid) continue
      action.connectionType = 'INTERNAL_NODE'
      action.navigationType = reaction.action === 'OPEN_OVERLAY' ? 'OVERLAY' : 'SWAP'
      action.transitionNodeID = destGuid
    } else if (reaction.action === 'CLOSE_OVERLAY') {
      action.connectionType = 'CLOSE'
      action.navigationType = 'NAVIGATE'
    } else if (reaction.action === 'SCROLL_TO') {
      if (!reaction.destinationId) continue
      const destGuid = resolveGuid(reaction.destinationId)
      if (!destGuid) continue
      action.connectionType = 'INTERNAL_NODE'
      action.navigationType = 'SCROLL_TO'
      action.transitionNodeID = destGuid
    } else if (reaction.action === 'SET_VARIABLE' || reaction.action === 'CONDITIONAL') {
      // SET_VARIABLE and CONDITIONAL require their own payload mapping which isn't fully
      // supported by KiwiPrototypeAction yet, but we stub the navigation type
      action.navigationType = reaction.action
    }

    const event: KiwiPrototypeEvent = {
      interactionType: TRIGGER_TO_KIWI[reaction.trigger] ?? 'ON_CLICK',
      interactionMaintained: false
    }
    if (reaction.trigger === 'AFTER_TIMEOUT') {
      event.transitionTimeout = reaction.timeout / 1000
    }

    interactions.push({
      id: nextGuid(),
      event,
      actions: [action],
      isDeleted: false,
      stateManagementVersion: 1
    })
  }
  return interactions
}

/**
 * Figma historically dual-writes the first click-navigate interaction into
 * legacy NodeChange-level transition fields; mirror that for compatibility
 * with older importers.
 */
export function legacyPrototypeFields(
  reactions: PrototypeReaction[],
  resolveGuid: (nodeId: string) => GUID | undefined
): Record<string, unknown> | null {
  const first = reactions.find(
    (reaction) =>
      reaction.trigger === 'ON_CLICK' && reaction.action === 'NAVIGATE' && reaction.destinationId
  )
  if (!first?.destinationId) return null
  const destGuid = resolveGuid(first.destinationId)
  if (!destGuid) return null
  return {
    transitionNodeID: destGuid,
    transitionType: TRANSITION_TO_KIWI[first.transition] ?? 'INSTANT_TRANSITION',
    transitionDuration: first.transitionDuration / 1000,
    easingType: 'OUT_CUBIC',
    interactionType: 'ON_CLICK',
    connectionType: 'INTERNAL_NODE'
  }
}

/**
 * Reactions for an imported NodeChange: modern PrototypeInteraction messages
 * when present, else the legacy NodeChange-level transition fields.
 */
export function nodeChangeToReactions(
  nc: { prototypeInteractions?: unknown[] } & Record<string, unknown>
): PrototypeReaction[] {
  if (nc.prototypeInteractions !== undefined) {
    return kiwiInteractionsToReactions(nc.prototypeInteractions)
  }
  const destGuid = nc.transitionNodeID as GUID | undefined
  if (!destGuid) return []
  const trigger = KIWI_TO_TRIGGER[(nc.interactionType as string) ?? 'ON_CLICK'] ?? 'ON_CLICK'
  return [
    {
      trigger,
      timeout: Math.round(((nc.transitionTimeout as number) ?? 0.8) * 1000),
      action: 'NAVIGATE',
      destinationId: guidToString(destGuid),
      url: '',
      transition: kiwiToTransition(nc.transitionType as string | undefined),
      transitionDuration: Math.round(((nc.transitionDuration as number) ?? 0.3) * 1000)
    }
  ]
}

export function kiwiInteractionsToReactions(raw: unknown[] | undefined): PrototypeReaction[] {
  if (!raw || raw.length === 0) return []
  const reactions: PrototypeReaction[] = []
  for (const entry of raw) {
    const interaction = entry as KiwiPrototypeInteraction
    if (!interaction || interaction.isDeleted) continue
    const trigger = KIWI_TO_TRIGGER[interaction.event?.interactionType ?? '']
    const action = interaction.actions?.[0]
    if (!trigger || !action) continue

    const base = {
      trigger,
      timeout: Math.round((interaction.event?.transitionTimeout ?? 0.8) * 1000),
      transition: kiwiToTransition(action.transitionType),
      transitionDuration: Math.round((action.transitionDuration ?? 0.3) * 1000)
    }

    if (action.connectionType === 'BACK') {
      reactions.push({ ...base, action: 'BACK', destinationId: null, url: '' })
    } else if (action.connectionType === 'CLOSE') {
      reactions.push({ ...base, action: 'CLOSE_OVERLAY', destinationId: null, url: '' })
    } else if (action.connectionType === 'URL') {
      if (!action.connectionURL) continue
      reactions.push({
        ...base,
        action: 'OPEN_URL',
        destinationId: null,
        url: action.connectionURL
      })
    } else if (action.transitionNodeID) {
      let mappedAction: PrototypeActionType = 'NAVIGATE'
      if (action.navigationType === 'OVERLAY') mappedAction = 'OPEN_OVERLAY'
      if (action.navigationType === 'SWAP') mappedAction = 'SWAP_OVERLAY'
      if (action.navigationType === 'SCROLL_TO') mappedAction = 'SCROLL_TO'
      if (action.navigationType === 'SET_VARIABLE') mappedAction = 'SET_VARIABLE'

      reactions.push({
        ...base,
        action: mappedAction,
        destinationId: guidToString(action.transitionNodeID),
        url: ''
      })
    }
  }
  return reactions
}
