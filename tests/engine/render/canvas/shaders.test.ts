import { describe, expect, test, mock } from 'bun:test'

import {
  DEFAULT_SHADER_CONFIG,
  packShaderUniforms,
  SHADER_UNIFORM_COUNT,
  SKSL_PRESETS,
  ShaderCompiler
} from '@openweave/core'
import type { ShaderConfig } from '@openweave/scene-graph'

describe('CanvasKit SkSL Shaders', () => {
  test('packs standard 27-float uniform buffer correctly', () => {
    const config: ShaderConfig = {
      preset: 'ANIMATED_GRADIENT',
      speed: 2.5,
      scale: 1.8,
      intensity: 1.2,
      complexity: 5,
      colors: [
        { r: 0.1, g: 0.2, b: 0.3, a: 1.0 },
        { r: 0.4, g: 0.5, b: 0.6, a: 0.9 },
        { r: 0.7, g: 0.8, b: 0.9, a: 0.8 },
        { r: 0.0, g: 0.1, b: 0.2, a: 0.5 }
      ],
      pointerInteraction: true,
      pointerRadius: 200,
      pointerStrength: 0.8,
      paused: false
    }

    const uniforms = packShaderUniforms(config, 800, 600, 10.5, 400, 300)

    expect(uniforms.length).toBe(SHADER_UNIFORM_COUNT)
    expect(uniforms[0]).toBe(800) // width
    expect(uniforms[1]).toBe(600) // height
    expect(uniforms[2]).toBe(10.5) // time
    expect(uniforms[3]).toBe(400) // pointerX
    expect(uniforms[4]).toBe(300) // pointerY

    // Color 1
    expect(uniforms[5]).toBeCloseTo(0.1)
    expect(uniforms[6]).toBeCloseTo(0.2)
    expect(uniforms[7]).toBeCloseTo(0.3)
    expect(uniforms[8]).toBeCloseTo(1.0)

    // Color 2
    expect(uniforms[9]).toBeCloseTo(0.4)
    expect(uniforms[10]).toBeCloseTo(0.5)
    expect(uniforms[11]).toBeCloseTo(0.6)
    expect(uniforms[12]).toBeCloseTo(0.9)

    // Controls
    expect(uniforms[21]).toBeCloseTo(2.5) // speed
    expect(uniforms[22]).toBeCloseTo(1.8) // scale
    expect(uniforms[23]).toBeCloseTo(1.2) // intensity
    expect(uniforms[24]).toBeCloseTo(5) // complexity
    expect(uniforms[25]).toBeCloseTo(0.8) // pointerStrength
    expect(uniforms[26]).toBeCloseTo(200) // pointerRadius
  })

  test('disables pointer strength when pointerInteraction is false', () => {
    const config: ShaderConfig = {
      ...DEFAULT_SHADER_CONFIG,
      pointerInteraction: false,
      pointerStrength: 0.9
    }
    const uniforms = packShaderUniforms(config, 100, 100, 0, 50, 50)
    expect(uniforms[25]).toBe(0.0)
  })

  test('all 6 built-in presets define SkSL programs with main function', () => {
    const presets = [
      'ANIMATED_GRADIENT',
      'NOISE_FIELD',
      'PARTICLES',
      'METABALLS',
      'LIGHTING',
      'DISPLACEMENT'
    ] as const

    for (const key of presets) {
      const code = SKSL_PRESETS[key]
      expect(code).toBeDefined()
      expect(code).toContain('half4 main(float2 fragCoord)')
      expect(code).toContain('uniform float2 u_resolution;')
      expect(code).toContain('uniform float u_time;')
      expect(code).toContain('uniform float2 u_pointer;')
    }
  })

  test('ShaderCompiler compiles and caches RuntimeEffect instances', () => {
    const compiler = new ShaderCompiler()

    const mockEffect = {
      makeShader: mock(() => ({ delete: mock(() => undefined) })),
      delete: mock(() => undefined)
    }

    const mockCk = {
      RuntimeEffect: {
        Make: mock((code: string) => mockEffect)
      }
    }

    const effect1 = compiler.getEffect(mockCk as any, {
      ...DEFAULT_SHADER_CONFIG,
      preset: 'ANIMATED_GRADIENT'
    })
    expect(effect1).toBe(mockEffect as any)
    expect(mockCk.RuntimeEffect.Make).toHaveBeenCalledTimes(1)

    // Calling again returns cached effect without recompiling
    const effect2 = compiler.getEffect(mockCk as any, {
      ...DEFAULT_SHADER_CONFIG,
      preset: 'ANIMATED_GRADIENT'
    })
    expect(effect2).toBe(mockEffect as any)
    expect(mockCk.RuntimeEffect.Make).toHaveBeenCalledTimes(1)

    // Dispose cleans up effects
    compiler.dispose()
    expect(mockEffect.delete).toHaveBeenCalledTimes(1)
  })

  test('ShaderCompiler gracefully handles compilation errors', () => {
    const compiler = new ShaderCompiler()
    const mockCk = {
      RuntimeEffect: {
        Make: mock((code: string, callback?: (err: string) => void) => {
          callback?.('syntax error at line 4')
          return null
        })
      }
    }

    const effect = compiler.getEffect(mockCk as any, {
      preset: 'CUSTOM',
      customCode: 'broken code',
      speed: 1,
      scale: 1,
      intensity: 1,
      complexity: 1,
      colors: [],
      pointerInteraction: false,
      pointerRadius: 100,
      pointerStrength: 0
    })

    expect(effect).toBeNull()
    expect(
      compiler.getLastError(
        'CUSTOM:\nuniform float2 u_resolution;\nuniform float u_time;\nuniform float2 u_pointer;\nuniform float4 u_color1;\nuniform float4 u_color2;\nuniform float4 u_color3;\nuniform float4 u_color4;\nuniform float u_speed;\nuniform float u_scale;\nuniform float u_intensity;\nuniform float u_complexity;\nuniform float u_pointer_strength;\nuniform float u_pointer_radius;\n\nbroken code'
      )
    ).toContain('syntax error')
  })
})
