import { cx } from './cx'

test('joins truthy class names with single spaces', () => {
  expect(cx('a', false, undefined, null, 'b')).toBe('a b')
})

test('returns an empty string when nothing is truthy', () => {
  expect(cx(false, undefined)).toBe('')
})
