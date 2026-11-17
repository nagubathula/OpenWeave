import type {
  DesktopCredentialAvailability,
  DesktopCredentialErrorCode,
  DesktopCredentialRef,
  DesktopCredentialStatus,
  DesktopResult
} from '../src/app/desktop/types'

/**
 * Native credential store for the Electron shell.
 *
 * Secrets are encrypted with Electron `safeStorage` (macOS Keychain, Windows
 * DPAPI, libsecret/KWallet on Linux) and the ciphertext is kept in a JSON file
 * under `userData`. The renderer never sees ciphertext or the file path.
 *
 * Linux's `basic_text` backend is a hard-coded plaintext key, so it is reported
 * as `unavailable` rather than silently degrading to obfuscated plaintext.
 */

const MAX_SEGMENT_LENGTH = 64
export const MAX_CREDENTIAL_LENGTH = 16 * 1024
const FILE_VERSION = 1

export interface CredentialCipher {
  isAvailable(): boolean
  /** True when the platform keystore is locked (e.g. no unlocked keyring). */
  isLocked(): boolean
  encrypt(plainText: string): Buffer
  decrypt(cipherText: Buffer): string
}

export interface CredentialFileIO {
  read(): Promise<string | null>
  write(contents: string): Promise<void>
}

interface CredentialFile {
  version: number
  entries: Record<string, string>
}

class CredentialFailureError extends Error {
  constructor(
    readonly code: DesktopCredentialErrorCode,
    message: string
  ) {
    super(message)
    this.name = 'CredentialFailureError'
  }
}

const FAILURE_MESSAGES: Record<DesktopCredentialErrorCode, string> = {
  'invalid-reference': 'Credential reference is invalid',
  'invalid-value': 'Credential value is invalid',
  locked: 'The system credential store is locked',
  unavailable: 'The system credential store is unavailable',
  failed: 'The credential operation failed'
}

function fail(code: DesktopCredentialErrorCode): never {
  throw new CredentialFailureError(code, FAILURE_MESSAGES[code])
}

function isValidSegment(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= MAX_SEGMENT_LENGTH &&
    /^[a-z0-9._-]+$/.test(value)
  )
}

/** Stable, versioned account key — identical to the former Tauri keyring account. */
export function credentialAccount(reference: DesktopCredentialRef): string {
  if (
    !reference ||
    !isValidSegment(reference.integrationId) ||
    !isValidSegment(reference.profileId) ||
    !isValidSegment(reference.field)
  ) {
    fail('invalid-reference')
  }
  return `v1:${reference.integrationId}:${reference.profileId}:${reference.field}`
}

async function toResult<T>(operation: () => Promise<T>): Promise<DesktopResult<T>> {
  try {
    return { ok: true, value: await operation() }
  } catch (error) {
    const code = error instanceof CredentialFailureError ? error.code : 'failed'
    return { ok: false, error: { code, message: FAILURE_MESSAGES[code] } }
  }
}

export class DesktopCredentialStore {
  #queue: Promise<unknown> = Promise.resolve()

  constructor(
    private readonly cipher: CredentialCipher,
    private readonly io: CredentialFileIO
  ) {}

  availability(): Promise<DesktopResult<DesktopCredentialAvailability>> {
    return toResult(async () => {
      if (!this.cipher.isAvailable()) return 'unavailable'
      if (this.cipher.isLocked()) return 'locked'
      return 'available'
    })
  }

  status(reference: DesktopCredentialRef): Promise<DesktopResult<DesktopCredentialStatus>> {
    return toResult(async () => {
      const account = credentialAccount(reference)
      if (!this.cipher.isAvailable()) return 'unavailable'
      if (this.cipher.isLocked()) return 'locked'
      const file = await this.#load()
      return account in file.entries ? 'configured' : 'missing'
    })
  }

  read(reference: DesktopCredentialRef): Promise<DesktopResult<string | null>> {
    return toResult(async () => {
      const account = credentialAccount(reference)
      this.#assertUsable()
      const encoded = (await this.#load()).entries[account]
      if (encoded === undefined) return null
      try {
        return this.cipher.decrypt(Buffer.from(encoded, 'base64'))
      } catch {
        fail('failed')
      }
    })
  }

  write(reference: DesktopCredentialRef, value: string): Promise<DesktopResult<null>> {
    return toResult(async () => {
      const account = credentialAccount(reference)
      if (typeof value !== 'string' || value.length === 0 || value.length > MAX_CREDENTIAL_LENGTH) {
        fail('invalid-value')
      }
      this.#assertUsable()
      const encrypted = this.cipher.encrypt(value).toString('base64')
      await this.#mutate((entries) => entries.set(account, encrypted))
      return null
    })
  }

  remove(reference: DesktopCredentialRef): Promise<DesktopResult<null>> {
    return toResult(async () => {
      const account = credentialAccount(reference)
      this.#assertUsable()
      await this.#mutate((entries) => entries.delete(account))
      return null
    })
  }

  #assertUsable() {
    if (!this.cipher.isAvailable()) fail('unavailable')
    if (this.cipher.isLocked()) fail('locked')
  }

  async #load(): Promise<CredentialFile> {
    const raw = await this.io.read()
    if (!raw) return { version: FILE_VERSION, entries: {} }
    try {
      const parsed = JSON.parse(raw) as Partial<CredentialFile>
      if (
        parsed.version !== FILE_VERSION ||
        typeof parsed.entries !== 'object' ||
        !parsed.entries
      ) {
        fail('failed')
      }
      return { version: FILE_VERSION, entries: { ...parsed.entries } }
    } catch (error) {
      if (error instanceof CredentialFailureError) throw error
      fail('failed')
    }
  }

  /** Serializes read-modify-write cycles so concurrent writes never drop entries. */
  #mutate(update: (entries: Map<string, string>) => void): Promise<void> {
    const run = this.#queue.then(() => this.#apply(update))
    // Keep the queue alive after a failed write; the caller still sees the error.
    this.#queue = run.catch(() => undefined)
    return run
  }

  async #apply(update: (entries: Map<string, string>) => void) {
    const entries = new Map(Object.entries((await this.#load()).entries))
    update(entries)
    const file: CredentialFile = { version: FILE_VERSION, entries: Object.fromEntries(entries) }
    await this.io.write(`${JSON.stringify(file, null, 2)}\n`)
  }
}
