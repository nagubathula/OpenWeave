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
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  ArrowRightLeft,
  ArrowUpDown,
  Square
} from 'lucide-react'
import React, { useState } from 'react'

import { useTypography, useI18n } from '@openweave/react'
import { styleToWeight, weightToStyle } from '@openweave/scene-graph'
import type { SceneNode, TextDecorationStyle } from '@openweave/scene-graph'

import { listFamilyStyles } from '@/app/editor/fonts'
import FontPicker from '@/components/font-picker/FontPicker'
import FontSettingsPopover from '@/components/font-settings/FontSettingsPopover'
import NumberField from '@/components/inputs/NumberField'
import SharedStyleField from '@/components/properties/shared-style/SharedStyleField'
import { AppSwitch } from '@/components/ui/AppSwitch'
import IconButton from '@/components/ui/IconButton'
import PanelGrid from '@/components/ui/panel/PanelGrid'
import PanelSection from '@/components/ui/panel/PanelSection'
import Tip from '@/components/ui/Tip'

type TextAlign = SceneNode['textAlignHorizontal']
type TextVerticalAlign = SceneNode['textAlignVertical']
type TextCase = SceneNode['textCase']
type TextDirection = SceneNode['textDirection']

const inputClass =
  'w-full bg-input/50 rounded px-2 py-1 border border-border text-surface text-xs outline-none focus:border-accent'

function PanelFieldGroup({
  label,
  children,
  className = ''
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
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
    editor,
    fontFamily,
    fontWeight,
    fontSize,
    rangeFontWeight,
    rangeFontSize,
    weights,
    activeFormatting,
    setFamily,
    setWeight,
    setFontStyle,
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
    hasMissingFonts,
    textAutoResize,
    setTextAutoResize
  } = useTypography()
  const { panels } = useI18n()

  // Real face names for the current family (Tauri system fonts); empty means
  // unknown and the dropdown falls back to the generic numeric weight list.
  const [familyStyles, setFamilyStyles] = React.useState<string[]>([])
  const [openTypeExpanded, setOpenTypeExpanded] = useState(false)
  React.useEffect(() => {
    let cancelled = false
    if (!fontFamily) {
      setFamilyStyles([])
      return
    }
    void listFamilyStyles(fontFamily).then((styles) => {
      if (!cancelled) {
        setFamilyStyles(
          [...styles].sort(
            (a, b) =>
              styleToWeight(a) - styleToWeight(b) ||
              Number(/italic|oblique/i.test(a)) - Number(/italic|oblique/i.test(b))
          )
        )
      }
    })
    return () => {
      cancelled = true
    }
  }, [fontFamily])

  if (!node || !('textAlignHorizontal' in node)) return null

  const lineHeight = node.lineHeight ?? ''
  const letterSpacing = node.letterSpacing
  const textAlign = node.textAlignHorizontal
  const verticalAlign = node.textAlignVertical
  const textCase = node.textCase
  const textDirection = node.textDirection
  const textTruncation = node.textTruncation
  const maxLines = node.maxLines ?? 1

  function featureEnabled(
    features: Array<{ tag: string; enabled: boolean }> | undefined,
    tag: string
  ) {
    return features?.find((feature) => feature.tag === tag)?.enabled ?? true
  }

  return (
    <PanelSection label="Typography">
      <SharedStyleField kind="text" label={panels.textStyle} />
      <div className="mb-2.5">
        <PanelFieldGroup label="Font">
          <div className="flex items-center gap-1.5">
            <FontPicker
              value={fontFamily}
              onSelect={(family) => {
                void setFamily(family)
              }}
            />
            <FontSettingsPopover />
            {hasMissingFonts && (
              <Tip
                label={`Missing font${missingFonts.length > 1 ? 's' : ''}: ${missingFonts.join(', ')}`}
              >
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
          {familyStyles.length > 0 ? (
            (() => {
              const effWeight = typeof rangeFontWeight === 'number' ? rangeFontWeight : fontWeight
              const effItalic = activeFormatting.includes('italic')
              const matched =
                rangeFontWeight === 'mixed'
                  ? undefined
                  : familyStyles.find(
                      (style) =>
                        styleToWeight(style) === effWeight &&
                        /italic|oblique/i.test(style) === effItalic
                    )
              const fallbackLabel = weightToStyle(effWeight, effItalic)
              const value = rangeFontWeight === 'mixed' ? 'mixed' : (matched ?? `__unavailable__`)
              return (
                <select
                  className={inputClass + ' h-6'}
                  aria-label={panels.fontWeight}
                  value={value}
                  onChange={(e) => {
                    if (e.target.value === 'mixed' || e.target.value === '__unavailable__') return
                    void setFontStyle(e.target.value)
                  }}
                >
                  {rangeFontWeight === 'mixed' && (
                    <option value="mixed" disabled>
                      {panels.mixed}
                    </option>
                  )}
                  {!matched && rangeFontWeight !== 'mixed' && (
                    <option value="__unavailable__" disabled>
                      {fallbackLabel}
                    </option>
                  )}
                  {familyStyles.map((style) => (
                    <option key={style} value={style}>
                      {style}
                    </option>
                  ))}
                </select>
              )
            })()
          ) : (
            <select
              className={inputClass + ' h-6'}
              aria-label={panels.fontWeight}
              value={rangeFontWeight === 'mixed' ? 'mixed' : String(rangeFontWeight ?? fontWeight)}
              onChange={(e) => {
                if (e.target.value === 'mixed') return
                void setWeight(Number(e.target.value))
              }}
            >
              {rangeFontWeight === 'mixed' && (
                <option value="mixed" disabled>
                  {panels.mixed}
                </option>
              )}
              {weights.map((w: any) => (
                <option key={w.value} value={w.value}>
                  {w.label}
                </option>
              ))}
            </select>
          )}
        </PanelFieldGroup>
        <PanelFieldGroup label={panels.fontSize}>
          <NumberField
            ariaLabel={panels.fontSize}
            value={typeof rangeFontSize === 'number' ? rangeFontSize : fontSize}
            min={1}
            max={1000}
            onChange={(v) => updateProp('fontSize', v)}
            onCommit={(v, p) => commitProp('fontSize', v, p)}
          />
        </PanelFieldGroup>
      </PanelGrid>

      <PanelGrid columns={2} className="mb-3">
        <PanelFieldGroup label={panels.lineHeight}>
          <div className="flex items-center gap-1">
            <NumberField
              ariaLabel={panels.lineHeight}
              value={
                typeof lineHeight === 'number' ? lineHeight : Math.round((fontSize || 14) * 1.2)
              }
              min={0}
              onChange={(v) => updateProp('lineHeight', v)}
              onCommit={(v, p) => commitProp('lineHeight', v, p)}
              icon={<Baseline className="size-3" />}
            />
            <select
              aria-label={`${panels.lineHeight} unit`}
              className="h-6 shrink-0 rounded border border-border bg-input/50 px-1 text-[10px] text-muted outline-none focus:border-accent"
              value={typeof lineHeight === 'number' ? 'px' : 'auto'}
              onChange={(e) => {
                if (e.target.value === 'auto') {
                  editor.updateNodeWithUndo(node.id, { lineHeight: null }, 'Change lineHeight')
                } else if (typeof lineHeight !== 'number') {
                  editor.updateNodeWithUndo(
                    node.id,
                    { lineHeight: Math.round((fontSize || 14) * 1.2) },
                    'Change lineHeight'
                  )
                }
              }}
            >
              <option value="auto">{panels.lineHeightAuto}</option>
              <option value="px">px</option>
            </select>
          </div>
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

      <PanelFieldGroup label="Resizing" className="mb-3">
        <div
          role="group"
          aria-label="Text resizing"
          className="inline-flex items-center gap-0.5 rounded bg-panel-field p-0.5"
        >
          {[
            {
              value: 'WIDTH_AND_HEIGHT',
              label: 'Auto width',
              icon: <ArrowRightLeft className="size-3.5" />
            },
            {
              value: 'HEIGHT',
              label: 'Auto height',
              icon: <ArrowUpDown className="size-3.5" />
            },
            {
              value: 'NONE',
              label: 'Fixed size',
              icon: <Square className="size-3.5" />
            }
          ].map((option) => (
            <IconButton
              key={option.value}
              label={option.label}
              size="md"
              active={textAutoResize === option.value}
              onClick={() =>
                setTextAutoResize(option.value as 'NONE' | 'WIDTH_AND_HEIGHT' | 'HEIGHT')
              }
            >
              {option.icon}
            </IconButton>
          ))}
        </div>
      </PanelFieldGroup>

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
            {
              value: 'CENTER',
              label: panels.alignCenterHorizontally,
              icon: <AlignCenter className="size-3.5" />
            },
            { value: 'RIGHT', label: panels.alignRight, icon: <AlignRight className="size-3.5" /> },
            {
              value: 'JUSTIFIED',
              label: panels.textAlignment,
              icon: <AlignJustify className="size-3.5" />
            }
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
            {
              value: 'TOP',
              label: panels.alignTop,
              icon: <AlignVerticalJustifyStart className="size-3.5" />
            },
            {
              value: 'CENTER',
              label: panels.alignCenterVertically,
              icon: <AlignVerticalJustifyCenter className="size-3.5" />
            },
            {
              value: 'BOTTOM',
              label: panels.alignBottom,
              icon: <AlignVerticalJustifyEnd className="size-3.5" />
            }
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
          aria-label="Text formatting"
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

      {(activeFormatting.includes('underline') || node.textDecoration === 'UNDERLINE') && (
        <div className="mb-3 rounded border border-border bg-input/20 p-2 text-xs">
          <div className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted">
            Underline details
          </div>
          <div className="mb-2 grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-[10px] text-muted">Style</label>
              <select
                className={inputClass + ' h-6'}
                value={node.textDecorationStyle ?? 'SOLID'}
                onChange={(e) =>
                  editor.updateNodeWithUndo(
                    node.id,
                    { textDecorationStyle: e.target.value as TextDecorationStyle },
                    'Change underline style'
                  )
                }
              >
                <option value="SOLID">Solid</option>
                <option value="DOTTED">Dotted</option>
                <option value="WAVY">Wavy</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[10px] text-muted">Offset</label>
              <NumberField
                value={node.textUnderlineOffset ?? 0}
                suffix="px"
                step={1}
                onChange={(v) =>
                  editor.updateNodeWithUndo(
                    node.id,
                    { textUnderlineOffset: v },
                    'Change underline offset'
                  )
                }
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-[10px] text-muted">Thickness</label>
              <NumberField
                value={node.textDecorationThickness ?? 1}
                min={1}
                suffix="px"
                step={1}
                onChange={(v) =>
                  editor.updateNodeWithUndo(
                    node.id,
                    { textDecorationThickness: v },
                    'Change decoration thickness'
                  )
                }
              />
            </div>
            <div className="flex flex-col justify-end">
              <label className="flex h-6 items-center justify-between gap-1 text-[10px] text-muted">
                <span>Skip ink</span>
                <AppSwitch
                  value={node.textDecorationSkipInk ?? true}
                  onValueChange={(val: boolean) =>
                    editor.updateNodeWithUndo(
                      node.id,
                      { textDecorationSkipInk: val },
                      'Toggle skip ink'
                    )
                  }
                />
              </label>
            </div>
          </div>
        </div>
      )}

      <PanelFieldGroup label={panels.textCase} className="mb-3">
        <div
          role="group"
          aria-label={panels.textCase}
          className="inline-flex items-center gap-0.5 rounded bg-panel-field p-0.5"
        >
          {[
            { value: 'ORIGINAL', label: panels.textCaseOriginal, text: 'Aa' },
            { value: 'UPPER', label: panels.textCaseUpper, text: 'AA' },
            { value: 'LOWER', label: panels.textCaseLower, text: 'aa' },
            { value: 'TITLE', label: panels.textCaseTitle, text: 'Aa Bb' }
          ].map((option) => (
            <Tip key={option.value} label={option.label}>
              <button
                type="button"
                className={`h-6 px-2 text-[11px] font-medium rounded transition-colors ${
                  textCase === option.value
                    ? 'bg-hover text-surface shadow-xs font-semibold'
                    : 'text-muted hover:text-surface hover:bg-hover/50'
                }`}
                onClick={() => setTextCase(option.value as TextCase)}
              >
                {option.text}
              </button>
            </Tip>
          ))}
        </div>
      </PanelFieldGroup>

      <PanelGrid columns={textTruncation === 'ENDING' ? 2 : 1} className="mb-3">
        <PanelFieldGroup label={panels.truncation}>
          <div
            role="group"
            aria-label={panels.truncation}
            className="inline-flex items-center gap-0.5 rounded bg-panel-field p-0.5"
          >
            <Tip label={panels.truncationDisabled}>
              <button
                type="button"
                className={`h-6 px-2.5 text-[11px] font-medium rounded transition-colors ${
                  textTruncation === 'DISABLED'
                    ? 'bg-hover text-surface shadow-xs font-semibold'
                    : 'text-muted hover:text-surface hover:bg-hover/50'
                }`}
                onClick={() => setTruncation('DISABLED')}
              >
                {panels.truncationDisabled}
              </button>
            </Tip>
            <Tip label={panels.truncationEnding}>
              <button
                type="button"
                className={`h-6 px-2.5 text-[11px] font-medium rounded transition-colors ${
                  textTruncation === 'ENDING'
                    ? 'bg-hover text-surface shadow-xs font-semibold'
                    : 'text-muted hover:text-surface hover:bg-hover/50'
                }`}
                onClick={() => setTruncation('ENDING')}
              >
                {panels.truncationEnding}
              </button>
            </Tip>
          </div>
        </PanelFieldGroup>
        {textTruncation === 'ENDING' && (
          <PanelFieldGroup label={panels.maxLines}>
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
      </PanelGrid>

      <div className="mb-3">
        <button
          type="button"
          onClick={() => setOpenTypeExpanded((prev) => !prev)}
          className="flex w-full items-center justify-between py-1 text-[11px] font-medium text-muted hover:text-surface"
        >
          <span>OpenType features</span>
          {openTypeExpanded ? (
            <ChevronDown className="size-3.5" />
          ) : (
            <ChevronRight className="size-3.5" />
          )}
        </button>

        {openTypeExpanded && (
          <div className="mt-2 space-y-3 rounded border border-border bg-input/20 p-2 text-xs">
            <div>
              <div className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted">
                Ligatures & Alternates
              </div>
              <div className="grid gap-2">
                <label className="flex items-center justify-between text-[11px] text-muted/70">
                  <span>Standard ligatures</span>
                  <AppSwitch
                    value={featureEnabled(node.fontFeatures, 'LIGA')}
                    onValueChange={(val: boolean) => setFontFeature('LIGA', val)}
                  />
                </label>
                <label className="flex items-center justify-between text-[11px] text-muted/70">
                  <span>Contextual alternates</span>
                  <AppSwitch
                    value={featureEnabled(node.fontFeatures, 'CALT')}
                    onValueChange={(val: boolean) => setFontFeature('CALT', val)}
                  />
                </label>
                <label className="flex items-center justify-between text-[11px] text-muted/70">
                  <span>Discretionary ligatures</span>
                  <AppSwitch
                    value={featureEnabled(node.fontFeatures, 'DLIG')}
                    onValueChange={(val: boolean) => setFontFeature('DLIG', val)}
                  />
                </label>
                <label className="flex items-center justify-between text-[11px] text-muted/70">
                  <span>Historical ligatures</span>
                  <AppSwitch
                    value={featureEnabled(node.fontFeatures, 'HLIG')}
                    onValueChange={(val: boolean) => setFontFeature('HLIG', val)}
                  />
                </label>
              </div>
            </div>

            <div>
              <div className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted">
                Numbers
              </div>
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted/70">Figure style</span>
                  <select
                    className={inputClass + ' h-6 w-28'}
                    value={
                      featureEnabled(node.fontFeatures, 'ONUM')
                        ? 'ONUM'
                        : featureEnabled(node.fontFeatures, 'LNUM')
                          ? 'LNUM'
                          : 'DEFAULT'
                    }
                    onChange={(e) => {
                      const v = e.target.value
                      setFontFeature('LNUM', v === 'LNUM')
                      setFontFeature('ONUM', v === 'ONUM')
                    }}
                  >
                    <option value="DEFAULT">Default</option>
                    <option value="LNUM">Lining</option>
                    <option value="ONUM">Oldstyle</option>
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted/70">Figure spacing</span>
                  <select
                    className={inputClass + ' h-6 w-28'}
                    value={
                      featureEnabled(node.fontFeatures, 'TNUM')
                        ? 'TNUM'
                        : featureEnabled(node.fontFeatures, 'PNUM')
                          ? 'PNUM'
                          : 'DEFAULT'
                    }
                    onChange={(e) => {
                      const v = e.target.value
                      setFontFeature('PNUM', v === 'PNUM')
                      setFontFeature('TNUM', v === 'TNUM')
                    }}
                  >
                    <option value="DEFAULT">Default</option>
                    <option value="PNUM">Proportional</option>
                    <option value="TNUM">Tabular</option>
                  </select>
                </div>
                <label className="flex items-center justify-between text-[11px] text-muted/70">
                  <span>Fractions</span>
                  <AppSwitch
                    value={featureEnabled(node.fontFeatures, 'FRAC')}
                    onValueChange={(val: boolean) => setFontFeature('FRAC', val)}
                  />
                </label>
                <label className="flex items-center justify-between text-[11px] text-muted/70">
                  <span>Slashed zero</span>
                  <AppSwitch
                    value={featureEnabled(node.fontFeatures, 'ZERO')}
                    onValueChange={(val: boolean) => setFontFeature('ZERO', val)}
                  />
                </label>
                <label className="flex items-center justify-between text-[11px] text-muted/70">
                  <span>Ordinals</span>
                  <AppSwitch
                    value={featureEnabled(node.fontFeatures, 'ORDN')}
                    onValueChange={(val: boolean) => setFontFeature('ORDN', val)}
                  />
                </label>
              </div>
            </div>

            <div>
              <div className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted">
                Letterforms
              </div>
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted/70">Caps</span>
                  <select
                    className={inputClass + ' h-6 w-28'}
                    value={
                      featureEnabled(node.fontFeatures, 'SMCP')
                        ? 'SMCP'
                        : featureEnabled(node.fontFeatures, 'TITL')
                          ? 'TITL'
                          : featureEnabled(node.fontFeatures, 'UNIC')
                            ? 'UNIC'
                            : 'DEFAULT'
                    }
                    onChange={(e) => {
                      const v = e.target.value
                      setFontFeature('SMCP', v === 'SMCP')
                      setFontFeature('TITL', v === 'TITL')
                      setFontFeature('UNIC', v === 'UNIC')
                    }}
                  >
                    <option value="DEFAULT">Normal</option>
                    <option value="SMCP">Small caps</option>
                    <option value="TITL">Titling</option>
                    <option value="UNIC">Unicase</option>
                  </select>
                </div>
                <label className="flex items-center justify-between text-[11px] text-muted/70">
                  <span>Kerning</span>
                  <AppSwitch
                    value={featureEnabled(node.fontFeatures, 'KERN')}
                    onValueChange={(val: boolean) => setFontFeature('KERN', val)}
                  />
                </label>
              </div>
            </div>

            <div>
              <div className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted">
                Stylistic Sets
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(['SS01', 'SS02', 'SS03', 'SS04'] as const).map((tag, i) => (
                  <label
                    key={tag}
                    className="flex items-center justify-between text-[11px] text-muted/70"
                  >
                    <span>Set {i + 1}</span>
                    <AppSwitch
                      value={featureEnabled(node.fontFeatures, tag)}
                      onValueChange={(val: boolean) => setFontFeature(tag, val)}
                    />
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </PanelSection>
  )
}
