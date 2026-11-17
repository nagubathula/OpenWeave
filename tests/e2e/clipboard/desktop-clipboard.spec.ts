import type { Page } from '@playwright/test'

import { expect, test } from '#tests/e2e/fixtures'
import { CanvasHelper } from '#tests/helpers/canvas'

type PageChildSummary = {
  name: string
  type: string
}

/**
 * Installs a fake Electron preload bridge (`window.electron`). Clipboard calls
 * are recorded; every other bridge method resolves to a harmless default.
 */
async function installDesktopClipboardMock(page: Page) {
  await page.addInitScript(() => {
    const state = {
      text: '',
      html: '',
      writes: [] as Array<{ cmd: string; args: unknown }>
    }

    Object.defineProperty(window, '__OPENWEAVE_TEST_CLIPBOARD__', {
      configurable: true,
      value: state
    })

    const clipboard = {
      writeHtml: async (html: string, altText?: string) => {
        state.writes.push({ cmd: 'clipboard.writeHtml', args: { html, altText } })
        state.html = html
        state.text = altText ?? html
      },
      writeText: async (text: string) => {
        state.writes.push({ cmd: 'clipboard.writeText', args: { text } })
        state.text = text
        state.html = ''
      },
      readText: async () => state.text,
      readHtml: async () => state.html || null
    }
    const overrides: Record<string, Record<string, unknown>> = {
      clipboard,
      fonts: { listFamilies: async () => [], loadFont: async () => null },
      app: {
        getPath: async () => '/mock/user-data',
        takePendingOpenFiles: async () => [],
        onOpenFiles: () => () => {}
      },
      menu: { onCommand: () => () => {} },
      path: {
        join: async (...parts: string[]) => parts.join('/'),
        dirname: (p: string) => p.slice(0, p.lastIndexOf('/')),
        basename: (p: string) => p.slice(p.lastIndexOf('/') + 1),
        extname: (p: string) => (p.includes('.') ? p.slice(p.lastIndexOf('.')) : '')
      },
      fs: {
        readFile: async () => {
          throw new Error('ENOENT')
        },
        exists: async () => false
      },
      updater: { check: async () => ({ status: 'unsupported' }) },
      credentials: {
        availability: async () => ({ ok: true, value: 'available' }),
        status: async () => ({ ok: true, value: 'missing' }),
        read: async () => ({ ok: true, value: null })
      }
    }
    const namespace = (name: string) =>
      new Proxy(overrides[name] ?? {}, {
        get: (target, key: string) => target[key] ?? (async () => null)
      })
    const base: { isElectron: true; platform: string } = { isElectron: true, platform: 'linux' }
    const bridge = new Proxy(base, {
      get: (target, key: string) =>
        key === 'isElectron' || key === 'platform' ? target[key] : namespace(key),
      has: () => true
    })
    Object.defineProperty(window, 'electron', { configurable: true, value: bridge })
  })
}

async function createDesktopEditorPage(page: Page) {
  await installDesktopClipboardMock(page)
  await page.goto('/')
  const canvas = new CanvasHelper(page)
  await canvas.waitForInit()
  return canvas
}

function pageChildren(page: Page): Promise<PageChildSummary[]> {
  return page.evaluate(() => {
    const store = window.openWeave?.getStore?.()
    if (!store) throw new Error('OpenWeave store not initialized')
    return store.graph.getChildren(store.state.currentPageId).map((node) => ({
      name: node.name,
      type: node.type
    }))
  })
}

function selectedCount(page: Page): Promise<number> {
  return page.evaluate(() => {
    const store = window.openWeave?.getStore?.()
    if (!store) throw new Error('OpenWeave store not initialized')
    return store.state.selectedIds.size
  })
}

function testClipboard(page: Page) {
  return page.evaluate(() => window.__OPENWEAVE_TEST_CLIPBOARD__)
}

async function dispatchClipboardEvent(page: Page, type: 'copy' | 'cut' | 'paste') {
  await page.evaluate((eventType) => {
    window.dispatchEvent(new ClipboardEvent(eventType, { bubbles: true, cancelable: true }))
  }, type)
}

test('desktop copy writes selected design HTML without requiring ClipboardEvent.clipboardData', async ({
  page
}) => {
  const canvas = await createDesktopEditorPage(page)
  await canvas.drawRect(160, 160, 96, 72)

  await dispatchClipboardEvent(page, 'copy')

  await expect
    .poll(() => testClipboard(page))
    .toMatchObject({
      text: 'Rectangle'
    })
  const clipboard = await testClipboard(page)
  expect(clipboard.html).toContain('(figma)')
  expect(clipboard.writes.some((entry) => entry.cmd === 'clipboard.writeHtml')).toBe(true)
  await expect(page.getByText('Clipboard access is blocked in this browser context')).toHaveCount(0)
  canvas.assertNoErrors()
})

test('desktop paste restores copied design data from the main-process clipboard', async ({
  page
}) => {
  const canvas = await createDesktopEditorPage(page)
  await canvas.drawRect(160, 160, 96, 72)
  await dispatchClipboardEvent(page, 'copy')
  await expect.poll(() => testClipboard(page)).toMatchObject({ text: 'Rectangle' })

  expect(await pageChildren(page)).toHaveLength(1)
  await canvas.deleteSelection()
  expect(await pageChildren(page)).toHaveLength(0)

  await dispatchClipboardEvent(page, 'paste')
  await canvas.waitForRender()

  const children = await pageChildren(page)
  expect(children).toEqual([{ name: 'Rectangle', type: 'RECTANGLE' }])
  expect(await selectedCount(page)).toBe(1)
  await expect(page.getByText('Clipboard access is blocked in this browser context')).toHaveCount(0)
  canvas.assertNoErrors()
})

test('desktop cut writes design data and deletes selection only after clipboard write succeeds', async ({
  page
}) => {
  const canvas = await createDesktopEditorPage(page)
  await canvas.drawRect(160, 160, 96, 72)

  await dispatchClipboardEvent(page, 'cut')
  await canvas.waitForRender()

  await expect.poll(() => pageChildren(page)).toEqual([])
  const clipboard = await testClipboard(page)
  expect(clipboard.html).toContain('(figma)')
  expect(clipboard.text).toBe('Rectangle')
  await expect(page.getByText('Clipboard access is blocked in this browser context')).toHaveCount(0)
  canvas.assertNoErrors()
})

test('desktop context-menu copy uses the bridge clipboard instead of blocked browser command', async ({
  page
}) => {
  const canvas = await createDesktopEditorPage(page)
  await canvas.drawRect(160, 160, 96, 72)

  const box = await canvas.canvas.boundingBox()
  if (!box) throw new Error('Canvas has no bounding box')
  await page.mouse.click(box.x + 190, box.y + 190, { button: 'right' })
  await page.getByTestId('context-copy').click()

  await expect.poll(() => testClipboard(page)).toMatchObject({ text: 'Rectangle' })
  await expect(page.getByText('Clipboard access is blocked in this browser context')).toHaveCount(0)
  canvas.assertNoErrors()
})
