import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

import { APP_MENU_SCHEMA } from '@/app/shell/menu/schema'

import { buildNativeMenu } from './build'

/**
 * Writes `desktop-electron/generated/menu.json` from the shared app menu
 * schema. Run with `bun run generate:desktop-menu`; `--check` fails when the
 * committed file is stale instead of rewriting it.
 */
const OUTPUT_PATH = 'desktop-electron/generated/menu.json'

const contents = `${JSON.stringify(buildNativeMenu(APP_MENU_SCHEMA), null, 2)}\n`

if (process.argv.includes('--check')) {
  const current = existsSync(OUTPUT_PATH) ? readFileSync(OUTPUT_PATH, 'utf8') : ''
  if (current.replaceAll('\r\n', '\n') !== contents) {
    console.error(`${OUTPUT_PATH} is stale. Run \`bun run generate:desktop-menu\`.`)
    process.exit(1)
  }
} else {
  mkdirSync(dirname(OUTPUT_PATH), { recursive: true })
  writeFileSync(OUTPUT_PATH, contents)
}
