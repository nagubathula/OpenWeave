import { spawn, spawnSync, type ChildProcess } from 'node:child_process'
import { connect } from 'node:net'

/**
 * `bun run desktop:dev`: bundles the Electron main/preload scripts, starts the
 * Next dev server on :1420 unless one is already running, and launches
 * Electron against it. Extra arguments are forwarded as files to open.
 */

const DEV_URL = 'http://127.0.0.1:1420'
const READY_TIMEOUT_MS = 60_000

const bundle = spawnSync('bun', ['run', 'desktop:bundle'], { stdio: 'inherit', shell: true })
if (bundle.status !== 0) process.exit(bundle.status ?? 1)

async function devServerResponds(timeoutMs: number): Promise<boolean> {
  try {
    const res = await fetch(DEV_URL, { signal: AbortSignal.timeout(timeoutMs) })
    return res.status >= 200 && res.status < 500
  } catch {
    return false
  }
}

/**
 * Whether something already listens on the dev port. A TCP check, unlike an
 * HTTP probe, does not misread a busy (still compiling) server as absent.
 */
function devPortInUse(): Promise<boolean> {
  const { hostname, port } = new URL(DEV_URL)
  return new Promise((resolve) => {
    const socket = connect({ host: hostname, port: Number(port) })
    socket.setTimeout(1000)
    socket.once('connect', () => {
      socket.destroy()
      resolve(true)
    })
    socket.once('timeout', () => {
      socket.destroy()
      resolve(false)
    })
    socket.once('error', () => resolve(false))
  })
}

let devProcess: ChildProcess | null = null
if (await devPortInUse()) {
  console.log(`Reusing the dev server already running at ${DEV_URL}`)
} else {
  console.log('Starting OpenWeave Next.js dev server...')
  devProcess = spawn('bun', ['run', 'dev'], { stdio: 'inherit', shell: true })
}

process.stdout.write(`Waiting for dev server at ${DEV_URL}`)
const startedAt = Date.now()
while (!(await devServerResponds(1500))) {
  if (Date.now() - startedAt > READY_TIMEOUT_MS) {
    console.error('\nTimed out waiting for dev server.')
    devProcess?.kill()
    process.exit(1)
  }
  process.stdout.write('.')
  await new Promise((resolve) => {
    setTimeout(resolve, 600)
  })
}
console.log('\nDev server is ready.')

const electronProcess = spawn('bun', ['x', 'electron', '.', ...process.argv.slice(2)], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, DEV_URL }
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
