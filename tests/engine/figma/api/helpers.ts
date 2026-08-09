import { FigmaAPI, SceneGraph } from '@openweave/core'
export function createAPI(): FigmaAPI {
  return new FigmaAPI(new SceneGraph())
}
