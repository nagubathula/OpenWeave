import { describe, expect, test } from 'bun:test'

import { createEditor } from '@openweave/core/editor'
import { editorCommandMetadata } from '@openweave/react'

import {
  CREDIT_CARD_ASPECT_RATIO,
  CREDIT_CARD_WIDTH_INCHES,
  calculatePpiFromSpecs,
  calibrateWithCardWidth,
  cardWidthFromPpi,
  detectMobileFrameDimensions,
  displayScaleSettings,
  insertCreditCardReference,
  ppiFromCardWidth,
  STANDARD_CSS_PPI,
  zoomForDevice,
  zoomForPhysical
} from '@/app/editor/display-scale'

describe('Display Scale Calibration & Physical Math', () => {
  test('converts between card width in pixels and PPI accurately', () => {
    // 96 PPI on a standard display:
    const expected96Width = Math.round(96 * CREDIT_CARD_WIDTH_INCHES) // 324 px
    expect(expected96Width).toBe(324)
    expect(ppiFromCardWidth(expected96Width)).toBeCloseTo(96.1, 1)
    expect(cardWidthFromPpi(96)).toBe(324)

    // 127 PPI on a MacBook Retina display:
    const macbookWidth = cardWidthFromPpi(127) // 428 px
    expect(macbookWidth).toBe(428)
    expect(ppiFromCardWidth(macbookWidth)).toBeCloseTo(127.0, 1)
  })

  test('calculates correct physical zoom for monitors', () => {
    // Standard 96 PPI monitor: physical zoom is 100% (1.0)
    expect(zoomForPhysical(96, STANDARD_CSS_PPI)).toBe(1.0)

    // 1080p 24" monitor (~92 PPI): zoom is ~0.958
    expect(zoomForPhysical(92, STANDARD_CSS_PPI)).toBeCloseTo(0.958, 3)

    // MacBook Retina (~127 CSS PPI): zoom is ~1.323
    expect(zoomForPhysical(127, STANDARD_CSS_PPI)).toBeCloseTo(1.323, 3)
  })

  test('calculates PPI accurately from screen dimensions and scaling', () => {
    // 24" 1080p monitor at 100%: 91.8 PPI
    expect(calculatePpiFromSpecs(24, 1920, 1080, 100)).toBeCloseTo(91.8, 1)

    // 15.6" 1080p laptop at recommended 125% Windows scaling: 113.0 PPI
    expect(calculatePpiFromSpecs(15.6, 1920, 1080, 125)).toBeCloseTo(113.0, 1)

    // 27" 1440p monitor at 100%: 108.8 PPI
    expect(calculatePpiFromSpecs(27, 2560, 1440, 100)).toBeCloseTo(108.8, 1)

    // 27" 4K monitor at 150% scaling: 108.8 PPI
    expect(calculatePpiFromSpecs(27, 3840, 2160, 150)).toBeCloseTo(108.8, 1)
  })

  test('calculates correct zoom for mobile device frames', () => {
    // iPhone 16 Pro active screen: 393 px wide, 64.6 mm physical width (~2.543 inches)
    // iPhone logical PPI = 393 / 2.5433 = ~154.52 DPI
    const iphoneWidth = 393
    const iphonePhysicalMm = 64.6

    // On standard 96 PPI display:
    const zoomOn96 = zoomForDevice(96, iphoneWidth, iphonePhysicalMm)
    // 96 / 154.52 ≈ 0.621
    expect(zoomOn96).toBeCloseTo(0.621, 2)

    // At this zoom, the on-screen physical size in inches on the 96 PPI monitor will be:
    const onScreenInches = (iphoneWidth * zoomOn96) / 96
    const onScreenMm = onScreenInches * 25.4
    expect(onScreenMm).toBeCloseTo(iphonePhysicalMm, 1)

    // On MacBook Pro 127 PPI display:
    const zoomOn127 = zoomForDevice(127, iphoneWidth, iphonePhysicalMm)
    expect(zoomOn127).toBeCloseTo(0.822, 2)
    const onScreenMacMm = ((iphoneWidth * zoomOn127) / 127) * 25.4
    expect(onScreenMacMm).toBeCloseTo(iphonePhysicalMm, 1)
  })

  test('detects mobile devices from frame dimensions', () => {
    const editor = createEditor({ getViewportSize: () => ({ width: 1200, height: 800 }) })
    const pageId = editor.graph.getPages()[0]?.id ?? ''

    // iPhone 16 Pro frame
    const iphoneNode = editor.graph.createNode('FRAME', pageId, {
      name: 'iPhone 16 Pro',
      x: 0,
      y: 0,
      width: 393,
      height: 852
    })
    const iphoneDetected = detectMobileFrameDimensions(iphoneNode)
    expect(iphoneDetected.isMobile).toBe(true)
    expect(iphoneDetected.physicalWidthMm).toBe(64.6)
    expect(iphoneDetected.deviceLabel).toBe('iPhone 16 / 15 Pro')

    // Android Compact frame (412 × 917)
    const androidNode = editor.graph.createNode('FRAME', pageId, {
      name: 'Android Screen',
      x: 500,
      y: 0,
      width: 412,
      height: 917
    })
    const androidDetected = detectMobileFrameDimensions(androidNode)
    expect(androidDetected.isMobile).toBe(true)
    expect(androidDetected.physicalWidthMm).toBe(66.0)

    // Desktop frame (1440 × 900)
    const desktopNode = editor.graph.createNode('FRAME', pageId, {
      name: 'Desktop Web',
      x: 1000,
      y: 0,
      width: 1440,
      height: 900
    })
    const desktopDetected = detectMobileFrameDimensions(desktopNode)
    expect(desktopDetected.isMobile).toBe(false)
  })

  test('inserts a credit card scale reference node with accurate dimensions', () => {
    const editor = createEditor({ getViewportSize: () => ({ width: 1000, height: 800 }) })

    const cardId = insertCreditCardReference(editor)
    expect(cardId).toBeDefined()

    const cardNode = editor.graph.getNode(cardId)
    expect(cardNode).toBeDefined()
    expect(cardNode?.type).toBe('FRAME')
    expect(cardNode?.name).toContain('Credit Card')
    expect(cardNode?.width).toBe(324)
    expect(cardNode?.height).toBe(204)
    expect(cardNode?.cornerRadius).toBe(12)

    // Ratio should match ISO/IEC 7810
    const ratio = (cardNode?.width ?? 0) / (cardNode?.height ?? 1)
    expect(ratio).toBeCloseTo(CREDIT_CARD_ASPECT_RATIO, 2)

    // Should have EMV chip child
    const children = editor.graph.getChildren(cardId)
    expect(children.length).toBeGreaterThan(0)
    const chip = children.find((c) => c.name === 'EMV Chip')
    expect(chip).toBeDefined()
    expect(chip?.type).toBe('RECTANGLE')

    // Card should be selected
    expect(editor.state.selectedIds.has(cardId)).toBe(true)
  })

  test('viewport.zoomToPhysical updates zoom level based on calibrated PPI', () => {
    const editor = createEditor({ getViewportSize: () => ({ width: 1000, height: 800 }) })

    // Zoom to physical size on 127 PPI display
    editor.zoomToPhysical(127, 96)
    expect(editor.state.zoom).toBeCloseTo(127 / 96, 4)

    // Zoom to physical size on 92 PPI display
    editor.zoomToPhysical(92, 96)
    expect(editor.state.zoom).toBeCloseTo(92 / 96, 4)
  })

  test('view.zoomRealSize command metadata specifies F12 shortcut', () => {
    const meta = editorCommandMetadata('view.zoomRealSize')
    expect(meta.shortcut).toBe('F12')
    expect(meta.keybinding).toContain('F12')
  })

  test('calibrateWithCardWidth locks calibrated screen dimension and updates settings', () => {
    // 315 px card width (~93.5 PPI)
    const settings = calibrateWithCardWidth(315)
    expect(settings.cardWidthPx).toBe(315)
    expect(settings.screenPpi).toBeCloseTo(93.5, 1)
    expect(displayScaleSettings.get().cardWidthPx).toBe(315)
    expect(displayScaleSettings.get().screenPpi).toBeCloseTo(93.5, 1)
  })
})
