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

    const modal = graph.createNode('FRAME', page.id, {
      name: 'Modal',
      x: 600,
      y: 0,
      width: 150,
      height: 100
    })
    modal.overlayPosition = 'TOP_CENTER'
    modal.overlayCloseOnClickOutside = true
    modal.overlayBackgroundScrim = true

    const componentSet = graph.createNode('COMPONENT_SET', page.id, {
      name: 'Toggle',
      x: 0,
      y: 300,
      width: 120,
      height: 60
    })
    const variantOff = graph.createNode('COMPONENT', componentSet.id, {
      name: 'State=Off',
      x: 0,
      y: 300,
      width: 50,
      height: 30
    })
    const variantOn = graph.createNode('COMPONENT', componentSet.id, {
      name: 'State=On',
      x: 60,
      y: 300,
      width: 50,
      height: 30
    })

    variantOff.reactions = [
      {
        trigger: 'ON_CLICK',
        timeout: 800,
        action: 'CHANGE_TO',
        destinationId: variantOn.id,
        url: '',
        transition: 'SMART_ANIMATE',
        transitionDuration: 300,
        easing: 'SPRING',
        springPreset: 'BOUNCY'
      }
    ]

    button.reactions = [
      {
        trigger: 'ON_CLICK',
        timeout: 800,
        action: 'NAVIGATE',
        destinationId: detail.id,
        url: '',
        transition: 'SLIDE_FROM_RIGHT',
        transitionDuration: 450,
        easing: 'CUSTOM_CUBIC',
        easingFunction: [0.25, 0.1, 0.25, 1]
      },
      {
        trigger: 'ON_HOVER',
        timeout: 800,
        action: 'OPEN_URL',
        destinationId: null,
        url: 'https://example.com',
        transition: 'INSTANT',
        transitionDuration: 300
      },
      {
        trigger: 'ON_CLICK',
        timeout: 800,
        action: 'OPEN_OVERLAY',
        destinationId: modal.id,
        url: '',
        transition: 'DISSOLVE',
        transitionDuration: 200,
        overlayPosition: 'TOP_CENTER',
        overlayCloseOnClickOutside: true,
        overlayBackgroundScrim: true
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
    home.prototypeStartingPoint = {
      name: 'Main Flow',
      description: 'Primary app flow',
      position: '0'
    }

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

  test('custom cubic bezier easing survives with control points', () => {
    const button = byName('Button')
    const nav = button.reactions.find((r) => r.action === 'NAVIGATE')
    expectDefined(nav)
    expect(nav.easing).toBe('CUSTOM_CUBIC')
    expect(nav.easingFunction).toBeDefined()
    expect(nav.easingFunction?.[0]).toBeCloseTo(0.25, 2)
    expect(nav.easingFunction?.[1]).toBeCloseTo(0.1, 2)
    expect(nav.easingFunction?.[2]).toBeCloseTo(0.25, 2)
    expect(nav.easingFunction?.[3]).toBeCloseTo(1, 2)
  })

  test('change_to interactive component variant switching survives', () => {
    const variantOff = byName('State=Off')
    const variantOn = byName('State=On')
    const changeTo = variantOff.reactions.find((r) => r.action === 'CHANGE_TO')
    expectDefined(changeTo)
    expect(changeTo.trigger).toBe('ON_CLICK')
    expect(changeTo.destinationId).toBe(variantOn.id)
    expect(changeTo.transition).toBe('SMART_ANIMATE')
    expect(changeTo.transitionDuration).toBe(300)
    expect(changeTo.easing).toBe('SPRING')
    expect(changeTo.springPreset).toBe('BOUNCY')
  })

  test('open_overlay reaction survives with overlay settings', () => {
    const button = byName('Button')
    const modal = byName('Modal')
    const overlay = button.reactions.find((r) => r.action === 'OPEN_OVERLAY')
    expectDefined(overlay)
    expect(overlay.destinationId).toBe(modal.id)
    expect(overlay.overlayPosition).toBe('TOP_CENTER')
    expect(overlay.overlayCloseOnClickOutside).toBe(true)
    expect(overlay.overlayBackgroundScrim).toBe(true)
  })

  test('frame prototype starting point survives with name and description', () => {
    const home = byName('Home')
    expect(home.prototypeStartingPoint).toBeDefined()
    expect(home.prototypeStartingPoint?.name).toBe('Main Flow')
    expect(home.prototypeStartingPoint?.description).toBe('Primary app flow')
  })

  test('nodes without reactions import with an empty list', () => {
    const home = byName('Home')
    expect(home.reactions).toEqual([])
  })
})
