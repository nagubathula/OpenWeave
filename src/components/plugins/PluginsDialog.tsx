import { useStore } from '@nanostores/react'
import { FolderOpen, Play, Puzzle, Trash2 } from 'lucide-react'
import React, { useState } from 'react'

import { useI18n } from '@openweave/react'

import { runPlugin } from '@/app/plugins/host'
import { pickPluginFolder, readPluginFolder } from '@/app/plugins/install'
import type { PluginMenuItem } from '@/app/plugins/manifest'
import type { InstalledPlugin } from '@/app/plugins/storage'
import {
  installedPlugins,
  installPlugin,
  pluginsDialogOpen,
  uninstallPlugin
} from '@/app/plugins/store'
import { toast } from '@/app/shell/ui'
import { AppDialogFooter, AppDialogHeader, AppDialogRoot } from '@/components/ui/dialog'

interface PluginCommand {
  label: string
  command: string
}

/** Menu commands from a manifest, flattened to "Group › Command" labels. */
function pluginCommands(items: PluginMenuItem[] | undefined, prefix = ''): PluginCommand[] {
  return (items ?? []).flatMap((item): PluginCommand[] => {
    if ('separator' in item) return []
    const label = prefix ? `${prefix} › ${item.name}` : item.name
    if ('menu' in item) return pluginCommands(item.menu, label)
    return [{ label, command: item.command }]
  })
}

const buttonClass =
  'flex h-7 cursor-pointer items-center gap-1.5 rounded border border-border bg-transparent px-2 text-xs text-surface hover:bg-hover disabled:opacity-50'

function PluginRow({ plugin, onRun }: { plugin: InstalledPlugin; onRun: () => void }) {
  const { dialogs } = useI18n()
  const commands = pluginCommands(plugin.manifest.menu)

  const run = (command = '') => {
    onRun()
    void runPlugin(plugin, command)
  }

  return (
    <li
      className="flex flex-col gap-1.5 rounded border border-border p-2"
      data-plugin-id={plugin.id}
    >
      <div className="flex items-center gap-2">
        <Puzzle className="size-3.5 shrink-0 text-muted" />
        <span className="min-w-0 flex-1 truncate text-xs font-medium text-surface">
          {plugin.name}
        </span>
        {commands.length === 0 && (
          <button type="button" className={buttonClass} onClick={() => run()}>
            <Play className="size-3" />
            {dialogs.runPlugin}
          </button>
        )}
        <button
          type="button"
          className={buttonClass}
          aria-label={`${dialogs.removePlugin} ${plugin.name}`}
          onClick={() => void uninstallPlugin(plugin.id)}
        >
          <Trash2 className="size-3" />
        </button>
      </div>
      {commands.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pl-5">
          {commands.map((entry) => (
            <button
              key={entry.command}
              type="button"
              className={buttonClass}
              onClick={() => run(entry.command)}
            >
              <Play className="size-3" />
              {entry.label}
            </button>
          ))}
        </div>
      )}
    </li>
  )
}

/** Installs, runs, and removes Figma-style plugins. */
export default function PluginsDialog() {
  const open = useStore(pluginsDialogOpen)
  const plugins = useStore(installedPlugins)
  const { dialogs, menu } = useI18n()
  const [installing, setInstalling] = useState(false)

  const close = () => pluginsDialogOpen.set(false)

  const install = async () => {
    const files = await pickPluginFolder()
    if (files.length === 0) return
    setInstalling(true)
    try {
      const plugin = await readPluginFolder(files)
      await installPlugin(plugin)
      toast.info(dialogs.pluginInstalled({ name: plugin.name }))
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      toast.error(dialogs.pluginInstallFailed({ reason }))
    } finally {
      setInstalling(false)
    }
  }

  return (
    <AppDialogRoot open={open} onOpenChange={(isOpen) => !isOpen && close()}>
      <div
        className="w-[460px] max-w-[90vw] overflow-hidden rounded-xl border border-border bg-panel shadow-2xl"
        data-test-id="plugins-dialog"
      >
        <AppDialogHeader heading={menu.plugins} description={dialogs.pluginsDescription} />
        <div className="max-h-[50vh] overflow-y-auto px-4 py-3">
          {plugins.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted">{dialogs.noPluginsInstalled}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {plugins.map((plugin) => (
                <PluginRow key={plugin.id} plugin={plugin} onRun={close} />
              ))}
            </ul>
          )}
        </div>
        <AppDialogFooter>
          <button
            type="button"
            className={buttonClass}
            disabled={installing}
            data-test-id="plugins-install"
            onClick={() => void install()}
          >
            <FolderOpen className="size-3.5" />
            {dialogs.installPluginFolder}
          </button>
        </AppDialogFooter>
      </div>
    </AppDialogRoot>
  )
}
