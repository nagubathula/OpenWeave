import type { createEditor } from '@openweave/core/editor'

import { CREDIT_CARD_HEIGHT_INCHES, CREDIT_CARD_WIDTH_INCHES, STANDARD_CSS_PPI } from './types'

type Editor = ReturnType<typeof createEditor>

/**
 * Inserts a life-sized Credit Card frame onto the canvas (85.60 × 53.98 mm)
 * calibrated to standard 96 DPI CSS pixels (324 × 204 px).
 */
export function insertCreditCardReference(editor: Editor): string {
  const cardWidth = Math.round(CREDIT_CARD_WIDTH_INCHES * STANDARD_CSS_PPI) // 324 px
  const cardHeight = Math.round(CREDIT_CARD_HEIGHT_INCHES * STANDARD_CSS_PPI) // 204 px
  const cornerRadius = 12

  const selectedNodes = [...editor.state.selectedIds]
    .map((id) => editor.graph.getNode(id))
    .filter((n): n is NonNullable<typeof n> => n != null)

  let x = 100
  let y = 100

  if (selectedNodes.length > 0 && selectedNodes[0]) {
    const first = selectedNodes[0]
    x = Math.round(first.x + first.width + 48)
    y = Math.round(first.y)
  } else {
    const { width: viewW, height: viewH } =
      typeof editor.getViewportSize === 'function'
        ? editor.getViewportSize()
        : { width: 1000, height: 800 }
    x = Math.round((-editor.state.panX + viewW / 2) / editor.state.zoom - cardWidth / 2)
    y = Math.round((-editor.state.panY + viewH / 2) / editor.state.zoom - cardHeight / 2)
  }

  const cardId = editor.createShape(
    'FRAME',
    x,
    y,
    cardWidth,
    cardHeight,
    editor.state.currentPageId,
    'Credit Card (Scale 85.6 × 54 mm)'
  )

  const cardNode = editor.graph.getNode(cardId)
  if (cardNode) {
    cardNode.cornerRadius = cornerRadius
    cardNode.clipsContent = true
    cardNode.fills = [
      {
        type: 'SOLID',
        color: { r: 0.12, g: 0.14, b: 0.18, a: 1 },
        opacity: 1,
        visible: true
      }
    ]
    cardNode.strokes = [
      {
        color: { r: 0.3, g: 0.35, b: 0.45, a: 0.6 },
        weight: 1,
        opacity: 1,
        visible: true,
        align: 'INSIDE'
      }
    ]

    // Add gold EMV chip inside card
    const chipWidth = 44
    const chipHeight = 34
    const chipId = editor.createShape(
      'RECTANGLE',
      24,
      48,
      chipWidth,
      chipHeight,
      cardId,
      'EMV Chip'
    )
    const chipNode = editor.graph.getNode(chipId)
    if (chipNode) {
      chipNode.cornerRadius = 6
      chipNode.fills = [
        {
          type: 'SOLID',
          color: { r: 0.88, g: 0.74, b: 0.38, a: 1 },
          opacity: 1,
          visible: true
        }
      ]
      chipNode.strokes = [
        {
          color: { r: 0.72, g: 0.58, b: 0.25, a: 0.8 },
          weight: 1,
          opacity: 1,
          visible: true,
          align: 'INSIDE'
        }
      ]
    }

    editor.select([cardId])
    editor.requestRepaint()
  }

  return cardId
}
