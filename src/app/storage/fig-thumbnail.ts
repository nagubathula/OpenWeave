import { unzipSync } from 'fflate'

// The exporter writes a 1×1 placeholder PNG (~90 bytes) when no renderer was
// available; anything that small isn't worth uploading or showing.
const MIN_REAL_THUMBNAIL_BYTES = 256

/**
 * Pulls the embedded 400×225 thumbnail out of a `.fig` container without a
 * full parse — the exporter stores `thumbnail.png` uncompressed in the zip,
 * so a filtered unzip touches only that entry.
 */
export function extractFigThumbnail(figBytes: Uint8Array): Uint8Array | null {
  try {
    const entries = unzipSync(figBytes, { filter: (file) => file.name === 'thumbnail.png' })
    const thumbnail = entries['thumbnail.png']
    return thumbnail && thumbnail.length >= MIN_REAL_THUMBNAIL_BYTES ? thumbnail : null
  } catch {
    // Legacy non-zip .fig container — no embedded thumbnail to extract.
    return null
  }
}
