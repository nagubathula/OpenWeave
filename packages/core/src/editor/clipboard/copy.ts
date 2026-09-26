import type { SceneNode } from '@openweave/scene-graph'

import { buildFigmaClipboardHTML, buildOpenWeaveClipboardHTML } from '#core/clipboard'
import type { EditorContext } from '#core/editor/types'

export function createClipboardCopyActions(ctx: EditorContext) {
  async function writeCopyData(clipboardData: DataTransfer, selectedNodes: SceneNode[]) {
    if (selectedNodes.length === 0) return

    const names = selectedNodes.map((n) => n.name).join('\n')
    const openWeaveHtml = buildOpenWeaveClipboardHTML(selectedNodes, ctx.graph)
    clipboardData.setData('text/html', openWeaveHtml)
    clipboardData.setData('text/plain', names)

    try {
      const html = await buildFigmaClipboardHTML(selectedNodes, ctx.graph)
      if (html) clipboardData.setData('text/html', `${openWeaveHtml}\n${html}`)
    } catch (err) {
      console.warn('Failed to build Figma clipboard HTML:', err)
    }
  }

  return { writeCopyData }
}
