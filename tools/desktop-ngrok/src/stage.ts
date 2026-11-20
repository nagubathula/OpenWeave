import { copyFileSync, mkdirSync, readdirSync, realpathSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'

/**
 * Copies the `@ngrok/ngrok` SDK and its installed native addon packages into a
 * plain folder that electron-builder ships unpacked (`extraResources`), since
 * native addons cannot load from `app.asar` and Bun's isolated installs keep
 * them behind symlinks.
 */

const RUNTIME_FILE = /^(?:package\.json|index\.js|LICENSE.*|.+\.node)$/

export interface StageOptions {
  projectRoot: string
  outDir: string
}

/** Returns the staged package folder names, e.g. `['ngrok', 'ngrok-win32-x64-msvc']`. */
export function stageNgrok({ projectRoot, outDir }: StageOptions): string[] {
  const sdkDir = realpathSync(join(projectRoot, 'node_modules', '@ngrok', 'ngrok'))
  // The addon packages sit beside the SDK in both hoisted and isolated layouts.
  const scopeDir = dirname(sdkDir)
  const packages = readdirSync(scopeDir)
    .filter((name) => name === 'ngrok' || name.startsWith('ngrok-'))
    .sort()

  rmSync(outDir, { recursive: true, force: true })
  for (const name of packages) {
    const source = realpathSync(join(scopeDir, name))
    const target = join(outDir, name)
    mkdirSync(target, { recursive: true })
    for (const file of readdirSync(source)) {
      if (RUNTIME_FILE.test(file)) copyFileSync(join(source, file), join(target, file))
    }
  }
  return packages
}
