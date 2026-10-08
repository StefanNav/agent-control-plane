import { render } from '@testing-library/react'
import { Sparkline } from './Sparkline'
import { sparklinePath } from './sparklinePath'

test('maps values into the box with 2px padding', () => {
  expect(sparklinePath([0, 10, 5], 72, 20)).toBe('M2 18L36 2L70 10')
})

test('flat series sits on the midline', () => {
  expect(sparklinePath([5, 5], 72, 20)).toBe('M2 10L70 10')
})

test('fewer than two values draws nothing', () => {
  expect(sparklinePath([3], 72, 20)).toBe('')
})

test('rounds to two decimals and drops trailing zeros', () => {
  // y1 = 2 + (1 - 1/3) * 16 = 12.666… → 12.67
  expect(sparklinePath([0, 1, 3], 10, 20)).toBe('M2 18L5 12.67L8 2')
})

test('live sparkline has an end dot at the last point', () => {
  const { container } = render(<Sparkline values={[0, 10, 5]} />)
  const dot = container.querySelector('circle')
  expect(dot?.getAttribute('cx')).toBe('70')
  expect(dot?.getAttribute('cy')).toBe('10')
})

test('stale sparkline is dashed with no end dot', () => {
  const { container } = render(<Sparkline values={[0, 10, 5]} stale />)
  expect(container.querySelector('path')?.getAttribute('stroke-dasharray')).toBe('2 2')
  expect(container.querySelector('circle')).toBeNull()
})

test('endDot={false} hides the dot', () => {
  const { container } = render(<Sparkline values={[0, 10, 5]} endDot={false} />)
  expect(container.querySelector('circle')).toBeNull()
})

test('a fixed domain maps values onto it instead of their own range', async () => {
  const { sparklinePath } = await import('./sparklinePath')
  expect(sparklinePath([75, 100], 72, 20, [75, 100])).toBe('M2 18L70 2')
  expect(sparklinePath([80, 90], 72, 20, [75, 100])).toBe('M2 14.8L70 8.4')
})
