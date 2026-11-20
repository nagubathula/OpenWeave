import { stageNgrok } from './stage'

/**
 * Stages the ngrok SDK for packaging into `desktop-electron/dist/node_modules`.
 * Runs as part of `bun run desktop:bundle`; electron-builder then copies the
 * SDK plus the addon matching each target platform and architecture.
 */
const OUT_DIR = 'desktop-electron/dist/node_modules/@ngrok'

const staged = stageNgrok({ projectRoot: process.cwd(), outDir: OUT_DIR })
const addons = staged.filter((name) => name !== 'ngrok')
if (addons.length === 0) {
  console.warn('No @ngrok/ngrok native addon is installed; packaged sharing will not work.')
} else {
  console.log(`Staged @ngrok/ngrok with ${addons.join(', ')}`)
}
