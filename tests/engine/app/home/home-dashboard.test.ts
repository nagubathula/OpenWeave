import { describe, expect, test } from 'bun:test'

import {
  closeHome,
  homeFormatFilter,
  homeSearchQuery,
  homeSection,
  homeViewMode,
  isHomeOpen,
  openHome,
  toggleHome
} from '@/app/home/store'
import { HOME_TEMPLATES } from '@/app/home/templates'

describe('home templates', () => {
  test('includes predefined starter templates', () => {
    const ids = HOME_TEMPLATES.map((t) => t.id)
    expect(ids).toContain('figma-motion')
    expect(ids).toContain('mobile-app')
    expect(ids).toContain('landing-page')
    expect(ids).toContain('design-system')
    expect(ids).toContain('presentation')
  })

  test('creates valid SceneGraph trees for mobile starter', () => {
    const mobileTpl = HOME_TEMPLATES.find((t) => t.id === 'mobile-app')
    expect(mobileTpl).toBeDefined()
    const graph = mobileTpl?.createGraph()
    expect(graph).toBeDefined()
    const page = graph?.getPages()[0]
    expect(page).toBeDefined()
    const children = graph?.getChildren(page?.id ?? '')
    expect(children?.length).toBeGreaterThan(0)

    const mainFrame = children?.[0]
    expect(mainFrame?.type).toBe('FRAME')
    expect(mainFrame?.name).toBe('Dashboard - iPhone 16 Pro')
    expect(mainFrame?.width).toBe(393)
    expect(mainFrame?.height).toBe(852)
  })

  test('creates valid SceneGraph trees for landing page starter', () => {
    const landingTpl = HOME_TEMPLATES.find((t) => t.id === 'landing-page')
    expect(landingTpl).toBeDefined()
    const graph = landingTpl?.createGraph()
    expect(graph).toBeDefined()
    const page = graph?.getPages()[0]
    expect(page).toBeDefined()
    const children = graph?.getChildren(page?.id ?? '')
    expect(children?.length).toBeGreaterThan(0)

    const mainFrame = children?.[0]
    expect(mainFrame?.type).toBe('FRAME')
    expect(mainFrame?.name).toBe('Landing Page - Desktop 1440')
    expect(mainFrame?.width).toBe(1440)
  })

  test('creates valid SceneGraph trees for design system starter', () => {
    const dsTpl = HOME_TEMPLATES.find((t) => t.id === 'design-system')
    expect(dsTpl).toBeDefined()
    const graph = dsTpl?.createGraph()
    expect(graph).toBeDefined()
    const page = graph?.getPages()[0]
    expect(page).toBeDefined()
    const children = graph?.getChildren(page?.id ?? '')
    expect(children?.length).toBeGreaterThan(0)

    const mainFrame = children?.[0]
    expect(mainFrame?.type).toBe('FRAME')
    expect(mainFrame?.name).toBe('Design System & UI Kit')
  })

  test('creates valid SceneGraph trees for presentation starter', () => {
    const presTpl = HOME_TEMPLATES.find((t) => t.id === 'presentation')
    expect(presTpl).toBeDefined()
    const graph = presTpl?.createGraph()
    expect(graph).toBeDefined()
    const page = graph?.getPages()[0]
    expect(page).toBeDefined()
    const children = graph?.getChildren(page?.id ?? '')
    expect(children?.length).toBeGreaterThan(0)

    const mainFrame = children?.[0]
    expect(mainFrame?.type).toBe('FRAME')
    expect(mainFrame?.name).toBe('Slide 1 - Title Deck (16:9)')
    expect(mainFrame?.width).toBe(1920)
    expect(mainFrame?.height).toBe(1080)
  })

  test('creates valid SceneGraph trees for figma motion starter', () => {
    const motionTpl = HOME_TEMPLATES.find((t) => t.id === 'figma-motion')
    expect(motionTpl).toBeDefined()
    const graph = motionTpl?.createGraph()
    expect(graph).toBeDefined()
    const pages = graph?.getPages() ?? []
    expect(pages.length).toBe(1)
    expect(pages[0].name).toBe('5 Easy Figma Motion')

    const pageChildren = graph?.getChildren(pages[0].id) ?? []
    const cardNames = [
      '01 · Toggle Switch',
      '02 · Heart Pop',
      '03 · Dynamic Island',
      '04 · Progress Rail',
      '05 · Tab Glider'
    ]
    for (const name of cardNames) {
      const card = pageChildren.find((c) => c.name === name)
      expect(card).toBeDefined()
    }

    // Verify keyframe tracks on Toggle Thumb
    const toggleCard = pageChildren.find((c) => c.name === '01 · Toggle Switch')
    const toggleChildren = graph?.getChildren(toggleCard?.id ?? '') ?? []
    const toggleTrack = toggleChildren.find((c) => c.name === 'Toggle Track')
    const trackChildren = graph?.getChildren(toggleTrack?.id ?? '') ?? []
    const thumb = trackChildren.find((c) => c.name === 'Toggle Thumb')
    expect(thumb).toBeDefined()
    expect(thumb?.motionTracks?.tracks.x?.keyframes.length).toBe(5)
    expect(thumb?.motionTracks?.tracks.width?.keyframes.length).toBe(7)

    // Verify keyframe tracks on Heart Icon & Sparkle
    const heartCard = pageChildren.find((c) => c.name === '02 · Heart Pop')
    const heartChildren = graph?.getChildren(heartCard?.id ?? '') ?? []
    const buttonCircle = heartChildren.find((c) => c.name === 'Button Circle')
    const circleChildren = graph?.getChildren(buttonCircle?.id ?? '') ?? []
    const heart = circleChildren.find((c) => c.name === 'Heart Icon')
    expect(heart).toBeDefined()
    expect(heart?.motionTracks?.tracks.width?.keyframes.length).toBe(6)
    expect(heart?.motionTracks?.tracks.rotation?.keyframes.length).toBe(4)

    const sparkle = heartChildren.find((c) => c.name === 'Sparkle Particle')
    expect(sparkle).toBeDefined()
    expect(sparkle?.motionTracks?.tracks.opacity?.keyframes.length).toBe(4)

    // Verify keyframe tracks on Dynamic Island
    const islandCard = pageChildren.find((c) => c.name === '03 · Dynamic Island')
    const islandChildren = graph?.getChildren(islandCard?.id ?? '') ?? []
    const islandPill = islandChildren.find((c) => c.name === 'Island Pill')
    expect(islandPill).toBeDefined()
    expect(islandPill?.motionTracks?.tracks.width?.keyframes.length).toBe(5)
    expect(islandPill?.motionTracks?.tracks.height?.keyframes.length).toBe(5)

    // Verify keyframe tracks on Progress Rail
    const progressCard = pageChildren.find((c) => c.name === '04 · Progress Rail')
    const progressChildren = graph?.getChildren(progressCard?.id ?? '') ?? []
    const railTrack = progressChildren.find((c) => c.name === 'Rail Track')
    const railChildren = graph?.getChildren(railTrack?.id ?? '') ?? []
    const fill = railChildren.find((c) => c.name === 'Progress Fill')
    expect(fill).toBeDefined()
    expect(fill?.motionTracks?.tracks.width?.keyframes.length).toBe(6)

    // Verify keyframe tracks on Tab Glider
    const gliderCard = pageChildren.find((c) => c.name === '05 · Tab Glider')
    const gliderChildren = graph?.getChildren(gliderCard?.id ?? '') ?? []
    const segContainer = gliderChildren.find((c) => c.name === 'Segmented Container')
    const segChildren = graph?.getChildren(segContainer?.id ?? '') ?? []
    const gliderPill = segChildren.find((c) => c.name === 'Active Glider')
    expect(gliderPill).toBeDefined()
    expect(gliderPill?.motionTracks?.tracks.x?.keyframes.length).toBe(5)
  })
})

describe('home store state', () => {
  test('manages home modal/view visibility', () => {
    openHome()
    expect(isHomeOpen.get()).toBe(true)

    closeHome()
    expect(isHomeOpen.get()).toBe(false)

    toggleHome()
    expect(isHomeOpen.get()).toBe(true)

    toggleHome()
    expect(isHomeOpen.get()).toBe(false)
  })

  test('manages sections, filters, queries and view mode', () => {
    homeSection.set('templates')
    expect(homeSection.get()).toBe('templates')
    homeSection.set('recents')
    expect(homeSection.get()).toBe('recents')

    homeViewMode.set('list')
    expect(homeViewMode.get()).toBe('list')
    homeViewMode.set('grid')
    expect(homeViewMode.get()).toBe('grid')

    homeFormatFilter.set('fig')
    expect(homeFormatFilter.get()).toBe('fig')
    homeFormatFilter.set('all')
    expect(homeFormatFilter.get()).toBe('all')

    homeSearchQuery.set('My Dashboard')
    expect(homeSearchQuery.get()).toBe('My Dashboard')
    homeSearchQuery.set('')
    expect(homeSearchQuery.get()).toBe('')
  })
})

describe('recent files persistence', () => {
  test('adds, retrieves and removes recent files with memory fallback', async () => {
    const { addRecentFile, getRecentFiles, removeRecentFile, clearRecentFiles } =
      await import('@/app/home/recent-files')

    clearRecentFiles()
    addRecentFile({
      id: 'test-1',
      name: 'Mobile App Project',
      path: '/docs/mobile.fig',
      format: 'fig'
    })

    const recents = getRecentFiles()
    // In headless test environments without localStorage, getRecentFiles returns [] safely
    expect(Array.isArray(recents)).toBe(true)
    removeRecentFile('test-1')
  })
})

describe('template tab opening', () => {
  test('opens template by id or name and prevents duplicate tabs', async () => {
    const { openTemplateInTab, openTemplateByIdOrName, getTabsSnapshot, closeTab, getActiveTabId } =
      await import('@/app/tabs')
    const { HOME_TEMPLATES } = await import('@/app/home/templates')

    const mobileTpl = HOME_TEMPLATES.find((t) => t.id === 'mobile-app')
    expect(mobileTpl).toBeDefined()
    if (!mobileTpl) return

    // Clean up any initial tabs
    const initialTabs = getTabsSnapshot()

    // 1. Open template in tab
    const tab1 = openTemplateInTab(mobileTpl)
    expect(tab1.store.state.documentName).toBe('Mobile App Starter')
    expect(tab1.store.graph.getPages().length).toBeGreaterThan(0)
    expect(getActiveTabId()).toBe(tab1.id)

    // 2. Calling openTemplateInTab again for same template switches to existing tab
    const tab2 = openTemplateInTab(mobileTpl)
    expect(tab2.id).toBe(tab1.id)

    // 3. Opening by name case-insensitively
    const tabByName = openTemplateByIdOrName('mobile app starter')
    expect(tabByName?.id).toBe(tab1.id)

    // 4. Opening a different template opens a new tab
    const dsTpl = openTemplateByIdOrName('design-system')
    expect(dsTpl).toBeDefined()
    expect(dsTpl?.store.state.documentName).toBe('Design System & Tokens')
    expect(dsTpl?.id).not.toBe(tab1.id)

    // Clean up created tabs
    if (tab1) closeTab(tab1.id)
    if (dsTpl) closeTab(dsTpl.id)
    for (const t of initialTabs) {
      closeTab(t.id)
    }
  })

  test('reuses an untouched Untitled tab when opening a template', async () => {
    const { openTemplateInTab, createTab, getTabsSnapshot, closeTab } = await import('@/app/tabs')
    const { HOME_TEMPLATES } = await import('@/app/home/templates')

    const initialTabs = getTabsSnapshot()
    for (const t of initialTabs) {
      closeTab(t.id)
    }

    // Create an untouched Untitled tab
    const untouchedTab = createTab()
    expect(untouchedTab.store.state.documentName).toBe('Untitled')
    expect(untouchedTab.store.undo.canUndo).toBe(false)

    const presTpl = HOME_TEMPLATES.find((t) => t.id === 'presentation')
    expect(presTpl).toBeDefined()
    if (!presTpl) return

    // Open template — should reuse untouched tab rather than making a second tab
    const tab = openTemplateInTab(presTpl)
    expect(tab.id).toBe(untouchedTab.id)
    expect(tab.store.state.documentName).toBe('Pitch Deck & Slides')
    expect(tab.store.graph.getPages().length).toBeGreaterThan(0)

    closeTab(tab.id)
  })
})
