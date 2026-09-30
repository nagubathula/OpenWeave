import { useStore } from '@nanostores/react'
import {
  Calculator,
  Check,
  CreditCard,
  Lock,
  Minus,
  Monitor,
  Plus,
  RotateCcw,
  Ruler as RulerIcon,
  Smartphone
} from 'lucide-react'
import React, { useCallback, useEffect, useState } from 'react'
import { useEventListener } from 'usehooks-ts'

import { useI18n } from '@openweave/react'

import { getActiveEditorStore } from '@/app/editor/active-store'
import {
  calculatePpiFromSpecs,
  calibrateWithCardWidth,
  closeDisplayScaleDialog,
  CREDIT_CARD_ASPECT_RATIO,
  CREDIT_CARD_WIDTH_INCHES,
  displayScaleDialogOpen,
  displayScaleSettings,
  POPULAR_DISPLAY_PRESETS,
  ppiFromCardWidth,
  resetDisplayScaleSettings,
  zoomForDevice,
  zoomForPhysical
} from '@/app/editor/display-scale'
import { toast } from '@/app/shell/ui'
import { AppDialogHeader, AppDialogRoot } from '@/components/ui/dialog'

type CalibrationMode = 'card' | 'specs' | 'ruler'

export default function DisplayScaleCalibrationDialog() {
  const { dialogs } = useI18n()
  const open = useStore(displayScaleDialogOpen)
  const settings = useStore(displayScaleSettings)

  const [mode, setMode] = useState<CalibrationMode>('card')
  const [cardWidth, setCardWidth] = useState(settings.cardWidthPx)
  const [selectedPresetId, setSelectedPresetId] = useState<string | undefined>(settings.presetId)

  // Screen specs calculator state
  const [specDiagonal, setSpecDiagonal] = useState<number>(15.6)
  const [specWidth, setSpecWidth] = useState<number>(1920)
  const [specHeight, setSpecHeight] = useState<number>(1080)
  const [specScaling, setSpecScaling] = useState<number>(125)

  // Keep local cardWidth in sync when dialog opens
  useEffect(() => {
    if (open) {
      setCardWidth(settings.cardWidthPx)
      setSelectedPresetId(settings.presetId)
    }
  }, [open, settings.cardWidthPx, settings.presetId])

  const ppi = ppiFromCardWidth(cardWidth)
  const cardHeight = Math.round(cardWidth / CREDIT_CARD_ASPECT_RATIO)
  // Real ISO 7810 corner radius is 3.18mm on an 85.60mm card
  const cornerRadiusPx = Math.max(4, Math.round(cardWidth * (3.18 / 85.6)))
  const physicalZoomPercent = Math.round(zoomForPhysical(ppi) * 100)
  const mobileZoomPercent = Math.round(zoomForDevice(ppi, 393, 64.6) * 100)

  // 100mm ruler width in screen pixels
  const ruler100mmPx = Math.round(ppi * 3.93700787)
  // 1 inch verification box in screen pixels
  const oneInchPx = Math.round(ppi)

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number.parseInt(e.target.value, 10)
    if (!Number.isNaN(val)) {
      setCardWidth(val)
      setSelectedPresetId(undefined)
    }
  }

  const nudge = (delta: number) => {
    setCardWidth((prev) => Math.max(140, Math.min(650, prev + delta)))
    setSelectedPresetId(undefined)
  }

  const handlePpiInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number.parseFloat(e.target.value)
    if (!Number.isNaN(val) && val >= 40 && val <= 400) {
      const newWidth = Math.round(val * CREDIT_CARD_WIDTH_INCHES)
      setCardWidth(newWidth)
      setSelectedPresetId(undefined)
    }
  }

  const handleSelectPreset = (presetId: string, presetPpi: number) => {
    setSelectedPresetId(presetId)
    const newWidth = Math.round(presetPpi * CREDIT_CARD_WIDTH_INCHES)
    setCardWidth(newWidth)
  }

  const handleApplySpecs = (diag: number, w: number, h: number, scale: number) => {
    setSpecDiagonal(diag)
    setSpecWidth(w)
    setSpecHeight(h)
    setSpecScaling(scale)
    const calculatedPpi = calculatePpiFromSpecs(diag, w, h, scale)
    const newWidth = Math.round(calculatedPpi * CREDIT_CARD_WIDTH_INCHES)
    setCardWidth(newWidth)
    setSelectedPresetId(undefined)
  }

  const handleSave = (zoomAfterSave: boolean) => {
    calibrateWithCardWidth(cardWidth, selectedPresetId)
    closeDisplayScaleDialog()

    const zoomPercent = Math.round(zoomForPhysical(ppi) * 100)
    toast.info(`Display scale calibrated to ${ppi} PPI (${zoomPercent}% zoom)`)

    if (zoomAfterSave) {
      const store = getActiveEditorStore()
      store?.zoomToPhysical(ppi)
    }
  }

  const handleReset = () => {
    const defaults = resetDisplayScaleSettings()
    setCardWidth(defaults.cardWidthPx)
    setSelectedPresetId(undefined)
  }

  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!open) return
      if (event.key === 'F12' || (event.key === 'Enter' && !event.shiftKey && !event.altKey)) {
        event.preventDefault()
        event.stopPropagation()
        handleSave(true)
      }
    },
    [open, cardWidth, selectedPresetId, ppi]
  )

  useEventListener('keydown', onKeyDown)

  return (
    <AppDialogRoot
      open={open}
      onOpenChange={(isOpen) => !isOpen && closeDisplayScaleDialog()}
      size="lg"
      className="flex max-h-[min(92vh,52rem)] flex-col overflow-hidden"
    >
      <AppDialogHeader
        heading={dialogs.displayScaleTitle}
        description={dialogs.displayScaleDescription}
      />

      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-4 p-5 text-surface">
        {/* Calibration Method Tabs */}
        <div className="flex items-center gap-1 rounded-lg border border-border bg-input/20 p-1 text-xs">
          <button
            type="button"
            onClick={() => setMode('card')}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 font-medium transition-colors cursor-pointer ${
              mode === 'card'
                ? 'bg-accent text-white shadow-xs'
                : 'text-muted hover:text-surface hover:bg-hover/60'
            }`}
          >
            <CreditCard className="size-3.5" />
            <span>Credit / ID Card</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('specs')}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 font-medium transition-colors cursor-pointer ${
              mode === 'specs'
                ? 'bg-accent text-white shadow-xs'
                : 'text-muted hover:text-surface hover:bg-hover/60'
            }`}
          >
            <Calculator className="size-3.5" />
            <span>Screen Specs Calculator</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('ruler')}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 font-medium transition-colors cursor-pointer ${
              mode === 'ruler'
                ? 'bg-accent text-white shadow-xs'
                : 'text-muted hover:text-surface hover:bg-hover/60'
            }`}
          >
            <RulerIcon className="size-3.5" />
            <span>Physical Ruler</span>
          </button>
        </div>

        {/* Tab 1: Physical Credit Card Calibration */}
        {mode === 'card' && (
          <div className="flex flex-col gap-3">
            <div className="flex items-start gap-3 rounded-lg border border-accent/30 bg-accent/10 p-3 text-xs">
              <CreditCard className="mt-0.5 size-4 shrink-0 text-accent" />
              <div className="flex flex-col gap-0.5">
                <span className="font-semibold text-surface">{dialogs.creditCardCalibration}</span>
                <p className="text-muted leading-relaxed">
                  Hold any standard credit card, debit card, or ID against the screen. Line up the
                  top-left corner with the corner guides, then adjust until the outline matches your
                  physical card.
                </p>
              </div>
            </div>

            {/* Interactive Card Canvas Preview with high-precision corner crosshairs */}
            <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-canvas/80 p-5 overflow-x-auto min-h-[220px]">
              <div
                style={{
                  width: `${cardWidth}px`,
                  height: `${cardHeight}px`,
                  borderRadius: `${cornerRadiusPx}px`
                }}
                className="relative flex flex-col justify-between overflow-hidden border-2 border-accent bg-gradient-to-br from-zinc-800 via-zinc-900 to-black p-4 text-white shadow-lg transition-[width,height] duration-75 select-none shrink-0"
              >
                {/* Precision corner alignment indicators */}
                <div className="absolute top-1 left-1 font-mono text-[9px] text-accent font-bold leading-none pointer-events-none">
                  ⌜
                </div>
                <div className="absolute top-1 right-1 font-mono text-[9px] text-accent font-bold leading-none pointer-events-none">
                  ⌝
                </div>
                <div className="absolute bottom-1 left-1 font-mono text-[9px] text-accent font-bold leading-none pointer-events-none">
                  ⌞
                </div>
                <div className="absolute bottom-1 right-1 font-mono text-[9px] text-accent font-bold leading-none pointer-events-none">
                  ⌟
                </div>

                {/* Top header: Chip & 1:1 scale tag */}
                <div className="flex items-center justify-between">
                  <div className="flex h-7 w-10 items-center justify-center rounded border border-amber-400/80 bg-gradient-to-br from-amber-300 to-amber-500 shadow-xs">
                    <div className="h-3.5 w-5 rounded-xs border border-amber-600/40 bg-amber-400/50" />
                  </div>
                  <div className="flex items-center gap-1.5 rounded bg-black/40 px-2 py-0.5 border border-white/10">
                    <span className="text-[10px] tracking-wider font-mono text-accent font-semibold">
                      1:1 PHYSICAL SIZE
                    </span>
                  </div>
                </div>

                {/* Bottom specs: Single clean dimension indicator */}
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-semibold tracking-wide text-zinc-100">
                    {dialogs.standardCardDimensions}
                  </span>
                  <span className="text-[11px] text-zinc-400 font-mono">
                    {cardWidth} px × {cardHeight} px •{' '}
                    <strong className="text-accent">{ppi}</strong> {dialogs.pixelsPerInch}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Display Specs Calculator */}
        {mode === 'specs' && (
          <div className="flex flex-col gap-3">
            <div className="flex items-start gap-3 rounded-lg border border-accent/30 bg-accent/10 p-3 text-xs">
              <Calculator className="mt-0.5 size-4 shrink-0 text-accent" />
              <div className="flex flex-col gap-0.5">
                <span className="font-semibold text-surface">Screen Specifications Calculator</span>
                <p className="text-muted leading-relaxed">
                  Calculate mathematically exact PPI directly from your monitor or laptop diagonal
                  size, resolution, and Windows/Mac display scaling percentage without guessing.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 rounded-xl border border-border bg-input/10 p-4 text-xs">
              {/* Common screen diagonal buttons */}
              <div className="flex flex-col gap-1.5">
                <span className="font-medium text-surface">Screen Diagonal Size:</span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {[13.3, 14, 15.6, 16, 24, 27, 32].map((diag) => (
                    <button
                      key={diag}
                      type="button"
                      onClick={() => handleApplySpecs(diag, specWidth, specHeight, specScaling)}
                      className={`px-3 py-1 rounded border text-xs font-medium transition-colors cursor-pointer ${
                        specDiagonal === diag
                          ? 'border-accent bg-accent/20 text-accent font-semibold'
                          : 'border-border bg-panel text-muted hover:text-surface hover:bg-hover'
                      }`}
                    >
                      {diag}&quot;
                    </button>
                  ))}
                  <div className="flex items-center gap-1 ml-auto">
                    <span className="text-muted text-[11px]">Custom:</span>
                    <input
                      type="number"
                      step="0.1"
                      min="10"
                      max="65"
                      value={specDiagonal}
                      onChange={(e) =>
                        handleApplySpecs(
                          parseFloat(e.target.value) || 15.6,
                          specWidth,
                          specHeight,
                          specScaling
                        )
                      }
                      className="w-16 rounded border border-border bg-panel px-2 py-0.5 font-mono text-xs text-surface outline-none focus:border-accent"
                    />
                    <span className="text-muted text-[11px]">&quot;</span>
                  </div>
                </div>
              </div>

              {/* Resolution options */}
              <div className="flex flex-col gap-1.5">
                <span className="font-medium text-surface">Display Resolution:</span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    { label: '1920 × 1080 (FHD)', w: 1920, h: 1080 },
                    { label: '2560 × 1440 (QHD)', w: 2560, h: 1440 },
                    { label: '2880 × 1800 (2.8K)', w: 2880, h: 1800 },
                    { label: '3840 × 2160 (4K)', w: 3840, h: 2160 }
                  ].map((res) => (
                    <button
                      key={res.label}
                      type="button"
                      onClick={() => handleApplySpecs(specDiagonal, res.w, res.h, specScaling)}
                      className={`px-2.5 py-1 rounded border text-xs font-medium transition-colors cursor-pointer ${
                        specWidth === res.w && specHeight === res.h
                          ? 'border-accent bg-accent/20 text-accent font-semibold'
                          : 'border-border bg-panel text-muted hover:text-surface hover:bg-hover'
                      }`}
                    >
                      {res.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* OS Scaling Factor */}
              <div className="flex flex-col gap-1.5">
                <span className="font-medium text-surface">OS Display Scaling:</span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {[100, 125, 150, 175, 200].map((scale) => (
                    <button
                      key={scale}
                      type="button"
                      onClick={() => handleApplySpecs(specDiagonal, specWidth, specHeight, scale)}
                      className={`px-3 py-1 rounded border text-xs font-medium transition-colors cursor-pointer ${
                        specScaling === scale
                          ? 'border-accent bg-accent/20 text-accent font-semibold'
                          : 'border-border bg-panel text-muted hover:text-surface hover:bg-hover'
                      }`}
                    >
                      {scale}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Calculated Result banner */}
              <div className="flex items-center justify-between rounded-lg border border-accent/40 bg-accent/15 px-3 py-2 text-xs">
                <span className="text-surface font-medium">Calculated CSS Screen Density:</span>
                <div className="flex items-center gap-2 font-mono">
                  <span className="text-base font-bold text-accent">{ppi} PPI</span>
                  <span className="text-muted">({cardWidth} px card width)</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Physical Ruler Calibration */}
        {mode === 'ruler' && (
          <div className="flex flex-col gap-3">
            <div className="flex items-start gap-3 rounded-lg border border-accent/30 bg-accent/10 p-3 text-xs">
              <RulerIcon className="mt-0.5 size-4 shrink-0 text-accent" />
              <div className="flex flex-col gap-0.5">
                <span className="font-semibold text-surface">Physical Ruler Calibration</span>
                <p className="text-muted leading-relaxed">
                  Hold a physical desk ruler or tape measure against the line below. Adjust the
                  slider until exactly 10 centimeters (100 mm) on screen matches 10 cm on your
                  physical ruler.
                </p>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-canvas/80 p-6 overflow-x-auto min-h-[140px]">
              <div
                style={{ width: `${ruler100mmPx}px` }}
                className="relative flex flex-col border-b-2 border-accent pb-2 text-white select-none shrink-0"
              >
                {/* 10 cm ruler markings */}
                <div className="flex w-full items-end justify-between font-mono text-[9px] text-muted mb-1">
                  <span>0 cm</span>
                  <span>2.5 cm</span>
                  <span>5.0 cm</span>
                  <span>7.5 cm</span>
                  <span className="font-bold text-accent">10 cm (100 mm)</span>
                </div>

                {/* Ruler ticks */}
                <div className="relative h-4 w-full">
                  {Array.from({ length: 21 }).map((_, i) => {
                    const isMajor = i % 5 === 0
                    const leftPct = (i / 20) * 100
                    return (
                      <div
                        key={i}
                        className={`absolute bottom-0 w-px ${isMajor ? 'h-3 bg-accent' : 'h-1.5 bg-border'}`}
                        style={{ left: `${leftPct}%` }}
                      />
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Slider & Fine Adjustment Controls */}
        <div className="flex flex-col gap-2 rounded-lg border border-border bg-input/20 p-3.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-surface">Fine Calibration Adjustment</span>
            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="text-muted">
                {dialogs.screenDensityLabel}:{' '}
                <strong className="text-surface font-semibold">{ppi}</strong>{' '}
                {dialogs.pixelsPerInch}
              </span>
              <span className="text-muted">({cardWidth} px)</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Step -5px button */}
            <button
              type="button"
              onClick={() => nudge(-5)}
              className="flex h-7 px-2 items-center justify-center rounded border border-border bg-panel text-[11px] font-mono text-muted transition-colors hover:bg-hover hover:text-surface cursor-pointer"
              aria-label="Decrease width by 5px"
            >
              -5
            </button>

            {/* Step -1px button */}
            <button
              type="button"
              onClick={() => nudge(-1)}
              className="flex size-7 items-center justify-center rounded border border-border bg-panel text-muted transition-colors hover:bg-hover hover:text-surface cursor-pointer"
              aria-label="Decrease width by 1px"
            >
              <Minus className="size-3.5" />
            </button>

            <input
              type="range"
              min="160"
              max="580"
              value={cardWidth}
              onChange={handleSliderChange}
              className="h-1.5 flex-1 cursor-pointer appearance-none rounded-lg bg-border accent-accent"
            />

            {/* Step +1px button */}
            <button
              type="button"
              onClick={() => nudge(1)}
              className="flex size-7 items-center justify-center rounded border border-border bg-panel text-muted transition-colors hover:bg-hover hover:text-surface cursor-pointer"
              aria-label="Increase width by 1px"
            >
              <Plus className="size-3.5" />
            </button>

            {/* Step +5px button */}
            <button
              type="button"
              onClick={() => nudge(5)}
              className="flex h-7 px-2 items-center justify-center rounded border border-border bg-panel text-[11px] font-mono text-muted transition-colors hover:bg-hover hover:text-surface cursor-pointer"
              aria-label="Increase width by 5px"
            >
              +5
            </button>

            {/* Direct PPI input */}
            <div className="flex items-center gap-1 pl-1">
              <input
                type="number"
                min="40"
                max="400"
                value={ppi}
                onChange={handlePpiInput}
                className="w-14 rounded border border-border bg-panel px-1.5 py-1 text-center font-mono text-xs text-surface outline-none focus:border-accent"
              />
              <span className="text-[11px] text-muted">PPI</span>
            </div>
          </div>
        </div>

        {/* Popular Display Presets (Categorized) */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-muted">{dialogs.displayPresetsTitle}</span>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {POPULAR_DISPLAY_PRESETS.slice(0, 8).map((preset) => {
              const isSelected = selectedPresetId === preset.id
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectPreset(preset.id, preset.ppi)}
                  className={`flex flex-col items-start rounded-lg border p-2 text-left transition-colors cursor-pointer ${
                    isSelected
                      ? 'border-accent bg-accent/15 text-accent'
                      : 'border-border bg-input/10 text-muted hover:border-muted hover:text-surface'
                  }`}
                >
                  <div className="flex w-full items-center justify-between text-xs font-medium">
                    <span className="truncate">{preset.name.split(' (')[0]}</span>
                    {isSelected && <Check className="size-3 shrink-0" />}
                  </div>
                  <span className="text-[10px] opacity-75">{preset.ppi} PPI</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Live Zoom Multipliers & 1-Inch Real-Size Verification Swatch */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 rounded-lg border border-border bg-input/10 p-3 text-xs">
          <div className="flex items-center gap-2.5">
            <Monitor className="size-4 text-muted shrink-0" />
            <div className="flex flex-col">
              <span className="text-[11px] text-muted">{dialogs.zoomForRealSizeLabel}</span>
              <span className="text-sm font-semibold text-surface">{physicalZoomPercent}%</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Smartphone className="size-4 text-muted shrink-0" />
            <div className="flex flex-col">
              <span className="text-[11px] text-muted">{dialogs.zoomForMobileLabel}</span>
              <span className="text-sm font-semibold text-surface">{mobileZoomPercent}%</span>
            </div>
          </div>

          {/* 1-Inch Verification block */}
          <div className="flex items-center gap-2 border-t sm:border-t-0 sm:border-l border-border pt-2 sm:pt-0 sm:pl-3">
            <div
              style={{
                width: `${Math.min(36, oneInchPx / 3)}px`,
                height: `${Math.min(36, oneInchPx / 3)}px`
              }}
              className="rounded border border-dashed border-accent flex items-center justify-center text-[9px] font-mono text-accent shrink-0"
            >
              1&quot;
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-muted">1 Physical Inch</span>
              <span className="text-[11px] font-mono font-medium text-surface">{oneInchPx} px</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer actions */}
      <div className="flex shrink-0 items-center justify-between border-t border-border bg-input/30 px-5 py-3">
        <button
          type="button"
          onClick={handleReset}
          className="flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs text-muted transition-colors hover:bg-hover hover:text-surface cursor-pointer"
        >
          <RotateCcw className="size-3.5" />
          <span>{dialogs.resetToDefault}</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => closeDisplayScaleDialog()}
            className="rounded border border-border px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-hover hover:text-surface cursor-pointer"
          >
            {dialogs.cancel}
          </button>
          <button
            type="button"
            onClick={() => handleSave(false)}
            className="rounded border border-border bg-panel px-3 py-1.5 text-xs font-medium text-surface transition-colors hover:bg-hover cursor-pointer"
          >
            {dialogs.apply}
          </button>
          <button
            type="button"
            onClick={() => handleSave(true)}
            className="flex items-center gap-1.5 rounded bg-accent px-3.5 py-1.5 text-xs font-semibold text-accent-foreground shadow transition-colors hover:bg-accent/90 cursor-pointer"
          >
            <Lock className="size-3.5" />
            <span>{dialogs.saveAndZoomRealSize}</span>
            <kbd className="ml-1 rounded bg-black/25 px-1.5 py-0.5 font-mono text-[10px] text-white">
              F12
            </kbd>
          </button>
        </div>
      </div>
    </AppDialogRoot>
  )
}
