import React from 'react'

import type { DeviceSpec } from '@openweave/core/editor'
import type { DeviceRotation } from '@openweave/scene-graph'

export interface DeviceFrameProps {
  spec: DeviceSpec
  rotation?: DeviceRotation
  color?: 'DARK' | 'LIGHT' | 'TITANIUM'
  scale: number
  children: React.ReactNode
}

function getChassisStyle(color: 'DARK' | 'LIGHT' | 'TITANIUM' = 'DARK') {
  if (color === 'LIGHT') {
    return {
      bg: 'bg-[#d8d8dc]',
      borderColor: 'border-[#b8b8bc]',
      shadow: 'shadow-[0_25px_60px_-15px_rgba(0,0,0,0.45),inset_0_0_0_1px_rgba(255,255,255,0.7)]'
    }
  }
  if (color === 'TITANIUM') {
    return {
      bg: 'bg-[#2b2a28]',
      borderColor: 'border-[#4a4742]',
      shadow: 'shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85),inset_0_0_0_1px_rgba(255,235,210,0.12)]'
    }
  }
  return {
    bg: 'bg-[#151517]',
    borderColor: 'border-[#2d2d30]',
    shadow: 'shadow-[0_25px_60px_-15px_rgba(0,0,0,0.92),inset_0_0_0_1px_rgba(255,255,255,0.08)]'
  }
}

function CutoutOverlay({ cutout, scale }: { cutout: DeviceSpec['cutout']; scale: number }) {
  if (cutout.type === 'none') return null

  if (cutout.type === 'dynamic-island') {
    const w = (cutout.width ?? 120) * scale
    const h = (cutout.height ?? 35) * scale
    const top = (cutout.top ?? 11) * scale
    const radius = (cutout.radius ?? 18) * scale

    return (
      <div
        data-test-id="device-dynamic-island"
        className="pointer-events-none absolute left-1/2 -translate-x-1/2 bg-black flex items-center justify-between px-3 z-30"
        style={{
          width: w,
          height: h,
          top,
          borderRadius: radius
        }}
      >
        <div
          className="rounded-full bg-[#080d18] border border-white/10"
          style={{ width: 10 * scale, height: 10 * scale }}
        />
        <div
          className="rounded-full bg-[#050810]"
          style={{ width: 8 * scale, height: 8 * scale }}
        />
      </div>
    )
  }

  if (cutout.type === 'punch-hole') {
    const size = (cutout.width ?? 14) * scale
    const top = (cutout.top ?? 12) * scale

    return (
      <div
        data-test-id="device-punch-hole"
        className="pointer-events-none absolute left-1/2 -translate-x-1/2 bg-black rounded-full flex items-center justify-center z-30"
        style={{
          width: size,
          height: size,
          top
        }}
      >
        <div
          className="rounded-full bg-[#0a1220] border border-white/10"
          style={{ width: size * 0.6, height: size * 0.6 }}
        />
      </div>
    )
  }

  if (cutout.type === 'notch') {
    const w = (cutout.width ?? 160) * scale
    const h = (cutout.height ?? 26) * scale
    const radius = (cutout.radius ?? 8) * scale

    return (
      <div
        data-test-id="device-notch"
        className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-0 bg-black flex items-center justify-center gap-2 z-30"
        style={{
          width: w,
          height: h,
          borderBottomLeftRadius: radius,
          borderBottomRightRadius: radius
        }}
      >
        <div
          className="rounded-full bg-[#0c1424] border border-white/10"
          style={{ width: 7 * scale, height: 7 * scale }}
        />
      </div>
    )
  }

  return null
}

function HomeIndicator({ scale }: { scale: number }) {
  return (
    <div
      data-test-id="device-home-indicator"
      className="pointer-events-none absolute left-1/2 -translate-x-1/2 rounded-full bg-white/45 backdrop-blur-xs z-30"
      style={{
        width: 134 * scale,
        height: 5 * scale,
        bottom: 8 * scale
      }}
    />
  )
}

function SideButtons({ platform, scale }: { platform: DeviceSpec['platform']; scale: number }) {
  if (platform !== 'ios' && platform !== 'android') return null

  return (
    <>
      {/* Left side: Action + Volume buttons */}
      <div
        className="pointer-events-none absolute -left-[3px] top-[14%] w-[3px] rounded-l-xs bg-white/20"
        style={{ height: 26 * scale }}
      />
      <div
        className="pointer-events-none absolute -left-[3px] top-[22%] w-[3px] rounded-l-xs bg-white/20"
        style={{ height: 48 * scale }}
      />
      <div
        className="pointer-events-none absolute -left-[3px] top-[30%] w-[3px] rounded-l-xs bg-white/20"
        style={{ height: 48 * scale }}
      />
      {/* Right side: Power button */}
      <div
        className="pointer-events-none absolute -right-[3px] top-[24%] w-[3px] rounded-r-xs bg-white/20"
        style={{ height: 72 * scale }}
      />
    </>
  )
}

function LaptopLip({ scale }: { scale: number }) {
  return (
    <div
      data-test-id="device-laptop-lip"
      className="pointer-events-none absolute -bottom-[16px] left-0 right-0 flex items-start justify-center"
      style={{ height: 16 * scale }}
    >
      <div
        className="w-[18%] rounded-b-md bg-[#232326] border-b border-white/10"
        style={{ height: 5 * scale }}
      />
    </div>
  )
}

export default function DeviceFrame({ spec, color = 'DARK', scale, children }: DeviceFrameProps) {
  if (spec.id === 'none') {
    return <>{children}</>
  }

  const chassis = getChassisStyle(color)
  const b = spec.bezel

  return (
    <div
      data-test-id={`device-frame-${spec.id}`}
      className={`relative select-none border ${chassis.bg} ${chassis.borderColor} ${chassis.shadow}`}
      style={{
        paddingTop: b.top * scale,
        paddingBottom: b.bottom * scale,
        paddingLeft: b.left * scale,
        paddingRight: b.right * scale,
        borderRadius: spec.outerRadius * scale
      }}
    >
      <SideButtons platform={spec.platform} scale={scale} />
      {spec.platform === 'macos' && <LaptopLip scale={scale} />}

      <div
        className="relative overflow-hidden bg-black"
        style={{
          borderRadius: spec.screenRadius * scale
        }}
      >
        {children}
        <CutoutOverlay cutout={spec.cutout} scale={scale} />
        {spec.hasHomeIndicator && <HomeIndicator scale={scale} />}
      </div>
    </div>
  )
}
