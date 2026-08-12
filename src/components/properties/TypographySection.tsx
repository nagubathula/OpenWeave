import React from 'react'
import { useTypography } from '@openweave/react'
import type { SceneNode } from '@openweave/scene-graph'
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  AlignVerticalJustifyStart,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Baseline,
  ALargeSmall
} from 'lucide-react'

import FontPicker from '@/components/font-picker/FontPicker'
import NumberField from '@/components/inputs/NumberField'
import IconButton from '@/components/ui/IconButton'
import PanelGrid from '@/components/ui/panel/PanelGrid'
import PanelSection from '@/components/ui/panel/PanelSection'
import SegmentedControl from '@/components/ui/SegmentedControl'
import { AppSwitch } from '@/components/ui/AppSwitch'

type TextAlign = SceneNode['textAlignHorizontal']
type TextVerticalAlign = SceneNode['textAlignVertical']

const inputClass = 'w-full bg-input/50 rounded px-2 py-1 border border-border text-surface text-xs outline-none focus:border-accent'

function PanelFieldGroup({ label, children, className = '' }: { label: string, children: React.ReactNode, className?: string }) {
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      <span className="text-muted text-[10px]">{label}</span>
      {children}
    </label>
  )
}

export default function TypographySection() {
  const typography = useTypography()
  
  // Destructure properties from useTypography. 
  // It provides standard properties to interact with TextNode
  const {
    node,
    fontFamily,
    fontWeight,
    fontSize,
    weights,
    setFamily,
    setWeight,
    setAlign,
    updateProp,
    commitProp
  } = typography

  if (!node || !('textAlignHorizontal' in node)) return null

  const lineHeight = node.lineHeight ?? ''
  const letterSpacing = node.letterSpacing ?? 0
  const textAlign = node.textAlignHorizontal
  const verticalAlign = node.textAlignVertical

  // We are missing some properties like activeFormatting, toggleBold, setVerticalAlign in the hook exports above,
  // we will add placeholders or extract them if they exist in the full hook payload.
  const t = typography as any
  const setVerticalAlign = t.setVerticalAlign || ((v: any) => { updateProp('textAlignVertical', v); commitProp('textAlignVertical', v, v) })
  const activeFormatting = t.activeFormatting || []
  const toggleBold = t.toggleBold || (() => {})
  const toggleItalic = t.toggleItalic || (() => {})
  const toggleDecoration = t.toggleDecoration || (() => {})
  const textCase = node.textCase || 'ORIGINAL'
  const setTextCase = t.setTextCase || ((v: any) => { updateProp('textCase', v); commitProp('textCase', v, v) })
  const textDirection = node.textDirection || 'AUTO'
  const setDirection = t.setDirection || ((v: any) => { updateProp('textDirection', v); commitProp('textDirection', v, v) })
  const textTruncation = node.textTruncation || 'DISABLED'
  const setTruncation = t.setTruncation || ((v: any) => { updateProp('textTruncation', v); commitProp('textTruncation', v, v) })
  const maxLines = node.maxLines ?? 1

  function featureEnabled(features: Array<{ tag: string; enabled: boolean }> | undefined, tag: string) {
    return features?.find((feature) => feature.tag === tag)?.enabled ?? true
  }

  const setFontFeature = t.setFontFeature || ((tag: string, enabled: boolean) => {
    const current = node.fontFeatures ?? []
    const updated = current.filter(f => f.tag !== tag)
    updated.push({ tag, enabled })
    updateProp('fontFeatures', updated as any)
    commitProp('fontFeatures', updated as any, updated as any)
  })



  return (
    <PanelSection label="Typography">
      <div className="mb-2.5">
        <PanelFieldGroup label="Font">
          <FontPicker value={fontFamily} onSelect={(family) => { void setFamily(family) }} />
        </PanelFieldGroup>
      </div>

      <PanelGrid columns={2} className="mb-3">
        <PanelFieldGroup label="Weight">
          <select
            className={inputClass + ' h-6'}
            value={fontWeight}
            onChange={(e) => { void setWeight(Number(e.target.value)) }}
          >
            {weights.map((w: any) => (
              <option key={w.value} value={w.value}>{w.label}</option>
            ))}
          </select>
        </PanelFieldGroup>
        <PanelFieldGroup label="Size">
          <NumberField
            value={fontSize}
            min={1}
            max={1000}
            onChange={(v) => updateProp('fontSize', v)}
            onCommit={(v, p) => commitProp('fontSize', v, p)}
          />
        </PanelFieldGroup>
      </PanelGrid>

      <PanelGrid columns={2} className="mb-3">
        <PanelFieldGroup label="Line height">
          <NumberField
            value={typeof lineHeight === 'number' ? lineHeight : Math.round((fontSize || 14) * 1.2)}
            min={0}
            onChange={(v) => updateProp('lineHeight', v)}
            onCommit={(v, p) => commitProp('lineHeight', v, p)}
            icon={<Baseline className="size-3" />}
          />
        </PanelFieldGroup>
        <PanelFieldGroup label="Letter spacing">
          <NumberField
            suffix="%"
            value={letterSpacing}
            onChange={(v) => updateProp('letterSpacing', v)}
            onCommit={(v, p) => commitProp('letterSpacing', v, p)}
            icon={<ALargeSmall className="size-3" />}
          />
        </PanelFieldGroup>
      </PanelGrid>

      <PanelFieldGroup label="Direction" className="mb-3">
        <select
          className={inputClass + ' h-6'}
          value={textDirection}
          onChange={(e) => setDirection(e.target.value)}
        >
          <option value="AUTO">Auto</option>
          <option value="LTR">LTR</option>
          <option value="RTL">RTL</option>
        </select>
      </PanelFieldGroup>

      <PanelFieldGroup label="Text alignment" className="mb-3">
        <SegmentedControl
          value={textAlign}
          onChange={(v) => setAlign(v as TextAlign)}
          options={[
            { value: 'LEFT', label: 'Left', icon: <AlignLeft className="size-3.5" /> },
            { value: 'CENTER', label: 'Center', icon: <AlignCenter className="size-3.5" /> },
            { value: 'RIGHT', label: 'Right', icon: <AlignRight className="size-3.5" /> },
            { value: 'JUSTIFIED', label: 'Justify', icon: <AlignJustify className="size-3.5" /> }
          ]}
        />
      </PanelFieldGroup>

      <PanelFieldGroup label="Vertical alignment" className="mb-3">
        <SegmentedControl
          value={verticalAlign}
          onChange={(v) => setVerticalAlign(v as TextVerticalAlign)}
          options={[
            { value: 'TOP', label: 'Top', icon: <AlignVerticalJustifyStart className="size-3.5" /> },
            { value: 'CENTER', label: 'Middle', icon: <AlignVerticalJustifyCenter className="size-3.5" /> },
            { value: 'BOTTOM', label: 'Bottom', icon: <AlignVerticalJustifyEnd className="size-3.5" /> }
          ]}
        />
      </PanelFieldGroup>

      <PanelFieldGroup label="Text formatting" className="mb-3">
        <div
          className="inline-flex items-center gap-0.5 rounded bg-panel-field p-0.5"
          role="toolbar"
        >
          <IconButton
            label="Bold"
            size="md"
            active={activeFormatting.includes('bold')}
            onClick={toggleBold}
          >
            <Bold className="size-3.5" />
          </IconButton>
          <IconButton
            label="Italic"
            size="md"
            active={activeFormatting.includes('italic')}
            onClick={toggleItalic}
          >
            <Italic className="size-3.5" />
          </IconButton>
          <IconButton
            label="Underline"
            size="md"
            active={activeFormatting.includes('underline')}
            onClick={() => toggleDecoration('UNDERLINE')}
          >
            <Underline className="size-3.5" />
          </IconButton>
          <IconButton
            label="Strikethrough"
            size="md"
            active={activeFormatting.includes('strikethrough')}
            onClick={() => toggleDecoration('STRIKETHROUGH')}
          >
            <Strikethrough className="size-3.5" />
          </IconButton>
        </div>
      </PanelFieldGroup>

      <PanelGrid columns={2} className="mb-3">
        <PanelFieldGroup label="Case">
          <select
            className={inputClass + ' h-6'}
            value={textCase}
            onChange={(e) => setTextCase(e.target.value)}
          >
            <option value="ORIGINAL">Original</option>
            <option value="UPPER">Uppercase</option>
            <option value="LOWER">Lowercase</option>
            <option value="TITLE">Titlecase</option>
          </select>
        </PanelFieldGroup>
        <PanelFieldGroup label="Truncation">
          <select
            className={inputClass + ' h-6'}
            value={textTruncation}
            onChange={(e) => setTruncation(e.target.value)}
          >
            <option value="DISABLED">Disabled</option>
            <option value="ENDING">Ending</option>
          </select>
        </PanelFieldGroup>
      </PanelGrid>

      {textTruncation === 'ENDING' && (
        <PanelFieldGroup label="Max lines" className="mb-3">
          <NumberField
            value={maxLines}
            min={1}
            step={1}
            onChange={(v) => updateProp('maxLines', Math.max(1, Math.round(v)))}
            onCommit={(v, p) => commitProp('maxLines', v, p)}
          />
        </PanelFieldGroup>
      )}

      <div className="mb-3 grid gap-2.5">
        <label className="flex items-center justify-between gap-1.5 text-[11px] text-muted/70">
          <span>Standard ligatures</span>
          <AppSwitch
            value={featureEnabled(node.fontFeatures, 'LIGA')}
            onValueChange={(val: boolean) => setFontFeature('LIGA', val)}
          />
        </label>
        <label className="flex items-center justify-between gap-1.5 text-[11px] text-muted/70">
          <span>Contextual alternates</span>
          <AppSwitch
            value={featureEnabled(node.fontFeatures, 'CALT')}
            onValueChange={(val: boolean) => setFontFeature('CALT', val)}
          />
        </label>
        <label className="flex items-center justify-between gap-1.5 text-[11px] text-muted/70">
          <span>Kerning</span>
          <AppSwitch
            value={featureEnabled(node.fontFeatures, 'KERN')}
            onValueChange={(val: boolean) => setFontFeature('KERN', val)}
          />
        </label>
      </div>
    </PanelSection>
  )
}
