import { render } from '@testing-library/react'
import { Icon, type IconName } from './Icon'
import { ICONS } from './paths'

const RING = 'M6 1.75a4.25 4.25 0 1 1 0 8.5a4.25 4.25 0 1 1 0-8.5Z'

const FIRST_PATH: Array<[IconName, string]> = [
  ['ring', RING],
  ['diamond', 'M6 0.9L11.1 6L6 11.1L0.9 6Z'],
  ['triangle', 'M6 1.2L11.4 10.6H0.6Z'],
  ['stale', 'M5 2H10V10H2V2Z'],
  ['shadow', RING],
  ['paused', 'M2.6 2h2.4v8H2.6ZM7 2h2.4v8H7Z'],
  ['check', 'M2.5 6.2l2.3 2.3 4.7-5'],
  ['lock', 'M3.5 5.5V4a2.5 2.5 0 0 1 5 0v1.5'],
  ['chevron', 'M2 3.5l3 3 3-3'],
]

test.each(FIRST_PATH)('%s draws its handoff path', (name, d) => {
  const { container } = render(<Icon name={name} />)
  expect(container.querySelector('svg path')?.getAttribute('d')).toBe(d)
})

test('stale is a dashed square, so it never reads as the review ring (spec O1, Phase 9 R10)', () => {
  expect(ICONS.stale.shapes).toEqual([{ kind: 'path', d: 'M5 2H10V10H2V2Z', strokeWidth: 1.5, dash: '2 2' }])
  expect(ICONS.ring.shapes).toEqual([{ kind: 'path', d: RING, strokeWidth: 1.5 }])
  const { container } = render(<Icon name="stale" />)
  expect(container.querySelector('path')?.getAttribute('stroke-dasharray')).toBe('2 2')
})

test('shadow is a ring plus a filled left half', () => {
  const { container } = render(<Icon name="shadow" />)
  const paths = container.querySelectorAll('path')
  expect(paths).toHaveLength(2)
  expect(paths[1]?.getAttribute('d')).toBe('M6 1.75a4.25 4.25 0 0 0 0 8.5Z')
})

test('lock is a shackle plus a body rect', () => {
  const { container } = render(<Icon name="lock" />)
  expect(container.querySelectorAll('path')).toHaveLength(1)
  const rect = container.querySelector('rect')
  expect(rect?.getAttribute('width')).toBe('8')
  expect(rect?.getAttribute('height')).toBe('5.5')
})

test('chevron uses a 10×10 viewBox, others 12×12', () => {
  const { container: c1 } = render(<Icon name="chevron" />)
  expect(c1.querySelector('svg')?.getAttribute('viewBox')).toBe('0 0 10 10')
  const { container: c2 } = render(<Icon name="ring" />)
  expect(c2.querySelector('svg')?.getAttribute('viewBox')).toBe('0 0 12 12')
})

test('size sets width and height', () => {
  const { container } = render(<Icon name="ring" size={15} />)
  const svg = container.querySelector('svg')
  expect(svg?.getAttribute('width')).toBe('15')
  expect(svg?.getAttribute('height')).toBe('15')
})

test('decorative by default; titled icons are images', () => {
  const { container: c1 } = render(<Icon name="ring" />)
  expect(c1.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true')
  const { container: c2 } = render(<Icon name="lock" title="Locked" />)
  const svg = c2.querySelector('svg')
  expect(svg?.getAttribute('role')).toBe('img')
  expect(svg?.querySelector('title')?.textContent).toBe('Locked')
})
