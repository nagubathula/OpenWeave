import { describe, expect, test } from 'bun:test'

import {
  credentialAccount,
  DesktopCredentialStore,
  MAX_CREDENTIAL_LENGTH,
  type CredentialCipher
} from '#desktop/credentials'

const reference = { integrationId: 'openai', profileId: 'default', field: 'api-key' }

function memoryStore(cipherOverrides: Partial<CredentialCipher> = {}) {
  let contents: string | null = null
  const cipher: CredentialCipher = {
    isAvailable: () => true,
    isLocked: () => false,
    // Reversible stand-in for safeStorage so tests can see ciphertext ≠ plaintext.
    encrypt: (plain) => Buffer.from([...Buffer.from(plain)].reverse()),
    decrypt: (cipherText) => Buffer.from([...cipherText].reverse()).toString(),
    ...cipherOverrides
  }
  const store = new DesktopCredentialStore(cipher, {
    read: async () => contents,
    write: async (next) => {
      contents = next
    }
  })
  return { store, contents: () => contents }
}

describe('credentialAccount', () => {
  test('creates stable versioned account names', () => {
    expect(credentialAccount(reference)).toBe('v1:openai:default:api-key')
  })

  test('rejects untrusted account segments', () => {
    expect(() => credentialAccount({ ...reference, profileId: '../etc' })).toThrow()
    expect(() => credentialAccount({ ...reference, field: 'API_KEY' })).toThrow()
    expect(() => credentialAccount({ ...reference, integrationId: '' })).toThrow()
    expect(() => credentialAccount({ ...reference, field: 'a'.repeat(65) })).toThrow()
  })
})

describe('DesktopCredentialStore', () => {
  test('reads, writes, and removes encrypted values', async () => {
    const { store, contents } = memoryStore()
    expect(await store.status(reference)).toEqual({ ok: true, value: 'missing' })

    expect(await store.write(reference, 'sk-secret')).toEqual({ ok: true, value: null })
    expect(contents()).not.toContain('sk-secret')
    expect(await store.status(reference)).toEqual({ ok: true, value: 'configured' })
    expect(await store.read(reference)).toEqual({ ok: true, value: 'sk-secret' })

    expect(await store.remove(reference)).toEqual({ ok: true, value: null })
    expect(await store.read(reference)).toEqual({ ok: true, value: null })
  })

  test('rejects empty and oversized values', async () => {
    const { store } = memoryStore()
    for (const value of ['', 'x'.repeat(MAX_CREDENTIAL_LENGTH + 1)]) {
      const result = await store.write(reference, value)
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.error.code).toBe('invalid-value')
    }
  })

  test('reports an invalid reference as a typed error', async () => {
    const { store } = memoryStore()
    const result = await store.read({ ...reference, field: 'Bad Field' })
    expect(result).toMatchObject({ ok: false, error: { code: 'invalid-reference' } })
  })

  test('never falls back to plaintext when encryption is unavailable', async () => {
    const { store, contents } = memoryStore({ isAvailable: () => false })
    expect(await store.availability()).toEqual({ ok: true, value: 'unavailable' })
    expect(await store.status(reference)).toEqual({ ok: true, value: 'unavailable' })
    expect(await store.write(reference, 'sk-secret')).toMatchObject({
      ok: false,
      error: { code: 'unavailable' }
    })
    expect(contents()).toBeNull()
  })

  test('keeps every entry when writes run concurrently', async () => {
    const { store } = memoryStore()
    await Promise.all(
      ['a', 'b', 'c', 'd'].map((field) => store.write({ ...reference, field }, `value-${field}`))
    )
    for (const field of ['a', 'b', 'c', 'd']) {
      expect(await store.read({ ...reference, field })).toEqual({
        ok: true,
        value: `value-${field}`
      })
    }
  })

  test('fails closed on a corrupt credential file', async () => {
    const store = new DesktopCredentialStore(
      {
        isAvailable: () => true,
        isLocked: () => false,
        encrypt: (plain) => Buffer.from(plain),
        decrypt: (cipherText) => cipherText.toString()
      },
      { read: async () => '{not json', write: async () => {} }
    )
    expect(await store.read(reference)).toMatchObject({ ok: false, error: { code: 'failed' } })
  })
})
