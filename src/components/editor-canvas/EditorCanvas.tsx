import { useStore } from '@nanostores/react'
import * as ContextMenu from '@radix-ui/react-context-menu'
import * as Popover from '@radix-ui/react-popover'
import { Pencil as IconLucidePencilLine, Play } from 'lucide-react'
import React, { useMemo, useRef } from 'react'

import {
  AUTO_LAYOUT_PADDING_EDITOR_OFFSET_X,
  AUTO_LAYOUT_PADDING_EDITOR_OFFSET_Y
} from '@openweave/core/constants'
import {
  toolCursor,
  useCanvas,
  useCanvasDrop,
  useCanvasInput,
  useCanvasVirtualReference,
  useTextEdit
} from '@openweave/react'

import { useAIChat } from '@/app/ai/chat/use'
import { useCollabInjected } from '@/app/collab/use'
import { useEditorStore } from '@/app/editor/active-store'
import { useCanvasCollaborationAwareness } from '@/app/editor/canvas/collaboration-awareness'
import { createCanvasContextSelection } from '@/app/editor/canvas/context-selection'
import NumberField from '@/components/inputs/NumberField'
import MotionTrajectoryOverlay from '@/components/motion/MotionTrajectoryOverlay'

import CanvasMenu from '../canvas/CanvasMenu'

export default function EditorCanvas() {
  const store = useEditorStore()
  const { activeTab: activeTabAtom } = useAIChat()
  const activeTab = useStore(activeTabAtom)

  const collab = useCollabInjected()
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneCanvasRef = useRef<HTMLCanvasElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const { updateCursor } = useCanvasCollaborationAwareness(store, collab)
  const { selectAtContextPoint } = createCanvasContextSelection(canvasRef, store)

  useCanvas(sceneCanvasRef, store, {
    layer: 'scene',
    showRulers: false
  })

  const { hitTestSectionTitle, hitTestComponentLabel, hitTestFrameTitle } = useCanvas(
    canvasRef,
    store,
    {
      layer: 'overlays'
    }
  )

  const {
    cursorOverride,
    autoLayoutPaddingEdit,
    updateAutoLayoutPaddingEdit,
    commitAutoLayoutPaddingEdit,
    cancelAutoLayoutPaddingEdit
  } = useCanvasInput(
    canvasRef,
    store,
    hitTestSectionTitle,
    hitTestComponentLabel,
    hitTestFrameTitle,
    updateCursor
  )

  useTextEdit(canvasRef, store)
  const { isDraggingOver } = useCanvasDrop(canvasRef, store)

  const paddingEditorAnchor = useMemo(() => {
    const edit = autoLayoutPaddingEdit
    if (!edit) return null
    const node = store.graph.getNode(edit.nodeId)
    if (!node) return null
    const abs = store.graph.getAbsolutePosition(node.id)
    if (edit.side === 'top') return { x: abs.x + node.width / 2, y: abs.y + node.paddingTop / 2 }
    if (edit.side === 'bottom') {
      return { x: abs.x + node.width / 2, y: abs.y + node.height - node.paddingBottom / 2 }
    }
    if (edit.side === 'left') return { x: abs.x + node.paddingLeft / 2, y: abs.y + node.height / 2 }
    return { x: abs.x + node.width - node.paddingRight / 2, y: abs.y + node.height / 2 }
  }, [autoLayoutPaddingEdit, store.graph])

  const paddingEditorVirtualRefCurrent = useCanvasVirtualReference(
    canvasRef,
    store,
    paddingEditorAnchor
  )
  const paddingEditorVirtualRef = useMemo(
    () => ({ current: paddingEditorVirtualRefCurrent }),
    [paddingEditorVirtualRefCurrent]
  )

  const cursor = toolCursor(store.state.activeTool, cursorOverride)

  return (
    <ContextMenu.Root modal={false}>
      <ContextMenu.Trigger asChild onContextMenu={selectAtContextPoint}>
        <div
          ref={containerRef}
          data-test-id="canvas-area"
          className="canvas-area relative size-full min-h-0 min-w-0 flex-1 overflow-hidden"
        >
          <canvas
            ref={sceneCanvasRef}
            data-test-id="scene-canvas-element"
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 size-full outline-none"
          />
          <canvas
            ref={canvasRef}
            data-test-id="canvas-element"
            tabIndex={-1}
            style={{ cursor }}
            className="absolute inset-0 block size-full touch-none outline-none"
          />

          {/* On-Canvas Motion Trajectory Overlay */}
          <MotionTrajectoryOverlay
            containerRef={containerRef}
            store={store}
            activeTab={activeTab}
          />

          {/* Floating Figma Motion "Open Timeline" Canvas Pill */}
          {activeTab !== 'motion' && (
            <div className="pointer-events-none absolute bottom-5 right-5 z-30 flex items-center justify-end">
              <button
                type="button"
                data-test-id="open-motion-timeline-button"
                className="pointer-events-auto flex items-center gap-2 rounded-full bg-[#2c2c2e]/90 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xl backdrop-blur-md border border-white/15 hover:bg-[#3a3a3d] hover:border-white/25 active:scale-95 transition-all cursor-pointer group"
                onClick={() => activeTabAtom.set('motion')}
              >
                <span className="flex size-4 items-center justify-center rounded-full bg-white/20 text-white group-hover:bg-accent group-hover:text-white transition-colors">
                  <Play className="size-2.5 fill-current ml-0.5" />
                </span>
                <span>Open Timeline</span>
              </button>
            </div>
          )}

          {isDraggingOver && (
            <div className="pointer-events-none absolute inset-0 z-40 border-2 border-dashed border-accent/60 bg-accent/5 transition-opacity duration-150" />
          )}

          <Popover.Root open={!!autoLayoutPaddingEdit}>
            <Popover.Anchor virtualRef={paddingEditorVirtualRef} />
            <Popover.Portal>
              {autoLayoutPaddingEdit && (
                <Popover.Content
                  onInteractOutside={() => {
                    commitAutoLayoutPaddingEdit(autoLayoutPaddingEdit.value)
                  }}
                  onEscapeKeyDown={(e) => {
                    e.preventDefault()
                    cancelAutoLayoutPaddingEdit()
                  }}
                  onOpenAutoFocus={(e) => e.preventDefault()}
                  side="top"
                  align="center"
                  sideOffset={AUTO_LAYOUT_PADDING_EDITOR_OFFSET_Y}
                  alignOffset={AUTO_LAYOUT_PADDING_EDITOR_OFFSET_X}
                  collisionPadding={8}
                  className="z-50 w-20 rounded-md bg-panel p-1 shadow-lg"
                  data-test-id="auto-layout-padding-editor"
                >
                  <NumberField
                    value={autoLayoutPaddingEdit.value}
                    min={0}
                    step={1}
                    dataTestId="auto-layout-padding-input"
                    onChange={updateAutoLayoutPaddingEdit}
                    onCommit={(v) => commitAutoLayoutPaddingEdit(v)}
                    onEditingChange={(editing) =>
                      !editing && commitAutoLayoutPaddingEdit(autoLayoutPaddingEdit?.value ?? 0)
                    }
                    className="w-full bg-transparent px-1 text-xs outline-none"
                  />
                </Popover.Content>
              )}
            </Popover.Portal>
          </Popover.Root>

          {store.state.loading && (
            <div
              data-test-id="canvas-loading"
              className="absolute inset-0 z-50 flex items-center justify-center bg-canvas transition-opacity duration-300"
            >
              <IconLucidePencilLine className="size-8 text-surface opacity-45" />
              <div className="absolute bottom-1/2 left-1/2 h-0.5 w-25 -translate-x-1/2 translate-y-10 overflow-hidden rounded-full bg-surface/8">
                <div className="h-full w-2/5 animate-[slide_1s_ease-in-out_infinite] rounded-full bg-surface/25" />
              </div>
            </div>
          )}
        </div>
      </ContextMenu.Trigger>

      <ContextMenu.Portal>
        <CanvasMenu />
      </ContextMenu.Portal>
    </ContextMenu.Root>
  )
}
