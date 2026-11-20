import { describe, expect, test } from 'bun:test'

import { FigmaAPI } from '@openweave/core/figma-api'
import { SceneGraph } from '@openweave/scene-graph'

import { PluginSandbox, type PluginSandboxOptions } from '@/app/plugins/sandbox'

interface Harness {
  sandbox: PluginSandbox
  api: FigmaAPI
  graph: SceneGraph
  logs: string[]
  errors: Error[]
  entries: number
}

async function createHarness(
  extra: Partial<PluginSandboxOptions> = {},
  figma?: (api: FigmaAPI) => object
): Promise<Harness> {
  const graph = new SceneGraph()
  const api = new FigmaAPI(graph)
  const harness: Harness = {
    sandbox: undefined as unknown as PluginSandbox,
    api,
    graph,
    logs: [],
    errors: [],
    entries: 0
  }
  harness.sandbox = await PluginSandbox.create({
    figma: figma ? figma(api) : api,
    mixed: api.mixed,
    onLog: (level, message) => harness.logs.push(`${level}:${message}`),
    onError: (error) => harness.errors.push(error),
    onEntryEnd: () => {
      harness.entries++
    },
    ...extra
  })
  return harness
}

function nextTick(ms = 0) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

describe('plugin sandbox', () => {
  test('plugin code edits the document through figma', async () => {
    const h = await createHarness()
    h.sandbox.run(`
      const rect = figma.createRectangle()
      rect.name = 'From plugin'
      rect.resize(120, 80)
      rect.fills = [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 } }]
      figma.currentPage.selection = [rect]
      console.log('made', rect.name, rect.width, figma.currentPage.selection.length)
    `)
    expect(h.errors).toEqual([])
    const rect = [...h.graph.getAllNodes()].find((node) => node.name === 'From plugin')
    expect(rect?.width).toBe(120)
    expect(rect?.fills[0]?.type).toBe('SOLID')
    expect(h.logs).toEqual(['log:made From plugin 120 1'])
    expect(h.entries).toBe(1)
    h.sandbox.dispose()
  })

  test('host objects keep their identity and callbacks run in the sandbox', async () => {
    const h = await createHarness()
    h.sandbox.run(`
      figma.createRectangle().name = 'a'
      figma.createEllipse().name = 'b'
      const same = figma.currentPage === figma.currentPage
      const names = figma.currentPage.findAll((node) => node.type === 'ELLIPSE').map((n) => n.name)
      console.log(same, JSON.stringify(names), figma.mixed === figma.mixed, typeof figma.mixed)
    `)
    expect(h.errors).toEqual([])
    expect(h.logs).toEqual(['log:true ["b"] true symbol'])
    h.sandbox.dispose()
  })

  test('plugin code cannot reach the page, network or host internals', async () => {
    const h = await createHarness()
    h.sandbox.run(`
      console.log([typeof window, typeof document, typeof fetch, typeof require,
        typeof process, typeof __host_get, typeof __figma_wire, typeof XMLHttpRequest].join(','))
    `)
    expect(h.logs).toEqual([
      'log:undefined,undefined,undefined,undefined,undefined,undefined,undefined,undefined'
    ])
    h.sandbox.dispose()
  })

  test('async host APIs resolve inside the sandbox', async () => {
    const h = await createHarness()
    h.sandbox.run(`
      ;(async () => {
        await figma.loadFontAsync({ family: 'Inter', style: 'Regular' })
        const text = figma.createText()
        text.characters = 'Hello'
        console.log('font loaded', text.characters)
      })()
    `)
    await nextTick()
    expect(h.errors).toEqual([])
    expect(h.logs).toEqual(['log:font loaded Hello'])
    h.sandbox.dispose()
  })

  test('timers call back into the sandbox and stop on dispose', async () => {
    const h = await createHarness()
    h.sandbox.run(`
      setTimeout((label) => console.log('timeout', label), 5, 'once')
      let ticks = 0
      const interval = setInterval(() => { ticks++; if (ticks === 2) { clearInterval(interval); console.log('ticks', ticks) } }, 5)
    `)
    await nextTick(60)
    expect(h.logs).toEqual(['log:timeout once', 'log:ticks 2'])
    h.sandbox.dispose()
  })

  test('errors are reported, and runaway code is stopped', async () => {
    const h = await createHarness({ entryTimeoutMs: 100 })
    h.sandbox.run(`throw new Error('boom')`)
    h.sandbox.run(`while (true) {}`)
    expect(h.errors.map((error) => error.message)).toEqual(['boom', 'interrupted'])
    h.sandbox.run(`console.log('still usable')`)
    expect(h.logs).toEqual(['log:still usable'])
    h.sandbox.dispose()
  })

  test('host errors surface as exceptions inside the sandbox', async () => {
    const h = await createHarness()
    h.sandbox.run(`
      try { figma.getNodeById('missing').name } catch (error) { console.log('caught', error instanceof TypeError || error instanceof Error) }
    `)
    expect(h.logs).toEqual(['log:caught true'])
    h.sandbox.dispose()
  })

  test('bytes cross the boundary as Uint8Array', async () => {
    const h = await createHarness({}, (api) => ({
      echo: (bytes: Uint8Array) => bytes.map((value) => value * 2),
      mixed: api.mixed
    }))
    h.sandbox.run(`
      const out = figma.echo(new Uint8Array([1, 2, 3]))
      console.log(out instanceof Uint8Array, Array.from(out).join(','))
    `)
    expect(h.logs).toEqual(['log:true 2,4,6'])
    h.sandbox.dispose()
  })
})
