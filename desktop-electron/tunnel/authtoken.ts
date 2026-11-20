import { readdirSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import * as os from 'node:os'
import * as path from 'node:path'

/**
 * Finds the ngrok authtoken for the share tunnel. The token saved in Settings
 * wins; otherwise the app reuses an existing ngrok setup (`NGROK_AUTHTOKEN` or
 * the agent config that `ngrok config add-authtoken` writes).
 */

export interface AuthtokenSources {
  /** Token saved through the app's credential store. */
  saved: () => Promise<string | null>
  env?: NodeJS.ProcessEnv
  configPaths?: string[]
}

/** Lists a directory, or nothing when it is missing. */
function listDir(dir: string): string[] {
  try {
    return readdirSync(dir)
  } catch {
    return []
  }
}

/**
 * Agent config files, current layout first, then the Microsoft Store build's
 * virtualized copy on Windows, then the legacy v2 location.
 */
export function ngrokConfigPaths(
  platform: NodeJS.Platform = process.platform,
  env: NodeJS.ProcessEnv = process.env,
  home: string = os.homedir(),
  list: (dir: string) => string[] = listDir
): string[] {
  const p = platform === 'win32' ? path.win32 : path.posix
  const paths: string[] = []
  if (platform === 'win32') {
    const local = env.LOCALAPPDATA ?? p.join(home, 'AppData', 'Local')
    paths.push(p.join(local, 'ngrok', 'ngrok.yml'))
    const packages = p.join(local, 'Packages')
    for (const name of list(packages).filter((entry) => entry.startsWith('ngrok.ngrok_'))) {
      paths.push(p.join(packages, name, 'LocalCache', 'Local', 'ngrok', 'ngrok.yml'))
    }
  } else if (platform === 'darwin') {
    paths.push(p.join(home, 'Library', 'Application Support', 'ngrok', 'ngrok.yml'))
  } else {
    paths.push(p.join(env.XDG_CONFIG_HOME ?? p.join(home, '.config'), 'ngrok', 'ngrok.yml'))
  }
  paths.push(p.join(home, '.ngrok2', 'ngrok.yml'))
  return paths
}

/** Reads `authtoken:` from an agent config (top level in v2, under `agent:` in v3). */
export function parseConfigAuthtoken(config: string): string | null {
  const match = /^[ \t]*authtoken:[ \t]*["']?([\w-]+)["']?[ \t]*(?:#.*)?$/m.exec(config)
  return match?.[1] ?? null
}

export async function resolveNgrokAuthtoken(sources: AuthtokenSources): Promise<string | null> {
  const saved = (await sources.saved())?.trim()
  if (saved) return saved

  const env = sources.env ?? process.env
  const fromEnv = env.NGROK_AUTHTOKEN?.trim()
  if (fromEnv) return fromEnv

  for (const configPath of sources.configPaths ?? ngrokConfigPaths()) {
    try {
      const token = parseConfigAuthtoken(await readFile(configPath, 'utf8'))
      if (token) return token
    } catch {
      // Missing or unreadable config: try the next location.
      continue
    }
  }
  return null
}
