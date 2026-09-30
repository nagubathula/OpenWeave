import { decodeTauriStderr } from '@/app/shell/ui'
import { resolvePlatformCommand } from '@/app/tauri/command'

export type DesktopChild = {
  write(data: number[]): Promise<void>
  kill(): Promise<void>
}

export type TauriChild = DesktopChild

type AcpProcessOptions = {
  command: string
  args: string[]
  logId: string
  destroying: () => boolean
  onUnexpectedClose: () => void
}

export async function spawnAcpProcess({
  command: commandName,
  args,
  logId,
  destroying,
  onUnexpectedClose
}: AcpProcessOptions) {
  const electron = typeof window !== 'undefined' ? (window as any).electron : null
  if (!electron?.process?.spawn) {
    throw new Error('Process spawning is only supported in desktop environment.')
  }

  const resolved = resolvePlatformCommand(commandName, args)

  const stdoutChunks: Uint8Array[] = []
  let stdoutResolver: ((chunk: Uint8Array | null) => void) | null = null
  let stdoutClosed = false
  let stdoutClosedError: Error | null = null

  const child = await electron.process.spawn({
    command: resolved.command,
    args: resolved.args,
    onStdout: (chunk: Uint8Array) => {
      if (stdoutResolver) {
        const resolve = stdoutResolver
        stdoutResolver = null
        resolve(chunk)
      } else {
        stdoutChunks.push(chunk)
      }
    },
    onStderr: (raw: string) => {
      console.error(`[ACP ${logId}]`, decodeTauriStderr(raw))
    },
    onClose: () => {
      stdoutClosed = true
      stdoutClosedError = destroying() ? null : new Error('Agent process exited unexpectedly.')
      if (stdoutResolver) {
        const resolve = stdoutResolver
        stdoutResolver = null
        resolve(null)
      }
      if (!destroying()) {
        onUnexpectedClose()
      }
    }
  })

  const output = new ReadableStream<Uint8Array>({
    async pull(controller) {
      const buffered = stdoutChunks.shift()
      if (buffered) {
        controller.enqueue(buffered)
        return
      }
      if (stdoutClosed) {
        if (stdoutClosedError) controller.error(stdoutClosedError)
        else controller.close()
        return
      }
      const chunk = await new Promise<Uint8Array | null>((resolve) => {
        stdoutResolver = resolve
      })
      if (chunk) {
        controller.enqueue(chunk)
        return
      }
      if (stdoutClosedError) controller.error(stdoutClosedError)
      else controller.close()
    }
  })

  const input = new WritableStream<Uint8Array>({
    async write(chunk) {
      await child.write(Array.from(chunk))
    }
  })

  return { child, input, output }
}
