import type { ShaderPresetType } from '@openweave/scene-graph'

export const SKSL_UNIFORMS_HEADER = `
uniform float2 u_resolution;
uniform float u_time;
uniform float2 u_pointer;
uniform float4 u_color1;
uniform float4 u_color2;
uniform float4 u_color3;
uniform float4 u_color4;
uniform float u_speed;
uniform float u_scale;
uniform float u_intensity;
uniform float u_complexity;
uniform float u_pointer_strength;
uniform float u_pointer_radius;
`

export const SKSL_PRESETS: Record<Exclude<ShaderPresetType, 'CUSTOM'>, string> = {
  ANIMATED_GRADIENT: `${SKSL_UNIFORMS_HEADER}
half4 main(float2 fragCoord) {
    float2 uv = fragCoord / u_resolution;
    float t = u_time * u_speed * 0.4;

    // Pointer interaction
    float2 pDiff = fragCoord - u_pointer;
    float pDist = length(pDiff);
    float pInfluence = smoothstep(u_pointer_radius, 0.0, pDist) * u_pointer_strength;
    uv += (pDiff / (pDist + 0.001)) * pInfluence * 0.12;

    // Domain warping with trigonometric harmonics
    float2 q = float2(
        sin(uv.x * u_scale * 3.0 + t) + cos(uv.y * u_scale * 2.0 - t * 0.7),
        cos(uv.x * u_scale * 2.5 - t * 0.8) + sin(uv.y * u_scale * 3.2 + t)
    );

    float2 r = float2(
        sin(q.x * 2.0 + uv.x * u_scale + t * 0.5),
        cos(q.y * 2.0 + uv.y * u_scale + t * 0.5)
    );

    float f = 0.5 + 0.5 * sin((r.x + r.y + uv.x + uv.y) * 1.5);
    float g = 0.5 + 0.5 * cos((q.x - q.y + r.x) * 1.8);

    half4 colA = mix(u_color1, u_color2, half(clamp(f, 0.0, 1.0)));
    half4 colB = mix(u_color3, u_color4, half(clamp(g, 0.0, 1.0)));
    half4 col = mix(colA, colB, half(clamp(0.5 * (f + g), 0.0, 1.0)));

    col.rgb *= half(u_intensity);
    return half4(col.rgb * col.a, col.a);
}
`,

  NOISE_FIELD: `${SKSL_UNIFORMS_HEADER}
float hash(float2 p) {
    p = fract(p * float2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

float noise(float2 p) {
    float2 i = floor(p);
    float2 f = fract(p);
    float2 u = f * f * (3.0 - 2.0 * f);
    return mix(
        mix(hash(i + float2(0.0, 0.0)), hash(i + float2(1.0, 0.0)), u.x),
        mix(hash(i + float2(0.0, 1.0)), hash(i + float2(1.0, 1.0)), u.x),
        u.y
    );
}

float fbm(float2 p, float octaves) {
    float v = 0.0;
    float a = 0.5;
    float2 shift = float2(100.0, 100.0);
    for (int i = 0; i < 8; i++) {
        if (float(i) >= octaves) break;
        v += a * noise(p);
        p = p * 2.0 + shift;
        a *= 0.5;
    }
    return v;
}

half4 main(float2 fragCoord) {
    float2 uv = fragCoord / u_resolution;
    float t = u_time * u_speed * 0.3;

    // Pointer warp
    float2 pDiff = fragCoord - u_pointer;
    float pDist = length(pDiff);
    float pFactor = smoothstep(u_pointer_radius, 0.0, pDist) * u_pointer_strength;
    uv += (pDiff / (pDist + 0.001)) * pFactor * 0.15;

    float2 p = uv * u_scale * 4.0;
    float q = fbm(p + float2(t, -t), u_complexity);
    float r = fbm(p + float2(q + t * 0.5, q - t * 0.3), u_complexity);

    half4 col1 = mix(u_color1, u_color2, half(clamp(q, 0.0, 1.0)));
    half4 col2 = mix(u_color3, u_color4, half(clamp(r, 0.0, 1.0)));
    half4 col = mix(col1, col2, half(clamp(r * 1.2 - q * 0.2, 0.0, 1.0)));

    col.rgb *= half(u_intensity);
    return half4(col.rgb * col.a, col.a);
}
`,

  PARTICLES: `${SKSL_UNIFORMS_HEADER}
float hash1(float n) { return fract(sin(n) * 43758.5453123); }

half4 main(float2 fragCoord) {
    float2 uv = fragCoord / u_resolution;
    float t = u_time * u_speed * 0.5;

    half4 bg = mix(u_color4, u_color1, half(0.3 * (uv.y + sin(uv.x * 3.0 + t * 0.2))));
    half3 particleColor = half3(0.0);

    int count = int(clamp(u_complexity * 4.0, 4.0, 32.0));
    for (int i = 0; i < 32; i++) {
        if (i >= count) break;
        float fi = float(i);
        float seed = fi * 17.13;

        float2 pos = float2(
            fract(hash1(seed) + t * (0.05 + 0.03 * hash1(seed + 1.0))),
            fract(hash1(seed + 2.0) + t * (0.04 + 0.02 * hash1(seed + 3.0)))
        ) * u_resolution;

        float2 pDiff = pos - u_pointer;
        float pDist = length(pDiff);
        if (pDist < u_pointer_radius && pDist > 0.001) {
            pos += (pDiff / pDist) * (1.0 - pDist / u_pointer_radius) * u_pointer_strength * 60.0;
        }

        float d = length(fragCoord - pos);
        float radius = (4.0 + 3.0 * hash1(seed + 4.0)) * u_scale;
        float glow = (radius / max(d, 1.0)) * 0.25;
        glow += smoothstep(radius, 0.0, d) * 1.5;

        half4 pCol = mix(u_color2, u_color3, half(fract(fi * 0.3)));
        particleColor += pCol.rgb * half(glow);
    }

    half3 finalRgb = bg.rgb + particleColor * half(u_intensity);
    return half4(finalRgb * bg.a, bg.a);
}
`,

  METABALLS: `${SKSL_UNIFORMS_HEADER}
half4 main(float2 fragCoord) {
    float2 uv = fragCoord / u_resolution;
    float t = u_time * u_speed * 0.8;

    float energy = 0.0;
    half3 ballCol = half3(0.0);
    int count = int(clamp(u_complexity, 3.0, 12.0));

    for (int i = 0; i < 12; i++) {
        if (i >= count) break;
        float fi = float(i);
        float phase = fi * 1.57;

        float2 center = float2(
            0.5 + 0.35 * sin(t * (0.6 + fi * 0.15) + phase),
            0.5 + 0.35 * cos(t * (0.5 + fi * 0.18) + phase * 1.3)
        ) * u_resolution;

        float2 pDiff = center - u_pointer;
        float pDist = length(pDiff);
        if (pDist < u_pointer_radius && pDist > 0.001) {
            center -= (pDiff / pDist) * (1.0 - pDist / u_pointer_radius) * u_pointer_strength * 80.0;
        }

        float d = length(fragCoord - center);
        float r = (35.0 + 20.0 * sin(fi * 2.0)) * u_scale;
        float contrib = (r * r) / max(d * d, 1.0);
        energy += contrib;

        half4 c = mix(u_color2, u_color3, half(fract(fi * 0.4)));
        ballCol += c.rgb * half(contrib);
    }

    float threshold = 1.0;
    float edge = smoothstep(threshold - 0.15, threshold + 0.15, energy);

    half4 bg = mix(u_color1, u_color4, half(uv.y));
    half3 rgb = mix(bg.rgb, (ballCol / max(energy, 0.01)) * half(u_intensity), half(edge));
    return half4(rgb * bg.a, bg.a);
}
`,

  LIGHTING: `${SKSL_UNIFORMS_HEADER}
half4 main(float2 fragCoord) {
    float2 uv = fragCoord / u_resolution;
    float t = u_time * u_speed * 0.5;

    float2 p = uv * u_scale * 5.0;
    float h = sin(p.x + t) * cos(p.y + t) + 0.5 * sin(p.x * 2.0 - t * 0.7);
    float hx = cos(p.x + t) * cos(p.y + t) + cos(p.x * 2.0 - t * 0.7);
    float hy = -sin(p.x + t) * sin(p.y + t);
    float3 normal = normalize(float3(-hx * 0.3, -hy * 0.3, 1.0));

    float3 lightPos = float3(u_pointer.x / max(u_resolution.x, 1.0), u_pointer.y / max(u_resolution.y, 1.0), 0.4);
    float3 fragPos3 = float3(uv, 0.0);
    float3 lightDir = normalize(lightPos - fragPos3);
    float lightDist = length(lightPos.xy - uv);

    float diff = max(dot(normal, lightDir), 0.0);
    float3 viewDir = float3(0.0, 0.0, 1.0);
    float3 halfDir = normalize(lightDir + viewDir);
    float spec = pow(max(dot(normal, halfDir), 0.0), 16.0 * max(u_complexity, 1.0));

    float atten = 1.0 / (1.0 + lightDist * 4.0);

    half4 baseCol = mix(u_color1, u_color2, half(uv.y));
    half4 lightCol = mix(u_color3, u_color4, half(diff));

    half3 finalColor = baseCol.rgb * 0.4 + lightCol.rgb * half(diff * atten * 1.5 * u_intensity);
    finalColor += half3(1.0) * half(spec * atten * u_intensity * 0.8);

    return half4(finalColor * baseCol.a, baseCol.a);
}
`,

  DISPLACEMENT: `${SKSL_UNIFORMS_HEADER}
half4 main(float2 fragCoord) {
    float2 uv = fragCoord / u_resolution;
    float t = u_time * u_speed * 1.2;

    float2 pDiff = (fragCoord - u_pointer) / max(u_resolution, float2(1.0, 1.0));
    float pDist = length(pDiff);
    float ripple = sin(pDist * 40.0 * u_scale - t * 2.0) * exp(-pDist * 5.0) * u_pointer_strength * 0.05;

    float waveX = sin(uv.y * 10.0 * u_scale + t) * 0.02 * u_complexity;
    float waveY = cos(uv.x * 10.0 * u_scale - t * 0.8) * 0.02 * u_complexity;

    float2 displacedUv = uv + float2(waveX, waveY) + (pDiff / (pDist + 0.001)) * ripple;

    half4 col1 = mix(u_color1, u_color2, half(clamp(displacedUv.x, 0.0, 1.0)));
    half4 col2 = mix(u_color3, u_color4, half(clamp(displacedUv.y, 0.0, 1.0)));
    half4 result = mix(col1, col2, half(sin(displacedUv.x * 3.14 + displacedUv.y * 3.14) * 0.5 + 0.5));

    float highlight = pow(clamp(ripple * 20.0 + (waveX + waveY) * 15.0 + 0.5, 0.0, 1.0), 3.0);
    result.rgb += half3(highlight * 0.4 * u_intensity);

    return half4(result.rgb * result.a, result.a);
}
`
}
