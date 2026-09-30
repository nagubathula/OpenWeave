import { toast } from '@/app/shell/ui'
import { isTauri } from '@/app/tauri/env'

const STARTUP_UPDATE_CHECK_DELAY_MS = 2500

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
  if (!isTauri()) return
  if (updateCheckInFlight) return updateCheckInFlight

  const { silent = false, messages } = options
  updateCheckInFlight = runUpdateCheck(silent, messages).finally(() => {
    updateCheckInFlight = null
  })
  return updateCheckInFlight
}

export function scheduleStartupUpdateCheck(messages: () => UpdaterMessages) {
  if (startupCheckStarted || !isTauri()) return
  startupCheckStarted = true
  setTimeout(() => {
    void checkForAppUpdate({ silent: true, messages })
  }, STARTUP_UPDATE_CHECK_DELAY_MS)
}

async function runUpdateCheck(silent: boolean, messages: () => UpdaterMessages) {
  // In Electron desktop shell, update checks are managed by Electron main process
  if (!silent) {
    const msg = typeof messages === 'function' ? messages() : messages
    toast.info((msg as UpdaterMessages)?.appUpToDate ?? 'App is up to date')
  }
}
