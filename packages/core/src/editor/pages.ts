import type { Color } from '@openweave/scene-graph/primitives'

import { populateLazyFigImportRoots } from '#core/kiwi/fig/lazy-import'
import { computeAllLayouts } from '#core/layout'
import { fontManager } from '#core/text/fonts'
import { collectGraphFontRequirements } from '#core/text/requirements'
import { missingGraphFontScripts } from '#core/text/resolved-requirements'

import { createPageViewportStore } from './page-viewports'
import type { EditorContext } from './types'

export function createPageActions(ctx: EditorContext) {
  const pageViewportStore = createPageViewportStore(ctx)

  async function switchPage(pageId: string) {
    const page = ctx.graph.getNode(pageId)
    if (page?.type !== 'CANVAS') return

    pageViewportStore.saveCurrentPageViewport()

    const previousPageId = ctx.state.currentPageId
    ctx.state.currentPageId = pageId
    ctx.state.enteredContainerId = null
    ctx.setSelectedIds(new Set())
    if (previousPageId !== pageId) ctx.emitEditorEvent('page:changed', pageId, previousPageId)

    pageViewportStore.restorePageViewport(pageId)

    const populated = populateLazyFigImportRoots(ctx.graph, [pageId])

    const childIds = ctx.graph.getChildren(pageId).map((node) => node.id)
    const toLoad = fontManager.collectFontKeys(ctx.graph, childIds)
    const requirements = collectGraphFontRequirements(ctx.graph, childIds)
    fontManager.blockNodesUntilFontsResolve(childIds)
    try {
      const results = await Promise.all(
        toLoad.map(([family, style]) => ctx.loadFont(family, style, requirements.characters))
      )
      const requiredFallbacks = missingGraphFontScripts(requirements)
      const fallbacks = await fontManager.ensureFallbackPack(
        requiredFallbacks,
        requirements.characters
      )
      const facesReady = results.every((result) => result !== null)
      const fallbacksReady = requiredFallbacks.every(
        (script) => (fallbacks[script]?.length ?? 0) > 0
      )
      if (facesReady && fallbacksReady) {
        for (const node of requirements.nodes) if (node.type === 'TEXT') node.textPicture = null
      }
    } finally {
      fontManager.unblockNodes(childIds)
      ctx.getRenderer()?.invalidateAllPictures()
    }
    if (ctx.getRenderer() || populated) {
      computeAllLayouts(ctx.graph, pageId)
    }
    ctx.requestRender()
  }

  function addPage(name?: string) {
    const pages = ctx.graph.getPages()
    const pageName = name ?? `Page ${pages.length + 1}`
    const page = ctx.graph.addPage(pageName)
    void switchPage(page.id)
    return page.id
  }

  function deletePage(pageId: string) {
    const pages = ctx.graph.getPages()
    if (pages.length <= 1) return
    const idx = pages.findIndex((p) => p.id === pageId)
    ctx.graph.deleteNode(pageId)
    pageViewportStore.deletePageViewport(pageId)
    if (ctx.state.currentPageId === pageId) {
      const newIdx = Math.min(idx, pages.length - 2)
      const remaining = ctx.graph.getPages()
      void switchPage(remaining[newIdx].id)
    }
  }

  function movePage(pageId: string, index: number) {
    const pages = ctx.graph.getPages()
    const currentIndex = pages.findIndex((page) => page.id === pageId)
    if (currentIndex === -1) return

    const nextIndex = Math.max(0, Math.min(index, pages.length - 1))
    if (nextIndex === currentIndex) return

    ctx.graph.insertChildAt(pageId, ctx.graph.rootId, nextIndex)
  }

  function renamePage(pageId: string, name: string) {
    ctx.graph.updateNode(pageId, { name })
  }

  function setPageColor(color: Color) {
    ctx.state.pageColor = color
    ctx.requestRender()
  }

  function getPageGuides(pageId?: string): Array<{ axis: 'X' | 'Y'; offset: number }> {
    const page = ctx.graph.getNode(pageId ?? ctx.state.currentPageId)
    const guides = page?.source?.fig?.rawNodeFields?.guides
    if (!Array.isArray(guides)) return []
    return guides.filter(
      (g): g is { axis: 'X' | 'Y'; offset: number } =>
        g != null &&
        typeof g === 'object' &&
        (g.axis === 'X' || g.axis === 'Y') &&
        typeof g.offset === 'number'
    )
  }

  function setPageGuides(guides: Array<{ axis: 'X' | 'Y'; offset: number }>, pageId?: string) {
    const targetPageId = pageId ?? ctx.state.currentPageId
    const page = ctx.graph.getNode(targetPageId)
    if (!page) return
    const prevSource = page.source
    const nextSource = {
      ...page.source,
      fig: {
        ...page.source?.fig,
        rawNodeFields: {
          ...page.source?.fig?.rawNodeFields,
          guides: structuredClone(guides)
        }
      }
    }
    const previous = { source: prevSource }
    const next = { source: nextSource }
    ctx.graph.updateNode(targetPageId, next)
    ctx.undo.push({
      label: 'Update guides',
      forward: () => {
        ctx.graph.updateNode(targetPageId, next)
        ctx.requestRender()
      },
      inverse: () => {
        ctx.graph.updateNode(targetPageId, previous)
        ctx.requestRender()
      }
    })
    ctx.requestRender()
  }

  function addPageGuide(guide: { axis: 'X' | 'Y'; offset: number }, pageId?: string) {
    const current = getPageGuides(pageId)
    setPageGuides([...current, guide], pageId)
  }

  function removePageGuide(index: number, pageId?: string) {
    const current = getPageGuides(pageId)
    if (index >= 0 && index < current.length) {
      const next = [...current]
      next.splice(index, 1)
      setPageGuides(next, pageId)
    }
  }

  function updatePageGuide(index: number, offset: number, pageId?: string) {
    const current = getPageGuides(pageId)
    if (index >= 0 && index < current.length) {
      const next = [...current]
      next[index] = { ...next[index], offset }
      setPageGuides(next, pageId)
    }
  }

  return {
    switchPage,
    addPage,
    deletePage,
    movePage,
    renamePage,
    setPageColor,
    getPageGuides,
    setPageGuides,
    addPageGuide,
    removePageGuide,
    updatePageGuide,
    clearPageViewports: pageViewportStore.clearPageViewports
  }
}
