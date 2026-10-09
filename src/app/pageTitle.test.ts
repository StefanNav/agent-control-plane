import { pageTitle } from './pageTitle'

test('a page reads its own title, then the product (Phase 9 R3)', () => {
  expect(pageTitle('Division view')).toBe('Division view · Signal Agent Control Plane')
})

test('the landing page keeps the product name alone', () => {
  expect(pageTitle('Signal · Agent Control Plane')).toBe('Signal · Agent Control Plane')
})

test('an unknown path says so', () => {
  expect(pageTitle(null)).toBe('Page not found · Signal Agent Control Plane')
})
