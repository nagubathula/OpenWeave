import { describe, expect, test } from 'bun:test'

import { packageBinTargets } from '../src/tarballs'

describe('packageBinTargets', () => {
  test('normalizes string bin fields', () => {
    expect(packageBinTargets({ name: '@openweave/cli', bin: './bin/openweave.js' })).toEqual({
      '@openweave/cli': './bin/openweave.js'
    })
  })

  test('keeps named bin fields', () => {
    expect(
      packageBinTargets({ name: '@openweave/cli', bin: { openweave: './bin/openweave.js' } })
    ).toEqual({
      openweave: './bin/openweave.js'
    })
  })
})
