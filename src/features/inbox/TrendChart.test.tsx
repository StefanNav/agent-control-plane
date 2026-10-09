import { render, screen } from '@testing-library/react'
import { TrendChart } from './TrendChart'

test('15a: the last points that broke the threshold are marked, and the dashed line says what it is', () => {
  const { container } = render(<TrendChart label="Edit rate · 14 days" values={[9, 9, 16.8, 17.9, 18.4]} days={['a', 'b', 'c', 'd', 'e']} target={15} targetLabel="step-down threshold" highlight={3} />)
  expect(container.querySelectorAll('circle[data-highlight]')).toHaveLength(3)
  expect(screen.getByText('Dashed line · step-down threshold 15 %')).toBeInTheDocument()
})

test('the chart can span a wider column (15a) and keeps 640 by default (5a)', () => {
  const { container, rerender } = render(<TrendChart label="Edit rate" values={[1, 2]} days={['a', 'b']} />)
  expect(container.querySelector('svg')!.getAttribute('width')).toBe('640')
  rerender(<TrendChart label="Edit rate" values={[1, 2]} days={['a', 'b']} width={980} />)
  expect(container.querySelector('svg')!.getAttribute('width')).toBe('980')
})
