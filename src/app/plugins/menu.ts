import { runPlugin } from '@/app/plugins/host'
import {
  installedPlugins,
  lastPluginRun,
  openPluginsDialog,
  refreshInstalledPlugins
} from '@/app/plugins/store'

/** Re-runs the last plugin (and menu command); opens the manager when there is none. */
export async function runLastPlugin(): Promise<void> {
  const last = lastPluginRun.get()
  if (!last) {
    openPluginsDialog()
    return
  }
  await refreshInstalledPlugins()
  const plugin = installedPlugins.get().find((entry) => entry.id === last.pluginId)
  if (plugin) await runPlugin(plugin, last.command)
  else openPluginsDialog()
}

/** Plugins menu actions, shared by the in-app and native menus. */
export const PLUGIN_MENU_ACTIONS: Record<string, () => void> = {
  'plugins.manage': openPluginsDialog,
  'plugins.run-last': () => void runLastPlugin()
}
