import React from 'react'
import { useTypography, useI18n } from '@openweave/react'
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
  ALargeSmall,
  AlertTriangle
} from 'lucide-react'

import FontPicker from '@/components/font-picker/FontPicker'
import FontSettingsPopover from '@/components/font-settings/FontSettingsPopover'
import NumberField from '@/components/inputs/NumberField'
import IconButton from '@/components/ui/IconButton'
import PanelGrid from '@/components/ui/panel/PanelGrid'
import PanelSection from '@/components/ui/panel/PanelSection'
import { AppSwitch } from '@/components/ui/AppSwitch'
import { AppSelect } from '@/components/ui/AppSelect'
import SharedStyleField from '@/components/properties/shared-style/SharedStyleField'
import Tip from '@/components/ui/Tip'

type TextAlign = SceneNode['textAlignHorizontal']
type TextVerticalAlign = SceneNode['textAlignVertical']
type TextCase = SceneNode['textCase']
type TextDirection = SceneNode['textDirection']
type TextTruncation = SceneNode['textTruncation']

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
  // Destructure properties from useTypography.
  // It provides standard properties and actions to interact with TextNode
  const {
    node,
    fontFamily,
    fontWeight,
    fontSize,
    weights,
    activeFormatting,
    setFamily,
    setWeight,
    setAlign,
    setVerticalAlign,
    setTextCase,
    setDirection,
    setTruncation,
    setFontFeature,
    toggleBold,
    toggleItalic,
    toggleDecoration,
    updateProp,
    commitProp,
    missingFonts,
    hasMissingFonts
  } = useTypography()
  const { panels } = useI18n()

  if (!node || !('textAlignHorizontal' in node)) return null

  const lineHeight = node.lineHeight ?? ''
  const letterSpacing = node.letterSpacing
  const textAlign = node.textAlignHorizontal
  const verticalAlign = node.textAlignVertical
  const textCase = node.textCase
  const textDirection = node.textDirection
  const textTruncation = node.textTruncation
  const maxLines = node.maxLines ?? 1

  function featureEnabled(features: Array<{ tag: string; enabled: boolean }> | undefined, tag: string) {
    return features?.find((feature) => feature.tag === tag)?.enabled ?? true
  }

  return (
    <PanelSection label="Typography">
      <SharedStyleField kind="text" label={panels.textStyle} />
      <div className="mb-2.5">
        <PanelFieldGroup label="Font">
          <div className="flex items-center gap-1.5">
            <FontPicker value={fontFamily} onSelect={(family) => { void setFamily(family) }} />
            <FontSettingsPopover />
            {hasMissingFonts && (
              <Tip label={`Missing font${missingFonts.length > 1 ? 's' : ''}: ${missingFonts.join(', ')}`}>
                <AlertTriangle
                  role="img"
                  aria-label={`Missing font${missingFonts.length > 1 ? 's' : ''}: ${missingFonts.join(', ')}`}
                  className="size-3.5 shrink-0 text-warning-text"
                />
              </Tip>
            )}
          </div>
        </PanelFieldGroup>
      </div>

      <PanelGrid columns={2} className="mb-3">
        <PanelFieldGroup label={panels.fontWeight}>
          <select
            className={inputClass + ' h-6'}
            aria-label={panels.fontWeight}
            value={fontWeight}
            onChange={(e) => { void setWeight(Number(e.target.value)) }}
          >
            {weights.map((w: any) => (
              <option key={w.value} value={w.value}>{w.label}</option>
            ))}
          </select>
        </PanelFieldGroup>
        <PanelFieldGroup label={panels.fontSize}>
          <NumberField
            ariaLabel={panels.fontSize}
            value={fontSize}
            min={1}
            max={1000}
            onChange={(v) => updateProp('fontSize', v)}
            onCommit={(v, p) => commitProp('fontSize', v, p)}
          />
        </PanelFieldGroup>
      </PanelGrid>

      <PanelGrid columns={2} className="mb-3">
        <PanelFieldGroup label={panels.lineHeight}>
          <NumberField
            ariaLabel={panels.lineHeight}
            value={typeof lineHeight === 'number' ? lineHeight : Math.round((fontSize || 14) * 1.2)}
            min={0}
            onChange={(v) => updateProp('lineHeight', v)}
            onCommit={(v, p) => commitProp('lineHeight', v, p)}
            icon={<Baseline className="size-3" />}
          />
        </PanelFieldGroup>
        <PanelFieldGroup label={panels.letterSpacing}>
          <NumberField
            ariaLabel={panels.letterSpacing}
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
          onChange={(e) => setDirection(e.target.value as TextDirection)}
        >
          <option value="AUTO">Auto</option>
          <option value="LTR">LTR</option>
          <option value="RTL">RTL</option>
        </select>
      </PanelFieldGroup>

      <PanelFieldGroup label={panels.textAlignment} className="mb-3">
        <div
          role="group"
          aria-label={panels.textAlignment}
          className="inline-flex items-center gap-0.5 rounded bg-panel-field p-0.5"
        >
          {[
            { value: 'LEFT', label: panels.alignLeft, icon: <AlignLeft className="size-3.5" /> },
            { value: 'CENTER', label: panels.alignCenterHorizontally, icon: <AlignCenter className="size-3.5" /> },
            { value: 'RIGHT', label: panels.alignRight, icon: <AlignRight className="size-3.5" /> },
            { value: 'JUSTIFIED', label: panels.textAlignment, icon: <AlignJustify className="size-3.5" /> }
          ].map((option) => (
            <IconButton
              key={option.value}
              label={option.label}
              size="md"
              active={textAlign === option.value}
              onClick={() => setAlign(option.value as TextAlign)}
            >
              {option.icon}
            </IconButton>
          ))}
        </div>
      </PanelFieldGroup>

      <PanelFieldGroup label={panels.verticalTextAlignment} className="mb-3">
        <div
          role="group"
          aria-label={panels.verticalTextAlignment}
          className="inline-flex items-center gap-0.5 rounded bg-panel-field p-0.5"
        >
          {[
            { value: 'TOP', label: panels.alignTop, icon: <AlignVerticalJustifyStart className="size-3.5" /> },
            { value: 'CENTER', label: panels.alignCenterVertically, icon: <AlignVerticalJustifyCenter className="size-3.5" /> },
            { value: 'BOTTOM', label: panels.alignBottom, icon: <AlignVerticalJustifyEnd className="size-3.5" /> }
          ].map((option) => (
            <IconButton
              key={option.value}
              label={option.label}
              size="md"
              active={verticalAlign === option.value}
              onClick={() => setVerticalAlign(option.value as TextVerticalAlign)}
            >
              {option.icon}
            </IconButton>
          ))}
        </div>
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
        <PanelFieldGroup label={panels.textCase}>
          <AppSelect
            label={panels.textCase}
            value={textCase}
            onValueChange={(v) => setTextCase(v as TextCase)}
            options={[
              { value: 'ORIGINAL', label: panels.textCaseOriginal },
              { value: 'UPPER', label: panels.textCaseUpper },
              { value: 'LOWER', label: panels.textCaseLower },
              { value: 'TITLE', label: panels.textCaseTitle }
            ]}
          />
        </PanelFieldGroup>
        <PanelFieldGroup label={panels.truncation}>
          <AppSelect
            label={panels.truncation}
            value={textTruncation}
            onValueChange={(v) => setTruncation(v as TextTruncation)}
            options={[
              { value: 'DISABLED', label: panels.truncationDisabled },
              { value: 'ENDING', label: panels.truncationEnding }
            ]}
          />
        </PanelFieldGroup>
      </PanelGrid>

      {textTruncation === 'ENDING' && (
        <PanelFieldGroup label={panels.maxLines} className="mb-3">
          <NumberField
            ariaLabel={panels.maxLines}
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
