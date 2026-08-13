import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'

import type { Page } from '@playwright/test'

import type { DesignDocument } from '@openweave/dom-css'

const BROWSER_RUNTIME_ENTRY = join(process.cwd(), 'packages/dom-css/src/runtime/browser.ts')
const DOM_CSS_BROWSER_ENTRY = join(process.cwd(), 'packages/dom-css/src/browser.ts')

/**
 * The dev server no longer transpiles arbitrary TypeScript on request (that was a Vite
 * `/@fs` feature), so each entry is bundled once per test run with `bun build` and
 * imported in the page through a Blob URL.
 */
const bundleCache = new Map<string, string>()

function bundledModuleSource(entry: string): string {
  let source = bundleCache.get(entry)
  if (source === undefined) {
    const outfile = join(mkdtempSync(join(tmpdir(), 'openweave-domcss-')), 'bundle.mjs')
    // shell: true lets Windows resolve `bun` -> bun.exe via PATHEXT.
    execFileSync('bun', ['build', entry, '--target=browser', '--format=esm', `--outfile=${outfile}`], {
      stdio: 'pipe',
      shell: process.platform === 'win32'
    })
    source = readFileSync(outfile, 'utf8')
    bundleCache.set(entry, source)
  }
  return source
}

/**
 * Loads the bundled module into the page and stashes its namespace on
 * `window.__openweaveTestModule`, where the evaluate callbacks below read it.
 */
async function importBundledModule(page: Page, entry: string): Promise<void> {
  const source = bundledModuleSource(entry)
  await page.evaluate(async (moduleSource) => {
    const url = URL.createObjectURL(new Blob([moduleSource], { type: 'text/javascript' }))
    try {
      const holder = window as typeof window & { __openweaveTestModule?: unknown }
      holder.__openweaveTestModule = await import(/* webpackIgnore: true */ url)
    } finally {
      URL.revokeObjectURL(url)
    }
  }, source)
}

async function ensureAppPage(page: Page) {
  if (!page.url().startsWith('http://localhost:1420')) {
    await page.goto('/')
  }
}

export async function setStyledContent(page: Page, css: string, body: string) {
  await page.setContent(`
    <style>${css}</style>
    ${body}
  `)
}

export async function browserRuntimeComputeStyles(
  page: Page,
  document: DesignDocument,
  cssText: string,
  sandbox: 'shadow-root' | 'iframe' = 'iframe'
) {
  await ensureAppPage(page)
  await importBundledModule(page, BROWSER_RUNTIME_ENTRY)

  return page.evaluate(
    ({ designDocument, css, sandboxMode }) => {
      const holder = window as typeof window & { __openweaveTestModule?: unknown }
      const { createBrowserCSSRuntime } = holder.__openweaveTestModule as {
        createBrowserCSSRuntime: (options: unknown) => {
          computeStyles: (doc: unknown, css: string) => unknown
        }
      }
      const runtime = createBrowserCSSRuntime({ document: window.document, sandbox: sandboxMode })
      return runtime.computeStyles(designDocument, css)
    },
    {
      designDocument: document,
      css: cssText,
      sandboxMode: sandbox
    }
  )
}

export async function publicBrowserHTMLSceneGraph(page: Page, html: string, cssText = '') {
  await ensureAppPage(page)
  await page.setContent('<main></main>')
  await importBundledModule(page, DOM_CSS_BROWSER_ENTRY)

  return page.evaluate(
    async ({ sourceHTML, css }) => {
      const holder = window as typeof window & { __openweaveTestModule?: unknown }
      const { browserHTMLToSceneGraph } = holder.__openweaveTestModule as {
        browserHTMLToSceneGraph: (html: string, options: { cssText: string }) => Promise<any>
      }
      const graph = await browserHTMLToSceneGraph(sourceHTML, { cssText: css })
      const pageNode = graph.getPages()[0]
      const card = pageNode ? graph.getChildren(pageNode.id)[0] : undefined
      return card
        ? {
            height: card.height,
            itemSpacing: card.itemSpacing,
            layoutMode: card.layoutMode,
            paddingLeft: card.paddingLeft,
            type: card.type,
            width: card.width
          }
        : null
    },
    { sourceHTML: html, css: cssText }
  )
}

export async function publicBrowserSceneGraph(page: Page, classes: string[], cssText: string) {
  await ensureAppPage(page)
  await page.setContent('<main></main>')
  await importBundledModule(page, DOM_CSS_BROWSER_ENTRY)

  return page.evaluate(
    async ({ candidates, css }) => {
      const holder = window as typeof window & { __openweaveTestModule?: unknown }
      const { browserJSXToSceneGraph, jsx } = holder.__openweaveTestModule as {
        browserJSXToSceneGraph: (element: unknown, options: { cssText: string }) => Promise<any>
        jsx: (type: string, props: Record<string, unknown>) => unknown
      }
      const graph = await browserJSXToSceneGraph(
        jsx('article', {
          class: candidates.join(' '),
          children: jsx('h1', { children: 'OpenWeave' })
        }),
        { cssText: css }
      )
      const pageNode = graph.getPages()[0]
      const card = pageNode ? graph.getChildren(pageNode.id)[0] : undefined
      return card
        ? {
            height: card.height,
            itemSpacing: card.itemSpacing,
            layoutMode: card.layoutMode,
            paddingLeft: card.paddingLeft,
            type: card.type,
            width: card.width
          }
        : null
    },
    { candidates: classes, css: cssText }
  )
}

export async function publicBrowserImageNode(page: Page, html: string, cssText: string) {
  await ensureAppPage(page)
  await page.setContent('<main></main>')
  await importBundledModule(page, DOM_CSS_BROWSER_ENTRY)

  return page.evaluate(
    async ({ sourceHTML, css }) => {
      const holder = window as typeof window & { __openweaveTestModule?: unknown }
      const { browserHTMLToSceneGraph } = holder.__openweaveTestModule as {
        browserHTMLToSceneGraph: (html: string, options: { cssText: string }) => Promise<any>
      }
      const graph = await browserHTMLToSceneGraph(sourceHTML, { cssText: css })
      const pageNode = graph.getPages()[0]
      const image = pageNode ? graph.getChildren(pageNode.id)[0] : undefined
      const fill = image?.fills[0]
      return image
        ? {
            fillType: fill?.type,
            hasImageBytes: fill?.imageHash ? graph.images.has(fill.imageHash) : false,
            height: image.height,
            imageScaleMode: fill?.imageScaleMode,
            type: image.type,
            width: image.width
          }
        : null
    },
    { sourceHTML: html, css: cssText }
  )
}

export async function publicBrowserTextNode(page: Page, html: string, cssText: string) {
  await ensureAppPage(page)
  await page.setContent('<main></main>')
  await importBundledModule(page, DOM_CSS_BROWSER_ENTRY)

  return page.evaluate(
    async ({ sourceHTML, css }) => {
      const holder = window as typeof window & { __openweaveTestModule?: unknown }
      const { browserHTMLToSceneGraph } = holder.__openweaveTestModule as {
        browserHTMLToSceneGraph: (html: string, options: { cssText: string }) => Promise<any>
      }
      const graph = await browserHTMLToSceneGraph(sourceHTML, { cssText: css })
      return graph.getAllNodes().find((node) => node.type === 'TEXT')
    },
    { sourceHTML: html, css: cssText }
  )
}

export async function computedStyleProperties(
  page: Page,
  selector: string,
  properties: readonly string[]
) {
  return page.locator(selector).evaluate((element, styleProperties) => {
    const computed = getComputedStyle(element)
    return Object.fromEntries(
      styleProperties.map((property) => [property, computed.getPropertyValue(property)])
    )
  }, properties)
}
