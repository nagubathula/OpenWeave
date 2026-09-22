import { Play, Pause, Plus, Trash2, Code2, Sparkles } from 'lucide-react'
import React, { useState } from 'react'

import { globalShaderCompiler } from '@openweave/core/canvas'
import { useEditor, useSelectionState } from '@openweave/react'
import {
  DEFAULT_SHADER_CONFIG,
  type Color,
  type ShaderConfig,
  type ShaderPresetType
} from '@openweave/scene-graph'

import NumberField from '@/components/inputs/NumberField'
import { PaintSwatchPopover } from '@/components/properties/paint/PaintSwatchPopover'
import { AppSelect } from '@/components/ui/AppSelect'
import { AppSwitch } from '@/components/ui/AppSwitch'
import IconButton from '@/components/ui/IconButton'
import PanelSection from '@/components/ui/panel/PanelSection'

const PRESET_OPTIONS: { value: ShaderPresetType; label: string }[] = [
  { value: 'ANIMATED_GRADIENT', label: 'Animated Aurora' },
  { value: 'NOISE_FIELD', label: 'Noise Field' },
  { value: 'PARTICLES', label: 'Particle Glow' },
  { value: 'METABALLS', label: 'Liquid Metaballs' },
  { value: 'LIGHTING', label: 'Surface Lighting' },
  { value: 'DISPLACEMENT', label: 'Displacement Waves' },
  { value: 'CUSTOM', label: 'Custom SkSL' }
]

export default function ShaderSection() {
  const editor = useEditor()
  const { selectedNode } = useSelectionState()
  const [showCodeEditor, setShowCodeEditor] = useState(false)

  if (!selectedNode || selectedNode.type === 'CANVAS') {
    return null
  }

  const isShaderNode = selectedNode.type === 'SHADER'
  const hasShader = Boolean(selectedNode.shader)
  const shaderConfig: ShaderConfig = selectedNode.shader ?? DEFAULT_SHADER_CONFIG

  const updateShader = (patch: Partial<ShaderConfig>) => {
    if (!selectedNode) return
    const current = selectedNode.shader ?? DEFAULT_SHADER_CONFIG
    editor.updateNode(selectedNode.id, {
      shader: {
        ...current,
        ...patch
      }
    })
  }

  const addShader = () => {
    if (!selectedNode) return
    editor.updateNode(selectedNode.id, {
      shader: { ...DEFAULT_SHADER_CONFIG }
    })
  }

  const removeShader = () => {
    if (!selectedNode || isShaderNode) return
    editor.updateNode(selectedNode.id, {
      shader: undefined
    })
  }

  const togglePause = () => {
    updateShader({ paused: !shaderConfig.paused })
  }

  const updateColor = (index: number, color: Color) => {
    const nextColors = [...(shaderConfig.colors ?? DEFAULT_SHADER_CONFIG.colors)]
    nextColors[index] = color
    updateShader({ colors: nextColors })
  }

  if (!hasShader && !isShaderNode) {
    return (
      <PanelSection
        label="Shader"
        empty
        actions={
          <IconButton label="Add shader" size="sm" onClick={addShader}>
            <Plus className="size-3.5 text-muted hover:text-surface" />
          </IconButton>
        }
      >
        <div className="px-3 py-1 text-[11px] text-muted">No shader attached to layer.</div>
      </PanelSection>
    )
  }

  const compileError =
    shaderConfig.preset === 'CUSTOM'
      ? globalShaderCompiler.getLastError(`CUSTOM:${shaderConfig.customCode ?? ''}`)
      : undefined

  return (
    <PanelSection
      label="Shader"
      actions={
        <div className="flex items-center gap-1">
          <IconButton
            label={shaderConfig.paused ? 'Play' : 'Pause'}
            size="sm"
            onClick={togglePause}
          >
            {shaderConfig.paused ? (
              <Play className="size-3.5 text-accent" />
            ) : (
              <Pause className="size-3.5 text-muted hover:text-surface" />
            )}
          </IconButton>
          {!isShaderNode && (
            <IconButton label="Remove shader" size="sm" onClick={removeShader}>
              <Trash2 className="size-3.5 text-muted hover:text-destructive" />
            </IconButton>
          )}
        </div>
      }
    >
      <div className="flex flex-col gap-3 px-3 py-2 text-xs">
        {/* Preset selection */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted">Preset</span>
            <button
              type="button"
              className="flex items-center gap-1 text-[10px] text-accent hover:underline"
              onClick={() => setShowCodeEditor(!showCodeEditor)}
            >
              <Code2 className="size-3" />
              {showCodeEditor ? 'Hide Code' : 'View SkSL'}
            </button>
          </div>
          <AppSelect
            label="Shader Preset"
            options={PRESET_OPTIONS}
            value={shaderConfig.preset}
            onValueChange={(val) => updateShader({ preset: val as ShaderPresetType })}
          />
        </div>

        {/* Speed & Scale */}
        <div className="grid grid-cols-2 gap-2">
          <NumberField
            label="Speed"
            value={shaderConfig.speed}
            min={0}
            max={5}
            step={0.1}
            onChange={(val) => updateShader({ speed: val })}
          />
          <NumberField
            label="Scale"
            value={shaderConfig.scale}
            min={0.1}
            max={10}
            step={0.1}
            onChange={(val) => updateShader({ scale: val })}
          />
        </div>

        {/* Intensity & Complexity */}
        <div className="grid grid-cols-2 gap-2">
          <NumberField
            label="Intensity"
            value={shaderConfig.intensity}
            min={0}
            max={3}
            step={0.1}
            onChange={(val) => updateShader({ intensity: val })}
          />
          <NumberField
            label="Complexity"
            value={shaderConfig.complexity}
            min={1}
            max={8}
            step={1}
            onChange={(val) => updateShader({ complexity: Math.round(val) })}
          />
        </div>

        {/* Color Palette */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-medium text-muted">Palette</span>
          <div className="flex items-center gap-2">
            {(shaderConfig.colors ?? DEFAULT_SHADER_CONFIG.colors).map((c, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <PaintSwatchPopover
                  color={c}
                  label={`Color ${i + 1}`}
                  onChange={(nextCol) => updateColor(i, nextCol)}
                />
                <span className="text-[9px] text-muted">{i + 1}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Pointer Interaction */}
        <div className="flex flex-col gap-2 rounded border border-border/50 bg-subtle/30 p-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-surface">Pointer Reactive</span>
            <AppSwitch
              value={shaderConfig.pointerInteraction}
              onValueChange={(checked: boolean) => updateShader({ pointerInteraction: checked })}
            />
          </div>
          {shaderConfig.pointerInteraction && (
            <div className="grid grid-cols-2 gap-2 pt-1">
              <NumberField
                label="Radius"
                value={shaderConfig.pointerRadius}
                min={10}
                max={500}
                step={10}
                suffix="px"
                onChange={(val) => updateShader({ pointerRadius: val })}
              />
              <NumberField
                label="Strength"
                value={shaderConfig.pointerStrength}
                min={-1}
                max={1}
                step={0.1}
                onChange={(val) => updateShader({ pointerStrength: val })}
              />
            </div>
          )}
        </div>

        {/* SkSL Code view / Custom editor */}
        {(showCodeEditor || shaderConfig.preset === 'CUSTOM') && (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-muted">SkSL Source</span>
              {compileError ? (
                <span className="text-[10px] text-destructive truncate max-w-[150px]">
                  {compileError}
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[10px] text-accent">
                  <Sparkles className="size-2.5" />
                  SkSL Active
                </span>
              )}
            </div>
            <textarea
              className="h-28 w-full resize-y rounded border border-border bg-subtle p-2 font-mono text-[10px] text-surface focus:border-accent focus:outline-none"
              placeholder="// Write SkSL main(float2 fragCoord)"
              value={shaderConfig.customCode ?? ''}
              onChange={(e) =>
                updateShader({
                  preset: 'CUSTOM',
                  customCode: e.target.value
                })
              }
            />
          </div>
        )}
      </div>
    </PanelSection>
  )
}
