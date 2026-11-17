import { getDesktopBridge, isDesktop } from '@/app/desktop/env'
import { toast } from '@/app/shell/ui'

const STARTUP_UPDATE_CHECK_DELAY_MS = 2500
const RESTART_DELAY_MS = 1500

interface UpdaterMessages {
  appUpToDate: string
  updateAvailableTitle: string
  updateAvailable: (params: { version: string }) => string
  updateInstallPrompt: string
  downloadingUpdate: (params: { version: string }) => string
  updateInstalledTitle: string
  updateInstalled: (params: { version: string; size: string }) => string
  updateUnavailable: string
  updateCheckFailed: (params: { error: string }) => string
}

interface UpdateCheckOptions {
  silent?: boolean
  /** Getter so long-lived checks always read the current locale's messages. */
  messages: () => UpdaterMessages
}

let startupCheckStarted = false
let updateCheckInFlight: Promise<void> | null = null

export async function checkForAppUpdate(options: UpdateCheckOptions) {
  if (!isDesktop()) return
  if (updateCheckInFlight) return updateCheckInFlight

  const { silent = false, messages } = options
  updateCheckInFlight = runUpdateCheck(silent, messages).finally(() => {
    updateCheckInFlight = null
  })
  return updateCheckInFlight
}

export function scheduleStartupUpdateCheck(messages: () => UpdaterMessages) {
  if (startupCheckStarted || !isDesktop()) return
  startupCheckStarted = true
  setTimeout(() => {
    void checkForAppUpdate({ silent: true, messages })
  }, STARTUP_UPDATE_CHECK_DELAY_MS)
}

async function runUpdateCheck(silent: boolean, messages: () => UpdaterMessages) {
  const desktop = getDesktopBridge()
  if (!desktop) return
  const t = messages()
  const result = await desktop.updater.check()

  if (result.status === 'unsupported' || result.status === 'up-to-date') {
    // Unpackaged (dev) builds have no update feed; report them as current.
    if (!silent) toast.info(t.appUpToDate)
    return
  }
  if (result.status === 'error') {
    if (!silent) {
      toast.warning(
        isMissingUpdateFeedError(result.message)
          ? t.updateUnavailable
          : t.updateCheckFailed({ error: result.message })
      )
    }
    return
  }

  const details = [
    t.updateAvailable({ version: result.version }),
    result.notes
      ? `

${result.notes}`
      : '',
    `

${t.updateInstallPrompt}`
  ].join('')
  // Native Electron confirm dialog, parented to the app window.
  if (
    !window.confirm(`${t.updateAvailableTitle}

${details}`)
  )
    return

  try {
    toast.info(t.downloadingUpdate({ version: result.version }))
    const download = await desktop.updater.download()
    const size = download.bytes > 0 ? ` (${formatBytes(download.bytes)})` : ''
    toast.info(t.updateInstalled({ version: download.version, size }))
    await new Promise((resolve) => {
      setTimeout(resolve, RESTART_DELAY_MS)
    })
    await desktop.updater.installAndRestart()
  } catch (error) {
    toast.warning(
      t.updateCheckFailed({ error: error instanceof Error ? error.message : String(error) })
    )
  }
}

/** electron-updater reports a 404 on `latest*.yml` when no release feed exists yet. */
function isMissingUpdateFeedError(message: string) {
  const lower = message.toLowerCase()
  return lower.includes('latest') && (lower.includes('404') || lower.includes('cannot find'))
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  const kib = bytes / 1024
  if (kib < 1024) return `${kib.toFixed(1)} KiB`
  return `${(kib / 1024).toFixed(1)} MiB`
}
