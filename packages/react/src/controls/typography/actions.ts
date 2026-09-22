import { useSceneComputed } from '#react/internal/scene-computed/use'
import { useNodeFontStatus } from '#react/shared/font-status/use'
import { useMemo, useRef } from 'react'

import type { Editor } from '@openweave/core/editor'
import {
  FONT_WEIGHT_NAMES,
  applyStyleToRange,
  getStyleAt,
  toggleBoldInRange,
  toggleDecorationInRange,
  toggleItalicInRange,
  weightToStyle
} from '@openweave/core/text'
import { styleToWeight } from '@openweave/scene-graph'
import type {
  CharacterStyleOverride,
  SceneNode,
  StyleRun,
  TextDecoration
} from '@openweave/scene-graph'
import { copyStyleRuns } from '@openweave/scene-graph/copy'

import type { UseTypographyOptions } from './use'

type TextAlign = SceneNode['textAlignHorizontal']
type TextDirection = SceneNode['textDirection']
type TextVerticalAlign = SceneNode['textAlignVertical']
type TextCase = SceneNode['textCase']
type TextTruncation = SceneNode['textTruncation']

export const TYPOGRAPHY_WEIGHTS = Object.entries(FONT_WEIGHT_NAMES).map(([value, label]) => ({
  value: Number(value),
  label
}))

// Node props that can also be applied per-character-range while editing text.
const RANGE_STYLE_KEYS = new Set<keyof SceneNode>(['fontSize', 'letterSpacing', 'lineHeight'])

type RangeTypographySummary = {
  fontWeight: number | 'mixed'
  fontSize: number | 'mixed'
  bold: boolean
  italic: boolean
  underline: boolean
  strikethrough: boolean
}

export function useTypographyState(editor: Editor) {
  const node = useSceneComputed<SceneNode | null>(() => editor.getSelectedNode() ?? null)
  const { missingFonts, hasMissingFonts } = useNodeFontStatus(node)

  // While inline-editing with a non-collapsed selection, summarize the
  // selected characters so the panel can show the range's value (or "Mixed")
  // instead of the node-level fallback.
  const rangeSummary = useSceneComputed<RangeTypographySummary | null>(() => {
    void editor.state.sceneVersion
    if (!node || editor.state.editingTextId !== node.id) return null
    const range = editor.textEditor?.getSelectionRange()
    if (!range || range[0] === range[1]) return null
    const weights = new Set<number>()
    const sizes = new Set<number>()
    let allBold = true
    let allItalic = true
    let allUnderline = true
    let allStrikethrough = true
    for (let i = range[0]; i < range[1] && i < node.text.length; i++) {
      const style = getStyleAt(node.styleRuns, i)
      const weight = style.fontWeight ?? node.fontWeight
      weights.add(weight)
      sizes.add(style.fontSize ?? node.fontSize)
      if (weight < 700) allBold = false
      if (!(style.italic ?? node.italic)) allItalic = false
      const deco = style.textDecoration ?? node.textDecoration
      if (deco !== 'UNDERLINE') allUnderline = false
      if (deco !== 'STRIKETHROUGH') allStrikethrough = false
    }
    if (weights.size === 0) return null
    return {
      fontWeight: weights.size === 1 ? [...weights][0] : 'mixed',
      fontSize: sizes.size === 1 ? [...sizes][0] : 'mixed',
      bold: allBold,
      italic: allItalic,
      underline: allUnderline,
      strikethrough: allStrikethrough
    }
  })

  const fontFamily = node?.fontFamily ?? ''
  const fontWeight = node?.fontWeight ?? 400
  const fontSize = node?.fontSize ?? 16
  const currentWeightLabel = FONT_WEIGHT_NAMES[fontWeight] ?? 'Regular'

  const activeFormatting = useMemo(() => {
    if (!node) return []
    if (rangeSummary) {
      const result: string[] = []
      if (rangeSummary.bold) result.push('bold')
      if (rangeSummary.italic) result.push('italic')
      if (rangeSummary.underline) result.push('underline')
      if (rangeSummary.strikethrough) result.push('strikethrough')
      return result
    }
    const result: string[] = []
    if (node.fontWeight >= 700) result.push('bold')
    if (node.italic) result.push('italic')
    if (node.textDecoration === 'UNDERLINE') result.push('underline')
    if (node.textDecoration === 'STRIKETHROUGH') result.push('strikethrough')
    return result
  }, [node?.fontWeight, node?.italic, node?.textDecoration, rangeSummary])

  return {
    node,
    fontFamily,
    fontWeight,
    fontSize,
    /** Selected range's weight while editing: uniform value, 'mixed', or null (no range). */
    rangeFontWeight: rangeSummary?.fontWeight ?? null,
    /** Selected range's font size while editing: uniform value, 'mixed', or null (no range). */
    rangeFontSize: rangeSummary?.fontSize ?? null,
    currentWeightLabel,
    activeFormatting,
    textAutoResize: node?.textAutoResize ?? 'NONE',
    missingFonts,
    hasMissingFonts
  }
}

type TypographyActionOptions = {
  editor: Editor
  node: SceneNode | null
  currentWeightLabel: string
  activeFormatting: string[]
  options: UseTypographyOptions
}

export function createTypographyActions(
  { editor, node, currentWeightLabel, activeFormatting, options }: TypographyActionOptions,
  refs?: {
    propBeforePreviewRef?: {
      current:
        | { key: keyof SceneNode; value: SceneNode[keyof SceneNode]; textStyleId: string | null }
        | undefined
    }
    rangePreviewRef?: {
      current: { key: keyof SceneNode; styleRuns: StyleRun[]; range: [number, number] } | undefined
    }
  }
) {
  const propBeforePreviewRef = refs?.propBeforePreviewRef ?? { current: undefined }
  const rangePreviewRef = refs?.rangePreviewRef ?? { current: undefined }

  const doLoadFont = async (family: string, style: string) => {
    await options.fontLoader?.load(family, style)
  }

  // While inline-editing this node with a non-collapsed selection, panel edits
  // restyle just the selected character range via styleRuns (Figma parity)
  // instead of the whole node.
  const getEditRange = (): [number, number] | null => {
    if (!node || editor.state.editingTextId !== node.id) return null
    const range = editor.textEditor?.getSelectionRange() ?? null
    return range && range[0] !== range[1] ? range : null
  }

  const commitStyleRuns = (runs: StyleRun[], label: string) => {
    if (!node) return
    editor.updateNodeWithUndo(node.id, { styleRuns: runs }, label)
    const updated = editor.graph.getNode(node.id)
    if (updated) editor.textEditor?.rebuildParagraph(updated)
    editor.requestRender()
  }

  const applyRangeStyle = (patch: CharacterStyleOverride, label: string): boolean => {
    const range = getEditRange()
    if (!range || !node) return false
    commitStyleRuns(
      applyStyleToRange(node.styleRuns, range[0], range[1], patch, node.text.length),
      label
    )
    return true
  }

  // Rebuild the live edit paragraph once a freshly loaded font face is
  // available, so the canvas shows the new variant without leaving the session.
  const rebuildAfterFontLoad = (nodeId: string) => {
    if (editor.state.editingTextId !== nodeId) return
    const updated = editor.graph.getNode(nodeId)
    if (updated) editor.textEditor?.rebuildParagraph(updated)
    editor.requestRender()
  }

  const setFamily = async (family: string) => {
    if (!node) return
    const { id } = node
    await doLoadFont(family, currentWeightLabel)
    if (applyRangeStyle({ fontFamily: family }, 'Change font')) return
    editor.updateNodeWithUndo(id, { fontFamily: family }, 'Change font')
    rebuildAfterFontLoad(id)
  }

  const setWeight = async (weight: number) => {
    if (!node) return
    const { id, fontFamily } = node
    const style = weightToStyle(weight)
    if (!applyRangeStyle({ fontWeight: weight }, 'Change font weight')) {
      editor.updateNodeWithUndo(id, { fontWeight: weight }, 'Change font weight')
    }
    await doLoadFont(fontFamily, style)
    rebuildAfterFontLoad(id)
  }

  // Applies a concrete font face by its real style name ("Semi Bold Italic"),
  // setting weight and italic together — the Figma-style style dropdown.
  const setFontStyle = async (styleName: string) => {
    if (!node) return
    const { id, fontFamily } = node
    const patch: CharacterStyleOverride = {
      fontWeight: styleToWeight(styleName),
      italic: /italic|oblique/i.test(styleName)
    }
    if (!applyRangeStyle(patch, 'Change font style')) {
      editor.updateNodeWithUndo(id, patch as Partial<SceneNode>, 'Change font style')
    }
    await doLoadFont(fontFamily, styleName)
    rebuildAfterFontLoad(id)
  }

  const setAlign = (align: TextAlign) => {
    if (!node) return
    editor.updateNodeWithUndo(node.id, { textAlignHorizontal: align }, 'Change text alignment')
  }

  const setDirection = (direction: TextDirection) => {
    if (!node) return
    editor.updateNodeWithUndo(node.id, { textDirection: direction }, 'Change text direction')
  }

  const setVerticalAlign = (align: TextVerticalAlign) => {
    if (!node) return
    editor.updateNodeWithUndo(
      node.id,
      { textAlignVertical: align },
      'Change vertical text alignment'
    )
  }

  const setTextCase = (textCase: TextCase) => {
    if (!node) return
    editor.updateNodeWithUndo(node.id, { textCase }, 'Change text case')
  }

  const setTruncation = (textTruncation: TextTruncation) => {
    if (!node) return
    editor.updateNodeWithUndo(node.id, { textTruncation }, 'Change text truncation')
  }

  const setFontFeature = (tag: string, enabled: boolean) => {
    if (!node) return
    const fontFeatures = node.fontFeatures.filter((feature) => feature.tag !== tag)
    fontFeatures.push({ tag, enabled })
    editor.updateNodeWithUndo(node.id, { fontFeatures }, `Change ${tag} feature`)
  }

  const toggleBold = () => {
    if (!node) return
    const range = getEditRange()
    if (range) {
      const { runs, newWeight } = toggleBoldInRange(
        node.styleRuns,
        range[0],
        range[1],
        node.fontWeight,
        node.text.length
      )
      commitStyleRuns(runs, 'Toggle bold')
      void doLoadFont(node.fontFamily, weightToStyle(newWeight)).then(() =>
        rebuildAfterFontLoad(node.id)
      )
      return
    }
    void setWeight(node.fontWeight >= 700 ? 400 : 700)
  }

  const toggleItalic = () => {
    if (!node) return
    const range = getEditRange()
    if (range) {
      const { runs, newItalic } = toggleItalicInRange(
        node.styleRuns,
        range[0],
        range[1],
        node.italic,
        node.text.length
      )
      commitStyleRuns(runs, 'Toggle italic')
      void doLoadFont(node.fontFamily, weightToStyle(node.fontWeight, newItalic)).then(() =>
        rebuildAfterFontLoad(node.id)
      )
      return
    }
    editor.updateNodeWithUndo(node.id, { italic: !node.italic }, 'Toggle italic')
  }

  const toggleDecoration = (deco: 'UNDERLINE' | 'STRIKETHROUGH') => {
    if (!node) return
    const range = getEditRange()
    if (range) {
      const { runs } = toggleDecorationInRange(
        node.styleRuns,
        range[0],
        range[1],
        deco,
        node.textDecoration,
        node.text.length
      )
      commitStyleRuns(runs, `Toggle ${deco.toLowerCase()}`)
      return
    }
    const current = node.textDecoration
    editor.updateNodeWithUndo(
      node.id,
      { textDecoration: (current === deco ? 'NONE' : deco) as TextDecoration },
      `Toggle ${deco.toLowerCase()}`
    )
  }

  const onFormattingChange = (values: string[]) => {
    if (!node) return
    const prev = activeFormatting
    const added = values.filter((v) => !prev.includes(v))
    const removed = prev.filter((v) => !values.includes(v))
    for (const item of [...added, ...removed]) {
      if (item === 'bold') toggleBold()
      else if (item === 'italic') toggleItalic()
      else if (item === 'underline') toggleDecoration('UNDERLINE')
      else if (item === 'strikethrough') toggleDecoration('STRIKETHROUGH')
    }
  }

  const updateProp = (key: keyof SceneNode, value: number | string | null) => {
    if (!node) return
    if (RANGE_STYLE_KEYS.has(key)) {
      // Reuse the range captured at preview start so the whole drag targets
      // one range even if the edit selection shifts mid-preview.
      const active = rangePreviewRef.current?.key === key ? rangePreviewRef.current : undefined
      const range = active?.range ?? getEditRange()
      if (range) {
        if (!active) {
          rangePreviewRef.current = { key, styleRuns: copyStyleRuns(node.styleRuns), range }
        }
        const base = rangePreviewRef.current ? rangePreviewRef.current.styleRuns : node.styleRuns
        const runs = applyStyleToRange(
          base,
          range[0],
          range[1],
          { [key]: value } as CharacterStyleOverride,
          node.text.length
        )
        editor.updateNode(node.id, { styleRuns: runs })
        const updated = editor.graph.getNode(node.id)
        if (updated) editor.textEditor?.rebuildParagraph(updated)
        editor.requestRender()
        return
      }
    }
    if (!propBeforePreviewRef.current || propBeforePreviewRef.current.key !== key) {
      propBeforePreviewRef.current = {
        key,
        value: Reflect.get(node, key),
        textStyleId: node.textStyleId
      }
    }
    editor.updateNode(node.id, { [key]: value } as Partial<SceneNode>)
  }

  const commitProp = (
    key: keyof SceneNode,
    _value: number | string | null,
    previous: number | string | null
  ) => {
    if (!node) return
    const rangeSnapshot = rangePreviewRef.current?.key === key ? rangePreviewRef.current : undefined
    if (rangeSnapshot) {
      editor.commitNodeUpdate(
        node.id,
        { styleRuns: rangeSnapshot.styleRuns },
        `Change ${String(key)}`
      )
      rangePreviewRef.current = undefined
      return
    }
    const snapshot =
      propBeforePreviewRef.current?.key === key ? propBeforePreviewRef.current : undefined
    editor.commitNodeUpdate(
      node.id,
      {
        [key]: snapshot ? snapshot.value : previous,
        ...(snapshot ? { textStyleId: snapshot.textStyleId } : {})
      } as Partial<SceneNode>,
      `Change ${String(key)}`
    )
    propBeforePreviewRef.current = undefined
  }

  return {
    setFamily,
    setWeight,
    setFontStyle,
    setAlign,
    setDirection,
    setVerticalAlign,
    setTextCase,
    setTruncation,
    setTextAutoResize: (mode: 'NONE' | 'WIDTH_AND_HEIGHT' | 'HEIGHT' | 'TRUNCATE') => {
      if (!node) return
      editor.updateNodeWithUndo(node.id, { textAutoResize: mode }, 'Change text auto resize')
    },
    setFontFeature,
    toggleBold,
    toggleItalic,
    toggleDecoration,
    onFormattingChange,
    updateProp,
    commitProp
  }
}

export function useTypographyActions(options: TypographyActionOptions) {
  const propBeforePreviewRef = useRef<
    | { key: keyof SceneNode; value: SceneNode[keyof SceneNode]; textStyleId: string | null }
    | undefined
  >(undefined)
  const rangePreviewRef = useRef<
    { key: keyof SceneNode; styleRuns: StyleRun[]; range: [number, number] } | undefined
  >(undefined)

  return useMemo(
    () => createTypographyActions(options, { propBeforePreviewRef, rangePreviewRef }),
    [options]
  )
}
