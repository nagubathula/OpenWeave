import { beforeAll, describe, expect, setDefaultTimeout, test } from 'bun:test'

import { exportFigFile, initCodec, parseFigFile, SceneGraph, type SceneNode } from '@openweave/core'

import { expectDefined } from '#tests/helpers/assert'

setDefaultTimeout(60_000)

describe('roundtrip: prototype reactions', () => {
  let reImported: SceneGraph

  beforeAll(async () => {
    await initCodec()

    const graph = new SceneGraph()
    const page = graph.getPages()[0]

    const home = graph.createNode('FRAME', page.id, {
      name: 'Home',
      x: 0,
      y: 0,
      width: 200,
      height: 200
    })
    const detail = graph.createNode('FRAME', page.id, {
      name: 'Detail',
      x: 300,
      y: 0,
      width: 200,
      height: 200
    })
    const button = graph.createNode('RECTANGLE', home.id, {
      name: 'Button',
      x: 20,
      y: 20,
      width: 80,
      height: 32
    })

    button.reactions = [
      {
        trigger: 'ON_CLICK',
        timeout: 800,
        action: 'NAVIGATE',
        destinationId: detail.id,
        url: '',
        transition: 'SLIDE_FROM_RIGHT',
        transitionDuration: 450
      },
      {
        trigger: 'ON_HOVER',
        timeout: 800,
        action: 'OPEN_URL',
        destinationId: null,
        url: 'https://example.com',
        transition: 'INSTANT',
        transitionDuration: 300
      }
    ]
    detail.reactions = [
      {
        trigger: 'AFTER_TIMEOUT',
        timeout: 1200,
        action: 'BACK',
        destinationId: null,
        url: '',
        transition: 'DISSOLVE',
        transitionDuration: 250
      }
    ]
    page.prototypeStartNodeId = home.id

    const bytes = await exportFigFile(graph)
    reImported = await parseFigFile(bytes.slice().buffer)
  })

  function byName(name: string): SceneNode {
    const all: SceneNode[] = []
    const visit = (id: string) => {
      const node = reImported.getNode(id)
      if (!node) return
      all.push(node)
      for (const childId of node.childIds) visit(childId)
    }
    for (const page of reImported.getPages()) {
      all.push(page)
      for (const childId of page.childIds) visit(childId)
    }
    const found = all.find((n) => n.name === name)
    expectDefined(found)
    return found
  }

  test('navigate reaction survives with destination, transition, and duration', () => {
    const button = byName('Button')
    const detail = byName('Detail')
    const nav = button.reactions.find((r) => r.action === 'NAVIGATE')
    expectDefined(nav)
    expect(nav.trigger).toBe('ON_CLICK')
    expect(nav.destinationId).toBe(detail.id)
    expect(nav.transition).toBe('SLIDE_FROM_RIGHT')
    expect(nav.transitionDuration).toBe(450)
  })

  test('open-url hover reaction survives', () => {
    const button = byName('Button')
    const link = button.reactions.find((r) => r.action === 'OPEN_URL')
    expectDefined(link)
    expect(link.trigger).toBe('ON_HOVER')
    expect(link.url).toBe('https://example.com')
  })

  test('after-delay back reaction survives with timeout', () => {
    const detail = byName('Detail')
    const back = detail.reactions.find((r) => r.action === 'BACK')
    expectDefined(back)
    expect(back.trigger).toBe('AFTER_TIMEOUT')
    expect(back.timeout).toBe(1200)
    expect(back.transition).toBe('DISSOLVE')
  })

  test('flow starting point survives on the page', () => {
    const page = reImported.getPages()[0]
    const home = byName('Home')
    expect(page.prototypeStartNodeId).toBe(home.id)
  })

  test('nodes without reactions import with an empty list', () => {
    const home = byName('Home')
    expect(home.reactions).toEqual([])
  })
})
