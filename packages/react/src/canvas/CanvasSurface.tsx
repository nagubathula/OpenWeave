import type { HTMLAttributes } from 'react'
import React from 'react'

import { useCanvasContext } from './context'

export type CanvasSurfaceProps = HTMLAttributes<HTMLCanvasElement>

export function CanvasSurface(props: CanvasSurfaceProps) {
  const { canvasRef } = useCanvasContext()
  return <canvas ref={canvasRef} {...props} />
}

export default CanvasSurface
