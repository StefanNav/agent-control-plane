import { MANIFEST, clipUrl } from './manifest'

describe('manifest', () => {
  test('clipUrl points at the beat id under /tour/audio', () => {
    expect(clipUrl('cold-1')).toBe('/tour/audio/cold-1.m4a')
  })

  test('MANIFEST is an object of entries', () => {
    expect(typeof MANIFEST).toBe('object')
    expect(MANIFEST).not.toBeNull()
    for (const entry of Object.values(MANIFEST)) {
      expect(entry.ms).toBeGreaterThan(0)
      expect(['placeholder', 'recorded']).toContain(entry.source)
      expect(entry.textHash).toMatch(/^[0-9a-f]{8}$/)
    }
  })
})
