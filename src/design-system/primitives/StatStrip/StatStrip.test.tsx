import { render, screen } from '@testing-library/react'
import { StatStrip } from './StatStrip'

test('renders each stat label, value and sub-line', () => {
  render(
    <StatStrip
      stats={[
        { label: 'Signed as is', value: '82%', sub: 'target 80%' },
        { label: 'Edited', value: '14%' },
      ]}
    />,
  )
  expect(screen.getByText('Signed as is')).toBeInTheDocument()
  expect(screen.getByText('82%')).toBeInTheDocument()
  expect(screen.getByText('target 80%')).toBeInTheDocument()
  expect(screen.getByText('14%')).toBeInTheDocument()
})
