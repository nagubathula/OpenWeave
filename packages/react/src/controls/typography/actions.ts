import { useSceneComputed } from '#react/internal/scene-computed/use'
import { useNodeFontStatus } from '#react/shared/font-status/use'
import { useMemo, useRef, useCallback } from 'react'

import type { Editor } from '@openweave/core/editor'
import { FONT_WEIGHT_NAMES, weightToStyle } from '@openweave/core/text'
import type { SceneNode, TextDecoration } from '@openweave/scene-graph'

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

export function useTypographyState(editor: Editor) {
  const node = useSceneComputed<SceneNode | null>(() => editor.getSelectedNode() ?? null)
  const { missingFonts, hasMissingFonts } = useNodeFontStatus(node)

  const fontFamily = node?.fontFamily ?? ''
  const fontWeight = node?.fontWeight ?? 400
  const fontSize = node?.fontSize ?? 16
  const currentWeightLabel = FONT_WEIGHT_NAMES[fontWeight] ?? 'Regular'

  const activeFormatting = useMemo(() => {
    if (!node) return []
    const result: string[] = []
    if (node.fontWeight >= 700) result.push('bold')
    if (node.italic) result.push('italic')
    if (node.textDecoration === 'UNDERLINE') result.push('underline')
    if (node.textDecoration === 'STRIKETHROUGH') result.push('strikethrough')
    return result
  }, [node?.fontWeight, node?.italic, node?.textDecoration])

  return {
    node,
    fontFamily,
    fontWeight,
    fontSize,
    currentWeightLabel,
    activeFormatting,
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

export function useTypographyActions({
  editor,
  node,
  currentWeightLabel,
  activeFormatting,
  options
}: TypographyActionOptions) {
  const propBeforePreviewRef = useRef<
    | { key: keyof SceneNode; value: SceneNode[keyof SceneNode]; textStyleId: string | null }
    | undefined
  >(undefined)

  const doLoadFont = useCallback(
    async (family: string, style: string) => {
      await options.fontLoader?.load(family, style)
    },
    [options.fontLoader]
  )

  const setFamily = useCallback(
    async (family: string) => {
      if (!node) return
      await doLoadFont(family, currentWeightLabel)
      editor.updateNodeWithUndo(node.id, { fontFamily: family }, 'Change font')
    },
    [node, doLoadFont, currentWeightLabel, editor]
  )

  const setWeight = useCallback(
    async (weight: number) => {
      if (!node) return
      const { id, fontFamily } = node
      const style = weightToStyle(weight)
      editor.updateNodeWithUndo(id, { fontWeight: weight }, 'Change font weight')
      await doLoadFont(fontFamily, style)
    },
    [node, doLoadFont, editor]
  )

  const setAlign = useCallback(
    (align: TextAlign) => {
      if (!node) return
      editor.updateNodeWithUndo(node.id, { textAlignHorizontal: align }, 'Change text alignment')
    },
    [node, editor]
  )

  const setDirection = useCallback(
    (direction: TextDirection) => {
      if (!node) return
      editor.updateNodeWithUndo(node.id, { textDirection: direction }, 'Change text direction')
    },
    [node, editor]
  )

  const setVerticalAlign = useCallback(
    (align: TextVerticalAlign) => {
      if (!node) return
      editor.updateNodeWithUndo(
        node.id,
        { textAlignVertical: align },
        'Change vertical text alignment'
      )
    },
    [node, editor]
  )

  const setTextCase = useCallback(
    (textCase: TextCase) => {
      if (!node) return
      editor.updateNodeWithUndo(node.id, { textCase }, 'Change text case')
    },
    [node, editor]
  )

  const setTruncation = useCallback(
    (textTruncation: TextTruncation) => {
      if (!node) return
      editor.updateNodeWithUndo(node.id, { textTruncation }, 'Change text truncation')
    },
    [node, editor]
  )

  const setFontFeature = useCallback(
    (tag: string, enabled: boolean) => {
      if (!node) return
      const fontFeatures = node.fontFeatures.filter((feature) => feature.tag !== tag)
      fontFeatures.push({ tag, enabled })
      editor.updateNodeWithUndo(node.id, { fontFeatures }, `Change ${tag} feature`)
    },
    [node, editor]
  )

  const toggleBold = useCallback(() => {
    if (!node) return
    void setWeight(node.fontWeight >= 700 ? 400 : 700)
  }, [node, setWeight])

  const toggleItalic = useCallback(() => {
    if (!node) return
    editor.updateNodeWithUndo(node.id, { italic: !node.italic }, 'Toggle italic')
  }, [node, editor])

  const toggleDecoration = useCallback(
    (deco: 'UNDERLINE' | 'STRIKETHROUGH') => {
      if (!node) return
      const current = node.textDecoration
      editor.updateNodeWithUndo(
        node.id,
        { textDecoration: (current === deco ? 'NONE' : deco) as TextDecoration },
        `Toggle ${deco.toLowerCase()}`
      )
    },
    [node, editor]
  )

  const onFormattingChange = useCallback(
    (values: string[]) => {
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
    },
    [node, activeFormatting, toggleBold, toggleItalic, toggleDecoration]
  )

  const updateProp = useCallback(
    (key: keyof SceneNode, value: number | string | null) => {
      if (!node) return
      if (!propBeforePreviewRef.current || propBeforePreviewRef.current.key !== key) {
        propBeforePreviewRef.current = {
          key,
          value: Reflect.get(node, key),
          textStyleId: node.textStyleId
        }
      }
      editor.updateNode(node.id, { [key]: value } as Partial<SceneNode>)
    },
    [node, editor]
  )

  const commitProp = useCallback(
    (key: keyof SceneNode, _value: number | string | null, previous: number | string | null) => {
      if (!node) return
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
    },
    [node, editor]
  )

  return {
    setFamily,
    setWeight,
    setAlign,
    setDirection,
    setVerticalAlign,
    setTextCase,
    setTruncation,
    setFontFeature,
    toggleBold,
    toggleItalic,
    toggleDecoration,
    onFormattingChange,
    updateProp,
    commitProp
  }
}
