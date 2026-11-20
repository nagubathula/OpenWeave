import { afterEach, beforeEach, describe, expect, test } from 'bun:test'

import {
  closeRunningPlugin,
  connectPluginUI,
  runPlugin,
  sendFromPluginUI
} from '@/app/plugins/host'
import { parsePluginManifest } from '@/app/plugins/manifest'
import type { InstalledPlugin } from '@/app/plugins/storage'
import { lastPluginRun, runningPlugin } from '@/app/plugins/store'
import { closeTab, createTab, getTabsSnapshot, type Tab } from '@/app/tabs'

function plugin(code: string, ui: string | null = null): InstalledPlugin {
  return {
    id: 'test-plugin',
    name: 'Test Plugin',
    manifest: parsePluginManifest(
      JSON.stringify({ name: 'Test Plugin', id: 'test-plugin', main: 'code.js', api: '1.0.0' })
    ),
    code,
    ui,
    installedAt: new Date(0).toISOString()
  }
}

function nodesNamed(tab: Tab, name: string) {
  return [...tab.store.graph.getAllNodes()].filter((node) => node.name === name)
}

describe('plugin host', () => {
  let tab: Tab

  beforeEach(() => {
    for (const open of getTabsSnapshot()) closeTab(open.id, { force: true })
    tab = createTab()
  })

  afterEach(() => closeRunningPlugin())

  test('a plugin edits the document, selects its result, and closes', async () => {
    await runPlugin(
      plugin(`
        const rect = figma.createRectangle()
        rect.name = 'Made by plugin'
        figma.currentPage.selection = [rect]
        figma.closePlugin()
      `)
    )
    const [rect] = nodesNamed(tab, 'Made by plugin')
    expect(rect).toBeDefined()
    expect([...tab.store.state.selectedIds]).toEqual([rect?.id])
    expect(runningPlugin.get()).toBeNull()
    expect(tab.store.undo.canUndo).toBe(true)

    tab.store.undo.undo()
    expect(nodesNamed(tab, 'Made by plugin')).toHaveLength(0)
  })

  test('UI messages round-trip between the iframe and plugin code', async () => {
    await runPlugin(
      plugin(
        `
        figma.showUI(__html__, { width: 240, height: 120 })
        figma.ui.onmessage = (message) => {
          if (message.type !== 'create') return
          const rect = figma.createRectangle()
          rect.name = message.name
          figma.ui.postMessage({ created: rect.name })
        }
        figma.ui.postMessage({ ready: true })
      `,
        '<p>Hello</p>'
      )
    )
    const state = runningPlugin.get()
    expect(state?.ui).toMatchObject({
      html: '<p>Hello</p>',
      width: 240,
      height: 120,
      visible: true
    })

    const received: unknown[] = []
    const runId = state?.runId ?? 0
    const disconnect = connectPluginUI(runId, (message) => received.push(message))
    // Messages sent before the iframe connected are delivered on connect.
    expect(received).toEqual([{ ready: true }])

    sendFromPluginUI(runId, { type: 'create', name: 'From UI' })
    expect(nodesNamed(tab, 'From UI')).toHaveLength(1)
    expect(received).toEqual([{ ready: true }, { created: 'From UI' }])
    disconnect()
  })

  test('plugins see the current selection and hear selection changes', async () => {
    const rect = tab.store.graph.createNode('RECTANGLE', tab.store.state.currentPageId, {
      name: 'Existing'
    })
    tab.store.select([rect.id])
    await runPlugin(
      plugin(`
        figma.showUI('<p></p>', { visible: false })
        const names = () => figma.currentPage.selection.map((node) => node.name).join(',')
        figma.notify('selected ' + names())
        figma.on('selectionchange', () => {
          figma.currentPage.findOne((node) => node.name === 'Existing').name = 'Seen: ' + names()
        })
      `)
    )
    tab.store.clearSelection()
    expect(tab.store.graph.getNode(rect.id)?.name).toBe('Seen: ')
  })

  test('the menu command reaches figma.command and the run event', async () => {
    await runPlugin(
      plugin(`
        figma.on('run', ({ command }) => {
          figma.createRectangle().name = 'run:' + command + ':' + figma.command
          figma.closePlugin()
        })
      `),
      'make-rect'
    )
    expect(nodesNamed(tab, 'run:make-rect:make-rect')).toHaveLength(1)
    expect(lastPluginRun.get()).toEqual({ pluginId: 'test-plugin', command: 'make-rect' })
  })

  test('running another plugin closes the first and fires its close handler', async () => {
    await runPlugin(plugin(`figma.on('close', () => { figma.createRectangle().name = 'closed' })`))
    const first = runningPlugin.get()?.runId
    await runPlugin(plugin(`figma.createRectangle().name = 'second'`))
    expect(nodesNamed(tab, 'closed')).toHaveLength(1)
    expect(runningPlugin.get()?.runId).not.toBe(first)
  })
})
