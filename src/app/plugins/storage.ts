import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

import type { PluginManifest } from '@/app/plugins/manifest'

/** An installed plugin: its manifest plus the code and UI read at install time. */
export interface InstalledPlugin {
  id: string
  name: string
  manifest: PluginManifest
  code: string
  /** UI HTML (string form) or named UI files (object form), if any. */
  ui: string | Record<string, string> | null
  installedAt: string
}

interface PluginDatabase extends DBSchema {
  plugins: {
    key: string
    value: InstalledPlugin
  }
  /** `figma.clientStorage`, keyed by `${pluginId}\u0000${key}`. */
  clientStorage: {
    key: string
    value: { pluginId: string; key: string; value: unknown }
    indexes: { pluginId: string }
  }
}

const DATABASE_NAME = 'openweave-plugins'
const DATABASE_VERSION = 1

let database: Promise<IDBPDatabase<PluginDatabase>> | null = null

function db(): Promise<IDBPDatabase<PluginDatabase>> {
  database ??= openDB<PluginDatabase>(DATABASE_NAME, DATABASE_VERSION, {
    upgrade(upgradeDb) {
      upgradeDb.createObjectStore('plugins', { keyPath: 'id' })
      const storage = upgradeDb.createObjectStore('clientStorage')
      storage.createIndex('pluginId', 'pluginId')
    }
  })
  return database
}

export async function listInstalledPlugins(): Promise<InstalledPlugin[]> {
  const plugins = await (await db()).getAll('plugins')
  return plugins.sort((a, b) => a.name.localeCompare(b.name))
}

export async function saveInstalledPlugin(plugin: InstalledPlugin): Promise<void> {
  await (await db()).put('plugins', plugin)
}

export async function removeInstalledPlugin(pluginId: string): Promise<void> {
  const database = await db()
  const tx = database.transaction(['plugins', 'clientStorage'], 'readwrite')
  await tx.objectStore('plugins').delete(pluginId)
  const storage = tx.objectStore('clientStorage')
  for (const key of await storage.index('pluginId').getAllKeys(pluginId)) {
    await storage.delete(key)
  }
  await tx.done
}

const storageKey = (pluginId: string, key: string) => `${pluginId}\u0000${key}`

/** Per-plugin persistent storage behind `figma.clientStorage`. */
export class PluginClientStorage {
  constructor(private readonly pluginId: string) {}

  async getAsync(key: string): Promise<unknown> {
    const entry = await (await db()).get('clientStorage', storageKey(this.pluginId, String(key)))
    return entry?.value
  }

  async setAsync(key: string, value: unknown): Promise<void> {
    await (
      await db()
    ).put(
      'clientStorage',
      { pluginId: this.pluginId, key: String(key), value: structuredClone(value) },
      storageKey(this.pluginId, String(key))
    )
  }

  async deleteAsync(key: string): Promise<void> {
    await (await db()).delete('clientStorage', storageKey(this.pluginId, String(key)))
  }

  async keysAsync(): Promise<string[]> {
    const entries = await (await db()).getAllFromIndex('clientStorage', 'pluginId', this.pluginId)
    return entries.map((entry) => entry.key)
  }
}
