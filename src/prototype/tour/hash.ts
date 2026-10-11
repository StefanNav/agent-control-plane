const encoder = new TextEncoder()

/**
 * FNV-1a 32-bit of the text as 8 lowercase hex digits. Runs of whitespace collapse and the ends trim
 * first, so reflowing a line in the script doesn't make its recording look stale.
 */
export function textHash(text: string): string {
  let hash = 0x811c9dc5
  for (const byte of encoder.encode(text.replace(/\s+/g, ' ').trim())) {
    hash ^= byte
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}
