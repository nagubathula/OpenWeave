export function installTauriMockWindow() {
  const existingWindow = 'window' in globalThis ? (globalThis as any).window : {}
  const windowLike = {
    ...existingWindow,
    __TAURI_INTERNALS__: {
      invoke: async () => null
    }
  }
  Object.assign(globalThis, { window: windowLike })
}

export async function mockTauriIPC(
  handler: (cmd: string, args: unknown, options?: unknown) => unknown
) {
  installTauriMockWindow()
  const windowLike = window as typeof window & {
    __TAURI_INTERNALS__: {
      invoke: (cmd: string, args: unknown, options?: unknown) => Promise<unknown>
    }
  }
  windowLike.__TAURI_INTERNALS__.invoke = async (cmd, args, options) => handler(cmd, args, options)
}

export async function clearTauriMocks() {
  if (!('window' in globalThis)) return
  delete (globalThis as typeof globalThis & { window?: unknown }).window
}
