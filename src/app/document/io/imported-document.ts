import type { Editor } from '@openweave/core/editor'
import { computeAllLayouts } from '@openweave/core/layout'
import type { SceneGraph, SceneNode } from '@openweave/scene-graph'

export async function applyImportedDocument(editor: Editor, imported: SceneGraph) {
  const firstPage = imported.getPages()[0] as SceneNode | undefined
  if (firstPage) computeAllLayouts(imported, firstPage.id)
  editor.replaceGraph(imported)
  editor.undo.clear()
  editor.clearSelection()
  const pageId = firstPage?.id ?? editor.graph.rootId
  await editor.switchPage(pageId)
}
