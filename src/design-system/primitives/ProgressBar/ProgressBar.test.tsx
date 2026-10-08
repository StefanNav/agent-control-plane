import { render, screen } from '@testing-library/react'
import { ProgressBar } from './ProgressBar'

test('is a progressbar with a percentage value', () => {
  render(<ProgressBar value={0.42} label="Coverage" />)
  const bar = screen.getByRole('progressbar', { name: 'Coverage' })
  expect(bar).toHaveAttribute('aria-valuenow', '42')
})

test('clamps above 1 and below 0', () => {
  const { rerender } = render(<ProgressBar value={1.4} label="p" />)
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100')
  rerender(<ProgressBar value={-1} label="p" />)
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0')
})
