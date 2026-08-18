export type CanvasRefLike = { current?: HTMLCanvasElement | null; value?: HTMLCanvasElement | null }
export function getCanvas(ref: CanvasRefLike): HTMLCanvasElement | null { return ref.current ?? ref.value ?? null }
