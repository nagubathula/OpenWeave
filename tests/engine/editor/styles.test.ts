import { describe, expect, test } from 'bun:test'

import { createEditor } from '@openweave/core/editor'
import type { Effect, Fill } from '@openweave/scene-graph'

describe('editor shared styles', () => {
  test('creates a fill shared style from a source node and binds it', () => {
    const editor = createEditor()
    const pageId = editor.state.currentPageId
    const fill: Fill = {
      type: 'SOLID',
      color: { r: 1, g: 0.2, b: 0.1, a: 1 },
      opacity: 1,
      visible: true
    }
    const rect = editor.graph.createNode('RECTANGLE', pageId, {
      fills: [fill]
    })

    const styleId = editor.createSharedStyle('fill', 'Brand / Primary', rect)
    expect(styleId).toBeTruthy()

    // Rect should be bound to the new style
    const updatedRect = editor.graph.getNode(rect.id)
    expect(updatedRect?.fillStyleId).toBe(styleId)

    // Style node should exist in graph
    const styles = editor.getSharedStyles('fill')
    expect(styles.some((s) => s.id === styleId && s.name === 'Brand / Primary')).toBe(true)

    // Undo should unbind and remove the style
    editor.undo.undo()
    expect(editor.graph.getNode(rect.id)?.fillStyleId).toBeNull()
    expect(editor.getSharedStyles('fill').some((s) => s.id === styleId)).toBe(false)

    // Redo should restore it
    editor.undo.redo()
    expect(editor.graph.getNode(rect.id)?.fillStyleId).toBe(styleId)
    expect(editor.getSharedStyles('fill').some((s) => s.id === styleId)).toBe(true)
  })

  test('creates a text shared style and applies typography properties', () => {
    const editor = createEditor()
    const pageId = editor.state.currentPageId
    const textNode = editor.graph.createNode('TEXT', pageId, {
      fontFamily: 'Inter',
      fontSize: 28,
      fontWeight: 700,
      lineHeight: 36,
      textCase: 'UPPER'
    })

    const styleId = editor.createSharedStyle('text', 'Heading / H1', textNode)
    expect(editor.graph.getNode(textNode.id)?.textStyleId).toBe(styleId)

    const textStyles = editor.getSharedStyles('text')
    expect(textStyles.some((s) => s.id === styleId && s.name === 'Heading / H1')).toBe(true)
  })

  test('updates a shared style and cascades changes to all bound nodes', () => {
    const editor = createEditor()
    const pageId = editor.state.currentPageId

    const fillA: Fill = {
      type: 'SOLID',
      color: { r: 1, g: 0, b: 0, a: 1 },
      opacity: 1,
      visible: true
    }
    const fillB: Fill = {
      type: 'SOLID',
      color: { r: 0, g: 1, b: 0, a: 1 },
      opacity: 1,
      visible: true
    }

    const node1 = editor.graph.createNode('RECTANGLE', pageId, { fills: [fillA] })
    const node2 = editor.graph.createNode('RECTANGLE', pageId, { fills: [fillA] })

    const styleId = editor.createSharedStyle('fill', 'Accent Color', node1)
    // Bind node2 as well
    editor.updateNode(node2.id, { fillStyleId: styleId })

    expect(editor.graph.getNode(node1.id)?.fillStyleId).toBe(styleId)
    expect(editor.graph.getNode(node2.id)?.fillStyleId).toBe(styleId)

    // Update the shared style to fillB
    editor.updateSharedStyle(styleId, { fills: [fillB], name: 'Updated Accent' })

    expect(editor.graph.getNode(node1.id)?.fills).toEqual([fillB])
    expect(editor.graph.getNode(node2.id)?.fills).toEqual([fillB])

    // Undo should restore fillA
    editor.undo.undo()
    expect(editor.graph.getNode(node1.id)?.fills).toEqual([fillA])
    expect(editor.graph.getNode(node2.id)?.fills).toEqual([fillA])
  })

  test('deletes a shared style and unbinds referencing nodes', () => {
    const editor = createEditor()
    const pageId = editor.state.currentPageId

    const effect: Effect = {
      type: 'DROP_SHADOW',
      color: { r: 0, g: 0, b: 0, a: 0.2 },
      offset: { x: 0, y: 4 },
      radius: 12,
      spread: 0,
      visible: true
    }

    const node = editor.graph.createNode('RECTANGLE', pageId, { effects: [effect] })
    const styleId = editor.createSharedStyle('effect', 'Card Shadow', node)

    expect(editor.graph.getNode(node.id)?.effectStyleId).toBe(styleId)

    editor.deleteSharedStyle(styleId)
    expect(editor.graph.getNode(node.id)?.effectStyleId).toBeNull()
    expect(editor.getSharedStyles('effect').some((s) => s.id === styleId)).toBe(false)

    // Undo restores the style and binding
    editor.undo.undo()
    expect(editor.graph.getNode(node.id)?.effectStyleId).toBe(styleId)
    expect(editor.getSharedStyles('effect').some((s) => s.id === styleId)).toBe(true)
  })
})
