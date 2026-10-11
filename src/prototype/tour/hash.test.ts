import { textHash } from './hash'

describe('textHash', () => {
  test('is eight lowercase hex digits', () => {
    expect(textHash('The agent was paused at 09:41.')).toMatch(/^[0-9a-f]{8}$/)
    expect(textHash('')).toMatch(/^[0-9a-f]{8}$/)
  })

  test('collapses runs of whitespace and trims the ends', () => {
    expect(textHash('a  b ')).toBe(textHash('a b'))
    expect(textHash('  a\n\t b\n')).toBe(textHash('a b'))
  })

  test('differs for different lines', () => {
    expect(textHash('One line.')).not.toBe(textHash('Another line.'))
    expect(textHash('a b')).not.toBe(textHash('ab'))
  })

  test('is FNV-1a 32-bit over the UTF-8 bytes', () => {
    expect(textHash('')).toBe('811c9dc5')
    expect(textHash('a')).toBe('e40c292c')
    expect(textHash('foobar')).toBe('bf9cf968')
    // 'é' is two UTF-8 bytes (c3 a9), so hashing it differs from hashing one UTF-16 unit.
    expect(textHash('é')).toBe('1e9de8c1')
  })
})
