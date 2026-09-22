import { parseFigBuffer } from '@openweave/fig'
import type { SceneGraph } from '@openweave/scene-graph'

import { IS_BROWSER } from '#core/constants'
import { importNodeChanges } from '#core/kiwi/fig/import'
import { deserializeSceneGraph } from '#core/kiwi/fig/parse/transfer'
import type { SerializedSceneGraph } from '#core/kiwi/fig/parse/transfer'

export interface ParseFigFileOptions {
  populate?: 'all' | 'first-page' | 'none'
}

function parseFigFileSync(buffer: ArrayBuffer, options: ParseFigFileOptions = {}): SceneGraph {
  const {
    nodeChanges,
    blobs,
    images: imageEntries,
    figKiwiVersion,
    figSchemaDeflated
  } = parseFigBuffer(buffer)
  const graph = importNodeChanges(nodeChanges, blobs, new Map(imageEntries), options)
  graph.figKiwiVersion = figKiwiVersion
  graph.figSchemaDeflated = figSchemaDeflated
  return graph
}

interface WorkerParseResult {
  graph?: SerializedSceneGraph
  error?: string
}

function parseViaWorker(buffer: ArrayBuffer, options: ParseFigFileOptions): Promise<SceneGraph> {
  return new Promise((resolve, reject) => {
    let settled = false
    let timeoutId: ReturnType<typeof setTimeout> | undefined

    const cleanup = () => {
      if (timeoutId) clearTimeout(timeoutId)
    }

    try {
      const worker = new Worker(new URL('../../../kiwi/fig/parse/worker.ts', import.meta.url), {
        type: 'module'
      })

      timeoutId = setTimeout(() => {
        if (settled) return
        settled = true
        worker.terminate()
        reject(new Error('Worker parsing timed out after 5000ms'))
      }, 5000)

      worker.onmessage = (e: MessageEvent<WorkerParseResult>) => {
        if (settled) return
        settled = true
        cleanup()
        worker.terminate()
        if (e.data.error || !e.data.graph) {
          reject(new Error(e.data.error ?? 'Worker failed to parse .fig file'))
          return
        }
        resolve(deserializeSceneGraph(e.data.graph))
      }

      worker.onerror = (err) => {
        if (settled) return
        settled = true
        cleanup()
        worker.terminate()
        reject(new Error(err.message || 'Worker failed to parse .fig file'))
      }

      worker.postMessage({ buffer, options }, [buffer])
    } catch (err) {
      if (settled) return
      settled = true
      cleanup()
      reject(err instanceof Error ? err : new Error(String(err)))
    }
  })
}

export async function parseFigFile(
  buffer: ArrayBuffer,
  options: ParseFigFileOptions = {}
): Promise<SceneGraph> {
  if (typeof Worker !== 'undefined' && IS_BROWSER) {
    const copy = buffer.slice(0)
    try {
      return await parseViaWorker(buffer, options)
    } catch (error) {
      console.warn('Worker parsing failed, falling back to main thread:', error)
      return parseFigFileSync(copy, options)
    }
  }
  return parseFigFileSync(buffer, options)
}

export async function readFigFile(
  file: File,
  options: ParseFigFileOptions = {}
): Promise<SceneGraph> {
  return parseFigFile(await file.arrayBuffer(), options)
}
