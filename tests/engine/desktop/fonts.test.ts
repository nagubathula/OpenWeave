import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { readFaceInfo, systemFontDirs, weightStyleName } from '#desktop/fonts'

function viewOf(file: string) {
  const bytes = readFileSync(file)
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
}

describe('desktop font scanner', () => {
  test('reads family, weight, and italic from sfnt tables', () => {
    expect(readFaceInfo(viewOf(join('public', 'Inter-Regular.ttf')))).toMatchObject({
      family: 'Inter',
      weight: 400,
      italic: false
    })
    expect(readFaceInfo(viewOf(join('public', 'Inter-Bold.ttf')))).toMatchObject({
      family: 'Inter',
      weight: 700
    })
  })

  test('returns null for truncated or non-font data', () => {
    expect(readFaceInfo(new DataView(new ArrayBuffer(8)))).toBeNull()
    expect(readFaceInfo(new DataView(new Uint8Array(64).buffer))).toBeNull()
  })

  test('names styles like the former font-kit scanner', () => {
    expect(weightStyleName(400, false)).toBe('Regular')
    expect(weightStyleName(600, true)).toBe('SemiBold Italic')
    expect(weightStyleName(100, false)).toBe('Thin')
    expect(weightStyleName(950, false)).toBe('Black')
  })

  test('scans per-user font folders on every platform', () => {
    expect(systemFontDirs({ WINDIR: 'C:\\Windows', LOCALAPPDATA: 'C:\\L' }, 'win32')).toHaveLength(
      2
    )
    expect(systemFontDirs({ HOME: '/home/u' }, 'linux')).toContain('/home/u/.local/share/fonts')
    expect(systemFontDirs({ HOME: '/Users/u' }, 'darwin')).toContain('/Users/u/Library/Fonts')
  })
})
