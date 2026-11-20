import { afterEach, describe, expect, test } from 'bun:test'
import { existsSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { stageNgrok } from '../src/stage'

const roots: string[] = []

function tempRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'openweave-ngrok-'))
  roots.push(root)
  return root
}

function writePackage(dir: string, files: string[]) {
  mkdirSync(dir, { recursive: true })
  for (const file of files) writeFileSync(join(dir, file), file)
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

describe('stageNgrok', () => {
  test('copies the SDK and addons from a hoisted layout, keeping runtime files only', () => {
    const root = tempRoot()
    const scope = join(root, 'node_modules', '@ngrok')
    writePackage(join(scope, 'ngrok'), ['package.json', 'index.js', 'index.d.ts', 'README.md'])
    writePackage(join(scope, 'ngrok-win32-x64-msvc'), ['package.json', 'ngrok.win32-x64-msvc.node'])
    writePackage(join(root, 'node_modules', '@other', 'pkg'), ['package.json'])

    const out = join(root, 'out')
    expect(stageNgrok({ projectRoot: root, outDir: out })).toEqual([
      'ngrok',
      'ngrok-win32-x64-msvc'
    ])
    expect(existsSync(join(out, 'ngrok', 'index.js'))).toBe(true)
    expect(existsSync(join(out, 'ngrok', 'README.md'))).toBe(false)
    expect(existsSync(join(out, 'ngrok', 'index.d.ts'))).toBe(false)
    expect(existsSync(join(out, 'ngrok-win32-x64-msvc', 'ngrok.win32-x64-msvc.node'))).toBe(true)
  })

  test('follows symlinks from an isolated (Bun) layout', () => {
    const root = tempRoot()
    const store = join(root, 'node_modules', '.bun', '@ngrok+ngrok@1.0.0', 'node_modules', '@ngrok')
    const addonStore = join(root, 'node_modules', '.bun', 'addon', 'ngrok-linux-x64-gnu')
    writePackage(join(store, 'ngrok'), ['package.json', 'index.js'])
    writePackage(addonStore, ['package.json', 'ngrok.linux-x64-gnu.node'])
    symlinkSync(addonStore, join(store, 'ngrok-linux-x64-gnu'), 'junction')
    mkdirSync(join(root, 'node_modules', '@ngrok'), { recursive: true })
    symlinkSync(join(store, 'ngrok'), join(root, 'node_modules', '@ngrok', 'ngrok'), 'junction')

    const out = join(root, 'out')
    expect(stageNgrok({ projectRoot: root, outDir: out })).toEqual(['ngrok', 'ngrok-linux-x64-gnu'])
    expect(existsSync(join(out, 'ngrok-linux-x64-gnu', 'ngrok.linux-x64-gnu.node'))).toBe(true)
  })

  test('replaces an earlier staging folder', () => {
    const root = tempRoot()
    writePackage(join(root, 'node_modules', '@ngrok', 'ngrok'), ['package.json'])
    const out = join(root, 'out')
    writePackage(join(out, 'ngrok-stale'), ['package.json'])

    stageNgrok({ projectRoot: root, outDir: out })
    expect(existsSync(join(out, 'ngrok-stale'))).toBe(false)
  })
})
