import { render, screen } from '@testing-library/react'
import { MonitorHealth } from './MonitorHealth'

test('live is quiet: a dot and a time, no chip', () => {
  const { container } = render(<MonitorHealth state="live" at="09:42:17" />)
  expect(screen.getByText('Live · 09:42:17')).toBeInTheDocument()
  expect(container.querySelector('[data-status]')).toBeNull()
})

test('delayed uses stronger words', () => {
  render(<MonitorHealth state="delayed" at="09:36" delayMin={6} />)
  expect(screen.getByText('Delayed 6 min · last 09:36')).toBeInTheDocument()
})

test('stale is the stale chip', () => {
  const { container } = render(<MonitorHealth state="stale" at="06:41" staleFor="3h" />)
  expect(container.querySelector('[data-status="stale"]')).not.toBeNull()
  expect(screen.getByText('No data for 3h · last 06:41')).toBeInTheDocument()
})
