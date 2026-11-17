import { getDesktopBridge } from '@/app/desktop/env'
import type { DesktopResult } from '@/app/desktop/types'
import {
  CredentialStoreError,
  type CredentialRef,
  type CredentialStatus,
  type CredentialStore,
  type CredentialStoreAvailability
} from '@/app/settings/credentials/types'

/**
 * Credential store backed by the Electron main process, which encrypts secrets
 * with the OS keystore (`safeStorage`). Never falls back to browser storage:
 * a missing bridge reports `unavailable` and writes fail.
 */
export class NativeCredentialStore implements CredentialStore {
  readonly backend = 'native' as const

  async availability(): Promise<CredentialStoreAvailability> {
    const bridge = getDesktopBridge()
    if (!bridge) return 'unavailable'
    return unwrap(await bridge.credentials.availability())
  }

  async status(reference: CredentialRef): Promise<CredentialStatus> {
    const bridge = getDesktopBridge()
    if (!bridge) return 'unavailable'
    return unwrap(await bridge.credentials.status(reference))
  }

  async read(reference: CredentialRef): Promise<string | null> {
    return unwrap(await requireBridge().credentials.read(reference))
  }

  async write(reference: CredentialRef, value: string): Promise<void> {
    unwrap(await requireBridge().credentials.write(reference, value))
  }

  async remove(reference: CredentialRef): Promise<void> {
    unwrap(await requireBridge().credentials.remove(reference))
  }
}

function requireBridge() {
  const bridge = getDesktopBridge()
  if (!bridge) {
    throw new CredentialStoreError('unavailable', 'The system credential store is unavailable')
  }
  return bridge
}

function unwrap<T>(result: DesktopResult<T>): T {
  if (result.ok) return result.value
  throw new CredentialStoreError(result.error.code, result.error.message)
}
