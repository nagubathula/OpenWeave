import {
  resolveAutomationTarget,
  responseWithTarget,
  type AutomationTarget
} from '@/app/automation/bridge/target'
import { resolveBrowserFileURL } from '@/app/document/io/browser'
import { openFileFromPath } from '@/app/shell/menu/use'
import { createTab, getActiveStore, openFileInNewTab } from '@/app/tabs'
import { isDesktop, isTauri } from '@/app/tauri/env'

export async function handleSaveFile(target: AutomationTarget, args: unknown): Promise<unknown> {
  const store = target.store
  const path = (args as { path?: string }).path
  if (path) {
    store.setPlannedFilePath(path)
    await ensureTauriParentDirectory(path)
  }
  await store.saveFigFile()
  if (path) store.startWatchingCurrentFile()
  return { ok: true }
}

export async function ensureTauriParentDirectory(path: string): Promise<void> {
  if (!isDesktop() && !isTauri()) return
  if (typeof window !== 'undefined' && (window as any).electron?.fs) {
    const electron = (window as any).electron
    const lastSlash = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'))
    if (lastSlash <= 0) return
    const dir = path.slice(0, lastSlash)
    await electron.fs.mkdir(dir, { recursive: true }).catch(() => {})
  }
}

export async function handleNewDocument(
  _target: AutomationTarget,
  args: unknown
): Promise<unknown> {
  const path = (args as { path?: string }).path
  const tab = createTab()
  if (path) {
    tab.store.setPlannedFilePath(path)
    await ensureTauriParentDirectory(path)
    await tab.store.saveFigFile()
    tab.store.startWatchingCurrentFile()
  }
  const target = resolveAutomationTarget(tab.store, { document_id: tab.id })
  return responseWithTarget({ ok: true, result: { created: true } }, target)
}

export async function handleOpenFile(_target: AutomationTarget, args: unknown): Promise<unknown> {
  const path = (args as { path?: string }).path
  if (!path) throw new Error('Missing "path" in args')
  if (isDesktop() || isTauri()) {
    await openFileFromPath(path)
  } else {
    const resourceURL = resolveBrowserFileURL(path)
    const response = await fetch(resourceURL)
    if (!response.ok) throw new Error(`Failed to fetch file: ${response.statusText}`)
    const name = resourceURL.pathname.split('/').pop() ?? 'file.fig'
    const file = new File([await response.blob()], name)
    await openFileInNewTab(file, undefined, resourceURL.href)
  }
  const target = resolveAutomationTarget(getActiveStore(), undefined)
  return responseWithTarget({ ok: true, result: { opened: true } }, target)
}
