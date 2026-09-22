import type { CanvasKit, RuntimeEffect, Shader } from 'canvaskit-wasm'

import { DEFAULT_SHADER_CONFIG, type ShaderConfig } from '@openweave/scene-graph'

import { SKSL_PRESETS, SKSL_UNIFORMS_HEADER } from './sksl-presets'

export const SHADER_UNIFORM_COUNT = 27

export function packShaderUniforms(
  config: ShaderConfig,
  width: number,
  height: number,
  time: number,
  pointerX: number,
  pointerY: number
): Float32Array {
  const uniforms = new Float32Array(SHADER_UNIFORM_COUNT)

  // 1. Resolution
  uniforms[0] = Math.max(1, width)
  uniforms[1] = Math.max(1, height)

  // 2. Time
  uniforms[2] = time

  // 3. Pointer
  uniforms[3] = pointerX
  uniforms[4] = pointerY

  // 4. Colors 1-4
  const c1 = config.colors[0] ?? DEFAULT_SHADER_CONFIG.colors[0]
  const c2 = config.colors[1] ?? config.colors[0] ?? DEFAULT_SHADER_CONFIG.colors[1]
  const c3 = config.colors[2] ?? config.colors[1] ?? DEFAULT_SHADER_CONFIG.colors[2]
  const c4 = config.colors[3] ?? config.colors[2] ?? DEFAULT_SHADER_CONFIG.colors[3]

  uniforms[5] = c1.r
  uniforms[6] = c1.g
  uniforms[7] = c1.b
  uniforms[8] = c1.a

  uniforms[9] = c2.r
  uniforms[10] = c2.g
  uniforms[11] = c2.b
  uniforms[12] = c2.a

  uniforms[13] = c3.r
  uniforms[14] = c3.g
  uniforms[15] = c3.b
  uniforms[16] = c3.a

  uniforms[17] = c4.r
  uniforms[18] = c4.g
  uniforms[19] = c4.b
  uniforms[20] = c4.a

  // 5. Parameter controls
  uniforms[21] = config.speed ?? 1.0
  uniforms[22] = config.scale ?? 1.0
  uniforms[23] = config.intensity ?? 1.0
  uniforms[24] = config.complexity ?? 4.0
  uniforms[25] = config.pointerInteraction ? (config.pointerStrength ?? 0.5) : 0.0
  uniforms[26] = config.pointerRadius ?? 150.0

  return uniforms
}

export class ShaderCompiler {
  private effectCache = new Map<string, RuntimeEffect | null>()
  private lastCompileErrors = new Map<string, string>()

  getEffect(ck: CanvasKit, config: ShaderConfig): RuntimeEffect | null {
    if (!ck?.RuntimeEffect) return null

    let code: string
    let cacheKey: string

    if (config.preset === 'CUSTOM') {
      const customCode = (config.customCode ?? '').trim()
      if (!customCode) {
        code = SKSL_PRESETS.ANIMATED_GRADIENT
        cacheKey = 'ANIMATED_GRADIENT'
      } else {
        code = customCode.includes('uniform float2 u_resolution;')
          ? customCode
          : `${SKSL_UNIFORMS_HEADER}\n${customCode}`
        cacheKey = `CUSTOM:${code}`
      }
    } else {
      code = SKSL_PRESETS[config.preset] ?? SKSL_PRESETS.ANIMATED_GRADIENT
      cacheKey = config.preset
    }

    if (this.effectCache.has(cacheKey)) {
      return this.effectCache.get(cacheKey) ?? null
    }

    let compileError = ''
    try {
      const effect = ck.RuntimeEffect.Make(code, (err: string) => {
        compileError = err
        this.lastCompileErrors.set(cacheKey, err)
        console.warn(`[ShaderCompiler] Compilation error for ${cacheKey}:`, err)
      })

      if (effect) {
        this.effectCache.set(cacheKey, effect)
        this.lastCompileErrors.delete(cacheKey)
        return effect
      }
    } catch (e) {
      compileError = e instanceof Error ? e.message : String(e)
      console.warn(`[ShaderCompiler] Exception compiling ${cacheKey}:`, compileError)
    }

    this.effectCache.set(cacheKey, null)
    if (compileError) this.lastCompileErrors.set(cacheKey, compileError)
    return null
  }

  createShader(
    ck: CanvasKit,
    config: ShaderConfig,
    width: number,
    height: number,
    time: number,
    pointerX: number,
    pointerY: number
  ): Shader | null {
    const effect = this.getEffect(ck, config)
    if (!effect) return null

    try {
      const uniforms = packShaderUniforms(config, width, height, time, pointerX, pointerY)
      return effect.makeShader(uniforms)
    } catch (e) {
      console.warn('[ShaderCompiler] Failed to makeShader:', e)
      return null
    }
  }

  getLastError(cacheKey: string): string | undefined {
    return this.lastCompileErrors.get(cacheKey)
  }

  dispose(): void {
    for (const effect of this.effectCache.values()) {
      effect?.delete()
    }
    this.effectCache.clear()
    this.lastCompileErrors.clear()
  }
}

export const globalShaderCompiler = new ShaderCompiler()
