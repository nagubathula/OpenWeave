import { atom } from 'nanostores'

import {
  listInstalledPlugins,
  removeInstalledPlugin,
  saveInstalledPlugin,
  type InstalledPlugin
} from '@/app/plugins/storage'

/** UI requested with `figma.showUI`, rendered by the plugin window. */
export interface PluginUIState {
  html: string
  width: number
  height: number
  visible: boolean
  title: string
  /** `networkAccess.allowedDomains` from the manifest, enforced with CSP. */
  allowedDomains?: string[]
}

export interface RunningPluginState {
  /** Changes on every run so the plugin window remounts its iframe. */
  runId: number
  pluginId: string
  name: string
  ui: PluginUIState | null
}

export const installedPlugins = atom<InstalledPlugin[]>([])
export const runningPlugin = atom<RunningPluginState | null>(null)
export const pluginsDialogOpen = atom(false)
/** Plugin id and menu command of the last run, for "Run last plugin". */
export const lastPluginRun = atom<{ pluginId: string; command: string } | null>(null)

export async function refreshInstalledPlugins(): Promise<void> {
  installedPlugins.set(await listInstalledPlugins())
}

export async function installPlugin(plugin: InstalledPlugin): Promise<void> {
  await saveInstalledPlugin(plugin)
  await refreshInstalledPlugins()
}

export async function uninstallPlugin(pluginId: string): Promise<void> {
  await removeInstalledPlugin(pluginId)
  if (lastPluginRun.get()?.pluginId === pluginId) lastPluginRun.set(null)
  await refreshInstalledPlugins()
}

export function openPluginsDialog(): void {
  void refreshInstalledPlugins()
  pluginsDialogOpen.set(true)
}
