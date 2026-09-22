import type { Rect } from '@openweave/scene-graph/primitives'
import type { SnapGuide } from '@openweave/scene-graph/snap'

import type { EditorContext } from '#core/editor/types'

export function createSelectionOverlayActions(ctx: EditorContext) {
  function setMarquee(rect: Rect | null) {
    ctx.state.marquee = rect
    ctx.requestRepaint()
  }

  function setSnapGuides(guides: SnapGuide[]) {
    ctx.state.snapGuides = guides
    ctx.requestRepaint()
  }

  function setRotationPreview(preview: { nodeId: string; angle: number } | null) {
    ctx.state.rotationPreview = preview
    ctx.requestRepaint()
  }

  function setHoveredNode(id: string | null) {
    if (ctx.state.hoveredNodeId === id) return
    ctx.state.hoveredNodeId = id
    ctx.requestRepaint()
  }

  function setDropTarget(id: string | null) {
    if (ctx.state.dropTargetId === id) return
    ctx.state.dropTargetId = id
    ctx.requestRepaint()
  }

  function setLayoutInsertIndicator(indicator: typeof ctx.state.layoutInsertIndicator) {
    if (ctx.state.layoutInsertIndicator === indicator) return
    ctx.state.layoutInsertIndicator = indicator
    ctx.requestRepaint()
  }

  function setAutoLayoutHover(hover: typeof ctx.state.autoLayoutHover) {
    const current = ctx.state.autoLayoutHover
    if (
      current?.nodeId === hover?.nodeId &&
      current?.kind === hover?.kind &&
      current?.index === hover?.index &&
      current?.side === hover?.side
    ) {
      return
    }
    ctx.state.autoLayoutHover = hover
    ctx.requestRepaint()
  }

  function setCornerRadiusHover(hover: typeof ctx.state.cornerRadiusHover) {
    const current = ctx.state.cornerRadiusHover
    if (current?.nodeId === hover?.nodeId && current?.corner === hover?.corner) {
      return
    }
    ctx.state.cornerRadiusHover = hover
    ctx.requestRepaint()
  }

  function setCornerRadiusDrag(drag: typeof ctx.state.cornerRadiusDrag) {
    const current = ctx.state.cornerRadiusDrag
    if (
      current?.nodeId === drag?.nodeId &&
      current?.corner === drag?.corner &&
      current?.radius === drag?.radius
    ) {
      return
    }
    ctx.state.cornerRadiusDrag = drag
    ctx.requestRepaint()
  }

  function setAltHeld(held: boolean) {
    if (ctx.state.altHeld === held) return
    ctx.state.altHeld = held
    ctx.requestRepaint()
  }

  function setActiveGuide(guide: { axis: 'X' | 'Y'; offset: number } | null) {
    if (
      ctx.state.activeGuide?.axis === guide?.axis &&
      ctx.state.activeGuide?.offset === guide?.offset
    ) {
      return
    }
    ctx.state.activeGuide = guide
    ctx.requestRepaint()
  }

  return {
    setMarquee,
    setSnapGuides,
    setRotationPreview,
    setHoveredNode,
    setAltHeld,
    setActiveGuide,
    setDropTarget,
    setLayoutInsertIndicator,
    setAutoLayoutHover,
    setCornerRadiusHover,
    setCornerRadiusDrag
  }
}
