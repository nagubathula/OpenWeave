import { spawn, type ChildProcess } from 'node:child_process'
import { build } from 'bun'

console.log('Building Electron main and preload scripts...')
await build({
  entrypoints: ['desktop-electron/main.ts'],
  outdir: 'desktop-electron/dist',
  naming: 'main.cjs',
  target: 'node',
  format: 'cjs',
  external: ['electron']
})
await build({
  entrypoints: ['desktop-electron/preload.ts'],
  outdir: 'desktop-electron/dist',
  naming: 'preload.cjs',
  target: 'node',
  format: 'cjs',
  external: ['electron']
})

let devProcess: ChildProcess | null = null

// Check if dev server is already running on port 1420
let isServerRunning = false
try {
  const res = await fetch('http://127.0.0.1:1420', { signal: AbortSignal.timeout(1000) })
  if (res.status >= 200 && res.status < 500) {
    isServerRunning = true
  }
} catch {
  isServerRunning = false
}

if (!isServerRunning) {
  console.log('Starting OpenWeave Next.js dev server...')
  devProcess = spawn('bun', ['run', 'dev'], {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, PORT: '1420' }
  })
}

// Wait for dev server to respond
process.stdout.write('Waiting for dev server at http://127.0.0.1:1420')
const startTime = Date.now()
while (true) {
  try {
    const res = await fetch('http://127.0.0.1:1420', { signal: AbortSignal.timeout(1500) })
    if (res.status >= 200 && res.status < 500) {
      console.log('\nDev server is ready!')
      break
    }
  } catch {
    process.stdout.write('.')
    await new Promise((r) => setTimeout(r, 600))
  }
  if (Date.now() - startTime > 60000) {
    console.error('\nTimed out waiting for dev server.')
    devProcess?.kill()
    process.exit(1)
  }
}

// Launch Electron with any extra file arguments passed to the script
const userArgs = process.argv.slice(2)
console.log('Launching OpenWeave in Electron (Chromium runtime)...', userArgs.length ? userArgs : '')

const electronProcess = spawn('bun', ['x', 'electron', 'desktop-electron/dist/main.cjs', ...userArgs], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, DEV_URL: 'http://127.0.0.1:1420' }
})

const cleanup = () => {
  electronProcess.kill()
  devProcess?.kill()
  process.exit(0)
}

process.on('SIGINT', cleanup)
process.on('SIGTERM', cleanup)

electronProcess.on('exit', (code) => {
  devProcess?.kill()
  process.exit(code ?? 0)
})
