import { app } from 'electron'
import electronUpdater from 'electron-updater'

import type { DesktopUpdateCheck, DesktopUpdateDownload } from '../src/app/desktop/types'

/**
 * Auto-update via electron-updater against the GitHub Releases feed that
 * electron-builder publishes (`latest.yml` / `latest-mac.yml` /
 * `latest-linux.yml`). The renderer drives the prompts; nothing downloads
 * until the user agrees.
 */

const { autoUpdater } = electronUpdater

autoUpdater.autoDownload = false
autoUpdater.autoInstallOnAppQuit = true
autoUpdater.logger = null

let pendingVersion: string | null = null

function releaseNotes(notes: unknown): string | null {
  if (typeof notes === 'string') return notes
  if (Array.isArray(notes)) {
    return notes
      .map((entry: { note?: string | null }) => entry.note ?? '')
      .filter(Boolean)
      .join('\n\n')
  }
  return null
}

export async function checkForUpdate(): Promise<DesktopUpdateCheck> {
  if (!app.isPackaged) return { status: 'unsupported' }
  try {
    const result = await autoUpdater.checkForUpdates()
    if (!result?.isUpdateAvailable) return { status: 'up-to-date' }
    pendingVersion = result.updateInfo.version
    return {
      status: 'available',
      version: result.updateInfo.version,
      notes: releaseNotes(result.updateInfo.releaseNotes)
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    // Unpacked (`--dir`) and portable builds ship without an update feed config.
    if (message.includes('app-update.yml')) return { status: 'unsupported' }
    return { status: 'error', message }
  }
}

export async function downloadUpdate(): Promise<DesktopUpdateDownload> {
  if (!pendingVersion) throw new Error('No update is available to download')
  let bytes = 0
  const onProgress = (progress: { total: number }) => {
    bytes = progress.total
  }
  autoUpdater.on('download-progress', onProgress)
  try {
    await autoUpdater.downloadUpdate()
  } finally {
    autoUpdater.off('download-progress', onProgress)
  }
  return { version: pendingVersion, bytes }
}

export function installUpdateAndRestart() {
  autoUpdater.quitAndInstall()
}
