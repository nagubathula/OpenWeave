export {}

declare global {
  interface GestureEvent extends UIEvent {
    scale: number
    rotation: number
    clientX: number
    clientY: number
  }

  interface FilePickerAcceptType {
    description: string
    accept: Record<string, string[]>
  }

  interface FilePickerOptions {
    types?: FilePickerAcceptType[]
    suggestedName?: string
  }

  interface Window {
    showOpenFilePicker?(options?: FilePickerOptions): Promise<FileSystemFileHandle[]>
    showSaveFilePicker?(options?: FilePickerOptions): Promise<FileSystemFileHandle>
    queryLocalFonts?(): Promise<
      {
        family: string
        fullName: string
        style: string
        postscriptName: string
        blob(): Promise<Blob>
      }[]
    >
    mockWindowOpen?(url: string): void
    electron?: {
      fs?: {
        readFile: (filePath: string) => Promise<Uint8Array>
        writeFile: (filePath: string, data: Uint8Array) => Promise<boolean>
        exists: (filePath: string) => Promise<boolean>
        remove: (targetPath: string, options?: { recursive?: boolean }) => Promise<boolean>
        trashItem?: (targetPath: string) => Promise<boolean>
        mkdir?: (dirPath: string, options?: { recursive?: boolean }) => Promise<boolean>
      }
      shell?: {
        openExternal: (url: string) => Promise<void>
        trashItem?: (filePath: string) => Promise<boolean>
      }
      tunnel?: {
        start: () => Promise<{ url: string }>
        stop: () => Promise<void>
        status: () => Promise<string | null>
      }
    }
    __TAURI_INTERNALS__?: {
      invoke: <T = unknown>(cmd: string, args?: Record<string, unknown>) => Promise<T>
    }
  }
}
