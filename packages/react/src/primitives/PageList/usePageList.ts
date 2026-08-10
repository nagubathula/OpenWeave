import { useEditor } from '#react/editor/context'
import { useSceneComputed } from '#react/internal/scene-computed/use'

/**
 * Returns reactive page state and page-management actions.
 *
 * Use this composable to build page switchers, page lists, or navigation
 * panels without manually reading the graph in each component.
 */
export function usePageList() {
  const editor = useEditor()

  const pages = useSceneComputed(() => editor.graph.getPages())
  const currentPageId = useSceneComputed(() => editor.state.currentPageId)

  return {
    editor,
    pages,
    currentPageId,
    switchPage: editor.switchPage.bind(editor),
    addPage: editor.addPage.bind(editor),
    deletePage: editor.deletePage.bind(editor),
    movePage: editor.movePage.bind(editor),
    renamePage: editor.renamePage.bind(editor)
  }
}
